-- Create Work Logs Table
CREATE TABLE IF NOT EXISTS public.work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    work_days NUMERIC(3, 1) DEFAULT 1.0, -- 1.0, 0.5
    ot_hours NUMERIC(4, 1) DEFAULT 0.0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access (custom auth)
CREATE POLICY "Allow public access" ON public.work_logs FOR ALL USING (true) WITH CHECK (true);

-- Index for faster query by employee and date
CREATE INDEX idx_work_logs_employee_date ON public.work_logs(employee_id, work_date);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
