-- Add missing columns to raw_materials table
ALTER TABLE public.raw_materials
ADD COLUMN IF NOT EXISTS storage_condition text,
    ADD COLUMN IF NOT EXISTS shelf_life integer,
    ADD COLUMN IF NOT EXISTS specifications text,
    ADD COLUMN IF NOT EXISTS requires_lab_test boolean DEFAULT true;
-- Data updates are handled in 20260118223700_fix_specs.sql
DO $$ BEGIN RAISE NOTICE 'تم إضافة الأعمدة بنجاح';
END $$;