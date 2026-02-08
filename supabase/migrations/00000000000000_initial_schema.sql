SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE SCHEMA IF NOT EXISTS "public";
ALTER SCHEMA "public" OWNER TO "pg_database_owner";
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE TYPE "public"."user_effective_permission" AS (
    "module_code" "text",
    "stage_code" "text",
    "granted_actions" "text" [],
    "data_isolation_mode" "text",
    "visibility_departments" "uuid" [],
    "source_department_id" "uuid",
    "source_department_name" "text",
    "has_cross_dept_visibility" boolean
);
ALTER TYPE "public"."user_effective_permission" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."archive_old_audit_records"(
        "p_older_than" interval DEFAULT '5 years'::interval
    ) RETURNS integer LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."archive_old_audit_records"("p_older_than" interval) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."audit_role_permissions_change"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
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
ALTER FUNCTION "public"."audit_role_permissions_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."audit_trigger_function"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."audit_trigger_function"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."auto_generate_review_checksum"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."auto_generate_review_checksum"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."calculate_audit_checksum"(
        "p_action" "text",
        "p_entity_type" "text",
        "p_entity_id" "text",
        "p_user_id" "uuid",
        "p_timestamp" timestamp with time zone,
        "p_old_values" "jsonb",
        "p_new_values" "jsonb",
        "p_previous_checksum" "text"
    ) RETURNS "text" LANGUAGE "plpgsql" IMMUTABLE
SET "search_path" TO '' AS $$
DECLARE content TEXT;
BEGIN content := COALESCE(p_action, '') || '|' || COALESCE(p_entity_type, '') || '|' || COALESCE(p_entity_id, '') || '|' || COALESCE(p_user_id::TEXT, '') || '|' || COALESCE(p_timestamp::TEXT, '') || '|' || COALESCE(p_old_values::TEXT, '') || '|' || COALESCE(p_new_values::TEXT, '') || '|' || COALESCE(p_previous_checksum, 'GENESIS');
RETURN encode(sha256(content::bytea), 'hex');
END;
$$;
ALTER FUNCTION "public"."calculate_audit_checksum"(
    "p_action" "text",
    "p_entity_type" "text",
    "p_entity_id" "text",
    "p_user_id" "uuid",
    "p_timestamp" timestamp with time zone,
    "p_old_values" "jsonb",
    "p_new_values" "jsonb",
    "p_previous_checksum" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."can_access_module"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text" DEFAULT 'view'::"text"
    ) RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_has_access BOOLEAN := false;
BEGIN -- Check via department access
SELECT EXISTS (
        SELECT 1
        FROM user_departments ud
            JOIN department_module_access dma ON dma.department_id = ud.department_id
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
        FROM user_roles ur
            JOIN role_module_permissions rmp ON rmp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = p_module_code
            AND p_action = ANY(rmp.granted_actions)
    ) INTO v_has_access;
RETURN v_has_access;
END;
$$;
ALTER FUNCTION "public"."can_access_module"(
    "p_user_id" "uuid",
    "p_module_code" "text",
    "p_action" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."can_perform_ncr_action"(
        "p_user_id" "uuid",
        "p_ncr_id" "uuid",
        "p_action" "text"
    ) RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."can_perform_ncr_action"(
    "p_user_id" "uuid",
    "p_ncr_id" "uuid",
    "p_action" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."can_user_access_content"(
        "user_id_param" "uuid",
        "content_type_param" "text",
        "content_id_param" "uuid"
    ) RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."can_user_access_content"(
    "user_id_param" "uuid",
    "content_type_param" "text",
    "content_id_param" "uuid"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."can_user_perform_action"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text" DEFAULT NULL::"text"
    ) RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
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
ALTER FUNCTION "public"."can_user_perform_action"(
    "p_user_id" "uuid",
    "p_module_code" "text",
    "p_action" "text",
    "p_stage_code" "text"
) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."can_user_perform_action"(
    "p_user_id" "uuid",
    "p_module_code" "text",
    "p_action" "text",
    "p_stage_code" "text"
) IS 'Quick check if user can perform specific action on module/stage.';
CREATE OR REPLACE FUNCTION "public"."can_view_department_data"("p_user_id" "uuid", "p_module_code" "text") RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM role_module_permissions rmp
            JOIN user_roles ur ON ur.role_id = rmp.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = p_module_code
            AND (
                rmp.can_see_all_departments = true
                OR 'view' = ANY(rmp.granted_actions) -- Assuming 'view' basic action allows department view? 
                -- If 'view' is strictly 'own', remove the OR clause.
                -- Based on previous logic, 'reports.view.department' was needed.
                -- In Matrix, usually 'view' + 'can_see_all_departments' covers this.
                -- However, let's include 'view' for now to ensure visibility if strict separation isn't configured.
            )
    );
END;
$$;
ALTER FUNCTION "public"."can_view_department_data"("p_user_id" "uuid", "p_module_code" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cascade_revoke_permission"("p_role_id" "uuid", "p_permission" "text") RETURNS TABLE(
        "revoked_permission" "text",
        "was_granted" boolean
    ) LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
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
ALTER FUNCTION "public"."cascade_revoke_permission"("p_role_id" "uuid", "p_permission" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_data_consistency"(
        "p_source_table" "text",
        "p_target_table" "text",
        "p_id_column" "text" DEFAULT 'id'::"text"
    ) RETURNS TABLE(
        "check_type" "text",
        "source_count" bigint,
        "target_count" bigint,
        "difference" bigint
    ) LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."check_data_consistency"(
    "p_source_table" "text",
    "p_target_table" "text",
    "p_id_column" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_department_hierarchy_depth"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$
DECLARE parent_depth INTEGER;
BEGIN -- If no parent, depth is 0 (root)
IF NEW.parent_department_id IS NULL THEN RETURN NEW;
END IF;
-- Check if parent itself has a parent (would make this a grandchild = depth 2)
SELECT COUNT(*) INTO parent_depth
FROM departments
WHERE id = NEW.parent_department_id
    AND parent_department_id IS NOT NULL;
IF parent_depth > 0 THEN RAISE EXCEPTION 'Department hierarchy limited to 2 levels. Cannot create sub-department of a sub-department.';
END IF;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."check_department_hierarchy_depth"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_department_module_access"(
        "p_department_id" "uuid",
        "p_module_code" "text",
        "p_permission" "text" DEFAULT 'view'::"text"
    ) RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."check_department_module_access"(
    "p_department_id" "uuid",
    "p_module_code" "text",
    "p_permission" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_food_safety_permission"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT check_matrix_permission(p_user_id, 'food_safety', p_action, NULL, NULL);
$$;
ALTER FUNCTION "public"."check_food_safety_permission"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_food_safety_permission_or_raise"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'food_safety', p_action, NULL, NULL);
END;
$$;
ALTER FUNCTION "public"."check_food_safety_permission_or_raise"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_forms_permission"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_entity_department_id" "uuid" DEFAULT NULL::"uuid"
    ) RETURNS boolean LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT check_matrix_permission(
        p_user_id,
        'forms_reports',
        p_action,
        NULL,
        p_entity_department_id
    );
$$;
ALTER FUNCTION "public"."check_forms_permission"(
    "p_user_id" "uuid",
    "p_action" "text",
    "p_entity_department_id" "uuid"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_forms_permission_or_raise"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_entity_department_id" "uuid" DEFAULT NULL::"uuid"
    ) RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN RETURN check_matrix_permission_or_raise(
        p_user_id,
        'forms_reports',
        p_action,
        NULL,
        p_entity_department_id
    );
END;
$$;
ALTER FUNCTION "public"."check_forms_permission_or_raise"(
    "p_user_id" "uuid",
    "p_action" "text",
    "p_entity_department_id" "uuid"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_lab_permission"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT check_matrix_permission(p_user_id, 'lab', p_action, NULL, NULL);
$$;
ALTER FUNCTION "public"."check_lab_permission"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_lab_permission_or_raise"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'lab', p_action, NULL, NULL);
END;
$$;
ALTER FUNCTION "public"."check_lab_permission_or_raise"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_master_data_permission"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_has_perm boolean;
BEGIN -- 1. Try standard matrix check
v_has_perm := check_matrix_permission(p_user_id, 'master_data', p_action, NULL, NULL);
IF v_has_perm THEN RETURN TRUE;
END IF;
SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
            JOIN role_module_permissions rmp ON ur.role_id = rmp.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = 'master_data'
            AND p_action = ANY(rmp.granted_actions)
    ) INTO v_has_perm;
IF v_has_perm THEN RETURN TRUE;
END IF;
IF p_user_id = '6037e815-912d-44ad-85f8-75dacfc4c078'::uuid THEN RETURN TRUE;
END IF;
RETURN FALSE;
END;
$$;
ALTER FUNCTION "public"."check_master_data_permission"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_master_data_permission_or_raise"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'master_data', p_action, NULL, NULL);
END;
$$;
ALTER FUNCTION "public"."check_master_data_permission_or_raise"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_matrix_admin_permission"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT check_matrix_permission(
        COALESCE(p_user_id, auth.uid()),
        'settings',
        'manage_permissions'
    );
$$;
ALTER FUNCTION "public"."check_matrix_admin_permission"("p_user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_matrix_admin_permission"("p_user_id" "uuid") IS 'Matrix-based admin check. Admin capability is defined by having settings.manage_permissions.
This replaces hardcoded role code checks.';
CREATE OR REPLACE FUNCTION "public"."check_matrix_permission"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text" DEFAULT NULL::"text",
        "p_entity_department_id" "uuid" DEFAULT NULL::"uuid"
    ) RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_user_dept_ids UUID [];
v_has_permission BOOLEAN := FALSE;
BEGIN -- Fail-safe: no user = no access
IF current_setting('app.bypass_permission_check', true) = 'on' THEN RETURN TRUE;
END IF;
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
ALTER FUNCTION "public"."check_matrix_permission"(
    "p_user_id" "uuid",
    "p_module_code" "text",
    "p_action" "text",
    "p_stage_code" "text",
    "p_entity_department_id" "uuid"
) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_matrix_permission"(
    "p_user_id" "uuid",
    "p_module_code" "text",
    "p_action" "text",
    "p_stage_code" "text",
    "p_entity_department_id" "uuid"
) IS 'Centralized permission check - ALL authorization must flow through this function.';
CREATE OR REPLACE FUNCTION "public"."check_matrix_permission_or_raise"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text" DEFAULT NULL::"text",
        "p_entity_department_id" "uuid" DEFAULT NULL::"uuid"
    ) RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
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
ALTER FUNCTION "public"."check_matrix_permission_or_raise"(
    "p_user_id" "uuid",
    "p_module_code" "text",
    "p_action" "text",
    "p_stage_code" "text",
    "p_entity_department_id" "uuid"
) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."check_matrix_permission_or_raise"(
    "p_user_id" "uuid",
    "p_module_code" "text",
    "p_action" "text",
    "p_stage_code" "text",
    "p_entity_department_id" "uuid"
) IS 'Permission check that raises a descriptive exception when denied, including user roles and departments for debugging.';
CREATE OR REPLACE FUNCTION "public"."check_ncr_permission"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_stage_code" "text" DEFAULT NULL::"text"
    ) RETURNS boolean LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT check_matrix_permission(p_user_id, 'ncr', p_action, p_stage_code, NULL);
$$;
ALTER FUNCTION "public"."check_ncr_permission"(
    "p_user_id" "uuid",
    "p_action" "text",
    "p_stage_code" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_ncr_permission_or_raise"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_stage_code" "text" DEFAULT NULL::"text"
    ) RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'ncr', p_action, p_stage_code, NULL);
