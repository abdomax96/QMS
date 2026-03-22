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
-- Name: ncr_severity_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_severity_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    description text,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    icon text,
    risk_weight integer DEFAULT 5,
    requires_immediate_action boolean DEFAULT false,
    requires_management_notification boolean DEFAULT false,
    max_resolution_days integer DEFAULT 30,
    escalation_hours integer DEFAULT 72,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_severity_levels_risk_weight_check CHECK (((risk_weight >= 1) AND (risk_weight <= 10)))
);


--
-- PostgreSQL database dump complete
--

