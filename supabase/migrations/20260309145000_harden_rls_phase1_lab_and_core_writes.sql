-- ============================================================
-- Phase-1 RLS hardening (Dev-first)
-- Scope:
--   - lab_v2 related authenticated-write policies
--   - lab packaging settings policies
--   - lab_v2 print settings policies
--   - material_receiving authenticated policies
--   - departments write policies
-- Notes:
--   - Keep service_role bypass policies unchanged.
--   - Minimize blast radius: focus on currently flagged permissive writes.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------------
-- 0) Harden helper: get_user_company_id() with trusted app_metadata
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company uuid;
    v_company_claim text;
BEGIN
    -- Trusted claim first (app_metadata), fallback to users table.
    v_company_claim := nullif(auth.jwt() -> 'app_metadata' ->> 'company_id', '');

    IF v_company_claim IS NOT NULL THEN
        BEGIN
            v_company := v_company_claim::uuid;
            RETURN v_company;
        EXCEPTION
            WHEN invalid_text_representation THEN
                -- Ignore invalid claim format and fallback to users table.
                NULL;
        END;
    END IF;

    SELECT u.company_id
    INTO v_company
    FROM public.users u
    WHERE u.id = auth.uid();

    RETURN v_company;
END;
$$;

-- Helper function for lab/lab_tests permissions to avoid policy duplication.
CREATE OR REPLACE FUNCTION public.can_access_lab_tests_action(p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
    COALESCE(public.can_access_module(auth.uid(), 'lab_tests', p_action), false)
    OR COALESCE(public.can_access_module(auth.uid(), 'lab', p_action), false);
$$;

-- ------------------------------------------------------------------
-- 1) Lab packaging settings (global reference tables)
-- ------------------------------------------------------------------
ALTER TABLE public.lab_packaging_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_packaging_subtypes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_packaging_types_select_authenticated" ON public.lab_packaging_types;
DROP POLICY IF EXISTS "lab_packaging_types_modify_authenticated" ON public.lab_packaging_types;
DROP POLICY IF EXISTS "lab_packaging_subtypes_select_authenticated" ON public.lab_packaging_subtypes;
DROP POLICY IF EXISTS "lab_packaging_subtypes_modify_authenticated" ON public.lab_packaging_subtypes;

CREATE POLICY "lab_packaging_types_select_authenticated"
ON public.lab_packaging_types
FOR SELECT
TO authenticated
USING (public.can_access_lab_tests_action('view'));

CREATE POLICY "lab_packaging_types_insert_authenticated"
ON public.lab_packaging_types
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_lab_tests_action('create')
    OR public.can_access_lab_tests_action('edit')
);

CREATE POLICY "lab_packaging_types_update_authenticated"
ON public.lab_packaging_types
FOR UPDATE
TO authenticated
USING (public.can_access_lab_tests_action('edit'))
WITH CHECK (public.can_access_lab_tests_action('edit'));

CREATE POLICY "lab_packaging_types_delete_authenticated"
ON public.lab_packaging_types
FOR DELETE
TO authenticated
USING (
    public.can_access_lab_tests_action('delete')
    OR public.can_access_lab_tests_action('edit')
);

CREATE POLICY "lab_packaging_subtypes_select_authenticated"
ON public.lab_packaging_subtypes
FOR SELECT
TO authenticated
USING (public.can_access_lab_tests_action('view'));

CREATE POLICY "lab_packaging_subtypes_insert_authenticated"
ON public.lab_packaging_subtypes
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_lab_tests_action('create')
    OR public.can_access_lab_tests_action('edit')
);

CREATE POLICY "lab_packaging_subtypes_update_authenticated"
ON public.lab_packaging_subtypes
FOR UPDATE
TO authenticated
USING (public.can_access_lab_tests_action('edit'))
WITH CHECK (public.can_access_lab_tests_action('edit'));

CREATE POLICY "lab_packaging_subtypes_delete_authenticated"
ON public.lab_packaging_subtypes
FOR DELETE
TO authenticated
USING (
    public.can_access_lab_tests_action('delete')
    OR public.can_access_lab_tests_action('edit')
);

-- ------------------------------------------------------------------
-- 2) Lab V2 print settings
-- ------------------------------------------------------------------
ALTER TABLE public.lab_v2_print_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lab_v2_print_settings_select_authenticated ON public.lab_v2_print_settings;
DROP POLICY IF EXISTS lab_v2_print_settings_modify_authenticated ON public.lab_v2_print_settings;

CREATE POLICY lab_v2_print_settings_select_authenticated
ON public.lab_v2_print_settings
FOR SELECT
TO authenticated
USING (
    public.can_access_lab_tests_action('view')
    AND company_id = public.get_user_company_id()
);

