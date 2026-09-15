-- Add birthday_allowance to payroll_entries
ALTER TABLE public.payroll_entries 
ADD COLUMN IF NOT EXISTS birthday_allowance NUMERIC DEFAULT 0;
