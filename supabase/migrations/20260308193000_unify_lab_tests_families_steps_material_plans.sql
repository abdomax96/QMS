BEGIN;

-- ============================================================
-- 1) Extend test definition with fixed test families
-- ============================================================

ALTER TABLE public.lab_v2_tests
    ADD COLUMN IF NOT EXISTS test_family text;

UPDATE public.lab_v2_tests
SET test_family = CASE
    WHEN lower(coalesce(category, '')) LIKE '%ipc%' OR category LIKE '%أثناء التشغيل%' THEN 'ipc'
    WHEN lower(coalesce(category, '')) LIKE '%final%' OR category LIKE '%الإفراج%' OR category LIKE '%نهائي%' THEN 'final_release'
    WHEN lower(coalesce(category, '')) LIKE '%environment%' OR category LIKE '%بيئي%' THEN 'environmental_monitoring'
    WHEN lower(coalesce(category, '')) LIKE '%water%' OR lower(coalesce(category, '')) LIKE '%air%' OR category LIKE '%المياه%' OR category LIKE '%الهواء%' THEN 'utilities_water_air'
    WHEN lower(coalesce(category, '')) LIKE '%cip%' OR lower(coalesce(category, '')) LIKE '%cop%' OR category LIKE '%التنظيف%' OR category LIKE '%التطهير%' THEN 'cip_cop_verification'
    WHEN lower(coalesce(category, '')) LIKE '%allergen%' OR category LIKE '%حساسية%' THEN 'allergen_verification'
    ELSE 'final_release'
END
WHERE test_family IS NULL OR btrim(test_family) = '';

ALTER TABLE public.lab_v2_tests
    ALTER COLUMN test_family SET DEFAULT 'final_release';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'lab_v2_tests_test_family_check'
    ) THEN
        ALTER TABLE public.lab_v2_tests
            ADD CONSTRAINT lab_v2_tests_test_family_check
            CHECK (
                test_family IN (
                    'ipc',
                    'final_release',
                    'environmental_monitoring',
                    'utilities_water_air',
                    'cip_cop_verification',
                    'allergen_verification'
                )
            ) NOT VALID;
    END IF;
END$$;

ALTER TABLE public.lab_v2_tests
    VALIDATE CONSTRAINT lab_v2_tests_test_family_check;

ALTER TABLE public.lab_v2_tests
    ALTER COLUMN test_family SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_v2_tests_family_active
    ON public.lab_v2_tests(test_family, is_active, created_at DESC);

