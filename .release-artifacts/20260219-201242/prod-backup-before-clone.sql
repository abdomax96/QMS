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

