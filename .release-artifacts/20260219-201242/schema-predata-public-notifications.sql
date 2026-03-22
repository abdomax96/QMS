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
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text,
    title text,
    message text,
    ncr_id uuid,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    title_ar text,
    message_ar text,
    category text DEFAULT 'system'::text,
    entity_type text,
    entity_id uuid,
    action_url text,
    read_at timestamp with time zone,
    expires_at timestamp with time zone,
    sender_id uuid,
    sender_name text
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'User notifications for workflow events and system alerts';


--
-- PostgreSQL database dump complete
--

