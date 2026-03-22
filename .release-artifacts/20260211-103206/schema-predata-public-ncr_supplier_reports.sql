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
-- Name: ncr_supplier_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_supplier_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    supplier_id uuid NOT NULL,
    supplier_name text,
    material_id uuid,
    material_name text,
    material_code text,
    batch_number text,
    lot_number text,
    purchase_order_id uuid,
    purchase_order_number text,
    receiving_id uuid,
    receiving_date date,
    defect_description text,
    quantity_affected numeric(12,3),
    unit text,
    requested_action text,
    credit_amount numeric(12,2),
    notification_sent_at timestamp with time zone,
    notification_method text,
    notification_details text,
    supplier_contact_name text,
    supplier_contact_email text,
    supplier_response text,
    supplier_response_at timestamp with time zone,
    supplier_attachments jsonb DEFAULT '[]'::jsonb,
    resolution_status text DEFAULT 'pending'::text,
    resolution_details text,
    resolution_date timestamp with time zone,
    resolved_by_id uuid,
    affects_rating boolean DEFAULT true,
    rating_impact integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ncr_supplier_reports_notification_method_check CHECK ((notification_method = ANY (ARRAY['email'::text, 'phone'::text, 'letter'::text, 'portal'::text]))),
    CONSTRAINT ncr_supplier_reports_rating_impact_check CHECK (((rating_impact >= 0) AND (rating_impact <= 100))),
    CONSTRAINT ncr_supplier_reports_requested_action_check CHECK ((requested_action = ANY (ARRAY['replace'::text, 'refund'::text, 'rework'::text, 'credit_note'::text, 'investigation'::text, 'none'::text]))),
    CONSTRAINT ncr_supplier_reports_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['pending'::text, 'notified'::text, 'in_progress'::text, 'resolved'::text, 'rejected'::text, 'escalated'::text])))
);


--
-- PostgreSQL database dump complete
--

