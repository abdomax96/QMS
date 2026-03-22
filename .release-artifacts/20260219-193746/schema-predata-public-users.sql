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
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    name text,
    title text,
    department text,
    roles text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    phone text,
    display_name text,
    permissions jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    company_id uuid,
    department_id uuid,
    job_title_id uuid,
    CONSTRAINT check_users_has_roles CHECK (((roles IS NOT NULL) AND (array_length(roles, 1) > 0)))
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN users.department; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.department IS 'DEPRECATED: Use user_departments junction table + departments table instead.';


--
-- Name: COLUMN users.roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.roles IS 'DEPRECATED: Use user_roles junction table instead.';


--
-- Name: COLUMN users.permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.permissions IS 'DEPRECATED: Use role_permissions table instead.';


--
-- Name: CONSTRAINT check_users_has_roles ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT check_users_has_roles ON public.users IS 'Ensures every user has at least one role. Default should be viewer.';


--
-- PostgreSQL database dump complete
--

