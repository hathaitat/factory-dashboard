-- ================================================================
-- Moving Average Cost (MAC) for Internal Items
-- ================================================================
-- When receiving stock IN:
--   new_avg = (old_qty × old_price + new_qty × new_price) / (old_qty + new_qty)
-- When issuing stock OUT:
--   Use current unit_price (the MAC) as the cost
-- ================================================================


-- 1. Update adjust_internal_stock_with_log to support MAC
CREATE OR REPLACE FUNCTION adjust_internal_stock_with_log(
    p_id UUID,
    p_type TEXT,
    p_qty NUMERIC,
    p_unit_cost NUMERIC,
    p_remark TEXT,
    p_performed_by TEXT,
    p_source_type TEXT,
    p_source_id UUID,
    p_reference_no TEXT
) RETURNS VOID AS $$
DECLARE
    v_old_stock NUMERIC;
    v_new_stock NUMERIC;
    v_current_unit_price NUMERIC;
    v_new_unit_price NUMERIC;
    v_log_unit_cost NUMERIC;
BEGIN
    -- Lock row and get current stock + unit_price
    SELECT current_stock, COALESCE(unit_price, 0)
    INTO v_old_stock, v_current_unit_price
    FROM internal_items
    WHERE id = p_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF p_type = 'OUT' THEN
        v_new_stock := v_old_stock - p_qty;
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Insufficient stock';
        END IF;

        -- OUT: use current MAC as the cost for this withdrawal
        v_log_unit_cost := v_current_unit_price;

        UPDATE internal_items
        SET current_stock = v_new_stock,
            updated_at = NOW(),
            updated_by = p_performed_by
        WHERE id = p_id;

    ELSIF p_type = 'IN' THEN
        v_new_stock := v_old_stock + p_qty;
        v_log_unit_cost := COALESCE(p_unit_cost, 0);

        -- Calculate Moving Average Cost
        IF v_new_stock > 0 AND v_log_unit_cost > 0 THEN
            v_new_unit_price := (v_old_stock * v_current_unit_price + p_qty * v_log_unit_cost) / v_new_stock;
        ELSIF v_log_unit_cost > 0 THEN
            -- Edge case: stock was 0, just use the new cost
            v_new_unit_price := v_log_unit_cost;
        ELSE
            -- No cost provided, keep existing price
            v_new_unit_price := v_current_unit_price;
        END IF;

        UPDATE internal_items
        SET current_stock = v_new_stock,
            unit_price = v_new_unit_price,
            updated_at = NOW(),
            updated_by = p_performed_by
        WHERE id = p_id;

    ELSE
        RAISE EXCEPTION 'Invalid adjustment type: %', p_type;
    END IF;

    -- Insert movement log
    INSERT INTO internal_item_logs (
        item_id, type, qty, previous_stock, new_stock, unit_cost,
        source_type, source_id, reference_no, remark, performed_by
    ) VALUES (
        p_id, p_type, p_qty, v_old_stock, v_new_stock, v_log_unit_cost,
        p_source_type, p_source_id, p_reference_no, p_remark, p_performed_by
    );
END;
$$ LANGUAGE plpgsql;


-- 2. Update batch_approve_requisition_items to use current MAC price from master record
CREATE OR REPLACE FUNCTION batch_approve_requisition_items(
    p_req_id UUID,
    p_items JSONB,
    p_approved_by TEXT,
    p_requisition_number TEXT,
    p_new_status TEXT
) RETURNS VOID AS $$
DECLARE
    v_item JSONB;
    v_internal_item_id UUID;
    v_req_item_id UUID;
    v_deduct_qty NUMERIC;
    v_final_approved_qty NUMERIC;
    v_old_stock NUMERIC;
    v_new_stock NUMERIC;
    v_current_unit_price NUMERIC;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_internal_item_id := NULLIF(v_item->>'item_id', '')::UUID;
        v_req_item_id := (v_item->>'req_item_id')::UUID;
        v_deduct_qty := (v_item->>'deduct_qty')::NUMERIC;
        v_final_approved_qty := (v_item->>'final_approved_qty')::NUMERIC;

        IF v_deduct_qty > 0 AND v_internal_item_id IS NOT NULL THEN
            -- Lock row and get current stock + MAC price
            SELECT current_stock, COALESCE(unit_price, 0)
            INTO v_old_stock, v_current_unit_price
            FROM internal_items
            WHERE id = v_internal_item_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'ไม่พบสินค้าภายใน %', v_internal_item_id;
            END IF;

            v_new_stock := v_old_stock - v_deduct_qty;
            IF v_new_stock < 0 THEN
                RAISE EXCEPTION 'สต๊อกไม่เพียงพอสำหรับทำรายการ';
            END IF;

            UPDATE internal_items
            SET current_stock = v_new_stock,
                updated_at = NOW(),
                updated_by = p_approved_by
            WHERE id = v_internal_item_id;

            -- Log using current MAC price (not requisition item price)
            INSERT INTO internal_item_logs (
                item_id, type, qty, previous_stock, new_stock, unit_cost,
                source_type, source_id, reference_no, remark, performed_by
            ) VALUES (
                v_internal_item_id,
                'OUT',
                v_deduct_qty,
                v_old_stock,
                v_new_stock,
                v_current_unit_price,
                'requisition',
                p_req_id,
                p_requisition_number,
                'เบิกใช้ตามใบสั่งซื้อ ' || COALESCE(p_requisition_number, ''),
                p_approved_by
            );
        END IF;

        -- Update req item approved quantity
        UPDATE internal_requisition_items
        SET approved_quantity = v_final_approved_qty
        WHERE id = v_req_item_id;
    END LOOP;

    -- Update requisition status
    UPDATE internal_requisitions
    SET status = p_new_status,
        approved_by = p_approved_by,
        updated_at = NOW(),
        updated_by = p_approved_by
    WHERE id = p_req_id;
END;
$$ LANGUAGE plpgsql;
