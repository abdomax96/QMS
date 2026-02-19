param(
  [Parameter(Mandatory = $true)]
  [string]$ApprovalText,

  [Parameter(Mandatory = $true)]
  [string]$CloneConfirmText
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Exact([string]$Label, [string]$Actual, [string]$Expected) {
  if ($Actual -ne $Expected) {
    throw "$Label must be exactly '$Expected'."
  }
}

function Get-EnvVarAnyScope([string]$Name) {
  $processValue = [Environment]::GetEnvironmentVariable($Name)
  if (-not [string]::IsNullOrWhiteSpace($processValue)) {
    return $processValue
  }

  $userValue = [Environment]::GetEnvironmentVariable($Name, [EnvironmentVariableTarget]::User)
  if (-not [string]::IsNullOrWhiteSpace($userValue)) {
    return $userValue
  }

  $machineValue = [Environment]::GetEnvironmentVariable($Name, [EnvironmentVariableTarget]::Machine)
  if (-not [string]::IsNullOrWhiteSpace($machineValue)) {
    return $machineValue
  }

  return $null
}

function Assert-EnvVar([string]$Name) {
  $val = Get-EnvVarAnyScope $Name
  if (-not $val -or [string]::IsNullOrWhiteSpace($val)) {
    throw "Missing environment variable '$Name'."
  }
  return $val
}

function Get-EnvOrDefault([string]$Name, [string]$DefaultValue) {
  $val = Get-EnvVarAnyScope $Name
  if (-not $val -or [string]::IsNullOrWhiteSpace($val)) {
    return $DefaultValue
  }
  return $val
}

function Invoke-Checked([string]$Exe, [string[]]$Arguments) {
  & $Exe @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $Exe $($Arguments -join ' ')"
  }
}

function Convert-ToPsqlPathLiteral([string]$Path) {
  $normalized = $Path -replace '\\', '/'
  return $normalized.Replace("'", "''")
}

function Sync-AuthCredentialsFromDevToProd(
  [string]$DevHost,
  [string]$DevPort,
  [string]$DevUser,
  [string]$DevDatabase,
  [string]$DevPassword,
  [string]$ProdHost,
  [string]$ProdPort,
  [string]$ProdUser,
  [string]$ProdDatabase,
  [string]$ProdPassword,
  [string]$ArtifactDir
) {
  $authCsvFile = Join-Path $ArtifactDir 'dev-auth-users.csv'
  $authSyncSqlFile = Join-Path $ArtifactDir 'prod-auth-sync.sql'
  $authCsvFileForPsql = Convert-ToPsqlPathLiteral $authCsvFile

  $exportAuthCommand = "\copy (SELECT id::text, COALESCE(encrypted_password, '') AS encrypted_password, COALESCE(email_confirmed_at::text, '') AS email_confirmed_at, COALESCE(raw_app_meta_data::text, '') AS raw_app_meta_data, COALESCE(raw_user_meta_data::text, '') AS raw_user_meta_data FROM auth.users WHERE id IS NOT NULL) TO '$authCsvFileForPsql' WITH (FORMAT csv, HEADER true)"

  $env:PGPASSWORD = $DevPassword
  Invoke-Checked psql @(
    '--host', $DevHost,
    '--port', $DevPort,
    '--username', $DevUser,
    '--dbname', $DevDatabase,
    '--set', 'ON_ERROR_STOP=1',
    '--command', $exportAuthCommand
  )

  if (-not (Test-Path -LiteralPath $authCsvFile)) {
    throw "Auth export file was not created: $authCsvFile"
  }

  $authSyncSql = @"
BEGIN;
CREATE TEMP TABLE _tmp_dev_auth_sync (
  id uuid PRIMARY KEY,
  encrypted_password text,
  email_confirmed_at text,
  raw_app_meta_data text,
  raw_user_meta_data text
);

\copy _tmp_dev_auth_sync (id, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) FROM '$authCsvFileForPsql' WITH (FORMAT csv, HEADER true);

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
"@

  Set-Content -LiteralPath $authSyncSqlFile -Value $authSyncSql -Encoding UTF8 -NoNewline

  $env:PGPASSWORD = $ProdPassword
  Invoke-Checked psql @(
    '--host', $ProdHost,
    '--port', $ProdPort,
    '--username', $ProdUser,
    '--dbname', $ProdDatabase,
    '--set', 'ON_ERROR_STOP=1',
    '--file', $authSyncSqlFile
  )
}

