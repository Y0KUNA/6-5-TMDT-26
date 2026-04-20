// Business Orders Management JavaScript

let currentUser = null;
let currentStatus = 'pending';
let currentReturn = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  currentUser = dataManager.getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'business') {
    alert('Vui lòng đăng nhập với tài khoản doanh nghiệp');
    window.location.href = 'login.html';
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
    
    const ordersLink = document.createElement('a');
    ordersLink.href = 'business-orders.html';
    ordersLink.textContent = 'Quản lý đơn hàng';
    ordersLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
    
    const productsLink = document.createElement('a');
    productsLink.href = 'product-management.html';
    productsLink.textContent = 'Quản lý sản phẩm';
    productsLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
    
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Đăng xuất';
    logoutLink.style.cssText = 'display: block; padding: 12px 16px; color: #EF4444; text-decoration: none;';
    logoutLink.onclick = function(e) {
      e.preventDefault();
      handleLogout();
    };
    
    dropdown.appendChild(ordersLink);
    dropdown.appendChild(productsLink);
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
  initializeTabs();
  
  // Load orders
  loadOrders();
  
  // Update counts
  updateCounts();
});

// Initialize Tabs
function initializeTabs() {
  const tabs = document.querySelectorAll('.status-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Update active tab
      document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Update current status
      currentStatus = this.dataset.status;
      
      // Load orders
      loadOrders();
    });
  });
}

// Update Counts
function updateCounts() {
  const businessId = currentUser.id;
  
  const pendingOrders = businessManager.getOrdersByStatus(businessId, 'preparing');
  const shippingOrders = businessManager.getOrdersByStatus(businessId, 'shipping');
  const deliveredOrders = businessManager.getOrdersByStatus(businessId, 'delivered');
  const returnRequests = businessManager.getReturnRequestsByBusiness(businessId);

  document.getElementById('pendingCount').textContent = pendingOrders.length;
  document.getElementById('shippingCount').textContent = shippingOrders.length;
  document.getElementById('deliveredCount').textContent = deliveredOrders.length;
  document.getElementById('returnCount').textContent = returnRequests.length;
}

// Load Orders
function loadOrders() {
  const ordersList = document.getElementById('businessOrdersList');
  const businessId = currentUser.id;
  
  let items = [];
  
  if (currentStatus === 'return') {
    items = businessManager.getReturnRequestsByBusiness(businessId);
    ordersList.innerHTML = items.length === 0 
      ? '<div class="empty-state"><p class="empty-state-text">Không có yêu cầu trả hàng nào</p></div>'
      : items.map(item => renderReturnRequest(item)).join('');
  } else {
    // Map 'pending' status to 'preparing' for orders
    const orderStatus = currentStatus === 'pending' ? 'preparing' : currentStatus;
    items = businessManager.getOrdersByStatus(businessId, orderStatus);
    ordersList.innerHTML = items.length === 0
      ? '<div class="empty-state"><p class="empty-state-text">Không có đơn hàng nào</p></div>'
      : items.map(item => renderBusinessOrder(item)).join('');
  }
}

