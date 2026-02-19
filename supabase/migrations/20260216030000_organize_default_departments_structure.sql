-- Migration: Organize default departments structure and add missing departments
-- Date: 2026-02-16
-- Why:
--   Keep a consistent organizational baseline in every environment.
--   Add missing default departments and normalize parent-child links.

SET app.bypass_permission_check = 'on';

-- Fix legacy trigger function that references departments without schema qualification.
-- In some environments it was created with empty search_path, causing:
--   relation "departments" does not exist
CREATE OR REPLACE FUNCTION public.check_department_hierarchy_depth()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    parent_depth integer;
BEGIN
    -- Root departments are always allowed.
    IF NEW.parent_department_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Prevent depth > 2 (no child of child).
    SELECT COUNT(*)
    INTO parent_depth
    FROM public.departments
    WHERE id = NEW.parent_department_id
      AND parent_department_id IS NOT NULL;

    IF parent_depth > 0 THEN
        RAISE EXCEPTION 'Department hierarchy limited to 2 levels. Cannot create sub-department of a sub-department.';
    END IF;

    RETURN NEW;
END;
$$;

DO $$
DECLARE
    d record;
    v_department_id uuid;
BEGIN
    FOR d IN
        SELECT *
        FROM (
            VALUES
                ('EXEC',   'Executive Management',      'الإدارة التنفيذية',          '#1E3A8A', 'Building2',      10,  NULL),
                ('ADMIN',  'Administration',            'الإدارة',                    '#334155', 'Building2',      20,  NULL),
                ('FIN',    'Finance',                   'المالية',                    '#0F766E', 'Wallet',         30,  NULL),
                ('HR',     'Human Resources',           'الموارد البشرية',            '#6B7280', 'Users',          40,  NULL),
                ('TRAIN',  'Training',                  'التدريب',                    '#64748B', 'GraduationCap',  41,  'HR'),
                ('IT',     'Information Technology',    'تقنية المعلومات',            '#374151', 'Server',         50,  NULL),
                ('QA',     'Quality Assurance',         'ضمان الجودة',                '#047857', 'Award',          60,  NULL),
                ('QC',     'Quality Control',           'مراقبة الجودة',              '#059669', 'CheckCircle2',   61,  'QA'),
                ('FS',     'Food Safety',               'سلامة الغذاء',               '#DC2626', 'ShieldAlert',    70,  NULL),
                ('SAN',    'Sanitation',                'النظافة والتعقيم',           '#0EA5E9', 'Sparkles',       71,  'FS'),
                ('LAB',    'Laboratory',                'المختبر',                    '#BE185D', 'FlaskConical',   80,  NULL),
                ('MICRO',  'Microbiology',              'الأحياء الدقيقة',            '#C026D3', 'Microscope',     81,  'LAB'),
                ('RND',    'Research & Development',    'البحث والتطوير',             '#A855F7', 'Lightbulb',      90,  NULL),
                ('PROD',   'Production',                'الإنتاج',                    '#B45309', 'Factory',        100, NULL),
                ('MIXING', 'Mixing & Dough',            'الخلط والعجين',              '#D97706', 'Blend',          101, 'PROD'),
                ('BAKING', 'Baking & Oven',             'الخبز والفرن',               '#EA580C', 'Flame',          102, 'PROD'),
                ('PACKING','Packaging',                 'التعبئة والتغليف',           '#F59E0B', 'Package',        103, 'PROD'),
                ('MAINT',  'Maintenance',               'الصيانة',                    '#7C3AED', 'Wrench',         110, NULL),
                ('UTIL',   'Utilities',                 'المرافق',                    '#6D28D9', 'Cog',            111, 'MAINT'),
                ('WH',     'Warehouse',                 'المستودع',                   '#0E7490', 'Warehouse',      120, 'ADMIN'),
                ('PROC',   'Procurement',               'المشتريات',                  '#0369A1', 'ShoppingCart',   121, 'ADMIN'),
                ('LOG',    'Logistics',                 'اللوجستيات',                 '#0891B2', 'Truck',          122, 'ADMIN'),
                ('SALES',  'Sales',                     'المبيعات',                   '#F97316', 'ShoppingBag',    130, NULL),
                ('MKT',    'Marketing',                 'التسويق',                    '#DB2777', 'Megaphone',      131, 'SALES')
        ) AS x(code, name_en, name_ar, color, icon, display_order, parent_code)
    LOOP
        SELECT dep.id
        INTO v_department_id
        FROM public.departments dep
        WHERE upper(coalesce(dep.code, '')) = d.code
           OR lower(btrim(dep.name)) = lower(d.name_en)
           OR lower(btrim(dep.name)) = lower(d.name_ar)
           OR lower(btrim(coalesce(dep.name_en, ''))) = lower(d.name_en)
           OR lower(btrim(coalesce(dep.name_ar, ''))) = lower(d.name_ar)
        ORDER BY
            CASE WHEN upper(coalesce(dep.code, '')) = d.code THEN 0 ELSE 1 END,
            dep.created_at
        LIMIT 1;

        IF v_department_id IS NULL THEN
            INSERT INTO public.departments (
                name,
                name_en,
                name_ar,
                code,
                color,
                icon,
                is_active,
                display_order,
                sort_order,
                created_at,
                updated_at
            ) VALUES (
                d.name_en,
                d.name_en,
                d.name_ar,
                d.code,
                d.color,
                d.icon,
                true,
                d.display_order,
                d.display_order,
                now(),
                now()
            );
        ELSE
            UPDATE public.departments dep
            SET
                code = CASE WHEN dep.code IS NULL OR btrim(dep.code) = '' THEN d.code ELSE dep.code END,
                name_en = CASE WHEN dep.name_en IS NULL OR btrim(dep.name_en) = '' THEN d.name_en ELSE dep.name_en END,
                name_ar = CASE WHEN dep.name_ar IS NULL OR btrim(dep.name_ar) = '' THEN d.name_ar ELSE dep.name_ar END,
                color = CASE WHEN dep.color IS NULL OR btrim(dep.color) = '' THEN d.color ELSE dep.color END,
                icon = CASE WHEN dep.icon IS NULL OR btrim(dep.icon) = '' THEN d.icon ELSE dep.icon END,
                display_order = COALESCE(dep.display_order, d.display_order),
                sort_order = COALESCE(dep.sort_order, d.display_order),
                is_active = true,
                updated_at = now()
            WHERE dep.id = v_department_id;
        END IF;
    END LOOP;
