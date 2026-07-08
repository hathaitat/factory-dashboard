-- =========================================================================
-- Task: Update Delete Production Requisition RPC
-- Description: When deleting a requisition, it should not delete the log history. 
-- Instead, it should insert a new log entry to indicate the stock return.
-- =========================================================================

CREATE OR REPLACE FUNCTION delete_production_requisition(p_requisition_id UUID, p_user TEXT)
RETURNS VOID AS $$
DECLARE
    v_req_item RECORD;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_req_no TEXT;
BEGIN
    -- Get Requisition No for reference
    SELECT req_no INTO v_req_no FROM public.production_requisitions WHERE id = p_requisition_id;

    -- 1. Loop through items and restore stock, then add a return log
    FOR v_req_item IN (SELECT inventory_id, quantity FROM public.production_requisition_items WHERE requisition_id = p_requisition_id)
    LOOP
        -- Get current quantity before reversion
        SELECT quantity INTO v_old_qty FROM public.warehouse_inventory WHERE id = v_req_item.inventory_id;
        
        -- Revert stock (Add back what was taken out)
        v_new_qty := v_old_qty + v_req_item.quantity;

        UPDATE public.warehouse_inventory
        SET quantity = v_new_qty,
            last_updated = now()
        WHERE id = v_req_item.inventory_id;

        -- Log the return movement (instead of deleting the old out log)
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
            v_req_item.inventory_id,
            'IN',
            v_req_item.quantity,
            v_old_qty,
            v_new_qty,
            'production_requisition_cancel',
            p_requisition_id,
            v_req_no,
            'ยกเลิกใบเบิก',
            p_user
        );
    END LOOP;

    -- 2. Do NOT delete inventory logs associated with this requisition
    -- The old 'OUT' logs remain in the system for traceability.

    -- 3. The items will be cascade deleted because of ON DELETE CASCADE on the table definition
    -- DELETE FROM public.production_requisition_items WHERE requisition_id = p_requisition_id;

    -- 4. Delete the requisition header
    DELETE FROM public.production_requisitions WHERE id = p_requisition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
