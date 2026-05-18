// Login page functionality (moved from js/login.js)

// Debug: kiểm tra dataManager đã load chưa
console.log('[login.js] dataManager:', typeof dataManager, typeof dataManager !== 'undefined' ? dataManager.login : 'NOT LOADED');

// Handle login form submit
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const email = formData.get('email') || e.target.querySelector('input[type="email"]').value;
  const password = formData.get('password') || e.target.querySelector('input[type="password"]').value;

  // Try server-side login first
  try {
    const resp = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (resp.ok) {
      const data = await resp.json();
      localStorage.setItem('authToken', data.token);
      if (data.user) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
      }
      alert('Đăng nhập thành công!');
      window.location.href = '../home/index.html';
      return;
    }
  } catch (err) {
    // Server chưa chạy, fallback về local data
    console.warn('Auth server unreachable, falling back to local data:', err);
  }

  // Fallback: local in-browser auth
  let user = null;

  if (typeof dataManager !== 'undefined' && typeof dataManager.login === 'function') {
    user = dataManager.login(email, password);
  } else {
    console.error('[login.js] dataManager.login không tồn tại. Kiểm tra lại data.js đã được load chưa.');
  }

  if (!user && typeof businessManager !== 'undefined') {
    const businessUser = businessManager.getAllBusinessUsers().find(
      u => u.email === email && u.password === password
    );

    if (businessUser) {
      const { password: _, ...userWithoutPassword } = businessUser;
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      user = userWithoutPassword;
    }
  }

  if (user) {
    alert(`Đăng nhập thành công! Chào mừng ${user.fullName}`);
    const role = (user.role || '').toLowerCase();
    if (role === 'admin') {
      window.location.href = '../admin-approval/admin-approval.html';
    } else if (role === 'enterprise' || role === 'vendor' || role === 'business') {
      window.location.href = '../product-management/product-management.html';
    } else {
      window.location.href = '../home/index.html';
    }
  } else {
    showError('Email hoặc mật khẩu không đúng');
  }
});

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';

  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}
