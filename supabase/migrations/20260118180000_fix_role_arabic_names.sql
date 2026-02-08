-- Fix Role Arabic Names
-- Update the name_ar field for common roles to have proper Arabic text
UPDATE public.roles
SET name_ar = 'مدير النظام'
WHERE code = 'ADMIN'
    OR code = 'admin'
    OR code = 'super_admin';
UPDATE public.roles
SET name_ar = 'مدير الجودة'
WHERE code = 'QUALITY_MANAGER'
    OR code = 'quality_manager';
UPDATE public.roles
SET name_ar = 'مراقب الجودة'
WHERE code = 'QUALITY_INSPECTOR'
    OR code = 'quality_inspector';
UPDATE public.roles
SET name_ar = 'فني المختبر'
WHERE code = 'LAB_TECHNICIAN'
    OR code = 'lab_technician';
UPDATE public.roles
SET name_ar = 'مدير الإنتاج'
WHERE code = 'PRODUCTION_MANAGER'
    OR code = 'production_manager';
UPDATE public.roles
SET name_ar = 'مشرف الإنتاج'
WHERE code = 'PRODUCTION_SUPERVISOR'
    OR code = 'production_supervisor';
UPDATE public.roles
SET name_ar = 'عامل خط الإنتاج'
WHERE code = 'PRODUCTION_OPERATOR'
    OR code = 'production_operator';
UPDATE public.roles
SET name_ar = 'مدير المستودعات'
WHERE code = 'WAREHOUSE_MANAGER'
    OR code = 'warehouse_manager';
UPDATE public.roles
SET name_ar = 'مشاهد فقط'
WHERE code = 'VIEWER'
    OR code = 'viewer';
UPDATE public.roles
SET name_ar = 'مستخدم'
WHERE code = 'USER'
    OR code = 'user';
UPDATE public.roles
SET name_ar = 'محرر'
WHERE code = 'EDITOR'
    OR code = 'editor';
UPDATE public.roles
SET name_ar = 'مدير القسم'
WHERE code = 'DEPARTMENT_HEAD'
    OR code = 'department_head';
UPDATE public.roles
SET name_ar = 'فني سلامة الغذاء'
WHERE code = 'FOOD_SAFETY'
    OR code = 'food_safety';
UPDATE public.roles
SET name_ar = 'دعم فني'
WHERE code = 'SUPPORT'
    OR code = 'support';
-- Generic fallback: If name_ar is empty/null/garbled, set it to the English name
UPDATE public.roles
SET name_ar = name
WHERE name_ar IS NULL
    OR name_ar = ''
    OR name_ar LIKE '%ظ%';