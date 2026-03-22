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
-- Name: ncr_workflow_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_workflow_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    stage_order integer NOT NULL,
    color text DEFAULT '#6B7280'::text,
    is_active boolean DEFAULT true,
    company_id uuid,
    name_en text,
    icon text,
    settings jsonb DEFAULT '{"can_skip": false, "auto_advance": false, "is_mandatory": true, "approval_type": "single", "required_fields": [], "max_duration_days": 7, "requires_approval": false, "required_attachments": []}'::jsonb,
    allowed_transitions uuid[],
    can_return_to uuid[],
    is_initial boolean DEFAULT false,
    is_final boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- PostgreSQL database dump complete
--

