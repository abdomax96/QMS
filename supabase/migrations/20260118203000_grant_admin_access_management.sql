-- Migration: Grant Access Management permissions to System Admin
-- Date: 2026-01-18
-- Description: Explicitly grants 'view' and 'edit' permissions for the 'access_management' module to the 'admin' role.
-- BYPASS PERMISSION CHECK FOR MIGRATION
SET app.bypass_permission_check = 'on';
-- 1. Ensure 'access_management' module exists in app_modules
-- Removed 'category' column as it doesn't exist in the table
INSERT INTO public.app_modules (
        code,
        name,
        name_ar,
        icon,
        color,
        display_order,
        is_active,
        data_isolation_mode,
        available_actions
    )
VALUES (
        'access_management',
        'Access Management',
        'إدارة الصلاحيات',
        'ShieldCheck',
        '#6366F1',
        7,
        true,
        'shared',
        ARRAY ['view', 'edit']
    ) ON CONFLICT (code) DO
UPDATE
SET name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    available_actions = EXCLUDED.available_actions,
    is_active = true;
DO $$
DECLARE v_admin_role_id uuid;
BEGIN -- 2. Get System Admin Role ID (using correct code 'admin')
SELECT id INTO v_admin_role_id
FROM public.roles
WHERE code = 'admin';
IF v_admin_role_id IS NOT NULL THEN -- 3. Insert Permissions for 'access_management' (View, Edit)
INSERT INTO public.role_module_permissions (role_id, module_code, granted_actions)
VALUES (
        v_admin_role_id,
        'access_management',
        ARRAY ['view', 'edit']
    ) ON CONFLICT (role_id, module_code) DO
UPDATE
SET granted_actions = ARRAY ['view', 'edit'];
RAISE NOTICE 'Granted Access Management permissions to SYSTEM_ADMIN (admin)';
ELSE RAISE NOTICE 'Admin role not found';
END IF;
END $$;