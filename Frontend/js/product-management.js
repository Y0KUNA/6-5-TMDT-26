// Product Management functionality

// Show tab
function showTab(tabName) {
  const tabs = ['list', 'add', 'stats'];
  tabs.forEach(tab => {
    const element = document.getElementById(tab + 'Tab');
    if (element) {
      element.style.display = tab === tabName ? 'block' : 'none';
    }
  });

  // Update button styles
  const buttons = document.querySelectorAll('[onclick^="showTab"]');
  buttons.forEach((btn, index) => {
    const btnTab = tabs[index];
    if (btnTab === tabName) {
      btn.className = 'btn btn-success';
    } else {
      btn.className = 'btn';
      btn.style.border = '1px solid #16A34A';
      btn.style.background = '#FFF';
      btn.style.color = '#16A34A';
    }
  });

  if (tabName === 'list') {
    loadProductsList();
  } else if (tabName === 'stats') {
    loadStatistics();
  }
}

// Load products list
function loadProductsList() {
  const container = document.getElementById('productsList');
  if (!container) return;

  const currentUser = dataManager.getCurrentUser();
  let products = dataManager.getAllProducts();
  
  // Filter products by vendor/business
  if (currentUser.role === 'vendor') {
    // Find vendor by userId
    const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
    if (vendor) {
      products = products.filter(p => p.vendorId === vendor.id);
    } else {
      products = [];
    }
  } else if (currentUser.role === 'business') {
    // For business users, find vendor by matching userId with business user ID
    const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
    if (vendor) {
      products = products.filter(p => p.vendorId === vendor.id);
    } else {
      // If no vendor found, show empty (business user needs to be approved as vendor first)
      products = [];
    }
  }
  
  let html = '';

  products.forEach(product => {
    const revenue = product.units[0].price * product.sold;
    
    html += '<tr>';
    html += '<td>';
    html += '<div style="display: flex; align-items: center; gap: 12px;">';
    html += '<img src="' + product.images[0] + '" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">';
    html += '<div>';
    html += '<div style="color: #000; font-size: 16px; font-weight: 500; margin-bottom: 4px;">' + product.name + '</div>';
    html += '<div style="color: #6B7280; font-size: 14px;">Đơn vị: ' + product.units[0].name + '</div>';
    html += '</div>';
    html += '</div>';
    html += '</td>';
    html += '<td style="color: #16A34A; font-size: 16px; font-weight: 600;">' + product.units[0].price.toLocaleString() + ' VNĐ</td>';
    html += '<td style="color: #000; font-size: 16px;">' + product.sold + ' ' + product.units[0].name + '</td>';
    html += '<td style="color: #16A34A; font-size: 16px; font-weight: 600;">' + revenue.toLocaleString() + ' VNĐ</td>';
    html += '<td>';
    
    // Rating stars
    for (let i = 0; i < 5; i++) {
      const starClass = i < Math.floor(product.rating) ? 'star-fill' : 'star-empty';
      html += '<svg width="16" height="16" style="display: inline-block; margin-right: 2px;" viewBox="0 0 16 16" fill="none">';
      html += '<path class="' + starClass + '" d="M7.2028 1.38298L5.38892 5.06076L1.33058 5.65243C0.602805 5.75798 0.311138 6.65521 0.838916 7.1691L3.77503 10.0302L3.08058 14.0719C2.95558 14.8025 3.72503 15.3497 4.36947 15.008L8.00003 13.0997L11.6306 15.008C12.275 15.3469 13.0445 14.8025 12.9195 14.0719L12.225 10.0302L15.1611 7.1691C15.6889 6.65521 15.3972 5.75798 14.6695 5.65243L10.6111 5.06076L8.79725 1.38298C8.47225 0.727426 7.53058 0.719092 7.2028 1.38298Z"/>';
      html += '</svg>';
    }
    
    html += '<span style="color: #6B7280; font-size: 14px; margin-left: 4px;">' + product.rating + '</span>';
    html += '</td>';
    html += '<td>';
    html += '<button onclick="editProduct(' + product.id + ')" style="width: 49px; height: 29px; border-radius: 4px; background: #3B82F6; color: #FFF; border: none; cursor: pointer; margin-right: 8px;">Sửa</button>';
    html += '<button onclick="deleteProduct(' + product.id + ')" style="width: 48px; height: 29px; border-radius: 4px; background: #EF4444; color: #FFF; border: none; cursor: pointer;">Xóa</button>';
    html += '</td>';
    html += '</tr>';
  });

  container.innerHTML = html;
}

