// Order Management (moved to features/order-management)

let currentUser = null;
let currentStatus = 'all';
let selectedRating = 0;
let currentOrder = null;

// Helper: normalize role and detect account type
function normalizedRole(u) {
  if (!u) return '';
  const r = u.role || u.user_role || u.type || u.userType || '';
  return String(r || '').toLowerCase();
}

function isEnterpriseUser(u) {
  const r = normalizedRole(u);
  return ['enterprise', 'business', 'vendor', 'seller', 'merchant'].includes(r);
}

function isCustomerUser(u) {
  const r = normalizedRole(u);
  return ['customer', 'buyer'].includes(r) || !r; // treat unspecified role as customer by default
}

function getUserId(u) {
  return (u && (u.user_id || u.id || u.userId || u.customer_id || u.customerId)) || null;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  currentUser = dataManager.getCurrentUser();
  
  if (!currentUser) {
    window.location.href = '../login/login.html';
    return;
  }

  // Update login link with dropdown
  const loginLink = document.getElementById('loginLink');
  if (loginLink && currentUser) {
    loginLink.innerHTML = `
      <span style="position: relative;">
        ${currentUser.fullName}
        <span style="margin-left: 8px; color: #666;">▼</span>
      </span>
    `;
    loginLink.href = '#';
    loginLink.style.position = 'relative';
    loginLink.style.cursor = 'pointer';
    
    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.style.cssText = 'display: none; position: absolute; top: 100%; right: 0; background: white; border: 1px solid #E5E7EB; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 150px; z-index: 10000; margin-top: 4px;';
    
    const profileLink = document.createElement('a');
    profileLink.href = '../order-management/order-management.html';
    profileLink.textContent = 'Đơn hàng của tôi';
    profileLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB; cursor: pointer;';
    
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Đăng xuất';
    logoutLink.style.cssText = 'display: block; padding: 12px 16px; color: #EF4444; text-decoration: none;';
    logoutLink.onclick = function(e) {
      e.preventDefault();
      handleLogout();
    };
    
    dropdown.appendChild(profileLink);
    dropdown.appendChild(logoutLink);
    loginLink.appendChild(dropdown);
    
    // Toggle dropdown
    loginLink.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    };
    
    // Allow links inside dropdown to work
    dropdown.onclick = function(e) {
      e.stopPropagation();
      // Close dropdown when clicking on a link
      if (e.target.tagName === 'A') {
        dropdown.style.display = 'none';
      }
    };
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!loginLink.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Initialize tabs
  // Hide tabs depending on role (customers shouldn't see business tab; enterprises shouldn't see customer tab)
  try {
    console.log('Current user:', currentUser.role);
    const isEnterprise = isEnterpriseUser(currentUser);
    console.log('Is enterprise user:', isEnterprise);
    const myTabNav = document.querySelector('.tab-nav-item[data-tab="my-orders"]');
    const bizTabNav = document.querySelector('.tab-nav-item[data-tab="business-orders"]');
    const myTabContent = document.getElementById('my-orders-tab');
    const bizTabContent = document.getElementById('business-orders-tab');

    if (isEnterprise) {
      // show only business tab
      if (myTabNav) myTabNav.style.display = 'none';
      if (myTabContent) myTabContent.classList.remove('active');
      if (bizTabNav) { bizTabNav.style.display = ''; bizTabNav.classList.add('active'); }
      if (bizTabContent) {
        // Replace the placeholder prompt with an enterprise view (link to business orders page)
        bizTabContent.classList.add('active');
        try {
          bizTabContent.innerHTML = `
            <div style="padding:24px; text-align:center; color:#111;">
              <h2>Quản lý đơn hàng doanh nghiệp</h2>
              <p>Bạn đang đăng nhập bằng tài khoản doanh nghiệp: <strong>${currentUser.fullName || currentUser.email || ''}</strong></p>
              <p><a href="../business-orders/business-orders.html" style="display:inline-block; margin-top:12px; padding:10px 18px; background:#22C55E; color:#fff; border-radius:6px; text-decoration:none;">Mở trang quản lý đơn hàng doanh nghiệp</a></p>
            </div>
          `;
        } catch (e) {
          console.warn('Failed to populate business tab content', e);
        }
      }
    } else {
      // show only customer tab
      if (bizTabNav) bizTabNav.style.display = 'none';
      if (bizTabContent) bizTabContent.classList.remove('active');
      if (myTabNav) { myTabNav.style.display = ''; myTabNav.classList.add('active'); }
      if (myTabContent) myTabContent.classList.add('active');
    }
  } catch (e) {
    console.warn('Error adjusting order-management tabs by role', e);
  }

  // Initialize tab click handlers (after we adjusted visibility)
  initializeTabs();
  
  // Initialize status filters
  initializeFilters();
  
  // Load orders
  loadOrders();

  // Initialize star rating
  initializeStarRating();

  // Initialize image upload
  initializeImageUpload();
  
  // Initialize search
  initializeSearch();

  // Ensure business tab content is correct for enterprise users (safeguard in case other code overwrote it)
  try {
    ensureBusinessTabForEnterprise();
    // run again shortly after to override late DOM changes
    setTimeout(ensureBusinessTabForEnterprise, 200);
  } catch (e) { /* ignore */ }
});

