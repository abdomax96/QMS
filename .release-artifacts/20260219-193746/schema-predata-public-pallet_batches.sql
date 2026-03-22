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
-- Name: pallet_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_number text NOT NULL,
    company_id uuid NOT NULL,
    product_id uuid NOT NULL,
    production_date date DEFAULT CURRENT_DATE NOT NULL,
    form_instance_id uuid,
    status text DEFAULT 'active'::text,
    is_rework boolean DEFAULT false,
    parent_batch_id uuid,
    total_pallets integer DEFAULT 0,
    total_cartons integer DEFAULT 0,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT pallet_batches_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- PostgreSQL database dump complete
--

