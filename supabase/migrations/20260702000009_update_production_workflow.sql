-- =========================================================================
-- Phase 3: Production Workflow (Target Warehouses & Returns)
-- =========================================================================

-- 1. Add target_warehouse_id to production_plans
ALTER TABLE public.production_plans 
ADD COLUMN IF NOT EXISTS target_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- 2. Add target_plan_id to production_returns to track returns against a specific plan
ALTER TABLE public.production_returns
ADD COLUMN IF NOT EXISTS target_plan_id UUID REFERENCES public.production_plans(id) ON DELETE CASCADE;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_prod_plans_target_wh ON public.production_plans(target_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_prod_returns_plan ON public.production_returns(target_plan_id);

-- Optional: Add output_inventory_id to production_daily_logs for tracking what was produced
ALTER TABLE public.production_daily_logs
ADD COLUMN IF NOT EXISTS output_inventory_id UUID REFERENCES public.warehouse_inventory(id) ON DELETE SET NULL;

-- Update updated_at trigger functionality if needed, though they already exist.
