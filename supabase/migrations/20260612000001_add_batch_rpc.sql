-- Migration: add_batch_rpc.sql

-- 1. Batch Deduct Warehouse Stock
CREATE OR REPLACE FUNCTION batch_deduct_warehouse_stock(
    p_warehouse_id UUID,
    p_items JSONB,
    p_performed_by TEXT,
    p_invoice_no TEXT
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
            INSERT INTO warehouse_inventory (warehouse_id, sku, product_name, product_type, quantity, unit, min_stock, last_updated)
            VALUES (p_warehouse_id, v_item->>'sku', v_item->>'productName', 'finished', 0, COALESCE(v_item->>'unit', 'ชิ้น'), 10, NOW())
            RETURNING id, quantity INTO v_inv_id, v_old_qty;
            
            v_warnings := v_warnings || jsonb_build_array('สร้างสินค้ารหัส ' || COALESCE(v_item->>'sku', v_item->>'productName') || ' อัตโนมัติในคลังกระจายสินค้า เนื่องจากไม่พบในระบบ');
        END IF;

        v_new_qty := v_old_qty - v_change;
        IF v_new_qty < 0 THEN
            v_warnings := v_warnings || jsonb_build_array('สต็อกสินค้า ' || (v_item->>'productName') || ' ติดลบ (ยอดคงเหลือ: ' || v_new_qty || ')');
        END IF;

        UPDATE warehouse_inventory 
        SET quantity = v_new_qty, 
            last_updated = NOW(), 
            updated_by = p_performed_by
        WHERE id = v_inv_id;

        INSERT INTO inventory_logs (inventory_id, type, qty, old_quantity, balance, source_type, reference_no, remark, performed_by)
        VALUES (v_inv_id, 'OUT', v_change, v_old_qty, v_new_qty, 'invoice', p_invoice_no, 'ตัดสต็อกสำหรับใบกำกับภาษี ' || COALESCE(p_invoice_no, ''), p_performed_by);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'warnings', v_warnings);
END;
$$ LANGUAGE plpgsql;


