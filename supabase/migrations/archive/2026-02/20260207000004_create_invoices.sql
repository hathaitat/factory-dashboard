-- Create Invoices Table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
    reference_no TEXT,
    credit_days INTEGER DEFAULT 0,
    due_date DATE,
    subtotal NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    vat_rate NUMERIC(15, 2) DEFAULT 7.0,
    vat_amount NUMERIC(15, 2) DEFAULT 0,
    grand_total NUMERIC(15, 2) DEFAULT 0,
    baht_text TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Invoice Items Table
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity NUMERIC(15, 3) DEFAULT 1,
    unit TEXT,
    price_per_unit NUMERIC(15, 2) DEFAULT 0,
    amount NUMERIC(15, 2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow all for development)
CREATE POLICY "Allow all for invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);
