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
-- Name: ncr_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    action text NOT NULL,
    action_category text,
    action_details jsonb,
    previous_values jsonb,
    new_values jsonb,
    performed_by_id uuid,
    performed_by_name text,
    performed_by_department text,
    performed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    CONSTRAINT ncr_audit_log_action_category_check CHECK ((action_category = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'status_change'::text, 'stage_change'::text, 'assignment'::text, 'approval'::text, 'rejection'::text, 'escalation'::text, 'transfer'::text, 'comment'::text, 'attachment'::text, 'cost'::text, 'other'::text])))
);


--
-- PostgreSQL database dump complete
--

