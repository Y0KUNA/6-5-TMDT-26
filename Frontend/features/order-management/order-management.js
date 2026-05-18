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
    // show account name
    try { const acctEl = container.querySelector('#bo-account-name'); if (acctEl) acctEl.textContent = currentUser.fullName || currentUser.email || '-'; } catch (e) {}
    boLoadOrders();
    boUpdateCounts();
  } catch (e) { console.warn('mountBusinessOrdersTab failed', e); }
}

// Inline business orders helpers
let boCurrentStatus = 'pending';
function boUpdateCounts() {
  try {
    const businessId = getUserId(currentUser);
    // Prefer in-memory businessManager if it exposes the helpers; otherwise fetch from server
    const hasBM = (typeof businessManager !== 'undefined');
    const hasGetOrdersByStatus = hasBM && typeof businessManager.getOrdersByStatus === 'function';
    const hasGetReturnRequests = hasBM && typeof businessManager.getReturnRequestsByBusiness === 'function';

    if (hasGetOrdersByStatus) {
      const pendingOrders = businessManager.getOrdersByStatus(businessId, 'preparing');
      const shippingOrders = businessManager.getOrdersByStatus(businessId, 'shipping');
      const deliveredOrders = businessManager.getOrdersByStatus(businessId, 'delivered');
      const returnRequests = hasGetReturnRequests ? businessManager.getReturnRequestsByBusiness(businessId) : [];
      document.getElementById('bo-pendingCount').textContent = pendingOrders.length;
      document.getElementById('bo-shippingCount').textContent = shippingOrders.length;
      document.getElementById('bo-deliveredCount').textContent = deliveredOrders.length;
      document.getElementById('bo-returnCount').textContent = returnRequests.length;
    } else {
      // Server fallback: query orders and count statuses
      (async () => {
        try {
          const resp = await fetch('http://localhost:3001/api/orders?enterpriseId=' + encodeURIComponent(businessId));
          if (!resp.ok) throw new Error('fetch failed');
          const body = await resp.json();
          const orders = body.orders || [];
          const pending = orders.filter(o => (String(o.status || o.order_status || '').toLowerCase()).includes('prepar') ).length;
          const shipping = orders.filter(o => (String(o.status || o.order_status || '').toLowerCase()).includes('ship') ).length;
          const delivered = orders.filter(o => (String(o.status || o.order_status || '').toLowerCase()).includes('deliver') ).length;
          // No server return-requests endpoint in this project by default; show 0 when missing
          const returns = 0;
          document.getElementById('bo-pendingCount').textContent = pending;
          document.getElementById('bo-shippingCount').textContent = shipping;
          document.getElementById('bo-deliveredCount').textContent = delivered;
          document.getElementById('bo-returnCount').textContent = returns;
        } catch (e) {
          console.warn('boUpdateCounts server fallback failed', e);
        }
      })();
    }
  } catch (e) { console.warn('boUpdateCounts', e); }
}