function Apply-PublicSchemaGrants([string]$DbHost, [string]$DbPort, [string]$DbUser, [string]$DbName, [string]$DbPassword) {
  $grantSql = @"
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
"@

  $env:PGPASSWORD = $DbPassword
  Invoke-Checked psql @(
    '--host', $DbHost,
    '--port', $DbPort,
    '--username', $DbUser,
    '--dbname', $DbName,
    '--set', 'ON_ERROR_STOP=1',
    '--command', $grantSql
  )
}

function Apply-CoreAccessPolicyRepair([string]$DbHost, [string]$DbPort, [string]$DbUser, [string]$DbName, [string]$DbPassword) {
  $repairSql = @'
-- Rebuild stable permission helper functions.
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = check_user_id
            AND r.code IN ('super_admin', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.has_any_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
        WHERE r.code IN ('super_admin', 'admin')
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;

-- Ensure global settings row exists for pre-login configuration reads.
INSERT INTO public.settings (id)
VALUES ('global')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

-- settings
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_update_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_authenticated" ON public.settings;
DROP POLICY IF EXISTS "Anon can view global settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can view global settings" ON public.settings;
DROP POLICY IF EXISTS "settings_modify_policy" ON public.settings;

CREATE POLICY "Anon can view global settings" ON public.settings
FOR SELECT TO anon
USING (id = 'global');

CREATE POLICY "Authenticated users can view global settings" ON public.settings
FOR SELECT TO authenticated
USING (id = 'global');

CREATE POLICY "settings_modify_policy" ON public.settings
FOR ALL TO authenticated
USING (public.is_admin_user() OR NOT public.has_any_admin())
WITH CHECK (public.is_admin_user() OR NOT public.has_any_admin());

-- users
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_modify_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_all_for_admins" ON public.users;
DROP POLICY IF EXISTS "users_modify_admin" ON public.users;
DROP POLICY IF EXISTS "users_modify_own" ON public.users;
DROP POLICY IF EXISTS "users_select_all" ON public.users;

CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "users_modify_policy" ON public.users
FOR ALL TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin_user()
  OR NOT public.has_any_admin()
)
WITH CHECK (
  id = auth.uid()
  OR public.is_admin_user()
  OR NOT public.has_any_admin()
);

-- user_roles
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_modify_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_modify_admin" ON public.user_roles;

CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "user_roles_modify_policy" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.is_admin_user()
  OR NOT public.has_any_admin()
)
WITH CHECK (
  public.is_admin_user()
  OR NOT public.has_any_admin()
);

-- user_departments
DROP POLICY IF EXISTS "user_departments_select_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_modify_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_select_all" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_modify_admin" ON public.user_departments;

CREATE POLICY "user_departments_select_policy" ON public.user_departments
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "user_departments_modify_policy" ON public.user_departments
FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_user()
  OR NOT public.has_any_admin()
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin_user()
  OR NOT public.has_any_admin()
);

-- app_modules
DROP POLICY IF EXISTS "app_modules_select_policy" ON public.app_modules;
CREATE POLICY "app_modules_select_policy" ON public.app_modules
FOR SELECT TO authenticated
USING (true);

-- roles
DROP POLICY IF EXISTS "roles_select_policy" ON public.roles;
CREATE POLICY "roles_select_policy" ON public.roles
FOR SELECT TO authenticated
USING (true);

-- role_module_permissions
DROP POLICY IF EXISTS "role_module_permissions_select_policy" ON public.role_module_permissions;
CREATE POLICY "role_module_permissions_select_policy" ON public.role_module_permissions
FOR SELECT TO authenticated
USING (true);
'@

  $env:PGPASSWORD = $DbPassword
  $repairSqlFile = Join-Path $env:TEMP 'qms-core-access-repair.sql'
  Set-Content -LiteralPath $repairSqlFile -Value $repairSql -Encoding UTF8 -NoNewline
  Invoke-Checked psql @(
    '--host', $DbHost,
    '--port', $DbPort,
    '--username', $DbUser,
    '--dbname', $DbName,
    '--set', 'ON_ERROR_STOP=1',
    '--file', $repairSqlFile
  )
  Remove-Item -LiteralPath $repairSqlFile -ErrorAction SilentlyContinue
}

