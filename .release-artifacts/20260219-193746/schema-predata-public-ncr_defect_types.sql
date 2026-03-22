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
-- Name: ncr_defect_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_defect_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    category_id uuid,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    description text,
    inspection_method text,
    acceptance_criteria jsonb,
    rejection_criteria jsonb,
    is_critical boolean DEFAULT false,
    requires_quarantine boolean DEFAULT false,
    default_severity_id uuid,
    images text[],
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- PostgreSQL database dump complete
--

