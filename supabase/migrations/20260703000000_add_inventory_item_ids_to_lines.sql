-- Add inventory_item_ids to production_lines to store bound items
ALTER TABLE public.production_lines 
ADD COLUMN inventory_item_ids JSONB DEFAULT '[]'::jsonb;