function Get-SqlScalar([string]$DbHost, [string]$DbPort, [string]$DbUser, [string]$DbName, [string]$DbPassword, [string]$Sql) {
  $env:PGPASSWORD = $DbPassword
  $rows = & psql @(
    '--host', $DbHost,
    '--port', $DbPort,
    '--username', $DbUser,
    '--dbname', $DbName,
    '--tuples-only',
    '--no-align',
    '--quiet',
    '--set', 'ON_ERROR_STOP=1',
    '--command', $Sql
  )
  if ($LASTEXITCODE -ne 0) {
    throw "Verification SQL failed: $Sql"
  }

  $value = $null
  foreach ($row in @($rows)) {
    $trimmed = "$row".Trim()
    if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
      $value = $trimmed
    }
  }

  if ($null -eq $value) {
    throw "Verification SQL returned no scalar value: $Sql"
  }

  return $value.ToLowerInvariant()
}

function Assert-SqlTrue(
  [string]$DbHost,
  [string]$DbPort,
  [string]$DbUser,
  [string]$DbName,
  [string]$DbPassword,
  [string]$Label,
  [string]$Sql
) {
  $value = Get-SqlScalar -DbHost $DbHost -DbPort $DbPort -DbUser $DbUser -DbName $DbName -DbPassword $DbPassword -Sql $Sql
  if ($value -ne 't' -and $value -ne 'true' -and $value -ne '1') {
    throw "Core access verification failed: $Label"
  }
}

function Assert-CoreAccessState([string]$DbHost, [string]$DbPort, [string]$DbUser, [string]$DbName, [string]$DbPassword) {
  Assert-SqlTrue -DbHost $DbHost -DbPort $DbPort -DbUser $DbUser -DbName $DbName -DbPassword $DbPassword -Label 'required tables exist' -Sql @"
SELECT to_regclass('public.settings') IS NOT NULL
   AND to_regclass('public.users') IS NOT NULL
   AND to_regclass('public.user_roles') IS NOT NULL
   AND to_regclass('public.user_departments') IS NOT NULL
   AND to_regclass('public.app_modules') IS NOT NULL
   AND to_regclass('public.roles') IS NOT NULL
   AND to_regclass('public.role_module_permissions') IS NOT NULL;
"@

  Assert-SqlTrue -DbHost $DbHost -DbPort $DbPort -DbUser $DbUser -DbName $DbName -DbPassword $DbPassword -Label 'critical grants are present' -Sql @"
SELECT has_table_privilege('anon', 'public.settings', 'SELECT')
   AND has_table_privilege('authenticated', 'public.settings', 'SELECT')
   AND has_table_privilege('authenticated', 'public.users', 'SELECT')
   AND has_table_privilege('authenticated', 'public.user_roles', 'SELECT')
   AND has_table_privilege('authenticated', 'public.user_departments', 'SELECT')
   AND has_table_privilege('authenticated', 'public.app_modules', 'SELECT')
   AND has_table_privilege('authenticated', 'public.roles', 'SELECT')
   AND has_table_privilege('authenticated', 'public.role_module_permissions', 'SELECT');
"@

  Assert-SqlTrue -DbHost $DbHost -DbPort $DbPort -DbUser $DbUser -DbName $DbName -DbPassword $DbPassword -Label 'global settings row exists' -Sql @"
SELECT EXISTS (SELECT 1 FROM public.settings WHERE id = 'global');
"@

  Assert-SqlTrue -DbHost $DbHost -DbPort $DbPort -DbUser $DbUser -DbName $DbName -DbPassword $DbPassword -Label 'settings policies exist' -Sql @"
SELECT EXISTS (
         SELECT 1
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'settings'
           AND policyname = 'Anon can view global settings'
       )
   AND EXISTS (
         SELECT 1
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'settings'
           AND policyname = 'Authenticated users can view global settings'
       );
"@

  Assert-SqlTrue -DbHost $DbHost -DbPort $DbPort -DbUser $DbUser -DbName $DbName -DbPassword $DbPassword -Label 'user policy baseline exists' -Sql @"
SELECT EXISTS (
         SELECT 1
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'users'
           AND policyname = 'users_select_policy'
       )
   AND EXISTS (
         SELECT 1
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'user_roles'
           AND policyname = 'user_roles_select_policy'
       )
   AND EXISTS (
         SELECT 1
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'app_modules'
           AND policyname = 'app_modules_select_policy'
       )
   AND EXISTS (
         SELECT 1
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'role_module_permissions'
           AND policyname = 'role_module_permissions_select_policy'
       );
"@
}

