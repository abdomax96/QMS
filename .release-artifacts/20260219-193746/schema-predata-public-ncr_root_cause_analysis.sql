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
-- Name: ncr_root_cause_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_root_cause_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    analysis_method text,
    five_whys jsonb DEFAULT '{"why1": {"answer": "", "question": ""}, "why2": {"answer": "", "question": ""}, "why3": {"answer": "", "question": ""}, "why4": {"answer": "", "question": ""}, "why5": {"answer": "", "question": ""}, "root_cause": ""}'::jsonb,
    fishbone jsonb DEFAULT '{"man": [], "method": [], "machine": [], "material": [], "environment": [], "measurement": [], "root_causes": []}'::jsonb,
    fmea_analysis jsonb DEFAULT '{"rpn": 1, "severity": 1, "detection": 1, "occurrence": 1, "current_controls": "", "potential_causes": "", "potential_effects": "", "recommended_actions": ""}'::jsonb,
    identified_root_cause text,
    contributing_factors text[],
    analysis_status text DEFAULT 'draft'::text,
    analyzed_by_id uuid,
    analyzed_by_name text,
    analyzed_at timestamp with time zone,
    reviewed_by_id uuid,
    reviewed_by_name text,
    reviewed_at timestamp with time zone,
    approved_by_id uuid,
    approved_by_name text,
    approved_at timestamp with time zone,
    approval_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_root_cause_analysis_analysis_method_check CHECK ((analysis_method = ANY (ARRAY['5_whys'::text, 'fishbone'::text, 'fmea'::text, 'pareto'::text, 'fault_tree'::text, 'other'::text, 'combined'::text]))),
    CONSTRAINT ncr_root_cause_analysis_analysis_status_check CHECK ((analysis_status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'pending_consensus'::text, 'approved'::text, 'rejected'::text])))
);


--
-- PostgreSQL database dump complete
--