function ensureBusinessTabForEnterprise() {
  if (!isEnterpriseUser(currentUser)) return;
  const bizTabContent = document.getElementById('business-orders-tab');
  if (!bizTabContent) return;
  const text = (bizTabContent.textContent || '').trim();
  if (text.includes('Vui lòng') || text.includes('đăng nhập với tài khoản doanh nghiệp') || bizTabContent.querySelector('a')) {
    try {
      // mount a mini business orders app inside the tab
      mountBusinessOrdersTab(bizTabContent);
    } catch (e) { console.warn('ensureBusinessTabForEnterprise failed', e); }
  }
}

// Mount a simplified copy of business-orders UI and behavior inside the business tab
function mountBusinessOrdersTab(container) {
  try {
    container.innerHTML = `
      <div class="business-orders-inline">
        <div class="business-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="margin:0">📋 Quản Lý Đơn Hàng</h2>
            <div style="color:#666; margin-top:4px;">Tài khoản: <strong>${currentUser.fullName || currentUser.email || ''}</strong></div>
          </div>
          <div>
            <button id="bo-refresh" class="btn">⟳ Làm mới</button>
          </div>
        </div>

        <div class="status-tabs" style="display:flex; gap:12px; margin-top:12px;">
          <div class="status-tab active" data-status="pending">Chờ xử lý (<span id="bo-pendingCount">0</span>)</div>
          <div class="status-tab" data-status="shipping">Đang vận chuyển (<span id="bo-shippingCount">0</span>)</div>
          <div class="status-tab" data-status="delivered">Đã giao hàng (<span id="bo-deliveredCount">0</span>)</div>
          <div class="status-tab" data-status="return">Yêu cầu trả hàng (<span id="bo-returnCount">0</span>)</div>
        </div>

        <div id="bo-ordersList" style="margin-top:16px;"></div>
      </div>
    `;

    // wire refresh and tabs
    container.querySelector('#bo-refresh').addEventListener('click', () => { boLoadOrders(); boUpdateCounts(); });
    container.querySelectorAll('.status-tab').forEach(t => t.addEventListener('click', function() {
      container.querySelectorAll('.status-tab').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
      boCurrentStatus = this.dataset.status;
      boLoadOrders();
    }));

    // expose minimal business-manager functions or reuse existing global businessManager if present
    boCurrentStatus = 'pending';
    boLoadOrders();
    boUpdateCounts();
  } catch (e) { console.warn('mountBusinessOrdersTab failed', e); }
}

// Inline business orders helpers
let boCurrentStatus = 'pending';
function boUpdateCounts() {
  try {
    const businessId = getUserId(currentUser);
    const pendingOrders = (typeof businessManager !== 'undefined' ? businessManager.getOrdersByStatus(businessId, 'preparing') : []);
    const shippingOrders = (typeof businessManager !== 'undefined' ? businessManager.getOrdersByStatus(businessId, 'shipping') : []);
    const deliveredOrders = (typeof businessManager !== 'undefined' ? businessManager.getOrdersByStatus(businessId, 'delivered') : []);
    const returnRequests = (typeof businessManager !== 'undefined' ? businessManager.getReturnRequestsByBusiness(businessId) : []);
    document.getElementById('bo-pendingCount').textContent = pendingOrders.length;
    document.getElementById('bo-shippingCount').textContent = shippingOrders.length;
    document.getElementById('bo-deliveredCount').textContent = deliveredOrders.length;
    document.getElementById('bo-returnCount').textContent = returnRequests.length;
  } catch (e) { console.warn('boUpdateCounts', e); }
}

