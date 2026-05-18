// Product Management - Clean Implementation

// Minimal state
let editingProductId = null;
const state = {
  enterpriseId: null
};

// Use runtime API base if provided (optional). Try several fallbacks so pages make network calls
// even if /env.js hasn't been injected.
let API_BASE = '';
if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
  API_BASE = window.APP_CONFIG.API_BASE_URL;
} else if (typeof window.apiUrl === 'function') {
  try {
    // window.apiUrl expects a path and returns full URL; call with '/' and strip trailing slash
    API_BASE = window.apiUrl('/') || '';
    if (API_BASE.endsWith('/')) API_BASE = API_BASE.slice(0, -1);
  } catch (e) {
    API_BASE = '';
  }
}
if (!API_BASE) {
  // final fallback to localhost dev server
  API_BASE = 'http://localhost:3001';
}
console.debug && console.debug('product-management: resolved API_BASE =', API_BASE);

function buildApiPath(path) {
  if (!path) return '';
  if (API_BASE) return API_BASE.replace(/\/$/, '') + path;
  return path;
}

// Helper to access dataManager whether it's declared as `const dataManager` or attached to `window`
function getDataManager() {
  if (typeof dataManager !== 'undefined') return dataManager;
  if (window.dataManager) return window.dataManager;
  return null;
}

function getCurrentUser() {
  const dm = getDataManager();
  if (dm && typeof dm.getCurrentUser === 'function') return dm.getCurrentUser();
  try {
    const raw = localStorage.getItem('currentUser');
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return null;
    // Normalize a few common shapes returned by server or older frontends
    const normalized = {
      // prefer camelCase id, but accept user_id or id
      id: user.id || user.user_id || user.userId || null,
      role: (user.role || user.role_name || '').toString(),
      fullName: user.fullName || user.full_name || user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      is_active: user.is_active || user.isActive || false,
      // enterpriseId may be present explicitly, or the user's id represents the enterprise owner id
      enterpriseId: user.enterpriseId || user.enterprise_id || user.enterprise || user.user_id || user.id || null
    };
    return normalized;
  } catch (e) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', initPage);

function initPage() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('Vui lòng đăng nhập để truy cập trang này');
    window.location.href = '../login/login.html';
    return;
  }

  if (!['vendor', 'business', 'enterprise'].includes((currentUser.role || '').toLowerCase())) {
    alert('Bạn không có quyền truy cập trang này');
    window.location.href = '../home/index.html';
    return;
  }

  // determine enterprise/vendor id
  state.enterpriseId = currentUser.enterpriseId || currentUser.vendorId || currentUser.user_id || 1;

  // Debug: log current user and resolved enterprise id so we can trace empty list issues
  console.debug && console.debug('product-management.init', { currentUser, enterpriseId: state.enterpriseId, API_BASE });

  // Probe backend to see if API is reachable (helps debug when no network calls are made)
  (async () => {
    try {
      const pingUrl = API_BASE.replace(/\/$/, '') + '/api/ping';
      const r = await fetch(pingUrl);
      console.debug && console.debug('product-management: ping', pingUrl, 'status', r.status);
    } catch (err) {
      console.warn('product-management: API ping failed', err);
    }
  })();

  // wire tab buttons (there are inline onclicks too; expose showTab globally)
  document.querySelectorAll('.btn-tab').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    showTab(btn.dataset.tab);
  }));

  // wire edit form
  const editForm = document.getElementById('editForm');
  if (editForm) editForm.addEventListener('submit', handleEditSubmit);

  // modal outside click
  const editModal = document.getElementById('editModal');
  if (editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });

  // initial view
  showTab('stats');
  loadProductsList();
  renderStatistics();
}

// expose showTab for inline onclick in HTML
function showTab(tabName) {
  document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('[data-tab="' + tabName + '"]');
  if (btn) btn.classList.add('active');

  document.getElementById('statsTab').style.display = (tabName === 'stats') ? 'block' : 'none';
  document.getElementById('listTab').style.display = (tabName === 'list') ? 'block' : 'none';

  if (tabName === 'stats') renderStatistics();
  if (tabName === 'list') loadProductsList();
}
window.showTab = showTab;

