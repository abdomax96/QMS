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
-- Name: audit_trail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_trail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    entity_name text,
    user_id uuid,
    user_email text,
    user_name text,
    user_role text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text,
    session_id text,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    reason text,
    parent_entity_type text,
    parent_entity_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    checksum text NOT NULL,
    previous_checksum text,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_trail_action_check CHECK ((action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DELETE'::text, 'RESTORE'::text, 'ARCHIVE'::text, 'UNARCHIVE'::text, 'MOVE'::text, 'COPY'::text, 'APPROVE'::text, 'REJECT'::text, 'SUBMIT'::text, 'SIGN'::text, 'LOGIN'::text, 'LOGOUT'::text, 'PERMISSION_CHANGE'::text]))),
    CONSTRAINT audit_trail_entity_type_check CHECK ((entity_type = ANY (ARRAY['folder'::text, 'template_folder'::text, 'report_folder'::text, 'form_template'::text, 'form_instance'::text, 'user'::text, 'role'::text, 'permission'::text, 'ncr'::text, 'lab_test'::text, 'material_receiving'::text, 'raw_material'::text, 'supplier'::text, 'product'::text])))
);


--
-- PostgreSQL database dump complete
--

