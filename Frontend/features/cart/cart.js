// Cart functionality (moved from js/cart.js)

// Render cart items grouped by store
function renderCart() {
  const container = document.getElementById('cartItems');
  const emptyCart = document.getElementById('emptyCart');
  const summary = document.getElementById('cartSummary');
  
  if (!container) return;

  const cartItems = dataManager.getCartWithDetails();
  
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
    const vendorId = item.product.vendorId;
    if (!itemsByVendor[vendorId]) {
      itemsByVendor[vendorId] = [];
    }
    itemsByVendor[vendorId].push(item);
  });

  // Render grouped items
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
      if (isChecked) {
        totalAmount += item.subtotal;
      }

      html += '<div class="cart-item">';
      html += '<div class="cart-item-checkbox' + (isChecked ? ' checked' : '') + '" onclick="toggleCartItem(' + item.productId + ', ' + item.unitIndex + ')"></div>';
      html += '<div class="cart-item-info">';
      html += '<div class="cart-item-name">' + item.product.name + '</div>';
      html += '<div class="cart-item-unit"><span>Đơn vị: </span><span>' + item.unit.name + '</span></div>';
      html += '<div class="cart-item-quantity"><span>Số lượng: </span><span>' + item.quantity + '</span></div>';
      html += '</div>';
      html += '<div class="cart-item-price">' + item.subtotal.toLocaleString() + ' VNĐ</div>';
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
  window.location.href = '../checkout/checkout.html';
}

// Initialize cart page
document.addEventListener('DOMContentLoaded', function() {
  renderCart();
});
