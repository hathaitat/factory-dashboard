-- Add daily_wage column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS daily_wage NUMERIC(10, 2) DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN public.employees.daily_wage IS 'Daily wage for the employee';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
