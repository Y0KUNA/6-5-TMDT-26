

let currentVendorId = null;
let currentPromotionId = null;
// Load vendors from localStorage or use sample data
async function loadVendors() {
  // Try to fetch pending vendors from server API
  try {
    const apiUrl = window.VENDORS_API_URL || 'http://localhost:3000/api/vendors/pending';
    const resp = await fetch(apiUrl);
    if (resp.ok) {
      const body = await resp.json();
      if (Array.isArray(body.vendors)) {
        // map the backend vendor shape to the frontend expected shape
        const base = window.VENDORS_API_URL_BASE || 'http://localhost:3000';
        return body.vendors.map(v => ({
          id: v.user_id || v.id,
          profileId: v.profile_id || null,
          fullName: v.full_name || v.fullName || '',
          businessName: v.business_name || v.businessName || '',
          businessAddress: v.business_address || v.address || '',
          businessPhone: v.phone || v.business_phone || '',
          status: v.profile_status || v.status || '',
          // ensure license file is an absolute URL when backend returns a relative path
          licenseImage: (v.license_file && v.license_file.startsWith('/')) ? (base + v.license_file) : (v.license_file || '')
        })).filter(x => x.status === 'PENDING' || x.status === 'pending');
      }
    }
  } catch (err) {
    console.warn('Failed to fetch vendors from API, falling back to localStorage/sample', err);
  }
}

// Render vendors
async function renderVendors() {
  const vendors = await loadVendors();
  const vendorList = document.getElementById('vendorList');
  const emptyState = document.getElementById('emptyState');
  
  if (vendors.length === 0) {
    vendorList.innerHTML = '';
    emptyState.style.display = 'block';
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
              Phê Duyệt
            </button>
            <button onclick="openRejectModal(${vendor.id}, '${vendor.businessName}')" class="btn btn-danger" style="padding: 12px 24px;">
              Từ Chối
            </button>
          </div>
        </div>
        <div>
          <div class="info-label" style="margin-bottom: 12px;">Giấy phép kinh doanh:</div>
          <img src="${vendor.licenseImage}" class="license-image" alt="Giấy phép kinh doanh">
        </div>
      </div>
    </div>
  `).join('');
}

// Approve vendor
async function approveVendor(vendorId) {
  if (!confirm('Bạn có chắc chắn muốn phê duyệt đơn đăng ký này?')) return;
  try {
    const base = window.VENDORS_API_URL_BASE || 'http://localhost:3000';
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    // Send PATCH to update vendor profile_status to APPROVED
    const resp = await fetch(base + `/api/vendors/${vendorId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ profile_status: 'APPROVED' })
    });

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
  // reason is now optional
  const reason = document.getElementById('rejectReason').value.trim() || null;

  // client-side placeholder hook to perform additional actions when rejecting (e.g., send notification)
  function onVendorRejected(vendorId, reason) {
    // TODO: implement real notification/email logic here
    console.log('onVendorRejected placeholder called for', vendorId, 'reason:', reason);
  }

  (async () => {
    try {
      const base = window.VENDORS_API_URL_BASE || 'http://localhost:3000';
      const token = localStorage.getItem('authToken');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      // Use PATCH endpoint to update profile_status to REJECTED
      const resp = await fetch(base + `/api/vendors/${currentVendorId}`, { method: 'PATCH', headers, body: JSON.stringify({ profile_status: 'REJECTED', reason }) });
      if (resp.ok) {
        alert('Đã từ chối đơn đăng ký');
        // call client-side placeholder
        try { onVendorRejected(currentVendorId, reason); } catch (e) { console.warn('onVendorRejected failed', e); }
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
  const discountsTab = document.getElementById('discountsTab');
  const vendorsTabBtn = document.getElementById('vendorsTabBtn');
  const discountsTabBtn = document.getElementById('discountsTabBtn');

  if (tabName === 'vendors') {
    vendorsTab.style.display = 'block';
    discountsTab.style.display = 'none';
    vendorsTabBtn.style.borderBottom = '3px solid #22C55E';
    vendorsTabBtn.style.color = '#22C55E';
    vendorsTabBtn.style.fontWeight = '600';
    discountsTabBtn.style.borderBottom = '3px solid transparent';
    discountsTabBtn.style.color = '#666';
    discountsTabBtn.style.fontWeight = '400';
    renderVendors();
  } else if (tabName === 'discounts') {
    vendorsTab.style.display = 'none';
    discountsTab.style.display = 'block';
    vendorsTabBtn.style.borderBottom = '3px solid transparent';
    vendorsTabBtn.style.color = '#666';
    vendorsTabBtn.style.fontWeight = '400';
    discountsTabBtn.style.borderBottom = '3px solid #22C55E';
    discountsTabBtn.style.color = '#22C55E';
    discountsTabBtn.style.fontWeight = '600';
    renderPromotions();
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
