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
-- PostgreSQL database dump complete
--

