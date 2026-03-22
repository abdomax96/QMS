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
    document_id uuid,
    document_title text,
    CONSTRAINT ncr_reports_defect_type_check CHECK ((defect_type = ANY (ARRAY['raw_material'::text, 'product'::text, 'process'::text, 'other'::text]))),
    CONSTRAINT ncr_reports_severity_check CHECK ((severity = ANY (ARRAY['minor'::text, 'major'::text, 'critical'::text, 'low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT ncr_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'pending_review'::text, 'resolved'::text, 'closed'::text, 'cancelled'::text, 'draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- PostgreSQL database dump complete
--

