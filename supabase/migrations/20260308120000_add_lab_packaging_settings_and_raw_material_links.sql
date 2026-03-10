-- ============================================================
-- Lab Packaging Settings (Global) + Raw Materials Linking
-- ============================================================
-- Goals:
-- 1) Add global reference tables for packaging main type + subtype.
-- 2) Link packaging raw materials to those tables.
-- 3) Enforce consistency:
--    - category='packaging' => type/subtype required
--    - other categories => type/subtype must be null
-- 4) Remove allergens for packaging materials.
-- 5) Smart migration from existing packaging materials.

BEGIN;

-- ============================================================
-- 1) Reference tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lab_packaging_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    sort_order integer NOT NULL DEFAULT 100,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_packaging_subtypes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    packaging_type_id uuid NOT NULL REFERENCES public.lab_packaging_types(id) ON DELETE RESTRICT,
    name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 100,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lab_packaging_subtypes_unique_name_per_type UNIQUE (packaging_type_id, name)
);

CREATE INDEX IF NOT EXISTS idx_lab_packaging_types_active_order
    ON public.lab_packaging_types(is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_lab_packaging_subtypes_type_active_order
    ON public.lab_packaging_subtypes(packaging_type_id, is_active, sort_order, name);

-- Composite uniqueness to support composite FK from raw_materials.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_packaging_subtypes_id_type_unique
    ON public.lab_packaging_subtypes(id, packaging_type_id);

-- Keep updated_at fresh.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_lab_packaging_types_updated_at'
    ) THEN
        CREATE TRIGGER update_lab_packaging_types_updated_at
        BEFORE UPDATE ON public.lab_packaging_types
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_lab_packaging_subtypes_updated_at'
    ) THEN
        CREATE TRIGGER update_lab_packaging_subtypes_updated_at
        BEFORE UPDATE ON public.lab_packaging_subtypes
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;

-- ============================================================
-- 2) RLS and grants
-- ============================================================

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
USING (true);

CREATE POLICY "lab_packaging_types_modify_authenticated"
ON public.lab_packaging_types
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "lab_packaging_subtypes_select_authenticated"
ON public.lab_packaging_subtypes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "lab_packaging_subtypes_modify_authenticated"
ON public.lab_packaging_subtypes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT ON public.lab_packaging_types TO authenticated;
GRANT SELECT ON public.lab_packaging_subtypes TO authenticated;
GRANT ALL ON public.lab_packaging_types TO service_role;
GRANT ALL ON public.lab_packaging_subtypes TO service_role;

-- ============================================================
-- 3) raw_materials new columns + constraints
-- ============================================================

ALTER TABLE public.raw_materials
    ADD COLUMN IF NOT EXISTS packaging_type_id uuid,
    ADD COLUMN IF NOT EXISTS packaging_subtype_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'raw_materials_packaging_type_fk'
    ) THEN
        ALTER TABLE public.raw_materials
            ADD CONSTRAINT raw_materials_packaging_type_fk
            FOREIGN KEY (packaging_type_id)
            REFERENCES public.lab_packaging_types(id)
            ON DELETE RESTRICT;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'raw_materials_packaging_subtype_fk'
    ) THEN
        ALTER TABLE public.raw_materials
            ADD CONSTRAINT raw_materials_packaging_subtype_fk
            FOREIGN KEY (packaging_subtype_id)
            REFERENCES public.lab_packaging_subtypes(id)
            ON DELETE RESTRICT;
    END IF;
END$$;

-- Ensure subtype belongs to chosen type.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'raw_materials_packaging_subtype_matches_type_fk'
    ) THEN
        ALTER TABLE public.raw_materials
            ADD CONSTRAINT raw_materials_packaging_subtype_matches_type_fk
            FOREIGN KEY (packaging_subtype_id, packaging_type_id)
            REFERENCES public.lab_packaging_subtypes(id, packaging_type_id)
            ON DELETE RESTRICT;
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_raw_materials_packaging_type_id
    ON public.raw_materials(packaging_type_id);

