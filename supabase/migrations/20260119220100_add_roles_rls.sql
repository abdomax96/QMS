-- Migration: Add RLS Policies for Roles Table
-- Date: 2026-01-19
-- Description: Ensures roles table allows CRUD for authenticated users
SET app.bypass_permission_check = 'on';
-- Enable RLS if not already enabled
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if any
DROP POLICY IF EXISTS "roles_select_policy" ON roles;
DROP POLICY IF EXISTS "roles_insert_policy" ON roles;
DROP POLICY IF EXISTS "roles_update_policy" ON roles;
DROP POLICY IF EXISTS "roles_delete_policy" ON roles;
-- SELECT: Allow reading all roles for authenticated users
CREATE POLICY "roles_select_policy" ON roles FOR
SELECT TO authenticated USING (true);
-- INSERT: Allow creating roles (no company_id check since it may be null initially)
CREATE POLICY "roles_insert_policy" ON roles FOR
INSERT TO authenticated WITH CHECK (true);
-- UPDATE: Allow updating roles for admins
CREATE POLICY "roles_update_policy" ON roles FOR
UPDATE TO authenticated USING (
        public.is_admin_user()
        OR NOT public.has_any_admin()
    ) WITH CHECK (
        public.is_admin_user()
        OR NOT public.has_any_admin()
    );
-- DELETE: Allow deleting roles for admins
CREATE POLICY "roles_delete_policy" ON roles FOR DELETE TO authenticated USING (
    public.is_admin_user()
    OR NOT public.has_any_admin()
);
-- Service role bypass
DROP POLICY IF EXISTS "roles_service_bypass" ON roles;
CREATE POLICY "roles_service_bypass" ON roles FOR ALL TO service_role USING (true) WITH CHECK (true);
SET app.bypass_permission_check = 'off';
DO $$ BEGIN RAISE NOTICE 'تم إضافة سياسات RLS لجدول الأدوار بنجاح!';
END $$;