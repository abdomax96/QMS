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
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    production_line_id uuid,
    name character varying(255) NOT NULL,
    name_en character varying(255),
    sku character varying(100) NOT NULL,
    barcode character varying(100),
    category character varying(50) DEFAULT 'other'::character varying,
    unit character varying(50) DEFAULT 'قطعة'::character varying,
    shelf_life_days integer,
    storage_conditions text,
    allergens text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    standard_cartons_per_pallet integer DEFAULT 50,
    sop_document_id uuid,
    CONSTRAINT products_standard_cartons_per_pallet_check CHECK ((standard_cartons_per_pallet > 0))
);


--
-- PostgreSQL database dump complete
--

