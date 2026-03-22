BEGIN;
CREATE TEMP TABLE _tmp_dev_auth_sync (
  id uuid PRIMARY KEY,
  encrypted_password text,
  email_confirmed_at text,
  raw_app_meta_data text,
  raw_user_meta_data text
);

\copy _tmp_dev_auth_sync (id, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) FROM 'C:/Users/abdal/Downloads/QMS/.release-artifacts/20260219-201242/dev-auth-users.csv' WITH (FORMAT csv, HEADER true);

UPDATE auth.users AS u
SET
  encrypted_password = CASE
    WHEN NULLIF(t.encrypted_password, '') IS NOT NULL THEN t.encrypted_password
    ELSE u.encrypted_password
  END,
  email_confirmed_at = COALESCE(NULLIF(t.email_confirmed_at, '')::timestamptz, u.email_confirmed_at),
  raw_app_meta_data = COALESCE(NULLIF(t.raw_app_meta_data, '')::jsonb, u.raw_app_meta_data),
  raw_user_meta_data = COALESCE(NULLIF(t.raw_user_meta_data, '')::jsonb, u.raw_user_meta_data),
  updated_at = NOW()
FROM _tmp_dev_auth_sync AS t
WHERE u.id = t.id;

COMMIT;