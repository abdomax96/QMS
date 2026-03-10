-- Add configurable expiry day subtraction for month/year shelf-life calculation
ALTER TABLE public.raw_materials
    ADD COLUMN IF NOT EXISTS expiry_subtract_days INTEGER;

UPDATE public.raw_materials
SET expiry_subtract_days = COALESCE(expiry_subtract_days, 0);

ALTER TABLE public.raw_materials
    ALTER COLUMN expiry_subtract_days SET DEFAULT 0,
    ALTER COLUMN expiry_subtract_days SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'raw_materials_expiry_subtract_days_check'
    ) THEN
        ALTER TABLE public.raw_materials
            ADD CONSTRAINT raw_materials_expiry_subtract_days_check
            CHECK (expiry_subtract_days >= 0);
    END IF;
END $$;

COMMENT ON COLUMN public.raw_materials.expiry_subtract_days
    IS 'Days to subtract from expiry date when shelf_life_unit is months or years.';
