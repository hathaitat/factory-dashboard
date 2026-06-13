-- Migration: get_po_dashboard_stats.sql

CREATE OR REPLACE FUNCTION get_po_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE status = 'Completed'),
        'partial', COUNT(*) FILTER (WHERE status = 'Partial'),
        'draft', COUNT(*) FILTER (WHERE status = 'Draft'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'Cancelled'),
        'overdue', COUNT(*) FILTER (WHERE status IN ('Draft', 'Partial') AND delivery_date < CURRENT_DATE)
    ) INTO result
    FROM supplier_pos;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
