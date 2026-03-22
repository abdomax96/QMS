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
-- Name: document_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type text NOT NULL,
    document_id uuid NOT NULL,
    shared_by uuid NOT NULL,
    shared_by_department_id uuid,
    shared_with_department_id uuid,
    shared_with_user_id uuid,
    permission_level text DEFAULT 'view'::text,
    expires_at timestamp with time zone,
    note text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_share_target CHECK ((((shared_with_department_id IS NOT NULL) AND (shared_with_user_id IS NULL)) OR ((shared_with_department_id IS NULL) AND (shared_with_user_id IS NOT NULL)))),
    CONSTRAINT document_shares_permission_level_check CHECK ((permission_level = ANY (ARRAY['view'::text, 'edit'::text, 'full'::text])))
);


--
-- PostgreSQL database dump complete
--

