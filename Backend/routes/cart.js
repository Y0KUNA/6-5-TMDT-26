const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// Simple auth middleware: sets req.userId if Authorization Bearer <token> provided
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return next();
  const token = h.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
  } catch (err) {
    // ignore and proceed as anonymous (frontend will fallback to client-side cart)
  }
  return next();
}

router.use(authMiddleware);

// helper: locate or create cart for a customer id
async function ensureCartForCustomer(client, customerId) {
  const r = await client.query('SELECT cart_id FROM carts WHERE customer_id = $1', [customerId]);
  if (r.rowCount > 0) return r.rows[0].cart_id;
  const ins = await client.query('INSERT INTO carts (customer_id, total_price) VALUES ($1, $2) RETURNING cart_id', [customerId, 0]);
  return ins.rows[0].cart_id;
}

// GET /api/cart -> returns cart and items for current user (requires auth or ?customerId=)
router.get('/', async (req, res) => {
  const customerId = req.userId || parseInt(req.query.customerId, 10);
  if (!customerId) return res.status(400).json({ error: 'customer id required' });
  try {
    const cartRes = await db.query('SELECT cart_id, customer_id, total_price, updated_at FROM carts WHERE customer_id = $1', [customerId]);
    if (cartRes.rowCount === 0) return res.json({ cart: { items: [] } });
    const cart = cartRes.rows[0];
    // Build base URL to prefix relative image paths
    const baseUrl = req.protocol + '://' + req.get('host');
    const itemsQuery = `
      SELECT ci.cart_item_id, ci.product_id, ci.unit, ci.quantity, ci.unit_price, ci.subtotal, p.name,
        CASE WHEN pi.image_url ILIKE 'http%' THEN pi.image_url ELSE $2 || pi.image_url END AS image
      FROM cart_items ci
      JOIN products p ON p.product_id = ci.product_id
      LEFT JOIN LATERAL (
        SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1
      ) pi ON true
      WHERE ci.cart_id = $1`;

    const itemsRes = await db.query(itemsQuery, [cart.cart_id, baseUrl]);
    return res.json({ cart: { cartId: cart.cart_id, customerId: cart.customer_id, totalPrice: Number(cart.total_price), updatedAt: cart.updated_at, items: itemsRes.rows } });
  } catch (err) {
    console.error('GET /api/cart error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cart/items -> { productId, unit, unitPrice, quantity }
router.post('/items', async (req, res) => {
  const customerId = req.userId || req.body.customerId;
  const { productId, unit, unitPrice, quantity } = req.body;
  if (!customerId || !productId || !unit || !unitPrice || !quantity) return res.status(400).json({ error: 'Missing fields' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cartId = await ensureCartForCustomer(client, customerId);

    // check existing item (product + unit)
    const existing = await client.query('SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND unit = $3', [cartId, productId, unit]);
    if (existing.rowCount > 0) {
      const newQty = existing.rows[0].quantity + Number(quantity);
      const subtotal = Number(unitPrice) * newQty;
      await client.query('UPDATE cart_items SET quantity = $1, unit_price = $2, subtotal = $3 WHERE cart_item_id = $4', [newQty, unitPrice, subtotal, existing.rows[0].cart_item_id]);
    } else {
      const subtotal = Number(unitPrice) * Number(quantity);
      await client.query('INSERT INTO cart_items (cart_id, product_id, unit, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5,$6)', [cartId, productId, unit, quantity, unitPrice, subtotal]);
    }

    // recalc cart total
    const totR = await client.query('SELECT COALESCE(SUM(subtotal),0) AS tot FROM cart_items WHERE cart_id = $1', [cartId]);
    const tot = totR.rows[0].tot || 0;
    await client.query('UPDATE carts SET total_price = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2', [tot, cartId]);

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Item added', total: Number(tot) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/cart/items error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/cart/items/:id -> { quantity }
router.patch('/items/:id', async (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const { quantity } = req.body;
  if (Number.isNaN(itemId) || !quantity) return res.status(400).json({ error: 'Invalid request' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const it = await client.query('SELECT cart_id, unit_price FROM cart_items WHERE cart_item_id = $1', [itemId]);
    if (it.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Cart item not found' }); }
    const unitPrice = Number(it.rows[0].unit_price);
    const subtotal = unitPrice * Number(quantity);
    await client.query('UPDATE cart_items SET quantity = $1, subtotal = $2 WHERE cart_item_id = $3', [quantity, subtotal, itemId]);
    const cartId = it.rows[0].cart_id;
    const totR = await client.query('SELECT COALESCE(SUM(subtotal),0) AS tot FROM cart_items WHERE cart_id = $1', [cartId]);
    await client.query('UPDATE carts SET total_price = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2', [totR.rows[0].tot || 0, cartId]);
    await client.query('COMMIT');
    return res.json({ message: 'Updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PATCH /api/cart/items/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// DELETE /api/cart/items/:id
router.delete('/items/:id', async (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  if (Number.isNaN(itemId)) return res.status(400).json({ error: 'Invalid item id' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const it = await client.query('SELECT cart_id FROM cart_items WHERE cart_item_id = $1', [itemId]);
    if (it.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const cartId = it.rows[0].cart_id;
    await client.query('DELETE FROM cart_items WHERE cart_item_id = $1', [itemId]);
    const totR = await client.query('SELECT COALESCE(SUM(subtotal),0) AS tot FROM cart_items WHERE cart_id = $1', [cartId]);
    await client.query('UPDATE carts SET total_price = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2', [totR.rows[0].tot || 0, cartId]);
    await client.query('COMMIT');
    return res.json({ message: 'Deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE /api/cart/items/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// POST /api/cart/checkout -> { shippingAddress, paymentMethod }
// Creates orders for each enterprise (simple single-enterprise assumption: assign to first item's product enterprise)
router.post('/checkout', async (req, res) => {
  const customerId = req.userId || req.body.customerId;
  const { shippingAddress, paymentMethod } = req.body;
  if (!customerId) return res.status(400).json({ error: 'Authentication required' });
  if (!shippingAddress || !paymentMethod) return res.status(400).json({ error: 'Missing fields' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cartR = await client.query('SELECT cart_id FROM carts WHERE customer_id = $1', [customerId]);
    if (cartR.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cart empty' }); }
    const cartId = cartR.rows[0].cart_id;
    const itemsR = await client.query('SELECT ci.product_id, ci.unit, ci.quantity, ci.unit_price, ci.subtotal, p.enterprise_id, p.name FROM cart_items ci JOIN products p ON p.product_id = ci.product_id WHERE ci.cart_id = $1', [cartId]);
    if (itemsR.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cart empty' }); }

    // For simplicity, we create one order per enterprise. Group items by enterprise_id
    const groups = {};
    itemsR.rows.forEach(it => {
      const ent = it.enterprise_id || 0;
      groups[ent] = groups[ent] || [];
      groups[ent].push(it);
    });

    const createdOrders = [];
    for (const entIdStr of Object.keys(groups)) {
      const entId = Number(entIdStr) || 0;
      const groupItems = groups[entIdStr];
      const total = groupItems.reduce((s, it) => s + Number(it.subtotal), 0);
      const orderRes = await client.query('INSERT INTO orders (customer_id, enterprise_id, total_amount, shipping_fee, shipping_address, payment_method, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING order_id', [customerId, entId, total, 0, shippingAddress, paymentMethod, 'PENDING']);
      const orderId = orderRes.rows[0].order_id;
      for (const it of groupItems) {
        await client.query('INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5,$6,$7)', [orderId, it.product_id, it.name, it.unit, it.quantity, it.unit_price, it.subtotal]);
      }
      createdOrders.push(orderId);
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    await client.query('UPDATE carts SET total_price = 0, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');
    return res.json({ message: 'Checkout complete', orders: createdOrders });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/cart/checkout error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

module.exports = router;
