-- Increase precision for late_hours to avoid rounding (e.g., 0.35 to 0.4)
ALTER TABLE public.work_logs 
ALTER COLUMN late_hours TYPE NUMERIC;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
