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
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id text DEFAULT 'global'::text NOT NULL,
    departments jsonb DEFAULT '[]'::jsonb,
    users jsonb DEFAULT '[]'::jsonb,
    defect_catalog jsonb DEFAULT '[]'::jsonb,
    products jsonb DEFAULT '[]'::jsonb,
    lines jsonb DEFAULT '[]'::jsonb,
    units jsonb DEFAULT '[]'::jsonb,
    quality_departments jsonb DEFAULT '[]'::jsonb,
    permission_matrix jsonb DEFAULT '{}'::jsonb,
    holds_disposal_policy text DEFAULT 'warning'::text,
    last_backup_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    language text DEFAULT 'ar'::text,
    timezone text DEFAULT 'Asia/Riyadh'::text,
    date_format text DEFAULT 'DD/MM/YYYY'::text,
    theme text DEFAULT 'light'::text,
    logo_url text DEFAULT '/Logo.png'::text,
    logo_scale numeric DEFAULT 1.0,
    main_company_id uuid,
    ncr_document_meta jsonb DEFAULT '{"docCode": "NCR-FRM-01", "issueNo": "1", "issueDate": "2026-01-01", "reviewDate": "2026-12-31", "revisionNo": "0"}'::jsonb
);


--
-- Name: COLUMN settings.main_company_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.settings.main_company_id IS 'Reference to the main company/tenant for this installation';


--
-- PostgreSQL database dump complete
--

