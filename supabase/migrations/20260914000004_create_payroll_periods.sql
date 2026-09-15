CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to view payroll periods"
    ON public.payroll_periods FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert payroll periods"
    ON public.payroll_periods FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payroll periods"
    ON public.payroll_periods FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete payroll periods"
    ON public.payroll_periods FOR DELETE
    TO authenticated
    USING (true);
