-- Guard sensitive NCR report columns with exact stage actions.
-- This closes the gap where a broad stage "edit" grant could update workflow/CAPA/closure fields directly.
-- Dev-first migration. Do not apply to production without explicit approval.

BEGIN;

CREATE OR REPLACE FUNCTION public.ncr_stage_rank(p_stage text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_stage
    WHEN 'initial_report' THEN 1
    WHEN 'root_cause_analysis' THEN 2
    WHEN 'capa_planning' THEN 3
    WHEN 'capa_execution' THEN 4
    WHEN 'verification_closure' THEN 5
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.require_ncr_stage_action_or_raise(
  p_action text,
  p_stage text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_or_super_admin() THEN
    RETURN;
  END IF;

  IF NOT public.check_matrix_permission(auth.uid(), 'ncr', p_action, p_stage, NULL) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: %', p_message
      USING ERRCODE = '42501';
  END IF;
END;
$$;

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
BEGIN
  IF current_setting('app.bypass_permission_check', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin_or_super_admin() THEN
    RETURN NEW;
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

  -- Row-level UPDATE policy already requires edit on the old/new stage for ordinary fields.
  -- The checks below narrow sensitive workflow fields to their exact stage actions.

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ncr_report_sensitive_update ON public.ncr_reports;
CREATE TRIGGER trg_validate_ncr_report_sensitive_update
BEFORE UPDATE ON public.ncr_reports
FOR EACH ROW
EXECUTE FUNCTION public.validate_ncr_report_sensitive_update();

COMMENT ON FUNCTION public.validate_ncr_report_sensitive_update()
IS 'Enforces exact NCR stage permissions for sensitive ncr_reports updates beyond the broad edit RLS policy.';

GRANT EXECUTE ON FUNCTION public.ncr_stage_rank(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_ncr_stage_action_or_raise(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ncr_report_sensitive_update() TO authenticated;

COMMIT;