function boLoadOrders() {
  try {
    const listEl = document.getElementById('bo-ordersList');
    if (!listEl) return;
    const businessId = getUserId(currentUser);
    let items = [];
    const hasBM = (typeof businessManager !== 'undefined');
    const hasGetOrdersByStatus = hasBM && typeof businessManager.getOrdersByStatus === 'function';
    const hasGetReturnRequests = hasBM && typeof businessManager.getReturnRequestsByBusiness === 'function';

    if (boCurrentStatus === 'return') {
      if (hasGetReturnRequests) {
        items = businessManager.getReturnRequestsByBusiness(businessId);
        listEl.innerHTML = items.length === 0 ? '<div class="empty-state"><p class="empty-state-text">Không có yêu cầu trả hàng nào</p></div>' : items.map(r => boRenderReturnRequest(r)).join('');
      } else {
        // No return API available; show empty state
        listEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Không có yêu cầu trả hàng nào</p></div>';
      }
    } else {
      const orderStatus = boCurrentStatus === 'pending' ? 'preparing' : boCurrentStatus;
      if (hasGetOrdersByStatus) {
        items = businessManager.getOrdersByStatus(businessId, orderStatus);
        listEl.innerHTML = items.length === 0 ? '<div class="empty-state"><p class="empty-state-text">Không có đơn hàng nào</p></div>' : items.map(o => boRenderOrder(o)).join('');
      } else {
        // Server fallback: fetch orders and filter by status
        (async () => {
          try {
            const resp = await fetch('http://localhost:3001/api/orders?enterpriseId=' + encodeURIComponent(businessId));
            if (!resp.ok) throw new Error('fetch failed');
            const body = await resp.json();
            const orders = body.orders || [];
            const filtered = orders.filter(o => {
              const s = String(o.status || o.order_status || '').toLowerCase();
              const target = String(orderStatus || '').toLowerCase();
              if (target === 'preparing') return s.includes('prepar') || s.includes('prepare') || s === 'preparing';
              return s.includes(target);
            });
            if (filtered.length === 0) {
              listEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Không có đơn hàng nào</p></div>';
            } else {
              // Normalize server order shape to what boRenderOrder expects
              listEl.innerHTML = filtered.map(o => boRenderOrder(normalizeServerOrder(o))).join('');
            }
          } catch (e) {
            console.error('boLoadOrders server fallback', e);
            listEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Không thể tải đơn hàng</p></div>';
          }
        })();
      }
    }
  } catch (e) { console.error('boLoadOrders', e); }
}

// Helper: normalize server order object to expected fields
function normalizeServerOrder(o) {
  if (!o) return o;
  return {
    id: o.id || o.order_id || o.orderId || o.id_external || '',
    orderDate: o.order_date || o.orderDate || o.created_at || o.createdAt || o.created || '',
    customerName: o.customer_name || o.customerName || o.customer || o.customer_fullname || '',
    totalAmount: o.total_amount || o.totalAmount || o.total || o.grand_total || 0,
    status: canonicalStatus(o.status || o.order_status || o.status_text || ''),
    // ensure items array exists and normalize likely item field names
    items: (o.items || o.order_items || o.orderItems || o.items_list || []).map(it => ({
      productName: it.product_name || it.productName || it.name || it.title || '',
      image: it.image || it.product_image || it.productImage || '',
      quantity: it.quantity || it.qty || it.count || 1,
      price: it.price || it.unit_price || it.unitPrice || it.amount || 0,
      productId: it.product_id || it.productId || it.id || null
    })),
    businessName: o.business_name || o.businessName || o.sellerName || o.vendorName || '' ,
    trackingNumber: o.tracking_number || o.trackingNumber || null
  };
}

// Map various server status tokens (including SQL ENUM UPPERCASE) to canonical lowercase statuses
function canonicalStatus(s) {
  if (!s) return '';
  const raw = String(s).trim();
  const up = raw.toUpperCase();
  if (['PENDING'].includes(up)) return 'pending';
  if (['PREPARING', 'PENDING', 'PROCESSING'].includes(up)) return 'preparing';
  if (['SHIPPING', 'DELIVERING', 'DELIVERING', 'DELIVERING'].includes(up)) return 'shipping';
  if (['DELIVERED'].includes(up)) return 'delivered';
  if (['COMPLETED'].includes(up)) return 'completed';
  if (['CANCELLED', 'CANCELED'].includes(up)) return 'cancelled';
  // fallback to lowercased token
  return raw.toLowerCase();
}

