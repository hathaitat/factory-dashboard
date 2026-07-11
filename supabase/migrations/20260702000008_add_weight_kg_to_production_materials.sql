-- เพิ่มฟิลด์ weight_kg ในตารางรายการเบิกวัตถุดิบและรายการคืนวัตถุดิบ
ALTER TABLE public.production_requisition_items ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 0;
ALTER TABLE public.production_return_items ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 0;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
