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
-- Name: ncr_transfer_chain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_transfer_chain (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    chain jsonb DEFAULT '[]'::jsonb,
    total_transfers integer DEFAULT 0,
    total_duration_hours numeric(10,2) DEFAULT 0,
    current_department_id uuid,
    loop_detected boolean DEFAULT false,
    max_transfers_reached boolean DEFAULT false,
    forced_escalation boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- PostgreSQL database dump complete
--

