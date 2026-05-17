// Product detail functionality (API-first implementation for features/product)

let currentProduct = null;
let selectedUnit = 0;
let quantity = 1;

function getProductId() {
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('id'), 10);
}

// Prefer API, fallback to client mock dataManager
async function renderProductDetails() {
  const productId = getProductId();
  if (!productId) { window.location.href = '../home/index.html'; return; }

  try {
  const resp = await fetch('http://localhost:3001/api/products/' + productId);
    if (!resp.ok) throw new Error('API product not found');
    const body = await resp.json();
    const p = body.product;
    if (!p) throw new Error('No product from API');

    currentProduct = {
      id: p.id || p.product_id,
      enterpriseId: p.enterpriseId || p.enterprise_id,
      enterpriseName: p.enterpriseName || p.enterprise_name || p.businessName || p.business_name,
      name: p.name,
      description: p.description,
      images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
      units: (p.units && p.units.length) ? p.units : (typeof p.price === 'number' ? [{ name: p.unit || 'kg', price: p.price }] : []),
      certificate: p.certificate || p.certification,
      rating: p.rating || 0,
      stock: p.stockQuantity || p.stock_quantity || 0
    };
  } catch (err) {
    try { currentProduct = dataManager.getProductById(productId); } catch (e) { currentProduct = null; }
  }

  if (!currentProduct) { window.location.href = '../home/index.html'; return; }
  populateProduct();
}

function populateProduct() {
  currentProduct.images = Array.isArray(currentProduct.images) ? currentProduct.images : (currentProduct.images ? [currentProduct.images] : []);

  const firstImage = currentProduct.images.length ? currentProduct.images[0] : (window.PRODUCT_PLACEHOLDER || '/assets/placeholder.png');
  const imgEl = document.getElementById('productImages');
  if (imgEl) imgEl.innerHTML = `<img src="${firstImage}" alt="${currentProduct.name || ''}" style="width:100%; height:283px; object-fit:cover;">`;

  const nameEl = document.getElementById('productName'); if (nameEl) nameEl.textContent = currentProduct.name || '';

  const priceEl = document.getElementById('productPrice');
  if (priceEl) {
    if (currentProduct.units && currentProduct.units.length) priceEl.textContent = 'Giá: ' + Number(currentProduct.units[0].price).toLocaleString() + ' VNĐ';
    else priceEl.textContent = '';
  }

  const descEl = document.getElementById('productDescription'); if (descEl) descEl.textContent = currentProduct.description ? ('Mô tả: ' + currentProduct.description) : '';

  const certEl = document.getElementById('certificateLink'); if (certEl && currentProduct.certificate) { certEl.href = currentProduct.certificate; certEl.target = '_blank'; }

  renderRating(currentProduct.rating || 0);
}

function renderRating(rating) {
  const container = document.getElementById('productRating'); if (!container) return; let html = '';
  for (let i = 1; i <= 5; i++) { const filled = i <= Math.floor(rating); html += `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">`; html += `<path fill="${filled ? '#FBBF24' : 'none'}" stroke="#D1D5DB" d="M7.2028 1.38322L5.38892 5.061L1.33058 5.65267C0.602805 5.75822 0.311138 6.65545 0.838916 7.16934L3.77503 10.0304L3.08058 14.0721C2.95558 14.8027 3.72503 15.3499 4.36947 15.0082L8.00003 13.0999L11.6306 15.0082C12.275 15.3471 13.0445 14.8027 12.9195 14.0721L12.225 10.0304L15.1611 7.16934C15.6889 6.65545 15.3972 5.75822 14.6695 5.65267L10.6111 5.061L8.79725 1.38322C8.47225 0.72767 7.53058 0.719336 7.2028 1.38322Z"/>`; html += `</svg>`; }
  container.innerHTML = html;
}

function openAddToCartModal() { const modal = document.getElementById('addToCartModal'); if (modal) modal.classList.add('active'); renderUnitOptions(); updateModalTotal(); }
function closeAddToCartModal() { const modal = document.getElementById('addToCartModal'); if (modal) modal.classList.remove('active'); quantity = 1; selectedUnit = 0; }

