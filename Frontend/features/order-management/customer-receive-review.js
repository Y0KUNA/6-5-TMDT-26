// UC7: Customer receive & review products
let currentOrderId = null;
let currentProductId = null;
let currentRating = 0;

// ============ Authorization Check ============
function checkCustomerAuth() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const role = user.role || '';
  const customerId = user.user_id;

  if (role !== 'customer' || !customerId) {
    document.getElementById('deliveredOrdersList').innerHTML = '<div style="color: #ef4444; padding: 16px; border: 1px solid #fee2e2; border-radius: 4px; background: #fef2f2;">⚠️ Bạn không có quyền truy cập trang này. Vui lòng đăng nhập bằng tài khoản khách hàng.</div>';
    document.getElementById('completedOrdersList').innerHTML = '';
    return false;
  }
  return true;
}

async function loadDeliveredOrders() {
  if (!checkCustomerAuth()) return;
  
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const customerId = user.user_id;

  if (!customerId) {
    document.getElementById('deliveredOrdersList').innerHTML = '<div>Vui lòng đăng nhập</div>';
    return;
  }

  try {
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(window.apiUrl('/api/orders?customerId=' + customerId + '&status=DELIVERED'), { headers });
    if (!resp.ok) throw new Error('Failed to load');

    const body = await resp.json();
    const orders = body.orders || [];

    if (orders.length === 0) {
      document.getElementById('deliveredOrdersList').innerHTML = '<div style="color: #999;">Chưa có đơn hàng nào đã giao</div>';
      return;
    }

    const html = orders.map(order => `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">Đơn hàng #${order.order_id}</div>
            <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
              <strong>Doanh nghiệp:</strong> ${order.business_name}
            </div>
            <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
              <strong>Tổng:</strong> ${Number(order.total_amount).toLocaleString()} VNĐ
            </div>
            <div style="color: #666; font-size: 14px;">
              <strong>Ngày giao:</strong> ${new Date(order.delivered_at || order.updated_at).toLocaleDateString('vi-VN')}
            </div>
            
            <!-- Order Items -->
            <div style="margin-top: 12px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Sản phẩm:</div>
              <ul style="margin: 0; padding-left: 16px;">
                ${(order.items || []).map(item => `
                  <li style="font-size: 14px; margin-bottom: 4px; color: #666;">
                    ${item.product_name} - ${item.quantity} ${item.unit}
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
          <div>
            <button onclick="openConfirmReceivedModal(${order.order_id})" style="padding: 10px 16px; background: #16A34A; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; font-weight: bold;">
              Xác nhận đã nhận
            </button>
          </div>
        </div>
      </div>
    `).join('');

    document.getElementById('deliveredOrdersList').innerHTML = html;
  } catch (err) {
    console.error('loadDeliveredOrders error', err);
    document.getElementById('deliveredOrdersList').innerHTML = '<div style="color: #e74c3c;">Lỗi khi tải: ' + err.message + '</div>';
  }
}

async function loadCompletedOrders() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const customerId = user.user_id;

  if (!customerId) {
    document.getElementById('completedOrdersList').innerHTML = '<div>Vui lòng đăng nhập</div>';
    return;
  }

  try {
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(window.apiUrl('/api/orders?customerId=' + customerId + '&status=COMPLETED'), { headers });
    if (!resp.ok) throw new Error('Failed to load');

    const body = await resp.json();
    const orders = body.orders || [];

    if (orders.length === 0) {
      document.getElementById('completedOrdersList').innerHTML = '<div style="color: #999;">Chưa có đơn hàng nào hoàn thành</div>';
      return;
    }

    const html = orders.map(order => `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">✓ Đơn hàng #${order.order_id}</div>
            <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
              <strong>Doanh nghiệp:</strong> ${order.business_name}
            </div>
            <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
              <strong>Tổng:</strong> ${Number(order.total_amount).toLocaleString()} VNĐ
            </div>
            
            <!-- Order Items with Review Buttons -->
            <div style="margin-top: 12px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Sản phẩm & Đánh giá:</div>
              <ul style="margin: 0; padding-left: 0;">
                ${(order.items || []).map(item => `
                  <li style="font-size: 14px; margin-bottom: 8px; color: #666; display: flex; justify-content: space-between; align-items: center;">
                    <span>${item.product_name} - ${item.quantity} ${item.unit}</span>
                    <button onclick="openReviewModal(${item.product_id}, '${item.product_name.replace(/'/g, "\\'")}')" style="padding: 6px 12px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;">
                      ⭐ Đánh giá
                    </button>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    document.getElementById('completedOrdersList').innerHTML = html;
  } catch (err) {
    console.error('loadCompletedOrders error', err);
    document.getElementById('completedOrdersList').innerHTML = '<div style="color: #e74c3c;">Lỗi khi tải: ' + err.message + '</div>';
  }
}

function openConfirmReceivedModal(orderId) {
  currentOrderId = orderId;
  document.getElementById('confirmReceivedModal').style.display = 'flex';
}

function closeConfirmReceivedModal() {
  currentOrderId = null;
  document.getElementById('confirmReceivedModal').style.display = 'none';
}

async function submitConfirmReceived() {
  if (!currentOrderId) return;

  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
    const resp = await fetch(window.apiUrl('/api/orders/' + currentOrderId + '/received'), {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert('Lỗi: ' + (err.error || 'Không thể xác nhận'));
      return;
    }

    alert('Xác nhận nhận hàng thành công!');
    closeConfirmReceivedModal();
    loadDeliveredOrders();
    loadCompletedOrders();
  } catch (err) {
    console.error('submitConfirmReceived error', err);
    alert('Lỗi: ' + err.message);
  }
}

function openReviewModal(productId, productName) {
  currentProductId = productId;
  currentRating = 0;
  
  document.getElementById('reviewContent').innerHTML = `
    <div>
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">Sản phẩm: ${productName}</div>
    </div>
  `;
  
  document.getElementById('reviewComment').value = '';
  updateRatingDisplay();
  document.getElementById('reviewModal').style.display = 'flex';
}

function closeReviewModal() {
  currentProductId = null;
  currentRating = 0;
  document.getElementById('reviewModal').style.display = 'none';
}

function setRating(rating) {
  currentRating = rating;
  updateRatingDisplay();
}

function updateRatingDisplay() {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    const rating = parseInt(star.getAttribute('data-rating'));
    if (rating <= currentRating) {
      star.style.color = '#f59e0b';
    } else {
      star.style.color = '#ddd';
    }
  });

  const ratingTexts = ['', 'Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];
  document.getElementById('ratingText').textContent = currentRating > 0 ? `${currentRating} sao - ${ratingTexts[currentRating]}` : '';
}

function updateCharCount() {
  const comment = document.getElementById('reviewComment').value;
  document.getElementById('reviewCharCount').textContent = `${comment.length} / 500 ký tự`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadDeliveredOrders();
  loadCompletedOrders();

  document.getElementById('reviewComment').addEventListener('input', updateCharCount);
});

async function submitReview() {
  if (!currentProductId || currentRating === 0) {
    alert('Vui lòng chọn số sao đánh giá');
    return;
  }

  const comment = document.getElementById('reviewComment').value.trim();

  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
    const resp = await fetch(window.apiUrl('/api/reviews/' + currentProductId), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rating: currentRating,
        comment: comment || null
      })
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert('Lỗi: ' + (err.error || 'Không thể gửi đánh giá'));
      return;
    }

    alert('Cảm ơn bạn! Đánh giá của bạn đã được gửi.');
    closeReviewModal();
    loadCompletedOrders();
  } catch (err) {
    console.error('submitReview error', err);
    alert('Lỗi: ' + err.message);
  }
}
