-- 1. Create Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Certificate-Products Junction Table
CREATE TABLE IF NOT EXISTS public.certificate_products (
    certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.customer_products(id) ON DELETE CASCADE,
    PRIMARY KEY (certificate_id, product_id)
);

-- 3. Create Certificate-Customers Junction Table
CREATE TABLE IF NOT EXISTS public.certificate_customers (
    certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
    PRIMARY KEY (certificate_id, customer_id)
);

-- 4. Set up RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON public.certificates FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON public.certificate_products FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON public.certificate_customers FOR ALL USING (true);

-- 5. Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'certificates' );

CREATE POLICY "Authenticated users can upload certificates"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'certificates' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can update certificates"
  ON storage.objects FOR UPDATE
  WITH CHECK ( bucket_id = 'certificates' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can delete certificates"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'certificates' AND auth.role() = 'authenticated' );
