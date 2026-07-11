-- =========================================================================
-- โมดูลการผลิต (Production Module) - Phase 1
-- สร้างวันที่: 2026-07-02
-- =========================================================================

-- 1. ตาราง สาย/แผนกการผลิต (Production Lines)
CREATE TABLE IF NOT EXISTS public.production_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ตาราง เครื่องจักร (Production Machines)
CREATE TABLE IF NOT EXISTS public.production_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ตาราง เป้าหมายการผลิต (Production Plans)
CREATE TABLE IF NOT EXISTS public.production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID NOT NULL REFERENCES public.production_lines(id),
    plan_date DATE NOT NULL,
    plan_month TEXT NOT NULL, -- Format: YYYY-MM หรือตามที่ UI ส่งมา
    inventory_id UUID REFERENCES public.warehouse_inventory(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_code TEXT,
    target_quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'PCS',
    target_weight NUMERIC,
    weight_unit TEXT DEFAULT 'KG',
    conversion_rate NUMERIC, -- 1 unit = ? weight
    source_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    target_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    notes TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(line_id, plan_date, product_name)
);

-- 4. ตาราง บันทึกผลผลิตรายวัน (Production Daily Logs)
CREATE TABLE IF NOT EXISTS public.production_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.production_plans(id) ON DELETE CASCADE,
    line_id UUID NOT NULL REFERENCES public.production_lines(id),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    employee_name TEXT NOT NULL,
    machine_id UUID REFERENCES public.production_machines(id) ON DELETE SET NULL,
    machine_name TEXT,
    quantity_produced NUMERIC NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'PCS',
    weight_produced NUMERIC,
    weight_unit TEXT DEFAULT 'KG',
    quantity_defect NUMERIC DEFAULT 0,
    defect_reason TEXT,
    conversion_rate NUMERIC,
    notes TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- Trigger อัปเดต updated_at
-- =========================================================================

CREATE OR REPLACE FUNCTION update_production_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_production_lines_updated_at
BEFORE UPDATE ON public.production_lines
FOR EACH ROW EXECUTE FUNCTION update_production_updated_at();

CREATE TRIGGER update_production_machines_updated_at
BEFORE UPDATE ON public.production_machines
FOR EACH ROW EXECUTE FUNCTION update_production_updated_at();

CREATE TRIGGER update_production_plans_updated_at
BEFORE UPDATE ON public.production_plans
FOR EACH ROW EXECUTE FUNCTION update_production_updated_at();

CREATE TRIGGER update_production_daily_logs_updated_at
BEFORE UPDATE ON public.production_daily_logs
FOR EACH ROW EXECUTE FUNCTION update_production_updated_at();


-- =========================================================================
-- Indexes
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_prod_lines_status ON public.production_lines(status);
CREATE INDEX IF NOT EXISTS idx_prod_machines_line ON public.production_machines(line_id);
CREATE INDEX IF NOT EXISTS idx_prod_plans_line_month ON public.production_plans(line_id, plan_month);
CREATE INDEX IF NOT EXISTS idx_prod_plans_date ON public.production_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_prod_logs_plan ON public.production_daily_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_prod_logs_date ON public.production_daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_prod_logs_employee ON public.production_daily_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_prod_logs_machine ON public.production_daily_logs(machine_id);


-- =========================================================================
-- RPC Functions
-- =========================================================================

