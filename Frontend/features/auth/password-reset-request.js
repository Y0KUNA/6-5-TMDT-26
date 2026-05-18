document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('resetRequestForm');
  const msg = document.getElementById('msg');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    msg.textContent = '';
    const email = document.getElementById('email').value.trim();
    if (!email) return msg.textContent = 'Vui lòng nhập email';
    try {
  const resp = await fetch('http://localhost:3001/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const body = await resp.json();
      if (resp.ok) {
        msg.style.color = '#16A34A';
        msg.textContent = 'Nếu email tồn tại, một liên kết đã được gửi. (Kiểm tra console khi đang dev)';
        // show reset link if present (dev convenience)
        if (body.resetLink) {
          const a = document.createElement('a');
          a.href = body.resetLink;
          a.textContent = 'Mở liên kết đặt lại mật khẩu (dev)';
          a.style.display = 'block';
          a.style.marginTop = '8px';
          msg.appendChild(a);
        }
      } else {
        msg.style.color = '#EF4444';
        msg.textContent = body.error || 'Yêu cầu thất bại';
      }
    } catch (err) {
      console.error(err);
      msg.style.color = '#EF4444';
      msg.textContent = 'Lỗi khi gửi yêu cầu';
    }
  });
});
