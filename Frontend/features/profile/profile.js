// Profile page script

async function loadProfile() {
  const token = localStorage.getItem('authToken');
  try {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const resp = await fetch('http://127.0.0.1:3001/api/profile', { headers });
    if (!resp.ok) {
      console.warn('Failed to load profile from API', await resp.text());
      return loadProfileFromClient();
    }
    const body = await resp.json();
    populateProfile(body);
  } catch (e) {
    console.warn('Profile API error, falling back', e);
    loadProfileFromClient();
  }
}

function populateProfile(data) {
  if (!data || !data.user) return;
  const u = data.user;
  const c = data.customer || {};
  const s = data.stats || {};

  document.getElementById('profileName').textContent = u.fullName || '';
  document.getElementById('profileEmail').textContent = u.email || '';
  document.getElementById('inpFullName').value = u.fullName || '';
  document.getElementById('inpEmail').value = u.email || '';
  document.getElementById('inpPhone').value = u.phone || '';
  document.getElementById('inpCreatedAt').value = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '';
  document.getElementById('inpAddress').value = c.address || '';

  document.getElementById('statOrders').textContent = s.orders || 0;
  document.getElementById('statSpent').textContent = (s.totalSpent || 0).toLocaleString() + ' VNĐ';
  document.getElementById('statPoints').textContent = s.points || 0;

  // avatar initials
  const avatar = document.getElementById('profileAvatar');
  const initials = (u.fullName || '').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase() || 'U';
  avatar.textContent = initials;
}

function loadProfileFromClient() {
  // fallback to client dataManager
  const user = dataManager.getCurrentUser();
  if (!user) return;
  const clientView = {
    user: { fullName: user.fullName || '', email: user.email || '', phone: user.phone || '', createdAt: user.createdAt },
    customer: { address: (user.address || '') },
    stats: { orders: 0, totalSpent: 0, points: 0 }
  };
  populateProfile(clientView);
}

async function saveProfile() {
  const token = localStorage.getItem('authToken');
  const fullName = document.getElementById('inpFullName').value.trim();
  const phone = document.getElementById('inpPhone').value.trim();
  const address = document.getElementById('inpAddress').value.trim();
  try {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const resp = await fetch('http://localhost:3001/api/profile', { method: 'PATCH', headers, body: JSON.stringify({ fullName, phone, address }) });
    if (!resp.ok) {
      alert('Cập nhật thất bại');
      return;
    }
    alert('Cập nhật thành công');
    // reload
    loadProfile();
  } catch (e) {
    console.error('save profile failed', e);
    alert('Cập nhật thất bại');
  }
}

// wire events
document.getElementById && document.addEventListener('DOMContentLoaded', function() {
  loadProfile();
  const btn = document.getElementById('btnSave');
  if (btn) btn.addEventListener('click', saveProfile);
  const btn2 = document.getElementById('btnChangePassword');
  if (btn2) btn2.addEventListener('click', function() { window.location.href = '../login/login.html'; });
});
