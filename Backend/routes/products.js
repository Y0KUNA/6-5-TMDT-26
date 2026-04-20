const express = require('express');
const db = require('../db');

const router = express.Router();
const baseUrl = "http://localhost:"+(process.env.PORT || 3000);
// GET /api/products
router.get('/', async (req, res) => {
  try {
    const q = `SELECT p.product_id, p.enterprise_id, p.category_id, p.name, p.description, p.price, p.unit, p.stock_quantity, p.created_at,
      $1 || pi.image_url AS primary_image
      FROM products p
      LEFT JOIN LATERAL (
        SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1
      ) pi ON true
      ORDER BY p.created_at DESC`;

    const result = await db.query(q, [baseUrl]);
    return res.json({ products: result.rows });
  } catch (err) {
    console.error('GET /api/products error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  const { enterpriseId, categoryId, name, description, price, unit, stockQuantity, images } = req.body;
  if (!enterpriseId || !name || !price || !unit) return res.status(400).json({ error: 'Missing required fields' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const insertText = `INSERT INTO products (enterprise_id, category_id, name, description, price, unit, stock_quantity)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING product_id`;
    const r = await client.query(insertText, [enterpriseId, categoryId || 1, name, description || null, price, unit, stockQuantity || 0]);
    const productId = r.rows[0].product_id;

    if (Array.isArray(images) && images.length > 0) {
      const insertImageText = 'INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1,$2,$3)';
      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        await client.query(insertImageText, [productId, url, i === 0]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ productId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/products error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
