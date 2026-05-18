// UC13: Vendor manage return requests
let currentFilterStatus = null;
let currentRequestId = null;

// ============ Authorization Check ============
function checkVendorAuth() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const role = user.role || '';
  const enterpriseId = user.user_id;

  if (role !== 'enterprise' || !enterpriseId) {
    const container = document.getElementById('returnsList');
    if (container) {
      container.innerHTML = '<div style="color: #ef4444; padding: 16px; border: 1px solid #fee2e2; border-radius: 4px; background: #fef2f2;">⚠️ Bạn không có quyền truy cập trang này. Vui lòng đăng nhập bằng tài khoản doanh nghiệp.</div>';
    }
    return false;
  }
  return true;
}

// Load return requests for this vendor
async function loadReturnRequests() {
  const container = document.getElementById('returnsList');
  if (!container) return;

  if (!checkVendorAuth()) return;

  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const enterpriseId = user.user_id;

  if (!enterpriseId) {
    container.innerHTML = '<div class="alert">Vui lòng đăng nhập tài khoản doanh nghiệp</div>';
    return;
  }

  try {
    const headers = {};
    const token = localStorage.getItem('authToken');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let url = window.apiUrl('/api/returns') + '?enterpriseId=' + enterpriseId;
    if (currentFilterStatus) {
      url += '&status=' + currentFilterStatus;
    }

    const resp = await fetch(url, { headers });
    if (!resp.ok) throw new Error('Failed to load');

    const body = await resp.json();
    const returns = body.returns || [];

    if (returns.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 48px; color: #999;">Không có yêu cầu đổi/trả nào</div>';
      return;
    }

    container.innerHTML = returns.map(r => `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px; margin-bottom: 12px;">
          <div style="flex: 1;">
            <div style="margin-bottom: 8px;">
              <strong>Khách hàng:</strong> ${r.customer_name} (${r.customer_email})
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Sản phẩm:</strong> ${r.product_name} (Số lượng: ${r.quantity})
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Loại yêu cầu:</strong> ${r.type === 'EXCHANGE' ? 'Đổi hàng' : 'Hoàn tiền'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Lý do:</strong> ${r.reason || 'Không có'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Trạng thái:</strong>
              <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 8px; background: ${getStatusColor(r.status)}; color: white;">
                ${getStatusText(r.status)}
              </span>
            </div>
            <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
              <strong>Ngày gửi:</strong> ${new Date(r.created_at).toLocaleString('vi-VN')}
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 200px;">
            ${r.status === 'PENDING' ? `
              <button onclick="openReviewModal(${r.request_id})" style="padding: 10px; background: #16A34A; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Xem chi tiết & Xử lý
              </button>
              <button onclick="openApproveModal(${r.request_id})" style="padding: 10px; background: #10B981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Chấp nhận
              </button>
              <button onclick="openRejectModal(${r.request_id})" style="padding: 10px; background: #EF4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Từ chối
              </button>
            ` : `
              <div style="padding: 10px; background: #f3f4f6; border-radius: 4px; text-align: center; color: #666; font-size: 12px;">
                ${r.status === 'APPROVED' ? 'Đã chấp nhận' : 'Đã từ chối'}
              </div>
            `}
          </div>
        </div>
        ${r.rejected_reason ? `<div style="margin-top: 12px; padding: 12px; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; color: #991b1b;"><strong>Lý do từ chối:</strong> ${r.rejected_reason}</div>` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('loadReturnRequests error', err);
    container.innerHTML = '<div class="alert">Lỗi khi tải yêu cầu đổi/trả: ' + err.message + '</div>';
  }
}

function getStatusColor(status) {
  switch(status) {
    case 'PENDING': return '#F59E0B';
    case 'APPROVED': return '#10B981';
    case 'REJECTED': return '#EF4444';
    default: return '#6B7280';
  }
}

function getStatusText(status) {
  switch(status) {
    case 'PENDING': return 'Chờ xử lý';
    case 'APPROVED': return 'Đã chấp nhận';
    case 'REJECTED': return 'Đã từ chối';
    default: return status;
  }
}

function filterByStatus(status) {
  currentFilterStatus = status;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.style.background = '#ddd';
    btn.style.color = '#333';
  });
  event.target.style.background = '#16A34A';
  event.target.style.color = 'white';
  loadReturnRequests();
}

function openReviewModal(requestId) {
  currentRequestId = requestId;
  document.getElementById('reviewModal').style.display = 'flex';
  document.getElementById('reviewContent').innerHTML = 'Đang tải chi tiết...';
  // Load detailed info if needed
}

function closeReviewModal() {
  document.getElementById('reviewModal').style.display = 'none';
}

function openApproveModal(requestId) {
  currentRequestId = requestId;
  document.getElementById('approveModal').style.display = 'flex';
}

function closeApproveModal() {
  document.getElementById('approveModal').style.display = 'none';
}

async function submitApprove() {
  const actionType = document.getElementById('actionType').value;
  const token = localStorage.getItem('authToken');
  
  try {
    const resp = await fetch(window.apiUrl('/api/returns/' + currentRequestId + '/approve'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ action_type: actionType })
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert('Lỗi: ' + (err.error || 'Không thể chấp nhận'));
      return;
    }

    alert('Đã chấp nhận yêu cầu thành công!');
    closeApproveModal();
    loadReturnRequests();
  } catch (err) {
    console.error('submitApprove error', err);
    alert('Lỗi kết nối server');
  }
}

function openRejectModal(requestId) {
  currentRequestId = requestId;
  document.getElementById('rejectModal').style.display = 'flex';
  document.getElementById('rejectReason').value = '';
}

function closeRejectModal() {
  document.getElementById('rejectModal').style.display = 'none';
}

async function submitReject() {
  const reason = document.getElementById('rejectReason').value.trim();
  if (!reason) {
    alert('Vui lòng nhập lý do từ chối');
    return;
  }

  const token = localStorage.getItem('authToken');
  
  try {
    const resp = await fetch(window.apiUrl('/api/returns/' + currentRequestId + '/reject'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ reason })
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert('Lỗi: ' + (err.error || 'Không thể từ chối'));
      return;
    }

    alert('Đã từ chối yêu cầu thành công!');
    closeRejectModal();
    loadReturnRequests();
  } catch (err) {
    console.error('submitReject error', err);
    alert('Lỗi kết nối server');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadReturnRequests();
  // Reload every 30 seconds to check for new requests
  setInterval(loadReturnRequests, 30000);
});
