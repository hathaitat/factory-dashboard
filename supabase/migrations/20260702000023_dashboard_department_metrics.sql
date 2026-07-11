-- ==========================================
-- 🏭 Dashboard Department Metrics RPC
-- ==========================================

DROP FUNCTION IF EXISTS get_department_dashboard_metrics(DATE, DATE);

CREATE OR REPLACE FUNCTION get_department_dashboard_metrics(p_date_from DATE, p_date_to DATE)
RETURNS TABLE (
    line_id UUID,
    line_name TEXT,
    total_target NUMERIC,
    total_produced NUMERIC,
    total_defect NUMERIC,
    total_requisition NUMERIC,
    total_return NUMERIC,
    machine_count BIGINT,
    employee_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH REQ_CTE AS (
        SELECT 
            r.line_id,
            SUM(ri.quantity) as req_qty
        FROM public.production_requisitions r
        JOIN public.production_requisition_items ri ON r.id = ri.requisition_id
        WHERE r.req_date >= p_date_from AND r.req_date <= p_date_to
        GROUP BY r.line_id
    ),
    RET_CTE AS (
        SELECT 
            r.line_id,
            SUM(ri.quantity) as ret_qty
        FROM public.production_returns r
        JOIN public.production_return_items ri ON r.id = ri.return_id
        WHERE r.return_date >= p_date_from AND r.return_date <= p_date_to
        GROUP BY r.line_id
    ),
    PLAN_CTE AS (
        SELECT 
            p.line_id,
            SUM(p.target_quantity) as target_qty
        FROM public.production_plans p
        WHERE p.plan_date >= p_date_from AND p.plan_date <= p_date_to
        GROUP BY p.line_id
    ),
    LOG_CTE AS (
        SELECT 
            l.line_id,
            SUM(l.quantity_produced) as prod_qty,
            SUM(l.quantity_defect) as def_qty,
            COUNT(DISTINCT l.machine_id) as m_count,
            COUNT(DISTINCT l.employee_id) as e_count
        FROM public.production_daily_logs l
        WHERE l.log_date >= p_date_from AND l.log_date <= p_date_to
        GROUP BY l.line_id
    )
    SELECT 
        pl.id AS line_id,
        pl.name AS line_name,
        COALESCE(p.target_qty, 0) AS total_target,
        COALESCE(l.prod_qty, 0) AS total_produced,
        COALESCE(l.def_qty, 0) AS total_defect,
        COALESCE(req.req_qty, 0) AS total_requisition,
        COALESCE(ret.ret_qty, 0) AS total_return,
        COALESCE(l.m_count, 0) AS machine_count,
        COALESCE(l.e_count, 0) AS employee_count
    FROM public.production_lines pl
    LEFT JOIN PLAN_CTE p ON pl.id = p.line_id
    LEFT JOIN LOG_CTE l ON pl.id = l.line_id
    LEFT JOIN REQ_CTE req ON pl.id = req.line_id
    LEFT JOIN RET_CTE ret ON pl.id = ret.line_id
    ORDER BY pl.sort_order, pl.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
