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
-- Name: form_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    name_en text,
    folder_id uuid,
    table_type text DEFAULT 'samples'::text,
    document_control jsonb DEFAULT '{}'::jsonb,
    batch_config jsonb DEFAULT '{}'::jsonb,
    custom_variables jsonb DEFAULT '{}'::jsonb,
    sections jsonb DEFAULT '{}'::jsonb,
    quality_criteria jsonb DEFAULT '[]'::jsonb,
    signatures jsonb DEFAULT '[]'::jsonb,
    important_notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'draft'::text,
    type text DEFAULT 'form'::text,
    template_type_config jsonb DEFAULT '{}'::jsonb,
    custom_properties jsonb DEFAULT '{}'::jsonb,
    basic_info jsonb DEFAULT '{}'::jsonb,
    batch_configuration jsonb DEFAULT '{}'::jsonb,
    notes text,
    recipe jsonb DEFAULT '[]'::jsonb,
    company_id uuid,
    template_folder_id uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    last_modified_at timestamp with time zone DEFAULT now(),
    department_id uuid,
    unified_folder_id uuid,
    is_shared boolean DEFAULT false,
    share_source_department_id uuid,
    CONSTRAINT form_templates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'deprecated'::text, 'archived'::text, 'published'::text, 'inactive'::text])))
);


--
-- Name: COLUMN form_templates.unified_folder_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_templates.unified_folder_id IS 'Reference to the unified folder containing this template';


--
-- Name: COLUMN form_templates.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_templates.is_shared IS 'Indicates if this template is shared from another department';


--
-- Name: COLUMN form_templates.share_source_department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.form_templates.share_source_department_id IS 'Department that shared this template';


--
-- PostgreSQL database dump complete
--

