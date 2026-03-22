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
-- Name: ncr_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    action_number integer NOT NULL,
    action_type text NOT NULL,
    title text NOT NULL,
    description text,
    expected_outcome text,
    assigned_to_id uuid,
    assigned_to_name text,
    assigned_department_id uuid,
    assigned_department_name text,
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    status text DEFAULT 'planned'::text,
    priority text DEFAULT 'medium'::text,
    progress_percentage integer DEFAULT 0,
    progress_notes jsonb DEFAULT '[]'::jsonb,
    verification_required boolean DEFAULT true,
    verified_by_id uuid,
    verified_by_name text,
    verified_at timestamp with time zone,
    verification_result text,
    verification_notes text,
    cost_estimate numeric(12,2),
    actual_cost numeric(12,2),
    attachments jsonb DEFAULT '[]'::jsonb,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_actions_action_type_check CHECK ((action_type = ANY (ARRAY['immediate'::text, 'corrective'::text, 'preventive'::text]))),
    CONSTRAINT ncr_actions_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ncr_actions_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
    CONSTRAINT ncr_actions_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'verified'::text, 'cancelled'::text]))),
    CONSTRAINT ncr_actions_verification_result_check CHECK ((verification_result = ANY (ARRAY['effective'::text, 'partially_effective'::text, 'not_effective'::text])))
);


--
-- PostgreSQL database dump complete
--

