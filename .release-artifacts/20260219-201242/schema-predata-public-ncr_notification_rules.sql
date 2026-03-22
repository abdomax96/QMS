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
-- Name: ncr_notification_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_notification_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name text NOT NULL,
    description text,
    trigger_conditions jsonb DEFAULT '{"on_create": false, "on_comment": false, "on_overdue": false, "on_severity": [], "on_assignment": false, "on_escalation": false, "on_stage_change": [], "overdue_threshold_days": 7}'::jsonb NOT NULL,
    recipients jsonb DEFAULT '{"roles": [], "users": [], "departments": [], "notify_creator": false, "notify_assignee": true, "notify_department_head": false}'::jsonb NOT NULL,
    channels jsonb DEFAULT '{"sms": false, "push": false, "email": true, "in_app": true}'::jsonb,
    notification_template text,
    notification_title_template text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- PostgreSQL database dump complete
--

