-- Create a trigger function to update total_received_quantity in supplier_pos
CREATE OR REPLACE FUNCTION public.update_supplier_po_total_received()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        UPDATE public.supplier_pos
        SET total_received_quantity = COALESCE((
            SELECT SUM(received_quantity)
            FROM public.supplier_po_items
            WHERE po_id = OLD.po_id
        ), 0),
        updated_at = NOW()
        WHERE id = OLD.po_id;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE' OR TG_OP = 'INSERT') THEN
        UPDATE public.supplier_pos
        SET total_received_quantity = COALESCE((
            SELECT SUM(received_quantity)
            FROM public.supplier_po_items
            WHERE po_id = NEW.po_id
        ), 0),
        updated_at = NOW()
        WHERE id = NEW.po_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_supplier_po_total_received_trigger ON public.supplier_po_items;

-- Create the trigger
CREATE TRIGGER update_supplier_po_total_received_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_po_items
FOR EACH ROW EXECUTE FUNCTION public.update_supplier_po_total_received();

-- Calculate initial values for existing rows
UPDATE public.supplier_pos sp
SET total_received_quantity = COALESCE((
    SELECT SUM(received_quantity)
    FROM public.supplier_po_items spi
    WHERE spi.po_id = sp.id
), 0);

-- Refresh the schema cache so the API recognizes any potential changes
NOTIFY pgrst, 'reload schema';