// Local renderer for in-memory businessManager orders (customer view)
function renderOrderCardLocal(order) {
  const statusLabels = {
    preparing: 'Đang chuẩn bị',
    shipping: 'Đang vận chuyển',
    delivered: 'Đã giao hàng',
    completed: 'Hoàn thành'
  };

  const statusClass = order.status;
  const statusLabel = statusLabels[order.status] || order.status;

  // guard against missing items
  const items = Array.isArray(order.items) ? order.items : [];

  return `
    <div class="order-card">
      <div class="order-card-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="order-id">Đơn hàng #${order.id}</span>
          <span class="order-status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div style="text-align: right;">
          <div class="order-total">₫${formatPrice(order.totalAmount)}</div>
          <div class="order-date">${formatDate(order.orderDate)}</div>
        </div>
      </div>

      <div class="order-details">
        <div class="order-meta">
          <div class="order-meta-item">
            <span class="meta-label">Ngày đặt:</span>
            <span class="meta-value">${formatDate(order.orderDate)}</span>
          </div>
          <div class="order-meta-item">
            <span class="meta-label">Người bán:</span>
            <span class="meta-value">${order.businessName || ''}</span>
          </div>
        </div>

        ${items.map(item => `
          <div class="order-item">
            <img src="${item.image || ''}" alt="${item.productName || ''}" class="order-item-image">
            <div class="order-item-info">
              <div class="order-item-name">${item.productName || ''}</div>
              <div class="order-item-quantity">Số lượng: ${item.quantity || 0}</div>
            </div>
            <div class="order-item-price">₫${formatPrice(item.price || 0)}</div>
          </div>
        `).join('')}

      </div>

      <div class="order-actions">
        <button class="order-action-btn btn-detail" onclick="viewOrderDetail('${order.id}')">Xem chi tiết</button>
        ${order.trackingNumber ? `<button class="order-action-btn btn-track" onclick="trackOrder('${order.id}')">Theo dõi đơn hàng</button>` : ''}
        ${order.status === 'delivered' && !order.rating ? `
          <button class="order-action-btn btn-return" onclick="openReturnModal('${order.id}')">Yêu cầu trả hàng/hoàn tiền</button>
          <button class="order-action-btn btn-received" onclick="confirmReceived('${order.id}')">Đã nhận được hàng</button>
        ` : ''}
        ${order.status === 'completed' && !order.expired ? `
          <button class="order-action-btn btn-return" onclick="openReturnModal('${order.id}')">Yêu cầu trả hàng/hoàn tiền</button>
        ` : ''}
      </div>
    </div>
  `;
}

function boRenderOrder(order) {
  // Normalize order object to the shape expected by the customer renderer
  const unified = Object.assign({}, {
    id: order.id || order.order_id || order.orderId || '',
    orderDate: order.orderDate || order.order_date || order.createdAt || order.created_at || '',
    totalAmount: order.totalAmount || order.total_amount || order.total || 0,
    businessName: order.businessName || order.business_name || order.sellerName || '',
    items: order.items || order.order_items || [],
    trackingNumber: order.trackingNumber || order.tracking_number || null,
    deliveredDate: order.deliveredDate || order.delivered_date || null,
    rating: order.rating || null,
    expired: order.expired || false,
    daysLeftToReview: order.daysLeftToReview || 0,
    status: (order.status || order.order_status || '').toLowerCase()
  }, order);

  // Use the local renderer so seller and buyer share the same visual
  return renderOrderCardLocal(unified);
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
async function boActionPrint(id) {
  if (!id) return;
  alert('In vận đơn ' + id);
  // Try businessManager first
  if (typeof businessManager !== 'undefined' && typeof businessManager.updateOrderStatus === 'function') {
    businessManager.updateOrderStatus(id, 'shipping');
    boLoadOrders(); boUpdateCounts();
    return;
  }
  // Fallback to server API
  if (confirm('Đánh dấu đơn là đang vận chuyển?')) {
    try {
      const resp = await fetch('http://localhost:3001/api/orders/' + encodeURIComponent(id) + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'SHIPPING' }) });
      if (!resp.ok) throw new Error('update failed');
      boLoadOrders(); boUpdateCounts();
    } catch (e) { console.warn('boActionPrint failed', e); alert('Không thể cập nhật trạng thái trên server'); }
  }
}

async function boActionReject(id) {
  if (!id) return;
  if (!confirm('Từ chối đơn ' + id + '?')) return;
  // If no server reject endpoint, just notify
  if (typeof businessManager !== 'undefined' && typeof businessManager.updateOrderStatus === 'function') {
    businessManager.updateOrderStatus(id, 'cancelled');
    boLoadOrders(); boUpdateCounts();
    alert('Đã từ chối');
    return;
  }
  alert('Từ chối (chỉ thông báo giao diện) — chức năng server chưa được cấu hình');
}

function boActionMessage(id) { alert('Nhắn tin KH ' + id); }

