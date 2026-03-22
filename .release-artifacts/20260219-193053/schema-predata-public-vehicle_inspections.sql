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
-- Name: vehicle_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    cleanliness_status text,
    temperature_celsius numeric(5,2),
    general_condition text,
    inspection_notes text,
    defects_found text[],
    photos_urls text[],
    overall_status text DEFAULT 'pending'::text,
    inspected_by uuid,
    inspected_at timestamp with time zone DEFAULT now(),
    inspector_signature text,
    CONSTRAINT vehicle_inspections_cleanliness_status_check CHECK ((cleanliness_status = ANY (ARRAY['pass'::text, 'fail'::text]))),
    CONSTRAINT vehicle_inspections_general_condition_check CHECK ((general_condition = ANY (ARRAY['good'::text, 'acceptable'::text, 'poor'::text]))),
    CONSTRAINT vehicle_inspections_overall_status_check CHECK ((overall_status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text])))
);


--
-- PostgreSQL database dump complete
--

