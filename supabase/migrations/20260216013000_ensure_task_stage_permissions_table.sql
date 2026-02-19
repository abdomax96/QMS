-- Migration: Ensure task_stage_permissions exists in drifted environments
-- Date: 2026-02-16
-- Why:
--   Some environments are missing public.task_stage_permissions, causing:
--   - 404 from PostgREST schema cache
--   - frontend permission checks to fail noisily
--
-- This migration is idempotent and safe to run even if the table already exists.

SET app.bypass_permission_check = 'on';

CREATE TABLE IF NOT EXISTS public.task_stage_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    stage_code text NOT NULL,
    department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
    allowed_actions text[] NOT NULL DEFAULT '{view}',
    can_advance boolean NOT NULL DEFAULT false,
    can_return boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per (role, stage, optional department)
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_stage_perms_unique
    ON public.task_stage_permissions (
        role_id,
        stage_code,
        COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );

CREATE INDEX IF NOT EXISTS idx_task_stage_perms_role_id ON public.task_stage_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_task_stage_perms_stage_code ON public.task_stage_permissions(stage_code);
CREATE INDEX IF NOT EXISTS idx_task_stage_perms_dept_id ON public.task_stage_permissions(department_id);

ALTER TABLE public.task_stage_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'task_stage_permissions'
          AND policyname = 'task_stage_perms_select'
    ) THEN
        CREATE POLICY "task_stage_perms_select" ON public.task_stage_permissions
        FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'task_stage_permissions'
          AND policyname = 'task_stage_perms_insert'
    ) THEN
        CREATE POLICY "task_stage_perms_insert" ON public.task_stage_permissions
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'task_stage_permissions'
          AND policyname = 'task_stage_perms_update'
    ) THEN
        CREATE POLICY "task_stage_perms_update" ON public.task_stage_permissions
        FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'task_stage_permissions'
          AND policyname = 'task_stage_perms_delete'
    ) THEN
        CREATE POLICY "task_stage_perms_delete" ON public.task_stage_permissions
        FOR DELETE TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'task_stage_permissions'
          AND policyname = 'task_stage_perms_service'
    ) THEN
        CREATE POLICY "task_stage_perms_service" ON public.task_stage_permissions
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

SET app.bypass_permission_check = 'off';

