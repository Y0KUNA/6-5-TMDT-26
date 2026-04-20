# 🚀 Quick Setup Guide

## Bắt đầu ngay trong 3 bước

### 1️⃣ Cài đặt

```bash
# Cài đặt dependencies
npm install

# Hoặc sử dụng yarn
yarn install
```

### 2️⃣ Chạy dự án

```bash
# Khởi động development server
npm start

# Server sẽ chạy tại http://localhost:8080
```

### 3️⃣ Đăng nhập và khám phá

Mở trình duyệt và truy cập: **http://localhost:8080**

## 🔑 Tài khoản test sẵn có

### 👤 Khách hàng
```
Email: nguyen.van.a@gmail.com
Password: 123456
```

### 👨‍💼 Admin
```
Email: admin@nongsansach.vn
Password: admin123
```

## 📋 Danh sách trang

- **Trang chủ**: `index.html` - Xem sản phẩm, flash sale
- **Đăng nhập**: `login.html` - Đăng nhập hệ thống
- **Đăng ký**: `register.html` - Đăng ký khách hàng hoặc doanh nghiệp
- **Sản phẩm**: `product.html?id=1` - Chi tiết sản phẩm
- **Giỏ hàng**: `cart.html` - Quản lý giỏ hàng
- **Thanh toán**: `checkout.html` - Thanh toán đơn hàng
- **Quản lý SP**: `product-management.html` - Dành cho người bán
- **Phê duyệt**: `admin-approval.html` - Dành cho admin

## 🎯 Luồng demo nhanh

### Mua hàng (2 phút)
1. Vào trang chủ → Click sản phẩm bất kỳ
2. Click "Thêm vào giỏ hàng"
3. Chọn đơn vị và số lượng → "Thêm vào giỏ"
4. Vào giỏ hàng → "Thanh toán"
5. Điền thông tin → "Xác nhận thanh toán"

### Đăng ký bán hàng (3 phút)
1. Vào trang đăng ký
2. Điền thông tin cá nhân
3. Tick "Đăng ký bán hàng"
4. Điền thông tin doanh nghiệp
5. Upload giấy phép → "Đăng ký"
6. Đăng nhập admin để phê duyệt

### Quản lý sản phẩm (2 phút)
1. Đăng nhập (sau khi được phê duyệt)
2. Tự động vào trang Quản lý sản phẩm
3. Tab "Thống Kê" - Xem doanh số
4. Tab "Thêm Sản Phẩm" - Thêm SP mới
5. Tab "Danh Sách" - Quản lý SP

## ⚡ Troubleshooting nhanh

**Lỗi: Cannot GET /**
```bash
# Đảm bảo bạn đang ở thư mục gốc của project
cd nong-san-sach
npm start
```

**Lỗi: Port 8080 đã được sử dụng**
```bash
# Dừng process đang chạy hoặc đổi port trong package.json
npx http-server -p 3000 -o
```

**Không thấy sản phẩm trong giỏ hàng**
```bash
# Đăng nhập trước khi thêm vào giỏ hàng
# Hoặc xóa localStorage và thử lại
```

## 🛠️ Cấu trúc file quan trọng

```
nong-san-sach/
├── index.html          → Trang chủ
├── css/style.css       → Toàn bộ styles
├── js/
│   ├── data.js        → Mock data (database giả lập)
│   ├── home.js        → Logic trang chủ
│   ├── cart.js        → Logic giỏ hàng
│   └── ...            → Các logic khác
└── package.json       → Config project
```

## 📱 Tính năng nổi bật

- ✅ Flash Sale với countdown timer
- ✅ Chọn nhiều đơn vị bán (kg, gói, thùng...)
- ✅ Giỏ hàng nhóm theo cửa hàng
- ✅ Thanh toán chuyển khoản hoặc COD
- ✅ Dashboard thống kê cho người bán
- ✅ Phê duyệt tài khoản bán hàng

## 💡 Tips

1. **Dùng Chrome DevTools** để xem localStorage (giỏ hàng, session)
2. **Refresh trang** nếu gặp lỗi hiển thị
3. **Xóa localStorage** nếu muốn reset giỏ hàng: `localStorage.clear()`
4. **Mock data** có thể chỉnh sửa trong `js/data.js`

## 🎨 Thiết kế

Dự án được thiết kế dựa trên Figma với:
- Primary color: `#22C55E` (Green)
- Font: Roboto
- Responsive: Desktop + Mobile
- Components: Card, Button, Form, Modal...

## 📚 Docs đầy đủ

Xem **README.md** để biết chi tiết về:
- Tất cả tính năng
- API functions
- Cấu trúc data
- Hướng dẫn phát triển thêm

---

**Chúc bạn code vui vẻ! 🌱✨**
