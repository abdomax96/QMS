BEGIN;

/*
  Data maintenance: purge material receivings registered before 2026-04-01.

  Safety:
  - Copy rows into backup tables before deleting.
  - Backup consumption rows that would be cascaded by FK.

  NOTE: This migration uses created_at as the "registered at" timestamp.
        If you intended to purge by received_at instead, update the WHERE clauses below.
*/

DO $$
DECLARE
  v_cutoff timestamptz := timestamptz '2026-04-01 00:00:00+02:00';
  v_target_count integer := 0;
BEGIN
  SELECT COUNT(*)
  INTO v_target_count
  FROM public.material_receiving mr
  WHERE mr.created_at < v_cutoff;

  RAISE NOTICE 'material_receiving purge target: % rows where created_at < %', v_target_count, v_cutoff;

  IF v_target_count = 0 THEN
    RAISE NOTICE 'No rows matched. Skipping purge.';
    RETURN;
  END IF;

  -- Backup table for material_receiving rows being purged.
  IF to_regclass('public._backup_material_receiving_purge_before_20260401') IS NULL THEN
    EXECUTE $sql$
      CREATE TABLE public._backup_material_receiving_purge_before_20260401 AS
      SELECT
        mr.*,
        now()::timestamptz AS purged_at,
        'created_at'::text AS purged_by_column,
        timestamptz '2026-04-01 00:00:00+02:00' AS purge_cutoff
      FROM public.material_receiving mr
      WHERE false
    $sql$;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx__backup_mr_purge_20260401__id ON public._backup_material_receiving_purge_before_20260401(id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx__backup_mr_purge_20260401__purged_at ON public._backup_material_receiving_purge_before_20260401(purged_at)';

    -- Keep backups internal (no API access by default).
    EXECUTE 'REVOKE ALL ON TABLE public._backup_material_receiving_purge_before_20260401 FROM anon, authenticated';
    EXECUTE 'GRANT ALL ON TABLE public._backup_material_receiving_purge_before_20260401 TO service_role';
  END IF;

  INSERT INTO public._backup_material_receiving_purge_before_20260401
  SELECT
    mr.*,
    now()::timestamptz AS purged_at,
    'created_at'::text AS purged_by_column,
    v_cutoff AS purge_cutoff
  FROM public.material_receiving mr
  WHERE mr.created_at < v_cutoff;

  -- Backup material_batch_consumption rows that will be deleted via ON DELETE CASCADE.
  IF to_regclass('public.material_batch_consumption') IS NOT NULL THEN
    IF to_regclass('public._backup_material_batch_consumption_purge_before_20260401') IS NULL THEN
      EXECUTE $sql$
        CREATE TABLE public._backup_material_batch_consumption_purge_before_20260401 AS
        SELECT
          mbc.*,
          now()::timestamptz AS purged_at,
          timestamptz '2026-04-01 00:00:00+02:00' AS purge_cutoff
        FROM public.material_batch_consumption mbc
        WHERE false
      $sql$;

      EXECUTE 'CREATE INDEX IF NOT EXISTS idx__backup_mbc_purge_20260401__receiving_id ON public._backup_material_batch_consumption_purge_before_20260401(receiving_id)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx__backup_mbc_purge_20260401__purged_at ON public._backup_material_batch_consumption_purge_before_20260401(purged_at)';

      EXECUTE 'REVOKE ALL ON TABLE public._backup_material_batch_consumption_purge_before_20260401 FROM anon, authenticated';
      EXECUTE 'GRANT ALL ON TABLE public._backup_material_batch_consumption_purge_before_20260401 TO service_role';
    END IF;

    INSERT INTO public._backup_material_batch_consumption_purge_before_20260401
    SELECT
      mbc.*,
      now()::timestamptz AS purged_at,
      v_cutoff AS purge_cutoff
    FROM public.material_batch_consumption mbc
    INNER JOIN public.material_receiving mr
      ON mr.id = mbc.receiving_id
    WHERE mr.created_at < v_cutoff;
  END IF;

  -- Delete the receivings. Any dependent records with ON DELETE CASCADE will be removed automatically.
  DELETE FROM public.material_receiving mr
  WHERE mr.created_at < v_cutoff;

  RAISE NOTICE 'material_receiving purge completed.';
END $$;

COMMIT;

