-- Migration: Repair documents->departments FK relationship for PostgREST embedding
-- Date: 2026-02-19
-- Why:
--   Some environments have a drifted public.documents table without FK on
--   department_id, which breaks PostgREST embeds like department:departments(...).

SET app.bypass_permission_check = 'on';

-- 1) Ensure documents.department_id column exists.
DO $$
BEGIN
    IF to_regclass('public.documents') IS NULL THEN
        RAISE NOTICE 'Skipping documents FK repair: public.documents table is missing.';
    ELSIF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'department_id'
    ) THEN
        ALTER TABLE public.documents
            ADD COLUMN department_id uuid;
    END IF;
END $$;

-- 2) Clean orphan department references before adding FK.
DO $$
BEGIN
    IF to_regclass('public.documents') IS NOT NULL
       AND to_regclass('public.departments') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'documents'
             AND column_name = 'department_id'
       ) THEN
        UPDATE public.documents d
        SET department_id = NULL
        WHERE d.department_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.departments dep
              WHERE dep.id = d.department_id
          );
    END IF;
END $$;

-- 3) Re-add missing FK used by PostgREST relation embedding.
DO $$
DECLARE
    v_department_attnum smallint;
BEGIN
    IF to_regclass('public.documents') IS NULL OR to_regclass('public.departments') IS NULL THEN
        RAISE NOTICE 'Skipping documents FK repair: public.documents or public.departments is missing.';
    ELSE
        SELECT attnum
        INTO v_department_attnum
        FROM pg_attribute
        WHERE attrelid = 'public.documents'::regclass
          AND attname = 'department_id'
          AND NOT attisdropped;

        IF v_department_attnum IS NULL THEN
            RAISE NOTICE 'Skipping documents FK repair: public.documents.department_id is missing.';
        ELSIF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            WHERE c.conrelid = 'public.documents'::regclass
              AND c.contype = 'f'
              AND c.conkey = ARRAY[v_department_attnum]::smallint[]
        ) THEN
            BEGIN
                ALTER TABLE public.documents
                    ADD CONSTRAINT documents_department_id_fkey
                    FOREIGN KEY (department_id)
                    REFERENCES public.departments(id)
                    ON DELETE SET NULL;
            EXCEPTION
                WHEN SQLSTATE '42830' THEN
                    RAISE NOTICE 'Skipping documents_department_id_fkey: public.departments(id) is not unique in this environment.';
            END;
        END IF;
    END IF;
END $$;

-- 4) Keep FK column indexed and refresh PostgREST schema cache.
DO $$
BEGIN
    IF to_regclass('public.documents') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'documents'
             AND column_name = 'department_id'
       ) THEN
        CREATE INDEX IF NOT EXISTS idx_documents_department
            ON public.documents(department_id);
    END IF;
END $$;

SELECT pg_notify('pgrst', 'reload schema');

SET app.bypass_permission_check = 'off';
