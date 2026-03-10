-- Add shelf life unit for raw materials (days/months/years).

ALTER TABLE public.raw_materials
    ADD COLUMN IF NOT EXISTS shelf_life_unit TEXT;

UPDATE public.raw_materials
SET shelf_life_unit = COALESCE(NULLIF(shelf_life_unit, ''), 'days');

ALTER TABLE public.raw_materials
    ALTER COLUMN shelf_life_unit SET DEFAULT 'days',
    ALTER COLUMN shelf_life_unit SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'raw_materials_shelf_life_unit_check'
    ) THEN
        ALTER TABLE public.raw_materials
            ADD CONSTRAINT raw_materials_shelf_life_unit_check
            CHECK (shelf_life_unit IN ('days', 'months', 'years'));
    END IF;
END $$;

COMMENT ON COLUMN public.raw_materials.shelf_life_unit
    IS 'Shelf life unit: days, months, or years.';
