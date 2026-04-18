// Handle vendor section toggle (moved from js/register.js)
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

// Preview and validate license file when selected
const licenseInputEl = document.getElementById('licenseFile');
const licensePreviewContainer = document.getElementById('licensePreviewContainer');
const licensePreviewImg = document.getElementById('licensePreviewImg');
const licensePreviewInfo = document.getElementById('licensePreviewInfo');
if (licenseInputEl) {
  licenseInputEl.addEventListener('change', async function() {
    const file = this.files && this.files[0];
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'none';
    if (!file) {
      if (licensePreviewContainer) licensePreviewContainer.style.display = 'none';
      return;
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (file.size > MAX_BYTES) {
      errorMessage.textContent = 'Kích thước file vượt quá 5MB';
      errorMessage.style.display = 'block';
      this.value = '';
      if (licensePreviewContainer) licensePreviewContainer.style.display = 'none';
      return;
    }
    if (allowedTypes.indexOf(file.type) === -1) {
      errorMessage.textContent = 'Định dạng file không được hỗ trợ';
      errorMessage.style.display = 'block';
      this.value = '';
      if (licensePreviewContainer) licensePreviewContainer.style.display = 'none';
      return;
    }

    // show preview for images, otherwise show filename
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(ev) {
        if (licensePreviewImg) licensePreviewImg.src = ev.target.result;
        if (licensePreviewInfo) licensePreviewInfo.textContent = file.name + ' — ' + Math.round(file.size/1024) + ' KB';
        if (licensePreviewContainer) licensePreviewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      if (licensePreviewImg) licensePreviewImg.src = '';
      if (licensePreviewInfo) licensePreviewInfo.textContent = file.name + ' — ' + Math.round(file.size/1024) + ' KB (PDF)';
      if (licensePreviewContainer) licensePreviewContainer.style.display = 'block';
    }
  });
}

// Handle form submission
document.getElementById('registerForm').addEventListener('submit', async function(e) {
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
  
  // Try server-side registration
  const payload = {
    role: isVendor ? 'enterprise' : 'customer',
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: password,
    address: formData.get('address') || null,
    businessName: formData.get('businessName') || null,
    businessAddress: formData.get('businessAddress') || null,
    taxCode: formData.get('taxCode') || null,
    licenseFile: null
  };

  // allow overriding the API endpoint from the page (useful for local dev vs deployed)
  const REGISTER_API_URL = window.REGISTER_API_URL || 'http://localhost:3000/api/auth/register';

  // If vendor and a license file is selected, read it as base64 and include in JSON payload
  if (isVendor) {
    const licenseInput = document.getElementById('licenseFile');
    if (licenseInput && licenseInput.files && licenseInput.files.length > 0) {
      const file = licenseInput.files[0];
      try {
        // Client-side size/type validation (mirror server limits)
        const MAX_BYTES = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
        if (file.size > MAX_BYTES) {
          errorMessage.textContent = 'Kích thước file vượt quá 5MB';
          errorMessage.style.display = 'block';
          return;
        }
        if (allowedTypes.indexOf(file.type) === -1) {
          errorMessage.textContent = 'Định dạng file không được hỗ trợ';
          errorMessage.style.display = 'block';
          return;
        }

        const readAsDataURL = (f) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });

        const dataUrl = await readAsDataURL(file);
        // attach the data URL (e.g. data:image/png;base64,....) to payload
        payload.licenseFile = dataUrl;
      } catch (uE) {
        console.error('file read error', uE);
        errorMessage.textContent = 'Lỗi khi đọc file giấy phép';
        errorMessage.style.display = 'block';
        return;
      }
    }
  }

  try {
    const resp = await fetch(REGISTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      const data = await resp.json();
      alert('Đăng ký thành công! ' + (isVendor ? 'Tài khoản bán hàng đang chờ phê duyệt.' : 'Bạn có thể đăng nhập ngay bây giờ.'));
      window.location.href = '../login/login.html';
      return;
    }

    const err = await resp.json().catch(() => ({}));
    errorMessage.textContent = err.error || 'Đăng ký thất bại';
    errorMessage.style.display = 'block';
  } catch (e) {
    console.warn('Auth server unreachable, saving locally as fallback', e);
    // fallback to localStorage (legacy behavior)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
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

    if (isVendor) {
      const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
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

    window.location.href = '../login/login.html';
  }
});
