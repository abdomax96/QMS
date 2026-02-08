-- Migration: Restore all app_modules
-- Date: 2026-01-18
-- Description: Restores all core system modules to the app_modules table
SET app.bypass_permission_check = 'on';
-- Clear existing corrupted data and re-insert all modules
DELETE FROM public.app_modules;
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
        'forms_reports',
        'Forms & Reports',
        'النماذج والتقارير',
        'DocumentText',
        '#3B82F6',
        1,
        true,
        'isolated',
        ARRAY ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print', 'share', 'submit', 'review_claim', 'review_approve', 'review_reject', 'review_edit', 'reopen', 'archive']
    ),
    (
        'tasks',
        'Tasks',
        'المهام',
        'ClipboardList',
        '#10B981',
        2,
        true,
        'isolated',
        ARRAY ['view', 'create', 'edit', 'delete', 'assign', 'complete', 'export']
    ),
    (
        'lab',
        'Laboratory',
        'المختبر',
        'Beaker',
        '#8B5CF6',
        3,
        true,
        'isolated',
        ARRAY ['view', 'create', 'edit', 'delete', 'approve', 'release', 'export', 'print']
    ),
    (
        'ncr',
        'NCR & Holds',
        'NCR والمحتجزات',
        'ExclamationTriangle',
        '#EF4444',
        4,
        true,
        'hybrid',
        ARRAY ['view', 'create', 'edit', 'review', 'investigate', 'decide', 'close', 'hold_add', 'hold_release', 'export', 'print']
    ),
    (
        'access_management',
        'Access Management',
        'إدارة الصلاحيات',
        'ShieldCheck',
        '#6366F1',
        5,
        true,
        'shared',
        ARRAY ['view', 'edit']
    ) ON CONFLICT (code) DO
UPDATE
SET name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    data_isolation_mode = EXCLUDED.data_isolation_mode,
    available_actions = EXCLUDED.available_actions;