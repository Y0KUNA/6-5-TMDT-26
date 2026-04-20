// Homepage functionality

// Flash sale countdown
function startFlashSaleTimer() {
  const timerElement = document.getElementById('flashTimer');
  if (!timerElement) return;

  let timeLeft = 2 * 3600 - 1; // 1:59:59

  setInterval(() => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    timerElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    timeLeft--;
    if (timeLeft < 0) {
      timeLeft = 2 * 3600 - 1;
    }
  }, 1000);
}

// Render product card
function renderProductCard(product) {
  const hasDiscount = product.flashSale && product.discount > 0;
  const displayPrice = hasDiscount
    ? Math.floor(product.units[0].price * (1 - product.discount / 100))
    : product.units[0].price;

  let html = '<div class="product-card" onclick="viewProduct(' + product.id + ')">';
  
  // Image
  html += '<div class="product-card-image-wrapper">';
  html += '<img src="' + product.images[0] + '" alt="' + product.name + '" class="product-image">';
  
  if (hasDiscount) {
    html += '<div class="discount-badge">-' + product.discount + '%</div>';
  }
  
  html += '</div>';
  
  // Content
  html += '<div class="product-card-content">';
  
  // Price
  html += '<div class="product-price' + (hasDiscount ? ' discount' : '') + '">₫' + displayPrice.toLocaleString() + '</div>';
  
  if (hasDiscount) {
    html += '<div class="product-old-price">₫' + product.units[0].price.toLocaleString() + '</div>';
  }
  
  // Name (for regular products)
  if (!product.flashSale) {
    html += '<div class="product-name">' + product.name + '</div>';
  }
  
  // Flash sale progress
  if (product.flashSale) {
    const soldPercentage = (product.sold / (product.sold + product.stock)) * 100;
    html += '<div class="product-sold">';
    html += '<div class="progress-bar"><div class="progress-fill" style="width: ' + soldPercentage + '%"></div></div>';
    html += '<span class="sold-label">ĐÃ BÁN</span>';
    html += '</div>';
  }
  
  // Rating and sold (for regular products)
  if (!product.flashSale) {
    html += '<div class="product-rating-wrapper">';
    html += '<span class="star">★</span>';
    html += '<span class="product-rating-text">(' + product.rating + ')</span>';
    html += '</div>';
    html += '<div class="product-sold-text">Đã bán ' + product.sold + '</div>';
  }
  
  html += '</div></div>';
  
  return html;
}

// Load sidebar categories
function loadSidebarCategories() {
  const container = document.getElementById('categoriesList');
  if (!container) return;

  const categories = mockData.categories;
  let html = '';
  
  categories.forEach(cat => {
    html += '<div style="padding: 12px 0; border-bottom: 0.667px solid #F1F1F1;">';
    html += '<a href="#" style="color: #333; text-decoration: none; font-size: 14px;">' + cat.name + '</a>';
    html += '</div>';
  });
  
  container.innerHTML = html;
}

// Load categories grid
function loadCategoriesGrid() {
  const container = document.getElementById('categoriesGrid');
  if (!container) return;

  const categories = mockData.categories;
  let html = '';
  
  categories.forEach(cat => {
    html += '<div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">';
    html += '<div style="width: 64px; height: 64px; border-radius: 4px; border: 1px solid #F1F1F1; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 8px;">';
    html += cat.icon;
    html += '</div>';
    html += '<div style="color: #333; font-size: 14px; text-align: center;">' + cat.name + '</div>';
    html += '</div>';
  });
  
  container.innerHTML = html;
}

// Load flash sale products
function loadFlashSaleProducts() {
  const container = document.getElementById('flashSaleProducts');
  if (!container) return;

  const flashSaleProducts = dataManager.getFlashSaleProducts();
  container.innerHTML = flashSaleProducts.map(renderProductCard).join('');
}

// Load featured products
function loadFeaturedProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;

  const featuredProducts = dataManager.getFeaturedProducts();
  container.innerHTML = featuredProducts.map(renderProductCard).join('');
}

// View product
function viewProduct(productId) {
  window.location.href = 'product.html?id=' + productId;
}

// Initialize homepage
document.addEventListener('DOMContentLoaded', function() {
  startFlashSaleTimer();
  loadSidebarCategories();
  loadCategoriesGrid();
  loadFlashSaleProducts();
  loadFeaturedProducts();
  
  // Update login link if user is logged in
  const currentUser = dataManager.getCurrentUser();
  if (currentUser) {
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
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
      
      const profileLink = document.createElement('a');
      profileLink.href = currentUser.role === 'admin' ? 'admin-approval.html' : 
                        currentUser.role === 'vendor' ? 'product-management.html' :
                        currentUser.role === 'business' ? 'business-orders.html' : 'order-management.html';
      profileLink.textContent = currentUser.role === 'admin' ? 'Quản trị' : 
                               currentUser.role === 'vendor' ? 'Quản lý sản phẩm' :
                               currentUser.role === 'business' ? 'Quản lý đơn hàng' : 'Đơn hàng của tôi';
      profileLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB; cursor: pointer;';
      profileLink.onclick = function(e) {
        // Allow navigation to happen
        e.stopPropagation();
        dropdown.style.display = 'none';
        // Let the browser handle the navigation
        return true;
      };
      
      const logoutLink = document.createElement('a');
      logoutLink.href = '#';
      logoutLink.textContent = 'Đăng xuất';
      logoutLink.style.cssText = 'display: block; padding: 12px 16px; color: #EF4444; text-decoration: none;';
      logoutLink.onclick = function(e) {
        e.preventDefault();
        handleLogout();
      };
      
      dropdown.appendChild(profileLink);
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
  }
});

// Logout function
function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    dataManager.logout();
    alert('Đã đăng xuất thành công!');
    window.location.href = 'index.html';
  }
}
