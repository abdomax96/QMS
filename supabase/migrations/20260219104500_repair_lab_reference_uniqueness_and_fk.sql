-- Migration: Repair lab reference ID uniqueness then enforce FK relationships
-- Date: 2026-02-19
-- Why:
--   Drifted environments may lose PK/UNIQUE constraints on reference tables,
--   which prevents FK creation and breaks PostgREST embeds in Lab pages.

SET app.bypass_permission_check = 'on';

-- ---------- 1) Ensure unique ID semantics on referenced tables ----------

-- lab_samples.id
DO $$
DECLARE
    v_id_attnum smallint;
BEGIN
    SELECT attnum
    INTO v_id_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.lab_samples'::regclass
      AND attname = 'id'
      AND NOT attisdropped;

    IF v_id_attnum IS NULL THEN
        RAISE NOTICE 'Skipping lab_samples id uniqueness repair: id column missing.';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'public.lab_samples'::regclass
          AND c.contype IN ('p', 'u')
          AND c.conkey = ARRAY[v_id_attnum]::smallint[]
    ) THEN
        UPDATE public.lab_samples
        SET id = gen_random_uuid()
        WHERE id IS NULL;

        WITH ranked AS (
            SELECT ctid,
                   row_number() OVER (PARTITION BY id ORDER BY ctid DESC) AS rn
            FROM public.lab_samples
            WHERE id IS NOT NULL
        )
        DELETE FROM public.lab_samples t
        USING ranked r
        WHERE t.ctid = r.ctid
          AND r.rn > 1;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_samples_id_unique ON public.lab_samples(id);
    END IF;
END $$;

-- suppliers.id
DO $$
DECLARE
    v_id_attnum smallint;
BEGIN
    SELECT attnum
    INTO v_id_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.suppliers'::regclass
      AND attname = 'id'
      AND NOT attisdropped;

    IF v_id_attnum IS NULL THEN
        RAISE NOTICE 'Skipping suppliers id uniqueness repair: id column missing.';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'public.suppliers'::regclass
          AND c.contype IN ('p', 'u')
          AND c.conkey = ARRAY[v_id_attnum]::smallint[]
    ) THEN
        UPDATE public.suppliers
        SET id = gen_random_uuid()
        WHERE id IS NULL;

        WITH ranked AS (
            SELECT ctid,
                   row_number() OVER (PARTITION BY id ORDER BY ctid DESC) AS rn
            FROM public.suppliers
            WHERE id IS NOT NULL
        )
        DELETE FROM public.suppliers t
        USING ranked r
        WHERE t.ctid = r.ctid
          AND r.rn > 1;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_id_unique ON public.suppliers(id);
    END IF;
END $$;

-- raw_materials.id
DO $$
DECLARE
    v_id_attnum smallint;
BEGIN
    SELECT attnum
    INTO v_id_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.raw_materials'::regclass
      AND attname = 'id'
      AND NOT attisdropped;

    IF v_id_attnum IS NULL THEN
        RAISE NOTICE 'Skipping raw_materials id uniqueness repair: id column missing.';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'public.raw_materials'::regclass
          AND c.contype IN ('p', 'u')
          AND c.conkey = ARRAY[v_id_attnum]::smallint[]
    ) THEN
        UPDATE public.raw_materials
        SET id = gen_random_uuid()
        WHERE id IS NULL;

        WITH ranked AS (
            SELECT ctid,
                   row_number() OVER (PARTITION BY id ORDER BY ctid DESC) AS rn
            FROM public.raw_materials
            WHERE id IS NOT NULL
        )
        DELETE FROM public.raw_materials t
        USING ranked r
        WHERE t.ctid = r.ctid
          AND r.rn > 1;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_materials_id_unique ON public.raw_materials(id);
    END IF;
END $$;

-- lab_tests.id
DO $$
DECLARE
    v_id_attnum smallint;
BEGIN
    SELECT attnum
    INTO v_id_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.lab_tests'::regclass
      AND attname = 'id'
      AND NOT attisdropped;

    IF v_id_attnum IS NULL THEN
        RAISE NOTICE 'Skipping lab_tests id uniqueness repair: id column missing.';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'public.lab_tests'::regclass
          AND c.contype IN ('p', 'u')
          AND c.conkey = ARRAY[v_id_attnum]::smallint[]
    ) THEN
        UPDATE public.lab_tests
        SET id = gen_random_uuid()
        WHERE id IS NULL;

        WITH ranked AS (
            SELECT ctid,
                   row_number() OVER (PARTITION BY id ORDER BY ctid DESC) AS rn
            FROM public.lab_tests
            WHERE id IS NOT NULL
        )
        DELETE FROM public.lab_tests t
        USING ranked r
        WHERE t.ctid = r.ctid
          AND r.rn > 1;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_tests_id_unique ON public.lab_tests(id);
    END IF;
END $$;

-- ---------- 2) Clean orphan references ----------

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

-- ---------- 3) Re-add missing FK constraints ----------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'lab_tests_sample_id_fkey'
    ) THEN
        ALTER TABLE public.lab_tests
            ADD CONSTRAINT lab_tests_sample_id_fkey
            FOREIGN KEY (sample_id)
            REFERENCES public.lab_samples(id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_receiving_supplier_id_fkey'
    ) THEN
        ALTER TABLE public.material_receiving
            ADD CONSTRAINT material_receiving_supplier_id_fkey
            FOREIGN KEY (supplier_id)
            REFERENCES public.suppliers(id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_receiving_raw_material_id_fkey'
    ) THEN
        ALTER TABLE public.material_receiving
            ADD CONSTRAINT material_receiving_raw_material_id_fkey
            FOREIGN KEY (raw_material_id)
            REFERENCES public.raw_materials(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_receiving_lab_test_id_fkey'
    ) THEN
        ALTER TABLE public.material_receiving
            ADD CONSTRAINT material_receiving_lab_test_id_fkey
            FOREIGN KEY (lab_test_id)
            REFERENCES public.lab_tests(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ---------- 4) Ensure FK column indexes and refresh schema cache ----------

CREATE INDEX IF NOT EXISTS idx_lab_tests_sample_id ON public.lab_tests(sample_id);
CREATE INDEX IF NOT EXISTS idx_material_receiving_supplier_id ON public.material_receiving(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_receiving_raw_material_id ON public.material_receiving(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_material_receiving_lab_test_id ON public.material_receiving(lab_test_id);

SELECT pg_notify('pgrst', 'reload schema');

SET app.bypass_permission_check = 'off';
