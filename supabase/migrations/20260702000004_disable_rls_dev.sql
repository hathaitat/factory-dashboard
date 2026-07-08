-- Disable RLS for all production tables during development
ALTER TABLE public.production_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_machines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_daily_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_requisitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_requisition_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_return_items DISABLE ROW LEVEL SECURITY;
