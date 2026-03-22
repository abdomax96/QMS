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
-- Name: content_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_type text NOT NULL,
    content_id uuid NOT NULL,
    shared_by_user_id uuid NOT NULL,
    shared_by_department_id uuid,
    share_type text NOT NULL,
    shared_with_departments uuid[] DEFAULT ARRAY[]::uuid[],
    shared_with_users uuid[] DEFAULT ARRAY[]::uuid[],
    shared_with_roles uuid[] DEFAULT ARRAY[]::uuid[],
    auto_assign_to_new_role_members boolean DEFAULT true,
    permission_level text DEFAULT 'view'::text,
    custom_permissions jsonb DEFAULT jsonb_build_object('can_view', true, 'can_download', true, 'can_comment', false, 'can_edit', false, 'can_delete', false, 'can_share', false, 'can_export', true),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    require_password boolean DEFAULT false,
    password_hash text,
    max_views integer,
    current_views integer DEFAULT 0,
    title text,
    note text,
    tags text[],
    notify_on_access boolean DEFAULT false,
    notify_on_edit boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone,
    access_count integer DEFAULT 0,
    stats jsonb DEFAULT jsonb_build_object('total_views', 0, 'unique_viewers', 0, 'comments_count', 0, 'edits_count', 0),
    CONSTRAINT content_shares_access_count_positive CHECK ((access_count >= 0)),
    CONSTRAINT content_shares_content_type_check CHECK ((content_type = ANY (ARRAY['folder'::text, 'form_template'::text, 'form_instance'::text, 'report'::text]))),
    CONSTRAINT content_shares_current_views_positive CHECK ((current_views >= 0)),
    CONSTRAINT content_shares_max_views_positive CHECK (((max_views IS NULL) OR (max_views > 0))),
    CONSTRAINT content_shares_permission_level_check CHECK ((permission_level = ANY (ARRAY['view'::text, 'comment'::text, 'edit'::text, 'full'::text]))),
    CONSTRAINT content_shares_share_target_check CHECK (
CASE share_type
    WHEN 'department'::text THEN (cardinality(shared_with_departments) > 0)
    WHEN 'user'::text THEN (cardinality(shared_with_users) > 0)
    WHEN 'role'::text THEN (cardinality(shared_with_roles) > 0)
    WHEN 'public'::text THEN true
    ELSE false
END),
    CONSTRAINT content_shares_share_type_check CHECK ((share_type = ANY (ARRAY['department'::text, 'user'::text, 'role'::text, 'public'::text])))
);


--
-- Name: TABLE content_shares; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.content_shares IS 'Advanced 3-level sharing system (Department/User/Role) for content';


--
-- PostgreSQL database dump complete
--