function boLoadOrders() {
  try {
    const listEl = document.getElementById('bo-ordersList');
    if (!listEl) return;
    const businessId = getUserId(currentUser);
    let items = [];
    if (boCurrentStatus === 'return') {
      items = (typeof businessManager !== 'undefined' ? businessManager.getReturnRequestsByBusiness(businessId) : []);
      listEl.innerHTML = items.length === 0 ? '<div class="empty-state"><p class="empty-state-text">Không có yêu cầu trả hàng nào</p></div>' : items.map(r => boRenderReturnRequest(r)).join('');
    } else {
      const orderStatus = boCurrentStatus === 'pending' ? 'preparing' : boCurrentStatus;
      items = (typeof businessManager !== 'undefined' ? businessManager.getOrdersByStatus(businessId, orderStatus) : []);
      listEl.innerHTML = items.length === 0 ? '<div class="empty-state"><p class="empty-state-text">Không có đơn hàng nào</p></div>' : items.map(o => boRenderOrder(o)).join('');
    }
  } catch (e) { console.error('boLoadOrders', e); }
}

function boRenderOrder(order) {
  return `
    <div class="business-order-card" style="border:1px solid #E5E7EB; padding:12px; margin-bottom:12px; border-radius:8px;">
      <div style="display:flex; justify-content:space-between;">
        <div><strong>Đơn #${order.id}</strong> • ${order.customerName || ''}</div>
        <div>${formatDateTime(order.orderDate)}</div>
      </div>
      <div style="margin-top:8px; color:#444;">Tổng: ${formatPrice(order.totalAmount)}₫ • Trạng thái: ${order.status}</div>
      <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
        ${order.status === 'preparing' ? `<button class="btn" onclick="boActionPrint('${order.id}')">In vận đơn</button><button class="btn" onclick="boActionReject('${order.id}')">Từ chối</button><button class="btn" onclick="boActionMessage('${order.id}')">Nhắn KH</button>` : ''}
        ${order.status === 'shipping' ? `<button class="btn" onclick="boActionDelivered('${order.id}')">Đã giao</button>` : ''}
      </div>
    </div>
  `;
}

function boRenderReturnRequest(r) {
  return `
    <div class="business-order-card" style="border:1px solid #E5E7EB; padding:12px; margin-bottom:12px; border-radius:8px;">
      <div><strong>Yêu cầu trả hàng #${r.id}</strong> • ${r.customerName || ''}</div>
      <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;"><button class="btn" onclick="boActionApproveReturn('${r.id}')">Chấp nhận</button><button class="btn" onclick="boActionRejectReturn('${r.id}')">Từ chối</button></div>
    </div>
  `;
}

// Inline actions (wrap businessManager calls)
function boActionPrint(id) { alert('In vận đơn ' + id); if (businessManager && businessManager.updateOrderStatus) { businessManager.updateOrderStatus(id, 'shipping'); } boLoadOrders(); boUpdateCounts(); }
function boActionReject(id) { if (confirm('Từ chối đơn ' + id + '?')) { alert('Đã từ chối'); } }
function boActionMessage(id) { alert('Nhắn tin KH ' + id); }
function boActionDelivered(id) { if (confirm('Xác nhận đã giao ' + id + '?')) { if (businessManager && businessManager.updateOrderStatus) businessManager.updateOrderStatus(id, 'delivered'); boLoadOrders(); boUpdateCounts(); } }
function boActionApproveReturn(id) { if (businessManager && businessManager.updateReturnRequestStatus) businessManager.updateReturnRequestStatus(id, 'approved'); boLoadOrders(); boUpdateCounts(); }
function boActionRejectReturn(id) { if (businessManager && businessManager.updateReturnRequestStatus) businessManager.updateReturnRequestStatus(id, 'rejected'); boLoadOrders(); boUpdateCounts(); }

// Fetch and render orders for current user
async function loadOrders() {
  const container = document.getElementById('ordersList');
  if (!container) return;
  container.innerHTML = '<div style="padding:24px; text-align:center; color:#666;">Đang tải...</div>';

  try {
    // If user is enterprise, load enterprise orders; otherwise load customer orders
  let url = 'http://localhost:3001/api/orders';
    if (isEnterpriseUser(currentUser)) {
        url += '?enterpriseId=' + encodeURIComponent(getUserId(currentUser));
    } else {
      url += '?customerId=' + encodeURIComponent(getUserId(currentUser));
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      container.innerHTML = '<div style="padding:24px; text-align:center; color:#EF4444;">Không thể tải đơn hàng</div>';
      return;
    }
    const body = await resp.json();
    const orders = body.orders || [];
    if (orders.length === 0) {
      container.innerHTML = '<div style="padding:24px; text-align:center; color:#666;">Không có đơn hàng</div>';
      return;
    }

    let html = '';
    orders.forEach(o => {
      html += renderOrderCard(o);
    });
    container.innerHTML = html;
    // attach handlers
    document.querySelectorAll('.btn-view-order').forEach(btn => btn.addEventListener('click', onViewOrder));
    document.querySelectorAll('.btn-change-status').forEach(btn => btn.addEventListener('click', onChangeStatus));
    document.querySelectorAll('.btn-mark-received').forEach(btn => btn.addEventListener('click', onMarkReceived));
  } catch (err) {
    console.error('loadOrders error', err);
    container.innerHTML = '<div style="padding:24px; text-align:center; color:#EF4444;">Lỗi khi tải danh sách</div>';
  }
}

