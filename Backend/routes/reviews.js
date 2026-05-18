const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

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

// ensure reviews table exists
async function ensureTable() {
  const sql = `CREATE TABLE IF NOT EXISTS product_reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`;
  await db.query(sql);
}

// GET /api/reviews/:productId
router.get('/:productId', async (req, res) => {
  try {
    const pid = parseInt(req.params.productId, 10);
    if (Number.isNaN(pid)) return res.status(400).json({ error: 'Invalid product id' });
    await ensureTable();
    const r = await db.query('SELECT pr.*, u.full_name FROM product_reviews pr JOIN users u ON u.user_id = pr.user_id WHERE pr.product_id = $1 ORDER BY created_at DESC', [pid]);
    return res.json({ reviews: r.rows });
  } catch (err) {
    console.error('GET /api/reviews/:productId error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reviews/:productId -> { rating, comment }
router.post('/:productId', async (req, res) => {
  try {
    const pid = parseInt(req.params.productId, 10);
    const { rating, comment } = req.body;
    const userId = req.userId || null;
    if (Number.isNaN(pid) || !rating) return res.status(400).json({ error: 'Invalid request' });
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    await ensureTable();
    const ins = await db.query('INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING review_id', [pid, userId, rating, comment || null]);
    return res.json({ ok: true, reviewId: ins.rows[0].review_id });
  } catch (err) {
    console.error('POST /api/reviews/:productId error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
