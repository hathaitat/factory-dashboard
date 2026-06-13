-- Fix column name in update_requisition_with_items RPC
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
        remark = COALESCE(p_req_data->>'remark', remark),
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

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
