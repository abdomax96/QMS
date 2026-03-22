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
-- Name: role_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_a_id uuid NOT NULL,
    role_b_id uuid NOT NULL,
    conflict_reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT role_conflicts_check CHECK ((role_a_id <> role_b_id))
);


--
-- PostgreSQL database dump complete
--

