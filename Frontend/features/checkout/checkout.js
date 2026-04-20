// Checkout functionality (moved from js/checkout.js)

let selectedPaymentMethod = 'bank';

// Render order items
function renderOrderItems() {
  const container = document.getElementById('orderItems');
  if (!container) return;

  const checkoutItemsStr = sessionStorage.getItem('checkoutItems');
  if (!checkoutItemsStr) {
    window.location.href = '../cart/cart.html';
    return;
  }

  const checkoutItems = JSON.parse(checkoutItemsStr);
  const itemsWithDetails = checkoutItems.map(item => {
    const product = dataManager.getProductById(item.productId);
    return {
      ...item,
      product,
      unit: product.units[item.unitIndex],
      subtotal: product.units[item.unitIndex].price * item.quantity
    };
  });

  // Group by vendor
  const itemsByVendor = {};
  itemsWithDetails.forEach(item => {
    const vendorId = item.product.vendorId;
    if (!itemsByVendor[vendorId]) {
      itemsByVendor[vendorId] = [];
    }
    itemsByVendor[vendorId].push(item);
  });

  let html = '';
  let subtotal = 0;

  Object.keys(itemsByVendor).forEach(vendorId => {
    const vendor = dataManager.getAllVendors().find(v => v.id === parseInt(vendorId));
    const items = itemsByVendor[vendorId];

    html += '<div style="border: 1px solid #E5E7EB; border-radius: 8px; background: #FFF; margin-bottom: 24px; overflow: hidden;">';
    html += '<div style="padding: 16px 24px; border-bottom: 0.667px solid #E5E7EB;">';
    html += '<div style="color: #1F2937; font-size: 20px; font-weight: 600;">Cửa hàng: ' + (vendor ? vendor.businessName : 'Nông Sản Sạch') + '</div>';
    html += '</div>';

    items.forEach(item => {
      subtotal += item.subtotal;

      html += '<div style="padding: 20px 24px; border-bottom: 0.667px solid #E5E7EB; display: flex; align-items: center; gap: 16px;">';
      html += '<div style="width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(0, 0, 0, 0.66); background: #16A34A; position: relative;">';
      html += '<svg style="width: 8px; height: 6px; position: absolute; left: 3px; top: 4px;" viewBox="0 0 8 6" fill="none">';
      html += '<path d="M7 0.5L2.5 5L0.5 2.5" stroke="white" stroke-linecap="round"/>'; 
      html += '</svg>';
      html += '</div>';
      html += '<div style="flex: 1;">';
      html += '<div style="color: #1F2937; font-size: 16px; font-weight: 600; margin-bottom: 4px;">' + item.product.name + '</div>';
      html += '<div style="color: #1F2937; font-size: 14px;"><span>Đơn vị: </span><span style="font-weight: 600;">' + item.unit.name + '</span></div>';
      html += '<div style="color: #1F2937; font-size: 14px;"><span>Số lượng: </span><span style="font-weight: 600;">' + item.quantity + '</span></div>';
      html += '</div>';
      html += '<div style="color: #1F2937; font-size: 16px; font-weight: 600; text-align: right; min-width: 120px;">' + item.subtotal.toLocaleString() + ' VNĐ</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  container.innerHTML = html;

  const shippingFee = 30000;
  const total = subtotal + shippingFee;

  document.getElementById('subtotal').textContent = subtotal.toLocaleString() + ' VNĐ';
  document.getElementById('total').textContent = total.toLocaleString() + ' VNĐ';
}

// Select payment method
function selectPayment(method) {
  selectedPaymentMethod = method;

  const bankOption = document.querySelector('.payment-method-option:first-child');
  const codOption = document.querySelector('.payment-method-option:last-child');
  const bankInfo = document.getElementById('bankInfo');
  const bankCheck = document.getElementById('bankCheck');
  const codCheck = document.getElementById('codCheck');

  if (method === 'bank') {
    if (bankOption) bankOption.classList.add('selected');
    if (codOption) codOption.classList.remove('selected');
    if (bankInfo) bankInfo.style.display = 'block';
    if (bankCheck) bankCheck.style.background = '#16A34A';
    if (codCheck) codCheck.style.background = 'transparent';
  } else {
    if (codOption) codOption.classList.add('selected');
    if (bankOption) bankOption.classList.remove('selected');
    if (bankInfo) bankInfo.style.display = 'none';
    if (codCheck) codCheck.style.background = '#16A34A';
    if (bankCheck) bankCheck.style.background = 'transparent';
  }
}

// Confirm checkout
function confirmCheckout() {
  const fullName = document.getElementById('fullName').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;

  if (!fullName || !phone || !address) {
    alert('Vui lòng điền đầy đủ thông tin người nhận');
    return;
  }

  const checkoutItemsStr = sessionStorage.getItem('checkoutItems');
  const checkoutItems = JSON.parse(checkoutItemsStr);

  const itemsWithDetails = checkoutItems.map(item => {
    const product = dataManager.getProductById(item.productId);
    return {
      ...item,
      unit: product.units[item.unitIndex],
      subtotal: product.units[item.unitIndex].price * item.quantity
    };
  });

  const subtotal = itemsWithDetails.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = 30000;
  const totalAmount = subtotal + shippingFee;

  const order = dataManager.createOrder({
    items: checkoutItems,
    shippingInfo: {
      fullName,
      phone,
      address
    },
    paymentMethod: selectedPaymentMethod,
    shippingFee,
    totalAmount,
    status: 'pending'
  });

  sessionStorage.removeItem('checkoutItems');

  alert('Đặt hàng thành công! Mã đơn hàng: #' + order.id);
  window.location.href = '../home/index.html';
}

// Load user info
function loadUserInfo() {
  const currentUser = dataManager.getCurrentUser();
  if (currentUser) {
    document.getElementById('fullName').value = currentUser.fullName || '';
    document.getElementById('phone').value = currentUser.phone || '';
    document.getElementById('address').value = currentUser.address || '';
  }
}

// Initialize checkout page
document.addEventListener('DOMContentLoaded', function() {
  loadUserInfo();
  renderOrderItems();
  selectPayment('bank');

  // Generate order code
  const orderCode = 'Thanh toan don hang #' + Math.floor(Math.random() * 100000);
  document.getElementById('orderCode').textContent = orderCode;
});
