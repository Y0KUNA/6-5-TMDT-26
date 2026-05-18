// Shared header renderer
(function () {
  function buildHeader() {
    const container = document.getElementById('siteHeader');
    if (!container) return;

    container.innerHTML = `
      <div class="top-header">
        <div class="top-nav">
          <a href="../home/index.html" id="headerHomeLink" style="color:#fff; text-decoration:none; margin-right:16px; font-weight:600;">Trang chủ</a>
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

  // Cart summary / link
        try {
          let cartItems = [];
          const rawCart = localStorage.getItem('cart');
          if (rawCart) {
            try { cartItems = JSON.parse(rawCart); } catch (e) { cartItems = rawCart; }
          } else if (window.dataManager && typeof dataManager.getCart === 'function') {
            try { cartItems = dataManager.getCart(); } catch (e) { cartItems = []; }
          }

          // normalize count
          let count = 0;
          if (Array.isArray(cartItems)) count = cartItems.length;
          else if (cartItems && Array.isArray(cartItems.items)) count = cartItems.items.length;

          const cartLink = document.createElement('a');
          cartLink.href = '../cart/cart.html';
          cartLink.textContent = 'Giỏ hàng' + (count ? (' (' + count + ')') : '');
          cartLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
          dropdown.appendChild(cartLink);

         
        } catch (e) {
          // ignore cart rendering errors; continue with other links
          console.warn('Could not render cart summary in header dropdown', e);
        }

        // For admin show only admin management link, otherwise show profile and orders
        if (user.role && (user.role === 'admin' || user.role === 'ADMIN')) {
          const adminLink = document.createElement('a');
          adminLink.href = '../admin-approval/admin-approval.html';
          adminLink.textContent = 'Quản trị hệ thống';
          adminLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
          dropdown.appendChild(adminLink);

          const productApprovalLink = document.createElement('a');
          productApprovalLink.href = '../admin-approval/admin-approval.html';
          productApprovalLink.textContent = 'Phê duyệt sản phẩm';
          productApprovalLink.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
          dropdown.appendChild(productApprovalLink);
        } else {
          const role = (user.role || '').toLowerCase();
          const isSeller = role === 'enterprise' || role === 'vendor' || role === 'business';

          // If seller, show Dashboard link first
          if (isSeller) {
            const dash = document.createElement('a');
            dash.href = '../dashboard/dashboard.html';
            dash.textContent = 'Dashboard';
            dash.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
            dropdown.appendChild(dash);

            const productManage = document.createElement('a');
            productManage.href = '../product-management/product-management.html';
            productManage.textContent = 'Quản lý sản phẩm';
            productManage.style.cssText = 'display: block; padding: 12px 16px; color: #333; text-decoration: none; border-bottom: 1px solid #E5E7EB;';
            dropdown.appendChild(productManage);
          }

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
          // clear auth data
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          // redirect to home page
          try {
            // Use a relative path consistent with other header links
            window.location.href = '../home/index.html';
          } catch (err) {
            // fallback to reload if navigation fails for any reason
            window.location.reload();
          }
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
