ALTER TABLE public.inventory_bom_rules ADD COLUMN IF NOT EXISTS rounding_mode text DEFAULT 'exact';
COMMENT ON COLUMN public.inventory_bom_rules.rounding_mode IS 'Rounding mode: up, down, or exact';
