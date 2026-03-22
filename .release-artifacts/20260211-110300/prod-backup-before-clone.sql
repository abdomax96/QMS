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

DROP TABLE IF EXISTS public.vehicles;
DROP TABLE IF EXISTS public.vehicle_inspections;
DROP TABLE IF EXISTS public.variables;
DROP VIEW IF EXISTS public.v_user_task_stats;
DROP VIEW IF EXISTS public.v_user_permissions;
DROP VIEW IF EXISTS public.v_user_monthly_performance;
DROP VIEW IF EXISTS public.v_task_type_distribution;
DROP VIEW IF EXISTS public.v_suppliers_with_companies;
DROP VIEW IF EXISTS public.v_role_statistics;
DROP VIEW IF EXISTS public.v_recent_audit_events;
DROP VIEW IF EXISTS public.v_products_full;
DROP VIEW IF EXISTS public.v_material_suppliers;
DROP VIEW IF EXISTS public.v_material_receiving_full;
DROP VIEW IF EXISTS public.v_entity_audit_history;
DROP VIEW IF EXISTS public.users_with_deprecated_roles;
DROP TABLE IF EXISTS public.user_roles;
DROP VIEW IF EXISTS public.user_effective_permissions;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_departments;
DROP TABLE IF EXISTS public.unified_folders;
DROP TABLE IF EXISTS public.tenants;
DROP TABLE IF EXISTS public.temperature_readings;
DROP TABLE IF EXISTS public.temperature_equipment;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.task_history;
DROP TABLE IF EXISTS public.task_comments;
DROP TABLE IF EXISTS public.suppliers;
DROP TABLE IF EXISTS public.stage_permissions;
DROP TABLE IF EXISTS public.share_activity_log;
DROP TABLE IF EXISTS public.settings;
DROP TABLE IF EXISTS public.sections;
DROP TABLE IF EXISTS public.schema_migrations;
DROP TABLE IF EXISTS public.sanitation_areas;
DROP TABLE IF EXISTS public.role_permissions;
DROP TABLE IF EXISTS public.role_module_permissions;
DROP TABLE IF EXISTS public.role_conflicts;
DROP TABLE IF EXISTS public.role_action_restrictions;
DROP TABLE IF EXISTS public.report_review_history;
DROP TABLE IF EXISTS public.relationship_audit_log;
DROP TABLE IF EXISTS public.recycle_bin;
DROP VIEW IF EXISTS public.recipe_versions_with_duration;
DROP TABLE IF EXISTS public.recipes;
DROP TABLE IF EXISTS public.recipe_versions;
DROP TABLE IF EXISTS public.recipe_change_log;
DROP TABLE IF EXISTS public.raw_materials;
DROP TABLE IF EXISTS public.raw_material_tests;
DROP TABLE IF EXISTS public.raw_material_suppliers;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.production_rework_logs;
DROP TABLE IF EXISTS public.production_lines;
DROP TABLE IF EXISTS public.production_batches;
DROP TABLE IF EXISTS public.product_pallet_config;
DROP TABLE IF EXISTS public.pre_op_checks;
DROP TABLE IF EXISTS public.permissions;
DROP TABLE IF EXISTS public.permission_hierarchy;
DROP TABLE IF EXISTS public.permission_audit_log;
DROP TABLE IF EXISTS public.pallets;
DROP TABLE IF EXISTS public.pallet_settings;
DROP TABLE IF EXISTS public.pallet_holds;
DROP TABLE IF EXISTS public.pallet_contributions;
DROP TABLE IF EXISTS public.pallet_combinations;
DROP TABLE IF EXISTS public.pallet_combination_sources;
DROP TABLE IF EXISTS public.pallet_batches;
DROP TABLE IF EXISTS public.pallet_batch_sources;
DROP TABLE IF EXISTS public.pallet_audit_log;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.notification_templates;
DROP TABLE IF EXISTS public.notification_preferences;
DROP TABLE IF EXISTS public.ncr_workflow_stages;
DROP TABLE IF EXISTS public.ncr_transfers;
DROP TABLE IF EXISTS public.ncr_transfer_chain;
DROP TABLE IF EXISTS public.ncr_supplier_reports;
DROP TABLE IF EXISTS public.ncr_subcategories;
DROP TABLE IF EXISTS public.ncr_stage_permissions;
DROP TABLE IF EXISTS public.ncr_severity_levels;
DROP TABLE IF EXISTS public.ncr_settings;
DROP TABLE IF EXISTS public.ncr_root_cause_proposals;
DROP TABLE IF EXISTS public.ncr_root_cause_analysis;
DROP TABLE IF EXISTS public.ncr_responsibility_assignments;
DROP TABLE IF EXISTS public.ncr_reports_v2;
DROP TABLE IF EXISTS public.ncr_reports;
DROP TABLE IF EXISTS public.ncr_quarantine;
DROP TABLE IF EXISTS public.ncr_notification_rules;
DROP TABLE IF EXISTS public.ncr_messages;
DROP TABLE IF EXISTS public.ncr_escalation_rules;
DROP TABLE IF EXISTS public.ncr_document_metadata;
DROP TABLE IF EXISTS public.ncr_disputes;
DROP TABLE IF EXISTS public.ncr_defect_types;
DROP TABLE IF EXISTS public.ncr_cost_tracking;
DROP TABLE IF EXISTS public.ncr_conversations;
DROP TABLE IF EXISTS public.ncr_consensus_settings;
DROP TABLE IF EXISTS public.ncr_comments;
DROP TABLE IF EXISTS public.ncr_categories;
DROP TABLE IF EXISTS public.ncr_audit_log;
DROP TABLE IF EXISTS public.ncr_attachments;
DROP TABLE IF EXISTS public.ncr_actions;
DROP TABLE IF EXISTS public.monitoring_records;
DROP TABLE IF EXISTS public.module_stages;
DROP TABLE IF EXISTS public.module_data_visibility;
DROP TABLE IF EXISTS public.meta;
DROP TABLE IF EXISTS public.material_receiving;
DROP TABLE IF EXISTS public.loading_operations;
DROP TABLE IF EXISTS public.loaded_pallets;
DROP TABLE IF EXISTS public.lab_v2_tests;
DROP TABLE IF EXISTS public.lab_v2_test_runs;
DROP TABLE IF EXISTS public.lab_v2_test_parameters;
DROP TABLE IF EXISTS public.lab_v2_test_device_links;
DROP TABLE IF EXISTS public.lab_v2_test_acceptance_rules;
DROP TABLE IF EXISTS public.lab_v2_run_values;
DROP TABLE IF EXISTS public.lab_v2_run_measurements;
DROP TABLE IF EXISTS public.lab_v2_run_materials;
DROP TABLE IF EXISTS public.lab_v2_devices;
DROP TABLE IF EXISTS public.lab_v2_device_calibrations;
DROP TABLE IF EXISTS public.lab_v2_chemicals;
DROP TABLE IF EXISTS public.lab_v2_chemical_receipts;
DROP TABLE IF EXISTS public.lab_v2_attachments;
DROP TABLE IF EXISTS public.lab_tests_config;
DROP TABLE IF EXISTS public.lab_tests;
DROP TABLE IF EXISTS public.lab_test_types;
DROP TABLE IF EXISTS public.lab_test_templates;
DROP TABLE IF EXISTS public.lab_test_schedules;
DROP TABLE IF EXISTS public.lab_test_runs;
DROP TABLE IF EXISTS public.lab_test_fields;
DROP TABLE IF EXISTS public.lab_test_equipment;
DROP TABLE IF EXISTS public.lab_test_categories;
DROP TABLE IF EXISTS public.lab_samples;
DROP TABLE IF EXISTS public.lab_equipment;
DROP TABLE IF EXISTS public.job_titles;
DROP TABLE IF EXISTS public.job_title_roles;
DROP TABLE IF EXISTS public.inspection_criteria;
DROP TABLE IF EXISTS public.form_templates;
DROP TABLE IF EXISTS public.form_instances;
DROP TABLE IF EXISTS public.folders;
DROP TABLE IF EXISTS public.extensions;
DROP TABLE IF EXISTS public.documents;
DROP TABLE IF EXISTS public.document_versions;
DROP TABLE IF EXISTS public.document_templates;
DROP TABLE IF EXISTS public.document_signatures;
DROP TABLE IF EXISTS public.document_shares;
DROP TABLE IF EXISTS public.document_categories;
DROP TABLE IF EXISTS public.document_access_log;
DROP TABLE IF EXISTS public.departments;
DROP TABLE IF EXISTS public.department_roles;
DROP TABLE IF EXISTS public.department_module_access;
DROP TABLE IF EXISTS public.defects;
DROP TABLE IF EXISTS public.corrective_actions;
DROP TABLE IF EXISTS public.control_points;
DROP TABLE IF EXISTS public.content_shares;
DROP TABLE IF EXISTS public.companies;
DROP TABLE IF EXISTS public.cleaning_records;
DROP TABLE IF EXISTS public.cell_change_history;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.audit_trail;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.app_modules;
DROP TABLE IF EXISTS public.allergen_profiles;
DROP VIEW IF EXISTS public.active_user_temp_roles;
DROP TABLE IF EXISTS public.user_temp_roles;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public._backup_template_folders;
DROP TABLE IF EXISTS public._backup_report_folders;
DROP TABLE IF EXISTS public._backup_permission_matrix;
DROP FUNCTION IF EXISTS public.verify_user_has_permissions(p_user_id uuid);
DROP FUNCTION IF EXISTS public.verify_audit_trail_integrity(p_entity_type text, p_entity_id text);
DROP FUNCTION IF EXISTS public.validate_user_roles_change();
DROP FUNCTION IF EXISTS public.validate_supplier_for_material(p_raw_material_id uuid, p_supplier_id uuid, p_company_id uuid);
DROP FUNCTION IF EXISTS public.validate_roles_change();
DROP FUNCTION IF EXISTS public.validate_role_permissions_change();
DROP FUNCTION IF EXISTS public.validate_role_module_permissions_change();
DROP FUNCTION IF EXISTS public.validate_report_transition();
DROP FUNCTION IF EXISTS public.validate_department_module_access_change();
DROP FUNCTION IF EXISTS public.user_has_permission(p_user_id uuid, p_permission_code text);
DROP FUNCTION IF EXISTS public.update_with_optimistic_lock(p_table_name text, p_id uuid, p_expected_version integer, p_updates jsonb);
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.update_unified_folders_updated_at();
DROP FUNCTION IF EXISTS public.update_unified_folders_path();
DROP FUNCTION IF EXISTS public.update_transfer_chain();
DROP FUNCTION IF EXISTS public.update_stage_timestamp();
DROP FUNCTION IF EXISTS public.update_settings_timestamp();
DROP FUNCTION IF EXISTS public.update_recipes_updated_at();
DROP FUNCTION IF EXISTS public.update_product_pallet_config_timestamp();
DROP FUNCTION IF EXISTS public.update_pallet_status();
DROP FUNCTION IF EXISTS public.update_overdue_tasks();
DROP FUNCTION IF EXISTS public.update_ncr_v2_updated_at();
DROP FUNCTION IF EXISTS public.update_folder_stats(folder_id_param uuid);
DROP FUNCTION IF EXISTS public.update_conversation_on_message();
DROP FUNCTION IF EXISTS public.update_content_shares_updated_at();
DROP FUNCTION IF EXISTS public.trigger_update_folder_stats_on_template();
DROP FUNCTION IF EXISTS public.trigger_update_folder_stats_on_instance();
DROP FUNCTION IF EXISTS public.sync_user_single_role(p_user_id uuid, p_role_code text);
DROP FUNCTION IF EXISTS public.sync_user_all_roles(p_user_id uuid);
DROP FUNCTION IF EXISTS public.sync_pallet_batches_on_archive();
DROP FUNCTION IF EXISTS public.sync_ncr_total_cost();
DROP FUNCTION IF EXISTS public.sync_ncr_supplier();
DROP FUNCTION IF EXISTS public.sync_batch_from_report();
DROP FUNCTION IF EXISTS public.set_current_timestamp_updated_at();
DROP FUNCTION IF EXISTS public.set_company_context(p_company_id uuid, p_user_role text);
DROP FUNCTION IF EXISTS public.set_action_number();
DROP FUNCTION IF EXISTS public.safe_grant_permission(p_role_id uuid, p_permission text);
DROP FUNCTION IF EXISTS public.safe_drop_policy(p_policy_name text, p_table_name text);
DROP FUNCTION IF EXISTS public.rls_auto_enable();
DROP FUNCTION IF EXISTS public.restore_recipe_version(p_recipe_id uuid, p_version_id uuid, p_reason text);
DROP FUNCTION IF EXISTS public.protect_system_roles();
DROP FUNCTION IF EXISTS public.protect_super_admin_access();
DROP FUNCTION IF EXISTS public.protect_locked_roles();
DROP FUNCTION IF EXISTS public.protect_access_management_availability();
DROP FUNCTION IF EXISTS public.prevent_report_review_history_modification();
DROP FUNCTION IF EXISTS public.prevent_privilege_escalation();
DROP FUNCTION IF EXISTS public.prevent_audit_modification();
DROP FUNCTION IF EXISTS public.notify_report_workflow();
DROP FUNCTION IF EXISTS public.ncr_comment_notify();
DROP FUNCTION IF EXISTS public.mark_notifications_read(p_notification_ids uuid[]);
DROP FUNCTION IF EXISTS public.log_share_activity(share_id_param uuid, activity_type_param text, performed_by_param uuid, metadata_param jsonb);
DROP FUNCTION IF EXISTS public.log_permission_change();
DROP FUNCTION IF EXISTS public.log_ncr_changes();
DROP FUNCTION IF EXISTS public.log_audit_event(p_action text, p_entity_type text, p_entity_id text, p_entity_name text, p_old_values jsonb, p_new_values jsonb, p_reason text, p_metadata jsonb);
DROP FUNCTION IF EXISTS public.log_admin_action(p_action text, p_target_table text, p_target_id text, p_details jsonb, p_reason text);
DROP FUNCTION IF EXISTS public.is_admin_user(check_user_id uuid);
DROP FUNCTION IF EXISTS public.is_admin_or_super_admin();
DROP FUNCTION IF EXISTS public.increment_version_column();
DROP FUNCTION IF EXISTS public.increment_version();
DROP FUNCTION IF EXISTS public.increment_template_version();
DROP FUNCTION IF EXISTS public.increment_cell_version();
DROP FUNCTION IF EXISTS public.has_view_all_documents_permission();
DROP FUNCTION IF EXISTS public.has_module_action(p_user_id uuid, p_module_code text, p_action text);
DROP FUNCTION IF EXISTS public.has_any_admin();
DROP FUNCTION IF EXISTS public.hard_delete_recycle_bin_item(p_recycle_bin_id uuid);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_auth_user_deleted();
DROP FUNCTION IF EXISTS public.get_version_duration_days(v_id uuid);
DROP FUNCTION IF EXISTS public.get_user_visible_departments(p_user_id uuid, p_module_code text);
DROP FUNCTION IF EXISTS public.get_user_role_codes(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_user_profile_complete(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_modules(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_module_permissions(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_user_effective_permissions(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_departments(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_department_id();
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
    SET search_path TO ''
    AS $$
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
-- Name: get_user_department_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_department_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT department_id
  FROM public.user_departments
  WHERE user_id = auth.uid() AND is_active = TRUE
  ORDER BY COALESCE(is_primary, false) DESC
  LIMIT 1;
$$;


--
-- Name: get_user_departments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_departments(p_user_id uuid DEFAULT NULL::uuid) RETURNS uuid[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: get_user_effective_permissions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_effective_permissions(p_user_id uuid) RETURNS SETOF public.user_effective_permission
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION get_user_effective_permissions(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_effective_permissions(p_user_id uuid) IS 'Phase 1: Single-point permission resolver. Department-first model with role restrictions.';


--
-- Name: get_user_module_permissions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_module_permissions(user_uuid uuid) RETURNS TABLE(module_code text, granted_actions text[], data_isolation_mode text, can_see_all_departments boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$ BEGIN RETURN QUERY
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


--
-- Name: FUNCTION get_user_module_permissions(user_uuid uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_module_permissions(user_uuid uuid) IS 'Returns aggregated module permissions for a user from all assigned roles. 
Security-definer to bypass RLS on user_roles table.';


--
-- Name: get_user_modules(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_modules(p_user_id uuid) RETURNS TABLE(module_code text, module_name text, module_name_ar text, granted_actions text[], data_isolation_mode text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN RETURN QUERY
SELECT DISTINCT am.code,
    am.name,
    am.name_ar,
    COALESCE(
        dma.granted_actions,
        rmp.granted_actions,
        ARRAY ['view']
    ),
    am.data_isolation_mode
FROM public.app_modules am
    LEFT JOIN public.department_module_access dma ON dma.module_code = am.code
    LEFT JOIN public.user_departments ud ON ud.department_id = dma.department_id
    AND ud.user_id = p_user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = p_user_id
    LEFT JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
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


--
-- Name: get_user_profile_complete(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_profile_complete(p_user_id uuid) RETURNS TABLE(id uuid, email text, name text, phone text, avatar_url text, title text, department_id uuid, department_name text, department_code text, role_ids uuid[], role_codes text[], role_names text[], is_active boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION get_user_profile_complete(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_profile_complete(p_user_id uuid) IS 'Returns complete user profile with department and role information joined properly from user_roles table.';


--
-- Name: get_user_role_codes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role_codes(user_uuid uuid) RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
SELECT array_agg(r.code)
FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
WHERE ur.user_id = user_uuid;
$$;


--
-- Name: FUNCTION get_user_role_codes(user_uuid uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_role_codes(user_uuid uuid) IS 'Returns array of role codes for a user. Security-definer to bypass RLS.';


--
-- Name: get_user_visible_departments(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_visible_departments(p_user_id uuid, p_module_code text) RETURNS uuid[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION get_user_visible_departments(p_user_id uuid, p_module_code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_visible_departments(p_user_id uuid, p_module_code text) IS 'Returns all department IDs user can see data from for a module.';


--
-- Name: get_version_duration_days(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_version_duration_days(v_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE v_from TIMESTAMP WITH TIME ZONE;
v_until TIMESTAMP WITH TIME ZONE;
BEGIN
SELECT effective_from,
    effective_until INTO v_from,
    v_until
FROM recipe_versions
WHERE id = v_id;
IF v_until IS NULL THEN RETURN EXTRACT(
    DAY
    FROM NOW() - v_from
)::INTEGER;
ELSE RETURN EXTRACT(
    DAY
    FROM v_until - v_from
)::INTEGER;
END IF;
END;
$$;


--
-- Name: handle_auth_user_deleted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_auth_user_deleted() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN -- Delete the corresponding public.users record
    -- CASCADE will clean up user_roles, user_departments, etc.
DELETE FROM public.users
WHERE id = OLD.id;
RETURN OLD;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN
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


--
-- Name: hard_delete_recycle_bin_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hard_delete_recycle_bin_item(p_recycle_bin_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
    v_item recycle_bin%rowtype;
    v_allowed boolean;
    v_folder_ids uuid[];
begin
    select * into v_item
    from recycle_bin
    where id = p_recycle_bin_id;

    if not found then
        raise exception 'RECYCLE_BIN_ITEM_NOT_FOUND';
    end if;

    v_allowed := (v_item.deleted_by = auth.uid())
        or check_forms_permission(auth.uid(), 'delete', null);

    if not v_allowed then
        raise exception 'PERMISSION_DENIED';
    end if;

    if v_item.item_type = 'instance' then
        delete from form_instances
        where id = v_item.original_id;
    elsif v_item.item_type = 'template' then
        delete from form_instances
        where template_id = v_item.original_id;

        delete from form_templates
        where id = v_item.original_id;
    elsif v_item.item_type = 'folder' then
        with recursive folder_tree as (
            select id
            from unified_folders
            where id = v_item.original_id
            union all
            select uf.id
            from unified_folders uf
            join folder_tree ft on uf.parent_id = ft.id
        )
        select array_agg(id) into v_folder_ids
        from folder_tree;

        delete from form_instances
        where unified_folder_id = any(v_folder_ids);

        delete from form_templates
        where unified_folder_id = any(v_folder_ids);

        delete from unified_folders
        where id = any(v_folder_ids);
    end if;

    delete from recycle_bin
    where id = v_item.id;
end;
$$;


--
-- Name: has_any_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_any_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
        WHERE r.code IN ('super_admin', 'admin')
    );
$$;


--
-- Name: FUNCTION has_any_admin(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.has_any_admin() IS 'SECURITY DEFINER function to check if any admin exists. Used for bootstrap mode.';


--
-- Name: has_module_action(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_module_action(p_user_id uuid, p_module_code text, p_action text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.role_module_permissions rmp
            JOIN public.user_roles ur ON ur.role_id = rmp.role_id
        WHERE ur.user_id = p_user_id
            AND rmp.module_code = p_module_code
            AND p_action = ANY(rmp.granted_actions)
    );
END;
$$;


--
-- Name: has_view_all_documents_permission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_view_all_documents_permission() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM role_module_permissions rmp
            JOIN user_roles ur ON ur.role_id = rmp.role_id
        WHERE ur.user_id = auth.uid()
            AND rmp.module_code = 'documents'
            AND 'view_all_documents' = ANY(rmp.granted_actions)
    );
END;
$$;


--
-- Name: increment_cell_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_cell_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN -- Get the latest version for this cell
SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
FROM cell_change_history
WHERE instance_id = NEW.instance_id
    AND section_id = NEW.section_id
    AND table_id = NEW.table_id
    AND row_index = NEW.row_index
    AND col_index = NEW.col_index;
RETURN NEW;
END;
$$;


--
-- Name: FUNCTION increment_cell_version(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.increment_cell_version() IS 'Trigger function: يزيد رقم الإصدار تلقائياً عند إضافة تعديل جديد';


--
-- Name: increment_template_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_template_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN -- Use 'version' column instead of 'version_number'
    NEW.version := COALESCE(OLD.version, 0) + 1;
NEW.last_modified_by := auth.uid();
NEW.last_modified_at := NOW();
RETURN NEW;
END;
$$;


--
-- Name: increment_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN -- Only increment if data actually changed (not just version)
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


--
-- Name: increment_version_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_version_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN NEW.version = COALESCE(OLD.version, 0) + 1;
RETURN NEW;
END;
$$;


--
-- Name: is_admin_or_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_super_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ -- Check if user has 'edit' permission on 'access_management'
SELECT check_matrix_permission(auth.uid(), 'access_management', 'edit');
$$;


--
-- Name: FUNCTION is_admin_or_super_admin(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_admin_or_super_admin() IS 'MIGRATION: Checks matrix permission first, falls back to role codes. 
After full migration, remove the role code fallback.';


--
-- Name: is_admin_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_user(check_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = check_user_id
            AND r.code IN ('super_admin', 'admin')
    );
$$;


--
-- Name: FUNCTION is_admin_user(check_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_admin_user(check_user_id uuid) IS 'SECURITY DEFINER function to check if user is admin. Bypasses RLS to avoid infinite recursion.';


--
-- Name: log_admin_action(text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_admin_action(p_action text, p_target_table text, p_target_id text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb, p_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: log_audit_event(text, text, text, text, jsonb, jsonb, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id text, p_entity_name text DEFAULT NULL::text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: log_ncr_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_ncr_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE user_id UUID;
user_name TEXT;
BEGIN -- Get current user
user_id := auth.uid();
SELECT full_name INTO user_name
FROM users
WHERE id = user_id;
IF TG_OP = 'INSERT' THEN
INSERT INTO ncr_audit_log (
        ncr_id,
        action,
        action_category,
        new_values,
        performed_by_id,
        performed_by_name
    )
VALUES (
        NEW.id,
        'تم إنشاء التقرير',
        'create',
        to_jsonb(NEW),
        user_id,
        user_name
    );
ELSIF TG_OP = 'UPDATE' THEN -- Log status change
IF OLD.status != NEW.status THEN
INSERT INTO ncr_audit_log (
        ncr_id,
        action,
        action_category,
        previous_values,
        new_values,
        performed_by_id,
        performed_by_name
    )
VALUES (
        NEW.id,
        'تغيير الحالة من ' || OLD.status || ' إلى ' || NEW.status,
        'status_change',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        user_id,
        user_name
    );
END IF;
-- Log stage change
IF OLD.current_stage_id IS DISTINCT
FROM NEW.current_stage_id THEN
INSERT INTO ncr_audit_log (
        ncr_id,
        action,
        action_category,
        previous_values,
        new_values,
        performed_by_id,
        performed_by_name
    )
VALUES (
        NEW.id,
        'تغيير المرحلة',
        'stage_change',
        jsonb_build_object('stage_id', OLD.current_stage_id),
        jsonb_build_object('stage_id', NEW.current_stage_id),
        user_id,
        user_name
    );
END IF;
-- Log assignment change
IF OLD.assigned_to_id IS DISTINCT
FROM NEW.assigned_to_id THEN
INSERT INTO ncr_audit_log (
        ncr_id,
        action,
        action_category,
        previous_values,
        new_values,
        performed_by_id,
        performed_by_name
    )
VALUES (
        NEW.id,
        'تغيير المسؤول',
        'assignment',
        jsonb_build_object('assigned_to', OLD.assigned_to_id),
        jsonb_build_object('assigned_to', NEW.assigned_to_id),
        user_id,
        user_name
    );
END IF;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: log_permission_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_permission_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: log_share_activity(uuid, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_share_activity(share_id_param uuid, activity_type_param text, performed_by_param uuid, metadata_param jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: mark_notifications_read(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notifications_read(p_notification_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: ncr_comment_notify(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ncr_comment_notify() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_ncr_id uuid;
  v_department text;
  v_number text;
begin
  -- Determine NCR ID (supports both legacy ncr_id and new entity_id/entity_type)
  v_ncr_id := coalesce(new.entity_id, new.ncr_id);
  if v_ncr_id is null then
    return new;
  end if;

  select department, number into v_department, v_number
  from ncr_reports
  where id = v_ncr_id;

  if v_department is null then
    return new;
  end if;

  -- Insert notifications for all active users in the same department except the author
  insert into notifications (
    user_id, title, message, type, category,
    entity_type, entity_id, action_url,
    sender_id, sender_name, created_at, read
  )
  select
    u.id,
    'تعليق جديد على NCR ' || coalesce(v_number, ''),
    left(new.content, 120),
    'workflow',
    'ncr',
    'ncr',
    v_ncr_id,
    '/ncr/' || v_ncr_id,
    new.author_id,
    new.author_name,
    now(),
    false
  from users u
  where u.department = v_department
    and u.id <> new.author_id
    and (u.is_active is null or u.is_active = true);

  return new;
end;
$$;


--
-- Name: notify_report_workflow(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_report_workflow() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: prevent_audit_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_audit_modification() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN IF TG_OP = 'UPDATE' THEN -- For any audit table, allow if only the user reference column is being set to NULL
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


--
-- Name: FUNCTION prevent_audit_modification(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.prevent_audit_modification() IS 'Prevents UPDATE and DELETE operations on audit tables to ensure compliance and data integrity';


--
-- Name: prevent_privilege_escalation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_privilege_escalation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: prevent_report_review_history_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_report_review_history_modification() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN -- ✅ FIX: Allow DELETE operations to support cascading deletes
    IF TG_OP = 'DELETE' THEN RETURN OLD;
END IF;
IF TG_OP = 'UPDATE' THEN IF (
    OLD.id = NEW.id
    AND OLD.report_id = NEW.report_id
    AND OLD.checksum = NEW.checksum
    AND NEW.performed_by IS NULL
    AND OLD.performed_by IS NOT NULL
) THEN RETURN NEW;
END IF;
END IF;
RAISE EXCEPTION 'AUDIT_IMMUTABILITY_VIOLATION: History cannot be modified. Action: %',
TG_OP;
END;
$$;


--
-- Name: protect_access_management_availability(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_access_management_availability() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: protect_locked_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_locked_roles() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN IF OLD.is_locked = true
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


--
-- Name: protect_super_admin_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_super_admin_access() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: protect_system_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_system_roles() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN -- Allow updates if only updating non-protected fields
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


--
-- Name: restore_recipe_version(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_recipe_version(p_recipe_id uuid, p_version_id uuid, p_reason text DEFAULT 'استعادة إصدار سابق'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_version RECORD;
new_version_id UUID;
user_name TEXT;
BEGIN -- الحصول على بيانات الإصدار المطلوب استعادته
SELECT * INTO v_version
FROM recipe_versions
WHERE id = p_version_id;
IF NOT FOUND THEN RAISE EXCEPTION 'الإصدار غير موجود';
END IF;
-- الحصول على اسم المستخدم
SELECT COALESCE(raw_user_meta_data->>'full_name', email) INTO user_name
FROM auth.users
WHERE id = auth.uid();
-- تحديث الوصفة ببيانات الإصدار القديم
UPDATE recipes
SET name = v_version.name,
    name_en = v_version.name_en,
    ingredients = v_version.ingredients,
    mixing_steps = v_version.mixing_steps,
    notes = v_version.notes,
    updated_at = NOW()
WHERE id = p_recipe_id
RETURNING current_version_id INTO new_version_id;
-- تسجيل عملية الاستعادة
INSERT INTO recipe_change_log (
        recipe_id,
        version_id,
        action,
        changed_by,
        changed_by_name,
        reason,
        old_value,
        new_value
    )
VALUES (
        p_recipe_id,
        new_version_id,
        'restore',
        auth.uid(),
        user_name,
        p_reason,
        jsonb_build_object(
            'restored_from_version',
            v_version.version_number
        ),
        jsonb_build_object('new_version_id', new_version_id)
    );
RETURN new_version_id;
END;
$$;


--
-- Name: FUNCTION restore_recipe_version(p_recipe_id uuid, p_version_id uuid, p_reason text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.restore_recipe_version(p_recipe_id uuid, p_version_id uuid, p_reason text) IS 'استعادة إصدار سابق من الوصفة';


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: safe_drop_policy(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_drop_policy(p_policy_name text, p_table_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$ BEGIN IF EXISTS (
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


--
-- Name: safe_grant_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_grant_permission(p_role_id uuid, p_permission text) RETURNS TABLE(granted_permission text, was_new boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: set_action_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_action_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.action_number := COALESCE(
        (
            SELECT MAX(action_number)
            FROM ncr_actions
            WHERE ncr_id = NEW.ncr_id
        ),
        0
    ) + 1;
RETURN NEW;
END;
$$;


--
-- Name: set_company_context(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_company_context(p_company_id uuid, p_user_role text DEFAULT 'user'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN PERFORM set_config('app.company_id', p_company_id::text, false);
PERFORM set_config('app.user_role', p_user_role, false);
END;
$$;


--
-- Name: set_current_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: sync_batch_from_report(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_batch_from_report() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_batch_number TEXT;
v_report_date DATE;
v_product_id UUID;
v_company_id UUID;
BEGIN -- Extract info from the report (form_instance)
v_batch_number := NEW.form_data->>'batch_number';
-- If no batch number, skip
IF v_batch_number IS NULL
OR v_batch_number = '' THEN RETURN NEW;
END IF;
-- Extract report date (default to today if missing)
v_report_date := (NEW.form_data->>'report_date')::DATE;
IF v_report_date IS NULL THEN v_report_date := CURRENT_DATE;
END IF;
-- Get Company ID
v_company_id := NEW.company_id;
-- Get Product ID from Template
-- Assuming basic_info in template contains product_id
SELECT (basic_info->>'product_id')::UUID INTO v_product_id
FROM form_templates
WHERE id = NEW.template_id;
-- If we have all necessary info, Upsert into pallet_batches
IF v_product_id IS NOT NULL
AND v_company_id IS NOT NULL THEN
INSERT INTO pallet_batches (
        company_id,
        product_id,
        batch_number,
        production_date,
        form_instance_id,
        status,
        created_by
    )
VALUES (
        v_company_id,
        v_product_id,
        v_batch_number,
        v_report_date,
        NEW.id,
        'active',
        NEW.created_by
    ) ON CONFLICT (company_id, batch_number) DO
UPDATE
SET production_date = EXCLUDED.production_date,
    form_instance_id = EXCLUDED.form_instance_id,
    updated_at = NOW();
END IF;
RETURN NEW;
END;
$$;


--
-- Name: sync_ncr_supplier(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_ncr_supplier() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
UPDATE ncr_reports_v2
SET supplier_id = NEW.supplier_id,
    updated_at = NOW()
WHERE id = NEW.ncr_id;
RETURN NEW;
END;
$$;


--
-- Name: sync_ncr_total_cost(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_ncr_total_cost() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
UPDATE ncr_reports_v2
SET total_cost = NEW.total_cost,
    cost_breakdown = jsonb_build_object(
        'material',
        COALESCE(NEW.material_cost, 0),
        'rework',
        COALESCE(NEW.rework_cost, 0),
        'downtime',
        COALESCE(NEW.downtime_cost, 0),
        'labor',
        COALESCE(NEW.labor_cost, 0),
        'inspection',
        COALESCE(NEW.inspection_cost, 0),
        'shipping',
        COALESCE(NEW.shipping_cost, 0),
        'other',
        COALESCE(NEW.other_costs_total, 0)
    ),
    updated_at = NOW()
WHERE id = NEW.ncr_id;
RETURN NEW;
END;
$$;


--
-- Name: sync_pallet_batches_on_archive(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_pallet_batches_on_archive() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- When form_instance is archived (soft deleted)
    IF NEW.archived = true AND (OLD.archived = false OR OLD.archived IS NULL) THEN
        -- Delete the pallet_batch linked to this form_instance
        DELETE FROM pallet_batches
        WHERE form_instance_id = NEW.id;

        RAISE NOTICE 'Deleted pallet_batch for archived form_instance: %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION sync_pallet_batches_on_archive(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_pallet_batches_on_archive() IS 'تنظيف سجلات الباتش عند أرشفة/حذف التقرير المرتبط بها';


--
-- Name: sync_user_all_roles(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_user_all_roles(p_user_id uuid) RETURNS TABLE(role_code text, synced boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: sync_user_single_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_user_single_role(p_user_id uuid, p_role_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: trigger_update_folder_stats_on_instance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_folder_stats_on_instance() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN IF TG_OP = 'INSERT'
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


--
-- Name: trigger_update_folder_stats_on_template(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_folder_stats_on_template() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN IF TG_OP = 'INSERT'
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


--
-- Name: update_content_shares_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_content_shares_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;


--
-- Name: update_conversation_on_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_on_message() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN
UPDATE ncr_conversations
SET message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW()
WHERE id = NEW.conversation_id;
RETURN NEW;
END;
$$;


--
-- Name: update_folder_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_folder_stats(folder_id_param uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: update_ncr_v2_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ncr_v2_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


--
-- Name: update_overdue_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_overdue_tasks() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN
UPDATE tasks
SET status = 'overdue',
    updated_at = NOW()
WHERE due_date < CURRENT_DATE
    AND status IN ('pending', 'in_progress')
    AND status != 'overdue';
END;
$$;


--
-- Name: update_pallet_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_pallet_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN -- If pallet reached target, mark as complete
    IF NEW.actual_cartons >= NEW.target_cartons
    AND OLD.status = 'partial' THEN NEW.status := 'complete';
NEW.completed_at := NOW();
END IF;
-- Update batch totals
UPDATE pallet_batches
SET total_cartons = (
        SELECT COALESCE(SUM(actual_cartons), 0)
        FROM pallets
        WHERE batch_id = NEW.batch_id
    ),
    total_pallets = (
        SELECT COUNT(*)
        FROM pallets
        WHERE batch_id = NEW.batch_id
    ),
    updated_at = NOW()
WHERE id = NEW.batch_id;
RETURN NEW;
END;
$$;


--
-- Name: update_product_pallet_config_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_pallet_config_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_recipes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_recipes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


--
-- Name: update_settings_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_settings_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


--
-- Name: update_stage_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_stage_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


--
-- Name: update_transfer_chain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_transfer_chain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE current_chain JSONB;
new_entry JSONB;
BEGIN -- Get or create chain record
INSERT INTO ncr_transfer_chain (ncr_id, current_department_id)
VALUES (NEW.ncr_id, NEW.to_department_id) ON CONFLICT (ncr_id) DO NOTHING;
-- Update chain
SELECT chain INTO current_chain
FROM ncr_transfer_chain
WHERE ncr_id = NEW.ncr_id;
new_entry = jsonb_build_object(
    'order',
    COALESCE(jsonb_array_length(current_chain), 0) + 1,
    'department_id',
    NEW.to_department_id,
    'department_name',
    NEW.to_department_name,
    'transfer_id',
    NEW.id,
    'entered_at',
    NOW()
);
UPDATE ncr_transfer_chain
SET chain = COALESCE(chain, '[]'::jsonb) || new_entry,
    total_transfers = total_transfers + 1,
    current_department_id = NEW.to_department_id,
    updated_at = NOW()
WHERE ncr_id = NEW.ncr_id;
-- Check for loop
IF EXISTS (
    SELECT 1
    FROM ncr_transfer_chain
    WHERE ncr_id = NEW.ncr_id
        AND chain @> jsonb_build_array(
            jsonb_build_object('department_id', NEW.to_department_id)
        )
) THEN
UPDATE ncr_transfer_chain
SET loop_detected = true
WHERE ncr_id = NEW.ncr_id;
END IF;
-- Check max transfers
IF (
    SELECT total_transfers
    FROM ncr_transfer_chain
    WHERE ncr_id = NEW.ncr_id
) >= 5 THEN
UPDATE ncr_transfer_chain
SET max_transfers_reached = true
WHERE ncr_id = NEW.ncr_id;
END IF;
RETURN NEW;
END;
$$;


--
-- Name: update_unified_folders_path(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_unified_folders_path() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN IF NEW.parent_id IS NULL THEN NEW.path = '/' || NEW.id::text;
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


--
-- Name: update_unified_folders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_unified_folders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


--
-- Name: update_with_optimistic_lock(text, uuid, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_with_optimistic_lock(p_table_name text, p_id uuid, p_expected_version integer, p_updates jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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


--
-- Name: user_has_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_permission(p_user_id uuid, p_permission_code text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: validate_department_module_access_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_department_module_access_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: validate_report_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_report_transition() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: validate_role_module_permissions_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_role_module_permissions_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: validate_role_permissions_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_role_permissions_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: validate_roles_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_roles_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: validate_supplier_for_material(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_supplier_for_material(p_raw_material_id uuid, p_supplier_id uuid, p_company_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: validate_user_roles_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_user_roles_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_user_email TEXT;
v_user_roles TEXT [];
v_has_permission BOOLEAN;
v_affected_user_email TEXT;
v_assigned_role_name TEXT;
v_has_any_admin BOOLEAN;
BEGIN -- Check if ANY admin exists - if not, allow bootstrap
SELECT public.has_any_admin() INTO v_has_any_admin;
-- Allow operation if in bootstrap mode (no admins exist)
IF NOT v_has_any_admin THEN RETURN COALESCE(NEW, OLD);
END IF;
-- Normal permission check
v_has_permission := check_matrix_permission(auth.uid(), 'settings', 'manage_permissions');
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


--
-- Name: verify_audit_trail_integrity(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_audit_trail_integrity(p_entity_type text DEFAULT NULL::text, p_entity_id text DEFAULT NULL::text) RETURNS TABLE(audit_id uuid, audit_entity_type text, audit_entity_id text, event_timestamp timestamp with time zone, stored_checksum text, calculated_checksum text, is_valid boolean, chain_valid boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: verify_user_has_permissions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_user_has_permissions(p_user_id uuid) RETURNS TABLE(check_name text, result boolean, details text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ BEGIN -- Check 1: User has roles
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _backup_permission_matrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._backup_permission_matrix (
    id uuid,
    role uuid,
    permissions jsonb,
    updated_at timestamp with time zone
);


--
-- Name: _backup_report_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._backup_report_folders (
    id uuid,
    name text,
    name_en text,
    description text,
    icon text,
    color text,
    parent_id uuid,
    path text,
    sort_order integer,
    created_at timestamp with time zone,
    created_by uuid,
    updated_at timestamp with time zone,
    company_id uuid,
    is_system boolean,
    metadata jsonb,
    archived boolean,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer,
    last_modified_by uuid
);


--
-- Name: _backup_template_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._backup_template_folders (
    id uuid,
    name text,
    name_en text,
    description text,
    icon text,
    color text,
    parent_id uuid,
    path text,
    sort_order integer,
    created_at timestamp with time zone,
    created_by uuid,
    updated_at timestamp with time zone,
    company_id uuid,
    is_system boolean,
    metadata jsonb,
    archived boolean,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer,
    last_modified_by uuid
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_ar text,
    description text,
    description_ar text,
    color text DEFAULT '#6B7280'::text,
    priority integer DEFAULT 100,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    code text,
    company_id uuid NOT NULL,
    department text,
    department_ar text,
    is_locked boolean DEFAULT false,
    min_edit_priority integer DEFAULT 100,
    is_deprecated boolean DEFAULT false,
    deprecated_at timestamp with time zone,
    replacement_role_id uuid,
    deprecation_message text,
    category text DEFAULT 'general'::text,
    type text DEFAULT 'custom'::text,
    icon text DEFAULT 'Shield'::text,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'Standard factory roles for QMS system';


--
-- Name: user_temp_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_temp_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_by uuid,
    starts_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    reason text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: active_user_temp_roles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_user_temp_roles WITH (security_invoker='true') AS
 SELECT utr.id,
    utr.user_id,
    u.email AS user_email,
    (u.raw_user_meta_data ->> 'full_name'::text) AS user_name,
    utr.role_id,
    r.name AS role_name,
    r.name_ar AS role_name_ar,
    r.color AS role_color,
    utr.starts_at,
    utr.expires_at,
    utr.reason,
    utr.assigned_by,
    utr.created_at,
        CASE
            WHEN (utr.expires_at IS NULL) THEN 'permanent'::text
            WHEN (utr.expires_at > now()) THEN 'active'::text
            ELSE 'expired'::text
        END AS status
   FROM ((public.user_temp_roles utr
     JOIN auth.users u ON ((u.id = utr.user_id)))
     JOIN public.roles r ON ((r.id = utr.role_id)))
  WHERE (utr.is_active = true);


--
-- Name: allergen_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allergen_profiles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    product_name text NOT NULL,
    allergens jsonb DEFAULT '[]'::jsonb,
    may_contain jsonb DEFAULT '[]'::jsonb,
    cross_contact_risk text,
    cleaning_procedure text,
    verified boolean DEFAULT false,
    verified_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    icon text DEFAULT 'Box'::text,
    color text DEFAULT '#6B7280'::text,
    display_order integer DEFAULT 1,
    is_active boolean DEFAULT true,
    data_isolation_mode text DEFAULT 'shared'::text,
    supports_sharing boolean DEFAULT false,
    available_actions text[] DEFAULT ARRAY['view'::text],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_module_code text,
    module_type text DEFAULT 'core'::text,
    is_department_scoped boolean DEFAULT true,
    CONSTRAINT app_modules_data_isolation_mode_check CHECK ((data_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, 'hybrid'::text]))),
    CONSTRAINT app_modules_module_type_check CHECK ((module_type = ANY (ARRAY['core'::text, 'extension'::text, 'stage'::text])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    operation text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    performed_by uuid,
    entity_name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_trail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_trail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    entity_name text,
    user_id uuid,
    user_email text,
    user_name text,
    user_role text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text,
    session_id text,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    reason text,
    parent_entity_type text,
    parent_entity_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    checksum text NOT NULL,
    previous_checksum text,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_trail_action_check CHECK ((action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DELETE'::text, 'RESTORE'::text, 'ARCHIVE'::text, 'UNARCHIVE'::text, 'MOVE'::text, 'COPY'::text, 'APPROVE'::text, 'REJECT'::text, 'SUBMIT'::text, 'SIGN'::text, 'LOGIN'::text, 'LOGOUT'::text, 'PERMISSION_CHANGE'::text]))),
    CONSTRAINT audit_trail_entity_type_check CHECK ((entity_type = ANY (ARRAY['folder'::text, 'template_folder'::text, 'report_folder'::text, 'form_template'::text, 'form_instance'::text, 'user'::text, 'role'::text, 'permission'::text, 'ncr'::text, 'lab_test'::text, 'material_receiving'::text, 'raw_material'::text, 'supplier'::text, 'product'::text])))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text,
    color text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cell_change_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cell_change_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    section_id text NOT NULL,
    table_id text NOT NULL,
    row_index integer NOT NULL,
    col_index integer NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid NOT NULL,
    changed_by_name text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    change_type text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    client_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cell_change_history_change_type_check CHECK ((change_type = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text])))
);


--
-- Name: TABLE cell_change_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cell_change_history IS 'سجل شامل لجميع التعديلات على مستوى الخلية في النماذج - يدعم التعاون في الوقت الفعلي';


--
-- Name: COLUMN cell_change_history.instance_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.instance_id IS 'معرف النموذج (form instance)';


--
-- Name: COLUMN cell_change_history.section_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.section_id IS 'معرف القسم في النموذج';


--
-- Name: COLUMN cell_change_history.table_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.table_id IS 'معرف الجدول في القسم';


--
-- Name: COLUMN cell_change_history.row_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.row_index IS 'رقم الصف (0-indexed)';


--
-- Name: COLUMN cell_change_history.col_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.col_index IS 'رقم العمود (0-indexed)';


--
-- Name: COLUMN cell_change_history.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.version IS 'رقم الإصدار - يزيد تلقائياً لاكتشاف التعارضات';


--
-- Name: cleaning_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleaning_records (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    area_id uuid,
    status text DEFAULT 'completed'::text,
    checklist_results jsonb DEFAULT '{}'::jsonb,
    cleaned_by text,
    verified_by text,
    notes text,
    cleaned_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    name_en text,
    code text,
    logo_url text,
    address text,
    phone text,
    email text,
    tax_number text,
    commercial_register text,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: content_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_type text NOT NULL,
    content_id uuid NOT NULL,
    shared_by_user_id uuid NOT NULL,
    shared_by_department_id uuid,
    share_type text NOT NULL,
    shared_with_departments uuid[] DEFAULT ARRAY[]::uuid[],
    shared_with_users uuid[] DEFAULT ARRAY[]::uuid[],
    shared_with_roles uuid[] DEFAULT ARRAY[]::uuid[],
    auto_assign_to_new_role_members boolean DEFAULT true,
    permission_level text DEFAULT 'view'::text,
    custom_permissions jsonb DEFAULT jsonb_build_object('can_view', true, 'can_download', true, 'can_comment', false, 'can_edit', false, 'can_delete', false, 'can_share', false, 'can_export', true),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    require_password boolean DEFAULT false,
    password_hash text,
    max_views integer,
    current_views integer DEFAULT 0,
    title text,
    note text,
    tags text[],
    notify_on_access boolean DEFAULT false,
    notify_on_edit boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone,
    access_count integer DEFAULT 0,
    stats jsonb DEFAULT jsonb_build_object('total_views', 0, 'unique_viewers', 0, 'comments_count', 0, 'edits_count', 0),
    CONSTRAINT content_shares_access_count_positive CHECK ((access_count >= 0)),
    CONSTRAINT content_shares_content_type_check CHECK ((content_type = ANY (ARRAY['folder'::text, 'form_template'::text, 'form_instance'::text, 'report'::text]))),
    CONSTRAINT content_shares_current_views_positive CHECK ((current_views >= 0)),
    CONSTRAINT content_shares_max_views_positive CHECK (((max_views IS NULL) OR (max_views > 0))),
    CONSTRAINT content_shares_permission_level_check CHECK ((permission_level = ANY (ARRAY['view'::text, 'comment'::text, 'edit'::text, 'full'::text]))),
    CONSTRAINT content_shares_share_target_check CHECK (
CASE share_type
    WHEN 'department'::text THEN (cardinality(shared_with_departments) > 0)
    WHEN 'user'::text THEN (cardinality(shared_with_users) > 0)
    WHEN 'role'::text THEN (cardinality(shared_with_roles) > 0)
    WHEN 'public'::text THEN true
    ELSE false
END),
    CONSTRAINT content_shares_share_type_check CHECK ((share_type = ANY (ARRAY['department'::text, 'user'::text, 'role'::text, 'public'::text])))
);


--
-- Name: TABLE content_shares; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.content_shares IS 'Advanced 3-level sharing system (Department/User/Role) for content';


--
-- Name: control_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_points (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'ccp'::text,
    location text,
    critical_limits jsonb DEFAULT '{}'::jsonb,
    monitoring_frequency text,
    responsible_person text,
    corrective_actions text,
    verification_methods text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    hazard_type text,
    hazard_description text,
    description text
);


--
-- Name: corrective_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corrective_actions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    monitoring_record_id uuid,
    control_point_id uuid,
    action_taken text,
    product_disposition text,
    cause text,
    preventive_measures text,
    completed_by text,
    completed_at timestamp with time zone,
    verified_by text,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    ncr_id uuid,
    company_id uuid,
    issue_description text,
    issue_type text,
    severity text DEFAULT 'low'::text,
    status text DEFAULT 'open'::text,
    assigned_to text,
    assigned_to_id uuid,
    due_date date,
    root_cause text,
    preventive_action text,
    created_by text,
    source_type character varying(20) DEFAULT 'haccp'::character varying,
    CONSTRAINT ca_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ca_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'verified'::text, 'closed'::text]))),
    CONSTRAINT chk_source_type CHECK (((source_type)::text = ANY (ARRAY[('haccp'::character varying)::text, ('ncr'::character varying)::text, ('audit'::character varying)::text, ('customer_complaint'::character varying)::text])))
);


--
-- Name: defects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.defects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_en text,
    severity text NOT NULL,
    defect_type text NOT NULL,
    product_id uuid,
    production_line_id uuid,
    material_receiving_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT defects_defect_type_check CHECK ((defect_type = ANY (ARRAY['raw_material'::text, 'product'::text, 'process'::text, 'other'::text]))),
    CONSTRAINT defects_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);


--
-- Name: department_module_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_module_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    module_code text NOT NULL,
    is_enabled boolean DEFAULT true,
    custom_isolation_mode text,
    granted_actions text[] DEFAULT ARRAY['view'::text],
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    stage_code text,
    visibility_departments uuid[] DEFAULT '{}'::uuid[],
    last_changed_by uuid,
    last_changed_reason text,
    change_count integer DEFAULT 0,
    CONSTRAINT department_module_access_custom_isolation_mode_check CHECK ((custom_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, NULL::text])))
);


--
-- Name: department_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    role_id uuid NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: TABLE department_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.department_roles IS 'Links roles to departments for access control';


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    code text,
    created_at timestamp with time zone DEFAULT now(),
    name_en text,
    description text,
    sort_order integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now(),
    name_ar text,
    description_ar text,
    color text DEFAULT '#6B7280'::text,
    icon text DEFAULT 'Building2'::text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 50,
    parent_department_id uuid,
    manager_user_id uuid,
    created_by uuid,
    updated_by uuid,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: document_access_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_access_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version_id uuid,
    user_id uuid NOT NULL,
    action text NOT NULL,
    ip_address text,
    user_agent text,
    accessed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_access_log_action_check CHECK ((action = ANY (ARRAY['view'::text, 'download'::text, 'print'::text, 'edit'::text, 'approve'::text, 'reject'::text])))
);


--
-- Name: document_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    name_ar text,
    code character varying(20),
    parent_id uuid,
    description text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type text NOT NULL,
    document_id uuid NOT NULL,
    shared_by uuid NOT NULL,
    shared_by_department_id uuid,
    shared_with_department_id uuid,
    shared_with_user_id uuid,
    permission_level text DEFAULT 'view'::text,
    expires_at timestamp with time zone,
    note text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_share_target CHECK ((((shared_with_department_id IS NOT NULL) AND (shared_with_user_id IS NULL)) OR ((shared_with_department_id IS NULL) AND (shared_with_user_id IS NOT NULL)))),
    CONSTRAINT document_shares_permission_level_check CHECK ((permission_level = ANY (ARRAY['view'::text, 'edit'::text, 'full'::text])))
);


--
-- Name: document_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_signatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version_id uuid NOT NULL,
    signer_id uuid NOT NULL,
    signature_type text NOT NULL,
    signature_data text,
    comments text,
    signed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    CONSTRAINT document_signatures_signature_type_check CHECK ((signature_type = ANY (ARRAY['author'::text, 'reviewer'::text, 'approver'::text])))
);


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    name_ar text,
    type text NOT NULL,
    content text,
    header_content text,
    footer_content text,
    page_margins jsonb DEFAULT '{"top": 20, "left": 20, "right": 20, "bottom": 20}'::jsonb,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_templates_type_check CHECK ((type = ANY (ARRAY['sop'::text, 'work_instruction'::text, 'manual'::text, 'form'::text, 'policy'::text, 'specification'::text, 'other'::text])))
);


--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    company_id uuid NOT NULL,
    version integer NOT NULL,
    content text,
    file_path text,
    file_name text,
    file_size integer,
    file_type text,
    changes_summary text,
    change_reason text,
    status text DEFAULT 'draft'::text,
    created_by uuid,
    reviewed_by uuid,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    approved_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    document_number text NOT NULL,
    title text NOT NULL,
    title_ar text,
    description text,
    type text NOT NULL,
    category text,
    department_id uuid,
    current_version integer DEFAULT 1,
    status text DEFAULT 'draft'::text,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    obsolete_at timestamp with time zone,
    category_id uuid,
    template_id uuid,
    CONSTRAINT documents_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'obsolete'::text, 'archived'::text]))),
    CONSTRAINT documents_type_check CHECK ((type = ANY (ARRAY['sop'::text, 'work_instruction'::text, 'manual'::text, 'form'::text, 'policy'::text, 'specification'::text, 'other'::text])))
);


--
-- Name: extensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extensions (
    id uuid NOT NULL,
    type text,
    settings jsonb,
    tenant_external_id text,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'department'::text,
    icon text,
    color text,
    parent_id uuid,
    path text,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    updated_at timestamp with time zone DEFAULT now(),
    permissions jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    stats jsonb DEFAULT '{}'::jsonb,
    name_en text,
    company_id uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    department_id uuid,
    modified_at timestamp with time zone DEFAULT now(),
    is_system boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    description text
);


--
-- Name: form_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_instances (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    template_id uuid,
    folder_id uuid,
    name text NOT NULL,
    batch_number text,
    batch_info jsonb DEFAULT '{}'::jsonb,
    data jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    submitted_at timestamp with time zone,
    submitted_by uuid,
    company_id uuid,
    form_data jsonb DEFAULT '{}'::jsonb,
    calculations jsonb DEFAULT '{}'::jsonb,
    signatures jsonb DEFAULT '{}'::jsonb,
    workflow jsonb DEFAULT '{}'::jsonb,
    template_version text DEFAULT '1.0'::text,
    report_folder_id uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    last_modified_at timestamp with time zone DEFAULT now(),
    department_id uuid,
    review_status text DEFAULT 'pending'::text,
    reviewer_id uuid,
    reviewer_name text,
    reviewed_at timestamp with time zone,
    review_notes text,
    is_locked boolean DEFAULT false,
    locked_at timestamp with time zone,
    locked_by uuid,
    rejection_count integer DEFAULT 0,
    last_rejection_reason text,
    workflow_history jsonb DEFAULT '[]'::jsonb,
    unified_folder_id uuid,
    is_shared boolean DEFAULT false,
    share_source_department_id uuid,
    created_by uuid,
    CONSTRAINT form_instances_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT form_instances_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text, 'pending'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN form_instances.review_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.review_status IS 'Review workflow status: pending, under_review, approved, rejected';


--
-- Name: COLUMN form_instances.is_locked; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.is_locked IS 'Whether the report is locked for editing. True after submission.';


--
-- Name: COLUMN form_instances.workflow_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.workflow_history IS 'JSON array of workflow state transitions for audit purposes';


--
-- Name: COLUMN form_instances.unified_folder_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.unified_folder_id IS 'Reference to the unified folder containing this instance';


--
-- Name: COLUMN form_instances.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.is_shared IS 'Indicates if this instance is shared from another department';


--
-- Name: COLUMN form_instances.share_source_department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.share_source_department_id IS 'Department that shared this instance';


--
-- Name: form_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    name_en text,
    folder_id uuid,
    table_type text DEFAULT 'samples'::text,
    document_control jsonb DEFAULT '{}'::jsonb,
    batch_config jsonb DEFAULT '{}'::jsonb,
    custom_variables jsonb DEFAULT '{}'::jsonb,
    sections jsonb DEFAULT '{}'::jsonb,
    quality_criteria jsonb DEFAULT '[]'::jsonb,
    signatures jsonb DEFAULT '[]'::jsonb,
    important_notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'draft'::text,
    type text DEFAULT 'form'::text,
    template_type_config jsonb DEFAULT '{}'::jsonb,
    custom_properties jsonb DEFAULT '{}'::jsonb,
    basic_info jsonb DEFAULT '{}'::jsonb,
    batch_configuration jsonb DEFAULT '{}'::jsonb,
    notes text,
    recipe jsonb DEFAULT '[]'::jsonb,
    company_id uuid,
    template_folder_id uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    last_modified_at timestamp with time zone DEFAULT now(),
    department_id uuid,
    unified_folder_id uuid,
    is_shared boolean DEFAULT false,
    share_source_department_id uuid,
    CONSTRAINT form_templates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'deprecated'::text, 'archived'::text, 'published'::text, 'inactive'::text])))
);


--
-- Name: COLUMN form_templates.unified_folder_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_templates.unified_folder_id IS 'Reference to the unified folder containing this template';


--
-- Name: COLUMN form_templates.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_templates.is_shared IS 'Indicates if this template is shared from another department';


--
-- Name: COLUMN form_templates.share_source_department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_templates.share_source_department_id IS 'Department that shared this template';


--
-- Name: inspection_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspection_criteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text,
    name text NOT NULL,
    name_en text,
    test_type text NOT NULL,
    default_parameters jsonb DEFAULT '[]'::jsonb,
    description text,
    is_active boolean DEFAULT true,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_title_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_title_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_title_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_titles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_en text,
    code text,
    department_id uuid,
    default_role_id uuid,
    description text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_equipment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text,
    name text NOT NULL,
    name_ar text,
    description text,
    location text,
    manufacturer text,
    model text,
    serial_number text,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: TABLE lab_equipment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lab_equipment IS 'Laboratory equipment registry';


--
-- Name: lab_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_samples (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sample_number text NOT NULL,
    sample_type text NOT NULL,
    source_id text,
    source_name text NOT NULL,
    collected_by text NOT NULL,
    collected_at timestamp with time zone NOT NULL,
    quantity text,
    unit text,
    storage_condition text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- Name: lab_test_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    icon text DEFAULT 'Flask'::text,
    color text DEFAULT '#3B82F6'::text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: lab_test_equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_equipment (
    test_config_id uuid NOT NULL,
    equipment_id uuid NOT NULL,
    is_required boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: TABLE lab_test_equipment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lab_test_equipment IS 'Links equipment to lab test configurations';


--
-- Name: lab_test_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_config_id uuid NOT NULL,
    field_key text NOT NULL,
    label text NOT NULL,
    label_ar text NOT NULL,
    field_type text NOT NULL,
    field_options jsonb DEFAULT '{}'::jsonb,
    display_order integer DEFAULT 0,
    is_required boolean DEFAULT false,
    default_value text,
    is_evaluable boolean DEFAULT false,
    spec_min_value numeric(10,4),
    spec_max_value numeric(10,4),
    spec_target_value numeric(10,4),
    spec_unit text,
    spec_tolerance numeric(10,4),
    spec_evaluation_mode text DEFAULT 'range'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_test_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_number text NOT NULL,
    test_config_id uuid NOT NULL,
    schedule_id uuid,
    status text DEFAULT 'pending'::text,
    linked_batch_id uuid,
    linked_product_id uuid,
    linked_work_order_id uuid,
    linked_material_receipt_id uuid,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    performed_by uuid,
    performed_by_name text,
    approved_by uuid,
    approved_by_name text,
    field_values jsonb DEFAULT '{}'::jsonb,
    evaluation_result text,
    failed_fields text[],
    notes text,
    approval_notes text,
    rejection_reason text,
    attachments jsonb DEFAULT '[]'::jsonb,
    company_id uuid NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    batch_number text
);


--
-- Name: lab_test_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_config_id uuid NOT NULL,
    schedule_type text NOT NULL,
    frequency_value integer,
    frequency_unit text,
    start_time time without time zone,
    end_time time without time zone,
    days_of_week integer[],
    linked_batch_id uuid,
    linked_product_id uuid,
    is_active boolean DEFAULT true,
    paused_at timestamp with time zone,
    paused_reason text,
    paused_by uuid,
    resumed_at timestamp with time zone,
    assigned_department_id uuid,
    assigned_user_ids uuid[] DEFAULT '{}'::uuid[],
    notify_before_minutes integer DEFAULT 15,
    auto_create_run boolean DEFAULT false,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: lab_test_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    test_config_ids uuid[] NOT NULL,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: lab_test_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    icon text DEFAULT 'TestTube'::text,
    color text DEFAULT '#6B7280'::text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: lab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_tests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    test_number text NOT NULL,
    test_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    sample_id uuid,
    sample_data jsonb,
    parameters jsonb DEFAULT '[]'::jsonb,
    requested_by text NOT NULL,
    requested_by_name text,
    requested_at timestamp with time zone DEFAULT now(),
    assigned_to text,
    assigned_to_name text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    approved_by text,
    approved_by_name text,
    approved_at timestamp with time zone,
    approval_notes text,
    priority text DEFAULT 'normal'::text,
    due_date timestamp with time zone,
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    department_id uuid,
    CONSTRAINT lab_tests_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text, 'medium'::text, 'critical'::text]))),
    CONSTRAINT lab_tests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text, 'draft'::text, 'submitted'::text, 'testing'::text])))
);


--
-- Name: lab_tests_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_tests_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_type_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    method text,
    method_standard text,
    equipment_required text[],
    estimated_duration_minutes integer,
    requires_approval boolean DEFAULT true,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: TABLE lab_tests_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lab_tests_config IS 'Individual test configurations: ph_test, brix_test, moisture_test, color_test';


--
-- Name: lab_v2_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size integer,
    description text,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT lab_v2_attachments_entity_type_check CHECK ((entity_type = ANY (ARRAY['device_calibration'::text, 'test_run'::text, 'test_definition'::text, 'chemical'::text])))
);


--
-- Name: lab_v2_chemical_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_chemical_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chemical_id uuid NOT NULL,
    receipt_number text NOT NULL,
    lot_number text,
    batch_number text,
    quantity numeric(10,2) NOT NULL,
    unit text NOT NULL,
    received_date date NOT NULL,
    expiry_date date,
    supplier_source text,
    type text DEFAULT 'reagent_for_test'::text,
    remaining_quantity numeric(10,2),
    status text DEFAULT 'available'::text,
    notes text,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT lab_v2_chemical_receipts_status_check CHECK ((status = ANY (ARRAY['available'::text, 'depleted'::text, 'expired'::text, 'disposed'::text]))),
    CONSTRAINT lab_v2_chemical_receipts_type_check CHECK ((type = ANY (ARRAY['raw_material'::text, 'reagent_for_test'::text, 'other'::text])))
);


--
-- Name: lab_v2_chemicals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_chemicals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text,
    supplier text,
    grade text,
    cas_number text,
    storage_conditions text,
    hazard_notes text,
    unit text DEFAULT 'kg'::text,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: lab_v2_device_calibrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_device_calibrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid NOT NULL,
    calibration_date date NOT NULL,
    next_due_date date NOT NULL,
    result text NOT NULL,
    performed_by text,
    certificate_number text,
    notes text,
    attachment_ids uuid[],
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT lab_v2_device_calibrations_result_check CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'conditional'::text])))
);


--
-- Name: lab_v2_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text,
    manufacturer text,
    model text,
    serial_number text,
    location text,
    status text DEFAULT 'active'::text,
    calibration_due_date date,
    calibration_interval_days integer DEFAULT 365,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    notes text,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT lab_v2_devices_status_check CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'out_of_service'::text])))
);


--
-- Name: lab_v2_run_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_run_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    chemical_receipt_id uuid NOT NULL,
    quantity_used numeric(10,4),
    unit text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_v2_run_measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_run_measurements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    measurement_no integer NOT NULL,
    measured_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    evaluation_result text,
    failed_params text[],
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT lab_v2_run_measurements_evaluation_result_check CHECK ((evaluation_result = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'na'::text])))
);


--
-- Name: lab_v2_run_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_run_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    parameter_id uuid NOT NULL,
    param_key text NOT NULL,
    value text,
    numeric_value numeric(12,4),
    evaluation_result text,
    out_of_spec boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    measurement_id uuid NOT NULL,
    CONSTRAINT lab_v2_run_values_evaluation_result_check CHECK ((evaluation_result = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'na'::text])))
);


--
-- Name: lab_v2_test_acceptance_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_test_acceptance_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    parameter_id uuid,
    rule_type text NOT NULL,
    spec_min numeric(12,4),
    spec_max numeric(12,4),
    spec_unit text,
    allowed_values jsonb,
    custom_note text,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT lab_v2_test_acceptance_rules_rule_type_check CHECK ((rule_type = ANY (ARRAY['numeric_range'::text, 'allowed_values'::text, 'multi_select'::text, 'custom'::text])))
);


--
-- Name: lab_v2_test_device_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_test_device_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    device_id uuid NOT NULL,
    is_default boolean DEFAULT false,
    setup_notes text,
    calibration_targets jsonb,
    device_specific_params jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: lab_v2_test_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_test_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    param_key text NOT NULL,
    label text NOT NULL,
    label_ar text,
    data_type text NOT NULL,
    is_required boolean DEFAULT false,
    display_order integer DEFAULT 0,
    unit text,
    min_value numeric(12,4),
    max_value numeric(12,4),
    allowed_values jsonb,
    default_value text,
    help_text text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lab_v2_test_parameters_data_type_check CHECK ((data_type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'time'::text, 'dropdown'::text, 'multi_select'::text])))
);


--
-- Name: lab_v2_test_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_test_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_number text NOT NULL,
    test_id uuid NOT NULL,
    batch_id uuid,
    product_id uuid,
    device_id uuid,
    status text DEFAULT 'draft'::text,
    operator_id uuid,
    operator_name text,
    approver_id uuid,
    approver_name text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    evaluation_result text,
    failed_params text[],
    test_snapshot jsonb,
    params_snapshot jsonb,
    rules_snapshot jsonb,
    notes text,
    approval_notes text,
    rejection_reason text,
    company_id uuid NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT lab_v2_test_runs_evaluation_result_check CHECK ((evaluation_result = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'na'::text]))),
    CONSTRAINT lab_v2_test_runs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'completed'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: lab_v2_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text,
    category text,
    description text,
    method_description text,
    method_standard text,
    sop_document_id uuid,
    scope text DEFAULT 'global'::text,
    linked_company_id uuid,
    linked_product_id uuid,
    estimated_duration_minutes integer,
    requires_approval boolean DEFAULT true,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT lab_v2_tests_scope_check CHECK ((scope = ANY (ARRAY['global'::text, 'company'::text, 'product'::text])))
);


--
-- Name: loaded_pallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loaded_pallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loading_operation_id uuid NOT NULL,
    pallet_id uuid NOT NULL,
    cartons_loaded integer NOT NULL,
    is_partial_load boolean DEFAULT false,
    load_sequence integer,
    loaded_at timestamp with time zone DEFAULT now(),
    is_confirmed boolean DEFAULT false,
    confirmed_at timestamp with time zone,
    CONSTRAINT loaded_pallets_cartons_loaded_check CHECK ((cartons_loaded > 0))
);


--
-- Name: loading_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loading_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    company_id uuid NOT NULL,
    loading_strategy text,
    planned_pallets integer,
    planned_cartons integer,
    actual_pallets integer DEFAULT 0,
    actual_cartons integer DEFAULT 0,
    status text DEFAULT 'planned'::text,
    planned_date date DEFAULT CURRENT_DATE,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_by uuid,
    loaded_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT loading_operations_loading_strategy_check CHECK ((loading_strategy = ANY (ARRAY['fifo'::text, 'fefo'::text, 'random'::text, 'specific'::text]))),
    CONSTRAINT loading_operations_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: material_receiving; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_receiving (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    receiving_number text NOT NULL,
    material_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    material_name text NOT NULL,
    material_code text,
    batch_number text NOT NULL,
    lot_number text,
    supplier_id uuid,
    supplier_name text NOT NULL,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    packaging_type text,
    production_date date,
    expiry_date date,
    received_at timestamp with time zone DEFAULT now(),
    received_by text NOT NULL,
    received_by_name text,
    delivery_note_number text,
    invoice_number text,
    certificate_of_analysis text,
    inspection_required boolean DEFAULT true,
    inspected_by text,
    inspected_at timestamp with time zone,
    inspection_notes text,
    lab_test_id uuid,
    lab_test_status text,
    storage_location text,
    storage_condition text,
    accepted_quantity numeric,
    rejected_quantity numeric,
    rejection_reason text,
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    raw_material_id uuid,
    test_requirements_snapshot jsonb DEFAULT '[]'::jsonb,
    supplier_approval_snapshot jsonb DEFAULT '{}'::jsonb,
    vehicle_inspection jsonb,
    initial_test_results jsonb,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    CONSTRAINT material_receiving_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'inspecting'::text, 'accepted'::text, 'rejected'::text, 'partial'::text, 'cancelled'::text, 'in_progress'::text, 'completed'::text, 'on_hold'::text, 'approved'::text, 'draft'::text, 'received'::text, 'stored'::text, 'released'::text, 'in_testing'::text])))
);


--
-- Name: COLUMN material_receiving.vehicle_inspection; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.material_receiving.vehicle_inspection IS 'فحص سيارة النقل - تخزين بيانات فحص السيارة كـ JSON';


--
-- Name: COLUMN material_receiving.initial_test_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.material_receiving.initial_test_results IS 'نتائج الفحص الأولية عند الاستلام';


--
-- Name: meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meta (
    id text NOT NULL,
    sequences jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: module_data_visibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_data_visibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_code text NOT NULL,
    department_id uuid,
    visibility_scope text DEFAULT 'private'::text NOT NULL,
    cross_dept_read_only boolean DEFAULT true,
    shared_with_departments uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT module_data_visibility_visibility_scope_check CHECK ((visibility_scope = ANY (ARRAY['private'::text, 'shared'::text, 'all'::text])))
);


--
-- Name: TABLE module_data_visibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.module_data_visibility IS 'DEPRECATED 2026-01-01: Use visibility_departments in department_module_access instead. Backup: _backup_module_data_visibility_20260101. Will be dropped in Phase 3.';


--
-- Name: module_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_code text NOT NULL,
    stage_code text NOT NULL,
    stage_name text NOT NULL,
    stage_name_ar text,
    description text,
    description_ar text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE module_stages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.module_stages IS 'Defines stages within each module for granular permission control';


--
-- Name: monitoring_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitoring_records (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    control_point_id uuid,
    value numeric,
    unit text,
    status text DEFAULT 'ok'::text,
    deviation boolean DEFAULT false,
    notes text,
    recorded_by text,
    recorded_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- Name: ncr_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    action_number integer NOT NULL,
    action_type text NOT NULL,
    title text NOT NULL,
    description text,
    expected_outcome text,
    assigned_to_id uuid,
    assigned_to_name text,
    assigned_department_id uuid,
    assigned_department_name text,
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    status text DEFAULT 'planned'::text,
    priority text DEFAULT 'medium'::text,
    progress_percentage integer DEFAULT 0,
    progress_notes jsonb DEFAULT '[]'::jsonb,
    verification_required boolean DEFAULT true,
    verified_by_id uuid,
    verified_by_name text,
    verified_at timestamp with time zone,
    verification_result text,
    verification_notes text,
    cost_estimate numeric(12,2),
    actual_cost numeric(12,2),
    attachments jsonb DEFAULT '[]'::jsonb,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_actions_action_type_check CHECK ((action_type = ANY (ARRAY['immediate'::text, 'corrective'::text, 'preventive'::text]))),
    CONSTRAINT ncr_actions_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ncr_actions_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
    CONSTRAINT ncr_actions_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'verified'::text, 'cancelled'::text]))),
    CONSTRAINT ncr_actions_verification_result_check CHECK ((verification_result = ANY (ARRAY['effective'::text, 'partially_effective'::text, 'not_effective'::text])))
);


