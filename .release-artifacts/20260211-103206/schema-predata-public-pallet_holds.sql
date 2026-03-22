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
-- Name: pallet_holds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_holds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pallet_id uuid NOT NULL,
    ncr_id uuid NOT NULL,
    hold_quantity integer NOT NULL,
    hold_reason text,
    status text DEFAULT 'active'::text,
    disposition_type text,
    scrapped_quantity integer DEFAULT 0,
    accepted_quantity integer DEFAULT 0,
    reworked_quantity integer DEFAULT 0,
    disposition_notes text,
    held_at timestamp with time zone DEFAULT now(),
    held_by uuid,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT pallet_holds_check CHECK ((((scrapped_quantity + accepted_quantity) + reworked_quantity) <= hold_quantity)),
    CONSTRAINT pallet_holds_disposition_type_check CHECK ((disposition_type = ANY (ARRAY['scrap'::text, 'rework'::text, 'accept'::text]))),
    CONSTRAINT pallet_holds_hold_quantity_check CHECK ((hold_quantity > 0)),
    CONSTRAINT pallet_holds_status_check CHECK ((status = ANY (ARRAY['active'::text, 'released'::text, 'scrapped'::text, 'reworked'::text])))
);


--
-- PostgreSQL database dump complete
--

