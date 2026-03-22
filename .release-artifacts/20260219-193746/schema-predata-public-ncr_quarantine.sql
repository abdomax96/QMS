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
-- Name: ncr_quarantine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_quarantine (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid NOT NULL,
    item_type text NOT NULL,
    item_id uuid,
    item_name text NOT NULL,
    item_code text,
    batch_number text,
    lot_number text,
    quantity numeric(12,3) NOT NULL,
    unit text NOT NULL,
    unit_value numeric(12,2),
    total_value numeric(12,2),
    quarantine_location_id uuid,
    quarantine_location_name text,
    original_location_name text,
    status text DEFAULT 'quarantined'::text,
    quarantine_date timestamp with time zone DEFAULT now(),
    quarantine_by_id uuid,
    quarantine_by_name text,
    quarantine_reason text,
    disposition text,
    disposition_reason text,
    disposition_date timestamp with time zone,
    disposition_by_id uuid,
    disposition_by_name text,
    disposition_approved_by_id uuid,
    disposition_approved_by_name text,
    disposition_approved_at timestamp with time zone,
    release_date timestamp with time zone,
    release_by_id uuid,
    release_by_name text,
    release_notes text,
    release_destination text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_quarantine_disposition_check CHECK ((disposition = ANY (ARRAY['use_as_is'::text, 'rework'::text, 'regrade'::text, 'return_supplier'::text, 'scrap'::text, 'donate'::text, 'other'::text]))),
    CONSTRAINT ncr_quarantine_item_type_check CHECK ((item_type = ANY (ARRAY['raw_material'::text, 'wip'::text, 'finished_product'::text, 'packaging'::text]))),
    CONSTRAINT ncr_quarantine_status_check CHECK ((status = ANY (ARRAY['quarantined'::text, 'under_review'::text, 'released'::text, 'rejected'::text, 'disposed'::text, 'reworked'::text, 'returned'::text])))
);


--
-- PostgreSQL database dump complete
--

