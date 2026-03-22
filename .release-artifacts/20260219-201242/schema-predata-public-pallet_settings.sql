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
-- Name: pallet_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pallet_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    allow_multiple_batches_per_pallet boolean DEFAULT false,
    default_loading_strategy text DEFAULT 'fifo'::text,
    allow_partial_pallet_loading boolean DEFAULT true,
    require_inspection_before_loading boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    auto_print_on_creation boolean DEFAULT false,
    default_copies integer DEFAULT 1,
    label_template text DEFAULT 'default'::text,
    show_preview_dialog boolean DEFAULT true,
    default_cartons_per_pallet integer DEFAULT 48,
    CONSTRAINT pallet_settings_default_cartons_per_pallet_check CHECK (((default_cartons_per_pallet > 0) AND (default_cartons_per_pallet <= 200))),
    CONSTRAINT pallet_settings_default_copies_check CHECK (((default_copies >= 1) AND (default_copies <= 10))),
    CONSTRAINT pallet_settings_label_template_check CHECK ((label_template = ANY (ARRAY['default'::text, 'compact'::text, 'detailed'::text])))
);


--
-- Name: TABLE pallet_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pallet_settings IS 'Company-wide pallet module settings (V3 - simplified). Product-specific config in product_pallet_config table.';


--
-- Name: COLUMN pallet_settings.allow_multiple_batches_per_pallet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.allow_multiple_batches_per_pallet IS 'Allow mixing cartons from multiple batches in one pallet';


--
-- Name: COLUMN pallet_settings.default_loading_strategy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.default_loading_strategy IS 'Default strategy: fifo, fefo, lifo';


--
-- Name: COLUMN pallet_settings.allow_partial_pallet_loading; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.allow_partial_pallet_loading IS 'Allow loading incomplete pallets';


--
-- Name: COLUMN pallet_settings.require_inspection_before_loading; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.require_inspection_before_loading IS 'Require vehicle inspection before loading starts';


--
-- Name: COLUMN pallet_settings.auto_print_on_creation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.auto_print_on_creation IS 'Automatically print label when pallet is registered';


--
-- Name: COLUMN pallet_settings.default_copies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.default_copies IS 'Default number of label copies to print';


--
-- Name: COLUMN pallet_settings.label_template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.label_template IS 'Default label template: default, compact, detailed';


--
-- Name: COLUMN pallet_settings.show_preview_dialog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.show_preview_dialog IS 'Show label preview before printing';


--
-- Name: COLUMN pallet_settings.default_cartons_per_pallet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pallet_settings.default_cartons_per_pallet IS 'Default cartons per pallet when product has no specific config';


--
-- PostgreSQL database dump complete
--

