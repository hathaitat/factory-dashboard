-- Add diligence_override_amount column to employee_period_overrides table
ALTER TABLE public.employee_period_overrides 
ADD COLUMN IF NOT EXISTS diligence_override_amount NUMERIC;
