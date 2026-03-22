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
-- Name: unified_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_en text,
    type text NOT NULL,
    department_id uuid,
    is_default_for_department boolean DEFAULT false,
    parent_id uuid,
    path text NOT NULL,
    depth integer DEFAULT 0,
    icon text DEFAULT '📁'::text,
    color text DEFAULT '#6B7280'::text,
    cover_image text,
    content_types text[] DEFAULT ARRAY['forms'::text, 'reports'::text],
    description text,
    tags text[],
    is_favorite boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    is_public boolean DEFAULT false,
    is_system boolean DEFAULT false,
    visibility_scope text DEFAULT 'department'::text,
    stats jsonb DEFAULT jsonb_build_object('total_items', 0, 'forms_count', 0, 'reports_count', 0, 'last_activity', NULL::unknown),
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer DEFAULT 1,
    CONSTRAINT unified_folders_depth_positive CHECK ((depth >= 0)),
    CONSTRAINT unified_folders_name_not_empty CHECK ((TRIM(BOTH FROM name) <> ''::text)),
    CONSTRAINT unified_folders_sort_order_positive CHECK ((sort_order >= 0)),
    CONSTRAINT unified_folders_type_check CHECK ((type = ANY (ARRAY['standard'::text, 'project'::text, 'department'::text, 'client'::text, 'date-based'::text, 'report-group'::text, 'system'::text, 'custom'::text]))),
    CONSTRAINT unified_folders_visibility_scope_check CHECK ((visibility_scope = ANY (ARRAY['private'::text, 'department'::text, 'company'::text, 'custom'::text])))
);


--
-- Name: TABLE unified_folders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unified_folders IS 'Unified folder system for forms and reports with department isolation';


--
-- Name: COLUMN unified_folders.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unified_folders.type IS 'Type of the folder: standard, project, department, client, date-based, report-group, system, custom';


--
-- PostgreSQL database dump complete
--