CREATE POLICY lab_v2_print_settings_insert_authenticated
ON public.lab_v2_print_settings
FOR INSERT
TO authenticated
WITH CHECK (
    (public.can_access_lab_tests_action('create') OR public.can_access_lab_tests_action('edit'))
    AND company_id = public.get_user_company_id()
);

CREATE POLICY lab_v2_print_settings_update_authenticated
ON public.lab_v2_print_settings
FOR UPDATE
TO authenticated
USING (
    public.can_access_lab_tests_action('edit')
    AND company_id = public.get_user_company_id()
)
WITH CHECK (
    public.can_access_lab_tests_action('edit')
    AND company_id = public.get_user_company_id()
);

CREATE POLICY lab_v2_print_settings_delete_authenticated
ON public.lab_v2_print_settings
FOR DELETE
TO authenticated
USING (
    (public.can_access_lab_tests_action('delete') OR public.can_access_lab_tests_action('edit'))
    AND company_id = public.get_user_company_id()
);

-- ------------------------------------------------------------------
-- 3) Lab V2 structure tables created by unified migration
-- ------------------------------------------------------------------
ALTER TABLE public.lab_v2_test_product_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_v2_test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_v2_test_step_device_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_v2_test_step_material_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_v2_run_material_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lab_v2_test_product_links_authenticated_all ON public.lab_v2_test_product_links;
DROP POLICY IF EXISTS lab_v2_test_steps_authenticated_all ON public.lab_v2_test_steps;
DROP POLICY IF EXISTS lab_v2_test_step_device_plans_authenticated_all ON public.lab_v2_test_step_device_plans;
DROP POLICY IF EXISTS lab_v2_test_step_material_plans_authenticated_all ON public.lab_v2_test_step_material_plans;
DROP POLICY IF EXISTS lab_v2_run_material_selections_authenticated_all ON public.lab_v2_run_material_selections;

