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
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    code text,
    created_at timestamp with time zone DEFAULT now(),
    name_en text,
    description text,
    sort_order integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now(),
    name_ar text,
    description_ar text,
    color text DEFAULT '#6B7280'::text,
    icon text DEFAULT 'Building2'::text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 50,
    parent_department_id uuid,
    manager_user_id uuid,
    created_by uuid,
    updated_by uuid,
    version integer DEFAULT 1 NOT NULL
);


--
-- PostgreSQL database dump complete
--

