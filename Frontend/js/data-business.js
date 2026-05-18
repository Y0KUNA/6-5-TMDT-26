// Extended Mock Data for Business Features

const businessData = {
  // Business Users (Doanh nghiệp)
  businessUsers: [
    {
      id: 4,
      email: "nongtrai@organic.vn",
      password: "business123",
      role: "business",
      fullName: "Nông Trại Xanh",
      phone: "0901234567",
      address: "123 Đường Lê Lợi, Quận 1, TP.HCM",
      businessInfo: {
        businessName: "Nông Trại Xanh Organic",
        licenseNumber: "GPKD-123456",
        status: "approved"
      },
      createdAt: "2024-01-01"
    },
    {
      id: 5,
      email: "gaosach@shop.vn",
      password: "business123",
      role: "business",
      fullName: "Cửa Hàng Gạo Sạch",
      phone: "0912345678",
      address: "456 Đường Nguyễn Huệ, Quận 3, TP.HCM",
      businessInfo: {
        businessName: "Cửa Hàng Gạo Sạch",
        licenseNumber: "GPKD-234567",
        status: "approved"
      },
      createdAt: "2024-01-02"
    },
    {
      id: 6,
      email: "trangtraihco@dalat.vn",
      password: "business123",
      role: "business",
      fullName: "Trang Trại Hữu Cơ",
      phone: "0923456789",
      address: "789 Đường Võ Văn Tần, Quận 10, TP.HCM",
      businessInfo: {
        businessName: "Trang Trại Hữu Cơ Đà Lạt",
        licenseNumber: "GPKD-345678",
        status: "approved"
      },
      createdAt: "2024-01-03"
    },
    {
      id: 7,
      email: "traicay@sach.vn",
      password: "business123",
      role: "business",
      fullName: "Vườn Trái Cây Sạch",
      phone: "0934567890",
      address: "321 Đường Cách Mạng Tháng 8, Quận 10, TP.HCM",
      businessInfo: {
        businessName: "Vườn Trái Cây Sạch",
        licenseNumber: "GPKD-456789",
        status: "approved"
      },
      createdAt: "2024-01-04"
    }
  ],

  // Extended Orders with more details
  orders: [
    {
      id: "DH001",
      customerId: 2,
      customerName: "Nguyễn Văn An",
      customerPhone: "0901234567",
      customerAddress: "123 Đường Lê Lợi, Quận 1, TP.HCM",
      businessId: 4,
      businessName: "Nông trại Xanh",
      items: [
        { 
          productId: 1, 
          productName: "Rau cải xanh hữu cơ",
          unitIndex: 0, 
          quantity: 2, 
          price: 25000,
          image: "https://via.placeholder.com/80x80/22C55E/FFFFFF?text=Rau"
        },
        { 
          productId: 2, 
          productName: "Cà chua cherry organic",
          unitIndex: 0, 
          quantity: 3, 
          price: 45000,
          image: "https://via.placeholder.com/80x80/22C55E/FFFFFF?text=Cà"
        }
      ],
      totalAmount: 95000,
      status: "preparing",
      orderDate: "2024-01-15T10:30:00",
      createdAt: "2024-01-15T10:30:00"
    },
    {
      id: "DH002",
      customerId: 3,
      customerName: "Trần Thị Bình",
      customerPhone: "0912345678",
      customerAddress: "456 Đường Nguyễn Huệ, Quận 3, TP.HCM",
      businessId: 5,
      businessName: "Cửa hàng Gạo Sạch",
      items: [
        { 
          productId: 3, 
          productName: "Gạo ST25 cao cấp",
          unitIndex: 0, 
          quantity: 5, 
          price: 180000,
          image: "https://via.placeholder.com/80x80/F59E0B/FFFFFF?text=Gạo"
        },
        { 
          productId: 3, 
          productName: "Thịt heo sạch",
          unitIndex: 0, 
          quantity: 2, 
          price: 320000,
          image: "https://via.placeholder.com/80x80/22C55E/FFFFFF?text=Thịt"
        }
      ],
      totalAmount: 1220000,
      status: "shipping",
      trackingNumber: "VN123456789",
      orderDate: "2024-01-12T11:45:00",
      shippedDate: "2024-01-15T14:30:00",
      createdAt: "2024-01-12T11:45:00"
    },
    {
      id: "DH003",
      customerId: 2,
      customerName: "Lê Minh Cường",
      customerPhone: "0923456789",
      customerAddress: "789 Đường Võ Văn Tần, Quận 10, TP.HCM",
      businessId: 6,
      businessName: "Trang trại Sạch",
      items: [
        { 
          productId: 4, 
          productName: "Thịt bò organic",
          unitIndex: 0, 
          quantity: 1, 
          price: 280000,
          image: "https://via.placeholder.com/80x80/FF5722/FFFFFF?text=Bò"
        }
      ],
      totalAmount: 280000,
      status: "delivered",
      orderDate: "2024-01-10T14:20:00",
      deliveredDate: "2024-01-14",
      reviewDeadline: "2024-02-14",
      daysLeftToReview: 0,
      createdAt: "2024-01-10T14:20:00"
    },
    {
      id: "DH004",
      customerId: 3,
      customerName: "Nguyễn Văn An",
      customerPhone: "0901234567",
      customerAddress: "123 Đường Lê Lợi, Quận 1, TP.HCM",
      businessId: 7,
      businessName: "Trái cây Sạch",
      items: [
        { 
          productId: 5, 
          productName: "Táo Fuji nhập khẩu",
          unitIndex: 0, 
          quantity: 2, 
          price: 75000,
          image: "https://via.placeholder.com/80x80/22C55E/FFFFFF?text=Táo"
        }
      ],
      totalAmount: 150000,
      status: "completed",
      rating: 5,
      review: "Sản phẩm rất tốt, tươi ngon!",
      orderDate: "2024-01-08",
      deliveredDate: "2024-01-12",
      createdAt: "2024-01-08"
    },
    {
      id: "DH005",
      customerId: 2,
      customerName: "Trần Thị Mai",
      customerPhone: "0912345678",
      customerAddress: "456 Đường Nguyễn Huệ, Quận 1, TP.HCM",
      businessId: 4,
      businessName: "Nông trại Xanh",
      items: [
        { 
          productId: 1, 
          productName: "Rau củ hỗn hợp",
          unitIndex: 0, 
          quantity: 1, 
          price: 85000,
          image: "https://via.placeholder.com/80x80/22C55E/FFFFFF?text=Rau"
        }
      ],
      totalAmount: 85000,
      status: "delivered",
      orderDate: "2023-12-20",
      deliveredDate: "2023-12-24",
      reviewDeadline: "2024-01-24",
      expired: true,
      createdAt: "2023-12-20"
    }
  ],

  // Return Requests
  returnRequests: [
    {
      id: "RR001",
      orderId: "DH002",
      customerId: 3,
      customerName: "Trần Thị Mai",
      customerPhone: "0912345678",
      businessId: 4,
      items: [
        {
          productName: "Rau muống hữu cơ",
          quantity: 1.5,
          unit: "kg",
          price: 30000
        },
        {
          productName: "Cà rốt baby",
          quantity: 2,
          unit: "kg",
          price: 80000
        }
      ],
      totalAmount: 110000,
      reason: "Sản phẩm không đúng chất lượng",
      description: "Rau muống bị héo úa, không tươi như mô tả. Cà rốt có vết thâm đen, không đảm bảo chất lượng organic.",
      images: [
        "https://via.placeholder.com/362x200/22C55E/FFFFFF?text=Ảnh+1",
        "https://via.placeholder.com/362x200/22C55E/FFFFFF?text=Ảnh+2"
      ],
      status: "pending",
      createdAt: "2024-01-12"
    },
    {
      id: "RR002",
      orderId: "DH005",
      customerId: 2,
      customerName: "Lê Văn Hùng",
      customerPhone: "0987654321",
      businessId: 4,
      items: [
        {
          productName: "Táo Fuji organic",
          quantity: 2,
          unit: "kg",
          price: 120000
        }
      ],
      totalAmount: 120000,
      reason: "Sản phẩm bị hư hỏng",
      description: "Táo bị dập nát trong quá trình vận chuyển",
      images: [
        "https://via.placeholder.com/362x200/22C55E/FFFFFF?text=Hư+hỏng"
      ],
      status: "pending",
      createdAt: "2024-01-13"
    }
  ],

  // Product Reviews
  reviews: [
    {
      id: 1,
      productId: 5,
      orderId: "DH004",
      userId: 3,
      userName: "Nguyễn Văn An",
      rating: 5,
      comment: "Sản phẩm rất tốt, tươi ngon!",
      images: [],
      createdAt: "2024-01-13"
    },
    {
      id: 2,
      productId: 7,
      orderId: "DH004",
      userId: 3,
      userName: "Nguyễn Văn An",
      rating: 5,
      comment: "Trái cây sạch mix",
      images: [],
      createdAt: "2024-01-09"
    }
  ]
};

