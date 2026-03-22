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
-- Name: ncr_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    ncr_id uuid,
    parent_id uuid,
    content text NOT NULL,
    author_id text,
    author_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    entity_id uuid NOT NULL,
    entity_type text DEFAULT 'ncr'::text NOT NULL,
    author_avatar text,
    edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    reactions jsonb DEFAULT '[]'::jsonb,
    attachments text[] DEFAULT '{}'::text[]
);


--
-- PostgreSQL database dump complete
--

