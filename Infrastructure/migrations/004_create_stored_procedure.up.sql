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