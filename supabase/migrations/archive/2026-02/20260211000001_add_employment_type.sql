-- Add employment_type column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-time';

-- Comment on column
COMMENT ON COLUMN public.employees.employment_type IS 'Employment status: Full-time, Part-time, Internship';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
