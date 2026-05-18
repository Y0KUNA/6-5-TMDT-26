const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// Schema thực tế của bảng shipments (từ database_gen.sql):
//   shipment_id, order_id, shipper_id, tracking_code,
//   status (shipment_status enum: WAITING/PICKED_UP/DELIVERING/DELIVERED/FAILED),
//   estimated_delivery (DATE), picked_up_at (TIMESTAMP),
//   delivered_at (TIMESTAMP), updated_at (TIMESTAMP)

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return next();
  const token = h.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.role = payload.role;
  } catch (err) {
    // ignore invalid token
  }
  return next();
}

router.use(authMiddleware);

// Đảm bảo bảng tracking history tồn tại (bảng phụ, không có trong schema gốc)
async function ensureTrackingHistoryTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shipment_tracking_history (
      history_id  SERIAL PRIMARY KEY,
      shipment_id INT NOT NULL,
      status      VARCHAR(50) NOT NULL,
      location    VARCHAR(255),
      notes       TEXT,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sth_shipment FOREIGN KEY (shipment_id)
        REFERENCES shipments(shipment_id) ON DELETE CASCADE
    )
  `);
}

const statusMap = {
  'WAITING':    'Chờ lấy hàng',
  'PICKED_UP':  'Đã lấy hàng',
  'DELIVERING': 'Đang giao',
  'DELIVERED':  'Đã giao thành công',
  'FAILED':     'Giao thất bại'
};

// ─────────────────────────────────────────────────────────────
// GET /api/shipments/track/:orderId
// ─────────────────────────────────────────────────────────────
router.get('/track/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (Number.isNaN(orderId)) return res.status(400).json({ error: 'Invalid order id' });

    await ensureTrackingHistoryTable();

    const shipmentR = await db.query(
      `SELECT s.*, o.status as order_status, o.created_at as order_created_at
       FROM shipments s
       LEFT JOIN orders o ON o.order_id = s.order_id
       WHERE s.order_id = $1`,
      [orderId]
    );

    if (shipmentR.rowCount === 0) {
      return res.json({ shipment: null, tracking_history: [], message: 'Đơn hàng đang được chuẩn bị' });
    }

    const shipment = shipmentR.rows[0];

    const historyR = await db.query(
      `SELECT * FROM shipment_tracking_history
       WHERE shipment_id = $1 ORDER BY created_at ASC`,
      [shipment.shipment_id]
    );

    const formatted = {
      shipment_id:        shipment.shipment_id,
      order_id:           shipment.order_id,
      tracking_code:      shipment.tracking_code,
      status:             shipment.status,
      status_text:        statusMap[shipment.status] || shipment.status,
      order_status:       shipment.order_status,
      estimated_delivery: shipment.estimated_delivery,
      delivered_at:       shipment.delivered_at,
      picked_up_at:       shipment.picked_up_at,
      order_created_at:   shipment.order_created_at,
      updated_at:         shipment.updated_at
    };

    return res.json({
      shipment: formatted,
      tracking_history: historyR.rows || [],
      timeline: buildTimeline(shipment, historyR.rows)
    });
  } catch (err) {
    console.error('GET /api/shipments/track/:orderId error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/shipments/available  – đơn chưa có shipper
// ─────────────────────────────────────────────────────────────
router.get('/available', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT s.*,
              o.total_amount, o.shipping_address,
              u.full_name as customer_name, u.phone as customer_phone
       FROM shipments s
       JOIN orders    o ON o.order_id    = s.order_id
       JOIN customers c ON c.customer_id = o.customer_id
       JOIN users     u ON u.user_id     = c.customer_id
       WHERE s.shipper_id IS NULL AND s.status = 'WAITING'
       ORDER BY s.shipment_id DESC`
    );
    return res.json({ shipments: r.rows });
  } catch (err) {
    console.error('GET /api/shipments/available error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/shipments/shipper/:shipperId
// ─────────────────────────────────────────────────────────────
router.get('/shipper/:shipperId', async (req, res) => {
  try {
    const shipperId = parseInt(req.params.shipperId, 10);
    if (Number.isNaN(shipperId)) return res.status(400).json({ error: 'Invalid shipper id' });

    // Ép kiểu Number để tránh so sánh string !== number
    if (req.userId && Number(req.userId) !== shipperId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const r = await db.query(
      `SELECT s.*,
              o.customer_id, o.total_amount, o.shipping_address,
              u.full_name as customer_name, u.phone as customer_phone
       FROM shipments s
       JOIN orders    o ON o.order_id    = s.order_id
       JOIN customers c ON c.customer_id = o.customer_id
       JOIN users     u ON u.user_id     = c.customer_id
       WHERE s.shipper_id = $1
         AND s.status NOT IN ('DELIVERED', 'FAILED')
       ORDER BY s.shipment_id DESC`,
      [shipperId]
    );

    return res.json({ shipments: r.rows });
  } catch (err) {
    console.error('GET /api/shipments/shipper/:shipperId error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/shipments/:shipmentId/assign  – shipper nhận đơn
// ─────────────────────────────────────────────────────────────
router.patch('/:shipmentId/assign', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId, 10);
    const { shipperId } = req.body;
    if (Number.isNaN(shipmentId)) return res.status(400).json({ error: 'Invalid shipment id' });
    if (!shipperId) return res.status(400).json({ error: 'shipperId is required' });

    const r = await db.query(
      `UPDATE shipments
       SET shipper_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE shipment_id = $1 AND shipper_id IS NULL
       RETURNING *`,
      [shipmentId, shipperId]
    );

    if (r.rowCount === 0) {
      return res.status(409).json({ error: 'Đơn đã được nhận hoặc không tồn tại' });
    }

    return res.json({ ok: true, shipment: r.rows[0] });
  } catch (err) {
    console.error('PATCH /api/shipments/:shipmentId/assign error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/shipments/:shipmentId/status  – cập nhật trạng thái (UC19)
// ─────────────────────────────────────────────────────────────
router.patch('/:shipmentId/status', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId, 10);
    const { status, failure_reason } = req.body;
    const userId = req.userId;
    const role = req.role;

    if (Number.isNaN(shipmentId)) return res.status(400).json({ error: 'Invalid shipment id' });
    if (!status) return res.status(400).json({ error: 'Status is required' });

    // UC19: Only shipper can update shipment status
    if (role !== 'shipper' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - only shipper can update shipment status' });
    }

    const validStatuses = ['WAITING', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await ensureTrackingHistoryTable();

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if shipment exists and shipper is assigned (for shipper role)
      const shipmentCheckR = await client.query(
        `SELECT * FROM shipments WHERE shipment_id = $1`,
        [shipmentId]
      );

      if (shipmentCheckR.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Shipment not found' });
      }

      const shipment = shipmentCheckR.rows[0];

      // Authorization: shipper must be assigned to this shipment (unless admin)
      if (role === 'shipper' && Number(shipment.shipper_id) !== Number(userId)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Forbidden - you are not assigned to this shipment' });
      }

      // Build UPDATE query
      const updateFields = ['status = $2::shipment_status', 'updated_at = CURRENT_TIMESTAMP'];
      const updateVals = [shipmentId, status];

      if (status === 'PICKED_UP') {
        updateFields.push('picked_up_at = CURRENT_TIMESTAMP');
      }
      if (status === 'DELIVERED') {
        updateFields.push('delivered_at = CURRENT_TIMESTAMP');
      }

      const updateSql = `UPDATE shipments SET ${updateFields.join(', ')} WHERE shipment_id = $1 RETURNING *`;
      const shipmentRes = await client.query(updateSql, updateVals);

      if (shipmentRes.rowCount === 0) throw new Error('Shipment not found');
      const updatedShipment = shipmentRes.rows[0];

      // Record tracking history
      let notes = statusMap[status] || status;
      if (failure_reason) notes += ` - ${failure_reason}`;

      await client.query(
        `INSERT INTO shipment_tracking_history (shipment_id, status, notes) VALUES ($1, $2, $3)`,
        [shipmentId, status, notes]
      );

      // Update order status and send notification
      if (status === 'DELIVERED') {
        await client.query(
          `UPDATE orders SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
          [updatedShipment.order_id]
        );

        // Notify customer that order is delivered
        const orderR = await client.query(
          `SELECT o.customer_id, u.user_id FROM orders o
           JOIN customers c ON c.customer_id = o.customer_id
           JOIN users u ON u.user_id = c.customer_id
           WHERE o.order_id = $1`,
          [updatedShipment.order_id]
        );

        if (orderR.rowCount > 0) {
          const userId = orderR.rows[0].user_id;
          try {
            // Ensure notifications table exists
            await client.query(`
              CREATE TABLE IF NOT EXISTS notifications (
                notification_id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              )
            `);

            await client.query(
              `INSERT INTO notifications (user_id, title, content, type) VALUES ($1, $2, $3, $4)`,
              [userId, 'Đơn hàng đã giao thành công', 
               `Đơn hàng #${updatedShipment.order_id} đã giao thành công. Vui lòng nhận hàng và đánh giá.`, 
               'ORDER']
            );
          } catch (notifErr) {
            console.warn('Could not create notification:', notifErr);
          }
        }
      } else if (status === 'FAILED') {
        // Notify customer and enterprise about delivery failure
        const orderR = await client.query(
          `SELECT o.customer_id, o.enterprise_id, u.user_id, c.customer_name, e.business_name 
           FROM orders o
           JOIN customers c ON c.customer_id = o.customer_id
           JOIN users u ON u.user_id = c.customer_id
           JOIN enterprises e ON e.enterprise_id = o.enterprise_id
           WHERE o.order_id = $1`,
          [updatedShipment.order_id]
        );

        if (orderR.rowCount > 0) {
          const { user_id: customerId } = orderR.rows[0];
          try {
            await client.query(`
              CREATE TABLE IF NOT EXISTS notifications (
                notification_id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              )
            `);

            const msg = `Giao hàng thất bại. Lý do: ${failure_reason || 'Không rõ'}. Chúng tôi sẽ giao lại cho bạn sớm.`;
            await client.query(
              `INSERT INTO notifications (user_id, title, content, type) VALUES ($1, $2, $3, $4)`,
              [customerId, 'Giao hàng thất bại', msg, 'ORDER']
            );
          } catch (notifErr) {
            console.warn('Could not create notification:', notifErr);
          }
        }
      }

      await client.query('COMMIT');
      return res.json({ ok: true, shipment: updatedShipment });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PATCH /api/shipments/:shipmentId/status error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/shipments  – tạo shipment cho đơn hàng
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { orderId, shipperId, estimated_delivery } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

    const trackingCode = `GHN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const r = await db.query(
      `INSERT INTO shipments (order_id, shipper_id, tracking_code, status, estimated_delivery)
       VALUES ($1, $2, $3, 'WAITING', $4)
       RETURNING *`,
      [orderId, shipperId || null, trackingCode, estimated_delivery || null]
    );

    return res.status(201).json({ ok: true, shipment: r.rows[0] });
  } catch (err) {
    console.error('POST /api/shipments error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/shipments/:orderId  – lấy shipment theo orderId
// ─────────────────────────────────────────────────────────────
router.get('/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (Number.isNaN(orderId)) return res.status(400).json({ error: 'Invalid order id' });

    const r = await db.query(`SELECT * FROM shipments WHERE order_id = $1`, [orderId]);

    if (r.rowCount === 0) return res.status(404).json({ error: 'Shipment not found' });

    return res.json({ shipment: r.rows[0] });
  } catch (err) {
    console.error('GET /api/shipments/:orderId error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// Helper: build timeline cho UI tracking
// ─────────────────────────────────────────────────────────────
function buildTimeline(shipment, history) {
  const timeline = [
    { status: 'PENDING',    text: 'Đơn hàng tạo',  time: shipment.order_created_at, completed: true,  icon: '✓' },
    { status: 'PREPARING',  text: 'Chuẩn bị hàng', time: null,                      completed: ['PICKED_UP','DELIVERING','DELIVERED','FAILED'].includes(shipment.status), icon: '✓' },
    { status: 'PICKED_UP',  text: 'Lấy hàng',       time: shipment.picked_up_at,     completed: ['DELIVERING','DELIVERED','FAILED'].includes(shipment.status), icon: '✓' },
    { status: 'DELIVERING', text: 'Đang giao',       time: history.find(h => h.status === 'DELIVERING')?.created_at || null, completed: ['DELIVERED','FAILED'].includes(shipment.status), icon: shipment.status === 'DELIVERING' ? '→' : '✓' },
    { status: 'DELIVERED',  text: 'Đã giao',         time: shipment.delivered_at,     completed: shipment.status === 'DELIVERED', icon: shipment.status === 'DELIVERED' ? '✓' : '' }
  ];

  if (shipment.status === 'FAILED') {
    timeline[timeline.length - 1].status = 'FAILED';
    timeline[timeline.length - 1].text   = 'Giao thất bại';
    timeline[timeline.length - 1].icon   = '✗';
  }

  return timeline;
}

module.exports = router;
