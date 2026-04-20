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

