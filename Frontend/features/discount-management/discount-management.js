// Discount Management functionality (moved to features/discount-management)

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

// ...existing code (same logic as original) ...

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  const currentUser = dataManager.getCurrentUser();
  
  if (!currentUser) {
    alert('Vui lòng đăng nhập để truy cập trang này');
    window.location.href = '../login/login.html';
    return;
  }
  
  // Allow vendors and business users
  if (currentUser.role !== 'vendor' && currentUser.role !== 'business') {
    alert('Bạn không có quyền truy cập trang này');
    window.location.href = '../home/index.html';
    return;
  }

  // Initialize event handlers
  handleDiscountChange();
  handleDateChange();
  
  // Show list tab by default
  showTab('list');
});
