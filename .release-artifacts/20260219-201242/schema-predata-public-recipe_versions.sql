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
-- Name: recipe_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    version_number numeric(4,1) DEFAULT 1.0 NOT NULL,
    name text NOT NULL,
    name_en text,
    ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    mixing_steps jsonb DEFAULT '[]'::jsonb,
    notes text,
    change_type text DEFAULT 'created'::text NOT NULL,
    change_summary text,
    change_details jsonb,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_until timestamp with time zone,
    created_by uuid,
    created_by_name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE recipe_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recipe_versions IS 'سجل إصدارات الوصفات - يحتفظ بنسخة كاملة من كل إصدار';


--
-- PostgreSQL database dump complete
--

