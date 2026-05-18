// UC9: Customer track order
async function trackOrder() {
  const orderId = document.getElementById('orderIdInput').value.trim();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const customerId = user.user_id;
  const role = user.role;
  
  if (!orderId) {
    alert('Vui lòng nhập mã đơn hàng');
    return;
  }

  // Verify customer ownership of order
  if (role === 'customer' && customerId) {
    try {
      const headers = {};
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const orderResp = await fetch(window.apiUrl('/api/orders/' + orderId), { headers });
      if (orderResp.ok) {
        const orderData = await orderResp.json();
        if (orderData.order && Number(orderData.order.customer_id) !== Number(customerId)) {
          alert('⚠️ Bạn không có quyền xem đơn hàng này');
          return;
        }
      }
    } catch (err) {
      console.warn('Could not verify order ownership', err);
      // Continue anyway, as tracking endpoint is public
    }
  }

  try {
    const resp = await fetch(window.apiUrl('/api/shipments/track/' + orderId));
    if (!resp.ok) {
      alert('Không tìm thấy thông tin vận chuyển cho đơn hàng này');
      return;
    }

    const body = await resp.json();
    const shipment = body.shipment;
    const history = body.tracking_history || [];
    const timeline = body.timeline || [];

    if (!shipment) {
      document.getElementById('trackInfo').style.display = 'none';
      document.getElementById('emptyState').innerHTML = '<div style="text-align: center; padding: 48px; color: #999;"><div style="font-size: 48px; margin-bottom: 16px;">📦</div><div style="font-size: 18px; margin-bottom: 8px;">Đơn hàng đang được chuẩn bị</div><div style="font-size: 14px;">Hãy kiểm tra lại sau vài giờ</div></div>';
      document.getElementById('emptyState').style.display = 'block';
      return;
    }

    displayTrackingInfo(shipment, history, timeline);
  } catch (err) {
    console.error('trackOrder error', err);
    alert('Lỗi khi tải thông tin: ' + err.message);
  }
}

function displayTrackingInfo(shipment, history, timeline) {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('trackInfo').style.display = 'block';

  // Header Info
  document.getElementById('trackOrderId').textContent = `#${shipment.order_id}`;
  document.getElementById('trackStatus').textContent = getStatusText(shipment.status);
  document.getElementById('trackCode').textContent = shipment.tracking_code || 'Chưa có';
  document.getElementById('trackDelivery').textContent = shipment.estimated_delivery 
    ? new Date(shipment.estimated_delivery).toLocaleDateString('vi-VN')
    : 'Chưa xác định';

  // Timeline
  const timelineHtml = timeline.map((item, index) => {
    const isCompleted = item.completed;
    const isCurrent = !isCompleted && timeline.slice(0, index).every(t => t.completed);

    return `
      <div class="timeline-item">
        <div class="timeline-line"></div>
        <div class="timeline-marker ${isCompleted ? 'completed' : (isCurrent ? 'current' : '')}">
          ${isCompleted ? '✓' : (isCurrent ? '→' : '○')}
        </div>
        <div class="timeline-content">
          <div class="timeline-title">${item.text}</div>
          ${item.time ? `<div class="timeline-time">${new Date(item.time).toLocaleString('vi-VN')}</div>` : ''}
          ${item.notes ? `<div class="timeline-description">${item.notes}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('trackTimeline').innerHTML = timelineHtml;

  // History Details
  if (history && history.length > 0) {
    document.getElementById('trackHistoryContainer').style.display = 'block';
    const historyHtml = history.map(h => `
      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
          <div>
            <div style="font-weight: bold; color: #333; margin-bottom: 4px;">${h.status}</div>
            <div style="font-size: 14px; color: #666;">${h.notes || 'Không có ghi chú'}</div>
          </div>
          <div style="font-size: 12px; color: #999; white-space: nowrap;">
            ${new Date(h.created_at).toLocaleString('vi-VN')}
          </div>
        </div>
      </div>
    `).join('');

    document.getElementById('trackHistory').innerHTML = historyHtml;
  } else {
    document.getElementById('trackHistoryContainer').style.display = 'none';
  }
}

function getStatusText(status) {
  const statusMap = {
    'WAITING': 'Chờ lấy hàng',
    'PICKED_UP': 'Đã lấy hàng',
    'DELIVERING': 'Đang giao',
    'DELIVERED': 'Đã giao thành công',
    'FAILED': 'Giao thất bại'
  };
  return statusMap[status] || status;
}

// Allow Enter key to search
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('orderIdInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        trackOrder();
      }
    });
  }

  // Check if there's an orderId in URL params
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  if (orderId) {
    document.getElementById('orderIdInput').value = orderId;
    trackOrder();
  }
});

