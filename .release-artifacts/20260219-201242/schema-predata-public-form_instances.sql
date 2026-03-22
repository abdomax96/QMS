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
-- Name: form_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_instances (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    template_id uuid,
    folder_id uuid,
    name text NOT NULL,
    batch_number text,
    batch_info jsonb DEFAULT '{}'::jsonb,
    data jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    submitted_at timestamp with time zone,
    submitted_by uuid,
    company_id uuid,
    form_data jsonb DEFAULT '{}'::jsonb,
    calculations jsonb DEFAULT '{}'::jsonb,
    signatures jsonb DEFAULT '{}'::jsonb,
    workflow jsonb DEFAULT '{}'::jsonb,
    template_version text DEFAULT '1.0'::text,
    report_folder_id uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    last_modified_at timestamp with time zone DEFAULT now(),
    department_id uuid,
    review_status text DEFAULT 'pending'::text,
    reviewer_id uuid,
    reviewer_name text,
    reviewed_at timestamp with time zone,
    review_notes text,
    is_locked boolean DEFAULT false,
    locked_at timestamp with time zone,
    locked_by uuid,
    rejection_count integer DEFAULT 0,
    last_rejection_reason text,
    workflow_history jsonb DEFAULT '[]'::jsonb,
    unified_folder_id uuid,
    is_shared boolean DEFAULT false,
    share_source_department_id uuid,
    created_by uuid,
    CONSTRAINT form_instances_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT form_instances_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text, 'pending'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN form_instances.review_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.review_status IS 'Review workflow status: pending, under_review, approved, rejected';


--
-- Name: COLUMN form_instances.is_locked; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.is_locked IS 'Whether the report is locked for editing. True after submission.';


--
-- Name: COLUMN form_instances.workflow_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.workflow_history IS 'JSON array of workflow state transitions for audit purposes';


--
-- Name: COLUMN form_instances.unified_folder_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.unified_folder_id IS 'Reference to the unified folder containing this instance';


--
-- Name: COLUMN form_instances.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.is_shared IS 'Indicates if this instance is shared from another department';


--
-- Name: COLUMN form_instances.share_source_department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_instances.share_source_department_id IS 'Department that shared this instance';


--
-- PostgreSQL database dump complete
--

