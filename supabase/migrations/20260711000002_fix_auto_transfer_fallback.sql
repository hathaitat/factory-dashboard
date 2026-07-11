-- =========================================================================
-- Fix: Auto Transfer fallback for missing sku or warehouse_id in plan
-- =========================================================================

CREATE OR REPLACE FUNCTION batch_upsert_production_logs(p_logs JSONB)
RETURNS VOID AS $$
DECLARE
    log_rec RECORD;
    v_target_wh UUID;
    v_product_name TEXT;
    v_product_code TEXT;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_delta NUMERIC;
    v_existing_inv_id UUID;
    v_found_wh UUID;
    v_found_sku TEXT;
BEGIN
    FOR log_rec IN SELECT * FROM jsonb_array_elements(p_logs)
    LOOP
        -- Get Plan Info: target warehouse + product_name + product_code (SKU)
        SELECT target_warehouse_id, product_name, product_code
          INTO v_target_wh, v_product_name, v_product_code
          FROM public.production_plans
         WHERE id = (log_rec.value->>'plan_id')::UUID;

        IF (log_rec.value->>'id') IS NOT NULL AND (log_rec.value->>'id') != '' THEN
            -- Update logic with Delta calculation
            SELECT quantity_produced INTO v_old_qty
              FROM public.production_daily_logs
             WHERE id = (log_rec.value->>'id')::UUID;

            v_new_qty := (log_rec.value->>'quantity_produced')::NUMERIC;
            v_delta   := COALESCE(v_new_qty, 0) - COALESCE(v_old_qty, 0);

            UPDATE public.production_daily_logs
               SET employee_id       = NULLIF(log_rec.value->>'employee_id', '')::UUID,
                   employee_name     = log_rec.value->>'employee_name',
                   machine_id        = NULLIF(log_rec.value->>'machine_id', '')::UUID,
                   machine_name      = log_rec.value->>'machine_name',
                   quantity_produced = v_new_qty,
                   weight_produced   = (log_rec.value->>'weight_produced')::NUMERIC,
                   quantity_defect   = (log_rec.value->>'quantity_defect')::NUMERIC,
                   defect_reason     = log_rec.value->>'defect_reason',
                   conversion_rate   = (log_rec.value->>'conversion_rate')::NUMERIC,
                   notes             = log_rec.value->>'notes',
                   updated_by        = log_rec.value->>'updated_by',
                   updated_at        = now()
             WHERE id = (log_rec.value->>'id')::UUID;

        ELSE
            -- Insert logic
            v_delta := COALESCE((log_rec.value->>'quantity_produced')::NUMERIC, 0);

            INSERT INTO public.production_daily_logs (
                plan_id, line_id, log_date, employee_id, employee_name, machine_id, machine_name,
                quantity_produced, unit, weight_produced, weight_unit, quantity_defect, defect_reason,
                conversion_rate, notes, created_by
            ) VALUES (
                (log_rec.value->>'plan_id')::UUID,
                (log_rec.value->>'line_id')::UUID,
                (log_rec.value->>'log_date')::DATE,
                NULLIF(log_rec.value->>'employee_id', '')::UUID,
                log_rec.value->>'employee_name',
                NULLIF(log_rec.value->>'machine_id', '')::UUID,
                log_rec.value->>'machine_name',
                v_delta,
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

        -- Fallback: If plan is missing sku or target_wh, try to find it from warehouse_inventory using name
        IF (v_target_wh IS NULL OR v_product_code IS NULL OR v_product_code = '') AND v_delta != 0 THEN
            SELECT warehouse_id, sku INTO v_found_wh, v_found_sku
              FROM public.warehouse_inventory
             WHERE product_name = v_product_name
             LIMIT 1;

            IF v_target_wh IS NULL THEN
                v_target_wh := v_found_wh;
            END IF;
            IF v_product_code IS NULL OR v_product_code = '' THEN
                v_product_code := v_found_sku;
            END IF;
        END IF;

        -- Apply Delta to Target Warehouse if specified
        IF v_target_wh IS NOT NULL AND v_delta != 0 THEN

            -- Step 1: Try to match by SKU (product_code) first
            v_existing_inv_id := NULL;

            IF v_product_code IS NOT NULL AND v_product_code != '' THEN
                SELECT id INTO v_existing_inv_id
                  FROM public.warehouse_inventory
                 WHERE warehouse_id = v_target_wh
                   AND sku = v_product_code
                 LIMIT 1;
            END IF;

            -- Step 2: Fallback to product_name match if no SKU match
            IF v_existing_inv_id IS NULL THEN
                SELECT id INTO v_existing_inv_id
                  FROM public.warehouse_inventory
                 WHERE warehouse_id = v_target_wh
                   AND product_name = v_product_name
                 LIMIT 1;
            END IF;

            IF v_existing_inv_id IS NOT NULL THEN
                -- Update existing row
                UPDATE public.warehouse_inventory
                   SET quantity     = quantity + v_delta,
                       last_updated = now()
                 WHERE id = v_existing_inv_id;
            ELSE
                -- Create new row only if truly no match
                INSERT INTO public.warehouse_inventory (warehouse_id, product_name, sku, product_type, quantity, unit)
                VALUES (
                    v_target_wh,
                    v_product_name,
                    NULLIF(v_product_code, ''),
                    'finished_good',
                    v_delta,
                    COALESCE(log_rec.value->>'unit', 'PCS')
                );
            END IF;

        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
