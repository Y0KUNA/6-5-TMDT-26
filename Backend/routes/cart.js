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
  // Ensure the user exists in users and customers tables to satisfy FK constraints
  const uid = Number(customerId);
  if (Number.isNaN(uid) || uid <= 0) throw new Error('Invalid customerId');

  // Check users table
  const userR = await client.query('SELECT user_id FROM users WHERE user_id = $1', [uid]);
  if (userR.rowCount === 0) {
    // Create a minimal user record for testing (non-production convenience)
    // Note: this inserts an explicit user_id value to match the requested customerId
    await client.query(
      `INSERT INTO users (user_id, role, full_name, email, phone, password_hash, is_active, created_at)
       VALUES ($1, 'customer', $2, $3, $4, $5, true, CURRENT_TIMESTAMP)`,
      [uid, 'Khách hàng ' + uid, `user+${uid}@example.com`, '0000000000', '']
    );
  }

  // Ensure customers row exists
  const custR = await client.query('SELECT customer_id FROM customers WHERE customer_id = $1', [uid]);
  if (custR.rowCount === 0) {
    await client.query('INSERT INTO customers (customer_id, address) VALUES ($1, NULL)', [uid]);
  }

  // Now ensure cart
  const r = await client.query('SELECT cart_id FROM carts WHERE customer_id = $1', [uid]);
  if (r.rowCount > 0) return r.rows[0].cart_id;
  const ins = await client.query('INSERT INTO carts (customer_id, total_price) VALUES ($1, $2) RETURNING cart_id', [uid, 0]);
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
        p.enterprise_id,
        COALESCE(e.business_name, u.full_name, ('Enterprise #' || p.enterprise_id::text)) AS enterprise_name,
        CASE WHEN pi.image_url ILIKE 'http%' THEN pi.image_url ELSE $2 || pi.image_url END AS image
      FROM cart_items ci
      JOIN products p ON p.product_id = ci.product_id
      LEFT JOIN enterprises e ON e.enterprise_id = p.enterprise_id
      LEFT JOIN users u ON u.user_id = p.enterprise_id
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

