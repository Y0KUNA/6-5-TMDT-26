-- ============================================================
-- DỮ LIỆU MẪU  (sample data)
-- ============================================================

-- ── Danh mục ──────────────────────────────────────────────
INSERT INTO categories (name, description) VALUES
    ('Rau củ',        'Các loại rau củ tươi'),
    ('Trái cây',      'Các loại trái cây tươi'),
    ('Gạo & Ngũ cốc', 'Gạo, ngô, đậu...'),
    ('Thảo mộc',      'Các loại thảo mộc, gia vị');

INSERT INTO categories (parent_id, name, description) VALUES
    (1, 'Rau lá',               'Rau muống, rau cải, mùng tơi...'),
    (1, 'Củ quả',               'Cà rốt, khoai tây, bí đỏ...'),
    (2, 'Trái cây nhiệt đới',   'Xoài, vải, nhãn, bơ...'),
    (2, 'Trái cây múi',         'Cam, bưởi, quýt...');

-- ── Admin ─────────────────────────────────────────────────
DO $$
DECLARE
    v_admin_id INT;
BEGIN
    INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
    VALUES ('admin', 'Quản trị viên', 'admin@nongsanecommerce.vn',
            '0900000000', encode(sha256('Admin@123456'::bytea), 'hex'), TRUE)
    RETURNING user_id INTO v_admin_id;

    INSERT INTO admins (admin_id, admin_level) VALUES (v_admin_id, 1);
END $$;

-- ── Doanh nghiệp mẫu ──────────────────────────────────────
DO $$
DECLARE
    v_eid1 INT;
BEGIN
    INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
    VALUES ('enterprise', 'Nguyễn Văn An', 'nva@farm.vn',
            '0901234567', encode(sha256('Enterprise@123'::bytea), 'hex'), TRUE)
    RETURNING user_id INTO v_eid1;

    INSERT INTO enterprises (enterprise_id, business_name, business_address, tax_code, is_approved)
    VALUES (v_eid1, 'Nông trại Xanh Sạch', 'Đà Lạt, Lâm Đồng', '1234567890', TRUE);

    INSERT INTO business_profiles
        (enterprise_id, business_name, address, license_file, tax_code, status, reviewed_at)
    VALUES (v_eid1, 'Nông trại Xanh Sạch', 'Đà Lạt, Lâm Đồng',
            '/uploads/licenses/farm_green.pdf', '1234567890', 'APPROVED', NOW());
END $$;

-- ── Khách hàng mẫu ────────────────────────────────────────
DO $$
DECLARE
    v_cid1 INT;
    v_cid2 INT;
BEGIN
    INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
    VALUES ('customer', 'Trần Thị Bình', 'ttb@gmail.com',
            '0987654321', encode(sha256('Customer@123'::bytea), 'hex'), TRUE)
    RETURNING user_id INTO v_cid1;

    INSERT INTO customers (customer_id, address)
    VALUES (v_cid1, '123 Nguyễn Huệ, Q.1, TP.HCM');
    INSERT INTO carts (customer_id) VALUES (v_cid1);

    INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
    VALUES ('customer', 'Lê Văn Cường', 'lvc@gmail.com',
            '0912345678', encode(sha256('Customer@456'::bytea), 'hex'), TRUE)
    RETURNING user_id INTO v_cid2;

    INSERT INTO customers (customer_id, address)
    VALUES (v_cid2, '456 Lê Lợi, Q.3, TP.HCM');
    INSERT INTO carts (customer_id) VALUES (v_cid2);
END $$;

-- ── Shipper mẫu ───────────────────────────────────────────
DO $$
DECLARE
    v_shid1 INT;
BEGIN
    INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
    VALUES ('shipper', 'Phạm Văn Dũng', 'pvd@giaohang.vn',
            '0933333333', encode(sha256('Shipper@123'::bytea), 'hex'), TRUE)
    RETURNING user_id INTO v_shid1;

    INSERT INTO shippers (shipper_id, shipper_code, company)
    VALUES (v_shid1, 'GHN-001', 'Giao Hàng Nhanh');
END $$;

