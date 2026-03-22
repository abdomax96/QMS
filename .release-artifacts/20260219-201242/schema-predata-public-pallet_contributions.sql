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
-- Name: pallet_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pallet_id uuid NOT NULL,
    shift text NOT NULL,
    shift_date date NOT NULL,
    form_instance_id uuid,
    cartons_added integer NOT NULL,
    operator_id uuid,
    operator_name text,
    added_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pallet_contributions_cartons_added_check CHECK ((cartons_added > 0))
);


--
-- PostgreSQL database dump complete
--

