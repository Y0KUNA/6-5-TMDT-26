// ============ Authorization Check ============
function checkVendorAuth() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const role = user.role || '';
  const vendorId = user.user_id;

  if (role !== 'enterprise' || !vendorId) {
    return false;
  }
  return true;
}

async function loadVendorShipments() {
  const container = document.getElementById('vendorShipments');
  container.innerHTML = 'Đang tải...';

  if (!checkVendorAuth()) {
    container.innerHTML = '<div style="color: #ef4444; padding: 16px; border: 1px solid #fee2e2; border-radius: 4px; background: #fef2f2;">⚠️ Bạn không có quyền truy cập trang này. Vui lòng đăng nhập bằng tài khoản doanh nghiệp.</div>';
    return;
  }

  // Get vendor/enterprise ID from currentUser
  let vendorId = null;
  try {
    const rawUser = localStorage.getItem('currentUser');
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (user && (user.role || '').toLowerCase() === 'enterprise') {
      vendorId = user.id || user.user_id || null;
    }
  } catch (e) { vendorId = null; }
  vendorId = vendorId || localStorage.getItem('currentVendorId') || null;

  if (!vendorId) {
    container.innerHTML = '<div style="text-align: center; padding: 48px; color: #999;">Vui lòng đăng nhập tài khoản doanh nghiệp để xem trạng thái vận chuyển</div>';
    return;
  }

  try {
    // Fetch orders for this enterprise
    const headers = {};
    const token = localStorage.getItem('authToken');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(apiUrl('/api/orders?enterpriseId=' + vendorId), { headers });
    if (!resp.ok) throw new Error('Failed to load orders');
    const body = await resp.json();
    const orders = body.orders || [];

    if (orders.length === 0) { 
      container.innerHTML = '<div style="text-align: center; padding: 48px; color: #999;">Bạn chưa có đơn hàng nào</div>'; 
      return; 
    }

    // Filter for orders in shipping or completed status
    const activeOrders = orders.filter(o => 
      ['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(o.status) ||
      (o.shipment_id && o.status !== 'PENDING')
    );

    if (activeOrders.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 48px; color: #999;">Chưa có đơn hàng nào đang vận chuyển</div>';
      return;
    }

    // Build shipment cards for each order
    const cards = await Promise.all(activeOrders.map(o => buildShipmentCard(o)));
    container.innerHTML = cards.filter(c => c).join('');
  } catch (err) {
    console.error('loadVendorShipments error', err);
    container.innerHTML = '<div style="color: #ef4444; padding: 16px;">Lỗi khi tải danh sách: ' + err.message + '</div>';
  }
}

async function buildShipmentCard(order) {
  try {
    // Fetch shipment tracking information if order is shipped
    let shipmentInfo = null;
    let timelineHtml = '';
    
    if (order.status === 'SHIPPING' || order.status === 'DELIVERED' || order.status === 'COMPLETED') {
      const resp = await fetch(apiUrl('/api/shipments/track/' + order.order_id));
      if (resp.ok) {
        const data = await resp.json();
        shipmentInfo = data.shipment;
        
        // Build timeline from timeline data
        if (data.timeline && data.timeline.length > 0) {
          timelineHtml = '<div class="timeline">';
          data.timeline.forEach(item => {
            const isCompleted = item.completed;
            const itemClass = isCompleted ? 'timeline-item' : 'timeline-item pending';
            timelineHtml += `
              <div class="${itemClass}">
                <div class="timeline-marker">${isCompleted ? '✓' : '○'}</div>
                <div class="timeline-content">
                  <div class="timeline-text">${item.text}</div>
                  ${item.time ? `<div class="timeline-time">${item.time}</div>` : ''}
                </div>
              </div>
            `;
          });
          timelineHtml += '</div>';
        }
      }
    }

    const orderStatusMap = {
      'PENDING': 'Chờ xử lý',
      'PREPARING': 'Đang chuẩn bị',
      'SHIPPING': 'Đang giao',
      'DELIVERED': 'Đã giao',
      'COMPLETED': 'Hoàn thành'
    };

    const shipmentStatusMap = {
      'WAITING': 'Chờ lấy',
      'PICKED_UP': 'Đã lấy',
      'DELIVERING': 'Đang giao',
      'DELIVERED': 'Đã giao',
      'FAILED': 'Giao thất bại'
    };

    const statusClass = 'status-' + (order.status || 'pending').toLowerCase();
    const shipmentStatus = shipmentInfo ? shipmentInfo.status : order.status;
    const shipmentStatusClass = 'status-' + (shipmentStatus || 'pending').toLowerCase();

    return `
      <div class="shipment-card">
        <div class="shipment-header">
          <div>
            <div class="order-id">Mã đơn hàng: #${order.order_id}</div>
          </div>
          <div>
            <span class="status-badge ${statusClass}">${orderStatusMap[order.status] || order.status}</span>
          </div>
        </div>

        <div class="shipment-info">
          <div class="info-row">
            <span class="info-label">Khách hàng</span>
            <span class="info-value">${order.customer_name || '—'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tổng tiền</span>
            <span class="info-value">${order.total_amount ? Number(order.total_amount).toLocaleString() + ' VNĐ' : '—'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Địa chỉ giao</span>
            <span class="info-value">${order.shipping_address || '—'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Trạng thái vận chuyển</span>
            <span class="status-badge ${shipmentStatusClass}">${shipmentStatusMap[shipmentStatus] || shipmentStatus}</span>
          </div>
          ${shipmentInfo && shipmentInfo.tracking_code ? `
            <div class="info-row">
              <span class="info-label">Mã tracking</span>
              <span class="info-value">${shipmentInfo.tracking_code}</span>
            </div>
          ` : ''}
          ${shipmentInfo && shipmentInfo.estimated_delivery ? `
            <div class="info-row">
              <span class="info-label">Dự kiến giao</span>
              <span class="info-value">${new Date(shipmentInfo.estimated_delivery).toLocaleDateString('vi-VN')}</span>
            </div>
          ` : ''}
        </div>

        ${timelineHtml}

        <div class="action-buttons">
          <a href="track.html?orderId=${order.order_id}" class="btn-link">
            → Xem chi tiết theo dõi
          </a>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('buildShipmentCard error', err);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', loadVendorShipments);
