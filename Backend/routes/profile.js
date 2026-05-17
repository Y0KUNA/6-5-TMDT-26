const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// simple auth middleware (same pattern used elsewhere)
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return next();
  const token = h.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
  } catch (err) {
    // ignore
  }
  return next();
}

router.use(authMiddleware);

// GET /api/profile -> current user's profile and simple stats
router.get('/', async (req, res) => {
  const userId = req.userId || parseInt(req.query.userId, 10);
  if (!userId) return res.status(400).json({ error: 'Authentication required' });
  try {
    const userRes = await db.query('SELECT user_id, role, full_name, email, phone, is_active, created_at FROM users WHERE user_id = $1', [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const u = userRes.rows[0];

    const custRes = await db.query('SELECT address FROM customers WHERE customer_id = $1', [userId]);
    const address = custRes.rowCount > 0 ? custRes.rows[0].address : null;

    // orders count and total spent
    const statRes = await db.query('SELECT COUNT(*)::int AS orders_count, COALESCE(SUM(total_amount),0)::numeric AS total_spent FROM orders WHERE customer_id = $1', [userId]);
    const stats = statRes.rows[0] || { orders_count: 0, total_spent: 0 };

    // derive simple loyalty points (example: 1 point per 10,000 VND)
    const points = Math.floor(Number(stats.total_spent) / 10000);

    return res.json({
      user: {
        userId: u.user_id,
        role: u.role,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        isActive: u.is_active,
        createdAt: u.created_at
      },
      customer: { address },
      stats: { orders: stats.orders_count || 0, totalSpent: Number(stats.total_spent) || 0, points }
    });
  } catch (err) {
    console.error('GET /api/profile error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/profile -> update name/phone/address
router.patch('/', async (req, res) => {
  const userId = req.userId || parseInt(req.body.userId, 10);
  if (!userId) return res.status(400).json({ error: 'Authentication required' });
  const { fullName, phone, address } = req.body;
  if (!fullName && !phone && typeof address === 'undefined') return res.status(400).json({ error: 'No fields to update' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    if (fullName || phone) {
      const parts = [];
      const vals = [];
      let idx = 1;
      if (fullName) { parts.push('full_name = $' + idx); vals.push(fullName); idx++; }
      if (phone) { parts.push('phone = $' + idx); vals.push(phone); idx++; }
      vals.push(userId);
      await client.query('UPDATE users SET ' + parts.join(', ') + ' WHERE user_id = $' + idx, vals);
    }

    if (typeof address !== 'undefined') {
      // upsert into customers (customers.customer_id = users.user_id)
      const exists = await client.query('SELECT 1 FROM customers WHERE customer_id = $1', [userId]);
      if (exists.rowCount > 0) {
        await client.query('UPDATE customers SET address = $1 WHERE customer_id = $2', [address, userId]);
      } else {
        await client.query('INSERT INTO customers (customer_id, address) VALUES ($1, $2)', [userId, address]);
      }
    }

    await client.query('COMMIT');
    return res.json({ message: 'Profile updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PATCH /api/profile error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

module.exports = router;
