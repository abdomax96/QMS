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
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'department'::text,
    icon text,
    color text,
    parent_id uuid,
    path text,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    updated_at timestamp with time zone DEFAULT now(),
    permissions jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    stats jsonb DEFAULT '{}'::jsonb,
    name_en text,
    company_id uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    department_id uuid,
    modified_at timestamp with time zone DEFAULT now(),
    is_system boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    description text
);


--
-- PostgreSQL database dump complete
--

