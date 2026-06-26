-- Migration: Default material_receiving.company_id to get_user_company_id()
-- Date: 2026-04-20
-- Rationale: Avoid client-side company_id mismatches causing RLS INSERT failures by letting the database
--            set company_id automatically from the authenticated user context.

BEGIN;

ALTER TABLE public.material_receiving
  ALTER COLUMN company_id
  SET DEFAULT public.get_user_company_id();

COMMIT;

