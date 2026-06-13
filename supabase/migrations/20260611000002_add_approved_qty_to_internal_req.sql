-- Add approved_quantity to internal_requisition_items to support partial fulfillment
ALTER TABLE public.internal_requisition_items
ADD COLUMN IF NOT EXISTS approved_quantity INTEGER DEFAULT 0;

-- Inform PostgREST to reload the schema cache so the new column is recognized immediately
NOTIFY pgrst, 'reload schema';
