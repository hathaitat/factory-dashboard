CREATE OR REPLACE FUNCTION delete_production_log(p_id UUID)
RETURNS VOID AS $$
DECLARE
    v_qty NUMERIC;
    v_plan_id UUID;
    v_target_wh UUID;
    v_product_name TEXT;
BEGIN
    -- 1. Get the log details
    SELECT quantity_produced, plan_id INTO v_qty, v_plan_id
    FROM public.production_daily_logs
    WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Get the target warehouse and product name from the plan
    SELECT target_warehouse_id, product_name INTO v_target_wh, v_product_name
    FROM public.production_plans
    WHERE id = v_plan_id;

    -- 3. Adjust the stock if there was a quantity
    IF v_target_wh IS NOT NULL AND v_qty > 0 THEN
        UPDATE public.warehouse_inventory
        SET quantity = quantity - v_qty,
            last_updated = now()
        WHERE warehouse_id = v_target_wh AND product_name = v_product_name;
    END IF;

    -- 4. Delete the log
    DELETE FROM public.production_daily_logs WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