// Render Business Order
function renderBusinessOrder(order) {
  const statusLabels = {
    preparing: 'Chờ xử lý',
    shipping: 'Đang vận chuyển',
    delivered: 'Đã giao hàng',
    completed: 'Hoàn thành'
  };

  const statusClass = order.status === 'preparing' ? 'pending' : order.status;
  const statusLabel = statusLabels[order.status];

  return `
    <div class="business-order-card">
      <div class="business-order-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="business-order-id">Đơn hàng #${order.id}</span>
          <span class="business-order-status ${statusClass}">${statusLabel}</span>
        </div>
        <div class="business-order-date">
          ${formatDateTime(order.orderDate)}
        </div>
      </div>

      <div class="business-order-body">
        <div class="customer-info-section">
          <h3>Thông tin khách hàng</h3>
          <div class="customer-info">
            <div class="info-row">
              <span class="info-label">Tên:</span>
              <span class="info-value">${order.customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Điện thoại:</span>
              <span class="info-value">${order.customerPhone}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Địa chỉ:</span>
              <span class="info-value">${order.customerAddress}</span>
            </div>
          </div>
          ${order.shippedDate ? `
            <div class="shipping-dates">
              <div class="shipping-date">Đặt hàng: ${formatDateTime(order.orderDate)}</div>
              <div class="shipping-date">Xuất kho: ${formatDateTime(order.shippedDate)}</div>
            </div>
          ` : ''}
          ${order.status === 'delivered' ? `
            <div class="delivery-evidence">
              <div class="delivery-evidence-label">Ảnh bằng chứng giao hàng:</div>
              <img src="https://via.placeholder.com/200x150/22C55E/FFFFFF?text=Giao+hàng" 
                   alt="Delivery evidence" 
                   class="delivery-evidence-image">
            </div>
          ` : ''}
        </div>

        <div class="order-items-section">
          <h3>Chi tiết đơn hàng</h3>
          ${order.items.map(item => `
            <div class="business-order-item">
              <div class="item-name">${item.productName}</div>
              <div class="item-quantity">Số lượng: ${item.quantity} kg</div>
              <div class="item-price">${formatPrice(item.price)}₫</div>
            </div>
          `).join('')}
          
          <div class="order-total-section">
            <span class="total-label">Tổng cộng:</span>
            <span class="total-amount">${formatPrice(order.totalAmount)}₫</span>
          </div>
        </div>
      </div>

      ${order.status === 'delivered' ? `
        <div class="delivery-info-section">
          <span class="delivery-date-info">Giao thành công: ${order.deliveredDate}</span>
          ${order.daysLeftToReview !== undefined ? `
            <span class="review-deadline-info">Còn ${order.daysLeftToReview} ngày để đánh giá</span>
          ` : ''}
          ${order.expired ? `
            <span class="expired-info">Hết hạn đánh giá</span>
          ` : ''}
        </div>
      ` : ''}

      <div class="business-order-actions">
        ${order.status === 'preparing' ? `
          <button class="business-action-btn btn-print" onclick="printShippingLabel('${order.id}')">
            📄 In giấy vận chuyển
          </button>
          <button class="business-action-btn btn-reject" onclick="rejectOrder('${order.id}')">
            ❌ Từ chối đơn hàng
          </button>
          <button class="business-action-btn btn-message" onclick="messageCustomer('${order.id}')">
            💬 Nhắn tin khách hàng
          </button>
        ` : ''}
        
        ${order.status === 'shipping' ? `
          <button class="business-action-btn btn-delivered" onclick="markAsDelivered('${order.id}')">
            ✅ Đã giao hàng
          </button>
          <button class="business-action-btn btn-message" onclick="messageCustomer('${order.id}')">
            💬 Nhắn tin khách hàng
          </button>
        ` : ''}

        ${order.status === 'delivered' ? `
          <button class="business-action-btn btn-message" onclick="messageCustomer('${order.id}')">
            💬 Nhắn tin khách hàng
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Render Return Request
function renderReturnRequest(request) {
  return `
    <div class="business-order-card">
      <div class="business-order-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="business-order-id">Đơn hàng #${request.orderId}</span>
          <span class="business-order-status return">Yêu cầu trả hàng</span>
        </div>
        <div class="business-order-date">${request.createdAt}</div>
      </div>

      <div class="business-order-body">
        <div class="customer-info-section">
          <h3>Thông tin khách hàng</h3>
          <div class="customer-info">
            <div class="info-row">
              <span class="info-label">Tên:</span>
              <span class="info-value">${request.customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Điện thoại:</span>
              <span class="info-value">${request.customerPhone}</span>
            </div>
          </div>
        </div>

        <div class="order-items-section">
          <h3>Chi tiết đơn hàng</h3>
          ${request.items.map(item => `
            <div class="business-order-item">
              <div class="item-name">${item.productName}</div>
              <div class="item-quantity">Số lượng: ${item.quantity} ${item.unit}</div>
              <div class="item-price">${formatPrice(item.price)}₫</div>
            </div>
          `).join('')}
          
          <div class="order-total-section">
            <span class="total-label">Tổng cộng:</span>
            <span class="total-amount">${formatPrice(request.totalAmount)}₫</span>
          </div>
        </div>
      </div>

      <div class="business-order-actions">
        <button class="business-action-btn btn-view-return" onclick="viewReturnDetail('${request.id}')">
          👁️ Xem yêu cầu trả hàng
        </button>
        <button class="business-action-btn btn-approve-return" onclick="approveReturnQuick('${request.id}')">
          ✅ Chấp nhận trả hàng
        </button>
        <button class="business-action-btn btn-reject-return" onclick="rejectReturnQuick('${request.id}')">
          ❌ Từ chối trả hàng
        </button>
        <button class="business-action-btn btn-contact" onclick="contactCustomerReturn('${request.id}')">
          💬 Nhắn tin khách hàng
        </button>
      </div>
    </div>
  `;
}

// Print Shipping Label
function printShippingLabel(orderId) {
  alert('In giấy vận chuyển cho đơn hàng #' + orderId);
  // Update status to shipping
  businessManager.updateOrderStatus(orderId, 'shipping');
  loadOrders();
  updateCounts();
}

// Reject Order
function rejectOrder(orderId) {
  if (confirm('Xác nhận từ chối đơn hàng #' + orderId + '?')) {
    alert('Đã từ chối đơn hàng');
    // In real app, update order status to 'rejected'
  }
}

// Message Customer
function messageCustomer(orderId) {
  alert('Tính năng nhắn tin đang được phát triển');
}

// Mark as Delivered
function markAsDelivered(orderId) {
  if (confirm('Xác nhận đơn hàng #' + orderId + ' đã được giao?')) {
    businessManager.updateOrderStatus(orderId, 'delivered');
    alert('Đã cập nhật trạng thái đơn hàng');
    loadOrders();
    updateCounts();
  }
}

// View Return Detail
function viewReturnDetail(requestId) {
  const request = businessManager.getReturnRequestById(requestId);
  if (!request) return;

  currentReturn = request;

  const detailBody = document.getElementById('returnDetailBody');
  detailBody.innerHTML = `
    <h2 class="return-order-id">Đơn hàng #${request.orderId}</h2>

    <div class="return-info-grid">
      <div class="return-info-section">
        <h3>Thông tin khách hàng</h3>
        <div class="customer-info">
          <div class="info-row">
            <span class="info-label">Tên:</span>
            <span class="info-value">${request.customerName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Điện thoại:</span>
            <span class="info-value">${request.customerPhone}</span>
          </div>
        </div>
      </div>

      <div class="return-info-section">
        <h3>Ngày đặt hàng</h3>
        <div class="info-value">${request.createdAt}</div>
      </div>
    </div>

    <h3 class="return-detail-label">Lý do trả hàng</h3>
    <div class="return-reason-box">
      <div class="return-reason-text">${request.reason}</div>
    </div>

    <div class="return-detail-label">Chi tiết:</div>
    <div class="return-description">${request.description}</div>

    <div class="return-detail-label">Ảnh minh chứng</div>
    <div class="return-images-grid">
      ${request.images.map(img => `
        <img src="${img}" alt="Evidence" class="return-image">
      `).join('')}
    </div>

    <h3 class="return-detail-label">Sản phẩm yêu cầu trả</h3>
    <div class="return-products-list">
      ${request.items.map(item => `
        <div class="return-product-item">
          <div>
            <div class="return-product-name">${item.productName}</div>
            <div class="return-product-quantity">Số lượng: ${item.quantity} ${item.unit}</div>
          </div>
          <div class="return-product-price">${formatPrice(item.price)}₫</div>
        </div>
      `).join('')}

      <div class="return-total-section">
        <span class="return-total-label">Tổng giá trị trả hàng:</span>
        <span class="return-total-amount">${formatPrice(request.totalAmount)}₫</span>
      </div>
    </div>
  `;

  document.getElementById('returnDetailModal').classList.add('active');
}

// Close Return Detail Modal
function closeReturnDetailModal() {
  document.getElementById('returnDetailModal').classList.remove('active');
}

// Approve Return
function approveReturn() {
  if (!currentReturn) return;

  if (confirm('Xác nhận chấp nhận yêu cầu trả hàng?')) {
    businessManager.updateReturnRequestStatus(currentReturn.id, 'approved');
    alert('Đã chấp nhận yêu cầu trả hàng');
    closeReturnDetailModal();
    loadOrders();
    updateCounts();
  }
}

// Reject Return
function rejectReturn() {
  if (!currentReturn) return;

  if (confirm('Xác nhận từ chối yêu cầu trả hàng?')) {
    businessManager.updateReturnRequestStatus(currentReturn.id, 'rejected');
    alert('Đã từ chối yêu cầu trả hàng');
    closeReturnDetailModal();
    loadOrders();
    updateCounts();
  }
}

// Contact Customer
function contactCustomer() {
  alert('Tính năng nhắn tin đang được phát triển');
}

// Quick Approve Return
function approveReturnQuick(requestId) {
  if (confirm('Xác nhận chấp nhận yêu cầu trả hàng?')) {
    businessManager.updateReturnRequestStatus(requestId, 'approved');
    alert('Đã chấp nhận yêu cầu trả hàng');
    loadOrders();
    updateCounts();
  }
}

// Quick Reject Return
function rejectReturnQuick(requestId) {
  if (confirm('Xác nhận từ chối yêu cầu trả hàng?')) {
    businessManager.updateReturnRequestStatus(requestId, 'rejected');
    alert('Đã từ chối yêu cầu trả hàng');
    loadOrders();
    updateCounts();
  }
}

// Contact Customer Return
function contactCustomerReturn(requestId) {
  alert('Tính năng nhắn tin đang được phát triển');
}

// Format Price
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Format Date Time
function formatDateTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

// Logout function
function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    dataManager.logout();
    alert('Đã đăng xuất thành công!');
    window.location.href = 'index.html';
  }
}
