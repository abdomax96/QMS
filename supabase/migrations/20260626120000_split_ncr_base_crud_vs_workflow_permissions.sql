-- ============================================================================
-- Migration: Split base CRUD (module-level) vs workflow actions (stage-level)
-- ============================================================================
-- Dev-first migration. DO NOT apply to production without explicit approval
-- ("APPROVED FOR PROD" per AGENTS.md).
--
-- PROBLEM (Phase 2 enforcement bug):
--   `check_matrix_permission` treated EVERY action for module = 'ncr' as a
--   stage-scoped action whenever a stage_code was supplied. As a result the
--   base CRUD actions (view/create/edit/delete/export) were granted purely
--   from `ncr_stage_permissions`. Because the default `initial_report` stage
--   preset includes `create`/`edit`/`delete`, any role configured in the NCR
--   Stage matrix silently received CRUD rights that bypassed the Main Module
--   Matrix (`role_module_permissions`). A role with NO module-level `create`
--   could still create NCRs.
--
-- DECISION (Option A — single source of truth per action class):
--   * Base CRUD actions  -> authoritative source is role_module_permissions
--                           (the Main Module Matrix), regardless of stage.
--   * Workflow actions   -> authoritative source is ncr_stage_permissions
--                           (the NCR Stage matrix), stage-scoped as before.
--
--   Base CRUD set       : view, create, edit, delete, export
--   Workflow set (NCR)  : root_cause.propose, assign, approve, release_hold,
--                         reject, verify_close, reopen, capa.add,
--                         capa.complete, workflow.progress, workflow.return
--
-- This keeps the RPC as the SINGLE backend source of truth, so every caller
-- (createNcr, edit/delete RLS triggers, can_access_ncr_row_for_action, the
-- frontend permission hooks, etc.) inherits the corrected behaviour without
-- any additional call-site changes.
--
-- RLS policies, table grants and the function signature are intentionally
-- left unchanged; only the decision logic inside the function body changes.
-- ============================================================================

BEGIN;

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
    -- Base CRUD actions are ALWAYS resolved from role_module_permissions,
    -- even when a stage_code is provided. They are NOT stage-scoped.
    v_base_crud_actions constant text[] := ARRAY[
        'view',
        'create',
        'edit',
        'delete',
        'export'
    ]::text[];
    v_is_base_crud boolean := false;
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

    v_is_base_crud := p_action = ANY(v_base_crud_actions);

    -- ------------------------------------------------------------------
    -- NCR stage-scoped WORKFLOW actions -> ncr_stage_permissions only.
    -- (Base CRUD intentionally excluded here; it falls through to the
    --  module-level branch below.)
    -- ------------------------------------------------------------------
    IF p_module_code = 'ncr' AND p_stage_code IS NOT NULL AND NOT v_is_base_crud THEN
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
        -- Module-level authority (role_module_permissions).
        -- This now also covers NCR base CRUD (view/create/edit/delete/export)
        -- regardless of any stage_code passed by callers/RLS.
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND rmp.module_code = p_module_code
              AND p_action = ANY(COALESCE(rmp.granted_actions, ARRAY[]::text[]))
        ) INTO v_has_permission;
    END IF;

    -- ------------------------------------------------------------------
    -- Tasks stage-scoped actions keep their existing fallback behaviour.
    -- (Tasks base CRUD is not part of this change.)
    -- ------------------------------------------------------------------
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

    -- ------------------------------------------------------------------
    -- Explicit per-role action restrictions (deny list) still apply last.
    -- ------------------------------------------------------------------
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
IS 'Single-source permission check. Base CRUD actions (view/create/edit/delete/export) are authorised by role_module_permissions (Main Module Matrix) regardless of stage. Workflow actions (root_cause.propose, assign, approve, release_hold, reject, verify_close, reopen, capa.add, capa.complete, workflow.progress, workflow.return) for module=ncr are authorised by ncr_stage_permissions role rows. department_module_access is not an authorization source.';

GRANT EXECUTE ON FUNCTION public.check_matrix_permission(uuid, text, text, text, uuid) TO authenticated;

COMMIT;
