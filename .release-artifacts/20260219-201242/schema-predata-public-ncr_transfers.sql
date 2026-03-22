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
-- Name: ncr_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    transfer_number integer NOT NULL,
    from_department_id uuid,
    from_department_name text,
    from_user_id uuid,
    to_department_id uuid,
    to_department_name text,
    to_user_id uuid,
    transfer_reason text,
    transfer_notes text,
    required_action text,
    status text DEFAULT 'pending'::text,
    accepted_at timestamp with time zone,
    accepted_by_id uuid,
    rejection_reason text,
    completed_at timestamp with time zone,
    completion_notes text,
    completion_result jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deadline timestamp with time zone,
    CONSTRAINT ncr_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'completed'::text, 'returned'::text]))),
    CONSTRAINT ncr_transfers_transfer_reason_check CHECK ((transfer_reason = ANY (ARRAY['needs_expertise'::text, 'shared_responsibility'::text, 'dispute_mediation'::text, 'escalation'::text, 'reassignment'::text, 'follow_up_required'::text])))
);


--
-- PostgreSQL database dump complete
--

