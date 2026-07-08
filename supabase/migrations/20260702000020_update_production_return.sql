-- =========================================================================
-- Task 4: Update Production Return RPC
-- =========================================================================

CREATE OR REPLACE FUNCTION update_production_return(
    p_return_id UUID, 
    p_return_date DATE,
    p_line_id UUID,
    p_target_warehouse_id UUID,
    p_target_plan_id UUID,
    p_notes TEXT,
    p_user TEXT,
    p_items JSONB
)
RETURNS VOID AS $$
DECLARE
    v_old_item RECORD;
    v_new_item RECORD;
BEGIN
    -- 1. Revert Old Stock (Subtract what was added)
    FOR v_old_item IN (SELECT inventory_id, quantity FROM public.production_return_items WHERE return_id = p_return_id)
    LOOP
        UPDATE public.warehouse_inventory
        SET quantity = quantity - v_old_item.quantity,
            last_updated = now()
        WHERE id = v_old_item.inventory_id;
    END LOOP;

    -- 2. Delete old inventory logs
    DELETE FROM public.inventory_logs
    WHERE source_type = 'production_return' AND source_id = p_return_id;

    -- 3. Delete old items
    DELETE FROM public.production_return_items WHERE return_id = p_return_id;

    -- 4. Update header
    UPDATE public.production_returns
    SET return_date = p_return_date,
        line_id = p_line_id,
        target_warehouse_id = p_target_warehouse_id,
        target_plan_id = p_target_plan_id,
        notes = p_notes,
        updated_by = p_user,
        updated_at = now()
    WHERE id = p_return_id;

    -- 5. Insert new items and Apply new stock
    FOR v_new_item IN (
        SELECT 
            (i->>'inventory_id')::UUID AS inventory_id,
            (i->>'quantity')::NUMERIC AS quantity,
            (i->>'weight_kg')::NUMERIC AS weight_kg,
            i->>'unit' AS unit,
            i->>'reason' AS reason
        FROM jsonb_array_elements(p_items) AS i
    )
    LOOP
        -- Insert item
        INSERT INTO public.production_return_items (
            return_id, inventory_id, quantity, weight_kg, unit, reason
        ) VALUES (
            p_return_id, v_new_item.inventory_id, v_new_item.quantity, v_new_item.weight_kg, v_new_item.unit, v_new_item.reason
        );

        -- Apply new stock (Add back to warehouse)
        WITH updated AS (
            UPDATE public.warehouse_inventory
            SET quantity = quantity + v_new_item.quantity,
                last_updated = now()
            WHERE id = v_new_item.inventory_id
            RETURNING id, quantity as new_quantity
        )
        INSERT INTO public.inventory_logs (
            inventory_id, type, qty, old_quantity, balance, source_type, source_id, reference_no, remark, performed_by
        )
        SELECT 
            id, 'IN', v_new_item.quantity, (new_quantity - v_new_item.quantity), new_quantity, 'production_return', p_return_id, (SELECT return_no FROM public.production_returns WHERE id = p_return_id), 'Edit Return: ' || v_new_item.reason, p_user
        FROM updated;
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
