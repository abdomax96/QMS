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
-- Name: ncr_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    filename text NOT NULL,
    original_filename text,
    file_type text,
    mime_type text,
    file_size integer,
    file_url text NOT NULL,
    thumbnail_url text,
    attachment_category text DEFAULT 'evidence'::text,
    description text,
    is_primary boolean DEFAULT false,
    location jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    uploaded_by_id uuid,
    uploaded_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deleted_by_id uuid,
    CONSTRAINT ncr_attachments_attachment_category_check CHECK ((attachment_category = ANY (ARRAY['evidence'::text, 'before'::text, 'after'::text, 'document'::text, 'analysis'::text, 'certificate'::text, 'other'::text]))),
    CONSTRAINT ncr_attachments_file_type_check CHECK ((file_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'other'::text])))
);


--
-- PostgreSQL database dump complete
--

