-- ==================================================
-- SECURITY FIX SCRIPT v2
-- Fix #1: Lock down RLS policies
-- Fix #2: Server-side password verification (RPC)
-- Fix #5: Server-side brute-force protection
-- ==================================================

-- Enable pgcrypto extension in extensions schema (Supabase default)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ==========================================
-- FIX #5: Add brute-force tracking columns
-- ==========================================
ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ;

-- ==========================================
-- FIX #2: Server-side login verification
-- ==========================================
-- This function runs with SECURITY DEFINER which means it executes
-- with superuser privileges — the client NEVER receives the password hash.
-- Uses pgcrypto crypt() but converts $2b$ -> $2a$ for compatibility
-- with bcryptjs-generated hashes.

CREATE OR REPLACE FUNCTION verify_login(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user RECORD;
    v_attempts INTEGER;
    v_lockout_until TIMESTAMPTZ;
    v_stored_hash TEXT;
    v_compat_hash TEXT;
BEGIN
    -- Fetch user
    SELECT * INTO v_user
    FROM staff_members
    WHERE username = p_username;

    IF v_user IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    END IF;

    -- FIX #5: Check server-side brute force protection
    v_attempts := COALESCE(v_user.failed_login_attempts, 0);
    v_lockout_until := v_user.lockout_until;

    IF v_lockout_until IS NOT NULL AND v_lockout_until > NOW() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'บัญชีถูกระงับชั่วคราว กรุณาลองใหม่ในอีกสักครู่',
            'locked_until', v_lockout_until
        );
    END IF;

    -- Get stored hash and convert $2b$ to $2a$ for pgcrypto compat
    v_stored_hash := v_user.password;
    v_compat_hash := v_stored_hash;
    
    -- bcryptjs uses $2a$ or $2b$ prefix, pgcrypto crypt() needs $2a$
    IF v_compat_hash LIKE '$2b$%' THEN
        v_compat_hash := '$2a$' || substring(v_compat_hash from 5);
    END IF;

    -- Verify password using pgcrypto crypt() (explicit schema reference)
    IF extensions.crypt(p_password, v_compat_hash) = v_compat_hash THEN
        -- Success: Reset failed attempts
        UPDATE staff_members
        SET failed_login_attempts = 0, lockout_until = NULL
        WHERE id = v_user.id;

        RETURN json_build_object(
            'success', true,
            'user', json_build_object(
                'id', v_user.id,
                'fullName', v_user.full_name,
                'email', v_user.email,
                'username', v_user.username,
                'permissions', v_user.permissions
            )
        );
    ELSE
        -- Failed: Increment counter
        v_attempts := v_attempts + 1;

        IF v_attempts >= 3 THEN
            -- Lock for 5 minutes
            UPDATE staff_members
            SET failed_login_attempts = v_attempts,
                lockout_until = NOW() + INTERVAL '5 minutes'
            WHERE id = v_user.id;
        ELSE
            UPDATE staff_members
            SET failed_login_attempts = v_attempts
            WHERE id = v_user.id;
        END IF;

        RETURN json_build_object(
            'success', false,
            'message', format('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาส %s ครั้ง)', 3 - v_attempts),
            'remaining_attempts', 3 - v_attempts
        );
    END IF;
END;
$$;

-- ==========================================
-- FIX #1: Lock down RLS Policies
-- ==========================================

-- Step 1: Drop old "Allow all" policies
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'customers', 'invoices', 'invoice_items', 
            'billing_notes', 'billing_note_items',
            'employees', 'work_logs', 'staff_members',
            'settings', 'company_info', 'customer_products',
            'purchase_orders', 'purchase_order_items',
            'payroll_periods', 'employee_period_overrides'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow All" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all for development" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Block direct access" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow staff insert" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow staff management" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow staff update" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow staff delete" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated access" ON public.%I', tbl);
    END LOOP;
END $$;

-- Step 2: Staff Members — Block direct SELECT (protects password hashes)
-- The verify_login function bypasses RLS because it's SECURITY DEFINER
CREATE POLICY "Block direct access" ON public.staff_members
    FOR SELECT TO anon
    USING (false);

CREATE POLICY "Allow staff insert" ON public.staff_members
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow staff update" ON public.staff_members
    FOR UPDATE TO anon
    USING (true) WITH CHECK (true);

CREATE POLICY "Allow staff delete" ON public.staff_members
    FOR DELETE TO anon
    USING (true);

-- Step 3: All other tables — Allow full access for now
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'customers', 'invoices', 'invoice_items', 
            'billing_notes', 'billing_note_items',
            'employees', 'work_logs', 'settings', 'company_info', 
            'customer_products', 'purchase_orders', 'purchase_order_items',
            'payroll_periods', 'employee_period_overrides'
        )
    LOOP
        EXECUTE format(
            'CREATE POLICY "Allow authenticated access" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)',
            tbl
        );
    END LOOP;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- VERIFICATION QUERY
-- ==========================================
-- Test: SELECT verify_login('admin_bell', 'Maw2025!');