// POST /api/cart/items -> { productId, enterpriseId, unit, unitPrice, quantity }
router.post('/items', async (req, res) => {
  const customerId = req.userId || req.body.customerId;
  const { productId, enterpriseId, unit, unitPrice, quantity } = req.body;
  if (!customerId || !productId || !unit || !unitPrice || !quantity) return res.status(400).json({ error: 'Missing fields' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cartId = await ensureCartForCustomer(client, customerId);
    const productR = await client.query('SELECT product_id, name, unit, price, stock_quantity FROM products WHERE product_id = $1', [productId]);
    if (productR.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productR.rows[0];

    // check existing item (product + unit)
    const existing = await client.query('SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND unit = $3', [cartId, productId, unit]);
    const currentQty = existing.rowCount > 0 ? Number(existing.rows[0].quantity || 0) : 0;
    const requestedQty = currentQty + Number(quantity);
    if (requestedQty > Number(product.stock_quantity || 0)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Chỉ còn ${product.stock_quantity} ${product.unit || unit} trong kho` });
    }
    const finalUnitPrice = Number(unitPrice || product.price || 0);
    if (existing.rowCount > 0) {
      const subtotal = finalUnitPrice * requestedQty;
      await client.query('UPDATE cart_items SET quantity = $1, unit_price = $2, subtotal = $3 WHERE cart_item_id = $4', [requestedQty, finalUnitPrice, subtotal, existing.rows[0].cart_item_id]);
    } else {
      const subtotal = finalUnitPrice * Number(quantity);
      await client.query('INSERT INTO cart_items (cart_id, product_id, unit, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5,$6)', [cartId, productId, unit, quantity, finalUnitPrice, subtotal]);
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

function normalizePaymentMethod(method) {
  const raw = String(method || '').toLowerCase();
  if (raw === 'cod') return 'COD';
  return 'ONLINE';
}

function normalizePaymentResult(result) {
  const raw = String(result || '').toUpperCase();
  if (raw === 'FAILED' || raw === 'TIMEOUT' || raw === 'CANCELLED') return raw;
  if (raw === 'SUCCESS') return 'SUCCESS';
  return 'PENDING';
}

function buildShippingAddress(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const parts = [value.fullName, value.phone, value.address].filter(Boolean);
    return parts.join(' - ');
  }
  return '';
}

// POST /api/cart/checkout -> { shippingAddress, paymentMethod, paymentResult, shippingFee, selectedCartItemIds }
// Creates one order per enterprise and a matching payment row for each order.
router.post('/checkout', async (req, res) => {
  const customerId = req.userId || req.body.customerId;
  const { shippingAddress, paymentMethod, paymentResult, selectedCartItemIds } = req.body;
  const shippingFee = Number(req.body.shippingFee || 30000);
  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  const normalizedPaymentResult = normalizePaymentResult(paymentResult);
  const addressText = buildShippingAddress(shippingAddress);
  if (!customerId) return res.status(400).json({ error: 'Authentication required' });
  if (!addressText || !paymentMethod) return res.status(400).json({ error: 'Missing fields' });

  if (normalizedPaymentMethod === 'ONLINE') {
    if (normalizedPaymentResult === 'FAILED') return res.status(402).json({ error: 'Thanh toán thất bại, vui lòng thử lại' });
    if (normalizedPaymentResult === 'TIMEOUT') return res.status(408).json({ error: 'Giao dịch hết thời gian' });
    if (normalizedPaymentResult === 'CANCELLED') return res.status(409).json({ error: 'Khách hàng đã hủy thanh toán' });
    if (normalizedPaymentResult !== 'SUCCESS') {
      return res.status(202).json({
        paymentRequired: true,
        message: 'Vui lòng hoàn tất giao dịch thanh toán online trước khi tạo đơn hàng'
      });
    }
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cartR = await client.query('SELECT cart_id FROM carts WHERE customer_id = $1', [customerId]);
    if (cartR.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cart empty' }); }
    const cartId = cartR.rows[0].cart_id;

    const selectedIds = Array.isArray(selectedCartItemIds)
      ? selectedCartItemIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id))
      : [];
    const params = [cartId];
    let selectedClause = '';
    if (selectedIds.length > 0) {
      params.push(selectedIds);
      selectedClause = ' AND ci.cart_item_id = ANY($2::int[])';
    }

    const itemsR = await client.query(
      `SELECT ci.cart_item_id, ci.product_id, ci.unit, ci.quantity, ci.unit_price, ci.subtotal,
        p.enterprise_id, p.name, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON p.product_id = ci.product_id
       WHERE ci.cart_id = $1${selectedClause}`,
      params
    );
    if (itemsR.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cart empty' }); }

    const outOfStock = itemsR.rows.find((it) => Number(it.stock_quantity || 0) < Number(it.quantity || 0));
    if (outOfStock) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Sản phẩm "${outOfStock.name}" chỉ còn ${outOfStock.stock_quantity} ${outOfStock.unit} trong kho`
      });
    }

    // Create one order per enterprise.
    const groups = {};
    itemsR.rows.forEach(it => {
      const ent = it.enterprise_id || 0;
      groups[ent] = groups[ent] || [];
      groups[ent].push(it);
    });

    // Prepare totals per enterprise and grand total
    const enterpriseTotals = {};
    const enterpriseIds = Object.keys(groups);
    enterpriseIds.forEach((entIdStr, idx) => {
      const ent = Number(entIdStr) || 0;
      const group = groups[entIdStr] || [];
      const groupShippingFee = idx === 0 ? shippingFee : 0;
      const subtotal = group.reduce((s, it) => s + Number(it.subtotal || 0), 0);
      const total = subtotal + groupShippingFee;
      enterpriseTotals[ent] = { subtotal, shippingFee: groupShippingFee, total };
    });

    const grandTotal = Object.values(enterpriseTotals).reduce((s, v) => s + Number(v.total || 0), 0);

    // wallet helpers
    async function getOrCreateWallet(ownerType, ownerId) {
      const r = await client.query('SELECT wallet_id, balance FROM wallets WHERE owner_type = $1 AND owner_id = $2', [ownerType, ownerId]);
      if (r.rowCount > 0) return r.rows[0];
      const ins = await client.query('INSERT INTO wallets (owner_type, owner_id, balance) VALUES ($1,$2,$3) RETURNING wallet_id, balance', [ownerType, ownerId, 0]);
      return ins.rows[0];
    }

    // If online payment and successful, perform wallet movement buyer -> platform (escrow)
    let buyerWallet = null;
    let platformWallet = null;
    if (normalizedPaymentMethod === 'ONLINE' && normalizedPaymentResult === 'SUCCESS') {
      buyerWallet = await getOrCreateWallet('CUSTOMER', customerId);
      platformWallet = await getOrCreateWallet('PLATFORM', 0);
      const buyerBalance = Number(buyerWallet.balance || 0);
      if (buyerBalance < Number(grandTotal)) {
        await client.query('ROLLBACK');
        return res.status(402).json({ error: 'Số dư ví không đủ để thanh toán đơn hàng' });
      }
      // move funds
      await client.query('UPDATE wallets SET balance = balance - $1 WHERE wallet_id = $2', [grandTotal, buyerWallet.wallet_id]);
      await client.query('UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2', [grandTotal, platformWallet.wallet_id]);
    }

    const createdOrders = [];
    const createdPayments = [];
    for (let groupIndex = 0; groupIndex < enterpriseIds.length; groupIndex++) {
      const entIdStr = enterpriseIds[groupIndex];
      const entId = Number(entIdStr) || 0;
      const groupItems = groups[entIdStr];
      const totals = enterpriseTotals[entId] || { subtotal: 0, shippingFee: 0, total: 0 };
      const groupShippingFee = totals.shippingFee;
      const subtotal = totals.subtotal;
      const total = totals.total;
      const orderRes = await client.query(
        `INSERT INTO orders
          (customer_id, enterprise_id, total_amount, shipping_fee, shipping_address, payment_status, payment_method, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING order_id`,
        [
          customerId,
          entId,
          total,
          groupShippingFee,
          addressText,
          normalizedPaymentMethod === 'ONLINE' ? 'PAID' : 'UNPAID',
          normalizedPaymentMethod,
          'PENDING'
        ]
      );
      const orderId = orderRes.rows[0].order_id;
      for (const it of groupItems) {
        await client.query('INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5,$6,$7)', [orderId, it.product_id, it.name, it.unit, it.quantity, it.unit_price, it.subtotal]);
        await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2', [it.quantity, it.product_id]);
      }
      const transactionCode = 'PAY-' + orderId + '-' + Date.now();
      const paymentRes = await client.query(
        `INSERT INTO payments (order_id, amount, method, status, transaction_code, gateway_name, paid_at, expired_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP + INTERVAL '24 hours')
         RETURNING payment_id`,
        [
          orderId,
          total,
          normalizedPaymentMethod,
          normalizedPaymentMethod === 'ONLINE' ? 'SUCCESS' : 'PENDING',
          transactionCode,
          normalizedPaymentMethod === 'ONLINE' ? 'BANK_TRANSFER' : 'COD',
          normalizedPaymentMethod === 'ONLINE' ? new Date() : null
        ]
      );
      createdOrders.push(orderId);
      createdPayments.push(paymentRes.rows[0].payment_id);
      // record transaction mapping buyer->platform for this order when wallet flow used
      if (normalizedPaymentMethod === 'ONLINE' && normalizedPaymentResult === 'SUCCESS' && buyerWallet && platformWallet) {
        try {
          await client.query(
            `INSERT INTO transactions (from_wallet_id, to_wallet_id, order_id, amount, type, status, description, completed_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)`,
            [buyerWallet.wallet_id, platformWallet.wallet_id, orderId, total, 'PAYMENT', 'SUCCESS', 'Customer payment for order ' + orderId]
          );
        } catch (e) {
          console.warn('Failed to insert payment transaction for order', orderId, e);
        }
      }
    }

    // Clear paid items. If no selected ids are provided, clear the whole cart.
    if (selectedIds.length > 0) {
      await client.query('DELETE FROM cart_items WHERE cart_id = $1 AND cart_item_id = ANY($2::int[])', [cartId, selectedIds]);
    } else {
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    }
    await client.query('UPDATE carts SET total_price = 0, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $1', [cartId]);
    const totR = await client.query('SELECT COALESCE(SUM(subtotal),0) AS tot FROM cart_items WHERE cart_id = $1', [cartId]);
    await client.query('UPDATE carts SET total_price = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2', [totR.rows[0].tot || 0, cartId]);

    await client.query('COMMIT');
    return res.json({
      message: 'Checkout complete',
      orders: createdOrders,
      payments: createdPayments,
      paymentMethod: normalizedPaymentMethod
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/cart/checkout error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

module.exports = router;
