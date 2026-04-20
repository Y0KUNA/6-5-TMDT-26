// Business Orders Management JavaScript (moved to features/business-orders)

let currentUser = null;
let currentStatus = 'pending';
let currentReturn = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  currentUser = dataManager.getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'business') {
    alert('Vui lòng đăng nhập với tài khoản doanh nghiệp');
    window.location.href = '../login/login.html';
    return;
  }

  // Update login link with dropdown
  const loginLink = document.getElementById('loginLink');
  if (loginLink && currentUser) {
    loginLink.innerHTML = `
      <span style="position: relative;">
        ${currentUser.fullName}
        <span style="margin-left: 8px; color: #666;">▼</span>
      </span>
    `;
    loginLink.href = '#';
    loginLink.style.position = 'relative';
    loginLink.style.cursor = 'pointer';
    
    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.style.cssText = 'display: none; position: absolute; top: 100%; right: 0; background: white; border: 1px solid #E5E7EB; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 150px; z-index: 10000; margin-top: 4px;';
    
    const ordersLink = document.createElement('a');
    ordersLink.href = '../business-orders/business-orders.html';
    ordersLink.textContent = 'Quản lý đơn hàng';
    ordersLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
    
    const productsLink = document.createElement('a');
    productsLink.href = '../product-management/product-management.html';
    productsLink.textContent = 'Quản lý sản phẩm';
    productsLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
    
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Đăng xuất';
    logoutLink.style.cssText = 'display: block; padding: 12px 16px; color: #EF4444; text-decoration: none;';
    logoutLink.onclick = function(e) {
      e.preventDefault();
      handleLogout();
    };
    
    dropdown.appendChild(ordersLink);
    dropdown.appendChild(productsLink);
    dropdown.appendChild(logoutLink);
    loginLink.appendChild(dropdown);
    
    // Toggle dropdown
    loginLink.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    };
    
    // Allow links inside dropdown to work
    dropdown.onclick = function(e) {
      e.stopPropagation();
      // Close dropdown when clicking on a link
      if (e.target.tagName === 'A') {
        dropdown.style.display = 'none';
      }
    };
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!loginLink.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Initialize tabs
  initializeTabs();
  
  // Load orders
  loadOrders();
  
  // Update counts
  updateCounts();
});

// ...existing code...

// The rest of the file is identical to the original implementation but uses the feature paths for redirects
