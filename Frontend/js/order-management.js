// Order Management JavaScript

let currentUser = null;
let currentStatus = 'all';
let selectedRating = 0;
let currentOrder = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  currentUser = dataManager.getCurrentUser();
  
  if (!currentUser) {
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
    
    const profileLink = document.createElement('a');
    profileLink.href = 'order-management.html';
    profileLink.textContent = 'Đơn hàng của tôi';
    profileLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB; cursor: pointer;';
    profileLink.onclick = function(e) {
      // Allow navigation to happen
      e.stopPropagation();
      dropdown.style.display = 'none';
      // Let the browser handle the navigation
      return true;
    };
    
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
});

// Initialize Tabs
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
      document.getElementById(`${tab}-tab`).classList.add('active');
    });
  });
}

// Initialize Filters
function initializeFilters() {
  const filterBtns = document.querySelectorAll('.status-filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active button
      document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Update current status
      currentStatus = this.dataset.status;
      
      // Reload orders
      loadOrders();
    });
  });
}

// Load Orders
function loadOrders() {
  const ordersList = document.getElementById('ordersList');
  let orders = businessManager.getOrdersByCustomer(currentUser.id);
  
  // Filter by status
  if (currentStatus !== 'all') {
    orders = orders.filter(order => order.status === currentStatus);
  }
  
  // Filter by search term
  const searchTerm = document.getElementById('orderSearch')?.value.toLowerCase().trim();
  if (searchTerm) {
    orders = orders.filter(order => 
      order.id.toLowerCase().includes(searchTerm) ||
      order.businessName.toLowerCase().includes(searchTerm) ||
      order.items.some(item => item.productName.toLowerCase().includes(searchTerm))
    );
  }

  // Sort by date (newest first)
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <p class="empty-state-text">${searchTerm ? 'Không tìm thấy đơn hàng nào' : 'Không có đơn hàng nào'}</p>
      </div>
    `;
    return;
  }

  ordersList.innerHTML = orders.map(order => renderOrderCard(order)).join('');
}

// Initialize Search
function initializeSearch() {
  const searchInput = document.getElementById('orderSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      loadOrders();
    });
  }
}

// Render Order Card
function renderOrderCard(order) {
  const statusLabels = {
    preparing: 'Đang chuẩn bị',
    shipping: 'Đang vận chuyển',
    delivered: 'Đã giao hàng',
    completed: 'Hoàn thành'
  };

  const statusClass = order.status;
  const statusLabel = statusLabels[order.status];

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
            <span class="meta-value">${order.businessName}</span>
          </div>
        </div>

        ${order.items.map(item => `
          <div class="order-item">
            <img src="${item.image}" alt="${item.productName}" class="order-item-image">
            <div class="order-item-info">
              <div class="order-item-name">${item.productName}</div>
              <div class="order-item-quantity">Số lượng: ${item.quantity}</div>
            </div>
            <div class="order-item-price">₫${formatPrice(item.price)}</div>
          </div>
        `).join('')}

        ${order.trackingNumber ? `
          <div class="tracking-info">
            <span class="tracking-label">Mã vận đơn:</span>
            <span class="tracking-number">${order.trackingNumber}</span>
          </div>
        ` : ''}

        ${order.deliveredDate ? `
          <div class="delivery-info">
            <div>
              <span class="delivery-date-label">Đã giao hàng vào:</span>
              <span class="delivery-date">${order.deliveredDate}</span>
            </div>
            ${!order.expired && order.daysLeftToReview !== undefined ? `
              <p class="review-reminder">Bạn có 1 tháng để đánh giá sản phẩm này</p>
            ` : ''}
          </div>
        ` : ''}

        ${order.rating ? `
          <div class="review-display">
            <div class="review-label">Đánh giá của bạn:</div>
            <div class="review-stars">
              ${Array(5).fill(0).map((_, i) => `<span class="review-star">${i < order.rating ? '★' : '☆'}</span>`).join('')}
            </div>
            <div class="review-text">${order.review}</div>
          </div>
        ` : ''}
      </div>

      <div class="order-actions">
        <button class="order-action-btn btn-detail" onclick="viewOrderDetail('${order.id}')">
          Xem chi tiết
        </button>
        ${order.trackingNumber ? `
          <button class="order-action-btn btn-track" onclick="trackOrder('${order.id}')">
            Theo dõi đơn hàng
          </button>
        ` : ''}
        
        ${order.status === 'delivered' && !order.rating ? `
          <button class="order-action-btn btn-return" onclick="openReturnModal('${order.id}')">
            Yêu cầu trả hàng/hoàn tiền
          </button>
          <button class="order-action-btn btn-received" onclick="confirmReceived('${order.id}')">
            Đã nhận được hàng
          </button>
        ` : ''}

        ${order.status === 'completed' && !order.expired ? `
          <button class="order-action-btn btn-return" onclick="openReturnModal('${order.id}')">
            Yêu cầu trả hàng/hoàn tiền
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Track Order
function trackOrder(orderId) {
  alert('Tính năng theo dõi đơn hàng đang được phát triển');
}

// Confirm Received
function confirmReceived(orderId) {
  if (confirm('Xác nhận bạn đã nhận được hàng?')) {
    businessManager.updateOrderStatus(orderId, 'completed');
    // Show review modal
    openReviewModal(orderId);
    loadOrders();
  }
}

// Open Review Modal
function openReviewModal(orderId) {
  const order = businessManager.getOrderById(orderId);
  if (!order) return;

  currentOrder = order;
  selectedRating = 0;

  // Reset stars
  document.querySelectorAll('.star-input').forEach(star => {
    star.classList.remove('selected');
  });

  // Clear inputs
  document.getElementById('reviewComment').value = '';
  document.getElementById('reviewImagePreview').innerHTML = '';

  // Show order info
  const orderInfo = document.getElementById('reviewOrderInfo');
  orderInfo.innerHTML = `
    <div class="modal-order-info">
      <img src="${order.items[0].image}" alt="${order.items[0].productName}" class="modal-order-image">
      <div>
        <div class="modal-order-name">${order.items[0].productName}</div>
        <div class="modal-order-id">Đơn hàng #${order.id}</div>
      </div>
    </div>
  `;

  // Show modal
  document.getElementById('reviewModal').classList.add('active');
}

// Close Review Modal
function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('active');
}

