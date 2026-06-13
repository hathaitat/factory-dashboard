-- Migration: add_po_batch_rpc.sql

-- 1. Batch Receive PO Stock (Upsert and Add Stock)
CREATE OR REPLACE FUNCTION batch_receive_po_stock(
    p_warehouse_id UUID,
    p_items JSONB,
    p_performed_by TEXT,
    p_po_id UUID,
    p_po_number TEXT
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_inv_id UUID;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_change NUMERIC;
    v_warnings JSONB := '[]'::JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_change := (v_item->>'quantity')::NUMERIC;
        IF v_change <= 0 THEN
            CONTINUE; -- Skip if no new quantity to receive
        END IF;
        
        -- Try to find existing inventory item
        SELECT id, quantity INTO v_inv_id, v_old_qty 
        FROM warehouse_inventory 
        WHERE warehouse_id = p_warehouse_id 
          AND (
              (v_item->>'sku' IS NOT NULL AND sku = v_item->>'sku') 
              OR 
              (v_item->>'sku' IS NULL AND product_name = v_item->>'productName')
          )
        LIMIT 1 FOR UPDATE;
        
        IF NOT FOUND THEN
            -- Create new item if not found
            INSERT INTO warehouse_inventory (warehouse_id, sku, product_name, product_type, quantity, unit, min_stock, last_updated)
            VALUES (p_warehouse_id, v_item->>'sku', v_item->>'productName', 'raw_material', 0, COALESCE(v_item->>'unit', 'ชิ้น'), 10, NOW())
            RETURNING id, quantity INTO v_inv_id, v_old_qty;
            
            v_warnings := v_warnings || jsonb_build_array('สร้างสินค้ารหัส ' || COALESCE(v_item->>'sku', v_item->>'productName') || ' อัตโนมัติในคลัง เนื่องจากไม่พบในระบบ');
        END IF;

        v_new_qty := v_old_qty + v_change;

        UPDATE warehouse_inventory 
        SET quantity = v_new_qty, 
            last_updated = NOW(), 
            updated_by = p_performed_by
        WHERE id = v_inv_id;

        INSERT INTO inventory_logs (inventory_id, type, qty, old_quantity, balance, source_type, source_id, reference_no, remark, performed_by)
        VALUES (v_inv_id, 'IN', v_change, v_old_qty, v_new_qty, 'supplier_po', p_po_id, p_po_number, 'รับสินค้าเข้าคลังตามใบสั่งซื้อ ' || COALESCE(p_po_number, ''), p_performed_by);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'warnings', v_warnings);
END;
$$ LANGUAGE plpgsql;


-- 2. Batch Cancel PO Stock
CREATE OR REPLACE FUNCTION batch_cancel_po_stock(
    p_warehouse_id UUID,
    p_items JSONB,
    p_performed_by TEXT,
    p_po_id UUID,
    p_po_number TEXT
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_inv_id UUID;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_change NUMERIC;
    v_subcontract_log RECORD;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_change := (v_item->>'quantity')::NUMERIC;
        IF v_change <= 0 THEN
            CONTINUE;
        END IF;
        
        SELECT id, quantity INTO v_inv_id, v_old_qty 
        FROM warehouse_inventory 
        WHERE warehouse_id = p_warehouse_id 
          AND (
              (v_item->>'sku' IS NOT NULL AND sku = v_item->>'sku') 
              OR 
              (v_item->>'sku' IS NULL AND product_name = v_item->>'productName')
          )
        LIMIT 1 FOR UPDATE;
        
        IF FOUND THEN
            v_new_qty := v_old_qty - v_change;
            IF v_new_qty < 0 THEN
                RAISE EXCEPTION 'ไม่สามารถยกเลิกได้ เนื่องจากสต็อกสินค้า % ถูกใช้งานไปแล้วจนยอดคงเหลือติดลบหากทำการยกเลิก', (v_item->>'productName');
            END IF;

            UPDATE warehouse_inventory 
            SET quantity = v_new_qty, 
                last_updated = NOW(), 
                updated_by = p_performed_by
            WHERE id = v_inv_id;

            INSERT INTO inventory_logs (inventory_id, type, qty, old_quantity, balance, source_type, source_id, reference_no, remark, performed_by)
            VALUES (v_inv_id, 'OUT', v_change, v_old_qty, v_new_qty, 'supplier_po', p_po_id, p_po_number, 'ยกเลิกการรับสินค้าตามใบสั่งซื้อ ' || COALESCE(p_po_number, ''), p_performed_by);
        END IF;
    END LOOP;

    -- Handle return subcontract material
    FOR v_subcontract_log IN 
        SELECT inventory_id, qty 
        FROM inventory_logs 
        WHERE source_type = 'subcontract' AND source_id = p_po_id AND type = 'OUT'
    LOOP
        SELECT quantity INTO v_old_qty FROM warehouse_inventory WHERE id = v_subcontract_log.inventory_id FOR UPDATE;
        IF FOUND THEN
            v_new_qty := v_old_qty + v_subcontract_log.qty;
            UPDATE warehouse_inventory 
            SET quantity = v_new_qty, last_updated = NOW(), updated_by = p_performed_by
            WHERE id = v_subcontract_log.inventory_id;

            INSERT INTO inventory_logs (inventory_id, type, qty, old_quantity, balance, source_type, source_id, reference_no, remark, performed_by)
            VALUES (v_subcontract_log.inventory_id, 'IN', v_subcontract_log.qty, v_old_qty, v_new_qty, 'subcontract', p_po_id, p_po_number, 'คืนสต็อกวัตถุดิบ (ยกเลิกจ้างผลิต PO: ' || COALESCE(p_po_number, '') || ')', p_performed_by);
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 3. Adjust Internal Stock With Log
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
BEGIN
    SELECT current_stock INTO v_old_stock FROM internal_items WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF p_type = 'OUT' THEN
        v_new_stock := v_old_stock - p_qty;
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Insufficient stock';
        END IF;
    ELSIF p_type = 'IN' THEN
        v_new_stock := v_old_stock + p_qty;
    ELSE
        RAISE EXCEPTION 'Invalid adjustment type: %', p_type;
    END IF;

    UPDATE internal_items
    SET current_stock = v_new_stock,
        updated_at = NOW(),
        updated_by = p_performed_by
    WHERE id = p_id;

    INSERT INTO internal_item_logs (
        item_id, type, qty, previous_stock, new_stock, unit_cost, source_type, source_id, reference_no, remark, performed_by
    ) VALUES (
        p_id, p_type, p_qty, v_old_stock, v_new_stock, COALESCE(p_unit_cost, 0), p_source_type, p_source_id, p_reference_no, p_remark, p_performed_by
    );
END;
$$ LANGUAGE plpgsql;
