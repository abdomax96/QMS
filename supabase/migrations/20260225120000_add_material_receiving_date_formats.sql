-- Add date format columns for material receiving production/expiry dates.
-- Supported formats:
-- dmy => day/month/year
-- my  => month/year

ALTER TABLE public.material_receiving
    ADD COLUMN IF NOT EXISTS production_date_format TEXT,
    ADD COLUMN IF NOT EXISTS expiry_date_format TEXT;

UPDATE public.material_receiving
SET
    production_date_format = COALESCE(NULLIF(production_date_format, ''), 'dmy'),
    expiry_date_format = COALESCE(NULLIF(expiry_date_format, ''), 'dmy');

ALTER TABLE public.material_receiving
    ALTER COLUMN production_date_format SET DEFAULT 'dmy',
    ALTER COLUMN expiry_date_format SET DEFAULT 'dmy',
    ALTER COLUMN production_date_format SET NOT NULL,
    ALTER COLUMN expiry_date_format SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_receiving_production_date_format_check'
    ) THEN
        ALTER TABLE public.material_receiving
            ADD CONSTRAINT material_receiving_production_date_format_check
            CHECK (production_date_format IN ('dmy', 'my'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_receiving_expiry_date_format_check'
    ) THEN
        ALTER TABLE public.material_receiving
            ADD CONSTRAINT material_receiving_expiry_date_format_check
            CHECK (expiry_date_format IN ('dmy', 'my'));
    END IF;
END
$$;

COMMENT ON COLUMN public.material_receiving.production_date_format
    IS 'Selected format for production date: dmy (day/month/year) or my (month/year)';
COMMENT ON COLUMN public.material_receiving.expiry_date_format
    IS 'Selected format for expiry date: dmy (day/month/year) or my (month/year)';
