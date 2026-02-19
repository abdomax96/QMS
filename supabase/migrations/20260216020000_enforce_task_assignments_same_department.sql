-- Migration: Enforce same-department task assignment
-- Date: 2026-02-16
-- Why:
--   Task assignees must belong to the same active department(s) as the assigning user.
--   This enforces rule server-side to prevent API bypasses.

SET app.bypass_permission_check = 'on';

CREATE OR REPLACE FUNCTION public.task_users_share_active_department(
    p_target_user_id uuid,
    p_assigner_user_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.users target_u
    JOIN public.users assigner_u
      ON assigner_u.id = p_assigner_user_id
     AND assigner_u.is_active = true
     AND assigner_u.company_id = target_u.company_id
    WHERE target_u.id = p_target_user_id
      AND target_u.is_active = true
      AND (
          (
              target_u.department_id IS NOT NULL
              AND assigner_u.department_id IS NOT NULL
              AND target_u.department_id = assigner_u.department_id
          )
          OR EXISTS (
              SELECT 1
              FROM public.user_departments target_ud
              JOIN public.user_departments assigner_ud
                ON assigner_ud.department_id = target_ud.department_id
               AND assigner_ud.user_id = p_assigner_user_id
               AND assigner_ud.is_active = true
              WHERE target_ud.user_id = p_target_user_id
                AND target_ud.is_active = true
          )
      )
);
$$;

GRANT EXECUTE ON FUNCTION public.task_users_share_active_department(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.task_assignments_enforce_same_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assigner_id uuid;
BEGIN
    IF current_setting('app.bypass_permission_check', true) = 'on' THEN
        RETURN NEW;
    END IF;

    -- Restrict explicit assignment action only.
    IF COALESCE(NEW.status, 'assigned') <> 'assigned' THEN
        RETURN NEW;
    END IF;

    v_assigner_id := COALESCE(NEW.assigned_by, auth.uid());

    -- Service context / maintenance writes without auth context.
    IF v_assigner_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.task_users_share_active_department(NEW.user_id, v_assigner_id) THEN
        RAISE EXCEPTION 'Task assignment denied: assignee must be in the same department as assigner'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_assignments_enforce_same_department ON public.task_assignments;
CREATE TRIGGER trg_task_assignments_enforce_same_department
BEFORE INSERT OR UPDATE OF user_id, assigned_by, status
ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.task_assignments_enforce_same_department();

SET app.bypass_permission_check = 'off';

