// Checkout functionality

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:3001';
const SHIPPING_FEE = 30000;

let selectedPaymentMethod = 'bank';
let checkoutItems = [];

function formatVND(value) {
  return Number(value || 0).toLocaleString('vi-VN') + ' VNĐ';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeCheckoutItem(item) {
  const product = item.product || {};
  const productId = item.productId || item.product_id || product.id || product.product_id;
  const fallbackProduct = productId && typeof dataManager !== 'undefined' && dataManager.getProductById
    ? dataManager.getProductById(Number(productId))
    : null;
  const resolvedProduct = product.id || product.name ? product : (fallbackProduct || {});
  const unit = item.unit && typeof item.unit === 'object'
    ? item.unit
    : { name: item.unit || (resolvedProduct.units && resolvedProduct.units[item.unitIndex || 0] && resolvedProduct.units[item.unitIndex || 0].name) || '' };
  const unitPrice = Number(item.unitPrice || item.unit_price || item.price || (resolvedProduct.units && resolvedProduct.units[item.unitIndex || 0] && resolvedProduct.units[item.unitIndex || 0].price) || 0);
  const quantity = Number(item.quantity || item.qty || 0);
  const subtotal = Number(item.subtotal || item.subTotal || unitPrice * quantity || 0);
  const enterpriseId = item.enterpriseId || item.enterprise_id || item.vendorId || item.vendor_id || resolvedProduct.enterpriseId || resolvedProduct.enterprise_id || resolvedProduct.vendorId;
  const enterpriseName = item.enterpriseName || item.enterprise_name || item.businessName || item.business_name || resolvedProduct.enterpriseName || resolvedProduct.enterprise_name || resolvedProduct.businessName;

  return {
    ...item,
    cartItemId: item.cartItemId || item.cart_item_id || item.id,
    productId,
    enterpriseId,
    enterpriseName,
    product: {
      ...resolvedProduct,
      id: productId,
      name: resolvedProduct.name || item.name || 'Sản phẩm',
      enterpriseId,
      vendorId: enterpriseId,
      enterpriseName
    },
    unit,
    unitPrice,
    quantity,
    subtotal
  };
}

async function loadCheckoutItems() {
  const stored = sessionStorage.getItem('checkoutItems');
  if (stored) {
    try {
      checkoutItems = JSON.parse(stored).map(normalizeCheckoutItem);
      return checkoutItems;
    } catch (error) {
      console.warn('Invalid checkoutItems in sessionStorage', error);
    }
  }

  const token = localStorage.getItem('authToken');
  if (token) {
    const response = await fetch(API_BASE + '/api/cart', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (response.ok) {
      const body = await response.json();
      const rawItems = body && body.cart && Array.isArray(body.cart.items) ? body.cart.items : [];
      checkoutItems = rawItems.map(normalizeCheckoutItem);
      sessionStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
      return checkoutItems;
    }
  }

  if (typeof dataManager !== 'undefined' && dataManager.getCartWithDetails) {
    checkoutItems = dataManager.getCartWithDetails().map(normalizeCheckoutItem);
    return checkoutItems;
  }

  checkoutItems = [];
  return checkoutItems;
}

function resolveVendorName(vendorId, items) {
  const sample = items.find((item) => item.enterpriseName || (item.product && item.product.enterpriseName));
  if (sample) return sample.enterpriseName || sample.product.enterpriseName;

  if (typeof dataManager !== 'undefined' && dataManager.getAllVendors) {
    const vendor = dataManager.getAllVendors().find((v) => Number(v.id) === Number(vendorId));
    if (vendor) return vendor.businessName;
  }

  return 'Nông Sản Sạch';
}

async function renderOrderItems() {
  const container = document.getElementById('orderItems');
  if (!container) return;

  const items = await loadCheckoutItems();
  if (!items.length) {
    alert('Giỏ hàng trống hoặc chưa có sản phẩm được chọn');
    window.location.href = '../cart/cart.html';
    return;
  }

  const itemsByVendor = {};
  items.forEach((item) => {
    const vendorId = item.enterpriseId || item.vendorId || (item.product && (item.product.enterpriseId || item.product.vendorId)) || 0;
    if (!itemsByVendor[vendorId]) itemsByVendor[vendorId] = [];
    itemsByVendor[vendorId].push(item);
  });

  let html = '';
  let subtotal = 0;

  Object.keys(itemsByVendor).forEach((vendorId) => {
    const items = itemsByVendor[vendorId];
    html += '<div style="border: 1px solid #E5E7EB; border-radius: 8px; background: #FFF; margin-bottom: 24px; overflow: hidden;">';
    html += '<div style="padding: 16px 24px; border-bottom: 0.667px solid #E5E7EB;">';
    html += '<div style="color: #1F2937; font-size: 20px; font-weight: 600;">Cửa hàng: ' + escapeHtml(resolveVendorName(vendorId, items)) + '</div>';
    html += '</div>';

    items.forEach((item) => {
      subtotal += Number(item.subtotal || 0);
      html += '<div style="padding: 20px 24px; border-bottom: 0.667px solid #E5E7EB; display: flex; align-items: center; gap: 16px;">';
      html += '<div style="width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(0, 0, 0, 0.66); background: #16A34A;"></div>';
      html += '<div style="flex: 1;">';
      html += '<div style="color: #1F2937; font-size: 16px; font-weight: 600; margin-bottom: 4px;">' + escapeHtml(item.product.name) + '</div>';
      html += '<div style="color: #1F2937; font-size: 14px;"><span>Đơn vị: </span><span style="font-weight: 600;">' + escapeHtml(item.unit.name || item.unit || '') + '</span></div>';
      html += '<div style="color: #1F2937; font-size: 14px;"><span>Số lượng: </span><span style="font-weight: 600;">' + item.quantity + '</span></div>';
      html += '</div>';
      html += '<div style="color: #1F2937; font-size: 16px; font-weight: 600; text-align: right; min-width: 120px;">' + formatVND(item.subtotal) + '</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  container.innerHTML = html;
  document.getElementById('subtotal').textContent = formatVND(subtotal);
  document.getElementById('total').textContent = formatVND(subtotal + SHIPPING_FEE);
}

function selectPayment(method) {
  selectedPaymentMethod = method;

  const bankInfo = document.getElementById('bankInfo');
  const bankCheck = document.getElementById('bankCheck');
  const codCheck = document.getElementById('codCheck');

  if (method === 'bank') {
    if (bankInfo) bankInfo.style.display = 'block';
    if (bankCheck) bankCheck.style.background = '#16A34A';
    if (codCheck) codCheck.style.background = 'transparent';
  } else {
    if (bankInfo) bankInfo.style.display = 'none';
    if (codCheck) codCheck.style.background = '#16A34A';
    if (bankCheck) bankCheck.style.background = 'transparent';
  }
}

async function confirmCheckout() {
  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();

  if (!fullName || !phone || !address) {
    alert('Vui lòng điền đầy đủ thông tin người nhận');
    return;
  }
  if (!checkoutItems.length) {
    alert('Không có sản phẩm để thanh toán');
    return;
  }

  const submitButton = document.querySelector('button[onclick="confirmCheckout()"]');
  const originalText = submitButton ? submitButton.textContent : '';
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Đang xử lý...';
  }

  const token = localStorage.getItem('authToken');
  const selectedCartItemIds = checkoutItems.map((item) => item.cartItemId).filter(Boolean);
  const shippingAddress = { fullName, phone, address };

  try {
    if (!token) throw new Error('No auth token');
    let paymentResult = 'PENDING';
    if (selectedPaymentMethod === 'bank') {
      const confirmed = confirm('Bạn sẽ được chuyển sang bước thanh toán chuyển khoản. Xác nhận đã hoàn tất giao dịch?');
      if (!confirmed) {
        alert('Thanh toán đã được hủy. Đơn hàng chưa được tạo.');
        return;
      }
      paymentResult = 'SUCCESS';
    }

    const response = await fetch(API_BASE + '/api/cart/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        shippingAddress,
        paymentMethod: selectedPaymentMethod,
        paymentResult,
        shippingFee: SHIPPING_FEE,
        selectedCartItemIds
      })
    });

    const body = await response.json().catch(() => ({}));
    if (response.status === 202 && body.paymentRequired) {
      alert(body.message || 'Vui lòng hoàn tất thanh toán trước khi tạo đơn hàng');
      return;
    }
    if (!response.ok) throw new Error(body.error || 'Checkout failed');

    sessionStorage.removeItem('checkoutItems');
    sessionStorage.removeItem('cartChecked');
    alert('Đặt hàng thành công! Mã đơn hàng: #' + (body.orders ? body.orders.join(', ') : ''));
    window.location.href = '../order-management/order-management.html';
  } catch (error) {
    console.warn('Server checkout failed, falling back to client order:', error);
    const subtotal = checkoutItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const order = dataManager.createOrder({
      items: checkoutItems,
      shippingInfo: shippingAddress,
      paymentMethod: selectedPaymentMethod,
      shippingFee: SHIPPING_FEE,
      totalAmount: subtotal + SHIPPING_FEE,
      status: 'pending'
    });
    sessionStorage.removeItem('checkoutItems');
    alert('Đặt hàng thành công! Mã đơn hàng: #' + order.id);
    window.location.href = '../home/index.html';
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
}

function loadUserInfo() {
  const currentUser = dataManager.getCurrentUser();
  if (currentUser) {
    document.getElementById('fullName').value = currentUser.fullName || currentUser.full_name || '';
    document.getElementById('phone').value = currentUser.phone || '';
    document.getElementById('address').value = currentUser.address || '';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadUserInfo();
  renderOrderItems();
  selectPayment('bank');

  const orderCode = 'Thanh toan don hang #' + Math.floor(Math.random() * 100000);
  document.getElementById('orderCode').textContent = orderCode;
});
