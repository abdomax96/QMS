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
-- PostgreSQL database dump complete
--

