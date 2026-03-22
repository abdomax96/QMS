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
-- Name: ncr_hold_sort_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_hold_sort_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    ncr_id uuid NOT NULL,
    sorted_qty numeric(18,4) NOT NULL,
    destroyed_qty numeric(18,4) DEFAULT 0 NOT NULL,
    sorted_at timestamp with time zone DEFAULT now() NOT NULL,
    sorted_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ncr_hold_sort_logs_destroyed_lte_sorted CHECK ((destroyed_qty <= sorted_qty)),
    CONSTRAINT ncr_hold_sort_logs_destroyed_qty_check CHECK ((destroyed_qty >= (0)::numeric)),
    CONSTRAINT ncr_hold_sort_logs_sorted_qty_check CHECK ((sorted_qty > (0)::numeric))
);


--
-- PostgreSQL database dump complete
--

