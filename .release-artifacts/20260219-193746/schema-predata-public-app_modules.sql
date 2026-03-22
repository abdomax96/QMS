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
-- Name: app_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    icon text DEFAULT 'Box'::text,
    color text DEFAULT '#6B7280'::text,
    display_order integer DEFAULT 1,
    is_active boolean DEFAULT true,
    data_isolation_mode text DEFAULT 'shared'::text,
    supports_sharing boolean DEFAULT false,
    available_actions text[] DEFAULT ARRAY['view'::text],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_module_code text,
    module_type text DEFAULT 'core'::text,
    is_department_scoped boolean DEFAULT true,
    CONSTRAINT app_modules_data_isolation_mode_check CHECK ((data_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, 'hybrid'::text]))),
    CONSTRAINT app_modules_module_type_check CHECK ((module_type = ANY (ARRAY['core'::text, 'extension'::text, 'stage'::text])))
);


--
-- PostgreSQL database dump complete
--

