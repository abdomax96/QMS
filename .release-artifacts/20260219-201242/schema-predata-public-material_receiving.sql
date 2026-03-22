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
-- Name: material_receiving; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_receiving (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    receiving_number text NOT NULL,
    material_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    material_name text NOT NULL,
    material_code text,
    batch_number text NOT NULL,
    lot_number text,
    supplier_id uuid,
    supplier_name text NOT NULL,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    packaging_type text,
    production_date date,
    expiry_date date,
    received_at timestamp with time zone DEFAULT now(),
    received_by text NOT NULL,
    received_by_name text,
    delivery_note_number text,
    invoice_number text,
    certificate_of_analysis text,
    inspection_required boolean DEFAULT true,
    inspected_by text,
    inspected_at timestamp with time zone,
    inspection_notes text,
    lab_test_id uuid,
    lab_test_status text,
    storage_location text,
    storage_condition text,
    accepted_quantity numeric,
    rejected_quantity numeric,
    rejection_reason text,
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    raw_material_id uuid,
    test_requirements_snapshot jsonb DEFAULT '[]'::jsonb,
    supplier_approval_snapshot jsonb DEFAULT '{}'::jsonb,
    vehicle_inspection jsonb,
    initial_test_results jsonb,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    CONSTRAINT material_receiving_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'inspecting'::text, 'accepted'::text, 'rejected'::text, 'partial'::text, 'cancelled'::text, 'in_progress'::text, 'completed'::text, 'on_hold'::text, 'approved'::text, 'draft'::text, 'received'::text, 'stored'::text, 'released'::text, 'in_testing'::text])))
);


--
-- Name: COLUMN material_receiving.vehicle_inspection; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.material_receiving.vehicle_inspection IS 'فحص سيارة النقل - تخزين بيانات فحص السيارة كـ JSON';


--
-- Name: COLUMN material_receiving.initial_test_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.material_receiving.initial_test_results IS 'نتائج الفحص الأولية عند الاستلام';


--
-- PostgreSQL database dump complete
--

