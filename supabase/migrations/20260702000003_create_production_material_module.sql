-- ==========================================
-- 🏭 Production Material Module (Phase 2)
-- เบิกวัตถุดิบ (Requisition) และคืนวัตถุดิบ (Return)
-- ==========================================

-- 1. ตารางใบเบิกวัตถุดิบเพื่อการผลิต (production_requisitions)
CREATE TABLE production_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    req_no TEXT UNIQUE NOT NULL,                       -- เลขที่ใบเบิก (เช่น PR-256907-001)
    req_date DATE NOT NULL DEFAULT CURRENT_DATE,       -- วันที่เบิก
    line_id UUID NOT NULL REFERENCES production_lines(id), -- แผนกที่เบิก
    source_warehouse_id UUID NOT NULL REFERENCES warehouses(id), -- คลังที่เบิกออก
    target_plan_id UUID REFERENCES production_plans(id), -- (Optional) เบิกไปเพื่อแผนผลิตไหน
    status TEXT DEFAULT 'Completed',                   -- Draft, Completed, Cancelled (ปกติบันทึกปุ๊บ Completed เลย)
    notes TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ตารางรายการเบิกวัตถุดิบ (production_requisition_items)
CREATE TABLE production_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID NOT NULL REFERENCES production_requisitions(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES warehouse_inventory(id), -- สินค้าในคลัง (บอกทั้งสินค้าและ location)
    quantity NUMERIC NOT NULL DEFAULT 0,               -- จำนวนที่เบิก
    unit TEXT,                                         -- หน่วย (อิงจาก inventory)
    notes TEXT
);

-- 3. ตารางใบคืนวัตถุดิบจากผลิต (production_returns)
CREATE TABLE production_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_no TEXT UNIQUE NOT NULL,                    -- เลขที่ใบคืน (เช่น RT-256907-001)
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,    -- วันที่คืน
    line_id UUID NOT NULL REFERENCES production_lines(id), -- แผนกที่คืน
    target_warehouse_id UUID NOT NULL REFERENCES warehouses(id), -- คลังที่รับคืน
    ref_requisition_id UUID REFERENCES production_requisitions(id), -- (Optional) อ้างอิงใบเบิก
    status TEXT DEFAULT 'Completed',                   -- Draft, Completed, Cancelled
    notes TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ตารางรายการคืนวัตถุดิบ (production_return_items)
CREATE TABLE production_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES production_returns(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES warehouse_inventory(id),
    quantity NUMERIC NOT NULL DEFAULT 0,               -- จำนวนที่คืน
    unit TEXT,
    reason TEXT                                        -- เหตุผลที่คืน (สำคัญ)
);

-- Indexes
CREATE INDEX idx_prod_req_line ON production_requisitions(line_id);
CREATE INDEX idx_prod_req_date ON production_requisitions(req_date);
CREATE INDEX idx_prod_ret_line ON production_returns(line_id);
CREATE INDEX idx_prod_ret_date ON production_returns(return_date);

-- RPC for generating running numbers
CREATE OR REPLACE FUNCTION generate_production_doc_number(p_prefix TEXT, p_table TEXT)
RETURNS TEXT AS $$
DECLARE
    next_num INT;
    result_str TEXT;
BEGIN
    IF p_table = 'requisition' THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(req_no, '^.*-(\d{3})$', '\1'), '') :: INT), 0) + 1
        INTO next_num
        FROM production_requisitions
        WHERE req_no LIKE p_prefix || '-%';
    ELSIF p_table = 'return' THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(return_no, '^.*-(\d{3})$', '\1'), '') :: INT), 0) + 1
        INTO next_num
        FROM production_returns
        WHERE return_no LIKE p_prefix || '-%';
    ELSE
        RETURN p_prefix || '-001';
    END IF;

    result_str := p_prefix || '-' || LPAD(next_num::TEXT, 3, '0');
    RETURN result_str;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) - During Dev, disable RLS for convenience but remember to enable before Prod
-- Since user rule says "UNRESTRICTED (ปิด RLS)" during Dev. We will just not enable it.

-- Optional: Enable RLS and set policies (commented out for Dev, can be enabled later)
/*
ALTER TABLE production_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON production_requisitions FOR ALL USING (auth.role() = 'authenticated');
*/