END $$;

-- Apply parent-child hierarchy for default departments.
-- Resolve child/parent by code OR name variants to handle legacy records that already exist with different codes.
WITH defaults AS (
    SELECT *
    FROM (
        VALUES
            ('EXEC',   'Executive Management',   'الإدارة التنفيذية',        NULL),
            ('ADMIN',  'Administration',         'الإدارة',                  NULL),
            ('FIN',    'Finance',                'المالية',                  NULL),
            ('HR',     'Human Resources',        'الموارد البشرية',          NULL),
            ('TRAIN',  'Training',               'التدريب',                  'HR'),
            ('IT',     'Information Technology', 'تقنية المعلومات',          NULL),
            ('QA',     'Quality Assurance',      'ضمان الجودة',              NULL),
            ('QC',     'Quality Control',        'مراقبة الجودة',            'QA'),
            ('FS',     'Food Safety',            'سلامة الغذاء',             NULL),
            ('SAN',    'Sanitation',             'النظافة والتعقيم',         'FS'),
            ('LAB',    'Laboratory',             'المختبر',                  NULL),
            ('MICRO',  'Microbiology',           'الأحياء الدقيقة',          'LAB'),
            ('RND',    'Research & Development', 'البحث والتطوير',           NULL),
            ('PROD',   'Production',             'الإنتاج',                  NULL),
            ('MIXING', 'Mixing & Dough',         'الخلط والعجين',            'PROD'),
            ('BAKING', 'Baking & Oven',          'الخبز والفرن',             'PROD'),
            ('PACKING','Packaging',              'التعبئة والتغليف',         'PROD'),
            ('MAINT',  'Maintenance',            'الصيانة',                  NULL),
            ('UTIL',   'Utilities',              'المرافق',                  'MAINT'),
            ('WH',     'Warehouse',              'المستودع',                 'ADMIN'),
            ('PROC',   'Procurement',            'المشتريات',                'ADMIN'),
            ('LOG',    'Logistics',              'اللوجستيات',               'ADMIN'),
            ('SALES',  'Sales',                  'المبيعات',                 NULL),
            ('MKT',    'Marketing',              'التسويق',                  'SALES')
    ) AS t(code, name_en, name_ar, parent_code)
),
resolved AS (
    SELECT
        d.code,
        d.parent_code,
        child_match.id AS child_id,
        parent_match.id AS parent_id
    FROM defaults d
    JOIN LATERAL (
        SELECT dep.id
        FROM public.departments dep
        WHERE upper(coalesce(dep.code, '')) = d.code
           OR lower(btrim(dep.name)) = lower(d.name_en)
           OR lower(btrim(dep.name)) = lower(d.name_ar)
           OR lower(btrim(coalesce(dep.name_en, ''))) = lower(d.name_en)
           OR lower(btrim(coalesce(dep.name_ar, ''))) = lower(d.name_ar)
        ORDER BY
            CASE WHEN upper(coalesce(dep.code, '')) = d.code THEN 0 ELSE 1 END,
            dep.created_at
        LIMIT 1
    ) AS child_match ON true
    LEFT JOIN defaults parent_def ON parent_def.code = d.parent_code
    LEFT JOIN LATERAL (
        SELECT dep.id
        FROM public.departments dep
        WHERE d.parent_code IS NOT NULL
          AND (
                upper(coalesce(dep.code, '')) = d.parent_code
                OR lower(btrim(dep.name)) = lower(parent_def.name_en)
                OR lower(btrim(dep.name)) = lower(parent_def.name_ar)
                OR lower(btrim(coalesce(dep.name_en, ''))) = lower(parent_def.name_en)
                OR lower(btrim(coalesce(dep.name_ar, ''))) = lower(parent_def.name_ar)
              )
        ORDER BY
            CASE WHEN upper(coalesce(dep.code, '')) = d.parent_code THEN 0 ELSE 1 END,
            dep.created_at
        LIMIT 1
    ) AS parent_match ON true
)
UPDATE public.departments dep
SET
    parent_department_id = CASE
        WHEN r.parent_code IS NULL THEN NULL
        ELSE r.parent_id
    END,
    updated_at = now()
FROM resolved r
WHERE dep.id = r.child_id
  AND dep.parent_department_id IS DISTINCT FROM CASE
      WHEN r.parent_code IS NULL THEN NULL
      ELSE r.parent_id
  END;

SET app.bypass_permission_check = 'off';
