document.addEventListener('DOMContentLoaded', function() {
  // Ensure user is enterprise
  const currentUser = (typeof dataManager !== 'undefined') ? dataManager.getCurrentUser() : null;
  if (!currentUser || currentUser.role !== 'enterprise') {
    document.querySelector('.container').innerHTML = '<div style="padding:48px; text-align:center; color:#666;">Vui lòng đăng nhập bằng tài khoản doanh nghiệp để xem Thống kê.</div>';
    return;
  }

  const enterpriseId = currentUser.user_id;
  loadStats(enterpriseId);
});

async function loadStats(enterpriseId) {
  try {
  const resp = await fetch('http://127.0.0.1:3001/api/orders/stats/seller?enterpriseId=' + encodeURIComponent(enterpriseId));
    if (!resp.ok) {
      document.querySelector('.container').innerHTML = '<div style="padding:48px; text-align:center; color:#EF4444;">Không thể tải thống kê</div>';
      return;
    }
    const body = await resp.json();
    renderStats(body);
  } catch (err) {
    console.error('loadStats error', err);
    document.querySelector('.container').innerHTML = '<div style="padding:48px; text-align:center; color:#EF4444;">Lỗi khi tải thống kê</div>';
  }
}

function renderStats(data) {
  const stats = data.stats || { orders_count: 0, total_revenue: 0 };
  const top = data.topProducts || [];

  const container = document.querySelector('.container');
  container.innerHTML = `
    <div style="display:flex; gap:16px; margin-bottom:24px; align-items:center; justify-content:space-between;">
      <div>
        <h1 style="font-size:24px; margin:0;">Thống kê doanh thu</h1>
        <p style="color:#666; margin:4px 0 0;">Số đơn: ${stats.orders_count || 0} • Doanh thu: ${(Number(stats.total_revenue)||0).toLocaleString()} VNĐ</p>
      </div>
    </div>

    <div style="display:flex; gap:16px;">
      <div style="flex:1; background:#fff; padding:16px; border-radius:8px; border:1px solid #E5E7EB;">
        <h3 style="margin-top:0;">Top sản phẩm</h3>
        <ol id="topProductsList">
          ${top.map(p => `<li>${p.product_name} — ${p.sold} bán</li>`).join('')}
        </ol>
      </div>

      <div style="width:320px; background:#fff; padding:16px; border-radius:8px; border:1px solid #E5E7EB;">
        <h3 style="margin-top:0;">Tổng quan</h3>
        <div style="margin-top:8px; color:#333;">Tổng đơn: ${stats.orders_count || 0}</div>
        <div style="margin-top:8px; color:#333;">Tổng doanh thu: ${(Number(stats.total_revenue)||0).toLocaleString()} VNĐ</div>
      </div>
    </div>
  `;
}
