-- Create Employees Table (Updated with new fields)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    address TEXT,
    phone TEXT,
    position TEXT,
    employment_type TEXT DEFAULT 'Full-time',
    start_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Active', -- Active, Resigned, OnLeave
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Allow public access (since we are using custom auth)
CREATE POLICY "Allow public access" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- Create Wage Payments Table (for future use / history)
CREATE TABLE IF NOT EXISTS public.wage_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    payment_date DATE DEFAULT CURRENT_DATE,
    work_days INTEGER DEFAULT 0,
    total_wage NUMERIC(15, 2) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for payments
ALTER TABLE public.wage_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON public.wage_payments FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
