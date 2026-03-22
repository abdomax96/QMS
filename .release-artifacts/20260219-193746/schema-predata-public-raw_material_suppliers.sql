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
-- Name: raw_material_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_suppliers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    raw_material_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    company_id uuid,
    is_primary boolean DEFAULT false,
    approval_status text DEFAULT 'approved'::text,
    approval_date date,
    approved_by text,
    approval_notes text,
    valid_from date DEFAULT CURRENT_DATE,
    valid_until date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT raw_material_suppliers_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'rejected'::text])))
);


--
-- PostgreSQL database dump complete
--

