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
-- Name: lab_v2_run_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_run_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    parameter_id uuid NOT NULL,
    param_key text NOT NULL,
    value text,
    numeric_value numeric(12,4),
    evaluation_result text,
    out_of_spec boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    measurement_id uuid NOT NULL,
    CONSTRAINT lab_v2_run_values_evaluation_result_check CHECK ((evaluation_result = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'na'::text])))
);


--
-- PostgreSQL database dump complete
--

