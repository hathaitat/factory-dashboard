-- 1. CREATE SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tax_id TEXT,
    branch TEXT DEFAULT '',
    credit_term INTEGER DEFAULT 0,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    fax TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Active'
);

-- 2. ENABLE RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 3. CREATE POLICIES (Enable access to authenticated users only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'Enable access to authenticated users only') THEN
        CREATE POLICY "Enable access to authenticated users only" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