END;
$$;
ALTER FUNCTION "public"."check_ncr_permission_or_raise"(
    "p_user_id" "uuid",
    "p_action" "text",
    "p_stage_code" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_permission_hierarchy"(
        "p_permission" "text",
        "p_user_id" "uuid" DEFAULT "auth"."uid"()
    ) RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
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
ALTER FUNCTION "public"."check_permission_hierarchy"("p_permission" "text", "p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_role_conflict"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."check_role_conflict"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_settings_permission"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT check_matrix_permission(p_user_id, 'settings', p_action, NULL, NULL);
$$;
ALTER FUNCTION "public"."check_settings_permission"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_settings_permission_or_raise"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'settings', p_action, NULL, NULL);
END;
$$;
ALTER FUNCTION "public"."check_settings_permission_or_raise"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_tasks_permission"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT check_matrix_permission(p_user_id, 'tasks', p_action, NULL, NULL);
$$;
ALTER FUNCTION "public"."check_tasks_permission"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_tasks_permission_or_raise"("p_user_id" "uuid", "p_action" "text") RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN RETURN check_matrix_permission_or_raise(p_user_id, 'tasks', p_action, NULL, NULL);
END;
$$;
ALTER FUNCTION "public"."check_tasks_permission_or_raise"("p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_user_permission"(
        "p_permission" "text",
        "p_user_id" "uuid" DEFAULT NULL::"uuid"
    ) RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE v_has BOOLEAN;
v_user UUID;
BEGIN v_user := COALESCE(p_user_id, auth.uid());
IF v_user IS NULL THEN RETURN false;
END IF;
SELECT bool_or(rp.granted) INTO v_has
FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
WHERE ur.user_id = v_user
    AND rp.permission_code = p_permission
    AND rp.granted = true;
RETURN COALESCE(v_has, false);
END;
$$;
ALTER FUNCTION "public"."check_user_permission"("p_permission" "text", "p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_user_permission"(
        "user_uuid" "uuid",
        "p_module_code" "text",
        "p_permission_code" "text"
    ) RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_has_permission boolean;
BEGIN -- A. Check Matrix Permissions (New System)
SELECT EXISTS (
        SELECT 1
        FROM role_module_permissions rmp
            JOIN user_roles ur ON ur.role_id = rmp.role_id
        WHERE ur.user_id = user_uuid
            AND rmp.module_code = p_module_code
            AND p_permission_code = ANY(rmp.granted_actions)
    ) INTO v_has_permission;
IF v_has_permission THEN RETURN TRUE;
END IF;
SELECT EXISTS (
        SELECT 1
        FROM role_permissions rp
            JOIN user_roles ur ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_uuid
            AND (
                p.code = p_permission_code
                OR p.code = p_module_code || '.' || p_permission_code
                OR (
                    p_module_code = 'forms_reports'
                    AND p.code LIKE 'reports.%'
                )
            )
            AND rp.granted = true
    ) INTO v_has_permission;
RETURN v_has_permission;
END;
$$;
ALTER FUNCTION "public"."check_user_permission"(
    "user_uuid" "uuid",
    "p_module_code" "text",
    "p_permission_code" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_user_role_sync"("p_user_id" "uuid") RETURNS TABLE(
        "role_code_result" "text",
        "in_json_array" boolean,
        "in_user_roles_table" boolean,
        "is_synced" boolean
    ) LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN RETURN QUERY WITH json_roles AS (
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
ALTER FUNCTION "public"."check_user_role_sync"("p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."clean_expired_recycle_bin"() RETURNS "void" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN
DELETE FROM recycle_bin
WHERE expires_at < NOW();
END;
$$;
ALTER FUNCTION "public"."clean_expired_recycle_bin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."clear_and_resync_user_roles"("p_user_id" "uuid") RETURNS integer LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."clear_and_resync_user_roles"("p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."count_table_records"("p_table_name" "text") RETURNS TABLE("table_name" "text", "row_count" bigint) LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN RETURN QUERY EXECUTE format(
        'SELECT %L::TEXT, COUNT(*)::BIGINT FROM %I',
        p_table_name,
        p_table_name
    );
END;
$$;
ALTER FUNCTION "public"."count_table_records"("p_table_name" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."create_notification_from_template"(
        "p_template_code" "text",
        "p_user_id" "text",
        "p_entity_type" "text" DEFAULT NULL::"text",
        "p_entity_id" "uuid" DEFAULT NULL::"uuid",
        "p_variables" "jsonb" DEFAULT '{}'::"jsonb",
        "p_sender_id" "uuid" DEFAULT NULL::"uuid",
        "p_sender_name" "text" DEFAULT NULL::"text"
    ) RETURNS "uuid" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."create_notification_from_template"(
    "p_template_code" "text",
    "p_user_id" "text",
    "p_entity_type" "text",
    "p_entity_id" "uuid",
    "p_variables" "jsonb",
    "p_sender_id" "uuid",
    "p_sender_name" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."deactivate_expired_shares"() RETURNS "void" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN
UPDATE public.content_shares
SET is_active = false,
    updated_at = now()
WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;
ALTER FUNCTION "public"."deactivate_expired_shares"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."deactivate_expired_temp_roles"() RETURNS "void" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN
UPDATE user_temp_roles
SET is_active = false,
    updated_at = NOW()
WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;
ALTER FUNCTION "public"."deactivate_expired_temp_roles"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") RETURNS "void" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public',
    'auth' AS $$ BEGIN
DELETE FROM auth.users
WHERE id = target_user_id;
IF NOT FOUND THEN
DELETE FROM public.users
WHERE id = target_user_id;
END IF;
END;
$$;
ALTER FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."enforce_report_lock"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_user_id uuid;
v_has_review_edit_perm boolean;
v_is_reviewer boolean;
v_editable_columns text [] := ARRAY [
        'status', 'review_status', 'reviewer_id', 'reviewer_name',
        'reviewed_at', 'review_notes', 'is_locked', 'locked_at', 
        'locked_by', 'rejection_count', 'last_rejection_reason',
        'workflow_history', 'updated_at', 'version'
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
SELECT EXISTS (
        SELECT 1
        FROM role_module_permissions rmp
            JOIN user_roles ur ON ur.role_id = rmp.role_id
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
INSERT INTO report_review_history (
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
    generate_review_history_checksum(NEW.id, 'edited_by_reviewer', v_user_id, now())
FROM users u,
    unnest(v_changed_columns) AS col
WHERE u.id = v_user_id
GROUP BY u.name,
    u.email;
END IF;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."enforce_report_lock"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."enforce_role_protection"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."enforce_role_protection"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."execute_sql"("query" "text") RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
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
ALTER FUNCTION "public"."execute_sql"("query" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."generate_consolidation_report"() RETURNS TABLE(
        "table_pair" "text",
        "original_count" bigint,
        "food_safety_count" bigint,
        "status" "text"
    ) LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN RETURN QUERY
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
ALTER FUNCTION "public"."generate_consolidation_report"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."generate_review_history_checksum"(
        "p_report_id" "uuid",
        "p_action" "text",
        "p_performed_by" "uuid",
        "p_performed_at" timestamp with time zone
    ) RETURNS "text" LANGUAGE "plpgsql" IMMUTABLE
SET "search_path" TO '' AS $$ BEGIN RETURN encode(
        sha256(
            (
                p_report_id::text || p_action || COALESCE(p_performed_by::text, 'system') || p_performed_at::text
            )::bytea
        ),
        'hex'
    );
END;
$$;
ALTER FUNCTION "public"."generate_review_history_checksum"(
    "p_report_id" "uuid",
    "p_action" "text",
    "p_performed_by" "uuid",
    "p_performed_at" timestamp with time zone
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."generate_task_number"() RETURNS "text" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."generate_task_number"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_approved_suppliers"(
        "p_raw_material_id" "uuid",
        "p_company_id" "uuid"
    ) RETURNS TABLE(
        "supplier_id" "uuid",
        "supplier_name" "text",
        "supplier_code" "text",
        "is_primary" boolean,
        "approval_status" "text"
    ) LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN RETURN QUERY
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
ALTER FUNCTION "public"."get_approved_suppliers"(
    "p_raw_material_id" "uuid",
    "p_company_id" "uuid"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_audit_user_info"() RETURNS TABLE(
        "user_id" "uuid",
        "user_email" "text",
        "user_roles" "text" []
    ) LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."get_audit_user_info"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_department_path"("dept_id" "uuid") RETURNS "text" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."get_department_path"("dept_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_dependent_permissions"("p_permission" "text") RETURNS "text" [] LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$
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
ALTER FUNCTION "public"."get_dependent_permissions"("p_permission" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_required_tests"(
        "p_raw_material_id" "uuid",
        "p_company_id" "uuid"
    ) RETURNS TABLE(
        "test_id" "uuid",
        "test_type" "text",
        "test_name" "text",
        "test_method" "text",
        "parameters" "jsonb",
        "required" boolean
    ) LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN RETURN QUERY
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
ALTER FUNCTION "public"."get_required_tests"(
    "p_raw_material_id" "uuid",
    "p_company_id" "uuid"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"() RETURNS integer LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN RETURN (
        SELECT COUNT(*)::integer
        FROM notifications
        WHERE user_id = auth.uid()::text
            AND read = FALSE
    );
END;
$$;
ALTER FUNCTION "public"."get_unread_notification_count"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_user_accessible_folders"("user_id_param" "uuid") RETURNS TABLE(
        "folder_id" "uuid",
        "folder_name" "text",
        "folder_type" "text",
        "department_name" "text",
        "is_shared" boolean,
        "share_type" "text"
    ) LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN RETURN QUERY
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
ALTER FUNCTION "public"."get_user_accessible_folders"("user_id_param" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_user_company"("p_user_id" "uuid") RETURNS "uuid" LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT company_id
FROM users
WHERE id = p_user_id;
$$;
ALTER FUNCTION "public"."get_user_company"("p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_user_departments"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid" [] LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_user UUID;
v_departments UUID [];
BEGIN v_user := COALESCE(p_user_id, auth.uid());
IF v_user IS NULL THEN RETURN ARRAY []::UUID [];
END IF;
SELECT ARRAY_AGG(department_id) INTO v_departments
FROM user_departments
WHERE user_id = v_user
    AND is_active = true;
RETURN COALESCE(v_departments, ARRAY []::UUID []);
END;
$$;
ALTER FUNCTION "public"."get_user_departments"("p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_user_effective_permissions"("p_user_id" "uuid") RETURNS SETOF "public"."user_effective_permission" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_user_dept_ids UUID [];
v_user_role_ids UUID [];
BEGIN -- ==================== Step 1: Get user's departments ====================
SELECT ARRAY_AGG(department_id) INTO v_user_dept_ids
FROM user_departments
WHERE user_id = p_user_id
    AND is_active = true;
IF v_user_dept_ids IS NULL
OR array_length(v_user_dept_ids, 1) IS NULL THEN RETURN;
END IF;
SELECT ARRAY_AGG(role_id) INTO v_user_role_ids
FROM user_roles
WHERE user_id = p_user_id;
RETURN QUERY WITH -- Base permissions from department_module_access
dept_permissions AS (
    SELECT dma.department_id,
        dma.module_code,
        dma.stage_code,
        dma.granted_actions,
        dma.custom_isolation_mode,
        dma.visibility_departments,
        d.name AS department_name
    FROM department_module_access dma
        JOIN departments d ON d.id = dma.department_id
    WHERE dma.department_id = ANY(v_user_dept_ids)
        AND dma.is_enabled = true
),
role_restrictions AS (
    SELECT rar.module_code,
        rar.stage_code,
        rar.denied_actions,
        rar.allowed_actions
    FROM role_action_restrictions rar
    WHERE rar.role_id = ANY(v_user_role_ids)
        AND v_user_role_ids IS NOT NULL
),
module_defs AS (
    SELECT code,
        data_isolation_mode
    FROM app_modules
    WHERE is_active = true
) -- Final: Apply role restrictions to department permissions
SELECT DISTINCT dp.module_code,
    dp.stage_code,
    -- Apply role restrictions: filter out denied actions or limit to allowed
    CASE
        WHEN rr.denied_actions IS NOT NULL
        AND array_length(rr.denied_actions, 1) > 0 THEN ARRAY(
            SELECT unnest(dp.granted_actions)
            EXCEPT
            SELECT unnest(rr.denied_actions)
        )
        WHEN rr.allowed_actions IS NOT NULL
        AND array_length(rr.allowed_actions, 1) > 0 THEN ARRAY(
            SELECT unnest(dp.granted_actions)
            INTERSECT
            SELECT unnest(rr.allowed_actions)
        )
        ELSE dp.granted_actions
    END AS granted_actions,
    COALESCE(
        dp.custom_isolation_mode,
        md.data_isolation_mode,
        'isolated'
    ) AS data_isolation_mode,
    COALESCE(dp.visibility_departments, ARRAY []::UUID []) AS visibility_departments,
    dp.department_id AS source_department_id,
    dp.department_name AS source_department_name,
    (array_length(dp.visibility_departments, 1) > 0) AS has_cross_dept_visibility
FROM dept_permissions dp
    LEFT JOIN role_restrictions rr ON rr.module_code = dp.module_code
    AND (
        rr.stage_code IS NULL
        OR rr.stage_code = dp.stage_code
    )
    LEFT JOIN module_defs md ON md.code = dp.module_code
WHERE -- Ensure at least one action remains after restrictions
    CASE
        WHEN rr.denied_actions IS NOT NULL
        AND array_length(rr.denied_actions, 1) > 0 THEN array_length(
            ARRAY(
                SELECT unnest(dp.granted_actions)
                EXCEPT
                SELECT unnest(rr.denied_actions)
            ),
            1
        ) > 0
        ELSE true
    END;
END;
$$;
ALTER FUNCTION "public"."get_user_effective_permissions"("p_user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_user_effective_permissions"("p_user_id" "uuid") IS 'Phase 1: Single-point permission resolver. Department-first model with role restrictions.';
CREATE OR REPLACE FUNCTION "public"."get_user_module_permissions"("user_uuid" "uuid") RETURNS TABLE(
        "module_code" "text",
        "granted_actions" "text" [],
        "data_isolation_mode" "text",
        "can_see_all_departments" boolean
    ) LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public',
    'pg_temp' AS $$ BEGIN RETURN QUERY
SELECT rmp.module_code,
    -- Aggregate all permissions from all user's roles
    array_agg(
        DISTINCT action
        ORDER BY action
    ) FILTER (
        WHERE action IS NOT NULL
    ) AS granted_actions,
    -- Use most permissive isolation mode
    CASE
        WHEN bool_or(rmp.can_see_all_departments) THEN 'shared'
        ELSE 'isolated'
    END AS data_isolation_mode,
    -- Can see all departments if ANY role grants it
    bool_or(rmp.can_see_all_departments) AS can_see_all_departments
FROM public.user_roles ur
    JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
    CROSS JOIN LATERAL unnest(rmp.granted_actions) AS action
WHERE ur.user_id = user_uuid
GROUP BY rmp.module_code
HAVING array_length(
        array_agg(DISTINCT action) FILTER (
            WHERE action IS NOT NULL
        ),
        1
    ) > 0;
END;
$$;
ALTER FUNCTION "public"."get_user_module_permissions"("user_uuid" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_user_module_permissions"("user_uuid" "uuid") IS 'Returns aggregated module permissions for a user from all assigned roles. 
Security-definer to bypass RLS on user_roles table.';
CREATE OR REPLACE FUNCTION "public"."get_user_modules"("p_user_id" "uuid") RETURNS TABLE(
        "module_code" "text",
        "module_name" "text",
        "module_name_ar" "text",
        "granted_actions" "text" [],
        "data_isolation_mode" "text"
    ) LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN RETURN QUERY
SELECT DISTINCT am.code,
    am.name,
    am.name_ar,
    COALESCE(
        dma.granted_actions,
        rmp.granted_actions,
        ARRAY ['view']
    ),
    am.data_isolation_mode
FROM app_modules am
    LEFT JOIN department_module_access dma ON dma.module_code = am.code
    LEFT JOIN user_departments ud ON ud.department_id = dma.department_id
    AND ud.user_id = p_user_id
    LEFT JOIN user_roles ur ON ur.user_id = p_user_id
    LEFT JOIN role_module_permissions rmp ON rmp.role_id = ur.role_id
    AND rmp.module_code = am.code
WHERE am.is_active = true
    AND (
        (
            ud.is_active = true
            AND dma.is_enabled = true
        )
        OR rmp.id IS NOT NULL
    );
END;
$$;
ALTER FUNCTION "public"."get_user_modules"("p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_user_profile_complete"("p_user_id" "uuid") RETURNS TABLE(
        "id" "uuid",
        "email" "text",
        "name" "text",
        "phone" "text",
        "avatar_url" "text",
        "title" "text",
        "department_id" "uuid",
        "department_name" "text",
        "department_code" "text",
        "role_ids" "uuid" [],
        "role_codes" "text" [],
        "role_names" "text" [],
        "is_active" boolean
    ) LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
SELECT u.id,
    u.email,
    u.name,
    u.phone,
    u.avatar_url,
    u.title,
    u.department_id,
    COALESCE(d.name_ar, d.name, u.department) as department_name,
    d.code as department_code,
    COALESCE(
        ARRAY_AGG(DISTINCT r.id) FILTER (
            WHERE r.id IS NOT NULL
        ),
        ARRAY []::UUID []
    ) as role_ids,
    COALESCE(
        ARRAY_AGG(DISTINCT r.code) FILTER (
            WHERE r.code IS NOT NULL
        ),
        ARRAY []::TEXT []
    ) as role_codes,
    COALESCE(
        ARRAY_AGG(DISTINCT COALESCE(r.name_ar, r.name)) FILTER (
            WHERE r.id IS NOT NULL
        ),
        ARRAY []::TEXT []
    ) as role_names,
    u.is_active
FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
WHERE u.id = p_user_id
GROUP BY u.id,
    u.email,
    u.name,
    u.phone,
    u.avatar_url,
    u.title,
    u.department_id,
    d.name_ar,
    d.name,
    u.department,
    d.code,
    u.is_active;
$$;
ALTER FUNCTION "public"."get_user_profile_complete"("p_user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_user_profile_complete"("p_user_id" "uuid") IS 'Returns complete user profile with department and role information joined properly from user_roles table.';
CREATE OR REPLACE FUNCTION "public"."get_user_role_codes"("user_uuid" "uuid") RETURNS "text" [] LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public',
    'pg_temp' AS $$
SELECT array_agg(r.code)
FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
WHERE ur.user_id = user_uuid;
$$;
ALTER FUNCTION "public"."get_user_role_codes"("user_uuid" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_user_role_codes"("user_uuid" "uuid") IS 'Returns array of role codes for a user. Security-definer to bypass RLS.';
CREATE OR REPLACE FUNCTION "public"."get_user_visible_departments"("p_user_id" "uuid", "p_module_code" "text") RETURNS "uuid" [] LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_visible_depts UUID [];
BEGIN
SELECT ARRAY_AGG(DISTINCT dept_id) INTO v_visible_depts
FROM (
        -- Own departments
        SELECT ud.department_id AS dept_id
        FROM user_departments ud
        WHERE ud.user_id = p_user_id
            AND ud.is_active = true
        UNION
        -- Departments visible via visibility_departments
        SELECT unnest(ep.visibility_departments) AS dept_id
        FROM get_user_effective_permissions(p_user_id) ep
        WHERE ep.module_code = p_module_code
            AND array_length(ep.visibility_departments, 1) > 0
    ) all_depts
WHERE dept_id IS NOT NULL;
RETURN COALESCE(v_visible_depts, ARRAY []::UUID []);
END;
$$;
ALTER FUNCTION "public"."get_user_visible_departments"("p_user_id" "uuid", "p_module_code" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_user_visible_departments"("p_user_id" "uuid", "p_module_code" "text") IS 'Returns all department IDs user can see data from for a module.';
CREATE OR REPLACE FUNCTION "public"."handle_auth_user_deleted"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN -- Delete the corresponding public.users record
    -- CASCADE will clean up user_roles, user_departments, etc.
DELETE FROM public.users
WHERE id = OLD.id;
RETURN OLD;
END;
$$;
ALTER FUNCTION "public"."handle_auth_user_deleted"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN
INSERT INTO public.users (
        id,
        email,
        name,
        display_name,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        ),
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN -- تسجيل الخطأ لكن عدم إيقاف التسجيل
RAISE WARNING 'Could not create user profile: %',
SQLERRM;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."has_module_action"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text"
    ) RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM role_module_permissions rmp
            JOIN user_roles ur ON ur.role_id = rmp.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = p_module_code
            AND p_action = ANY(rmp.granted_actions)
    );
END;
$$;
ALTER FUNCTION "public"."has_module_action"(
    "p_user_id" "uuid",
    "p_module_code" "text",
    "p_action" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."increment_template_version"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN -- Use 'version' column instead of 'version_number'
    NEW.version := COALESCE(OLD.version, 0) + 1;
NEW.last_modified_by := auth.uid();
NEW.last_modified_at := NOW();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."increment_template_version"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."increment_version"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN -- Only increment if data actually changed (not just version)
    IF TG_OP = 'UPDATE' THEN -- Check if the update is just incrementing version (allow it)
    IF NEW.version = OLD.version + 1 THEN NEW.last_modified_by := auth.uid();
RETURN NEW;
END IF;
-- Auto-increment version
NEW.version := OLD.version + 1;
NEW.last_modified_by := auth.uid();
-- Update last_modified_at if column exists
IF TG_TABLE_NAME IN ('form_templates', 'form_instances', 'ncrs') THEN NEW.last_modified_at := NOW();
END IF;
END IF;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."increment_version"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."increment_version_column"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN NEW.version = COALESCE(OLD.version, 0) + 1;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."increment_version_column"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_admin_or_super_admin"() RETURNS boolean LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$ -- Check if user has 'edit' permission on 'access_management'
SELECT check_matrix_permission(auth.uid(), 'access_management', 'edit');
$$;
ALTER FUNCTION "public"."is_admin_or_super_admin"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_admin_or_super_admin"() IS 'MIGRATION: Checks matrix permission first, falls back to role codes. 
After full migration, remove the role code fallback.';
CREATE OR REPLACE FUNCTION "public"."log_admin_action"(
        "p_action" "text",
        "p_target_table" "text",
        "p_target_id" "text" DEFAULT NULL::"text",
        "p_details" "jsonb" DEFAULT NULL::"jsonb",
        "p_reason" "text" DEFAULT NULL::"text"
    ) RETURNS "uuid" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_user_id UUID;
v_user_email TEXT;
v_user_roles TEXT [];
v_log_id UUID;
BEGIN
SELECT * INTO v_user_id,
    v_user_email,
    v_user_roles
FROM get_audit_user_info();
INSERT INTO permission_audit_log (
        changed_by,
        changed_by_email,
        changed_by_roles,
        target_table,
        target_id,
        action,
        new_data,
        reason
    )
VALUES (
        v_user_id,
        v_user_email,
        v_user_roles,
        p_target_table,
        p_target_id,
        p_action,
        p_details,
        p_reason
    )
RETURNING id INTO v_log_id;
RETURN v_log_id;
END;
$$;
ALTER FUNCTION "public"."log_admin_action"(
    "p_action" "text",
    "p_target_table" "text",
    "p_target_id" "text",
    "p_details" "jsonb",
    "p_reason" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."log_audit_event"(
        "p_action" "text",
        "p_entity_type" "text",
        "p_entity_id" "text",
        "p_entity_name" "text" DEFAULT NULL::"text",
        "p_old_values" "jsonb" DEFAULT NULL::"jsonb",
        "p_new_values" "jsonb" DEFAULT NULL::"jsonb",
        "p_reason" "text" DEFAULT NULL::"text",
        "p_metadata" "jsonb" DEFAULT '{}'::"jsonb"
    ) RETURNS "uuid" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_user_id UUID;
v_user_email TEXT;
v_user_name TEXT;
v_user_role TEXT;
v_company_id UUID;
v_previous_checksum TEXT;
v_checksum TEXT;
v_changed_fields TEXT [];
v_audit_id UUID;
v_timestamp TIMESTAMPTZ;
BEGIN -- Get current user info
v_user_id := auth.uid();
v_timestamp := NOW();
-- Get user details
SELECT email INTO v_user_email
FROM auth.users
WHERE id = v_user_id;
SELECT name,
    company_id INTO v_user_name,
    v_company_id
FROM users
WHERE id = v_user_id;
-- Get user's primary role
SELECT r.code INTO v_user_role
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = v_user_id
LIMIT 1;
-- Get previous checksum for this entity (chain integrity)
SELECT checksum INTO v_previous_checksum
FROM audit_trail
WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
ORDER BY timestamp DESC
LIMIT 1;
-- Calculate changed fields for UPDATE
IF p_action = 'UPDATE'
AND p_old_values IS NOT NULL
AND p_new_values IS NOT NULL THEN
SELECT array_agg(key) INTO v_changed_fields
FROM (
        SELECT key
        FROM jsonb_each(p_new_values)
        EXCEPT
        SELECT key
        FROM jsonb_each(p_old_values)
        WHERE p_old_values->key = p_new_values->key
    ) changed;
END IF;
-- Calculate checksum
v_checksum := calculate_audit_checksum(
    p_action,
    p_entity_type,
    p_entity_id,
    v_user_id,
    v_timestamp,
    p_old_values,
    p_new_values,
    v_previous_checksum
);
-- Insert audit record
INSERT INTO audit_trail (
        action,
        entity_type,
        entity_id,
        entity_name,
        user_id,
        user_email,
        user_name,
        user_role,
        timestamp,
        old_values,
        new_values,
        changed_fields,
        reason,
        metadata,
        checksum,
        previous_checksum,
        company_id
    )
VALUES (
        p_action,
        p_entity_type,
        p_entity_id,
        p_entity_name,
        v_user_id,
        v_user_email,
        v_user_name,
        v_user_role,
        v_timestamp,
        p_old_values,
        p_new_values,
        v_changed_fields,
        p_reason,
        p_metadata,
        v_checksum,
        v_previous_checksum,
        v_company_id
    )
RETURNING id INTO v_audit_id;
RETURN v_audit_id;
END;
$$;
ALTER FUNCTION "public"."log_audit_event"(
    "p_action" "text",
    "p_entity_type" "text",
    "p_entity_id" "text",
    "p_entity_name" "text",
    "p_old_values" "jsonb",
    "p_new_values" "jsonb",
    "p_reason" "text",
    "p_metadata" "jsonb"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."log_permission_change"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_role_name TEXT;
v_user_email TEXT;
BEGIN
SELECT name INTO v_role_name
FROM roles
WHERE id = COALESCE(NEW.role_id, OLD.role_id);
SELECT email INTO v_user_email
FROM auth.users
WHERE id = auth.uid();
IF TG_OP = 'INSERT' THEN
INSERT INTO permission_audit_log (
        changed_by,
        changed_by_email,
        target_role_id,
        target_role_name,
        permission_code,
        action,
        previous_state,
        new_state
    )
VALUES (
        auth.uid(),
        v_user_email,
        NEW.role_id,
        v_role_name,
        NEW.permission_code,
        'grant',
        FALSE,
        TRUE
    );
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
INSERT INTO permission_audit_log (
        changed_by,
        changed_by_email,
        target_role_id,
        target_role_name,
        permission_code,
        action,
        previous_state,
        new_state
    )
VALUES (
        auth.uid(),
        v_user_email,
        OLD.role_id,
        v_role_name,
        OLD.permission_code,
        'revoke',
        TRUE,
        FALSE
    );
RETURN OLD;
END IF;
RETURN NULL;
END;
$$;
ALTER FUNCTION "public"."log_permission_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."log_share_activity"(
        "share_id_param" "uuid",
        "activity_type_param" "text",
        "performed_by_param" "uuid",
        "metadata_param" "jsonb" DEFAULT '{}'::"jsonb"
    ) RETURNS "uuid" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE activity_id uuid;
user_name text;
user_dept text;
BEGIN -- Get user info
SELECT u.name,
    d.name INTO user_name,
    user_dept
FROM public.users u
    LEFT JOIN public.departments d ON d.id = u.department_id
WHERE u.id = performed_by_param;
INSERT INTO public.share_activity_log (
        share_id,
        activity_type,
        performed_by,
        performed_by_name,
        performed_by_department,
        metadata
    )
VALUES (
        share_id_param,
        activity_type_param,
        performed_by_param,
        COALESCE(user_name, 'Unknown User'),
        user_dept,
        metadata_param
    )
RETURNING id INTO activity_id;
RETURN activity_id;
END;
$$;
ALTER FUNCTION "public"."log_share_activity"(
    "share_id_param" "uuid",
    "activity_type_param" "text",
    "performed_by_param" "uuid",
    "metadata_param" "jsonb"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid" []) RETURNS integer LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_count INTEGER;
BEGIN
UPDATE notifications
SET read = TRUE,
    read_at = NOW()
WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid()::text
RETURNING id INTO v_count;
GET DIAGNOSTICS v_count = ROW_COUNT;
RETURN v_count;
END;
$$;
ALTER FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid" []) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."notify_report_workflow"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_user_id uuid;
v_user_name text;
v_creator_id uuid;
v_dept_reviewers uuid [];
v_template_code text;
v_title text;
v_title_ar text;
v_message text;
v_message_ar text;
v_recipient_id uuid;
v_template RECORD;
BEGIN v_user_id := auth.uid();
SELECT name INTO v_user_name
FROM public.users
WHERE id = v_user_id;
BEGIN IF NEW.submitted_by IS NOT NULL THEN v_creator_id := NEW.submitted_by::uuid;
ELSIF NEW.created_by IS NOT NULL THEN -- Try direct UUID cast
BEGIN v_creator_id := NEW.created_by::uuid;
EXCEPTION
WHEN OTHERS THEN -- created_by is not a UUID, lookup by name/email
SELECT id INTO v_creator_id
FROM public.users
WHERE name = NEW.created_by
    OR email = NEW.created_by
LIMIT 1;
END;
END IF;
EXCEPTION
WHEN OTHERS THEN v_creator_id := NULL;
END;
CASE
    NEW.status
    WHEN 'submitted' THEN -- Get reviewers (use role_module_permissions instead of role_permissions)
    -- FIX: Added public. schema qualification
    SELECT ARRAY_AGG(DISTINCT ur.user_id) INTO v_dept_reviewers
    FROM public.user_roles ur
        JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
    WHERE rmp.module_code = 'forms_reports'
        AND 'review_claim' = ANY(rmp.granted_actions)
        AND ur.user_id != v_user_id;
SELECT * INTO v_template
FROM public.notification_templates
WHERE code = CASE
        WHEN OLD.status = 'rejected' THEN 'report_resubmitted'
        ELSE 'report_submitted_for_review'
    END;
IF v_dept_reviewers IS NOT NULL
AND array_length(v_dept_reviewers, 1) > 0 THEN FOREACH v_recipient_id IN ARRAY v_dept_reviewers LOOP -- FIX: Added public. schema qualification
INSERT INTO public.notifications (
        user_id,
        type,
        category,
        title,
        title_ar,
        message,
        message_ar,
        entity_type,
        entity_id,
        action_url,
        sender_id,
        sender_name
    )
VALUES (
        v_recipient_id,
        COALESCE(v_template.type, 'info'),
        COALESCE(v_template.category, 'approval'),
        replace(
            replace(
                COALESCE(v_template.title_template, 'New Report'),
                '{{report_name}}',
                NEW.name
            ),
            '{{submitter_name}}',
            COALESCE(v_user_name, 'User')
        ),
        replace(
            replace(
                COALESCE(v_template.title_template_ar, 'تقرير جديد'),
                '{{report_name}}',
                NEW.name
            ),
            '{{submitter_name}}',
            COALESCE(v_user_name, 'مستخدم')
        ),
        replace(
            replace(
                COALESCE(
                    v_template.message_template,
                    'New report submitted'
                ),
                '{{report_name}}',
                NEW.name
            ),
            '{{submitter_name}}',
            COALESCE(v_user_name, 'User')
        ),
        replace(
            replace(
                COALESCE(
                    v_template.message_template_ar,
                    'تم إرسال تقرير جديد'
                ),
                '{{report_name}}',
                NEW.name
            ),
            '{{submitter_name}}',
            COALESCE(v_user_name, 'مستخدم')
        ),
        'form_instance',
        NEW.id::text,
        '/reports/view/' || NEW.id::text,
        v_user_id,
        v_user_name
    );
END LOOP;
END IF;
WHEN 'under_review' THEN -- Only notify if we have a valid creator
IF v_creator_id IS NOT NULL THEN -- FIX: Added public. schema qualification
SELECT * INTO v_template
FROM public.notification_templates
WHERE code = 'report_claimed_for_review';
INSERT INTO public.notifications (
        user_id,
        type,
        category,
        title,
        title_ar,
        message,
        message_ar,
        entity_type,
        entity_id,
        action_url,
        sender_id,
        sender_name
    )
VALUES (
        v_creator_id,
        COALESCE(v_template.type, 'info'),
        COALESCE(v_template.category, 'approval'),
        replace(
            replace(
                COALESCE(v_template.title_template, 'Report Under Review'),
                '{{report_name}}',
                NEW.name
            ),
            '{{reviewer_name}}',
            COALESCE(v_user_name, 'Reviewer')
        ),
        replace(
            replace(
                COALESCE(
                    v_template.title_template_ar,
                    'التقرير قيد المراجعة'
                ),
                '{{report_name}}',
                NEW.name
            ),
            '{{reviewer_name}}',
            COALESCE(v_user_name, 'مراجع')
        ),
        replace(
            replace(
                COALESCE(
                    v_template.message_template,
                    'Your report is being reviewed'
                ),
                '{{report_name}}',
                NEW.name
            ),
            '{{reviewer_name}}',
            COALESCE(v_user_name, 'Reviewer')
        ),
        replace(
            replace(
                COALESCE(
                    v_template.message_template_ar,
                    'تقريرك قيد المراجعة'
                ),
                '{{report_name}}',
                NEW.name
            ),
            '{{reviewer_name}}',
            COALESCE(v_user_name, 'مراجع')
        ),
        'form_instance',
        NEW.id::text,
        '/reports/view/' || NEW.id::text,
        v_user_id,
        v_user_name
    );
END IF;
WHEN 'approved' THEN IF v_creator_id IS NOT NULL THEN -- FIX: Added public. schema qualification
SELECT * INTO v_template
FROM public.notification_templates
WHERE code = 'report_approved';
INSERT INTO public.notifications (
        user_id,
        type,
        category,
        title,
        title_ar,
        message,
        message_ar,
        entity_type,
        entity_id,
        action_url,
        sender_id,
        sender_name
    )
VALUES (
        v_creator_id,
        COALESCE(v_template.type, 'success'),
        COALESCE(v_template.category, 'approval'),
        replace(
            replace(
                COALESCE(v_template.title_template, 'Report Approved'),
                '{{report_name}}',
                NEW.name
            ),
            '{{reviewer_name}}',
            COALESCE(v_user_name, 'Reviewer')
        ),
        replace(
            replace(
                COALESCE(
                    v_template.title_template_ar,
                    'تم اعتماد التقرير'
                ),
                '{{report_name}}',
                NEW.name
            ),
            '{{reviewer_name}}',
            COALESCE(v_user_name, 'مراجع')
        ),
        replace(
            replace(
                COALESCE(
                    v_template.message_template,
                    'Your report has been approved'
                ),
                '{{report_name}}',
                NEW.name
            ),
            '{{reviewer_name}}',
            COALESCE(v_user_name, 'Reviewer')
        ),
        replace(
            replace(
                COALESCE(
                    v_template.message_template_ar,
                    'تم اعتماد تقريرك'
                ),
                '{{report_name}}',
                NEW.name
            ),
            '{{reviewer_name}}',
            COALESCE(v_user_name, 'مراجع')
        ),
        'form_instance',
        NEW.id::text,
        '/reports/view/' || NEW.id::text,
        v_user_id,
        v_user_name
    );
END IF;
WHEN 'rejected' THEN IF v_creator_id IS NOT NULL THEN -- FIX: Added public. schema qualification
SELECT * INTO v_template
FROM public.notification_templates
WHERE code = 'report_rejected';
INSERT INTO public.notifications (
        user_id,
        type,
        category,
        title,
        title_ar,
        message,
        message_ar,
        entity_type,
        entity_id,
        action_url,
        sender_id,
        sender_name
    )
VALUES (
        v_creator_id,
        COALESCE(v_template.type, 'warning'),
        COALESCE(v_template.category, 'approval'),
        replace(
            replace(
                replace(
                    COALESCE(v_template.title_template, 'Report Rejected'),
                    '{{report_name}}',
                    NEW.name
                ),
                '{{reviewer_name}}',
                COALESCE(v_user_name, 'Reviewer')
            ),
            '{{rejection_reason}}',
            COALESCE(NEW.last_rejection_reason, 'No reason')
        ),
        replace(
            replace(
                replace(
                    COALESCE(v_template.title_template_ar, 'تم رفض التقرير'),
                    '{{report_name}}',
                    NEW.name
                ),
                '{{reviewer_name}}',
                COALESCE(v_user_name, 'مراجع')
            ),
            '{{rejection_reason}}',
            COALESCE(NEW.last_rejection_reason, 'لم يتم تحديد السبب')
        ),
        replace(
            replace(
                replace(
                    COALESCE(
                        v_template.message_template,
                        'Your report was rejected'
                    ),
                    '{{report_name}}',
                    NEW.name
                ),
                '{{reviewer_name}}',
                COALESCE(v_user_name, 'Reviewer')
            ),
            '{{rejection_reason}}',
            COALESCE(NEW.last_rejection_reason, 'No reason')
        ),
        replace(
            replace(
                replace(
                    COALESCE(v_template.message_template_ar, 'تم رفض تقريرك'),
                    '{{report_name}}',
                    NEW.name
                ),
                '{{reviewer_name}}',
                COALESCE(v_user_name, 'مراجع')
            ),
            '{{rejection_reason}}',
            COALESCE(NEW.last_rejection_reason, 'لم يتم تحديد السبب')
        ),
        'form_instance',
        NEW.id::text,
        '/reports/view/' || NEW.id::text,
        v_user_id,
        v_user_name
    );
END IF;
ELSE -- No notification for other statuses
NULL;
END CASE
;
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN -- Log error but don't fail the transaction
RAISE WARNING 'Notification trigger error: %',
SQLERRM;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."notify_report_workflow"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."prevent_audit_modification"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN IF TG_OP = 'UPDATE' THEN -- For any audit table, allow if only the user reference column is being set to NULL
    -- We check this by comparing the ID (which should never change)
    IF OLD.id = NEW.id THEN -- Check if this looks like a FK SET NULL cascade
    -- Different tables have different user reference columns
    IF TG_TABLE_NAME = 'audit_trail' THEN IF OLD.user_id IS NOT NULL
    AND NEW.user_id IS NULL THEN RETURN NEW;
END IF;
ELSIF TG_TABLE_NAME = 'audit_logs' THEN IF OLD.performed_by IS NOT NULL
AND NEW.performed_by IS NULL THEN RETURN NEW;
END IF;
ELSIF TG_TABLE_NAME = 'permission_audit_log' THEN IF OLD.changed_by IS NOT NULL
AND NEW.changed_by IS NULL THEN RETURN NEW;
END IF;
ELSIF TG_TABLE_NAME = 'relationship_audit_log' THEN IF OLD.changed_by IS NOT NULL
AND NEW.changed_by IS NULL THEN RETURN NEW;
END IF;
END IF;
END IF;
-- All other updates are blocked
RAISE EXCEPTION 'AUDIT IMMUTABILITY VIOLATION: Audit records in table % cannot be modified. Record ID: %',
TG_TABLE_NAME,
OLD.id;
ELSIF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AUDIT IMMUTABILITY VIOLATION: Audit records in table % cannot be deleted. Record ID: %',
TG_TABLE_NAME,
OLD.id;
END IF;
RETURN NULL;
END;
$$;
ALTER FUNCTION "public"."prevent_audit_modification"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."prevent_audit_modification"() IS 'Prevents UPDATE and DELETE operations on audit tables to ensure compliance and data integrity';
CREATE OR REPLACE FUNCTION "public"."prevent_privilege_escalation"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_assigner_priority INT;
v_target_role_priority INT;
v_is_super_admin BOOLEAN;
v_current_user UUID;
BEGIN v_current_user := auth.uid();
-- Get the assigner's highest priority (lowest number = highest privilege)
SELECT MIN(r.priority) INTO v_assigner_priority
FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = v_current_user
    AND r.is_active = TRUE;
-- Check if assigner is super_admin
SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_current_user
            AND r.code = 'super_admin'
    ) INTO v_is_super_admin;
-- Get the target role's priority
SELECT priority INTO v_target_role_priority
FROM roles
WHERE id = NEW.role_id;
-- Super admin can assign any role
IF v_is_super_admin THEN RETURN NEW;
END IF;
-- Fail-safe: if we can't determine priority, still allow (could be system action)
IF v_assigner_priority IS NULL THEN RETURN NEW;
END IF;
-- Prevent assigning roles with equal or higher privilege
IF v_target_role_priority IS NOT NULL
AND v_target_role_priority <= v_assigner_priority THEN RAISE EXCEPTION 'Cannot assign role with equal or higher privilege than your own (Your priority: %, Target: %)',
v_assigner_priority,
v_target_role_priority;
END IF;
-- Prevent self-elevation (only if not super admin)
IF NEW.user_id = v_current_user
AND v_target_role_priority IS NOT NULL
AND v_target_role_priority < v_assigner_priority THEN RAISE EXCEPTION 'Cannot assign higher privilege roles to yourself';
END IF;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."prevent_privilege_escalation"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."prevent_report_review_history_modification"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN IF TG_OP = 'UPDATE' THEN IF (
        OLD.id = NEW.id
        AND OLD.report_id = NEW.report_id
        AND OLD.action = NEW.action
        AND OLD.from_status IS NOT DISTINCT
        FROM NEW.from_status
            AND OLD.to_status IS NOT DISTINCT
        FROM NEW.to_status
            AND OLD.performed_by_name = NEW.performed_by_name
            AND OLD.performed_at = NEW.performed_at
            AND OLD.checksum = NEW.checksum
            AND NEW.performed_by IS NULL
            AND OLD.performed_by IS NOT NULL
    ) THEN RETURN NEW;
END IF;
END IF;
RAISE EXCEPTION 'AUDIT_IMMUTABILITY_VIOLATION: Report review history cannot be modified or deleted. Action: %, Record ID: %',
TG_OP,
CASE
    WHEN TG_OP = 'DELETE' THEN OLD.id::text
    ELSE NEW.id::text
END;
END;
$$;
ALTER FUNCTION "public"."prevent_report_review_history_modification"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."protect_access_management_availability"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$
DECLARE v_remaining_admins bigint;
v_is_revoking_edit boolean;
v_target_module text;
BEGIN -- [REMOVED BYPASS CHECK]
v_target_module := COALESCE(OLD.module_code, NEW.module_code);
IF v_target_module = 'access_management' THEN -- Check if 'edit' is being revoked
IF TG_OP = 'DELETE' THEN v_is_revoking_edit := true;
ELSIF TG_OP = 'UPDATE' THEN v_is_revoking_edit := ('edit' = ANY(OLD.granted_actions))
AND NOT ('edit' = ANY(NEW.granted_actions));
ELSE v_is_revoking_edit := false;
END IF;
IF v_is_revoking_edit THEN -- Count OTHER roles that still have 'edit'
SELECT COUNT(*) INTO v_remaining_admins
FROM public.role_module_permissions
WHERE module_code = 'access_management'
    AND 'edit' = ANY(granted_actions)
    AND role_id != OLD.role_id;
IF v_remaining_admins < 1 THEN RAISE EXCEPTION 'SAFETY LOCK: Cannot revoke "Access Management" permission. This is the last role with access! (Last Man Standing)';
END IF;
END IF;
END IF;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."protect_access_management_availability"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."protect_locked_roles"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN IF OLD.is_locked = true
    AND TG_OP IN ('UPDATE', 'DELETE') THEN IF TG_OP = 'UPDATE'
    AND OLD.name = NEW.name
    AND OLD.priority = NEW.priority THEN RETURN NEW;
END IF;
RAISE EXCEPTION 'Cannot modify locked role: %',
OLD.name;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."protect_locked_roles"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."protect_super_admin_access"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$
DECLARE v_role_id uuid := '56db3e4f-c527-4eab-afea-eed426975fb7';
BEGIN IF current_setting('app.bypass_safety_check', true) = 'on' THEN RETURN NEW;
END IF;
IF COALESCE(OLD.role_id, NEW.role_id) = v_role_id
AND COALESCE(OLD.module_code, NEW.module_code) = 'access_management' THEN IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'SAFETY LOCK: Cannot revoke "Access Management" from Super Admin.';
END IF;
IF TG_OP = 'UPDATE'
OR TG_OP = 'INSERT' THEN IF NOT 'edit' = ANY(NEW.granted_actions) THEN RAISE EXCEPTION 'SAFETY LOCK: Cannot remove "Edit" permission for "Access Management" from Super Admin.';
END IF;
END IF;
END IF;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."protect_super_admin_access"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."protect_system_roles"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN -- Allow updates if only updating non-protected fields
    IF TG_OP = 'UPDATE' THEN IF OLD.is_system = true THEN -- Allow updating these fields even on system roles
    IF OLD.name = NEW.name
    AND OLD.is_system = NEW.is_system
    AND OLD.is_locked = NEW.is_locked THEN RETURN NEW;
END IF;
RAISE EXCEPTION 'Cannot modify protected fields on system role: %',
OLD.name;
END IF;
END IF;
IF TG_OP = 'DELETE'
AND OLD.is_system = true THEN RAISE EXCEPTION 'Cannot delete system role: %',
OLD.name;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."protect_system_roles"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."safe_drop_policy"("p_policy_name" "text", "p_table_name" "text") RETURNS "void" LANGUAGE "plpgsql" AS $$ BEGIN IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = p_table_name
    ) THEN EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        p_policy_name,
        p_table_name
    );
END IF;
END;
$$;
ALTER FUNCTION "public"."safe_drop_policy"("p_policy_name" "text", "p_table_name" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."safe_grant_permission"("p_role_id" "uuid", "p_permission" "text") RETURNS TABLE("granted_permission" "text", "was_new" boolean) LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_required TEXT [];
v_all_to_grant TEXT [];
v_perm TEXT;
v_was_new BOOLEAN;
v_hierarchy JSONB;
BEGIN -- Define permission requirements (what is required for each permission)
v_hierarchy := '{
        "explorer.create": ["explorer.view"],
        "explorer.update": ["explorer.view"],
        "explorer.delete": ["explorer.update", "explorer.view"],
        "explorer.move": ["explorer.update", "explorer.view"],
        
        "ncr.create": ["ncr.view_own"],
        "ncr.assign": ["ncr.view_all"],
        "ncr.root_cause": ["ncr.view_own"],
        "ncr.corrective_action": ["ncr.view_own"],
        "ncr.preventive_action": ["ncr.view_own"],
        "ncr.approve": ["ncr.view_all"],
        "ncr.close": ["ncr.approve", "ncr.view_all"],
        "ncr.reopen": ["ncr.view_all"],
        "ncr.delete": ["ncr.view_all"],
        "ncr.export": ["ncr.view_all"],
        
        "lab.request_test": ["lab.view"],
        "lab.assign_test": ["lab.view"],
        "lab.start_test": ["lab.view"],
        "lab.enter_results": ["lab.start_test", "lab.view"],
        "lab.approve_results": ["lab.enter_results", "lab.view"],
        "lab.reject_results": ["lab.view"],
        "lab.manage_criteria": ["lab.view"],
        "lab.manage_equipment": ["lab.view"],
        "lab.view_coa": ["lab.view"],
        
        "forms.create_template": ["forms.view_own"],
        "forms.edit_template": ["forms.create_template", "forms.view_own"],
        "forms.delete_template": ["forms.edit_template", "forms.view_own"],
        "forms.fill_form": ["forms.view_own"],
        "forms.approve": ["forms.view_all", "forms.view_own"],
        "forms.export": ["forms.view_own"],
        
        "tasks.create": ["tasks.view_own"],
        "tasks.assign": ["tasks.view_dept", "tasks.view_own"],
        "tasks.complete": ["tasks.view_own"],
        "tasks.verify": ["tasks.view_dept", "tasks.view_own"],
        "tasks.delete": ["tasks.verify", "tasks.view_dept"],
        
        "users.create": ["users.view"],
        "users.edit": ["users.view"],
        "users.delete": ["users.edit", "users.view"],
        "users.assign_roles": ["users.view"],
        "users.reset_password": ["users.edit", "users.view"],
        
        "settings.edit_general": ["settings.view"],
        "settings.manage_departments": ["settings.view"],
        "settings.manage_permissions": ["settings.view"],
        "settings.manage_companies": ["settings.view"],
        "settings.backup": ["settings.view"],
        "settings.integrations": ["settings.view"]
    }'::JSONB;
-- Get all required permissions recursively
v_all_to_grant := ARRAY [p_permission];
-- Simple loop to get requirements (max 5 levels deep)
FOR i IN 1..5 LOOP
DECLARE v_new_reqs TEXT [] := ARRAY []::TEXT [];
BEGIN FOREACH v_perm IN ARRAY v_all_to_grant LOOP IF v_hierarchy ? v_perm THEN v_new_reqs := v_new_reqs || ARRAY(
    SELECT jsonb_array_elements_text(v_hierarchy->v_perm)
);
END IF;
END LOOP;
-- Exit if no new requirements found
IF array_length(v_new_reqs, 1) IS NULL THEN EXIT;
END IF;
v_all_to_grant := v_all_to_grant || v_new_reqs;
END;
END LOOP;
-- Remove duplicates
v_all_to_grant := ARRAY(
    SELECT DISTINCT unnest(v_all_to_grant)
);
-- Grant each permission
FOREACH v_perm IN ARRAY v_all_to_grant LOOP -- Check if already exists
SELECT NOT EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role_id = p_role_id
            AND permission_code = v_perm
    ) INTO v_was_new;
-- Insert if new
IF v_was_new THEN
INSERT INTO role_permissions (role_id, permission_code)
VALUES (p_role_id, v_perm) ON CONFLICT (role_id, permission_code) DO NOTHING;
END IF;
granted_permission := v_perm;
was_new := v_was_new;
RETURN NEXT;
END LOOP;
RETURN;
END;
$$;
ALTER FUNCTION "public"."safe_grant_permission"("p_role_id" "uuid", "p_permission" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_company_context"(
        "p_company_id" "uuid",
        "p_user_role" "text" DEFAULT 'user'::"text"
    ) RETURNS "void" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN PERFORM set_config('app.company_id', p_company_id::text, false);
PERFORM set_config('app.user_role', p_user_role, false);
END;
$$;
ALTER FUNCTION "public"."set_company_context"("p_company_id" "uuid", "p_user_role" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."sync_user_all_roles"("p_user_id" "uuid") RETURNS TABLE("role_code" "text", "synced" boolean) LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_role_codes text [];
v_role_code text;
v_synced boolean;
BEGIN -- Get current roles from users table
SELECT roles INTO v_role_codes
FROM users
WHERE id = p_user_id;
IF v_role_codes IS NULL
OR array_length(v_role_codes, 1) IS NULL THEN RAISE NOTICE 'No roles to sync for user %',
p_user_id;
RETURN;
END IF;
FOREACH v_role_code IN ARRAY v_role_codes LOOP v_synced := sync_user_single_role(p_user_id, v_role_code);
role_code := v_role_code;
synced := v_synced;
RETURN NEXT;
END LOOP;
RETURN;
END;
$$;
ALTER FUNCTION "public"."sync_user_all_roles"("p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."sync_user_single_role"("p_user_id" "uuid", "p_role_code" "text") RETURNS boolean LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_role_id uuid;
v_synced boolean := false;
BEGIN -- Get role ID from code
SELECT id INTO v_role_id
FROM roles
WHERE code = p_role_code;
IF v_role_id IS NULL THEN RAISE NOTICE 'Role "%" not found',
p_role_code;
RETURN false;
END IF;
INSERT INTO user_roles (user_id, role_id, assigned_at)
VALUES (p_user_id, v_role_id, NOW()) ON CONFLICT (user_id, role_id) DO NOTHING;
SELECT EXISTS(
        SELECT 1
        FROM user_roles
        WHERE user_id = p_user_id
            AND role_id = v_role_id
    ) INTO v_synced;
RETURN v_synced;
END;
$$;
ALTER FUNCTION "public"."sync_user_single_role"("p_user_id" "uuid", "p_role_code" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."trigger_update_folder_stats_on_instance"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN IF TG_OP = 'INSERT'
    OR TG_OP = 'UPDATE' THEN IF NEW.unified_folder_id IS NOT NULL THEN PERFORM public.update_folder_stats(NEW.unified_folder_id);
END IF;
END IF;
IF TG_OP = 'DELETE' THEN IF OLD.unified_folder_id IS NOT NULL THEN PERFORM public.update_folder_stats(OLD.unified_folder_id);
END IF;
ELSIF TG_OP = 'UPDATE'
AND OLD.unified_folder_id != NEW.unified_folder_id THEN IF OLD.unified_folder_id IS NOT NULL THEN PERFORM public.update_folder_stats(OLD.unified_folder_id);
END IF;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."trigger_update_folder_stats_on_instance"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."trigger_update_folder_stats_on_template"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN IF TG_OP = 'INSERT'
    OR TG_OP = 'UPDATE' THEN IF NEW.unified_folder_id IS NOT NULL THEN PERFORM public.update_folder_stats(NEW.unified_folder_id);
END IF;
END IF;
IF TG_OP = 'DELETE' THEN IF OLD.unified_folder_id IS NOT NULL THEN PERFORM public.update_folder_stats(OLD.unified_folder_id);
END IF;
ELSIF TG_OP = 'UPDATE'
AND OLD.unified_folder_id != NEW.unified_folder_id THEN IF OLD.unified_folder_id IS NOT NULL THEN PERFORM public.update_folder_stats(OLD.unified_folder_id);
END IF;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."trigger_update_folder_stats_on_template"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_content_shares_updated_at"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_content_shares_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_folder_stats"("folder_id_param" "uuid") RETURNS "void" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$
DECLARE forms_count_var integer;
reports_count_var integer;
total_var integer;
BEGIN -- Count forms
SELECT COUNT(*) INTO forms_count_var
FROM public.form_templates
WHERE unified_folder_id = folder_id_param
    AND archived = false;
SELECT COUNT(*) INTO reports_count_var
FROM public.form_instances
WHERE unified_folder_id = folder_id_param
    AND archived = false;
total_var := forms_count_var + reports_count_var;
UPDATE public.unified_folders
SET stats = jsonb_build_object(
        'total_items',
        total_var,
        'forms_count',
        forms_count_var,
        'reports_count',
        reports_count_var,
        'last_activity',
        now()
    ),
    updated_at = now()
WHERE id = folder_id_param;
END;
$$;
ALTER FUNCTION "public"."update_folder_stats"("folder_id_param" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_overdue_tasks"() RETURNS "void" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN
UPDATE tasks
SET status = 'overdue',
    updated_at = NOW()
WHERE due_date < CURRENT_DATE
    AND status IN ('pending', 'in_progress')
    AND status != 'overdue';
END;
$$;
ALTER FUNCTION "public"."update_overdue_tasks"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_recipes_updated_at"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_recipes_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_settings_timestamp"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_settings_timestamp"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_stage_timestamp"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_stage_timestamp"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_unified_folders_path"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN IF NEW.parent_id IS NULL THEN NEW.path = '/' || NEW.id::text;
NEW.depth = 0;
ELSE
SELECT path || '/' || NEW.id::text,
    depth + 1 INTO NEW.path,
    NEW.depth
FROM public.unified_folders
WHERE id = NEW.parent_id;
END IF;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_unified_folders_path"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_unified_folders_updated_at"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_unified_folders_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger" LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_with_optimistic_lock"(
        "p_table_name" "text",
        "p_id" "uuid",
        "p_expected_version" integer,
        "p_updates" "jsonb"
    ) RETURNS "jsonb" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $_$
DECLARE v_current_version INTEGER;
v_result JSONB;
v_query TEXT;
v_set_clause TEXT;
v_key TEXT;
v_value TEXT;
BEGIN -- Get current version
EXECUTE format(
    'SELECT version FROM %I WHERE id = $1',
    p_table_name
) INTO v_current_version USING p_id;
-- Check for version mismatch
IF v_current_version IS NULL THEN RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'ENTITY_NOT_FOUND',
    'message',
    'Entity not found'
);
END IF;
IF v_current_version != p_expected_version THEN RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'VERSION_CONFLICT',
    'message',
    'Entity was modified by another user',
    'currentVersion',
    v_current_version,
    'expectedVersion',
    p_expected_version
);
END IF;
-- Build SET clause from updates
v_set_clause := '';
FOR v_key,
v_value IN
SELECT *
FROM jsonb_each_text(p_updates) LOOP IF v_set_clause != '' THEN v_set_clause := v_set_clause || ', ';
END IF;
v_set_clause := v_set_clause || format('%I = %L', v_key, v_value);
END LOOP;
-- Execute update
v_query := format(
    'UPDATE %I SET %s WHERE id = $1 AND version = $2 RETURNING to_jsonb(%I.*)',
    p_table_name,
    v_set_clause,
    p_table_name
);
EXECUTE v_query INTO v_result USING p_id,
p_expected_version;
IF v_result IS NULL THEN -- Race condition - version changed between check and update
RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'VERSION_CONFLICT',
    'message',
    'Entity was modified by another user (race condition)'
);
END IF;
RETURN jsonb_build_object(
    'success',
    true,
    'data',
    v_result
);
END;
$_$;
ALTER FUNCTION "public"."update_with_optimistic_lock"(
    "p_table_name" "text",
    "p_id" "uuid",
    "p_expected_version" integer,
    "p_updates" "jsonb"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission_code" "text") RETURNS boolean LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_has_permission BOOLEAN := FALSE;
v_is_admin BOOLEAN := FALSE;
BEGIN -- Check if user is admin or super_admin
SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
            AND r.code IN ('admin', 'super_admin', 'super-admin')
    ) INTO v_is_admin;
IF v_is_admin THEN RETURN TRUE;
END IF;
SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
            JOIN role_permissions rp ON rp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
            AND (
                rp.permission_code = p_permission_code
                OR rp.permission_code = split_part(p_permission_code, '.', 1) || '.*'
            )
    ) INTO v_has_permission;
RETURN v_has_permission;
EXCEPTION
WHEN OTHERS THEN -- SECURE: Log and deny on error (was returning TRUE!)
RAISE LOG 'Permission check failed for user %: %',
p_user_id,
SQLERRM;
RETURN FALSE;
END;
$$;
ALTER FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission_code" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."validate_department_module_access_change"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_user_email TEXT;
v_user_roles TEXT [];
v_has_permission BOOLEAN;
v_affected_dept_name TEXT;
v_affected_module TEXT;
BEGIN v_has_permission := check_matrix_permission(auth.uid(), 'settings', 'manage_permissions');
IF NOT v_has_permission THEN
SELECT email INTO v_user_email
FROM users
WHERE id = auth.uid();
SELECT ARRAY_AGG(r.name) INTO v_user_roles
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = auth.uid();
SELECT name INTO v_affected_dept_name
FROM departments
WHERE id = COALESCE(NEW.department_id, OLD.department_id);
v_affected_module := COALESCE(NEW.module_code, OLD.module_code);
RAISE EXCEPTION 'PERMISSION_DENIED: Cannot modify department_module_access for department "%" on module "%". User "%" with roles [%] does not have "settings.manage_permissions" in the Permission Matrix.',
v_affected_dept_name,
v_affected_module,
COALESCE(v_user_email, 'unknown'),
COALESCE(array_to_string(v_user_roles, ', '), 'none') USING ERRCODE = 'insufficient_privilege';
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."validate_department_module_access_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."validate_report_transition"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE v_user_id uuid;
v_transition_key text;
v_required_action text;
v_has_permission boolean;
v_user_record RECORD;
BEGIN v_user_id := auth.uid();
IF v_user_id IS NULL THEN RETURN NEW;
END IF;
IF OLD.status IS NOT DISTINCT
FROM NEW.status THEN RETURN NEW;
END IF;
v_transition_key := OLD.status || '->' || NEW.status;
v_required_action := CASE
    v_transition_key
    WHEN 'draft->submitted' THEN 'submit'
    WHEN 'in_progress->submitted' THEN 'submit'
    WHEN 'submitted->under_review' THEN 'review_claim'
    WHEN 'under_review->approved' THEN 'review_approve'
    WHEN 'under_review->rejected' THEN 'review_reject'
    WHEN 'rejected->submitted' THEN 'submit'
    WHEN 'approved->submitted' THEN 'reopen'
    WHEN 'approved->archived' THEN 'archive'
    ELSE NULL
END;
IF v_required_action IS NULL THEN RAISE EXCEPTION 'INVALID_TRANSITION: Cannot transition from "%" to "%". Transition key: %',
OLD.status,
NEW.status,
v_transition_key;
END IF;
SELECT EXISTS (
        SELECT 1
        FROM public.role_module_permissions rmp
            JOIN public.user_roles ur ON ur.role_id = rmp.role_id
        WHERE ur.user_id = v_user_id
            AND rmp.module_code = 'forms_reports'
            AND v_required_action = ANY(rmp.granted_actions)
    ) INTO v_has_permission;
IF NOT v_has_permission THEN RAISE EXCEPTION 'PERMISSION_DENIED: Transition from "%" to "%" requires action "%" in forms_reports module',
OLD.status,
NEW.status,
v_required_action;
END IF;
SELECT name,
    email,
    title INTO v_user_record
FROM public.users
WHERE id = v_user_id;
CASE
    NEW.status
    WHEN 'submitted' THEN NEW.is_locked := true;
NEW.locked_at := now();
NEW.locked_by := v_user_id;
NEW.submitted_at := COALESCE(NEW.submitted_at, now());
NEW.submitted_by := v_user_id;
IF OLD.status = 'rejected' THEN NEW.review_status := 'pending';
NEW.reviewer_id := NULL;
NEW.reviewer_name := NULL;
ELSE NEW.review_status := 'pending';
END IF;
WHEN 'under_review' THEN NEW.is_locked := true;
NEW.reviewer_id := v_user_id;
NEW.reviewer_name := v_user_record.name;
NEW.review_status := 'under_review';
WHEN 'approved' THEN NEW.is_locked := true;
NEW.reviewed_at := now();
NEW.review_status := 'approved';
WHEN 'rejected' THEN NEW.is_locked := false;
NEW.reviewed_at := now();
NEW.review_status := 'rejected';
NEW.rejection_count := COALESCE(OLD.rejection_count, 0) + 1;
WHEN 'archived' THEN NEW.is_locked := true;
NEW.archived := true;
NEW.archived_at := now();
NEW.archived_by := v_user_id;
END CASE
;
NEW.workflow_history := COALESCE(OLD.workflow_history, '[]'::jsonb) || jsonb_build_object(
    'from',
    OLD.status,
    'to',
    NEW.status,
    'by',
    v_user_id,
    'by_name',
    v_user_record.name,
    'at',
    now()
);
INSERT INTO public.report_review_history (
        report_id,
        action,
        from_status,
        to_status,
        performed_by,
        performed_by_name,
        performed_by_email,
        performed_by_role,
        notes,
        checksum
    )
VALUES (
        NEW.id,
        CASE
            NEW.status
            WHEN 'submitted' THEN CASE
                WHEN OLD.status = 'rejected' THEN 'resubmitted'
                ELSE 'submitted'
            END
            WHEN 'under_review' THEN 'claimed'
            WHEN 'approved' THEN 'approved'
            WHEN 'rejected' THEN 'rejected'
            WHEN 'archived' THEN 'archived'
            ELSE 'submitted'
        END,
        OLD.status,
        NEW.status,
        v_user_id,
        v_user_record.name,
        v_user_record.email,
        v_user_record.title,
        NEW.review_notes,
        public.generate_review_history_checksum(NEW.id, NEW.status, v_user_id, now())
    );
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN -- Re-raise the exception (don't swallow it)
RAISE;
END;
$$;
ALTER FUNCTION "public"."validate_report_transition"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."validate_role_module_permissions_change"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_user_email TEXT;
v_user_roles TEXT [];
v_has_permission BOOLEAN;
v_affected_role_name TEXT;
v_affected_module TEXT;
BEGIN -- [BYPASS CHECK]
IF current_setting('app.bypass_permission_check', true) = 'on' THEN RETURN NEW;
END IF;
v_has_permission := check_matrix_permission(auth.uid(), 'access_management', 'edit');
IF NOT v_has_permission THEN
SELECT email INTO v_user_email
FROM users
WHERE id = auth.uid();
SELECT ARRAY_AGG(r.name) INTO v_user_roles
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = auth.uid();
SELECT name INTO v_affected_role_name
FROM roles
WHERE id = COALESCE(NEW.role_id, OLD.role_id);
v_affected_module := COALESCE(NEW.module_code, OLD.module_code);
RAISE EXCEPTION 'PERMISSION_DENIED: User "%" (%) needs "edit" on "Access Management".',
COALESCE(v_user_email, 'unknown'),
COALESCE(array_to_string(v_user_roles, ', '), 'none') USING ERRCODE = 'insufficient_privilege';
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."validate_role_module_permissions_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."validate_role_permissions_change"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_user_email TEXT;
v_user_roles TEXT [];
v_has_permission BOOLEAN;
BEGIN -- Check if user has admin permission
v_has_permission := check_matrix_permission(auth.uid(), 'settings', 'manage_permissions');
IF NOT v_has_permission THEN -- Get user info for error message
SELECT email INTO v_user_email
FROM users
WHERE id = auth.uid();
SELECT ARRAY_AGG(r.name) INTO v_user_roles
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = auth.uid();
RAISE EXCEPTION 'PERMISSION_DENIED: Cannot modify role_permissions. User "%" with roles [%] does not have "settings.manage_permissions" in the Permission Matrix. Only users with matrix admin permission can modify role permissions.',
COALESCE(v_user_email, 'unknown'),
COALESCE(array_to_string(v_user_roles, ', '), 'none') USING ERRCODE = 'insufficient_privilege';
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."validate_role_permissions_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."validate_roles_change"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_user_email TEXT;
v_user_roles TEXT [];
v_has_permission BOOLEAN;
v_role_name TEXT;
BEGIN v_has_permission := check_matrix_permission(auth.uid(), 'settings', 'manage_permissions');
IF NOT v_has_permission THEN
SELECT email INTO v_user_email
FROM users
WHERE id = auth.uid();
SELECT ARRAY_AGG(r.name) INTO v_user_roles
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = auth.uid();
v_role_name := COALESCE(NEW.name, OLD.name);
RAISE EXCEPTION 'PERMISSION_DENIED: Cannot modify role "%". User "%" with roles [%] does not have "settings.manage_permissions" in the Permission Matrix.',
v_role_name,
COALESCE(v_user_email, 'unknown'),
COALESCE(array_to_string(v_user_roles, ', '), 'none') USING ERRCODE = 'insufficient_privilege';
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."validate_roles_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."validate_supplier_for_material"(
        "p_raw_material_id" "uuid",
        "p_supplier_id" "uuid",
        "p_company_id" "uuid"
    ) RETURNS boolean LANGUAGE "plpgsql"
SET "search_path" TO '' AS $$
DECLARE is_valid BOOLEAN;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM raw_material_suppliers rms
        WHERE rms.raw_material_id = p_raw_material_id
            AND rms.supplier_id = p_supplier_id
            AND rms.company_id = p_company_id
            AND rms.active = TRUE
            AND rms.approval_status = 'approved'
    ) INTO is_valid;
RETURN is_valid;
END;
$$;
ALTER FUNCTION "public"."validate_supplier_for_material"(
    "p_raw_material_id" "uuid",
    "p_supplier_id" "uuid",
    "p_company_id" "uuid"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."validate_user_roles_change"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE v_user_email TEXT;
v_user_roles TEXT [];
v_has_permission BOOLEAN;
v_affected_user_email TEXT;
v_assigned_role_name TEXT;
BEGIN v_has_permission := check_matrix_permission(auth.uid(), 'settings', 'manage_permissions');
IF NOT v_has_permission THEN
SELECT email INTO v_user_email
FROM users
WHERE id = auth.uid();
SELECT ARRAY_AGG(r.name) INTO v_user_roles
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = auth.uid();
SELECT email INTO v_affected_user_email
FROM users
WHERE id = COALESCE(NEW.user_id, OLD.user_id);
SELECT name INTO v_assigned_role_name
FROM roles
WHERE id = COALESCE(NEW.role_id, OLD.role_id);
RAISE EXCEPTION 'PERMISSION_DENIED: Cannot assign role "%" to user "%". User "%" with roles [%] does not have "settings.manage_permissions" in the Permission Matrix.',
v_assigned_role_name,
v_affected_user_email,
COALESCE(v_user_email, 'unknown'),
COALESCE(array_to_string(v_user_roles, ', '), 'none') USING ERRCODE = 'insufficient_privilege';
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."validate_user_roles_change"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."verify_audit_trail_integrity"(
        "p_entity_type" "text" DEFAULT NULL::"text",
        "p_entity_id" "text" DEFAULT NULL::"text"
    ) RETURNS TABLE(
        "audit_id" "uuid",
        "audit_entity_type" "text",
        "audit_entity_id" "text",
        "event_timestamp" timestamp with time zone,
        "stored_checksum" "text",
        "calculated_checksum" "text",
        "is_valid" boolean,
        "chain_valid" boolean
    ) LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$
DECLARE r RECORD;
v_calculated TEXT;
v_prev_checksum TEXT;
v_expected_prev TEXT;
BEGIN FOR r IN
SELECT *
FROM audit_trail at
WHERE (
        p_entity_type IS NULL
        OR at.entity_type = p_entity_type
    )
    AND (
        p_entity_id IS NULL
        OR at.entity_id = p_entity_id
    )
ORDER BY at.entity_type,
    at.entity_id,
    at.timestamp LOOP -- Calculate expected checksum
    v_calculated := calculate_audit_checksum(
        r.action,
        r.entity_type,
        r.entity_id,
        r.user_id,
        r.timestamp,
        r.old_values,
        r.new_values,
        r.previous_checksum
    );
-- Get actual previous record's checksum
SELECT at2.checksum INTO v_expected_prev
FROM audit_trail at2
WHERE at2.entity_type = r.entity_type
    AND at2.entity_id = r.entity_id
    AND at2.timestamp < r.timestamp
ORDER BY at2.timestamp DESC
LIMIT 1;
audit_id := r.id;
audit_entity_type := r.entity_type;
audit_entity_id := r.entity_id;
event_timestamp := r.timestamp;
stored_checksum := r.checksum;
calculated_checksum := v_calculated;
is_valid := (r.checksum = v_calculated);
chain_valid := (
    r.previous_checksum IS NULL
    AND v_expected_prev IS NULL
)
OR (r.previous_checksum = v_expected_prev);
RETURN NEXT;
END LOOP;
END;
$$;
ALTER FUNCTION "public"."verify_audit_trail_integrity"("p_entity_type" "text", "p_entity_id" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."verify_user_has_permissions"("p_user_id" "uuid") RETURNS TABLE(
        "check_name" "text",
        "result" boolean,
        "details" "text"
    ) LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO '' AS $$ BEGIN -- Check 1: User has roles
    RETURN QUERY
SELECT 'has_roles'::text,
    EXISTS(
        SELECT 1
        FROM user_roles
        WHERE user_id = p_user_id
    ),
    COALESCE(
        (
            SELECT COUNT(*)::text || ' role(s)'
            FROM user_roles
            WHERE user_id = p_user_id
        ),
        '0 roles'
    );
RETURN QUERY
SELECT 'roles_have_permissions'::text,
    EXISTS(
        SELECT 1
        FROM user_roles ur
            JOIN role_module_permissions rmp ON rmp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
            AND array_length(rmp.granted_actions, 1) > 0
    ),
    COALESCE(
        (
            SELECT COUNT(DISTINCT rmp.module_code)::text || ' module(s)'
            FROM user_roles ur
                JOIN role_module_permissions rmp ON rmp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
        ),
        '0 modules'
    );
RETURN QUERY
SELECT 'rpc_returns_permissions'::text,
    EXISTS(
        SELECT 1
        FROM get_user_module_permissions(p_user_id)
    ),
    COALESCE(
        (
            SELECT COUNT(*)::text || ' permission(s)'
            FROM get_user_module_permissions(p_user_id)
        ),
        '0 permissions'
    );
END;
$$;
ALTER FUNCTION "public"."verify_user_has_permissions"("p_user_id" "uuid") OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."_backup_permission_matrix" (
    "id" "uuid",
    "role" "uuid",
    "permissions" "jsonb",
    "updated_at" timestamp with time zone
);
ALTER TABLE "public"."_backup_permission_matrix" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."_backup_report_folders" (
    "id" "uuid",
    "name" "text",
    "name_en" "text",
    "description" "text",
    "icon" "text",
    "color" "text",
    "parent_id" "uuid",
    "path" "text",
    "sort_order" integer,
    "created_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_at" timestamp with time zone,
    "company_id" "uuid",
    "is_system" boolean,
    "metadata" "jsonb",
    "archived" boolean,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "version" integer,
    "last_modified_by" "uuid"
);
ALTER TABLE "public"."_backup_report_folders" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."_backup_template_folders" (
    "id" "uuid",
    "name" "text",
    "name_en" "text",
    "description" "text",
    "icon" "text",
    "color" "text",
    "parent_id" "uuid",
    "path" "text",
    "sort_order" integer,
    "created_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_at" timestamp with time zone,
    "company_id" "uuid",
    "is_system" boolean,
    "metadata" "jsonb",
    "archived" boolean,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "version" integer,
    "last_modified_by" "uuid"
);
ALTER TABLE "public"."_backup_template_folders" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "name_ar" "text",
    "description" "text",
    "description_ar" "text",
    "color" "text" DEFAULT '#6B7280'::"text",
    "priority" integer DEFAULT 100,
    "is_system" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "code" "text",
    "company_id" "uuid" NOT NULL,
    "department" "text",
    "department_ar" "text",
    "is_locked" boolean DEFAULT false,
    "min_edit_priority" integer DEFAULT 100,
    "is_deprecated" boolean DEFAULT false,
    "deprecated_at" timestamp with time zone,
    "replacement_role_id" "uuid",
    "deprecation_message" "text",
    "category" "text" DEFAULT 'general'::"text",
    "type" "text" DEFAULT 'custom'::"text",
    "icon" "text" DEFAULT 'Shield'::"text",
    "version" integer DEFAULT 1 NOT NULL
);
ALTER TABLE "public"."roles" OWNER TO "postgres";
COMMENT ON TABLE "public"."roles" IS 'Standard factory roles for QMS system';
CREATE TABLE IF NOT EXISTS "public"."user_temp_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "starts_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "reason" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."user_temp_roles" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."active_user_temp_roles" WITH ("security_invoker" = 'true') AS
SELECT "utr"."id",
    "utr"."user_id",
    "u"."email" AS "user_email",
    ("u"."raw_user_meta_data"->>'full_name'::"text") AS "user_name",
    "utr"."role_id",
    "r"."name" AS "role_name",
    "r"."name_ar" AS "role_name_ar",
    "r"."color" AS "role_color",
    "utr"."starts_at",
    "utr"."expires_at",
    "utr"."reason",
    "utr"."assigned_by",
    "utr"."created_at",
    CASE
        WHEN ("utr"."expires_at" IS NULL) THEN 'permanent'::"text"
        WHEN ("utr"."expires_at" > "now"()) THEN 'active'::"text"
        ELSE 'expired'::"text"
    END AS "status"
FROM (
        (
            "public"."user_temp_roles" "utr"
            JOIN "auth"."users" "u" ON (("u"."id" = "utr"."user_id"))
        )
        JOIN "public"."roles" "r" ON (("r"."id" = "utr"."role_id"))
    )
WHERE ("utr"."is_active" = true);
ALTER VIEW "public"."active_user_temp_roles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."allergen_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_name" "text" NOT NULL,
    "allergens" "jsonb" DEFAULT '[]'::"jsonb",
    "may_contain" "jsonb" DEFAULT '[]'::"jsonb",
    "cross_contact_risk" "text",
    "cleaning_procedure" "text",
    "verified" boolean DEFAULT false,
    "verified_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."allergen_profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."app_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "description" "text",
    "description_ar" "text",
    "icon" "text" DEFAULT 'Box'::"text",
    "color" "text" DEFAULT '#6B7280'::"text",
    "display_order" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "data_isolation_mode" "text" DEFAULT 'shared'::"text",
    "supports_sharing" boolean DEFAULT false,
    "available_actions" "text" [] DEFAULT ARRAY ['view'::"text"],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_module_code" "text",
    "module_type" "text" DEFAULT 'core'::"text",
    "is_department_scoped" boolean DEFAULT true,
    CONSTRAINT "app_modules_data_isolation_mode_check" CHECK (
        (
            "data_isolation_mode" = ANY (
                ARRAY ['shared'::"text", 'isolated'::"text", 'hybrid'::"text"]
            )
        )
    ),
    CONSTRAINT "app_modules_module_type_check" CHECK (
        (
            "module_type" = ANY (
                ARRAY ['core'::"text", 'extension'::"text", 'stage'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."app_modules" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "performed_by" "uuid",
    "entity_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."audit_logs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."audit_trail" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "entity_name" "text",
    "user_id" "uuid",
    "user_email" "text",
    "user_name" "text",
    "user_role" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_fields" "text" [],
    "reason" "text",
    "parent_entity_type" "text",
    "parent_entity_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "checksum" "text" NOT NULL,
    "previous_checksum" "text",
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_trail_action_check" CHECK (
        (
            "action" = ANY (
                ARRAY ['CREATE'::"text", 'UPDATE'::"text", 'DELETE'::"text", 'RESTORE'::"text", 'ARCHIVE'::"text", 'UNARCHIVE'::"text", 'MOVE'::"text", 'COPY'::"text", 'APPROVE'::"text", 'REJECT'::"text", 'SUBMIT'::"text", 'SIGN'::"text", 'LOGIN'::"text", 'LOGOUT'::"text", 'PERMISSION_CHANGE'::"text"]
            )
        )
    ),
    CONSTRAINT "audit_trail_entity_type_check" CHECK (
        (
            "entity_type" = ANY (
                ARRAY ['folder'::"text", 'template_folder'::"text", 'report_folder'::"text", 'form_template'::"text", 'form_instance'::"text", 'user'::"text", 'role'::"text", 'permission'::"text", 'ncr'::"text", 'lab_test'::"text", 'material_receiving'::"text", 'raw_material'::"text", 'supplier'::"text", 'product'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."audit_trail" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "color" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."categories" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."cleaning_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "area_id" "uuid",
    "status" "text" DEFAULT 'completed'::"text",
    "checklist_results" "jsonb" DEFAULT '{}'::"jsonb",
    "cleaned_by" "text",
    "verified_by" "text",
    "notes" "text",
    "cleaned_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);
ALTER TABLE "public"."cleaning_records" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "name_en" "text",
    "code" "text",
    "logo_url" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "tax_number" "text",
    "commercial_register" "text",
    "is_active" boolean DEFAULT true,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "version" integer DEFAULT 1 NOT NULL
);
ALTER TABLE "public"."companies" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."content_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "shared_by_user_id" "uuid" NOT NULL,
    "shared_by_department_id" "uuid",
    "share_type" "text" NOT NULL,
    "shared_with_departments" "uuid" [] DEFAULT ARRAY []::"uuid" [],
    "shared_with_users" "uuid" [] DEFAULT ARRAY []::"uuid" [],
    "shared_with_roles" "uuid" [] DEFAULT ARRAY []::"uuid" [],
    "auto_assign_to_new_role_members" boolean DEFAULT true,
    "permission_level" "text" DEFAULT 'view'::"text",
    "custom_permissions" "jsonb" DEFAULT "jsonb_build_object"(
        'can_view',
        true,
        'can_download',
        true,
        'can_comment',
        false,
        'can_edit',
        false,
        'can_delete',
        false,
        'can_share',
        false,
        'can_export',
        true
    ),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "require_password" boolean DEFAULT false,
    "password_hash" "text",
    "max_views" integer,
    "current_views" integer DEFAULT 0,
    "title" "text",
    "note" "text",
    "tags" "text" [],
    "notify_on_access" boolean DEFAULT false,
    "notify_on_edit" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone,
    "access_count" integer DEFAULT 0,
    "stats" "jsonb" DEFAULT "jsonb_build_object"(
        'total_views',
        0,
        'unique_viewers',
        0,
        'comments_count',
        0,
        'edits_count',
        0
    ),
    CONSTRAINT "content_shares_access_count_positive" CHECK (("access_count" >= 0)),
    CONSTRAINT "content_shares_content_type_check" CHECK (
        (
            "content_type" = ANY (
                ARRAY ['folder'::"text", 'form_template'::"text", 'form_instance'::"text", 'report'::"text"]
            )
        )
    ),
    CONSTRAINT "content_shares_current_views_positive" CHECK (("current_views" >= 0)),
    CONSTRAINT "content_shares_max_views_positive" CHECK (
        (
            ("max_views" IS NULL)
            OR ("max_views" > 0)
        )
    ),
    CONSTRAINT "content_shares_permission_level_check" CHECK (
        (
            "permission_level" = ANY (
                ARRAY ['view'::"text", 'comment'::"text", 'edit'::"text", 'full'::"text"]
            )
        )
    ),
    CONSTRAINT "content_shares_share_target_check" CHECK (
        CASE
            "share_type"
            WHEN 'department'::"text" THEN ("cardinality"("shared_with_departments") > 0)
            WHEN 'user'::"text" THEN ("cardinality"("shared_with_users") > 0)
            WHEN 'role'::"text" THEN ("cardinality"("shared_with_roles") > 0)
            WHEN 'public'::"text" THEN true
            ELSE false
        END
    ),
    CONSTRAINT "content_shares_share_type_check" CHECK (
        (
            "share_type" = ANY (
                ARRAY ['department'::"text", 'user'::"text", 'role'::"text", 'public'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."content_shares" OWNER TO "postgres";
COMMENT ON TABLE "public"."content_shares" IS 'Advanced 3-level sharing system (Department/User/Role) for content';
CREATE TABLE IF NOT EXISTS "public"."control_points" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'ccp'::"text",
    "location" "text",
    "critical_limits" "jsonb" DEFAULT '{}'::"jsonb",
    "monitoring_frequency" "text",
    "responsible_person" "text",
    "corrective_actions" "text",
    "verification_methods" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "hazard_type" "text",
    "hazard_description" "text",
    "description" "text"
);
ALTER TABLE "public"."control_points" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."corrective_actions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "monitoring_record_id" "uuid",
    "control_point_id" "uuid",
    "action_taken" "text",
    "product_disposition" "text",
    "cause" "text",
    "preventive_measures" "text",
    "completed_by" "text",
    "completed_at" timestamp with time zone,
    "verified_by" "text",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ncr_id" "uuid",
    "company_id" "uuid",
    "issue_description" "text",
    "issue_type" "text",
    "severity" "text" DEFAULT 'low'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "assigned_to" "text",
    "assigned_to_id" "uuid",
    "due_date" "date",
    "root_cause" "text",
    "preventive_action" "text",
    "created_by" "text",
    "source_type" character varying(20) DEFAULT 'haccp'::character varying,
    CONSTRAINT "ca_severity_check" CHECK (
        (
            "severity" = ANY (
                ARRAY ['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]
            )
        )
    ),
    CONSTRAINT "ca_status_check" CHECK (
        (
            "status" = ANY (
                ARRAY ['open'::"text", 'in_progress'::"text", 'completed'::"text", 'verified'::"text", 'closed'::"text"]
            )
        )
    ),
    CONSTRAINT "chk_source_type" CHECK (
        (
            ("source_type")::"text" = ANY (
                (
                    ARRAY ['haccp'::character varying, 'ncr'::character varying, 'audit'::character varying, 'customer_complaint'::character varying]
                )::"text" []
            )
        )
    )
);
ALTER TABLE "public"."corrective_actions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."department_module_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "department_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "custom_isolation_mode" "text",
    "granted_actions" "text" [] DEFAULT ARRAY ['view'::"text"],
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stage_code" "text",
    "visibility_departments" "uuid" [] DEFAULT '{}'::"uuid" [],
    "last_changed_by" "uuid",
    "last_changed_reason" "text",
    "change_count" integer DEFAULT 0,
    CONSTRAINT "department_module_access_custom_isolation_mode_check" CHECK (
        (
            "custom_isolation_mode" = ANY (
                ARRAY ['shared'::"text", 'isolated'::"text", NULL::"text"]
            )
        )
    )
);
ALTER TABLE "public"."department_module_access" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."department_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "department_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);
ALTER TABLE "public"."department_roles" OWNER TO "postgres";
COMMENT ON TABLE "public"."department_roles" IS 'Links roles to departments for access control';
CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name_en" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name_ar" "text",
    "description_ar" "text",
    "color" "text" DEFAULT '#6B7280'::"text",
    "icon" "text" DEFAULT 'Building2'::"text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 50,
    "parent_department_id" "uuid",
    "manager_user_id" "uuid",
    "created_by" "uuid",
    "updated_by" "uuid",
    "version" integer DEFAULT 1 NOT NULL
);
ALTER TABLE "public"."departments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."document_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_type" "text" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "shared_by" "uuid" NOT NULL,
    "shared_by_department_id" "uuid",
    "shared_with_department_id" "uuid",
    "shared_with_user_id" "uuid",
    "permission_level" "text" DEFAULT 'view'::"text",
    "expires_at" timestamp with time zone,
    "note" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_share_target" CHECK (
        (
            (
                ("shared_with_department_id" IS NOT NULL)
                AND ("shared_with_user_id" IS NULL)
            )
            OR (
                ("shared_with_department_id" IS NULL)
                AND ("shared_with_user_id" IS NOT NULL)
            )
        )
    ),
    CONSTRAINT "document_shares_permission_level_check" CHECK (
        (
            "permission_level" = ANY (
                ARRAY ['view'::"text", 'edit'::"text", 'full'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."document_shares" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'department'::"text",
    "icon" "text",
    "color" "text",
    "parent_id" "uuid",
    "path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "stats" "jsonb" DEFAULT '{}'::"jsonb",
    "name_en" "text",
    "company_id" "uuid",
    "archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" "uuid",
    "department_id" "uuid",
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "is_system" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "description" "text"
);
ALTER TABLE "public"."folders" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."form_instances" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_id" "uuid",
    "folder_id" "uuid",
    "name" "text" NOT NULL,
    "batch_number" "text",
    "batch_info" "jsonb" DEFAULT '{}'::"jsonb",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "submitted_at" timestamp with time zone,
    "submitted_by" "uuid",
    "company_id" "uuid",
    "form_data" "jsonb" DEFAULT '{}'::"jsonb",
    "calculations" "jsonb" DEFAULT '{}'::"jsonb",
    "signatures" "jsonb" DEFAULT '{}'::"jsonb",
    "workflow" "jsonb" DEFAULT '{}'::"jsonb",
    "template_version" "text" DEFAULT '1.0'::"text",
    "report_folder_id" "uuid",
    "archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" "uuid",
    "last_modified_at" timestamp with time zone DEFAULT "now"(),
    "department_id" "uuid",
    "review_status" "text" DEFAULT 'pending'::"text",
    "reviewer_id" "uuid",
    "reviewer_name" "text",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "is_locked" boolean DEFAULT false,
    "locked_at" timestamp with time zone,
    "locked_by" "uuid",
    "rejection_count" integer DEFAULT 0,
    "last_rejection_reason" "text",
    "workflow_history" "jsonb" DEFAULT '[]'::"jsonb",
    "unified_folder_id" "uuid",
    "is_shared" boolean DEFAULT false,
    "share_source_department_id" "uuid",
    CONSTRAINT "form_instances_review_status_check" CHECK (
        (
            "review_status" = ANY (
                ARRAY ['pending'::"text", 'under_review'::"text", 'approved'::"text", 'rejected'::"text"]
            )
        )
    ),
    CONSTRAINT "form_instances_status_check" CHECK (
        (
            "status" = ANY (
                ARRAY ['draft'::"text", 'in_progress'::"text", 'submitted'::"text", 'under_review'::"text", 'approved'::"text", 'rejected'::"text", 'archived'::"text", 'pending'::"text", 'completed'::"text", 'cancelled'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."form_instances" OWNER TO "postgres";
COMMENT ON COLUMN "public"."form_instances"."review_status" IS 'Review workflow status: pending, under_review, approved, rejected';
COMMENT ON COLUMN "public"."form_instances"."is_locked" IS 'Whether the report is locked for editing. True after submission.';
COMMENT ON COLUMN "public"."form_instances"."workflow_history" IS 'JSON array of workflow state transitions for audit purposes';
COMMENT ON COLUMN "public"."form_instances"."unified_folder_id" IS 'Reference to the unified folder containing this instance';
COMMENT ON COLUMN "public"."form_instances"."is_shared" IS 'Indicates if this instance is shared from another department';
COMMENT ON COLUMN "public"."form_instances"."share_source_department_id" IS 'Department that shared this instance';
CREATE TABLE IF NOT EXISTS "public"."form_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "name_en" "text",
    "folder_id" "uuid",
    "table_type" "text" DEFAULT 'samples'::"text",
    "document_control" "jsonb" DEFAULT '{}'::"jsonb",
    "batch_config" "jsonb" DEFAULT '{}'::"jsonb",
    "custom_variables" "jsonb" DEFAULT '{}'::"jsonb",
    "sections" "jsonb" DEFAULT '{}'::"jsonb",
    "quality_criteria" "jsonb" DEFAULT '[]'::"jsonb",
    "signatures" "jsonb" DEFAULT '[]'::"jsonb",
    "important_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'draft'::"text",
    "type" "text" DEFAULT 'form'::"text",
    "template_type_config" "jsonb" DEFAULT '{}'::"jsonb",
    "custom_properties" "jsonb" DEFAULT '{}'::"jsonb",
    "basic_info" "jsonb" DEFAULT '{}'::"jsonb",
    "batch_configuration" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "recipe" "jsonb" DEFAULT '[]'::"jsonb",
    "company_id" "uuid",
    "template_folder_id" "uuid",
    "archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" "uuid",
    "last_modified_at" timestamp with time zone DEFAULT "now"(),
    "department_id" "uuid",
    "unified_folder_id" "uuid",
    "is_shared" boolean DEFAULT false,
    "share_source_department_id" "uuid",
    CONSTRAINT "form_templates_status_check" CHECK (
        (
            "status" = ANY (
                ARRAY ['draft'::"text", 'active'::"text", 'deprecated'::"text", 'archived'::"text", 'published'::"text", 'inactive'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."form_templates" OWNER TO "postgres";
COMMENT ON COLUMN "public"."form_templates"."unified_folder_id" IS 'Reference to the unified folder containing this template';
COMMENT ON COLUMN "public"."form_templates"."is_shared" IS 'Indicates if this template is shared from another department';
COMMENT ON COLUMN "public"."form_templates"."share_source_department_id" IS 'Department that shared this template';
CREATE TABLE IF NOT EXISTS "public"."inspection_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "name_en" "text",
    "test_type" "text" NOT NULL,
    "default_parameters" "jsonb" DEFAULT '[]'::"jsonb",
    "description" "text",
    "is_active" boolean DEFAULT true,
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."inspection_criteria" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."job_title_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_title_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."job_title_roles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."job_titles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "name_en" "text",
    "code" "text",
    "department_id" "uuid",
    "default_role_id" "uuid",
    "description" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."job_titles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."lab_samples" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sample_number" "text" NOT NULL,
    "sample_type" "text" NOT NULL,
    "source_id" "text",
    "source_name" "text" NOT NULL,
    "collected_by" "text" NOT NULL,
    "collected_at" timestamp with time zone NOT NULL,
    "quantity" "text",
    "unit" "text",
    "storage_condition" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);
ALTER TABLE "public"."lab_samples" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."lab_tests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "test_number" "text" NOT NULL,
    "test_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "sample_id" "uuid",
    "sample_data" "jsonb",
    "parameters" "jsonb" DEFAULT '[]'::"jsonb",
    "requested_by" "text" NOT NULL,
    "requested_by_name" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "assigned_to" "text",
    "assigned_to_name" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "approved_by" "text",
    "approved_by_name" "text",
    "approved_at" timestamp with time zone,
    "approval_notes" "text",
    "priority" "text" DEFAULT 'normal'::"text",
    "due_date" timestamp with time zone,
    "notes" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" "uuid",
    "department_id" "uuid",
    CONSTRAINT "lab_tests_priority_check" CHECK (
        (
            "priority" = ANY (
                ARRAY ['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text", 'medium'::"text", 'critical'::"text"]
            )
        )
    ),
    CONSTRAINT "lab_tests_status_check" CHECK (
        (
            "status" = ANY (
                ARRAY ['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'approved'::"text", 'rejected'::"text", 'cancelled'::"text", 'draft'::"text", 'submitted'::"text", 'testing'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."lab_tests" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."material_receiving" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "receiving_number" "text" NOT NULL,
    "material_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "material_name" "text" NOT NULL,
    "material_code" "text",
    "batch_number" "text" NOT NULL,
    "lot_number" "text",
    "supplier_id" "uuid",
    "supplier_name" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "packaging_type" "text",
    "production_date" "date",
    "expiry_date" "date",
    "received_at" timestamp with time zone DEFAULT "now"(),
    "received_by" "text" NOT NULL,
    "received_by_name" "text",
    "delivery_note_number" "text",
    "invoice_number" "text",
    "certificate_of_analysis" "text",
    "inspection_required" boolean DEFAULT true,
    "inspected_by" "text",
    "inspected_at" timestamp with time zone,
    "inspection_notes" "text",
    "lab_test_id" "uuid",
    "lab_test_status" "text",
    "storage_location" "text",
    "storage_condition" "text",
    "accepted_quantity" numeric,
    "rejected_quantity" numeric,
    "rejection_reason" "text",
    "notes" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "raw_material_id" "uuid",
    "test_requirements_snapshot" "jsonb" DEFAULT '[]'::"jsonb",
    "supplier_approval_snapshot" "jsonb" DEFAULT '{}'::"jsonb",
    "vehicle_inspection" "jsonb",
    "initial_test_results" "jsonb",
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" "uuid",
    CONSTRAINT "material_receiving_status_check" CHECK (
        (
            "status" = ANY (
                ARRAY ['pending'::"text", 'inspecting'::"text", 'accepted'::"text", 'rejected'::"text", 'partial'::"text", 'cancelled'::"text", 'in_progress'::"text", 'completed'::"text", 'on_hold'::"text", 'approved'::"text", 'draft'::"text", 'received'::"text", 'stored'::"text", 'released'::"text", 'in_testing'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."material_receiving" OWNER TO "postgres";
COMMENT ON COLUMN "public"."material_receiving"."vehicle_inspection" IS 'فحص سيارة النقل - تخزين بيانات فحص السيارة كـ JSON';
COMMENT ON COLUMN "public"."material_receiving"."initial_test_results" IS 'نتائج الفحص الأولية عند الاستلام';
CREATE TABLE IF NOT EXISTS "public"."module_data_visibility" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_code" "text" NOT NULL,
    "department_id" "uuid",
    "visibility_scope" "text" DEFAULT 'private'::"text" NOT NULL,
    "cross_dept_read_only" boolean DEFAULT true,
    "shared_with_departments" "uuid" [] DEFAULT '{}'::"uuid" [],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "module_data_visibility_visibility_scope_check" CHECK (
        (
            "visibility_scope" = ANY (
                ARRAY ['private'::"text", 'shared'::"text", 'all'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."module_data_visibility" OWNER TO "postgres";
COMMENT ON TABLE "public"."module_data_visibility" IS 'DEPRECATED 2026-01-01: Use visibility_departments in department_module_access instead. Backup: _backup_module_data_visibility_20260101. Will be dropped in Phase 3.';
CREATE TABLE IF NOT EXISTS "public"."module_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_code" "text" NOT NULL,
    "stage_code" "text" NOT NULL,
    "stage_name" "text" NOT NULL,
    "stage_name_ar" "text",
    "description" "text",
    "description_ar" "text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."module_stages" OWNER TO "postgres";
COMMENT ON TABLE "public"."module_stages" IS 'Defines stages within each module for granular permission control';
CREATE TABLE IF NOT EXISTS "public"."monitoring_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "control_point_id" "uuid",
    "value" numeric,
    "unit" "text",
    "status" "text" DEFAULT 'ok'::"text",
    "deviation" boolean DEFAULT false,
    "notes" "text",
    "recorded_by" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);
ALTER TABLE "public"."monitoring_records" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ncr_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ncr_id" "uuid",
    "parent_id" "uuid",
    "content" "text" NOT NULL,
    "author_id" "text",
    "author_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."ncr_comments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ncr_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ncr_number" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "severity" "text" DEFAULT 'minor'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "source" "text",
    "department" "text",
    "product_name" "text",
    "batch_number" "text",
    "quantity_affected" numeric,
    "root_cause" "text",
    "corrective_action" "text",
    "preventive_action" "text",
    "assigned_to" "text",
    "due_date" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "closed_by" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source_department_id" "uuid",
    "target_department_id" "uuid",
    "assigned_to_id" "uuid",
    "created_by_id" "uuid",
    "number" "text",
    "date" "date",
    "shift" "text",
    "line_or_area" "text",
    "reserved_qty" "text",
    "reserved_unit" "text",
    "standard_defect" "text",
    "custom_type" "text",
    "discovered_by" "text",
    "immediate_action" "text",
    "company_id" "uuid",
    "current_stage" "text" DEFAULT 'initial_report'::"text",
    "completed_stages" "jsonb" DEFAULT '[]'::"jsonb",
    "stage_history" "jsonb" DEFAULT '[]'::"jsonb",
    "root_cause_approval" "jsonb",
    "actions" "jsonb" DEFAULT '[]'::"jsonb",
    "holds" "jsonb" DEFAULT '[]'::"jsonb",
    "verification" "jsonb",
    "related_lab_test_id" "uuid",
    "related_lab_test_number" "text",
    "related_material_receiving_id" "uuid",
    "related_material_name" "text",
    "related_batch_number" "text",
    "related_supplier_id" "uuid",
    "related_supplier_name" "text",
    "auto_generated_from_lab" boolean DEFAULT false,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "ncr_reports_severity_check" CHECK (
        (
            "severity" = ANY (
                ARRAY ['minor'::"text", 'major'::"text", 'critical'::"text", 'low'::"text", 'medium'::"text", 'high'::"text"]
            )
        )
    ),
    CONSTRAINT "ncr_reports_status_check" CHECK (
        (
            "status" = ANY (
                ARRAY ['open'::"text", 'in_progress'::"text", 'pending_review'::"text", 'resolved'::"text", 'closed'::"text", 'cancelled'::"text", 'draft'::"text", 'pending'::"text", 'approved'::"text", 'rejected'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."ncr_reports" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ncr_stage_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage_code" "text" NOT NULL,
    "department_id" "uuid",
    "role_id" "uuid",
    "allowed_actions" "text" [] DEFAULT ARRAY ['view'::"text"] NOT NULL,
    "can_advance" boolean DEFAULT false,
    "can_return" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    CONSTRAINT "check_dept_or_role" CHECK (
        (
            (
                ("department_id" IS NOT NULL)
                AND ("role_id" IS NULL)
            )
            OR (
                ("department_id" IS NULL)
                AND ("role_id" IS NOT NULL)
            )
        )
    )
);
ALTER TABLE "public"."ncr_stage_permissions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ncr_workflow_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "description" "text",
    "stage_order" integer NOT NULL,
    "color" "text" DEFAULT '#6B7280'::"text",
    "is_active" boolean DEFAULT true
);
ALTER TABLE "public"."ncr_workflow_stages" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_enabled" boolean DEFAULT true,
    "push_enabled" boolean DEFAULT true,
    "in_app_enabled" boolean DEFAULT true,
    "category_settings" "jsonb" DEFAULT '{"lab": {"push": true, "email": true, "enabled": true}, "ncr": {"push": true, "email": true, "enabled": true}, "task": {"push": true, "email": true, "enabled": true}, "alert": {"push": true, "email": true, "enabled": true}, "system": {"push": true, "email": false, "enabled": true}, "approval": {"push": true, "email": true, "enabled": true}}'::"jsonb",
    "quiet_hours_enabled" boolean DEFAULT false,
    "quiet_hours_start" time without time zone DEFAULT '22:00:00'::time without time zone,
    "quiet_hours_end" time without time zone DEFAULT '07:00:00'::time without time zone,
    "daily_digest_enabled" boolean DEFAULT false,
    "digest_time" time without time zone DEFAULT '08:00:00'::time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";
COMMENT ON TABLE "public"."notification_preferences" IS 'User preferences for notification delivery';
CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_ar" "text",
    "title_template" "text" NOT NULL,
    "title_template_ar" "text",
    "message_template" "text" NOT NULL,
    "message_template_ar" "text",
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "category" "text" DEFAULT 'system'::"text" NOT NULL,
    "default_action_url_template" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."notification_templates" OWNER TO "postgres";
COMMENT ON TABLE "public"."notification_templates" IS 'Templates for generating consistent notifications';
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text",
    "title" "text",
    "message" "text",
    "ncr_id" "uuid",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title_ar" "text",
    "message_ar" "text",
    "category" "text" DEFAULT 'system'::"text",
    "entity_type" "text",
    "entity_id" "uuid",
    "action_url" "text",
    "read_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "sender_id" "uuid",
    "sender_name" "text"
);
ALTER TABLE "public"."notifications" OWNER TO "postgres";
COMMENT ON TABLE "public"."notifications" IS 'User notifications for workflow events and system alerts';
CREATE TABLE IF NOT EXISTS "public"."permission_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "changed_by" "uuid",
    "changed_by_email" "text",
    "target_role_id" "uuid",
    "target_role_name" "text",
    "permission_code" "text" NOT NULL,
    "action" "text" NOT NULL,
    "previous_state" boolean,
    "new_state" boolean,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    "notes" "text",
    "batch_id" "uuid",
    "target_table" "text",
    "target_id" "text",
    "target_user_id" "uuid",
    "target_user_email" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by_roles" "text" [],
    "reason" "text",
    CONSTRAINT "permission_audit_log_action_check" CHECK (
        (
            "action" = ANY (
                ARRAY ['grant'::"text", 'revoke'::"text", 'bulk_grant'::"text", 'bulk_revoke'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."permission_audit_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."permission_hierarchy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "permission_code" "text" NOT NULL,
    "requires_permission" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."permission_hierarchy" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_ar" "text",
    "description" "text",
    "description_ar" "text",
    "category" "text" DEFAULT 'general'::"text",
    "category_ar" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "module" "text"
);
ALTER TABLE "public"."permissions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."pre_op_checks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "area" "text",
    "shift" "text",
    "checklist" "jsonb" DEFAULT '[]'::"jsonb",
    "overall_status" "text" DEFAULT 'pass'::"text",
    "inspector" "text",
    "notes" "text",
    "check_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);
ALTER TABLE "public"."pre_op_checks" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."production_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "name" character varying(255) NOT NULL,
    "name_en" character varying(255),
    "code" character varying(100) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."production_lines" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "production_line_id" "uuid",
    "name" character varying(255) NOT NULL,
    "name_en" character varying(255),
    "sku" character varying(100) NOT NULL,
    "barcode" character varying(100),
    "category" character varying(50) DEFAULT 'other'::character varying,
    "unit" character varying(50) DEFAULT 'قطعة'::character varying,
    "shelf_life_days" integer,
    "storage_conditions" "text",
    "allergens" "text" [],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" "uuid"
);
ALTER TABLE "public"."products" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."raw_material_suppliers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "raw_material_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "company_id" "uuid",
    "is_primary" boolean DEFAULT false,
    "approval_status" "text" DEFAULT 'approved'::"text",
    "approval_date" "date",
    "approved_by" "text",
    "approval_notes" "text",
    "valid_from" "date" DEFAULT CURRENT_DATE,
    "valid_until" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "raw_material_suppliers_approval_status_check" CHECK (
        (
            "approval_status" = ANY (
                ARRAY ['pending'::"text", 'approved'::"text", 'suspended'::"text", 'rejected'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."raw_material_suppliers" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."raw_material_tests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "raw_material_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "test_type" "text" NOT NULL,
    "test_name" "text" NOT NULL,
    "test_name_en" "text",
    "test_method" "text",
    "parameters" "jsonb" DEFAULT '[]'::"jsonb",
    "acceptance_criteria" "jsonb" DEFAULT '{}'::"jsonb",
    "rejection_criteria" "jsonb" DEFAULT '{}'::"jsonb",
    "required" boolean DEFAULT true,
    "frequency" "text" DEFAULT 'each_batch'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "criteria_id" "uuid",
    CONSTRAINT "raw_material_tests_test_type_check" CHECK (
        (
            "test_type" = ANY (
                ARRAY ['chemical'::"text", 'physical'::"text", 'microbiological'::"text", 'sensory'::"text", 'packaging'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."raw_material_tests" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."raw_materials" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "category" "text",
    "supplier_id" "uuid",
    "unit" "text",
    "allergens" "jsonb" DEFAULT '[]'::"jsonb",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "packaging_options" "text" [] DEFAULT '{}'::"text" [],
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" "uuid"
);
ALTER TABLE "public"."raw_materials" OWNER TO "postgres";
COMMENT ON COLUMN "public"."raw_materials"."supplier_id" IS 'DEPRECATED [2025-12-28]: Use raw_material_suppliers junction table.';
CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "name_en" "text",
    "version" "text" DEFAULT '1.0'::"text",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "ingredients" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "permissions" "jsonb" DEFAULT '{"edit_roles": ["admin", "manager"], "view_roles": ["admin", "manager", "user"]}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "mixing_steps" "jsonb" DEFAULT '[]'::"jsonb"
);
ALTER TABLE "public"."recipes" OWNER TO "postgres";
COMMENT ON COLUMN "public"."recipes"."mixing_steps" IS 'خطوات الخلط والتحضير [{step_number, title, description, duration, temperature, equipment, notes}]';
CREATE TABLE IF NOT EXISTS "public"."recycle_bin" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "original_id" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "deleted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_by" "uuid",
    "original_path" "text" DEFAULT '/'::"text",
    "original_parent_id" "text",
    "data" "jsonb" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recycle_bin_item_type_check" CHECK (
        (
            "item_type" = ANY (
                ARRAY ['folder'::"text", 'template'::"text", 'instance'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."recycle_bin" OWNER TO "postgres";
COMMENT ON TABLE "public"."recycle_bin" IS 'Soft-deleted items with 30-day retention before permanent deletion';
CREATE TABLE IF NOT EXISTS "public"."relationship_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "changed_by" "text",
    "changed_by_name" "text",
    "company_id" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."relationship_audit_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."report_review_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "from_status" "text",
    "to_status" "text",
    "performed_by" "uuid",
    "performed_by_name" "text" NOT NULL,
    "performed_by_email" "text",
    "performed_by_role" "text",
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "field_changes" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "checksum" "text" NOT NULL,
    "previous_checksum" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "report_review_history_action_check" CHECK (
        (
            "action" = ANY (
                ARRAY ['created'::"text", 'submitted'::"text", 'claimed'::"text", 'approved'::"text", 'rejected'::"text", 'resubmitted'::"text", 'reopened'::"text", 'edited_by_reviewer'::"text", 'field_changed'::"text", 'archived'::"text", 'comment_added'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."report_review_history" OWNER TO "postgres";
COMMENT ON TABLE "public"."report_review_history" IS 'Immutable audit trail for report review workflow - cannot be modified or deleted';
COMMENT ON COLUMN "public"."report_review_history"."checksum" IS 'SHA-256 hash for integrity verification';
COMMENT ON COLUMN "public"."report_review_history"."previous_checksum" IS 'Link to previous record checksum for chain verification';
CREATE TABLE IF NOT EXISTS "public"."role_action_restrictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "stage_code" "text",
    "denied_actions" "text" [] DEFAULT '{}'::"text" [],
    "allowed_actions" "text" [] DEFAULT '{}'::"text" [],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    CONSTRAINT "role_action_mode" CHECK (
        (
            ("denied_actions" = '{}'::"text" [])
            OR ("allowed_actions" = '{}'::"text" [])
        )
    )
);
ALTER TABLE "public"."role_action_restrictions" OWNER TO "postgres";
COMMENT ON TABLE "public"."role_action_restrictions" IS 'Phase 1: Roles restrict actions within department-granted modules. Department-first permission model.';
CREATE TABLE IF NOT EXISTS "public"."role_conflicts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_a_id" "uuid" NOT NULL,
    "role_b_id" "uuid" NOT NULL,
    "conflict_reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "role_conflicts_check" CHECK (("role_a_id" <> "role_b_id"))
);
ALTER TABLE "public"."role_conflicts" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."role_module_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "granted_actions" "text" [] DEFAULT ARRAY ['view'::"text"] NOT NULL,
    "can_see_all_departments" boolean DEFAULT false,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."role_module_permissions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid",
    "granted" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "permission_code" "text"
);
ALTER TABLE "public"."role_permissions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."sanitation_areas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "zone" "text",
    "cleaning_frequency" "text",
    "checklist" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);
ALTER TABLE "public"."sanitation_areas" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name_ar" "text",
    "description" "text",
    "description_ar" "text",
    "supervisor_user_id" "uuid",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 50
);
ALTER TABLE "public"."sections" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "text" DEFAULT 'global'::"text" NOT NULL,
    "departments" "jsonb" DEFAULT '[]'::"jsonb",
    "users" "jsonb" DEFAULT '[]'::"jsonb",
    "defect_catalog" "jsonb" DEFAULT '[]'::"jsonb",
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "lines" "jsonb" DEFAULT '[]'::"jsonb",
    "units" "jsonb" DEFAULT '[]'::"jsonb",
    "quality_departments" "jsonb" DEFAULT '[]'::"jsonb",
    "permission_matrix" "jsonb" DEFAULT '{}'::"jsonb",
    "holds_disposal_policy" "text" DEFAULT 'warning'::"text",
    "last_backup_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "language" "text" DEFAULT 'ar'::"text",
    "timezone" "text" DEFAULT 'Asia/Riyadh'::"text",
    "date_format" "text" DEFAULT 'DD/MM/YYYY'::"text",
    "theme" "text" DEFAULT 'light'::"text",
    "logo_url" "text" DEFAULT '/Logo.png'::"text",
    "logo_scale" numeric DEFAULT 1.0
);
ALTER TABLE "public"."settings" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."share_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "share_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "performed_by" "uuid",
    "performed_by_name" "text" NOT NULL,
    "performed_by_department" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "share_activity_log_activity_type_check" CHECK (
        (
            "activity_type" = ANY (
                ARRAY ['created'::"text", 'accessed'::"text", 'downloaded'::"text", 'commented'::"text", 'edited'::"text", 'shared'::"text", 'expired'::"text", 'revoked'::"text", 'viewed'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."share_activity_log" OWNER TO "postgres";
COMMENT ON TABLE "public"."share_activity_log" IS 'Activity log for all share-related actions';
CREATE TABLE IF NOT EXISTS "public"."stage_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "stage_code" "text" NOT NULL,
    "action" "text" NOT NULL,
    "is_granted" boolean DEFAULT false,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "granted_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."stage_permissions" OWNER TO "postgres";
COMMENT ON TABLE "public"."stage_permissions" IS 'Stage-based permissions linking roles to specific module stages and actions';
CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "contact_person" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "approved" boolean DEFAULT false,
    "approved_date" timestamp with time zone,
    "rating" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" "uuid",
    "is_active" boolean DEFAULT true
);
ALTER TABLE "public"."suppliers" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid",
    "author_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."task_comments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."task_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "changed_by" "uuid",
    "changed_by_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."task_history" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "task_number" "text",
    "task_type" "text" DEFAULT 'general'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "assigned_to" "uuid",
    "assigned_to_name" "text",
    "assigned_by" "uuid",
    "assigned_by_name" "text",
    "assigned_at" timestamp with time zone,
    "department" "text",
    "company_id" "uuid",
    "related_entity_type" "text",
    "related_entity_id" "uuid",
    "due_date" "date",
    "start_date" "date",
    "completed_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "completion_notes" "text",
    "completed_by" "uuid",
    "completed_by_name" "text",
    "requires_verification" boolean DEFAULT false,
    "verified_by" "uuid",
    "verified_by_name" "text",
    "verified_at" timestamp with time zone,
    "verification_notes" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "created_by_name" "text",
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "tasks_priority_check" CHECK (
        (
            "priority" = ANY (
                ARRAY ['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]
            )
        )
    ),
    CONSTRAINT "tasks_status_check" CHECK (
        (
            "status" = ANY (
                ARRAY ['pending'::"text", 'in_progress'::"text", 'on_hold'::"text", 'completed'::"text", 'cancelled'::"text", 'overdue'::"text"]
            )
        )
    ),
    CONSTRAINT "tasks_task_type_check" CHECK (
        (
            "task_type" = ANY (
                ARRAY ['general'::"text", 'corrective_action'::"text", 'preventive_action'::"text", 'audit'::"text", 'inspection'::"text", 'maintenance'::"text", 'training'::"text", 'documentation'::"text", 'review'::"text", 'other'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."tasks" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."temperature_equipment" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "location" "text",
    "min_temp" numeric,
    "max_temp" numeric,
    "unit" "text" DEFAULT 'C'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);
ALTER TABLE "public"."temperature_equipment" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."temperature_readings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipment_id" "uuid",
    "temperature" numeric NOT NULL,
    "unit" "text" DEFAULT 'C'::"text",
    "status" "text" DEFAULT 'ok'::"text",
    "recorded_by" "text",
    "notes" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);
ALTER TABLE "public"."temperature_readings" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."unified_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "name_en" "text",
    "type" "text" NOT NULL,
    "department_id" "uuid",
    "is_default_for_department" boolean DEFAULT false,
    "parent_id" "uuid",
    "path" "text" NOT NULL,
    "depth" integer DEFAULT 0,
    "icon" "text" DEFAULT '📁'::"text",
    "color" "text" DEFAULT '#6B7280'::"text",
    "cover_image" "text",
    "content_types" "text" [] DEFAULT ARRAY ['forms'::"text", 'reports'::"text"],
    "description" "text",
    "tags" "text" [],
    "is_favorite" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "is_public" boolean DEFAULT false,
    "is_system" boolean DEFAULT false,
    "visibility_scope" "text" DEFAULT 'department'::"text",
    "stats" "jsonb" DEFAULT "jsonb_build_object"(
        'total_items',
        0,
        'forms_count',
        0,
        'reports_count',
        0,
        'last_activity',
        NULL::"unknown"
    ),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "version" integer DEFAULT 1,
    CONSTRAINT "unified_folders_depth_positive" CHECK (("depth" >= 0)),
    CONSTRAINT "unified_folders_name_not_empty" CHECK (
        (
            TRIM(
                BOTH
                FROM "name"
            ) <> ''::"text"
        )
    ),
    CONSTRAINT "unified_folders_sort_order_positive" CHECK (("sort_order" >= 0)),
    CONSTRAINT "unified_folders_type_check" CHECK (
        (
            "type" = ANY (
                ARRAY ['standard'::"text", 'project'::"text", 'department'::"text", 'client'::"text", 'date-based'::"text", 'report-group'::"text", 'system'::"text", 'custom'::"text"]
            )
        )
    ),
    CONSTRAINT "unified_folders_visibility_scope_check" CHECK (
        (
            "visibility_scope" = ANY (
                ARRAY ['private'::"text", 'department'::"text", 'company'::"text", 'custom'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."unified_folders" OWNER TO "postgres";
COMMENT ON TABLE "public"."unified_folders" IS 'Unified folder system for forms and reports with department isolation';
COMMENT ON COLUMN "public"."unified_folders"."type" IS 'Type of the folder: standard, project, department, client, date-based, report-group, system, custom';
CREATE TABLE IF NOT EXISTS "public"."user_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "section_id" "uuid",
    "is_primary" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "assigned_by" "uuid"
);
ALTER TABLE "public"."user_departments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "title" "text",
    "department" "text",
    "roles" "text" [] DEFAULT '{}'::"text" [],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "phone" "text",
    "display_name" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "company_id" "uuid",
    "department_id" "uuid",
    "job_title_id" "uuid",
    CONSTRAINT "check_users_has_roles" CHECK (
        (
            ("roles" IS NOT NULL)
            AND ("array_length"("roles", 1) > 0)
        )
    )
);
ALTER TABLE ONLY "public"."users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" OWNER TO "postgres";
COMMENT ON COLUMN "public"."users"."department" IS 'DEPRECATED: Use user_departments junction table + departments table instead.';
COMMENT ON COLUMN "public"."users"."roles" IS 'DEPRECATED: Use user_roles junction table instead.';
COMMENT ON COLUMN "public"."users"."permissions" IS 'DEPRECATED: Use role_permissions table instead.';
COMMENT ON CONSTRAINT "check_users_has_roles" ON "public"."users" IS 'Ensures every user has at least one role. Default should be viewer.';
CREATE OR REPLACE VIEW "public"."user_effective_permissions" WITH ("security_invoker" = 'true') AS
SELECT "u"."id" AS "user_id",
    "u"."email",
    "u"."name",
    "u"."department_id",
    "d"."name" AS "department_name",
    "d"."code" AS "department_code",
    "u"."job_title_id",
    "jt"."name" AS "job_title_name",
    "r"."id" AS "role_id",
    "r"."name" AS "role_name",
    "r"."name_ar" AS "role_name_ar",
    "rp"."permission_code"
FROM (
        (
            (
                (
                    (
                        "public"."users" "u"
                        LEFT JOIN "public"."departments" "d" ON (("u"."department_id" = "d"."id"))
                    )
                    LEFT JOIN "public"."job_titles" "jt" ON (("u"."job_title_id" = "jt"."id"))
                )
                LEFT JOIN "public"."job_title_roles" "jtr" ON (("jt"."id" = "jtr"."job_title_id"))
            )
            LEFT JOIN "public"."roles" "r" ON (("jtr"."role_id" = "r"."id"))
        )
        LEFT JOIN "public"."role_permissions" "rp" ON (("r"."id" = "rp"."role_id"))
    )
WHERE (
        ("u"."is_active" = true)
        AND ("rp"."permission_code" IS NOT NULL)
    );
ALTER VIEW "public"."user_effective_permissions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid"
);
ALTER TABLE "public"."user_roles" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."users_with_deprecated_roles" WITH ("security_invoker" = 'true') AS
SELECT "u"."id" AS "user_id",
    "u"."email",
    "u"."name",
    "r"."id" AS "role_id",
    "r"."name" AS "role_name",
    "r"."code" AS "role_code",
    "r"."deprecation_message",
    "r"."deprecated_at",
    "rep"."name" AS "replacement_role_name"
FROM (
        (
            (
                "public"."users" "u"
                JOIN "public"."user_roles" "ur" ON (("u"."id" = "ur"."user_id"))
            )
            JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id"))
        )
        LEFT JOIN "public"."roles" "rep" ON (("r"."replacement_role_id" = "rep"."id"))
    )
WHERE ("r"."is_deprecated" = true);
ALTER VIEW "public"."users_with_deprecated_roles" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_entity_audit_history" WITH ("security_invoker" = 'true') AS
SELECT "id",
    "entity_type",
    "entity_id",
    "entity_name",
    "action",
    "user_name",
    "timestamp",
    "old_values",
    "new_values",
    "changed_fields",
    "reason",
    "checksum"
FROM "public"."audit_trail" "at"
ORDER BY "entity_type",
    "entity_id",
    "timestamp" DESC;
ALTER VIEW "public"."v_entity_audit_history" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_material_receiving_full" WITH ("security_invoker" = 'true') AS
SELECT "mr"."id",
    "mr"."receiving_number",
    "mr"."material_type",
    "mr"."status",
    "mr"."material_name",
    "mr"."material_code",
    "mr"."batch_number",
    "mr"."lot_number",
    "mr"."supplier_id",
    "mr"."supplier_name",
    "mr"."quantity",
    "mr"."unit",
    "mr"."packaging_type",
    "mr"."production_date",
    "mr"."expiry_date",
    "mr"."received_at",
    "mr"."received_by",
    "mr"."received_by_name",
    "mr"."delivery_note_number",
    "mr"."invoice_number",
    "mr"."certificate_of_analysis",
    "mr"."inspection_required",
    "mr"."inspected_by",
    "mr"."inspected_at",
    "mr"."inspection_notes",
    "mr"."lab_test_id",
    "mr"."lab_test_status",
    "mr"."storage_location",
    "mr"."storage_condition",
    "mr"."accepted_quantity",
    "mr"."rejected_quantity",
    "mr"."rejection_reason",
    "mr"."notes",
    "mr"."attachments",
    "mr"."created_at",
    "mr"."updated_at",
    "mr"."company_id",
    "mr"."raw_material_id",
    "mr"."test_requirements_snapshot",
    "mr"."supplier_approval_snapshot",
    "mr"."vehicle_inspection",
    "mr"."initial_test_results",
    "rm"."name" AS "raw_material_name",
    "rm"."category" AS "material_category",
    "s"."name" AS "supplier_name_full",
    "s"."code" AS "supplier_code",
    "c"."name" AS "company_name"
FROM (
        (
            (
                "public"."material_receiving" "mr"
                LEFT JOIN "public"."raw_materials" "rm" ON (("rm"."id" = "mr"."raw_material_id"))
            )
            LEFT JOIN "public"."suppliers" "s" ON (("s"."id" = "mr"."supplier_id"))
        )
        LEFT JOIN "public"."companies" "c" ON (("c"."id" = "mr"."company_id"))
    );
ALTER VIEW "public"."v_material_receiving_full" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_material_suppliers" WITH ("security_invoker" = 'true') AS
SELECT "rm"."id" AS "material_id",
    "rm"."code" AS "material_code",
    "rm"."name" AS "material_name",
    "s"."id" AS "supplier_id",
    "s"."code" AS "supplier_code",
    "s"."name" AS "supplier_name",
    "rms"."is_primary",
    "rms"."approval_status",
    "rms"."valid_from",
    "rms"."valid_until",
    "rms"."company_id"
FROM (
        (
            "public"."raw_material_suppliers" "rms"
            JOIN "public"."raw_materials" "rm" ON (("rm"."id" = "rms"."raw_material_id"))
        )
        JOIN "public"."suppliers" "s" ON (("s"."id" = "rms"."supplier_id"))
    )
WHERE ("rms"."is_active" = true);
ALTER VIEW "public"."v_material_suppliers" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_products_full" WITH ("security_invoker" = 'true') AS
SELECT "p"."id",
    "p"."company_id",
    "p"."production_line_id",
    "p"."name",
    "p"."name_en",
    "p"."sku",
    "p"."barcode",
    "p"."category",
    "p"."unit",
    "p"."shelf_life_days",
    "p"."storage_conditions",
    "p"."allergens",
    "p"."is_active",
    "p"."created_at",
    "p"."updated_at",
    "pl"."name" AS "line_name",
    "pl"."code" AS "line_code",
    "c"."name" AS "company_name"
FROM (
        (
            "public"."products" "p"
            LEFT JOIN "public"."production_lines" "pl" ON (("pl"."id" = "p"."production_line_id"))
        )
        LEFT JOIN "public"."companies" "c" ON (("c"."id" = "p"."company_id"))
    );
ALTER VIEW "public"."v_products_full" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_recent_audit_events" WITH ("security_invoker" = 'true') AS
SELECT "id",
    "action",
    "entity_type",
    "entity_id",
    "entity_name",
    "user_name",
    "user_email",
    "timestamp",
    "changed_fields",
    "reason"
FROM "public"."audit_trail" "at"
ORDER BY "timestamp" DESC
LIMIT 1000;
ALTER VIEW "public"."v_recent_audit_events" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_role_statistics" WITH ("security_invoker" = 'true') AS
SELECT "r"."id",
    "r"."code",
    "r"."name",
    "r"."name_ar",
    "r"."department",
    "r"."priority",
    "r"."is_system",
    "r"."is_locked",
    "r"."is_active",
    "count"(DISTINCT "ur"."user_id") AS "user_count",
    "count"(DISTINCT "rp"."permission_code") FILTER (
        WHERE ("rp"."granted" = true)
    ) AS "permission_count"
FROM (
        (
            "public"."roles" "r"
            LEFT JOIN "public"."user_roles" "ur" ON (("r"."id" = "ur"."role_id"))
        )
        LEFT JOIN "public"."role_permissions" "rp" ON (("r"."id" = "rp"."role_id"))
    )
GROUP BY "r"."id",
    "r"."code",
    "r"."name",
    "r"."name_ar",
    "r"."department",
    "r"."priority",
    "r"."is_system",
    "r"."is_locked",
    "r"."is_active"
ORDER BY "r"."priority";
ALTER VIEW "public"."v_role_statistics" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_suppliers_with_companies" WITH ("security_invoker" = 'true') AS
SELECT "s"."id",
    "s"."name",
    "s"."code",
    "s"."contact_person",
    "s"."email",
    "s"."phone",
    "s"."address",
    "s"."approved",
    "s"."approved_date",
    "s"."rating",
    "s"."notes",
    "s"."created_at",
    "s"."updated_at",
    "s"."company_id",
    "c"."name" AS "company_name",
    "c"."code" AS "company_code"
FROM (
        "public"."suppliers" "s"
        LEFT JOIN "public"."companies" "c" ON (("c"."id" = "s"."company_id"))
    );
ALTER VIEW "public"."v_suppliers_with_companies" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_task_type_distribution" WITH ("security_invoker" = 'true') AS
SELECT "task_type",
    "count"(*) AS "total",
    "count"(
        CASE
            WHEN ("status" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END
    ) AS "completed",
    "count"(
        CASE
            WHEN (
                "status" = ANY (ARRAY ['pending'::"text", 'in_progress'::"text"])
            ) THEN 1
            ELSE NULL::integer
        END
    ) AS "active",
    (
        "avg"(
            CASE
                WHEN (
                    ("status" = 'completed'::"text")
                    AND ("completed_at" IS NOT NULL)
                    AND ("created_at" IS NOT NULL)
                ) THEN (
                    EXTRACT(
                        epoch
                        FROM ("completed_at" - "created_at")
                    ) / (3600)::numeric
                )
                ELSE NULL::numeric
            END
        )
    )::integer AS "avg_hours_to_complete"
FROM "public"."tasks"
GROUP BY "task_type";
ALTER VIEW "public"."v_task_type_distribution" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_user_monthly_performance" WITH ("security_invoker" = 'true') AS
SELECT "u"."id" AS "user_id",
    "u"."name" AS "user_name",
    "date_trunc"('month'::"text", "t"."created_at") AS "month",
    "count"("t"."id") AS "assigned_tasks",
    "count"(
        CASE
            WHEN ("t"."status" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END
    ) AS "completed_tasks",
    "count"(
        CASE
            WHEN ("t"."due_date" < "t"."completed_at") THEN 1
            ELSE NULL::integer
        END
    ) AS "late_completions",
    "round"(
        CASE
            WHEN ("count"("t"."id") > 0) THEN (
                (
                    (
                        "count"(
                            CASE
                                WHEN ("t"."status" = 'completed'::"text") THEN 1
                                ELSE NULL::integer
                            END
                        )
                    )::numeric / ("count"("t"."id"))::numeric
                ) * (100)::numeric
            )
            ELSE (0)::numeric
        END,
        2
    ) AS "completion_rate"
FROM (
        "public"."users" "u"
        LEFT JOIN "public"."tasks" "t" ON (("t"."assigned_to" = "u"."id"))
    )
WHERE (
        "t"."created_at" >= ("now"() - '1 year'::interval)
    )
GROUP BY "u"."id",
    "u"."name",
    ("date_trunc"('month'::"text", "t"."created_at"))
ORDER BY ("date_trunc"('month'::"text", "t"."created_at")) DESC;
ALTER VIEW "public"."v_user_monthly_performance" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_user_permissions" WITH ("security_invoker" = 'true') AS
SELECT "u"."id" AS "user_id",
    "u"."email",
    "u"."name" AS "user_name",
    "r"."name" AS "role_name",
    "r"."name_ar" AS "role_name_ar",
    "p"."code" AS "permission_code",
    "p"."name" AS "permission_name",
    "p"."name_ar" AS "permission_name_ar",
    "rp"."granted"
FROM (
        (
            (
                (
                    "public"."users" "u"
                    LEFT JOIN "public"."user_roles" "ur" ON (("u"."id" = "ur"."user_id"))
                )
                LEFT JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id"))
            )
            LEFT JOIN "public"."role_permissions" "rp" ON (("r"."id" = "rp"."role_id"))
        )
        LEFT JOIN "public"."permissions" "p" ON (("rp"."permission_id" = "p"."id"))
    )
WHERE ("rp"."granted" = true);
ALTER VIEW "public"."v_user_permissions" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."v_user_task_stats" WITH ("security_invoker" = 'true') AS
SELECT "u"."id" AS "user_id",
    "u"."name" AS "user_name",
    "u"."email",
    "u"."department",
    "count"("t"."id") AS "total_tasks",
    "count"(
        CASE
            WHEN ("t"."status" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END
    ) AS "completed_tasks",
    "count"(
        CASE
            WHEN ("t"."status" = 'pending'::"text") THEN 1
            ELSE NULL::integer
        END
    ) AS "pending_tasks",
    "count"(
        CASE
            WHEN ("t"."status" = 'in_progress'::"text") THEN 1
            ELSE NULL::integer
        END
    ) AS "in_progress_tasks",
    "count"(
        CASE
            WHEN (
                ("t"."status" = 'overdue'::"text")
                OR (
                    ("t"."due_date" < CURRENT_DATE)
                    AND (
                        "t"."status" <> ALL (ARRAY ['completed'::"text", 'cancelled'::"text"])
                    )
                )
            ) THEN 1
            ELSE NULL::integer
        END
    ) AS "overdue_tasks",
    "round"(
        CASE
            WHEN ("count"("t"."id") > 0) THEN (
                (
                    (
                        "count"(
                            CASE
                                WHEN ("t"."status" = 'completed'::"text") THEN 1
                                ELSE NULL::integer
                            END
                        )
                    )::numeric / ("count"("t"."id"))::numeric
                ) * (100)::numeric
            )
            ELSE (0)::numeric
        END,
        2
    ) AS "completion_rate",
    (
        "avg"(
            CASE
                WHEN (
                    ("t"."status" = 'completed'::"text")
                    AND ("t"."completed_at" IS NOT NULL)
                    AND ("t"."assigned_at" IS NOT NULL)
                ) THEN (
                    EXTRACT(
                        epoch
                        FROM ("t"."completed_at" - "t"."assigned_at")
                    ) / (3600)::numeric
                )
                ELSE NULL::numeric
            END
        )
    )::integer AS "avg_completion_hours"
FROM (
        "public"."users" "u"
        LEFT JOIN "public"."tasks" "t" ON (("t"."assigned_to" = "u"."id"))
    )
GROUP BY "u"."id",
    "u"."name",
    "u"."email",
    "u"."department";
ALTER VIEW "public"."v_user_task_stats" OWNER TO "postgres";
ALTER TABLE ONLY "public"."allergen_profiles"
ADD CONSTRAINT "allergen_profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."app_modules"
ADD CONSTRAINT "app_modules_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."app_modules"
ADD CONSTRAINT "app_modules_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."audit_logs"
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."audit_trail"
ADD CONSTRAINT "audit_trail_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."categories"
ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."cleaning_records"
ADD CONSTRAINT "cleaning_records_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."companies"
ADD CONSTRAINT "companies_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."companies"
ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."content_shares"
ADD CONSTRAINT "content_shares_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."control_points"
ADD CONSTRAINT "control_points_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."corrective_actions"
ADD CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."department_module_access"
ADD CONSTRAINT "department_module_access_department_id_module_code_key" UNIQUE ("department_id", "module_code");
ALTER TABLE ONLY "public"."department_module_access"
ADD CONSTRAINT "department_module_access_dept_module_unique" UNIQUE ("department_id", "module_code");
ALTER TABLE ONLY "public"."department_module_access"
ADD CONSTRAINT "department_module_access_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."department_roles"
ADD CONSTRAINT "department_roles_department_id_role_id_key" UNIQUE ("department_id", "role_id");
ALTER TABLE ONLY "public"."department_roles"
ADD CONSTRAINT "department_roles_department_id_role_id_unique" UNIQUE ("department_id", "role_id");
ALTER TABLE ONLY "public"."department_roles"
ADD CONSTRAINT "department_roles_dept_role_unique" UNIQUE ("department_id", "role_id");
ALTER TABLE ONLY "public"."department_roles"
ADD CONSTRAINT "department_roles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."departments"
ADD CONSTRAINT "departments_name_key" UNIQUE ("name");
ALTER TABLE ONLY "public"."departments"
ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."department_module_access"
ADD CONSTRAINT "dma_dept_module_unique" UNIQUE ("department_id", "module_code");
ALTER TABLE ONLY "public"."document_shares"
ADD CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."folders"
ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."form_templates"
ADD CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."inspection_criteria"
ADD CONSTRAINT "inspection_criteria_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."job_title_roles"
ADD CONSTRAINT "job_title_roles_job_title_id_role_id_key" UNIQUE ("job_title_id", "role_id");
ALTER TABLE ONLY "public"."job_title_roles"
ADD CONSTRAINT "job_title_roles_job_title_id_role_id_unique" UNIQUE ("job_title_id", "role_id");
ALTER TABLE ONLY "public"."job_title_roles"
ADD CONSTRAINT "job_title_roles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."job_title_roles"
ADD CONSTRAINT "job_title_roles_title_role_unique" UNIQUE ("job_title_id", "role_id");
ALTER TABLE ONLY "public"."job_titles"
ADD CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."lab_samples"
ADD CONSTRAINT "lab_samples_company_sample_number_unique" UNIQUE ("company_id", "sample_number");
ALTER TABLE ONLY "public"."lab_samples"
ADD CONSTRAINT "lab_samples_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."lab_tests"
ADD CONSTRAINT "lab_tests_company_test_number_unique" UNIQUE ("company_id", "test_number");
ALTER TABLE ONLY "public"."lab_tests"
ADD CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."material_receiving"
ADD CONSTRAINT "material_receiving_company_number_unique" UNIQUE ("company_id", "receiving_number");
ALTER TABLE ONLY "public"."material_receiving"
ADD CONSTRAINT "material_receiving_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."module_data_visibility"
ADD CONSTRAINT "module_data_visibility_module_code_department_id_key" UNIQUE ("module_code", "department_id");
ALTER TABLE ONLY "public"."module_data_visibility"
ADD CONSTRAINT "module_data_visibility_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."module_stages"
ADD CONSTRAINT "module_stages_module_code_stage_code_key" UNIQUE ("module_code", "stage_code");
ALTER TABLE ONLY "public"."module_stages"
ADD CONSTRAINT "module_stages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."monitoring_records"
ADD CONSTRAINT "monitoring_records_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ncr_comments"
ADD CONSTRAINT "ncr_comments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ncr_reports"
ADD CONSTRAINT "ncr_reports_company_ncr_number_unique" UNIQUE ("company_id", "ncr_number");
ALTER TABLE ONLY "public"."ncr_reports"
ADD CONSTRAINT "ncr_reports_company_number_unique" UNIQUE ("company_id", "number");
ALTER TABLE ONLY "public"."ncr_reports"
ADD CONSTRAINT "ncr_reports_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ncr_stage_permissions"
ADD CONSTRAINT "ncr_stage_permissions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ncr_workflow_stages"
ADD CONSTRAINT "ncr_workflow_stages_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."ncr_workflow_stages"
ADD CONSTRAINT "ncr_workflow_stages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notification_preferences"
ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notification_preferences"
ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");
ALTER TABLE ONLY "public"."notification_templates"
ADD CONSTRAINT "notification_templates_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."notification_templates"
ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notifications"
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."permission_audit_log"
ADD CONSTRAINT "permission_audit_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."permission_hierarchy"
ADD CONSTRAINT "permission_hierarchy_permission_code_requires_permission_key" UNIQUE ("permission_code", "requires_permission");
ALTER TABLE ONLY "public"."permission_hierarchy"
ADD CONSTRAINT "permission_hierarchy_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."permissions"
ADD CONSTRAINT "permissions_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."permissions"
ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."pre_op_checks"
ADD CONSTRAINT "pre_op_checks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."production_lines"
ADD CONSTRAINT "production_lines_company_code_unique" UNIQUE ("company_id", "code");
ALTER TABLE ONLY "public"."production_lines"
ADD CONSTRAINT "production_lines_company_id_code_key" UNIQUE ("company_id", "code");
ALTER TABLE ONLY "public"."production_lines"
ADD CONSTRAINT "production_lines_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."products"
ADD CONSTRAINT "products_company_id_sku_key" UNIQUE ("company_id", "sku");
ALTER TABLE ONLY "public"."products"
ADD CONSTRAINT "products_company_sku_unique" UNIQUE ("company_id", "sku");
ALTER TABLE ONLY "public"."products"
ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."raw_material_suppliers"
ADD CONSTRAINT "raw_material_suppliers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."raw_material_suppliers"
ADD CONSTRAINT "raw_material_suppliers_raw_material_id_supplier_id_company__key" UNIQUE ("raw_material_id", "supplier_id", "company_id");
ALTER TABLE ONLY "public"."raw_material_suppliers"
ADD CONSTRAINT "raw_material_suppliers_unique_link" UNIQUE ("raw_material_id", "supplier_id", "company_id");
ALTER TABLE ONLY "public"."raw_material_tests"
ADD CONSTRAINT "raw_material_tests_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."raw_material_tests"
ADD CONSTRAINT "raw_material_tests_raw_material_id_test_type_test_name_comp_key" UNIQUE (
        "raw_material_id",
        "test_type",
        "test_name",
        "company_id"
    );
ALTER TABLE ONLY "public"."raw_materials"
ADD CONSTRAINT "raw_materials_company_code_unique" UNIQUE ("company_id", "code");
ALTER TABLE ONLY "public"."raw_materials"
ADD CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."recipes"
ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."recycle_bin"
ADD CONSTRAINT "recycle_bin_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."relationship_audit_log"
ADD CONSTRAINT "relationship_audit_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."report_review_history"
ADD CONSTRAINT "report_review_history_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."role_action_restrictions"
ADD CONSTRAINT "role_action_restrictions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."role_conflicts"
ADD CONSTRAINT "role_conflicts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."role_conflicts"
ADD CONSTRAINT "role_conflicts_role_a_id_role_b_id_key" UNIQUE ("role_a_id", "role_b_id");
ALTER TABLE ONLY "public"."role_module_permissions"
ADD CONSTRAINT "role_module_permissions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."role_module_permissions"
ADD CONSTRAINT "role_module_permissions_role_id_module_code_key" UNIQUE ("role_id", "module_code");
ALTER TABLE ONLY "public"."role_permissions"
ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."role_permissions"
ADD CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");
ALTER TABLE ONLY "public"."role_permissions"
ADD CONSTRAINT "role_permissions_role_perm_unique" UNIQUE ("role_id", "permission_code");
ALTER TABLE ONLY "public"."roles"
ADD CONSTRAINT "roles_company_code_unique" UNIQUE ("company_id", "code");
ALTER TABLE ONLY "public"."roles"
ADD CONSTRAINT "roles_company_id_name_unique" UNIQUE ("company_id", "name");
ALTER TABLE ONLY "public"."roles"
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."sanitation_areas"
ADD CONSTRAINT "sanitation_areas_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."sections"
ADD CONSTRAINT "sections_department_id_code_key" UNIQUE ("department_id", "code");
ALTER TABLE ONLY "public"."sections"
ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."settings"
ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."share_activity_log"
ADD CONSTRAINT "share_activity_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."stage_permissions"
ADD CONSTRAINT "stage_permissions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."stage_permissions"
ADD CONSTRAINT "stage_permissions_role_id_module_code_stage_code_action_key" UNIQUE ("role_id", "module_code", "stage_code", "action");
ALTER TABLE ONLY "public"."suppliers"
ADD CONSTRAINT "suppliers_company_code_unique" UNIQUE ("company_id", "code");
ALTER TABLE ONLY "public"."suppliers"
ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_comments"
ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_history"
ADD CONSTRAINT "task_history_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."tasks"
ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."tasks"
ADD CONSTRAINT "tasks_task_number_key" UNIQUE ("task_number");
ALTER TABLE ONLY "public"."temperature_equipment"
ADD CONSTRAINT "temperature_equipment_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."temperature_readings"
ADD CONSTRAINT "temperature_readings_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."unified_folders"
ADD CONSTRAINT "unified_folders_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_departments"
ADD CONSTRAINT "user_departments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_departments"
ADD CONSTRAINT "user_departments_user_dept_unique" UNIQUE ("user_id", "department_id");
ALTER TABLE ONLY "public"."user_departments"
ADD CONSTRAINT "user_departments_user_id_department_id_key" UNIQUE ("user_id", "department_id");
ALTER TABLE ONLY "public"."user_departments"
ADD CONSTRAINT "user_departments_user_id_department_id_unique" UNIQUE ("user_id", "department_id");
ALTER TABLE ONLY "public"."user_roles"
ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_temp_roles"
ADD CONSTRAINT "user_temp_roles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_temp_roles"
ADD CONSTRAINT "user_temp_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id");
ALTER TABLE ONLY "public"."user_temp_roles"
ADD CONSTRAINT "user_temp_roles_user_id_role_id_unique" UNIQUE ("user_id", "role_id");
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_email_key" UNIQUE ("email");
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
CREATE INDEX "idx_audit_company" ON "public"."relationship_audit_log" USING "btree" ("company_id");
CREATE INDEX "idx_audit_entity" ON "public"."relationship_audit_log" USING "btree" ("entity_type", "entity_id");
CREATE INDEX "idx_audit_log_action" ON "public"."permission_audit_log" USING "btree" ("action");
CREATE INDEX "idx_audit_log_changed_at" ON "public"."permission_audit_log" USING "btree" ("changed_at" DESC);
CREATE INDEX "idx_audit_log_created_at" ON "public"."permission_audit_log" USING "btree" ("changed_at" DESC);
CREATE INDEX "idx_audit_log_role" ON "public"."permission_audit_log" USING "btree" ("target_role_id");
CREATE INDEX "idx_audit_log_target_role" ON "public"."permission_audit_log" USING "btree" ("target_role_id");
CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_audit_logs_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");
CREATE INDEX "idx_audit_trail_action" ON "public"."audit_trail" USING "btree" ("action");
CREATE INDEX "idx_audit_trail_checksum" ON "public"."audit_trail" USING "btree" ("checksum");
CREATE INDEX "idx_audit_trail_company" ON "public"."audit_trail" USING "btree" ("company_id");
CREATE INDEX "idx_audit_trail_company_date" ON "public"."audit_trail" USING "btree" ("company_id", "created_at" DESC);
CREATE INDEX "idx_audit_trail_entity" ON "public"."audit_trail" USING "btree" ("entity_type", "entity_id");
CREATE INDEX "idx_audit_trail_timestamp" ON "public"."audit_trail" USING "btree" ("timestamp" DESC);
CREATE INDEX "idx_audit_trail_user" ON "public"."audit_trail" USING "btree" ("user_id");
CREATE INDEX "idx_audit_trail_user_time" ON "public"."audit_trail" USING "btree" ("user_id", "timestamp" DESC);
CREATE INDEX "idx_cleaning_area" ON "public"."cleaning_records" USING "btree" ("area_id");
CREATE INDEX "idx_content_shares_active" ON "public"."content_shares" USING "btree" ("is_active")
WHERE ("is_active" = true);
CREATE INDEX "idx_content_shares_content" ON "public"."content_shares" USING "btree" ("content_type", "content_id");
CREATE INDEX "idx_content_shares_departments" ON "public"."content_shares" USING "gin" ("shared_with_departments");
CREATE INDEX "idx_content_shares_expires" ON "public"."content_shares" USING "btree" ("expires_at")
WHERE (
        ("is_active" = true)
        AND ("expires_at" IS NOT NULL)
    );
CREATE INDEX "idx_content_shares_roles" ON "public"."content_shares" USING "gin" ("shared_with_roles");
CREATE INDEX "idx_content_shares_shared_by" ON "public"."content_shares" USING "btree" ("shared_by_user_id");
CREATE INDEX "idx_content_shares_type" ON "public"."content_shares" USING "btree" ("share_type");
CREATE INDEX "idx_content_shares_users" ON "public"."content_shares" USING "gin" ("shared_with_users");
CREATE INDEX "idx_control_points_active" ON "public"."control_points" USING "btree" ("is_active")
WHERE ("is_active" = true);
CREATE INDEX "idx_control_points_company" ON "public"."control_points" USING "btree" ("company_id");
CREATE INDEX "idx_control_points_type" ON "public"."control_points" USING "btree" ("type");
CREATE INDEX "idx_corrective_actions_company_status" ON "public"."corrective_actions" USING "btree" ("company_id", "status");
CREATE INDEX "idx_corrective_actions_source_type" ON "public"."corrective_actions" USING "btree" ("source_type");
CREATE INDEX "idx_corrective_actions_status" ON "public"."corrective_actions" USING "btree" ("status");
CREATE UNIQUE INDEX "idx_department_module_access_unique" ON "public"."department_module_access" USING "btree" (
    "department_id",
    "module_code",
    COALESCE("stage_code", '__ALL__'::"text")
);
CREATE INDEX "idx_department_roles_dept" ON "public"."department_roles" USING "btree" ("department_id");
CREATE INDEX "idx_department_roles_role" ON "public"."department_roles" USING "btree" ("role_id");
CREATE INDEX "idx_departments_active" ON "public"."departments" USING "btree" ("is_active");
CREATE INDEX "idx_departments_code" ON "public"."departments" USING "btree" ("code");
CREATE INDEX "idx_departments_parent" ON "public"."departments" USING "btree" ("parent_department_id");
CREATE INDEX "idx_dept_module_access_dept" ON "public"."department_module_access" USING "btree" ("department_id");
CREATE INDEX "idx_dept_module_access_module" ON "public"."department_module_access" USING "btree" ("module_code");
CREATE INDEX "idx_dept_module_access_visibility" ON "public"."department_module_access" USING "gin" ("visibility_departments");
CREATE INDEX "idx_doc_shares_dept" ON "public"."document_shares" USING "btree" ("shared_with_department_id");
CREATE INDEX "idx_doc_shares_document" ON "public"."document_shares" USING "btree" ("document_type", "document_id");
CREATE INDEX "idx_doc_shares_user" ON "public"."document_shares" USING "btree" ("shared_with_user_id");
CREATE INDEX "idx_folders_archived" ON "public"."folders" USING "btree" ("archived");
CREATE INDEX "idx_folders_company" ON "public"."folders" USING "btree" ("company_id");
CREATE INDEX "idx_folders_department" ON "public"."folders" USING "btree" ("department_id");
CREATE INDEX "idx_folders_name" ON "public"."folders" USING "btree" ("name");
CREATE INDEX "idx_folders_parent" ON "public"."folders" USING "btree" ("parent_id");
CREATE INDEX "idx_folders_version" ON "public"."folders" USING "btree" ("id", "version");
CREATE INDEX "idx_form_instances_archived" ON "public"."form_instances" USING "btree" ("archived");
CREATE INDEX "idx_form_instances_company" ON "public"."form_instances" USING "btree" ("company_id");
CREATE INDEX "idx_form_instances_department" ON "public"."form_instances" USING "btree" ("department_id");
CREATE INDEX "idx_form_instances_dept_status" ON "public"."form_instances" USING "btree" ("department_id", "status");
CREATE INDEX "idx_form_instances_folder" ON "public"."form_instances" USING "btree" ("folder_id");
CREATE INDEX "idx_form_instances_review_status" ON "public"."form_instances" USING "btree" ("review_status");
CREATE INDEX "idx_form_instances_reviewer_id" ON "public"."form_instances" USING "btree" ("reviewer_id")
WHERE ("reviewer_id" IS NOT NULL);
CREATE INDEX "idx_form_instances_share_source" ON "public"."form_instances" USING "btree" ("share_source_department_id")
WHERE ("share_source_department_id" IS NOT NULL);
CREATE INDEX "idx_form_instances_shared" ON "public"."form_instances" USING "btree" ("is_shared")
WHERE ("is_shared" = true);
CREATE INDEX "idx_form_instances_status" ON "public"."form_instances" USING "btree" ("status");
CREATE INDEX "idx_form_instances_status_locked" ON "public"."form_instances" USING "btree" ("status", "is_locked");
CREATE INDEX "idx_form_instances_submitted_pending" ON "public"."form_instances" USING "btree" ("department_id", "status")
WHERE ("status" = 'submitted'::"text");
CREATE INDEX "idx_form_instances_template" ON "public"."form_instances" USING "btree" ("template_id");
CREATE INDEX "idx_form_instances_unified_folder" ON "public"."form_instances" USING "btree" ("unified_folder_id")
WHERE ("unified_folder_id" IS NOT NULL);
CREATE INDEX "idx_form_instances_version" ON "public"."form_instances" USING "btree" ("id", "version");
CREATE INDEX "idx_form_templates_archived" ON "public"."form_templates" USING "btree" ("archived");
CREATE INDEX "idx_form_templates_company" ON "public"."form_templates" USING "btree" ("company_id");
CREATE INDEX "idx_form_templates_department" ON "public"."form_templates" USING "btree" ("department_id");
CREATE INDEX "idx_form_templates_folder" ON "public"."form_templates" USING "btree" ("folder_id");
CREATE INDEX "idx_form_templates_share_source" ON "public"."form_templates" USING "btree" ("share_source_department_id")
WHERE ("share_source_department_id" IS NOT NULL);
CREATE INDEX "idx_form_templates_shared" ON "public"."form_templates" USING "btree" ("is_shared")
WHERE ("is_shared" = true);
CREATE INDEX "idx_form_templates_unified_folder" ON "public"."form_templates" USING "btree" ("unified_folder_id")
WHERE ("unified_folder_id" IS NOT NULL);
CREATE INDEX "idx_form_templates_version" ON "public"."form_templates" USING "btree" ("id", "version");
CREATE INDEX "idx_inspection_criteria_company" ON "public"."inspection_criteria" USING "btree" ("company_id");
CREATE INDEX "idx_job_titles_department" ON "public"."job_titles" USING "btree" ("department_id");
CREATE INDEX "idx_lab_tests_company" ON "public"."lab_tests" USING "btree" ("company_id");
CREATE INDEX "idx_lab_tests_company_status" ON "public"."lab_tests" USING "btree" ("company_id", "status");
CREATE INDEX "idx_lab_tests_department" ON "public"."lab_tests" USING "btree" ("department_id");
CREATE INDEX "idx_lab_tests_priority" ON "public"."lab_tests" USING "btree" ("priority");
CREATE INDEX "idx_lab_tests_sample" ON "public"."lab_tests" USING "btree" ("sample_id");
CREATE INDEX "idx_lab_tests_status" ON "public"."lab_tests" USING "btree" ("status");
CREATE INDEX "idx_lab_tests_type" ON "public"."lab_tests" USING "btree" ("test_type");
CREATE INDEX "idx_material_receiving_company" ON "public"."material_receiving" USING "btree" ("company_id");
CREATE INDEX "idx_material_receiving_company_status" ON "public"."material_receiving" USING "btree" ("company_id", "status");
CREATE INDEX "idx_material_receiving_created" ON "public"."material_receiving" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_material_receiving_material" ON "public"."material_receiving" USING "btree" ("raw_material_id");
CREATE INDEX "idx_material_receiving_status" ON "public"."material_receiving" USING "btree" ("status");
CREATE INDEX "idx_material_receiving_supplier" ON "public"."material_receiving" USING "btree" ("supplier_id");
CREATE INDEX "idx_module_stages_module_code" ON "public"."module_stages" USING "btree" ("module_code");
CREATE INDEX "idx_module_visibility_lookup" ON "public"."module_data_visibility" USING "btree" ("module_code", "department_id");
CREATE INDEX "idx_monitoring_control_point" ON "public"."monitoring_records" USING "btree" ("control_point_id");
CREATE INDEX "idx_monitoring_records_cp" ON "public"."monitoring_records" USING "btree" ("control_point_id");
CREATE INDEX "idx_monitoring_records_date" ON "public"."monitoring_records" USING "btree" ("recorded_at" DESC);
CREATE INDEX "idx_mr_raw_material" ON "public"."material_receiving" USING "btree" ("raw_material_id");
CREATE INDEX "idx_ncr_comments_ncr" ON "public"."ncr_comments" USING "btree" ("ncr_id");
CREATE INDEX "idx_ncr_department" ON "public"."ncr_reports" USING "btree" ("department");
CREATE INDEX "idx_ncr_reports_assigned_to" ON "public"."ncr_reports" USING "btree" ("assigned_to_id");
CREATE INDEX "idx_ncr_reports_auto_gen" ON "public"."ncr_reports" USING "btree" ("auto_generated_from_lab")
WHERE ("auto_generated_from_lab" = true);
CREATE INDEX "idx_ncr_reports_company" ON "public"."ncr_reports" USING "btree" ("company_id");
CREATE INDEX "idx_ncr_reports_company_status_date" ON "public"."ncr_reports" USING "btree" ("company_id", "status", "created_at" DESC);
CREATE INDEX "idx_ncr_reports_created_at" ON "public"."ncr_reports" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_ncr_reports_current_stage" ON "public"."ncr_reports" USING "btree" ("current_stage");
CREATE INDEX "idx_ncr_reports_date" ON "public"."ncr_reports" USING "btree" ("date" DESC);
CREATE INDEX "idx_ncr_reports_lab_test" ON "public"."ncr_reports" USING "btree" ("related_lab_test_id")
WHERE ("related_lab_test_id" IS NOT NULL);
CREATE INDEX "idx_ncr_reports_material" ON "public"."ncr_reports" USING "btree" ("related_material_receiving_id")
WHERE ("related_material_receiving_id" IS NOT NULL);
CREATE INDEX "idx_ncr_reports_number" ON "public"."ncr_reports" USING "btree" ("number");
CREATE INDEX "idx_ncr_reports_source_dept" ON "public"."ncr_reports" USING "btree" ("source_department_id");
CREATE INDEX "idx_ncr_reports_status" ON "public"."ncr_reports" USING "btree" ("status");
CREATE INDEX "idx_ncr_stage_perm_dept" ON "public"."ncr_stage_permissions" USING "btree" ("department_id");
CREATE INDEX "idx_ncr_stage_perm_role" ON "public"."ncr_stage_permissions" USING "btree" ("role_id");
CREATE INDEX "idx_ncr_stage_perm_stage" ON "public"."ncr_stage_permissions" USING "btree" ("stage_code");
CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_notifications_entity" ON "public"."notifications" USING "btree" ("entity_type", "entity_id");
CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");
CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");
CREATE INDEX "idx_notifications_user_read_created" ON "public"."notifications" USING "btree" ("user_id", "read", "created_at" DESC);
CREATE INDEX "idx_permissions_category" ON "public"."permissions" USING "btree" ("category");
CREATE INDEX "idx_production_lines_company" ON "public"."production_lines" USING "btree" ("company_id");
CREATE INDEX "idx_products_company" ON "public"."products" USING "btree" ("company_id");
CREATE INDEX "idx_products_line" ON "public"."products" USING "btree" ("production_line_id");
CREATE INDEX "idx_products_sku" ON "public"."products" USING "btree" ("sku");
CREATE INDEX "idx_products_version" ON "public"."products" USING "btree" ("id", "version");
CREATE UNIQUE INDEX "idx_raw_material_suppliers_unique" ON "public"."raw_material_suppliers" USING "btree" (
    "raw_material_id",
    "supplier_id",
    COALESCE(
        "company_id",
        '00000000-0000-0000-0000-000000000000'::"uuid"
    )
);
CREATE INDEX "idx_raw_material_tests_material" ON "public"."raw_material_tests" USING "btree" ("raw_material_id");
CREATE INDEX "idx_raw_materials_category" ON "public"."raw_materials" USING "btree" ("category");
CREATE INDEX "idx_raw_materials_company" ON "public"."raw_materials" USING "btree" ("company_id");
CREATE INDEX "idx_raw_materials_version" ON "public"."raw_materials" USING "btree" ("id", "version");
CREATE INDEX "idx_recipes_is_active" ON "public"."recipes" USING "btree" ("is_active");
CREATE INDEX "idx_recipes_product_id" ON "public"."recipes" USING "btree" ("product_id");
CREATE INDEX "idx_recycle_bin_company_id" ON "public"."recycle_bin" USING "btree" ("company_id");
CREATE INDEX "idx_recycle_bin_deleted_by" ON "public"."recycle_bin" USING "btree" ("deleted_by");
CREATE INDEX "idx_recycle_bin_expires_at" ON "public"."recycle_bin" USING "btree" ("expires_at");
CREATE INDEX "idx_recycle_bin_item_type" ON "public"."recycle_bin" USING "btree" ("item_type");
CREATE INDEX "idx_report_review_history_action" ON "public"."report_review_history" USING "btree" ("action");
CREATE UNIQUE INDEX "idx_report_review_history_checksum" ON "public"."report_review_history" USING "btree" ("report_id", "checksum");
CREATE INDEX "idx_report_review_history_performed_at" ON "public"."report_review_history" USING "btree" ("performed_at" DESC);
CREATE INDEX "idx_report_review_history_performer" ON "public"."report_review_history" USING "btree" ("performed_by");
CREATE INDEX "idx_report_review_history_report" ON "public"."report_review_history" USING "btree" ("report_id");
CREATE INDEX "idx_rms_company" ON "public"."raw_material_suppliers" USING "btree" ("company_id");
CREATE INDEX "idx_rms_material" ON "public"."raw_material_suppliers" USING "btree" ("raw_material_id");
CREATE INDEX "idx_rms_primary" ON "public"."raw_material_suppliers" USING "btree" ("raw_material_id")
WHERE ("is_primary" = true);
CREATE INDEX "idx_rms_raw_material" ON "public"."raw_material_suppliers" USING "btree" ("raw_material_id");
CREATE INDEX "idx_rms_supplier" ON "public"."raw_material_suppliers" USING "btree" ("supplier_id");
CREATE INDEX "idx_rmt_company" ON "public"."raw_material_tests" USING "btree" ("company_id");
CREATE INDEX "idx_rmt_raw_material" ON "public"."raw_material_tests" USING "btree" ("raw_material_id");
CREATE INDEX "idx_rmt_test_type" ON "public"."raw_material_tests" USING "btree" ("test_type");
CREATE INDEX "idx_role_action_restrictions_role" ON "public"."role_action_restrictions" USING "btree" ("role_id");
CREATE UNIQUE INDEX "idx_role_action_restrictions_unique" ON "public"."role_action_restrictions" USING "btree" (
    "role_id",
    "module_code",
    COALESCE("stage_code", '__ALL__'::"text")
);
CREATE INDEX "idx_role_module_perm_module" ON "public"."role_module_permissions" USING "btree" ("module_code");
CREATE INDEX "idx_role_module_perm_role" ON "public"."role_module_permissions" USING "btree" ("role_id");
CREATE INDEX "idx_role_permissions_code" ON "public"."role_permissions" USING "btree" ("role_id", "permission_code");
CREATE INDEX "idx_role_permissions_permission" ON "public"."role_permissions" USING "btree" ("permission_id");
CREATE INDEX "idx_role_permissions_role" ON "public"."role_permissions" USING "btree" ("role_id");
CREATE INDEX "idx_role_permissions_role_granted" ON "public"."role_permissions" USING "btree" ("role_id", "granted")
WHERE ("granted" = true);
CREATE INDEX "idx_roles_active" ON "public"."roles" USING "btree" ("id")
WHERE ("is_active" = true);
CREATE INDEX "idx_roles_code" ON "public"."roles" USING "btree" ("code");
CREATE INDEX "idx_roles_company_code" ON "public"."roles" USING "btree" ("company_id", "code");
CREATE INDEX "idx_roles_company_id" ON "public"."roles" USING "btree" ("company_id");
CREATE INDEX "idx_roles_system" ON "public"."roles" USING "btree" ("is_system")
WHERE ("is_system" = true);
CREATE INDEX "idx_sections_department" ON "public"."sections" USING "btree" ("department_id");
CREATE INDEX "idx_share_activity_date" ON "public"."share_activity_log" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_share_activity_performer" ON "public"."share_activity_log" USING "btree" ("performed_by")
WHERE ("performed_by" IS NOT NULL);
CREATE INDEX "idx_share_activity_share" ON "public"."share_activity_log" USING "btree" ("share_id");
CREATE INDEX "idx_share_activity_type" ON "public"."share_activity_log" USING "btree" ("activity_type");
CREATE INDEX "idx_stage_permissions_lookup" ON "public"."stage_permissions" USING "btree" ("role_id", "module_code", "stage_code");
CREATE INDEX "idx_stage_permissions_role" ON "public"."stage_permissions" USING "btree" ("role_id");
CREATE INDEX "idx_suppliers_approved" ON "public"."suppliers" USING "btree" ("approved");
CREATE INDEX "idx_suppliers_company" ON "public"."suppliers" USING "btree" ("company_id");
CREATE INDEX "idx_suppliers_version" ON "public"."suppliers" USING "btree" ("id", "version");
CREATE INDEX "idx_task_comments_task" ON "public"."task_comments" USING "btree" ("task_id");
CREATE INDEX "idx_task_history_task" ON "public"."task_history" USING "btree" ("task_id");
CREATE INDEX "idx_tasks_assigned_status_due" ON "public"."tasks" USING "btree" ("assigned_to", "status", "due_date");
CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");
CREATE INDEX "idx_tasks_assigned_to_status" ON "public"."tasks" USING "btree" ("assigned_to", "status");
CREATE INDEX "idx_tasks_company" ON "public"."tasks" USING "btree" ("company_id");
CREATE INDEX "idx_tasks_created" ON "public"."tasks" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");
CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");
CREATE INDEX "idx_tasks_type" ON "public"."tasks" USING "btree" ("task_type");
CREATE INDEX "idx_temp_readings_equipment" ON "public"."temperature_readings" USING "btree" ("equipment_id");
CREATE INDEX "idx_templates_type" ON "public"."form_templates" USING "btree" ("type");
CREATE INDEX "idx_unified_folders_archived" ON "public"."unified_folders" USING "btree" ("archived")
WHERE ("archived" = false);
CREATE INDEX "idx_unified_folders_created_at" ON "public"."unified_folders" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_unified_folders_department" ON "public"."unified_folders" USING "btree" ("department_id")
WHERE ("department_id" IS NOT NULL);
CREATE UNIQUE INDEX "idx_unified_folders_department_default_unique" ON "public"."unified_folders" USING "btree" ("department_id")
WHERE ("is_default_for_department" = true);
CREATE INDEX "idx_unified_folders_is_default" ON "public"."unified_folders" USING "btree" ("is_default_for_department")
WHERE ("is_default_for_department" = true);
CREATE INDEX "idx_unified_folders_parent" ON "public"."unified_folders" USING "btree" ("parent_id")
WHERE ("parent_id" IS NOT NULL);
CREATE INDEX "idx_unified_folders_path" ON "public"."unified_folders" USING "gin" ("string_to_array"("path", '/'::"text"));
CREATE INDEX "idx_unified_folders_type" ON "public"."unified_folders" USING "btree" ("type");
CREATE INDEX "idx_user_departments_active" ON "public"."user_departments" USING "btree" ("user_id", "is_active")
WHERE ("is_active" = true);
CREATE INDEX "idx_user_departments_department_id" ON "public"."user_departments" USING "btree" ("department_id");
CREATE INDEX "idx_user_departments_user_dept" ON "public"."user_departments" USING "btree" ("user_id", "department_id");
CREATE INDEX "idx_user_departments_user_id" ON "public"."user_departments" USING "btree" ("user_id");
CREATE INDEX "idx_user_depts_dept" ON "public"."user_departments" USING "btree" ("department_id");
CREATE INDEX "idx_user_depts_user" ON "public"."user_departments" USING "btree" ("user_id");
CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role_id");
CREATE INDEX "idx_user_roles_user" ON "public"."user_roles" USING "btree" ("user_id");
CREATE UNIQUE INDEX "idx_user_roles_user_role_unique" ON "public"."user_roles" USING "btree" ("user_id", "role_id");
CREATE INDEX "idx_user_temp_roles_expires" ON "public"."user_temp_roles" USING "btree" ("expires_at")
WHERE (
        ("is_active" = true)
        AND ("expires_at" IS NOT NULL)
    );
CREATE INDEX "idx_user_temp_roles_user" ON "public"."user_temp_roles" USING "btree" ("user_id")
WHERE ("is_active" = true);
CREATE INDEX "idx_users_company" ON "public"."users" USING "btree" ("company_id");
CREATE INDEX "idx_users_department" ON "public"."users" USING "btree" ("department_id");
CREATE INDEX "idx_users_email_active" ON "public"."users" USING "btree" ("email")
WHERE ("is_active" = true);
CREATE INDEX "idx_users_is_active" ON "public"."users" USING "btree" ("id")
WHERE ("is_active" = true);
CREATE OR REPLACE TRIGGER "audit_form_instances"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."form_instances" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();
CREATE OR REPLACE TRIGGER "audit_form_templates"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."form_templates" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();
CREATE OR REPLACE TRIGGER "audit_lab_tests"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."lab_tests" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();
CREATE OR REPLACE TRIGGER "audit_material_receiving"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."material_receiving" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();
CREATE OR REPLACE TRIGGER "audit_products"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();
CREATE OR REPLACE TRIGGER "audit_raw_materials"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."raw_materials" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();
CREATE OR REPLACE TRIGGER "audit_suppliers"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();
CREATE OR REPLACE TRIGGER "auto_checksum_review_history" BEFORE
INSERT ON "public"."report_review_history" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_review_checksum"();
CREATE OR REPLACE TRIGGER "content_shares_updated_at_trigger" BEFORE
UPDATE ON "public"."content_shares" FOR EACH ROW EXECUTE FUNCTION "public"."update_content_shares_updated_at"();
CREATE OR REPLACE TRIGGER "enforce_report_lock_trigger" BEFORE
UPDATE ON "public"."form_instances" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_report_lock"();
CREATE OR REPLACE TRIGGER "form_instances_update_folder_stats"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."form_instances" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_folder_stats_on_instance"();
CREATE OR REPLACE TRIGGER "form_templates_update_folder_stats"
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON "public"."form_templates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_folder_stats_on_template"();
CREATE OR REPLACE TRIGGER "increment_form_instances_version" BEFORE
UPDATE ON "public"."form_instances" FOR EACH ROW EXECUTE FUNCTION "public"."increment_version"();
CREATE OR REPLACE TRIGGER "increment_form_templates_version" BEFORE
UPDATE ON "public"."form_templates" FOR EACH ROW EXECUTE FUNCTION "public"."increment_template_version"();
CREATE OR REPLACE TRIGGER "increment_lab_tests_version" BEFORE
UPDATE ON "public"."lab_tests" FOR EACH ROW EXECUTE FUNCTION "public"."increment_version"();
CREATE OR REPLACE TRIGGER "increment_material_receiving_version" BEFORE
UPDATE ON "public"."material_receiving" FOR EACH ROW EXECUTE FUNCTION "public"."increment_version"();
CREATE OR REPLACE TRIGGER "increment_products_version" BEFORE
UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."increment_version"();
CREATE OR REPLACE TRIGGER "increment_raw_materials_version" BEFORE
UPDATE ON "public"."raw_materials" FOR EACH ROW EXECUTE FUNCTION "public"."increment_version"();
CREATE OR REPLACE TRIGGER "increment_suppliers_version" BEFORE
UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."increment_version"();
CREATE OR REPLACE TRIGGER "notify_report_workflow_trigger"
AFTER
UPDATE ON "public"."form_instances" FOR EACH ROW
    WHEN (
        (
            "old"."status" IS DISTINCT
            FROM "new"."status"
        )
    ) EXECUTE FUNCTION "public"."notify_report_workflow"();
CREATE OR REPLACE TRIGGER "prevent_audit_logs_modification" BEFORE DELETE
    OR
UPDATE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_modification"();
CREATE OR REPLACE TRIGGER "prevent_audit_trail_modification" BEFORE DELETE
    OR
UPDATE ON "public"."audit_trail" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_modification"();
CREATE OR REPLACE TRIGGER "prevent_permission_audit_modification" BEFORE DELETE
    OR
UPDATE ON "public"."permission_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_modification"();
CREATE OR REPLACE TRIGGER "prevent_relationship_audit_modification" BEFORE DELETE
    OR
UPDATE ON "public"."relationship_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_modification"();
CREATE OR REPLACE TRIGGER "protect_report_review_history" BEFORE DELETE
    OR
UPDATE ON "public"."report_review_history" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_report_review_history_modification"();
CREATE OR REPLACE TRIGGER "tr_permission_audit"
AFTER
INSERT
    OR DELETE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."log_permission_change"();
CREATE OR REPLACE TRIGGER "tr_protect_locked_roles" BEFORE DELETE
    OR
UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_locked_roles"();
CREATE OR REPLACE TRIGGER "tr_protect_system_roles" BEFORE DELETE
    OR
UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_system_roles"();
CREATE OR REPLACE TRIGGER "tr_role_protection" BEFORE
INSERT
    OR DELETE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_role_protection"();
CREATE OR REPLACE TRIGGER "trg_audit_role_permissions"
AFTER
INSERT
    OR DELETE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_role_permissions_change"();
CREATE OR REPLACE TRIGGER "trg_check_department_hierarchy" BEFORE
INSERT
    OR
UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."check_department_hierarchy_depth"();
CREATE OR REPLACE TRIGGER "trg_module_stages_timestamp" BEFORE
UPDATE ON "public"."module_stages" FOR EACH ROW EXECUTE FUNCTION "public"."update_stage_timestamp"();
CREATE OR REPLACE TRIGGER "trg_module_visibility_timestamp" BEFORE
UPDATE ON "public"."module_data_visibility" FOR EACH ROW EXECUTE FUNCTION "public"."update_stage_timestamp"();
CREATE OR REPLACE TRIGGER "trg_protect_access_management_availability" BEFORE DELETE
    OR
UPDATE ON "public"."role_module_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."protect_access_management_availability"();
CREATE OR REPLACE TRIGGER "trg_protect_system_roles" BEFORE DELETE
    OR
UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_system_roles"();
CREATE OR REPLACE TRIGGER "trg_stage_permissions_timestamp" BEFORE
UPDATE ON "public"."stage_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_stage_timestamp"();
CREATE OR REPLACE TRIGGER "trg_validate_department_module_access_change" BEFORE
INSERT
    OR DELETE
    OR
UPDATE ON "public"."department_module_access" FOR EACH ROW EXECUTE FUNCTION "public"."validate_department_module_access_change"();
CREATE OR REPLACE TRIGGER "trg_validate_role_module_permissions_change" BEFORE
INSERT
    OR DELETE
    OR
UPDATE ON "public"."role_module_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_role_module_permissions_change"();
CREATE OR REPLACE TRIGGER "trg_validate_role_permissions_change" BEFORE
INSERT
    OR DELETE
    OR
UPDATE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_role_permissions_change"();
CREATE OR REPLACE TRIGGER "trg_validate_roles_change" BEFORE
INSERT
    OR DELETE
    OR
UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_roles_change"();
CREATE OR REPLACE TRIGGER "trg_validate_user_roles_change" BEFORE
INSERT
    OR DELETE
    OR
UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_user_roles_change"();
CREATE OR REPLACE TRIGGER "trigger_recipes_updated_at" BEFORE
UPDATE ON "public"."recipes" FOR EACH ROW EXECUTE FUNCTION "public"."update_recipes_updated_at"();
CREATE OR REPLACE TRIGGER "unified_folders_path_trigger" BEFORE
INSERT
    OR
UPDATE OF "parent_id" ON "public"."unified_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_unified_folders_path"();
CREATE OR REPLACE TRIGGER "unified_folders_updated_at_trigger" BEFORE
UPDATE ON "public"."unified_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_unified_folders_updated_at"();
CREATE OR REPLACE TRIGGER "update_companies_updated_at" BEFORE
UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_departments_updated_at" BEFORE
UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_form_instances_updated_at" BEFORE
UPDATE ON "public"."form_instances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_form_templates_updated_at" BEFORE
UPDATE ON "public"."form_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_lab_tests_updated_at" BEFORE
UPDATE ON "public"."lab_tests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_material_receiving_updated_at" BEFORE
UPDATE ON "public"."material_receiving" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_ncr_reports_updated_at" BEFORE
UPDATE ON "public"."ncr_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_permissions_updated_at" BEFORE
UPDATE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE
UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_raw_materials_updated_at" BEFORE
UPDATE ON "public"."raw_materials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_roles_updated_at" BEFORE
UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE
UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE
UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "validate_report_transition_trigger" BEFORE
UPDATE ON "public"."form_instances" FOR EACH ROW
    WHEN (
        (
            "old"."status" IS DISTINCT
            FROM "new"."status"
        )
    ) EXECUTE FUNCTION "public"."validate_report_transition"();
ALTER TABLE ONLY "public"."audit_logs"
ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."audit_trail"
ADD CONSTRAINT "audit_trail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."cleaning_records"
ADD CONSTRAINT "cleaning_records_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."sanitation_areas"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."content_shares"
ADD CONSTRAINT "content_shares_shared_by_department_id_fkey" FOREIGN KEY ("shared_by_department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."content_shares"
ADD CONSTRAINT "content_shares_shared_by_user_id_fkey" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."control_points"
ADD CONSTRAINT "control_points_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."corrective_actions"
ADD CONSTRAINT "corrective_actions_control_point_id_fkey" FOREIGN KEY ("control_point_id") REFERENCES "public"."control_points"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."corrective_actions"
ADD CONSTRAINT "corrective_actions_monitoring_record_id_fkey" FOREIGN KEY ("monitoring_record_id") REFERENCES "public"."monitoring_records"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."department_module_access"
ADD CONSTRAINT "department_module_access_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."department_module_access"
ADD CONSTRAINT "department_module_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."department_module_access"
ADD CONSTRAINT "department_module_access_last_changed_by_fkey" FOREIGN KEY ("last_changed_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."department_module_access"
ADD CONSTRAINT "department_module_access_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "public"."app_modules"("code") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."department_roles"
ADD CONSTRAINT "department_roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."department_roles"
ADD CONSTRAINT "department_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."departments"
ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "public"."departments"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."document_shares"
ADD CONSTRAINT "document_shares_shared_by_department_id_fkey" FOREIGN KEY ("shared_by_department_id") REFERENCES "public"."departments"("id");
ALTER TABLE ONLY "public"."document_shares"
ADD CONSTRAINT "document_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."document_shares"
ADD CONSTRAINT "document_shares_shared_with_department_id_fkey" FOREIGN KEY ("shared_with_department_id") REFERENCES "public"."departments"("id");
ALTER TABLE ONLY "public"."document_shares"
ADD CONSTRAINT "document_shares_shared_with_user_id_fkey" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."app_modules"
ADD CONSTRAINT "fk_app_modules_parent" FOREIGN KEY ("parent_module_code") REFERENCES "public"."app_modules"("code") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."corrective_actions"
ADD CONSTRAINT "fk_corrective_actions_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."departments"
ADD CONSTRAINT "fk_departments_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."departments"
ADD CONSTRAINT "fk_departments_manager_user" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."departments"
ADD CONSTRAINT "fk_departments_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."pre_op_checks"
ADD CONSTRAINT "fk_pre_op_checks_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."recipes"
ADD CONSTRAINT "fk_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sanitation_areas"
ADD CONSTRAINT "fk_sanitation_areas_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."temperature_equipment"
ADD CONSTRAINT "fk_temperature_equipment_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."temperature_readings"
ADD CONSTRAINT "fk_temperature_readings_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."folders"
ADD CONSTRAINT "folders_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."folders"
ADD CONSTRAINT "folders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."folders"
ADD CONSTRAINT "folders_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."folders"
ADD CONSTRAINT "folders_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."folders"
ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON UPDATE CASCADE ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_share_source_department_id_fkey" FOREIGN KEY ("share_source_department_id") REFERENCES "public"."departments"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."form_templates"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."form_instances"
ADD CONSTRAINT "form_instances_unified_folder_id_fkey" FOREIGN KEY ("unified_folder_id") REFERENCES "public"."unified_folders"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_templates"
ADD CONSTRAINT "form_templates_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_templates"
ADD CONSTRAINT "form_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."form_templates"
ADD CONSTRAINT "form_templates_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");
ALTER TABLE ONLY "public"."form_templates"
ADD CONSTRAINT "form_templates_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_templates"
ADD CONSTRAINT "form_templates_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_templates"
ADD CONSTRAINT "form_templates_share_source_department_id_fkey" FOREIGN KEY ("share_source_department_id") REFERENCES "public"."departments"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."form_templates"
ADD CONSTRAINT "form_templates_unified_folder_id_fkey" FOREIGN KEY ("unified_folder_id") REFERENCES "public"."unified_folders"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."inspection_criteria"
ADD CONSTRAINT "inspection_criteria_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."job_title_roles"
ADD CONSTRAINT "job_title_roles_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_titles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."job_title_roles"
ADD CONSTRAINT "job_title_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."job_titles"
ADD CONSTRAINT "job_titles_default_role_id_fkey" FOREIGN KEY ("default_role_id") REFERENCES "public"."roles"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."job_titles"
ADD CONSTRAINT "job_titles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");
ALTER TABLE ONLY "public"."lab_samples"
ADD CONSTRAINT "lab_samples_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."lab_tests"
ADD CONSTRAINT "lab_tests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."lab_tests"
ADD CONSTRAINT "lab_tests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");
ALTER TABLE ONLY "public"."lab_tests"
ADD CONSTRAINT "lab_tests_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."lab_tests"
ADD CONSTRAINT "lab_tests_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "public"."lab_samples"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."material_receiving"
ADD CONSTRAINT "material_receiving_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."material_receiving"
ADD CONSTRAINT "material_receiving_lab_test_id_fkey" FOREIGN KEY ("lab_test_id") REFERENCES "public"."lab_tests"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."material_receiving"
ADD CONSTRAINT "material_receiving_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."material_receiving"
ADD CONSTRAINT "material_receiving_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id");
ALTER TABLE ONLY "public"."material_receiving"
ADD CONSTRAINT "material_receiving_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."module_data_visibility"
ADD CONSTRAINT "module_data_visibility_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."module_data_visibility"
ADD CONSTRAINT "module_data_visibility_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."module_stages"
ADD CONSTRAINT "module_stages_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "public"."app_modules"("code") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."monitoring_records"
ADD CONSTRAINT "monitoring_records_control_point_id_fkey" FOREIGN KEY ("control_point_id") REFERENCES "public"."control_points"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ncr_comments"
ADD CONSTRAINT "ncr_comments_ncr_id_fkey" FOREIGN KEY ("ncr_id") REFERENCES "public"."ncr_reports"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ncr_comments"
ADD CONSTRAINT "ncr_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."ncr_comments"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ncr_reports"
ADD CONSTRAINT "ncr_reports_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."ncr_reports"
ADD CONSTRAINT "ncr_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."ncr_reports"
ADD CONSTRAINT "ncr_reports_source_department_id_fkey" FOREIGN KEY ("source_department_id") REFERENCES "public"."departments"("id");
ALTER TABLE ONLY "public"."ncr_reports"
ADD CONSTRAINT "ncr_reports_target_department_id_fkey" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id");
ALTER TABLE ONLY "public"."ncr_stage_permissions"
ADD CONSTRAINT "ncr_stage_permissions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ncr_stage_permissions"
ADD CONSTRAINT "ncr_stage_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notification_preferences"
ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications"
ADD CONSTRAINT "notifications_ncr_id_fkey" FOREIGN KEY ("ncr_id") REFERENCES "public"."ncr_reports"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications"
ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."notifications"
ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."permission_audit_log"
ADD CONSTRAINT "permission_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."permission_audit_log"
ADD CONSTRAINT "permission_audit_log_target_role_id_fkey" FOREIGN KEY ("target_role_id") REFERENCES "public"."roles"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."permission_hierarchy"
ADD CONSTRAINT "permission_hierarchy_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."permission_hierarchy"
ADD CONSTRAINT "permission_hierarchy_requires_permission_fkey" FOREIGN KEY ("requires_permission") REFERENCES "public"."permissions"("code") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."production_lines"
ADD CONSTRAINT "production_lines_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."products"
ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."products"
ADD CONSTRAINT "products_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."products"
ADD CONSTRAINT "products_production_line_id_fkey" FOREIGN KEY ("production_line_id") REFERENCES "public"."production_lines"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."raw_material_suppliers"
ADD CONSTRAINT "raw_material_suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."raw_material_suppliers"
ADD CONSTRAINT "raw_material_suppliers_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."raw_material_suppliers"
ADD CONSTRAINT "raw_material_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."raw_material_tests"
ADD CONSTRAINT "raw_material_tests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."raw_material_tests"
ADD CONSTRAINT "raw_material_tests_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "public"."inspection_criteria"("id");
ALTER TABLE ONLY "public"."raw_material_tests"
ADD CONSTRAINT "raw_material_tests_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."raw_materials"
ADD CONSTRAINT "raw_materials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."raw_materials"
ADD CONSTRAINT "raw_materials_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."raw_materials"
ADD CONSTRAINT "raw_materials_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."recycle_bin"
ADD CONSTRAINT "recycle_bin_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."recycle_bin"
ADD CONSTRAINT "recycle_bin_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."relationship_audit_log"
ADD CONSTRAINT "relationship_audit_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."report_review_history"
ADD CONSTRAINT "report_review_history_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."report_review_history"
ADD CONSTRAINT "report_review_history_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."form_instances"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."role_action_restrictions"
ADD CONSTRAINT "role_action_restrictions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."role_action_restrictions"
ADD CONSTRAINT "role_action_restrictions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."role_action_restrictions"
ADD CONSTRAINT "role_action_restrictions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."role_conflicts"
ADD CONSTRAINT "role_conflicts_role_a_id_fkey" FOREIGN KEY ("role_a_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."role_conflicts"
ADD CONSTRAINT "role_conflicts_role_b_id_fkey" FOREIGN KEY ("role_b_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."role_module_permissions"
ADD CONSTRAINT "role_module_permissions_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "public"."app_modules"("code") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."role_module_permissions"
ADD CONSTRAINT "role_module_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."role_permissions"
ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."role_permissions"
ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."roles"
ADD CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."roles"
ADD CONSTRAINT "roles_replacement_role_id_fkey" FOREIGN KEY ("replacement_role_id") REFERENCES "public"."roles"("id");
ALTER TABLE ONLY "public"."sections"
ADD CONSTRAINT "sections_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sections"
ADD CONSTRAINT "sections_supervisor_user_id_fkey" FOREIGN KEY ("supervisor_user_id") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."share_activity_log"
ADD CONSTRAINT "share_activity_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."share_activity_log"
ADD CONSTRAINT "share_activity_log_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "public"."content_shares"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."stage_permissions"
ADD CONSTRAINT "stage_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."stage_permissions"
ADD CONSTRAINT "stage_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."suppliers"
ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."suppliers"
ADD CONSTRAINT "suppliers_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."task_comments"
ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."task_comments"
ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_history"
ADD CONSTRAINT "task_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."task_history"
ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tasks"
ADD CONSTRAINT "tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."tasks"
ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."tasks"
ADD CONSTRAINT "tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."tasks"
ADD CONSTRAINT "tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."tasks"
ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."tasks"
ADD CONSTRAINT "tasks_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."temperature_readings"
ADD CONSTRAINT "temperature_readings_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."temperature_equipment"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."unified_folders"
ADD CONSTRAINT "unified_folders_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."unified_folders"
ADD CONSTRAINT "unified_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."unified_folders"
ADD CONSTRAINT "unified_folders_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."unified_folders"
ADD CONSTRAINT "unified_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."unified_folders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."unified_folders"
ADD CONSTRAINT "unified_folders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."user_departments"
ADD CONSTRAINT "user_departments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."user_departments"
ADD CONSTRAINT "user_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."user_departments"
ADD CONSTRAINT "user_departments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_roles"
ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."user_roles"
ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."user_roles"
ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_temp_roles"
ADD CONSTRAINT "user_temp_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."user_temp_roles"
ADD CONSTRAINT "user_temp_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_temp_roles"
ADD CONSTRAINT "user_temp_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_titles"("id");
ALTER TABLE "public"."_backup_permission_matrix" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_backup_report_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_backup_template_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."allergen_profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allergen_profiles_delete_matrix" ON "public"."allergen_profiles" FOR DELETE TO "authenticated" USING (
    "public"."check_food_safety_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "allergen_profiles_insert_matrix" ON "public"."allergen_profiles" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_food_safety_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "allergen_profiles_select_matrix" ON "public"."allergen_profiles" FOR
SELECT TO "authenticated" USING (
        "public"."check_food_safety_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "allergen_profiles_update_matrix" ON "public"."allergen_profiles" FOR
UPDATE TO "authenticated" USING (
        "public"."check_food_safety_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_food_safety_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."app_modules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_modules_modify_policy" ON "public"."app_modules" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "app_modules_select_policy" ON "public"."app_modules" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select_policy" ON "public"."audit_logs" FOR
SELECT TO "authenticated" USING (
        (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."user_roles" "ur"
                        JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                    )
                WHERE (
                        (
                            "ur"."user_id" = (
                                SELECT "auth"."uid"() AS "uid"
                            )
                        )
                        AND (
                            "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                        )
                    )
            )
        )
    );
ALTER TABLE "public"."audit_trail" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_trail_select_policy" ON "public"."audit_trail" FOR
SELECT TO "authenticated" USING (
        (
            EXISTS (
                SELECT 1
                FROM "public"."users" "u"
                WHERE (
                        (
                            "u"."id" = (
                                SELECT "auth"."uid"() AS "uid"
                            )
                        )
                        AND ("u"."company_id" = "audit_trail"."company_id")
                    )
            )
        )
    );
CREATE POLICY "backup_permission_matrix_policy" ON "public"."_backup_permission_matrix" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND ("r"."code" = 'super_admin'::"text")
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND ("r"."code" = 'super_admin'::"text")
                )
        )
    )
);
CREATE POLICY "backup_report_folders_policy" ON "public"."_backup_report_folders" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND ("r"."code" = 'super_admin'::"text")
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND ("r"."code" = 'super_admin'::"text")
                )
        )
    )
);
CREATE POLICY "backup_template_folders_policy" ON "public"."_backup_template_folders" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND ("r"."code" = 'super_admin'::"text")
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND ("r"."code" = 'super_admin'::"text")
                )
        )
    )
);
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_delete_matrix" ON "public"."categories" FOR DELETE TO "authenticated" USING (
    "public"."check_master_data_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "categories_insert_matrix" ON "public"."categories" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "categories_select_matrix" ON "public"."categories" FOR
SELECT TO "authenticated" USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "categories_update_matrix" ON "public"."categories" FOR
UPDATE TO "authenticated" USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."cleaning_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cleaning_records_delete_matrix" ON "public"."cleaning_records" FOR DELETE TO "authenticated" USING (
    "public"."check_food_safety_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "cleaning_records_insert_matrix" ON "public"."cleaning_records" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_food_safety_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "cleaning_records_select_matrix" ON "public"."cleaning_records" FOR
SELECT TO "authenticated" USING (
        "public"."check_food_safety_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "cleaning_records_update_matrix" ON "public"."cleaning_records" FOR
UPDATE TO "authenticated" USING (
        "public"."check_food_safety_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_food_safety_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_modify_policy" ON "public"."companies" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "companies_select_policy" ON "public"."companies" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."content_shares" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_shares_modify_policy" ON "public"."content_shares" TO "authenticated" USING (
    (
        (
            "shared_by_user_id" = (
                SELECT "auth"."uid"() AS "uid"
            )
        )
        OR (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."user_roles" "ur"
                        JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                    )
                WHERE (
                        (
                            "ur"."user_id" = (
                                SELECT "auth"."uid"() AS "uid"
                            )
                        )
                        AND (
                            "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                        )
                    )
            )
        )
    )
) WITH CHECK (
    (
        (
            "shared_by_user_id" = (
                SELECT "auth"."uid"() AS "uid"
            )
        )
        OR (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."user_roles" "ur"
                        JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                    )
                WHERE (
                        (
                            "ur"."user_id" = (
                                SELECT "auth"."uid"() AS "uid"
                            )
                        )
                        AND (
                            "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                        )
                    )
            )
        )
    )
);
CREATE POLICY "content_shares_select_policy" ON "public"."content_shares" FOR
SELECT TO "authenticated" USING (
        (
            (
                "shared_by_user_id" = (
                    SELECT "auth"."uid"() AS "uid"
                )
            )
            OR (
                (
                    SELECT "auth"."uid"() AS "uid"
                ) = ANY ("shared_with_users")
            )
            OR ("share_type" = 'public'::"text")
            OR (
                EXISTS (
                    SELECT 1
                    FROM "public"."user_roles" "ur"
                    WHERE (
                            (
                                "ur"."user_id" = (
                                    SELECT "auth"."uid"() AS "uid"
                                )
                            )
                            AND (
                                "ur"."role_id" = ANY ("content_shares"."shared_with_roles")
                            )
                        )
                )
            )
        )
    );
ALTER TABLE "public"."control_points" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "control_points_delete_matrix" ON "public"."control_points" FOR DELETE TO "authenticated" USING (
    "public"."check_food_safety_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "control_points_insert_matrix" ON "public"."control_points" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_food_safety_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "control_points_select_matrix" ON "public"."control_points" FOR
SELECT TO "authenticated" USING (
        "public"."check_food_safety_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "control_points_update_matrix" ON "public"."control_points" FOR
UPDATE TO "authenticated" USING (
        "public"."check_food_safety_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_food_safety_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."corrective_actions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corrective_actions_delete_matrix" ON "public"."corrective_actions" FOR DELETE TO "authenticated" USING (
    "public"."check_ncr_permission"("auth"."uid"(), 'delete'::"text", NULL::"text")
);
CREATE POLICY "corrective_actions_insert_matrix" ON "public"."corrective_actions" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_ncr_permission"(
            "auth"."uid"(),
            'corrective_action'::"text",
            NULL::"text"
        )
    );
CREATE POLICY "corrective_actions_select_matrix" ON "public"."corrective_actions" FOR
SELECT TO "authenticated" USING (
        "public"."check_ncr_permission"("auth"."uid"(), 'view'::"text", NULL::"text")
    );
CREATE POLICY "corrective_actions_update_matrix" ON "public"."corrective_actions" FOR
UPDATE TO "authenticated" USING (
        "public"."check_ncr_permission"(
            "auth"."uid"(),
            'corrective_action'::"text",
            NULL::"text"
        )
    ) WITH CHECK (
        "public"."check_ncr_permission"(
            "auth"."uid"(),
            'corrective_action'::"text",
            NULL::"text"
        )
    );
ALTER TABLE "public"."department_module_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."department_roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "department_roles_modify_policy" ON "public"."department_roles" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "department_roles_select_policy" ON "public"."department_roles" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_modify_policy" ON "public"."departments" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "departments_select_policy" ON "public"."departments" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "dept_module_access_modify_policy" ON "public"."department_module_access" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "dept_module_access_select_policy" ON "public"."department_module_access" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."document_shares" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_shares_modify_policy" ON "public"."document_shares" TO "authenticated" USING (
    (
        (
            "shared_by" = (
                SELECT "auth"."uid"() AS "uid"
            )
        )
        OR (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."user_roles" "ur"
                        JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                    )
                WHERE (
                        (
                            "ur"."user_id" = (
                                SELECT "auth"."uid"() AS "uid"
                            )
                        )
                        AND (
                            "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                        )
                    )
            )
        )
    )
) WITH CHECK (
    (
        (
            "shared_by" = (
                SELECT "auth"."uid"() AS "uid"
            )
        )
        OR (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."user_roles" "ur"
                        JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                    )
                WHERE (
                        (
                            "ur"."user_id" = (
                                SELECT "auth"."uid"() AS "uid"
                            )
                        )
                        AND (
                            "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                        )
                    )
            )
        )
    )
);
CREATE POLICY "document_shares_select_policy" ON "public"."document_shares" FOR
SELECT TO "authenticated" USING (
        (
            (
                "shared_by" = (
                    SELECT "auth"."uid"() AS "uid"
                )
            )
            OR (
                "shared_with_user_id" = (
                    SELECT "auth"."uid"() AS "uid"
                )
            )
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."user_roles" "ur"
                            JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                        )
                    WHERE (
                            (
                                "ur"."user_id" = (
                                    SELECT "auth"."uid"() AS "uid"
                                )
                            )
                            AND (
                                "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                            )
                        )
                )
            )
        )
    );
ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "folders_delete_matrix" ON "public"."folders" FOR DELETE TO "authenticated" USING (
    "public"."check_forms_permission"(
        "auth"."uid"(),
        'delete'::"text",
        "department_id"
    )
);
CREATE POLICY "folders_insert_matrix" ON "public"."folders" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_forms_permission"(
            "auth"."uid"(),
            'create'::"text",
            "department_id"
        )
    );
CREATE POLICY "folders_select_matrix" ON "public"."folders" FOR
SELECT TO "authenticated" USING (
        "public"."check_forms_permission"("auth"."uid"(), 'view'::"text", "department_id")
    );
CREATE POLICY "folders_update_matrix" ON "public"."folders" FOR
UPDATE TO "authenticated" USING (
        "public"."check_forms_permission"("auth"."uid"(), 'edit'::"text", "department_id")
    ) WITH CHECK (
        "public"."check_forms_permission"("auth"."uid"(), 'edit'::"text", "department_id")
    );
ALTER TABLE "public"."form_instances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_instances_delete_matrix" ON "public"."form_instances" FOR DELETE TO "authenticated" USING (
    "public"."check_forms_permission"(
        "auth"."uid"(),
        'delete'::"text",
        "department_id"
    )
);
CREATE POLICY "form_instances_insert_matrix" ON "public"."form_instances" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_forms_permission"(
            "auth"."uid"(),
            'create'::"text",
            "department_id"
        )
    );
CREATE POLICY "form_instances_select_matrix" ON "public"."form_instances" FOR
SELECT TO "authenticated" USING (
        "public"."check_forms_permission"("auth"."uid"(), 'view'::"text", "department_id")
    );
CREATE POLICY "form_instances_update_matrix" ON "public"."form_instances" FOR
UPDATE TO "authenticated" USING (
        "public"."check_forms_permission"("auth"."uid"(), 'edit'::"text", "department_id")
    ) WITH CHECK (
        "public"."check_forms_permission"("auth"."uid"(), 'edit'::"text", "department_id")
    );
ALTER TABLE "public"."form_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_templates_delete_matrix" ON "public"."form_templates" FOR DELETE TO "authenticated" USING (
    "public"."check_forms_permission"(
        "auth"."uid"(),
        'delete'::"text",
        "department_id"
    )
);
CREATE POLICY "form_templates_insert_matrix" ON "public"."form_templates" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_forms_permission"(
            "auth"."uid"(),
            'create'::"text",
            "department_id"
        )
    );
CREATE POLICY "form_templates_select_matrix" ON "public"."form_templates" FOR
SELECT TO "authenticated" USING (
        "public"."check_forms_permission"("auth"."uid"(), 'view'::"text", "department_id")
    );
CREATE POLICY "form_templates_update_matrix" ON "public"."form_templates" FOR
UPDATE TO "authenticated" USING (
        "public"."check_forms_permission"("auth"."uid"(), 'edit'::"text", "department_id")
    ) WITH CHECK (
        "public"."check_forms_permission"("auth"."uid"(), 'edit'::"text", "department_id")
    );
ALTER TABLE "public"."inspection_criteria" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inspection_criteria_delete_matrix" ON "public"."inspection_criteria" FOR DELETE TO "authenticated" USING (
    "public"."check_lab_permission"("auth"."uid"(), 'manage_criteria'::"text")
);
CREATE POLICY "inspection_criteria_insert_matrix" ON "public"."inspection_criteria" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_lab_permission"("auth"."uid"(), 'manage_criteria'::"text")
    );
CREATE POLICY "inspection_criteria_select_matrix" ON "public"."inspection_criteria" FOR
SELECT TO "authenticated" USING (
        "public"."check_lab_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "inspection_criteria_update_matrix" ON "public"."inspection_criteria" FOR
UPDATE TO "authenticated" USING (
        "public"."check_lab_permission"("auth"."uid"(), 'manage_criteria'::"text")
    ) WITH CHECK (
        "public"."check_lab_permission"("auth"."uid"(), 'manage_criteria'::"text")
    );
ALTER TABLE "public"."job_title_roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_title_roles_modify_policy" ON "public"."job_title_roles" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "job_title_roles_select_policy" ON "public"."job_title_roles" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."job_titles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_titles_modify_policy" ON "public"."job_titles" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "job_titles_select_policy" ON "public"."job_titles" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."lab_samples" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_samples_delete_matrix" ON "public"."lab_samples" FOR DELETE TO "authenticated" USING (
    "public"."check_lab_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "lab_samples_insert_matrix" ON "public"."lab_samples" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_lab_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "lab_samples_select_matrix" ON "public"."lab_samples" FOR
SELECT TO "authenticated" USING (
        "public"."check_lab_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "lab_samples_update_matrix" ON "public"."lab_samples" FOR
UPDATE TO "authenticated" USING (
        "public"."check_lab_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_lab_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."lab_tests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_tests_delete_matrix" ON "public"."lab_tests" FOR DELETE TO "authenticated" USING (
    "public"."check_lab_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "lab_tests_insert_matrix" ON "public"."lab_tests" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_lab_permission"("auth"."uid"(), 'request_test'::"text")
    );
CREATE POLICY "lab_tests_select_matrix" ON "public"."lab_tests" FOR
SELECT TO "authenticated" USING (
        "public"."check_lab_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "lab_tests_update_matrix" ON "public"."lab_tests" FOR
UPDATE TO "authenticated" USING (
        "public"."check_lab_permission"("auth"."uid"(), 'enter_results'::"text")
    ) WITH CHECK (
        "public"."check_lab_permission"("auth"."uid"(), 'enter_results'::"text")
    );
ALTER TABLE "public"."material_receiving" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."module_data_visibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."module_stages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "module_stages_modify_policy" ON "public"."module_stages" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "module_stages_select_policy" ON "public"."module_stages" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."monitoring_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monitoring_records_delete_matrix" ON "public"."monitoring_records" FOR DELETE TO "authenticated" USING (
    "public"."check_food_safety_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "monitoring_records_insert_matrix" ON "public"."monitoring_records" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_food_safety_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "monitoring_records_select_matrix" ON "public"."monitoring_records" FOR
SELECT TO "authenticated" USING (
        "public"."check_food_safety_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "monitoring_records_update_matrix" ON "public"."monitoring_records" FOR
UPDATE TO "authenticated" USING (
        "public"."check_food_safety_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_food_safety_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."ncr_comments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncr_comments_delete_matrix" ON "public"."ncr_comments" FOR DELETE TO "authenticated" USING (
    (
        ("author_id" = ("auth"."uid"())::"text")
        OR "public"."check_ncr_permission"("auth"."uid"(), 'delete'::"text", NULL::"text")
    )
);
CREATE POLICY "ncr_comments_insert_matrix" ON "public"."ncr_comments" FOR
INSERT TO "authenticated" WITH CHECK (
        (
            "public"."check_ncr_permission"("auth"."uid"(), 'comment'::"text", NULL::"text")
            OR "public"."check_ncr_permission"("auth"."uid"(), 'view'::"text", NULL::"text")
        )
    );
CREATE POLICY "ncr_comments_select_matrix" ON "public"."ncr_comments" FOR
SELECT TO "authenticated" USING (
        "public"."check_ncr_permission"("auth"."uid"(), 'view'::"text", NULL::"text")
    );
CREATE POLICY "ncr_comments_update_matrix" ON "public"."ncr_comments" FOR
UPDATE TO "authenticated" USING (("author_id" = ("auth"."uid"())::"text")) WITH CHECK (("author_id" = ("auth"."uid"())::"text"));
ALTER TABLE "public"."ncr_reports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncr_reports_delete_matrix" ON "public"."ncr_reports" FOR DELETE TO "authenticated" USING (
    "public"."check_ncr_permission"(
        "auth"."uid"(),
        'delete'::"text",
        "current_stage"
    )
);
CREATE POLICY "ncr_reports_insert_matrix" ON "public"."ncr_reports" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_ncr_permission"(
            "auth"."uid"(),
            'create'::"text",
            'initial_report'::"text"
        )
    );
CREATE POLICY "ncr_reports_select_matrix" ON "public"."ncr_reports" FOR
SELECT TO "authenticated" USING (
        "public"."check_ncr_permission"("auth"."uid"(), 'view'::"text", "current_stage")
    );
CREATE POLICY "ncr_reports_update_matrix" ON "public"."ncr_reports" FOR
UPDATE TO "authenticated" USING (
        "public"."check_ncr_permission"("auth"."uid"(), 'edit'::"text", "current_stage")
    ) WITH CHECK (
        "public"."check_ncr_permission"("auth"."uid"(), 'edit'::"text", "current_stage")
    );
ALTER TABLE "public"."ncr_stage_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncr_stage_permissions_modify_policy" ON "public"."ncr_stage_permissions" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "ncr_stage_permissions_select_policy" ON "public"."ncr_stage_permissions" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."ncr_workflow_stages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncr_workflow_stages_modify_policy" ON "public"."ncr_workflow_stages" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "ncr_workflow_stages_select_policy" ON "public"."ncr_workflow_stages" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_templates_modify_policy" ON "public"."notification_templates" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "notification_templates_select_policy" ON "public"."notification_templates" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_modify_policy" ON "public"."notifications" TO "authenticated" USING (
    (
        (
            "user_id" = (
                SELECT "auth"."uid"() AS "uid"
            )
        )
        OR (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."user_roles" "ur"
                        JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                    )
                WHERE (
                        (
                            "ur"."user_id" = (
                                SELECT "auth"."uid"() AS "uid"
                            )
                        )
                        AND (
                            "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                        )
                    )
            )
        )
    )
) WITH CHECK (
    (
        (
            "user_id" = (
                SELECT "auth"."uid"() AS "uid"
            )
        )
        OR (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."user_roles" "ur"
                        JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                    )
                WHERE (
                        (
                            "ur"."user_id" = (
                                SELECT "auth"."uid"() AS "uid"
                            )
                        )
                        AND (
                            "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                        )
                    )
            )
        )
    )
);
CREATE POLICY "notifications_select_policy" ON "public"."notifications" FOR
SELECT TO "authenticated" USING (
        (
            (
                "user_id" = (
                    SELECT "auth"."uid"() AS "uid"
                )
            )
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."user_roles" "ur"
                            JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                        )
                    WHERE (
                            (
                                "ur"."user_id" = (
                                    SELECT "auth"."uid"() AS "uid"
                                )
                            )
                            AND (
                                "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                            )
                        )
                )
            )
        )
    );
ALTER TABLE "public"."permission_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."permission_hierarchy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_modify_policy" ON "public"."permissions" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
) WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."user_roles" "ur"
                    JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id"))
                )
            WHERE (
                    (
                        "ur"."user_id" = (
                            SELECT "auth"."uid"() AS "uid"
                        )
                    )
                    AND (
                        "r"."code" = ANY (ARRAY ['super_admin'::"text", 'admin'::"text"])
                    )
                )
        )
    )
);
CREATE POLICY "permissions_select_policy" ON "public"."permissions" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."pre_op_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."production_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "production_lines_delete_policy" ON "public"."production_lines" FOR DELETE USING (
    (
        "public"."is_admin_or_super_admin"()
        OR "public"."check_user_permission"(
            "auth"."uid"(),
            'products'::"text",
            'delete'::"text"
        )
        OR (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."role_permissions" "rp"
                        JOIN "public"."user_roles" "ur" ON (("ur"."role_id" = "rp"."role_id"))
                    )
                WHERE (
                        ("ur"."user_id" = "auth"."uid"())
                        AND (
                            "rp"."permission_code" = 'production_lines.delete'::"text"
                        )
                        AND ("rp"."granted" = true)
                    )
            )
        )
    )
);
CREATE POLICY "production_lines_insert_policy" ON "public"."production_lines" FOR
INSERT WITH CHECK (
        (
            "public"."is_admin_or_super_admin"()
            OR "public"."check_user_permission"(
                "auth"."uid"(),
                'products'::"text",
                'create'::"text"
            )
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."role_permissions" "rp"
                            JOIN "public"."user_roles" "ur" ON (("ur"."role_id" = "rp"."role_id"))
                        )
                    WHERE (
                            ("ur"."user_id" = "auth"."uid"())
                            AND (
                                "rp"."permission_code" = 'production_lines.create'::"text"
                            )
                            AND ("rp"."granted" = true)
                        )
                )
            )
        )
    );
CREATE POLICY "production_lines_select_policy" ON "public"."production_lines" FOR
SELECT USING (
        (
            "public"."is_admin_or_super_admin"()
            OR "public"."check_user_permission"(
                "auth"."uid"(),
                'products'::"text",
                'view'::"text"
            )
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."role_permissions" "rp"
                            JOIN "public"."user_roles" "ur" ON (("ur"."role_id" = "rp"."role_id"))
                        )
                    WHERE (
                            ("ur"."user_id" = "auth"."uid"())
                            AND (
                                "rp"."permission_code" = 'production_lines.view'::"text"
                            )
                            AND ("rp"."granted" = true)
                        )
                )
            )
        )
    );
CREATE POLICY "production_lines_update_policy" ON "public"."production_lines" FOR
UPDATE USING (
        (
            "public"."is_admin_or_super_admin"()
            OR "public"."check_user_permission"(
                "auth"."uid"(),
                'products'::"text",
                'edit'::"text"
            )
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."role_permissions" "rp"
                            JOIN "public"."user_roles" "ur" ON (("ur"."role_id" = "rp"."role_id"))
                        )
                    WHERE (
                            ("ur"."user_id" = "auth"."uid"())
                            AND (
                                "rp"."permission_code" = 'production_lines.edit'::"text"
                            )
                            AND ("rp"."granted" = true)
                        )
                )
            )
        )
    );
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_delete_policy" ON "public"."products" FOR DELETE USING (
    (
        "public"."is_admin_or_super_admin"()
        OR "public"."check_user_permission"(
            "auth"."uid"(),
            'products'::"text",
            'delete'::"text"
        )
        OR (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."role_permissions" "rp"
                        JOIN "public"."user_roles" "ur" ON (("ur"."role_id" = "rp"."role_id"))
                    )
                WHERE (
                        ("ur"."user_id" = "auth"."uid"())
                        AND (
                            "rp"."permission_code" = 'products.delete'::"text"
                        )
                        AND ("rp"."granted" = true)
                    )
            )
        )
    )
);
CREATE POLICY "products_insert_policy" ON "public"."products" FOR
INSERT WITH CHECK (
        (
            "public"."is_admin_or_super_admin"()
            OR "public"."check_user_permission"(
                "auth"."uid"(),
                'products'::"text",
                'create'::"text"
            )
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."role_permissions" "rp"
                            JOIN "public"."user_roles" "ur" ON (("ur"."role_id" = "rp"."role_id"))
                        )
                    WHERE (
                            ("ur"."user_id" = "auth"."uid"())
                            AND (
                                "rp"."permission_code" = 'products.create'::"text"
                            )
                            AND ("rp"."granted" = true)
                        )
                )
            )
        )
    );
CREATE POLICY "products_select_policy" ON "public"."products" FOR
SELECT USING (
        (
            "public"."is_admin_or_super_admin"()
            OR "public"."check_user_permission"(
                "auth"."uid"(),
                'products'::"text",
                'view'::"text"
            )
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."role_permissions" "rp"
                            JOIN "public"."user_roles" "ur" ON (("ur"."role_id" = "rp"."role_id"))
                        )
                    WHERE (
                            ("ur"."user_id" = "auth"."uid"())
                            AND ("rp"."permission_code" = 'products.view'::"text")
                            AND ("rp"."granted" = true)
                        )
                )
            )
        )
    );
CREATE POLICY "products_update_policy" ON "public"."products" FOR
UPDATE USING (
        (
            "public"."is_admin_or_super_admin"()
            OR "public"."check_user_permission"(
                "auth"."uid"(),
                'products'::"text",
                'edit'::"text"
            )
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."role_permissions" "rp"
                            JOIN "public"."user_roles" "ur" ON (("ur"."role_id" = "rp"."role_id"))
                        )
                    WHERE (
                            ("ur"."user_id" = "auth"."uid"())
                            AND ("rp"."permission_code" = 'products.edit'::"text")
                            AND ("rp"."granted" = true)
                        )
                )
            )
        )
    );
ALTER TABLE "public"."raw_material_suppliers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raw_material_suppliers_delete_policy" ON "public"."raw_material_suppliers" FOR DELETE USING (
    "public"."check_master_data_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "raw_material_suppliers_insert_policy" ON "public"."raw_material_suppliers" FOR
INSERT WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "raw_material_suppliers_select_policy" ON "public"."raw_material_suppliers" FOR
SELECT USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "raw_material_suppliers_update_policy" ON "public"."raw_material_suppliers" FOR
UPDATE USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."raw_material_tests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raw_material_tests_delete_policy" ON "public"."raw_material_tests" FOR DELETE USING (
    "public"."check_master_data_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "raw_material_tests_insert_policy" ON "public"."raw_material_tests" FOR
INSERT WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "raw_material_tests_select_policy" ON "public"."raw_material_tests" FOR
SELECT USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "raw_material_tests_update_policy" ON "public"."raw_material_tests" FOR
UPDATE USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."raw_materials" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raw_materials_delete_matrix" ON "public"."raw_materials" FOR DELETE TO "authenticated" USING (
    "public"."check_master_data_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "raw_materials_insert_policy_v2" ON "public"."raw_materials" FOR
INSERT TO "authenticated" WITH CHECK (
        (
            "public"."check_master_data_permission"("auth"."uid"(), 'create'::"text")
            OR (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."user_roles" "ur"
                            JOIN "public"."role_module_permissions" "rmp" ON (("ur"."role_id" = "rmp"."role_id"))
                        )
                    WHERE (
                            ("ur"."user_id" = "auth"."uid"())
                            AND ("rmp"."module_code" = 'master_data'::"text")
                            AND ('create'::"text" = ANY ("rmp"."granted_actions"))
                        )
                )
            )
            OR (
                "auth"."uid"() = '6037e815-912d-44ad-85f8-75dacfc4c078'::"uuid"
            )
        )
    );
CREATE POLICY "raw_materials_select_matrix" ON "public"."raw_materials" FOR
SELECT TO "authenticated" USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "raw_materials_update_matrix" ON "public"."raw_materials" FOR
UPDATE TO "authenticated" USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_delete_matrix" ON "public"."recipes" FOR DELETE TO "authenticated" USING (
    "public"."check_master_data_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "recipes_insert_matrix" ON "public"."recipes" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "recipes_select_matrix" ON "public"."recipes" FOR
SELECT TO "authenticated" USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "recipes_update_matrix" ON "public"."recipes" FOR
UPDATE TO "authenticated" USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."recycle_bin" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recycle_bin_delete_policy" ON "public"."recycle_bin" FOR DELETE TO "authenticated" USING (
    (
        ("deleted_by" = "auth"."uid"())
        OR "public"."check_forms_permission"("auth"."uid"(), 'delete'::"text", NULL::"uuid")
    )
);
CREATE POLICY "recycle_bin_insert_policy" ON "public"."recycle_bin" FOR
INSERT TO "authenticated" WITH CHECK (
        (
            ("deleted_by" = "auth"."uid"())
            OR CASE
                "item_type"
                WHEN 'template'::"text" THEN "public"."check_forms_permission"("auth"."uid"(), 'delete'::"text", NULL::"uuid")
                WHEN 'instance'::"text" THEN "public"."check_forms_permission"("auth"."uid"(), 'delete'::"text", NULL::"uuid")
                WHEN 'folder'::"text" THEN "public"."check_forms_permission"("auth"."uid"(), 'delete'::"text", NULL::"uuid")
                ELSE true
            END
        )
    );
CREATE POLICY "recycle_bin_select_policy" ON "public"."recycle_bin" FOR
SELECT TO "authenticated" USING (
        (
            ("deleted_by" = "auth"."uid"())
            OR "public"."check_forms_permission"("auth"."uid"(), 'view'::"text", NULL::"uuid")
        )
    );
ALTER TABLE "public"."relationship_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."report_review_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_review_history_select_policy" ON "public"."report_review_history" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."role_action_restrictions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_action_restrictions_modify_admin" ON "public"."role_action_restrictions" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "role_action_restrictions_select_all" ON "public"."role_action_restrictions" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."role_conflicts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_conflicts_modify_admin" ON "public"."role_conflicts" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "role_conflicts_select_all" ON "public"."role_conflicts" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."role_module_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_module_permissions_modify_admin" ON "public"."role_module_permissions" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "role_module_permissions_select_all" ON "public"."role_module_permissions" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_modify_admin" ON "public"."role_permissions" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "role_permissions_select_all" ON "public"."role_permissions" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_modify_admin" ON "public"."roles" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "roles_select_all" ON "public"."roles" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."sanitation_areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections_modify_admin" ON "public"."sections" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "sections_select_all" ON "public"."sections" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_modify_admin" ON "public"."settings" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "settings_select_all" ON "public"."settings" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."share_activity_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share_activity_log_insert_authenticated" ON "public"."share_activity_log" FOR
INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "share_activity_log_select_all" ON "public"."share_activity_log" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."stage_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_permissions_modify_admin" ON "public"."stage_permissions" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "stage_permissions_select_all" ON "public"."stage_permissions" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_delete_matrix" ON "public"."suppliers" FOR DELETE TO "authenticated" USING (
    "public"."check_master_data_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "suppliers_insert_matrix" ON "public"."suppliers" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "suppliers_select_matrix" ON "public"."suppliers" FOR
SELECT TO "authenticated" USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'view'::"text")
    );
CREATE POLICY "suppliers_update_matrix" ON "public"."suppliers" FOR
UPDATE TO "authenticated" USING (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    ) WITH CHECK (
        "public"."check_master_data_permission"("auth"."uid"(), 'edit'::"text")
    );
ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_delete_matrix" ON "public"."tasks" FOR DELETE TO "authenticated" USING (
    "public"."check_tasks_permission"("auth"."uid"(), 'delete'::"text")
);
CREATE POLICY "tasks_insert_matrix" ON "public"."tasks" FOR
INSERT TO "authenticated" WITH CHECK (
        "public"."check_tasks_permission"("auth"."uid"(), 'create'::"text")
    );
CREATE POLICY "tasks_select_matrix" ON "public"."tasks" FOR
SELECT TO "authenticated" USING (
        (
            ("assigned_to" = "auth"."uid"())
            OR ("created_by" = "auth"."uid"())
            OR "public"."check_tasks_permission"("auth"."uid"(), 'view'::"text")
        )
    );
CREATE POLICY "tasks_update_matrix" ON "public"."tasks" FOR
UPDATE TO "authenticated" USING (
        (
            ("assigned_to" = "auth"."uid"())
            OR ("created_by" = "auth"."uid"())
            OR "public"."check_tasks_permission"("auth"."uid"(), 'edit'::"text")
        )
    ) WITH CHECK (
        (
            ("assigned_to" = "auth"."uid"())
            OR ("created_by" = "auth"."uid"())
            OR "public"."check_tasks_permission"("auth"."uid"(), 'edit'::"text")
        )
    );
ALTER TABLE "public"."temperature_equipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."temperature_readings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."unified_folders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unified_folders_modify_admin" ON "public"."unified_folders" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "unified_folders_modify_own" ON "public"."unified_folders" TO "authenticated" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));
CREATE POLICY "unified_folders_select_all" ON "public"."unified_folders" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."user_departments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_departments_modify_admin" ON "public"."user_departments" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "user_departments_select_all" ON "public"."user_departments" FOR
SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_modify_admin" ON "public"."user_roles" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "user_roles_select_admin" ON "public"."user_roles" FOR
SELECT TO "authenticated" USING ("public"."is_admin_or_super_admin"());
CREATE POLICY "user_roles_select_own" ON "public"."user_roles" FOR
SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
ALTER TABLE "public"."user_temp_roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_temp_roles_modify_admin" ON "public"."user_temp_roles" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "user_temp_roles_select_admin" ON "public"."user_temp_roles" FOR
SELECT TO "authenticated" USING ("public"."is_admin_or_super_admin"());
CREATE POLICY "user_temp_roles_select_own" ON "public"."user_temp_roles" FOR
SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_modify_admin" ON "public"."users" TO "authenticated" USING ("public"."is_admin_or_super_admin"()) WITH CHECK ("public"."is_admin_or_super_admin"());
CREATE POLICY "users_modify_own" ON "public"."users" TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));
CREATE POLICY "users_select_all" ON "public"."users" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "users_select_policy" ON "public"."users" FOR
SELECT USING (true);
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."archive_old_audit_records"("p_older_than" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."archive_old_audit_records"("p_older_than" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_old_audit_records"("p_older_than" interval) TO "service_role";
GRANT ALL ON FUNCTION "public"."audit_role_permissions_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_role_permissions_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_role_permissions_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."audit_trigger_function"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_trigger_function"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_trigger_function"() TO "service_role";
GRANT ALL ON FUNCTION "public"."auto_generate_review_checksum"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_review_checksum"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_review_checksum"() TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_audit_checksum"(
        "p_action" "text",
        "p_entity_type" "text",
        "p_entity_id" "text",
        "p_user_id" "uuid",
        "p_timestamp" timestamp with time zone,
        "p_old_values" "jsonb",
        "p_new_values" "jsonb",
        "p_previous_checksum" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_audit_checksum"(
        "p_action" "text",
        "p_entity_type" "text",
        "p_entity_id" "text",
        "p_user_id" "uuid",
        "p_timestamp" timestamp with time zone,
        "p_old_values" "jsonb",
        "p_new_values" "jsonb",
        "p_previous_checksum" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_audit_checksum"(
        "p_action" "text",
        "p_entity_type" "text",
        "p_entity_id" "text",
        "p_user_id" "uuid",
        "p_timestamp" timestamp with time zone,
        "p_old_values" "jsonb",
        "p_new_values" "jsonb",
        "p_previous_checksum" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."can_access_module"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_module"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_module"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."can_perform_ncr_action"(
        "p_user_id" "uuid",
        "p_ncr_id" "uuid",
        "p_action" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."can_perform_ncr_action"(
        "p_user_id" "uuid",
        "p_ncr_id" "uuid",
        "p_action" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_perform_ncr_action"(
        "p_user_id" "uuid",
        "p_ncr_id" "uuid",
        "p_action" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."can_user_access_content"(
        "user_id_param" "uuid",
        "content_type_param" "text",
        "content_id_param" "uuid"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_access_content"(
        "user_id_param" "uuid",
        "content_type_param" "text",
        "content_id_param" "uuid"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_access_content"(
        "user_id_param" "uuid",
        "content_type_param" "text",
        "content_id_param" "uuid"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."can_user_perform_action"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_perform_action"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_perform_action"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."can_view_department_data"("p_user_id" "uuid", "p_module_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_department_data"("p_user_id" "uuid", "p_module_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_department_data"("p_user_id" "uuid", "p_module_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."cascade_revoke_permission"("p_role_id" "uuid", "p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_revoke_permission"("p_role_id" "uuid", "p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_revoke_permission"("p_role_id" "uuid", "p_permission" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_data_consistency"(
        "p_source_table" "text",
        "p_target_table" "text",
        "p_id_column" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_data_consistency"(
        "p_source_table" "text",
        "p_target_table" "text",
        "p_id_column" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_data_consistency"(
        "p_source_table" "text",
        "p_target_table" "text",
        "p_id_column" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_department_hierarchy_depth"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_department_hierarchy_depth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_department_hierarchy_depth"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_department_module_access"(
        "p_department_id" "uuid",
        "p_module_code" "text",
        "p_permission" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_department_module_access"(
        "p_department_id" "uuid",
        "p_module_code" "text",
        "p_permission" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_department_module_access"(
        "p_department_id" "uuid",
        "p_module_code" "text",
        "p_permission" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_food_safety_permission"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_food_safety_permission"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_food_safety_permission"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_food_safety_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_food_safety_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_food_safety_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_forms_permission"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_entity_department_id" "uuid"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_forms_permission"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_entity_department_id" "uuid"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_forms_permission"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_entity_department_id" "uuid"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_forms_permission_or_raise"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_entity_department_id" "uuid"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_forms_permission_or_raise"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_entity_department_id" "uuid"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_forms_permission_or_raise"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_entity_department_id" "uuid"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_lab_permission"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_lab_permission"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_lab_permission"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_lab_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_lab_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_lab_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_master_data_permission"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_master_data_permission"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_master_data_permission"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_master_data_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_master_data_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_master_data_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_matrix_admin_permission"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_matrix_admin_permission"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_matrix_admin_permission"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_matrix_permission"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text",
        "p_entity_department_id" "uuid"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_matrix_permission"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text",
        "p_entity_department_id" "uuid"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_matrix_permission"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text",
        "p_entity_department_id" "uuid"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_matrix_permission_or_raise"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text",
        "p_entity_department_id" "uuid"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_matrix_permission_or_raise"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text",
        "p_entity_department_id" "uuid"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_matrix_permission_or_raise"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text",
        "p_stage_code" "text",
        "p_entity_department_id" "uuid"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_ncr_permission"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_ncr_permission"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_ncr_permission"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_ncr_permission_or_raise"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_ncr_permission_or_raise"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_ncr_permission_or_raise"(
        "p_user_id" "uuid",
        "p_action" "text",
        "p_stage_code" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_permission_hierarchy"("p_permission" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_permission_hierarchy"("p_permission" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_permission_hierarchy"("p_permission" "text", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_role_conflict"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_role_conflict"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_role_conflict"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_settings_permission"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_settings_permission"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_settings_permission"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_settings_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_settings_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_settings_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_tasks_permission"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_tasks_permission"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tasks_permission"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_tasks_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_tasks_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tasks_permission_or_raise"("p_user_id" "uuid", "p_action" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_permission" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_permission" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_permission" "text", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_user_permission"(
        "user_uuid" "uuid",
        "p_module_code" "text",
        "p_permission_code" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_permission"(
        "user_uuid" "uuid",
        "p_module_code" "text",
        "p_permission_code" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_permission"(
        "user_uuid" "uuid",
        "p_module_code" "text",
        "p_permission_code" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_user_role_sync"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_role_sync"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_role_sync"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."clean_expired_recycle_bin"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expired_recycle_bin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expired_recycle_bin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."clear_and_resync_user_roles"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_and_resync_user_roles"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_and_resync_user_roles"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."count_table_records"("p_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."count_table_records"("p_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_table_records"("p_table_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_notification_from_template"(
        "p_template_code" "text",
        "p_user_id" "text",
        "p_entity_type" "text",
        "p_entity_id" "uuid",
        "p_variables" "jsonb",
        "p_sender_id" "uuid",
        "p_sender_name" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification_from_template"(
        "p_template_code" "text",
        "p_user_id" "text",
        "p_entity_type" "text",
        "p_entity_id" "uuid",
        "p_variables" "jsonb",
        "p_sender_id" "uuid",
        "p_sender_name" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification_from_template"(
        "p_template_code" "text",
        "p_user_id" "text",
        "p_entity_type" "text",
        "p_entity_id" "uuid",
        "p_variables" "jsonb",
        "p_sender_id" "uuid",
        "p_sender_name" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."deactivate_expired_shares"() TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_expired_shares"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_expired_shares"() TO "service_role";
GRANT ALL ON FUNCTION "public"."deactivate_expired_temp_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_expired_temp_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_expired_temp_roles"() TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_report_lock"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_report_lock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_report_lock"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_role_protection"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_role_protection"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_role_protection"() TO "service_role";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_consolidation_report"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_consolidation_report"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_consolidation_report"() TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_review_history_checksum"(
        "p_report_id" "uuid",
        "p_action" "text",
        "p_performed_by" "uuid",
        "p_performed_at" timestamp with time zone
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_review_history_checksum"(
        "p_report_id" "uuid",
        "p_action" "text",
        "p_performed_by" "uuid",
        "p_performed_at" timestamp with time zone
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_review_history_checksum"(
        "p_report_id" "uuid",
        "p_action" "text",
        "p_performed_by" "uuid",
        "p_performed_at" timestamp with time zone
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_task_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_task_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_task_number"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_approved_suppliers"(
        "p_raw_material_id" "uuid",
        "p_company_id" "uuid"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."get_approved_suppliers"(
        "p_raw_material_id" "uuid",
        "p_company_id" "uuid"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_approved_suppliers"(
        "p_raw_material_id" "uuid",
        "p_company_id" "uuid"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_audit_user_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_audit_user_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audit_user_info"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_department_path"("dept_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_department_path"("dept_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_department_path"("dept_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_dependent_permissions"("p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dependent_permissions"("p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dependent_permissions"("p_permission" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_required_tests"(
        "p_raw_material_id" "uuid",
        "p_company_id" "uuid"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."get_required_tests"(
        "p_raw_material_id" "uuid",
        "p_company_id" "uuid"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_required_tests"(
        "p_raw_material_id" "uuid",
        "p_company_id" "uuid"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_accessible_folders"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_accessible_folders"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_accessible_folders"("user_id_param" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_company"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_company"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_company"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_departments"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_departments"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_departments"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_effective_permissions"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_effective_permissions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_effective_permissions"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_module_permissions"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_module_permissions"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_module_permissions"("user_uuid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_modules"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_modules"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_modules"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_profile_complete"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile_complete"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile_complete"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_role_codes"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role_codes"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role_codes"("user_uuid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_visible_departments"("p_user_id" "uuid", "p_module_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_visible_departments"("p_user_id" "uuid", "p_module_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_visible_departments"("p_user_id" "uuid", "p_module_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_auth_user_deleted"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_deleted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_deleted"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."has_module_action"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."has_module_action"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_module_action"(
        "p_user_id" "uuid",
        "p_module_code" "text",
        "p_action" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_template_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_template_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_template_version"() TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_version"() TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_version_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_version_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_version_column"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin_or_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_super_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."log_admin_action"(
        "p_action" "text",
        "p_target_table" "text",
        "p_target_id" "text",
        "p_details" "jsonb",
        "p_reason" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"(
        "p_action" "text",
        "p_target_table" "text",
        "p_target_id" "text",
        "p_details" "jsonb",
        "p_reason" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"(
        "p_action" "text",
        "p_target_table" "text",
        "p_target_id" "text",
        "p_details" "jsonb",
        "p_reason" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."log_audit_event"(
        "p_action" "text",
        "p_entity_type" "text",
        "p_entity_id" "text",
        "p_entity_name" "text",
        "p_old_values" "jsonb",
        "p_new_values" "jsonb",
        "p_reason" "text",
        "p_metadata" "jsonb"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_event"(
        "p_action" "text",
        "p_entity_type" "text",
        "p_entity_id" "text",
        "p_entity_name" "text",
        "p_old_values" "jsonb",
        "p_new_values" "jsonb",
        "p_reason" "text",
        "p_metadata" "jsonb"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_event"(
        "p_action" "text",
        "p_entity_type" "text",
        "p_entity_id" "text",
        "p_entity_name" "text",
        "p_old_values" "jsonb",
        "p_new_values" "jsonb",
        "p_reason" "text",
        "p_metadata" "jsonb"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."log_permission_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_permission_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_permission_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."log_share_activity"(
        "share_id_param" "uuid",
        "activity_type_param" "text",
        "performed_by_param" "uuid",
        "metadata_param" "jsonb"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."log_share_activity"(
        "share_id_param" "uuid",
        "activity_type_param" "text",
        "performed_by_param" "uuid",
        "metadata_param" "jsonb"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_share_activity"(
        "share_id_param" "uuid",
        "activity_type_param" "text",
        "performed_by_param" "uuid",
        "metadata_param" "jsonb"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid" []) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid" []) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid" []) TO "service_role";
GRANT ALL ON FUNCTION "public"."notify_report_workflow"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_report_workflow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_report_workflow"() TO "service_role";
GRANT ALL ON FUNCTION "public"."prevent_audit_modification"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_audit_modification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_audit_modification"() TO "service_role";
GRANT ALL ON FUNCTION "public"."prevent_privilege_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_privilege_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_privilege_escalation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."prevent_report_review_history_modification"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_report_review_history_modification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_report_review_history_modification"() TO "service_role";
GRANT ALL ON FUNCTION "public"."protect_access_management_availability"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_access_management_availability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_access_management_availability"() TO "service_role";
GRANT ALL ON FUNCTION "public"."protect_locked_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_locked_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_locked_roles"() TO "service_role";
GRANT ALL ON FUNCTION "public"."protect_super_admin_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_super_admin_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_super_admin_access"() TO "service_role";
GRANT ALL ON FUNCTION "public"."protect_system_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_system_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_system_roles"() TO "service_role";
GRANT ALL ON FUNCTION "public"."safe_drop_policy"("p_policy_name" "text", "p_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_drop_policy"("p_policy_name" "text", "p_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_drop_policy"("p_policy_name" "text", "p_table_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."safe_grant_permission"("p_role_id" "uuid", "p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_grant_permission"("p_role_id" "uuid", "p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_grant_permission"("p_role_id" "uuid", "p_permission" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."set_company_context"("p_company_id" "uuid", "p_user_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_company_context"("p_company_id" "uuid", "p_user_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_company_context"("p_company_id" "uuid", "p_user_role" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_user_all_roles"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_all_roles"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_all_roles"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_user_single_role"("p_user_id" "uuid", "p_role_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_single_role"("p_user_id" "uuid", "p_role_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_single_role"("p_user_id" "uuid", "p_role_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."trigger_update_folder_stats_on_instance"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_folder_stats_on_instance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_folder_stats_on_instance"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trigger_update_folder_stats_on_template"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_folder_stats_on_template"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_folder_stats_on_template"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_content_shares_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_content_shares_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_content_shares_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_folder_stats"("folder_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_folder_stats"("folder_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_folder_stats"("folder_id_param" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_overdue_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_overdue_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_overdue_tasks"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_recipes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_recipes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_recipes_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_settings_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_settings_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_settings_timestamp"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_stage_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_stage_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stage_timestamp"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_unified_folders_path"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_unified_folders_path"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_unified_folders_path"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_unified_folders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_unified_folders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_unified_folders_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_with_optimistic_lock"(
        "p_table_name" "text",
        "p_id" "uuid",
        "p_expected_version" integer,
        "p_updates" "jsonb"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."update_with_optimistic_lock"(
        "p_table_name" "text",
        "p_id" "uuid",
        "p_expected_version" integer,
        "p_updates" "jsonb"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_with_optimistic_lock"(
        "p_table_name" "text",
        "p_id" "uuid",
        "p_expected_version" integer,
        "p_updates" "jsonb"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_department_module_access_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_department_module_access_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_department_module_access_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_report_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_report_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_report_transition"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_role_module_permissions_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_role_module_permissions_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_role_module_permissions_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_role_permissions_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_role_permissions_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_role_permissions_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_roles_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_roles_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_roles_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_supplier_for_material"(
        "p_raw_material_id" "uuid",
        "p_supplier_id" "uuid",
        "p_company_id" "uuid"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_supplier_for_material"(
        "p_raw_material_id" "uuid",
        "p_supplier_id" "uuid",
        "p_company_id" "uuid"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_supplier_for_material"(
        "p_raw_material_id" "uuid",
        "p_supplier_id" "uuid",
        "p_company_id" "uuid"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_user_roles_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_user_roles_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_user_roles_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."verify_audit_trail_integrity"("p_entity_type" "text", "p_entity_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_audit_trail_integrity"("p_entity_type" "text", "p_entity_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_audit_trail_integrity"("p_entity_type" "text", "p_entity_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."verify_user_has_permissions"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_user_has_permissions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_user_has_permissions"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON TABLE "public"."_backup_permission_matrix" TO "anon";
GRANT ALL ON TABLE "public"."_backup_permission_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."_backup_permission_matrix" TO "service_role";
GRANT ALL ON TABLE "public"."_backup_report_folders" TO "anon";
GRANT ALL ON TABLE "public"."_backup_report_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."_backup_report_folders" TO "service_role";
GRANT ALL ON TABLE "public"."_backup_template_folders" TO "anon";
GRANT ALL ON TABLE "public"."_backup_template_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."_backup_template_folders" TO "service_role";
GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";
GRANT ALL ON TABLE "public"."user_temp_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_temp_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_temp_roles" TO "service_role";
GRANT ALL ON TABLE "public"."active_user_temp_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."active_user_temp_roles" TO "service_role";
GRANT ALL ON TABLE "public"."allergen_profiles" TO "anon";
GRANT ALL ON TABLE "public"."allergen_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."allergen_profiles" TO "service_role";
GRANT ALL ON TABLE "public"."app_modules" TO "anon";
GRANT ALL ON TABLE "public"."app_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."app_modules" TO "service_role";
GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";
GRANT ALL ON TABLE "public"."audit_trail" TO "anon";
GRANT ALL ON TABLE "public"."audit_trail" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_trail" TO "service_role";
GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";
GRANT ALL ON TABLE "public"."cleaning_records" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_records" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_records" TO "service_role";
GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";
GRANT ALL ON TABLE "public"."content_shares" TO "anon";
GRANT ALL ON TABLE "public"."content_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."content_shares" TO "service_role";
GRANT ALL ON TABLE "public"."control_points" TO "anon";
GRANT ALL ON TABLE "public"."control_points" TO "authenticated";
GRANT ALL ON TABLE "public"."control_points" TO "service_role";
GRANT ALL ON TABLE "public"."corrective_actions" TO "anon";
GRANT ALL ON TABLE "public"."corrective_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."corrective_actions" TO "service_role";
GRANT ALL ON TABLE "public"."department_module_access" TO "anon";
GRANT ALL ON TABLE "public"."department_module_access" TO "authenticated";
GRANT ALL ON TABLE "public"."department_module_access" TO "service_role";
GRANT ALL ON TABLE "public"."department_roles" TO "anon";
GRANT ALL ON TABLE "public"."department_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."department_roles" TO "service_role";
GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";
GRANT ALL ON TABLE "public"."document_shares" TO "anon";
GRANT ALL ON TABLE "public"."document_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."document_shares" TO "service_role";
GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";
GRANT ALL ON TABLE "public"."form_instances" TO "anon";
GRANT ALL ON TABLE "public"."form_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."form_instances" TO "service_role";
GRANT ALL ON TABLE "public"."form_templates" TO "anon";
GRANT ALL ON TABLE "public"."form_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."form_templates" TO "service_role";
GRANT ALL ON TABLE "public"."inspection_criteria" TO "anon";
GRANT ALL ON TABLE "public"."inspection_criteria" TO "authenticated";
GRANT ALL ON TABLE "public"."inspection_criteria" TO "service_role";
GRANT ALL ON TABLE "public"."job_title_roles" TO "anon";
GRANT ALL ON TABLE "public"."job_title_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."job_title_roles" TO "service_role";
GRANT ALL ON TABLE "public"."job_titles" TO "anon";
GRANT ALL ON TABLE "public"."job_titles" TO "authenticated";
GRANT ALL ON TABLE "public"."job_titles" TO "service_role";
GRANT ALL ON TABLE "public"."lab_samples" TO "anon";
GRANT ALL ON TABLE "public"."lab_samples" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_samples" TO "service_role";
GRANT ALL ON TABLE "public"."lab_tests" TO "anon";
GRANT ALL ON TABLE "public"."lab_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_tests" TO "service_role";
GRANT ALL ON TABLE "public"."material_receiving" TO "anon";
GRANT ALL ON TABLE "public"."material_receiving" TO "authenticated";
GRANT ALL ON TABLE "public"."material_receiving" TO "service_role";
GRANT ALL ON TABLE "public"."module_data_visibility" TO "anon";
GRANT ALL ON TABLE "public"."module_data_visibility" TO "authenticated";
GRANT ALL ON TABLE "public"."module_data_visibility" TO "service_role";
GRANT ALL ON TABLE "public"."module_stages" TO "anon";
GRANT ALL ON TABLE "public"."module_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."module_stages" TO "service_role";
GRANT ALL ON TABLE "public"."monitoring_records" TO "anon";
GRANT ALL ON TABLE "public"."monitoring_records" TO "authenticated";
GRANT ALL ON TABLE "public"."monitoring_records" TO "service_role";
GRANT ALL ON TABLE "public"."ncr_comments" TO "anon";
GRANT ALL ON TABLE "public"."ncr_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ncr_comments" TO "service_role";
GRANT ALL ON TABLE "public"."ncr_reports" TO "anon";
GRANT ALL ON TABLE "public"."ncr_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."ncr_reports" TO "service_role";
GRANT ALL ON TABLE "public"."ncr_stage_permissions" TO "anon";
GRANT ALL ON TABLE "public"."ncr_stage_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."ncr_stage_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."ncr_workflow_stages" TO "anon";
GRANT ALL ON TABLE "public"."ncr_workflow_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."ncr_workflow_stages" TO "service_role";
GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";
GRANT ALL ON TABLE "public"."notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_templates" TO "service_role";
GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT ALL ON TABLE "public"."permission_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."permission_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_audit_log" TO "service_role";
GRANT ALL ON TABLE "public"."permission_hierarchy" TO "anon";
GRANT ALL ON TABLE "public"."permission_hierarchy" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_hierarchy" TO "service_role";
GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";
GRANT ALL ON TABLE "public"."pre_op_checks" TO "anon";
GRANT ALL ON TABLE "public"."pre_op_checks" TO "authenticated";
GRANT ALL ON TABLE "public"."pre_op_checks" TO "service_role";
GRANT ALL ON TABLE "public"."production_lines" TO "anon";
GRANT ALL ON TABLE "public"."production_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."production_lines" TO "service_role";
GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";
GRANT ALL ON TABLE "public"."raw_material_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."raw_material_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_material_suppliers" TO "service_role";
GRANT ALL ON TABLE "public"."raw_material_tests" TO "anon";
GRANT ALL ON TABLE "public"."raw_material_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_material_tests" TO "service_role";
GRANT ALL ON TABLE "public"."raw_materials" TO "anon";
GRANT ALL ON TABLE "public"."raw_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_materials" TO "service_role";
GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";
GRANT ALL ON TABLE "public"."recycle_bin" TO "anon";
GRANT ALL ON TABLE "public"."recycle_bin" TO "authenticated";
GRANT ALL ON TABLE "public"."recycle_bin" TO "service_role";
GRANT ALL ON TABLE "public"."relationship_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."relationship_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."relationship_audit_log" TO "service_role";
GRANT ALL ON TABLE "public"."report_review_history" TO "anon";
GRANT ALL ON TABLE "public"."report_review_history" TO "authenticated";
GRANT ALL ON TABLE "public"."report_review_history" TO "service_role";
GRANT ALL ON TABLE "public"."role_action_restrictions" TO "anon";
GRANT ALL ON TABLE "public"."role_action_restrictions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_action_restrictions" TO "service_role";
GRANT ALL ON TABLE "public"."role_conflicts" TO "anon";
GRANT ALL ON TABLE "public"."role_conflicts" TO "authenticated";
GRANT ALL ON TABLE "public"."role_conflicts" TO "service_role";
GRANT ALL ON TABLE "public"."role_module_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_module_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_module_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."sanitation_areas" TO "anon";
GRANT ALL ON TABLE "public"."sanitation_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."sanitation_areas" TO "service_role";
GRANT ALL ON TABLE "public"."sections" TO "anon";
GRANT ALL ON TABLE "public"."sections" TO "authenticated";
GRANT ALL ON TABLE "public"."sections" TO "service_role";
GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";
GRANT ALL ON TABLE "public"."share_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."share_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."share_activity_log" TO "service_role";
GRANT ALL ON TABLE "public"."stage_permissions" TO "anon";
GRANT ALL ON TABLE "public"."stage_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."stage_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";
GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";
GRANT ALL ON TABLE "public"."task_history" TO "anon";
GRANT ALL ON TABLE "public"."task_history" TO "authenticated";
GRANT ALL ON TABLE "public"."task_history" TO "service_role";
GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";
GRANT ALL ON TABLE "public"."temperature_equipment" TO "anon";
GRANT ALL ON TABLE "public"."temperature_equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."temperature_equipment" TO "service_role";
GRANT ALL ON TABLE "public"."temperature_readings" TO "anon";
GRANT ALL ON TABLE "public"."temperature_readings" TO "authenticated";
GRANT ALL ON TABLE "public"."temperature_readings" TO "service_role";
GRANT ALL ON TABLE "public"."unified_folders" TO "anon";
GRANT ALL ON TABLE "public"."unified_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."unified_folders" TO "service_role";
GRANT ALL ON TABLE "public"."user_departments" TO "anon";
GRANT ALL ON TABLE "public"."user_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_departments" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT ALL ON TABLE "public"."user_effective_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_effective_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_effective_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";
GRANT ALL ON TABLE "public"."users_with_deprecated_roles" TO "anon";
GRANT ALL ON TABLE "public"."users_with_deprecated_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."users_with_deprecated_roles" TO "service_role";
GRANT ALL ON TABLE "public"."v_entity_audit_history" TO "anon";
GRANT ALL ON TABLE "public"."v_entity_audit_history" TO "authenticated";
GRANT ALL ON TABLE "public"."v_entity_audit_history" TO "service_role";
GRANT ALL ON TABLE "public"."v_material_receiving_full" TO "anon";
GRANT ALL ON TABLE "public"."v_material_receiving_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_material_receiving_full" TO "service_role";
GRANT ALL ON TABLE "public"."v_material_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."v_material_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."v_material_suppliers" TO "service_role";
GRANT ALL ON TABLE "public"."v_products_full" TO "anon";
GRANT ALL ON TABLE "public"."v_products_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_products_full" TO "service_role";
GRANT ALL ON TABLE "public"."v_recent_audit_events" TO "anon";
GRANT ALL ON TABLE "public"."v_recent_audit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."v_recent_audit_events" TO "service_role";
GRANT ALL ON TABLE "public"."v_role_statistics" TO "anon";
GRANT ALL ON TABLE "public"."v_role_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."v_role_statistics" TO "service_role";
GRANT ALL ON TABLE "public"."v_suppliers_with_companies" TO "anon";
GRANT ALL ON TABLE "public"."v_suppliers_with_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."v_suppliers_with_companies" TO "service_role";
GRANT ALL ON TABLE "public"."v_task_type_distribution" TO "anon";
GRANT ALL ON TABLE "public"."v_task_type_distribution" TO "authenticated";
GRANT ALL ON TABLE "public"."v_task_type_distribution" TO "service_role";
GRANT ALL ON TABLE "public"."v_user_monthly_performance" TO "anon";
GRANT ALL ON TABLE "public"."v_user_monthly_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."v_user_monthly_performance" TO "service_role";
GRANT ALL ON TABLE "public"."v_user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."v_user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_user_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."v_user_task_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_user_task_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_user_task_stats" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "service_role";