--
-- Name: ncr_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    filename text NOT NULL,
    original_filename text,
    file_type text,
    mime_type text,
    file_size integer,
    file_url text NOT NULL,
    thumbnail_url text,
    attachment_category text DEFAULT 'evidence'::text,
    description text,
    is_primary boolean DEFAULT false,
    location jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    uploaded_by_id uuid,
    uploaded_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deleted_by_id uuid,
    CONSTRAINT ncr_attachments_attachment_category_check CHECK ((attachment_category = ANY (ARRAY['evidence'::text, 'before'::text, 'after'::text, 'document'::text, 'analysis'::text, 'certificate'::text, 'other'::text]))),
    CONSTRAINT ncr_attachments_file_type_check CHECK ((file_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'other'::text])))
);


--
-- Name: ncr_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    action text NOT NULL,
    action_category text,
    action_details jsonb,
    previous_values jsonb,
    new_values jsonb,
    performed_by_id uuid,
    performed_by_name text,
    performed_by_department text,
    performed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    CONSTRAINT ncr_audit_log_action_category_check CHECK ((action_category = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'status_change'::text, 'stage_change'::text, 'assignment'::text, 'approval'::text, 'rejection'::text, 'escalation'::text, 'transfer'::text, 'comment'::text, 'attachment'::text, 'cost'::text, 'other'::text])))
);


