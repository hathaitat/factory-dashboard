-- =========================================================================
-- Phase 3: Auto Return Daily WIP
-- RPC to automatically return all excess WIP for a given day and line
-- =========================================================================

CREATE OR REPLACE FUNCTION auto_return_daily_wip(p_date DATE, p_line_id UUID, p_user TEXT)
RETURNS JSONB AS $$
DECLARE
    v_ret_id UUID;
    v_ret_no TEXT;
    v_wip_row RECORD;
    v_inserted INT := 0;
    v_result JSONB := '[]'::JSONB;
BEGIN
    -- Temporary table to hold computed WIP per plan, warehouse, inventory
    CREATE TEMP TABLE tmp_wip AS
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
        req.target_plan_id,
        req.source_warehouse_id,
        req.inventory_id,
        req.unit,
        (req.total_req - COALESCE(ret.total_ret, 0)) as wip_qty
    FROM req_summary req
    LEFT JOIN ret_summary ret ON req.target_plan_id = ret.target_plan_id AND req.inventory_id = ret.inventory_id
    WHERE (req.total_req - COALESCE(ret.total_ret, 0)) > 0;

    -- Iterate through distinct target_plan_id and source_warehouse_id that have WIP
    FOR v_wip_row IN (
        SELECT DISTINCT target_plan_id, source_warehouse_id 
        FROM tmp_wip
    )
    LOOP
        -- Generate Return No
        v_ret_no := public.generate_production_doc_number('RT-' || to_char(now() + interval '543 years', 'YYYYMM'), 'return');

        -- Insert Return Header
        INSERT INTO public.production_returns (
            return_no, return_date, line_id, target_warehouse_id, target_plan_id, status, notes, created_by, updated_by
        ) VALUES (
            v_ret_no, p_date, p_line_id, v_wip_row.source_warehouse_id, v_wip_row.target_plan_id, 'Completed', 'Auto-Return WIP from Daily Log', p_user, p_user
        ) RETURNING id INTO v_ret_id;

        -- Insert Return Items
        INSERT INTO public.production_return_items (
            return_id, inventory_id, quantity, unit, reason
        )
        SELECT 
            v_ret_id, inventory_id, wip_qty, unit, 'Auto-Return WIP'
        FROM tmp_wip
        WHERE target_plan_id = v_wip_row.target_plan_id AND source_warehouse_id = v_wip_row.source_warehouse_id;

        -- Update Stock for these items
        UPDATE public.warehouse_inventory inv
        SET quantity = inv.quantity + w.wip_qty,
            last_updated = now()
        FROM tmp_wip w
        WHERE inv.id = w.inventory_id 
          AND w.target_plan_id = v_wip_row.target_plan_id 
          AND w.source_warehouse_id = v_wip_row.source_warehouse_id;

        v_inserted := v_inserted + 1;
        
        -- Append to result
        v_result := v_result || jsonb_build_object('return_id', v_ret_id, 'return_no', v_ret_no);
    END LOOP;

    DROP TABLE tmp_wip;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
