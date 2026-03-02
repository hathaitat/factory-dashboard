-- Create payroll_periods table
CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to prevent identical periods
CREATE UNIQUE INDEX idx_payroll_periods_dates ON public.payroll_periods (start_date, end_date);

-- Enable RLS
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

-- Create policy for all-access for now (consistent with other tables)
CREATE POLICY "Allow all access to payroll_periods" ON public.payroll_periods
    FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
