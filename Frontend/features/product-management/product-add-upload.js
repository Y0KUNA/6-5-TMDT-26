(function () {
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:3001';
  const state = {
    images: [],
    certificate: null
  };

  function getCurrentUser() {
    if (typeof dataManager !== 'undefined' && typeof dataManager.getCurrentUser === 'function') {
      return dataManager.getCurrentUser();
    }
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (error) {
      return null;
    }
  }

  function getEnterpriseId(user) {
    if (!user) return null;
    return user.user_id || user.enterpriseId || user.enterprise_id || user.id || null;
  }

  function buildObjectUrl(file) {
    return URL.createObjectURL(file);
  }

  function renderImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;

    preview.innerHTML = state.images.map((file, index) => `
      <div style="position: relative; width: 120px; height: 120px; border-radius: 8px; overflow: hidden; border: 2px solid #E5E7EB; background: #F9FAFB;">
        <img src="${buildObjectUrl(file)}" alt="preview" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" data-remove-image="${index}" style="position:absolute; top:6px; right:6px; width:28px; height:28px; border:none; border-radius:50%; background:#EF4444; color:#FFF; cursor:pointer;">x</button>
        <div style="position: absolute; bottom: 4px; right: 4px; background: #22C55E; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">
          ${index + 1}
        </div>
      </div>
    `).join('');

    preview.querySelectorAll('[data-remove-image]').forEach((button) => {
      button.addEventListener('click', () => {
        state.images.splice(Number(button.dataset.removeImage), 1);
        renderImagePreview();
      });
    });
  }

  function collectUnits() {
    const units = [];
    document.querySelectorAll('#unitsList .unit-container').forEach((unitContainer) => {
      const inputs = unitContainer.querySelectorAll('input');
      const name = (inputs[0] && inputs[0].value || '').trim();
      const price = Number(inputs[1] && inputs[1].value);
      if (name && Number.isFinite(price) && price > 0) units.push({ name, price });
    });
    return units;
  }

  async function uploadAssets() {
    const formData = new FormData();
    state.images.forEach((file) => formData.append('images', file));
    if (state.certificate) formData.append('certificate', state.certificate);

    const response = await fetch(API_BASE + '/api/uploads/product-assets', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Upload failed');
    }

    const body = await response.json();
    return {
      images: body.images || [],
      certification: body.certification || ''
    };
  }

  async function createProduct(payload) {
    const response = await fetch(API_BASE + '/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Create product failed');
    }

    return response.json();
  }

  async function createLocalFallback(productData, imageUrls, certification) {
    if (typeof dataManager === 'undefined' || typeof dataManager.addProduct !== 'function') {
      throw new Error('Local product fallback is unavailable');
    }

    const fileToDataUrl = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const localImages = imageUrls.length
      ? imageUrls.map((url) => url && url.startsWith('/') ? API_BASE + url : url)
      : await Promise.all(state.images.map(fileToDataUrl));
    const product = dataManager.addProduct({
      name: productData.name,
      description: productData.description,
      categoryId: productData.categoryId,
      vendorId: productData.enterpriseId,
      images: localImages,
      units: [{ name: productData.unit, price: productData.price }],
      stock: productData.stockQuantity,
      sold: 0,
      rating: 0,
      reviews: 0,
      certificate: certification || '',
      featured: false,
      flashSale: false,
      discount: 0
    });

    return product;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const user = getCurrentUser();
    const allowedRoles = ['vendor', 'business', 'enterprise'];
    if (!user || !allowedRoles.includes(user.role)) {
      alert('Vui long dang nhap bang tai khoan nguoi ban');
      return;
    }

    const form = event.currentTarget;
    const name = (form.querySelector('input[name="name"]') || {}).value || '';
    const description = (form.querySelector('textarea[name="description"]') || {}).value || '';
    const units = collectUnits();

    if (!name.trim() || !description.trim()) {
      alert('Vui long nhap day du ten va mo ta san pham');
      return;
    }
    if (units.length === 0) {
      alert('Vui long them it nhat mot don vi ban hop le');
      return;
    }
    if (state.images.length === 0) {
      alert('Vui long them it nhat mot hinh anh san pham');
      return;
    }

    const enterpriseId = getEnterpriseId(user);
    if (!enterpriseId) {
      alert('Khong tim thay ma doanh nghiep/nguoi ban');
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Dang luu...';
    }

    let uploadResult = { images: [], certification: '' };
    const payload = {
      enterpriseId,
      categoryId: 1,
      name: name.trim(),
      description: description.trim(),
      price: units[0].price,
      unit: units[0].name,
      stockQuantity: 100
    };

    try {
      uploadResult = await uploadAssets();
      payload.images = uploadResult.images;
      payload.certification = uploadResult.certification;
      await createProduct(payload);
      alert('San pham da duoc gui len he thong va dang cho duyet!');
    } catch (error) {
      console.warn('API create product failed, using local fallback:', error);
      await createLocalFallback(payload, uploadResult.images, uploadResult.certification);
      alert('Server khong kha dung, san pham da duoc luu tam tren trinh duyet.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }

    state.images = [];
    state.certificate = null;
    form.reset();
    renderImagePreview();
    const certPreview = document.getElementById('certificatePreview');
    if (certPreview) certPreview.innerHTML = '';
    window.location.href = '../product-management/product-management.html';
  }

  function initUploadForm() {
    const oldForm = document.getElementById('addProductForm');
    if (!oldForm) return;

    const form = oldForm.cloneNode(true);
    oldForm.replaceWith(form);

    const imageInput = document.getElementById('productImages');
    const certificateInput = document.getElementById('certificate');

    if (imageInput) {
      imageInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
        state.images.push(...files);
        imageInput.value = '';
        renderImagePreview();
      });
    }

    if (certificateInput) {
      certificateInput.addEventListener('change', (event) => {
        state.certificate = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        const preview = document.getElementById('certificatePreview');
        if (preview) {
          preview.innerHTML = state.certificate
            ? '<span style="color: #16A34A; font-weight: 500;">Da chon: ' + state.certificate.name + '</span>'
            : '';
        }
      });
    }

    form.addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUploadForm);
  } else {
    initUploadForm();
  }
})();
