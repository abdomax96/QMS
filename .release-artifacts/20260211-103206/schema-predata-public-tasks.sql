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
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    task_number text,
    task_type text DEFAULT 'general'::text,
    priority text DEFAULT 'medium'::text,
    assigned_to uuid,
    assigned_to_name text,
    assigned_by uuid,
    assigned_by_name text,
    assigned_at timestamp with time zone,
    department text,
    company_id uuid,
    related_entity_type text,
    related_entity_id uuid,
    due_date date,
    start_date date,
    completed_at timestamp with time zone,
    status text DEFAULT 'pending'::text,
    completion_notes text,
    completed_by uuid,
    completed_by_name text,
    requires_verification boolean DEFAULT false,
    verified_by uuid,
    verified_by_name text,
    verified_at timestamp with time zone,
    verification_notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    created_by_name text,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'on_hold'::text, 'completed'::text, 'cancelled'::text, 'overdue'::text]))),
    CONSTRAINT tasks_task_type_check CHECK ((task_type = ANY (ARRAY['general'::text, 'corrective_action'::text, 'preventive_action'::text, 'audit'::text, 'inspection'::text, 'maintenance'::text, 'training'::text, 'documentation'::text, 'review'::text, 'other'::text])))
);


--
-- PostgreSQL database dump complete
--

