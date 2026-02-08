-- Migration: Create variables table (document/global variables)
-- Date: 2026-02-08
-- Notes:
-- - This table is referenced by the webapp (variableService) but was not present in migrations.
-- - RLS is enabled and enforced by company_id.
-- - Company isolation uses app_metadata.company_id (trusted) with a fallback to the default seeded company.

DO $$
BEGIN
  -- Create table if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'variables'
  ) THEN
    EXECUTE $sql$
      CREATE TABLE public.variables (
        id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        company_id uuid NOT NULL,
        name text NOT NULL,
        value text NOT NULL,
        unit text,
        description text,
        source_document_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    $sql$;
  END IF;

  -- Helpful uniqueness constraints (supports "global" variables where source_document_id is NULL)
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS variables_company_name_global_unique ON public.variables(company_id, name) WHERE source_document_id IS NULL';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS variables_company_name_doc_unique ON public.variables(company_id, name, source_document_id) WHERE source_document_id IS NOT NULL';

  -- Ensure updated_at is maintained
  EXECUTE 'DROP TRIGGER IF EXISTS variables_set_updated_at ON public.variables';
  EXECUTE 'CREATE TRIGGER variables_set_updated_at BEFORE UPDATE ON public.variables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';

  -- Permissions (PostgREST roles)
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.variables TO authenticated';
  EXECUTE 'GRANT ALL ON TABLE public.variables TO service_role';

  -- RLS
  EXECUTE 'ALTER TABLE public.variables ENABLE ROW LEVEL SECURITY';

  -- Replace existing policies (if any)
  EXECUTE 'DROP POLICY IF EXISTS "Users can view variables from their company" ON public.variables';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert variables for their company" ON public.variables';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update variables for their company" ON public.variables';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete variables for their company" ON public.variables';

  -- Company claim: trusted app_metadata, fallback to the seeded default company for single-tenant setups.
  EXECUTE $sql$
    CREATE POLICY "Users can view variables from their company"
    ON public.variables
    FOR SELECT
    TO authenticated
    USING (
      company_id::text = COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'company_id', ''),
        'a0000001-0000-0000-0000-000000000001'
      )
    )
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can insert variables for their company"
    ON public.variables
    FOR INSERT
    TO authenticated
    WITH CHECK (
      company_id::text = COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'company_id', ''),
        'a0000001-0000-0000-0000-000000000001'
      )
    )
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can update variables for their company"
    ON public.variables
    FOR UPDATE
    TO authenticated
    USING (
      company_id::text = COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'company_id', ''),
        'a0000001-0000-0000-0000-000000000001'
      )
    )
    WITH CHECK (
      company_id::text = COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'company_id', ''),
        'a0000001-0000-0000-0000-000000000001'
      )
    )
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can delete variables for their company"
    ON public.variables
    FOR DELETE
    TO authenticated
    USING (
      company_id::text = COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'company_id', ''),
        'a0000001-0000-0000-0000-000000000001'
      )
    )
  $sql$;

  RAISE NOTICE '[variables] Table + RLS policies ensured.';
END $$;
