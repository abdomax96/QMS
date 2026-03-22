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
-- Name: department_module_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_module_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    module_code text NOT NULL,
    is_enabled boolean DEFAULT true,
    custom_isolation_mode text,
    granted_actions text[] DEFAULT ARRAY['view'::text],
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    stage_code text,
    visibility_departments uuid[] DEFAULT '{}'::uuid[],
    last_changed_by uuid,
    last_changed_reason text,
    change_count integer DEFAULT 0,
    CONSTRAINT department_module_access_custom_isolation_mode_check CHECK ((custom_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, NULL::text])))
);


--
-- PostgreSQL database dump complete
--