--
-- Name: ncr_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    description text,
    icon text,
    color text DEFAULT '#3B82F6'::text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    requires_capa boolean DEFAULT true,
    default_severity_id uuid,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ncr_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    ncr_id uuid,
    parent_id uuid,
    content text NOT NULL,
    author_id text,
    author_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    entity_id uuid NOT NULL,
    entity_type text DEFAULT 'ncr'::text NOT NULL,
    author_avatar text,
    edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    reactions jsonb DEFAULT '[]'::jsonb,
    attachments text[] DEFAULT '{}'::text[]
);


--
-- Name: ncr_consensus_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_consensus_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    response_deadline_hours integer DEFAULT 48,
    reminder_after_hours integer DEFAULT 24,
    auto_escalate_after_hours integer DEFAULT 72,
    max_proposal_rounds integer DEFAULT 3,
    max_transfers integer DEFAULT 5,
    default_mediator_role text DEFAULT 'quality_manager'::text,
    final_arbiter_role text DEFAULT 'general_manager'::text,
    require_unanimous boolean DEFAULT true,
    minimum_approval_percentage integer DEFAULT 100,
    on_no_response text DEFAULT 'auto_escalate'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_consensus_settings_on_no_response_check CHECK ((on_no_response = ANY (ARRAY['auto_approve'::text, 'auto_escalate'::text, 'reminder_only'::text])))
);


