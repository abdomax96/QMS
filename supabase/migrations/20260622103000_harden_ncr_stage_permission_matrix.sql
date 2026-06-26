-- Harden NCR stage permissions.
-- Dev-first migration. Do not apply to production without explicit approval.

BEGIN;

UPDATE public.app_modules
SET available_actions = ARRAY[
    'view',
    'create',
    'edit',
    'delete',
    'root_cause.propose',
    'assign',
    'approve',
    'release_hold',
    'reject',
    'verify_close',
    'export',
    'reopen',
    'capa.add',
    'capa.complete',
    'workflow.progress'
]::text[]
WHERE code = 'ncr';

UPDATE public.ncr_stage_permissions nsp
SET allowed_actions = (
    WITH allowed_for_stage AS (
        SELECT CASE nsp.stage_code
            WHEN 'initial_report' THEN ARRAY['view', 'create', 'edit', 'delete', 'workflow.progress']::text[]
            WHEN 'root_cause_analysis' THEN ARRAY['view', 'edit', 'root_cause.propose', 'assign', 'approve', 'reject', 'workflow.progress', 'reopen']::text[]
            WHEN 'capa_planning' THEN ARRAY['view', 'edit', 'capa.add', 'approve', 'reject', 'workflow.progress', 'reopen']::text[]
            WHEN 'capa_execution' THEN ARRAY['view', 'edit', 'capa.complete', 'release_hold', 'workflow.progress', 'reopen']::text[]
            WHEN 'verification_closure' THEN ARRAY['view', 'verify_close', 'export', 'reopen']::text[]
            ELSE ARRAY['view']::text[]
        END AS actions
    ),
    mapped AS (
        SELECT DISTINCT CASE action_code
            WHEN 'add_rca' THEN 'root_cause.propose'
            WHEN 'hold_add' THEN 'capa.add'
            WHEN 'hold_release' THEN 'release_hold'
            WHEN 'update_progress' THEN 'capa.complete'
            WHEN 'verify' THEN 'verify_close'
            WHEN 'print' THEN NULL
            WHEN 'review' THEN NULL
            WHEN 'investigate' THEN NULL
            WHEN 'decide' THEN NULL
            WHEN 'close' THEN NULL
            ELSE action_code
        END AS action_code
        FROM unnest(COALESCE(nsp.allowed_actions, ARRAY[]::text[])) AS action_code
        UNION
        SELECT 'workflow.progress'
        WHERE COALESCE(nsp.can_advance, false) = true
        UNION
        SELECT 'view'
    )
    SELECT ARRAY(
        SELECT action_code
        FROM mapped, allowed_for_stage
        WHERE action_code IS NOT NULL
          AND action_code = ANY(allowed_for_stage.actions)
        ORDER BY array_position(allowed_for_stage.actions, action_code)
    )
)
WHERE nsp.stage_code IN (
    'initial_report',
    'root_cause_analysis',
    'capa_planning',
    'capa_execution',
    'verification_closure'
);

CREATE OR REPLACE FUNCTION public.check_matrix_permission(
    p_user_id uuid,
    p_module_code text,
    p_action text,
    p_stage_code text DEFAULT NULL::text,
    p_entity_department_id uuid DEFAULT NULL::uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_has_permission boolean := false;
BEGIN
    IF current_setting('app.bypass_permission_check', true) = 'on' THEN
        RETURN true;
    END IF;

    IF p_user_id IS NULL OR p_module_code IS NULL OR p_action IS NULL THEN
        RETURN false;
    END IF;

    IF p_user_id = auth.uid() AND public.is_admin_or_super_admin() THEN
        RETURN true;
    END IF;

    IF p_module_code = 'ncr' AND p_stage_code IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.ncr_stage_permissions nsp ON nsp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND nsp.is_active = true
              AND nsp.department_id IS NULL
              AND nsp.stage_code = p_stage_code
              AND (
                    p_action = ANY(COALESCE(nsp.allowed_actions, ARRAY[]::text[]))
                    OR (p_action = 'workflow.progress' AND COALESCE(nsp.can_advance, false))
                    OR (p_action = 'workflow.return' AND COALESCE(nsp.can_return, false))
              )
        ) INTO v_has_permission;
    ELSE
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND rmp.module_code = p_module_code
              AND p_action = ANY(COALESCE(rmp.granted_actions, ARRAY[]::text[]))
        ) INTO v_has_permission;
    END IF;

    IF NOT v_has_permission AND p_module_code = 'tasks' AND p_stage_code IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.task_stage_permissions tsp ON tsp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND tsp.is_active = true
              AND tsp.department_id IS NULL
              AND tsp.stage_code = p_stage_code
              AND (
                    p_action = ANY(COALESCE(tsp.allowed_actions, ARRAY[]::text[]))
                    OR (p_action = 'workflow.progress' AND COALESCE(tsp.can_advance, false))
                    OR (p_action = 'workflow.return' AND COALESCE(tsp.can_return, false))
              )
        ) INTO v_has_permission;
    END IF;

    IF v_has_permission THEN
        SELECT NOT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.role_action_restrictions rar ON rar.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND rar.module_code = p_module_code
              AND (rar.stage_code IS NULL OR rar.stage_code = p_stage_code)
              AND p_action = ANY(COALESCE(rar.denied_actions, ARRAY[]::text[]))
        ) INTO v_has_permission;
    END IF;

    RETURN COALESCE(v_has_permission, false);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'check_matrix_permission failed: user=%, module=%, action=%, stage=%, error=%',
            p_user_id,
            p_module_code,
            p_action,
            p_stage_code,
            SQLERRM;
        RETURN false;
END;
$$;

COMMENT ON FUNCTION public.check_matrix_permission(uuid, text, text, text, uuid)
IS 'Single-source permission check. Stage-specific NCR decisions come only from ncr_stage_permissions role rows; department_module_access is not an authorization source.';

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
  SELECT public.check_matrix_permission(p_user_id, 'ncr', p_action, p_stage_code, NULL);
$$;

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

  IF public.is_admin_or_super_admin() THEN
    RETURN true;
  END IF;

  IF p_action = 'view' THEN
    RETURN public.check_matrix_permission(auth.uid(), 'ncr', 'view', v_stage, NULL);
  ELSIF p_action = 'comment' THEN
    RETURN public.check_matrix_permission(auth.uid(), 'ncr', 'view', v_stage, NULL);
  ELSIF p_action = 'hold_sort' THEN
    RETURN
      public.check_matrix_permission(auth.uid(), 'ncr', 'release_hold', v_stage, NULL)
      OR public.check_matrix_permission(auth.uid(), 'ncr', 'edit', v_stage, NULL);
  ELSIF p_action = 'edit' THEN
    RETURN public.check_matrix_permission(auth.uid(), 'ncr', 'edit', v_stage, NULL);
  ELSIF p_action = 'delete' THEN
    RETURN public.check_matrix_permission(auth.uid(), 'ncr', 'delete', v_stage, NULL);
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_matrix_permission(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_ncr_stage_action(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_ncr_row_for_action(uuid, uuid, text) TO authenticated;

COMMIT;
