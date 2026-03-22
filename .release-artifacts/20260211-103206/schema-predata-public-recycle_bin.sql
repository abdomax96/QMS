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
-- Name: recycle_bin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recycle_bin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_id text NOT NULL,
    item_type text NOT NULL,
    name text NOT NULL,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_by uuid,
    original_path text DEFAULT '/'::text,
    original_parent_id text,
    data jsonb NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recycle_bin_item_type_check CHECK ((item_type = ANY (ARRAY['folder'::text, 'template'::text, 'instance'::text])))
);


--
-- Name: TABLE recycle_bin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recycle_bin IS 'Soft-deleted items with 30-day retention before permanent deletion';


--
-- PostgreSQL database dump complete
--