function renderUnitOptions() {
  const container = document.getElementById('unitOptions'); if (!container) return;
  const units = (currentProduct.units && currentProduct.units.length) ? currentProduct.units : [{ name: currentProduct.unit || 'kg', price: currentProduct.price || 0 }];
  let html = '';
  units.forEach((unit, index) => {
    const isSelected = index === selectedUnit;
    html += '<div class="unit-option' + (isSelected ? ' selected' : '') + '" onclick="selectUnit(' + index + ')">';
    html += '<div style="display: flex; align-items: center; gap: 12px;">';
    html += '<div class="unit-radio"><div class="unit-radio-inner"></div></div>';
    html += '<div style="flex: 1;">';
    html += '<div style="color: #000; font-size: 16px; margin-bottom: 4px;">' + unit.name + '</div>';
    html += '<div style="color: #16A34A; font-size: 14px; font-weight: 600;">' + Number(unit.price).toLocaleString() + ' VNĐ</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function selectUnit(index) { selectedUnit = index; renderUnitOptions(); updateModalTotal(); }
function increaseQuantity() { quantity++; const el = document.getElementById('quantity'); if (el) el.value = quantity; updateModalTotal(); }
function decreaseQuantity() { if (quantity > 1) { quantity--; const el = document.getElementById('quantity'); if (el) el.value = quantity; updateModalTotal(); } }

function updateModalTotal() {
  const units = currentProduct.units && currentProduct.units.length ? currentProduct.units : [{ price: currentProduct.price || 0 }];
  const price = Number(units[selectedUnit]?.price || units[0].price || 0);
  const total = price * quantity;
  const el = document.getElementById('modalTotal'); if (el) el.textContent = total.toLocaleString() + ' VNĐ';
}

async function confirmAddToCart() {
  const currentUser = dataManager.getCurrentUser();
  if (!currentUser) { alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng'); window.location.href = '../login/login.html'; return; }
  const qEl = document.getElementById('quantity'); quantity = parseInt(qEl?.value) || 1;
  const productId = currentProduct.id || currentProduct.product_id;
  if (currentProduct.stock && quantity > Number(currentProduct.stock)) {
    alert('Chỉ còn ' + currentProduct.stock + ' sản phẩm trong kho');
    return;
  }

  // If we have a server token, try adding to server-side cart
  const token = localStorage.getItem('authToken');
  const unitObj = (currentProduct.units && currentProduct.units[selectedUnit]) ? currentProduct.units[selectedUnit] : { name: currentProduct.unit || 'kg', price: currentProduct.price || 0 };
  if (token) {
    try {
  const resp = await fetch('http://localhost:3001/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          productId: productId,
          enterpriseId: currentProduct.enterpriseId || currentProduct.enterprise_id || currentProduct.vendorId || currentProduct.vendor_id,
          unit: unitObj.name,
          unitPrice: unitObj.price,
          quantity
        })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Không thể thêm vào giỏ, vui lòng thử lại');
      }
      alert('Đã thêm sản phẩm vào giỏ hàng');
      closeAddToCartModal();
      return;
    } catch (err) {
      console.warn('Server add to cart failed', err);
      alert(err.message || 'Không thể thêm vào giỏ, vui lòng thử lại');
      return;
    }
  }

  // Fallback: client-side cart
  dataManager.addToCart(productId, selectedUnit, quantity, {
    enterpriseId: currentProduct.enterpriseId || currentProduct.enterprise_id || currentProduct.vendorId || currentProduct.vendor_id,
    enterpriseName: currentProduct.enterpriseName || currentProduct.enterprise_name || currentProduct.businessName || currentProduct.business_name
  });
  alert('Đã thêm sản phẩm vào giỏ hàng'); closeAddToCartModal();
}

document.addEventListener('DOMContentLoaded', function() {
  renderProductDetails();
  const quantityInput = document.getElementById('quantity');
  if (quantityInput) quantityInput.addEventListener('change', function() { quantity = parseInt(this.value) || 1; if (quantity < 1) { quantity = 1; this.value = 1; } updateModalTotal(); });
});
