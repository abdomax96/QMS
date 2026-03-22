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
-- Name: loading_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loading_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    company_id uuid NOT NULL,
    loading_strategy text,
    planned_pallets integer,
    planned_cartons integer,
    actual_pallets integer DEFAULT 0,
    actual_cartons integer DEFAULT 0,
    status text DEFAULT 'planned'::text,
    planned_date date DEFAULT CURRENT_DATE,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_by uuid,
    loaded_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT loading_operations_loading_strategy_check CHECK ((loading_strategy = ANY (ARRAY['fifo'::text, 'fefo'::text, 'random'::text, 'specific'::text]))),
    CONSTRAINT loading_operations_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- PostgreSQL database dump complete
--

