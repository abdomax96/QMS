-- Fix nested RLS interactions for NCR comments/hold logs.
-- Policies query NCR report metadata through SECURITY DEFINER helpers so
-- comment writes do not fail because ncr_reports RLS hides the same row.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_access_ncr_row_for_action(
  p_ncr_id uuid,
  p_company_id uuid,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_stage text;
BEGIN
  IF p_ncr_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT r.company_id, r.current_stage
    INTO v_company_id, v_stage
  FROM public.ncr_reports r
  WHERE r.id = p_ncr_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_company_id IS NOT NULL AND p_company_id <> v_company_id THEN
    RETURN false;
  END IF;

  IF NOT (
    v_company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  ) THEN
    RETURN false;
  END IF;

  IF p_action = 'view' THEN
    RETURN
      public.check_ncr_permission(auth.uid(), 'view', v_stage)
      OR public.user_has_ncr_stage_action(auth.uid(), v_stage, 'view');
  ELSIF p_action = 'comment' THEN
    RETURN
      public.check_ncr_permission(auth.uid(), 'comment', v_stage)
      OR public.check_ncr_permission(auth.uid(), 'view', v_stage)
      OR public.user_has_ncr_stage_action(auth.uid(), v_stage, 'view');
  ELSIF p_action = 'hold_sort' THEN
    RETURN
      public.check_ncr_permission(auth.uid(), 'edit', v_stage)
      OR public.user_has_ncr_stage_action(auth.uid(), v_stage, 'edit')
      OR public.user_has_ncr_stage_action(auth.uid(), v_stage, 'release_hold');
  ELSIF p_action = 'edit' THEN
    RETURN
      public.check_ncr_permission(auth.uid(), 'edit', v_stage)
      OR public.user_has_ncr_stage_action(auth.uid(), v_stage, 'edit');
  ELSIF p_action = 'delete' THEN
    RETURN
      public.check_ncr_permission(auth.uid(), 'delete', v_stage)
      OR public.check_ncr_permission(auth.uid(), 'edit', v_stage)
      OR public.is_admin_or_super_admin();
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_ncr_row_for_action(uuid, uuid, text) TO authenticated;

ALTER TABLE public.ncr_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ncr_comments_select_policy" ON public.ncr_comments;
DROP POLICY IF EXISTS "ncr_comments_insert_policy" ON public.ncr_comments;
DROP POLICY IF EXISTS "ncr_comments_update_policy" ON public.ncr_comments;
DROP POLICY IF EXISTS "ncr_comments_delete_policy" ON public.ncr_comments;

CREATE POLICY "ncr_comments_select_policy" ON public.ncr_comments
FOR SELECT TO authenticated
USING (
  public.can_access_ncr_row_for_action(ncr_id, company_id, 'view')
);

CREATE POLICY "ncr_comments_insert_policy" ON public.ncr_comments
FOR INSERT TO authenticated
WITH CHECK (
  (author_id IS NULL OR author_id::text = auth.uid()::text)
  AND public.can_access_ncr_row_for_action(ncr_id, company_id, 'comment')
);

CREATE POLICY "ncr_comments_update_policy" ON public.ncr_comments
FOR UPDATE TO authenticated
USING (
  author_id::text = auth.uid()::text
  AND public.can_access_ncr_row_for_action(ncr_id, company_id, 'comment')
)
WITH CHECK (
  author_id::text = auth.uid()::text
  AND public.can_access_ncr_row_for_action(ncr_id, company_id, 'comment')
);

CREATE POLICY "ncr_comments_delete_policy" ON public.ncr_comments
FOR DELETE TO authenticated
USING (
  author_id::text = auth.uid()::text
  AND public.can_access_ncr_row_for_action(ncr_id, company_id, 'comment')
);

ALTER TABLE public.ncr_hold_sort_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ncr_hold_sort_logs_select_policy" ON public.ncr_hold_sort_logs;
DROP POLICY IF EXISTS "ncr_hold_sort_logs_insert_policy" ON public.ncr_hold_sort_logs;
DROP POLICY IF EXISTS "ncr_hold_sort_logs_update_policy" ON public.ncr_hold_sort_logs;
DROP POLICY IF EXISTS "ncr_hold_sort_logs_delete_policy" ON public.ncr_hold_sort_logs;

CREATE POLICY "ncr_hold_sort_logs_select_policy" ON public.ncr_hold_sort_logs
FOR SELECT TO authenticated
USING (
  public.can_access_ncr_row_for_action(ncr_id, company_id, 'view')
);

CREATE POLICY "ncr_hold_sort_logs_insert_policy" ON public.ncr_hold_sort_logs
FOR INSERT TO authenticated
WITH CHECK (
  (sorted_by IS NULL OR sorted_by = auth.uid())
  AND public.can_access_ncr_row_for_action(ncr_id, company_id, 'hold_sort')
);

CREATE POLICY "ncr_hold_sort_logs_update_policy" ON public.ncr_hold_sort_logs
FOR UPDATE TO authenticated
USING (
  public.can_access_ncr_row_for_action(ncr_id, company_id, 'hold_sort')
)
WITH CHECK (
  public.can_access_ncr_row_for_action(ncr_id, company_id, 'hold_sort')
);

CREATE POLICY "ncr_hold_sort_logs_delete_policy" ON public.ncr_hold_sort_logs
FOR DELETE TO authenticated
USING (
  public.can_access_ncr_row_for_action(ncr_id, company_id, 'delete')
);

COMMIT;
