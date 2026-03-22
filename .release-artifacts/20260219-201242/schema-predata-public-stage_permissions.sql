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
-- Name: stage_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stage_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    module_code text NOT NULL,
    stage_code text NOT NULL,
    action text NOT NULL,
    is_granted boolean DEFAULT false,
    granted_at timestamp with time zone DEFAULT now(),
    granted_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE stage_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stage_permissions IS 'Stage-based permissions linking roles to specific module stages and actions';


--
-- PostgreSQL database dump complete
--

