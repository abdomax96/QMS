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
-- Name: pallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pallet_number text NOT NULL,
    sequence_number integer NOT NULL,
    batch_id uuid NOT NULL,
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    standard_cartons_per_pallet integer NOT NULL,
    actual_cartons integer DEFAULT 0 NOT NULL,
    target_cartons integer NOT NULL,
    status text DEFAULT 'partial'::text,
    hold_quantity integer DEFAULT 0,
    ncr_id uuid,
    location text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    finished_at timestamp with time zone,
    completed_at timestamp with time zone,
    released_at timestamp with time zone,
    CONSTRAINT pallets_status_check CHECK ((status = ANY (ARRAY['partial'::text, 'complete'::text, 'hold'::text, 'partial_hold'::text, 'loaded'::text, 'partial_load'::text, 'scrapped'::text])))
);


--
-- Name: TABLE pallets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pallets IS 'V1 Pallet management - Core pallet tracking without V2 rework/destruction features';


--
-- PostgreSQL database dump complete
--

