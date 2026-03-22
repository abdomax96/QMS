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
-- PostgreSQL database dump complete
--

