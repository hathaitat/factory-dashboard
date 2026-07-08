-- =========================================================================
-- Task 2: Fix Duplicate Logs in batch_upsert_production_logs
-- =========================================================================

CREATE OR REPLACE FUNCTION batch_upsert_production_logs(p_logs JSONB)
RETURNS VOID AS $$
DECLARE
    log_rec RECORD;
    v_target_wh UUID;
    v_product_name TEXT;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_delta NUMERIC;
    v_id UUID;
    v_exists BOOLEAN;
BEGIN
    FOR log_rec IN SELECT * FROM jsonb_array_elements(p_logs)
    LOOP
        -- Get Plan Info for Auto Transfer
        SELECT target_warehouse_id, product_name INTO v_target_wh, v_product_name 
        FROM public.production_plans 
        WHERE id = (log_rec.value->>'plan_id')::UUID;
        
        v_id := NULLIF(log_rec.value->>'id', '')::UUID;
        v_new_qty := COALESCE((log_rec.value->>'quantity_produced')::NUMERIC, 0);

        -- Check if record exists by ID
        v_exists := FALSE;
        IF v_id IS NOT NULL THEN
            SELECT quantity_produced INTO v_old_qty 
            FROM public.production_daily_logs WHERE id = v_id;
            
            IF FOUND THEN
                v_exists := TRUE;
            END IF;
        END IF;

        IF v_exists THEN
            -- UPDATE logic with Delta calculation
            v_delta := v_new_qty - COALESCE(v_old_qty, 0);

            UPDATE public.production_daily_logs
            SET 
                employee_id = NULLIF(log_rec.value->>'employee_id', '')::UUID,
                employee_name = log_rec.value->>'employee_name',
                machine_id = NULLIF(log_rec.value->>'machine_id', '')::UUID,
                machine_name = log_rec.value->>'machine_name',
                quantity_produced = v_new_qty,
                weight_produced = (log_rec.value->>'weight_produced')::NUMERIC,
                quantity_defect = COALESCE((log_rec.value->>'quantity_defect')::NUMERIC, 0),
                defect_reason = log_rec.value->>'defect_reason',
                conversion_rate = (log_rec.value->>'conversion_rate')::NUMERIC,
                notes = log_rec.value->>'notes',
                updated_by = log_rec.value->>'updated_by',
                updated_at = now()
            WHERE id = v_id;
        ELSE
            -- Generate new UUID if not provided so we can safely insert
            IF v_id IS NULL THEN
                v_id := gen_random_uuid();
            END IF;

            -- INSERT logic
            v_delta := v_new_qty;

            INSERT INTO public.production_daily_logs (
                id, plan_id, line_id, log_date, employee_id, employee_name, machine_id, machine_name,
                quantity_produced, unit, weight_produced, weight_unit, quantity_defect, defect_reason,
                conversion_rate, notes, created_by
            ) VALUES (
                v_id,
                (log_rec.value->>'plan_id')::UUID,
                (log_rec.value->>'line_id')::UUID,
                (log_rec.value->>'log_date')::DATE,
                NULLIF(log_rec.value->>'employee_id', '')::UUID,
                log_rec.value->>'employee_name',
                NULLIF(log_rec.value->>'machine_id', '')::UUID,
                log_rec.value->>'machine_name',
                v_new_qty,
                COALESCE(log_rec.value->>'unit', 'PCS'),
                (log_rec.value->>'weight_produced')::NUMERIC,
                COALESCE(log_rec.value->>'weight_unit', 'KG'),
                COALESCE((log_rec.value->>'quantity_defect')::NUMERIC, 0),
                log_rec.value->>'defect_reason',
                (log_rec.value->>'conversion_rate')::NUMERIC,
                log_rec.value->>'notes',
                log_rec.value->>'created_by'
            );
        END IF;

        -- Apply Delta to Target Warehouse if specified
        IF v_target_wh IS NOT NULL AND v_delta != 0 THEN
            UPDATE public.warehouse_inventory
            SET quantity = quantity + v_delta,
                last_updated = now()
            WHERE warehouse_id = v_target_wh AND product_name = v_product_name;

            IF NOT FOUND THEN
                INSERT INTO public.warehouse_inventory (warehouse_id, product_name, product_type, quantity, unit)
                VALUES (v_target_wh, v_product_name, 'finished_good', v_delta, COALESCE(log_rec.value->>'unit', 'PCS'));
            END IF;
        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