function Get-PublicTableNames([string]$DbHost, [string]$DbPort, [string]$DbUser, [string]$DbName, [string]$DbPassword) {
  $query = "select tablename from pg_tables where schemaname='public' order by tablename;"

  $env:PGPASSWORD = $DbPassword
  $rows = & psql @(
    '--host', $DbHost,
    '--port', $DbPort,
    '--username', $DbUser,
    '--dbname', $DbName,
    '--tuples-only',
    '--no-align',
    '--command', $query
  )
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read public table list from $DbHost."
  }

  $tables = @()
  foreach ($row in @($rows)) {
    $name = "$row".Trim()
    if (-not [string]::IsNullOrWhiteSpace($name)) {
      $tables += $name
    }
  }
  return $tables
}

function Sync-MissingPublicTables(
  [string]$DevHost,
  [string]$DevPort,
  [string]$DevUser,
  [string]$DevDatabase,
  [string]$DevPassword,
  [string]$ProdHost,
  [string]$ProdPort,
  [string]$ProdUser,
  [string]$ProdDatabase,
  [string]$ProdPassword,
  [string]$ArtifactDir
) {
  $devTables = @(Get-PublicTableNames -DbHost $DevHost -DbPort $DevPort -DbUser $DevUser -DbName $DevDatabase -DbPassword $DevPassword)
  $prodTables = @(Get-PublicTableNames -DbHost $ProdHost -DbPort $ProdPort -DbUser $ProdUser -DbName $ProdDatabase -DbPassword $ProdPassword)

  $prodSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($table in $prodTables) {
    [void]$prodSet.Add($table)
  }

  $missingTables = @()
  foreach ($table in $devTables) {
    if (-not $prodSet.Contains($table)) {
      $missingTables += $table
    }
  }

  if ($missingTables.Count -eq 0) {
    Write-Host '[clone] schema sync: no missing public tables in prod.'
    return
  }

  Write-Host "[clone] schema sync: missing public tables in prod: $($missingTables -join ', ')"

  foreach ($table in $missingTables) {
    $schemaFile = Join-Path $ArtifactDir ("schema-predata-public-$table.sql")

    $env:PGPASSWORD = $DevPassword
    Invoke-Checked pg_dump @(
      '--host', $DevHost,
      '--port', $DevPort,
      '--username', $DevUser,
      '--dbname', $DevDatabase,
      '--schema-only',
      '--section=pre-data',
      '--no-owner',
      '--no-privileges',
      '--table', "public.$table",
      '--file', $schemaFile
    )

    [void](Sanitize-DumpFile $schemaFile)

    $env:PGPASSWORD = $ProdPassword
    Invoke-Checked psql @(
      '--host', $ProdHost,
      '--port', $ProdPort,
      '--username', $ProdUser,
      '--dbname', $ProdDatabase,
      '--set', 'ON_ERROR_STOP=1',
      '--file', $schemaFile
    )

    Write-Host "[clone] schema sync: created public.$table"
  }

  $prodTablesAfter = @(Get-PublicTableNames -DbHost $ProdHost -DbPort $ProdPort -DbUser $ProdUser -DbName $ProdDatabase -DbPassword $ProdPassword)
  $prodAfterSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($table in $prodTablesAfter) {
    [void]$prodAfterSet.Add($table)
  }

  $stillMissing = @()
  foreach ($table in $missingTables) {
    if (-not $prodAfterSet.Contains($table)) {
      $stillMissing += $table
    }
  }

  if ($stillMissing.Count -gt 0) {
    throw "Schema sync incomplete. Missing in prod after sync: $($stillMissing -join ', ')"
  }
}

function Sanitize-DumpFile([string]$FilePath) {
  if (-not (Test-Path -LiteralPath $FilePath)) {
    throw "Dump file not found: $FilePath"
  }

  $content = Get-Content -LiteralPath $FilePath -Raw
  $patterns = @(
    '(?m)^\s*DROP SCHEMA IF EXISTS public;\r?\n',
    '(?m)^\s*CREATE SCHEMA public;\r?\n',
    "(?m)^\s*COMMENT ON SCHEMA public IS 'standard public schema';\r?\n"
  )

  $removed = 0
  foreach ($pattern in $patterns) {
    $matches = [System.Text.RegularExpressions.Regex]::Matches($content, $pattern)
    if ($matches.Count -gt 0) {
      $removed += $matches.Count
      $content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, '')
    }
  }

  Set-Content -LiteralPath $FilePath -Value $content -Encoding UTF8 -NoNewline
  return $removed
}

