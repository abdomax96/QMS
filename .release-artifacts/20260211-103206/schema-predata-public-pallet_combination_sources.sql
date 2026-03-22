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
-- Name: pallet_combination_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_combination_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    combination_id uuid NOT NULL,
    source_type text NOT NULL,
    source_pallet_id uuid,
    cartons_taken integer NOT NULL,
    added_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pallet_combination_sources_cartons_taken_check CHECK ((cartons_taken > 0)),
    CONSTRAINT pallet_combination_sources_source_type_check CHECK ((source_type = ANY (ARRAY['pallet'::text, 'production'::text])))
);


--
-- PostgreSQL database dump complete
--

