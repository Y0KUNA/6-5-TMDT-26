document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('resetForm');
  const msg = document.getElementById('msg');

  // read token from query param
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    msg.textContent = '';
    const p1 = document.getElementById('password').value.trim();
    const p2 = document.getElementById('password2').value.trim();
    if (!p1 || !p2) return msg.textContent = 'Vui lòng nhập mật khẩu';
    if (p1 !== p2) return msg.textContent = 'Mật khẩu không khớp';
    const token = getQueryParam('token');
    if (!token) return msg.textContent = 'Token không hợp lệ';

    try {
  const resp = await fetch('http://localhost:3001/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: p1 })
      });
      const body = await resp.json();
      if (resp.ok) {
        msg.style.color = '#16A34A';
        msg.textContent = 'Mật khẩu đã được đặt lại. Bạn có thể đăng nhập.';
        setTimeout(() => { window.location.href = '../login/login.html'; }, 1800);
      } else {
        msg.style.color = '#EF4444';
        msg.textContent = body.error || 'Đặt lại mật khẩu thất bại';
      }
    } catch (err) {
      console.error(err);
      msg.style.color = '#EF4444';
      msg.textContent = 'Lỗi khi đặt lại mật khẩu';
    }
  });
});
