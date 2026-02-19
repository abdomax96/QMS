-- Migration: Repair departments primary key then enforce documents.department_id FK
-- Date: 2026-02-19
-- Why:
--   Some drifted environments lost constraints/indexes on public.departments,
--   including the primary key on id. Without unique semantics on departments.id,
--   FK creation for documents.department_id is skipped and PostgREST embedding fails.

SET app.bypass_permission_check = 'on';

-- 1) Ensure public.departments(id) has primary key semantics.
DO $$
DECLARE
    v_id_attnum smallint;
BEGIN
    IF to_regclass('public.departments') IS NULL THEN
        RAISE NOTICE 'Skipping departments PK repair: public.departments table is missing.';
    ELSE
        SELECT attnum
        INTO v_id_attnum
        FROM pg_attribute
        WHERE attrelid = 'public.departments'::regclass
          AND attname = 'id'
          AND NOT attisdropped;

        IF v_id_attnum IS NULL THEN
            RAISE NOTICE 'Skipping departments PK repair: public.departments.id column is missing.';
        ELSIF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            WHERE c.conrelid = 'public.departments'::regclass
              AND c.contype = 'p'
              AND c.conkey = ARRAY[v_id_attnum]::smallint[]
        ) THEN
            IF EXISTS (
                SELECT 1
                FROM public.departments
                WHERE id IS NULL
            ) THEN
                RAISE EXCEPTION 'Cannot create departments_pkey: NULL values exist in public.departments.id';
            END IF;

            IF EXISTS (
                SELECT 1
                FROM public.departments
                GROUP BY id
                HAVING COUNT(*) > 1
            ) THEN
                RAISE EXCEPTION 'Cannot create departments_pkey: duplicate values exist in public.departments.id';
            END IF;

            ALTER TABLE public.departments
                ADD CONSTRAINT departments_pkey PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

-- Keep common departments indexes present on healthy environments.
CREATE INDEX IF NOT EXISTS idx_departments_code ON public.departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments(is_active);

-- 2) Ensure documents.department_id exists, clean orphans, and enforce FK.
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
            ALTER TABLE public.documents
                ADD CONSTRAINT documents_department_id_fkey
                FOREIGN KEY (department_id)
                REFERENCES public.departments(id)
                ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_department ON public.documents(department_id);

-- 3) Refresh PostgREST schema cache.
SELECT pg_notify('pgrst', 'reload schema');

SET app.bypass_permission_check = 'off';
