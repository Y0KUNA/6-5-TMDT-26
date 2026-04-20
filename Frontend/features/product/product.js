// Product detail functionality (moved from js/product.js)

let currentProduct = null;
let selectedUnit = 0;
let quantity = 1;

// Get product ID from URL
function getProductId() {
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('id'));
}

// Render product details
function renderProductDetails() {
  const productId = getProductId();
  currentProduct = dataManager.getProductById(productId);

  if (!currentProduct) {
    window.location.href = '../home/index.html';
    return;
  }

  // Product images
  document.getElementById('productImages').innerHTML = 
    '<img src="' + currentProduct.images[0] + '" alt="' + currentProduct.name + '" style="width: 100%; height: 283px; object-fit: cover;">';

  // Product name
  document.getElementById('productName').textContent = currentProduct.name;

  // Product price
  document.getElementById('productPrice').textContent = 
    'Giá: ' + currentProduct.units[0].price.toLocaleString() + ' VNĐ';

  // Product description
  document.getElementById('productDescription').textContent = 
    'Mô tả: ' + currentProduct.description;

  // Certificate link
  if (currentProduct.certificate) {
    document.getElementById('certificateLink').href = currentProduct.certificate;
    document.getElementById('certificateLink').target = '_blank';
  }

  // Product rating
  renderRating(currentProduct.rating);
}

// Render rating stars
function renderRating(rating) {
  const container = document.getElementById('productRating');
  let html = '';

  for (let i = 1; i <= 5; i++) {
    const starClass = i <= Math.floor(rating) ? 'star-fill' : 'star-empty';
    html += '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">';
    html += '<path class="' + starClass + '" d="M7.2028 1.38322L5.38892 5.061L1.33058 5.65267C0.602805 5.75822 0.311138 6.65545 0.838916 7.16934L3.77503 10.0304L3.08058 14.0721C2.95558 14.8027 3.72503 15.3499 4.36947 15.0082L8.00003 13.0999L11.6306 15.0082C12.275 15.3471 13.0445 14.8027 12.9195 14.0721L12.225 10.0304L15.1611 7.16934C15.6889 6.65545 15.3972 5.75822 14.6695 5.65267L10.6111 5.061L8.79725 1.38322C8.47225 0.72767 7.53058 0.719336 7.2028 1.38322Z"/>'; 
    html += '</svg>';
  }

  container.innerHTML = html;
}

// Open add to cart modal
function openAddToCartModal() {
  const modal = document.getElementById('addToCartModal');
  modal.classList.add('active');

  renderUnitOptions();
  updateModalTotal();
}

// Close add to cart modal
function closeAddToCartModal() {
  const modal = document.getElementById('addToCartModal');
  modal.classList.remove('active');
  quantity = 1;
  selectedUnit = 0;
}

// Render unit options
function renderUnitOptions() {
  const container = document.getElementById('unitOptions');
  let html = '';

  currentProduct.units.forEach((unit, index) => {
    const isSelected = index === selectedUnit;
    html += '<div class="unit-option' + (isSelected ? ' selected' : '') + '" onclick="selectUnit(' + index + ')">';
    html += '<div style="display: flex; align-items: center; gap: 12px;">';
    html += '<div class="unit-radio"><div class="unit-radio-inner"></div></div>';
    html += '<div style="flex: 1;">';
    html += '<div style="color: #000; font-size: 16px; margin-bottom: 4px;">' + unit.name + '</div>';
    html += '<div style="color: #16A34A; font-size: 14px; font-weight: 600;">' + unit.price.toLocaleString() + ' VNĐ</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

// Select unit
function selectUnit(index) {
  selectedUnit = index;
  renderUnitOptions();
  updateModalTotal();
}

// Increase quantity
function increaseQuantity() {
  quantity++;
  document.getElementById('quantity').value = quantity;
  updateModalTotal();
}

// Decrease quantity
function decreaseQuantity() {
  if (quantity > 1) {
    quantity--;
    document.getElementById('quantity').value = quantity;
    updateModalTotal();
  }
}

// Update modal total
function updateModalTotal() {
  const unitPrice = currentProduct.units[selectedUnit].price;
  const total = unitPrice * quantity;
  document.getElementById('modalTotal').textContent = total.toLocaleString() + ' VNĐ';
}

// Confirm add to cart
function confirmAddToCart() {
  const currentUser = dataManager.getCurrentUser();
  if (!currentUser) {
    alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
    window.location.href = '../login/login.html';
    return;
  }

  const quantityInput = document.getElementById('quantity');
  quantity = parseInt(quantityInput.value) || 1;

  dataManager.addToCart(currentProduct.id, selectedUnit, quantity);
  
  alert('Đã thêm sản phẩm vào giỏ hàng');
  closeAddToCartModal();
}

// Update quantity on input change
document.addEventListener('DOMContentLoaded', function() {
  renderProductDetails();

  const quantityInput = document.getElementById('quantity');
  if (quantityInput) {
    quantityInput.addEventListener('change', function() {
      quantity = parseInt(this.value) || 1;
      if (quantity < 1) {
        quantity = 1;
        this.value = 1;
      }
      updateModalTotal();
    });
  }
});
