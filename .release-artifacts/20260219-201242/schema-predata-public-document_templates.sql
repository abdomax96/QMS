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
-- Name: document_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    name_ar text,
    type text NOT NULL,
    content text,
    header_content text,
    footer_content text,
    page_margins jsonb DEFAULT '{"top": 20, "left": 20, "right": 20, "bottom": 20}'::jsonb,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_templates_type_check CHECK ((type = ANY (ARRAY['sop'::text, 'work_instruction'::text, 'manual'::text, 'form'::text, 'policy'::text, 'specification'::text, 'other'::text])))
);


--
-- PostgreSQL database dump complete
--