CREATE INDEX IF NOT EXISTS idx_raw_materials_packaging_subtype_id
    ON public.raw_materials(packaging_subtype_id);

-- ============================================================
-- 4) Remove allergens for packaging materials
-- ============================================================

UPDATE public.raw_materials
SET allergens = '[]'::jsonb,
    updated_at = now()
WHERE category = 'packaging';

-- ============================================================
-- 5) Seed defaults for main packaging types
-- ============================================================

INSERT INTO public.lab_packaging_types (name, sort_order, is_active)
VALUES
    ('كرتون', 10, true),
    ('فويل/فيلم', 20, true),
    ('ملصق', 30, true),
    ('عبوة', 40, true),
    ('غطاء', 50, true),
    ('أخرى', 999, true)
ON CONFLICT (name) DO UPDATE
SET is_active = EXCLUDED.is_active;

-- ============================================================
-- 6) Smart migration for packaging raw materials
--    (keywords + fallback)
-- ============================================================

WITH packaging_materials AS (
    SELECT
        rm.id,
        COALESCE(NULLIF(trim(rm.name), ''), NULLIF(trim(rm.code), ''), 'غير مسمى') AS base_subtype_name,
        COALESCE(NULLIF(trim(rm.code), ''), substr(replace(rm.id::text, '-', ''), 1, 8)) AS suffix_code,
        lower(
            concat_ws(
                ' ',
                COALESCE(rm.name, ''),
                COALESCE(rm.code, ''),
                COALESCE(rm.specifications::text, '')
            )
        ) AS raw_text
    FROM public.raw_materials rm
    WHERE rm.category = 'packaging'
),
classified AS (
    SELECT
        pm.*,
        CASE
            WHEN pm.raw_text LIKE '%كرتون%' OR pm.raw_text LIKE '%carton%' OR pm.raw_text LIKE '%box%' THEN 'كرتون'
            WHEN pm.raw_text LIKE '%فويل%' OR pm.raw_text LIKE '%فيلم%' OR pm.raw_text LIKE '%film%' OR pm.raw_text LIKE '%foil%' THEN 'فويل/فيلم'
            WHEN pm.raw_text LIKE '%ملصق%' OR pm.raw_text LIKE '%ليبل%' OR pm.raw_text LIKE '%label%' OR pm.raw_text LIKE '%sticker%' THEN 'ملصق'
            WHEN pm.raw_text LIKE '%عبوة%' OR pm.raw_text LIKE '%jar%' OR pm.raw_text LIKE '%bottle%' OR pm.raw_text LIKE '%pack%' OR pm.raw_text LIKE '%pouch%' THEN 'عبوة'
            WHEN pm.raw_text LIKE '%غطاء%' OR pm.raw_text LIKE '%cap%' OR pm.raw_text LIKE '%lid%' THEN 'غطاء'
            ELSE 'أخرى'
        END AS mapped_type_name
    FROM packaging_materials pm
),
typed AS (
    SELECT
        c.id AS raw_material_id,
        pt.id AS packaging_type_id,
        c.base_subtype_name,
        c.suffix_code
    FROM classified c
    JOIN public.lab_packaging_types pt
      ON pt.name = c.mapped_type_name
),
deduped AS (
    SELECT
        t.*,
        row_number() OVER (
            PARTITION BY t.packaging_type_id, t.base_subtype_name
            ORDER BY t.raw_material_id
        ) AS rn
    FROM typed t
),
subtype_candidates AS (
    SELECT
        d.raw_material_id,
        d.packaging_type_id,
        CASE
            WHEN d.rn = 1 THEN d.base_subtype_name
            ELSE d.base_subtype_name || ' - ' || d.suffix_code
        END AS subtype_name
    FROM deduped d
),
inserted_subtypes AS (
    INSERT INTO public.lab_packaging_subtypes (packaging_type_id, name, sort_order, is_active)
    SELECT DISTINCT
        sc.packaging_type_id,
        sc.subtype_name,
        100,
        true
    FROM subtype_candidates sc
    ON CONFLICT (packaging_type_id, name) DO NOTHING
    RETURNING id, packaging_type_id, name
),
all_subtypes AS (
    SELECT id, packaging_type_id, name
    FROM public.lab_packaging_subtypes
)
UPDATE public.raw_materials rm
SET
    packaging_type_id = sc.packaging_type_id,
    packaging_subtype_id = ast.id,
    updated_at = now()