// Load statistics
function loadStatistics() {
  const currentUser = dataManager.getCurrentUser();
  let products = dataManager.getAllProducts();
  
  // Filter products by vendor/business
  if (currentUser.role === 'vendor') {
    const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
    if (vendor) {
      products = products.filter(p => p.vendorId === vendor.id);
    } else {
      products = [];
    }
  } else if (currentUser.role === 'business') {
    // For business users, find vendor by matching userId with business user ID
    const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
    if (vendor) {
      products = products.filter(p => p.vendorId === vendor.id);
    } else {
      products = [];
    }
  }
  
  // Calculate totals
  const totalProducts = products.length;
  const totalSold = products.reduce((sum, p) => sum + p.sold, 0);
  const totalRevenue = products.reduce((sum, p) => sum + (p.units[0].price * p.sold), 0);

  document.getElementById('totalProducts').textContent = totalProducts;
  document.getElementById('totalSold').textContent = totalSold + ' kg';
  document.getElementById('totalRevenue').textContent = (totalRevenue / 1000000).toFixed(1) + 'M VNĐ';

  // Top selling products
  const topSelling = [...products].sort((a, b) => b.sold - a.sold).slice(0, 3);
  renderTopProducts('topSellingProducts', topSelling, 'sold');

  // Top rated products
  const topRated = [...products].sort((a, b) => b.rating - a.rating).slice(0, 3);
  renderTopProducts('topRatedProducts', topRated, 'rating');
}

// Render top products
function renderTopProducts(containerId, products, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '';

  products.forEach(product => {
    const revenue = product.units[0].price * product.sold;
    
    html += '<div class="top-product-item">';
    html += '<img src="' + product.images[0] + '" class="top-product-image">';
    html += '<div class="top-product-info">';
    html += '<div class="top-product-name">' + product.name + '</div>';
    
    if (type === 'sold') {
      html += '<div class="top-product-stat">' + product.sold + ' kg đã bán</div>';
    } else {
      // Rating stars
      for (let i = 0; i < 5; i++) {
        const starClass = i < Math.floor(product.rating) ? 'star-fill' : 'star-empty';
        html += '<svg width="16" height="16" style="display: inline-block; margin-right: 2px;" viewBox="0 0 16 16" fill="none">';
        html += '<path class="' + starClass + '" d="M7.2028 1.38298L5.38892 5.06076L1.33058 5.65243C0.602805 5.75798 0.311138 6.65521 0.838916 7.1691L3.77503 10.0302L3.08058 14.0719C2.95558 14.8025 3.72503 15.3497 4.36947 15.008L8.00003 13.0997L11.6306 15.008C12.275 15.3469 13.0445 14.8025 12.9195 14.0719L12.225 10.0302L15.1611 7.1691C15.6889 6.65521 15.3972 5.75798 14.6695 5.65243L10.6111 5.06076L8.79725 1.38298C8.47225 0.727426 7.53058 0.719092 7.2028 1.38298Z"/>';
        html += '</svg>';
      }
      html += '<span style="color: #6B7280; font-size: 14px; margin-left: 4px;">' + product.rating + '</span>';
    }
    
    html += '</div>';
    
    if (type === 'sold') {
      html += '<div class="top-product-revenue">' + revenue.toLocaleString() + ' VNĐ</div>';
    }
    
    html += '</div>';
  });

  container.innerHTML = html;
}

