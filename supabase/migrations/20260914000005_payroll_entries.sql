-- Add working_days to payroll_periods
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS working_days NUMERIC DEFAULT 0;

-- Create payroll_entries table
CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    daily_wage NUMERIC DEFAULT 0,
    position_allowance NUMERIC DEFAULT 0,
    skill_allowance NUMERIC DEFAULT 0,
    actual_working_days NUMERIC DEFAULT 0,
    ot_1_5_hours NUMERIC DEFAULT 0,
    ot_1_6_hours NUMERIC DEFAULT 0,
    diligence_allowance NUMERIC DEFAULT 0,
    company_loan NUMERIC DEFAULT 0,
    transport_allowance NUMERIC DEFAULT 0,
    bonus NUMERIC DEFAULT 0,
    shift_allowance NUMERIC DEFAULT 0,
    back_pay NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(period_id, employee_id)
);

-- RLS Policies for payroll_entries
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to view payroll entries"
    ON public.payroll_entries FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert payroll entries"
    ON public.payroll_entries FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payroll entries"
    ON public.payroll_entries FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete payroll entries"
    ON public.payroll_entries FOR DELETE
    TO authenticated
    USING (true);
