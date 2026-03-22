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
-- Name: module_data_visibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_data_visibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_code text NOT NULL,
    department_id uuid,
    visibility_scope text DEFAULT 'private'::text NOT NULL,
    cross_dept_read_only boolean DEFAULT true,
    shared_with_departments uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT module_data_visibility_visibility_scope_check CHECK ((visibility_scope = ANY (ARRAY['private'::text, 'shared'::text, 'all'::text])))
);


--
-- Name: TABLE module_data_visibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.module_data_visibility IS 'DEPRECATED 2026-01-01: Use visibility_departments in department_module_access instead. Backup: _backup_module_data_visibility_20260101. Will be dropped in Phase 3.';


--
-- PostgreSQL database dump complete
--

