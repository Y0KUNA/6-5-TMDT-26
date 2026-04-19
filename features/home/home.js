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
  // Render filters in the sidebar (price range, location, rating)
  const container = document.getElementById('filtersList');
  if (!container) return;

  const html = `
    <div class="filter-group">
      <div class="filter-label">Khoảng Giá</div>
      <div style="display:flex; gap:8px;">
        <input id="priceMin" type="text" class="filter-input" placeholder="Từ" />
        <input id="priceMax" type="text" class="filter-input" placeholder="Đến" />
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Nơi Bán</div>
      <select id="placeSelect" class="filter-input">
        <option value="">Tất cả</option>
        <option value="Hà Nội">Hà Nội</option>
        <option value="TPHCM">TPHCM</option>
        <option value="Đà Lạt">Đà Lạt</option>
      </select>
    </div>

    <div class="filter-group">
      <div class="filter-label">Đánh Giá</div>
      <select id="ratingSelect" class="filter-input">
        <option value="">Tất cả</option>
        <option value="5">5⭐</option>
        <option value="4+">&gt;4⭐</option>
        <option value="3+">&gt;3⭐</option>
        <option value="2+">&gt;2⭐</option>
        <option value="1+">&gt;1⭐</option>
      </select>
    </div>

    <div style="margin-top:12px; display:flex; gap:8px;">
      <button id="applyFiltersBtn" class="btn btn-outline-success" style="flex:1;">Áp dụng</button>
      <button id="clearFiltersBtn" class="btn btn-secondary" style="flex:1;">Xóa Tất Cả</button>
    </div>
  `;

  container.innerHTML = html;

  // wire up events
  const applyBtn = document.getElementById('applyFiltersBtn');
  const clearBtn = document.getElementById('clearFiltersBtn');
  const pminEl = document.getElementById('priceMin');
  const pmaxEl = document.getElementById('priceMax');

  // enforce textbox that only allows digits and optional single dot; disallow minus sign
  [pminEl, pmaxEl].forEach(el => {
    el.addEventListener('input', function () {
      if (!this) return;
      // remove any non-digit and non-dot characters
      let v = this.value.replace(/[^0-9.]/g, '');
      // allow only one dot
      const parts = v.split('.');
      if (parts.length > 2) v = parts.shift() + '.' + parts.join('');
      this.value = v;
    });
    el.addEventListener('blur', function () {
      if (!this) return;
      if (this.value !== '') {
        const n = parseFloat(this.value);
        if (isNaN(n) || n < 0) this.value = '';
        else this.value = String(n);
      }
    });
  });

  applyBtn.addEventListener('click', loadProducts);
  clearBtn.addEventListener('click', function () {
    pminEl.value = '';
    pmaxEl.value = '';
    document.getElementById('placeSelect').value = '';
    document.getElementById('ratingSelect').value = '';
    document.getElementById('sortSelect').value = 'default';
    loadProducts();
  });
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

// Load (and filter/sort) featured products
async function loadProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;

  let products = [];
  try {
    products = await fetchProducts();
  } catch (e) {
    console.warn('fetchProducts failed, falling back to mock', e);
    try {
      products = (typeof dataManager !== 'undefined' && dataManager.getFeaturedProducts) ? dataManager.getFeaturedProducts() : [];
    } catch (e2) {
      products = [];
    }
  }

  // read filters
  const min = parseFloat(document.getElementById('priceMin')?.value || '') || null;
  const max = parseFloat(document.getElementById('priceMax')?.value || '') || null;
  const place = document.getElementById('placeSelect')?.value || '';

  // rating filter: support exact 5 or greater-than options like '4+' meaning rating > 4
  const ratingVal = document.getElementById('ratingSelect')?.value || '';
  let ratingMin = null;
  let ratingStrict = false;
  if (ratingVal) {
    if (ratingVal.endsWith('+')) {
      ratingMin = parseFloat(ratingVal.slice(0, -1));
      ratingStrict = true; // means strictly greater than ratingMin
    } else {
      ratingMin = parseFloat(ratingVal);
      ratingStrict = false; // means >= ratingMin
    }
  }

  // filter
  const filtered = products.filter(p => {
    const price = (p.units && p.units[0] && p.units[0].price) ? Number(p.units[0].price) : 0;
    if (min !== null && price < min) return false;
    if (max !== null && price > max) return false;

    if (place) {
      // try a few possible location fields
      const loc = p.city || p.location || p.sellerCity || '';
      if (loc && typeof loc === 'string') {
        if (loc.toLowerCase().indexOf(place.toLowerCase()) === -1) return false;
      } else {
        // if product doesn't have location info, don't filter it out
      }
    }

    if (ratingMin !== null) {
      const rating = Number(p.rating || 0);
      if (ratingStrict) {
        if (!(rating > ratingMin)) return false;
      } else {
        if (rating < ratingMin) return false;
      }
    }

    return true;
  });

  // sort
  const sort = document.getElementById('sortSelect')?.value || 'default';
  if (sort === 'price-asc') filtered.sort((a, b) => ((a.units && a.units[0]?.price) || 0) - ((b.units && b.units[0]?.price) || 0));
  else if (sort === 'price-desc') filtered.sort((a, b) => ((b.units && b.units[0]?.price) || 0) - ((a.units && a.units[0]?.price) || 0));
  else if (sort === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === 'sold') filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));

  container.innerHTML = filtered.map(renderProductCard).join('');
}

// Load featured products
function loadFeaturedProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;
  // Try to fetch from backend, fallback to mock data
  fetchProducts().then(products => {
    const featured = products.slice(0, 12);
    container.innerHTML = featured.map(renderProductCard).join('');
  }).catch(err => {
    console.warn('Failed to fetch products for featured, using mock', err);
    const featuredProducts = (typeof dataManager !== 'undefined' && dataManager.getFeaturedProducts) ? dataManager.getFeaturedProducts() : [];
    container.innerHTML = featuredProducts.map(renderProductCard).join('');
  });
}

// Fetch products from backend and map to front-end product shape
async function fetchProducts() {
  try {
    const resp = await fetch(window.PRODUCTS_API_URL || 'http://localhost:3000/api/products');
    if (!resp.ok) throw new Error('API returned ' + resp.status);
    const body = await resp.json();
    const rows = Array.isArray(body.products) ? body.products : [];

    // map DB rows to frontend product shape used by renderProductCard
    const mapped = rows.map(r => ({
      id: r.product_id,
      name: r.name,
      description: r.description || '',
      images: [r.primary_image || '/assets/raucai.webp'],
      units: [{ price: Number(r.price) || 0 }],
      flashSale: false,
      discount: 0,
      sold: 0,
      stock: Number(r.stock_quantity) || 0,
      rating: 4.5
    }));

    return mapped;
  } catch (err) {
    throw err;
  }
}

// View product
function viewProduct(productId) {
  window.location.href = '../product/product.html?id=' + productId;
}

// Initialize homepage
document.addEventListener('DOMContentLoaded', function () {
  // initialize filters and product list
  loadSidebarCategories();
  // ensure sort select exists before wiring
  const sortEl = document.getElementById('sortSelect');
  if (sortEl) sortEl.addEventListener('change', loadProducts);
  loadProducts();

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
