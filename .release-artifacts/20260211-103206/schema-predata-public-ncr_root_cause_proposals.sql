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
-- PostgreSQL database dump complete
--

