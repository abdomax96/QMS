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
-- Name: _backup_report_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._backup_report_folders (
    id uuid,
    name text,
    name_en text,
    description text,
    icon text,
    color text,
    parent_id uuid,
    path text,
    sort_order integer,
    created_at timestamp with time zone,
    created_by uuid,
    updated_at timestamp with time zone,
    company_id uuid,
    is_system boolean,
    metadata jsonb,
    archived boolean,
    archived_at timestamp with time zone,
    archived_by uuid,
    version integer,
    last_modified_by uuid
);


--
-- PostgreSQL database dump complete
--

