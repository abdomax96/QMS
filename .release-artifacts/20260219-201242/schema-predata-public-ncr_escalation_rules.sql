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
-- Name: ncr_escalation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_escalation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    severity_id uuid,
    escalation_levels jsonb DEFAULT '[{"level": 1, "hours_after": 24, "notification": "تذكير بالحالة المعلقة", "escalate_to_role": "supervisor"}, {"level": 2, "hours_after": 48, "notification": "تصعيد الحالة", "escalate_to_role": "manager"}, {"level": 3, "hours_after": 72, "notification": "تصعيد عاجل", "escalate_to_role": "quality_manager"}]'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- PostgreSQL database dump complete
--

