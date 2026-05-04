// Shared header renderer
(function () {
  function buildHeader() {
    const container = document.getElementById('siteHeader');
    if (!container) return;

    container.innerHTML = `
      <div class="top-header">
        <div class="top-nav">
        
        </div>
        <div class="top-nav" id="authTopNav">
          <!-- auth area will be rendered by script -->
        </div>
      </div>

      
    `;

    renderAuthArea();
    wireSearch();
  }

  function renderAuthArea() {
    const authEl = document.getElementById('authTopNav');
    if (!authEl) return;

    try {
      const raw = localStorage.getItem('currentUser');
      const user = raw ? JSON.parse(raw) : null;

      if (user) {
        authEl.innerHTML = '';
        const span = document.createElement('span');
        span.id = 'topUserMenu';
        span.style.cssText = 'position: relative; cursor: pointer;';
        span.innerHTML = (user.fullName || user.email || 'Người dùng') + ' <span style="margin-left:8px;color:#666;">▼</span>';
        authEl.appendChild(span);

        const dropdown = document.createElement('div');
        dropdown.id = 'topUserDropdown';
        dropdown.style.cssText = 'display: none; position: absolute; top: 100%; right: 0; background: white; border: 1px solid #E5E7EB; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 180px; z-index: 10000; margin-top: 4px;';

        // For admin show only admin management link, otherwise show profile and orders
        if (user.role && (user.role === 'admin' || user.role === 'ADMIN')) {
          const adminLink = document.createElement('a');
          adminLink.href = '../product-management/product-management.html';
          adminLink.textContent = 'Quản trị hệ thống';
          adminLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
          dropdown.appendChild(adminLink);
        } else {
          const profile = document.createElement('a');
          profile.href = '../profile/profile.html';
          profile.textContent = 'Hồ sơ';
          profile.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';

          const orders = document.createElement('a');
          orders.href = '../order-management/order-management.html';
          orders.textContent = 'Quản lý đơn hàng';
          orders.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';

          dropdown.appendChild(profile);
          dropdown.appendChild(orders);
        }

        const logout = document.createElement('a');
        logout.href = '#';
        logout.id = 'topLogout';
        logout.textContent = 'Đăng xuất';
        logout.style.cssText = 'display: block; padding: 12px 16px; color: #EF4444; text-decoration: none;';
        dropdown.appendChild(logout);

        span.appendChild(dropdown);

        span.addEventListener('click', function(e) {
          e.stopPropagation();
          dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });

        logout.addEventListener('click', function(e) {
          e.preventDefault();
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          window.location.reload();
        });

        document.addEventListener('click', function(e) {
          if (!span.contains(e.target)) dropdown.style.display = 'none';
        });
      } else {
        authEl.innerHTML = '<a href="../register/register.html" id="registerLink">Đăng Ký</a><a href="../login/login.html" id="loginLink">Đăng Nhập</a>';
      }
    } catch (err) {
      console.error('auth render error', err);
      authEl.innerHTML = '<a href="../register/register.html" id="registerLink">Đăng Ký</a><a href="../login/login.html" id="loginLink">Đăng Nhập</a>';
    }
  }

  function wireSearch() {
    const btn = document.getElementById('sharedSearchBtn');
    const input = document.getElementById('sharedSearchInput');
    if (!btn || !input) return;
    btn.addEventListener('click', function() {
      const q = input.value && input.value.trim();
      if (q) window.location.href = '../product/product.html?q=' + encodeURIComponent(q);
    });
  }

  // Render on DOM ready (handle case where script is loaded after DOMContentLoaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHeader);
  } else {
    // document already ready
    buildHeader();
  }
})();
