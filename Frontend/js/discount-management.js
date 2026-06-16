// Discount Management functionality

// Show tab
function showTab(tabName) {
  const tabs = ['list', 'create'];
  tabs.forEach(tab => {
    const element = document.getElementById(tab + 'Tab');
    if (element) {
      element.style.display = tab === tabName ? 'block' : 'none';
    }
  });

  // Update button styles
  const buttons = document.querySelectorAll('[onclick^="showTab"]');
  buttons.forEach(btn => {
    const btnText = btn.textContent.trim();
    if (btnText === 'Danh Sách' && tabName === 'list') {
      btn.className = 'btn btn-success';
    } else if (btnText === 'Tạo Mới' && tabName === 'create') {
      btn.className = 'btn btn-success';
    } else if (btnText === 'Danh Sách' || btnText === 'Tạo Mới') {
      btn.className = 'btn';
      btn.style.border = '1px solid #16A34A';
      btn.style.background = '#FFF';
      btn.style.color = '#16A34A';
    }
  });

  if (tabName === 'list') {
    loadPromotionsList();
  } else if (tabName === 'create') {
    loadProductsForSelection();
    resetForm();
  }
}

// Load products for selection
function loadProductsForSelection() {
  const container = document.getElementById('productsContainer');
  if (!container) return;

  const currentUser = dataManager.getCurrentUser();
  let products = dataManager.getAllProducts();
  
  // Filter products by vendor/business
  if (currentUser.role === 'vendor' || currentUser.role === 'business') {
    const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
    if (vendor) {
      products = products.filter(p => p.vendorId === vendor.id);
    } else {
      products = [];
    }
  }

  if (products.length === 0) {
    container.innerHTML = '<p style="color: #666; text-align: center; padding: 24px;">Bạn chưa có sản phẩm nào. Vui lòng thêm sản phẩm trước khi tạo khuyến mãi.</p>';
    return;
  }

  let html = '';
  products.forEach(product => {
    html += `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 12px;">
        <input type="checkbox" id="product_${product.id}" name="products[]" value="${product.id}" style="width: 18px; height: 18px; accent-color: #22C55E; cursor: pointer;">
        <img src="${product.images[0]}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
        <div style="flex: 1;">
          <div style="color: #000; font-size: 16px; font-weight: 500; margin-bottom: 4px;">${product.name}</div>
          <div style="color: #6B7280; font-size: 14px;">Giá: ${product.units[0].price.toLocaleString()} VNĐ</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Check for time overlap
function checkTimeOverlap(startDate, endDate, excludeId = null) {
  const promotions = dataManager.getAllPromotions();
  const currentUser = dataManager.getCurrentUser();
  const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
  
  if (!vendor) return false;

  const start = new Date(startDate);
  const end = new Date(endDate);

  return promotions.some(promo => {
    if (excludeId && promo.id === excludeId) return false;
    if (promo.vendorId !== vendor.id) return false;
    if (promo.status === 'rejected' || promo.status === 'cancelled') return false;

    const promoStart = new Date(promo.startDate);
    const promoEnd = new Date(promo.endDate);

    // Check if time ranges overlap
    return (start <= promoEnd && end >= promoStart);
  });
}

// Handle discount percent change
function handleDiscountChange() {
  const discountInput = document.getElementById('discountPercent');
  const warningDiv = document.getElementById('highDiscountWarning');
  const reasonDiv = document.getElementById('reasonForHighDiscount');
  const reasonInput = document.getElementById('highDiscountReason');

  if (!discountInput || !warningDiv || !reasonDiv) return;

  discountInput.addEventListener('input', function() {
    const discount = parseFloat(this.value);
    
    if (discount > 70) {
      warningDiv.style.display = 'block';
      reasonDiv.style.display = 'block';
      reasonInput.setAttribute('required', 'required');
    } else {
      warningDiv.style.display = 'none';
      reasonDiv.style.display = 'none';
      reasonInput.removeAttribute('required');
      reasonInput.value = '';
    }
  });
}

// Handle date change to check for overlaps
function handleDateChange() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const warningDiv = document.getElementById('timeOverlapWarning');

  if (!startDateInput || !endDateInput || !warningDiv) return;

  function checkOverlap() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (startDate && endDate) {
      if (new Date(startDate) >= new Date(endDate)) {
        warningDiv.style.display = 'none';
        return;
      }

      if (checkTimeOverlap(startDate, endDate)) {
        warningDiv.style.display = 'block';
      } else {
        warningDiv.style.display = 'none';
      }
    } else {
      warningDiv.style.display = 'none';
    }
  }

  startDateInput.addEventListener('change', checkOverlap);
  endDateInput.addEventListener('change', checkOverlap);
}

// Reset form
function resetForm() {
  const form = document.getElementById('createPromotionForm');
  if (form) {
    form.reset();
  }
  
  document.getElementById('highDiscountWarning').style.display = 'none';
  document.getElementById('reasonForHighDiscount').style.display = 'none';
  document.getElementById('timeOverlapWarning').style.display = 'none';
  document.getElementById('errorMessage').style.display = 'none';
  document.getElementById('successMessage').style.display = 'none';
  
  const reasonInput = document.getElementById('highDiscountReason');
  if (reasonInput) {
    reasonInput.removeAttribute('required');
  }
}

// Load promotions list
function loadPromotionsList() {
  const container = document.getElementById('promotionsList');
  const emptyState = document.getElementById('emptyPromotionsState');
  
  if (!container || !emptyState) return;

  const currentUser = dataManager.getCurrentUser();
  const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
  
  if (!vendor) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  const promotions = dataManager.getAllPromotions().filter(p => p.vendorId === vendor.id);

  if (promotions.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  let html = '';
  promotions.forEach(promo => {
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);
    const now = new Date();

    let statusBadge = '';
    let statusClass = '';
    
    if (promo.status === 'pending') {
      statusBadge = '<span class="badge badge-warning">Chờ Duyệt</span>';
      statusClass = 'badge-warning';
    } else if (promo.status === 'approved') {
      if (now < startDate) {
        statusBadge = '<span class="badge badge-info">Sắp Diễn Ra</span>';
      } else if (now >= startDate && now <= endDate) {
        statusBadge = '<span class="badge badge-success">Đang Diễn Ra</span>';
      } else {
        statusBadge = '<span class="badge" style="background: #E5E7EB; color: #6B7280;">Đã Kết Thúc</span>';
      }
    } else if (promo.status === 'rejected') {
      statusBadge = '<span class="badge badge-danger">Đã Từ Chối</span>';
    }

    const productNames = promo.productIds.map(id => {
      const product = dataManager.getProductById(id);
      return product ? product.name : 'Sản phẩm không tồn tại';
    }).join(', ');

    html += `
      <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 16px; background: #FFF;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
          <div style="flex: 1;">
            <h3 style="color: #000; font-size: 18px; font-weight: 600; margin-bottom: 8px;">${promo.name}</h3>
            <div style="color: #6B7280; font-size: 14px; margin-bottom: 4px;">
              <strong>Thời gian:</strong> ${startDate.toLocaleString('vi-VN')} - ${endDate.toLocaleString('vi-VN')}
            </div>
            <div style="color: #6B7280; font-size: 14px; margin-bottom: 4px;">
              <strong>Mức giảm:</strong> <span style="color: #EF4444; font-weight: 600;">${promo.discountPercent}%</span>
            </div>
            <div style="color: #6B7280; font-size: 14px; margin-bottom: 4px;">
              <strong>Sản phẩm:</strong> ${productNames}
            </div>
            ${promo.highDiscountReason ? `<div style="color: #92400E; font-size: 14px; margin-top: 8px; padding: 8px; background: #FEF3C7; border-radius: 4px;">
              <strong>Lý do giảm giá cao:</strong> ${promo.highDiscountReason}
            </div>` : ''}
            ${promo.rejectionReason ? `<div style="color: #991B1B; font-size: 14px; margin-top: 8px; padding: 8px; background: #FEE2E2; border-radius: 4px;">
              <strong>Lý do từ chối:</strong> ${promo.rejectionReason}
            </div>` : ''}
          </div>
          <div>
            ${statusBadge}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Create promotion form submission
const createPromotionForm = document.getElementById('createPromotionForm');
if (createPromotionForm) {
  createPromotionForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // Hide previous messages
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('timeOverlapWarning').style.display = 'none';

    const name = document.getElementById('promotionName').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const discountPercent = parseFloat(document.getElementById('discountPercent').value);
    const selectedProducts = Array.from(document.querySelectorAll('input[name="products[]"]:checked')).map(cb => parseInt(cb.value));
    const highDiscountReason = document.getElementById('highDiscountReason').value.trim();

    // Validation
    if (!name) {
      showError('Vui lòng nhập tên chương trình khuyến mãi');
      return;
    }

    if (!startDate || !endDate) {
      showError('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      showError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      showError('Mức giảm giá phải từ 0 đến 100%');
      return;
    }

    if (selectedProducts.length === 0) {
      showError('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    // Check for high discount
    if (discountPercent > 70 && !highDiscountReason) {
      showError('Vui lòng nhập lý do cho mức giảm giá trên 70%');
      return;
    }

    // Check for time overlap (Alternative flow A1)
    if (checkTimeOverlap(startDate, endDate)) {
      document.getElementById('timeOverlapWarning').style.display = 'block';
      if (!confirm('Thời gian khuyến mãi trùng với chương trình khác. Bạn có muốn tiếp tục?')) {
        return;
      }
    }

    // Get current user and vendor
    const currentUser = dataManager.getCurrentUser();
    const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
    
    if (!vendor) {
      showError('Không tìm thấy thông tin người bán');
      return;
    }

    // Create promotion data
    const promotionData = {
      name: name,
      startDate: startDate,
      endDate: endDate,
      discountPercent: discountPercent,
      productIds: selectedProducts,
      vendorId: vendor.id,
      status: discountPercent > 70 ? 'pending' : 'pending', // Both need approval, but >70% requires reason
      highDiscountReason: discountPercent > 70 ? highDiscountReason : null,
      createdAt: new Date().toISOString()
    };

    // Try to save (Exception flow E1)
    try {
      const saved = dataManager.addPromotion(promotionData);
      
      if (saved) {
        // Success - show message
        document.getElementById('successMessage').textContent = 'Đã gửi yêu cầu duyệt';
        document.getElementById('successMessage').style.display = 'block';
        
        // Reset form after 2 seconds
        setTimeout(() => {
          resetForm();
          showTab('list');
        }, 2000);
      } else {
        showError('Không thể tạo khuyến mãi');
      }
    } catch (error) {
      // Exception flow E1: Database error
      console.error('Error saving promotion:', error);
      showError('Không thể tạo khuyến mãi');
    }
  });
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  const currentUser = dataManager.getCurrentUser();
  
  if (!currentUser) {
    alert('Vui lòng đăng nhập để truy cập trang này');
    window.location.href = 'login.html';
    return;
  }
  
  // Allow vendors and business users
  if (currentUser.role !== 'vendor' && currentUser.role !== 'business') {
    alert('Bạn không có quyền truy cập trang này');
    window.location.href = 'index.html';
    return;
  }

  // Initialize event handlers
  handleDiscountChange();
  handleDateChange();
  
  // Show list tab by default
  showTab('list');
});