-- ============================================================
-- 2) Product mapping (for IPC and template mapping)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lab_v2_test_product_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid NOT NULL REFERENCES public.lab_v2_tests(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    CONSTRAINT lab_v2_test_product_links_unique UNIQUE (test_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_v2_test_product_links_product
    ON public.lab_v2_test_product_links(product_id, is_active);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_lab_v2_test_product_links_updated_at'
    ) THEN
        CREATE TRIGGER update_lab_v2_test_product_links_updated_at
        BEFORE UPDATE ON public.lab_v2_test_product_links
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;

INSERT INTO public.lab_v2_test_product_links (test_id, product_id, is_active, created_by, updated_by)
SELECT t.id, t.linked_product_id, true, t.created_by, t.updated_by
FROM public.lab_v2_tests t
WHERE t.linked_product_id IS NOT NULL
ON CONFLICT (test_id, product_id) DO NOTHING;

-- ============================================================
-- 3) Test method steps + planned materials/devices per step
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lab_v2_test_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid NOT NULL REFERENCES public.lab_v2_tests(id) ON DELETE CASCADE,
    step_order integer NOT NULL DEFAULT 0,
    title text NOT NULL,
    instructions text,
    expected_duration_min integer,
    is_required boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_lab_v2_test_steps_test_order
    ON public.lab_v2_test_steps(test_id, step_order);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'lab_v2_test_steps_unique_order'
    ) THEN
        ALTER TABLE public.lab_v2_test_steps
            ADD CONSTRAINT lab_v2_test_steps_unique_order UNIQUE (test_id, step_order);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_lab_v2_test_steps_updated_at'
    ) THEN
        CREATE TRIGGER update_lab_v2_test_steps_updated_at
        BEFORE UPDATE ON public.lab_v2_test_steps
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.lab_v2_test_step_device_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid NOT NULL REFERENCES public.lab_v2_tests(id) ON DELETE CASCADE,
    step_id uuid NOT NULL REFERENCES public.lab_v2_test_steps(id) ON DELETE CASCADE,
    device_id uuid NOT NULL REFERENCES public.lab_v2_devices(id) ON DELETE RESTRICT,
    is_required boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    CONSTRAINT lab_v2_test_step_device_plans_unique UNIQUE (step_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_v2_test_step_device_plans_test
    ON public.lab_v2_test_step_device_plans(test_id, step_id);

CREATE TABLE IF NOT EXISTS public.lab_v2_test_step_material_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid NOT NULL REFERENCES public.lab_v2_tests(id) ON DELETE CASCADE,
    step_id uuid NOT NULL REFERENCES public.lab_v2_test_steps(id) ON DELETE CASCADE,
    chemical_id uuid NOT NULL REFERENCES public.lab_v2_chemicals(id) ON DELETE RESTRICT,
    planned_quantity numeric NOT NULL,
    unit text,
    is_required boolean NOT NULL DEFAULT true,
    selection_mode text NOT NULL DEFAULT 'lot_manual',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    CONSTRAINT lab_v2_test_step_material_plans_qty_check CHECK (planned_quantity > 0),
    CONSTRAINT lab_v2_test_step_material_plans_mode_check CHECK (selection_mode IN ('lot_manual')),
    CONSTRAINT lab_v2_test_step_material_plans_unique UNIQUE (step_id, chemical_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_v2_test_step_material_plans_test
    ON public.lab_v2_test_step_material_plans(test_id, step_id);

-- ============================================================
-- 4) Extend run snapshot + run lot selections
-- ============================================================

ALTER TABLE public.lab_v2_test_runs
    ADD COLUMN IF NOT EXISTS steps_snapshot jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS materials_plan_snapshot jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.lab_v2_run_material_selections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES public.lab_v2_test_runs(id) ON DELETE CASCADE,
    plan_material_id uuid REFERENCES public.lab_v2_test_step_material_plans(id) ON DELETE SET NULL,
    step_snapshot_key text NOT NULL,
    chemical_id uuid NOT NULL REFERENCES public.lab_v2_chemicals(id) ON DELETE RESTRICT,
    chemical_receipt_id uuid NOT NULL REFERENCES public.lab_v2_chemical_receipts(id) ON DELETE RESTRICT,
    planned_quantity numeric NOT NULL,
    unit text,
    selection_notes text,
    consumption_posted_at timestamptz,
    consumed_quantity numeric,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    CONSTRAINT lab_v2_run_material_selections_qty_check CHECK (planned_quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_v2_run_material_selections_plan_unique
    ON public.lab_v2_run_material_selections(run_id, plan_material_id)
    WHERE plan_material_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_v2_run_material_selections_step_chemical_unique
    ON public.lab_v2_run_material_selections(run_id, step_snapshot_key, chemical_id);

CREATE INDEX IF NOT EXISTS idx_lab_v2_run_material_selections_run
    ON public.lab_v2_run_material_selections(run_id, consumption_posted_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_lab_v2_run_material_selections_updated_at'
    ) THEN
        CREATE TRIGGER update_lab_v2_run_material_selections_updated_at
        BEFORE UPDATE ON public.lab_v2_run_material_selections
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;

-- ============================================================
-- 5) RLS + grants for new tables
-- ============================================================

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

CREATE POLICY lab_v2_test_product_links_authenticated_all
ON public.lab_v2_test_product_links
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY lab_v2_test_steps_authenticated_all
ON public.lab_v2_test_steps
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY lab_v2_test_step_device_plans_authenticated_all
ON public.lab_v2_test_step_device_plans
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY lab_v2_test_step_material_plans_authenticated_all
ON public.lab_v2_test_step_material_plans
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY lab_v2_run_material_selections_authenticated_all
ON public.lab_v2_run_material_selections
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT ON public.lab_v2_test_product_links TO authenticated;
GRANT SELECT ON public.lab_v2_test_steps TO authenticated;
GRANT SELECT ON public.lab_v2_test_step_device_plans TO authenticated;
GRANT SELECT ON public.lab_v2_test_step_material_plans TO authenticated;
GRANT SELECT ON public.lab_v2_run_material_selections TO authenticated;

GRANT ALL ON public.lab_v2_test_product_links TO service_role;
GRANT ALL ON public.lab_v2_test_steps TO service_role;
GRANT ALL ON public.lab_v2_test_step_device_plans TO service_role;
GRANT ALL ON public.lab_v2_test_step_material_plans TO service_role;
GRANT ALL ON public.lab_v2_run_material_selections TO service_role;

COMMIT;
