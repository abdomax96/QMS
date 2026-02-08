-- QMS Architecture Fix: Add Documents Module and Permissions
-- This migration adds proper permission control to Document Control module
-- Step 1: Add 'documents' module to app_modules
INSERT INTO app_modules (
        code,
        name,
        name_ar,
        color,
        icon,
        available_actions,
        data_isolation_mode,
        is_active,
        display_order
    )
VALUES (
        'documents',
        'Document Control',
        'التحكم بالوثائق',
        '#8B5CF6',
        'folder-open',
        ARRAY ['read', 'create', 'edit', 'delete', 'approve', 'obsolete'],
        'isolated',
        true,
        15
    ) ON CONFLICT (code) DO
UPDATE
SET name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    available_actions = EXCLUDED.available_actions,
    is_active = true;
-- Step 2: Grant documents permissions to admin roles
-- Super Admin gets all permissions
INSERT INTO role_module_permissions (role_id, module_code, granted_actions)
SELECT r.id,
    'documents',
    ARRAY ['read', 'create', 'edit', 'delete', 'approve', 'obsolete']
FROM roles r
WHERE r.code = 'super_admin' ON CONFLICT (role_id, module_code) DO
UPDATE
SET granted_actions = EXCLUDED.granted_actions;
-- Admin gets manage permissions
INSERT INTO role_module_permissions (role_id, module_code, granted_actions)
SELECT r.id,
    'documents',
    ARRAY ['read', 'create', 'edit', 'approve']
FROM roles r
WHERE r.code = 'admin' ON CONFLICT (role_id, module_code) DO
UPDATE
SET granted_actions = EXCLUDED.granted_actions;
-- QA Manager gets full document control
INSERT INTO role_module_permissions (role_id, module_code, granted_actions)
SELECT r.id,
    'documents',
    ARRAY ['read', 'create', 'edit', 'delete', 'approve', 'obsolete']
FROM roles r
WHERE r.code = 'qa_manager' ON CONFLICT (role_id, module_code) DO
UPDATE
SET granted_actions = EXCLUDED.granted_actions;
-- QA Specialist gets read/create
INSERT INTO role_module_permissions (role_id, module_code, granted_actions)
SELECT r.id,
    'documents',
    ARRAY ['read', 'create']
FROM roles r
WHERE r.code = 'qa_specialist' ON CONFLICT (role_id, module_code) DO
UPDATE
SET granted_actions = EXCLUDED.granted_actions;
-- All other active roles get read-only access
INSERT INTO role_module_permissions (role_id, module_code, granted_actions)
SELECT r.id,
    'documents',
    ARRAY ['read']
FROM roles r
WHERE r.code NOT IN (
        'super_admin',
        'admin',
        'qa_manager',
        'qa_specialist'
    )
    AND r.is_active = true ON CONFLICT (role_id, module_code) DO NOTHING;
DO $$ BEGIN RAISE NOTICE 'تم إضافة وحدة التحكم بالوثائق بنجاح!';
END $$;