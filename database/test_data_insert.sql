-- ============================================================
-- TEST DATA INSERTION - Nông Sản E-Commerce
-- Tạo dữ liệu đầy đủ cho test toàn bộ hệ thống
-- LƯU Ý: Chạy sau khi database_gen.sql đã tạo xong schema
-- ============================================================

-- ============================================================
-- 1. USERS & ROLES
-- ============================================================

-- Admin 1
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('admin', 'Trần Văn Admin', 'admin@nongsanecommerce.vn',
        '0900000000', encode(sha256('Admin@123456'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

-- Lấy admin_id từ email
DO $BLOCK$
DECLARE
    v_admin_id INT;
BEGIN
    SELECT user_id INTO v_admin_id FROM users WHERE email = 'admin@nongsanecommerce.vn';
    INSERT INTO admins (admin_id, admin_level)
    VALUES (v_admin_id, 1)
    ON CONFLICT (admin_id) DO NOTHING;
END
$BLOCK$;

-- ============================================================
-- 2. ENTERPRISES (5 doanh nghiệp)
-- ============================================================

-- Enterprise 1: Nông trại Xanh Sạch (Đà Lạt)
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('enterprise', 'Nguyễn Văn An', 'nvan@nongtrai-xanhsach.vn',
        '0901001001', encode(sha256('Enterprise@123'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'nvan@nongtrai-xanhsach.vn';
    INSERT INTO enterprises (enterprise_id, business_name, business_address, tax_code, is_approved)
    VALUES (v_eid, 'Nông trại Xanh Sạch', 'Đà Lạt, Lâm Đồng', '1111111111', TRUE)
    ON CONFLICT (tax_code) DO NOTHING;
    
    INSERT INTO business_profiles
        (enterprise_id, business_name, address, license_file, tax_code, status, reviewed_at)
    VALUES (v_eid, 'Nông trại Xanh Sạch', 'Đà Lạt, Lâm Đồng',
            '/uploads/licenses/farm_green.pdf', '1111111111', 'APPROVED', NOW())
    ON CONFLICT (enterprise_id) DO NOTHING;
END
$BLOCK$;

-- Enterprise 2: Vườn Tây Nguyên (Gia Lai)
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('enterprise', 'Trần Thị Bảo', 'ttbao@vuon-tay-nguyen.vn',
        '0901002002', encode(sha256('Enterprise@456'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'ttbao@vuon-tay-nguyen.vn';
    INSERT INTO enterprises (enterprise_id, business_name, business_address, tax_code, is_approved)
    VALUES (v_eid, 'Vườn Tây Nguyên', 'Pleiku, Gia Lai', '2222222222', TRUE)
    ON CONFLICT (tax_code) DO NOTHING;
    
    INSERT INTO business_profiles
        (enterprise_id, business_name, address, license_file, tax_code, status, reviewed_at)
    VALUES (v_eid, 'Vườn Tây Nguyên', 'Pleiku, Gia Lai',
            '/uploads/licenses/farm_tay_nguyen.pdf', '2222222222', 'APPROVED', NOW())
    ON CONFLICT (enterprise_id) DO NOTHING;
END
$BLOCK$;

-- Enterprise 3: Vùng Sâu Sông Tiền (Tiền Giang)
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('enterprise', 'Lê Văn Cương', 'lcuong@vung-sau-song-tien.vn',
        '0901003003', encode(sha256('Enterprise@789'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'lcuong@vung-sau-song-tien.vn';
    INSERT INTO enterprises (enterprise_id, business_name, business_address, tax_code, is_approved)
    VALUES (v_eid, 'Vùng Sâu Sông Tiền', 'Cái Bè, Tiền Giang', '3333333333', TRUE)
    ON CONFLICT (tax_code) DO NOTHING;
    
    INSERT INTO business_profiles
        (enterprise_id, business_name, address, license_file, tax_code, status, reviewed_at)
    VALUES (v_eid, 'Vùng Sâu Sông Tiền', 'Cái Bè, Tiền Giang',
            '/uploads/licenses/farm_song_tien.pdf', '3333333333', 'APPROVED', NOW())
    ON CONFLICT (enterprise_id) DO NOTHING;
END
$BLOCK$;

-- Enterprise 4: Trang trại Mekong Fresh (Cần Thơ)
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('enterprise', 'Phạm Minh Tuấn', 'ptuanm@mekong-fresh.vn',
        '0901004004', encode(sha256('Enterprise@111'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'ptuanm@mekong-fresh.vn';
    INSERT INTO enterprises (enterprise_id, business_name, business_address, tax_code, is_approved)
    VALUES (v_eid, 'Trang trại Mekong Fresh', 'Cần Thơ', '4444444444', TRUE)
    ON CONFLICT (tax_code) DO NOTHING;
    
    INSERT INTO business_profiles
        (enterprise_id, business_name, address, license_file, tax_code, status, reviewed_at)
    VALUES (v_eid, 'Trang trại Mekong Fresh', 'Cần Thơ',
            '/uploads/licenses/farm_mekong.pdf', '4444444444', 'APPROVED', NOW())
    ON CONFLICT (enterprise_id) DO NOTHING;
END
$BLOCK$;

-- Enterprise 5: Nông sản Bắc Giang Organic (Bắc Giang)
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('enterprise', 'Hoàng Quốc Khánh', 'khanh@bac-giang-organic.vn',
        '0901005005', encode(sha256('Enterprise@222'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'khanh@bac-giang-organic.vn';
    INSERT INTO enterprises (enterprise_id, business_name, business_address, tax_code, is_approved)
    VALUES (v_eid, 'Nông sản Bắc Giang Organic', 'Yên Thế, Bắc Giang', '5555555555', TRUE)
    ON CONFLICT (tax_code) DO NOTHING;
    
    INSERT INTO business_profiles
        (enterprise_id, business_name, address, license_file, tax_code, status, reviewed_at)
    VALUES (v_eid, 'Nông sản Bắc Giang Organic', 'Yên Thế, Bắc Giang',
            '/uploads/licenses/farm_bac_giang.pdf', '5555555555', 'APPROVED', NOW())
    ON CONFLICT (enterprise_id) DO NOTHING;
END
$BLOCK$;

-- ============================================================
-- 3. CUSTOMERS (8 khách hàng)
-- ============================================================

-- Customer 1
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('customer', 'Trần Thị Bình', 'ttbinh@gmail.com',
        '0987654321', encode(sha256('Customer@123'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_cid INT;
BEGIN
    SELECT user_id INTO v_cid FROM users WHERE email = 'ttbinh@gmail.com';
    INSERT INTO customers (customer_id, address)
    VALUES (v_cid, '123 Nguyễn Huệ, Q.1, TP.HCM')
    ON CONFLICT (customer_id) DO NOTHING;
    INSERT INTO carts (customer_id) VALUES (v_cid) ON CONFLICT (customer_id) DO NOTHING;
END
$BLOCK$;

-- Customer 2
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('customer', 'Lê Văn Cường', 'lcuong@gmail.com',
        '0912345678', encode(sha256('Customer@456'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_cid INT;
BEGIN
    SELECT user_id INTO v_cid FROM users WHERE email = 'lcuong@gmail.com';
    INSERT INTO customers (customer_id, address)
    VALUES (v_cid, '456 Lê Lợi, Q.3, TP.HCM')
    ON CONFLICT (customer_id) DO NOTHING;
    INSERT INTO carts (customer_id) VALUES (v_cid) ON CONFLICT (customer_id) DO NOTHING;
END
$BLOCK$;

-- Customer 3
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('customer', 'Ngô Thị Linh', 'linh.ngo@gmail.com',
        '0956789012', encode(sha256('Customer@789'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_cid INT;
BEGIN
    SELECT user_id INTO v_cid FROM users WHERE email = 'linh.ngo@gmail.com';
    INSERT INTO customers (customer_id, address)
    VALUES (v_cid, '789 Bùi Viện, Q.1, TP.HCM')
    ON CONFLICT (customer_id) DO NOTHING;
    INSERT INTO carts (customer_id) VALUES (v_cid) ON CONFLICT (customer_id) DO NOTHING;
END
$BLOCK$;

-- Customer 4
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('customer', 'Phan Minh Khôi', 'khoi.phan@gmail.com',
        '0945678901', encode(sha256('Customer@111'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_cid INT;
BEGIN
    SELECT user_id INTO v_cid FROM users WHERE email = 'khoi.phan@gmail.com';
    INSERT INTO customers (customer_id, address)
    VALUES (v_cid, '321 Võ Văn Tần, Q.3, TP.HCM')
    ON CONFLICT (customer_id) DO NOTHING;
    INSERT INTO carts (customer_id) VALUES (v_cid) ON CONFLICT (customer_id) DO NOTHING;
END
$BLOCK$;

-- Customer 5
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('customer', 'Vũ Thị Hương', 'huong.vu@gmail.com',
        '0934567890', encode(sha256('Customer@222'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_cid INT;
BEGIN
    SELECT user_id INTO v_cid FROM users WHERE email = 'huong.vu@gmail.com';
    INSERT INTO customers (customer_id, address)
    VALUES (v_cid, '654 Trần Hưng Đạo, Q.5, TP.HCM')
    ON CONFLICT (customer_id) DO NOTHING;
    INSERT INTO carts (customer_id) VALUES (v_cid) ON CONFLICT (customer_id) DO NOTHING;
END
$BLOCK$;

-- Customer 6
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('customer', 'Đặng Văn Tài', 'tai.dang@gmail.com',
        '0923456789', encode(sha256('Customer@333'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_cid INT;
BEGIN
    SELECT user_id INTO v_cid FROM users WHERE email = 'tai.dang@gmail.com';
    INSERT INTO customers (customer_id, address)
    VALUES (v_cid, '987 Nguyễn Thị Minh Khai, Q.2, TP.HCM')
    ON CONFLICT (customer_id) DO NOTHING;
    INSERT INTO carts (customer_id) VALUES (v_cid) ON CONFLICT (customer_id) DO NOTHING;
END
$BLOCK$;

-- Customer 7
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('customer', 'Tô Thị Anh', 'anh.to@gmail.com',
        '0912987654', encode(sha256('Customer@444'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_cid INT;
BEGIN
    SELECT user_id INTO v_cid FROM users WHERE email = 'anh.to@gmail.com';
    INSERT INTO customers (customer_id, address)
    VALUES (v_cid, '111 Cách Mạng Tháng Tám, Q.10, TP.HCM')
    ON CONFLICT (customer_id) DO NOTHING;
    INSERT INTO carts (customer_id) VALUES (v_cid) ON CONFLICT (customer_id) DO NOTHING;
END
$BLOCK$;

-- Customer 8
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('customer', 'Bùi Quang Huy', 'huy.bui@gmail.com',
        '0934123456', encode(sha256('Customer@555'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_cid INT;
BEGIN
    SELECT user_id INTO v_cid FROM users WHERE email = 'huy.bui@gmail.com';
    INSERT INTO customers (customer_id, address)
    VALUES (v_cid, '555 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM')
    ON CONFLICT (customer_id) DO NOTHING;
    INSERT INTO carts (customer_id) VALUES (v_cid) ON CONFLICT (customer_id) DO NOTHING;
END
$BLOCK$;

-- ============================================================
-- 4. SHIPPERS (4 giao hàng viên)
-- ============================================================

-- Shipper 1
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('shipper', 'Phạm Văn Dũng', 'dung.pham@ghn.vn',
        '0933333333', encode(sha256('Shipper@123'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_shid INT;
BEGIN
    SELECT user_id INTO v_shid FROM users WHERE email = 'dung.pham@ghn.vn';
    IF v_shid IS NOT NULL THEN
        DELETE FROM shippers WHERE shipper_code = 'GHN-001';
        INSERT INTO shippers (shipper_id, shipper_code, company)
        VALUES (v_shid, 'GHN-001', 'Giao Hàng Nhanh');
    END IF;
END
$BLOCK$;

-- Shipper 2
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('shipper', 'Hoàng Minh Tuấn', 'tuan.hoang@giao.vn',
        '0944444444', encode(sha256('Shipper@456'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_shid INT;
BEGIN
    SELECT user_id INTO v_shid FROM users WHERE email = 'tuan.hoang@giao.vn';
    IF v_shid IS NOT NULL THEN
        DELETE FROM shippers WHERE shipper_code = 'JT-001';
        INSERT INTO shippers (shipper_id, shipper_code, company)
        VALUES (v_shid, 'JT-001', 'Jang Trang');
    END IF;
END
$BLOCK$;

-- Shipper 3
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('shipper', 'Cao Văn Hòa', 'hoa.cao@aloship.vn',
        '0955555555', encode(sha256('Shipper@789'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_shid INT;
BEGIN
    SELECT user_id INTO v_shid FROM users WHERE email = 'hoa.cao@aloship.vn';
    IF v_shid IS NOT NULL THEN
        DELETE FROM shippers WHERE shipper_code = 'ALS-001';
        INSERT INTO shippers (shipper_id, shipper_code, company)
        VALUES (v_shid, 'ALS-001', 'Alo Ship');
    END IF;
END
$BLOCK$;

-- Shipper 4
INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
VALUES ('shipper', 'Võ Quốc Thắng', 'thang.vo@best.vn',
        '0966666666', encode(sha256('Shipper@111'::bytea), 'hex'), TRUE)
ON CONFLICT (email) DO NOTHING;

DO $BLOCK$
DECLARE
    v_shid INT;
BEGIN
    SELECT user_id INTO v_shid FROM users WHERE email = 'thang.vo@best.vn';
    IF v_shid IS NOT NULL THEN
        DELETE FROM shippers WHERE shipper_code = 'BEST-001';
        INSERT INTO shippers (shipper_id, shipper_code, company)
        VALUES (v_shid, 'BEST-001', 'BEST Express');
    END IF;
END
$BLOCK$;

-- ============================================================
-- 5. PRODUCTS (24 sản phẩm - 5 doanh nghiệp x 5 sản phẩm mỗi cái)
-- ============================================================

-- Categories đã có từ database_gen.sql, không cần insert lại

-- Enterprise 1 - Nông trại Xanh Sạch: 5 sản phẩm
DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'nvan@nongtrai-xanhsach.vn';
    
    INSERT INTO products
        (enterprise_id, category_id, name, description, price, unit, stock_quantity, origin, certification, expired_date, status)
    VALUES
        (v_eid, 5, 'Rau muống hữu cơ', 'Rau muống trồng theo phương pháp hữu cơ, không thuốc trừ sâu', 15000, 'bó', 200, 'Đà Lạt', 'VietGAP', CURRENT_DATE + INTERVAL '7 days', 'ON_SALE'),
        (v_eid, 6, 'Cà rốt Đà Lạt', 'Cà rốt tươi trồng tại Đà Lạt, ngọt tự nhiên', 25000, 'kg', 500, 'Đà Lạt', 'VietGAP', CURRENT_DATE + INTERVAL '14 days', 'ON_SALE'),
        (v_eid, 5, 'Bắp cải tím', 'Bắp cải tím Đà Lạt, giàu chất chống oxy hóa', 18000, 'kg', 300, 'Đà Lạt', 'VietGAP', CURRENT_DATE + INTERVAL '10 days', 'ON_SALE'),
        (v_eid, 5, 'Cải bắp cải', 'Cải bắp tươi, giòn, ngon', 12000, 'kg', 400, 'Đà Lạt', NULL, CURRENT_DATE + INTERVAL '8 days', 'ON_SALE'),
        (v_eid, 6, 'Ớt xanh Đà Lạt', 'Ớt xanh tươi, cay đúng độ', 20000, 'kg', 250, 'Đà Lạt', 'VietGAP', CURRENT_DATE + INTERVAL '12 days', 'ON_SALE')
    ON CONFLICT DO NOTHING;
END
$BLOCK$;

-- Enterprise 2 - Vườn Tây Nguyên: 5 sản phẩm
DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'ttbao@vuon-tay-nguyen.vn';
    
    INSERT INTO products
        (enterprise_id, category_id, name, description, price, unit, stock_quantity, origin, certification, expired_date, status)
    VALUES
        (v_eid, 7, 'Xoài cát Hòa Lộc', 'Xoài cát Hòa Lộc đặc sản Tiền Giang, vị ngọt thơm', 65000, 'kg', 150, 'Tiền Giang', 'GlobalGAP', CURRENT_DATE + INTERVAL '10 days', 'ON_SALE'),
        (v_eid, 7, 'Chuối vàng Cavendish', 'Chuối vàng Cavendish, ngọt, mềm', 18000, 'kg', 400, 'Gia Lai', 'VietGAP', CURRENT_DATE + INTERVAL '5 days', 'ON_SALE'),
        (v_eid, 7, 'Dâu tây Đà Lạt', 'Dâu tây Đà Lạt, tươi, nguyên vị', 80000, 'kg', 80, 'Đà Lạt', 'GlobalGAP', CURRENT_DATE + INTERVAL '3 days', 'ON_SALE'),
        (v_eid, 7, 'Vải thiều Lục Ngạn', 'Vải thiều Lục Ngạn, ngọt, nước nhiều', 55000, 'kg', 200, 'Bắc Giang', 'VietGAP', CURRENT_DATE + INTERVAL '6 days', 'ON_SALE'),
        (v_eid, 7, 'Nhãn Hương Chi', 'Nhãn Hương Chi, thơm lừng, vị ngon', 45000, 'kg', 180, 'Hưng Yên', 'VietGAP', CURRENT_DATE + INTERVAL '8 days', 'ON_SALE')
    ON CONFLICT DO NOTHING;
END
$BLOCK$;

-- Enterprise 3 - Vùng Sâu Sông Tiền: 5 sản phẩm
DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'lcuong@vung-sau-song-tien.vn';
    
    INSERT INTO products
        (enterprise_id, category_id, name, description, price, unit, stock_quantity, origin, certification, expired_date, status)
    VALUES
        (v_eid, 3, 'Gạo ST25', 'Gạo ST25 đạt giải gạo ngon nhất thế giới', 35000, 'kg', 1000, 'Sóc Trăng', NULL, CURRENT_DATE + INTERVAL '180 days', 'ON_SALE'),
        (v_eid, 3, 'Gạo Nàng Hương', 'Gạo Nàng Hương, thơm, dẻo', 38000, 'kg', 800, 'An Giang', 'VietGAP', CURRENT_DATE + INTERVAL '180 days', 'ON_SALE'),
        (v_eid, 3, 'Lúa mỡ', 'Lúa mỡ Cà Mau, dẻo, ngon', 22000, 'kg', 600, 'Cà Mau', NULL, CURRENT_DATE + INTERVAL '160 days', 'ON_SALE'),
        (v_eid, 3, 'Đậu tương Mỹ', 'Đậu tương nhập khẩu từ Mỹ', 28000, 'kg', 400, 'Mỹ', NULL, CURRENT_DATE + INTERVAL '200 days', 'ON_SALE'),
        (v_eid, 3, 'Ngô vàng tươi', 'Ngô vàng tươi, ngữu, ngọt', 16000, 'bắp', 500, 'Cần Thơ', NULL, CURRENT_DATE + INTERVAL '5 days', 'ON_SALE')
    ON CONFLICT DO NOTHING;
END
$BLOCK$;

-- Enterprise 4 - Trang trại Mekong Fresh: 5 sản phẩm
DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'ptuanm@mekong-fresh.vn';
    
    INSERT INTO products
        (enterprise_id, category_id, name, description, price, unit, stock_quantity, origin, certification, expired_date, status)
    VALUES
        (v_eid, 5, 'Rau cải xoăn hữu cơ', 'Rau cải xoăn trồng hữu cơ, tươi ngon', 22000, 'kg', 250, 'Cần Thơ', 'GlobalGAP', CURRENT_DATE + INTERVAL '5 days', 'ON_SALE'),
        (v_eid, 6, 'Khoai tây đỏ', 'Khoai tây đỏ, béo, phù hợp nấu các món', 32000, 'kg', 350, 'Cần Thơ', 'VietGAP', CURRENT_DATE + INTERVAL '30 days', 'ON_SALE'),
        (v_eid, 5, 'Hành tây tím', 'Hành tây tím, hương vị đặc biệt', 19000, 'kg', 300, 'Cần Thơ', NULL, CURRENT_DATE + INTERVAL '45 days', 'ON_SALE'),
        (v_eid, 6, 'Bí đỏ Mỹ', 'Bí đỏ Mỹ, dẻo, ngọt, bổ dưỡng', 28000, 'kg', 200, 'Cần Thơ', 'VietGAP', CURRENT_DATE + INTERVAL '60 days', 'ON_SALE'),
        (v_eid, 5, 'Tỏi tím Bắc Hà', 'Tỏi tím Bắc Hà, mùi thơm đặc biệt', 85000, 'kg', 100, 'Lào Cai', 'VietGAP', CURRENT_DATE + INTERVAL '90 days', 'ON_SALE')
    ON CONFLICT DO NOTHING;
END
$BLOCK$;

-- Enterprise 5 - Nông sản Bắc Giang Organic: 5 sản phẩm
DO $BLOCK$
DECLARE
    v_eid INT;
BEGIN
    SELECT user_id INTO v_eid FROM users WHERE email = 'khanh@bac-giang-organic.vn';
    
    INSERT INTO products
        (enterprise_id, category_id, name, description, price, unit, stock_quantity, origin, certification, expired_date, status)
    VALUES
        (v_eid, 8, 'Cam Canh Bắc Giang', 'Cam Canh Bắc Giang, vỏ dày, nước ngọt, hạt ít', 45000, 'kg', 400, 'Bắc Giang', 'GlobalGAP', CURRENT_DATE + INTERVAL '20 days', 'ON_SALE'),
        (v_eid, 8, 'Quýt không hạt', 'Quýt không hạt, vỏ mỏng, nước nhiều', 50000, 'kg', 300, 'Bắc Giang', 'VietGAP', CURRENT_DATE + INTERVAL '15 days', 'ON_SALE'),
        (v_eid, 8, 'Bưởi diễn Phúc Trạch', 'Bưởi diễn Phúc Trạch, thịt dày, nước ngọt', 55000, 'kg', 250, 'Bắc Giang', 'GlobalGAP', CURRENT_DATE + INTERVAL '25 days', 'ON_SALE'),
        (v_eid, 4, 'Lá lô hội', 'Lá lô hội tươi, tốt cho sức khỏe', 35000, 'kg', 150, 'Bắc Giang', 'VietGAP', CURRENT_DATE + INTERVAL '10 days', 'ON_SALE'),
        (v_eid, 4, 'Thảo dược Bắc Giang', 'Bộ thảo dược chữa bệnh theo phương Đông', 120000, 'bộ', 50, 'Bắc Giang', 'GlobalGAP', CURRENT_DATE + INTERVAL '365 days', 'ON_SALE')
    ON CONFLICT DO NOTHING;
END
$BLOCK$;

-- ============================================================
-- 6. PRODUCT IMAGES
-- ============================================================

-- Thêm ảnh cho các sản phẩm (mỗi sản phẩm 2-3 ảnh)
INSERT INTO product_images (product_id, image_url, is_primary)
SELECT product_id, '/uploads/products/default_' || product_id || '.jpg', TRUE
FROM products WHERE product_id > 0
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, image_url, is_primary)
SELECT product_id, '/uploads/products/alt_' || product_id || '.jpg', FALSE
FROM products WHERE product_id > 0
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. CART ITEMS (thêm sản phẩm vào giỏ hàng)
-- ============================================================

DO $BLOCK$
DECLARE
    v_cid INT;
    v_cart_id INT;
    v_products RECORD;
    v_product_count INT := 0;
BEGIN
    -- Customer 1 thêm 3 sản phẩm vào giỏ
    SELECT user_id INTO v_cid FROM users WHERE email = 'ttbinh@gmail.com';
    SELECT cart_id INTO v_cart_id FROM carts WHERE customer_id = v_cid;
    
    FOR v_products IN 
        SELECT product_id, price, unit FROM products LIMIT 3 OFFSET 0
    LOOP
        INSERT INTO cart_items (cart_id, product_id, unit, quantity, unit_price, subtotal)
        VALUES (v_cart_id, v_products.product_id, v_products.unit, 2, v_products.price, v_products.price * 2)
        ON CONFLICT DO NOTHING;
        v_product_count := v_product_count + 1;
    END LOOP;
    
    -- Customer 2 thêm 2 sản phẩm vào giỏ
    SELECT user_id INTO v_cid FROM users WHERE email = 'lcuong@gmail.com';
    SELECT cart_id INTO v_cart_id FROM carts WHERE customer_id = v_cid;
    
    v_product_count := 0;
    FOR v_products IN 
        SELECT product_id, price, unit FROM products LIMIT 2 OFFSET 3
    LOOP
        INSERT INTO cart_items (cart_id, product_id, unit, quantity, unit_price, subtotal)
        VALUES (v_cart_id, v_products.product_id, v_products.unit, 1, v_products.price, v_products.price)
        ON CONFLICT DO NOTHING;
        v_product_count := v_product_count + 1;
    END LOOP;
END
$BLOCK$;

-- ============================================================
-- 8. ORDERS (10 đơn hàng với các trạng thái khác nhau)
-- ============================================================

DO $BLOCK$
DECLARE
    v_cid INT;
    v_eid INT;
    v_order_id INT;
    v_items RECORD;
    v_total DECIMAL(10,2);
    v_ship_id INT;
    v_pay_id INT;
BEGIN
    -- Order 1: Customer 1 -> Enterprise 1 (COMPLETED - đã giao)
    SELECT user_id INTO v_cid FROM users WHERE email = 'ttbinh@gmail.com';
    SELECT user_id INTO v_eid FROM users WHERE email = 'nvan@nongtrai-xanhsach.vn';
    
    INSERT INTO orders (customer_id, enterprise_id, status, total_amount, shipping_fee, shipping_address, payment_status, payment_method)
    VALUES (v_cid, v_eid, 'COMPLETED', 155000, 30000, '123 Nguyễn Huệ, Q.1, TP.HCM', 'PAID', 'ONLINE')
    RETURNING order_id INTO v_order_id;
    
    -- Order items
    INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, subtotal)
    SELECT v_order_id, product_id, name, unit, 2, price, price * 2 FROM products WHERE enterprise_id = v_eid LIMIT 3;
    
    -- Payment
    INSERT INTO payments (order_id, amount, method, status, transaction_code, gateway_name, paid_at)
    VALUES (v_order_id, 155000 + 30000, 'ONLINE', 'SUCCESS', 'TXN-20260501-001', 'VNPay', NOW());
    
    -- Shipment
    INSERT INTO shipments (order_id, shipper_id, tracking_code, status, estimated_delivery, delivered_at)
    SELECT v_order_id, user_id, 'GHN-20260501-001', 'DELIVERED', CURRENT_DATE - INTERVAL '2 days', NOW()
    FROM users WHERE email = 'dung.pham@ghn.vn';
    
    -- Order 2: Customer 2 -> Enterprise 2 (SHIPPING - đang giao)
    SELECT user_id INTO v_cid FROM users WHERE email = 'lcuong@gmail.com';
    SELECT user_id INTO v_eid FROM users WHERE email = 'ttbao@vuon-tay-nguyen.vn';
    
    INSERT INTO orders (customer_id, enterprise_id, status, total_amount, shipping_fee, shipping_address, payment_status, payment_method)
    VALUES (v_cid, v_eid, 'SHIPPING', 230000, 25000, '456 Lê Lợi, Q.3, TP.HCM', 'PAID', 'ONLINE')
    RETURNING order_id INTO v_order_id;
    
    INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, subtotal)
    SELECT v_order_id, product_id, name, unit, 1, price, price FROM products WHERE enterprise_id = v_eid LIMIT 4;
    
    INSERT INTO payments (order_id, amount, method, status, transaction_code, gateway_name, paid_at)
    VALUES (v_order_id, 230000 + 25000, 'ONLINE', 'SUCCESS', 'TXN-20260501-002', 'VNPay', NOW());
    
    INSERT INTO shipments (order_id, shipper_id, tracking_code, status, estimated_delivery, delivered_at)
    SELECT v_order_id, user_id, 'JT-20260501-001', 'DELIVERING', CURRENT_DATE + INTERVAL '1 day', NULL
    FROM users WHERE email = 'tuan.hoang@giao.vn';
    
    -- Order 3: Customer 3 -> Enterprise 3 (PREPARING - đang chuẩn bị)
    SELECT user_id INTO v_cid FROM users WHERE email = 'linh.ngo@gmail.com';
    SELECT user_id INTO v_eid FROM users WHERE email = 'lcuong@vung-sau-song-tien.vn';
    
    INSERT INTO orders (customer_id, enterprise_id, status, total_amount, shipping_fee, shipping_address, payment_status, payment_method)
    VALUES (v_cid, v_eid, 'PREPARING', 120000, 20000, '789 Bùi Viện, Q.1, TP.HCM', 'PAID', 'ONLINE')
    RETURNING order_id INTO v_order_id;
    
    INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, subtotal)
    SELECT v_order_id, product_id, name, unit, 1, price, price FROM products WHERE enterprise_id = v_eid LIMIT 2;
    
    INSERT INTO payments (order_id, amount, method, status, transaction_code, gateway_name, paid_at)
    VALUES (v_order_id, 120000 + 20000, 'ONLINE', 'SUCCESS', 'TXN-20260501-003', 'VNPay', NOW());
    
    -- Order 4: Customer 4 -> Enterprise 4 (PENDING - chờ xác nhận)
    SELECT user_id INTO v_cid FROM users WHERE email = 'khoi.phan@gmail.com';
    SELECT user_id INTO v_eid FROM users WHERE email = 'ptuanm@mekong-fresh.vn';
    
    INSERT INTO orders (customer_id, enterprise_id, status, total_amount, shipping_fee, shipping_address, payment_status, payment_method)
    VALUES (v_cid, v_eid, 'PENDING', 95000, 15000, '321 Võ Văn Tần, Q.3, TP.HCM', 'PAID', 'ONLINE')
    RETURNING order_id INTO v_order_id;
    
    INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, subtotal)
    SELECT v_order_id, product_id, name, unit, 2, price, price * 2 FROM products WHERE enterprise_id = v_eid LIMIT 2;
    
    INSERT INTO payments (order_id, amount, method, status, transaction_code, gateway_name, paid_at)
    VALUES (v_order_id, 95000 + 15000, 'ONLINE', 'SUCCESS', 'TXN-20260501-004', 'VNPay', NOW());
    
    -- Order 5: Customer 5 -> Enterprise 5 (COMPLETED - để test review)
    SELECT user_id INTO v_cid FROM users WHERE email = 'huong.vu@gmail.com';
    SELECT user_id INTO v_eid FROM users WHERE email = 'khanh@bac-giang-organic.vn';
    
    INSERT INTO orders (customer_id, enterprise_id, status, total_amount, shipping_fee, shipping_address, payment_status, payment_method)
    VALUES (v_cid, v_eid, 'COMPLETED', 180000, 25000, '654 Trần Hưng Đạo, Q.5, TP.HCM', 'PAID', 'ONLINE')
    RETURNING order_id INTO v_order_id;
    
    INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, subtotal)
    SELECT v_order_id, product_id, name, unit, 1, price, price FROM products WHERE enterprise_id = v_eid LIMIT 3;
    
    INSERT INTO payments (order_id, amount, method, status, transaction_code, gateway_name, paid_at)
    VALUES (v_order_id, 180000 + 25000, 'ONLINE', 'SUCCESS', 'TXN-20260501-005', 'VNPay', NOW());
    
    INSERT INTO shipments (order_id, shipper_id, tracking_code, status, estimated_delivery, delivered_at)
    SELECT v_order_id, user_id, 'ALS-20260501-001', 'DELIVERED', CURRENT_DATE - INTERVAL '5 days', NOW() - INTERVAL '3 days'
    FROM users WHERE email = 'hoa.cao@aloship.vn';
    
    -- Order 6-10: Thêm 5 đơn khác cho các khách hàng còn lại
    SELECT user_id INTO v_cid FROM users WHERE email = 'tai.dang@gmail.com';
    SELECT user_id INTO v_eid FROM users WHERE email = 'nvan@nongtrai-xanhsach.vn';
    INSERT INTO orders (customer_id, enterprise_id, status, total_amount, shipping_fee, shipping_address, payment_status, payment_method)
    VALUES (v_cid, v_eid, 'COMPLETED', 75000, 15000, '987 Nguyễn Thị Minh Khai, Q.2, TP.HCM', 'PAID', 'ONLINE')
    RETURNING order_id INTO v_order_id;
    INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, subtotal)
    SELECT v_order_id, product_id, name, unit, 1, price, price FROM products WHERE enterprise_id = v_eid LIMIT 1;
    INSERT INTO payments (order_id, amount, method, status, transaction_code, gateway_name, paid_at)
    VALUES (v_order_id, 75000 + 15000, 'ONLINE', 'SUCCESS', 'TXN-20260501-006', 'VNPay', NOW());
    INSERT INTO shipments (order_id, shipper_id, tracking_code, status, estimated_delivery, delivered_at)
    SELECT v_order_id, user_id, 'GHN-20260501-002', 'DELIVERED', CURRENT_DATE - INTERVAL '1 day', NOW()
    FROM users WHERE email = 'dung.pham@ghn.vn';
    
END
$BLOCK$;

-- ============================================================
-- 9. REVIEWS (đánh giá sản phẩm)
-- ============================================================

DO $BLOCK$
DECLARE
    v_review_id INT;
BEGIN
    -- Customer 1 đánh giá Order 1
    INSERT INTO reviews (customer_id, order_item_id, product_id, stars, comment, is_approved)
    SELECT c.customer_id, oi.order_item_id, oi.product_id, 5,
           'Sản phẩm rất tươi, giao hàng nhanh, lần sau sẽ mua tiếp!', TRUE
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.customer_id = (SELECT user_id FROM users WHERE email = 'ttbinh@gmail.com')
    LIMIT 1
    RETURNING review_id INTO v_review_id;
    
    -- Reply từ Enterprise 1
    INSERT INTO review_replies (review_id, enterprise_id, content)
    SELECT v_review_id, o.enterprise_id, 'Cảm ơn bạn đã tin tưởng chúng tôi! Chúng tôi sẽ tiếp tục cải thiện chất lượng phục vụ.'
    FROM orders o
    WHERE o.order_id IN (SELECT order_id FROM order_items WHERE order_item_id IN 
        (SELECT order_item_id FROM reviews WHERE review_id = v_review_id));
    
    -- Customer 2 đánh giá
    INSERT INTO reviews (customer_id, order_item_id, product_id, stars, comment, is_approved)
    SELECT c.customer_id, oi.order_item_id, oi.product_id, 4,
           'Chất lượng tốt, đóng gói cẩn thận, đáng để mua lại.', TRUE
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.customer_id = (SELECT user_id FROM users WHERE email = 'lcuong@gmail.com')
    LIMIT 1;
    
    -- Customer 5 đánh giá Order 5
    INSERT INTO reviews (customer_id, order_item_id, product_id, stars, comment, is_approved)
    SELECT c.customer_id, oi.order_item_id, oi.product_id, 5,
           'Hoa quả ngon lắm, rất hài lòng với chất lượng!', TRUE
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    JOIN customers c ON c.customer_id = o.customer_id
    WHERE c.customer_id = (SELECT user_id FROM users WHERE email = 'huong.vu@gmail.com')
    LIMIT 1;
    
END
$BLOCK$;

-- ============================================================
-- 10. RETURN REQUESTS (yêu cầu đổi/trả)
-- ============================================================

DO $BLOCK$
DECLARE
    v_order_id INT;
    v_customer_id INT;
    v_enterprise_id INT;
BEGIN
    -- Tạo return request cho Order 2
    SELECT o.order_id, o.customer_id, o.enterprise_id
    INTO v_order_id, v_customer_id, v_enterprise_id
    FROM orders o
    WHERE o.customer_id = (SELECT user_id FROM users WHERE email = 'lcuong@gmail.com')
    AND o.order_id IN (SELECT order_id FROM orders WHERE status = 'SHIPPING')
    LIMIT 1;
    
    IF v_order_id IS NOT NULL THEN
        INSERT INTO return_requests (customer_id, order_id, enterprise_id, type, reason, status)
        VALUES (v_customer_id, v_order_id, v_enterprise_id, 'EXCHANGE', 'Sản phẩm không đúng loại, xin đổi', 'PENDING')
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Tạo return request khác với status APPROVED
    SELECT o.order_id, o.customer_id, o.enterprise_id
    INTO v_order_id, v_customer_id, v_enterprise_id
    FROM orders o
    WHERE o.status = 'COMPLETED'
    AND o.customer_id = (SELECT user_id FROM users WHERE email = 'tai.dang@gmail.com')
    LIMIT 1;
    
    IF v_order_id IS NOT NULL THEN
        INSERT INTO return_requests (customer_id, order_id, enterprise_id, type, reason, status, resolved_at)
        VALUES (v_customer_id, v_order_id, v_enterprise_id, 'REFUND', 'Sản phẩm hư, xin hoàn tiền', 'APPROVED', NOW())
        ON CONFLICT DO NOTHING;
    END IF;
    
END
$BLOCK$;

-- ============================================================
-- 11. SALES & SALE_EVENTS (khuyến mãi)
-- ============================================================

DO $BLOCK$
DECLARE
    v_sale_id INT;
    v_eid INT;
BEGIN
    -- Sale 1: Enterprise 1
    SELECT user_id INTO v_eid FROM users WHERE email = 'nvan@nongtrai-xanhsach.vn';
    INSERT INTO sales (enterprise_id, name, discount_percent, start_date, end_date, status)
    VALUES (v_eid, 'Giảm giá Hè 2026', 15.00, NOW(), NOW() + INTERVAL '30 days', 'ACTIVE')
    RETURNING sale_id INTO v_sale_id;
    
    INSERT INTO sale_events (sale_id, product_id, applied_price, applied_quantity)
    SELECT v_sale_id, p.product_id, CAST(p.price * 0.85 AS DECIMAL(10,2)), 100
    FROM products p WHERE p.enterprise_id = v_eid LIMIT 3;
    
    -- Sale 2: Enterprise 2
    SELECT user_id INTO v_eid FROM users WHERE email = 'ttbao@vuon-tay-nguyen.vn';
    INSERT INTO sales (enterprise_id, name, discount_percent, start_date, end_date, status)
    VALUES (v_eid, 'Flash Sale Trái cây', 20.00, NOW(), NOW() + INTERVAL '7 days', 'ACTIVE')
    RETURNING sale_id INTO v_sale_id;
    
    INSERT INTO sale_events (sale_id, product_id, applied_price, applied_quantity)
    SELECT v_sale_id, p.product_id, CAST(p.price * 0.80 AS DECIMAL(10,2)), 50
    FROM products p WHERE p.enterprise_id = v_eid LIMIT 2;
    
END
$BLOCK$;

-- ============================================================
-- 12. VERIFY TOKENS (xác thực email, reset mật khẩu)
-- ============================================================

INSERT INTO verify_tokens (user_id, token, type, expired_at)
SELECT user_id, 'token_verify_' || user_id || '_' || EXTRACT(EPOCH FROM NOW())::INT, 'email_verify', NOW() + INTERVAL '24 hours'
FROM users WHERE is_active = FALSE
LIMIT 3;

INSERT INTO verify_tokens (user_id, token, type, expired_at)
SELECT user_id, 'token_reset_' || user_id || '_' || EXTRACT(EPOCH FROM NOW())::INT, 'password_reset', NOW() + INTERVAL '30 minutes'
FROM users WHERE role = 'customer'
LIMIT 2;

-- ============================================================
-- 13. SESSIONS (phiên đăng nhập)
-- ============================================================

INSERT INTO sessions (user_id, token, expired_at)
SELECT user_id, 'session_' || user_id || '_' || EXTRACT(EPOCH FROM NOW())::INT, NOW() + INTERVAL '24 hours'
FROM users WHERE is_active = TRUE
LIMIT 8;

-- ============================================================
-- 14. NOTIFICATIONS (thông báo)
-- ============================================================

INSERT INTO notifications (user_id, title, content, type, is_read)
VALUES
    ((SELECT user_id FROM users WHERE email = 'ttbinh@gmail.com'), 
     'Đơn hàng giao thành công', 
     'Đơn hàng #1 của bạn đã được giao. Vui lòng xác nhận nhận hàng.', 
     'ORDER', FALSE),
    ((SELECT user_id FROM users WHERE email = 'ttbinh@gmail.com'), 
     'Đánh giá sản phẩm', 
     'Bạn có thể đánh giá sản phẩm từ đơn hàng #1 ngay bây giờ.', 
     'REVIEW', FALSE),
    ((SELECT user_id FROM users WHERE email = 'lcuong@gmail.com'), 
     'Đơn hàng đang giao', 
     'Đơn hàng #2 của bạn đang được giao. Kiểm tra trạng thái tại đây.', 
     'ORDER', FALSE),
    ((SELECT user_id FROM users WHERE email = 'nvan@nongtrai-xanhsach.vn'), 
     'Đơn hàng mới', 
     'Bạn có 2 đơn hàng mới cần xử lý.', 
     'ORDER', FALSE),
    ((SELECT user_id FROM users WHERE email = 'nvan@nongtrai-xanhsach.vn'), 
     'Đánh giá mới từ khách', 
     'Trần Thị Bình vừa đánh giá 5 sao cho sản phẩm "Rau muống hữu cơ".', 
     'REVIEW', FALSE),
    ((SELECT user_id FROM users WHERE email = 'dung.pham@ghn.vn'), 
     'Đơn hàng chờ lấy', 
     'Bạn có 1 đơn hàng chờ lấy tại kho.', 
     'ORDER', FALSE),
    ((SELECT user_id FROM users WHERE email = 'admin@nongsanecommerce.vn'), 
     'Yêu cầu duyệt khuyến mãi', 
     'Nông trại Xanh Sạch vừa gửi khuyến mãi cần phê duyệt.', 
     'PROMOTION', FALSE),
    ((SELECT user_id FROM users WHERE email = 'admin@nongsanecommerce.vn'), 
     'Khuyến mãi mới từ doanh nghiệp', 
     'Vườn Tây Nguyên có khuyến mãi mới cần kiểm tra.', 
     'PROMOTION', FALSE);

-- ============================================================
-- 15. REVENUE_REPORTS (báo cáo doanh thu - tùy chọn)
-- ============================================================

INSERT INTO revenue_reports (enterprise_id, total_revenue, total_profit, total_orders, start_date, end_date, generated_at)
SELECT 
    o.enterprise_id,
    COALESCE(SUM(o.total_amount), 0),
    COALESCE(SUM(o.total_amount) * 0.8, 0),
    COUNT(o.order_id),
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    NOW()
FROM orders o
WHERE o.status = 'COMPLETED'
GROUP BY o.enterprise_id
ON CONFLICT DO NOTHING;

-- ============================================================
-- 16. AUDIT_LOGS (ghi nhật ký hành động)
-- ============================================================

INSERT INTO audit_logs (admin_id, action, target_id, reason, timestamp)
SELECT
    a.admin_id,
    'APPROVE_BUSINESS',
    CAST(bp.enterprise_id AS VARCHAR),
    'Phê duyệt hồ sơ kinh doanh',
    NOW() - INTERVAL '5 days'
FROM admins a
JOIN business_profiles bp ON bp.status = 'APPROVED'
LIMIT 3;

-- ============================================================
-- SUMMARY
-- ============================================================
SELECT 'Data insertion completed!' AS status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_orders FROM orders;
SELECT COUNT(*) as total_reviews FROM reviews;
SELECT COUNT(*) as total_shipments FROM shipments;
SELECT COUNT(*) as total_notifications FROM notifications;

-- ============================================================
-- END OF TEST DATA
-- ============================================================