-- ── Sản phẩm, đơn hàng, đánh giá, khuyến mãi, thông báo mẫu ──
DO $$
DECLARE
    v_eid1  INT;
    v_cid1  INT;
    v_cid2  INT;
    v_shid1 INT;
    v_pid1  INT;
    v_pid2  INT;
    v_pid3  INT;
    v_pid4  INT;
    v_oid1  INT;
    v_oid2  INT;
    v_item1 INT;
    v_item3 INT;
    v_rev1  INT;
    v_sale1 INT;
BEGIN
    -- Lấy lại các ID đã insert
    SELECT user_id INTO v_eid1  FROM users WHERE email = 'nva@farm.vn';
    SELECT user_id INTO v_cid1  FROM users WHERE email = 'ttb@gmail.com';
    SELECT user_id INTO v_cid2  FROM users WHERE email = 'lvc@gmail.com';
    SELECT user_id INTO v_shid1 FROM users WHERE email = 'pvd@giaohang.vn';

    -- Sản phẩm mẫu
    INSERT INTO products
        (enterprise_id, category_id, name, description, price, unit,
         stock_quantity, origin, certification, expired_date, status)
    VALUES
        (v_eid1, 5, 'Rau muống hữu cơ',
         'Rau muống trồng theo phương pháp hữu cơ, không thuốc trừ sâu',
         15000, 'bó', 200, 'Đà Lạt', 'VietGAP', CURRENT_DATE + INTERVAL '7 days', 'ON_SALE'),
        (v_eid1, 6, 'Cà rốt Đà Lạt',
         'Cà rốt tươi trồng tại Đà Lạt, ngọt tự nhiên',
         25000, 'kg', 500, 'Đà Lạt', 'VietGAP', CURRENT_DATE + INTERVAL '14 days', 'ON_SALE'),
        (v_eid1, 7, 'Xoài cát Hòa Lộc',
         'Xoài cát Hòa Lộc đặc sản Tiền Giang, vị ngọt thơm',
         65000, 'kg', 150, 'Tiền Giang', 'GlobalGAP', CURRENT_DATE + INTERVAL '10 days', 'ON_SALE'),
        (v_eid1, 3, 'Gạo ST25',
         'Gạo ST25 đạt giải gạo ngon nhất thế giới',
         35000, 'kg', 1000, 'Sóc Trăng', NULL, CURRENT_DATE + INTERVAL '180 days', 'ON_SALE');

    SELECT product_id INTO v_pid1 FROM products WHERE name = 'Rau muống hữu cơ' LIMIT 1;
    SELECT product_id INTO v_pid2 FROM products WHERE name = 'Cà rốt Đà Lạt' LIMIT 1;
    SELECT product_id INTO v_pid3 FROM products WHERE name = 'Xoài cát Hòa Lộc' LIMIT 1;
    SELECT product_id INTO v_pid4 FROM products WHERE name = 'Gạo ST25' LIMIT 1;

    INSERT INTO product_images (product_id, image_url, is_primary) VALUES
        (v_pid1, '/uploads/products/rau_muong_1.jpg', TRUE),
        (v_pid2, '/uploads/products/ca_rot_1.jpg',    TRUE),
        (v_pid3, '/uploads/products/xoai_cat_1.jpg',  TRUE),
        (v_pid4, '/uploads/products/gao_st25_1.jpg',  TRUE);

    -- Đơn hàng mẫu
    INSERT INTO orders
        (customer_id, enterprise_id, status, total_amount, shipping_fee,
         shipping_address, payment_status, payment_method)
    VALUES
        (v_cid1, v_eid1, 'COMPLETED', 155000, 30000,
         '123 Nguyễn Huệ, Q.1, TP.HCM', 'PAID', 'ONLINE')
    RETURNING order_id INTO v_oid1;

    INSERT INTO orders
        (customer_id, enterprise_id, status, total_amount, shipping_fee,
         shipping_address, payment_status, payment_method)
    VALUES
        (v_cid2, v_eid1, 'SHIPPING', 230000, 25000,
         '456 Lê Lợi, Q.3, TP.HCM', 'PAID', 'ONLINE')
    RETURNING order_id INTO v_oid2;

    INSERT INTO order_items
        (order_id, product_id, product_name, unit, quantity, unit_price, subtotal)
    VALUES
        (v_oid1, v_pid1, 'Rau muống hữu cơ', 'bó', 3, 15000, 45000),
        (v_oid1, v_pid3, 'Xoài cát Hòa Lộc', 'kg', 1, 65000, 65000),
        (v_oid1, v_pid4, 'Gạo ST25',          'kg', 1, 35000, 35000),
        (v_oid2, v_pid2, 'Cà rốt Đà Lạt',    'kg', 4, 25000, 100000),
        (v_oid2, v_pid4, 'Gạo ST25',          'kg', 3, 35000, 105000);

    -- Thanh toán mẫu
    INSERT INTO payments
        (order_id, amount, method, status, transaction_code, gateway_name, paid_at)
    VALUES
        (v_oid1, 185000, 'ONLINE', 'SUCCESS', 'TXN-20260101-001', 'VNPay', NOW()),
        (v_oid2, 255000, 'ONLINE', 'SUCCESS', 'TXN-20260101-002', 'VNPay', NOW());

    -- Vận chuyển mẫu
    INSERT INTO shipments
        (order_id, shipper_id, tracking_code, status, estimated_delivery, delivered_at)
    VALUES
        (v_oid1, v_shid1, 'GHN20260101001', 'DELIVERED',
         CURRENT_DATE - INTERVAL '2 days', NOW()),
        (v_oid2, v_shid1, 'GHN20260101002', 'DELIVERING',
         CURRENT_DATE + INTERVAL '1 day', NULL);

    -- Đánh giá mẫu
    SELECT order_item_id INTO v_item1 FROM order_items
        WHERE order_id = v_oid1 AND product_id = v_pid1 LIMIT 1;
    SELECT order_item_id INTO v_item3 FROM order_items
        WHERE order_id = v_oid1 AND product_id = v_pid3 LIMIT 1;

    INSERT INTO reviews
        (customer_id, order_item_id, product_id, stars, comment, is_approved)
    VALUES
        (v_cid1, v_item1, v_pid1, 5,
         'Rau rất tươi, giao hàng nhanh, sẽ mua lại!', TRUE),
        (v_cid1, v_item3, v_pid3, 4,
         'Xoài ngon, ngọt thanh. Đóng gói cẩn thận.', TRUE);

    SELECT review_id INTO v_rev1 FROM reviews
        WHERE customer_id = v_cid1 AND product_id = v_pid1 LIMIT 1;

    INSERT INTO review_replies (review_id, enterprise_id, content)
    VALUES (v_rev1, v_eid1,
            'Cảm ơn bạn đã tin tưởng sử dụng sản phẩm! Hẹn gặp lại bạn trong những đơn hàng tiếp theo.');

    -- Khuyến mãi mẫu
    INSERT INTO sales
        (enterprise_id, name, discount_percent, start_date, end_date, status)
    VALUES
        (v_eid1, 'Giảm giá Hè 2026', 15.00,
         '2026-06-01 00:00:00', '2026-06-30 23:59:59', 'PENDING')
    RETURNING sale_id INTO v_sale1;

    INSERT INTO sale_events (sale_id, product_id, applied_price, applied_quantity)
    VALUES
        (v_sale1, v_pid1, 12750, 100),
        (v_sale1, v_pid2, 21250, 200);

    -- Thông báo mẫu
    INSERT INTO notifications (user_id, title, content, type) VALUES
        (v_cid1, 'Đơn hàng đã giao thành công',
         'Đơn hàng #1 của bạn đã được giao thành công. Hãy đánh giá sản phẩm!',
         'ORDER'),
        (v_eid1, 'Bạn có đánh giá mới',
         'Khách hàng Trần Thị Bình vừa đánh giá sản phẩm Rau muống hữu cơ.',
         'REVIEW'),
        (v_eid1, 'Yêu cầu duyệt khuyến mãi',
         'Chương trình Giảm giá Hè 2026 đang chờ admin phê duyệt.',
         'PROMOTION');
END $$;
