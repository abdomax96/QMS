-- Let a dedicated trigger authorize NCR report UPDATE column changes.
-- RLS keeps tenant isolation; the trigger enforces exact stage actions.
-- Dev-first migration. Do not apply to production without explicit approval.

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_ncr_report_sensitive_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_rank integer;
  v_new_rank integer;
  v_root_status text;
  v_is_return boolean := false;
  v_is_forward boolean := false;
  v_old_general jsonb;
  v_new_general jsonb;
BEGIN
  IF current_setting('app.bypass_permission_check', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin_or_super_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: NCR company cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  v_old_rank := public.ncr_stage_rank(OLD.current_stage);
  v_new_rank := public.ncr_stage_rank(NEW.current_stage);
  v_root_status := COALESCE(NEW.root_cause_approval->>'status', '');
  v_is_return := NEW.current_stage IS DISTINCT FROM OLD.current_stage
    AND v_old_rank IS NOT NULL
    AND v_new_rank IS NOT NULL
    AND v_new_rank < v_old_rank;
  v_is_forward := NEW.current_stage IS DISTINCT FROM OLD.current_stage
    AND v_old_rank IS NOT NULL
    AND v_new_rank IS NOT NULL
    AND v_new_rank > v_old_rank;

  IF v_is_return THEN
    IF NOT (
      public.check_matrix_permission(auth.uid(), 'ncr', 'workflow.return', OLD.current_stage, NULL)
      OR public.check_matrix_permission(auth.uid(), 'ncr', 'reopen', OLD.current_stage, NULL)
    ) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: NCR return/reopen requires workflow.return or reopen on stage %', OLD.current_stage
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF v_is_forward THEN
    IF OLD.current_stage = 'root_cause_analysis'
      AND NEW.current_stage = 'capa_planning'
      AND v_root_status = 'approved'
    THEN
      PERFORM public.require_ncr_stage_action_or_raise(
        'approve',
        OLD.current_stage,
        'Root cause approval requires approve permission.'
      );
    ELSE
      PERFORM public.require_ncr_stage_action_or_raise(
        'workflow.progress',
        OLD.current_stage,
        'Workflow progress requires workflow.progress permission.'
      );
    END IF;
  END IF;

  IF NEW.root_cause IS DISTINCT FROM OLD.root_cause THEN
    PERFORM public.require_ncr_stage_action_or_raise(
      'root_cause.propose',
      OLD.current_stage,
      'Root cause changes require root_cause.propose permission.'
    );
  END IF;

  IF NEW.root_cause_approval IS DISTINCT FROM OLD.root_cause_approval THEN
    IF v_root_status = 'pending' THEN
      PERFORM public.require_ncr_stage_action_or_raise(
        'root_cause.propose',
        OLD.current_stage,
        'Root cause proposal requires root_cause.propose permission.'
      );
    ELSIF v_root_status = 'approved' THEN
      PERFORM public.require_ncr_stage_action_or_raise(
        'approve',
        OLD.current_stage,
        'Root cause approval requires approve permission.'
      );
    ELSIF v_root_status = 'rejected' THEN
      PERFORM public.require_ncr_stage_action_or_raise(
        'reject',
        OLD.current_stage,
        'Root cause rejection requires reject permission.'
      );
    ELSE
      PERFORM public.require_ncr_stage_action_or_raise(
        'root_cause.propose',
        OLD.current_stage,
        'Root cause approval changes require root cause permissions.'
      );
    END IF;
  END IF;

  IF NEW.actions IS DISTINCT FROM OLD.actions THEN
    IF OLD.current_stage = 'capa_planning' THEN
      PERFORM public.require_ncr_stage_action_or_raise(
        'capa.add',
        OLD.current_stage,
        'CAPA planning changes require capa.add permission.'
      );
    ELSIF OLD.current_stage = 'capa_execution' THEN
      PERFORM public.require_ncr_stage_action_or_raise(
        'capa.complete',
        OLD.current_stage,
        'CAPA execution changes require capa.complete permission.'
      );
    ELSE
      RAISE EXCEPTION 'PERMISSION_DENIED: CAPA actions cannot be changed from stage %', OLD.current_stage
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.holds IS DISTINCT FROM OLD.holds THEN
    PERFORM public.require_ncr_stage_action_or_raise(
      'release_hold',
      OLD.current_stage,
      'Hold changes require release_hold permission.'
    );
  END IF;

  IF NEW.verification IS DISTINCT FROM OLD.verification THEN
    PERFORM public.require_ncr_stage_action_or_raise(
      'verify_close',
      OLD.current_stage,
      'Verification changes require verify_close permission.'
    );
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    OR NEW.closed_at IS DISTINCT FROM OLD.closed_at
    OR NEW.closed_by IS DISTINCT FROM OLD.closed_by
  THEN
    IF NEW.status = 'closed' OR NEW.closed_at IS NOT NULL THEN
      PERFORM public.require_ncr_stage_action_or_raise(
        'verify_close',
        OLD.current_stage,
        'Closing NCR requires verify_close permission.'
      );
    END IF;
  END IF;

  IF NOT v_is_forward
    AND NOT (
      NEW.verification IS DISTINCT FROM OLD.verification
      OR NEW.status = 'closed'
      OR NEW.closed_at IS NOT NULL
    )
    AND (
      NEW.current_stage IS DISTINCT FROM OLD.current_stage
      OR NEW.completed_stages IS DISTINCT FROM OLD.completed_stages
      OR NEW.stage_history IS DISTINCT FROM OLD.stage_history
    )
  THEN
    PERFORM public.require_ncr_stage_action_or_raise(
      'workflow.progress',
      OLD.current_stage,
      'Workflow stage changes require workflow.progress permission.'
    );
  END IF;

  v_old_general := to_jsonb(OLD) - ARRAY[
    'updated_at',
    'root_cause',
    'root_cause_approval',
    'actions',
    'holds',
    'verification',
    'current_stage',
    'completed_stages',
    'stage_history',
    'status',
    'closed_at',
    'closed_by'
  ];

  v_new_general := to_jsonb(NEW) - ARRAY[
    'updated_at',
    'root_cause',
    'root_cause_approval',
    'actions',
    'holds',
    'verification',
    'current_stage',
    'completed_stages',
    'stage_history',
    'status',
    'closed_at',
    'closed_by'
  ];

  IF v_new_general IS DISTINCT FROM v_old_general THEN
    PERFORM public.require_ncr_stage_action_or_raise(
      'edit',
      OLD.current_stage,
      'General NCR field changes require edit permission.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "ncr_reports_update_matrix" ON public.ncr_reports;
CREATE POLICY "ncr_reports_update_matrix" ON public.ncr_reports
FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR public.is_admin_or_super_admin()
)
WITH CHECK (
  company_id = public.get_user_company_id()
  OR public.is_admin_or_super_admin()
);

COMMENT ON POLICY "ncr_reports_update_matrix" ON public.ncr_reports
IS 'Tenant isolation only. Exact NCR update permissions are enforced by trg_validate_ncr_report_sensitive_update.';

COMMIT;
