-- Migration: Fix task_history RLS (allow task timeline inserts/select)
-- Date: 2026-02-16
-- Why:
--   task_history has RLS enabled from legacy schema without policies.
--   Frontend logs task actions via POST /rest/v1/task_history and receives 403.

SET app.bypass_permission_check = 'on';

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Reset existing policies safely (if any).
DO $$
DECLARE
    p record;
BEGIN
    FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'task_history'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.task_history', p.policyname);
    END LOOP;
END $$;

-- Users can read history for tasks they can access within their company scope.
CREATE POLICY "task_history_select_policy" ON public.task_history
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_history.task_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
          AND (
              t.created_by::text = auth.uid()::text
              OR t.assigned_to::text = auth.uid()::text
              OR EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  JOIN public.role_module_permissions rmp
                    ON rmp.role_id = ur.role_id
                  WHERE ur.user_id = auth.uid()
                    AND rmp.module_code = 'tasks'
                    AND (
                        'view' = ANY(rmp.granted_actions)
                        OR 'edit' = ANY(rmp.granted_actions)
                    )
              )
          )
    )
);

-- Users can write history only for tasks they can access in their company scope.
CREATE POLICY "task_history_insert_policy" ON public.task_history
FOR INSERT TO authenticated
WITH CHECK (
    (changed_by IS NULL OR changed_by = auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_history.task_id
          AND (t.company_id IS NULL OR t.company_id = public.get_user_company_id())
          AND (
              t.created_by::text = auth.uid()::text
              OR t.assigned_to::text = auth.uid()::text
              OR EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  JOIN public.role_module_permissions rmp
                    ON rmp.role_id = ur.role_id
                  WHERE ur.user_id = auth.uid()
                    AND rmp.module_code = 'tasks'
                    AND (
                        'create' = ANY(rmp.granted_actions)
                        OR 'edit' = ANY(rmp.granted_actions)
                    )
              )
          )
    )
);

-- Keep service_role unrestricted.
CREATE POLICY "task_history_service_policy" ON public.task_history
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT ON TABLE public.task_history TO authenticated;

SET app.bypass_permission_check = 'off';
