-- Migration to create billing_notes and billing_note_items tables

-- 1. Create Billing Notes Table
CREATE TABLE IF NOT EXISTS public.billing_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_note_no TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Billing Note Items Table (Link Invoices to Billing Note)
CREATE TABLE IF NOT EXISTS public.billing_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_note_id UUID REFERENCES public.billing_notes(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(billing_note_id, invoice_id)
);

-- 3. Enable RLS
ALTER TABLE public.billing_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_note_items ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allow all for development)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_notes' AND policyname = 'Allow all for billing_notes') THEN
        CREATE POLICY "Allow all for billing_notes" ON public.billing_notes FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_note_items' AND policyname = 'Allow all for billing_note_items') THEN
        CREATE POLICY "Allow all for billing_note_items" ON public.billing_note_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
