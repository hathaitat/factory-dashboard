-- Add last_login_at column to staff_members
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- =============================================================
-- Trigger: Protect superadmin from being deleted
-- =============================================================
CREATE OR REPLACE FUNCTION protect_superadmin_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.username = 'superadmin' THEN
        RAISE EXCEPTION 'ไม่สามารถลบผู้ใช้งาน superadmin ได้';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_superadmin_delete ON public.staff_members;
CREATE TRIGGER trg_protect_superadmin_delete
    BEFORE DELETE ON public.staff_members
    FOR EACH ROW
    EXECUTE FUNCTION protect_superadmin_delete();

-- =============================================================
-- Trigger: Protect default warehouse from being deleted
-- =============================================================
CREATE OR REPLACE FUNCTION protect_default_warehouse_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_default = true THEN
        RAISE EXCEPTION 'ไม่สามารถลบคลังสินค้าเริ่มต้นได้';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_default_warehouse_delete ON public.warehouses;
CREATE TRIGGER trg_protect_default_warehouse_delete
    BEFORE DELETE ON public.warehouses
    FOR EACH ROW
    EXECUTE FUNCTION protect_default_warehouse_delete();

-- =============================================================
-- Seed superadmin user with full access (17 modules)
-- Password: admin123 (bcrypt hash)
-- =============================================================
INSERT INTO public.staff_members (full_name, username, email, password, permissions)
VALUES (
    'Super Admin',
    'superadmin',
    'superadmin@system.local',
    '$2b$10$gozKeogcPH4Rht7ocnGHl.ssh5.3.c6KI4HKJgXhdC8RscyOKBvN2',
    '{
        "overview": {"view": true, "create": true, "edit": true, "delete": true},
        "customers": {"view": true, "create": true, "edit": true, "delete": true},
        "suppliers": {"view": true, "create": true, "edit": true, "delete": true},
        "supplier_pos": {"view": true, "create": true, "edit": true, "delete": true},
        "warehouses": {"view": true, "create": true, "edit": true, "delete": true},
        "certificates": {"view": true, "create": true, "edit": true, "delete": true},
        "purchase_orders": {"view": true, "create": true, "edit": true, "delete": true},
        "quotations": {"view": true, "create": true, "edit": true, "delete": true},
        "invoices": {"view": true, "create": true, "edit": true, "delete": true},
        "billing": {"view": true, "create": true, "edit": true, "delete": true},
        "employees": {"view": true, "create": true, "edit": true, "delete": true},
        "company": {"view": true, "create": true, "edit": true, "delete": true},
        "users": {"view": true, "create": true, "edit": true, "delete": true},
        "settings": {"view": true, "create": true, "edit": true, "delete": true},
        "production": {"view": true, "create": true, "edit": true, "delete": true},
        "internal_items": {"view": true, "create": true, "edit": true, "delete": true},
        "internal_requisitions": {"view": true, "create": true, "edit": true, "delete": true}
    }'::jsonb
)
ON CONFLICT (username) DO NOTHING;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
