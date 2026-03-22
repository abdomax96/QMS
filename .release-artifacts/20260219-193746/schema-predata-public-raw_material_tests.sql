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
-- Name: raw_material_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_tests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    raw_material_id uuid NOT NULL,
    company_id uuid NOT NULL,
    test_type text NOT NULL,
    test_name text NOT NULL,
    test_name_en text,
    test_method text,
    parameters jsonb DEFAULT '[]'::jsonb,
    acceptance_criteria jsonb DEFAULT '{}'::jsonb,
    rejection_criteria jsonb DEFAULT '{}'::jsonb,
    required boolean DEFAULT true,
    frequency text DEFAULT 'each_batch'::text,
    priority text DEFAULT 'normal'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    criteria_id uuid,
    CONSTRAINT raw_material_tests_test_type_check CHECK ((test_type = ANY (ARRAY['chemical'::text, 'physical'::text, 'microbiological'::text, 'sensory'::text, 'packaging'::text])))
);


--
-- PostgreSQL database dump complete
--

