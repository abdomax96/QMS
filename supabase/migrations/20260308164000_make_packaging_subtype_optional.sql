BEGIN;

-- Ensure packaging records without type can be normalized before validating the new constraint.
WITH other_type AS (
    SELECT id
    FROM public.lab_packaging_types
    WHERE name = 'أخرى'
    ORDER BY created_at ASC
    LIMIT 1
), ensured_other AS (
    INSERT INTO public.lab_packaging_types (name, sort_order, is_active)
    SELECT 'أخرى', 999, true
    WHERE NOT EXISTS (SELECT 1 FROM other_type)
    RETURNING id
), target_type AS (
    SELECT id FROM other_type
    UNION ALL
    SELECT id FROM ensured_other
    LIMIT 1
)
UPDATE public.raw_materials rm
SET packaging_type_id = (SELECT id FROM target_type),
    packaging_subtype_id = NULL
WHERE rm.category = 'packaging'
  AND rm.packaging_type_id IS NULL;

ALTER TABLE public.raw_materials
    DROP CONSTRAINT IF EXISTS raw_materials_packaging_link_by_category_check;

ALTER TABLE public.raw_materials
    ADD CONSTRAINT raw_materials_packaging_link_by_category_check
    CHECK (
        (
            category = 'packaging'
            AND packaging_type_id IS NOT NULL
        )
        OR (
            category IS DISTINCT FROM 'packaging'
            AND packaging_type_id IS NULL
            AND packaging_subtype_id IS NULL
        )
    ) NOT VALID;

ALTER TABLE public.raw_materials
    VALIDATE CONSTRAINT raw_materials_packaging_link_by_category_check;

COMMIT;