-- 1. Get Production Summary for a given month and line (or all lines if NULL)
CREATE OR REPLACE FUNCTION get_production_summary(p_month TEXT, p_line_id UUID DEFAULT NULL)
RETURNS TABLE (
    product_name TEXT,
    product_code TEXT,
    total_target NUMERIC,
    total_produced NUMERIC,
    total_defect NUMERIC,
    percent_success NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.product_name,
        p.product_code,
        SUM(p.target_quantity) AS total_target,
        COALESCE((
            SELECT SUM(l.quantity_produced)
            FROM public.production_daily_logs l
            WHERE l.plan_id IN (
                SELECT id FROM public.production_plans p2 
                WHERE p2.product_name = p.product_name AND p2.plan_month = p_month
                AND (p_line_id IS NULL OR p2.line_id = p_line_id)
            )
        ), 0) AS total_produced,
        COALESCE((
            SELECT SUM(l.quantity_defect)
            FROM public.production_daily_logs l
            WHERE l.plan_id IN (
                SELECT id FROM public.production_plans p2 
                WHERE p2.product_name = p.product_name AND p2.plan_month = p_month
                AND (p_line_id IS NULL OR p2.line_id = p_line_id)
            )
        ), 0) AS total_defect,
        CASE 
            WHEN SUM(p.target_quantity) > 0 THEN 
                (COALESCE((
                    SELECT SUM(l.quantity_produced)
                    FROM public.production_daily_logs l
                    WHERE l.plan_id IN (
                        SELECT id FROM public.production_plans p2 
                        WHERE p2.product_name = p.product_name AND p2.plan_month = p_month
                        AND (p_line_id IS NULL OR p2.line_id = p_line_id)
                    )
                ), 0) / SUM(p.target_quantity)) * 100
            ELSE 0 
        END AS percent_success
    FROM public.production_plans p
    WHERE p.plan_month = p_month
      AND (p_line_id IS NULL OR p.line_id = p_line_id)
    GROUP BY p.product_name, p.product_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Upsert Daily Logs as a Batch (Prevent multiple separate queries from frontend)
-- Requires JSON array of logs
CREATE OR REPLACE FUNCTION batch_upsert_production_logs(p_logs JSONB)
RETURNS VOID AS $$
DECLARE
    log_rec RECORD;
BEGIN
    FOR log_rec IN SELECT * FROM jsonb_array_elements(p_logs)
    LOOP
        IF (log_rec.value->>'id') IS NOT NULL AND (log_rec.value->>'id') != '' THEN
            -- Update
            UPDATE public.production_daily_logs
            SET 
                employee_id = NULLIF(log_rec.value->>'employee_id', '')::UUID,
                employee_name = log_rec.value->>'employee_name',
                machine_id = NULLIF(log_rec.value->>'machine_id', '')::UUID,
                machine_name = log_rec.value->>'machine_name',
                quantity_produced = (log_rec.value->>'quantity_produced')::NUMERIC,
                weight_produced = (log_rec.value->>'weight_produced')::NUMERIC,
                quantity_defect = (log_rec.value->>'quantity_defect')::NUMERIC,
                defect_reason = log_rec.value->>'defect_reason',
                conversion_rate = (log_rec.value->>'conversion_rate')::NUMERIC,
                notes = log_rec.value->>'notes',
                updated_by = log_rec.value->>'updated_by',
                updated_at = now()
            WHERE id = (log_rec.value->>'id')::UUID;
        ELSE
            -- Insert
            INSERT INTO public.production_daily_logs (
                plan_id, line_id, log_date, employee_id, employee_name, machine_id, machine_name,
                quantity_produced, unit, weight_produced, weight_unit, quantity_defect, defect_reason,
                conversion_rate, notes, created_by
            ) VALUES (
                (log_rec.value->>'plan_id')::UUID,
                (log_rec.value->>'line_id')::UUID,
                (log_rec.value->>'log_date')::DATE,
                NULLIF(log_rec.value->>'employee_id', '')::UUID,
                log_rec.value->>'employee_name',
                NULLIF(log_rec.value->>'machine_id', '')::UUID,
                log_rec.value->>'machine_name',
                (log_rec.value->>'quantity_produced')::NUMERIC,
                COALESCE(log_rec.value->>'unit', 'PCS'),
                (log_rec.value->>'weight_produced')::NUMERIC,
                COALESCE(log_rec.value->>'weight_unit', 'KG'),
                COALESCE((log_rec.value->>'quantity_defect')::NUMERIC, 0),
                log_rec.value->>'defect_reason',
                (log_rec.value->>'conversion_rate')::NUMERIC,
                log_rec.value->>'notes',
                log_rec.value->>'created_by'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- RLS (Row Level Security) and Permissions
-- =========================================================================

ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_daily_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to do operations (controlled by app UI)
CREATE POLICY "Allow authenticated read production_lines" ON public.production_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert production_lines" ON public.production_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update production_lines" ON public.production_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete production_lines" ON public.production_lines FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read production_machines" ON public.production_machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert production_machines" ON public.production_machines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update production_machines" ON public.production_machines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete production_machines" ON public.production_machines FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read production_plans" ON public.production_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert production_plans" ON public.production_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update production_plans" ON public.production_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete production_plans" ON public.production_plans FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read production_logs" ON public.production_daily_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert production_logs" ON public.production_daily_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update production_logs" ON public.production_daily_logs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete production_logs" ON public.production_daily_logs FOR DELETE TO authenticated USING (true);

-- Grant privileges to authenticated role
GRANT ALL ON TABLE public.production_lines TO authenticated;
GRANT ALL ON TABLE public.production_machines TO authenticated;
GRANT ALL ON TABLE public.production_plans TO authenticated;
GRANT ALL ON TABLE public.production_daily_logs TO authenticated;