FROM subtype_candidates sc
JOIN all_subtypes ast
  ON ast.packaging_type_id = sc.packaging_type_id
 AND ast.name = sc.subtype_name
WHERE rm.id = sc.raw_material_id;

-- Ensure non-packaging categories do not keep links.
UPDATE public.raw_materials
SET packaging_type_id = NULL,
    packaging_subtype_id = NULL,
    updated_at = now()
WHERE category IS DISTINCT FROM 'packaging';

-- Safety backfill: if any packaging rows are still unlinked, attach them
-- to their current type (if present) or to "أخرى" with generated subtype.
WITH fallback_type AS (
    SELECT id AS fallback_type_id
    FROM public.lab_packaging_types
    WHERE name = 'أخرى'
    ORDER BY created_at
    LIMIT 1
),
unlinked_packaging AS (
    SELECT
        rm.id AS raw_material_id,
        COALESCE(rm.packaging_type_id, ft.fallback_type_id) AS target_type_id,
        COALESCE(NULLIF(trim(rm.name), ''), NULLIF(trim(rm.code), ''), 'غير مصنف') AS base_subtype_name,
        COALESCE(NULLIF(trim(rm.code), ''), substr(replace(rm.id::text, '-', ''), 1, 8)) AS suffix_code
    FROM public.raw_materials rm
    CROSS JOIN fallback_type ft
    WHERE rm.category = 'packaging'
      AND (rm.packaging_type_id IS NULL OR rm.packaging_subtype_id IS NULL)
),
deduped_unlinked AS (
    SELECT
        up.*,
        row_number() OVER (
            PARTITION BY up.target_type_id, up.base_subtype_name
            ORDER BY up.raw_material_id
        ) AS rn
    FROM unlinked_packaging up
),
unlinked_subtype_candidates AS (
    SELECT
        du.raw_material_id,
        du.target_type_id,
        CASE
            WHEN du.rn = 1 THEN du.base_subtype_name
            ELSE du.base_subtype_name || ' - ' || du.suffix_code
        END AS subtype_name
    FROM deduped_unlinked du
),
insert_unlinked_subtypes AS (
    INSERT INTO public.lab_packaging_subtypes (packaging_type_id, name, sort_order, is_active)
    SELECT DISTINCT
        usc.target_type_id,
        usc.subtype_name,
        100,
        true
    FROM unlinked_subtype_candidates usc
    ON CONFLICT (packaging_type_id, name) DO NOTHING
    RETURNING id, packaging_type_id, name
),
all_subtypes_after_safety AS (
    SELECT id, packaging_type_id, name
    FROM public.lab_packaging_subtypes
)
UPDATE public.raw_materials rm
SET
    packaging_type_id = usc.target_type_id,
    packaging_subtype_id = asa.id,
    updated_at = now()
FROM unlinked_subtype_candidates usc
JOIN all_subtypes_after_safety asa
  ON asa.packaging_type_id = usc.target_type_id
 AND asa.name = usc.subtype_name
WHERE rm.id = usc.raw_material_id;

-- ============================================================
-- 7) Enforce category-based linkage rule
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'raw_materials_packaging_link_by_category_check'
    ) THEN
        ALTER TABLE public.raw_materials
            ADD CONSTRAINT raw_materials_packaging_link_by_category_check
            CHECK (
                (
                    category = 'packaging'
                    AND packaging_type_id IS NOT NULL
                    AND packaging_subtype_id IS NOT NULL
                )
                OR (
                    category IS DISTINCT FROM 'packaging'
                    AND packaging_type_id IS NULL
                    AND packaging_subtype_id IS NULL
                )
            ) NOT VALID;
    END IF;
END$$;

ALTER TABLE public.raw_materials
    VALIDATE CONSTRAINT raw_materials_packaging_link_by_category_check;

COMMIT;
