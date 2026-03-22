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
-- Name: cell_change_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cell_change_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    section_id text NOT NULL,
    table_id text NOT NULL,
    row_index integer NOT NULL,
    col_index integer NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid NOT NULL,
    changed_by_name text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    change_type text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    client_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cell_change_history_change_type_check CHECK ((change_type = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text])))
);


--
-- Name: TABLE cell_change_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cell_change_history IS 'سجل شامل لجميع التعديلات على مستوى الخلية في النماذج - يدعم التعاون في الوقت الفعلي';


--
-- Name: COLUMN cell_change_history.instance_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.instance_id IS 'معرف النموذج (form instance)';


--
-- Name: COLUMN cell_change_history.section_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.section_id IS 'معرف القسم في النموذج';


--
-- Name: COLUMN cell_change_history.table_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.table_id IS 'معرف الجدول في القسم';


--
-- Name: COLUMN cell_change_history.row_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.row_index IS 'رقم الصف (0-indexed)';


--
-- Name: COLUMN cell_change_history.col_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.col_index IS 'رقم العمود (0-indexed)';


--
-- Name: COLUMN cell_change_history.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cell_change_history.version IS 'رقم الإصدار - يزيد تلقائياً لاكتشاف التعارضات';


--
-- PostgreSQL database dump complete
--

