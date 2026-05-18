// Mock Data for Nông Sản Sạch

const mockData = {
  // Users
  users: [
    {
      id: 1,
      email: "admin@nongsansach.vn",
      password: "admin123",
      role: "admin",
      fullName: "Admin System",
      phone: "0901234567",
      address: "123 Đường Lê Lợi, Quận 1, TP.HCM",
      createdAt: "2024-01-01"
    },
    {
      id: 2,
      email: "nguyen.van.a@gmail.com",
      password: "123456",
      role: "customer",
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
      address: "456 Đường Nguyễn Huệ, Quận 1, TP.HCM",
      dateOfBirth: "1990-05-15",
      createdAt: "2024-01-15"
    },
    {
      id: 3,
      email: "tran.thi.b@gmail.com",
      password: "123456",
      role: "customer",
      fullName: "Trần Thị B",
      phone: "0923456789",
      address: "789 Đường Hai Bà Trưng, Quận 3, TP.HCM",
      dateOfBirth: "1995-08-20",
      createdAt: "2024-02-01"
    }
  ],

  // Vendors (Sellers)
  vendors: [
    {
      id: 1,
      userId: 4,
      businessName: "Nông Trại Xanh Organic",
      businessAddress: "123 Đường Lê Lợi, Quận 1, TP.HCM",
      businessPhone: "0901234567",
      licenseNumber: "GPKD-123456",
      licenseImage: "https://via.placeholder.com/522x200/22C55E/FFFFFF?text=Giấy+Phép+Kinh+Doanh",
      status: "pending", // pending, approved, rejected
      email: "nongtrai@organic.vn",
      createdAt: "2024-02-15"
    },
    {
      id: 2,
      userId: 5,
      businessName: "Cửa Hàng Rau Sạch Miền Tây",
      businessAddress: "456 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM",
      businessPhone: "0912345678",
      licenseNumber: "GPKD-234567",
      licenseImage: "https://via.placeholder.com/522x200/22C55E/FFFFFF?text=Giấy+Phép+Kinh+Doanh",
      status: "pending",
      email: "rausach@mientay.vn",
      createdAt: "2024-02-20"
    },
    {
      id: 3,
      userId: 6,
      businessName: "Trang Trại Hữu Cơ Đà Lạt",
      businessAddress: "789 Đường Trần Hưng Đạo, Đà Lạt, Lâm Đồng",
      businessPhone: "0923456789",
      licenseNumber: "GPKD-345678",
      licenseImage: "https://via.placeholder.com/522x200/22C55E/FFFFFF?text=Giấy+Phép+Kinh+Doanh",
      status: "approved",
      email: "huuco@dalat.vn",
      createdAt: "2024-01-10"
    }
  ],

  // Categories
  categories: [
    { id: 1, name: "Rau Sạch", icon: "🥬" },
    { id: 2, name: "Trái Cây Organic", icon: "🍎" },
    { id: 3, name: "Thịt Sạch", icon: "🥩" },
    { id: 4, name: "Gạo ST25", icon: "🌾" },
    { id: 5, name: "Trứng Gà", icon: "🥚" },
    { id: 6, name: "Mật Ong", icon: "🍯" }
  ],

  // Products
  products: [
    {
      id: 1,
      name: "Rau Cải Xanh Hữu Cơ",
      description: "Rau cải xanh hữu cơ trồng tại Đà Lạt, không sử dụng thuốc trừ sâu",
      categoryId: 1,
      vendorId: 3,
      images: [
        "assets/raucai.webp",
        "https://via.placeholder.com/176x176/16A34A/FFFFFF?text=Rau+Cải+2"
      ],
      units: [
        { name: "kg", price: 25000 },
        { name: "gói 500g", price: 13000 }
      ],
      stock: 200,
      sold: 150,
      rating: 4.5,
      reviews: 45,
      certificate: "https://via.placeholder.com/400x300/22C55E/FFFFFF?text=Chứng+Nhận+An+Toàn",
      featured: true,
      flashSale: false,
      discount: 0,
      createdAt: "2024-02-01"
    },
    {
      id: 2,
      name: "Cà Chua Cherry",
      description: "Cà chua cherry ngọt, giàu vitamin C, trồng theo phương pháp hữu cơ",
      categoryId: 1,
      vendorId: 3,
      images: [
        "assets/tomatoes.jpg",
        
      ],
      units: [
        { name: "kg", price: 45000 },
        { name: "hộp 250g", price: 12000 }
      ],
      stock: 150,
      sold: 89,
      rating: 4.8,
      reviews: 67,
      certificate: "https://via.placeholder.com/400x300/22C55E/FFFFFF?text=Chứng+Nhận+An+Toàn",
      featured: true,
      flashSale: true,
      discount: 15,
      createdAt: "2024-02-05"
    },
    {
      id: 3,
      name: "Gạo ST25 Cao Cấp",
      description: "Gạo ST25 thơm ngon, đạt giải thưởng gạo ngon nhất thế giới",
      categoryId: 4,
      vendorId: 3,
      images: [
        "assets/st25.webp",
        "https://via.placeholder.com/176x176/D97706/FFFFFF?text=Gạo+ST25+2"
      ],
      units: [
        { name: "kg", price: 35000 },
        { name: "túi 5kg", price: 165000 },
        { name: "túi 10kg", price: 320000 }
      ],
      stock: 500,
      sold: 234,
      rating: 4.9,
      reviews: 120,
      certificate: "https://via.placeholder.com/400x300/22C55E/FFFFFF?text=Chứng+Nhận+An+Toàn",
      featured: true,
      flashSale: false,
      discount: 0,
      createdAt: "2024-01-20"
    },
    {
      id: 4,
      name: "Sầu Riêng Ri6",
      description: "Sầu riêng Ri6 Đồng Nai, múi vàng béo, thơm ngon",
      categoryId: 2,
      vendorId: 1,
      images: [
        "assets/durian.webp"
      ],
      units: [
        { name: "kg", price: 200000 },
        { name: "trái", price: 180000 }
      ],
      stock: 50,
      sold: 25,
      rating: 4.7,
      reviews: 18,
      certificate: "https://via.placeholder.com/400x300/22C55E/FFFFFF?text=Chứng+Nhận+An+Toàn",
      featured: false,
      flashSale: true,
      discount: 10,
      createdAt: "2024-02-10"
    },
    {
      id: 5,
      name: "Mít Thái",
      description: "Mít Thái ngọt, múi to, màu vàng đẹp",
      categoryId: 2,
      vendorId: 1,
      images: [
        "assets/mitthai.webp"
      ],
      units: [
        { name: "kg", price: 35000 },
        { name: "trái", price: 150000 }
      ],
      stock: 80,
      sold: 45,
      rating: 4.6,
      reviews: 32,
      certificate: "https://via.placeholder.com/400x300/22C55E/FFFFFF?text=Chứng+Nhận+An+Toàn",
      featured: false,
      flashSale: false,
      discount: 0,
      createdAt: "2024-02-12"
    },
    {
      id: 6,
      name: "Ổi Việt Nam",
      description: "Ổi giòn ngọt, giàu vitamin C",
      categoryId: 2,
      vendorId: 2,
      images: [
        "assets/oivn.webp"
      ],
      units: [
        { name: "kg", price: 30000 },
        { name: "kg", price: 28000 }
      ],
      stock: 100,
      sold: 60,
      rating: 4.4,
      reviews: 28,
      certificate: "https://via.placeholder.com/400x300/22C55E/FFFFFF?text=Chứng+Nhận+An+Toàn",
      featured: false,
      flashSale: false,
      discount: 0,
      createdAt: "2024-02-08"
    }
  ],

  // Cart (Session based)
  cart: [],

  // Orders
  orders: [
    {
      id: 1,
      userId: 2,
      items: [
        { productId: 1, unitIndex: 0, quantity: 2, price: 25000 },
        { productId: 3, unitIndex: 0, quantity: 5, price: 35000 }
      ],
      shippingInfo: {
        fullName: "Nguyễn Văn A",
        phone: "0912345678",
        address: "456 Đường Nguyễn Huệ, Quận 1, TP.HCM"
      },
      paymentMethod: "bank_transfer",
      shippingFee: 30000,
      totalAmount: 255000,
      status: "pending", // pending, processing, shipped, delivered, cancelled
      createdAt: "2024-03-01T10:30:00"
    }
  ],

  // Payment Info
  paymentInfo: {
    bankName: "Vietcombank",
    accountNumber: "1234567890",
    accountName: "Nông Sản Sạch",
    qrCode: "https://via.placeholder.com/200x200/22C55E/FFFFFF?text=QR+Code"
  },

  // Promotions/Discounts
  promotions: []
};

