-- Migration: allow locked report folder detachment during folder deletion
-- Purpose:
--   Fix unified folder deletion failures when FK ON DELETE SET NULL updates
--   form_instances.unified_folder_id for locked reports (e.g. under_review).
-- Date: 2026-02-23

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_report_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_user_id uuid;
    v_has_review_edit_perm boolean;
    v_is_reviewer boolean;
    v_is_folder_detach boolean := false;
    v_editable_columns text[] := ARRAY[
        'status',
        'review_status',
        'reviewer_id',
        'reviewer_name',
        'reviewed_at',
        'review_notes',
        'is_locked',
        'locked_at',
        'locked_by',
        'rejection_count',
        'last_rejection_reason',
        'workflow_history',
        'updated_at',
        'version'
    ];
    v_changed_columns text[];
BEGIN
    -- Get current user from auth context
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT ARRAY_AGG(key)
    INTO v_changed_columns
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(OLD)->>key IS DISTINCT FROM to_jsonb(NEW)->>key
      AND key != ALL(v_editable_columns);

    IF v_changed_columns IS NULL OR array_length(v_changed_columns, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.is_locked = true THEN
        -- Allow FK detachment when deleting a unified folder:
        -- ON DELETE SET NULL updates unified_folder_id on locked reports.
        v_is_folder_detach :=
            v_changed_columns <@ ARRAY['folder_id', 'unified_folder_id']::text[]
            AND OLD.unified_folder_id IS NOT NULL
            AND NEW.unified_folder_id IS NULL;

        IF v_is_folder_detach THEN
            RETURN NEW;
        END IF;

        -- Check if user is assigned reviewer
        v_is_reviewer := (OLD.reviewer_id = v_user_id);

        SELECT EXISTS (
            SELECT 1
            FROM public.role_module_permissions rmp
            JOIN public.user_roles ur ON ur.role_id = rmp.role_id
            WHERE ur.user_id = v_user_id
              AND rmp.module_code = 'forms_reports'
              AND 'review_edit' = ANY(rmp.granted_actions)
        )
        INTO v_has_review_edit_perm;

        IF NOT (v_is_reviewer AND v_has_review_edit_perm) THEN
            RAISE EXCEPTION
                'REPORT_LOCKED: Report is locked and cannot be edited. Status: %. Attempted changes: %',
                OLD.status,
                array_to_string(v_changed_columns, ', ');
        END IF;

        INSERT INTO public.report_review_history (
            report_id,
            action,
            from_status,
            to_status,
            performed_by,
            performed_by_name,
            performed_by_email,
            field_changes,
            checksum
        )
        SELECT
            NEW.id,
            'edited_by_reviewer',
            OLD.status,
            NEW.status,
            v_user_id,
            u.name,
            u.email,
            jsonb_object_agg(
                col,
                jsonb_build_object(
                    'old', to_jsonb(OLD)->col,
                    'new', to_jsonb(NEW)->col
                )
            ),
            public.generate_review_history_checksum(
                NEW.id,
                'edited_by_reviewer',
                v_user_id,
                now()
            )
        FROM public.users u,
             unnest(v_changed_columns) AS col
        WHERE u.id = v_user_id
        GROUP BY u.name, u.email;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_report_lock IS
'Enforces locked-report edit constraints while allowing FK folder detachment (unified_folder_id -> NULL) on folder delete.';

COMMIT;
