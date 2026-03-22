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
-- Name: ncr_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    numbering jsonb DEFAULT '{"prefix": "NCR", "separator": "-", "include_year": true, "include_month": false, "reset_sequence": "yearly", "sequence_digits": 4, "current_sequence": 0, "include_department": false}'::jsonb,
    default_timelines jsonb DEFAULT '{"verification_days": 14, "investigation_days": 7, "corrective_action_days": 30, "initial_response_hours": 24}'::jsonb,
    auto_escalation jsonb DEFAULT '{"enabled": true, "notify_before_days": [3, 1], "escalate_after_days": 7}'::jsonb,
    closure_settings jsonb DEFAULT '{"approver_roles": ["quality_manager"], "require_approval": true, "require_all_actions_completed": true, "require_effectiveness_verification": true}'::jsonb,
    integrations jsonb DEFAULT '{"link_to_capa_system": true, "auto_create_from_audit_finding": true, "auto_create_from_lab_rejection": true, "auto_create_from_receiving_rejection": true}'::jsonb,
    attachment_settings jsonb DEFAULT '{"allowed_types": ["image/*", "video/*", "application/pdf"], "max_file_size_mb": 10, "auto_compress_images": true, "require_evidence_photo": false, "max_attachments_per_ncr": 50}'::jsonb,
    print_settings jsonb DEFAULT '{"sections": {"cost": true, "details": true, "basic_info": true, "root_cause": true, "signatures": true, "effectiveness": true, "immediate_action": true, "corrective_actions": true}, "page_size": "A4", "show_logo": true, "orientation": "portrait", "show_signatures": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- PostgreSQL database dump complete
--

