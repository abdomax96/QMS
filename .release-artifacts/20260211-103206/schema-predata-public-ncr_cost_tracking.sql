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
-- Name: ncr_cost_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ncr_cost_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ncr_id uuid,
    material_cost numeric(12,2) DEFAULT 0,
    material_details jsonb DEFAULT '[]'::jsonb,
    rework_cost numeric(12,2) DEFAULT 0,
    rework_hours numeric(8,2) DEFAULT 0,
    rework_hourly_rate numeric(8,2),
    downtime_cost numeric(12,2) DEFAULT 0,
    downtime_hours numeric(8,2) DEFAULT 0,
    downtime_hourly_rate numeric(8,2),
    labor_cost numeric(12,2) DEFAULT 0,
    labor_hours numeric(8,2) DEFAULT 0,
    labor_hourly_rate numeric(8,2),
    inspection_cost numeric(12,2) DEFAULT 0,
    shipping_cost numeric(12,2) DEFAULT 0,
    other_costs jsonb DEFAULT '[]'::jsonb,
    other_costs_total numeric(12,2) DEFAULT 0,
    total_cost numeric(12,2) GENERATED ALWAYS AS (((((((COALESCE(material_cost, (0)::numeric) + COALESCE(rework_cost, (0)::numeric)) + COALESCE(downtime_cost, (0)::numeric)) + COALESCE(labor_cost, (0)::numeric)) + COALESCE(inspection_cost, (0)::numeric)) + COALESCE(shipping_cost, (0)::numeric)) + COALESCE(other_costs_total, (0)::numeric))) STORED,
    calculated_by_id uuid,
    calculated_at timestamp with time zone DEFAULT now(),
    approved_by_id uuid,
    approved_at timestamp with time zone,
    is_approved boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- PostgreSQL database dump complete
--

