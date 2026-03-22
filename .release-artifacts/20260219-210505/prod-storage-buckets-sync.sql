BEGIN;
CREATE TEMP TABLE _tmp_dev_storage_buckets (
  id text,
  name text,
  owner text,
  owner_id text,
  public text,
  avif_autodetection text,
  file_size_limit text,
  allowed_mime_types text,
  bucket_type text,
  created_at text,
  updated_at text
);

\copy _tmp_dev_storage_buckets (id, name, owner, owner_id, public, avif_autodetection, file_size_limit, allowed_mime_types, bucket_type, created_at, updated_at) FROM 'C:/Users/abdal/Downloads/QMS/.release-artifacts/20260219-210505/dev-storage-buckets.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO storage.buckets AS b (
  id,
  name,
  owner,
  owner_id,
  public,
  avif_autodetection,
  file_size_limit,
  allowed_mime_types,
  type,
  created_at,
  updated_at
)
SELECT
  t.id,
  t.name,
  NULLIF(t.owner, '')::uuid,
  NULLIF(t.owner_id, ''),
  COALESCE(NULLIF(t.public, '')::boolean, false),
  COALESCE(NULLIF(t.avif_autodetection, '')::boolean, false),
  NULLIF(t.file_size_limit, '')::bigint,
  CASE
    WHEN NULLIF(t.allowed_mime_types, '') IS NULL THEN NULL
    ELSE string_to_array(t.allowed_mime_types, '|')
  END,
  COALESCE(NULLIF(t.bucket_type, ''), 'STANDARD')::storage.buckettype,
  COALESCE(NULLIF(t.created_at, '')::timestamptz, NOW()),
  COALESCE(NULLIF(t.updated_at, '')::timestamptz, NOW())
FROM _tmp_dev_storage_buckets AS t
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  owner = EXCLUDED.owner,
  owner_id = EXCLUDED.owner_id,
  public = EXCLUDED.public,
  avif_autodetection = EXCLUDED.avif_autodetection,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  type = EXCLUDED.type,
  updated_at = NOW();

COMMIT;