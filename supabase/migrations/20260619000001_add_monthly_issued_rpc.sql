-- Calculate actual monthly issued value from logs
CREATE OR REPLACE FUNCTION get_monthly_internal_issued_value(p_year INT, p_month INT) RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(qty * unit_cost), 0) INTO v_total
    FROM internal_item_logs
    WHERE type = 'OUT'
      AND EXTRACT(YEAR FROM created_at) = p_year
      AND EXTRACT(MONTH FROM created_at) = p_month;
      
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;
