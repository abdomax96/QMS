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
-- Name: role_action_restrictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_action_restrictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    module_code text NOT NULL,
    stage_code text,
    denied_actions text[] DEFAULT '{}'::text[],
    allowed_actions text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT role_action_mode CHECK (((denied_actions = '{}'::text[]) OR (allowed_actions = '{}'::text[])))
);


--
-- Name: TABLE role_action_restrictions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role_action_restrictions IS 'Phase 1: Roles restrict actions within department-granted modules. Department-first permission model.';


--
-- PostgreSQL database dump complete
--

