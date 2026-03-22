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
-- Name: lab_v2_chemicals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_chemicals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text,
    supplier text,
    grade text,
    cas_number text,
    storage_conditions text,
    hazard_notes text,
    unit text DEFAULT 'kg'::text,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- PostgreSQL database dump complete
--

