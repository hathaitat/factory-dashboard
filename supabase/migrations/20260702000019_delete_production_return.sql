-- =========================================================================
-- Task 4: Delete Production Return RPC
-- =========================================================================

CREATE OR REPLACE FUNCTION delete_production_return(p_return_id UUID, p_user TEXT)
RETURNS VOID AS $$
DECLARE
    v_ret_item RECORD;
BEGIN
    -- 1. Loop through items and restore stock (Returns added stock, so deletion must subtract it)
    FOR v_ret_item IN (SELECT inventory_id, quantity FROM public.production_return_items WHERE return_id = p_return_id)
    LOOP
        -- Revert stock (Subtract what was added)
        UPDATE public.warehouse_inventory
        SET quantity = quantity - v_ret_item.quantity,
            last_updated = now()
        WHERE id = v_ret_item.inventory_id;
    END LOOP;

    -- 2. Delete inventory logs associated with this return
    DELETE FROM public.inventory_logs
    WHERE source_type = 'production_return' AND source_id = p_return_id;

    -- 3. The items will be cascade deleted because of ON DELETE CASCADE on the table definition
    -- DELETE FROM public.production_return_items WHERE return_id = p_return_id;

    -- 4. Delete the return header
    DELETE FROM public.production_returns WHERE id = p_return_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
