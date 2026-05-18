// Cart functionality

// Render cart items grouped by store
async function renderCart() {
  const container = document.getElementById('cartItems');
  const emptyCart = document.getElementById('emptyCart');
  const summary = document.getElementById('cartSummary');
  if (!container) return;

  let cartItems = [];
  try {
    const token = localStorage.getItem('authToken');
    if (token) {
      const resp = await fetch('/api/cart', { headers: { Authorization: 'Bearer ' + token } });
      if (resp.ok) {
        const body = await resp.json();
        cartItems = (body.cart && body.cart.items) ? body.cart.items.map(i => ({ productId: i.product_id, product: { id: i.product_id, name: i.name }, unit: { name: i.unit }, quantity: i.quantity, subtotal: Number(i.subtotal || 0), cartItemId: i.cart_item_id })) : [];
      }
    }
  } catch (err) {
    console.warn('Failed to load cart from API, falling back to client', err);
  }

  if (!cartItems || cartItems.length === 0) cartItems = dataManager.getCartWithDetails();

  if (cartItems.length === 0) {
    container.style.display = 'none';
    emptyCart.style.display = 'block';
    summary.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  emptyCart.style.display = 'none';
  summary.style.display = 'block';

  const itemsByVendor = {};
  cartItems.forEach(item => {
    const vendorId = item.product.vendorId || 0;
    if (!itemsByVendor[vendorId]) itemsByVendor[vendorId] = [];
    itemsByVendor[vendorId].push(item);
  });

  let html = '';
  let totalAmount = 0;

  Object.keys(itemsByVendor).forEach(vendorId => {
    const vendor = dataManager.getAllVendors().find(v => v.id === parseInt(vendorId));
    const items = itemsByVendor[vendorId];

    html += '<div class="cart-store-section">';
    html += '<div class="cart-store-header">';
    html += '<div class="store-name">Cửa hàng: ' + (vendor ? vendor.businessName : 'Nông Sản Sạch') + '</div>';
    html += '</div>';

    items.forEach(item => {
      const isChecked = !item.unchecked;
      if (isChecked) totalAmount += Number(item.subtotal || 0);

      html += '<div class="cart-item">';
      html += '<div class="cart-item-checkbox' + (isChecked ? ' checked' : '') + '" onclick="toggleCartItem(' + (item.productId || item.product.id) + ', 0)"></div>';
      html += '<div class="cart-item-info">';
      html += '<div class="cart-item-name">' + (item.product ? item.product.name : 'Sản phẩm') + '</div>';
      html += '<div class="cart-item-unit"><span>Đơn vị: </span><span>' + (item.unit ? item.unit.name : '') + '</span></div>';
      html += '<div class="cart-item-quantity"><span>Số lượng: </span><span>' + item.quantity + '</span></div>';
      html += '</div>';
      html += '<div class="cart-item-price">' + Number(item.subtotal).toLocaleString() + ' VNĐ</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  container.innerHTML = html;
  document.getElementById('totalAmount').textContent = totalAmount.toLocaleString() + ' VNĐ';
}

// Toggle cart item selection
function toggleCartItem(productId, unitIndex) {
  const cartItems = dataManager.getCart();
  const item = cartItems.find(i => i.productId === productId && i.unitIndex === unitIndex);
  if (item) {
    item.unchecked = !item.unchecked;
    dataManager.saveCart();
    renderCart();
  }
}

// Checkout
function checkout() {
  const cartItems = dataManager.getCart().filter(item => !item.unchecked);
  
  if (cartItems.length === 0) {
    alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
    return;
  }

  // Store selected items in sessionStorage
  sessionStorage.setItem('checkoutItems', JSON.stringify(cartItems));
  window.location.href = 'checkout.html';
}

// Initialize cart page
document.addEventListener('DOMContentLoaded', function() {
  renderCart();
});
