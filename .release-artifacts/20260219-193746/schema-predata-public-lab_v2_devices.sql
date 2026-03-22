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
-- Name: lab_v2_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text,
    manufacturer text,
    model text,
    serial_number text,
    location text,
    status text DEFAULT 'active'::text,
    calibration_due_date date,
    calibration_interval_days integer DEFAULT 365,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    notes text,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT lab_v2_devices_status_check CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'out_of_service'::text])))
);


--
-- PostgreSQL database dump complete
--

