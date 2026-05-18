// UC12: Vendor order management
let allOrders = [];
let currentFilter = null;
let currentOrderId = null;

async function loadVendorOrders() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const enterpriseId = user.user_id;

  if (!enterpriseId || user.role !== 'enterprise') {
    document.getElementById('ordersList').innerHTML = '<div style="color: #e74c3c;">Bạn không có quyền truy cập trang này</div>';
    return;
  }

  try {
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(window.apiUrl('/api/orders?enterpriseId=' + enterpriseId), { headers });
    if (!resp.ok) throw new Error('Failed to load');

    const body = await resp.json();
    allOrders = body.orders || [];

    filterByStatus(currentFilter);
  } catch (err) {
    console.error('loadVendorOrders error', err);
    document.getElementById('ordersList').innerHTML = '<div style="color: #e74c3c;">Lỗi khi tải: ' + err.message + '</div>';
  }
}

function filterByStatus(status) {
  currentFilter = status;

  // Update tab buttons
  document.querySelectorAll('.status-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target?.classList.add('active');

  // Filter orders
  const filtered = currentFilter 
    ? allOrders.filter(o => o.status === currentFilter)
    : allOrders;

  if (filtered.length === 0) {
    document.getElementById('ordersList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    return;
  }

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('ordersList').style.display = 'block';

  // Render orders
  const html = filtered.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div style="flex: 1;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
            Đơn hàng #${order.order_id}
            <span class="order-status status-${getStatusClass(order.status)}">
              ${getStatusText(order.status)}
            </span>
          </div>
          <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
            <strong>Khách hàng:</strong> ${order.customer_name || 'N/A'}
          </div>
          <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
            <strong>Địa chỉ giao:</strong> ${order.delivery_address || 'N/A'}
          </div>
          <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
            <strong>Tổng tiền:</strong> ${Number(order.total_amount).toLocaleString()} VNĐ
          </div>
          <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
            <strong>Ngày đặt:</strong> ${new Date(order.created_at).toLocaleString('vi-VN')}
          </div>

          <!-- Order Items -->
          <div class="order-items">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Sản phẩm:</div>
            <div>
              ${(order.items || []).map(item => `
                <div class="order-item">
                  <span>${item.product_name} - ${item.quantity} ${item.unit} x ${Number(item.unit_price).toLocaleString()} VNĐ</span>
                  <span style="font-weight: bold;">${Number(item.quantity * item.unit_price).toLocaleString()} VNĐ</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${getActionButtons(order).join('')}
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('ordersList').innerHTML = html;
}

function getStatusClass(status) {
  const classMap = {
    'PENDING': 'pending',
    'PREPARING': 'preparing',
    'SHIPPING': 'shipping',
    'DELIVERED': 'delivered'
  };
  return classMap[status] || 'pending';
}

function getStatusText(status) {
  const statusMap = {
    'PENDING': 'Chờ xử lý',
    'PREPARING': 'Đang chuẩn bị',
    'SHIPPING': 'Đang giao',
    'DELIVERED': 'Đã giao'
  };
  return statusMap[status] || status;
}

function getActionButtons(order) {
  const buttons = [];

  if (order.status === 'PENDING') {
    buttons.push(`<button class="btn-action btn-primary" onclick="openUpdateStatusModal(${order.order_id}, '${order.status}')">Xác nhận & Chuẩn bị</button>`);
  } else if (order.status === 'PREPARING') {
    buttons.push(`<button class="btn-action btn-primary" onclick="openUpdateStatusModal(${order.order_id}, '${order.status}')">Gửi giao hàng</button>`);
  } else if (order.status === 'SHIPPING') {
    buttons.push(`<span class="btn-action btn-disabled">Đang giao</span>`);
  } else if (order.status === 'DELIVERED') {
    buttons.push(`<span class="btn-action btn-disabled">Đã hoàn thành</span>`);
  }

  return buttons;
}

function openUpdateStatusModal(orderId, currentStatus) {
  currentOrderId = orderId;
  
  const order = allOrders.find(o => o.order_id === orderId);
  document.getElementById('updateOrderInfo').innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">Đơn hàng #${orderId}</div>
    <div style="color: #666; font-size: 14px;">Trạng thái hiện tại: <strong>${getStatusText(currentStatus)}</strong></div>
  `;

  // Set available next statuses
  const statusSelect = document.getElementById('newStatus');
  statusSelect.innerHTML = '';
  
  if (currentStatus === 'PENDING') {
    statusSelect.innerHTML = '<option value="PREPARING">Đang chuẩn bị</option>';
  } else if (currentStatus === 'PREPARING') {
    statusSelect.innerHTML = '<option value="SHIPPING">Đang giao</option>';
  }

  document.getElementById('updateStatusModal').style.display = 'flex';
}

function closeUpdateStatusModal() {
  currentOrderId = null;
  document.getElementById('updateStatusModal').style.display = 'none';
}

async function submitUpdateStatus() {
  if (!currentOrderId) return;

  const newStatus = document.getElementById('newStatus').value;
  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
    const resp = await fetch(window.apiUrl('/api/orders/' + currentOrderId + '/status'), {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: newStatus })
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert('Lỗi: ' + (err.error || 'Không thể cập nhật'));
      return;
    }

    alert('Cập nhật trạng thái thành công!');
    closeUpdateStatusModal();
    loadVendorOrders();
  } catch (err) {
    console.error('submitUpdateStatus error', err);
    alert('Lỗi: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadVendorOrders();

  // Reload orders every 30 seconds
  setInterval(loadVendorOrders, 30000);
});
