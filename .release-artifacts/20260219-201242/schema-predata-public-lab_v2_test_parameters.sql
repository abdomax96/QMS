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
-- Name: lab_v2_test_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_test_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    param_key text NOT NULL,
    label text NOT NULL,
    label_ar text,
    data_type text NOT NULL,
    is_required boolean DEFAULT false,
    display_order integer DEFAULT 0,
    unit text,
    min_value numeric(12,4),
    max_value numeric(12,4),
    allowed_values jsonb,
    default_value text,
    help_text text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lab_v2_test_parameters_data_type_check CHECK ((data_type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'time'::text, 'dropdown'::text, 'multi_select'::text])))
);


--
-- PostgreSQL database dump complete
--

