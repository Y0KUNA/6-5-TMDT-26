-- ============================================================
--  SÀN THƯƠNG MẠI ĐIỆN TỬ BÁN NÔNG SẢN
--  Database: nong_san_ecommerce
--  Encoding: UTF8
--  Engine:   PostgreSQL
-- ============================================================

-- Tạo database (chạy riêng nếu cần, không thể chạy trong transaction block)
-- DROP DATABASE IF EXISTS nong_san_ecommerce;
-- CREATE DATABASE nong_san_ecommerce ENCODING 'UTF8';
-- \c nong_san_ecommerce
SELECT NOW()
ALTER USER postgres WITH PASSWORD '12345678';
-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('customer', 'enterprise', 'admin', 'shipper');
CREATE TYPE verify_token_type AS ENUM ('email_verify', 'password_reset');
CREATE TYPE business_profile_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE product_status AS ENUM ('DRAFT', 'PENDING', 'ON_SALE', 'REJECTED');
CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('UNPAID', 'PAID', 'REFUNDED');
CREATE TYPE payment_method AS ENUM ('ONLINE', 'COD');
CREATE TYPE payment_txn_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE shipment_status AS ENUM ('WAITING', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'FAILED');
CREATE TYPE return_type AS ENUM ('EXCHANGE', 'REFUND');
CREATE TYPE return_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_REFUNDED');
CREATE TYPE sale_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED');
CREATE TYPE export_format AS ENUM ('PDF', 'EXCEL');
CREATE TYPE notification_type AS ENUM ('ORDER', 'PAYMENT', 'REVIEW', 'RETURN', 'PROMOTION', 'SYSTEM');

-- ============================================================
-- 1. USERS  (bảng gốc cho tất cả vai trò)
-- ============================================================
CREATE TABLE users (
    user_id          SERIAL          NOT NULL,
    role             user_role       NOT NULL,
    full_name        VARCHAR(100)    NOT NULL,
    email            VARCHAR(100)    NOT NULL,
    phone            VARCHAR(20)     NOT NULL,
    password_hash    VARCHAR(255)    NOT NULL,
    is_active        BOOLEAN         NOT NULL DEFAULT FALSE,
    is_locked        BOOLEAN         NOT NULL DEFAULT FALSE,
    fail_login_count INT             NOT NULL DEFAULT 0,
    locked_until     TIMESTAMP                DEFAULT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_users        PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email  UNIQUE      (email),
    CONSTRAINT chk_users_fail  CHECK       (fail_login_count >= 0)
);
COMMENT ON TABLE users IS 'Bảng gốc chứa thông tin chung của mọi người dùng';

