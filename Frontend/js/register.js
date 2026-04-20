// Handle vendor section toggle
const isVendorCheckbox = document.getElementById('isVendor');
const vendorSection = document.getElementById('vendorSection');

if (isVendorCheckbox && vendorSection) {
  isVendorCheckbox.addEventListener('change', function() {
    vendorSection.style.display = this.checked ? 'block' : 'none';
    
    // Toggle required attribute on vendor fields
    const vendorFields = vendorSection.querySelectorAll('input[required], textarea[required]');
    vendorFields.forEach(field => {
      if (this.checked) {
        field.setAttribute('required', 'required');
      } else {
        field.removeAttribute('required');
      }
    });
  });
}

// Handle form submission
document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  const errorMessage = document.getElementById('errorMessage');
  const isVendor = formData.get('isVendor') === 'on';
  
  // Validate password match
  if (password !== confirmPassword) {
    errorMessage.textContent = 'Mật khẩu xác nhận không khớp!';
    errorMessage.style.display = 'block';
    return;
  }
  
  // Validate vendor information if checkbox is checked
  if (isVendor) {
    const businessName = formData.get('businessName');
    const businessAddress = formData.get('businessAddress');
    const businessPhone = formData.get('businessPhone');
    
    if (!businessName || !businessAddress || !businessPhone) {
      errorMessage.textContent = 'Vui lòng điền đầy đủ thông tin doanh nghiệp!';
      errorMessage.style.display = 'block';
      return;
    }
  }
  
  // Save to localStorage
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
  
  // Check if email already exists
  if (users.find(u => u.email === formData.get('email'))) {
    errorMessage.textContent = 'Email đã được đăng ký!';
    errorMessage.style.display = 'block';
    return;
  }
  
  const userData = {
    id: Date.now(),
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    password: password,
    dateOfBirth: formData.get('dateOfBirth'),
    isVendor: isVendor,
    createdAt: new Date().toISOString()
  };
  
  users.push(userData);
  localStorage.setItem('users', JSON.stringify(users));
  
  // If vendor, save vendor information for approval
  if (isVendor) {
    const vendorData = {
      id: Date.now(),
      userId: userData.id,
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      businessName: formData.get('businessName'),
      businessAddress: formData.get('businessAddress'),
      businessPhone: formData.get('businessPhone'),
      status: 'pending',
      licenseImage: 'https://via.placeholder.com/522x200/22C55E/FFFFFF?text=Giay+Phep+Kinh+Doanh',
      createdAt: new Date().toISOString()
    };
    
    vendors.push(vendorData);
    localStorage.setItem('vendors', JSON.stringify(vendors));
    
    alert('Đăng ký thành công! Tài khoản bán hàng của bạn đang chờ phê duyệt.');
  } else {
    alert('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
  }
  
  window.location.href = 'login.html';
});
