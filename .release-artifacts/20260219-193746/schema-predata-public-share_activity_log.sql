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
-- Name: share_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.share_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    share_id uuid NOT NULL,
    activity_type text NOT NULL,
    performed_by uuid,
    performed_by_name text NOT NULL,
    performed_by_department text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT share_activity_log_activity_type_check CHECK ((activity_type = ANY (ARRAY['created'::text, 'accessed'::text, 'downloaded'::text, 'commented'::text, 'edited'::text, 'shared'::text, 'expired'::text, 'revoked'::text, 'viewed'::text])))
);


--
-- Name: TABLE share_activity_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.share_activity_log IS 'Activity log for all share-related actions';


--
-- PostgreSQL database dump complete
--

