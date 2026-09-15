ALTER TABLE public.payroll_entries
ADD COLUMN IF NOT EXISTS custom_allowances JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