// Add unit field
function addUnit() {
  const container = document.getElementById('unitsContainer');
  const unitDiv = document.createElement('div');
  unitDiv.className = 'unit-container';
  unitDiv.innerHTML = `
    <div class="grid grid-2 gap-16">
      <div class="form-group" style="margin: 0;">
        <label class="form-label" style="font-size: 14px; color: #374151;">Đơn vị</label>
        <input type="text" class="form-input" placeholder="kg, gói, thùng..." name="unit[]" required>
      </div>
      <div class="form-group" style="margin: 0;">
        <label class="form-label" style="font-size: 14px; color: #374151;">Giá bán mỗi đơn vị (VNĐ)</label>
        <input type="number" class="form-input" placeholder="23,000" name="price[]" required>
      </div>
    </div>
    <button type="button" onclick="this.parentElement.remove()" class="delete-unit-btn">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M12.6667 4.66667L12.0887 12.7613C12.0647 13.0977 11.9142 13.4125 11.6674 13.6424C11.4206 13.8722 11.0959 14 10.7587 14H5.24135C4.90411 14 4.5794 13.8722 4.33261 13.6424C4.08582 13.4125 3.9353 13.0977 3.91135 12.7613L3.33335 4.66667M6.66669 7.33333V11.3333M9.33335 7.33333V11.3333M10 4.66667V2.66667C10 2.48986 9.92978 2.32029 9.80476 2.19526C9.67973 2.07024 9.51016 2 9.33335 2H6.66669C6.48988 2 6.32031 2.07024 6.19528 2.19526C6.07026 2.32029 6.00002 2.48986 6.00002 2.66667V4.66667M2.66669 4.66667H13.3334" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Xóa
    </button>
  `;
  container.appendChild(unitDiv);
}

// Add product form submission
const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
  addProductForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const units = [];
    const unitNames = formData.getAll('unit[]');
    const unitPrices = formData.getAll('price[]');

    for (let i = 0; i < unitNames.length; i++) {
      units.push({
        name: unitNames[i],
        price: parseInt(unitPrices[i])
      });
    }

    const currentUser = dataManager.getCurrentUser();
    let vendorId = 3; // Default
    
    // Determine vendor ID based on user role
    if (currentUser.role === 'vendor') {
      const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
      if (vendor) {
        vendorId = vendor.id;
      }
    } else if (currentUser.role === 'business') {
      // For business users, find vendor by matching userId
      const vendor = dataManager.getAllVendors().find(v => v.userId === currentUser.id);
      if (vendor) {
        vendorId = vendor.id;
      } else {
        // If no vendor record exists, create one or use a default
        // For now, we'll create a temporary vendor ID
        alert('Bạn cần được phê duyệt làm người bán trước khi thêm sản phẩm');
        return;
      }
    }
    
    const productData = {
      name: formData.get('name'),
      description: formData.get('description'),
      categoryId: 1,
      vendorId: vendorId,
      images: [
        'https://via.placeholder.com/176x176/22C55E/FFFFFF?text=' + encodeURIComponent(formData.get('name'))
      ],
      units,
      stock: 100,
      certificate: 'https://via.placeholder.com/400x300/22C55E/FFFFFF?text=Chứng+Nhận+An+Toàn',
      featured: false,
      flashSale: false,
      discount: 0
    };

    dataManager.addProduct(productData);
    alert('Thêm sản phẩm thành công!');
    showTab('list');
    this.reset();
  });
}

// Edit product
function editProduct(productId) {
  alert('Chức năng đang phát triển');
}

// Delete product
function deleteProduct(productId) {
  if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
    dataManager.deleteProduct(productId);
    loadProductsList();
    alert('Đã xóa sản phẩm');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  const currentUser = dataManager.getCurrentUser();
  
  if (!currentUser) {
    alert('Vui lòng đăng nhập để truy cập trang này');
    window.location.href = 'login.html';
    return;
  }
  
  // Allow vendors and business users
  if (currentUser.role !== 'vendor' && currentUser.role !== 'business') {
    alert('Bạn không có quyền truy cập trang này');
    window.location.href = 'index.html';
    return;
  }
  
  // Show business orders link for business users
  if (currentUser.role === 'business') {
    const businessNavLink = document.getElementById('businessNavLink');
    if (businessNavLink) {
      businessNavLink.style.display = 'inline-block';
    }
  }
  
  showTab('stats');
});
