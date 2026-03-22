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
-- Name: document_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_signatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version_id uuid NOT NULL,
    signer_id uuid NOT NULL,
    signature_type text NOT NULL,
    signature_data text,
    comments text,
    signed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    CONSTRAINT document_signatures_signature_type_check CHECK ((signature_type = ANY (ARRAY['author'::text, 'reviewer'::text, 'approver'::text])))
);


--
-- PostgreSQL database dump complete
--

