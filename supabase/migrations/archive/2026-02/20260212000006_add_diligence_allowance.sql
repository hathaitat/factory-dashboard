-- Add diligence_allowance to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS diligence_allowance NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.employees.diligence_allowance IS 'Fixed amount for perfect attendance (Diligence Allowance)';

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';
