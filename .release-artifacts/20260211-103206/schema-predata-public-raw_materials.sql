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
-- Name: raw_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_materials (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    code text,
    category text,
    supplier_id uuid,
    unit text,
    allergens jsonb DEFAULT '[]'::jsonb,
    specifications jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    packaging_options text[] DEFAULT '{}'::text[],
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    storage_condition text,
    shelf_life integer,
    requires_lab_test boolean DEFAULT true
);


--
-- Name: COLUMN raw_materials.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.raw_materials.supplier_id IS 'DEPRECATED [2025-12-28]: Use raw_material_suppliers junction table.';


--
-- PostgreSQL database dump complete
--

