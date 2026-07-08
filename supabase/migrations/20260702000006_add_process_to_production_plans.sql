ALTER TABLE public.production_plans 
ADD COLUMN process TEXT DEFAULT '';

ALTER TABLE public.production_plans
DROP CONSTRAINT IF EXISTS production_plans_line_id_plan_date_product_name_key;

ALTER TABLE public.production_plans
ADD CONSTRAINT production_plans_line_id_plan_date_product_name_process_key UNIQUE (line_id, plan_date, product_name, process);
