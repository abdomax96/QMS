-- تفعيل extension للتشفير
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- =============================================
-- تجاوز فحص الصلاحيات للـ seeding
-- =============================================
SET app.bypass_permission_check = 'on';
-- =============================================
-- 1. إنشاء الشركة الأساسية
-- =============================================
INSERT INTO public.companies (
        id,
        name,
        name_en,
        code,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        'a0000001-0000-0000-0000-000000000001',
        'شركة مصر للمستحضرات الغذائية',
        'Misr Food Additives',
        'MFA',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (code) DO NOTHING;
-- =============================================
-- 2. إنشاء الأقسام الأساسية
-- =============================================
INSERT INTO public.departments (
        id,
        name,
        name_ar,
        name_en,
        code,
        color,
        icon,
        is_active,
        display_order,
        created_at,
        updated_at
    )
VALUES (
        'd0000001-0000-0000-0000-000000000001',
        'ضبط الجودة',
        'ضبط الجودة',
        'Quality Control',
        'QC',
        '#3B82F6',
        'Shield',
        true,
        1,
        NOW(),
        NOW()
    ),
    (
        'd0000002-0000-0000-0000-000000000002',
        'ضمان الجودة',
        'ضمان الجودة',
        'Quality Assurance',    
        'QA',
        '#10B981',
        'CheckCircle',
        true,
        2,
        NOW(),
        NOW()
    ),
    (
        'd0000003-0000-0000-0000-000000000003',
        'الإنتاج',
        'الإنتاج',
        'Production',
        'PROD',
        '#F59E0B',
        'Factory',
        true,
        3,
        NOW(),
        NOW()
    ),
    (
        'd0000004-0000-0000-0000-000000000004',
        'المخازن',
        'المخازن',
        'Warehouse',
        'WH',
        '#8B5CF6',
        'Package',
        true,
        4,
        NOW(),
        NOW()
    ),
    (
        'd0000005-0000-0000-0000-000000000005',
        'الصيانة',
        'الصيانة',
        'Maintenance',
        'MAINT',
        '#EF4444',
        'Wrench',
        true,
        5,
        NOW(),
        NOW()
    ),
    (
        'd0000006-0000-0000-0000-000000000006',
        'الموارد البشرية',
        'الموارد البشرية',
        'Human Resources',
        'HR',
        '#EC4899',
        'Users',
        true,
        6,
        NOW(),
        NOW()
    ),
    (
        'd0000007-0000-0000-0000-000000000007',
        'الإدارة العامة',
        'الإدارة العامة',
        'General Management',
        'GM',
        '#6366F1',
        'Building2',
        true,
        7,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;
-- =============================================
-- 3. إنشاء الأدوار الأساسية
-- =============================================
INSERT INTO public.roles (
        id,
        company_id,
        name,
        name_ar,
        code,
        description,
        description_ar,
        priority,
        color,
        is_active,
        is_system,
        created_at,
        updated_at
    )
VALUES (
        '10000001-0000-0000-0000-000000000001',
        'a0000001-0000-0000-0000-000000000001',
        'Super Admin',
        'مدير النظام',
        'super_admin',
        'Full system access',
        'صلاحيات كاملة للنظام',
        1,
        '#EF4444',
        true,
        true,
        NOW(),
        NOW()
    ),
    (
        '10000002-0000-0000-0000-000000000002',
        'a0000001-0000-0000-0000-000000000001',
        'Admin',
        'مدير',
        'admin',
        'Administrative access',
        'صلاحيات إدارية',
        2,
        '#F59E0B',
        true,
        true,
        NOW(),
        NOW()
    ),
    (
        '10000003-0000-0000-0000-000000000003',
        'a0000001-0000-0000-0000-000000000001',
        'Quality Manager',
        'مدير الجودة',
        'quality_manager',
        'Quality department manager',
        'مدير قسم الجودة',
        3,
        '#3B82F6',
        true,
        false,
        NOW(),
        NOW()
    ),
    (
        '10000004-0000-0000-0000-000000000004',
        'a0000001-0000-0000-0000-000000000001',
        'Quality Officer',
        'مسؤول الجودة',
        'quality_officer',
        'Quality control officer',
        'مسؤول ضبط الجودة',
        4,
        '#10B981',
        true,
        false,
        NOW(),
        NOW()
    ),
    (
        '10000005-0000-0000-0000-000000000005',
        'a0000001-0000-0000-0000-000000000001',
        'Production Manager',
        'مدير الإنتاج',
        'production_manager',
        'Production department manager',
        'مدير قسم الإنتاج',
        3,
        '#F59E0B',
        true,
        false,
        NOW(),
        NOW()
    ),
    (
        '10000006-0000-0000-0000-000000000006',
        'a0000001-0000-0000-0000-000000000001',
        'Operator',
        'مشغل',
        'operator',
        'Production operator',
        'مشغل الإنتاج',
        5,
        '#8B5CF6',
        true,
        false,
        NOW(),
        NOW()
    ),
    (
        '10000007-0000-0000-0000-000000000007',
        'a0000001-0000-0000-0000-000000000001',
        'Viewer',
        'مشاهد',
        'viewer',
        'Read-only access',
        'صلاحيات القراءة فقط',
        10,
        '#6B7280',
        true,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;
-- =============================================
-- 4. إنشاء المستخدم الأول (Super Admin)
-- =============================================
-- Email: abdallah96@mifad.com
-- Password: 123
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        'c0000001-0000-0000-0000-000000000001',
        'authenticated',
        'authenticated',
        'abdallah96@mifad.com',
        crypt('123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"عبدالله ممدوح","avatar_url":""}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (id) DO NOTHING;
-- إضافة identity للمستخدم
INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
SELECT gen_random_uuid(),
    id,
    id::text,
    format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
FROM auth.users
WHERE email = 'abdallah96@mifad.com'
    AND NOT EXISTS (
        SELECT 1
        FROM auth.identities
        WHERE user_id = (
                SELECT id
                FROM auth.users
                WHERE email = 'abdallah96@mifad.com'
            )
    );
-- =============================================
-- 5. إنشاء سجل المستخدم في جدول users العام
-- =============================================
INSERT INTO public.users (
        id,
        email,
        name,
        title,
        department,
        department_id,
        roles,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        'c0000001-0000-0000-0000-000000000001',
        'abdallah96@mifad.com',
        'عبدالله ممدوح',
        'مدير النظام',
        'الإدارة العامة',
        'd0000007-0000-0000-0000-000000000007',
        ARRAY ['super_admin'],
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO
UPDATE
SET department_id = EXCLUDED.department_id,
    roles = EXCLUDED.roles,
    updated_at = NOW();
-- =============================================
-- 6. ربط المستخدم بدور Super Admin
-- =============================================
INSERT INTO public.user_roles (id, user_id, role_id, assigned_at)
VALUES (
        gen_random_uuid(),
        'c0000001-0000-0000-0000-000000000001',
        '10000001-0000-0000-0000-000000000001',
        NOW()
    ) ON CONFLICT DO NOTHING;
-- =============================================
-- 7. إعدادات النظام الأساسية
-- =============================================
INSERT INTO public.settings (
        id,
        language,
        timezone,
        theme,
        created_at,
        updated_at
    )
VALUES (
        'global',
        'ar',
        'Africa/Cairo',
        'light',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
-- =============================================
-- 8. ربط المستخدم بقسم الإدارة العامة
-- =============================================
INSERT INTO public.user_departments (
        id,
        user_id,
        department_id,
        is_primary,
        is_active
    )
VALUES (
        gen_random_uuid(),
        'c0000001-0000-0000-0000-000000000001',
        'd0000007-0000-0000-0000-000000000007',
        true,
        true
    ) ON CONFLICT DO NOTHING;
-- =============================================
-- 9. منح جميع الصلاحيات لدور Super Admin
-- =============================================
-- Ensure additional modules exist (robust against environments missing UNIQUE(code))
WITH desired_modules AS (
    SELECT *
    FROM (
            VALUES (
                    'master_data',
                    'Master Data',
                    'البيانات الأساسية',
                    'Database',
                    '#F59E0B',
                    6,
                    true,
                    'shared',
                    ARRAY ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import']::text []
                ),
                (
                    'settings',
                    'Settings',
                    'الإعدادات',
                    'Cog',
                    '#6B7280',
                    8,
                    true,
                    'shared',
                    ARRAY ['view', 'edit', 'manage_permissions', 'manage_users', 'manage_departments', 'manage_roles']::text []
                ),
                (
                    'food_safety',
                    'Food Safety',
                    'سلامة الغذاء',
                    'Shield',
                    '#10B981',
                    9,
                    true,
                    'shared',
                    ARRAY ['view', 'create', 'edit', 'delete', 'approve', 'export']::text []
                ),
                (
                    'chat',
                    'Chat',
                    'الدردشة',
                    'MessageSquare',
                    '#0EA5E9',
                    10,
                    true,
                    'isolated',
                    ARRAY [
                        'view_conversations',
                        'create_conversation',
                        'send_message',
                        'send_attachment',
                        'manage_conversation',
                        'manage_department_chat',
                        'moderate_chat'
                    ]::text []
                )
        ) AS v (
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
)
UPDATE public.app_modules am
SET name = dm.name,
    name_ar = dm.name_ar,
    icon = dm.icon,
    color = dm.color,
    display_order = dm.display_order,
    is_active = dm.is_active,
    data_isolation_mode = dm.data_isolation_mode,
    available_actions = dm.available_actions,
    updated_at = NOW()
FROM desired_modules dm
WHERE am.code = dm.code;

WITH desired_modules AS (
    SELECT *
    FROM (
            VALUES (
                    'master_data',
                    'Master Data',
                    'البيانات الأساسية',
                    'Database',
                    '#F59E0B',
                    6,
                    true,
                    'shared',
                    ARRAY ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import']::text []
                ),
                (
                    'settings',
                    'Settings',
                    'الإعدادات',
                    'Cog',
                    '#6B7280',
                    8,
                    true,
                    'shared',
                    ARRAY ['view', 'edit', 'manage_permissions', 'manage_users', 'manage_departments', 'manage_roles']::text []
                ),
                (
                    'food_safety',
                    'Food Safety',
                    'سلامة الغذاء',
                    'Shield',
                    '#10B981',
                    9,
                    true,
                    'shared',
                    ARRAY ['view', 'create', 'edit', 'delete', 'approve', 'export']::text []
                ),
                (
                    'chat',
                    'Chat',
                    'الدردشة',
                    'MessageSquare',
                    '#0EA5E9',
                    10,
                    true,
                    'isolated',
                    ARRAY [
                        'view_conversations',
                        'create_conversation',
                        'send_message',
                        'send_attachment',
                        'manage_conversation',
                        'manage_department_chat',
                        'moderate_chat'
                    ]::text []
                )
        ) AS v (
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
)
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
SELECT dm.code,
    dm.name,
    dm.name_ar,
    dm.icon,
    dm.color,
    dm.display_order,
    dm.is_active,
    dm.data_isolation_mode,
    dm.available_actions
FROM desired_modules dm
WHERE NOT EXISTS (
        SELECT 1
        FROM public.app_modules am
        WHERE am.code = dm.code
    );
-- Grant all module permissions to Super Admin
UPDATE public.role_module_permissions rmp
SET granted_actions = am.available_actions,
    can_see_all_departments = true
FROM public.app_modules am
WHERE rmp.role_id = '10000001-0000-0000-0000-000000000001'
    AND rmp.module_code = am.code
    AND am.is_active = true;

INSERT INTO public.role_module_permissions (
        role_id,
        module_code,
        granted_actions,
        can_see_all_departments
    )
SELECT '10000001-0000-0000-0000-000000000001',
    am.code,
    am.available_actions,
    true
FROM public.app_modules am
WHERE am.is_active = true
    AND NOT EXISTS (
        SELECT 1
        FROM public.role_module_permissions rmp
        WHERE rmp.role_id = '10000001-0000-0000-0000-000000000001'
            AND rmp.module_code = am.code
    );
-- =============================================
-- إعادة تفعيل فحص الصلاحيات
-- =============================================
SET app.bypass_permission_check = 'off';
DO $$ BEGIN RAISE NOTICE 'تم إنشاء البيانات الأولية بنجاح!';
END $$;
