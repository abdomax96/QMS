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
-- Name: report_review_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_review_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    action text NOT NULL,
    from_status text,
    to_status text,
    performed_by uuid,
    performed_by_name text NOT NULL,
    performed_by_email text,
    performed_by_role text,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    field_changes jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    checksum text NOT NULL,
    previous_checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_review_history_action_check CHECK ((action = ANY (ARRAY['created'::text, 'submitted'::text, 'claimed'::text, 'approved'::text, 'rejected'::text, 'resubmitted'::text, 'reopened'::text, 'edited_by_reviewer'::text, 'field_changed'::text, 'archived'::text, 'comment_added'::text])))
);


--
-- Name: TABLE report_review_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_review_history IS 'Immutable audit trail for report review workflow - cannot be modified or deleted';


--
-- Name: COLUMN report_review_history.checksum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.report_review_history.checksum IS 'SHA-256 hash for integrity verification';


--
-- Name: COLUMN report_review_history.previous_checksum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.report_review_history.previous_checksum IS 'Link to previous record checksum for chain verification';


--
-- PostgreSQL database dump complete
--

