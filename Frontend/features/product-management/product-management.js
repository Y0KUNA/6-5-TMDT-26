// Product Management logic (moved to features/product-management)

// Show tab
function showTab(tabName) {
  const tabs = ['list', 'add', 'stats'];
  tabs.forEach(tab => {
    const element = document.getElementById(tab + 'Tab');
    if (element) {
      element.style.display = tab === tabName ? 'block' : 'none';
    }
  });

  // Update button styles
  const buttons = document.querySelectorAll('[onclick^="showTab"]');
  buttons.forEach((btn, index) => {
    const btnTab = tabs[index];
    if (btnTab === tabName) {
      btn.className = 'btn btn-success';
    } else {
      btn.className = 'btn';
      btn.style.border = '1px solid #16A34A';
      btn.style.background = '#FFF';
      btn.style.color = '#16A34A';
    }
  });

  if (tabName === 'list') {
    loadProductsList();
  } else if (tabName === 'stats') {
    loadStatistics();
  }
}

// The rest of the implementation is copied from original js/product-management.js but redirects updated

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
  
  // Show default tab
  showTab('stats');
});
