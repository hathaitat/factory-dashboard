ALTER TABLE public.production_lines 
ADD COLUMN warehouse_ids JSONB DEFAULT '[]'::jsonb;
