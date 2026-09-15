ALTER TABLE public.payroll_periods DROP COLUMN IF EXISTS label;
NOTIFY pgrst, 'reload schema';
