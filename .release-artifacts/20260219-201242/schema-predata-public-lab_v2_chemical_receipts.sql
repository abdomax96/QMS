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
-- Name: lab_v2_chemical_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_v2_chemical_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chemical_id uuid NOT NULL,
    receipt_number text NOT NULL,
    lot_number text,
    batch_number text,
    quantity numeric(10,2) NOT NULL,
    unit text NOT NULL,
    received_date date NOT NULL,
    expiry_date date,
    supplier_source text,
    type text DEFAULT 'reagent_for_test'::text,
    remaining_quantity numeric(10,2),
    status text DEFAULT 'available'::text,
    notes text,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT lab_v2_chemical_receipts_status_check CHECK ((status = ANY (ARRAY['available'::text, 'depleted'::text, 'expired'::text, 'disposed'::text]))),
    CONSTRAINT lab_v2_chemical_receipts_type_check CHECK ((type = ANY (ARRAY['raw_material'::text, 'reagent_for_test'::text, 'other'::text])))
);


--
-- PostgreSQL database dump complete
--