--
-- Name: ncr_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    company_id uuid NOT NULL,
    conversation_type text DEFAULT 'general'::text,
    participants jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'active'::text,
    is_pinned boolean DEFAULT false,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_message_at timestamp with time zone,
    message_count integer DEFAULT 0,
    CONSTRAINT ncr_conversations_conversation_type_check CHECK ((conversation_type = ANY (ARRAY['general'::text, 'investigation'::text, 'root_cause'::text, 'action_plan'::text, 'dispute'::text, 'escalation'::text]))),
    CONSTRAINT ncr_conversations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text, 'closed'::text, 'escalated'::text])))
);


--
-- Name: ncr_cost_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_cost_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    material_cost numeric(12,2) DEFAULT 0,
    material_details jsonb DEFAULT '[]'::jsonb,
    rework_cost numeric(12,2) DEFAULT 0,
    rework_hours numeric(8,2) DEFAULT 0,
    rework_hourly_rate numeric(8,2),
    downtime_cost numeric(12,2) DEFAULT 0,
    downtime_hours numeric(8,2) DEFAULT 0,
    downtime_hourly_rate numeric(8,2),
    labor_cost numeric(12,2) DEFAULT 0,
    labor_hours numeric(8,2) DEFAULT 0,
    labor_hourly_rate numeric(8,2),
    inspection_cost numeric(12,2) DEFAULT 0,
    shipping_cost numeric(12,2) DEFAULT 0,
    other_costs jsonb DEFAULT '[]'::jsonb,
    other_costs_total numeric(12,2) DEFAULT 0,
    total_cost numeric(12,2) GENERATED ALWAYS AS (((((((COALESCE(material_cost, (0)::numeric) + COALESCE(rework_cost, (0)::numeric)) + COALESCE(downtime_cost, (0)::numeric)) + COALESCE(labor_cost, (0)::numeric)) + COALESCE(inspection_cost, (0)::numeric)) + COALESCE(shipping_cost, (0)::numeric)) + COALESCE(other_costs_total, (0)::numeric))) STORED,
    calculated_by_id uuid,
    calculated_at timestamp with time zone DEFAULT now(),
    approved_by_id uuid,
    approved_at timestamp with time zone,
    is_approved boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ncr_defect_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_defect_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    category_id uuid,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    description text,
    inspection_method text,
    acceptance_criteria jsonb,
    rejection_criteria jsonb,
    is_critical boolean DEFAULT false,
    requires_quarantine boolean DEFAULT false,
    default_severity_id uuid,
    images text[],
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ncr_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    party_a_department_id uuid,
    party_a_department_name text,
    party_a_position text,
    party_a_evidence jsonb DEFAULT '[]'::jsonb,
    party_b_department_id uuid,
    party_b_department_name text,
    party_b_position text,
    party_b_evidence jsonb DEFAULT '[]'::jsonb,
    dispute_type text,
    dispute_description text,
    status text DEFAULT 'open'::text,
    mediator_id uuid,
    mediator_department_id uuid,
    mediation_started_at timestamp with time zone,
    mediation_notes text,
    resolution_type text,
    resolution_details text,
    final_decision jsonb,
    party_a_accepted boolean,
    party_a_accepted_at timestamp with time zone,
    party_b_accepted boolean,
    party_b_accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    escalated_at timestamp with time zone,
    CONSTRAINT ncr_disputes_dispute_type_check CHECK ((dispute_type = ANY (ARRAY['root_cause'::text, 'responsibility'::text, 'solution'::text, 'timeline'::text, 'classification'::text]))),
    CONSTRAINT ncr_disputes_resolution_type_check CHECK ((resolution_type = ANY (ARRAY['mutual_agreement'::text, 'mediator_decision'::text, 'management_decision'::text, 'split_responsibility'::text]))),
    CONSTRAINT ncr_disputes_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_mediation'::text, 'resolved'::text, 'escalated'::text, 'arbitrated'::text])))
);


--
-- Name: ncr_document_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_document_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    document_code text NOT NULL,
    document_title text,
    version_number integer DEFAULT 1,
    revision_number integer DEFAULT 0,
    version_string text GENERATED ALWAYS AS (((('V'::text || version_number) || '.'::text) || revision_number)) STORED,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    effective_date date,
    revision_date date,
    next_review_date date,
    expiry_date date,
    prepared_by_id uuid,
    prepared_by_name text,
    prepared_by_title text,
    prepared_at timestamp with time zone,
    reviewed_by_id uuid,
    reviewed_by_name text,
    reviewed_by_title text,
    reviewed_at timestamp with time zone,
    approved_by_id uuid,
    approved_by_name text,
    approved_by_title text,
    approved_at timestamp with time zone,
    document_status text DEFAULT 'draft'::text,
    change_history jsonb DEFAULT '[]'::jsonb,
    confidentiality text DEFAULT 'internal'::text,
    distribution_list uuid[],
    print_count integer DEFAULT 0,
    last_printed_at timestamp with time zone,
    last_printed_by_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_document_metadata_confidentiality_check CHECK ((confidentiality = ANY (ARRAY['public'::text, 'internal'::text, 'confidential'::text, 'restricted'::text]))),
    CONSTRAINT ncr_document_metadata_document_status_check CHECK ((document_status = ANY (ARRAY['draft'::text, 'under_review'::text, 'approved'::text, 'obsolete'::text, 'superseded'::text])))
);


--
-- Name: ncr_escalation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_escalation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    severity_id uuid,
    escalation_levels jsonb DEFAULT '[{"level": 1, "hours_after": 24, "notification": "تذكير بالحالة المعلقة", "escalate_to_role": "supervisor"}, {"level": 2, "hours_after": 48, "notification": "تصعيد الحالة", "escalate_to_role": "manager"}, {"level": 3, "hours_after": 72, "notification": "تصعيد عاجل", "escalate_to_role": "quality_manager"}]'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ncr_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    ncr_id uuid NOT NULL,
    sender_id uuid,
    sender_name text,
    sender_department_id uuid,
    sender_department_name text,
    message_type text DEFAULT 'text'::text,
    content text,
    rich_content jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    mentions jsonb DEFAULT '[]'::jsonb,
    read_by jsonb DEFAULT '[]'::jsonb,
    reply_to_id uuid,
    thread_id uuid,
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_messages_message_type_check CHECK ((message_type = ANY (ARRAY['text'::text, 'attachment'::text, 'proposal'::text, 'decision'::text, 'system'::text, 'transfer_request'::text, 'approval_request'::text])))
);


--
-- Name: ncr_notification_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_notification_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name text NOT NULL,
    description text,
    trigger_conditions jsonb DEFAULT '{"on_create": false, "on_comment": false, "on_overdue": false, "on_severity": [], "on_assignment": false, "on_escalation": false, "on_stage_change": [], "overdue_threshold_days": 7}'::jsonb NOT NULL,
    recipients jsonb DEFAULT '{"roles": [], "users": [], "departments": [], "notify_creator": false, "notify_assignee": true, "notify_department_head": false}'::jsonb NOT NULL,
    channels jsonb DEFAULT '{"sms": false, "push": false, "email": true, "in_app": true}'::jsonb,
    notification_template text,
    notification_title_template text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ncr_quarantine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_quarantine (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    item_type text NOT NULL,
    item_id uuid,
    item_name text NOT NULL,
    item_code text,
    batch_number text,
    lot_number text,
    quantity numeric(12,3) NOT NULL,
    unit text NOT NULL,
    unit_value numeric(12,2),
    total_value numeric(12,2),
    quarantine_location_id uuid,
    quarantine_location_name text,
    original_location_name text,
    status text DEFAULT 'quarantined'::text,
    quarantine_date timestamp with time zone DEFAULT now(),
    quarantine_by_id uuid,
    quarantine_by_name text,
    quarantine_reason text,
    disposition text,
    disposition_reason text,
    disposition_date timestamp with time zone,
    disposition_by_id uuid,
    disposition_by_name text,
    disposition_approved_by_id uuid,
    disposition_approved_by_name text,
    disposition_approved_at timestamp with time zone,
    release_date timestamp with time zone,
    release_by_id uuid,
    release_by_name text,
    release_notes text,
    release_destination text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_quarantine_disposition_check CHECK ((disposition = ANY (ARRAY['use_as_is'::text, 'rework'::text, 'regrade'::text, 'return_supplier'::text, 'scrap'::text, 'donate'::text, 'other'::text]))),
    CONSTRAINT ncr_quarantine_item_type_check CHECK ((item_type = ANY (ARRAY['raw_material'::text, 'wip'::text, 'finished_product'::text, 'packaging'::text]))),
    CONSTRAINT ncr_quarantine_status_check CHECK ((status = ANY (ARRAY['quarantined'::text, 'under_review'::text, 'released'::text, 'rejected'::text, 'disposed'::text, 'reworked'::text, 'returned'::text])))
);


--
-- Name: ncr_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_reports (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    ncr_number text,
    title text NOT NULL,
    description text,
    category text,
    severity text DEFAULT 'minor'::text,
    status text DEFAULT 'open'::text,
    source text,
    department text,
    product_name text,
    batch_number text,
    quantity_affected numeric,
    root_cause text,
    corrective_action text,
    preventive_action text,
    assigned_to text,
    due_date timestamp with time zone,
    closed_at timestamp with time zone,
    closed_by text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    updated_at timestamp with time zone DEFAULT now(),
    source_department_id uuid,
    target_department_id uuid,
    assigned_to_id uuid,
    created_by_id uuid,
    number text,
    date date,
    shift text,
    line_or_area text,
    reserved_qty text,
    reserved_unit text,
    standard_defect text,
    custom_type text,
    discovered_by text,
    immediate_action text,
    company_id uuid NOT NULL,
    current_stage text DEFAULT 'initial_report'::text,
    completed_stages jsonb DEFAULT '[]'::jsonb,
    stage_history jsonb DEFAULT '[]'::jsonb,
    root_cause_approval jsonb,
    actions jsonb DEFAULT '[]'::jsonb,
    holds jsonb DEFAULT '[]'::jsonb,
    verification jsonb,
    related_lab_test_id uuid,
    related_lab_test_number text,
    related_material_receiving_id uuid,
    related_material_name text,
    related_batch_number text,
    related_supplier_id uuid,
    related_supplier_name text,
    auto_generated_from_lab boolean DEFAULT false,
    version integer DEFAULT 1 NOT NULL,
    defect_id uuid,
    defect_type text,
    occurrence smallint,
    detection smallint,
    rpn integer,
    risk_band text,
    CONSTRAINT ncr_reports_defect_type_check CHECK ((defect_type = ANY (ARRAY['raw_material'::text, 'product'::text, 'process'::text, 'other'::text]))),
    CONSTRAINT ncr_reports_severity_check CHECK ((severity = ANY (ARRAY['minor'::text, 'major'::text, 'critical'::text, 'low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT ncr_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'pending_review'::text, 'resolved'::text, 'closed'::text, 'cancelled'::text, 'draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: ncr_reports_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_reports_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_number text NOT NULL,
    company_id uuid NOT NULL,
    category_id uuid,
    subcategory_id uuid,
    defect_type_id uuid,
    source_type text DEFAULT 'internal'::text,
    discovery_context jsonb DEFAULT '{}'::jsonb,
    affected_product jsonb DEFAULT '{}'::jsonb,
    title text NOT NULL,
    description text,
    deviation_from_spec text,
    specification_reference text,
    severity_id uuid,
    risk_assessment jsonb DEFAULT '{}'::jsonb,
    current_stage_id uuid,
    status text DEFAULT 'draft'::text,
    is_on_hold boolean DEFAULT false,
    hold_reason text,
    created_by_id uuid,
    discovered_by_id uuid,
    assigned_to_id uuid,
    responsible_department_id uuid,
    source_department_id uuid,
    total_cost numeric(12,2) DEFAULT 0,
    cost_breakdown jsonb DEFAULT '{}'::jsonb,
    supplier_id uuid,
    related_ncrs uuid[],
    linked_capa_id uuid,
    source_lab_test_id uuid,
    source_receiving_id uuid,
    source_audit_id uuid,
    auto_generated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    target_closure_date date,
    actual_closure_date timestamp with time zone,
    closed_by_id uuid,
    version integer DEFAULT 1,
    CONSTRAINT ncr_reports_v2_source_type_check CHECK ((source_type = ANY (ARRAY['internal'::text, 'external'::text, 'supplier'::text, 'customer'::text, 'audit'::text, 'lab'::text]))),
    CONSTRAINT ncr_reports_v2_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'open'::text, 'in_progress'::text, 'pending_review'::text, 'closed'::text, 'cancelled'::text])))
);


