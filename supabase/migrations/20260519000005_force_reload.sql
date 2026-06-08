ALTER TABLE public.inventory_bom_rules ADD COLUMN IF NOT EXISTS _dummy TEXT;
ALTER TABLE public.inventory_bom_rules DROP COLUMN IF EXISTS _dummy;