-- ============================================================
-- 2. CUSTOMERS
-- ============================================================
CREATE TABLE customers (
    customer_id INT          NOT NULL,
    address     VARCHAR(255)          DEFAULT NULL,

    CONSTRAINT pk_customers      PRIMARY KEY (customer_id),
    CONSTRAINT fk_customers_user FOREIGN KEY (customer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE customers IS 'Thông tin mở rộng của khách hàng';

-- ============================================================
-- 3. ENTERPRISES
-- ============================================================
CREATE TABLE enterprises (
    enterprise_id    INT          NOT NULL,
    business_name    VARCHAR(255) NOT NULL,
    business_address VARCHAR(255) NOT NULL,
    tax_code         VARCHAR(50)  NOT NULL,
    is_approved      BOOLEAN      NOT NULL DEFAULT FALSE,

    CONSTRAINT pk_enterprises      PRIMARY KEY (enterprise_id),
    CONSTRAINT uq_enterprises_tax  UNIQUE      (tax_code),
    CONSTRAINT fk_enterprises_user FOREIGN KEY (enterprise_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE enterprises IS 'Thông tin mở rộng của doanh nghiệp / người bán';

-- ============================================================
-- 4. ADMINS
-- ============================================================
CREATE TABLE admins (
    admin_id    INT NOT NULL,
    admin_level INT NOT NULL DEFAULT 1,

    CONSTRAINT pk_admins      PRIMARY KEY (admin_id),
    CONSTRAINT fk_admins_user FOREIGN KEY (admin_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE admins IS 'Thông tin mở rộng của quản trị viên';

-- ============================================================
-- 5. SHIPPERS
-- ============================================================
CREATE TABLE shippers (
    shipper_id   INT          NOT NULL,
    shipper_code VARCHAR(50)  NOT NULL,
    company      VARCHAR(255) NOT NULL,

    CONSTRAINT pk_shippers       PRIMARY KEY (shipper_id),
    CONSTRAINT uq_shippers_code  UNIQUE      (shipper_code),
    CONSTRAINT fk_shippers_user  FOREIGN KEY (shipper_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE shippers IS 'Thông tin mở rộng của đơn vị vận chuyển';

-- ============================================================
-- 6. SESSIONS
-- ============================================================
CREATE TABLE sessions (
    session_id SERIAL       NOT NULL,
    user_id    INT          NOT NULL,
    token      VARCHAR(512) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP    NOT NULL,

    CONSTRAINT pk_sessions       PRIMARY KEY (session_id),
    CONSTRAINT uq_sessions_token UNIQUE      (token),
    CONSTRAINT fk_sessions_user  FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE sessions IS 'Phiên đăng nhập của người dùng';

-- ============================================================
-- 7. VERIFY_TOKENS
-- ============================================================
CREATE TABLE verify_tokens (
    token_id   SERIAL             NOT NULL,
    user_id    INT                NOT NULL,
    token      VARCHAR(512)       NOT NULL,
    type       verify_token_type  NOT NULL,
    created_at TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP          NOT NULL,

    CONSTRAINT pk_verify_tokens       PRIMARY KEY (token_id),
    CONSTRAINT uq_verify_tokens_token UNIQUE      (token),
    CONSTRAINT fk_verify_tokens_user  FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE verify_tokens IS 'Token xác thực email và đặt lại mật khẩu';

-- ============================================================
-- 8. BUSINESS_PROFILES
-- ============================================================
CREATE TABLE business_profiles (
    profile_id      SERIAL                   NOT NULL,
    enterprise_id   INT                      NOT NULL,
    business_name   VARCHAR(255)             NOT NULL,
    address         VARCHAR(255)             NOT NULL,
    license_file    VARCHAR(500)             NOT NULL,  -- Đường dẫn file giấy phép kinh doanh
    tax_code        VARCHAR(50)              NOT NULL,
    status          business_profile_status  NOT NULL DEFAULT 'PENDING',
    rejected_reason TEXT                              DEFAULT NULL,
    submitted_at    TIMESTAMP                NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at     TIMESTAMP                         DEFAULT NULL,

    CONSTRAINT pk_business_profiles            PRIMARY KEY (profile_id),
    CONSTRAINT uq_business_profiles_enterprise UNIQUE      (enterprise_id),
    CONSTRAINT fk_business_profiles_enterprise FOREIGN KEY (enterprise_id)
        REFERENCES enterprises(enterprise_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE business_profiles IS 'Hồ sơ đăng ký bán hàng của doanh nghiệp';

-- ============================================================
-- 9. AUDIT_LOGS
-- ============================================================
CREATE TABLE audit_logs (
    log_id    SERIAL       NOT NULL,
    admin_id  INT          NOT NULL,
    action    VARCHAR(100) NOT NULL,  -- APPROVE | REJECT | LOCK | UNLOCK ...
    target_id VARCHAR(100) NOT NULL,  -- ID đối tượng bị tác động
    reason    TEXT                  DEFAULT NULL,
    timestamp TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_audit_logs       PRIMARY KEY (log_id),
    CONSTRAINT fk_audit_logs_admin FOREIGN KEY (admin_id)
        REFERENCES admins(admin_id)
        ON DELETE RESTRICT
);
COMMENT ON TABLE audit_logs IS 'Nhật ký hành động của admin';

-- ============================================================
-- 10. CATEGORIES
-- ============================================================
CREATE TABLE categories (
    category_id INT          GENERATED ALWAYS AS IDENTITY NOT NULL,
    parent_id   INT                   DEFAULT NULL,  -- NULL = danh mục gốc
    name        VARCHAR(100) NOT NULL,
    description TEXT                  DEFAULT NULL,

    CONSTRAINT pk_categories        PRIMARY KEY (category_id),
    CONSTRAINT uq_categories_name   UNIQUE      (name),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id)
        REFERENCES categories(category_id)
        ON DELETE SET NULL
);
COMMENT ON TABLE categories IS 'Danh mục sản phẩm (hỗ trợ đa cấp)';

-- ============================================================
-- 11. PRODUCTS
-- ============================================================
CREATE TABLE products (
    product_id      SERIAL          NOT NULL,
    enterprise_id   INT             NOT NULL,
    category_id     INT             NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT                     DEFAULT NULL,
    price           DECIMAL(10,2)   NOT NULL,
    unit            VARCHAR(50)     NOT NULL,
    stock_quantity  INT             NOT NULL DEFAULT 0,
    origin          VARCHAR(255)             DEFAULT NULL,
    certification   VARCHAR(255)             DEFAULT NULL,  -- VietGAP, GlobalGAP...
    package_date    DATE                     DEFAULT NULL,
    expired_date    DATE                     DEFAULT NULL,
    status          product_status  NOT NULL DEFAULT 'PENDING',
    rejected_reason TEXT                     DEFAULT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_products            PRIMARY KEY (product_id),
    CONSTRAINT chk_products_price     CHECK       (price > 0),
    CONSTRAINT chk_products_stock     CHECK       (stock_quantity >= 0),
    CONSTRAINT fk_products_enterprise FOREIGN KEY (enterprise_id)
        REFERENCES enterprises(enterprise_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_products_category   FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT
);
COMMENT ON TABLE products IS 'Sản phẩm nông sản đăng bán trên sàn';

-- ============================================================
-- 12. PRODUCT_IMAGES
-- ============================================================
CREATE TABLE product_images (
    image_id    SERIAL       NOT NULL,
    product_id  INT          NOT NULL,
    image_url   VARCHAR(500) NOT NULL,
    is_primary  BOOLEAN      NOT NULL DEFAULT FALSE,
    uploaded_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_images         PRIMARY KEY (image_id),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE product_images IS 'Ảnh sản phẩm (1 sản phẩm có nhiều ảnh)';

-- ============================================================
-- 13. CARTS
-- ============================================================
CREATE TABLE carts (
    cart_id     SERIAL        NOT NULL,
    customer_id INT           NOT NULL,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_carts          PRIMARY KEY (cart_id),
    CONSTRAINT uq_carts_customer UNIQUE      (customer_id),
    CONSTRAINT fk_carts_customer FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE carts IS 'Giỏ hàng của khách hàng (mỗi KH 1 giỏ)';

-- ============================================================
-- 14. CART_ITEMS
-- ============================================================
CREATE TABLE cart_items (
    cart_item_id SERIAL        NOT NULL,
    cart_id      INT           NOT NULL,
    product_id   INT           NOT NULL,
    unit         VARCHAR(50)   NOT NULL,
    quantity     INT           NOT NULL,
    unit_price   DECIMAL(10,2) NOT NULL,
    subtotal     DECIMAL(10,2) NOT NULL,

    CONSTRAINT pk_cart_items         PRIMARY KEY (cart_item_id),
    CONSTRAINT chk_cart_items_qty    CHECK       (quantity > 0),
    CONSTRAINT fk_cart_items_cart    FOREIGN KEY (cart_id)
        REFERENCES carts(cart_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE cart_items IS 'Chi tiết từng sản phẩm trong giỏ hàng';

-- ============================================================
-- 15. ORDERS
-- ============================================================
CREATE TABLE orders (
    order_id             SERIAL          NOT NULL,
    customer_id          INT             NOT NULL,
    enterprise_id        INT             NOT NULL,
    status               order_status    NOT NULL DEFAULT 'PENDING',
    total_amount         DECIMAL(10,2)   NOT NULL,
    shipping_fee         DECIMAL(10,2)   NOT NULL DEFAULT 0,
    shipping_address     VARCHAR(500)    NOT NULL,
    payment_status       payment_status  NOT NULL DEFAULT 'UNPAID',
    payment_method       payment_method  NOT NULL,
    note                 TEXT                     DEFAULT NULL,
    review_button_expiry TIMESTAMP                DEFAULT NULL,  -- Hạn hiển thị nút Đánh giá (sau 30 ngày)
    created_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_orders            PRIMARY KEY (order_id),
    CONSTRAINT fk_orders_customer   FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_orders_enterprise FOREIGN KEY (enterprise_id)
        REFERENCES enterprises(enterprise_id)
        ON DELETE RESTRICT
);
COMMENT ON TABLE orders IS 'Đơn hàng của khách hàng';

-- ============================================================
-- 16. ORDER_ITEMS
-- ============================================================
CREATE TABLE order_items (
    order_item_id SERIAL        NOT NULL,
    order_id      INT           NOT NULL,
    product_id    INT           NOT NULL,
    product_name  VARCHAR(255)  NOT NULL,  -- Snapshot tên SP tại thời điểm mua
    unit          VARCHAR(50)   NOT NULL,
    quantity      INT           NOT NULL,
    unit_price    DECIMAL(10,2) NOT NULL,  -- Snapshot giá tại thời điểm mua
    subtotal      DECIMAL(10,2) NOT NULL,

    CONSTRAINT pk_order_items         PRIMARY KEY (order_item_id),
    CONSTRAINT chk_order_items_qty    CHECK       (quantity > 0),
    CONSTRAINT fk_order_items_order   FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE RESTRICT
);
COMMENT ON TABLE order_items IS 'Chi tiết từng sản phẩm trong đơn hàng';

-- ============================================================
-- 17. PAYMENTS
-- ============================================================
CREATE TABLE payments (
    payment_id       SERIAL             NOT NULL,
    order_id         INT                NOT NULL,
    amount           DECIMAL(10,2)      NOT NULL,
    method           payment_method     NOT NULL,
    status           payment_txn_status NOT NULL DEFAULT 'PENDING',
    transaction_code VARCHAR(255)                DEFAULT NULL,
    gateway_name     VARCHAR(100)                DEFAULT NULL,
    paid_at          TIMESTAMP                   DEFAULT NULL,
    expired_at       TIMESTAMP                   DEFAULT NULL,

    CONSTRAINT pk_payments       PRIMARY KEY (payment_id),
    CONSTRAINT uq_payments_order UNIQUE      (order_id),
    CONSTRAINT uq_payments_txn   UNIQUE      (transaction_code),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE payments IS 'Thông tin thanh toán của từng đơn hàng';

-- ============================================================
-- 18. SHIPMENTS
-- ============================================================
CREATE TABLE shipments (
    shipment_id        SERIAL           NOT NULL,
    order_id           INT              NOT NULL,
    shipper_id         INT                       DEFAULT NULL,
    tracking_code      VARCHAR(100)              DEFAULT NULL,
    status             shipment_status   NOT NULL DEFAULT 'WAITING',
    estimated_delivery DATE                      DEFAULT NULL,
    picked_up_at       TIMESTAMP                 DEFAULT NULL,
    delivered_at       TIMESTAMP                 DEFAULT NULL,
    updated_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_shipments          PRIMARY KEY (shipment_id),
    CONSTRAINT uq_shipments_order    UNIQUE      (order_id),
    CONSTRAINT uq_shipments_tracking UNIQUE      (tracking_code),
    CONSTRAINT fk_shipments_order    FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_shipments_shipper  FOREIGN KEY (shipper_id)
        REFERENCES shippers(shipper_id)
        ON DELETE SET NULL
);
COMMENT ON TABLE shipments IS 'Thông tin vận chuyển của từng đơn hàng';

-- ============================================================
-- 19. REVIEWS
-- ============================================================
CREATE TABLE reviews (
    review_id     SERIAL   NOT NULL,
    customer_id   INT      NOT NULL,
    order_item_id INT      NOT NULL,
    product_id    INT      NOT NULL,
    stars         INT      NOT NULL,
    comment       TEXT              DEFAULT NULL,
    reason        TEXT              DEFAULT NULL,  -- Bắt buộc khi stars = 0
    is_approved   BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_reviews            PRIMARY KEY (review_id),
    CONSTRAINT uq_reviews_order_item UNIQUE      (order_item_id),
    CONSTRAINT chk_reviews_stars     CHECK       (stars BETWEEN 0 AND 5),
    CONSTRAINT fk_reviews_customer   FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_order_item FOREIGN KEY (order_item_id)
        REFERENCES order_items(order_item_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_product    FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE RESTRICT
);
COMMENT ON TABLE reviews IS 'Đánh giá sản phẩm sau khi nhận hàng';

-- ============================================================
-- 20. REVIEW_REPLIES
-- ============================================================
CREATE TABLE review_replies (
    reply_id      SERIAL   NOT NULL,
    review_id     INT      NOT NULL,
    enterprise_id INT      NOT NULL,
    content       TEXT     NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_review_replies            PRIMARY KEY (reply_id),
    CONSTRAINT uq_review_replies_review     UNIQUE      (review_id),
    CONSTRAINT fk_review_replies_review     FOREIGN KEY (review_id)
        REFERENCES reviews(review_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_review_replies_enterprise FOREIGN KEY (enterprise_id)
        REFERENCES enterprises(enterprise_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE review_replies IS 'Phản hồi đánh giá của doanh nghiệp';

-- ============================================================
-- 21. RETURN_REQUESTS
-- ============================================================
CREATE TABLE return_requests (
    request_id      SERIAL        NOT NULL,
    customer_id     INT           NOT NULL,
    order_id        INT           NOT NULL,
    enterprise_id   INT           NOT NULL,
    type            return_type   NOT NULL,
    reason          TEXT          NOT NULL,
    evidence_image  VARCHAR(500)           DEFAULT NULL,
    status          return_status NOT NULL DEFAULT 'PENDING',
    rejected_reason TEXT                   DEFAULT NULL,
    note            TEXT                   DEFAULT NULL,
    resolved_at     TIMESTAMP              DEFAULT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_return_requests            PRIMARY KEY (request_id),
    CONSTRAINT fk_return_requests_customer   FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_return_requests_order      FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_return_requests_enterprise FOREIGN KEY (enterprise_id)
        REFERENCES enterprises(enterprise_id)
        ON DELETE RESTRICT
);
COMMENT ON TABLE return_requests IS 'Yêu cầu đổi/trả hàng của khách hàng';

-- ============================================================
-- 22. SALES (chương trình khuyến mãi)
-- ============================================================
CREATE TABLE sales (
    sale_id                SERIAL       NOT NULL,
    enterprise_id          INT          NOT NULL,
    name                   VARCHAR(255) NOT NULL,
    discount_percent       DECIMAL(5,2) NOT NULL,
    start_date             TIMESTAMP    NOT NULL,
    end_date               TIMESTAMP    NOT NULL,
    status                 sale_status  NOT NULL DEFAULT 'PENDING',
    require_admin_approval BOOLEAN      NOT NULL DEFAULT FALSE,
    rejected_reason        TEXT                  DEFAULT NULL,
    reason_high_discount   TEXT                  DEFAULT NULL,  -- Bắt buộc khi discount > 70%
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_sales            PRIMARY KEY (sale_id),
    CONSTRAINT chk_sales_discount  CHECK       (discount_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_sales_date      CHECK       (end_date > start_date),
    CONSTRAINT fk_sales_enterprise FOREIGN KEY (enterprise_id)
        REFERENCES enterprises(enterprise_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE sales IS 'Chương trình khuyến mãi do doanh nghiệp tạo';

-- ============================================================
-- 23. SALE_EVENTS (sản phẩm áp dụng trong KM)
-- ============================================================
CREATE TABLE sale_events (
    event_id         SERIAL        NOT NULL,
    sale_id          INT           NOT NULL,
    product_id       INT           NOT NULL,
    applied_price    DECIMAL(10,2) NOT NULL,  -- Giá sau khi giảm
    applied_quantity INT                    DEFAULT NULL,  -- Giới hạn số lượng

    CONSTRAINT pk_sale_events        PRIMARY KEY (event_id),
    CONSTRAINT chk_sale_events_price CHECK       (applied_price >= 0),
    CONSTRAINT fk_sale_events_sale   FOREIGN KEY (sale_id)
        REFERENCES sales(sale_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_sale_events_product FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE sale_events IS 'Danh sách sản phẩm trong từng chương trình KM';

-- ============================================================
-- 24. REVENUE_REPORTS
-- ============================================================
CREATE TABLE revenue_reports (
    report_id       SERIAL         NOT NULL,
    enterprise_id   INT            NOT NULL,
    total_revenue   DECIMAL(15,2)  NOT NULL DEFAULT 0,
    total_profit    DECIMAL(15,2)  NOT NULL DEFAULT 0,
    total_orders    INT            NOT NULL DEFAULT 0,
    start_date      DATE           NOT NULL,
    end_date        DATE           NOT NULL,
    export_format   export_format           DEFAULT NULL,
    export_file_url VARCHAR(500)            DEFAULT NULL,
    generated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_revenue_reports            PRIMARY KEY (report_id),
    CONSTRAINT fk_revenue_reports_enterprise FOREIGN KEY (enterprise_id)
        REFERENCES enterprises(enterprise_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE revenue_reports IS 'Báo cáo doanh thu theo kỳ của doanh nghiệp';

-- ============================================================
-- 25. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    notification_id SERIAL            NOT NULL,
    user_id         INT               NOT NULL,
    title           VARCHAR(255)      NOT NULL,
    content         TEXT              NOT NULL,
    type            notification_type NOT NULL,
    is_read         BOOLEAN           NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_notifications      PRIMARY KEY (notification_id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
COMMENT ON TABLE notifications IS 'Thông báo gửi đến người dùng trong hệ thống';

-- ============================================================
-- INDEX  (tối ưu truy vấn thường dùng)
-- ============================================================

-- users
CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_is_locked ON users(is_locked);

-- sessions
CREATE INDEX idx_sessions_user       ON sessions(user_id);
CREATE INDEX idx_sessions_expired_at ON sessions(expired_at);

-- verify_tokens
CREATE INDEX idx_verify_tokens_user ON verify_tokens(user_id);
CREATE INDEX idx_verify_tokens_type ON verify_tokens(type);

-- products
CREATE INDEX idx_products_enterprise ON products(enterprise_id);
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_products_status     ON products(status);
CREATE INDEX idx_products_name       ON products(name);
CREATE INDEX idx_products_expired    ON products(expired_date);

-- orders
CREATE INDEX idx_orders_customer   ON orders(customer_id);
CREATE INDEX idx_orders_enterprise ON orders(enterprise_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- order_items
CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- payments
CREATE INDEX idx_payments_status ON payments(status);

-- shipments
CREATE INDEX idx_shipments_shipper ON shipments(shipper_id);
CREATE INDEX idx_shipments_status  ON shipments(status);

-- reviews
CREATE INDEX idx_reviews_product  ON reviews(product_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);

-- return_requests
CREATE INDEX idx_return_requests_order      ON return_requests(order_id);
CREATE INDEX idx_return_requests_enterprise ON return_requests(enterprise_id);
CREATE INDEX idx_return_requests_status     ON return_requests(status);

-- sales
CREATE INDEX idx_sales_enterprise ON sales(enterprise_id);
CREATE INDEX idx_sales_status     ON sales(status);
CREATE INDEX idx_sales_date       ON sales(start_date, end_date);

-- notifications
CREATE INDEX idx_notifications_user    ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- business_profiles
CREATE INDEX idx_business_profiles_status ON business_profiles(status);


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


-- ============================================================
-- TRIGGERS  (tiện ích hệ thống)
-- ============================================================

-- Tự động tạo Cart khi tạo Customer mới
CREATE OR REPLACE FUNCTION fn_after_insert_customer()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO carts (customer_id) VALUES (NEW.customer_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_insert_customer
AFTER INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION fn_after_insert_customer();

-- Tự động cập nhật total_price trong Cart khi thêm/sửa CartItem
CREATE OR REPLACE FUNCTION fn_after_upsert_cart_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE carts
    SET total_price = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM cart_items
        WHERE cart_id = NEW.cart_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = NEW.cart_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_upsert_cart_item
AFTER INSERT ON cart_items
FOR EACH ROW EXECUTE FUNCTION fn_after_upsert_cart_item();

-- Tự động cập nhật total_price khi xoá CartItem
CREATE OR REPLACE FUNCTION fn_after_delete_cart_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE carts
    SET total_price = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM cart_items
        WHERE cart_id = OLD.cart_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = OLD.cart_id;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_after_delete_cart_item
AFTER DELETE ON cart_items
FOR EACH ROW EXECUTE FUNCTION fn_after_delete_cart_item();

-- Giảm tồn kho khi tạo OrderItem
CREATE OR REPLACE FUNCTION fn_after_insert_order_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_insert_order_item
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION fn_after_insert_order_item();

-- Hoàn trả tồn kho khi đơn bị huỷ
CREATE OR REPLACE FUNCTION fn_after_cancel_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'CANCELLED' AND OLD.status <> 'CANCELLED' THEN
        UPDATE products p
        SET stock_quantity = p.stock_quantity + oi.quantity
        FROM order_items oi
        WHERE oi.product_id = p.product_id
          AND oi.order_id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_cancel_order
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION fn_after_cancel_order();

-- Trigger tự động cập nhật updated_at cho orders và shipments
-- (thay thế ON UPDATE CURRENT_TIMESTAMP của MySQL)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_shipments_updated_at
BEFORE UPDATE ON shipments
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_carts_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- STORED PROCEDURES  (tiện ích hệ thống)
-- ============================================================

-- Procedure: Khoá tài khoản khi nhập sai mật khẩu >= 5 lần
CREATE OR REPLACE PROCEDURE sp_increment_fail_login(p_user_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE users
    SET fail_login_count = fail_login_count + 1,
        is_locked = CASE
            WHEN fail_login_count + 1 >= 5 THEN TRUE
            ELSE is_locked
        END,
        locked_until = CASE
            WHEN fail_login_count + 1 >= 5
                 THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
            ELSE locked_until
        END
    WHERE user_id = p_user_id;
END;
$$;

-- Procedure: Tự động hoàn thành đơn sau 48h không xác nhận
CREATE OR REPLACE PROCEDURE sp_auto_complete_orders()
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE orders
    SET status     = 'COMPLETED',
        updated_at = CURRENT_TIMESTAMP
    WHERE status     = 'DELIVERED'
      AND updated_at <= CURRENT_TIMESTAMP - INTERVAL '48 hours';
END;
$$;

-- Procedure: Tự động hoàn tiền yêu cầu đổi/trả sau 48h không phản hồi
CREATE OR REPLACE PROCEDURE sp_auto_refund_return_requests()
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE return_requests
    SET status      = 'AUTO_REFUNDED',
        resolved_at = CURRENT_TIMESTAMP
    WHERE status     = 'PENDING'
      AND created_at <= CURRENT_TIMESTAMP - INTERVAL '48 hours';
END;
$$;

-- Function: Lấy báo cáo doanh thu theo kỳ
-- (PostgreSQL trả về bảng kết quả thay vì OUT params như MySQL)
CREATE OR REPLACE FUNCTION sp_get_revenue_report(
    p_enterprise_id INT,
    p_start         DATE,
    p_end           DATE
)
RETURNS TABLE (p_revenue DECIMAL(15,2), p_total_orders INT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(o.total_amount), 0)::DECIMAL(15,2),
        COUNT(o.order_id)::INT
    FROM orders o
    WHERE o.enterprise_id = p_enterprise_id
      AND o.status        = 'COMPLETED'
      AND DATE(o.created_at) BETWEEN p_start AND p_end;
END;
$$;

-- ============================================================
-- VIEWS  (truy vấn tiện ích)
-- ============================================================

-- Thông tin đầy đủ sản phẩm + tên DN + danh mục
CREATE OR REPLACE VIEW vw_product_detail AS
SELECT
    p.product_id,
    p.name              AS product_name,
    c.name              AS category_name,
    e.business_name     AS enterprise_name,
    p.price,
    p.unit,
    p.stock_quantity,
    p.origin,
    p.certification,
    p.expired_date,
    p.status,
    COALESCE(AVG(r.stars), 0) AS avg_stars,
    COUNT(r.review_id)        AS review_count
FROM products p
JOIN categories  c ON c.category_id  = p.category_id
JOIN enterprises e ON e.enterprise_id = p.enterprise_id
LEFT JOIN reviews r ON r.product_id  = p.product_id AND r.is_approved = TRUE
GROUP BY p.product_id, p.name, c.name, e.business_name,
         p.price, p.unit, p.stock_quantity, p.origin,
         p.certification, p.expired_date, p.status;

-- Trạng thái đơn hàng đầy đủ (gồm thanh toán + vận chuyển)
CREATE OR REPLACE VIEW vw_order_full AS
SELECT
    o.order_id,
    u.full_name || ' (' || u.email || ')' AS customer,
    e.business_name                       AS enterprise,
    o.status                              AS order_status,
    o.total_amount,
    o.shipping_fee,
    o.payment_method,
    o.payment_status,
    py.transaction_code,
    s.status                              AS shipment_status,
    s.tracking_code,
    s.estimated_delivery,
    o.created_at
FROM orders o
JOIN customers   cu ON cu.customer_id  = o.customer_id
JOIN users        u ON u.user_id       = cu.customer_id
JOIN enterprises  e ON e.enterprise_id = o.enterprise_id
LEFT JOIN payments  py ON py.order_id  = o.order_id
LEFT JOIN shipments  s ON s.order_id   = o.order_id;

-- Doanh thu theo doanh nghiệp (tháng hiện tại)
CREATE OR REPLACE VIEW vw_revenue_this_month AS
SELECT
    e.enterprise_id,
    e.business_name,
    COUNT(o.order_id)   AS total_orders,
    SUM(o.total_amount) AS total_revenue,
    SUM(o.shipping_fee) AS total_shipping_fee,
    EXTRACT(MONTH FROM CURRENT_DATE)::INT AS month,
    EXTRACT(YEAR  FROM CURRENT_DATE)::INT AS year
FROM enterprises e
LEFT JOIN orders o
    ON  o.enterprise_id = e.enterprise_id
    AND o.status        = 'COMPLETED'
    AND EXTRACT(MONTH FROM o.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR  FROM o.created_at) = EXTRACT(YEAR  FROM CURRENT_DATE)
GROUP BY e.enterprise_id, e.business_name;

-- ============================================================
-- END OF SCRIPT
-- ============================================================