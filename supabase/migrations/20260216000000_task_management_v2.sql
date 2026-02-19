-- Migration: Task Management System v2 - Full stage-based workflow with permissions
-- Date: 2026-02-16
-- Why:
--   Replace localStorage-based task system with full Supabase backend.
--   Adds stage-based workflow (like NCR), flexible assignment (individual/role/department),
--   mandatory approval workflow, and deep permission matrix integration.

SET app.bypass_permission_check = 'on';

-- ============================================================
-- 1. Task Workflow Stages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_workflow_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    stage_order integer NOT NULL,
    color text NOT NULL DEFAULT '#6b7280',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.task_workflow_stages (code, name, name_ar, description, description_ar, stage_order, color)
SELECT s.code, s.name, s.name_ar, s.description, s.description_ar, s.stage_order, s.color
FROM (
    VALUES
        ('assignment',  'Assignment',   'التعيين',     'Task is created and assigned to workers',      'تم إنشاء المهمة وتعيينها للعاملين',   1, '#3b82f6'),
        ('in_progress', 'In Progress',  'قيد التنفيذ',  'Task is being executed by assignees',          'المهمة قيد التنفيذ من المُسند إليهم',   2, '#8b5cf6'),
        ('review',      'Review',       'المراجعة',    'Task execution is being reviewed',             'يتم مراجعة تنفيذ المهمة',              3, '#f59e0b'),
        ('approval',    'Approval',     'الاعتماد',    'Task is pending final approval',               'المهمة بانتظار الاعتماد النهائي',       4, '#10b981'),
        ('closed',      'Closed',       'مغلقة',       'Task is completed and approved',               'المهمة مكتملة ومعتمدة',                5, '#6b7280')
) AS s(code, name, name_ar, description, description_ar, stage_order, color)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.task_workflow_stages t
    WHERE t.code = s.code
);

ALTER TABLE public.task_workflow_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_workflow_stages_read" ON public.task_workflow_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_workflow_stages_service" ON public.task_workflow_stages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Enhance tasks table with stage workflow columns
-- ============================================================

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT 'assignment',
    ADD COLUMN IF NOT EXISTS completed_stages text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS assignment_type text NOT NULL DEFAULT 'individual',
    ADD COLUMN IF NOT EXISTS assigned_role_id uuid,
    ADD COLUMN IF NOT EXISTS assigned_department_id uuid,
    ADD COLUMN IF NOT EXISTS primary_assignee_id uuid,
    ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS approved_by uuid,
    ADD COLUMN IF NOT EXISTS approved_by_name text,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz,
    ADD COLUMN IF NOT EXISTS approval_notes text,
    ADD COLUMN IF NOT EXISTS rejected_by uuid,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS estimated_hours numeric,
    ADD COLUMN IF NOT EXISTS actual_hours numeric,
    ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS related_ncr_id uuid,
    ADD COLUMN IF NOT EXISTS related_report_id uuid,
    ADD COLUMN IF NOT EXISTS related_lab_test_id uuid,
    ADD COLUMN IF NOT EXISTS related_lab_test_number text,
    ADD COLUMN IF NOT EXISTS related_material_receiving_id uuid,
    ADD COLUMN IF NOT EXISTS related_material_name text,
    ADD COLUMN IF NOT EXISTS related_supplier_id uuid,
    ADD COLUMN IF NOT EXISTS related_supplier_name text,
    ADD COLUMN IF NOT EXISTS related_control_point_id uuid;

