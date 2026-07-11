-- =========================================================================
-- Task 3: Delete Production Requisition RPC
-- =========================================================================

CREATE OR REPLACE FUNCTION delete_production_requisition(p_requisition_id UUID, p_user TEXT)
RETURNS VOID AS $$
DECLARE
    v_req_item RECORD;
BEGIN
    -- 1. Loop through items and restore stock
    FOR v_req_item IN (SELECT inventory_id, quantity FROM public.production_requisition_items WHERE requisition_id = p_requisition_id)
    LOOP
        -- Revert stock (Add back what was taken out)
        UPDATE public.warehouse_inventory
        SET quantity = quantity + v_req_item.quantity,
            last_updated = now()
        WHERE id = v_req_item.inventory_id;
    END LOOP;

    -- 2. Delete inventory logs associated with this requisition
    DELETE FROM public.inventory_logs
    WHERE source_type = 'production_requisition' AND source_id = p_requisition_id;

    -- 3. The items will be cascade deleted because of ON DELETE CASCADE on the table definition
    -- DELETE FROM public.production_requisition_items WHERE requisition_id = p_requisition_id;

    -- 4. Delete the requisition header
    DELETE FROM public.production_requisitions WHERE id = p_requisition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
