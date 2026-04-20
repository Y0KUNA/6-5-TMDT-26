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
