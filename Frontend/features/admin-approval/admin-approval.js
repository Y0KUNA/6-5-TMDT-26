// Admin approval logic (moved to features/admin-approval)

let currentVendorId = null;
let currentPromotionId = null;
const PRODUCTS_API_BASE = 'http://localhost:3001/api/products';
let lastVendorsRaw = null;

// Determine vendors API base in a defensive way:
// Priority: explicit global VENDORS_API_URL_BASE -> APP_CONFIG.API_BASE_URL -> empty string (use relative paths)
const VENDORS_API_BASE = (window.VENDORS_API_URL_BASE || (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '').replace(/\/$/, '');
// Sample vendor data for demo

// Load vendors from localStorage or use sample data
async function loadVendors() {
  // Try to fetch pending vendors from server API
  try {
    // use explicit VENDORS_API_BASE if provided, else fall back to relative path
    const listUrl = VENDORS_API_BASE ? (VENDORS_API_BASE + '/api/vendors/pending') : 'http://localhost:3001/api/vendors/pending';
    const resp = await fetch(listUrl);
    if (resp.ok) {
      const body = await resp.json();
      lastVendorsRaw = body;
      console.debug && console.debug('loadVendors response body:', body);
      // Accept several possible shapes from backend:
      // 1) Array at top-level: [ { ... }, ... ]
      // 2) { vendors: [ ... ] }
      // 3) { data: { vendors: [ ... ] } }
      let vendorsArr = null;
      if (Array.isArray(body)) vendorsArr = body;
      else if (Array.isArray(body.vendors)) vendorsArr = body.vendors;
      else if (body.data && Array.isArray(body.data.vendors)) vendorsArr = body.data.vendors;

      if (Array.isArray(vendorsArr)) {
        const mapped = vendorsArr.map(v => ({
          id: v.enterprise_id || v.enterpriseid || v.id || v.user_id,
          profileId: v.profile_id || v.profileId,
          fullName: v.full_name || v.fullName || v.name || v.business_name || v.businessName,
          businessName: v.business_name || v.businessName || v.full_name || v.name,
          businessAddress: v.address || v.business_address || v.businessAddress,
          businessPhone: v.phone || v.business_phone || v.businessPhone,
          status: (v.status || v.profile_status || v.profileStatus || '').toString(),
          licenseImage: v.license_file || v.licenseFile
        })).filter(x => (x.status || '').toLowerCase() === 'pending');
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch vendors from API, falling back to localStorage/sample', err);
  }

  // Fallback to localStorage/sample data
  let vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
  if (vendors.length === 0) {
    vendors = sampleVendors;
    localStorage.setItem('vendors', JSON.stringify(vendors));
  }
  return vendors.filter(v => v.status === 'pending');
}

// Render vendors
async function renderVendors() {
  const vendors = await loadVendors();
  const vendorList = document.getElementById('vendorList');
  const emptyState = document.getElementById('emptyState');
  
  if (vendors.length === 0) {
    // If API returned something but mapping/filtering produced no vendors,
    // show a debug view so developer can see raw response.
    vendorList.innerHTML = '';
    emptyState.style.display = 'block';
    if (lastVendorsRaw) {
      const pre = document.createElement('pre');
      pre.style.textAlign = 'left';
      pre.style.background = '#f8fafc';
      pre.style.padding = '12px';
      pre.style.borderRadius = '6px';
      pre.textContent = JSON.stringify(lastVendorsRaw, null, 2);
      vendorList.appendChild(document.createElement('div'));
      vendorList.appendChild(pre);
    }
    return;
  }
  
  emptyState.style.display = 'none';
  vendorList.innerHTML = vendors.map(vendor => `
    <div class="vendor-card" style="margin-bottom: 24px;">
      <div style="display: grid; grid-template-columns: 1fr 523px; gap: 24px;">
        <div>
          <h3 class="vendor-name">${vendor.businessName}</h3>
          <div class="vendor-info">
            <div>
              <span class="info-label">Địa chỉ:</span>
              <span class="info-value" style="margin-left: 8px;">${vendor.businessAddress}</span>
            </div>
            <div>
              <span class="info-label">Điện thoại:</span>
              <span class="info-value" style="margin-left: 8px;">${vendor.businessPhone}</span>
            </div>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 16px;">
            <button onclick="approveVendor(${vendor.id})" class="btn btn-success" style="padding: 12px 24px;">
              ✅ Phê Duyệt
            </button>
            <button onclick="openRejectModal(${vendor.id}, '${vendor.businessName}')" class="btn btn-danger" style="padding: 12px 24px;">
              ❌ Từ Chối
            </button>
          </div>
        </div>
        <div>
          <div class="info-label" style="margin-bottom: 12px;">Giấy phép kinh doanh:</div>
          <img src="http://localhost:3001${vendor.licenseImage}" class="license-image" alt="Giấy phép kinh doanh">
        </div>
      </div>
    </div>
  `).join('');
}

// Approve vendor
async function approveVendor(vendorId) {
  if (!confirm('Bạn có chắc chắn muốn phê duyệt đơn đăng ký này?')) return;
  try {
  const approveUrl = VENDORS_API_BASE ? (VENDORS_API_BASE + `/api/vendors/${vendorId}/approve`) : `http://localhost:3001/api/vendors/${vendorId}/approve`;
  const resp = await fetch(approveUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (resp.ok) {
      alert('Đã phê duyệt đơn đăng ký');
      await renderVendors();
      return;
    }
    const err = await resp.json().catch(() => ({}));
    alert('Không thể phê duyệt: ' + (err.error || resp.statusText));
  } catch (e) {
    console.error('approve error', e);
    alert('Lỗi khi phê duyệt, thử lại sau');
  }
}

// Open reject modal
function openRejectModal(vendorId, businessName) {
  currentVendorId = vendorId;
  document.getElementById('rejectVendorName').textContent = businessName;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectModal').classList.add('active');
}

// Close reject modal
function closeRejectModal() {
  currentVendorId = null;
  document.getElementById('rejectModal').classList.remove('active');
}

// Confirm reject
function confirmReject() {
  const reason = document.getElementById('rejectReason').value.trim();
  
  if (!reason) {
    alert('Vui lòng nhập lý do từ chối!');
    return;
  }
  // call API to reject
  (async () => {
    try {
  const rejectUrl = VENDORS_API_BASE ? (VENDORS_API_BASE + `/api/vendors/${currentVendorId}/reject`) : `/api/vendors/${currentVendorId}/reject`;
  const resp = await fetch(rejectUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      if (resp.ok) {
        alert('Đã từ chối đơn đăng ký');
        closeRejectModal();
        await renderVendors();
        return;
      }
      const err = await resp.json().catch(() => ({}));
      alert('Không thể từ chối: ' + (err.error || resp.statusText));
    } catch (e) {
      console.error('reject error', e);
      alert('Lỗi khi từ chối, thử lại sau');
    }
  })();
}

// Close modal when clicking outside
document.getElementById('rejectModal')?.addEventListener('click', function(e) {
  if (e.target === this) {
    closeRejectModal();
  }
});

// Show approval tab
function showApprovalTab(tabName) {
  const vendorsTab = document.getElementById('vendorsTab');
  const productsTab = document.getElementById('productsTab');
  const discountsTab = document.getElementById('discountsTab');
  const vendorsTabBtn = document.getElementById('vendorsTabBtn');
  const productsTabBtn = document.getElementById('productsTabBtn');
  const discountsTabBtn = document.getElementById('discountsTabBtn');

  if (tabName === 'vendors') {
    vendorsTab.style.display = 'block';
    productsTab.style.display = 'none';
    discountsTab.style.display = 'none';
    vendorsTabBtn.style.borderBottom = '3px solid #22C55E';
    vendorsTabBtn.style.color = '#22C55E';
    vendorsTabBtn.style.fontWeight = '600';
    productsTabBtn.style.borderBottom = '3px solid transparent';
    productsTabBtn.style.color = '#666';
    productsTabBtn.style.fontWeight = '400';
    discountsTabBtn.style.borderBottom = '3px solid transparent';
    discountsTabBtn.style.color = '#666';
    discountsTabBtn.style.fontWeight = '400';
    renderVendors();
  } else if (tabName === 'products') {
    vendorsTab.style.display = 'none';
    productsTab.style.display = 'block';
    discountsTab.style.display = 'none';
    vendorsTabBtn.style.borderBottom = '3px solid transparent';
    vendorsTabBtn.style.color = '#666';
    vendorsTabBtn.style.fontWeight = '400';
    productsTabBtn.style.borderBottom = '3px solid #22C55E';
    productsTabBtn.style.color = '#22C55E';
    productsTabBtn.style.fontWeight = '600';
    discountsTabBtn.style.borderBottom = '3px solid transparent';
    discountsTabBtn.style.color = '#666';
    discountsTabBtn.style.fontWeight = '400';
    renderPendingProducts();
  } else if (tabName === 'discounts') {
    vendorsTab.style.display = 'none';
    productsTab.style.display = 'none';
    discountsTab.style.display = 'block';
    vendorsTabBtn.style.borderBottom = '3px solid transparent';
    vendorsTabBtn.style.color = '#666';
    vendorsTabBtn.style.fontWeight = '400';
    productsTabBtn.style.borderBottom = '3px solid transparent';
    productsTabBtn.style.color = '#666';
    productsTabBtn.style.fontWeight = '400';
    discountsTabBtn.style.borderBottom = '3px solid #22C55E';
    discountsTabBtn.style.color = '#22C55E';
    discountsTabBtn.style.fontWeight = '600';
    renderPromotions();
  }
}

async function loadPendingProducts() {
  const resp = await fetch(PRODUCTS_API_BASE + '/pending');
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || 'Không tải được danh sách sản phẩm chờ duyệt');
  }
  const body = await resp.json();
  return Array.isArray(body.products) ? body.products : [];
}

async function renderPendingProducts() {
  const container = document.getElementById('productApprovalList');
  const emptyState = document.getElementById('emptyProductState');
  if (!container || !emptyState) return;

  try {
    const products = await loadPendingProducts();
    if (!products.length) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = products.map((p) => `
      <div class="vendor-card" style="margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 16px;">
          <img src="${p.primary_image || 'https://via.placeholder.com/120x120?text=No+Image'}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;" alt="product image">
          <div>
            <h3 class="vendor-name" style="margin-bottom: 8px;">${p.name || ''}</h3>
            <div class="vendor-info">
              <div><span class="info-label">Người bán:</span><span class="info-value" style="margin-left: 8px;">${p.business_name || ('Enterprise #' + p.enterprise_id)}</span></div>
              <div><span class="info-label">Giá:</span><span class="info-value" style="margin-left: 8px;">${Number(p.price || 0).toLocaleString('vi-VN')} VND / ${p.unit || 'san-pham'}</span></div>
              <div><span class="info-label">Mô tả:</span><span class="info-value" style="margin-left: 8px;">${p.description || ''}</span></div>
              ${p.certification ? `<div><span class="info-label">Chứng nhận:</span><a class="info-value" href="http://localhost:3001${p.certification}" target="_blank" style="margin-left:8px; color:#16A34A;">Xem file</a></div>` : ''}
            </div>
            <div style="display: flex; gap: 12px; margin-top: 16px;">
              <button onclick="approveProduct(${p.product_id})" class="btn btn-success" style="padding: 12px 24px;">✅ Phê Duyệt</button>
              <button onclick="rejectProduct(${p.product_id}, '${(p.name || '').replace(/'/g, "\\'")}')" class="btn btn-danger" style="padding: 12px 24px;">❌ Từ Chối</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="alert alert-error">Không thể tải sản phẩm chờ duyệt: ${error.message}</div>`;
    emptyState.style.display = 'none';
  }
}

async function approveProduct(productId) {
  if (!confirm('Bạn có chắc chắn muốn phê duyệt sản phẩm này?')) return;
  try {
    const resp = await fetch(PRODUCTS_API_BASE + '/' + productId + '/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!resp.ok) throw new Error('Không thể phê duyệt sản phẩm');
    alert('Đã phê duyệt sản phẩm');
    await renderPendingProducts();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Lỗi khi phê duyệt sản phẩm');
  }
}

async function rejectProduct(productId, productName) {
  const reason = prompt('Nhập lý do từ chối sản phẩm "' + productName + '"');
  if (!reason || !reason.trim()) return;

  try {
    const resp = await fetch(PRODUCTS_API_BASE + '/' + productId + '/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() })
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.error || 'Không thể từ chối sản phẩm');
    }
    alert('Đã từ chối sản phẩm');
    await renderPendingProducts();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Lỗi khi từ chối sản phẩm');
  }
}

// Load pending promotions
function loadPendingPromotions() {
  const promotions = dataManager.getAllPromotions();
  return promotions.filter(p => p.status === 'pending');
}

// Render promotions
function renderPromotions() {
  const promotions = loadPendingPromotions();
  const promotionList = document.getElementById('promotionList');
  const emptyState = document.getElementById('emptyPromotionState');
  
  if (!promotionList || !emptyState) return;
  
  if (promotions.length === 0) {
    promotionList.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  let html = '';
  promotions.forEach(promo => {
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);
    const vendor = dataManager.getAllVendors().find(v => v.id === promo.vendorId);
    const vendorName = vendor ? vendor.businessName : 'Không xác định';
    
    const productNames = promo.productIds.map(id => {
      const product = dataManager.getProductById(id);
      return product ? product.name : 'Sản phẩm không tồn tại';
    }).join(', ');

    html += `
      <div class="vendor-card" style="margin-bottom: 24px;">
        <div>
          <h3 class="vendor-name">${promo.name}</h3>
          <div class="vendor-info">
            <div>
              <span class="info-label">Người bán:</span>
              <span class="info-value" style="margin-left: 8px;">${vendorName}</span>
            </div>
            <div>
              <span class="info-label">Thời gian:</span>
              <span class="info-value" style="margin-left: 8px;">
                ${startDate.toLocaleString('vi-VN')} - ${endDate.toLocaleString('vi-VN')}
              </span>
            </div>
            <div>
              <span class="info-label">Mức giảm giá:</span>
              <span class="info-value" style="margin-left: 8px; color: #EF4444; font-weight: 600;">
                ${promo.discountPercent}%
              </span>
            </div>
            <div>
              <span class="info-label">Sản phẩm áp dụng:</span>
              <span class="info-value" style="margin-left: 8px;">${productNames}</span>
            </div>
            ${promo.highDiscountReason ? `
            <div style="margin-top: 12px; padding: 12px; background: #FEF3C7; border-radius: 4px; border: 1px solid #FDE68A;">
              <span class="info-label" style="color: #92400E; font-weight: 600;">Lý do giảm giá cao:</span>
              <div class="info-value" style="color: #92400E; margin-top: 4px;">${promo.highDiscountReason}</div>
            </div>
            ` : ''}
          </div>
          <div style="display: flex; gap: 12px; margin-top: 16px;">
            <button onclick="approvePromotion(${promo.id})" class="btn btn-success" style="padding: 12px 24px;">
              ✅ Phê Duyệt
            </button>
            <button onclick="openRejectPromotionModal(${promo.id}, '${promo.name.replace(/'/g, "\\'")}')" class="btn btn-danger" style="padding: 12px 24px;">
              ❌ Từ Chối
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  promotionList.innerHTML = html;
}

// Approve promotion
function approvePromotion(promotionId) {
  if (confirm('Bạn có chắc chắn muốn phê duyệt chương trình khuyến mãi này?')) {
    const result = dataManager.approvePromotion(promotionId);
    
    if (result) {
      alert('Đã phê duyệt chương trình khuyến mãi');
      renderPromotions();
    } else {
      alert('Không thể phê duyệt chương trình khuyến mãi');
    }
  }
}

// Open reject promotion modal
function openRejectPromotionModal(promotionId, promotionName) {
  currentPromotionId = promotionId;
  document.getElementById('rejectPromotionName').textContent = promotionName;
  document.getElementById('rejectPromotionReason').value = '';
  document.getElementById('rejectPromotionModal').classList.add('active');
}

// Close reject promotion modal
function closeRejectPromotionModal() {
  currentPromotionId = null;
  document.getElementById('rejectPromotionModal').classList.remove('active');
}

// Confirm reject promotion
function confirmRejectPromotion() {
  const reason = document.getElementById('rejectPromotionReason').value.trim();
  
  if (!reason) {
    alert('Vui lòng nhập lý do từ chối!');
    return;
  }
  
  const result = dataManager.rejectPromotion(currentPromotionId, reason);
  
  if (result) {
    alert('Đã từ chối chương trình khuyến mãi');
    closeRejectPromotionModal();
    renderPromotions();
  } else {
    alert('Không thể từ chối chương trình khuyến mãi');
  }
}

// Close promotion modal when clicking outside
document.getElementById('rejectPromotionModal')?.addEventListener('click', function(e) {
  if (e.target === this) {
    closeRejectPromotionModal();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  const currentUser = dataManager.getCurrentUser();
  
  if (!currentUser) {
    alert('Vui lòng đăng nhập để truy cập trang này');
    window.location.href = '../login/login.html';
    return;
  }
  
  // Only allow admin users
  if (currentUser.role !== 'admin') {
    alert('Bạn không có quyền truy cập trang này');
    window.location.href = '../home/index.html';
    return;
  }
  
  renderVendors();
});
