# Nông Sản Sạch - Organic Marketplace

Trang web thương mại điện tử chuyên về nông sản hữu cơ và sản phẩm sạch.

## Tính năng

### Khách hàng
- 🏠 **Trang chủ**: Xem sản phẩm nổi bật, flash sale, danh mục
- 🔍 **Tìm kiếm**: Tìm kiếm nông sản theo từ khóa
- 📦 **Chi tiết sản phẩm**: Xem thông tin chi tiết, giá, đánh giá
- 🛒 **Giỏ hàng**: Thêm, xóa, cập nhật số lượng sản phẩm
- 💳 **Thanh toán**: Chọn phương thức thanh toán, nhập địa chỉ giao hàng
- 👤 **Đăng ký/Đăng nhập**: Tạo tài khoản và đăng nhập

### Doanh nghiệp/Người bán
- 📝 **Đăng ký bán hàng**: Đăng ký tài khoản bán hàng với thông tin doanh nghiệp
- ✅ **Chờ phê duyệt**: Tài khoản được quản trị viên phê duyệt
- 📊 **Quản lý sản phẩm**: Xem danh sách, thêm, sửa, xóa sản phẩm
- 📈 **Thống kê**: Xem doanh thu, sản phẩm bán chạy, đánh giá

### Quản trị viên
- 👥 **Phê duyệt tài khoản**: Phê duyệt hoặc từ chối đơn đăng ký bán hàng
- 📋 **Quản lý người dùng**: Xem và quản lý người dùng, người bán

## Cấu trúc dự án

```
nong-san-sach/
├── css/
│   └── style.css              # CSS chính
├── js/
│   ├── admin-approval.js      # Quản lý phê duyệt
│   ├── cart.js                # Giỏ hàng
│   ├── checkout.js            # Thanh toán
│   ├── data.js                # Dữ liệu mẫu
│   ├── home.js                # Trang chủ
│   ├── login.js               # Đăng nhập
│   ├── product.js             # Chi tiết sản phẩm
│   ├── product-management.js  # Quản lý sản phẩm
│   └── register.js            # Đăng ký
├── admin-approval.html        # Phê duyệt tài khoản
├── cart.html                  # Giỏ hàng
├── checkout.html              # Thanh toán
├── index.html                 # Trang chủ
├── login.html                 # Đăng nhập
├── product.html               # Chi tiết sản phẩm
├── product-add.html           # Thêm sản phẩm
├── product-management.html    # Danh sách sản phẩm
├── register.html              # Đăng ký khách hàng
├── register-business.html     # Đăng ký doanh nghiệp
├── statistics.html            # Thống kê
└── package.json              # Cấu hình npm

```

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd nong-san-sach
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Chạy server:
```bash
npm start
```

4. Mở trình duyệt và truy cập:
```
http://localhost:8080
```

## Tài khoản test

### Quản trị viên
- Email: `admin@nongsansach.vn`
- Mật khẩu: `admin123`

### Người dùng
- Email: `nguyen.van.a@gmail.com`
- Mật khẩu: `123456`

## Công nghệ sử dụng

- **HTML5**: Cấu trúc trang web
- **CSS3**: Styling và responsive design
- **JavaScript**: Logic và tương tác
- **LocalStorage**: Lưu trữ dữ liệu người dùng

## Màu sắc chính

- Primary Green: `#22C55E`
- Dark Green: `#16A34A`
- Orange: `#F7931E`
- Red: `#FF5722`
- Gray: `#F5F5F5`

## Cấu trúc dữ liệu

### User
```javascript
{
  id: number,
  fullName: string,
  email: string,
  phone: string,
  address: string,
  password: string,
  dateOfBirth: string,
  isVendor: boolean,
  createdAt: string
}
```

### Vendor
```javascript
{
  id: number,
  userId: number,
  fullName: string,
  email: string,
  phone: string,
  businessName: string,
  businessAddress: string,
  businessPhone: string,
  status: 'pending' | 'approved' | 'rejected',
  licenseImage: string,
  rejectReason?: string,
  createdAt: string
}
```

### Product
```javascript
{
  id: number,
  name: string,
  description: string,
  image: string,
  category: string,
  units: [
    {
      unit: string,
      price: number
    }
  ],
  rating: number,
  sold: number,
  certificate: string
}
```

## Tính năng nổi bật

- ✨ Giao diện hiện đại, thân thiện
- 📱 Responsive design - tương thích mọi thiết bị
- 🎨 Thiết kế dựa trên Figma
- 🔒 Xác thực người dùng
- 💾 Lưu trữ local với localStorage
- 🛡️ Giấy chứng nhận an toàn thực phẩm
- ⚡ Flash sale
- ⭐ Đánh giá sản phẩm
- 📊 Thống kê doanh thu

## Hướng dẫn sử dụng

### Khách hàng

1. **Đăng ký tài khoản**: Nhấn "Đăng Ký" ở góc phải trên cùng
2. **Duyệt sản phẩm**: Xem sản phẩm trên trang chủ hoặc tìm kiếm
3. **Thêm vào giỏ**: Chọn sản phẩm, chọn đơn vị và số lượng
4. **Thanh toán**: Vào giỏ hàng, nhập thông tin giao hàng và thanh toán

### Người bán

1. **Đăng ký bán hàng**: Chọn "Trở thành Người bán" hoặc tích "Đăng ký bán hàng" khi đăng ký
2. **Chờ phê duyệt**: Quản trị viên sẽ xem xét đơn đăng ký
3. **Quản lý sản phẩm**: Sau khi được phê duyệt, thêm và quản lý sản phẩm
4. **Xem thống kê**: Theo dõi doanh thu và hiệu quả kinh doanh

### Quản trị viên

1. **Đăng nhập**: Sử dụng tài khoản admin
2. **Phê duyệt**: Truy cập trang "Phê duyệt tài khoản"
3. **Xem xét**: Xem thông tin doanh nghiệp và giấy phép
4. **Quyết định**: Phê duyệt hoặc từ chối với lý do

## Liên hệ

- Website: https://nongsansach.vn
- Email: support@nongsansach.vn
- Hotline: 1900-xxxx

## License

MIT License - Copyright (c) 2024 Nông Sản Sạch
