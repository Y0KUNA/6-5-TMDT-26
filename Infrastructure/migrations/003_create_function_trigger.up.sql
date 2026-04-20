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
