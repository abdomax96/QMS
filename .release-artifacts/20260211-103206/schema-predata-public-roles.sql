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
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_ar text,
    description text,
    description_ar text,
    color text DEFAULT '#6B7280'::text,
    priority integer DEFAULT 100,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    code text,
    company_id uuid NOT NULL,
    department text,
    department_ar text,
    is_locked boolean DEFAULT false,
    min_edit_priority integer DEFAULT 100,
    is_deprecated boolean DEFAULT false,
    deprecated_at timestamp with time zone,
    replacement_role_id uuid,
    deprecation_message text,
    category text DEFAULT 'general'::text,
    type text DEFAULT 'custom'::text,
    icon text DEFAULT 'Shield'::text,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'Standard factory roles for QMS system';


--
-- PostgreSQL database dump complete
--

