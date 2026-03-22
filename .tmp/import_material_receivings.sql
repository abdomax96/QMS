\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE tmp_import_receivings (
  row_no integer,
  material_name text,
  supplier_name text,
  quantity numeric,
  unit text,
  received_date date,
  production_date date,
  expiry_date date,
  external_batch text
);

\copy tmp_import_receivings (row_no, material_name, supplier_name, quantity, unit, received_date, production_date, expiry_date, external_batch) FROM 'C:/Users/abdal/Downloads/QMS/.tmp/import_material_receivings.tsv' WITH (FORMAT csv, HEADER true, DELIMITER E'\t', QUOTE '"', ESCAPE '"', ENCODING 'UTF8')

UPDATE tmp_import_receivings
SET
  material_name = btrim(regexp_replace(coalesce(material_name, ''), '\s+', ' ', 'g')),
  supplier_name = btrim(regexp_replace(coalesce(supplier_name, ''), '\s+', ' ', 'g')),
  unit = btrim(regexp_replace(coalesce(unit, ''), '\s+', ' ', 'g')),
  external_batch = btrim(regexp_replace(coalesce(external_batch, ''), '\s+', ' ', 'g'));

DELETE FROM tmp_import_receivings
WHERE material_name = '';

UPDATE tmp_import_receivings
SET supplier_name = 'مورد افتراضي'
WHERE supplier_name = '';

UPDATE tmp_import_receivings
SET quantity = 1
WHERE quantity IS NULL OR quantity <= 0;

UPDATE tmp_import_receivings
SET unit = 'كجم'
WHERE unit = '';

UPDATE tmp_import_receivings
SET received_date = CURRENT_DATE
WHERE received_date IS NULL;

UPDATE tmp_import_receivings
SET production_date = received_date
WHERE production_date IS NULL;

UPDATE tmp_import_receivings
SET expiry_date = (production_date + 365)
WHERE expiry_date IS NULL;

WITH distinct_suppliers AS (
  SELECT DISTINCT supplier_name
  FROM tmp_import_receivings
), missing_suppliers AS (
  SELECT ds.supplier_name
  FROM distinct_suppliers ds
  LEFT JOIN public.suppliers s
    ON lower(btrim(s.name)) = lower(btrim(ds.supplier_name))
   AND s.company_id = 'a0000001-0000-0000-0000-000000000001'
  WHERE s.id IS NULL
)
INSERT INTO public.suppliers (
  id,
  code,
  name,
  approved,
  company_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'SUP-IMP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  supplier_name,
  true,
  'a0000001-0000-0000-0000-000000000001',
  true,
  now(),
  now()
FROM missing_suppliers;

WITH distinct_materials AS (
  SELECT DISTINCT material_name, unit
  FROM tmp_import_receivings
), missing_materials AS (
  SELECT dm.material_name, dm.unit
  FROM distinct_materials dm
  LEFT JOIN public.raw_materials rm
    ON lower(btrim(rm.name)) = lower(btrim(dm.material_name))
   AND rm.company_id = 'a0000001-0000-0000-0000-000000000001'
  WHERE rm.id IS NULL
)
INSERT INTO public.raw_materials (
  id,
  code,
  name,
  category,
  unit,
  specifications,
  storage_condition,
  shelf_life,
  shelf_life_unit,
  expiry_subtract_days,
  requires_lab_test,
  allergens,
  is_active,
  company_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'ING-IMP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  material_name,
  'ingredient',
  coalesce(nullif(unit, ''), 'كجم'),
  '{}'::jsonb,
  NULL,
  NULL,
  'days',
  0,
  true,
  '[]'::jsonb,
  true,
  'a0000001-0000-0000-0000-000000000001',
  now(),
  now()
FROM missing_materials;

INSERT INTO public.raw_material_suppliers (
  id,
  raw_material_id,
  supplier_id,
  company_id,
  is_primary,
  approval_status,
  approval_date,
  valid_from,
  is_active,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  rm.id,
  s.id,
  'a0000001-0000-0000-0000-000000000001',
  false,
  'approved',
  CURRENT_DATE,
  CURRENT_DATE,
  true,
  now(),
  now()
FROM (
  SELECT DISTINCT material_name, supplier_name
  FROM tmp_import_receivings
) t
JOIN public.raw_materials rm
  ON lower(btrim(rm.name)) = lower(btrim(t.material_name))
 AND rm.company_id = 'a0000001-0000-0000-0000-000000000001'
JOIN public.suppliers s
  ON lower(btrim(s.name)) = lower(btrim(t.supplier_name))
 AND s.company_id = 'a0000001-0000-0000-0000-000000000001'
LEFT JOIN public.raw_material_suppliers rms
  ON rms.raw_material_id = rm.id
 AND rms.supplier_id = s.id
 AND rms.company_id = 'a0000001-0000-0000-0000-000000000001'
WHERE rms.id IS NULL;

INSERT INTO public.material_receiving (
  id,
  receiving_number,
  material_type,
  status,
  material_name,
  material_code,
  batch_number,
  lot_number,
  supplier_id,
  supplier_name,
  quantity,
  unit,
  production_date,
  expiry_date,
  received_at,
  received_by,
  received_by_name,
  inspection_required,
  storage_location,
  storage_condition,
  notes,
  company_id,
  raw_material_id,
  production_date_format,
  expiry_date_format,
  created_at,
  updated_at,
  test_requirements_snapshot,
  supplier_approval_snapshot
)
SELECT
  gen_random_uuid(),
  'RCV-IMP-' || lpad(t.row_no::text, 5, '0'),
  'ingredient',
  'accepted',
  rm.name,
  rm.code,
  coalesce(nullif(t.external_batch, ''), 'BATCH-IMP-' || lpad(t.row_no::text, 5, '0')),
  nullif(t.external_batch, ''),
  s.id,
  s.name,
  t.quantity,
  t.unit,
  t.production_date,
  t.expiry_date,
  (t.received_date::timestamp + time '12:00')::timestamptz,
  'import-script',
  'Import Script',
  true,
  'المخزن الرئيسي',
  'غير محدد',
  'Imported from ستلامات.xlsx',
  'a0000001-0000-0000-0000-000000000001',
  rm.id,
  'dmy',
  'dmy',
  now(),
  now(),
  '[]'::jsonb,
  '{}'::jsonb
FROM tmp_import_receivings t
JOIN public.raw_materials rm
  ON lower(btrim(rm.name)) = lower(btrim(t.material_name))
 AND rm.company_id = 'a0000001-0000-0000-0000-000000000001'
JOIN public.suppliers s
  ON lower(btrim(s.name)) = lower(btrim(t.supplier_name))
 AND s.company_id = 'a0000001-0000-0000-0000-000000000001'
ON CONFLICT (company_id, receiving_number) DO NOTHING;

COMMIT;

SELECT 'imported_receivings' AS metric, count(*) AS value
FROM public.material_receiving
WHERE company_id = 'a0000001-0000-0000-0000-000000000001'
  AND receiving_number LIKE 'RCV-IMP-%';

SELECT 'materials_total' AS metric, count(*) AS value
FROM public.raw_materials
WHERE company_id = 'a0000001-0000-0000-0000-000000000001';

SELECT 'suppliers_total' AS metric, count(*) AS value
FROM public.suppliers
WHERE company_id = 'a0000001-0000-0000-0000-000000000001';
