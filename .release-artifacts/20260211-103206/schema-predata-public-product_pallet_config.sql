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
-- Name: product_pallet_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_pallet_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    company_id uuid NOT NULL,
    carton_width_cm numeric(10,2) DEFAULT 40 NOT NULL,
    carton_depth_cm numeric(10,2) DEFAULT 30 NOT NULL,
    carton_height_cm numeric(10,2) DEFAULT 25 NOT NULL,
    pallet_width_cm numeric(10,2) DEFAULT 120 NOT NULL,
    pallet_depth_cm numeric(10,2) DEFAULT 100 NOT NULL,
    pallet_max_height_cm numeric(10,2) DEFAULT 180 NOT NULL,
    cartons_per_layer integer DEFAULT 8 NOT NULL,
    number_of_layers integer DEFAULT 6 NOT NULL,
    total_cartons_per_pallet integer GENERATED ALWAYS AS ((cartons_per_layer * number_of_layers)) STORED,
    base_pattern text DEFAULT 'brick'::text NOT NULL,
    alternate_layers boolean DEFAULT true NOT NULL,
    layer_patterns jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    shelf_life_variable_id uuid,
    CONSTRAINT product_pallet_config_base_pattern_check CHECK ((base_pattern = ANY (ARRAY['brick'::text, 'column'::text, 'pinwheel'::text]))),
    CONSTRAINT product_pallet_config_cartons_per_layer_check CHECK (((cartons_per_layer > 0) AND (cartons_per_layer <= 100))),
    CONSTRAINT product_pallet_config_number_of_layers_check CHECK (((number_of_layers > 0) AND (number_of_layers <= 20)))
);


--
-- Name: TABLE product_pallet_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_pallet_config IS 'Per-product pallet stacking configuration with dimensions and visual patterns';


--
-- Name: COLUMN product_pallet_config.carton_width_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.carton_width_cm IS 'Carton width in centimeters (along pallet width)';


--
-- Name: COLUMN product_pallet_config.carton_depth_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.carton_depth_cm IS 'Carton depth in centimeters (along pallet depth)';


--
-- Name: COLUMN product_pallet_config.carton_height_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.carton_height_cm IS 'Carton height in centimeters';


--
-- Name: COLUMN product_pallet_config.pallet_width_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.pallet_width_cm IS 'Pallet width in cm (standard Euro pallet: 120cm)';


--
-- Name: COLUMN product_pallet_config.pallet_depth_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.pallet_depth_cm IS 'Pallet depth in cm (standard Euro pallet: 100cm)';


--
-- Name: COLUMN product_pallet_config.pallet_max_height_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.pallet_max_height_cm IS 'Maximum stacking height in cm (including pallet base)';


--
-- Name: COLUMN product_pallet_config.base_pattern; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.base_pattern IS 'Base stacking pattern: brick (offset), column (aligned), pinwheel (rotating)';


--
-- Name: COLUMN product_pallet_config.alternate_layers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.alternate_layers IS 'If true, alternate carton orientation between layers to prevent collapse';


--
-- Name: COLUMN product_pallet_config.layer_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_pallet_config.layer_patterns IS 'JSON array of per-layer patterns with orientation and grid';


--
-- PostgreSQL database dump complete
--