// Business Manager Helper Functions
const businessManager = {
  // Get all business users
  getAllBusinessUsers() {
    return businessData.businessUsers;
  },

  // Get business by ID
  getBusinessById(id) {
    return businessData.businessUsers.find(b => b.id === id);
  },

  // Get orders by business
  getOrdersByBusiness(businessId) {
    return businessData.orders.filter(o => o.businessId === businessId);
  },

  // Get orders by status
  getOrdersByStatus(businessId, status) {
    return businessData.orders.filter(o => o.businessId === businessId && o.status === status);
  },

  // Get orders by customer
  getOrdersByCustomer(customerId) {
    return businessData.orders.filter(o => o.customerId === customerId);
  },

  // Get order by ID
  getOrderById(orderId) {
    return businessData.orders.find(o => o.id === orderId);
  },

  // Update order status
  updateOrderStatus(orderId, status) {
    const order = businessData.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      if (status === 'shipped') {
        order.shippedDate = new Date().toISOString();
      } else if (status === 'delivered') {
        order.deliveredDate = new Date().toISOString().split('T')[0];
      }
      return true;
    }
    return false;
  },

  // Get return requests by business
  getReturnRequestsByBusiness(businessId) {
    return businessData.returnRequests.filter(r => r.businessId === businessId);
  },

  // Get return request by ID
  getReturnRequestById(requestId) {
    return businessData.returnRequests.find(r => r.id === requestId);
  },

  // Update return request status
  updateReturnRequestStatus(requestId, status) {
    const request = businessData.returnRequests.find(r => r.id === requestId);
    if (request) {
      request.status = status;
      return true;
    }
    return false;
  },

  // Add product review
  addReview(reviewData) {
    const newReview = {
      id: businessData.reviews.length + 1,
      ...reviewData,
      createdAt: new Date().toISOString()
    };
    businessData.reviews.push(newReview);
    
    // Update order with review
    const order = businessData.orders.find(o => o.id === reviewData.orderId);
    if (order) {
      order.rating = reviewData.rating;
      order.review = reviewData.comment;
    }
    
    return newReview;
  },

  // Get reviews by product
  getReviewsByProduct(productId) {
    return businessData.reviews.filter(r => r.productId === productId);
  },

  // Create return request
  createReturnRequest(requestData) {
    const newRequest = {
      id: `RR${String(businessData.returnRequests.length + 1).padStart(3, '0')}`,
      ...requestData,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };
    businessData.returnRequests.push(newRequest);
    return newRequest;
  }
};
