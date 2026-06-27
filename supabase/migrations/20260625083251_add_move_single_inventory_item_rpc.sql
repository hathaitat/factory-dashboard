CREATE OR REPLACE FUNCTION move_single_inventory_item(
    p_inventory_id UUID,
    p_target_warehouse_id UUID,
    p_performed_by TEXT DEFAULT 'System'
) RETURNS JSONB AS $$
DECLARE
    v_source_item RECORD;
    v_target_item RECORD;
    v_new_qty NUMERIC;
    v_result JSONB;
BEGIN
    -- Get source item
    SELECT * INTO v_source_item FROM warehouse_inventory WHERE id = p_inventory_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found in source warehouse';
    END IF;

    -- Check if target is same as source
    IF v_source_item.warehouse_id = p_target_warehouse_id THEN
        RAISE EXCEPTION 'Item is already in the target warehouse';
    END IF;

    -- Find if item already exists in target warehouse
    SELECT * INTO v_target_item 
    FROM warehouse_inventory 
    WHERE warehouse_id = p_target_warehouse_id 
      AND ((v_source_item.sku IS NOT NULL AND sku = v_source_item.sku) 
           OR (v_source_item.sku IS NULL AND product_name = v_source_item.product_name))
    LIMIT 1 FOR UPDATE;

    IF FOUND THEN
        -- Item exists in target: merge them
        v_new_qty := COALESCE(v_target_item.quantity, 0) + COALESCE(v_source_item.quantity, 0);
        
        -- Update target item
        UPDATE warehouse_inventory 
        SET quantity = v_new_qty, 
            last_updated = NOW() 
        WHERE id = v_target_item.id;
        
        -- Log for target (receive from transfer)
        IF COALESCE(v_source_item.quantity, 0) != 0 THEN
            INSERT INTO inventory_logs (
                inventory_id, type, qty, old_quantity, balance, source_type, remark, performed_by
            ) VALUES (
                v_target_item.id, 'IN', ABS(v_source_item.quantity), COALESCE(v_target_item.quantity, 0), v_new_qty, 'warehouse_transfer', 'รับโอนสินค้ารายตัวข้ามคลัง', p_performed_by
            );
        END IF;

        -- Reassign BOM rules from source to target (ignore conflicts, let them cascade delete if duplicate)
        UPDATE inventory_bom_rules 
        SET inventory_id = v_target_item.id
        WHERE inventory_id = p_inventory_id
        AND supplier_product_id NOT IN (
            SELECT supplier_product_id FROM inventory_bom_rules WHERE inventory_id = v_target_item.id
        );

        -- Delete source item (will cascade delete remaining duplicate BOM rules)
        DELETE FROM warehouse_inventory WHERE id = p_inventory_id;
        
        v_result := jsonb_build_object('action', 'merged', 'target_inventory_id', v_target_item.id);
    ELSE
        -- Item does not exist in target: just change warehouse_id
        UPDATE warehouse_inventory 
        SET warehouse_id = p_target_warehouse_id, 
            last_updated = NOW() 
        WHERE id = p_inventory_id;

        -- Log transfer (just note the warehouse change)
        IF COALESCE(v_source_item.quantity, 0) != 0 THEN
            INSERT INTO inventory_logs (
                inventory_id, type, qty, old_quantity, balance, source_type, remark, performed_by
            ) VALUES (
                p_inventory_id, 'IN', 0, v_source_item.quantity, v_source_item.quantity, 'warehouse_transfer', 'ย้ายคลังสินค้ารายตัว', p_performed_by
            );
        END IF;
        
        v_result := jsonb_build_object('action', 'moved', 'target_inventory_id', p_inventory_id);
    END IF;

    NOTIFY pgrst, 'reload schema';

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
