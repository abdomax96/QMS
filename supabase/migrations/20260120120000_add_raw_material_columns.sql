-- Migration: Add missing columns to raw_materials
-- Date: 2026-01-20
-- Description: Adds storage_condition, shelf_life, and requires_lab_test columns and migrates data
-- 1. Add columns if they don't exist
ALTER TABLE public.raw_materials
ADD COLUMN IF NOT EXISTS storage_condition text,
    ADD COLUMN IF NOT EXISTS shelf_life integer,
    -- in days
ADD COLUMN IF NOT EXISTS requires_lab_test boolean DEFAULT true;
-- 2. Migrate data from specifications JSON
-- Update storage_condition based on storage_temp in specifications
UPDATE public.raw_materials
SET storage_condition = CASE
        WHEN (specifications->'storage_temp'->>'min')::int >= 15
        AND (specifications->'storage_temp'->>'max')::int <= 30 THEN 'درجة حرارة الغرفة'
        WHEN (specifications->'storage_temp'->>'min')::int >= 2
        AND (specifications->'storage_temp'->>'max')::int <= 8 THEN 'تبريد (2-8°C)'
        WHEN (specifications->'storage_temp'->>'max')::int <= -10 THEN 'تجميد (-18°C)'
        ELSE 'جاف ومظلم'
    END
WHERE specifications->'storage_temp' IS NOT NULL;
-- Update shelf_life (convert months to days)
UPDATE public.raw_materials
SET shelf_life = (specifications->>'shelf_life_months')::int * 30
WHERE specifications->>'shelf_life_months' IS NOT NULL;
-- 3. Cleanup specifications JSON (optional, keeping for now)
-- We keep 'specifications' as it might contain other details like fat, protein etc.
-- 4. Notifying user
DO $$ BEGIN RAISE NOTICE '✅ تم تحديث جدول المواد الخام ونقل البيانات بنجاح!';
END $$;