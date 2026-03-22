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
-- Name: lab_test_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_config_id uuid NOT NULL,
    field_key text NOT NULL,
    label text NOT NULL,
    label_ar text NOT NULL,
    field_type text NOT NULL,
    field_options jsonb DEFAULT '{}'::jsonb,
    display_order integer DEFAULT 0,
    is_required boolean DEFAULT false,
    default_value text,
    is_evaluable boolean DEFAULT false,
    spec_min_value numeric(10,4),
    spec_max_value numeric(10,4),
    spec_target_value numeric(10,4),
    spec_unit text,
    spec_tolerance numeric(10,4),
    spec_evaluation_mode text DEFAULT 'range'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- PostgreSQL database dump complete
--

