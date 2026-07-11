-- =========================================================================
-- Task 1: New RPCs for DateRange Filtering in Dashboard
-- =========================================================================

CREATE OR REPLACE FUNCTION get_production_summary_by_date(p_date_from DATE, p_date_to DATE, p_line_id UUID DEFAULT NULL)
RETURNS TABLE (
    product_name TEXT,
    product_code TEXT,
    total_target NUMERIC,
    total_produced NUMERIC,
    total_defect NUMERIC,
    total_requisition NUMERIC,
    percent_success NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH REQ_CTE AS (
        SELECT 
            r.plan_id,
            SUM(ri.quantity) as req_qty
        FROM public.production_requisitions r
        JOIN public.production_requisition_items ri ON r.id = ri.requisition_id
        WHERE r.requisition_date >= p_date_from AND r.requisition_date <= p_date_to
        GROUP BY r.plan_id
    )
    SELECT 
        p.product_name,
        p.product_code,
        SUM(p.target_quantity) AS total_target,
        COALESCE((
            SELECT SUM(l.quantity_produced)
            FROM public.production_daily_logs l
            WHERE l.plan_id IN (
                SELECT id FROM public.production_plans p2 
                WHERE p2.product_name = p.product_name 
                AND p2.plan_date >= p_date_from AND p2.plan_date <= p_date_to
                AND (p_line_id IS NULL OR p2.line_id = p_line_id)
            )
        ), 0) AS total_produced,
        COALESCE((
            SELECT SUM(l.quantity_defect)
            FROM public.production_daily_logs l
            WHERE l.plan_id IN (
                SELECT id FROM public.production_plans p2 
                WHERE p2.product_name = p.product_name 
                AND p2.plan_date >= p_date_from AND p2.plan_date <= p_date_to
                AND (p_line_id IS NULL OR p2.line_id = p_line_id)
            )
        ), 0) AS total_defect,
        COALESCE((
            SELECT SUM(req_qty)
            FROM REQ_CTE req
            WHERE req.plan_id IN (
                SELECT id FROM public.production_plans p2 
                WHERE p2.product_name = p.product_name 
                AND p2.plan_date >= p_date_from AND p2.plan_date <= p_date_to
                AND (p_line_id IS NULL OR p2.line_id = p_line_id)
            )
        ), 0) AS total_requisition,
        CASE 
            WHEN SUM(p.target_quantity) > 0 THEN 
                (COALESCE((
                    SELECT SUM(l.quantity_produced)
                    FROM public.production_daily_logs l
                    WHERE l.plan_id IN (
                        SELECT id FROM public.production_plans p2 
                        WHERE p2.product_name = p.product_name 
                        AND p2.plan_date >= p_date_from AND p2.plan_date <= p_date_to
                        AND (p_line_id IS NULL OR p2.line_id = p_line_id)
                    )
                ), 0) / SUM(p.target_quantity)) * 100
            ELSE 0 
        END AS percent_success
    FROM public.production_plans p
    WHERE p.plan_date >= p_date_from AND p.plan_date <= p_date_to
      AND (p_line_id IS NULL OR p.line_id = p_line_id)
    GROUP BY p.product_name, p.product_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
