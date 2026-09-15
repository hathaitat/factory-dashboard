ALTER TABLE public.payroll_entries
ADD COLUMN IF NOT EXISTS ot_1_6_hours NUMERIC DEFAULT 0;

NOTIFY pgrst, 'reload schema';
