// UC8: Customer create return request
let completedOrders = [];

// ============ Authorization Check ============
function checkCustomerAuth() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const role = user.role || '';
  const customerId = user.user_id;

  if (role !== 'customer' || !customerId) {
    document.getElementById('orderSelect').innerHTML = '<option value="">⚠️ Bạn không có quyền truy cập. Vui lòng đăng nhập bằng tài khoản khách hàng.</option>';
    return false;
  }
  return true;
}

// Load completed orders for return requests
async function loadCompletedOrders() {
  if (!checkCustomerAuth()) return;
  
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const customerId = user.user_id;

  if (!customerId) {
    document.getElementById('orderSelect').innerHTML = '<option value="">Vui lòng đăng nhập</option>';
    return;
  }

  try {
    const headers = {};
    const token = localStorage.getItem('authToken');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(window.apiUrl('/api/orders?customerId=' + customerId + '&status=DELIVERED'), { headers });
    if (!resp.ok) throw new Error('Failed to load');

    const body = await resp.json();
    const orders = body.orders || [];
    completedOrders = orders;

    const select = document.getElementById('orderSelect');
    select.innerHTML = '<option value="">-- Chọn đơn hàng --</option>' +
      orders.map(o => `
        <option value="${o.order_id}" data-total="${o.total_amount}" data-items='${JSON.stringify(o.items || [])}'>
          Đơn #${o.order_id} - ${o.business_name} (${new Date(o.created_at).toLocaleDateString('vi-VN')})
        </option>
      `).join('');
  } catch (err) {
    console.error('loadCompletedOrders error', err);
    alert('Lỗi khi tải đơn hàng: ' + err.message);
  }
}

function updateOrderDetails() {
  const select = document.getElementById('orderSelect');
  const orderId = select.value;

  if (!orderId) {
    document.getElementById('orderDetailsContainer').style.display = 'none';
    return;
  }

  const option = select.options[select.selectedIndex];
  const items = JSON.parse(option.getAttribute('data-items') || '[]');
  const total = option.getAttribute('data-total');

  let detailsHtml = `
    <div style="margin-bottom: 8px;"><strong>Mã đơn:</strong> #${orderId}</div>
    <div style="margin-bottom: 8px;"><strong>Tổng tiền:</strong> ${Number(total).toLocaleString()} VNĐ</div>
    <div style="margin-bottom: 8px;"><strong>Sản phẩm trong đơn:</strong></div>
    <ul style="margin-left: 16px; margin-top: 8px;">
  `;

  items.forEach(item => {
    detailsHtml += `
      <li style="margin-bottom: 4px;">
        ${item.product_name} - ${item.quantity} ${item.unit} x ${Number(item.unit_price).toLocaleString()} VNĐ
      </li>
    `;
  });

  detailsHtml += '</ul>';

  document.getElementById('orderDetails').innerHTML = detailsHtml;
  document.getElementById('orderDetailsContainer').style.display = 'block';
}

async function submitReturnRequest() {
  const orderId = document.getElementById('orderSelect').value;
  const returnType = document.querySelector('input[name="returnType"]:checked')?.value;
  const reason = document.getElementById('reason').value.trim();
  const note = document.getElementById('note').value.trim();
  const evidenceFile = document.getElementById('evidenceImage').files[0];

  if (!orderId) {
    alert('Vui lòng chọn đơn hàng');
    return;
  }

  if (!returnType) {
    alert('Vui lòng chọn loại yêu cầu (Đổi hàng hoặc Hoàn tiền)');
    return;
  }

  if (!reason) {
    alert('Vui lòng nhập lý do');
    return;
  }

  if (!evidenceFile) {
    const confirmNoImage = confirm('Bạn chưa gửi ảnh minh chứng. Điều này có thể giảm tỷ lệ chấp nhận. Tiếp tục gửi?');
    if (!confirmNoImage) return;
  }

  try {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const body = {
      type: returnType,
      reason,
      note: note || null,
      evidence_image: null
    };

    // If evidence image provided, convert to base64
    if (evidenceFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        body.evidence_image = e.target.result;
        await sendReturnRequest(orderId, body, token);
      };
      reader.readAsDataURL(evidenceFile);
    } else {
      await sendReturnRequest(orderId, body, token);
    }
  } catch (err) {
    console.error('submitReturnRequest error', err);
    alert('Lỗi: ' + err.message);
  }
}

async function sendReturnRequest(orderId, bodyData, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
    const resp = await fetch(window.apiUrl('/api/orders/' + orderId + '/return'), {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyData)
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert('Lỗi: ' + (err.error || 'Không thể gửi yêu cầu'));
      return;
    }

    alert('Gửi yêu cầu đổi/trả thành công! Doanh nghiệp sẽ xem xét trong 24 giờ.');
    resetForm();
    loadCompletedOrders();
    loadRecentRequests();
  } catch (err) {
    console.error('sendReturnRequest error', err);
    alert('Lỗi kết nối server');
  }
}

function resetForm() {
  document.getElementById('orderSelect').value = '';
  document.querySelector('input[name="returnType"]').checked = false;
  document.getElementById('reason').value = '';
  document.getElementById('note').value = '';
  document.getElementById('evidenceImage').value = '';
  document.getElementById('orderDetailsContainer').style.display = 'none';
}

async function loadRecentRequests() {
  const container = document.getElementById('recentRequests');
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const customerId = user.user_id;

  if (!customerId) {
    container.innerHTML = '<div>Vui lòng đăng nhập</div>';
    return;
  }

  try {
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    // Note: This endpoint needs to be added to backend to get customer's return requests
    // For now, we can display a message
    container.innerHTML = '<div style="color: #999;">Chưa có yêu cầu đổi/trả nào</div>';
  } catch (err) {
    console.error('loadRecentRequests error', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCompletedOrders();
  loadRecentRequests();
});
