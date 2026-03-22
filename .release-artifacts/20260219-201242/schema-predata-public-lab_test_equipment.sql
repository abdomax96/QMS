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
-- Name: lab_test_equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_equipment (
    test_config_id uuid NOT NULL,
    equipment_id uuid NOT NULL,
    is_required boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: TABLE lab_test_equipment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lab_test_equipment IS 'Links equipment to lab test configurations';


--
-- PostgreSQL database dump complete
--

