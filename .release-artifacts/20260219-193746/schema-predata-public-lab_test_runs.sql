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
-- PostgreSQL database dump complete
--

