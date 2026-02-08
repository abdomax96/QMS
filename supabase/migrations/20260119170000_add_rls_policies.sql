-- Migration: Add RLS Policies for Critical Tables (Defensive Version)
-- Date: 2026-01-19
-- Description: Enables Row Level Security with safety checks
SET app.bypass_permission_check = 'on';
-- =============================================
-- Helper function to get current user's company_id
-- =============================================
CREATE OR REPLACE FUNCTION get_user_company_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT company_id
FROM users
WHERE id = auth.uid();
$$;
-- =============================================
-- Safely Enable RLS and Add Policies
-- =============================================
DO $$
DECLARE tbl_name TEXT;
has_company_id BOOLEAN;
BEGIN -- List of tables to protect
FOR tbl_name IN
SELECT unnest(
        ARRAY [
        'raw_materials', 'recipes', 'recipe_versions', 'material_receiving',
        'suppliers', 'customers', 'products', 'inspection_criteria',
        'lab_tests', 'ncr_reports', 'holds'
    ]
    ) LOOP BEGIN -- Check if table exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = tbl_name
    ) THEN -- Enable RLS
    EXECUTE format(
        'ALTER TABLE %I ENABLE ROW LEVEL SECURITY',
        tbl_name
    );
RAISE NOTICE 'Enabled RLS on %',
tbl_name;
-- Check if table has company_id column
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = tbl_name
            AND column_name = 'company_id'
    ) INTO has_company_id;
IF has_company_id THEN -- Drop existing policy if any
EXECUTE format(
    'DROP POLICY IF EXISTS "%s_company_isolation" ON %I',
    tbl_name,
    tbl_name
);
-- Create company isolation policy
EXECUTE format(
    'CREATE POLICY "%s_company_isolation" ON %I FOR ALL TO authenticated USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id())',
    tbl_name,
    tbl_name
);
RAISE NOTICE 'Added company isolation policy on %',
tbl_name;
ELSE RAISE NOTICE 'Table % has no company_id column, skipping company isolation',
tbl_name;
-- Add a simple authenticated access policy instead
EXECUTE format(
    'DROP POLICY IF EXISTS "%s_authenticated" ON %I',
    tbl_name,
    tbl_name
);
EXECUTE format(
    'CREATE POLICY "%s_authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
    tbl_name,
    tbl_name
);
END IF;
-- Add service role bypass
EXECUTE format(
    'DROP POLICY IF EXISTS "%s_service_bypass" ON %I',
    tbl_name,
    tbl_name
);
EXECUTE format(
    'CREATE POLICY "%s_service_bypass" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
    tbl_name,
    tbl_name
);
ELSE RAISE NOTICE 'Table % does not exist, skipping',
tbl_name;
END IF;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Error processing table %: %',
tbl_name,
SQLERRM;
END;
END LOOP;
END $$;
SET app.bypass_permission_check = 'off';
DO $$ BEGIN RAISE NOTICE 'تم معالجة سياسات RLS بنجاح!';
END $$;