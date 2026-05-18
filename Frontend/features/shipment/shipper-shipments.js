// ============ Authorization Check ============
function checkShipperAuth() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const role = user.role || '';
  const shipperId = user.user_id;

  if (role !== 'shipper' || !shipperId) {
    const container = document.getElementById('availableList') || document.getElementById('assignedList');
    if (container) {
      container.innerHTML = '<div style="color: #ef4444; padding: 16px; border: 1px solid #fee2e2; border-radius: 4px; background: #fef2f2;">⚠️ Bạn không có quyền truy cập trang này. Vui lòng đăng nhập bằng tài khoản giao hàng.</div>';
    }
    return false;
  }
  return true;
}

// ============ Tab Management ============
// ✅ Fix 1: nhận `btnEl` thay vì dùng `event` global ngầm định
function switchTab(tabName, btnEl) {
  if (!checkShipperAuth()) return;

  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabName).classList.add('active');
  if (btnEl) btnEl.classList.add('active');

  if (tabName === 'available') {
    loadAvailableShipments();
  } else if (tabName === 'assigned') {
    loadShipperShipments();
  }
}

// ============ Available Shipments (for accepting) ============
async function loadAvailableShipments() {
  if (!checkShipperAuth()) return;

  const container = document.getElementById('availableList');
  if (!container) return;
  try {
    const resp = await fetch(apiUrl('/api/shipments/available'));
    if (!resp.ok) throw new Error('Failed to load');
    const body = await resp.json();
    const shipments = body.shipments || [];
    if (shipments.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 48px; color: #999;">Không có đơn nào đang chờ.</div>';
      return;
    }
    container.innerHTML = shipments.map(s => {
      return `<div class="shipment-card">
        <div class="shipment-info">
          <div class="shipment-info-item">
            <span class="shipment-info-label">Mã đơn hàng</span>
            <span class="shipment-info-value">#${s.order_id}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Trạng thái</span>
            <span class="status-badge status-${s.status.toLowerCase()}">${s.status}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Khách hàng</span>
            <span class="shipment-info-value">${s.customer_name}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Điện thoại</span>
            <span class="shipment-info-value">${s.customer_phone}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Địa chỉ giao</span>
            <span class="shipment-info-value">${s.shipping_address || '—'}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Tổng tiền</span>
            <span class="shipment-info-value">${s.total_amount ? Number(s.total_amount).toLocaleString() + ' VNĐ' : '—'}</span>
          </div>
        </div>
        <div class="action-buttons">
          <button class="btn-sm btn-accept" onclick="openAcceptModal(${s.shipment_id}, ${s.order_id}, '${s.customer_name}')">
            ✓ Nhận đơn này
          </button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    console.error('loadAvailableShipments error', err);
    container.innerHTML = '<div style="color: #ef4444; padding: 16px;">Lỗi khi tải đơn chờ: ' + err.message + '</div>';
  }
}

// ============ Accept Shipment Modal ============
let pendingAcceptId = null;

function openAcceptModal(shipmentId, orderId, customerName) {
  pendingAcceptId = shipmentId;
  document.getElementById('acceptContent').innerHTML = `
    <p style="margin: 0 0 16px 0;">Bạn có muốn nhận đơn hàng này?</p>
    <div style="background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 4px solid #3b82f6;">
      <div><strong>Mã đơn:</strong> #${orderId}</div>
      <div><strong>Khách:</strong> ${customerName}</div>
    </div>
  `;
  document.getElementById('acceptModal').classList.add('active');
}

function closeAcceptModal() {
  document.getElementById('acceptModal').classList.remove('active');
  pendingAcceptId = null;
}

async function confirmAccept() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const shipperId = user.id || user.user_id || localStorage.getItem('currentShipperId');
  if (!shipperId) {
    alert('Không xác định được shipper, vui lòng đăng nhập lại');
    return;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('authToken');
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
    const resp = await fetch(apiUrl('/api/shipments/' + pendingAcceptId + '/assign'), {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ shipperId: Number(shipperId) })
    });
    if (resp.ok) {
      alert('✓ Đã nhận đơn thành công!');
      closeAcceptModal();
      loadAvailableShipments();
      loadShipperShipments();
    } else {
      const err = await resp.json();
      alert('Lỗi: ' + (err.error || 'Không thể nhận đơn'));
    }
  } catch (err) {
    console.error('confirmAccept error', err);
    alert('Lỗi kết nối server');
  }
}

// ============ Shipper's Assigned Shipments ============
async function loadShipperShipments() {
  if (!checkShipperAuth()) {
    const container = document.getElementById('shipmentsList');
    if (container) {
      container.innerHTML = '<div style="color: #ef4444; padding: 16px; border: 1px solid #fee2e2; border-radius: 4px; background: #fef2f2;">⚠️ Bạn không có quyền truy cập trang này. Vui lòng đăng nhập bằng tài khoản giao hàng.</div>';
    }
    return;
  }

  let shipperId = null;
  try {
    const rawUser = localStorage.getItem('currentUser');
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (user && (user.role || '').toLowerCase() === 'shipper') {
      shipperId = user.id || user.user_id || null;
    }
  } catch (e) { shipperId = null; }
  shipperId = shipperId || localStorage.getItem('currentShipperId') || null;

  const container = document.getElementById('shipmentsList');
  container.innerHTML = 'Đang tải...';

  if (!shipperId) {
    container.innerHTML = '<div style="text-align: center; padding: 48px; color: #999;">Vui lòng đăng nhập tài khoản shipper</div>';
    return;
  }

  try {
    const headers = {};
    const token = localStorage.getItem('authToken');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(apiUrl('/api/shipments/shipper/' + shipperId), { headers });
    if (!resp.ok) throw new Error('Failed to load: ' + resp.status);
    const body = await resp.json();
    const shipments = body.shipments || [];

    if (shipments.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 48px; color: #999;">Bạn chưa có đơn hàng nào đang giao.</div>';
      return;
    }

    container.innerHTML = shipments.map(s => {
      const statusClass = 'status-' + (s.status || 'waiting').toLowerCase();
      return `<div class="shipment-card">
        <div class="shipment-info">
          <div class="shipment-info-item">
            <span class="shipment-info-label">Mã đơn hàng</span>
            <span class="shipment-info-value">#${s.order_id}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Trạng thái</span>
            <span class="status-badge ${statusClass}">${formatStatus(s.status)}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Khách hàng</span>
            <span class="shipment-info-value">${s.customer_name}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Điện thoại</span>
            <span class="shipment-info-value">${s.customer_phone}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Địa chỉ giao</span>
            <span class="shipment-info-value">${s.shipping_address || '—'}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Tổng tiền</span>
            <span class="shipment-info-value">${s.total_amount ? Number(s.total_amount).toLocaleString() + ' VNĐ' : '—'}</span>
          </div>
          <div class="shipment-info-item">
            <span class="shipment-info-label">Mã tracking</span>
            <span class="shipment-info-value">${s.tracking_code || '—'}</span>
          </div>
        </div>
        <div class="action-buttons">
          ${getNextActions(s.shipment_id, s.status)}
          <button class="btn-sm btn-fail" onclick="openFailureModal(${s.shipment_id})">
            ✗ Giao thất bại
          </button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    console.error('loadShipperShipments error', err);
    container.innerHTML = '<div style="color: #ef4444; padding: 16px;">Lỗi khi tải đơn hàng: ' + err.message + '</div>';
  }
}

// ============ Next Action Buttons (theo trạng thái) ============
function getNextActions(shipmentId, currentStatus) {
  const actions = [];
  switch (currentStatus) {
    case 'WAITING':
      actions.push(`<button class="btn-sm btn-next" onclick="updateStatusWithReason(${shipmentId}, 'PICKED_UP')">→ Đã lấy hàng</button>`);
      break;
    case 'PICKED_UP':
      actions.push(`<button class="btn-sm btn-next" onclick="updateStatusWithReason(${shipmentId}, 'DELIVERING')">→ Đang giao</button>`);
      break;
    case 'DELIVERING':
      actions.push(`<button class="btn-sm btn-next" onclick="updateStatusWithReason(${shipmentId}, 'DELIVERED')">✓ Giao xong</button>`);
      break;
    case 'DELIVERED':
    case 'FAILED':
      break;
  }
  return actions.join('');
}

// ============ Failure Modal ============
let pendingFailureId = null;

function openFailureModal(shipmentId) {
  pendingFailureId = shipmentId;
  document.getElementById('failureReason').value = '';
  document.getElementById('failureModal').classList.add('active');
}

function closeFailureModal() {
  document.getElementById('failureModal').classList.remove('active');
  pendingFailureId = null;
}

async function confirmFailure() {
  const reason = document.getElementById('failureReason').value.trim();
  if (!reason) {
    alert('Vui lòng nhập lý do giao thất bại');
    return;
  }

  await updateStatusWithReason(pendingFailureId, 'FAILED', reason);
  closeFailureModal();
}

// ============ Status Update ============
async function updateStatusWithReason(shipmentId, status, failure_reason = null) {
  try {
    const reqBody = { status };
    if (failure_reason) reqBody.failure_reason = failure_reason;

    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('authToken');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(apiUrl('/api/shipments/' + shipmentId + '/status'), {
      method: 'PATCH',
      headers,
      body: JSON.stringify(reqBody)
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert('Cập nhật thất bại: ' + (err.error || resp.statusText));
      return;
    }

    alert('✓ Cập nhật trạng thái thành công!');
    await loadShipperShipments();
  } catch (err) {
    console.error('updateStatusWithReason error', err);
    alert('Lỗi kết nối server');
  }
}

// ============ Helper Functions ============
function formatStatus(status) {
  const statusMap = {
    'WAITING':    'Chờ nhận',
    'PICKED_UP':  'Đã lấy hàng',
    'DELIVERING': 'Đang giao',
    'DELIVERED':  'Đã giao',
    'FAILED':     'Giao thất bại'
  };
  return statusMap[status] || status;
}

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', function () {
  loadAvailableShipments();
  loadShipperShipments();
});
