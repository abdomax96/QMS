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
-- Name: lab_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_samples (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sample_number text NOT NULL,
    sample_type text NOT NULL,
    source_id text,
    source_name text NOT NULL,
    collected_by text NOT NULL,
    collected_at timestamp with time zone NOT NULL,
    quantity text,
    unit text,
    storage_condition text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- PostgreSQL database dump complete
--

