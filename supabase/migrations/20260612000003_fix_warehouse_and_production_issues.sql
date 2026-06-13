-- 1. transfer_warehouse_inventory
CREATE OR REPLACE FUNCTION transfer_warehouse_inventory(
    p_source_id UUID,
    p_target_id UUID,
    p_performed_by TEXT DEFAULT 'System'
) RETURNS void AS $$
DECLARE
    v_source_item RECORD;
    v_target_item RECORD;
    v_new_qty NUMERIC;
BEGIN
    -- Check if target is null
    IF p_target_id IS NULL THEN
        RAISE EXCEPTION 'ต้องระบุคลังสินค้าปลายทางเพื่อโอนย้ายสินค้าก่อนลบ';
    END IF;

    -- Iterate through source inventory
    FOR v_source_item IN SELECT * FROM warehouse_inventory WHERE warehouse_id = p_source_id LOOP
        -- Check if it exists in target
        SELECT * INTO v_target_item 
        FROM warehouse_inventory 
        WHERE warehouse_id = p_target_id 
          AND ((v_source_item.sku IS NOT NULL AND sku = v_source_item.sku) 
               OR (v_source_item.sku IS NULL AND product_name = v_source_item.product_name))
        LIMIT 1;

        IF FOUND THEN
            v_new_qty := COALESCE(v_target_item.quantity, 0) + COALESCE(v_source_item.quantity, 0);
            
            -- Update target
            UPDATE warehouse_inventory 
            SET quantity = v_new_qty, 
                last_updated = NOW() 
            WHERE id = v_target_item.id;
            
            -- Log movement for target if source had quantity
            IF COALESCE(v_source_item.quantity, 0) != 0 THEN
                INSERT INTO inventory_logs (
                    inventory_id, type, qty, old_quantity, balance, source_type, remark, performed_by
                ) VALUES (
                    v_target_item.id, 'IN', ABS(v_source_item.quantity), COALESCE(v_target_item.quantity, 0), v_new_qty, 'warehouse_transfer', 'รับโอนสินค้าจากคลังที่ถูกลบ', p_performed_by
                );
            END IF;

            -- Delete source
            DELETE FROM warehouse_inventory WHERE id = v_source_item.id;
        ELSE
            -- Change warehouse_id to target
            UPDATE warehouse_inventory 
            SET warehouse_id = p_target_id, 
                last_updated = NOW() 
            WHERE id = v_source_item.id;

            -- Log movement for transfer
            IF COALESCE(v_source_item.quantity, 0) != 0 THEN
                INSERT INTO inventory_logs (
                    inventory_id, type, qty, old_quantity, balance, source_type, remark, performed_by
                ) VALUES (
                    v_source_item.id, 'IN', 0, v_source_item.quantity, v_source_item.quantity, 'warehouse_transfer', 'โอนย้ายคลังสินค้า (เปลี่ยนคลังเนื่องจากคลังเดิมถูกลบ)', p_performed_by
                );
            END IF;
        END IF;
    END LOOP;

    -- Delete the source warehouse
    DELETE FROM warehouses WHERE id = p_source_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. generate_requisition_number
CREATE OR REPLACE FUNCTION generate_requisition_number(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_next_num INTEGER;
    v_last_num TEXT;
    v_lock_key BIGINT;
BEGIN
    -- Create a lock key based on hash of prefix to prevent concurrent generation of same prefix
    -- hashtext returns integer, we cast to bigint
    v_lock_key := hashtext(p_prefix)::BIGINT;
    
    -- Acquire transaction-level advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT requisition_number INTO v_last_num
    FROM internal_requisitions
    WHERE requisition_number LIKE p_prefix || '%'
    ORDER BY requisition_number DESC
    LIMIT 1;

    IF v_last_num IS NOT NULL THEN
        -- Safely extract number after prefix
        v_next_num := CAST(NULLIF(regexp_replace(v_last_num, '^' || p_prefix || '-', ''), '') AS INTEGER);
        v_next_num := COALESCE(v_next_num, 0) + 1;
    ELSE
        v_next_num := 1;
    END IF;

    RETURN p_prefix || '-' || LPAD(v_next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. view_low_stock_internal_items
CREATE OR REPLACE VIEW view_low_stock_internal_items AS
SELECT i.*, 
       c.name as category_name, 
       c.icon as category_icon, 
       c.color as category_color,
       jsonb_build_object(
           'id', c.id,
           'name', c.name,
           'icon', c.icon,
           'color', c.color
       ) as category
FROM internal_items i
LEFT JOIN internal_categories c ON i.category_id = c.id
WHERE i.status = 'active'
  AND (i.current_stock < 0 OR (i.min_stock > 0 AND i.current_stock <= i.min_stock));

-- Grant access to the view
GRANT SELECT ON view_low_stock_internal_items TO authenticated;
GRANT SELECT ON view_low_stock_internal_items TO anon;
GRANT SELECT ON view_low_stock_internal_items TO service_role;


-- 4. update_warehouse_inventory_with_log
CREATE OR REPLACE FUNCTION update_warehouse_inventory_with_log(
    p_id UUID,
    p_inventory_data JSONB,
    p_performed_by TEXT DEFAULT 'System'
) RETURNS JSONB AS $$
DECLARE
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_diff NUMERIC;
    v_action TEXT;
    v_updated_row JSONB;
BEGIN
    -- Get old qty
    SELECT quantity INTO v_old_qty FROM warehouse_inventory WHERE id = p_id;

    -- Update fields based on JSONB presence
    UPDATE warehouse_inventory
    SET
        sku = CASE WHEN p_inventory_data ? 'sku' THEN (p_inventory_data->>'sku') ELSE sku END,
        product_name = CASE WHEN p_inventory_data ? 'product_name' THEN (p_inventory_data->>'product_name') ELSE product_name END,
        product_type = CASE WHEN p_inventory_data ? 'product_type' THEN (p_inventory_data->>'product_type') ELSE product_type END,
        unit = CASE WHEN p_inventory_data ? 'unit' THEN (p_inventory_data->>'unit') ELSE unit END,
        quantity = CASE WHEN p_inventory_data ? 'quantity' THEN (p_inventory_data->>'quantity')::NUMERIC ELSE quantity END,
        min_stock = CASE WHEN p_inventory_data ? 'min_stock' THEN (p_inventory_data->>'min_stock')::NUMERIC ELSE min_stock END,
        last_updated = NOW()
    WHERE id = p_id
    RETURNING quantity INTO v_new_qty;

    IF v_new_qty IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    -- Check if quantity changed
    IF v_old_qty IS DISTINCT FROM v_new_qty THEN
        v_diff := v_new_qty - v_old_qty;
        IF v_diff > 0 THEN
            v_action := 'IN';
        ELSE
            v_action := 'OUT';
        END IF;

        INSERT INTO inventory_logs (
            inventory_id, type, qty, old_quantity, balance, source_type, remark, performed_by
        ) VALUES (
            p_id, v_action, ABS(v_diff), v_old_qty, v_new_qty, 'manual', 'ปรับปรุงข้อมูลสินค้า (Manual Update)', p_performed_by
        );
    END IF;

    -- Return the updated row
    SELECT to_jsonb(t) INTO v_updated_row FROM warehouse_inventory t WHERE id = p_id;
    RETURN v_updated_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
