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
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    document_number text NOT NULL,
    title text NOT NULL,
    title_ar text,
    description text,
    type text NOT NULL,
    category text,
    department_id uuid,
    current_version integer DEFAULT 1,
    status text DEFAULT 'draft'::text,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    obsolete_at timestamp with time zone,
    category_id uuid,
    template_id uuid,
    CONSTRAINT documents_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'obsolete'::text, 'archived'::text]))),
    CONSTRAINT documents_type_check CHECK ((type = ANY (ARRAY['sop'::text, 'work_instruction'::text, 'manual'::text, 'form'::text, 'policy'::text, 'specification'::text, 'other'::text])))
);


--
-- PostgreSQL database dump complete
--

