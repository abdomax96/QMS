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
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name text NOT NULL,
    name_en text,
    version text DEFAULT '1.0'::text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    ingredients jsonb DEFAULT '[]'::jsonb,
    notes text,
    permissions jsonb DEFAULT '{"edit_roles": ["admin", "manager"], "view_roles": ["admin", "manager", "user"]}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    mixing_steps jsonb DEFAULT '[]'::jsonb,
    current_version_id uuid,
    version_count integer DEFAULT 1,
    last_versioned_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    approval_status text DEFAULT 'draft'::text
);


--
-- Name: COLUMN recipes.mixing_steps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recipes.mixing_steps IS 'خطوات الخلط والتحضير [{step_number, title, description, duration, temperature, equipment, notes}]';


--
-- PostgreSQL database dump complete
--