function Get-ExcludedTables() {
  $raw = Get-EnvOrDefault 'SUPABASE_CLONE_EXCLUDE_TABLES' ''
  $set = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

  # Supabase-managed storage internals can be owned by service roles and are not safe to clean/restore as postgres.
  $defaultInternalTables = @(
    'storage.vector_indexes',
    'storage.s3_multipart_uploads',
    'storage.s3_multipart_uploads_parts',
    'storage.buckets_vectors',
    'storage.buckets_analytics',
    'storage.migrations'
  )
  foreach ($internal in $defaultInternalTables) {
    [void]$set.Add($internal)
  }

  foreach ($part in ($raw -split ',')) {
    $trimmed = $part.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
      continue
    }

    if ($trimmed -ieq 'vector_indexes' -or $trimmed -ieq 'public.vector_indexes' -or $trimmed -ieq 'storage.vector_indexes') {
      # Keep backward compatibility with old values while enforcing the correct storage table.
      [void]$set.Add('storage.vector_indexes')
      continue
    }
    if ($trimmed -ieq 's3_multipart_uploads_parts' -or $trimmed -ieq 'storage.s3_multipart_uploads_parts') {
      [void]$set.Add('storage.s3_multipart_uploads_parts')
      continue
    }
    if ($trimmed -ieq 's3_multipart_uploads' -or $trimmed -ieq 'storage.s3_multipart_uploads') {
      [void]$set.Add('storage.s3_multipart_uploads')
      continue
    }
    if ($trimmed -ieq 'buckets_vectors' -or $trimmed -ieq 'storage.buckets_vectors') {
      [void]$set.Add('storage.buckets_vectors')
      continue
    }
    if ($trimmed -ieq 'buckets_analytics' -or $trimmed -ieq 'storage.buckets_analytics') {
      [void]$set.Add('storage.buckets_analytics')
      continue
    }
    if ($trimmed -ieq 'migrations' -or $trimmed -ieq 'storage.migrations') {
      [void]$set.Add('storage.migrations')
      continue
    }

    [void]$set.Add($trimmed)
  }

  if ($set.Count -eq 0) {
    [void]$set.Add('storage.vector_indexes')
  }

  return @($set)
}

function Build-DumpArgs([string]$DbHost, [string]$DbPort, [string]$DbUser, [string]$DbName, [string]$FilePath, [string[]]$ExcludedTables) {
  $args = @(
    '--host', $DbHost,
    '--port', $DbPort,
    '--username', $DbUser,
    '--dbname', $DbName,
    '--format=plain',
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges'
  )

  $schemas = Get-DumpSchemas
  foreach ($schema in $schemas) {
    $args += "--schema=$schema"
  }

  foreach ($table in $ExcludedTables) {
    $args += "--exclude-table=$table"
  }

  $args += @('--file', $FilePath)
  return $args
}

function Get-DumpSchemas() {
  $raw = Get-EnvOrDefault 'SUPABASE_CLONE_SCHEMAS' 'public'
  $set = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

  foreach ($part in ($raw -split ',')) {
    $trimmed = $part.Trim().ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
      continue
    }
    [void]$set.Add($trimmed)
  }

  if ($set.Count -eq 0) {
    [void]$set.Add('public')
  }

  return @($set)
}

Assert-Exact -Label 'ApprovalText' -Actual $ApprovalText -Expected 'APPROVED FOR PROD'
Assert-Exact -Label 'CloneConfirmText' -Actual $CloneConfirmText -Expected 'CONFIRM DEV TO PROD CLONE'
Assert-Exact -Label 'ENABLE_PROD_RELEASES' -Actual (Assert-EnvVar 'ENABLE_PROD_RELEASES') -Expected '1'
Assert-Exact -Label 'ALLOW_PROD_DB_OVERWRITE' -Actual (Assert-EnvVar 'ALLOW_PROD_DB_OVERWRITE') -Expected 'YES_I_UNDERSTAND'

$null = Get-Command pg_dump -ErrorAction Stop
$null = Get-Command psql -ErrorAction Stop

$devRef = Assert-EnvVar 'SUPABASE_PROJECT_REF_DEV'
$prodRef = Assert-EnvVar 'SUPABASE_PROJECT_REF_PROD'
$devPassword = Assert-EnvVar 'SUPABASE_DB_PASSWORD_DEV'
$prodPassword = Assert-EnvVar 'SUPABASE_DB_PASSWORD_PROD'

