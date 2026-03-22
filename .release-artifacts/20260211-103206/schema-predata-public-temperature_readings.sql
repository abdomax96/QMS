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
-- Name: temperature_readings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temperature_readings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    equipment_id uuid,
    temperature numeric NOT NULL,
    unit text DEFAULT 'C'::text,
    status text DEFAULT 'ok'::text,
    recorded_by text,
    notes text,
    recorded_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


--
-- PostgreSQL database dump complete
--

