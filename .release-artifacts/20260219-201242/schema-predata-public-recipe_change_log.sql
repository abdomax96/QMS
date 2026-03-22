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
-- Name: recipe_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    version_id uuid,
    action text NOT NULL,
    field_changed text,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid,
    changed_by_name text,
    changed_at timestamp with time zone DEFAULT now(),
    reason text,
    session_id text,
    ip_address inet
);


--
-- Name: TABLE recipe_change_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recipe_change_log IS 'سجل التغييرات التفصيلي للوصفات';


--
-- PostgreSQL database dump complete
--

