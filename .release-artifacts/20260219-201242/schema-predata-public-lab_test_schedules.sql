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
-- Name: lab_test_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_config_id uuid NOT NULL,
    schedule_type text NOT NULL,
    frequency_value integer,
    frequency_unit text,
    start_time time without time zone,
    end_time time without time zone,
    days_of_week integer[],
    linked_batch_id uuid,
    linked_product_id uuid,
    is_active boolean DEFAULT true,
    paused_at timestamp with time zone,
    paused_reason text,
    paused_by uuid,
    resumed_at timestamp with time zone,
    assigned_department_id uuid,
    assigned_user_ids uuid[] DEFAULT '{}'::uuid[],
    notify_before_minutes integer DEFAULT 15,
    auto_create_run boolean DEFAULT false,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- PostgreSQL database dump complete
--

