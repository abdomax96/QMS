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
-- Name: ncr_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    company_id uuid NOT NULL,
    conversation_type text DEFAULT 'general'::text,
    participants jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'active'::text,
    is_pinned boolean DEFAULT false,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_message_at timestamp with time zone,
    message_count integer DEFAULT 0,
    CONSTRAINT ncr_conversations_conversation_type_check CHECK ((conversation_type = ANY (ARRAY['general'::text, 'investigation'::text, 'root_cause'::text, 'action_plan'::text, 'dispute'::text, 'escalation'::text]))),
    CONSTRAINT ncr_conversations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text, 'closed'::text, 'escalated'::text])))
);


--
-- PostgreSQL database dump complete
--