// Helper Functions
const dataManager = {
  // Get all products
  getAllProducts() {
    return mockData.products;
  },

  // Get product by ID
  getProductById(id) {
    return mockData.products.find(p => p.id === id);
  },

  // Get products by category
  getProductsByCategory(categoryId) {
    return mockData.products.filter(p => p.categoryId === categoryId);
  },

  // Get featured products
  getFeaturedProducts() {
    return mockData.products.filter(p => p.featured);
  },

  // Get flash sale products
  getFlashSaleProducts() {
    return mockData.products.filter(p => p.flashSale);
  },

  // Get vendors
  getAllVendors() {
    return mockData.vendors;
  },

  // Get pending vendors
  getPendingVendors() {
    return mockData.vendors.filter(v => v.status === 'pending');
  },

  // User authentication
  login(email, password) {
    const user = mockData.users.find(u => u.email === email && u.password === password);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      return userWithoutPassword;
    }
    return null;
  },

  // Register user
  register(userData) {
    const newUser = {
      id: mockData.users.length + 1,
      ...userData,
      role: userData.isVendor ? 'vendor' : 'customer',
      createdAt: new Date().toISOString()
    };
    mockData.users.push(newUser);
    
    // If vendor, create vendor record
    if (userData.isVendor) {
      const newVendor = {
        id: mockData.vendors.length + 1,
        userId: newUser.id,
        businessName: userData.businessName,
        businessAddress: userData.businessAddress,
        businessPhone: userData.businessPhone,
        licenseNumber: "GPKD-" + Date.now(),
        licenseImage: userData.licenseImage,
        status: 'pending',
        email: userData.email,
        createdAt: new Date().toISOString()
      };
      mockData.vendors.push(newVendor);
    }
    
    return newUser;
  },

  // Get current user
  getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Logout
  logout() {
    localStorage.removeItem('currentUser');
  },

  // Cart operations
  addToCart(productId, unitIndex, quantity) {
    const product = this.getProductById(productId);
    if (!product) return false;

    const existingItem = mockData.cart.find(
      item => item.productId === productId && item.unitIndex === unitIndex
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      mockData.cart.push({
        productId,
        unitIndex,
        quantity,
        price: product.units[unitIndex].price
      });
    }

    this.saveCart();
    return true;
  },

  removeFromCart(productId, unitIndex) {
    const index = mockData.cart.findIndex(
      item => item.productId === productId && item.unitIndex === unitIndex
    );
    if (index > -1) {
      mockData.cart.splice(index, 1);
      this.saveCart();
      return true;
    }
    return false;
  },

  updateCartQuantity(productId, unitIndex, quantity) {
    const item = mockData.cart.find(
      item => item.productId === productId && item.unitIndex === unitIndex
    );
    if (item) {
      item.quantity = quantity;
      this.saveCart();
      return true;
    }
    return false;
  },

  getCart() {
    return mockData.cart;
  },

  getCartWithDetails() {
    return mockData.cart.map(item => {
      const product = this.getProductById(item.productId);
      return {
        ...item,
        product,
        unit: product.units[item.unitIndex],
        subtotal: product.units[item.unitIndex].price * item.quantity
      };
    });
  },

  clearCart() {
    mockData.cart = [];
    this.saveCart();
  },

  saveCart() {
    localStorage.setItem('cart', JSON.stringify(mockData.cart));
  },

  loadCart() {
    const cartStr = localStorage.getItem('cart');
    if (cartStr) {
      mockData.cart = JSON.parse(cartStr);
    }
  },

  // Create order
  createOrder(orderData) {
    const newOrder = {
      id: mockData.orders.length + 1,
      userId: this.getCurrentUser()?.id,
      items: mockData.cart,
      ...orderData,
      createdAt: new Date().toISOString()
    };
    mockData.orders.push(newOrder);
    this.clearCart();
    return newOrder;
  },

  // Vendor operations
  approveVendor(vendorId) {
    const vendor = mockData.vendors.find(v => v.id === vendorId);
    if (vendor) {
      vendor.status = 'approved';
      return true;
    }
    return false;
  },

  rejectVendor(vendorId, reason) {
    const vendor = mockData.vendors.find(v => v.id === vendorId);
    if (vendor) {
      vendor.status = 'rejected';
      vendor.rejectionReason = reason;
      return true;
    }
    return false;
  },

  // Product operations (for vendors)
  addProduct(productData) {
    const newProduct = {
      id: mockData.products.length + 1,
      ...productData,
      sold: 0,
      rating: 0,
      reviews: 0,
      createdAt: new Date().toISOString()
    };
    mockData.products.push(newProduct);
    return newProduct;
  },

  updateProduct(productId, productData) {
    const index = mockData.products.findIndex(p => p.id === productId);
    if (index > -1) {
      mockData.products[index] = {
        ...mockData.products[index],
        ...productData
      };
      return mockData.products[index];
    }
    return null;
  },

  deleteProduct(productId) {
    const index = mockData.products.findIndex(p => p.id === productId);
    if (index > -1) {
      mockData.products.splice(index, 1);
      return true;
    }
    return false;
  },

  // Promotion operations
  getAllPromotions() {
    // Load from localStorage if available
    const stored = localStorage.getItem('promotions');
    if (stored) {
      try {
        mockData.promotions = JSON.parse(stored);
      } catch (e) {
        console.error('Error loading promotions:', e);
      }
    }
    return mockData.promotions;
  },

  getPromotionById(id) {
    return mockData.promotions.find(p => p.id === id);
  },

  getPromotionsByVendor(vendorId) {
    return mockData.promotions.filter(p => p.vendorId === vendorId);
  },

  addPromotion(promotionData) {
    try {
      const newPromotion = {
        id: mockData.promotions.length + 1,
        ...promotionData,
        createdAt: new Date().toISOString()
      };
      mockData.promotions.push(newPromotion);
      
      // Save to localStorage
      localStorage.setItem('promotions', JSON.stringify(mockData.promotions));
      return newPromotion;
    } catch (error) {
      console.error('Error adding promotion:', error);
      return null;
    }
  },

  updatePromotion(promotionId, promotionData) {
    try {
      const index = mockData.promotions.findIndex(p => p.id === promotionId);
      if (index > -1) {
        mockData.promotions[index] = {
          ...mockData.promotions[index],
          ...promotionData
        };
        localStorage.setItem('promotions', JSON.stringify(mockData.promotions));
        return mockData.promotions[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating promotion:', error);
      return null;
    }
  },

  deletePromotion(promotionId) {
    try {
      const index = mockData.promotions.findIndex(p => p.id === promotionId);
      if (index > -1) {
        mockData.promotions.splice(index, 1);
        localStorage.setItem('promotions', JSON.stringify(mockData.promotions));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting promotion:', error);
      return false;
    }
  },

  approvePromotion(promotionId) {
    try {
      const promotion = mockData.promotions.find(p => p.id === promotionId);
      if (promotion) {
        promotion.status = 'approved';
        promotion.approvedAt = new Date().toISOString();
        localStorage.setItem('promotions', JSON.stringify(mockData.promotions));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error approving promotion:', error);
      return false;
    }
  },

  rejectPromotion(promotionId, reason) {
    try {
      const promotion = mockData.promotions.find(p => p.id === promotionId);
      if (promotion) {
        promotion.status = 'rejected';
        promotion.rejectionReason = reason;
        promotion.rejectedAt = new Date().toISOString();
        localStorage.setItem('promotions', JSON.stringify(mockData.promotions));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error rejecting promotion:', error);
      return false;
    }
  }
};

// Initialize cart from localStorage
dataManager.loadCart();

// Initialize promotions from localStorage
dataManager.getAllPromotions();