CREATE POLICY lab_v2_test_product_links_select_authenticated
ON public.lab_v2_test_product_links
FOR SELECT
TO authenticated
USING (
    public.can_access_lab_tests_action('view')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_product_links.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_product_links_insert_authenticated
ON public.lab_v2_test_product_links
FOR INSERT
TO authenticated
WITH CHECK (
    (public.can_access_lab_tests_action('create') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_product_links.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_product_links_update_authenticated
ON public.lab_v2_test_product_links
FOR UPDATE
TO authenticated
USING (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_product_links.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
)
WITH CHECK (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_product_links.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_product_links_delete_authenticated
ON public.lab_v2_test_product_links
FOR DELETE
TO authenticated
USING (
    (public.can_access_lab_tests_action('delete') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_product_links.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_steps_select_authenticated
ON public.lab_v2_test_steps
FOR SELECT
TO authenticated
USING (
    public.can_access_lab_tests_action('view')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_steps.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_steps_insert_authenticated
ON public.lab_v2_test_steps
FOR INSERT
TO authenticated
WITH CHECK (
    (public.can_access_lab_tests_action('create') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_steps.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_steps_update_authenticated
ON public.lab_v2_test_steps
FOR UPDATE
TO authenticated
USING (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_steps.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
)
WITH CHECK (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_steps.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_steps_delete_authenticated
ON public.lab_v2_test_steps
FOR DELETE
TO authenticated
USING (
    (public.can_access_lab_tests_action('delete') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_steps.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_step_device_plans_select_authenticated
ON public.lab_v2_test_step_device_plans
FOR SELECT
TO authenticated
USING (
    public.can_access_lab_tests_action('view')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_device_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_step_device_plans_insert_authenticated
ON public.lab_v2_test_step_device_plans
FOR INSERT
TO authenticated
WITH CHECK (
    (public.can_access_lab_tests_action('create') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_device_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_step_device_plans_update_authenticated
ON public.lab_v2_test_step_device_plans
FOR UPDATE
TO authenticated
USING (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_device_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
)
WITH CHECK (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_device_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_step_device_plans_delete_authenticated
ON public.lab_v2_test_step_device_plans
FOR DELETE
TO authenticated
USING (
    (public.can_access_lab_tests_action('delete') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_device_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_step_material_plans_select_authenticated
ON public.lab_v2_test_step_material_plans
FOR SELECT
TO authenticated
USING (
    public.can_access_lab_tests_action('view')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_material_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_step_material_plans_insert_authenticated
ON public.lab_v2_test_step_material_plans
FOR INSERT
TO authenticated
WITH CHECK (
    (public.can_access_lab_tests_action('create') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_material_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_step_material_plans_update_authenticated
ON public.lab_v2_test_step_material_plans
FOR UPDATE
TO authenticated
USING (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_material_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
)
WITH CHECK (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_material_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_test_step_material_plans_delete_authenticated
ON public.lab_v2_test_step_material_plans
FOR DELETE
TO authenticated
USING (
    (public.can_access_lab_tests_action('delete') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_tests t
        WHERE t.id = lab_v2_test_step_material_plans.test_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_run_material_selections_select_authenticated
ON public.lab_v2_run_material_selections
FOR SELECT
TO authenticated
USING (
    public.can_access_lab_tests_action('view')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_test_runs r
        WHERE r.id = lab_v2_run_material_selections.run_id
          AND (r.company_id IS NULL OR r.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_run_material_selections_insert_authenticated
ON public.lab_v2_run_material_selections
FOR INSERT
TO authenticated
WITH CHECK (
    (public.can_access_lab_tests_action('create') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_test_runs r
        WHERE r.id = lab_v2_run_material_selections.run_id
          AND (r.company_id IS NULL OR r.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_run_material_selections_update_authenticated
ON public.lab_v2_run_material_selections
FOR UPDATE
TO authenticated
USING (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_test_runs r
        WHERE r.id = lab_v2_run_material_selections.run_id
          AND (r.company_id IS NULL OR r.company_id = public.get_user_company_id())
    )
)
WITH CHECK (
    public.can_access_lab_tests_action('edit')
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_test_runs r
        WHERE r.id = lab_v2_run_material_selections.run_id
          AND (r.company_id IS NULL OR r.company_id = public.get_user_company_id())
    )
);

CREATE POLICY lab_v2_run_material_selections_delete_authenticated
ON public.lab_v2_run_material_selections
FOR DELETE
TO authenticated
USING (
    (public.can_access_lab_tests_action('delete') OR public.can_access_lab_tests_action('edit'))
    AND EXISTS (
        SELECT 1
        FROM public.lab_v2_test_runs r
        WHERE r.id = lab_v2_run_material_selections.run_id
          AND (r.company_id IS NULL OR r.company_id = public.get_user_company_id())
    )
);

-- ------------------------------------------------------------------
-- 4) material_receiving: replace permissive authenticated write rules
-- ------------------------------------------------------------------
ALTER TABLE public.material_receiving ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.material_receiving;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.material_receiving;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.material_receiving;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.material_receiving;

CREATE POLICY "material_receiving_select_authenticated"
ON public.material_receiving
FOR SELECT
TO authenticated
USING (
    public.can_access_module(auth.uid(), 'lab', 'view')
    AND (company_id IS NULL OR company_id = public.get_user_company_id())
);

CREATE POLICY "material_receiving_insert_authenticated"
ON public.material_receiving
FOR INSERT
TO authenticated
WITH CHECK (
    (public.can_access_module(auth.uid(), 'lab', 'create') OR public.can_access_module(auth.uid(), 'lab', 'edit'))
    AND (company_id IS NULL OR company_id = public.get_user_company_id())
);

CREATE POLICY "material_receiving_update_authenticated"
ON public.material_receiving
FOR UPDATE
TO authenticated
USING (
    public.can_access_module(auth.uid(), 'lab', 'edit')
    AND (company_id IS NULL OR company_id = public.get_user_company_id())
)
WITH CHECK (
    public.can_access_module(auth.uid(), 'lab', 'edit')
    AND (company_id IS NULL OR company_id = public.get_user_company_id())
);

CREATE POLICY "material_receiving_delete_authenticated"
ON public.material_receiving
FOR DELETE
TO authenticated
USING (
    (public.can_access_module(auth.uid(), 'lab', 'delete') OR public.can_access_module(auth.uid(), 'lab', 'edit'))
    AND (company_id IS NULL OR company_id = public.get_user_company_id())
);

-- ------------------------------------------------------------------
-- 5) departments: keep SELECT open to authenticated, harden writes
-- ------------------------------------------------------------------
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_update_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_authenticated" ON public.departments;

CREATE POLICY "departments_select_authenticated"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "departments_insert_authenticated"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_module(auth.uid(), 'settings', 'create')
    OR public.can_access_module(auth.uid(), 'settings', 'edit')
);

CREATE POLICY "departments_update_authenticated"
ON public.departments
FOR UPDATE
TO authenticated
USING (public.can_access_module(auth.uid(), 'settings', 'edit'))
WITH CHECK (public.can_access_module(auth.uid(), 'settings', 'edit'));

CREATE POLICY "departments_delete_authenticated"
ON public.departments
FOR DELETE
TO authenticated
USING (
    public.can_access_module(auth.uid(), 'settings', 'delete')
    OR public.can_access_module(auth.uid(), 'settings', 'edit')
);

COMMIT;

