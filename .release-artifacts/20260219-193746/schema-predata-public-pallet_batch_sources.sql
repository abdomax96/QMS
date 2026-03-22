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
-- Name: pallet_batch_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_batch_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pallet_id uuid NOT NULL,
    source_batch_id uuid NOT NULL,
    cartons_from_batch integer NOT NULL,
    is_primary boolean DEFAULT true,
    added_at timestamp with time zone DEFAULT now(),
    notes text,
    CONSTRAINT pallet_batch_sources_cartons_from_batch_check CHECK ((cartons_from_batch > 0))
);


--
-- PostgreSQL database dump complete
--