// Initialize Star Rating
function initializeStarRating() {
  const stars = document.querySelectorAll('.star-input');
  
  stars.forEach(star => {
    star.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.rating);
      
      // Update visual
      stars.forEach((s, index) => {
        if (index < selectedRating) {
          s.classList.add('selected');
        } else {
          s.classList.remove('selected');
        }
      });
    });

    star.addEventListener('mouseenter', function() {
      const rating = parseInt(this.dataset.rating);
      stars.forEach((s, index) => {
        if (index < rating) {
          s.style.color = '#FFD700';
        } else {
          s.style.color = '#D1D5DB';
        }
      });
    });

    star.addEventListener('mouseleave', function() {
      stars.forEach((s, index) => {
        if (index < selectedRating) {
          s.style.color = '#FFD700';
        } else {
          s.style.color = '#D1D5DB';
        }
      });
    });
  });
}

// Initialize Image Upload
function initializeImageUpload() {
  const reviewImagesInput = document.getElementById('reviewImages');
  const returnImagesInput = document.getElementById('returnImages');

  if (reviewImagesInput) {
    reviewImagesInput.addEventListener('change', function(e) {
      handleImagePreview(e.target.files, 'reviewImagePreview');
    });
  }

  if (returnImagesInput) {
    returnImagesInput.addEventListener('change', function(e) {
      handleImagePreview(e.target.files, 'returnImagePreview');
    });
  }
}

// Handle Image Preview
function handleImagePreview(files, previewId) {
  const preview = document.getElementById(previewId);
  preview.innerHTML = '';

  Array.from(files).forEach((file, index) => {
    if (index >= 5) return; // Max 5 images

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

// Submit Review
function submitReview() {
  if (!selectedRating) {
    alert('Vui lòng chọn số sao đánh giá');
    return;
  }

  const comment = document.getElementById('reviewComment').value;

  if (!comment.trim()) {
    alert('Vui lòng nhập nhận xét của bạn');
    return;
  }

  // Add review
  businessManager.addReview({
    productId: currentOrder.items[0].productId,
    orderId: currentOrder.id,
    userId: currentUser.id,
    userName: currentUser.fullName,
    rating: selectedRating,
    comment: comment,
    images: []
  });

  alert('Cảm ơn bạn đã đánh giá!');
  closeReviewModal();
  loadOrders();
}

// Open Return Modal
function openReturnModal(orderId) {
  const order = businessManager.getOrderById(orderId);
  if (!order) return;

  currentOrder = order;

  // Clear inputs
  document.getElementById('returnReason').value = '';
  document.getElementById('returnDescription').value = '';
  document.getElementById('returnImagePreview').innerHTML = '';

  // Show order info
  const orderInfo = document.getElementById('returnOrderInfo');
  orderInfo.innerHTML = `
    <div class="modal-order-info">
      <img src="${order.items[0].image}" alt="${order.items[0].productName}" class="modal-order-image">
      <div>
        <div class="modal-order-name">${order.items[0].productName}</div>
        <div class="modal-order-id">Mã đơn hàng: ${order.id}</div>
      </div>
    </div>
  `;

  // Show modal
  document.getElementById('returnModal').classList.add('active');
}

// Close Return Modal
function closeReturnModal() {
  document.getElementById('returnModal').classList.remove('active');
}

// Submit Return
function submitReturn() {
  const reason = document.getElementById('returnReason').value;
  const description = document.getElementById('returnDescription').value;

  if (!reason) {
    alert('Vui lòng chọn lý do trả hàng');
    return;
  }

  const images = document.querySelectorAll('#returnImagePreview .image-preview-img');
  if (images.length === 0) {
    alert('Vui lòng tải lên ít nhất 1 ảnh minh chứng');
    return;
  }

  // Create return request
  businessManager.createReturnRequest({
    orderId: currentOrder.id,
    customerId: currentUser.id,
    customerName: currentUser.fullName,
    customerPhone: currentUser.phone,
    businessId: currentOrder.businessId,
    items: currentOrder.items.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unit: 'kg',
      price: item.price
    })),
    totalAmount: currentOrder.totalAmount,
    reason: reason,
    description: description,
    images: []
  });

  alert('Yêu cầu trả hàng đã được gửi!');
  closeReturnModal();
}

