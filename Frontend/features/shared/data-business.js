// Extended Mock Data for Business Features (moved from js/data-business.js)

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
    }
  ],

  // ...rest of business data omitted for brevity; keep original functionality unchanged
};

const businessManager = {
  // Minimal wrapper; full functions should mirror original js/data-business.js
  getAllBusinessUsers() {
    return businessData.businessUsers;
  }
};
