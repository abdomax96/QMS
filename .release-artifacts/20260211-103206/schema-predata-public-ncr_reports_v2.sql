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
-- PostgreSQL database dump complete
--

