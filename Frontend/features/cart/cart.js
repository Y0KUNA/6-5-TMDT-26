// Cart functionality (API-first, interactive)

// Render cart items grouped by store (API first, fallback to dataManager)
async function renderCart() {
  const container = document.getElementById('cartItems');
  const emptyCart = document.getElementById('emptyCart');
  const summary = document.getElementById('cartSummary');
  if (!container) return;

  // Try API first
  let cartItems = [];
  try {
    const token = localStorage.getItem('authToken');
    if (token) {
      const resp = await fetch('http://localhost:3001/api/cart', { headers: { Authorization: 'Bearer ' + token } });
      if (resp.ok) {
        const body = await resp.json();
        // Defensive: support multiple response shapes returned by the API
        // common shapes: { cart: { items: [...] } }, { items: [...] }, or [...]
        console.debug('cart API response', body);
        let rawItems = [];
        if (Array.isArray(body)) {
          rawItems = body;
        } else if (body) {
          if (body.cart && Array.isArray(body.cart.items)) rawItems = body.cart.items;
          else if (Array.isArray(body.items)) rawItems = body.items;
          else if (Array.isArray(body.data)) rawItems = body.data;
          else if (Array.isArray(body.cart)) rawItems = body.cart;
        }

        const normalize = i => {
          // server-style item with product_id / cart_item_id
          if (i && (i.product_id || i.cart_item_id)) {
            return {
              productId: i.product_id || (i.product && i.product.id) || 0,
              product: i.product || { id: i.product_id, name: i.name || (i.product && i.product.name) },
              unit: { name: i.unit || (i.product && i.product.unit) || '' },
              quantity: Number(i.quantity || i.qty || 0),
              subtotal: Number(i.subtotal || i.sub_total || i.total || 0),
              cartItemId: i.cart_item_id || i.cartItemId || i.id,
              image: i.image
            };
          }

          // client-side dataManager shape: { product: {...}, unit: {...}, quantity, subtotal }
          if (i && i.product && i.product.id) {
            return {
              productId: i.product.id,
              product: i.product,
              unit: i.unit || { name: (i.unit && i.unit.name) || '' },
              quantity: Number(i.quantity || i.qty || 0),
              subtotal: Number(i.subtotal || i.subTotal || i.price || 0),
              cartItemId: i.cartItemId || i.id
            };
          }

          // fallback minimal mapping
          return {
            productId: i && (i.product_id || (i.product && i.product.id) || i.id) || 0,
            product: i && (i.product || { id: i.product_id, name: i.name }) || { id: 0, name: 'Sản phẩm' },
            unit: { name: (i && (i.unit || i.unitName)) || '' },
            quantity: Number(i && (i.quantity || i.qty) || 0),
            subtotal: Number(i && (i.subtotal || 0) || 0),
            cartItemId: i && (i.cart_item_id || i.cartItemId || i.id)
          };
        };

        cartItems = rawItems.map(normalize);
      }
    }
  } catch (err) {
    console.warn('Failed to load cart from API, falling back to client', err);
  }

  if (!cartItems || cartItems.length === 0) {
    cartItems = dataManager.getCartWithDetails();
  }

  if (cartItems.length === 0) {
    container.style.display = 'none';
    emptyCart.style.display = 'block';
    summary.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  emptyCart.style.display = 'none';
  summary.style.display = 'block';

  // Group items by vendor
  const itemsByVendor = {};
  cartItems.forEach(item => {
    const vendorId = (item.product && item.product.vendorId) || 0;
    if (!itemsByVendor[vendorId]) itemsByVendor[vendorId] = [];
    itemsByVendor[vendorId].push(item);
  });

  let html = '';
  let totalAmount = 0;

  Object.keys(itemsByVendor).forEach(vendorId => {
    // Resolve vendor defensively: prefer product-provided vendor info, else call dataManager if available
    const items = itemsByVendor[vendorId];
    let vendor = null;
    // Try to get vendor name directly from an item (product may include vendor info)
    const sample = items.find(it => it.product && (it.product.vendorName || it.product.vendor || it.product.vendorId));
    if (sample && sample.product) {
      if (sample.product.vendorName) vendor = { businessName: sample.product.vendorName };
      else if (sample.product.vendor && sample.product.vendor.businessName) vendor = { businessName: sample.product.vendor.businessName };
      else if (sample.product.vendor && sample.product.vendor.name) vendor = { businessName: sample.product.vendor.name };
    }
    // Fallback to global dataManager if it provides vendors
    if (!vendor && typeof dataManager.getAllVendors === 'function') {
      try { vendor = dataManager.getAllVendors().find(v => v.id === parseInt(vendorId)); } catch (e) { vendor = null; }
    }

    html += '<div class="cart-store-section">';
    html += '<div class="cart-store-header">';
    html += '<div class="store-name">Cửa hàng: ' + (vendor ? vendor.businessName : 'Nông Sản Sạch') + '</div>';
    html += '</div>';

    items.forEach(item => {
      const isChecked = isItemChecked(item.cartItemId ? ('ci_' + item.cartItemId) : ('p_' + item.productId));
      if (isChecked) totalAmount += Number(item.subtotal || 0);

      const itemKey = item.cartItemId ? ('ci_' + item.cartItemId) : ('p_' + item.productId);

      // item layout: checkbox | thumbnail | main info (name, meta, qty control) | price/actions
      const thumb = item.image;
      html += '<div class="cart-item" style="display:flex; align-items:center; gap:12px; padding:14px 12px; border-bottom:1px solid #F1F1F1;">';

      // checkbox
      html += '<div style="width:28px; flex:0 0 28px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="toggleCartItem(\'' + itemKey + '\')">';
      if (isChecked) {
        html += '<div style="width:18px;height:18px;border-radius:4px;background:#16A34A;display:flex;align-items:center;justify-content:center;color:white;">';
        html += '<svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4.2 8L11 1" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        html += '</div>';
      } else {
        html += '<div style="width:18px;height:18px;border-radius:4px;border:1px solid #E5E7EB;background:transparent;"></div>';
      }
      html += '</div>';

      // thumbnail
      html += '<div style="flex:0 0 72px; width:72px; height:72px; border-radius:8px; overflow:hidden;">';
      html += '<img src="' + thumb + '" alt="thumb" style="width:100%; height:100%; object-fit:cover;">';
      html += '</div>';

      // main info
      html += '<div style="flex:1; min-width:0;">';
      html += '<div style="font-weight:600; color:#111827; font-size:16px; margin-bottom:6px;">' + (item.product ? item.product.name : 'Sản phẩm') + '</div>';
      html += '<div style="color:#6B7280; font-size:13px; margin-bottom:10px;">';
      html += '<span style="margin-right:12px;">Đơn vị: <strong style="color:#111827;">' + (item.unit ? item.unit.name : '') + '</strong></span>';
      html += '<span>Số lượng: <strong style="color:#111827;">' + item.quantity + '</strong></span>';
      html += '</div>';

      // compact quantity controls
      html += '<div style="display:flex; align-items:center; gap:8px;">';
      html += '<button class="qty-btn" style="width:36px;height:32px;border-radius:6px;border:1px solid #E5E7EB;background:#F9FAFB;" onclick="decreaseQuantity(\'' + itemKey + '\',' + (item.cartItemId ? item.cartItemId : item.productId) + ')">−</button>';
      html += '<input id="qty_' + itemKey + '" value="' + item.quantity + '" style="width:56px; height:32px; text-align:center; border:1px solid #E5E7EB; border-radius:6px;" />';
      html += '<button class="qty-btn" style="width:36px;height:32px;border-radius:6px;border:1px solid #E5E7EB;background:#F9FAFB;" onclick="increaseQuantity(\'' + itemKey + '\',' + (item.cartItemId ? item.cartItemId : item.productId) + ')">+</button>';
      html += '</div>';

      html += '</div>'; // end main info

      // price and actions
      html += '<div style="flex:0 0 160px; text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:8px;">';
      html += '<div style="font-weight:700; color:#16A34A;">' + Number(item.subtotal).toLocaleString() + ' VNĐ</div>';
      html += '<button class="btn btn-secondary small" style="padding:6px 10px; font-size:13px;" onclick="removeCartItem(\'' + itemKey + '\',' + (item.cartItemId ? item.cartItemId : item.productId) + ')">Xóa</button>';
      html += '</div>';

      html += '</div>';
    });

    html += '</div>';
  });

  container.innerHTML = html;
  document.getElementById('totalAmount').textContent = totalAmount.toLocaleString() + ' VNĐ';
}

// Selection state stored in sessionStorage
function isItemChecked(itemKey) {
  try {
    const raw = sessionStorage.getItem('cartChecked') || '{}';
    const map = JSON.parse(raw);
    return map[itemKey] !== false;
  } catch (e) { return true; }
}

function toggleCartItem(itemKey) {
  try {
    const raw = sessionStorage.getItem('cartChecked') || '{}';
    const map = JSON.parse(raw);
    map[itemKey] = !(map[itemKey] === undefined ? true : map[itemKey]);
    sessionStorage.setItem('cartChecked', JSON.stringify(map));
    renderCart();
  } catch (e) { console.warn('toggleCartItem error', e); }
}

async function updateQuantityOnServer(cartItemId, quantity) {
  const token = localStorage.getItem('authToken');
  if (!token) return false;
  try {
    const resp = await fetch('/api/cart/items/' + cartItemId, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ quantity }) });
    return resp.ok;
  } catch (e) { return false; }
}