// Format Price
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Format Date
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${day}/${month}/${year}`;
}

// Format Date Time
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

// View Order Detail
function viewOrderDetail(orderId) {
  const order = businessManager.getOrderById(orderId);
  if (!order) {
    alert('Không tìm thấy đơn hàng');
    return;
  }

  const statusLabels = {
    preparing: 'Đang chuẩn bị',
    shipping: 'Đang vận chuyển',
    delivered: 'Đã giao hàng',
    completed: 'Hoàn thành'
  };

  const statusClass = order.status;
  const statusLabel = statusLabels[order.status] || order.status;

  const detailBody = document.getElementById('orderDetailBody');
  detailBody.innerHTML = `
    <div class="order-detail-section">
      <h3 class="order-detail-section-title">Thông tin đơn hàng</h3>
      <div class="order-detail-grid">
        <div class="order-detail-item">
          <span class="order-detail-label">Mã đơn hàng:</span>
          <span class="order-detail-value">#${order.id}</span>
        </div>
        <div class="order-detail-item">
          <span class="order-detail-label">Trạng thái:</span>
          <span class="order-status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="order-detail-item">
          <span class="order-detail-label">Ngày đặt:</span>
          <span class="order-detail-value">${formatDate(order.orderDate)}</span>
        </div>
        ${order.shippedDate ? `
          <div class="order-detail-item">
            <span class="order-detail-label">Ngày gửi:</span>
            <span class="order-detail-value">${formatDateTime(order.shippedDate)}</span>
          </div>
        ` : ''}
        ${order.deliveredDate ? `
          <div class="order-detail-item">
            <span class="order-detail-label">Ngày giao:</span>
            <span class="order-detail-value">${order.deliveredDate}</span>
          </div>
        ` : ''}
        ${order.trackingNumber ? `
          <div class="order-detail-item">
            <span class="order-detail-label">Mã vận đơn:</span>
            <span class="order-detail-value">${order.trackingNumber}</span>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="order-detail-section">
      <h3 class="order-detail-section-title">Thông tin người bán</h3>
      <div class="order-detail-grid">
        <div class="order-detail-item">
          <span class="order-detail-label">Tên doanh nghiệp:</span>
          <span class="order-detail-value">${order.businessName}</span>
        </div>
      </div>
    </div>

    <div class="order-detail-section">
      <h3 class="order-detail-section-title">Thông tin giao hàng</h3>
      <div class="order-detail-grid">
        <div class="order-detail-item">
          <span class="order-detail-label">Người nhận:</span>
          <span class="order-detail-value">${order.customerName}</span>
        </div>
        <div class="order-detail-item">
          <span class="order-detail-label">Số điện thoại:</span>
          <span class="order-detail-value">${order.customerPhone}</span>
        </div>
        <div class="order-detail-item" style="grid-column: 1 / -1;">
          <span class="order-detail-label">Địa chỉ:</span>
          <span class="order-detail-value">${order.customerAddress}</span>
        </div>
      </div>
    </div>

    <div class="order-detail-section">
      <h3 class="order-detail-section-title">Sản phẩm đã đặt</h3>
      <div class="order-detail-products">
        ${order.items.map(item => `
          <div class="order-detail-product-item">
            <img src="${item.image}" alt="${item.productName}" class="order-detail-product-image">
            <div class="order-detail-product-info">
              <div class="order-detail-product-name">${item.productName}</div>
              <div class="order-detail-product-meta">
                <span>Số lượng: ${item.quantity} kg</span>
                <span>Đơn giá: ₫${formatPrice(item.price)}</span>
              </div>
            </div>
            <div class="order-detail-product-total">
              ₫${formatPrice(item.price * item.quantity)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="order-detail-section">
      <h3 class="order-detail-section-title">Tổng thanh toán</h3>
      <div class="order-detail-summary">
        <div class="order-detail-summary-item">
          <span class="order-detail-summary-label">Tạm tính:</span>
          <span class="order-detail-summary-value">₫${formatPrice(order.totalAmount)}</span>
        </div>
        <div class="order-detail-summary-item">
          <span class="order-detail-summary-label">Phí vận chuyển:</span>
          <span class="order-detail-summary-value">₫30.000</span>
        </div>
        <div class="order-detail-summary-item order-detail-total">
          <span class="order-detail-summary-label">Tổng cộng:</span>
          <span class="order-detail-summary-value">₫${formatPrice(order.totalAmount + 30000)}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('orderDetailModal').classList.add('active');
}

// Close Order Detail Modal
function closeOrderDetailModal() {
  document.getElementById('orderDetailModal').classList.remove('active');
}

// Logout function
function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    dataManager.logout();
    alert('Đã đăng xuất thành công!');
    window.location.href = 'index.html';
  }
}
