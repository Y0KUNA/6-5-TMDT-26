// Homepage functionality (moved from js/home.js)

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
  window.location.href = '../product/product.html?id=' + productId;
}

// Initialize homepage
document.addEventListener('DOMContentLoaded', function () {
  startFlashSaleTimer();
  loadSidebarCategories();
  loadCategoriesGrid();
  loadFlashSaleProducts();
  loadFeaturedProducts();

  // Update auth section if user is logged in
  const currentUser = dataManager.getCurrentUser();
  console.log(currentUser);
  if (currentUser) {
    const topNav = document.querySelector('.top-header .top-nav:last-child');
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');

    if (!topNav || !loginLink) return;

    // Ẩn login / register
    if (registerLink) registerLink.style.display = 'none';
    loginLink.style.display = 'none';

    // Tạo menu user
    const userMenu = document.createElement('div');
    userMenu.style.cssText = 'position: relative; display: inline-block;';

    const userButton = document.createElement('a');
    userButton.href = '#';
    userButton.innerHTML = `${currentUser.fullName || currentUser.email}<span style="margin-left: 8px; color: #666;">▼</span>`;
    userButton.style.cssText = 'color: white; text-decoration: none; display: inline-flex; align-items: center;';

    const dropdown = document.createElement('div');
    dropdown.style.cssText = 'display: none; position: absolute; top: 100%; right: 0; background: white; border: 1px solid #E5E7EB; border-radius: 4px; min-width: 200px; z-index: 10000;';

    const profileLink = document.createElement('a');
    profileLink.href = '../profile/profile.html';
    profileLink.textContent = 'Hồ sơ';
    profileLink.style.cssText = 'display: block; padding: 12px; color: #333; text-decoration: none;';

    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Đăng xuất';
    logoutLink.style.cssText = 'display: block; padding: 12px; color: red;';
    logoutLink.onclick = function (e) {
      e.preventDefault();
      handleLogout();
    };

    dropdown.appendChild(profileLink);
    dropdown.appendChild(logoutLink);

    userMenu.appendChild(userButton);
    userMenu.appendChild(dropdown);

    // Gắn vào đúng chỗ
    topNav.appendChild(userMenu);

    // Toggle
    userButton.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    };

    document.addEventListener('click', function (e) {
      if (!userMenu.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }
});

// Logout function
function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    dataManager.logout();
    alert('Đã đăng xuất thành công!');
    window.location.href = './index.html';
  }
}
