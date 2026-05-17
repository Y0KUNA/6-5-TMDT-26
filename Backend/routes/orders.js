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

    let sql = 'SELECT * FROM orders';
    const where = [];
    const vals = [];

    if (role === 'customer' || qCustomer) {
      where.push('customer_id = $' + (vals.length + 1));
      vals.push(qCustomer || userId);
    }

    if (role === 'enterprise' || qEnterprise) {
      where.push('enterprise_id = $' + (vals.length + 1));
      vals.push(qEnterprise || userId);
    }

    if (qStatus) {
      where.push('status = $' + (vals.length + 1));
      vals.push(qStatus);
    }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';

    const r = await db.query(sql, vals);
    return res.json({ orders: r.rows });
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
    const itemsR = await db.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    return res.json({ order, items: itemsR.rows });
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
    await db.query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2', [status, id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/orders/:id/status error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders/:id/return -> create return request
router.post('/:id/return', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { reason, type } = req.body;
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
    const orderR = await db.query('SELECT customer_id FROM orders WHERE order_id = $1', [id]);
    if (orderR.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    const customerId = orderR.rows[0].customer_id;

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

// POST /api/orders/:id/received -> mark as received by customer and perform payout (95% to seller, 5% commission)
router.post('/:id/received', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const orderR = await client.query('SELECT * FROM orders WHERE order_id = $1', [id]);
    if (orderR.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Order not found' }); }
    const order = orderR.rows[0];
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

module.exports = router;
