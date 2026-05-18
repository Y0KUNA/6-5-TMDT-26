const express = require('express');
const db = require('../db');

const router = express.Router();
// Helper to determine base URL for prefixing image paths. Prefer API_BASE_URL env var, else we'll pass a placeholder and the handler will compute from request.
// GET /api/products
router.get('/', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL || (req.protocol + '://' + req.get('host'));
    const enterpriseId = req.query.enterpriseId ? parseInt(req.query.enterpriseId, 10) : null;
    const approvalStatus = req.query.approvalStatus ? String(req.query.approvalStatus).toLowerCase() : '';

    let q = `SELECT p.product_id, p.enterprise_id, p.category_id, p.name, p.description, p.price, p.unit, p.stock_quantity, p.created_at, p.status,
      $1 || pi.image_url AS primary_image
      FROM products p
      LEFT JOIN LATERAL (
        SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1
      ) pi ON true`;

    const params = [baseUrl];
    const conditions = ["LOWER(COALESCE(p.status::text, 'on_sale')) <> 'rejected'"];
    if (enterpriseId) {
      conditions.push('p.enterprise_id = $2');
      params.push(enterpriseId);
    } else if (approvalStatus) {
      conditions.push("LOWER(COALESCE(p.status::text, 'on_sale')) = $2");
      params.push(approvalStatus);
    } else {
      conditions.push("LOWER(COALESCE(p.status::text, 'on_sale')) = 'on_sale'");
    }

    if (conditions.length) {
      q += ' WHERE ' + conditions.join(' AND ');
    }

    q += ' ORDER BY p.created_at DESC';

    const result = await db.query(q, params);
    return res.json({ products: result.rows });
  } catch (err) {
    console.error('GET /api/products error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id -> update product (basic fields + images replace)
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });
  const { name, description, price, unit, stockQuantity, certification, images } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const parts = [];
    const vals = [];
    let idx = 1;
    if (name) { parts.push('name = $' + idx); vals.push(name); idx++; }
    if (description) { parts.push('description = $' + idx); vals.push(description); idx++; }
    if (typeof price !== 'undefined') { parts.push('price = $' + idx); vals.push(price); idx++; }
    if (unit) { parts.push('unit = $' + idx); vals.push(unit); idx++; }
    if (typeof stockQuantity !== 'undefined') { parts.push('stock_quantity = $' + idx); vals.push(stockQuantity); idx++; }
    if (typeof certification !== 'undefined') { parts.push('certification = $' + idx); vals.push(certification); idx++; }

    if (parts.length > 0) {
      vals.push(id);
      await client.query('UPDATE products SET ' + parts.join(', ') + ' WHERE product_id = $' + idx, vals);
    }

    if (Array.isArray(images)) {
      // remove existing images and insert new ones
      await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      const insertImageText = 'INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1,$2,$3)';
      for (let i = 0; i < images.length; i++) {
        await client.query(insertImageText, [id, images[i], i === 0]);
      }
    }

    await client.query('COMMIT');
    // return updated product for convenience (query similar to GET /:id)
    try {
      const baseUrl = process.env.API_BASE_URL || (req.protocol + '://' + req.get('host'));
      const q = `SELECT p.product_id, p.enterprise_id, p.category_id, p.name, p.description, p.price, p.unit, p.stock_quantity, p.origin, p.certification, p.created_at,
        pi.images
        FROM products p
        LEFT JOIN LATERAL (
          SELECT COALESCE(json_agg(CASE WHEN image_url ILIKE 'http%' THEN image_url ELSE $1 || image_url END ORDER BY is_primary DESC), '[]') AS images
          FROM product_images
          WHERE product_id = p.product_id
        ) pi ON true
        WHERE p.product_id = $2
        LIMIT 1`;
      const r2 = await db.query(q, [baseUrl, id]);
      const row = r2.rows && r2.rows[0];
      if (row) {
        const product = {
          id: row.product_id,
          enterpriseId: row.enterprise_id,
          categoryId: row.category_id,
          name: row.name,
          description: row.description,
          price: Number(row.price),
          unit: row.unit,
          stockQuantity: row.stock_quantity,
          origin: row.origin,
          certification: row.certification,
          images: row.images || [],
          createdAt: row.created_at
        };
        return res.json({ ok: true, product });
      }
    } catch (e) {
      console.warn('Could not fetch updated product after update', e);
    }
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /api/products/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
    await client.query('DELETE FROM products WHERE product_id = $1', [id]);
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE /api/products/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// POST /api/products
router.post('/', async (req, res) => {
  const { enterpriseId, categoryId, name, description, price, unit, stockQuantity, certification, images } = req.body;
  if (!enterpriseId || !name || !price || !unit) return res.status(400).json({ error: 'Missing required fields' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const insertText = `INSERT INTO products (enterprise_id, category_id, name, description, price, unit, stock_quantity, certification, status, rejection_reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',NULL) RETURNING product_id`;
    const r = await client.query(insertText, [enterpriseId, categoryId || 1, name, description || null, price, unit, stockQuantity || 0, certification || null]);
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

// GET /api/products/pending
router.get('/pending', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL || (req.protocol + '://' + req.get('host'));
    const q = `SELECT p.product_id, p.enterprise_id, p.name, p.description, p.price, p.unit, p.certification, p.created_at,
      p.status, p.rejection_reason, COALESCE(e.business_name, u.full_name, ('Enterprise #' || p.enterprise_id::text)) AS business_name,
      COALESCE($1 || pi.image_url, '') AS primary_image
      FROM products p
      LEFT JOIN enterprises e ON e.enterprise_id = p.enterprise_id
      LEFT JOIN users u ON u.user_id = p.enterprise_id
      LEFT JOIN LATERAL (
        SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1
      ) pi ON true
      WHERE LOWER(COALESCE(p.status::text, 'pending')) = 'pending'
      ORDER BY p.created_at DESC`;
    const result = await db.query(q, [baseUrl]);
    return res.json({ products: result.rows });
  } catch (err) {
    console.error('GET /api/products/pending error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:id/approve
router.post('/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });

  try {
  const result = await db.query("UPDATE products SET status = 'ON_SALE', rejection_reason = NULL WHERE product_id = $1 RETURNING product_id", [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/products/:id/approve error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:id/reject
router.post('/:id/reject', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reason = (req.body && req.body.reason ? String(req.body.reason) : '').trim();
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });
  if (!reason) return res.status(400).json({ error: 'Missing reject reason' });

  try {
  const result = await db.query("UPDATE products SET status = 'REJECTED', rejection_reason = $2 WHERE product_id = $1 RETURNING product_id", [id, reason]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/products/:id/reject error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id  -> detailed product with images
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });

  try {
    // Build a query that returns product columns and an images array (prefix baseUrl for relative paths)
    const baseUrl = process.env.API_BASE_URL || (req.protocol + '://' + req.get('host'));
    const q = `SELECT p.product_id, p.enterprise_id, p.category_id, p.name, p.description, p.price, p.unit, p.stock_quantity, p.origin, p.certification, p.created_at,
      COALESCE(e.business_name, u.full_name, ('Enterprise #' || p.enterprise_id::text)) AS enterprise_name,
      pi.images
      FROM products p
      LEFT JOIN enterprises e ON e.enterprise_id = p.enterprise_id
      LEFT JOIN users u ON u.user_id = p.enterprise_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(json_agg(CASE WHEN image_url ILIKE 'http%' THEN image_url ELSE $1 || image_url END ORDER BY is_primary DESC), '[]') AS images
        FROM product_images
        WHERE product_id = p.product_id
      ) pi ON true
      WHERE p.product_id = $2
      LIMIT 1`;

    const result = await db.query(q, [baseUrl, id]);
    if (!result.rows || result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const row = result.rows[0];

    // Normalize response shape for frontend convenience
    const product = {
      id: row.product_id,
      enterpriseId: row.enterprise_id,
      enterpriseName: row.enterprise_name,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      unit: row.unit,
      stockQuantity: row.stock_quantity,
      origin: row.origin,
      certification: row.certification,
      images: row.images || [],
      createdAt: row.created_at
    };

    return res.json({ product });
  } catch (err) {
    console.error('GET /api/products/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
