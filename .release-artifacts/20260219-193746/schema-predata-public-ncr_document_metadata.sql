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
-- Name: ncr_document_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_document_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    document_code text NOT NULL,
    document_title text,
    version_number integer DEFAULT 1,
    revision_number integer DEFAULT 0,
    version_string text GENERATED ALWAYS AS (((('V'::text || version_number) || '.'::text) || revision_number)) STORED,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    effective_date date,
    revision_date date,
    next_review_date date,
    expiry_date date,
    prepared_by_id uuid,
    prepared_by_name text,
    prepared_by_title text,
    prepared_at timestamp with time zone,
    reviewed_by_id uuid,
    reviewed_by_name text,
    reviewed_by_title text,
    reviewed_at timestamp with time zone,
    approved_by_id uuid,
    approved_by_name text,
    approved_by_title text,
    approved_at timestamp with time zone,
    document_status text DEFAULT 'draft'::text,
    change_history jsonb DEFAULT '[]'::jsonb,
    confidentiality text DEFAULT 'internal'::text,
    distribution_list uuid[],
    print_count integer DEFAULT 0,
    last_printed_at timestamp with time zone,
    last_printed_by_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_document_metadata_confidentiality_check CHECK ((confidentiality = ANY (ARRAY['public'::text, 'internal'::text, 'confidential'::text, 'restricted'::text]))),
    CONSTRAINT ncr_document_metadata_document_status_check CHECK ((document_status = ANY (ARRAY['draft'::text, 'under_review'::text, 'approved'::text, 'obsolete'::text, 'superseded'::text])))
);


--
-- PostgreSQL database dump complete
--

