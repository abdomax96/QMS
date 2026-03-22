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
-- Name: ncr_consensus_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_consensus_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    response_deadline_hours integer DEFAULT 48,
    reminder_after_hours integer DEFAULT 24,
    auto_escalate_after_hours integer DEFAULT 72,
    max_proposal_rounds integer DEFAULT 3,
    max_transfers integer DEFAULT 5,
    default_mediator_role text DEFAULT 'quality_manager'::text,
    final_arbiter_role text DEFAULT 'general_manager'::text,
    require_unanimous boolean DEFAULT true,
    minimum_approval_percentage integer DEFAULT 100,
    on_no_response text DEFAULT 'auto_escalate'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_consensus_settings_on_no_response_check CHECK ((on_no_response = ANY (ARRAY['auto_approve'::text, 'auto_escalate'::text, 'reminder_only'::text])))
);


--
-- PostgreSQL database dump complete
--

