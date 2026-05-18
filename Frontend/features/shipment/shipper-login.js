const authLoginBtn = document.getElementById('authLoginBtn');
const demoBtn = document.getElementById('demoBtn');
const skipBtn = document.getElementById('skipBtn');
const toRegister = document.getElementById('toRegister');

authLoginBtn.addEventListener('click', async function() {
  const email = document.getElementById('email').value && document.getElementById('email').value.trim();
  const password = document.getElementById('password').value || '';
  if (!email || !password) { alert('Vui lòng nhập email và mật khẩu'); return; }
  try {
    const resp = await fetch(apiUrl('/api/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      alert('Đăng nhập thất bại: ' + (err.error || resp.statusText));
      return;
    }
    const body = await resp.json();
    // save token and user
    if (body.token) localStorage.setItem('authToken', body.token);
    if (body.user) localStorage.setItem('currentUser', JSON.stringify({ id: body.user.user_id || body.user.id, fullName: body.user.fullName || body.user.full_name, role: body.user.role }));
    // if user role is shipper, redirect to shipper page; otherwise redirect to home
    const role = (body.user && body.user.role) || '';
    if (role && role.toLowerCase() === 'shipper') {
      window.location.href = 'shipper-shipments.html';
    } else {
      window.location.href = '../home/index.html';
    }
  } catch (err) {
    console.error('Login error', err);
    alert('Lỗi khi đăng nhập');
  }
});

demoBtn.addEventListener('click', function() {
  const id = document.getElementById('shipperId').value && document.getElementById('shipperId').value.trim();
  const name = document.getElementById('displayName').value && document.getElementById('displayName').value.trim();
  if (!id) { alert('Vui lòng nhập shipper id'); return; }
  localStorage.setItem('currentShipperId', id);
  const user = { id: Number(id), fullName: name || ('Shipper ' + id), role: 'shipper' };
  localStorage.setItem('currentUser', JSON.stringify(user));
  // remove any auth token (demo uses no token)
  localStorage.removeItem('authToken');
  window.location.href = 'shipper-shipments.html';
});

skipBtn.addEventListener('click', function() {
  localStorage.removeItem('currentShipperId');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');
  window.location.href = 'shipper-shipments.html';
});

toRegister.addEventListener('click', function() {
  window.location.href = '../register/register.html';
});
