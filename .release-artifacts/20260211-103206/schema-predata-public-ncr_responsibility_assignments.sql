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
-- PostgreSQL database dump complete
--

