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
-- Name: ncr_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    ncr_id uuid NOT NULL,
    sender_id uuid,
    sender_name text,
    sender_department_id uuid,
    sender_department_name text,
    message_type text DEFAULT 'text'::text,
    content text,
    rich_content jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    mentions jsonb DEFAULT '[]'::jsonb,
    read_by jsonb DEFAULT '[]'::jsonb,
    reply_to_id uuid,
    thread_id uuid,
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_messages_message_type_check CHECK ((message_type = ANY (ARRAY['text'::text, 'attachment'::text, 'proposal'::text, 'decision'::text, 'system'::text, 'transfer_request'::text, 'approval_request'::text])))
);


--
-- PostgreSQL database dump complete
--

