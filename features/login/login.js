// Login page functionality (moved from js/login.js)

// Handle login form submit
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const email = formData.get('email') || e.target.querySelector('input[type="email"]').value;
  const password = formData.get('password') || e.target.querySelector('input[type="password"]').value;

  // Try server-side login first
  try {
    const resp = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (resp.ok) {
      const data = await resp.json();
      // store token
      localStorage.setItem('authToken', data.token);
      if (data.user) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
      }
      alert('Đăng nhập thành công!');
      // TODO: fetch user profile if needed
      window.location.href = '../home/index.html';
      return;
    }
  } catch (err) {
    // server may be down; fall back to local data
    console.warn('Auth server unreachable, falling back to local data:', err);
  }

  // Fallback: local in-browser auth (existing behavior)
  let user = (typeof dataManager !== 'undefined') ? dataManager.login(email, password) : null;

  if (!user && typeof businessManager !== 'undefined') {
    const businessUser = businessManager.getAllBusinessUsers().find(
      u => u.email === email && u.password === password
    );

    if (businessUser) {
      const { password, ...userWithoutPassword } = businessUser;
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      user = userWithoutPassword;
    }
  }

  if (user) {
    alert(`Đăng nhập thành công! Chào mừng ${user.fullName}`);
    if (user.role === 'admin') {
      window.location.href = '../admin-approval/admin-approval.html';
    } else if (user.role === 'enterprise') {
      window.location.href = '../product-management/product-management.html';
    } else if (user.role === 'enterprise') {
      window.location.href = '../business-orders/business-orders.html';
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
