-- =========================================================================
-- Create RPCs for atomic requisition and return creation
-- to prevent N+1 and race conditions during stock adjustment
-- =========================================================================

-- 1. Create Production Requisition
CREATE OR REPLACE FUNCTION create_production_requisition(
    p_req_data JSONB,
    p_items_data JSONB,
    p_performed_by TEXT
)
RETURNS UUID AS $$
DECLARE
    v_req_id UUID;
    v_req_no TEXT;
    v_item RECORD;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_prefix TEXT;
BEGIN
    -- Generate Doc Number (Format: PR-YYYYMM-XXXX)
    v_prefix := 'PR-' || (EXTRACT(YEAR FROM CURRENT_DATE) + 543)::TEXT || TO_CHAR(CURRENT_DATE, 'MM');
    v_req_no := public.generate_production_doc_number(v_prefix, 'requisition');

    -- Insert Header
    INSERT INTO public.production_requisitions (
        req_no,
        req_date,
        line_id,
        source_warehouse_id,
        target_plan_id,
        notes,
        created_by
    ) VALUES (
        v_req_no,
        (p_req_data->>'req_date')::DATE,
        (p_req_data->>'line_id')::UUID,
        (p_req_data->>'source_warehouse_id')::UUID,
        NULLIF(p_req_data->>'target_plan_id', '')::UUID,
        p_req_data->>'notes',
        p_performed_by
    ) RETURNING id INTO v_req_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
    LOOP
        -- Insert Item
        INSERT INTO public.production_requisition_items (
            requisition_id,
            inventory_id,
            quantity,
            weight_kg,
            unit,
            notes
        ) VALUES (
            v_req_id,
            (v_item.value->>'inventory_id')::UUID,
            (v_item.value->>'quantity')::NUMERIC,
            COALESCE((v_item.value->>'weight_kg')::NUMERIC, 0),
            v_item.value->>'unit',
            v_item.value->>'notes'
        );

        -- Adjust Stock (Atomic)
        SELECT quantity INTO v_old_qty
        FROM public.warehouse_inventory
        WHERE id = (v_item.value->>'inventory_id')::UUID
        FOR UPDATE;

        IF v_old_qty IS NULL THEN
            RAISE EXCEPTION 'ไม่พบรายการสินค้าในคลัง กรุณาตรวจสอบรายการที่เลือก';
        END IF;

        v_new_qty := v_old_qty - (v_item.value->>'quantity')::NUMERIC;

        UPDATE public.warehouse_inventory
        SET quantity = v_new_qty,
            last_updated = NOW()
        WHERE id = (v_item.value->>'inventory_id')::UUID;

        -- Log Movement
        INSERT INTO public.inventory_logs (
            inventory_id,
            type,
            qty,
            old_quantity,
            balance,
            source_type,
            source_id,
            reference_no,
            remark,
            performed_by
        ) VALUES (
            (v_item.value->>'inventory_id')::UUID,
            'OUT',
            (v_item.value->>'quantity')::NUMERIC,
            v_old_qty,
            v_new_qty,
            'production_requisition',
            v_req_id,
            v_req_no,
            TRIM('เบิกวัตถุดิบเข้าแผนกผลิต (อ้างอิง: ' || v_req_no || ') ' || COALESCE(v_item.value->>'notes', '')),
            p_performed_by
        );
    END LOOP;

    RETURN v_req_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create Production Return
CREATE OR REPLACE FUNCTION create_production_return(
    p_return_data JSONB,
    p_items_data JSONB,
    p_performed_by TEXT
)
RETURNS UUID AS $$
DECLARE
    v_ret_id UUID;
    v_ret_no TEXT;
    v_item RECORD;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_prefix TEXT;
BEGIN
    -- Generate Doc Number (Format: RT-YYYYMM-XXXX)
    v_prefix := 'RT-' || (EXTRACT(YEAR FROM CURRENT_DATE) + 543)::TEXT || TO_CHAR(CURRENT_DATE, 'MM');
    v_ret_no := public.generate_production_doc_number(v_prefix, 'return');

    -- Insert Header
    INSERT INTO public.production_returns (
        return_no,
        return_date,
        line_id,
        target_warehouse_id,
        ref_requisition_id,
        notes,
        created_by
    ) VALUES (
        v_ret_no,
        (p_return_data->>'return_date')::DATE,
        (p_return_data->>'line_id')::UUID,
        (p_return_data->>'target_warehouse_id')::UUID,
        NULLIF(p_return_data->>'ref_requisition_id', '')::UUID,
        p_return_data->>'notes',
        p_performed_by
    ) RETURNING id INTO v_ret_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
    LOOP
        -- Insert Item
        INSERT INTO public.production_return_items (
            return_id,
            inventory_id,
            quantity,
            weight_kg,
            unit,
            reason
        ) VALUES (
            v_ret_id,
            (v_item.value->>'inventory_id')::UUID,
            (v_item.value->>'quantity')::NUMERIC,
            COALESCE((v_item.value->>'weight_kg')::NUMERIC, 0),
            v_item.value->>'unit',
            v_item.value->>'reason'
        );

        -- Adjust Stock (Atomic)
        SELECT quantity INTO v_old_qty
        FROM public.warehouse_inventory
        WHERE id = (v_item.value->>'inventory_id')::UUID
        FOR UPDATE;

        IF v_old_qty IS NULL THEN
            RAISE EXCEPTION 'ไม่พบรายการสินค้าในคลัง กรุณาตรวจสอบรายการที่เลือก';
        END IF;

        v_new_qty := v_old_qty + (v_item.value->>'quantity')::NUMERIC;

        UPDATE public.warehouse_inventory
        SET quantity = v_new_qty,
            last_updated = NOW()
        WHERE id = (v_item.value->>'inventory_id')::UUID;

        -- Log Movement
        INSERT INTO public.inventory_logs (
            inventory_id,
            type,
            qty,
            old_quantity,
            balance,
            source_type,
            source_id,
            reference_no,
            remark,
            performed_by
        ) VALUES (
            (v_item.value->>'inventory_id')::UUID,
            'IN',
            (v_item.value->>'quantity')::NUMERIC,
            v_old_qty,
            v_new_qty,
            'production_return',
            v_ret_id,
            v_ret_no,
            TRIM('คืนวัตถุดิบจากแผนกผลิต (เหตุผล: ' || COALESCE(v_item.value->>'reason', '') || ')'),
            p_performed_by
        );
    END LOOP;

    RETURN v_ret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