$devHost = Get-EnvOrDefault 'SUPABASE_DB_HOST_DEV' ("db.$devRef.supabase.co")
$prodHost = Get-EnvOrDefault 'SUPABASE_DB_HOST_PROD' ("db.$prodRef.supabase.co")
$devPort = Get-EnvOrDefault 'SUPABASE_DB_PORT_DEV' '5432'
$prodPort = Get-EnvOrDefault 'SUPABASE_DB_PORT_PROD' '5432'
$devUser = Get-EnvOrDefault 'SUPABASE_DB_USER_DEV' 'postgres'
$prodUser = Get-EnvOrDefault 'SUPABASE_DB_USER_PROD' 'postgres'
$devDatabase = Get-EnvOrDefault 'SUPABASE_DB_NAME_DEV' 'postgres'
$prodDatabase = Get-EnvOrDefault 'SUPABASE_DB_NAME_PROD' 'postgres'

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$artifactDir = Join-Path (Get-Location) ".release-artifacts\$timestamp"
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null

$prodBackupFile = Join-Path $artifactDir 'prod-backup-before-clone.sql'
$devDumpFile = Join-Path $artifactDir 'dev-clone-dump.sql'
$dumpSchemas = @(Get-DumpSchemas)
$dumpSchemasDisplay = $dumpSchemas -join ', '
$excludedTables = @(Get-ExcludedTables)
$excludedTablesDisplay = if ($excludedTables.Count -gt 0) { $excludedTables -join ', ' } else { '(none)' }

Write-Host "::STEP::preflight::5"
Write-Host "[clone] artifacts directory: $artifactDir"
Write-Host "[clone] schemas: $dumpSchemasDisplay"
Write-Host "[clone] excluded tables: $excludedTablesDisplay"

Write-Host "::STEP::backup_prod::20"
$env:PGPASSWORD = $prodPassword
$prodDumpArgs = Build-DumpArgs -DbHost $prodHost -DbPort $prodPort -DbUser $prodUser -DbName $prodDatabase -FilePath $prodBackupFile -ExcludedTables $excludedTables
Invoke-Checked pg_dump $prodDumpArgs

Write-Host "::STEP::dump_dev::45"
$env:PGPASSWORD = $devPassword
$devDumpArgs = Build-DumpArgs -DbHost $devHost -DbPort $devPort -DbUser $devUser -DbName $devDatabase -FilePath $devDumpFile -ExcludedTables $excludedTables
Invoke-Checked pg_dump $devDumpArgs

Write-Host "::STEP::schema_sync::55"
Sync-MissingPublicTables `
  -DevHost $devHost -DevPort $devPort -DevUser $devUser -DevDatabase $devDatabase -DevPassword $devPassword `
  -ProdHost $prodHost -ProdPort $prodPort -ProdUser $prodUser -ProdDatabase $prodDatabase -ProdPassword $prodPassword `
  -ArtifactDir $artifactDir

Write-Host "::STEP::sanitize_dump::60"
$removedStatements = Sanitize-DumpFile $devDumpFile
Write-Host "[clone] sanitized dump statements removed: $removedStatements"

Write-Host "::STEP::restore_prod::70"
$env:PGPASSWORD = $prodPassword
Invoke-Checked psql @(
  '--host', $prodHost,
  '--port', $prodPort,
  '--username', $prodUser,
  '--dbname', $prodDatabase,
  '--set', 'ON_ERROR_STOP=1',
  '--file', $devDumpFile
)

Write-Host "::STEP::sync_auth::78"
Sync-AuthCredentialsFromDevToProd `
  -DevHost $devHost -DevPort $devPort -DevUser $devUser -DevDatabase $devDatabase -DevPassword $devPassword `
  -ProdHost $prodHost -ProdPort $prodPort -ProdUser $prodUser -ProdDatabase $prodDatabase -ProdPassword $prodPassword `
  -ArtifactDir $artifactDir

Write-Host "::STEP::repair_grants::88"
Apply-PublicSchemaGrants -DbHost $prodHost -DbPort $prodPort -DbUser $prodUser -DbName $prodDatabase -DbPassword $prodPassword

Write-Host "::STEP::repair_core_access::94"
Apply-CoreAccessPolicyRepair -DbHost $prodHost -DbPort $prodPort -DbUser $prodUser -DbName $prodDatabase -DbPassword $prodPassword

Write-Host "::STEP::verify_core_access::97"
Assert-CoreAccessState -DbHost $prodHost -DbPort $prodPort -DbUser $prodUser -DbName $prodDatabase -DbPassword $prodPassword

Write-Host "::STEP::done::100"
Write-Host '[clone] Dev database content cloned into Prod successfully.'
Write-Host "[clone] Backup file: $prodBackupFile"

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
