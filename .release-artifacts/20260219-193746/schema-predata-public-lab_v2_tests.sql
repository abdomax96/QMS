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
-- Name: lab_v2_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text,
    category text,
    description text,
    method_description text,
    method_standard text,
    sop_document_id uuid,
    scope text DEFAULT 'global'::text,
    linked_company_id uuid,
    linked_product_id uuid,
    estimated_duration_minutes integer,
    requires_approval boolean DEFAULT true,
    is_active boolean DEFAULT true,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT lab_v2_tests_scope_check CHECK ((scope = ANY (ARRAY['global'::text, 'company'::text, 'product'::text])))
);


--
-- PostgreSQL database dump complete
--