async function onMarkReceived(e) {
  const id = e.currentTarget.getAttribute('data-id');
  if (!id) return;
  if (!confirm('Xác nhận bạn đã nhận được hàng?')) return;
  try {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const resp = await fetch('http://localhost:3001/api/orders/' + encodeURIComponent(id) + '/received', { method: 'POST', headers });
    if (!resp.ok) { const b = await resp.json().catch(() => ({})); alert('Không thể xử lý yêu cầu: ' + (b.error || resp.status)); return; }
    const body = await resp.json();
    alert('Cảm ơn! Giao dịch thanh toán đã được xử lý.' + (body.warning ? ('\nLưu ý: ' + body.warning) : ''));
    loadOrders();
  } catch (err) {
    console.error(err); alert('Lỗi khi ghi nhận đã nhận hàng');
  }
}

function renderOrderCard(o) {
  const statusLabel = (o.status || '').toUpperCase();
  return `
    <div class="order-card" style="border:1px solid #E5E7EB; border-radius:8px; margin-bottom:16px; padding:16px; display:flex; justify-content:space-between; gap:16px;">
      <div style="flex:1;">
        <div style="font-weight:600; font-size:16px; color:#111;">Mã đơn: #${o.order_id}</div>
        <div style="color:#666; margin-top:6px;">Địa chỉ: ${o.shipping_address || ''}</div>
        <div style="color:#666; margin-top:6px;">Tổng: ${(Number(o.total_amount)||0).toLocaleString()} VNĐ • Trạng thái: <strong>${statusLabel}</strong></div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
        <button class="btn btn-default btn-view-order" data-id="${o.order_id}">Xem</button>
  ${isEnterpriseUser(currentUser) ? `<select class="status-select" data-id="${o.order_id}"><option value="PREPARING">PREPARING</option><option value="SHIPPING">SHIPPING</option><option value="DELIVERED">DELIVERED</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select><button class="btn btn-success btn-change-status" data-id="${o.order_id}">Cập nhật</button>` : ''}
  ${isCustomerUser(currentUser) ? `<button class="btn btn-primary btn-mark-received" data-id="${o.order_id}">Đã nhận được hàng</button>` : ''}
      </div>
    </div>
  `;
}

async function onViewOrder(e) {
  const id = e.currentTarget.getAttribute('data-id');
  if (!id) return;
  // open a simple details modal or navigate to order detail page (for now alert)
  try {
  const resp = await fetch('http://localhost:3001/api/orders/' + encodeURIComponent(id));
    if (!resp.ok) { alert('Không thể tải chi tiết đơn'); return; }
    const body = await resp.json();
    const order = body.order;
    const items = body.items || [];
    let msg = `Đơn #${order.order_id}\nTrạng thái: ${order.status}\nTổng: ${(Number(order.total_amount)||0).toLocaleString()} VNĐ\n\nCác sản phẩm:\n`;
    items.forEach(it => { msg += ` - ${it.product_name} x${it.quantity} • ${(Number(it.subtotal)||0).toLocaleString()} VNĐ\n`; });
    alert(msg);
  } catch (err) { console.error(err); alert('Lỗi hiển thị chi tiết'); }
}

async function onChangeStatus(e) {
  const id = e.currentTarget.getAttribute('data-id');
  if (!id) return;
  const select = document.querySelector(`.status-select[data-id="${id}"]`);
  if (!select) return;
  const newStatus = select.value;
  if (!confirm('Bạn có chắc muốn cập nhật trạng thái thành ' + newStatus + ' ?')) return;
  try {
    // Use token if available
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
  const resp = await fetch('http://localhost:3001/api/orders/' + encodeURIComponent(id) + '/status', { method: 'PATCH', headers, body: JSON.stringify({ status: newStatus }) });
    if (!resp.ok) { alert('Cập nhật thất bại'); return; }
    alert('Cập nhật thành công');
    loadOrders();
  } catch (err) { console.error(err); alert('Lỗi khi cập nhật'); }
}