--
-- Name: ncr_responsibility_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_responsibility_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    assignment_type text NOT NULL,
    original_department_id uuid,
    original_department_name text,
    responsibility_distribution jsonb NOT NULL,
    reassignment_reason text,
    reassignment_evidence jsonb DEFAULT '[]'::jsonb,
    investigation_summary text,
    assigned_by_id uuid,
    assigned_at timestamp with time zone DEFAULT now(),
    department_acknowledgments jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'proposed'::text,
    finalized_at timestamp with time zone,
    finalized_by_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_responsibility_assignments_assignment_type_check CHECK ((assignment_type = ANY (ARRAY['sole'::text, 'shared'::text, 'transferred'::text, 'cascaded'::text]))),
    CONSTRAINT ncr_responsibility_assignments_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'pending_ack'::text, 'accepted'::text, 'disputed'::text, 'finalized'::text])))
);


--
-- Name: ncr_root_cause_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_root_cause_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    analysis_method text,
    five_whys jsonb DEFAULT '{"why1": {"answer": "", "question": ""}, "why2": {"answer": "", "question": ""}, "why3": {"answer": "", "question": ""}, "why4": {"answer": "", "question": ""}, "why5": {"answer": "", "question": ""}, "root_cause": ""}'::jsonb,
    fishbone jsonb DEFAULT '{"man": [], "method": [], "machine": [], "material": [], "environment": [], "measurement": [], "root_causes": []}'::jsonb,
    fmea_analysis jsonb DEFAULT '{"rpn": 1, "severity": 1, "detection": 1, "occurrence": 1, "current_controls": "", "potential_causes": "", "potential_effects": "", "recommended_actions": ""}'::jsonb,
    identified_root_cause text,
    contributing_factors text[],
    analysis_status text DEFAULT 'draft'::text,
    analyzed_by_id uuid,
    analyzed_by_name text,
    analyzed_at timestamp with time zone,
    reviewed_by_id uuid,
    reviewed_by_name text,
    reviewed_at timestamp with time zone,
    approved_by_id uuid,
    approved_by_name text,
    approved_at timestamp with time zone,
    approval_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_root_cause_analysis_analysis_method_check CHECK ((analysis_method = ANY (ARRAY['5_whys'::text, 'fishbone'::text, 'fmea'::text, 'pareto'::text, 'fault_tree'::text, 'other'::text, 'combined'::text]))),
    CONSTRAINT ncr_root_cause_analysis_analysis_status_check CHECK ((analysis_status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'pending_consensus'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: ncr_root_cause_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_root_cause_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    proposal_number integer NOT NULL,
    proposed_root_cause text NOT NULL,
    proposed_solution text,
    supporting_evidence jsonb DEFAULT '[]'::jsonb,
    analysis_method text,
    proposed_by_id uuid,
    proposed_by_department_id uuid,
    proposed_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    required_approvers jsonb DEFAULT '[]'::jsonb,
    responses jsonb DEFAULT '[]'::jsonb,
    final_decision text,
    final_decision_at timestamp with time zone,
    final_decision_by_id uuid,
    final_decision_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_root_cause_proposals_final_decision_check CHECK ((final_decision = ANY (ARRAY['accepted'::text, 'rejected'::text, 'escalated'::text]))),
    CONSTRAINT ncr_root_cause_proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'counter_proposed'::text, 'escalated'::text, 'withdrawn'::text])))
);


--
-- Name: ncr_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    numbering jsonb DEFAULT '{"prefix": "NCR", "separator": "-", "include_year": true, "include_month": false, "reset_sequence": "yearly", "sequence_digits": 4, "current_sequence": 0, "include_department": false}'::jsonb,
    default_timelines jsonb DEFAULT '{"verification_days": 14, "investigation_days": 7, "corrective_action_days": 30, "initial_response_hours": 24}'::jsonb,
    auto_escalation jsonb DEFAULT '{"enabled": true, "notify_before_days": [3, 1], "escalate_after_days": 7}'::jsonb,
    closure_settings jsonb DEFAULT '{"approver_roles": ["quality_manager"], "require_approval": true, "require_all_actions_completed": true, "require_effectiveness_verification": true}'::jsonb,
    integrations jsonb DEFAULT '{"link_to_capa_system": true, "auto_create_from_audit_finding": true, "auto_create_from_lab_rejection": true, "auto_create_from_receiving_rejection": true}'::jsonb,
    attachment_settings jsonb DEFAULT '{"allowed_types": ["image/*", "video/*", "application/pdf"], "max_file_size_mb": 10, "auto_compress_images": true, "require_evidence_photo": false, "max_attachments_per_ncr": 50}'::jsonb,
    print_settings jsonb DEFAULT '{"sections": {"cost": true, "details": true, "basic_info": true, "root_cause": true, "signatures": true, "effectiveness": true, "immediate_action": true, "corrective_actions": true}, "page_size": "A4", "show_logo": true, "orientation": "portrait", "show_signatures": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ncr_severity_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_severity_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    description text,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    icon text,
    risk_weight integer DEFAULT 5,
    requires_immediate_action boolean DEFAULT false,
    requires_management_notification boolean DEFAULT false,
    max_resolution_days integer DEFAULT 30,
    escalation_hours integer DEFAULT 72,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_severity_levels_risk_weight_check CHECK (((risk_weight >= 1) AND (risk_weight <= 10)))
);


--
-- Name: ncr_stage_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_stage_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_code text NOT NULL,
    department_id uuid,
    role_id uuid,
    allowed_actions text[] DEFAULT ARRAY['view'::text] NOT NULL,
    can_advance boolean DEFAULT false,
    can_return boolean DEFAULT false,
    is_active boolean DEFAULT true,
    CONSTRAINT check_dept_or_role CHECK ((((department_id IS NOT NULL) AND (role_id IS NULL)) OR ((department_id IS NULL) AND (role_id IS NOT NULL))))
);


--
-- Name: ncr_subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    category_id uuid,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    description text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ncr_supplier_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_supplier_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    supplier_id uuid NOT NULL,
    supplier_name text,
    material_id uuid,
    material_name text,
    material_code text,
    batch_number text,
    lot_number text,
    purchase_order_id uuid,
    purchase_order_number text,
    receiving_id uuid,
    receiving_date date,
    defect_description text,
    quantity_affected numeric(12,3),
    unit text,
    requested_action text,
    credit_amount numeric(12,2),
    notification_sent_at timestamp with time zone,
    notification_method text,
    notification_details text,
    supplier_contact_name text,
    supplier_contact_email text,
    supplier_response text,
    supplier_response_at timestamp with time zone,
    supplier_attachments jsonb DEFAULT '[]'::jsonb,
    resolution_status text DEFAULT 'pending'::text,
    resolution_details text,
    resolution_date timestamp with time zone,
    resolved_by_id uuid,
    affects_rating boolean DEFAULT true,
    rating_impact integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_supplier_reports_notification_method_check CHECK ((notification_method = ANY (ARRAY['email'::text, 'phone'::text, 'letter'::text, 'portal'::text]))),
    CONSTRAINT ncr_supplier_reports_rating_impact_check CHECK (((rating_impact >= 0) AND (rating_impact <= 100))),
    CONSTRAINT ncr_supplier_reports_requested_action_check CHECK ((requested_action = ANY (ARRAY['replace'::text, 'refund'::text, 'rework'::text, 'credit_note'::text, 'investigation'::text, 'none'::text]))),
    CONSTRAINT ncr_supplier_reports_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['pending'::text, 'notified'::text, 'in_progress'::text, 'resolved'::text, 'rejected'::text, 'escalated'::text])))
);


--
-- Name: ncr_transfer_chain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_transfer_chain (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    chain jsonb DEFAULT '[]'::jsonb,
    total_transfers integer DEFAULT 0,
    total_duration_hours numeric(10,2) DEFAULT 0,
    current_department_id uuid,
    loop_detected boolean DEFAULT false,
    max_transfers_reached boolean DEFAULT false,
    forced_escalation boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ncr_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    transfer_number integer NOT NULL,
    from_department_id uuid,
    from_department_name text,
    from_user_id uuid,
    to_department_id uuid,
    to_department_name text,
    to_user_id uuid,
    transfer_reason text,
    transfer_notes text,
    required_action text,
    status text DEFAULT 'pending'::text,
    accepted_at timestamp with time zone,
    accepted_by_id uuid,
    rejection_reason text,
    completed_at timestamp with time zone,
    completion_notes text,
    completion_result jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deadline timestamp with time zone,
    CONSTRAINT ncr_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'completed'::text, 'returned'::text]))),
    CONSTRAINT ncr_transfers_transfer_reason_check CHECK ((transfer_reason = ANY (ARRAY['needs_expertise'::text, 'shared_responsibility'::text, 'dispute_mediation'::text, 'escalation'::text, 'reassignment'::text, 'follow_up_required'::text])))
);


--
-- Name: ncr_workflow_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_workflow_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    stage_order integer NOT NULL,
    color text DEFAULT '#6B7280'::text,
    is_active boolean DEFAULT true,
    company_id uuid,
    name_en text,
    icon text,
    settings jsonb DEFAULT '{"can_skip": false, "auto_advance": false, "is_mandatory": true, "approval_type": "single", "required_fields": [], "max_duration_days": 7, "requires_approval": false, "required_attachments": []}'::jsonb,
    allowed_transitions uuid[],
    can_return_to uuid[],
    is_initial boolean DEFAULT false,
    is_final boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    in_app_enabled boolean DEFAULT true,
    category_settings jsonb DEFAULT '{"lab": {"push": true, "email": true, "enabled": true}, "ncr": {"push": true, "email": true, "enabled": true}, "task": {"push": true, "email": true, "enabled": true}, "alert": {"push": true, "email": true, "enabled": true}, "system": {"push": true, "email": false, "enabled": true}, "approval": {"push": true, "email": true, "enabled": true}}'::jsonb,
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
    quiet_hours_end time without time zone DEFAULT '07:00:00'::time without time zone,
    daily_digest_enabled boolean DEFAULT false,
    digest_time time without time zone DEFAULT '08:00:00'::time without time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE notification_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_preferences IS 'User preferences for notification delivery';


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text,
    title_template text NOT NULL,
    title_template_ar text,
    message_template text NOT NULL,
    message_template_ar text,
    type text DEFAULT 'info'::text NOT NULL,
    category text DEFAULT 'system'::text NOT NULL,
    default_action_url_template text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE notification_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_templates IS 'Templates for generating consistent notifications';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text,
    title text,
    message text,
    ncr_id uuid,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    title_ar text,
    message_ar text,
    category text DEFAULT 'system'::text,
    entity_type text,
    entity_id uuid,
    action_url text,
    read_at timestamp with time zone,
    expires_at timestamp with time zone,
    sender_id uuid,
    sender_name text
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'User notifications for workflow events and system alerts';


--
-- Name: pallet_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changes_summary text,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    ip_address text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: pallet_batch_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_batch_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pallet_id uuid NOT NULL,
    source_batch_id uuid NOT NULL,
    cartons_from_batch integer NOT NULL,
    is_primary boolean DEFAULT true,
    added_at timestamp with time zone DEFAULT now(),
    notes text,
    CONSTRAINT pallet_batch_sources_cartons_from_batch_check CHECK ((cartons_from_batch > 0))
);


--
-- Name: pallet_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_number text NOT NULL,
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    production_date date DEFAULT CURRENT_DATE NOT NULL,
    form_instance_id uuid,
    status text DEFAULT 'active'::text,
    is_rework boolean DEFAULT false,
    parent_batch_id uuid,
    total_pallets integer DEFAULT 0,
    total_cartons integer DEFAULT 0,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT pallet_batches_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: pallet_combination_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_combination_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    combination_id uuid NOT NULL,
    source_type text NOT NULL,
    source_pallet_id uuid,
    cartons_taken integer NOT NULL,
    added_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pallet_combination_sources_cartons_taken_check CHECK ((cartons_taken > 0)),
    CONSTRAINT pallet_combination_sources_source_type_check CHECK ((source_type = ANY (ARRAY['pallet'::text, 'production'::text])))
);


--
-- Name: pallet_combinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_combinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    combined_pallet_id uuid NOT NULL,
    combination_type text NOT NULL,
    description text,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT pallet_combinations_combination_type_check CHECK ((combination_type = ANY (ARRAY['virtual'::text, 'merged'::text, 'renumbered'::text])))
);


--
-- Name: pallet_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pallet_id uuid NOT NULL,
    shift text NOT NULL,
    shift_date date NOT NULL,
    form_instance_id uuid,
    cartons_added integer NOT NULL,
    operator_id uuid,
    operator_name text,
    added_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pallet_contributions_cartons_added_check CHECK ((cartons_added > 0))
);


--
-- Name: pallet_holds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_holds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pallet_id uuid NOT NULL,
    ncr_id uuid NOT NULL,
    hold_quantity integer NOT NULL,
    hold_reason text,
    status text DEFAULT 'active'::text,
    disposition_type text,
    scrapped_quantity integer DEFAULT 0,
    accepted_quantity integer DEFAULT 0,
    reworked_quantity integer DEFAULT 0,
    disposition_notes text,
    held_at timestamp with time zone DEFAULT now(),
    held_by uuid,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT pallet_holds_check CHECK ((((scrapped_quantity + accepted_quantity) + reworked_quantity) <= hold_quantity)),
    CONSTRAINT pallet_holds_disposition_type_check CHECK ((disposition_type = ANY (ARRAY['scrap'::text, 'rework'::text, 'accept'::text]))),
    CONSTRAINT pallet_holds_hold_quantity_check CHECK ((hold_quantity > 0)),
    CONSTRAINT pallet_holds_status_check CHECK ((status = ANY (ARRAY['active'::text, 'released'::text, 'scrapped'::text, 'reworked'::text])))
);


--
-- Name: pallet_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    allow_multiple_batches_per_pallet boolean DEFAULT false,
    default_loading_strategy text DEFAULT 'fifo'::text,
    allow_partial_pallet_loading boolean DEFAULT true,
    require_inspection_before_loading boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    auto_print_on_creation boolean DEFAULT false,
    default_copies integer DEFAULT 1,
    label_template text DEFAULT 'default'::text,
    show_preview_dialog boolean DEFAULT true,
    default_cartons_per_pallet integer DEFAULT 48,
    CONSTRAINT pallet_settings_default_cartons_per_pallet_check CHECK (((default_cartons_per_pallet > 0) AND (default_cartons_per_pallet <= 200))),
    CONSTRAINT pallet_settings_default_copies_check CHECK (((default_copies >= 1) AND (default_copies <= 10))),
    CONSTRAINT pallet_settings_label_template_check CHECK ((label_template = ANY (ARRAY['default'::text, 'compact'::text, 'detailed'::text])))
);


--
-- Name: TABLE pallet_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pallet_settings IS 'Company-wide pallet module settings (V3 - simplified). Product-specific config in product_pallet_config table.';


--
-- Name: COLUMN pallet_settings.allow_multiple_batches_per_pallet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.allow_multiple_batches_per_pallet IS 'Allow mixing cartons from multiple batches in one pallet';


--
-- Name: COLUMN pallet_settings.default_loading_strategy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.default_loading_strategy IS 'Default strategy: fifo, fefo, lifo';


--
-- Name: COLUMN pallet_settings.allow_partial_pallet_loading; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.allow_partial_pallet_loading IS 'Allow loading incomplete pallets';


--
-- Name: COLUMN pallet_settings.require_inspection_before_loading; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.require_inspection_before_loading IS 'Require vehicle inspection before loading starts';


--
-- Name: COLUMN pallet_settings.auto_print_on_creation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.auto_print_on_creation IS 'Automatically print label when pallet is registered';


--
-- Name: COLUMN pallet_settings.default_copies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.default_copies IS 'Default number of label copies to print';


--
-- Name: COLUMN pallet_settings.label_template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.label_template IS 'Default label template: default, compact, detailed';


--
-- Name: COLUMN pallet_settings.show_preview_dialog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.show_preview_dialog IS 'Show label preview before printing';


--
-- Name: COLUMN pallet_settings.default_cartons_per_pallet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.default_cartons_per_pallet IS 'Default cartons per pallet when product has no specific config';


--
-- Name: pallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pallet_number text NOT NULL,
    sequence_number integer NOT NULL,
    batch_id uuid NOT NULL,
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    standard_cartons_per_pallet integer NOT NULL,
    actual_cartons integer DEFAULT 0 NOT NULL,
    target_cartons integer NOT NULL,
    status text DEFAULT 'partial'::text,
    hold_quantity integer DEFAULT 0,
    ncr_id uuid,
    location text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    finished_at timestamp with time zone,
    completed_at timestamp with time zone,
    released_at timestamp with time zone,
    CONSTRAINT pallets_status_check CHECK ((status = ANY (ARRAY['partial'::text, 'complete'::text, 'hold'::text, 'partial_hold'::text, 'loaded'::text, 'partial_load'::text, 'scrapped'::text])))
);


--
-- Name: TABLE pallets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pallets IS 'V1 Pallet management - Core pallet tracking without V2 rework/destruction features';


--
-- Name: permission_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    changed_by uuid,
    changed_by_email text,
    target_role_id uuid,
    target_role_name text,
    permission_code text NOT NULL,
    action text NOT NULL,
    previous_state boolean,
    new_state boolean,
    changed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    notes text,
    batch_id uuid,
    target_table text,
    target_id text,
    target_user_id uuid,
    target_user_email text,
    old_data jsonb,
    new_data jsonb,
    changed_by_roles text[],
    reason text,
    request_id text,
    error_code text
);


--
-- Name: permission_hierarchy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_hierarchy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    permission_code text NOT NULL,
    requires_permission text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text,
    description text,
    description_ar text,
    category text DEFAULT 'general'::text,
    category_ar text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    module text
);


--
-- Name: pre_op_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pre_op_checks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    area text,
    shift text,
    checklist jsonb DEFAULT '[]'::jsonb,
    overall_status text DEFAULT 'pass'::text,
    inspector text,
    notes text,
    check_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- Name: product_pallet_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_pallet_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    company_id uuid NOT NULL,
    carton_width_cm numeric(10,2) DEFAULT 40 NOT NULL,
    carton_depth_cm numeric(10,2) DEFAULT 30 NOT NULL,
    carton_height_cm numeric(10,2) DEFAULT 25 NOT NULL,
    pallet_width_cm numeric(10,2) DEFAULT 120 NOT NULL,
    pallet_depth_cm numeric(10,2) DEFAULT 100 NOT NULL,
    pallet_max_height_cm numeric(10,2) DEFAULT 180 NOT NULL,
    cartons_per_layer integer DEFAULT 8 NOT NULL,
    number_of_layers integer DEFAULT 6 NOT NULL,
    total_cartons_per_pallet integer GENERATED ALWAYS AS ((cartons_per_layer * number_of_layers)) STORED,
    base_pattern text DEFAULT 'brick'::text NOT NULL,
    alternate_layers boolean DEFAULT true NOT NULL,
    layer_patterns jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    shelf_life_variable_id uuid,
    CONSTRAINT product_pallet_config_base_pattern_check CHECK ((base_pattern = ANY (ARRAY['brick'::text, 'column'::text, 'pinwheel'::text]))),
    CONSTRAINT product_pallet_config_cartons_per_layer_check CHECK (((cartons_per_layer > 0) AND (cartons_per_layer <= 100))),
    CONSTRAINT product_pallet_config_number_of_layers_check CHECK (((number_of_layers > 0) AND (number_of_layers <= 20)))
);


--
-- Name: TABLE product_pallet_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_pallet_config IS 'Per-product pallet stacking configuration with dimensions and visual patterns';


--
-- Name: COLUMN product_pallet_config.carton_width_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.carton_width_cm IS 'Carton width in centimeters (along pallet width)';


--
-- Name: COLUMN product_pallet_config.carton_depth_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.carton_depth_cm IS 'Carton depth in centimeters (along pallet depth)';


--
-- Name: COLUMN product_pallet_config.carton_height_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.carton_height_cm IS 'Carton height in centimeters';


--
-- Name: COLUMN product_pallet_config.pallet_width_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.pallet_width_cm IS 'Pallet width in cm (standard Euro pallet: 120cm)';


--
-- Name: COLUMN product_pallet_config.pallet_depth_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.pallet_depth_cm IS 'Pallet depth in cm (standard Euro pallet: 100cm)';


--
-- Name: COLUMN product_pallet_config.pallet_max_height_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.pallet_max_height_cm IS 'Maximum stacking height in cm (including pallet base)';