// Get products from API or fallback to dataManager
async function fetchProductsForEnterprise() {
  // If there's an API base, try to fetch from server
  if (API_BASE) {
    try {
      const url = buildApiPath('/api/products?enterpriseId=' + encodeURIComponent(state.enterpriseId));
      console.debug && console.debug('fetchProductsForEnterprise: requesting', url);
      const resp = await fetch(url);
      if (resp.ok) {
        const body = await resp.json();
        console.debug && console.debug('fetchProductsForEnterprise response body', body);
        console.debug && console.debug('fetchProductsForEnterprise response', body);
        // accept multiple shapes
        if (Array.isArray(body)) return body;
        if (Array.isArray(body.products)) return body.products;
        if (body.data && Array.isArray(body.data.products)) return body.data.products;
        console.debug && console.debug('fetchProductsForEnterprise: no product array found in response');
        return [];
      }
      console.warn('fetchProductsForEnterprise non-ok response', resp.status);
    } catch (e) {
      console.warn('API fetch failed, falling back to local', e);
    }
  }
  // fallback: use dataManager
  const dm = getDataManager();
  if (dm && typeof dm.getAllProducts === 'function') {
    const all = dm.getAllProducts();
    const filtered = all.filter(p => Number(p.vendorId || p.enterpriseId || p.enterprise_id) === Number(state.enterpriseId));
    console.debug && console.debug('fetchProductsForEnterprise fallback, found', filtered.length, 'products in local data');
    return filtered;
  }
  return [];
}

