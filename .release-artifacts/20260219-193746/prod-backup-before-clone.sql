--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP FUNCTION IF EXISTS public.get_user_company_id();
DROP FUNCTION IF EXISTS public.get_user_company(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_folders(user_id_param uuid);
DROP FUNCTION IF EXISTS public.get_unread_notification_count();
DROP FUNCTION IF EXISTS public.get_required_tests(p_raw_material_id uuid, p_company_id uuid);
DROP FUNCTION IF EXISTS public.get_recent_instance_changes(p_instance_id uuid, p_limit integer);
DROP FUNCTION IF EXISTS public.get_dependent_permissions(p_permission text);
DROP FUNCTION IF EXISTS public.get_department_path(dept_id uuid);
DROP FUNCTION IF EXISTS public.get_cell_history(p_instance_id uuid, p_section_id text, p_table_id text, p_row_index integer, p_col_index integer, p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS public.get_audit_user_info();
DROP FUNCTION IF EXISTS public.get_approved_suppliers(p_raw_material_id uuid, p_company_id uuid);
DROP FUNCTION IF EXISTS public.generate_test_run_number();
DROP FUNCTION IF EXISTS public.generate_task_number();
DROP FUNCTION IF EXISTS public.generate_review_history_checksum(p_report_id uuid, p_action text, p_performed_by uuid, p_performed_at timestamp with time zone);
DROP FUNCTION IF EXISTS public.generate_pallet_number(p_batch_id uuid);
DROP FUNCTION IF EXISTS public.generate_ncr_number(p_company_id uuid);
DROP FUNCTION IF EXISTS public.generate_lab_v2_run_number();
DROP FUNCTION IF EXISTS public.generate_consolidation_report();
DROP FUNCTION IF EXISTS public.execute_sql(query text);
DROP FUNCTION IF EXISTS public.evaluate_test_run(p_run_id uuid);
DROP FUNCTION IF EXISTS public.evaluate_lab_v2_run(p_run_id uuid);
DROP FUNCTION IF EXISTS public.enforce_role_protection();
DROP FUNCTION IF EXISTS public.enforce_report_lock();
DROP FUNCTION IF EXISTS public.delete_user_by_admin(target_user_id uuid);
DROP FUNCTION IF EXISTS public.deactivate_expired_temp_roles();
DROP FUNCTION IF EXISTS public.deactivate_expired_shares();
DROP FUNCTION IF EXISTS public.create_recipe_version();
DROP FUNCTION IF EXISTS public.create_notification_from_template(p_template_code text, p_user_id text, p_entity_type text, p_entity_id uuid, p_variables jsonb, p_sender_id uuid, p_sender_name text);
DROP FUNCTION IF EXISTS public.create_lab_v2_test_snapshot(p_test_id uuid);
DROP FUNCTION IF EXISTS public.create_document_version(p_document_id uuid, p_file_path text, p_file_name text, p_content text, p_changes_summary text, p_change_reason text);
DROP FUNCTION IF EXISTS public.count_table_records(p_table_name text);
DROP FUNCTION IF EXISTS public.clear_and_resync_user_roles(p_user_id uuid);
DROP FUNCTION IF EXISTS public.clean_expired_recycle_bin();
DROP FUNCTION IF EXISTS public.check_user_role_sync(p_user_id uuid);
DROP FUNCTION IF EXISTS public.check_user_permission(user_uuid uuid, p_module_code text, p_permission_code text);
DROP FUNCTION IF EXISTS public.check_user_permission(p_permission text, p_user_id uuid);
DROP FUNCTION IF EXISTS public.check_tasks_permission_or_raise(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_tasks_permission(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_task_permission(p_user_id uuid, p_action text, p_stage_code text);
DROP FUNCTION IF EXISTS public.check_settings_permission_or_raise(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_settings_permission(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_role_conflict();
DROP FUNCTION IF EXISTS public.check_permission_hierarchy(p_permission text, p_user_id uuid);
DROP FUNCTION IF EXISTS public.check_ncr_permission_or_raise(p_user_id uuid, p_action text, p_stage_code text);
DROP FUNCTION IF EXISTS public.check_ncr_permission(p_user_id uuid, p_action text, p_stage_code text);
DROP FUNCTION IF EXISTS public.check_matrix_permission_or_raise(p_user_id uuid, p_module_code text, p_action text, p_stage_code text, p_entity_department_id uuid);
DROP FUNCTION IF EXISTS public.check_matrix_permission(p_user_id uuid, p_module_code text, p_action text, p_stage_code text, p_entity_department_id uuid);
DROP FUNCTION IF EXISTS public.check_matrix_admin_permission(p_user_id uuid);
DROP FUNCTION IF EXISTS public.check_master_data_permission_or_raise(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_master_data_permission(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_lab_permission_or_raise(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_lab_permission(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_forms_permission_or_raise(p_user_id uuid, p_action text, p_entity_department_id uuid);
DROP FUNCTION IF EXISTS public.check_forms_permission(p_user_id uuid, p_action text, p_entity_department_id uuid);
DROP FUNCTION IF EXISTS public.check_food_safety_permission_or_raise(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_food_safety_permission(p_user_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.check_department_module_access(p_department_id uuid, p_module_code text, p_permission text);
DROP FUNCTION IF EXISTS public.check_department_hierarchy_depth();
DROP FUNCTION IF EXISTS public.check_data_consistency(p_source_table text, p_target_table text, p_id_column text);
DROP FUNCTION IF EXISTS public.chat_touch_conversation_on_message();
DROP FUNCTION IF EXISTS public.chat_set_updated_at();
DROP FUNCTION IF EXISTS public.chat_is_conversation_manager(p_conversation_id uuid, p_user_id uuid);
DROP FUNCTION IF EXISTS public.chat_emit_message_notifications();
DROP FUNCTION IF EXISTS public.chat_emit_mention_notification();
DROP FUNCTION IF EXISTS public.chat_conversation_uuid_from_storage_path(p_name text);
DROP FUNCTION IF EXISTS public.chat_can_send_message(p_conversation_id uuid, p_user_id uuid);
DROP FUNCTION IF EXISTS public.chat_can_access_conversation(p_conversation_id uuid, p_user_id uuid);
DROP FUNCTION IF EXISTS public.cascade_revoke_permission(p_role_id uuid, p_permission text);
DROP FUNCTION IF EXISTS public.can_view_department_data(p_user_id uuid, p_module_code text);
DROP FUNCTION IF EXISTS public.can_user_perform_action(p_user_id uuid, p_module_code text, p_action text, p_stage_code text);
DROP FUNCTION IF EXISTS public.can_user_access_content(user_id_param uuid, content_type_param text, content_id_param uuid);
DROP FUNCTION IF EXISTS public.can_perform_ncr_action(p_user_id uuid, p_ncr_id uuid, p_action text);
DROP FUNCTION IF EXISTS public.can_access_module(p_user_id uuid, p_module_code text, p_action text);
DROP FUNCTION IF EXISTS public.calculate_audit_checksum(p_action text, p_entity_type text, p_entity_id text, p_user_id uuid, p_timestamp timestamp with time zone, p_old_values jsonb, p_new_values jsonb, p_previous_checksum text);
DROP FUNCTION IF EXISTS public.auto_generate_review_checksum();
DROP FUNCTION IF EXISTS public.audit_trigger_function();
DROP FUNCTION IF EXISTS public.audit_role_permissions_change();
DROP FUNCTION IF EXISTS public.audit_pallet_changes();
DROP FUNCTION IF EXISTS public.archive_old_audit_records(p_older_than interval);
DROP FUNCTION IF EXISTS public.admin_delete_report(p_report_id uuid);
DROP TYPE IF EXISTS public.user_effective_permission;
DROP SCHEMA IF EXISTS public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: user_effective_permission; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_effective_permission AS (
	module_code text,
	stage_code text,
	granted_actions text[],
	data_isolation_mode text,
	visibility_departments uuid[],
	source_department_id uuid,
	source_department_name text,
	has_cross_dept_visibility boolean
);


--
-- Name: admin_delete_report(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_report(p_report_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_user_id uuid;
v_has_permission boolean;
BEGIN v_user_id := auth.uid();
IF v_user_id IS NULL THEN RAISE EXCEPTION 'PERMISSION_DENIED: User is not authenticated';
END IF;
-- Check if user is admin/manager OR owner
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_user_id
            AND r.code IN (
                'admin',
                'super_admin',
                'manager',
                'quality_manager'
            )
    ) INTO v_has_permission;
IF NOT v_has_permission THEN IF NOT EXISTS (
    SELECT 1
    FROM public.form_instances
    WHERE id = p_report_id
        AND created_by::uuid = v_user_id
) THEN RAISE EXCEPTION 'PERMISSION_DENIED: You do not have permission to delete this report.';
END IF;
END IF;
-- Perform Delete
DELETE FROM public.form_instances
WHERE id = p_report_id;
END;
$$;


--
-- Name: archive_old_audit_records(interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_old_audit_records(p_older_than interval DEFAULT '5 years'::interval) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_count INTEGER;
BEGIN -- Create archive table if not exists
CREATE TABLE IF NOT EXISTS audit_trail_archive (LIKE audit_trail INCLUDING ALL);
-- Move old records to archive
WITH moved AS (
    DELETE FROM audit_trail
    WHERE timestamp < NOW() - p_older_than
    RETURNING *
)
INSERT INTO audit_trail_archive
SELECT *
FROM moved;
GET DIAGNOSTICS v_count = ROW_COUNT;
RETURN v_count;
END;
$$;


--
-- Name: audit_pallet_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_pallet_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN
INSERT INTO pallet_audit_log (
        entity_type,
        entity_id,
        action,
        old_data,
        new_data,
        performed_by
    )
VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        auth.uid()
    );
RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: audit_role_permissions_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_role_permissions_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_user_id UUID;
v_user_email TEXT;
v_user_roles TEXT [];
v_role_name TEXT;
BEGIN -- Get current user info
SELECT * INTO v_user_id,
    v_user_email,
    v_user_roles
FROM get_audit_user_info();
-- Get role name
IF TG_OP = 'DELETE' THEN
SELECT name INTO v_role_name
FROM roles
WHERE id = OLD.role_id;
ELSE
SELECT name INTO v_role_name
FROM roles
WHERE id = NEW.role_id;
END IF;
-- Insert audit record
INSERT INTO permission_audit_log (
        changed_by,
        changed_by_email,
        changed_by_roles,
        target_role_id,
        target_role_name,
        permission_code,
        action,
        previous_state,
        new_state
    )
VALUES (
        v_user_id,
        v_user_email,
        v_user_roles,
        COALESCE(NEW.role_id, OLD.role_id),
        v_role_name,
        COALESCE(NEW.permission_code, OLD.permission_code),
        CASE
            WHEN TG_OP = 'INSERT' THEN 'grant'
            WHEN TG_OP = 'DELETE' THEN 'revoke'
            ELSE 'bulk_grant'
        END,
        CASE
            WHEN TG_OP = 'DELETE' THEN TRUE
            ELSE NULL
        END,
        CASE
            WHEN TG_OP = 'INSERT' THEN TRUE
            ELSE NULL
        END
    );
RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_old_data jsonb;
v_new_data jsonb;
v_entity_name text;
v_entity_id text;
BEGIN -- convert to jsonb for safe field access
IF (TG_OP = 'DELETE') THEN v_old_data := to_jsonb(OLD);
v_new_data := null;
v_entity_id := v_old_data->>'id';
IF v_old_data ? 'name' THEN v_entity_name := v_old_data->>'name';
ELSIF v_old_data ? 'name_ar' THEN v_entity_name := v_old_data->>'name_ar';
ELSIF v_old_data ? 'title' THEN v_entity_name := v_old_data->>'title';
ELSE v_entity_name := v_entity_id;
END IF;
ELSIF (TG_OP = 'INSERT') THEN v_old_data := null;
v_new_data := to_jsonb(NEW);
v_entity_id := v_new_data->>'id';
IF v_new_data ? 'name' THEN v_entity_name := v_new_data->>'name';
ELSIF v_new_data ? 'name_ar' THEN v_entity_name := v_new_data->>'name_ar';
ELSIF v_new_data ? 'title' THEN v_entity_name := v_new_data->>'title';
ELSE v_entity_name := v_entity_id;
END IF;
ELSE -- UPDATE
v_old_data := to_jsonb(OLD);
v_new_data := to_jsonb(NEW);
v_entity_id := v_new_data->>'id';
IF v_new_data ? 'name' THEN v_entity_name := v_new_data->>'name';
ELSIF v_new_data ? 'name_ar' THEN v_entity_name := v_new_data->>'name_ar';
ELSIF v_new_data ? 'title' THEN v_entity_name := v_new_data->>'title';
ELSE v_entity_name := v_entity_id;
END IF;
END IF;
INSERT INTO public.audit_logs (
        table_name,
        record_id,
        operation,
        old_data,
        new_data,
        performed_by,
        entity_name
    )
VALUES (
        TG_TABLE_NAME,
        v_entity_id::uuid,
        TG_OP,
        v_old_data,
        v_new_data,
        auth.uid(),
        v_entity_name
    );
RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: auto_generate_review_checksum(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_generate_review_checksum() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_prev_checksum text;
BEGIN -- Get the previous checksum for this report
SELECT checksum INTO v_prev_checksum
FROM public.report_review_history
WHERE report_id = NEW.report_id
ORDER BY performed_at DESC,
    created_at DESC
LIMIT 1;
IF NEW.checksum IS NULL
OR NEW.checksum = '' THEN NEW.checksum := generate_review_history_checksum(
    NEW.report_id,
    NEW.action,
    NEW.performed_by,
    NEW.performed_at
);
END IF;
NEW.previous_checksum := v_prev_checksum;
RETURN NEW;
END;
$$;


--
-- Name: calculate_audit_checksum(text, text, text, uuid, timestamp with time zone, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_audit_checksum(p_action text, p_entity_type text, p_entity_id text, p_user_id uuid, p_timestamp timestamp with time zone, p_old_values jsonb, p_new_values jsonb, p_previous_checksum text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
DECLARE content TEXT;
BEGIN content := COALESCE(p_action, '') || '|' || COALESCE(p_entity_type, '') || '|' || COALESCE(p_entity_id, '') || '|' || COALESCE(p_user_id::TEXT, '') || '|' || COALESCE(p_timestamp::TEXT, '') || '|' || COALESCE(p_old_values::TEXT, '') || '|' || COALESCE(p_new_values::TEXT, '') || '|' || COALESCE(p_previous_checksum, 'GENESIS');
RETURN encode(sha256(content::bytea), 'hex');
END;
$$;


--
-- Name: can_access_module(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_module(p_user_id uuid, p_module_code text, p_action text DEFAULT 'view'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_has_access BOOLEAN := false;
BEGIN -- Check via department access
SELECT EXISTS (
        SELECT 1
        FROM public.user_departments ud
            JOIN public.department_module_access dma ON dma.department_id = ud.department_id
        WHERE ud.user_id = p_user_id
            AND ud.is_active = true
            AND dma.module_code = p_module_code
            AND dma.is_enabled = true
            AND p_action = ANY(dma.granted_actions)
    ) INTO v_has_access;
IF v_has_access THEN RETURN true;
END IF;
-- Check via role permissions
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
            JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = p_module_code
            AND p_action = ANY(rmp.granted_actions)
    ) INTO v_has_access;
RETURN v_has_access;
END;
$$;


--
-- Name: can_perform_ncr_action(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_perform_ncr_action(p_user_id uuid, p_ncr_id uuid, p_action text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_stage_code TEXT;
v_has_permission BOOLEAN := false;
BEGIN -- Get current NCR stage
SELECT status INTO v_stage_code
FROM ncr_records
WHERE id = p_ncr_id;
IF v_stage_code IS NULL THEN RETURN false;
END IF;
-- Check via department
SELECT EXISTS (
        SELECT 1
        FROM user_departments ud
            JOIN ncr_stage_permissions nsp ON nsp.department_id = ud.department_id
        WHERE ud.user_id = p_user_id
            AND ud.is_active = true
            AND nsp.stage_code = v_stage_code
            AND nsp.is_active = true
            AND p_action = ANY(nsp.allowed_actions)
    ) INTO v_has_permission;
IF v_has_permission THEN RETURN true;
END IF;
-- Check via role
SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
            JOIN ncr_stage_permissions nsp ON nsp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
            AND nsp.stage_code = v_stage_code
            AND nsp.is_active = true
            AND p_action = ANY(nsp.allowed_actions)
    ) INTO v_has_permission;
RETURN v_has_permission;
END;
$$;


--
-- Name: can_user_access_content(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_user_access_content(user_id_param uuid, content_type_param text, content_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE content_dept_id uuid;
user_dept_id uuid;
BEGIN -- Get user's department
SELECT department_id INTO user_dept_id
FROM public.users
WHERE id = user_id_param;
CASE
    content_type_param
    WHEN 'form_template' THEN
    SELECT department_id INTO content_dept_id
    FROM public.form_templates
    WHERE id = content_id_param;
WHEN 'form_instance' THEN
SELECT department_id INTO content_dept_id
FROM public.form_instances
WHERE id = content_id_param;
WHEN 'folder' THEN
SELECT department_id INTO content_dept_id
FROM public.unified_folders
WHERE id = content_id_param;
ELSE RETURN false;
END CASE
;
RETURN (
    -- Same department
    content_dept_id = user_dept_id
    OR -- Shared with user
    EXISTS (
        SELECT 1
        FROM public.content_shares cs
        WHERE cs.content_type = content_type_param
            AND cs.content_id = content_id_param
            AND cs.is_active = true
            AND (
                cs.expires_at IS NULL
                OR cs.expires_at > now()
            )
            AND (
                user_id_param = ANY(cs.shared_with_users)
                OR user_dept_id = ANY(cs.shared_with_departments)
                OR EXISTS (
                    SELECT 1
                    FROM public.user_roles ur
                    WHERE ur.user_id = user_id_param
                        AND ur.role_id = ANY(cs.shared_with_roles)
                )
            )
    )
);
END;
$$;


--
-- Name: can_user_perform_action(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_user_perform_action(p_user_id uuid, p_module_code text, p_action text, p_stage_code text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_has_permission BOOLEAN := false;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM get_user_effective_permissions(p_user_id) ep
        WHERE ep.module_code = p_module_code
            AND (
                p_stage_code IS NULL
                OR ep.stage_code IS NULL
                OR ep.stage_code = p_stage_code
            )
            AND p_action = ANY(ep.granted_actions)
    ) INTO v_has_permission;
RETURN v_has_permission;
END;
$$;


--
-- Name: FUNCTION can_user_perform_action(p_user_id uuid, p_module_code text, p_action text, p_stage_code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.can_user_perform_action(p_user_id uuid, p_module_code text, p_action text, p_stage_code text) IS 'Quick check if user can perform specific action on module/stage.';


--
-- Name: can_view_department_data(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_department_data(p_user_id uuid, p_module_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.role_module_permissions rmp
            JOIN public.user_roles ur ON ur.role_id = rmp.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = p_module_code
            AND (
                rmp.can_see_all_departments = true
                OR 'view' = ANY(rmp.granted_actions)
            )
    );
END;
$$;


--
-- Name: cascade_revoke_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cascade_revoke_permission(p_role_id uuid, p_permission text) RETURNS TABLE(revoked_permission text, was_granted boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_dependents TEXT [];
v_all_to_revoke TEXT [];
v_perm TEXT;
v_was_granted BOOLEAN;
BEGIN -- Get all dependent permissions
v_dependents := get_dependent_permissions(p_permission);
v_all_to_revoke := ARRAY [p_permission] || v_dependents;
-- Process each permission
FOREACH v_perm IN ARRAY v_all_to_revoke LOOP -- Check if it was granted
SELECT EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role_id = p_role_id
            AND permission_code = v_perm
    ) INTO v_was_granted;
-- Delete if exists
DELETE FROM role_permissions
WHERE role_id = p_role_id
    AND permission_code = v_perm;
revoked_permission := v_perm;
was_granted := v_was_granted;
RETURN NEXT;
END LOOP;
RETURN;
END;
$$;


--
-- Name: chat_can_access_conversation(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chat_can_access_conversation(p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    JOIN public.users u
      ON u.id = p_user_id
     AND u.is_active = true
     AND u.company_id = c.company_id
    WHERE c.id = p_conversation_id
      AND (
        public.is_admin_user(p_user_id)
        OR c.created_by = p_user_id
        OR EXISTS (
            SELECT 1
            FROM public.chat_conversation_members m
            WHERE m.conversation_id = c.id
              AND m.user_id = p_user_id
              AND m.left_at IS NULL
        )
        OR (
            c.conversation_type = 'department'
            AND c.department_id IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.user_departments ud
                WHERE ud.user_id = p_user_id
                  AND ud.department_id = c.department_id
                  AND ud.is_active = true
            )
        )
      )
);
$$;


--
-- Name: chat_can_send_message(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chat_can_send_message(p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT
    public.chat_can_access_conversation(p_conversation_id, p_user_id)
    AND public.check_matrix_permission(p_user_id, 'chat', 'send_message', NULL, NULL)
    AND EXISTS (
        SELECT 1
        FROM public.chat_conversations c
        WHERE c.id = p_conversation_id
          AND (
              c.conversation_type = 'department'
              OR EXISTS (
                  SELECT 1
                  FROM public.chat_conversation_members m
                  WHERE m.conversation_id = c.id
                    AND m.user_id = p_user_id
                    AND m.left_at IS NULL
                    AND m.can_send_messages = true
              )
          )
    );
$$;


--
-- Name: chat_conversation_uuid_from_storage_path(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chat_conversation_uuid_from_storage_path(p_name text) RETURNS uuid
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
    v_conversation text;
BEGIN
    v_conversation := split_part(COALESCE(p_name, ''), '/', 4);
    IF v_conversation = '' THEN
        RETURN NULL;
    END IF;

    IF v_conversation ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN v_conversation::uuid;
    END IF;

    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$_$;


--
-- Name: chat_emit_mention_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chat_emit_mention_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_sender_name text;
    v_preview text;
    v_conversation_id uuid;
BEGIN
    SELECT
        m.conversation_id,
        COALESCE(NULLIF(TRIM(m.body), ''), 'Mentioned you in a chat'),
        COALESCE(NULLIF(TRIM(u.name), ''), u.email, 'User')
    INTO v_conversation_id, v_preview, v_sender_name
    FROM public.chat_messages m
    JOIN public.users u
      ON u.id = m.sender_id
    WHERE m.id = NEW.message_id;

    IF v_conversation_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF char_length(v_preview) > 120 THEN
        v_preview := LEFT(v_preview, 117) || '...';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        title_ar,
        message,
        message_ar,
        category,
        entity_type,
        entity_id,
        action_url,
        sender_id,
        sender_name,
        created_at
    )
    SELECT
        NEW.mentioned_user_id,
        'chat_mention',
        format('%s mentioned you', COALESCE(v_sender_name, 'User')),
        format('%s قام بعمل منشن لك', COALESCE(v_sender_name, 'مستخدم')),
        v_preview,
        v_preview,
        'system',
        'chat_conversation',
        v_conversation_id,
        '/chat?conversation=' || v_conversation_id::text,
        m.sender_id,
        v_sender_name,
        NOW()
    FROM public.chat_messages m
    WHERE m.id = NEW.message_id
      AND NEW.mentioned_user_id <> m.sender_id;

    RETURN NEW;
END;
$$;


--
-- Name: chat_emit_message_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chat_emit_message_notifications() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_sender_name text;
    v_message_preview text;
BEGIN
    -- Skip system/internal messages.
    IF NEW.message_type = 'system' THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(TRIM(u.name), ''), u.email, 'User')
    INTO v_sender_name
    FROM public.users u
    WHERE u.id = NEW.sender_id;

    v_message_preview := NULLIF(TRIM(COALESCE(NEW.body, '')), '');
    IF v_message_preview IS NULL THEN
        v_message_preview := 'Shared an attachment';
    END IF;

    IF char_length(v_message_preview) > 120 THEN
        v_message_preview := LEFT(v_message_preview, 117) || '...';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        title_ar,
        message,
        message_ar,
        category,
        entity_type,
        entity_id,
        action_url,
        sender_id,
        sender_name,
        created_at
    )
    SELECT
        m.user_id,
        'chat_message',
        format('New message from %s', COALESCE(v_sender_name, 'User')),
        format('رسالة جديدة من %s', COALESCE(v_sender_name, 'مستخدم')),
        v_message_preview,
        v_message_preview,
        'system',
        'chat_conversation',
        NEW.conversation_id,
        '/chat?conversation=' || NEW.conversation_id::text,
        NEW.sender_id,
        v_sender_name,
        NOW()
    FROM public.chat_conversation_members m
    WHERE m.conversation_id = NEW.conversation_id
      AND m.left_at IS NULL
      AND m.user_id <> NEW.sender_id;

    RETURN NEW;
END;
$$;


--
-- Name: chat_is_conversation_manager(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chat_is_conversation_manager(p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = p_conversation_id
      AND (
        public.is_admin_user(p_user_id)
        OR c.created_by = p_user_id
        OR EXISTS (
            SELECT 1
            FROM public.chat_conversation_members m
            WHERE m.conversation_id = c.id
              AND m.user_id = p_user_id
              AND m.left_at IS NULL
              AND m.role IN ('owner', 'admin')
        )
      )
);
$$;


--
-- Name: chat_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chat_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: chat_touch_conversation_on_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.chat_touch_conversation_on_message() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public.chat_conversations
    SET
        last_message_at = COALESCE(NEW.created_at, NOW()),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;


--
-- Name: check_data_consistency(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_data_consistency(p_source_table text, p_target_table text, p_id_column text DEFAULT 'id'::text) RETURNS TABLE(check_type text, source_count bigint, target_count bigint, difference bigint)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_source_count BIGINT;
v_target_count BIGINT;
v_common_count BIGINT;
BEGIN EXECUTE format('SELECT COUNT(*) FROM %I', p_source_table) INTO v_source_count;
EXECUTE format('SELECT COUNT(*) FROM %I', p_target_table) INTO v_target_count;
EXECUTE format(
    'SELECT COUNT(*) FROM %I s INNER JOIN %I t ON s.%I = t.%I',
    p_source_table,
    p_target_table,
    p_id_column,
    p_id_column
) INTO v_common_count;
check_type := 'source_records';
source_count := v_source_count;
target_count := v_target_count;
difference := v_source_count - v_common_count;
RETURN NEXT;
check_type := 'target_records';
difference := v_target_count - v_common_count;
RETURN NEXT;
check_type := 'common_records';
difference := v_common_count;
RETURN NEXT;
END;
$$;


--
-- Name: check_department_hierarchy_depth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_department_hierarchy_depth() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    parent_depth integer;
BEGIN
    -- Root departments are always allowed.
    IF NEW.parent_department_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Prevent depth > 2 (no child of child).
    SELECT COUNT(*)
    INTO parent_depth
    FROM public.departments
    WHERE id = NEW.parent_department_id
      AND parent_department_id IS NOT NULL;

    IF parent_depth > 0 THEN
        RAISE EXCEPTION 'Department hierarchy limited to 2 levels. Cannot create sub-department of a sub-department.';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: check_department_module_access(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_department_module_access(p_department_id uuid, p_module_code text, p_permission text DEFAULT 'view'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_has_access BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM department_modules dm
        WHERE dm.department_id = p_department_id
            AND dm.module_code = p_module_code
            AND (
                dm.is_active = true
                OR dm.is_enabled = true
            )
            AND p_permission = ANY(dm.granted_permissions)
    ) INTO v_has_access;
RETURN COALESCE(v_has_access, false);
END;
$$;


--
-- Name: check_food_safety_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_food_safety_permission(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT check_matrix_permission(p_user_id, 'food_safety', p_action, NULL, NULL);
$$;


--
-- Name: check_food_safety_permission_or_raise(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_food_safety_permission_or_raise(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'food_safety', p_action, NULL, NULL);
END;
$$;


--
-- Name: check_forms_permission(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_forms_permission(p_user_id uuid, p_action text, p_entity_department_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT check_matrix_permission(
        p_user_id,
        'forms_reports',
        p_action,
        NULL,
        p_entity_department_id
    );
$$;


--
-- Name: check_forms_permission_or_raise(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_forms_permission_or_raise(p_user_id uuid, p_action text, p_entity_department_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN RETURN check_matrix_permission_or_raise(
        p_user_id,
        'forms_reports',
        p_action,
        NULL,
        p_entity_department_id
    );
END;
$$;


--
-- Name: check_lab_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_lab_permission(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT check_matrix_permission(p_user_id, 'lab', p_action, NULL, NULL);
$$;


--
-- Name: check_lab_permission_or_raise(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_lab_permission_or_raise(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'lab', p_action, NULL, NULL);
END;
$$;


--
-- Name: check_master_data_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_master_data_permission(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_has_perm boolean;
BEGIN -- 1. Try standard matrix check
v_has_perm := public.check_matrix_permission(p_user_id, 'master_data', p_action, NULL, NULL);
IF v_has_perm THEN RETURN TRUE;
END IF;
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
            JOIN public.role_module_permissions rmp ON ur.role_id = rmp.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = 'master_data'
            AND p_action = ANY(rmp.granted_actions)
    ) INTO v_has_perm;
IF v_has_perm THEN RETURN TRUE;
END IF;
-- Hardcoded fallback (Legacy)
IF p_user_id = '6037e815-912d-44ad-85f8-75dacfc4c078'::uuid THEN RETURN TRUE;
END IF;
RETURN FALSE;
END;
$$;


--
-- Name: check_master_data_permission_or_raise(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_master_data_permission_or_raise(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'master_data', p_action, NULL, NULL);
END;
$$;


--
-- Name: check_matrix_admin_permission(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_matrix_admin_permission(p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT check_matrix_permission(
        COALESCE(p_user_id, auth.uid()),
        'settings',
        'manage_permissions'
    );
$$;


--
-- Name: FUNCTION check_matrix_admin_permission(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_matrix_admin_permission(p_user_id uuid) IS 'Matrix-based admin check. Admin capability is defined by having settings.manage_permissions.
This replaces hardcoded role code checks.';


--
-- Name: check_matrix_permission(uuid, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_matrix_permission(p_user_id uuid, p_module_code text, p_action text, p_stage_code text DEFAULT NULL::text, p_entity_department_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_user_dept_ids UUID [];
v_has_permission BOOLEAN := FALSE;
BEGIN -- Fail-safe: no user = no access
IF p_user_id IS NULL THEN RETURN FALSE;
END IF;
SELECT ARRAY_AGG(department_id) INTO v_user_dept_ids
FROM user_departments
WHERE user_id = p_user_id
    AND is_active = TRUE;
SELECT EXISTS(
        SELECT 1
        FROM department_module_access dma
        WHERE dma.department_id = ANY(v_user_dept_ids)
            AND dma.module_code = p_module_code
            AND dma.is_enabled = TRUE
            AND p_action = ANY(dma.granted_actions)
            AND (
                p_stage_code IS NULL
                OR dma.stage_code IS NULL
                OR dma.stage_code = p_stage_code
            )
            AND (
                p_entity_department_id IS NULL
                OR p_entity_department_id = ANY(v_user_dept_ids)
                OR p_entity_department_id = ANY(dma.visibility_departments)
            )
    ) INTO v_has_permission;
IF v_has_permission THEN -- Step 3: Apply role restrictions (can DENY actions)
SELECT NOT EXISTS(
        SELECT 1
        FROM user_roles ur
            JOIN role_action_restrictions rar ON rar.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
            AND rar.module_code = p_module_code
            AND (
                rar.stage_code IS NULL
                OR rar.stage_code = p_stage_code
            )
            AND p_action = ANY(rar.denied_actions)
    ) INTO v_has_permission;
END IF;
IF NOT v_has_permission THEN
SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
            JOIN role_module_permissions rmp ON rmp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = p_module_code
            AND p_action = ANY(rmp.granted_actions)
    ) INTO v_has_permission;
END IF;
RETURN v_has_permission;
EXCEPTION
WHEN OTHERS THEN RAISE LOG 'check_matrix_permission failed: user=%, module=%, action=%, error=%',
p_user_id,
p_module_code,
p_action,
SQLERRM;
RETURN FALSE;
END;
$$;


--
-- Name: FUNCTION check_matrix_permission(p_user_id uuid, p_module_code text, p_action text, p_stage_code text, p_entity_department_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_matrix_permission(p_user_id uuid, p_module_code text, p_action text, p_stage_code text, p_entity_department_id uuid) IS 'Centralized permission check - ALL authorization must flow through this function.';


--
-- Name: check_matrix_permission_or_raise(uuid, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_matrix_permission_or_raise(p_user_id uuid, p_module_code text, p_action text, p_stage_code text DEFAULT NULL::text, p_entity_department_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_has_permission BOOLEAN;
v_user_email TEXT;
v_user_roles TEXT [];
v_user_depts TEXT [];
BEGIN -- Check permission using existing function
IF current_setting('app.bypass_permission_check', true) = 'on' THEN RETURN TRUE;
END IF;
v_has_permission := check_matrix_permission(
    p_user_id,
    p_module_code,
    p_action,
    p_stage_code,
    p_entity_department_id
);
IF NOT v_has_permission THEN -- Get user info for error message
SELECT email INTO v_user_email
FROM users
WHERE id = p_user_id;
SELECT ARRAY_AGG(r.name) INTO v_user_roles
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = p_user_id;
SELECT ARRAY_AGG(d.name) INTO v_user_depts
FROM user_departments ud
    JOIN departments d ON d.id = ud.department_id
WHERE ud.user_id = p_user_id
    AND ud.is_active = TRUE;
RAISE EXCEPTION 'PERMISSION_DENIED: Access denied for action "%" on module "%". User: %, Roles: [%], Departments: [%]. Required permission not found in Permission Matrix.',
p_action,
p_module_code,
COALESCE(v_user_email, 'unknown'),
COALESCE(array_to_string(v_user_roles, ', '), 'none'),
COALESCE(array_to_string(v_user_depts, ', '), 'none') USING ERRCODE = 'insufficient_privilege';
END IF;
RETURN TRUE;
END;
$$;


--
-- Name: FUNCTION check_matrix_permission_or_raise(p_user_id uuid, p_module_code text, p_action text, p_stage_code text, p_entity_department_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_matrix_permission_or_raise(p_user_id uuid, p_module_code text, p_action text, p_stage_code text, p_entity_department_id uuid) IS 'Permission check that raises a descriptive exception when denied, including user roles and departments for debugging.';


--
-- Name: check_ncr_permission(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_ncr_permission(p_user_id uuid, p_action text, p_stage_code text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT check_matrix_permission(p_user_id, 'ncr', p_action, p_stage_code, NULL);
$$;


--
-- Name: check_ncr_permission_or_raise(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_ncr_permission_or_raise(p_user_id uuid, p_action text, p_stage_code text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'ncr', p_action, p_stage_code, NULL);
END;
$$;


--
-- Name: check_permission_hierarchy(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_permission_hierarchy(p_permission text, p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_required TEXT [];
v_req TEXT;
BEGIN -- Define permission hierarchy (what is required for each permission)
v_required := CASE
    p_permission -- Explorer
    WHEN 'explorer.create' THEN ARRAY ['explorer.view']
    WHEN 'explorer.update' THEN ARRAY ['explorer.view']
    WHEN 'explorer.delete' THEN ARRAY ['explorer.update', 'explorer.view']
    WHEN 'explorer.move' THEN ARRAY ['explorer.update', 'explorer.view'] -- NCR
    WHEN 'ncr.create' THEN ARRAY ['ncr.view_own']
    WHEN 'ncr.assign' THEN ARRAY ['ncr.view_all']
    WHEN 'ncr.approve' THEN ARRAY ['ncr.view_all']
    WHEN 'ncr.close' THEN ARRAY ['ncr.approve', 'ncr.view_all']
    WHEN 'ncr.delete' THEN ARRAY ['ncr.view_all'] -- Lab
    WHEN 'lab.request_test' THEN ARRAY ['lab.view']
    WHEN 'lab.enter_results' THEN ARRAY ['lab.start_test', 'lab.view']
    WHEN 'lab.approve_results' THEN ARRAY ['lab.enter_results', 'lab.view'] -- Forms
    WHEN 'forms.create_template' THEN ARRAY ['forms.view_own']
    WHEN 'forms.edit_template' THEN ARRAY ['forms.create_template', 'forms.view_own']
    WHEN 'forms.delete_template' THEN ARRAY ['forms.edit_template', 'forms.view_own']
    WHEN 'forms.approve' THEN ARRAY ['forms.view_all', 'forms.view_own'] -- Tasks
    WHEN 'tasks.create' THEN ARRAY ['tasks.view_own']
    WHEN 'tasks.assign' THEN ARRAY ['tasks.view_dept', 'tasks.view_own']
    WHEN 'tasks.verify' THEN ARRAY ['tasks.view_dept', 'tasks.view_own']
    WHEN 'tasks.delete' THEN ARRAY ['tasks.verify', 'tasks.view_dept'] -- Users
    WHEN 'users.create' THEN ARRAY ['users.view']
    WHEN 'users.edit' THEN ARRAY ['users.view']
    WHEN 'users.delete' THEN ARRAY ['users.edit', 'users.view']
    WHEN 'users.assign_roles' THEN ARRAY ['users.view'] -- Default: no requirements
    ELSE ARRAY []::TEXT []
END;
-- Check all required permissions
FOREACH v_req IN ARRAY v_required LOOP IF NOT check_user_permission(v_req, p_user_id) THEN RETURN FALSE;
END IF;
END LOOP;
-- Check the actual permission
RETURN check_user_permission(p_permission, p_user_id);
END;
$$;


--
-- Name: check_role_conflict(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_role_conflict() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_conflict_role TEXT;
BEGIN -- Check if assigning this role would create a conflict
SELECT r.name INTO v_conflict_role
FROM user_roles ur
    JOIN role_conflicts rc ON (
        (
            rc.role_a_id = NEW.role_id
            AND rc.role_b_id = ur.role_id
        )
        OR (
            rc.role_b_id = NEW.role_id
            AND rc.role_a_id = ur.role_id
        )
    )
    JOIN roles r ON (
        CASE
            WHEN rc.role_a_id = NEW.role_id THEN r.id = rc.role_b_id
            ELSE r.id = rc.role_a_id
        END
    )
WHERE ur.user_id = NEW.user_id
    AND ur.role_id != NEW.role_id
LIMIT 1;
IF v_conflict_role IS NOT NULL THEN RAISE EXCEPTION 'Cannot assign role: conflicts with existing role "%". Separation of Duties violation.',
v_conflict_role;
END IF;
RETURN NEW;
END;
$$;


--
-- Name: check_settings_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_settings_permission(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT check_matrix_permission(p_user_id, 'settings', p_action, NULL, NULL);
$$;


--
-- Name: check_settings_permission_or_raise(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_settings_permission_or_raise(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'settings', p_action, NULL, NULL);
END;
$$;


--
-- Name: check_task_permission(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_task_permission(p_user_id uuid, p_action text, p_stage_code text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: check_tasks_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_tasks_permission(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT check_matrix_permission(p_user_id, 'tasks', p_action, NULL, NULL);
$$;


--
-- Name: check_tasks_permission_or_raise(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_tasks_permission_or_raise(p_user_id uuid, p_action text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'tasks', p_action, NULL, NULL);
END;
$$;


--
-- Name: check_user_permission(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_permission(p_permission text, p_user_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user uuid;
  v_permission text;
  v_module text;
  v_action text;
  v_dot_pos integer;
begin
  v_user := coalesce(p_user_id, auth.uid());
  if v_user is null then
    return false;
  end if;

  v_permission := lower(coalesce(btrim(p_permission), ''));
  if v_permission = '' then
    return false;
  end if;

  v_dot_pos := position('.' in v_permission);
  if v_dot_pos = 0 then
    return public.check_matrix_permission(v_user, 'ncr', v_permission, null, null);
  end if;

  v_module := split_part(v_permission, '.', 1);
  v_action := substring(v_permission from v_dot_pos + 1);

  if v_module in ('forms', 'reports', 'explorer') then
    v_module := 'forms_reports';
  elsif v_module = 'settings' then
    v_module := 'access_management';
  end if;

  if v_module = 'access_management' and v_action = 'manage_permissions' then
    v_action := 'edit';
  end if;

  return public.check_user_permission(v_user, v_module, v_action);
end;
$$;


--
-- Name: check_user_permission(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_permission(user_uuid uuid, p_module_code text, p_permission_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_module text;
  v_action text;
begin
  if user_uuid is null then
    return false;
  end if;

  v_module := lower(coalesce(btrim(p_module_code), ''));
  v_action := lower(coalesce(btrim(p_permission_code), ''));

  if v_module = '' or v_action = '' then
    return false;
  end if;

  if v_module in ('forms', 'reports', 'explorer') then
    v_module := 'forms_reports';
  elsif v_module = 'settings' then
    v_module := 'access_management';
  end if;

  if v_module = 'access_management' and v_action = 'manage_permissions' then
    v_action := 'edit';
  end if;

  return public.check_matrix_permission(user_uuid, v_module, v_action, null, null);
end;
$$;


--
-- Name: check_user_role_sync(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_role_sync(p_user_id uuid) RETURNS TABLE(role_code_result text, in_json_array boolean, in_user_roles_table boolean, is_synced boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN RETURN QUERY WITH json_roles AS (
        SELECT unnest(u.roles) AS json_role_code
        FROM users u
        WHERE u.id = p_user_id
    ),
    table_roles AS (
        SELECT r.code AS table_role_code
        FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
    ),
    all_roles AS (
        SELECT json_role_code AS combined_role_code
        FROM json_roles
        UNION
        SELECT table_role_code
        FROM table_roles
    )
SELECT ar.combined_role_code AS role_code_result,
    EXISTS(
        SELECT 1
        FROM json_roles jr
        WHERE jr.json_role_code = ar.combined_role_code
    ) AS in_json_array,
    EXISTS(
        SELECT 1
        FROM table_roles tr
        WHERE tr.table_role_code = ar.combined_role_code
    ) AS in_user_roles_table,
    (
        EXISTS(
            SELECT 1
            FROM json_roles jr
            WHERE jr.json_role_code = ar.combined_role_code
        )
        AND EXISTS(
            SELECT 1
            FROM table_roles tr
            WHERE tr.table_role_code = ar.combined_role_code
        )
    ) AS is_synced
FROM all_roles ar
ORDER BY ar.combined_role_code;
END;
$$;


--
-- Name: clean_expired_recycle_bin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clean_expired_recycle_bin() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN
DELETE FROM recycle_bin
WHERE expires_at < NOW();
END;
$$;


--
-- Name: clear_and_resync_user_roles(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clear_and_resync_user_roles(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_synced_count integer := 0;
BEGIN -- Clear existing user_roles entries
DELETE FROM user_roles
WHERE user_id = p_user_id;
SELECT COUNT(*)::integer INTO v_synced_count
FROM sync_user_all_roles(p_user_id)
WHERE synced = true;
RAISE NOTICE 'Synced % roles for user %',
v_synced_count,
p_user_id;
RETURN v_synced_count;
END;
$$;


--
-- Name: count_table_records(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.count_table_records(p_table_name text) RETURNS TABLE(table_name text, row_count bigint)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN RETURN QUERY EXECUTE format(
        'SELECT %L::TEXT, COUNT(*)::BIGINT FROM %I',
        p_table_name,
        p_table_name
    );
END;
$$;


--
-- Name: create_document_version(uuid, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_document_version(p_document_id uuid, p_file_path text DEFAULT NULL::text, p_file_name text DEFAULT NULL::text, p_content text DEFAULT NULL::text, p_changes_summary text DEFAULT NULL::text, p_change_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_version_id UUID;
v_new_version INTEGER;
v_company_id UUID;
BEGIN -- Get next version number
SELECT current_version + 1,
    company_id INTO v_new_version,
    v_company_id
FROM documents
WHERE id = p_document_id;
-- Create new version
INSERT INTO document_versions (
        document_id,
        company_id,
        version,
        content,
        file_path,
        file_name,
        changes_summary,
        change_reason,
        created_by,
        status
    )
VALUES (
        p_document_id,
        v_company_id,
        v_new_version,
        p_content,
        p_file_path,
        p_file_name,
        p_changes_summary,
        p_change_reason,
        auth.uid(),
        'draft'
    )
RETURNING id INTO v_version_id;
-- Update document current version
UPDATE documents
SET current_version = v_new_version,
    updated_at = NOW()
WHERE id = p_document_id;
RETURN v_version_id;
END;
$$;


--
-- Name: create_lab_v2_test_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_lab_v2_test_snapshot(p_test_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_test JSONB;
BEGIN
  SELECT to_jsonb(t) INTO v_test
  FROM public.lab_v2_tests t
  WHERE t.id = p_test_id;

  IF v_test IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'test', v_test,
    'parameters', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(p) ORDER BY p.display_order, p.created_at)
        FROM public.lab_v2_test_parameters p
        WHERE p.test_id = p_test_id
      ),
      '[]'::jsonb
    ),
    'acceptance_rules', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(r) ORDER BY r.priority, r.created_at)
        FROM public.lab_v2_test_acceptance_rules r
        WHERE r.test_id = p_test_id
      ),
      '[]'::jsonb
    ),
    'device_links', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(l) ORDER BY l.is_default DESC, l.created_at)
        FROM public.lab_v2_test_device_links l
        WHERE l.test_id = p_test_id
      ),
      '[]'::jsonb
    )
  );
END;
$$;


--
-- Name: create_notification_from_template(text, text, text, uuid, jsonb, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification_from_template(p_template_code text, p_user_id text, p_entity_type text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_variables jsonb DEFAULT '{}'::jsonb, p_sender_id uuid DEFAULT NULL::uuid, p_sender_name text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_template notification_templates %ROWTYPE;
v_title TEXT;
v_title_ar TEXT;
v_message TEXT;
v_message_ar TEXT;
v_action_url TEXT;
v_notification_id UUID;
v_key TEXT;
v_value TEXT;
BEGIN -- Get template
SELECT * INTO v_template
FROM notification_templates
WHERE code = p_template_code
    AND is_active = TRUE;
IF NOT FOUND THEN RAISE EXCEPTION 'Notification template not found: %',
p_template_code;
END IF;
-- Replace variables in templates
v_title := v_template.title_template;
v_title_ar := v_template.title_template_ar;
v_message := v_template.message_template;
v_message_ar := v_template.message_template_ar;
v_action_url := v_template.default_action_url_template;
FOR v_key,
v_value IN
SELECT *
FROM jsonb_each_text(p_variables) LOOP v_title := replace(v_title, '{' || v_key || '}', v_value);
v_title_ar := replace(
    COALESCE(v_title_ar, ''),
    '{' || v_key || '}',
    v_value
);
v_message := replace(v_message, '{' || v_key || '}', v_value);
v_message_ar := replace(
    COALESCE(v_message_ar, ''),
    '{' || v_key || '}',
    v_value
);
v_action_url := replace(
    COALESCE(v_action_url, ''),
    '{' || v_key || '}',
    v_value
);
END LOOP;
-- Replace entity_id in action URL
IF p_entity_id IS NOT NULL THEN v_action_url := replace(
    COALESCE(v_action_url, ''),
    '{entity_id}',
    p_entity_id::text
);
END IF;
-- Insert notification (user_id is TEXT in existing table)
INSERT INTO notifications (
        user_id,
        title,
        title_ar,
        message,
        message_ar,
        type,
        category,
        entity_type,
        entity_id,
        action_url,
        sender_id,
        sender_name
    )
VALUES (
        p_user_id,
        v_title,
        v_title_ar,
        v_message,
        v_message_ar,
        v_template.type,
        v_template.category,
        p_entity_type,
        p_entity_id,
        v_action_url,
        p_sender_id,
        p_sender_name
    )
RETURNING id INTO v_notification_id;
RETURN v_notification_id;
END;
$$;


--
-- Name: create_recipe_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_recipe_version() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE new_version DECIMAL(4, 1);
last_version_id UUID;
change_summary_text TEXT;
change_details_json JSONB;
user_name TEXT;
BEGIN -- الحصول على اسم المستخدم
SELECT COALESCE(raw_user_meta_data->>'full_name', email) INTO user_name
FROM auth.users
WHERE id = auth.uid();
-- حساب رقم الإصدار الجديد
SELECT COALESCE(MAX(version_number), 0) + 0.1 INTO new_version
FROM recipe_versions
WHERE recipe_id = NEW.id;
IF new_version < 1 THEN new_version := 1.0;
END IF;
-- إغلاق الإصدار السابق
UPDATE recipe_versions
SET effective_until = NOW()
WHERE recipe_id = NEW.id
    AND effective_until IS NULL;
-- تحديد نوع التغيير والملخص
IF TG_OP = 'INSERT' THEN change_summary_text := 'تم إنشاء الوصفة';
change_details_json := jsonb_build_object('action', 'created');
ELSE -- مقارنة التغييرات
change_details_json := jsonb_build_object();
IF OLD.name IS DISTINCT
FROM NEW.name THEN change_details_json := change_details_json || jsonb_build_object(
        'name',
        jsonb_build_object('old', OLD.name, 'new', NEW.name)
    );
END IF;
IF OLD.ingredients::text IS DISTINCT
FROM NEW.ingredients::text THEN change_details_json := change_details_json || jsonb_build_object('ingredients', 'تم تحديث المكونات');
END IF;
IF OLD.mixing_steps::text IS DISTINCT
FROM NEW.mixing_steps::text THEN change_details_json := change_details_json || jsonb_build_object('mixing_steps', 'تم تحديث خطوات الخلط');
END IF;
change_summary_text := 'تم تحديث الوصفة';
END IF;
-- إنشاء الإصدار الجديد
INSERT INTO recipe_versions (
        recipe_id,
        version_number,
        name,
        name_en,
        ingredients,
        mixing_steps,
        notes,
        change_type,
        change_summary,
        change_details,
        effective_from,
        created_by,
        created_by_name
    )
VALUES (
        NEW.id,
        new_version,
        NEW.name,
        NEW.name_en,
        NEW.ingredients,
        NEW.mixing_steps,
        NEW.notes,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'created'
            ELSE 'updated'
        END,
        change_summary_text,
        change_details_json,
        NOW(),
        auth.uid(),
        user_name
    )
RETURNING id INTO last_version_id;
-- تحديث الوصفة بمعرف الإصدار الحالي
NEW.current_version_id := last_version_id;
NEW.version_count := (
    SELECT COUNT(*)
    FROM recipe_versions
    WHERE recipe_id = NEW.id
);
NEW.last_versioned_at := NOW();
NEW.version := new_version;
-- تسجيل في سجل التغييرات
INSERT INTO recipe_change_log (
        recipe_id,
        version_id,
        action,
        changed_by,
        changed_by_name,
        reason
    )
VALUES (
        NEW.id,
        last_version_id,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'create'
            ELSE 'update'
        END,
        auth.uid(),
        user_name,
        change_summary_text
    );
RETURN NEW;
END;
$$;


--
-- Name: deactivate_expired_shares(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deactivate_expired_shares() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN
UPDATE public.content_shares
SET is_active = false,
    updated_at = now()
WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;


--
-- Name: deactivate_expired_temp_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deactivate_expired_temp_roles() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN
UPDATE user_temp_roles
SET is_active = false,
    updated_at = NOW()
WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;


--
-- Name: delete_user_by_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_by_admin(target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$ BEGIN
DELETE FROM auth.users
WHERE id = target_user_id;
IF NOT FOUND THEN
DELETE FROM public.users
WHERE id = target_user_id;
END IF;
END;
$$;


--
-- Name: enforce_report_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_report_lock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_user_id uuid;
v_has_review_edit_perm boolean;
v_is_reviewer boolean;
v_editable_columns text [] := ARRAY [
            'status', 'review_status', 'reviewer_id', 'reviewer_name',
            'reviewed_at', 'review_notes', 'is_locked', 'locked_at', 
            'locked_by', 'rejection_count', 'last_rejection_reason',
            'workflow_history', 'updated_at', 'version',
            -- FIX: Add folder_id to editable columns so moving/un-assigning folder doesn't trigger lock check?
            -- Or keep it to prevent moving locked reports?
            -- Assuming we want to allow folder_id change even if locked (logic debated, but fixing the error is priority)
            -- For now, let's just FIX the relation error.
            'folder_id' 
        ];
v_changed_columns text [];
BEGIN -- Get current user from auth context
v_user_id := auth.uid();
IF v_user_id IS NULL THEN RETURN NEW;
END IF;
SELECT ARRAY_AGG(key) INTO v_changed_columns
FROM jsonb_each(to_jsonb(NEW))
WHERE to_jsonb(OLD)->>key IS DISTINCT
FROM to_jsonb(NEW)->>key
    AND key != ALL(v_editable_columns);
IF v_changed_columns IS NULL
OR array_length(v_changed_columns, 1) = 0 THEN RETURN NEW;
END IF;
IF OLD.is_locked = true THEN -- Check if user is assigned reviewer
v_is_reviewer := (OLD.reviewer_id = v_user_id);
-- FIX: Added public. schema qualifiers
SELECT EXISTS (
        SELECT 1
        FROM public.role_module_permissions rmp
            JOIN public.user_roles ur ON ur.role_id = rmp.role_id
        WHERE ur.user_id = v_user_id
            AND rmp.module_code = 'forms_reports'
            AND 'review_edit' = ANY(rmp.granted_actions)
    ) INTO v_has_review_edit_perm;
IF NOT (
    v_is_reviewer
    AND v_has_review_edit_perm
) THEN RAISE EXCEPTION 'REPORT_LOCKED: Report is locked and cannot be edited. Status: %. Attempted changes: %',
OLD.status,
array_to_string(v_changed_columns, ', ');
END IF;
-- FIX: Added public. schema qualifiers for users and report_review_history
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
SELECT NEW.id,
    'edited_by_reviewer',
    OLD.status,
    NEW.status,
    v_user_id,
    u.name,
    u.email,
    jsonb_object_agg(
        col,
        jsonb_build_object(
            'old',
            to_jsonb(OLD)->col,
            'new',
            to_jsonb(NEW)->col
        )
    ),
    public.generate_review_history_checksum(NEW.id, 'edited_by_reviewer', v_user_id, now())
FROM public.users u,
    unnest(v_changed_columns) AS col
WHERE u.id = v_user_id
GROUP BY u.name,
    u.email;
END IF;
RETURN NEW;
END;
$$;


--
-- Name: enforce_role_protection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_role_protection() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_role roles;
v_user_priority INTEGER;
BEGIN
SELECT * INTO v_role
FROM roles
WHERE id = COALESCE(NEW.role_id, OLD.role_id);
-- Skip check if no auth context (migration/system operations)
IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD);
END IF;
IF v_role.is_locked THEN RAISE EXCEPTION 'Cannot modify locked role: %',
v_role.name;
END IF;
SELECT COALESCE(MIN(r.priority), 999) INTO v_user_priority
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = auth.uid();
IF v_user_priority > v_role.min_edit_priority THEN RAISE EXCEPTION 'Insufficient priority for role: %',
v_role.name;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: evaluate_lab_v2_run(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.evaluate_lab_v2_run(p_run_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total INT := 0;
  v_has_fail BOOLEAN := FALSE;
  v_failed_params TEXT[] := '{}'::text[];
  v_result TEXT := 'na';
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.lab_v2_run_values
  WHERE run_id = p_run_id;

  IF v_total = 0 THEN
    UPDATE public.lab_v2_test_runs
    SET evaluation_result = 'na',
        failed_params = NULL,
        updated_at = NOW()
    WHERE id = p_run_id;
    RETURN 'na';
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.lab_v2_run_values
    WHERE run_id = p_run_id
      AND out_of_spec = TRUE
  ) INTO v_has_fail;

  IF v_has_fail THEN
    v_result := 'fail';
    SELECT COALESCE(array_agg(DISTINCT param_key ORDER BY param_key), '{}'::text[]) INTO v_failed_params
    FROM public.lab_v2_run_values
    WHERE run_id = p_run_id
      AND out_of_spec = TRUE;
  ELSE
    v_result := 'pass';
  END IF;

  UPDATE public.lab_v2_test_runs
  SET evaluation_result = v_result,
      failed_params = CASE WHEN v_result = 'fail' THEN v_failed_params ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_run_id;

  RETURN v_result;
END;
$$;


--
-- Name: evaluate_test_run(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.evaluate_test_run(p_run_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_field RECORD;
v_field_value TEXT;
v_numeric_value DECIMAL(10, 4);
v_has_fail BOOLEAN := FALSE;
v_has_warning BOOLEAN := FALSE;
v_failed_fields TEXT [] := '{}';
BEGIN FOR v_field IN
SELECT f.*,
    r.field_values
FROM lab_test_runs r
    JOIN lab_tests_config c ON c.id = r.test_config_id
    JOIN lab_test_fields f ON f.test_config_id = c.id
WHERE r.id = p_run_id
    AND f.is_evaluable = TRUE LOOP v_field_value := v_field.field_values->>v_field.field_key;
IF v_field_value IS NULL
OR v_field_value = '' THEN CONTINUE;
END IF;
IF v_field.field_type = 'number' THEN BEGIN v_numeric_value := v_field_value::DECIMAL(10, 4);
EXCEPTION
WHEN OTHERS THEN CONTINUE;
END;
IF v_field.spec_evaluation_mode = 'range' THEN IF v_field.spec_min_value IS NOT NULL
AND v_numeric_value < v_field.spec_min_value THEN v_has_fail := TRUE;
v_failed_fields := array_append(v_failed_fields, v_field.field_key);
END IF;
IF v_field.spec_max_value IS NOT NULL
AND v_numeric_value > v_field.spec_max_value THEN v_has_fail := TRUE;
v_failed_fields := array_append(v_failed_fields, v_field.field_key);
END IF;
END IF;
IF v_field.spec_evaluation_mode = 'target_tolerance' THEN IF v_field.spec_target_value IS NOT NULL
AND v_field.spec_tolerance IS NOT NULL THEN IF ABS(v_numeric_value - v_field.spec_target_value) > v_field.spec_tolerance THEN v_has_fail := TRUE;
v_failed_fields := array_append(v_failed_fields, v_field.field_key);
END IF;
END IF;
END IF;
END IF;
END LOOP;
UPDATE lab_test_runs
SET evaluation_result = CASE
        WHEN v_has_fail THEN 'fail'
        WHEN v_has_warning THEN 'warning'
        ELSE 'pass'
    END,
    failed_fields = v_failed_fields
WHERE id = p_run_id;
RETURN CASE
    WHEN v_has_fail THEN 'fail'
    WHEN v_has_warning THEN 'warning'
    ELSE 'pass'
END;
END;
$$;


--
-- Name: execute_sql(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_sql(query text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE result json;
BEGIN -- المحاولة الأولى: افتراض أنه استعلام يُرجع بيانات (SELECT, RETURNING, etc)
-- نقوم بتغليفه للحصول على النتيجة بصيغة JSON
BEGIN EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO result;
-- إذا كانت النتيجة فارغة (لا توجد صفوف)
IF result IS NULL THEN result := '[]'::json;
END IF;
RETURN result;
EXCEPTION
WHEN OTHERS THEN -- إذا فشل التغليف (مثل أوامر CREATE, UPDATE, DELETE بدون returning)
-- نحاول تنفيذه كأمر مباشر
BEGIN EXECUTE query;
RETURN json_build_array(
    json_build_object(
        'status',
        'success',
        'message',
        'Command executed successfully'
    )
);
EXCEPTION
WHEN OTHERS THEN -- إذا فشل التنفيذ المباشر أيضاً، نرجع الخطأ الأصلي
RETURN json_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
END;
END;
$$;


--
-- Name: generate_consolidation_report(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_consolidation_report() RETURNS TABLE(table_pair text, original_count bigint, food_safety_count bigint, status text)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN RETURN QUERY
SELECT 'control_points -> food_safety_control_points'::TEXT,
    (
        SELECT COUNT(*)::BIGINT
        FROM control_points
        WHERE company_id IS NOT NULL
    ),
    (
        SELECT COUNT(*)::BIGINT
        FROM food_safety_control_points
    ),
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM control_points
            WHERE company_id IS NOT NULL
        ) = 0 THEN 'MIGRATED'
        WHEN (
            SELECT COUNT(*)
            FROM food_safety_control_points
        ) > 0 THEN 'PARTIAL'
        ELSE 'PENDING'
    END;
RETURN QUERY
SELECT 'monitoring_records -> food_safety_monitoring'::TEXT,
    (
        SELECT COUNT(*)::BIGINT
        FROM monitoring_records
        WHERE company_id IS NOT NULL
    ),
    (
        SELECT COUNT(*)::BIGINT
        FROM food_safety_monitoring
    ),
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM monitoring_records
            WHERE company_id IS NOT NULL
        ) = 0 THEN 'MIGRATED'
        WHEN (
            SELECT COUNT(*)
            FROM food_safety_monitoring
        ) > 0 THEN 'PARTIAL'
        ELSE 'PENDING'
    END;
RETURN QUERY
SELECT 'corrective_actions -> food_safety_corrective_actions'::TEXT,
    (
        SELECT COUNT(*)::BIGINT
        FROM corrective_actions
        WHERE company_id IS NOT NULL
    ),
    (
        SELECT COUNT(*)::BIGINT
        FROM food_safety_corrective_actions
    ),
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM corrective_actions
            WHERE company_id IS NOT NULL
        ) = 0 THEN 'MIGRATED'
        WHEN (
            SELECT COUNT(*)
            FROM food_safety_corrective_actions
        ) > 0 THEN 'PARTIAL'
        ELSE 'PENDING'
    END;
END;
$$;


--
-- Name: generate_lab_v2_run_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_lab_v2_run_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_company_id UUID;
  v_year TEXT;
  v_next_num INT;
  v_run_number TEXT;
BEGIN
  v_company_id := public.get_user_company_id();
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(
      MAX(
        CAST(
          SUBSTRING(run_number FROM 'L2-RUN-\\d{4}-(\\d+)') AS INT
        )
      ),
      0
    ) + 1
    INTO v_next_num
  FROM public.lab_v2_test_runs
  WHERE company_id = v_company_id
    AND run_number LIKE 'L2-RUN-' || v_year || '-%';

  v_run_number := 'L2-RUN-' || v_year || '-' || LPAD(v_next_num::TEXT, 5, '0');
  RETURN v_run_number;
END;
$$;


--
-- Name: generate_ncr_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ncr_number(p_company_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE v_settings JSONB;
v_prefix TEXT;
v_separator TEXT;
v_year TEXT;
v_sequence INTEGER;
v_digits INTEGER;
v_ncr_number TEXT;
BEGIN -- Get settings
SELECT numbering INTO v_settings
FROM ncr_settings
WHERE company_id = p_company_id;
IF v_settings IS NULL THEN v_settings := '{"prefix": "NCR", "separator": "-", "include_year": true, "sequence_digits": 4, "current_sequence": 0}'::jsonb;
END IF;
v_prefix := COALESCE(v_settings->>'prefix', 'NCR');
v_separator := COALESCE(v_settings->>'separator', '-');
v_digits := COALESCE((v_settings->>'sequence_digits')::int, 4);
v_year := EXTRACT(
    YEAR
    FROM CURRENT_DATE
)::TEXT;
-- Get next sequence
v_sequence := COALESCE((v_settings->>'current_sequence')::int, 0) + 1;
-- Update sequence
UPDATE ncr_settings
SET numbering = jsonb_set(
        numbering,
        '{current_sequence}',
        to_jsonb(v_sequence)
    )
WHERE company_id = p_company_id;
-- If no settings exist, create with updated sequence
IF NOT FOUND THEN
INSERT INTO ncr_settings (company_id, numbering)
VALUES (
        p_company_id,
        jsonb_set(
            v_settings,
            '{current_sequence}',
            to_jsonb(v_sequence)
        )
    );
END IF;
-- Build NCR number
IF (v_settings->>'include_year')::boolean THEN v_ncr_number := v_prefix || v_separator || v_year || v_separator || LPAD(v_sequence::TEXT, v_digits, '0');
ELSE v_ncr_number := v_prefix || v_separator || LPAD(v_sequence::TEXT, v_digits, '0');
END IF;
RETURN v_ncr_number;
END;
$$;


--
-- Name: generate_pallet_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_pallet_number(p_batch_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE v_batch_number TEXT;
v_next_sequence INT;
v_pallet_number TEXT;
BEGIN -- Get batch number
SELECT batch_number INTO v_batch_number
FROM pallet_batches
WHERE id = p_batch_id;
-- Get next sequence
SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_next_sequence
FROM pallets
WHERE batch_id = p_batch_id;
-- Generate pallet number (e.g., BATCH001-P001)
v_pallet_number := v_batch_number || '-P' || LPAD(v_next_sequence::TEXT, 3, '0');
RETURN v_pallet_number;
END;
$$;


--
-- Name: generate_review_history_checksum(uuid, text, uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_review_history_checksum(p_report_id uuid, p_action text, p_performed_by uuid, p_performed_at timestamp with time zone) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$ BEGIN RETURN encode(
        sha256(
            (
                p_report_id::text || p_action || COALESCE(p_performed_by::text, 'system') || p_performed_at::text
            )::bytea
        ),
        'hex'
    );
END;
$$;


--
-- Name: generate_task_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_task_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE new_number TEXT;
year_part TEXT;
seq_number INTEGER;
BEGIN year_part := TO_CHAR(NOW(), 'YYYY');
SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(
                    task_number
                    FROM 'TASK-' || year_part || '-(\d+)'
                ) AS INTEGER
            )
        ),
        0
    ) + 1 INTO seq_number
FROM tasks
WHERE task_number LIKE 'TASK-' || year_part || '-%';
new_number := 'TASK-' || year_part || '-' || LPAD(seq_number::TEXT, 4, '0');
RETURN new_number;
END;
$$;


--
-- Name: generate_test_run_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_test_run_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_company_id UUID;
v_year TEXT;
v_next_num INT;
BEGIN v_company_id := get_user_company_id();
v_year := TO_CHAR(NOW(), 'YYYY');
SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(
                    run_number
                    FROM 'RUN-\d{4}-(\d+)'
                ) AS INT
            )
        ),
        0
    ) + 1 INTO v_next_num
FROM lab_test_runs
WHERE company_id = v_company_id
    AND run_number LIKE 'RUN-' || v_year || '-%';
RETURN 'RUN-' || v_year || '-' || LPAD(v_next_num::TEXT, 5, '0');
END;
$$;


--
-- Name: get_approved_suppliers(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_approved_suppliers(p_raw_material_id uuid, p_company_id uuid) RETURNS TABLE(supplier_id uuid, supplier_name text, supplier_code text, is_primary boolean, approval_status text)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN RETURN QUERY
SELECT s.id,
    s.name,
    s.code,
    rms.is_primary,
    rms.approval_status
FROM raw_material_suppliers rms
    JOIN suppliers s ON s.id = rms.supplier_id
WHERE rms.raw_material_id = p_raw_material_id
    AND rms.company_id = p_company_id
    AND rms.active = TRUE
    AND rms.approval_status = 'approved'
    AND s.active = TRUE
    AND s.approved = TRUE
ORDER BY rms.is_primary DESC,
    s.name;
END;
$$;


--
-- Name: get_audit_user_info(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_audit_user_info() RETURNS TABLE(user_id uuid, user_email text, user_roles text[])
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_uid UUID;
v_email TEXT;
v_roles TEXT [];
BEGIN v_uid := auth.uid();
-- Get email from public.users (not auth.users to avoid cross-schema issues)
SELECT u.email INTO v_email
FROM users u
WHERE u.id = v_uid;
-- Get roles
SELECT ARRAY_AGG(r.code) INTO v_roles
FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = v_uid;
user_id := v_uid;
user_email := COALESCE(v_email, 'system');
user_roles := COALESCE(v_roles, ARRAY ['system']::TEXT []);
RETURN NEXT;
END;
$$;


--
-- Name: get_cell_history(uuid, text, text, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cell_history(p_instance_id uuid, p_section_id text, p_table_id text, p_row_index integer, p_col_index integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, old_value jsonb, new_value jsonb, changed_by uuid, changed_by_name text, changed_at timestamp with time zone, change_type text, version integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN RETURN QUERY
SELECT cch.id,
    cch.old_value,
    cch.new_value,
    cch.changed_by,
    cch.changed_by_name,
    cch.changed_at,
    cch.change_type,
    cch.version
FROM cell_change_history cch
WHERE cch.instance_id = p_instance_id
    AND cch.section_id = p_section_id
    AND cch.table_id = p_table_id
    AND cch.row_index = p_row_index
    AND cch.col_index = p_col_index
ORDER BY cch.changed_at DESC
LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: FUNCTION get_cell_history(p_instance_id uuid, p_section_id text, p_table_id text, p_row_index integer, p_col_index integer, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_cell_history(p_instance_id uuid, p_section_id text, p_table_id text, p_row_index integer, p_col_index integer, p_limit integer, p_offset integer) IS 'دالة مساعدة: الحصول على سجل تعديلات خلية معينة';


--
-- Name: get_department_path(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_department_path(dept_id uuid) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE path TEXT := '';
current_id UUID := dept_id;
dept_name TEXT;
BEGIN WHILE current_id IS NOT NULL LOOP
SELECT name,
    parent_department_id INTO dept_name,
    current_id
FROM departments
WHERE id = current_id;
IF path = '' THEN path := dept_name;
ELSE path := dept_name || ' / ' || path;
END IF;
END LOOP;
RETURN path;
END;
$$;


--
-- Name: get_dependent_permissions(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dependent_permissions(p_permission text) RETURNS text[]
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_dependents TEXT [] := ARRAY []::TEXT [];
v_hierarchy JSONB;
BEGIN -- Define the reverse hierarchy (what depends on what)
-- If permission X is revoked, all permissions that require X must also be revoked
v_hierarchy := '{
        "explorer.view": ["explorer.create", "explorer.update", "explorer.delete", "explorer.move"],
        "explorer.update": ["explorer.delete", "explorer.move"],
        
        "ncr.view_own": ["ncr.create", "ncr.root_cause", "ncr.corrective_action", "ncr.preventive_action"],
        "ncr.view_all": ["ncr.assign", "ncr.approve", "ncr.close", "ncr.reopen", "ncr.delete", "ncr.export"],
        "ncr.approve": ["ncr.close"],
        
        "lab.view": ["lab.request_test", "lab.assign_test", "lab.start_test", "lab.enter_results", "lab.approve_results", "lab.reject_results", "lab.manage_criteria", "lab.manage_equipment", "lab.view_coa"],
        "lab.start_test": ["lab.enter_results"],
        "lab.enter_results": ["lab.approve_results"],
        
        "production.view": ["production.create_order", "production.start_order", "production.complete_order", "production.cancel_order", "production.record_output", "production.record_downtime", "production.manage_lines", "production.manage_shifts", "production.approve_batch", "production.release_batch"],
        "production.start_order": ["production.complete_order"],
        "production.approve_batch": ["production.release_batch"],
        
        "warehouse.view": ["warehouse.receive", "warehouse.issue", "warehouse.transfer", "warehouse.adjust", "warehouse.hold", "warehouse.release", "warehouse.manage_locations", "warehouse.stocktake", "warehouse.approve_adjustment"],
        "warehouse.hold": ["warehouse.release"],
        "warehouse.adjust": ["warehouse.approve_adjustment"],
        
        "receiving.view": ["receiving.create", "receiving.inspect", "receiving.approve", "receiving.reject", "receiving.hold", "receiving.release"],
        "receiving.inspect": ["receiving.approve", "receiving.reject"],
        "receiving.hold": ["receiving.release"],
        
        "maintenance.view": ["maintenance.create_request", "maintenance.assign", "maintenance.start_work", "maintenance.complete_work", "maintenance.approve", "maintenance.manage_equipment", "maintenance.manage_schedule", "maintenance.manage_parts"],
        "maintenance.start_work": ["maintenance.complete_work"],
        "maintenance.complete_work": ["maintenance.approve"],
        
        "forms.view_own": ["forms.create_template", "forms.fill_form", "forms.export", "forms.approve"],
        "forms.view_all": ["forms.approve"],
        "forms.create_template": ["forms.edit_template"],
        "forms.edit_template": ["forms.delete_template"],
        
        "tasks.view_own": ["tasks.create", "tasks.complete"],
        "tasks.view_dept": ["tasks.assign", "tasks.verify"],
        "tasks.verify": ["tasks.delete"],
        
        "users.view": ["users.create", "users.edit", "users.delete", "users.assign_roles", "users.reset_password"],
        "users.edit": ["users.delete", "users.reset_password"],
        
        "settings.view": ["settings.edit_general", "settings.manage_departments", "settings.manage_permissions", "settings.manage_companies", "settings.backup", "settings.integrations"],
        
        "food_safety.view": ["food_safety.manage_haccp", "food_safety.record_monitoring", "food_safety.manage_sanitation", "food_safety.record_cleaning", "food_safety.manage_allergens", "food_safety.pre_op_check", "food_safety.corrective_action"],
        
        "training.view": ["training.create_course", "training.assign_training", "training.record_attendance", "training.approve_completion", "training.manage_matrix"],
        "training.record_attendance": ["training.approve_completion"],
        
        "calibration.view": ["calibration.view_equipment", "calibration.create_schedule", "calibration.record_calibration", "calibration.approve_calibration", "calibration.manage_standards"],
        "calibration.record_calibration": ["calibration.approve_calibration"],
        
        "master_data.view": ["master_data.manage_materials", "master_data.manage_suppliers", "master_data.approve_suppliers", "master_data.manage_products", "master_data.manage_customers"],
        "master_data.manage_suppliers": ["master_data.approve_suppliers"],
        
        "reports.view": ["reports.view_all", "reports.export", "reports.create_custom", "reports.schedule"],
        "reports.export": ["reports.create_custom"],
        
        "hr.view": ["hr.view_employees", "hr.manage_attendance", "hr.manage_leave", "hr.manage_payroll", "hr.view_documents"],
        "hr.view_employees": ["hr.create_employee", "hr.edit_employee"]
    }'::JSONB;
-- Get direct dependents
IF v_hierarchy ? p_permission THEN v_dependents := ARRAY(
    SELECT jsonb_array_elements_text(v_hierarchy->p_permission)
);
END IF;
-- Recursively get dependents of dependents
IF array_length(v_dependents, 1) > 0 THEN
DECLARE v_child TEXT;
v_child_deps TEXT [];
BEGIN FOREACH v_child IN ARRAY v_dependents LOOP v_child_deps := get_dependent_permissions(v_child);
v_dependents := v_dependents || v_child_deps;
END LOOP;
END;
END IF;
-- Remove duplicates and return
RETURN ARRAY(
    SELECT DISTINCT unnest(v_dependents)
);
END;
$$;


--
-- Name: get_recent_instance_changes(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_recent_instance_changes(p_instance_id uuid, p_limit integer DEFAULT 100) RETURNS TABLE(id uuid, section_id text, table_id text, row_index integer, col_index integer, old_value jsonb, new_value jsonb, changed_by uuid, changed_by_name text, changed_at timestamp with time zone, change_type text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN RETURN QUERY
SELECT cch.id,
    cch.section_id,
    cch.table_id,
    cch.row_index,
    cch.col_index,
    cch.old_value,
    cch.new_value,
    cch.changed_by,
    cch.changed_by_name,
    cch.changed_at,
    cch.change_type
FROM cell_change_history cch
WHERE cch.instance_id = p_instance_id
ORDER BY cch.changed_at DESC
LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION get_recent_instance_changes(p_instance_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_recent_instance_changes(p_instance_id uuid, p_limit integer) IS 'دالة مساعدة: الحصول على آخر التعديلات في النموذج';


--
-- Name: get_required_tests(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_required_tests(p_raw_material_id uuid, p_company_id uuid) RETURNS TABLE(test_id uuid, test_type text, test_name text, test_method text, parameters jsonb, required boolean)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN RETURN QUERY
SELECT rmt.id,
    rmt.test_type,
    rmt.test_name,
    rmt.test_method,
    rmt.parameters,
    rmt.required
FROM raw_material_tests rmt
WHERE rmt.raw_material_id = p_raw_material_id
    AND rmt.company_id = p_company_id
    AND rmt.active = TRUE
ORDER BY rmt.required DESC,
    rmt.test_type,
    rmt.test_name;
END;
$$;


--
-- Name: get_unread_notification_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_notification_count() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN RETURN (
        SELECT COUNT(*)::integer
        FROM notifications
        WHERE user_id = auth.uid()::text
            AND read = FALSE
    );
END;
$$;


--
-- Name: get_user_accessible_folders(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_accessible_folders(user_id_param uuid) RETURNS TABLE(folder_id uuid, folder_name text, folder_type text, department_name text, is_shared boolean, share_type text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN RETURN QUERY
SELECT uf.id as folder_id,
    uf.name as folder_name,
    uf.type as folder_type,
    d.name as department_name,
    false as is_shared,
    NULL::text as share_type
FROM public.unified_folders uf
    LEFT JOIN public.departments d ON d.id = uf.department_id
WHERE -- User's department folders
    uf.department_id IN (
        SELECT department_id
        FROM public.users
        WHERE id = user_id_param
    )
    OR -- System folders
    uf.is_system = true
    OR -- Public folders
    uf.is_public = true
UNION ALL
SELECT uf.id as folder_id,
    uf.name as folder_name,
    uf.type as folder_type,
    d.name as department_name,
    true as is_shared,
    cs.share_type
FROM public.unified_folders uf
    LEFT JOIN public.departments d ON d.id = uf.department_id
    INNER JOIN public.content_shares cs ON cs.content_id = uf.id
    AND cs.content_type = 'folder'
WHERE cs.is_active = true
    AND (
        cs.expires_at IS NULL
        OR cs.expires_at > now()
    )
    AND (
        -- Shared with user directly
        user_id_param = ANY(cs.shared_with_users)
        OR -- Shared with user's department
        (
            SELECT department_id
            FROM public.users
            WHERE id = user_id_param
        ) = ANY(cs.shared_with_departments)
        OR -- Shared with user's role
        EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = user_id_param
                AND ur.role_id = ANY(cs.shared_with_roles)
        )
    );
END;
$$;


--
-- Name: get_user_company(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_company(p_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT company_id
FROM users
WHERE id = p_user_id;
$$;


--
-- Name: get_user_company_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_company_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT company_id
FROM users
WHERE id = auth.uid();
$$;


--
-- PostgreSQL database dump complete
--

