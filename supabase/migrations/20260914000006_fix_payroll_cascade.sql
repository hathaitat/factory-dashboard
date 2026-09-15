-- Drop existing foreign key on period_id if exists
ALTER TABLE public.payroll_entries DROP CONSTRAINT IF EXISTS payroll_entries_period_id_fkey;

-- Re-add the foreign key with ON DELETE CASCADE
ALTER TABLE public.payroll_entries 
    ADD CONSTRAINT payroll_entries_period_id_fkey 
    FOREIGN KEY (period_id) 
    REFERENCES public.payroll_periods(id) 
    ON DELETE CASCADE;

-- Also do it for employee_id just in case
ALTER TABLE public.payroll_entries DROP CONSTRAINT IF EXISTS payroll_entries_employee_id_fkey;

ALTER TABLE public.payroll_entries 
    ADD CONSTRAINT payroll_entries_employee_id_fkey 
    FOREIGN KEY (employee_id) 
    REFERENCES public.employees(id) 
    ON DELETE CASCADE;
