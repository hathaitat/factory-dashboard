-- Create Supplier Categories Table
CREATE TABLE public.supplier_categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id to suppliers
ALTER TABLE public.suppliers ADD COLUMN category_id BIGINT REFERENCES public.supplier_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON public.supplier_categories FOR ALL USING (true) WITH CHECK (true);

-- Insert initial categories
INSERT INTO public.supplier_categories (name) VALUES ('Service'), ('Material'), ('Office Supplies'), ('Others')
ON CONFLICT (name) DO NOTHING;

-- Grant access
GRANT ALL ON public.supplier_categories TO anon, authenticated;