--
-- Name: COLUMN product_pallet_config.base_pattern; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.base_pattern IS 'Base stacking pattern: brick (offset), column (aligned), pinwheel (rotating)';


--
-- Name: COLUMN product_pallet_config.alternate_layers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.alternate_layers IS 'If true, alternate carton orientation between layers to prevent collapse';


--
-- Name: COLUMN product_pallet_config.layer_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.layer_patterns IS 'JSON array of per-layer patterns with orientation and grid';


--
-- Name: production_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    batch_number text NOT NULL,
    product_id uuid,
    product_name text,
    production_date date DEFAULT CURRENT_DATE NOT NULL,
    shift text,
    status text DEFAULT 'running'::text,
    planned_quantity numeric,
    actual_quantity numeric DEFAULT 0,
    uom text DEFAULT 'kg'::text,
    operator_name text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT production_batches_shift_check CHECK ((shift = ANY (ARRAY['A'::text, 'B'::text, 'C'::text]))),
    CONSTRAINT production_batches_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'held'::text, 'cancelled'::text])))
);


--
-- Name: production_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name character varying(255) NOT NULL,
    name_en character varying(255),
    code character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: production_rework_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_rework_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    source_batch_no text,
    rework_quantity numeric NOT NULL,
    rework_type text,
    reason text,
    added_by uuid,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    production_line_id uuid,
    name character varying(255) NOT NULL,
    name_en character varying(255),
    sku character varying(100) NOT NULL,
    barcode character varying(100),
    category character varying(50) DEFAULT 'other'::character varying,
    unit character varying(50) DEFAULT 'قطعة'::character varying,
    shelf_life_days integer,
    storage_conditions text,
    allergens text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    standard_cartons_per_pallet integer DEFAULT 50,
    sop_document_id uuid,
    CONSTRAINT products_standard_cartons_per_pallet_check CHECK ((standard_cartons_per_pallet > 0))
);


--
-- Name: raw_material_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_suppliers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    raw_material_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    company_id uuid,
    is_primary boolean DEFAULT false,
    approval_status text DEFAULT 'approved'::text,
    approval_date date,
    approved_by text,
    approval_notes text,
    valid_from date DEFAULT CURRENT_DATE,
    valid_until date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT raw_material_suppliers_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'rejected'::text])))
);


--
-- Name: raw_material_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_tests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    raw_material_id uuid NOT NULL,
    company_id uuid NOT NULL,
    test_type text NOT NULL,
    test_name text NOT NULL,
    test_name_en text,
    test_method text,
    parameters jsonb DEFAULT '[]'::jsonb,
    acceptance_criteria jsonb DEFAULT '{}'::jsonb,
    rejection_criteria jsonb DEFAULT '{}'::jsonb,
    required boolean DEFAULT true,
    frequency text DEFAULT 'each_batch'::text,
    priority text DEFAULT 'normal'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    criteria_id uuid,
    CONSTRAINT raw_material_tests_test_type_check CHECK ((test_type = ANY (ARRAY['chemical'::text, 'physical'::text, 'microbiological'::text, 'sensory'::text, 'packaging'::text])))
);


--
-- Name: raw_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_materials (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    code text,
    category text,
    supplier_id uuid,
    unit text,
    allergens jsonb DEFAULT '[]'::jsonb,
    specifications jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    packaging_options text[] DEFAULT '{}'::text[],
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    storage_condition text,
    shelf_life integer,
    requires_lab_test boolean DEFAULT true
);


--
-- Name: COLUMN raw_materials.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.raw_materials.supplier_id IS 'DEPRECATED [2025-12-28]: Use raw_material_suppliers junction table.';


--
-- Name: recipe_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    version_id uuid,
    action text NOT NULL,
    field_changed text,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid,
    changed_by_name text,
    changed_at timestamp with time zone DEFAULT now(),
    reason text,
    session_id text,
    ip_address inet
);


--
-- Name: TABLE recipe_change_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recipe_change_log IS 'سجل التغييرات التفصيلي للوصفات';


--
-- Name: recipe_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    version_number numeric(4,1) DEFAULT 1.0 NOT NULL,
    name text NOT NULL,
    name_en text,
    ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    mixing_steps jsonb DEFAULT '[]'::jsonb,
    notes text,
    change_type text DEFAULT 'created'::text NOT NULL,
    change_summary text,
    change_details jsonb,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_until timestamp with time zone,
    created_by uuid,
    created_by_name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE recipe_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recipe_versions IS 'سجل إصدارات الوصفات - يحتفظ بنسخة كاملة من كل إصدار';


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name text NOT NULL,
    name_en text,
    version text DEFAULT '1.0'::text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    ingredients jsonb DEFAULT '[]'::jsonb,
    notes text,
    permissions jsonb DEFAULT '{"edit_roles": ["admin", "manager"], "view_roles": ["admin", "manager", "user"]}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    mixing_steps jsonb DEFAULT '[]'::jsonb,
    current_version_id uuid,
    version_count integer DEFAULT 1,
    last_versioned_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    approval_status text DEFAULT 'draft'::text
);


--
-- Name: COLUMN recipes.mixing_steps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recipes.mixing_steps IS 'خطوات الخلط والتحضير [{step_number, title, description, duration, temperature, equipment, notes}]';


--
-- Name: recipe_versions_with_duration; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.recipe_versions_with_duration WITH (security_invoker='on') AS
 SELECT rv.id,
    rv.recipe_id,
    rv.version_number,
    rv.name,
    rv.name_en,
    rv.ingredients,
    rv.mixing_steps,
    rv.notes,
    rv.change_type,
    rv.change_summary,
    rv.change_details,
    rv.effective_from,
    rv.effective_until,
    rv.created_by,
    rv.created_by_name,
    rv.created_at,
    public.get_version_duration_days(rv.id) AS duration_days,
        CASE
            WHEN (rv.effective_until IS NULL) THEN 'نشط'::text
            ELSE 'منتهي'::text
        END AS status,
    r.name AS current_recipe_name
   FROM (public.recipe_versions rv
     JOIN public.recipes r ON ((rv.recipe_id = r.id)))
  ORDER BY rv.recipe_id, rv.version_number DESC;


--
-- Name: recycle_bin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recycle_bin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_id text NOT NULL,
    item_type text NOT NULL,
    name text NOT NULL,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_by uuid,
    original_path text DEFAULT '/'::text,
    original_parent_id text,
    data jsonb NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recycle_bin_item_type_check CHECK ((item_type = ANY (ARRAY['folder'::text, 'template'::text, 'instance'::text])))
);


--
-- Name: TABLE recycle_bin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recycle_bin IS 'Soft-deleted items with 30-day retention before permanent deletion';


--
-- Name: relationship_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relationship_audit_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by text,
    changed_by_name text,
    company_id uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: report_review_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_review_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    action text NOT NULL,
    from_status text,
    to_status text,
    performed_by uuid,
    performed_by_name text NOT NULL,
    performed_by_email text,
    performed_by_role text,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    field_changes jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    checksum text NOT NULL,
    previous_checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_review_history_action_check CHECK ((action = ANY (ARRAY['created'::text, 'submitted'::text, 'claimed'::text, 'approved'::text, 'rejected'::text, 'resubmitted'::text, 'reopened'::text, 'edited_by_reviewer'::text, 'field_changed'::text, 'archived'::text, 'comment_added'::text])))
);


--
-- Name: TABLE report_review_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_review_history IS 'Immutable audit trail for report review workflow - cannot be modified or deleted';


--
-- Name: COLUMN report_review_history.checksum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.report_review_history.checksum IS 'SHA-256 hash for integrity verification';


--
-- Name: COLUMN report_review_history.previous_checksum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.report_review_history.previous_checksum IS 'Link to previous record checksum for chain verification';


--
-- Name: role_action_restrictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_action_restrictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    module_code text NOT NULL,
    stage_code text,
    denied_actions text[] DEFAULT '{}'::text[],
    allowed_actions text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT role_action_mode CHECK (((denied_actions = '{}'::text[]) OR (allowed_actions = '{}'::text[])))
);


--
-- Name: TABLE role_action_restrictions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role_action_restrictions IS 'Phase 1: Roles restrict actions within department-granted modules. Department-first permission model.';


--
-- Name: role_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_a_id uuid NOT NULL,
    role_b_id uuid NOT NULL,
    conflict_reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT role_conflicts_check CHECK ((role_a_id <> role_b_id))
);


--
-- Name: role_module_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_module_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    module_code text NOT NULL,
    granted_actions text[] DEFAULT ARRAY['view'::text] NOT NULL,
    can_see_all_departments boolean DEFAULT false,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now()
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid,
    granted boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    permission_code text
);


--
-- Name: sanitation_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sanitation_areas (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    zone text,
    cleaning_frequency text,
    checklist jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    department_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name_ar text,
    description text,
    description_ar text,
    supervisor_user_id uuid,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 50
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id text DEFAULT 'global'::text NOT NULL,
    departments jsonb DEFAULT '[]'::jsonb,
    users jsonb DEFAULT '[]'::jsonb,
    defect_catalog jsonb DEFAULT '[]'::jsonb,
    products jsonb DEFAULT '[]'::jsonb,
    lines jsonb DEFAULT '[]'::jsonb,
    units jsonb DEFAULT '[]'::jsonb,
    quality_departments jsonb DEFAULT '[]'::jsonb,
    permission_matrix jsonb DEFAULT '{}'::jsonb,
    holds_disposal_policy text DEFAULT 'warning'::text,
    last_backup_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    language text DEFAULT 'ar'::text,
    timezone text DEFAULT 'Asia/Riyadh'::text,
    date_format text DEFAULT 'DD/MM/YYYY'::text,
    theme text DEFAULT 'light'::text,
    logo_url text DEFAULT '/Logo.png'::text,
    logo_scale numeric DEFAULT 1.0,
    main_company_id uuid,
    ncr_document_meta jsonb DEFAULT '{"docCode": "NCR-FRM-01", "issueNo": "1", "issueDate": "2026-01-01", "reviewDate": "2026-12-31", "revisionNo": "0"}'::jsonb
);


--
-- Name: COLUMN settings.main_company_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.settings.main_company_id IS 'Reference to the main company/tenant for this installation';


--
-- Name: share_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.share_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    share_id uuid NOT NULL,
    activity_type text NOT NULL,
    performed_by uuid,
    performed_by_name text NOT NULL,
    performed_by_department text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT share_activity_log_activity_type_check CHECK ((activity_type = ANY (ARRAY['created'::text, 'accessed'::text, 'downloaded'::text, 'commented'::text, 'edited'::text, 'shared'::text, 'expired'::text, 'revoked'::text, 'viewed'::text])))
);


--
-- Name: TABLE share_activity_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.share_activity_log IS 'Activity log for all share-related actions';


--
-- Name: stage_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stage_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    module_code text NOT NULL,
    stage_code text NOT NULL,
    action text NOT NULL,
    is_granted boolean DEFAULT false,
    granted_at timestamp with time zone DEFAULT now(),
    granted_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE stage_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stage_permissions IS 'Stage-based permissions linking roles to specific module stages and actions';


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    code text,
    contact_person text,
    email text,
    phone text,
    address text,
    approved boolean DEFAULT false,
    approved_date timestamp with time zone,
    rating numeric,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    is_active boolean DEFAULT true
);


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    content text NOT NULL,
    author_id uuid,
    author_name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    action text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid,
    changed_by_name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    task_number text,
    task_type text DEFAULT 'general'::text,
    priority text DEFAULT 'medium'::text,
    assigned_to uuid,
    assigned_to_name text,
    assigned_by uuid,
    assigned_by_name text,
    assigned_at timestamp with time zone,
    department text,
    company_id uuid,
    related_entity_type text,
    related_entity_id uuid,
    due_date date,
    start_date date,
    completed_at timestamp with time zone,
    status text DEFAULT 'pending'::text,
    completion_notes text,
    completed_by uuid,
    completed_by_name text,
    requires_verification boolean DEFAULT false,
    verified_by uuid,
    verified_by_name text,
    verified_at timestamp with time zone,
    verification_notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    created_by_name text,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'on_hold'::text, 'completed'::text, 'cancelled'::text, 'overdue'::text]))),
    CONSTRAINT tasks_task_type_check CHECK ((task_type = ANY (ARRAY['general'::text, 'corrective_action'::text, 'preventive_action'::text, 'audit'::text, 'inspection'::text, 'maintenance'::text, 'training'::text, 'documentation'::text, 'review'::text, 'other'::text])))
);


--
-- Name: temperature_equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temperature_equipment (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text,
    location text,
    min_temp numeric,
    max_temp numeric,
    unit text DEFAULT 'C'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- Name: temperature_readings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temperature_readings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    equipment_id uuid,
    temperature numeric NOT NULL,
    unit text DEFAULT 'C'::text,
    status text DEFAULT 'ok'::text,
    recorded_by text,
    notes text,
    recorded_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid NOT NULL,
    name text,
    external_id text,
    jwt_secret text,
    max_concurrent_users integer DEFAULT 200 NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    max_events_per_second integer DEFAULT 100 NOT NULL,
    postgres_cdc_default text DEFAULT 'postgres_cdc_rls'::text,
    max_bytes_per_second integer DEFAULT 100000 NOT NULL,
    max_channels_per_client integer DEFAULT 100 NOT NULL,
    max_joins_per_second integer DEFAULT 500 NOT NULL,
    suspend boolean DEFAULT false,
    jwt_jwks jsonb,
    notify_private_alpha boolean DEFAULT false,
    private_only boolean DEFAULT false NOT NULL,
    migrations_ran integer DEFAULT 0,
    broadcast_adapter character varying(255) DEFAULT 'gen_rpc'::character varying,
    max_presence_events_per_second integer DEFAULT 1000,
    max_payload_size_in_kb integer DEFAULT 3000,
    CONSTRAINT jwt_secret_or_jwt_jwks_required CHECK (((jwt_secret IS NOT NULL) OR (jwt_jwks IS NOT NULL)))
);


--
-- Name: unified_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_en text,
    type text NOT NULL,
    department_id uuid,
    is_default_for_department boolean DEFAULT false,
    parent_id uuid,
    path text NOT NULL,
    depth integer DEFAULT 0,
    icon text DEFAULT '📁'::text,
    color text DEFAULT '#6B7280'::text,
    cover_image text,
    content_types text[] DEFAULT ARRAY['forms'::text, 'reports'::text],
    description text,
    tags text[],
    is_favorite boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    is_public boolean DEFAULT false,
    is_system boolean DEFAULT false,
    visibility_scope text DEFAULT 'department'::text,
    stats jsonb DEFAULT jsonb_build_object('total_items', 0, 'forms_count', 0, 'reports_count', 0, 'last_activity', NULL::unknown),
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer DEFAULT 1,
    CONSTRAINT unified_folders_depth_positive CHECK ((depth >= 0)),
    CONSTRAINT unified_folders_name_not_empty CHECK ((TRIM(BOTH FROM name) <> ''::text)),
    CONSTRAINT unified_folders_sort_order_positive CHECK ((sort_order >= 0)),
    CONSTRAINT unified_folders_type_check CHECK ((type = ANY (ARRAY['standard'::text, 'project'::text, 'department'::text, 'client'::text, 'date-based'::text, 'report-group'::text, 'system'::text, 'custom'::text]))),
    CONSTRAINT unified_folders_visibility_scope_check CHECK ((visibility_scope = ANY (ARRAY['private'::text, 'department'::text, 'company'::text, 'custom'::text])))
);


--
-- Name: TABLE unified_folders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unified_folders IS 'Unified folder system for forms and reports with department isolation';


--
-- Name: COLUMN unified_folders.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unified_folders.type IS 'Type of the folder: standard, project, department, client, date-based, report-group, system, custom';


--
-- Name: user_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    section_id uuid,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    assigned_by uuid
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    name text,
    title text,
    department text,
    roles text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    phone text,
    display_name text,
    permissions jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    company_id uuid,
    department_id uuid,
    job_title_id uuid,
    CONSTRAINT check_users_has_roles CHECK (((roles IS NOT NULL) AND (array_length(roles, 1) > 0)))
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN users.department; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.department IS 'DEPRECATED: Use user_departments junction table + departments table instead.';


--
-- Name: COLUMN users.roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.roles IS 'DEPRECATED: Use user_roles junction table instead.';


--
-- Name: COLUMN users.permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.permissions IS 'DEPRECATED: Use role_permissions table instead.';


--
-- Name: CONSTRAINT check_users_has_roles ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT check_users_has_roles ON public.users IS 'Ensures every user has at least one role. Default should be viewer.';


--
-- Name: user_effective_permissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_effective_permissions WITH (security_invoker='true') AS
 SELECT u.id AS user_id,
    u.email,
    u.name,
    u.department_id,
    d.name AS department_name,
    d.code AS department_code,
    u.job_title_id,
    jt.name AS job_title_name,
    r.id AS role_id,
    r.name AS role_name,
    r.name_ar AS role_name_ar,
    rp.permission_code
   FROM (((((public.users u
     LEFT JOIN public.departments d ON ((u.department_id = d.id)))
     LEFT JOIN public.job_titles jt ON ((u.job_title_id = jt.id)))
     LEFT JOIN public.job_title_roles jtr ON ((jt.id = jtr.job_title_id)))
     LEFT JOIN public.roles r ON ((jtr.role_id = r.id)))
     LEFT JOIN public.role_permissions rp ON ((r.id = rp.role_id)))
  WHERE ((u.is_active = true) AND (rp.permission_code IS NOT NULL));


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid
);


--
-- Name: users_with_deprecated_roles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.users_with_deprecated_roles WITH (security_invoker='true') AS
 SELECT u.id AS user_id,
    u.email,
    u.name,
    r.id AS role_id,
    r.name AS role_name,
    r.code AS role_code,
    r.deprecation_message,
    r.deprecated_at,
    rep.name AS replacement_role_name
   FROM (((public.users u
     JOIN public.user_roles ur ON ((u.id = ur.user_id)))
     JOIN public.roles r ON ((ur.role_id = r.id)))
     LEFT JOIN public.roles rep ON ((r.replacement_role_id = rep.id)))
  WHERE (r.is_deprecated = true);


--
-- Name: v_entity_audit_history; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_entity_audit_history WITH (security_invoker='true') AS
 SELECT id,
    entity_type,
    entity_id,
    entity_name,
    action,
    user_name,
    "timestamp",
    old_values,
    new_values,
    changed_fields,
    reason,
    checksum
   FROM public.audit_trail at
  ORDER BY entity_type, entity_id, "timestamp" DESC;


--
-- Name: v_material_receiving_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_material_receiving_full WITH (security_invoker='true') AS
 SELECT mr.id,
    mr.receiving_number,
    mr.material_type,
    mr.status,
    mr.material_name,
    mr.material_code,
    mr.batch_number,
    mr.lot_number,
    mr.supplier_id,
    mr.supplier_name,
    mr.quantity,
    mr.unit,
    mr.packaging_type,
    mr.production_date,
    mr.expiry_date,
    mr.received_at,
    mr.received_by,
    mr.received_by_name,
    mr.delivery_note_number,
    mr.invoice_number,
    mr.certificate_of_analysis,
    mr.inspection_required,
    mr.inspected_by,
    mr.inspected_at,
    mr.inspection_notes,
    mr.lab_test_id,
    mr.lab_test_status,
    mr.storage_location,
    mr.storage_condition,
    mr.accepted_quantity,
    mr.rejected_quantity,
    mr.rejection_reason,
    mr.notes,
    mr.attachments,
    mr.created_at,
    mr.updated_at,
    mr.company_id,
    mr.raw_material_id,
    mr.test_requirements_snapshot,
    mr.supplier_approval_snapshot,
    mr.vehicle_inspection,
    mr.initial_test_results,
    rm.name AS raw_material_name,
    rm.category AS material_category,
    s.name AS supplier_name_full,
    s.code AS supplier_code,
    c.name AS company_name
   FROM (((public.material_receiving mr
     LEFT JOIN public.raw_materials rm ON ((rm.id = mr.raw_material_id)))
     LEFT JOIN public.suppliers s ON ((s.id = mr.supplier_id)))
     LEFT JOIN public.companies c ON ((c.id = mr.company_id)));


--
-- Name: v_material_suppliers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_material_suppliers WITH (security_invoker='true') AS
 SELECT rm.id AS material_id,
    rm.code AS material_code,
    rm.name AS material_name,
    s.id AS supplier_id,
    s.code AS supplier_code,
    s.name AS supplier_name,
    rms.is_primary,
    rms.approval_status,
    rms.valid_from,
    rms.valid_until,
    rms.company_id
   FROM ((public.raw_material_suppliers rms
     JOIN public.raw_materials rm ON ((rm.id = rms.raw_material_id)))
     JOIN public.suppliers s ON ((s.id = rms.supplier_id)))
  WHERE (rms.is_active = true);