// The rest of the original order-management.js implementation merged below

// Initialize Tabs (generic handler for .tab-nav-item / #<tab>-tab)
function initializeTabs() {
  const tabItems = document.querySelectorAll('.tab-nav-item');
  tabItems.forEach(item => {
    item.addEventListener('click', function() {
      const tab = this.dataset.tab;
      // Update active tab
      document.querySelectorAll('.tab-nav-item').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      // Show tab content
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const content = document.getElementById(`${tab}-tab`);
      if (content) content.classList.add('active');
    });
  });
}

// Initialize Filters (status filter buttons)
function initializeFilters() {
  const filterBtns = document.querySelectorAll('.status-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentStatus = this.dataset.status;
      loadOrders();
    });
  });
}

// Initialize Search input (orderSearch)
function initializeSearch() {
  const searchInput = document.getElementById('orderSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      loadOrders();
    });
  }
}

// Track Order (placeholder)
function trackOrder(orderId) {
  alert('Tính năng theo dõi đơn hàng đang được phát triển');
}

// Confirm Received (fallback local behavior if businessManager used elsewhere)
function confirmReceived(orderId) {
  if (confirm('Xác nhận bạn đã nhận được hàng?')) {
    try {
      if (typeof businessManager !== 'undefined' && businessManager.updateOrderStatus) {
        businessManager.updateOrderStatus(orderId, 'completed');
      }
    } catch (e) {
      // ignore
    }
    // Show review modal if available
    if (typeof openReviewModal === 'function') openReviewModal(orderId);
    loadOrders();
  }
}

// Open Review Modal (uses DOM ids expected in HTML modals)
function openReviewModal(orderId) {
  let order = null;
  try { if (typeof businessManager !== 'undefined' && businessManager.getOrderById) order = businessManager.getOrderById(orderId); } catch (e) {}
  if (!order) return;
  currentOrder = order;
  selectedRating = 0;
  document.querySelectorAll('.star-input').forEach(star => star.classList.remove('selected'));
  const commentInput = document.getElementById('reviewComment'); if (commentInput) commentInput.value = '';
  const preview = document.getElementById('reviewImagePreview'); if (preview) preview.innerHTML = '';
  const orderInfo = document.getElementById('reviewOrderInfo');
  if (orderInfo) {
    orderInfo.innerHTML = `
      <div class="modal-order-info">
        <img src="${order.items[0].image}" alt="${order.items[0].productName}" class="modal-order-image">
        <div>
          <div class="modal-order-name">${order.items[0].productName}</div>
          <div class="modal-order-id">Đơn hàng #${order.id}</div>
        </div>
      </div>
    `;
  }
  const modal = document.getElementById('reviewModal'); if (modal) modal.classList.add('active');
}

function closeReviewModal() {
  const modal = document.getElementById('reviewModal'); if (modal) modal.classList.remove('active');
}

// Initialize Star Rating (for review modal)
function initializeStarRating() {
  const stars = document.querySelectorAll('.star-input');
  stars.forEach(star => {
    star.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.rating);
      stars.forEach((s, index) => {
        if (index < selectedRating) s.classList.add('selected'); else s.classList.remove('selected');
      });
    });
    star.addEventListener('mouseenter', function() {
      const rating = parseInt(this.dataset.rating);
      stars.forEach((s, index) => { s.style.color = (index < rating) ? '#FFD700' : '#D1D5DB'; });
    });
    star.addEventListener('mouseleave', function() {
      stars.forEach((s, index) => { s.style.color = (index < selectedRating) ? '#FFD700' : '#D1D5DB'; });
    });
  });
}

// Initialize Image Upload for review/return forms
function initializeImageUpload() {
  const reviewImagesInput = document.getElementById('reviewImages');
  const returnImagesInput = document.getElementById('returnImages');
  if (reviewImagesInput) reviewImagesInput.addEventListener('change', function(e) { handleImagePreview(e.target.files, 'reviewImagePreview'); });
  if (returnImagesInput) returnImagesInput.addEventListener('change', function(e) { handleImagePreview(e.target.files, 'returnImagePreview'); });
}

