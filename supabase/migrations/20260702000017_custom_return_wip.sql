-- =========================================================================
-- Task 2: Custom Auto-Return WIP RPCs
-- =========================================================================

CREATE OR REPLACE FUNCTION get_daily_wip(p_date DATE, p_line_id UUID)
RETURNS TABLE (
    plan_id UUID,
    source_warehouse_id UUID,
    inventory_id UUID,
    sku TEXT,
    product_name TEXT,
    wip_qty NUMERIC,
    unit TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH req_summary AS (
        SELECT 
            r.target_plan_id,
            r.source_warehouse_id,
            ri.inventory_id,
            ri.unit,
            SUM(ri.quantity) as total_req
        FROM public.production_requisitions r
        JOIN public.production_requisition_items ri ON r.id = ri.requisition_id
        WHERE r.line_id = p_line_id 
          AND r.target_plan_id IN (SELECT id FROM public.production_plans WHERE plan_date = p_date AND line_id = p_line_id)
          AND r.status != 'Cancelled'
        GROUP BY r.target_plan_id, r.source_warehouse_id, ri.inventory_id, ri.unit
    ),
    ret_summary AS (
        SELECT 
            r.target_plan_id,
            ri.inventory_id,
            SUM(ri.quantity) as total_ret
        FROM public.production_returns r
        JOIN public.production_return_items ri ON r.id = ri.return_id
        WHERE r.line_id = p_line_id 
          AND r.target_plan_id IN (SELECT id FROM public.production_plans WHERE plan_date = p_date AND line_id = p_line_id)
          AND r.status != 'Cancelled'
        GROUP BY r.target_plan_id, ri.inventory_id
    )
    SELECT 
        req.target_plan_id AS plan_id,
        req.source_warehouse_id,
        req.inventory_id,
        inv.sku,
        inv.product_name,
        (req.total_req - COALESCE(ret.total_ret, 0)) AS wip_qty,
        req.unit
    FROM req_summary req
    LEFT JOIN ret_summary ret ON req.target_plan_id = ret.target_plan_id AND req.inventory_id = ret.inventory_id
    LEFT JOIN public.warehouse_inventory inv ON inv.id = req.inventory_id
    WHERE (req.total_req - COALESCE(ret.total_ret, 0)) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION custom_return_daily_wip(p_date DATE, p_line_id UUID, p_user TEXT, p_returns JSONB)
RETURNS JSONB AS $$
DECLARE
    v_ret_id UUID;
    v_ret_no TEXT;
    v_wip_row RECORD;
    v_inserted INT := 0;
    v_result JSONB := '[]'::JSONB;
BEGIN
    -- Temporary table to hold custom return data
    CREATE TEMP TABLE tmp_custom_wip AS
    SELECT 
        (r->>'plan_id')::UUID AS plan_id,
        (r->>'source_warehouse_id')::UUID AS source_warehouse_id,
        (r->>'inventory_id')::UUID AS inventory_id,
        (r->>'return_qty')::NUMERIC AS return_qty,
        r->>'unit' AS unit
    FROM jsonb_array_elements(p_returns) AS r
    WHERE (r->>'return_qty')::NUMERIC > 0;

    -- Iterate through distinct plan_id and source_warehouse_id that have >0 returns
    FOR v_wip_row IN (
        SELECT DISTINCT plan_id, source_warehouse_id 
        FROM tmp_custom_wip
    )
    LOOP
        -- Generate Return No
        v_ret_no := public.generate_production_doc_number('RT-' || to_char(now() + interval '543 years', 'YYYYMM'), 'return');

        -- Insert Return Header
        INSERT INTO public.production_returns (
            return_no, return_date, line_id, target_warehouse_id, target_plan_id, status, notes, created_by, updated_by
        ) VALUES (
            v_ret_no, p_date, p_line_id, v_wip_row.source_warehouse_id, v_wip_row.plan_id, 'Completed', 'Custom Return WIP from Daily Log', p_user, p_user
        ) RETURNING id INTO v_ret_id;

        -- Insert Return Items
        INSERT INTO public.production_return_items (
            return_id, inventory_id, quantity, unit, reason
        )
        SELECT 
            v_ret_id, inventory_id, return_qty, unit, 'Custom Return WIP'
        FROM tmp_custom_wip
        WHERE plan_id = v_wip_row.plan_id AND source_warehouse_id = v_wip_row.source_warehouse_id;

        -- Update Stock for these items and insert logs
        WITH updated AS (
            UPDATE public.warehouse_inventory inv
            SET quantity = inv.quantity + w.return_qty,
                last_updated = now()
            FROM tmp_custom_wip w
            WHERE inv.id = w.inventory_id 
              AND w.plan_id = v_wip_row.plan_id 
              AND w.source_warehouse_id = v_wip_row.source_warehouse_id
            RETURNING inv.id, inv.quantity as new_quantity, w.return_qty
        )
        INSERT INTO public.inventory_logs (
            inventory_id, type, qty, old_quantity, balance, source_type, source_id, reference_no, remark, performed_by
        )
        SELECT 
            id, 'IN', return_qty, (new_quantity - return_qty), new_quantity, 'production_return', v_ret_id, v_ret_no, 'Custom Return WIP', p_user
        FROM updated;

        v_inserted := v_inserted + 1;
        
        -- Append to result
        v_result := v_result || jsonb_build_object('return_id', v_ret_id, 'return_no', v_ret_no);
    END LOOP;

    -- Drop temp table
    DROP TABLE tmp_custom_wip;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