--
-- Name: v_products_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_products_full WITH (security_invoker='true') AS
 SELECT p.id,
    p.company_id,
    p.production_line_id,
    p.name,
    p.name_en,
    p.sku,
    p.barcode,
    p.category,
    p.unit,
    p.shelf_life_days,
    p.storage_conditions,
    p.allergens,
    p.is_active,
    p.created_at,
    p.updated_at,
    pl.name AS line_name,
    pl.code AS line_code,
    c.name AS company_name
   FROM ((public.products p
     LEFT JOIN public.production_lines pl ON ((pl.id = p.production_line_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)));


--
-- Name: v_recent_audit_events; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_recent_audit_events WITH (security_invoker='true') AS
 SELECT id,
    action,
    entity_type,
    entity_id,
    entity_name,
    user_name,
    user_email,
    "timestamp",
    changed_fields,
    reason
   FROM public.audit_trail at
  ORDER BY "timestamp" DESC
 LIMIT 1000;


--
-- Name: v_role_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_role_statistics WITH (security_invoker='true') AS
 SELECT r.id,
    r.code,
    r.name,
    r.name_ar,
    r.department,
    r.priority,
    r.is_system,
    r.is_locked,
    r.is_active,
    count(DISTINCT ur.user_id) AS user_count,
    count(DISTINCT rp.permission_code) FILTER (WHERE (rp.granted = true)) AS permission_count
   FROM ((public.roles r
     LEFT JOIN public.user_roles ur ON ((r.id = ur.role_id)))
     LEFT JOIN public.role_permissions rp ON ((r.id = rp.role_id)))
  GROUP BY r.id, r.code, r.name, r.name_ar, r.department, r.priority, r.is_system, r.is_locked, r.is_active
  ORDER BY r.priority;


--
-- Name: v_suppliers_with_companies; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_suppliers_with_companies WITH (security_invoker='true') AS
 SELECT s.id,
    s.name,
    s.code,
    s.contact_person,
    s.email,
    s.phone,
    s.address,
    s.approved,
    s.approved_date,
    s.rating,
    s.notes,
    s.created_at,
    s.updated_at,
    s.company_id,
    c.name AS company_name,
    c.code AS company_code
   FROM (public.suppliers s
     LEFT JOIN public.companies c ON ((c.id = s.company_id)));


--
-- Name: v_task_type_distribution; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_task_type_distribution WITH (security_invoker='true') AS
 SELECT task_type,
    count(*) AS total,
    count(
        CASE
            WHEN (status = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed,
    count(
        CASE
            WHEN (status = ANY (ARRAY['pending'::text, 'in_progress'::text])) THEN 1
            ELSE NULL::integer
        END) AS active,
    (avg(
        CASE
            WHEN ((status = 'completed'::text) AND (completed_at IS NOT NULL) AND (created_at IS NOT NULL)) THEN (EXTRACT(epoch FROM (completed_at - created_at)) / (3600)::numeric)
            ELSE NULL::numeric
        END))::integer AS avg_hours_to_complete
   FROM public.tasks
  GROUP BY task_type;


--
-- Name: v_user_monthly_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_monthly_performance WITH (security_invoker='true') AS
 SELECT u.id AS user_id,
    u.name AS user_name,
    date_trunc('month'::text, t.created_at) AS month,
    count(t.id) AS assigned_tasks,
    count(
        CASE
            WHEN (t.status = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_tasks,
    count(
        CASE
            WHEN (t.due_date < t.completed_at) THEN 1
            ELSE NULL::integer
        END) AS late_completions,
    round(
        CASE
            WHEN (count(t.id) > 0) THEN (((count(
            CASE
                WHEN (t.status = 'completed'::text) THEN 1
                ELSE NULL::integer
            END))::numeric / (count(t.id))::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS completion_rate
   FROM (public.users u
     LEFT JOIN public.tasks t ON ((t.assigned_to = u.id)))
  WHERE (t.created_at >= (now() - '1 year'::interval))
  GROUP BY u.id, u.name, (date_trunc('month'::text, t.created_at))
  ORDER BY (date_trunc('month'::text, t.created_at)) DESC;


--
-- Name: v_user_permissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_permissions WITH (security_invoker='true') AS
 SELECT u.id AS user_id,
    u.email,
    u.name AS user_name,
    r.name AS role_name,
    r.name_ar AS role_name_ar,
    p.code AS permission_code,
    p.name AS permission_name,
    p.name_ar AS permission_name_ar,
    rp.granted
   FROM ((((public.users u
     LEFT JOIN public.user_roles ur ON ((u.id = ur.user_id)))
     LEFT JOIN public.roles r ON ((ur.role_id = r.id)))
     LEFT JOIN public.role_permissions rp ON ((r.id = rp.role_id)))
     LEFT JOIN public.permissions p ON ((rp.permission_id = p.id)))
  WHERE (rp.granted = true);


--
-- Name: v_user_task_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_task_stats WITH (security_invoker='true') AS
 SELECT u.id AS user_id,
    u.name AS user_name,
    u.email,
    u.department,
    count(t.id) AS total_tasks,
    count(
        CASE
            WHEN (t.status = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_tasks,
    count(
        CASE
            WHEN (t.status = 'pending'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_tasks,
    count(
        CASE
            WHEN (t.status = 'in_progress'::text) THEN 1
            ELSE NULL::integer
        END) AS in_progress_tasks,
    count(
        CASE
            WHEN ((t.status = 'overdue'::text) OR ((t.due_date < CURRENT_DATE) AND (t.status <> ALL (ARRAY['completed'::text, 'cancelled'::text])))) THEN 1
            ELSE NULL::integer
        END) AS overdue_tasks,
    round(
        CASE
            WHEN (count(t.id) > 0) THEN (((count(
            CASE
                WHEN (t.status = 'completed'::text) THEN 1
                ELSE NULL::integer
            END))::numeric / (count(t.id))::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS completion_rate,
    (avg(
        CASE
            WHEN ((t.status = 'completed'::text) AND (t.completed_at IS NOT NULL) AND (t.assigned_at IS NOT NULL)) THEN (EXTRACT(epoch FROM (t.completed_at - t.assigned_at)) / (3600)::numeric)
            ELSE NULL::numeric
        END))::integer AS avg_completion_hours
   FROM (public.users u
     LEFT JOIN public.tasks t ON ((t.assigned_to = u.id)))
  GROUP BY u.id, u.name, u.email, u.department;


--
-- Name: variables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    value text NOT NULL,
    unit text,
    source_document_id uuid,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: vehicle_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    cleanliness_status text,
    temperature_celsius numeric(5,2),
    general_condition text,
    inspection_notes text,
    defects_found text[],
    photos_urls text[],
    overall_status text DEFAULT 'pending'::text,
    inspected_by uuid,
    inspected_at timestamp with time zone DEFAULT now(),
    inspector_signature text,
    CONSTRAINT vehicle_inspections_cleanliness_status_check CHECK ((cleanliness_status = ANY (ARRAY['pass'::text, 'fail'::text]))),
    CONSTRAINT vehicle_inspections_general_condition_check CHECK ((general_condition = ANY (ARRAY['good'::text, 'acceptable'::text, 'poor'::text]))),
    CONSTRAINT vehicle_inspections_overall_status_check CHECK ((overall_status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text])))
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    vehicle_number text NOT NULL,
    vehicle_type text,
    max_capacity_pallets integer,
    max_capacity_cartons integer,
    driver_name text,
    driver_phone text,
    driver_license text,
    status text DEFAULT 'registered'::text,
    registered_at timestamp with time zone DEFAULT now(),
    dispatched_at timestamp with time zone,
    CONSTRAINT vehicles_status_check CHECK ((status = ANY (ARRAY['registered'::text, 'inspected'::text, 'loading'::text, 'loaded'::text, 'dispatched'::text]))),
    CONSTRAINT vehicles_vehicle_type_check CHECK ((vehicle_type = ANY (ARRAY['refrigerated'::text, 'non_refrigerated'::text])))
);


--
-- Data for Name: _backup_permission_matrix; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._backup_permission_matrix (id, role, permissions, updated_at) FROM stdin;
\.


--
-- Data for Name: _backup_report_folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._backup_report_folders (id, name, name_en, description, icon, color, parent_id, path, sort_order, created_at, created_by, updated_at, company_id, is_system, metadata, archived, archived_at, archived_by, version, last_modified_by) FROM stdin;
\.


--
-- Data for Name: _backup_template_folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._backup_template_folders (id, name, name_en, description, icon, color, parent_id, path, sort_order, created_at, created_by, updated_at, company_id, is_system, metadata, archived, archived_at, archived_by, version, last_modified_by) FROM stdin;
\.


--
-- Data for Name: allergen_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allergen_profiles (id, product_name, allergens, may_contain, cross_contact_risk, cleaning_procedure, verified, verified_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: app_modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_modules (id, code, name, name_ar, description, description_ar, icon, color, display_order, is_active, data_isolation_mode, supports_sharing, available_actions, created_at, updated_at, parent_module_code, module_type, is_department_scoped) FROM stdin;
3ca18e89-ed0c-452d-9dd9-a6c4ab49a201	forms_reports	Forms & Reports	النماذج والتقارير	\N	\N	DocumentText	#3B82F6	1	t	isolated	f	{view,create,edit,delete,approve,export,print,share,submit,review_claim,review_approve,review_reject,review_edit,reopen,archive}	2026-01-22 08:22:34.810846+00	2026-01-22 08:22:34.810846+00	\N	core	t
2e48241a-be1a-4031-aef7-bfc03c844fe0	tasks	Tasks	المهام	\N	\N	ClipboardList	#10B981	2	t	isolated	f	{view,create,edit,delete,assign,complete,export}	2026-01-22 08:22:34.810846+00	2026-01-22 08:22:34.810846+00	\N	core	t
5c5f77dc-34d8-4c8b-8351-0431cf1f5040	lab	Laboratory	المختبر	\N	\N	Beaker	#8B5CF6	3	t	isolated	f	{view,create,edit,delete,approve,release,export,print}	2026-01-22 08:22:34.810846+00	2026-01-22 08:22:34.810846+00	\N	core	t
72fc437e-c945-426e-9d87-e588e0555f81	ncr	NCR & Holds	NCR والمحتجزات	\N	\N	ExclamationTriangle	#EF4444	4	t	hybrid	f	{view,create,edit,review,investigate,decide,close,hold_add,hold_release,export,print}	2026-01-22 08:22:34.810846+00	2026-01-22 08:22:34.810846+00	\N	core	t
c5d44162-1740-44aa-b06e-b68dbd6023ac	access_management	Access Management	إدارة الصلاحيات	\N	\N	ShieldCheck	#6366F1	5	t	shared	f	{view,edit}	2026-01-22 08:22:34.810846+00	2026-01-22 08:22:34.810846+00	\N	core	t
b5f75dd6-d454-424f-924b-816e2c92760e	master_data	Master Data	البيانات الأساسية	\N	\N	Database	#F59E0B	6	t	shared	f	{view,create,edit,delete,approve,export,import}	2026-01-22 08:24:54.494178+00	2026-01-22 08:24:54.494178+00	\N	core	t
8d6b31da-8830-41b5-87e0-36e9d26a6324	settings	Settings	الإعدادات	\N	\N	Cog	#6B7280	8	t	shared	f	{view,edit,manage_permissions,manage_users,manage_departments,manage_roles}	2026-01-22 08:24:54.494178+00	2026-01-22 08:24:54.494178+00	\N	core	t
838ea0d5-4451-4337-b256-577cfa656fb9	food_safety	Food Safety	سلامة الغذاء	\N	\N	Shield	#10B981	9	t	shared	f	{view,create,edit,delete,approve,export}	2026-01-22 08:24:54.494178+00	2026-01-22 08:24:54.494178+00	\N	core	t
ac410724-c3ec-4f50-8b99-e9f07a7eae47	documents	Document Control	التحكم بالوثائق	\N	\N	folder-open	#8B5CF6	15	t	isolated	f	{read,create,edit,delete,approve,obsolete,edit_after_approval,view_all_documents}	2026-01-22 08:22:35.036368+00	2026-01-22 08:22:35.036368+00	\N	core	t
a5c3861e-e5cb-4b4b-a8da-9eec138a2e45	pallet_management	Pallet Management	إدارة البالتات	Comprehensive pallet tracking and loading management system	نظام متكامل لتتبع وإدارة البالتات والتحميل	Package	#10B981	50	t	isolated	f	{view,create,edit,delete,manage_hold,release_hold,dispose,load,dispatch,view_audit}	2026-01-28 23:13:58.00615+00	2026-01-28 23:13:58.00615+00	\N	core	t
69a3f8ef-a3dd-47e3-824c-0b0ea990d5f3	lab_tests	Lab Tests (Dynamic)	فحوصات المعمل (ديناميكية)	\N	\N	Flask	#8B5CF6	40	t	isolated	f	{view,create,edit,delete,execute,approve,schedule,export,configure}	2026-01-29 14:37:39.589838+00	2026-01-29 14:37:39.589838+00	\N	core	t
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, table_name, record_id, operation, old_data, new_data, performed_by, entity_name, created_at) FROM stdin;
\.


--
-- Data for Name: audit_trail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_trail (id, action, entity_type, entity_id, entity_name, user_id, user_email, user_name, user_role, "timestamp", ip_address, user_agent, session_id, old_values, new_values, changed_fields, reason, parent_entity_type, parent_entity_id, metadata, checksum, previous_checksum, company_id, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, type, color, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: cell_change_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cell_change_history (id, instance_id, section_id, table_id, row_index, col_index, old_value, new_value, changed_by, changed_by_name, changed_at, change_type, version, client_id, notes, created_at) FROM stdin;
\.


--
-- Data for Name: cleaning_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cleaning_records (id, area_id, status, checklist_results, cleaned_by, verified_by, notes, cleaned_at, company_id) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, name, name_en, code, logo_url, address, phone, email, tax_number, commercial_register, is_active, settings, created_at, updated_at, version) FROM stdin;
\.


--
-- Data for Name: content_shares; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_shares (id, content_type, content_id, shared_by_user_id, shared_by_department_id, share_type, shared_with_departments, shared_with_users, shared_with_roles, auto_assign_to_new_role_members, permission_level, custom_permissions, expires_at, is_active, require_password, password_hash, max_views, current_views, title, note, tags, notify_on_access, notify_on_edit, created_at, updated_at, last_accessed_at, access_count, stats) FROM stdin;
\.


--
-- Data for Name: control_points; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.control_points (id, name, type, location, critical_limits, monitoring_frequency, responsible_person, corrective_actions, verification_methods, is_active, created_at, updated_at, company_id, hazard_type, hazard_description, description) FROM stdin;
\.


--
-- Data for Name: corrective_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.corrective_actions (id, monitoring_record_id, control_point_id, action_taken, product_disposition, cause, preventive_measures, completed_by, completed_at, verified_by, verified_at, created_at, ncr_id, company_id, issue_description, issue_type, severity, status, assigned_to, assigned_to_id, due_date, root_cause, preventive_action, created_by, source_type) FROM stdin;
\.


--
-- Data for Name: defects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.defects (id, name, name_en, severity, defect_type, product_id, production_line_id, material_receiving_id, is_active, created_by, company_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: department_module_access; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.department_module_access (id, department_id, module_code, is_enabled, custom_isolation_mode, granted_actions, granted_by, granted_at, updated_at, created_at, stage_code, visibility_departments, last_changed_by, last_changed_reason, change_count) FROM stdin;
\.


--
-- Data for Name: department_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.department_roles (id, department_id, role_id, is_default, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, code, created_at, name_en, description, sort_order, updated_at, name_ar, description_ar, color, icon, is_active, display_order, parent_department_id, manager_user_id, created_by, updated_by, version) FROM stdin;
\.


--
-- Data for Name: document_access_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_access_log (id, document_id, version_id, user_id, action, ip_address, user_agent, accessed_at) FROM stdin;
\.


--
-- Data for Name: document_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_categories (id, company_id, name, name_ar, code, parent_id, description, display_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: document_shares; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_shares (id, document_type, document_id, shared_by, shared_by_department_id, shared_with_department_id, shared_with_user_id, permission_level, expires_at, note, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: document_signatures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_signatures (id, document_id, version_id, signer_id, signature_type, signature_data, comments, signed_at, ip_address) FROM stdin;
\.


--
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_templates (id, company_id, name, name_ar, type, content, header_content, footer_content, page_margins, is_default, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_versions (id, document_id, company_id, version, content, file_path, file_name, file_size, file_type, changes_summary, change_reason, status, created_by, reviewed_by, approved_by, created_at, reviewed_at, approved_at, updated_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, company_id, document_number, title, title_ar, description, type, category, department_id, current_version, status, owner_id, created_at, updated_at, approved_at, obsolete_at, category_id, template_id) FROM stdin;
\.


--
-- Data for Name: extensions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.extensions (id, type, settings, tenant_external_id, inserted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.folders (id, name, type, icon, color, parent_id, path, created_at, created_by, updated_at, permissions, metadata, stats, name_en, company_id, archived, archived_at, archived_by, version, last_modified_by, department_id, modified_at, is_system, sort_order, description) FROM stdin;
\.


--
-- Data for Name: form_instances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.form_instances (id, template_id, folder_id, name, batch_number, batch_info, data, status, created_at, updated_at, submitted_at, submitted_by, company_id, form_data, calculations, signatures, workflow, template_version, report_folder_id, archived, archived_at, archived_by, version, last_modified_by, last_modified_at, department_id, review_status, reviewer_id, reviewer_name, reviewed_at, review_notes, is_locked, locked_at, locked_by, rejection_count, last_rejection_reason, workflow_history, unified_folder_id, is_shared, share_source_department_id, created_by) FROM stdin;
\.


--
-- Data for Name: form_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.form_templates (id, name, name_en, folder_id, table_type, document_control, batch_config, custom_variables, sections, quality_criteria, signatures, important_notes, created_at, created_by, updated_at, status, type, template_type_config, custom_properties, basic_info, batch_configuration, notes, recipe, company_id, template_folder_id, archived, archived_at, archived_by, version, last_modified_by, last_modified_at, department_id, unified_folder_id, is_shared, share_source_department_id) FROM stdin;
\.


--
-- Data for Name: inspection_criteria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inspection_criteria (id, code, name, name_en, test_type, default_parameters, description, is_active, company_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: job_title_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_title_roles (id, job_title_id, role_id, created_at) FROM stdin;
\.


--
-- Data for Name: job_titles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_titles (id, name, name_en, code, department_id, default_role_id, description, is_active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lab_equipment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_equipment (id, code, name, name_ar, description, location, manufacturer, model, serial_number, is_active, company_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_samples; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_samples (id, sample_number, sample_type, source_id, source_name, collected_by, collected_at, quantity, unit, storage_condition, notes, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: lab_test_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_categories (id, code, name, name_ar, description, description_ar, icon, color, display_order, is_active, company_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_test_equipment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_equipment (test_config_id, equipment_id, is_required, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: lab_test_fields; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_fields (id, test_config_id, field_key, label, label_ar, field_type, field_options, display_order, is_required, default_value, is_evaluable, spec_min_value, spec_max_value, spec_target_value, spec_unit, spec_tolerance, spec_evaluation_mode, created_at) FROM stdin;
\.


--
-- Data for Name: lab_test_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_runs (id, run_number, test_config_id, schedule_id, status, linked_batch_id, linked_product_id, linked_work_order_id, linked_material_receipt_id, scheduled_at, started_at, completed_at, approved_at, rejected_at, performed_by, performed_by_name, approved_by, approved_by_name, field_values, evaluation_result, failed_fields, notes, approval_notes, rejection_reason, attachments, company_id, department_id, created_at, created_by, updated_at, updated_by, batch_number) FROM stdin;
\.


--
-- Data for Name: lab_test_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_schedules (id, test_config_id, schedule_type, frequency_value, frequency_unit, start_time, end_time, days_of_week, linked_batch_id, linked_product_id, is_active, paused_at, paused_reason, paused_by, resumed_at, assigned_department_id, assigned_user_ids, notify_before_minutes, auto_create_run, last_run_at, next_run_at, company_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_test_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_templates (id, code, name, name_ar, description, description_ar, test_config_ids, is_active, company_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_test_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_types (id, category_id, code, name, name_ar, description, description_ar, icon, color, display_order, is_active, company_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_tests (id, test_number, test_type, status, sample_id, sample_data, parameters, requested_by, requested_by_name, requested_at, assigned_to, assigned_to_name, started_at, completed_at, approved_by, approved_by_name, approved_at, approval_notes, priority, due_date, notes, attachments, created_at, updated_at, company_id, version, last_modified_by, department_id) FROM stdin;
\.


--
-- Data for Name: lab_tests_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_tests_config (id, test_type_id, code, name, name_ar, description, description_ar, method, method_standard, equipment_required, estimated_duration_minutes, requires_approval, is_active, company_id, department_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_attachments (id, entity_type, entity_id, file_name, file_path, file_type, file_size, description, company_id, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_chemical_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_chemical_receipts (id, chemical_id, receipt_number, lot_number, batch_number, quantity, unit, received_date, expiry_date, supplier_source, type, remaining_quantity, status, notes, company_id, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_chemicals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_chemicals (id, code, name, name_ar, supplier, grade, cas_number, storage_conditions, hazard_notes, unit, custom_fields, is_active, company_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_device_calibrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_device_calibrations (id, device_id, calibration_date, next_due_date, result, performed_by, certificate_number, notes, attachment_ids, company_id, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_devices (id, code, name, name_ar, manufacturer, model, serial_number, location, status, calibration_due_date, calibration_interval_days, custom_fields, notes, company_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_run_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_run_materials (id, run_id, chemical_receipt_id, quantity_used, unit, notes, created_at) FROM stdin;
\.


--
-- Data for Name: lab_v2_run_measurements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_run_measurements (id, run_id, measurement_no, measured_at, notes, evaluation_result, failed_params, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_run_values; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_run_values (id, run_id, parameter_id, param_key, value, numeric_value, evaluation_result, out_of_spec, notes, created_at, updated_at, measurement_id) FROM stdin;
\.


--
-- Data for Name: lab_v2_test_acceptance_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_test_acceptance_rules (id, test_id, parameter_id, rule_type, spec_min, spec_max, spec_unit, allowed_values, custom_note, priority, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_test_device_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_test_device_links (id, test_id, device_id, is_default, setup_notes, calibration_targets, device_specific_params, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_test_parameters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_test_parameters (id, test_id, param_key, label, label_ar, data_type, is_required, display_order, unit, min_value, max_value, allowed_values, default_value, help_text, created_at) FROM stdin;
\.


--
-- Data for Name: lab_v2_test_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_test_runs (id, run_number, test_id, batch_id, product_id, device_id, status, operator_id, operator_name, approver_id, approver_name, started_at, completed_at, approved_at, rejected_at, evaluation_result, failed_params, test_snapshot, params_snapshot, rules_snapshot, notes, approval_notes, rejection_reason, company_id, department_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: lab_v2_tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_v2_tests (id, code, name, name_ar, category, description, method_description, method_standard, sop_document_id, scope, linked_company_id, linked_product_id, estimated_duration_minutes, requires_approval, is_active, company_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: loaded_pallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loaded_pallets (id, loading_operation_id, pallet_id, cartons_loaded, is_partial_load, load_sequence, loaded_at, is_confirmed, confirmed_at) FROM stdin;
\.


--
-- Data for Name: loading_operations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loading_operations (id, vehicle_id, company_id, loading_strategy, planned_pallets, planned_cartons, actual_pallets, actual_cartons, status, planned_date, started_at, completed_at, created_by, loaded_by, notes, created_at) FROM stdin;
\.


--
-- Data for Name: material_receiving; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.material_receiving (id, receiving_number, material_type, status, material_name, material_code, batch_number, lot_number, supplier_id, supplier_name, quantity, unit, packaging_type, production_date, expiry_date, received_at, received_by, received_by_name, delivery_note_number, invoice_number, certificate_of_analysis, inspection_required, inspected_by, inspected_at, inspection_notes, lab_test_id, lab_test_status, storage_location, storage_condition, accepted_quantity, rejected_quantity, rejection_reason, notes, attachments, created_at, updated_at, company_id, raw_material_id, test_requirements_snapshot, supplier_approval_snapshot, vehicle_inspection, initial_test_results, version, last_modified_by) FROM stdin;
\.


--
-- Data for Name: meta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meta (id, sequences, updated_at) FROM stdin;
\.


--
-- Data for Name: module_data_visibility; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.module_data_visibility (id, module_code, department_id, visibility_scope, cross_dept_read_only, shared_with_departments, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: module_stages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.module_stages (id, module_code, stage_code, stage_name, stage_name_ar, description, description_ar, display_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: monitoring_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monitoring_records (id, control_point_id, value, unit, status, deviation, notes, recorded_by, recorded_at, company_id) FROM stdin;
\.


--
-- Data for Name: ncr_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_actions (id, ncr_id, action_number, action_type, title, description, expected_outcome, assigned_to_id, assigned_to_name, assigned_department_id, assigned_department_name, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, priority, progress_percentage, progress_notes, verification_required, verified_by_id, verified_by_name, verified_at, verification_result, verification_notes, cost_estimate, actual_cost, attachments, created_by_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_attachments (id, ncr_id, filename, original_filename, file_type, mime_type, file_size, file_url, thumbnail_url, attachment_category, description, is_primary, location, metadata, uploaded_by_id, uploaded_at, is_deleted, deleted_at, deleted_by_id) FROM stdin;
\.


--
-- Data for Name: ncr_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_audit_log (id, ncr_id, action, action_category, action_details, previous_values, new_values, performed_by_id, performed_by_name, performed_by_department, performed_at, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: ncr_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_categories (id, company_id, code, name_ar, name_en, description, icon, color, is_active, sort_order, requires_capa, default_severity_id, parent_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_comments (id, ncr_id, parent_id, content, author_id, author_name, created_at, updated_at, entity_id, entity_type, author_avatar, edited, edited_at, reactions, attachments) FROM stdin;
\.


--
-- Data for Name: ncr_consensus_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_consensus_settings (id, company_id, response_deadline_hours, reminder_after_hours, auto_escalate_after_hours, max_proposal_rounds, max_transfers, default_mediator_role, final_arbiter_role, require_unanimous, minimum_approval_percentage, on_no_response, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_conversations (id, ncr_id, company_id, conversation_type, participants, status, is_pinned, created_by_id, created_at, updated_at, last_message_at, message_count) FROM stdin;
\.


--
-- Data for Name: ncr_cost_tracking; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_cost_tracking (id, ncr_id, material_cost, material_details, rework_cost, rework_hours, rework_hourly_rate, downtime_cost, downtime_hours, downtime_hourly_rate, labor_cost, labor_hours, labor_hourly_rate, inspection_cost, shipping_cost, other_costs, other_costs_total, calculated_by_id, calculated_at, approved_by_id, approved_at, is_approved, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_defect_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_defect_types (id, company_id, category_id, code, name_ar, name_en, description, inspection_method, acceptance_criteria, rejection_criteria, is_critical, requires_quarantine, default_severity_id, images, is_active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_disputes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_disputes (id, ncr_id, party_a_department_id, party_a_department_name, party_a_position, party_a_evidence, party_b_department_id, party_b_department_name, party_b_position, party_b_evidence, dispute_type, dispute_description, status, mediator_id, mediator_department_id, mediation_started_at, mediation_notes, resolution_type, resolution_details, final_decision, party_a_accepted, party_a_accepted_at, party_b_accepted, party_b_accepted_at, created_at, updated_at, resolved_at, escalated_at) FROM stdin;
\.


--
-- Data for Name: ncr_document_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_document_metadata (id, ncr_id, document_code, document_title, version_number, revision_number, issue_date, effective_date, revision_date, next_review_date, expiry_date, prepared_by_id, prepared_by_name, prepared_by_title, prepared_at, reviewed_by_id, reviewed_by_name, reviewed_by_title, reviewed_at, approved_by_id, approved_by_name, approved_by_title, approved_at, document_status, change_history, confidentiality, distribution_list, print_count, last_printed_at, last_printed_by_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_escalation_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_escalation_rules (id, company_id, severity_id, escalation_levels, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_messages (id, conversation_id, ncr_id, sender_id, sender_name, sender_department_id, sender_department_name, message_type, content, rich_content, attachments, mentions, read_by, reply_to_id, thread_id, is_edited, edited_at, is_deleted, deleted_at, created_at) FROM stdin;
\.


--
-- Data for Name: ncr_notification_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_notification_rules (id, company_id, name, description, trigger_conditions, recipients, channels, notification_template, notification_title_template, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_quarantine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_quarantine (id, ncr_id, item_type, item_id, item_name, item_code, batch_number, lot_number, quantity, unit, unit_value, total_value, quarantine_location_id, quarantine_location_name, original_location_name, status, quarantine_date, quarantine_by_id, quarantine_by_name, quarantine_reason, disposition, disposition_reason, disposition_date, disposition_by_id, disposition_by_name, disposition_approved_by_id, disposition_approved_by_name, disposition_approved_at, release_date, release_by_id, release_by_name, release_notes, release_destination, attachments, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_reports (id, ncr_number, title, description, category, severity, status, source, department, product_name, batch_number, quantity_affected, root_cause, corrective_action, preventive_action, assigned_to, due_date, closed_at, closed_by, attachments, created_at, created_by, updated_at, source_department_id, target_department_id, assigned_to_id, created_by_id, number, date, shift, line_or_area, reserved_qty, reserved_unit, standard_defect, custom_type, discovered_by, immediate_action, company_id, current_stage, completed_stages, stage_history, root_cause_approval, actions, holds, verification, related_lab_test_id, related_lab_test_number, related_material_receiving_id, related_material_name, related_batch_number, related_supplier_id, related_supplier_name, auto_generated_from_lab, version, defect_id, defect_type, occurrence, detection, rpn, risk_band) FROM stdin;
\.


--
-- Data for Name: ncr_reports_v2; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_reports_v2 (id, ncr_number, company_id, category_id, subcategory_id, defect_type_id, source_type, discovery_context, affected_product, title, description, deviation_from_spec, specification_reference, severity_id, risk_assessment, current_stage_id, status, is_on_hold, hold_reason, created_by_id, discovered_by_id, assigned_to_id, responsible_department_id, source_department_id, total_cost, cost_breakdown, supplier_id, related_ncrs, linked_capa_id, source_lab_test_id, source_receiving_id, source_audit_id, auto_generated, created_at, updated_at, target_closure_date, actual_closure_date, closed_by_id, version) FROM stdin;
\.


--
-- Data for Name: ncr_responsibility_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_responsibility_assignments (id, ncr_id, assignment_type, original_department_id, original_department_name, responsibility_distribution, reassignment_reason, reassignment_evidence, investigation_summary, assigned_by_id, assigned_at, department_acknowledgments, status, finalized_at, finalized_by_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_root_cause_analysis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_root_cause_analysis (id, ncr_id, analysis_method, five_whys, fishbone, fmea_analysis, identified_root_cause, contributing_factors, analysis_status, analyzed_by_id, analyzed_by_name, analyzed_at, reviewed_by_id, reviewed_by_name, reviewed_at, approved_by_id, approved_by_name, approved_at, approval_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_root_cause_proposals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_root_cause_proposals (id, ncr_id, proposal_number, proposed_root_cause, proposed_solution, supporting_evidence, analysis_method, proposed_by_id, proposed_by_department_id, proposed_at, status, required_approvers, responses, final_decision, final_decision_at, final_decision_by_id, final_decision_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_settings (id, company_id, numbering, default_timelines, auto_escalation, closure_settings, integrations, attachment_settings, print_settings, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_severity_levels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_severity_levels (id, company_id, code, name_ar, name_en, description, color, icon, risk_weight, requires_immediate_action, requires_management_notification, max_resolution_days, escalation_hours, is_active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_stage_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_stage_permissions (id, stage_code, department_id, role_id, allowed_actions, can_advance, can_return, is_active) FROM stdin;
\.


--
-- Data for Name: ncr_subcategories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_subcategories (id, company_id, category_id, code, name_ar, name_en, description, is_active, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: ncr_supplier_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_supplier_reports (id, ncr_id, supplier_id, supplier_name, material_id, material_name, material_code, batch_number, lot_number, purchase_order_id, purchase_order_number, receiving_id, receiving_date, defect_description, quantity_affected, unit, requested_action, credit_amount, notification_sent_at, notification_method, notification_details, supplier_contact_name, supplier_contact_email, supplier_response, supplier_response_at, supplier_attachments, resolution_status, resolution_details, resolution_date, resolved_by_id, affects_rating, rating_impact, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_transfer_chain; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_transfer_chain (id, ncr_id, chain, total_transfers, total_duration_hours, current_department_id, loop_detected, max_transfers_reached, forced_escalation, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ncr_transfers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_transfers (id, ncr_id, transfer_number, from_department_id, from_department_name, from_user_id, to_department_id, to_department_name, to_user_id, transfer_reason, transfer_notes, required_action, status, accepted_at, accepted_by_id, rejection_reason, completed_at, completion_notes, completion_result, created_at, updated_at, deadline) FROM stdin;
\.


--
-- Data for Name: ncr_workflow_stages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ncr_workflow_stages (id, code, name, name_ar, description, stage_order, color, is_active, company_id, name_en, icon, settings, allowed_transitions, can_return_to, is_initial, is_final, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_preferences (id, user_id, email_enabled, push_enabled, in_app_enabled, category_settings, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, daily_digest_enabled, digest_time, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_templates (id, code, name, name_ar, title_template, title_template_ar, message_template, message_template_ar, type, category, default_action_url_template, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, ncr_id, read, created_at, title_ar, message_ar, category, entity_type, entity_id, action_url, read_at, expires_at, sender_id, sender_name) FROM stdin;
\.


--
-- Data for Name: pallet_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallet_audit_log (id, entity_type, entity_id, action, old_data, new_data, changes_summary, performed_by, performed_at, ip_address, metadata) FROM stdin;
\.


--
-- Data for Name: pallet_batch_sources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallet_batch_sources (id, pallet_id, source_batch_id, cartons_from_batch, is_primary, added_at, notes) FROM stdin;
\.


--
-- Data for Name: pallet_batches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallet_batches (id, batch_number, company_id, product_id, production_date, form_instance_id, status, is_rework, parent_batch_id, total_pallets, total_cartons, notes, created_by, created_at, updated_at, completed_at) FROM stdin;
\.


--
-- Data for Name: pallet_combination_sources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallet_combination_sources (id, combination_id, source_type, source_pallet_id, cartons_taken, added_at) FROM stdin;
\.


--
-- Data for Name: pallet_combinations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallet_combinations (id, combined_pallet_id, combination_type, description, reason, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: pallet_contributions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallet_contributions (id, pallet_id, shift, shift_date, form_instance_id, cartons_added, operator_id, operator_name, added_at) FROM stdin;
\.


--
-- Data for Name: pallet_holds; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallet_holds (id, pallet_id, ncr_id, hold_quantity, hold_reason, status, disposition_type, scrapped_quantity, accepted_quantity, reworked_quantity, disposition_notes, held_at, held_by, resolved_at, resolved_by) FROM stdin;
\.


--
-- Data for Name: pallet_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallet_settings (id, company_id, allow_multiple_batches_per_pallet, default_loading_strategy, allow_partial_pallet_loading, require_inspection_before_loading, updated_at, updated_by, auto_print_on_creation, default_copies, label_template, show_preview_dialog, default_cartons_per_pallet) FROM stdin;
\.


--
-- Data for Name: pallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pallets (id, pallet_number, sequence_number, batch_id, company_id, product_id, standard_cartons_per_pallet, actual_cartons, target_cartons, status, hold_quantity, ncr_id, location, notes, created_at, finished_at, completed_at, released_at) FROM stdin;
\.


--
-- Data for Name: permission_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permission_audit_log (id, changed_by, changed_by_email, target_role_id, target_role_name, permission_code, action, previous_state, new_state, changed_at, ip_address, user_agent, notes, batch_id, target_table, target_id, target_user_id, target_user_email, old_data, new_data, changed_by_roles, reason, request_id, error_code) FROM stdin;
\.


--
-- Data for Name: permission_hierarchy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permission_hierarchy (id, permission_code, requires_permission, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, code, name, name_ar, description, description_ar, category, category_ar, is_active, created_at, updated_at, module) FROM stdin;
\.


--
-- Data for Name: pre_op_checks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pre_op_checks (id, area, shift, checklist, overall_status, inspector, notes, check_date, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: product_pallet_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_pallet_config (id, product_id, company_id, carton_width_cm, carton_depth_cm, carton_height_cm, pallet_width_cm, pallet_depth_cm, pallet_max_height_cm, cartons_per_layer, number_of_layers, base_pattern, alternate_layers, layer_patterns, notes, created_at, updated_at, created_by, updated_by, shelf_life_variable_id) FROM stdin;
\.


--
-- Data for Name: production_batches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_batches (id, company_id, batch_number, product_id, product_name, production_date, shift, status, planned_quantity, actual_quantity, uom, operator_name, notes, created_by, created_at, updated_at, completed_at) FROM stdin;
\.


--
-- Data for Name: production_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_lines (id, company_id, name, name_en, code, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: production_rework_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_rework_logs (id, batch_id, source_batch_no, rework_quantity, rework_type, reason, added_by, added_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, company_id, production_line_id, name, name_en, sku, barcode, category, unit, shelf_life_days, storage_conditions, allergens, is_active, created_at, updated_at, version, last_modified_by, standard_cartons_per_pallet, sop_document_id) FROM stdin;
\.


--
-- Data for Name: raw_material_suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.raw_material_suppliers (id, raw_material_id, supplier_id, company_id, is_primary, approval_status, approval_date, approved_by, approval_notes, valid_from, valid_until, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: raw_material_tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.raw_material_tests (id, raw_material_id, company_id, test_type, test_name, test_name_en, test_method, parameters, acceptance_criteria, rejection_criteria, required, frequency, priority, is_active, created_at, updated_at, criteria_id) FROM stdin;
\.


--
-- Data for Name: raw_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.raw_materials (id, name, code, category, supplier_id, unit, allergens, specifications, is_active, created_at, updated_at, company_id, packaging_options, version, last_modified_by, storage_condition, shelf_life, requires_lab_test) FROM stdin;
\.


--
-- Data for Name: recipe_change_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipe_change_log (id, recipe_id, version_id, action, field_changed, old_value, new_value, changed_by, changed_by_name, changed_at, reason, session_id, ip_address) FROM stdin;
\.


--
-- Data for Name: recipe_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipe_versions (id, recipe_id, version_number, name, name_en, ingredients, mixing_steps, notes, change_type, change_summary, change_details, effective_from, effective_until, created_by, created_by_name, created_at) FROM stdin;
\.


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipes (id, product_id, name, name_en, version, is_active, is_default, ingredients, notes, permissions, created_at, updated_at, created_by, mixing_steps, current_version_id, version_count, last_versioned_at, approved_by, approved_at, approval_status) FROM stdin;
\.


--
-- Data for Name: recycle_bin; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recycle_bin (id, original_id, item_type, name, deleted_at, deleted_by, original_path, original_parent_id, data, expires_at, company_id, created_at) FROM stdin;
\.


--
-- Data for Name: relationship_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.relationship_audit_log (id, entity_type, entity_id, action, old_value, new_value, changed_by, changed_by_name, company_id, reason, created_at) FROM stdin;
\.


--
-- Data for Name: report_review_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.report_review_history (id, report_id, action, from_status, to_status, performed_by, performed_by_name, performed_by_email, performed_by_role, performed_at, notes, field_changes, metadata, checksum, previous_checksum, created_at) FROM stdin;
\.


--
-- Data for Name: role_action_restrictions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_action_restrictions (id, role_id, module_code, stage_code, denied_actions, allowed_actions, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: role_conflicts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_conflicts (id, role_a_id, role_b_id, conflict_reason, created_at) FROM stdin;
\.


--
-- Data for Name: role_module_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_module_permissions (id, role_id, module_code, granted_actions, can_see_all_departments, granted_by, granted_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (id, role_id, permission_id, granted, created_at, permission_code) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, name_ar, description, description_ar, color, priority, is_system, is_active, created_at, updated_at, code, company_id, department, department_ar, is_locked, min_edit_priority, is_deprecated, deprecated_at, replacement_role_id, deprecation_message, category, type, icon, version) FROM stdin;
\.


--
-- Data for Name: sanitation_areas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sanitation_areas (id, name, zone, cleaning_frequency, checklist, is_active, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schema_migrations (version, inserted_at) FROM stdin;
\.


--
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sections (id, code, name, department_id, created_at, updated_at, name_ar, description, description_ar, supervisor_user_id, is_active, display_order) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (id, departments, users, defect_catalog, products, lines, units, quality_departments, permission_matrix, holds_disposal_policy, last_backup_at, created_at, updated_at, language, timezone, date_format, theme, logo_url, logo_scale, main_company_id, ncr_document_meta) FROM stdin;
\.


--
-- Data for Name: share_activity_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.share_activity_log (id, share_id, activity_type, performed_by, performed_by_name, performed_by_department, metadata, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: stage_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stage_permissions (id, role_id, module_code, stage_code, action, is_granted, granted_at, granted_by, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (id, name, code, contact_person, email, phone, address, approved, approved_date, rating, notes, created_at, updated_at, company_id, version, last_modified_by, is_active) FROM stdin;
\.


--
-- Data for Name: task_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_comments (id, task_id, content, author_id, author_name, created_at) FROM stdin;
\.


--
-- Data for Name: task_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_history (id, task_id, action, old_value, new_value, changed_by, changed_by_name, created_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, title, description, task_number, task_type, priority, assigned_to, assigned_to_name, assigned_by, assigned_by_name, assigned_at, department, company_id, related_entity_type, related_entity_id, due_date, start_date, completed_at, status, completion_notes, completed_by, completed_by_name, requires_verification, verified_by, verified_by_name, verified_at, verification_notes, attachments, created_at, updated_at, created_by, created_by_name, version) FROM stdin;
\.


--
-- Data for Name: temperature_equipment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.temperature_equipment (id, name, type, location, min_temp, max_temp, unit, is_active, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: temperature_readings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.temperature_readings (id, equipment_id, temperature, unit, status, recorded_by, notes, recorded_at, company_id) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenants (id, name, external_id, jwt_secret, max_concurrent_users, inserted_at, updated_at, max_events_per_second, postgres_cdc_default, max_bytes_per_second, max_channels_per_client, max_joins_per_second, suspend, jwt_jwks, notify_private_alpha, private_only, migrations_ran, broadcast_adapter, max_presence_events_per_second, max_payload_size_in_kb) FROM stdin;
\.


--
-- Data for Name: unified_folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unified_folders (id, name, name_en, type, department_id, is_default_for_department, parent_id, path, depth, icon, color, cover_image, content_types, description, tags, is_favorite, sort_order, is_public, is_system, visibility_scope, stats, created_at, created_by, updated_at, updated_by, archived, archived_at, archived_by, version) FROM stdin;
\.


--
-- Data for Name: user_departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_departments (id, user_id, department_id, assigned_at, section_id, is_primary, is_active, assigned_by) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (id, user_id, role_id, assigned_at, assigned_by) FROM stdin;
\.


--
-- Data for Name: user_temp_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_temp_roles (id, user_id, role_id, assigned_by, starts_at, expires_at, reason, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, title, department, roles, created_at, updated_at, avatar_url, phone, display_name, permissions, is_active, company_id, department_id, job_title_id) FROM stdin;
\.


--
-- Data for Name: variables; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.variables (id, company_id, name, value, unit, source_document_id, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vehicle_inspections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle_inspections (id, vehicle_id, cleanliness_status, temperature_celsius, general_condition, inspection_notes, defects_found, photos_urls, overall_status, inspected_by, inspected_at, inspector_signature) FROM stdin;
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicles (id, company_id, vehicle_number, vehicle_type, max_capacity_pallets, max_capacity_cartons, driver_name, driver_phone, driver_license, status, registered_at, dispatched_at) FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

