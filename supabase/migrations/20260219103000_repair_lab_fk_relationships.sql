-- Migration: Repair lab table FK relationships for PostgREST embedding
-- Date: 2026-02-19
-- Why:
--   Some environments are missing FK constraints that PostgREST uses to resolve
--   embedded relations, causing PGRST200 in Lab pages.

SET app.bypass_permission_check = 'on';

-- 1) Clean orphan references (all columns are nullable).
UPDATE public.lab_tests lt
SET sample_id = NULL
WHERE sample_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.lab_samples ls
      WHERE ls.id = lt.sample_id
  );

UPDATE public.material_receiving mr
SET supplier_id = NULL
WHERE supplier_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.suppliers s
      WHERE s.id = mr.supplier_id
  );

UPDATE public.material_receiving mr
SET raw_material_id = NULL
WHERE raw_material_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.raw_materials rm
      WHERE rm.id = mr.raw_material_id
  );

UPDATE public.material_receiving mr
SET lab_test_id = NULL
WHERE lab_test_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.lab_tests lt
      WHERE lt.id = mr.lab_test_id
  );

-- 2) Ensure FK constraints required by PostgREST relation embedding exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'lab_tests_sample_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.lab_tests
                ADD CONSTRAINT lab_tests_sample_id_fkey
                FOREIGN KEY (sample_id)
                REFERENCES public.lab_samples(id)
                ON DELETE SET NULL;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping lab_tests_sample_id_fkey: public.lab_samples(id) is not unique in this environment.';
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_receiving_supplier_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.material_receiving
                ADD CONSTRAINT material_receiving_supplier_id_fkey
                FOREIGN KEY (supplier_id)
                REFERENCES public.suppliers(id)
                ON DELETE SET NULL;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping material_receiving_supplier_id_fkey: public.suppliers(id) is not unique in this environment.';
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_receiving_raw_material_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.material_receiving
                ADD CONSTRAINT material_receiving_raw_material_id_fkey
                FOREIGN KEY (raw_material_id)
                REFERENCES public.raw_materials(id);
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping material_receiving_raw_material_id_fkey: public.raw_materials(id) is not unique in this environment.';
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_receiving_lab_test_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.material_receiving
                ADD CONSTRAINT material_receiving_lab_test_id_fkey
                FOREIGN KEY (lab_test_id)
                REFERENCES public.lab_tests(id)
                ON DELETE SET NULL;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping material_receiving_lab_test_id_fkey: public.lab_tests(id) is not unique in this environment.';
        END;
    END IF;
END $$;

-- 3) Keep FK columns indexed for query performance.
CREATE INDEX IF NOT EXISTS idx_lab_tests_sample_id ON public.lab_tests(sample_id);
CREATE INDEX IF NOT EXISTS idx_material_receiving_supplier_id ON public.material_receiving(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_receiving_raw_material_id ON public.material_receiving(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_material_receiving_lab_test_id ON public.material_receiving(lab_test_id);

-- 4) Ask PostgREST to refresh schema cache immediately.
SELECT pg_notify('pgrst', 'reload schema');

SET app.bypass_permission_check = 'off';
