-- Migration: add_atomic_stock_functions.sql

-- Function to atomically adjust warehouse inventory stock
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(
    p_id UUID,
    p_delta NUMERIC,
    p_updated_by TEXT DEFAULT NULL,
    p_allow_negative BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(old_quantity NUMERIC, new_quantity NUMERIC) AS $$
DECLARE
    v_current NUMERIC;
BEGIN
    SELECT quantity INTO v_current FROM warehouse_inventory WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF NOT p_allow_negative AND (v_current + p_delta) < 0 THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;

    UPDATE warehouse_inventory
    SET quantity = quantity + p_delta,
        last_updated = NOW(),
        updated_by = COALESCE(p_updated_by, updated_by)
    WHERE id = p_id;

    RETURN QUERY SELECT v_current AS old_quantity, (v_current + p_delta) AS new_quantity;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically adjust internal items stock
CREATE OR REPLACE FUNCTION adjust_internal_stock(
    p_id UUID,
    p_delta NUMERIC,
    p_allow_negative BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(old_stock NUMERIC, new_stock NUMERIC) AS $$
DECLARE
    v_current NUMERIC;
BEGIN
    SELECT current_stock INTO v_current FROM internal_items WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF NOT p_allow_negative AND (v_current + p_delta) < 0 THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;

    UPDATE internal_items
    SET current_stock = current_stock + p_delta,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN QUERY SELECT v_current AS old_stock, (v_current + p_delta) AS new_stock;
END;
$$ LANGUAGE plpgsql;
