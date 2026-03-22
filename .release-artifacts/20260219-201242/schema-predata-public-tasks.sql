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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
    current_stage text DEFAULT 'assignment'::text NOT NULL,
    completed_stages text[] DEFAULT '{}'::text[] NOT NULL,
    assignment_type text DEFAULT 'individual'::text NOT NULL,
    assigned_role_id uuid,
    assigned_department_id uuid,
    primary_assignee_id uuid,
    requires_approval boolean DEFAULT true NOT NULL,
    approved_by uuid,
    approved_by_name text,
    approved_at timestamp with time zone,
    approval_notes text,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    rejection_reason text,
    category text DEFAULT 'general'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    estimated_hours numeric,
    actual_hours numeric,
    checklist jsonb DEFAULT '[]'::jsonb NOT NULL,
    related_ncr_id uuid,
    related_report_id uuid,
    related_lab_test_id uuid,
    related_lab_test_number text,
    related_material_receiving_id uuid,
    related_material_name text,
    related_supplier_id uuid,
    related_supplier_name text,
    related_control_point_id uuid,
    CONSTRAINT tasks_assignment_type_check CHECK ((assignment_type = ANY (ARRAY['individual'::text, 'role'::text, 'department'::text]))),
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'on_hold'::text, 'completed'::text, 'cancelled'::text, 'overdue'::text]))),
    CONSTRAINT tasks_task_type_check CHECK ((task_type = ANY (ARRAY['general'::text, 'corrective_action'::text, 'preventive_action'::text, 'audit'::text, 'inspection'::text, 'maintenance'::text, 'training'::text, 'documentation'::text, 'review'::text, 'other'::text])))
);


--
-- PostgreSQL database dump complete
--