async function loadProductsList() {
  const list = document.getElementById('productsList');
  const emptyState = document.getElementById('emptyState');
  const table = document.getElementById('productsTable');
  if (!list || !emptyState || !table) return;

  list.innerHTML = '<tr><td colspan="6">Đang tải...</td></tr>';

  try {
    const products = await fetchProductsForEnterprise();
    if (!products || products.length === 0) {
      emptyState.style.display = 'block';
      table.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    table.style.display = 'table';
    renderProductsTable(products);
  } catch (e) {
    console.error(e);
    emptyState.style.display = 'block';
    table.style.display = 'none';
  }
}

function renderProductsTable(products) {
  const list = document.getElementById('productsList');
  if (!list) return;

  list.innerHTML = products.map((product) => {
    const sold = Number(product.sold || 0);
    const price = Number((product.price || product.unit_price || (product.units && product.units[0] && product.units[0].price)) || 0);
    const rating = Number(product.rating || 0);
    const img = product.primary_image || (product.images && product.images[0]) || 'https://via.placeholder.com/80x80';
    return `
      <tr>
        <td>
          <div style="display:flex; gap:10px; align-items:center;">
            <img src="${escapeHtml(img)}" alt="thumb" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
            <div>
              <div style="font-weight:700; color:#111827;">${escapeHtml(product.name || '')}</div>
              <div style="color:#6B7280; font-size:14px;">Đơn vị: ${escapeHtml(product.unit || (product.units && product.units[0] && product.units[0].name) || 'kg')}</div>
            </div>
          </div>
        </td>
        <td style="color:#16A34A; font-weight:700;">${formatVND(price)}</td>
        <td>${sold} ${escapeHtml(product.unit || (product.units && product.units[0] && product.units[0].name) || 'kg')}</td>
        <td style="color:#16A34A; font-weight:700;">${formatVND(sold * price)}</td>
        <td>${rating ? rating.toFixed(1) : '0.0'}</td>
        <td>
          <div style="display:flex; gap:8px; justify-content:center;">
            <button class="btn" data-edit-id="${product.product_id || product.id}" style="padding:8px 14px; font-size:14px; background:#3B82F6; color:#FFF;">Sửa</button>
            <button class="btn" data-delete-id="${product.product_id || product.id}" style="padding:8px 14px; font-size:14px; background:#EF4444; color:#FFF;">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  bindTableActions();
}

function bindTableActions() {
  document.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.onclick = async () => {
      const productId = Number(button.dataset.deleteId);
      if (!confirm('Bạn chắc chắn muốn xóa sản phẩm này?')) return;
      // try server delete if API_BASE set, else fallback to dataManager
      try {
        if (API_BASE) {
          const url = buildApiPath('/api/products/' + encodeURIComponent(productId));
          const resp = await fetch(url, { method: 'DELETE' });
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body.error || ('Server delete failed: ' + resp.status));
          }
        } else {
          const dm = getDataManager();
          if (dm && typeof dm.deleteProduct === 'function') dm.deleteProduct(productId);
        }
      } catch (e) { console.warn('delete error', e); alert('Không thể xóa sản phẩm: ' + (e.message || e)); }
      await loadProductsList();
      renderStatistics();
    };
  });

  document.querySelectorAll('[data-edit-id]').forEach((button) => {
    button.onclick = async () => {
      const productId = Number(button.dataset.editId);
      // load fresh product from server if available, else fallback
      if (API_BASE) {
        try {
          const url = buildApiPath('/api/products/' + encodeURIComponent(productId));
          const resp = await fetch(url);
          if (resp.ok) {
            const body = await resp.json();
            const product = Array.isArray(body) ? body[0] : (body.product || body.data || body);
            if (product) {
              openEditModal(productId, product);
              return;
            }
          }
        } catch (e) { console.warn('fetch single product failed', e); }
      }
      openEditModal(productId);
    };
  });
}

function getFallbackProduct(productId) {
  const dm = getDataManager();
  if (dm && typeof dm.getProductById === 'function') {
    return dm.getProductById(productId);
  }
  const all = (dm && typeof dm.getAllProducts === 'function') ? dm.getAllProducts() : [];
  return all.find(p => Number(p.id) === Number(productId));
}

function openEditModal(productId, productOverride) {
  const product = productOverride || getFallbackProduct(productId);
  if (!product) {
    alert('Sản phẩm không tìm thấy');
    return;
  }
  editingProductId = productId;
  document.getElementById('editName').value = product.name || '';
  document.getElementById('editDescription').value = product.description || '';
  document.getElementById('editPrice').value = ((product.price != null) ? product.price : (product.units && product.units[0] && product.units[0].price) ) || '';
  document.getElementById('editModal').classList.add('show');
}
window.openEditModal = openEditModal;

function closeEditModal() {
  editingProductId = null;
  const editModal = document.getElementById('editModal');
  if (editModal) editModal.classList.remove('show');
  const editForm = document.getElementById('editForm');
  if (editForm) editForm.reset();
}
window.closeEditModal = closeEditModal;

function handleEditSubmit(e) {
  e.preventDefault();
  if (!editingProductId) return;
  const newName = document.getElementById('editName').value.trim();
  const newDescription = document.getElementById('editDescription').value.trim();
  const newPrice = Number(document.getElementById('editPrice').value);
  if (!newName || !newDescription || !Number.isFinite(newPrice) || newPrice <= 0) {
    alert('Vui lòng điền đầy đủ thông tin hợp lệ');
    return;
  }
  // attempt server update if API available
  (async () => {
    try {
      if (API_BASE) {
        const url = buildApiPath('/api/products/' + encodeURIComponent(editingProductId));
        const resp = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName, description: newDescription, price: newPrice })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || 'Server update failed');
        }
      } else {
        const dm = getDataManager();
        if (dm && typeof dm.updateProduct === 'function') {
          const payload = { name: newName, description: newDescription, units: [{ price: newPrice }] };
          dm.updateProduct(editingProductId, payload);
        }
      }

      closeEditModal();
      await loadProductsList();
      renderStatistics();
      alert('Cập nhật sản phẩm thành công!');
    } catch (err) {
      console.error('update error', err);
      alert('Không thể cập nhật sản phẩm: ' + (err.message || 'Lỗi'));
    }
  })();
}

function renderStatistics() {
  const dm = getDataManager();
  const products = (dm && typeof dm.getAllProducts === 'function') ? dm.getAllProducts().filter(p => Number(p.vendorId || p.enterpriseId || p.enterprise_id) === Number(state.enterpriseId)) : [];
  const totalProducts = products.length;
  const totalSold = products.reduce((s, p) => s + Number(p.sold || 0), 0);
  const totalRevenue = products.reduce((s, p) => {
    const price = Number((p.units && p.units[0] && p.units[0].price) || p.price || 0);
    return s + price * Number(p.sold || 0);
  }, 0);

  document.getElementById('totalProducts').textContent = totalProducts;
  document.getElementById('totalSold').textContent = totalSold + ' ' + (products.length > 0 ? (products[0].units && products[0].units[0] && products[0].units[0].name) || products[0].unit || 'kg' : 'kg');
  document.getElementById('totalRevenue').textContent = (totalRevenue / 1000000).toFixed(1) + 'M VNĐ';
}

function formatVND(value) {
  return Number(value || 0).toLocaleString('vi-VN') + ' VNĐ';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// expose deleteProduct for safety (some code may call it)
window.deleteProduct = async function(productId) {
  if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
  try {
    if (API_BASE) {
      const url = buildApiPath('/api/products/' + encodeURIComponent(productId));
      const resp = await fetch(url, { method: 'DELETE' });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || ('Server delete failed: ' + resp.status));
      }
    } else {
      const dm = getDataManager();
      if (dm && typeof dm.deleteProduct === 'function') dm.deleteProduct(productId);
    }
  } catch (e) { console.warn(e); }
  await loadProductsList();
  renderStatistics();
};
