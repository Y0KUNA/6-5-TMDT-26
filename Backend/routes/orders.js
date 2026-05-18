const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// Auth middleware (sets req.userId and req.role if token present)
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return next();
  const token = h.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.role = payload.role;
  } catch (err) {
    // ignore
  }
  return next();
}

router.use(authMiddleware);

// ensure return_requests table exists (lightweight migration)
async function ensureReturnTable() {
  const sql = `CREATE TABLE IF NOT EXISTS return_requests (
    request_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    customer_id INT NOT NULL,
    reason TEXT,
    type TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`;
  await db.query(sql);
}

// GET /api/orders -> list orders for current user or admin
router.get('/', async (req, res) => {
  try {
    const userId = req.userId || null;
    const role = req.role || null;

    // filters
    const qCustomer = parseInt(req.query.customerId, 10) || null;
    const qEnterprise = parseInt(req.query.enterpriseId, 10) || null;
    const qStatus = req.query.status || null;

    // Enrich orders with enterprise (seller) name, customer info, and items array for frontend convenience
    // Build base query with joins and aggregate items as JSON
    let sql = `
      SELECT
        o.*, 
        e.business_name,
        u.full_name as customer_name,
        u.phone as customer_phone,
        COALESCE(json_agg(json_build_object(
          'order_item_id', oi.order_item_id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'unit', oi.unit,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'subtotal', oi.subtotal,
          'image', pi.image_url
        )) FILTER (WHERE oi.order_item_id IS NOT NULL), '[]') AS items
      FROM orders o
      LEFT JOIN enterprises e ON e.enterprise_id = o.enterprise_id
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      LEFT JOIN users u ON u.user_id = c.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.order_id
      LEFT JOIN product_images pi ON pi.product_id = oi.product_id AND pi.is_primary = true
    `;

    const where = [];
    const vals = [];

    if (role === 'customer' || qCustomer) {
      where.push('o.customer_id = $' + (vals.length + 1));
      vals.push(qCustomer || userId);
    }

    if (role === 'enterprise' || qEnterprise) {
      where.push('o.enterprise_id = $' + (vals.length + 1));
      vals.push(qEnterprise || userId);
    }

    if (qStatus) {
      where.push('o.status = $' + (vals.length + 1));
      vals.push(qStatus);
    }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' GROUP BY o.order_id, e.business_name, u.full_name, u.phone ORDER BY o.created_at DESC';

    const r = await db.query(sql, vals);
    // Prefix relative image paths with server origin so frontend can load them directly
    const origin = req.protocol + '://' + req.get('host');
    const rows = r.rows.map(row => {
      const items = Array.isArray(row.items) ? row.items.map(it => {
        let image = it.image || null;
        if (image && !/^https?:\/\//i.test(image)) {
          image = origin + '/' + String(image).replace(/^\/+/, '');
        }
        return Object.assign({}, it, { image });
      }) : [];
      return Object.assign({}, row, { items });
    });
    return res.json({ orders: rows });
  } catch (err) {
    console.error('GET /api/orders error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id -> details + items
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
    const orderR = await db.query('SELECT * FROM orders WHERE order_id = $1', [id]);
    if (orderR.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderR.rows[0];
    const itemsR = await db.query('SELECT oi.*, pi.image_url as image FROM order_items oi LEFT JOIN product_images pi ON pi.product_id = oi.product_id AND pi.is_primary = true WHERE oi.order_id = $1', [id]);
    // prefix image URLs
    const origin = req.protocol + '://' + req.get('host');
    const items = itemsR.rows.map(it => {
      let image = it.image || null;
      if (image && !/^https?:\/\//i.test(image)) image = origin + '/' + String(image).replace(/^\/+/, '');
      return Object.assign({}, it, { image });
    });
    // also include business name for convenience
    const entR = await db.query('SELECT business_name FROM enterprises WHERE enterprise_id = $1', [order.enterprise_id]);
    const business_name = entR.rowCount ? entR.rows[0].business_name : null;
    return res.json({ order: Object.assign({}, order, { business_name }), items });
  } catch (err) {
    console.error('GET /api/orders/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/orders/:id/status -> { status }
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (Number.isNaN(id) || !status) return res.status(400).json({ error: 'Invalid request' });

    // Update order status
    await db.query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2', [status, id]);

    // If order moved to a shipping-related status, ensure a shipment record exists (lazy migration)
    if (['SHIPPING', 'SHIPPED', 'DELIVERED'].includes(status)) {
      try {
        await db.query(`CREATE TABLE IF NOT EXISTS shipments (
          shipment_id SERIAL PRIMARY KEY,
          order_id INT NOT NULL UNIQUE,
          shipper_id INT,
          tracking_code VARCHAR(100),
          status VARCHAR(50) NOT NULL DEFAULT 'WAITING',
          estimated_delivery_date TIMESTAMP,
          actual_delivery_date TIMESTAMP,
          failure_reason TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);

        const exists = await db.query('SELECT 1 FROM shipments WHERE order_id = $1', [id]);
        if (exists.rowCount === 0) {
          const trackingCode = `GHN${Date.now()}${Math.random().toString(36).substr(2,5).toUpperCase()}`;
          await db.query('INSERT INTO shipments (order_id, tracking_code, status) VALUES ($1,$2,$3)', [id, trackingCode, 'WAITING']);
        }
      } catch (e) {
        console.warn('Could not ensure shipment for order', id, e);
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/orders/:id/status error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders/:id/return -> create return request (UC8)
router.post('/:id/return', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.userId;
    const role = req.role;
    const { reason, type } = req.body;
    
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
    
    // Only customers can request returns
    if (role !== 'customer' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - only customers can request returns' });
    }
    
    const orderR = await db.query('SELECT customer_id FROM orders WHERE order_id = $1', [id]);
    if (orderR.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    const customerId = orderR.rows[0].customer_id;
    
    // Verify the user is the customer who placed this order (unless admin)
    if (role === 'customer' && Number(userId) !== Number(customerId)) {
      return res.status(403).json({ error: 'Forbidden - this is not your order' });
    }

    await ensureReturnTable();
    const ins = await db.query('INSERT INTO return_requests (order_id, customer_id, reason, type, status) VALUES ($1,$2,$3,$4,$5) RETURNING request_id', [id, customerId, reason || null, type || null, 'PENDING']);
    return res.json({ ok: true, requestId: ins.rows[0].request_id });
  } catch (err) {
    console.error('POST /api/orders/:id/return error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id/returns -> list return requests for order
router.get('/:id/returns', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
    await ensureReturnTable();
    const r = await db.query('SELECT * FROM return_requests WHERE order_id = $1 ORDER BY created_at DESC', [id]);
    return res.json({ returns: r.rows });
  } catch (err) {
    console.error('GET /api/orders/:id/returns error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/stats/seller?enterpriseId=..
router.get('/stats/seller', async (req, res) => {
  try {
    const enterpriseId = parseInt(req.query.enterpriseId, 10) || null;
    if (!enterpriseId) return res.status(400).json({ error: 'enterpriseId required' });

    const totalR = await db.query('SELECT COUNT(*)::int AS orders_count, COALESCE(SUM(total_amount),0)::numeric AS total_revenue FROM orders WHERE enterprise_id = $1', [enterpriseId]);
    const topR = await db.query(`SELECT oi.product_id, oi.product_name, SUM(oi.quantity)::int AS sold FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.enterprise_id = $1 GROUP BY oi.product_id, oi.product_name ORDER BY sold DESC LIMIT 5`, [enterpriseId]);

    return res.json({ stats: totalR.rows[0], topProducts: topR.rows });
  } catch (err) {
    console.error('GET /api/orders/stats/seller error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders/:id/received -> mark as received by customer and perform payout (95% to seller, 5% commission) (UC7)
router.post('/:id/received', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.userId;
  const role = req.role;
  
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
  
  // Only customers can mark their orders as received
  if (role !== 'customer' && role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - only customers can mark orders as received' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const orderR = await client.query('SELECT * FROM orders WHERE order_id = $1', [id]);
    if (orderR.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Order not found' }); }
    const order = orderR.rows[0];
    
    // Verify the user is the customer who placed this order (unless admin)
    if (role === 'customer' && Number(userId) !== Number(order.customer_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden - this is not your order' });
    }
    
    if (order.status === 'COMPLETED') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Order already completed' }); }

    // compute payout amounts
    const total = Number(order.total_amount || 0);
    const commission = Math.round((total * 0.05) * 100) / 100; // 5%
    const payout = Math.round((total - commission) * 100) / 100;

    // find or create wallets
    async function getOrCreateWallet(ownerType, ownerId) {
      const r = await client.query('SELECT wallet_id, balance FROM wallets WHERE owner_type = $1 AND owner_id = $2', [ownerType, ownerId]);
      if (r.rowCount > 0) return r.rows[0];
      const ins = await client.query('INSERT INTO wallets (owner_type, owner_id, balance) VALUES ($1,$2,$3) RETURNING wallet_id, balance', [ownerType, ownerId, 0]);
      return ins.rows[0];
    }

    const platformWallet = await getOrCreateWallet('PLATFORM', 0);
    const sellerWallet = await getOrCreateWallet('ENTERPRISE', order.enterprise_id);

    // ensure platform has enough balance to pay out (should be from previous payments)
    const platformBalance = Number(platformWallet.balance || 0);
    if (platformBalance < payout + commission) {
      // not enough balance -> still allow marking received but record failed transaction
      await client.query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2', ['COMPLETED', id]);
      await client.query('INSERT INTO transactions (from_wallet_id, to_wallet_id, order_id, amount, type, status, description) VALUES ($1,$2,$3,$4,$5,$6,$7)', [platformWallet.wallet_id, sellerWallet.wallet_id, id, payout, 'PAYOUT', 'FAILED', 'Insufficient platform balance for payout']);
      await client.query('COMMIT');
      return res.json({ ok: true, warning: 'Platform balance insufficient for payout; transaction recorded as FAILED' });
    }

    // perform transfers: platform -> seller (payout), platform -> platform (commission stays)
    await client.query('UPDATE wallets SET balance = balance - $1 WHERE wallet_id = $2', [payout, platformWallet.wallet_id]);
    await client.query('UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2', [payout, sellerWallet.wallet_id]);

    // record transactions
    await client.query('INSERT INTO transactions (from_wallet_id, to_wallet_id, order_id, amount, type, status, description, completed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)', [platformWallet.wallet_id, sellerWallet.wallet_id, id, payout, 'PAYOUT', 'SUCCESS', 'Payout to seller for order ' + id]);
    // commission recorded as transaction from platform to platform (or null to_wallet)
    await client.query('INSERT INTO transactions (from_wallet_id, to_wallet_id, order_id, amount, type, status, description, completed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)', [platformWallet.wallet_id, platformWallet.wallet_id, id, commission, 'COMMISSION', 'SUCCESS', 'Commission for order ' + id]);

    await client.query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2', ['COMPLETED', id]);
    await client.query('COMMIT');
    return res.json({ ok: true, payout, commission });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/orders/:id/received error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// ════════════════════════════════════════════════════════════════
// ENHANCED APIs for UC (Use Cases) - Return Requests & Notifications
// ════════════════════════════════════════════════════════════════

// Ensure return_requests table schema matches database
async function ensureReturnRequestSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS return_requests (
      request_id SERIAL PRIMARY KEY,
      customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
      order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,
      enterprise_id INT NOT NULL REFERENCES enterprises(enterprise_id) ON DELETE RESTRICT,
      type VARCHAR(50) NOT NULL,
      reason TEXT NOT NULL,
      evidence_image VARCHAR(500),
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      rejected_reason TEXT,
      note TEXT,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_return_type CHECK (type IN ('EXCHANGE', 'REFUND'))
    )
  `;
  try {
    await db.query(sql);
  } catch (e) {
    // Table may already exist, ignore
  }
}

// Ensure notifications table exists
async function ensureNotificationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  try {
    await db.query(sql);
  } catch (e) {
    // Table may already exist, ignore
  }
}

// Helper: Create notification for user
async function createNotification(userId, title, content, type = 'ORDER') {
  try {
    await ensureNotificationsTable();
    await db.query(
      `INSERT INTO notifications (user_id, title, content, type) VALUES ($1, $2, $3, $4)`,
      [userId, title, content, type]
    );
  } catch (err) {
    console.error('createNotification error:', err);
  }
}

// UC8: GET /api/returns - get return requests (for enterprise to manage)
router.get('/returns', async (req, res) => {
  try {
    const userId = req.userId;
    const role = req.role;
    const enterpriseId = parseInt(req.query.enterpriseId, 10) || userId;
    const qStatus = req.query.status || null;

    if (role !== 'enterprise' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verify the user owns the enterprise (unless admin)
    if (role === 'enterprise' && Number(userId) !== Number(enterpriseId)) {
      return res.status(403).json({ error: 'Forbidden - you can only view your own returns' });
    }

    await ensureReturnRequestSchema();

    let sql = `
      SELECT 
        rr.*, 
        u.full_name as customer_name, 
        u.email as customer_email,
        u.phone as customer_phone,
        o.total_amount,
        oi.product_name,
        oi.unit_price,
        oi.quantity
      FROM return_requests rr
      JOIN customers c ON c.customer_id = rr.customer_id
      JOIN users u ON u.user_id = c.customer_id
      JOIN orders o ON o.order_id = rr.order_id
      JOIN order_items oi ON oi.order_id = o.order_id
      WHERE rr.enterprise_id = $1
    `;

    const vals = [enterpriseId];

    if (qStatus) {
      sql += ` AND rr.status = $${vals.length + 1}`;
      vals.push(qStatus);
    }

    sql += ` ORDER BY rr.created_at DESC`;

    const r = await db.query(sql, vals);
    return res.json({ returns: r.rows });
  } catch (err) {
    console.error('GET /api/returns error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// UC13: PATCH /api/returns/:requestId/approve - enterprise approve return request
router.patch('/returns/:requestId/approve', async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    const { action_type } = req.body; // EXCHANGE or REFUND
    const userId = req.userId;
    const role = req.role;

    if (Number.isNaN(requestId)) return res.status(400).json({ error: 'Invalid request id' });
    if (!action_type || !['EXCHANGE', 'REFUND'].includes(action_type)) {
      return res.status(400).json({ error: 'Invalid action_type' });
    }

    if (role !== 'enterprise' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await ensureReturnRequestSchema();

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get return request with enterprise info
      const rrR = await client.query(
        `SELECT rr.*, o.customer_id FROM return_requests rr
         JOIN orders o ON o.order_id = rr.order_id
         WHERE rr.request_id = $1`,
        [requestId]
      );

      if (rrR.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Return request not found' });
      }

      const rr = rrR.rows[0];

      // Verify user owns this enterprise (unless admin)
      if (role === 'enterprise' && Number(rr.enterprise_id) !== Number(userId)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Forbidden - this return request is not for your enterprise' });
      }

      // Update return request status
      await client.query(
        `UPDATE return_requests SET status = $1, resolved_at = CURRENT_TIMESTAMP WHERE request_id = $2`,
        ['APPROVED', requestId]
      );

      // Create notification for customer
      const customer = await client.query(
        `SELECT user_id FROM customers WHERE customer_id = $1`,
        [rr.customer_id]
      );

      if (customer.rowCount > 0) {
        const customerId = customer.rows[0].user_id;
        const msg = action_type === 'EXCHANGE' 
          ? 'Doanh nghiệp đã chấp nhận yêu cầu đổi hàng của bạn. Hãy gửi hàng cũ lại.'
          : 'Doanh nghiệp đã chấp nhận yêu cầu hoàn tiền. Số tiền sẽ được hoàn vào tài khoản của bạn.';

        await createNotification(customerId, 'Yêu cầu đổi/trả được chấp nhận', msg, 'RETURN');
      }

      await client.query('COMMIT');
      return res.json({ ok: true, message: `Return request approved as ${action_type}` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PATCH /api/returns/:requestId/approve error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// UC13: PATCH /api/returns/:requestId/reject - enterprise reject return request
router.patch('/returns/:requestId/reject', async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    const { reason } = req.body;
    const userId = req.userId;
    const role = req.role;

    if (Number.isNaN(requestId)) return res.status(400).json({ error: 'Invalid request id' });
    if (!reason) return res.status(400).json({ error: 'Reason is required' });

    if (role !== 'enterprise' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await ensureReturnRequestSchema();

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const rrR = await client.query(
        `SELECT rr.*, o.customer_id FROM return_requests rr
         JOIN orders o ON o.order_id = rr.order_id
         WHERE rr.request_id = $1`,
        [requestId]
      );

      if (rrR.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Return request not found' });
      }

      const rr = rrR.rows[0];

      // Verify user owns this enterprise (unless admin)
      if (role === 'enterprise' && Number(rr.enterprise_id) !== Number(userId)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Forbidden - this return request is not for your enterprise' });
      }

      // Update return request
      await client.query(
        `UPDATE return_requests SET status = $1, rejected_reason = $2, resolved_at = CURRENT_TIMESTAMP WHERE request_id = $3`,
        ['REJECTED', reason, requestId]
      );

      // Notify customer
      const customer = await client.query(
        `SELECT user_id FROM customers WHERE customer_id = $1`,
        [rr.customer_id]
      );

      if (customer.rowCount > 0) {
        const customerId = customer.rows[0].user_id;
        await createNotification(customerId, 'Yêu cầu đổi/trả bị từ chối', 
          `Doanh nghiệp đã từ chối yêu cầu của bạn. Lý do: ${reason}`, 'RETURN');
      }

      await client.query('COMMIT');
      return res.json({ ok: true, message: 'Return request rejected' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PATCH /api/returns/:requestId/reject error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications - get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await ensureNotificationsTable();

    const qUnread = req.query.unread === 'true';
    let sql = `SELECT * FROM notifications WHERE user_id = $1`;
    const vals = [userId];

    if (qUnread) {
      sql += ` AND is_read = false`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const r = await db.query(sql, vals);
    return res.json({ notifications: r.rows });
  } catch (err) {
    console.error('GET /api/notifications error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:notificationId/read - mark notification as read
router.patch('/notifications/:notificationId/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId, 10);
    if (Number.isNaN(notificationId)) return res.status(400).json({ error: 'Invalid notification id' });

    await ensureNotificationsTable();

    await db.query(
      `UPDATE notifications SET is_read = true WHERE notification_id = $1`,
      [notificationId]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/notifications/:notificationId/read error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
