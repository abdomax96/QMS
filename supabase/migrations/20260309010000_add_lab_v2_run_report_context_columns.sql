BEGIN;

ALTER TABLE public.lab_v2_test_runs
  ADD COLUMN IF NOT EXISTS batch_number_snapshot text,
  ADD COLUMN IF NOT EXISTS shift_snapshot text,
  ADD COLUMN IF NOT EXISTS source_report_instance_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_v2_test_runs_source_report_instance_id_fkey'
  ) THEN
    ALTER TABLE public.lab_v2_test_runs
      ADD CONSTRAINT lab_v2_test_runs_source_report_instance_id_fkey
      FOREIGN KEY (source_report_instance_id)
      REFERENCES public.form_instances(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_lab_v2_test_runs_batch_number_snapshot
  ON public.lab_v2_test_runs(batch_number_snapshot);

CREATE INDEX IF NOT EXISTS idx_lab_v2_test_runs_shift_snapshot
  ON public.lab_v2_test_runs(shift_snapshot);

CREATE INDEX IF NOT EXISTS idx_lab_v2_test_runs_source_report_instance_id
  ON public.lab_v2_test_runs(source_report_instance_id);

COMMIT;