-- 2. Batch Return Warehouse Stock
CREATE OR REPLACE FUNCTION batch_return_warehouse_stock(
    p_warehouse_id UUID,
    p_items JSONB,
    p_performed_by TEXT,
    p_invoice_no TEXT
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_inv_id UUID;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_change NUMERIC;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_change := (v_item->>'quantity')::NUMERIC;
        
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
            v_new_qty := v_old_qty + v_change;

            UPDATE warehouse_inventory 
            SET quantity = v_new_qty, 
                last_updated = NOW(), 
                updated_by = p_performed_by
            WHERE id = v_inv_id;

            INSERT INTO inventory_logs (inventory_id, type, qty, old_quantity, balance, source_type, reference_no, remark, performed_by)
            VALUES (v_inv_id, 'IN', v_change, v_old_qty, v_new_qty, 'invoice', p_invoice_no, 'คืนสต็อกเนื่องจากยกเลิก/แก้ไขใบกำกับภาษี ' || COALESCE(p_invoice_no, ''), p_performed_by);
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 3. Update Invoice with Items (Transaction)
CREATE OR REPLACE FUNCTION update_invoice_with_items(
    p_invoice_id UUID,
    p_invoice_data JSONB,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    v_item JSONB;
BEGIN
    UPDATE invoices
    SET 
        invoice_no = p_invoice_data->>'invoice_no',
        date = (p_invoice_data->>'date')::DATE,
        customer_id = (p_invoice_data->>'customer_id')::UUID,
        reference_no = p_invoice_data->>'reference_no',
        purchase_order_id = (p_invoice_data->>'purchase_order_id')::UUID,
        credit_days = (p_invoice_data->>'credit_days')::INTEGER,
        due_date = (p_invoice_data->>'due_date')::DATE,
        subtotal = (p_invoice_data->>'subtotal')::NUMERIC,
        discount = (p_invoice_data->>'discount')::NUMERIC,
        vat_rate = (p_invoice_data->>'vat_rate')::NUMERIC,
        vat_amount = (p_invoice_data->>'vat_amount')::NUMERIC,
        grand_total = (p_invoice_data->>'grand_total')::NUMERIC,
        baht_text = p_invoice_data->>'baht_text',
        notes = p_invoice_data->>'notes',
        adjustments = p_invoice_data->'adjustments',
        status = p_invoice_data->>'status',
        customer_snapshot = p_invoice_data->'customer_snapshot',
        updated_at = (p_invoice_data->>'updated_at')::TIMESTAMPTZ,
        updated_by = p_invoice_data->>'updated_by'
    WHERE id = p_invoice_id;

    DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO invoice_items (
            invoice_id, product_name, quantity, unit, price_per_unit, amount, sort_order
        ) VALUES (
            p_invoice_id,
            v_item->>'product_name',
            (v_item->>'quantity')::NUMERIC,
            v_item->>'unit',
            (v_item->>'price_per_unit')::NUMERIC,
            (v_item->>'amount')::NUMERIC,
            (v_item->>'sort_order')::INTEGER
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- 4. Update Requisition with Items (Transaction)
CREATE OR REPLACE FUNCTION update_requisition_with_items(
    p_req_id UUID,
    p_req_data JSONB,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    v_item JSONB;
BEGIN
    UPDATE internal_requisitions
    SET 
        requisition_number = COALESCE(p_req_data->>'requisition_number', requisition_number),
        date = COALESCE((p_req_data->>'date')::DATE, date),
        requested_by = COALESCE(p_req_data->>'requested_by', requested_by),
        department = COALESCE(p_req_data->>'department', department),
        notes = COALESCE(p_req_data->>'notes', notes),
        status = COALESCE(p_req_data->>'status', status),
        updated_at = COALESCE((p_req_data->>'updated_at')::TIMESTAMPTZ, updated_at),
        updated_by = COALESCE(p_req_data->>'updated_by', updated_by)
    WHERE id = p_req_id;

    DELETE FROM internal_requisition_items WHERE requisition_id = p_req_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO internal_requisition_items (
            requisition_id, item_id, item_name, quantity, unit, unit_price, amount, approved_quantity
        ) VALUES (
            p_req_id,
            NULLIF(v_item->>'item_id', '')::UUID,
            v_item->>'item_name',
            (v_item->>'quantity')::NUMERIC,
            v_item->>'unit',
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'amount')::NUMERIC,
            (v_item->>'approved_quantity')::NUMERIC
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- 5. Batch Approve Requisition Items
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
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_internal_item_id := NULLIF(v_item->>'item_id', '')::UUID;
        v_req_item_id := (v_item->>'req_item_id')::UUID;
        v_deduct_qty := (v_item->>'deduct_qty')::NUMERIC;
        v_final_approved_qty := (v_item->>'final_approved_qty')::NUMERIC;

        IF v_deduct_qty > 0 AND v_internal_item_id IS NOT NULL THEN
            -- Deduct stock
            SELECT current_stock INTO v_old_stock FROM internal_items WHERE id = v_internal_item_id FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'ไม่พบสินค้าภายใน %', v_internal_item_id;
            END IF;

            v_new_stock := v_old_stock - v_deduct_qty;
            IF v_new_stock < 0 THEN
                RAISE EXCEPTION 'สต๊อกไม่เพียงพอสำหรับทำรายการ';
            END IF;

            UPDATE internal_items 
            SET current_stock = v_new_stock, updated_at = NOW(), updated_by = p_approved_by 
            WHERE id = v_internal_item_id;

            -- Insert log
            INSERT INTO internal_item_logs (
                item_id, type, qty, previous_stock, new_stock, unit_cost, source_type, source_id, reference_no, remark, performed_by
            ) VALUES (
                v_internal_item_id,
                'OUT',
                v_deduct_qty,
                v_old_stock,
                v_new_stock,
                (v_item->>'unit_price')::NUMERIC,
                'requisition',
                p_req_id,
                p_requisition_number,
                'เบิกใช้ตามใบสั่งซื้อ ' || COALESCE(p_requisition_number, ''),
                p_approved_by
            );
        END IF;

        -- Update req item
        UPDATE internal_requisition_items 
        SET approved_quantity = v_final_approved_qty 
        WHERE id = v_req_item_id;
    END LOOP;

    -- Update req status
    UPDATE internal_requisitions
    SET status = p_new_status,
        approved_by = p_approved_by,
        updated_at = NOW(),
        updated_by = p_approved_by
    WHERE id = p_req_id;

END;
$$ LANGUAGE plpgsql;