// Handle Image Preview (up to 5 images)
function handleImagePreview(files, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  preview.innerHTML = '';
  Array.from(files).forEach((file, index) => {
    if (index >= 5) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const div = document.createElement('div');
      div.className = 'image-preview-item';
      div.innerHTML = `
        <img src="${e.target.result}" alt="Preview" class="image-preview-img">
        <button class="image-preview-remove" onclick="this.parentElement.remove()">×</button>
      `;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

// Submit Review (uses businessManager if available)
function submitReview() {
  if (!selectedRating) { alert('Vui lòng chọn số sao đánh giá'); return; }
  const commentEl = document.getElementById('reviewComment');
  const comment = commentEl ? commentEl.value : '';
  if (!comment.trim()) { alert('Vui lòng nhập nhận xét của bạn'); return; }
  try {
    if (typeof businessManager !== 'undefined' && businessManager.addReview) {
      businessManager.addReview({
        productId: currentOrder.items[0].productId,
        orderId: currentOrder.id,
        userId: currentUser.user_id || currentUser.id,
        userName: currentUser.fullName,
        rating: selectedRating,
        comment: comment,
        images: []
      });
      alert('Cảm ơn bạn đã đánh giá!');
      closeReviewModal();
      loadOrders();
      return;
    }
  } catch (e) { console.warn('submitReview fallback', e); }
  alert('Không thể gửi đánh giá ở thời điểm này');
}

// Open Return Modal (uses businessManager to fetch order)
function openReturnModal(orderId) {
  let order = null;
  try { if (typeof businessManager !== 'undefined' && businessManager.getOrderById) order = businessManager.getOrderById(orderId); } catch (e) {}
  if (!order) return;
  currentOrder = order;
  const reasonEl = document.getElementById('returnReason'); if (reasonEl) reasonEl.value = '';
  const descEl = document.getElementById('returnDescription'); if (descEl) descEl.value = '';
  const preview = document.getElementById('returnImagePreview'); if (preview) preview.innerHTML = '';
  const orderInfo = document.getElementById('returnOrderInfo');
  if (orderInfo) {
    orderInfo.innerHTML = `
      <div class="modal-order-info">
        <img src="${order.items[0].image}" alt="${order.items[0].productName}" class="modal-order-image">
        <div>
          <div class="modal-order-name">${order.items[0].productName}</div>
          <div class="modal-order-id">Mã đơn hàng: ${order.id}</div>
        </div>
      </div>
    `;
  }
  const modal = document.getElementById('returnModal'); if (modal) modal.classList.add('active');
}

function closeReturnModal() { const modal = document.getElementById('returnModal'); if (modal) modal.classList.remove('active'); }

// Submit Return (creates a return request via businessManager if available)
function submitReturn() {
  const reason = document.getElementById('returnReason')?.value;
  const description = document.getElementById('returnDescription')?.value;
  if (!reason) { alert('Vui lòng chọn lý do trả hàng'); return; }
  const images = document.querySelectorAll('#returnImagePreview .image-preview-img');
  if (images.length === 0) { alert('Vui lòng tải lên ít nhất 1 ảnh minh chứng'); return; }
  try {
    if (typeof businessManager !== 'undefined' && businessManager.createReturnRequest) {
      businessManager.createReturnRequest({
        orderId: currentOrder.id,
        customerId: currentUser.user_id || currentUser.id,
        customerName: currentUser.fullName,
        customerPhone: currentUser.phone,
        businessId: currentOrder.businessId,
        items: currentOrder.items.map(item => ({ productName: item.productName, quantity: item.quantity, unit: 'kg', price: item.price })),
        totalAmount: currentOrder.totalAmount,
        reason: reason,
        description: description,
        images: []
      });
      alert('Yêu cầu trả hàng đã được gửi!');
      closeReturnModal();
      return;
    }
  } catch (e) { console.warn('submitReturn fallback', e); }
  alert('Không thể gửi yêu cầu trả hàng ở thời điểm này');
}

// Format Price
function formatPrice(price) {
  return String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Format Date (DD/MM/YYYY)
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

// Format Date Time (HH:MM DD/MM/YYYY)
function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

// Close Order Detail Modal (if present)
function closeOrderDetailModal() { const modal = document.getElementById('orderDetailModal'); if (modal) modal.classList.remove('active'); }

// Logout function (redirects to home relative to features folder)
function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    try { if (typeof dataManager !== 'undefined' && dataManager.logout) dataManager.logout(); } catch (e) {}
    alert('Đã đăng xuất thành công!');
    // navigate to home
    window.location.href = '../home/index.html';
  }
}
