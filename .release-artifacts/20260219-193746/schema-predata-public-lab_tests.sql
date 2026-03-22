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
-- PostgreSQL database dump complete
--

