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
-- Name: document_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    company_id uuid NOT NULL,
    version integer NOT NULL,
    content text,
    file_path text,
    file_name text,
    file_size integer,
    file_type text,
    changes_summary text,
    change_reason text,
    status text DEFAULT 'draft'::text,
    created_by uuid,
    reviewed_by uuid,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    approved_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text])))
);


--
-- PostgreSQL database dump complete
--

