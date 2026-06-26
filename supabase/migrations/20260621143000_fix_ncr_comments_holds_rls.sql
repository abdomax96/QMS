-- Fix NCR comments and hold-sort RLS for stage-based permissions.
-- Dev-first migration. Keeps company isolation while allowing the same
-- stage actions that the NCR UI already uses.

BEGIN;

CREATE OR REPLACE FUNCTION public.user_has_ncr_stage_action(
  p_user_id uuid,
  p_stage_code text,
  p_action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(public.is_admin_or_super_admin(), false)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.ncr_stage_permissions nsp ON nsp.role_id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND nsp.is_active IS TRUE
        AND nsp.stage_code = p_stage_code
        AND p_action = ANY(nsp.allowed_actions)
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_departments ud
      JOIN public.ncr_stage_permissions nsp ON nsp.department_id = ud.department_id
      WHERE ud.user_id = p_user_id
        AND ud.is_active IS TRUE
        AND nsp.is_active IS TRUE
        AND nsp.stage_code = p_stage_code
        AND p_action = ANY(nsp.allowed_actions)
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_ncr_stage_action(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ncr_comments_current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_company_id();
$$;

GRANT EXECUTE ON FUNCTION public.ncr_comments_current_company_id() TO authenticated;

ALTER TABLE public.ncr_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ncr_comments_select_policy" ON public.ncr_comments;
DROP POLICY IF EXISTS "ncr_comments_insert_policy" ON public.ncr_comments;
DROP POLICY IF EXISTS "ncr_comments_update_policy" ON public.ncr_comments;
DROP POLICY IF EXISTS "ncr_comments_delete_policy" ON public.ncr_comments;

CREATE POLICY "ncr_comments_select_policy" ON public.ncr_comments
FOR SELECT TO authenticated
USING (
  (
    ncr_id IS NULL
    AND (
      company_id IS NULL
      OR company_id = public.get_user_company_id()
      OR public.is_admin_or_super_admin()
    )
    AND public.check_ncr_permission(auth.uid(), 'view', NULL::text)
  )
  OR EXISTS (
    SELECT 1
    FROM public.ncr_reports r
    WHERE r.id::text = ncr_comments.ncr_id::text
      AND (ncr_comments.company_id IS NULL OR ncr_comments.company_id = r.company_id)
      AND (
        r.company_id = public.get_user_company_id()
        OR public.is_admin_or_super_admin()
      )
      AND (
        public.check_ncr_permission(auth.uid(), 'view', r.current_stage)
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'view')
      )
  )
);

CREATE POLICY "ncr_comments_insert_policy" ON public.ncr_comments
FOR INSERT TO authenticated
WITH CHECK (
  (author_id IS NULL OR author_id::text = auth.uid()::text)
  AND EXISTS (
    SELECT 1
    FROM public.ncr_reports r
    WHERE r.id::text = ncr_comments.ncr_id::text
      AND ncr_comments.company_id = r.company_id
      AND (
        r.company_id = public.get_user_company_id()
        OR public.is_admin_or_super_admin()
      )
      AND (
        public.check_ncr_permission(auth.uid(), 'comment', r.current_stage)
        OR public.check_ncr_permission(auth.uid(), 'view', r.current_stage)
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'view')
      )
  )
);

CREATE POLICY "ncr_comments_update_policy" ON public.ncr_comments
FOR UPDATE TO authenticated
USING (
  author_id::text = auth.uid()::text
  AND (
    company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  )
)
WITH CHECK (
  author_id::text = auth.uid()::text
  AND (
    company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  )
);

CREATE POLICY "ncr_comments_delete_policy" ON public.ncr_comments
FOR DELETE TO authenticated
USING (
  author_id::text = auth.uid()::text
  AND (
    company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  )
);

ALTER TABLE public.ncr_hold_sort_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ncr_hold_sort_logs_select_policy" ON public.ncr_hold_sort_logs;
DROP POLICY IF EXISTS "ncr_hold_sort_logs_insert_policy" ON public.ncr_hold_sort_logs;
DROP POLICY IF EXISTS "ncr_hold_sort_logs_update_policy" ON public.ncr_hold_sort_logs;
DROP POLICY IF EXISTS "ncr_hold_sort_logs_delete_policy" ON public.ncr_hold_sort_logs;

CREATE POLICY "ncr_hold_sort_logs_select_policy" ON public.ncr_hold_sort_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ncr_reports r
    WHERE r.id = ncr_hold_sort_logs.ncr_id
      AND ncr_hold_sort_logs.company_id = r.company_id
      AND (
        r.company_id = public.get_user_company_id()
        OR public.is_admin_or_super_admin()
      )
      AND (
        public.check_ncr_permission(auth.uid(), 'view', r.current_stage)
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'view')
      )
  )
);

CREATE POLICY "ncr_hold_sort_logs_insert_policy" ON public.ncr_hold_sort_logs
FOR INSERT TO authenticated
WITH CHECK (
  (sorted_by IS NULL OR sorted_by = auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.ncr_reports r
    WHERE r.id = ncr_hold_sort_logs.ncr_id
      AND ncr_hold_sort_logs.company_id = r.company_id
      AND (
        r.company_id = public.get_user_company_id()
        OR public.is_admin_or_super_admin()
      )
      AND (
        public.check_ncr_permission(auth.uid(), 'edit', r.current_stage)
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'edit')
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'release_hold')
      )
  )
);

CREATE POLICY "ncr_hold_sort_logs_update_policy" ON public.ncr_hold_sort_logs
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ncr_reports r
    WHERE r.id = ncr_hold_sort_logs.ncr_id
      AND ncr_hold_sort_logs.company_id = r.company_id
      AND (
        r.company_id = public.get_user_company_id()
        OR public.is_admin_or_super_admin()
      )
      AND (
        public.check_ncr_permission(auth.uid(), 'edit', r.current_stage)
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'edit')
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'release_hold')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ncr_reports r
    WHERE r.id = ncr_hold_sort_logs.ncr_id
      AND ncr_hold_sort_logs.company_id = r.company_id
      AND (
        r.company_id = public.get_user_company_id()
        OR public.is_admin_or_super_admin()
      )
      AND (
        public.check_ncr_permission(auth.uid(), 'edit', r.current_stage)
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'edit')
        OR public.user_has_ncr_stage_action(auth.uid(), r.current_stage, 'release_hold')
      )
  )
);

CREATE POLICY "ncr_hold_sort_logs_delete_policy" ON public.ncr_hold_sort_logs
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ncr_reports r
    WHERE r.id = ncr_hold_sort_logs.ncr_id
      AND ncr_hold_sort_logs.company_id = r.company_id
      AND (
        r.company_id = public.get_user_company_id()
        OR public.is_admin_or_super_admin()
      )
      AND (
        public.check_ncr_permission(auth.uid(), 'delete', r.current_stage)
        OR public.check_ncr_permission(auth.uid(), 'edit', r.current_stage)
      )
  )
);

COMMIT;
