-- Create Supplier Product Price History Table
CREATE TABLE public.supplier_product_price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES public.supplier_products(id) ON DELETE CASCADE,
    price numeric(15,2) NOT NULL,
    effective_date timestamp with time zone DEFAULT now(),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- Grant access
GRANT ALL ON public.supplier_product_price_history TO anon, authenticated;
ALTER TABLE public.supplier_product_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON public.supplier_product_price_history FOR ALL USING (true) WITH CHECK (true);

-- Trigger to automatically log price changes
CREATE OR REPLACE FUNCTION log_supplier_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.price IS DISTINCT FROM NEW.price) THEN
        INSERT INTO public.supplier_product_price_history (product_id, price, notes)
        VALUES (NEW.id, NEW.price, CASE WHEN TG_OP = 'INSERT' THEN 'Initial price' ELSE 'Price update' END);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_log_supplier_product_price_change
AFTER INSERT OR UPDATE ON public.supplier_products
FOR EACH ROW
EXECUTE FUNCTION log_supplier_product_price_change();
