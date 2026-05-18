document.addEventListener('DOMContentLoaded', function() {
  const user = (typeof dataManager !== 'undefined') ? dataManager.getCurrentUser() : null;
  if (!user || user.role !== 'enterprise') {
    document.querySelector('.container').innerHTML = '<div style="padding:48px; text-align:center; color:#666;">Vui lòng đăng nhập bằng tài khoản doanh nghiệp để xem Dashboard.</div>';
    return;
  }

  const enterpriseId = user.user_id;
  loadDashboard(enterpriseId);
});

async function loadDashboard(enterpriseId) {
  try {
    // 1) stats
  const statsResp = await fetch('http://localhost:3001/api/orders/stats/seller?enterpriseId=' + encodeURIComponent(enterpriseId));
    const statsBody = await statsResp.json();
    const stats = statsBody.stats || { orders_count:0, total_revenue:0 };
    const top = statsBody.topProducts || [];

    document.getElementById('revenue-value').textContent = formatVND(Number(stats.total_revenue) || 0);
    document.getElementById('new-orders-count').textContent = stats.orders_count || 0;
    document.getElementById('products-count').textContent = '(chưa có dữ liệu)';
    document.getElementById('avg-rating').textContent = '4.8';
    document.getElementById('rating-count').textContent = '—';

    // top products
    const topEl = document.getElementById('top-products');
    topEl.innerHTML = '';
    top.forEach((p, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center"><div><strong>#${idx+1}</strong> ${escapeHtml(p.product_name)}</div><div style="text-align:right"><div style="color:#16A34A; font-weight:700">${p.sold} bán</div><div style="color:#EF4444">${formatVND(Number(p.sold) * 1000)}</div></div></div>`;
      topEl.appendChild(li);
    });

    // 2) recent orders
  const ordersResp = await fetch('http://127.0.0.1:3001/api/orders?enterpriseId=' + encodeURIComponent(enterpriseId));
    const ordersBody = await ordersResp.json();
    const recentEl = document.getElementById('recent-orders');
    recentEl.innerHTML = '';
    (ordersBody.orders || []).slice(0,5).forEach(o => {
      const d = document.createElement('div');
      d.style.padding = '8px 0';
      d.style.borderBottom = '1px dashed #F1F5F9';
      d.innerHTML = `<div style="display:flex; justify-content:space-between"><div><strong>DH${o.order_id}</strong><div style="color:#666; font-size:13px">${o.shipping_address || ''}</div></div><div style="color:#EF4444; font-weight:700">${formatVND(Number(o.total_amount)||0)}</div></div>`;
      recentEl.appendChild(d);
    });

    // 3) revenue by product (simple list)
    const revByEl = document.getElementById('revenue-by-product');
    revByEl.innerHTML = '(dữ liệu không khả dụng)';

    // 4) top-products-detail
    const detailEl = document.getElementById('top-products-detail');
    detailEl.innerHTML = '<table style="width:100%; border-collapse:collapse;"><thead><tr><th style="text-align:left; padding:8px">STT</th><th style="text-align:left; padding:8px">Sản phẩm</th><th style="text-align:right; padding:8px">Đã bán</th><th style="text-align:right; padding:8px">Doanh thu</th></tr></thead><tbody>' + (top.map((p, i) => `<tr><td style="padding:8px">${i+1}</td><td style="padding:8px">${escapeHtml(p.product_name)}</td><td style="padding:8px; text-align:right">${p.sold}</td><td style="padding:8px; text-align:right">${formatVND((Number(p.sold)||0) * 1000)}</td></tr>`).join('')) + '</tbody></table>';

  } catch (err) {
    console.error('loadDashboard error', err);
    document.querySelector('.container').innerHTML = '<div style="padding:48px; text-align:center; color:#EF4444;">Lỗi khi tải dashboard</div>';
  }
}

function formatVND(n) {
  return '₫' + n.toLocaleString();
}

function escapeHtml(s) { return String(s).replace(/[&<>\"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; }); }
