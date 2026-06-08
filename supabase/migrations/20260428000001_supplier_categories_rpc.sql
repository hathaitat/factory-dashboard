-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Create RPC functions for supplier categories (bypass schema cache issue)
CREATE OR REPLACE FUNCTION get_supplier_categories()
RETURNS TABLE(id BIGINT, name TEXT, created_at TIMESTAMPTZ) 
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT id, name, created_at FROM public.supplier_categories ORDER BY name ASC;
$$;

CREATE OR REPLACE FUNCTION add_supplier_category(p_name TEXT)
RETURNS TABLE(id BIGINT, name TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.supplier_categories (name) 
    VALUES (p_name)
    RETURNING supplier_categories.id, supplier_categories.name, supplier_categories.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION delete_supplier_category(p_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.supplier_categories WHERE id = p_id;
END;
$$;

-- Grant execute to anon/authenticated
GRANT EXECUTE ON FUNCTION get_supplier_categories() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_supplier_category(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_supplier_category(BIGINT) TO anon, authenticated;