function increaseQuantity(itemKey, id) {
  const input = document.getElementById('qty_' + itemKey);
  if (!input) return;
  let q = parseInt(input.value) || 1; q++;
  input.value = q;
  if (String(itemKey).startsWith('ci_') && Number.isInteger(id)) {
    updateQuantityOnServer(id, q).then(ok => { if (!ok) { dataManager.updateCartQuantity(id, 0, q); } renderCart(); });
  } else {
    // id is productId fallback, unitIndex assumed 0
    dataManager.updateCartQuantity(id, 0, q);
    renderCart();
  }
}

function decreaseQuantity(itemKey, id) {
  const input = document.getElementById('qty_' + itemKey);
  if (!input) return;
  let q = parseInt(input.value) || 1; if (q > 1) q--; input.value = q;
  if (String(itemKey).startsWith('ci_') && Number.isInteger(id)) {
    updateQuantityOnServer(id, q).then(ok => { if (!ok) { dataManager.updateCartQuantity(id, 0, q); } renderCart(); });
  } else {
    dataManager.updateCartQuantity(id, 0, q);
    renderCart();
  }
}

async function removeCartItem(itemKey, id) {
  if (!confirm('Bạn có chắc muốn xóa sản phẩm khỏi giỏ hàng?')) return;
  const token = localStorage.getItem('authToken');
  if (token && String(itemKey).startsWith('ci_') && Number.isInteger(id)) {
    try {
      const resp = await fetch('/api/cart/items/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
      if (resp.ok) { renderCart(); return; }
    } catch (e) { console.warn('server remove failed', e); }
  }

  // fallback: remove from client-side cart (id is productId)
  dataManager.removeFromCart(id, 0);
  renderCart();
}

// Checkout uses client-side selected items (existing flow)
function checkout() {
  // collect items from client dataManager (keeps compatibility)
  const cartItems = dataManager.getCart().filter(item => !item.unchecked);
  if (cartItems.length === 0) { alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán'); return; }
  sessionStorage.setItem('checkoutItems', JSON.stringify(cartItems));
  window.location.href = '../checkout/checkout.html';
}

// Initialize cart page
document.addEventListener('DOMContentLoaded', function () { renderCart(); });