async function boActionDelivered(id) {
  if (!id) return;
  if (!confirm('Xác nhận đã giao ' + id + '?')) return;
  if (typeof businessManager !== 'undefined' && typeof businessManager.updateOrderStatus === 'function') {
    businessManager.updateOrderStatus(id, 'delivered');
    boLoadOrders(); boUpdateCounts();
    return;
  }
  try {
    const resp = await fetch('http://localhost:3001/api/orders/' + encodeURIComponent(id) + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DELIVERED' }) });
    if (!resp.ok) throw new Error('update failed');
    boLoadOrders(); boUpdateCounts();
  } catch (e) { console.warn('boActionDelivered failed', e); alert('Không thể cập nhật trạng thái trên server'); }
}

async function boActionApproveReturn(id) {
  if (!id) return;
  if (typeof businessManager !== 'undefined' && typeof businessManager.updateReturnRequestStatus === 'function') {
    businessManager.updateReturnRequestStatus(id, 'approved'); boLoadOrders(); boUpdateCounts(); return;
  }
  alert('Xử lý trả hàng trên server chưa được cấu hình');
}

async function boActionRejectReturn(id) {
  if (!id) return;
  if (typeof businessManager !== 'undefined' && typeof businessManager.updateReturnRequestStatus === 'function') {
    businessManager.updateReturnRequestStatus(id, 'rejected'); boLoadOrders(); boUpdateCounts(); return;
  }
  alert('Xử lý trả hàng trên server chưa được cấu hình');
}

// Fetch and render orders for current user
async function loadOrders() {
  const container = document.getElementById('ordersList');
  if (!container) return;
  container.innerHTML = '<div style="padding:24px; text-align:center; color:#666;">Đang tải...</div>';

  // If an in-memory businessManager exists and the user is a customer, use it for local rendering
  try {
    const hasBM = (typeof businessManager !== 'undefined');
    const hasGetByCustomer = hasBM && typeof businessManager.getOrdersByCustomer === 'function';
    if (hasGetByCustomer && !isEnterpriseUser(currentUser)) {
      try {
        let orders = businessManager.getOrdersByCustomer(getUserId(currentUser) || currentUser.id);

        // Filter by status
        if (currentStatus && currentStatus !== 'all') {
          orders = orders.filter(order => order.status === currentStatus);
        }

        // Filter by search term
        const searchTerm = document.getElementById('orderSearch')?.value.toLowerCase().trim();
        if (searchTerm) {
          orders = orders.filter(order => {
            return (String(order.id || '').toLowerCase().includes(searchTerm) ||
              String(order.businessName || '').toLowerCase().includes(searchTerm) ||
              (order.items || []).some(item => String(item.productName || '').toLowerCase().includes(searchTerm)));
          });
        }

        // Sort by date
        orders.sort((a, b) => new Date(b.createdAt || b.orderDate || 0) - new Date(a.createdAt || a.orderDate || 0));

        if (orders.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <p class="empty-state-text">${searchTerm ? 'Không tìm thấy đơn hàng nào' : 'Không có đơn hàng nào'}</p>
            </div>
          `;
          return;
        }

        container.innerHTML = orders.map(o => renderOrderCardLocal(o)).join('');
        return;
      } catch (e) {
        console.warn('local loadOrders failed, falling back to server', e);
        // fall through to server fetch below
      }
    }

    // Server-backed fetch (enterprise or fallback)
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
    let orders = body.orders || [];

    // Filter by currentStatus (supporting various server status tokens)
    function statusMatches(orderStatus, filter) {
      if (!filter || filter === 'all') return true;
      const s = canonicalStatus(orderStatus || '');
      const f = canonicalStatus(filter || '');
      return s === f;
    }

    if (currentStatus && currentStatus !== 'all') {
      orders = orders.filter(o => statusMatches(o.status || o.order_status || o.orderStatus, currentStatus));
    }

    // Filter by search term
    const searchTerm = document.getElementById('orderSearch')?.value.toLowerCase().trim();
    if (searchTerm) {
      orders = orders.filter(o => {
        const id = String(o.order_id || o.id || o.orderId || '').toLowerCase();
        const addr = String(o.shipping_address || o.customer_address || o.customerAddress || '').toLowerCase();
        const business = String(o.business_name || o.businessName || '').toLowerCase();
        const items = (o.items || []).some(it => String(it.product_name || it.productName || '').toLowerCase().includes(searchTerm));
        return id.includes(searchTerm) || addr.includes(searchTerm) || business.includes(searchTerm) || items;
      });
    }

    if (orders.length === 0) {
      container.innerHTML = '<div style="padding:24px; text-align:center; color:#666;">Không có đơn hàng</div>';
      return;
    }

    // Normalize and render with the unified local renderer for consistent visuals
    let html = '';
    orders.forEach(o => {
      html += renderOrderCardLocal(normalizeServerOrder(o));
    });
    container.innerHTML = html;
    // Attach handlers for dynamic elements (if any)
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

// Debug overlay to inspect which code path / resources are used at runtime
function showOrderDebugInfo() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('debugOrders')) return; // only show when ?debugOrders=1 is present

    const info = {
      href: window.location.href,
      role: normalizedRole(currentUser),
      isEnterprise: !!isEnterpriseUser(currentUser),
      userId: getUserId(currentUser) || (currentUser && (currentUser.id || currentUser.user_id)) || null,
      hasBusinessManager: typeof businessManager !== 'undefined',
      bm_getOrdersByStatus: (typeof businessManager !== 'undefined' && typeof businessManager.getOrdersByStatus === 'function'),
      bm_getOrdersByCustomer: (typeof businessManager !== 'undefined' && typeof businessManager.getOrdersByCustomer === 'function'),
      renderer_local: typeof renderOrderCardLocal === 'function',
      renderer_server: typeof renderOrderCard === 'function',
      cssFiles: Array.from(document.querySelectorAll('link[rel="stylesheet"]').values ? document.querySelectorAll('link[rel="stylesheet"]') : document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href)
    };

    const panel = document.createElement('div');
    panel.id = 'orderDebugPanel';
    panel.style.position = 'fixed';
    panel.style.right = '12px';
    panel.style.top = '12px';
    panel.style.zIndex = 99999;
    panel.style.background = 'rgba(255,255,255,0.95)';
    panel.style.border = '1px solid rgba(0,0,0,0.08)';
    panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
    panel.style.padding = '8px 10px';
    panel.style.fontSize = '12px';
    panel.style.color = '#111';
    panel.style.borderRadius = '6px';
    panel.style.maxWidth = '360px';
    panel.style.fontFamily = 'Inter, Arial, sans-serif';

    panel.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px; color:#166534;">Order Debug</div>
      <div><strong>role:</strong> ${info.role}</div>
      <div><strong>enterprise:</strong> ${info.isEnterprise}</div>
      <div><strong>userId:</strong> ${info.userId}</div>
      <div><strong>businessManager:</strong> ${info.hasBusinessManager}</div>
      <div style="margin-top:6px;"><strong>bm.getOrdersByStatus:</strong> ${info.bm_getOrdersByStatus} • <strong>bm.getOrdersByCustomer:</strong> ${info.bm_getOrdersByCustomer}</div>
      <div style="margin-top:6px;"><strong>renderer_local:</strong> ${info.renderer_local} • <strong>renderer_server:</strong> ${info.renderer_server}</div>
      <details style="margin-top:6px; font-size:11px;"><summary>CSS files (${info.cssFiles.length})</summary><div style="max-height:160px; overflow:auto; padding-top:6px;">${info.cssFiles.map(h=>`<div style=\"word-break:break-all;\">${h}</div>`).join('')}</div></details>
      <div style="text-align:right; margin-top:8px;"><button id="orderDebugClose" style="background:#22C55E; color:#fff; border:none; padding:6px 8px; border-radius:4px; cursor:pointer;">Close</button></div>
    `;

    document.body.appendChild(panel);
    document.getElementById('orderDebugClose').addEventListener('click', () => panel.remove());
  } catch (e) { console.warn('showOrderDebugInfo failed', e); }
}

// Run debug overlay if requested
try { showOrderDebugInfo(); } catch (e) {}
