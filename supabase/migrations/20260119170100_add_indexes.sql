-- Migration: Add Database Indexes for Performance (Defensive Version)
-- Date: 2026-01-19
-- Description: Adds essential indexes with safety checks
SET app.bypass_permission_check = 'on';
-- =============================================
-- Helper function to safely create index
-- =============================================
CREATE OR REPLACE FUNCTION safe_create_index(
        p_index_name TEXT,
        p_table_name TEXT,
        p_column_name TEXT,
        p_partial_condition TEXT DEFAULT NULL
    ) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN -- Check if table exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = p_table_name
    ) THEN RAISE NOTICE 'Table % does not exist, skipping index %',
    p_table_name,
    p_index_name;
RETURN;
END IF;
-- Check if column exists
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND column_name = p_column_name
) THEN RAISE NOTICE 'Column %.% does not exist, skipping index %',
p_table_name,
p_column_name,
p_index_name;
RETURN;
END IF;
-- Create the index
IF p_partial_condition IS NOT NULL THEN EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I(%I) WHERE %s',
    p_index_name,
    p_table_name,
    p_column_name,
    p_partial_condition
);
ELSE EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I(%I)',
    p_index_name,
    p_table_name,
    p_column_name
);
END IF;
RAISE NOTICE 'Created index % on %.%',
p_index_name,
p_table_name,
p_column_name;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Error creating index %: %',
p_index_name,
SQLERRM;
END;
$$;
-- =============================================
-- Create Indexes
-- =============================================
-- Material Receiving
SELECT safe_create_index(
        'idx_material_receiving_material_id',
        'material_receiving',
        'raw_material_id'
    );
SELECT safe_create_index(
        'idx_material_receiving_supplier_id',
        'material_receiving',
        'supplier_id'
    );
SELECT safe_create_index(
        'idx_material_receiving_company_id',
        'material_receiving',
        'company_id'
    );
SELECT safe_create_index(
        'idx_material_receiving_received_by',
        'material_receiving',
        'received_by'
    );
SELECT safe_create_index(
        'idx_material_receiving_received_at',
        'material_receiving',
        'received_at'
    );
SELECT safe_create_index(
        'idx_material_receiving_batch',
        'material_receiving',
        'batch_number'
    );
-- Recipes
SELECT safe_create_index(
        'idx_recipes_company_id',
        'recipes',
        'company_id'
    );
SELECT safe_create_index(
        'idx_recipes_created_by',
        'recipes',
        'created_by'
    );
SELECT safe_create_index(
        'idx_recipes_created_at',
        'recipes',
        'created_at'
    );
-- Recipe Versions
SELECT safe_create_index(
        'idx_recipe_versions_recipe_id',
        'recipe_versions',
        'recipe_id'
    );
SELECT safe_create_index(
        'idx_recipe_versions_company_id',
        'recipe_versions',
        'company_id'
    );
-- Raw Materials
SELECT safe_create_index(
        'idx_raw_materials_company_id',
        'raw_materials',
        'company_id'
    );
SELECT safe_create_index(
        'idx_raw_materials_category_id',
        'raw_materials',
        'category_id'
    );
SELECT safe_create_index(
        'idx_raw_materials_name',
        'raw_materials',
        'name'
    );
SELECT safe_create_index(
        'idx_raw_materials_code',
        'raw_materials',
        'code'
    );
-- Suppliers
SELECT safe_create_index(
        'idx_suppliers_company_id',
        'suppliers',
        'company_id'
    );
SELECT safe_create_index('idx_suppliers_name', 'suppliers', 'name');
-- Customers
SELECT safe_create_index(
        'idx_customers_company_id',
        'customers',
        'company_id'
    );
SELECT safe_create_index('idx_customers_name', 'customers', 'name');
-- Products
SELECT safe_create_index(
        'idx_products_company_id',
        'products',
        'company_id'
    );
SELECT safe_create_index('idx_products_name', 'products', 'name');
-- Lab Tests
SELECT safe_create_index(
        'idx_lab_tests_company_id',
        'lab_tests',
        'company_id'
    );
SELECT safe_create_index(
        'idx_lab_tests_material_id',
        'lab_tests',
        'material_id'
    );
SELECT safe_create_index(
        'idx_lab_tests_created_at',
        'lab_tests',
        'created_at'
    );
-- NCR Reports
SELECT safe_create_index(
        'idx_ncr_reports_company_id',
        'ncr_reports',
        'company_id'
    );
SELECT safe_create_index(
        'idx_ncr_reports_created_by',
        'ncr_reports',
        'created_by'
    );
SELECT safe_create_index(
        'idx_ncr_reports_created_at',
        'ncr_reports',
        'created_at'
    );
-- Holds
SELECT safe_create_index('idx_holds_company_id', 'holds', 'company_id');
SELECT safe_create_index('idx_holds_ncr_id', 'holds', 'ncr_id');
-- User Roles
SELECT safe_create_index(
        'idx_user_roles_user_id',
        'user_roles',
        'user_id'
    );
SELECT safe_create_index(
        'idx_user_roles_role_id',
        'user_roles',
        'role_id'
    );
-- User Departments
SELECT safe_create_index(
        'idx_user_departments_user_id',
        'user_departments',
        'user_id'
    );
SELECT safe_create_index(
        'idx_user_departments_department_id',
        'user_departments',
        'department_id'
    );
-- Role Module Permissions
SELECT safe_create_index(
        'idx_role_module_permissions_role_id',
        'role_module_permissions',
        'role_id'
    );
SELECT safe_create_index(
        'idx_role_module_permissions_module_code',
        'role_module_permissions',
        'module_code'
    );
-- Drop helper function
DROP FUNCTION IF EXISTS safe_create_index;
SET app.bypass_permission_check = 'off';
DO $$ BEGIN RAISE NOTICE 'تم معالجة الفهارس بنجاح!';
END $$;