-- Add constraint for assignment_type
DO $$
BEGIN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignment_type_check
        CHECK (assignment_type IN ('individual', 'role', 'department'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Add foreign keys safely
DO $$
BEGIN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_role_id_fkey
        FOREIGN KEY (assigned_role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN SQLSTATE '42830' THEN
        RAISE NOTICE 'Skipping tasks_assigned_role_id_fkey: public.roles(id) is not unique in this environment.';
END $$;

DO $$
BEGIN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_department_id_fkey
        FOREIGN KEY (assigned_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN SQLSTATE '42830' THEN
        RAISE NOTICE 'Skipping tasks_assigned_department_id_fkey: public.departments(id) is not unique in this environment.';
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_current_stage ON public.tasks(current_stage);
CREATE INDEX IF NOT EXISTS idx_tasks_assignment_type ON public.tasks(assignment_type);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_role_id ON public.tasks(assigned_role_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_department_id ON public.tasks(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_primary_assignee_id ON public.tasks(primary_assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);

-- ============================================================
-- 3. Task Assignments table (individual, role-pickup, department)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    user_name text,
    is_primary boolean NOT NULL DEFAULT false,
    assigned_by uuid,
    assigned_by_name text,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    completed_at timestamptz,
    status text NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed', 'declined')),
    notes text,
    company_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_company_id ON public.task_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON public.task_assignments(status);

-- ============================================================
-- 4. Task Stage Permissions (mirrors ncr_stage_permissions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_stage_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL,
    stage_code text NOT NULL,
    department_id uuid,
    allowed_actions text[] NOT NULL DEFAULT '{view}',
    can_advance boolean NOT NULL DEFAULT false,
    can_return boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'task_stage_permissions_role_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.task_stage_permissions
                ADD CONSTRAINT task_stage_permissions_role_id_fkey
                FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping task_stage_permissions_role_id_fkey: public.roles(id) is not unique in this environment.';
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'task_stage_permissions_department_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.task_stage_permissions
                ADD CONSTRAINT task_stage_permissions_department_id_fkey
                FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping task_stage_permissions_department_id_fkey: public.departments(id) is not unique in this environment.';
        END;
    END IF;
END $$;

-- Unique constraint: one entry per role+stage (optionally per department)
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_stage_perms_unique
    ON public.task_stage_permissions (role_id, stage_code, COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_task_stage_perms_role_id ON public.task_stage_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_task_stage_perms_stage_code ON public.task_stage_permissions(stage_code);

-- ============================================================
-- 5. Task Stage History (audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_stage_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    from_stage text,
    to_stage text NOT NULL,
    action text NOT NULL,
    changed_by uuid,
    changed_by_name text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    company_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_stage_history_task_id ON public.task_stage_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_stage_history_company_id ON public.task_stage_history(company_id);

-- ============================================================
-- 6. Enhance task_comments (add company_id if missing)
-- ============================================================

ALTER TABLE public.task_comments
    ADD COLUMN IF NOT EXISTS company_id uuid,
    ADD COLUMN IF NOT EXISTS edited boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS edited_at timestamptz,
    ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_task_comments_company_id ON public.task_comments(company_id);

-- ============================================================
-- 7. Task Attachments table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    file_type text,
    uploaded_by uuid,
    uploaded_by_name text,
    company_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_company_id ON public.task_attachments(company_id);

-- ============================================================
-- 8. Permission check function (mirrors check_ncr_permission)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_task_permission(
    p_user_id uuid,
    p_action text,
    p_stage_code text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_has_permission boolean := false;
BEGIN
    -- Bypass check
    IF current_setting('app.bypass_permission_check', true) = 'on' THEN
        RETURN true;
    END IF;

    -- If no stage specified, check module-level permission
    IF p_stage_code IS NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN role_module_permissions rmp ON rmp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND rmp.module_code = 'tasks'
              AND p_action = ANY(rmp.granted_actions)
        ) INTO v_has_permission;
        RETURN v_has_permission;
    END IF;

    -- Stage-level permission check
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN task_stage_permissions tsp ON tsp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND tsp.stage_code = p_stage_code
          AND tsp.is_active = true
          AND tsp.department_id IS NULL
          AND p_action = ANY(tsp.allowed_actions)
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$;

-- ============================================================
-- 9. Defaults trigger for tasks (mirrors ncr_comments pattern)
-- ============================================================

CREATE OR REPLACE FUNCTION public.tasks_apply_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_company_id uuid;
BEGIN
    -- Fill company_id if missing
    IF NEW.company_id IS NULL THEN
        v_company_id := public.get_user_company_id();
        NEW.company_id := v_company_id;
    END IF;

    -- Fill created_by if missing
    IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.created_by := auth.uid()::text;
    END IF;

    -- Ensure current_stage has a value
    IF NEW.current_stage IS NULL THEN
        NEW.current_stage := 'assignment';
    END IF;

    -- Ensure assignment_type has a value
    IF NEW.assignment_type IS NULL THEN
        NEW.assignment_type := 'individual';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_apply_defaults ON public.tasks;
CREATE TRIGGER trg_tasks_apply_defaults
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.tasks_apply_defaults();

-- ============================================================
-- 10. RLS Policies
-- ============================================================

-- Tasks: company isolation
DO $$
DECLARE
    p record;
BEGIN
    FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'tasks'
          AND policyname LIKE 'tasks_v2_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', p.policyname);
    END LOOP;
END $$;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_v2_select" ON public.tasks
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.check_task_permission(auth.uid(), 'view', NULL)
);

CREATE POLICY "tasks_v2_insert" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
    (company_id IS NULL OR company_id = public.get_user_company_id())
    AND public.check_task_permission(auth.uid(), 'create', NULL)
);

CREATE POLICY "tasks_v2_update" ON public.tasks
FOR UPDATE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND (
        public.check_task_permission(auth.uid(), 'edit', NULL)
        OR created_by::text = auth.uid()::text
    )
)
WITH CHECK (
    company_id = public.get_user_company_id()
);

CREATE POLICY "tasks_v2_delete" ON public.tasks
FOR DELETE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.check_task_permission(auth.uid(), 'delete', NULL)
);

-- Service role bypass
CREATE POLICY "tasks_v2_service" ON public.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Task assignments: company isolation
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_assignments_select" ON public.task_assignments
FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "task_assignments_insert" ON public.task_assignments
FOR INSERT TO authenticated
WITH CHECK (
    (company_id IS NULL OR company_id = public.get_user_company_id())
);

CREATE POLICY "task_assignments_update" ON public.task_assignments
FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "task_assignments_delete" ON public.task_assignments
FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "task_assignments_service" ON public.task_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Task stage permissions: read for all authenticated, write controlled at app level
ALTER TABLE public.task_stage_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_stage_perms_select" ON public.task_stage_permissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "task_stage_perms_insert" ON public.task_stage_permissions
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "task_stage_perms_update" ON public.task_stage_permissions
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "task_stage_perms_delete" ON public.task_stage_permissions
FOR DELETE TO authenticated USING (true);

CREATE POLICY "task_stage_perms_service" ON public.task_stage_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Task stage history: company isolation
ALTER TABLE public.task_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_stage_history_select" ON public.task_stage_history
FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "task_stage_history_insert" ON public.task_stage_history
FOR INSERT TO authenticated
WITH CHECK (
    company_id IS NULL OR company_id = public.get_user_company_id()
);

CREATE POLICY "task_stage_history_service" ON public.task_stage_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Task comments: company isolation
DO $$
BEGIN
    -- Only create if not already existing
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_comments' AND policyname = 'task_comments_v2_select'
    ) THEN
        ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "task_comments_v2_select" ON public.task_comments
        FOR SELECT TO authenticated
        USING (company_id IS NULL OR company_id = public.get_user_company_id());

        CREATE POLICY "task_comments_v2_insert" ON public.task_comments
        FOR INSERT TO authenticated
        WITH CHECK (company_id IS NULL OR company_id = public.get_user_company_id());

        CREATE POLICY "task_comments_v2_update" ON public.task_comments
        FOR UPDATE TO authenticated
        USING (
            (company_id IS NULL OR company_id = public.get_user_company_id())
            AND author_id::text = auth.uid()::text
        )
        WITH CHECK (company_id IS NULL OR company_id = public.get_user_company_id());

        CREATE POLICY "task_comments_v2_delete" ON public.task_comments
        FOR DELETE TO authenticated
        USING (
            (company_id IS NULL OR company_id = public.get_user_company_id())
            AND author_id::text = auth.uid()::text
        );

        CREATE POLICY "task_comments_v2_service" ON public.task_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Task attachments: company isolation
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select" ON public.task_attachments
FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "task_attachments_insert" ON public.task_attachments
FOR INSERT TO authenticated
WITH CHECK (company_id IS NULL OR company_id = public.get_user_company_id());

CREATE POLICY "task_attachments_delete" ON public.task_attachments
FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "task_attachments_service" ON public.task_attachments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 11. Storage bucket for task attachments
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
    'task-attachments',
    'task-attachments',
    false,
    10485760,
    ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
          'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
WHERE NOT EXISTS (
    SELECT 1
    FROM storage.buckets b
    WHERE b.id = 'task-attachments'
);

SET app.bypass_permission_check = 'off';
