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

function Invoke-Capture([string]$Exe, [string[]]$Arguments) {
  $output = & $Exe @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $Exe $($Arguments -join ' ')"
  }
  if ($null -eq $output) {
    return ''
  }
  return ($output -join [Environment]::NewLine)
}

function Convert-ToPsqlPathLiteral([string]$Path) {
  $normalized = $Path -replace '\\', '/'
  return $normalized.Replace("'", "''")
}

function Initialize-SupabaseWorkdir([string]$Workdir, [string]$ProjectRef, [string]$DbPassword) {
  $supabaseConfigPath = Join-Path $Workdir 'supabase\config.toml'
  if (-not (Test-Path -LiteralPath $supabaseConfigPath)) {
    Invoke-Checked supabase @('init', '--workdir', $Workdir, '--yes')
  }

  $linkArgs = @('link', '--project-ref', $ProjectRef, '--workdir', $Workdir, '--yes')
  if (-not [string]::IsNullOrWhiteSpace($DbPassword)) {
    $linkArgs += @('-p', $DbPassword)
  }
  Invoke-Checked supabase $linkArgs
}

function Sync-StorageBucketMetadata(
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
  $bucketCsvFile = Join-Path $ArtifactDir 'dev-storage-buckets.csv'
  $bucketImportSqlFile = Join-Path $ArtifactDir 'prod-storage-buckets-sync.sql'
  $bucketCsvPsqlPath = Convert-ToPsqlPathLiteral $bucketCsvFile

  $exportSql = "\copy (SELECT id, name, COALESCE(owner::text, '') AS owner, COALESCE(owner_id, '') AS owner_id, COALESCE(public, false) AS public, COALESCE(avif_autodetection, false) AS avif_autodetection, COALESCE(file_size_limit::text, '') AS file_size_limit, COALESCE(array_to_string(allowed_mime_types, '|'), '') AS allowed_mime_types, type::text AS bucket_type, COALESCE(created_at::text, '') AS created_at, COALESCE(updated_at::text, '') AS updated_at FROM storage.buckets ORDER BY name) TO '$bucketCsvPsqlPath' WITH (FORMAT csv, HEADER true)"

  $env:PGPASSWORD = $DevPassword
  Invoke-Checked psql @(
    '--host', $DevHost,
    '--port', $DevPort,
    '--username', $DevUser,
    '--dbname', $DevDatabase,
    '--set', 'ON_ERROR_STOP=1',
    '--command', $exportSql
  )

  $importSql = @"
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

\copy _tmp_dev_storage_buckets (id, name, owner, owner_id, public, avif_autodetection, file_size_limit, allowed_mime_types, bucket_type, created_at, updated_at) FROM '$bucketCsvPsqlPath' WITH (FORMAT csv, HEADER true);

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
"@

  Set-Content -LiteralPath $bucketImportSqlFile -Value $importSql -Encoding UTF8 -NoNewline

  $env:PGPASSWORD = $ProdPassword
  Invoke-Checked psql @(
    '--host', $ProdHost,
    '--port', $ProdPort,
    '--username', $ProdUser,
    '--dbname', $ProdDatabase,
    '--set', 'ON_ERROR_STOP=1',
    '--file', $bucketImportSqlFile
  )
}

function Get-DevBucketNames([string]$DevHost, [string]$DevPort, [string]$DevUser, [string]$DevDatabase, [string]$DevPassword) {
  $env:PGPASSWORD = $DevPassword
  $rows = & psql @(
    '--host', $DevHost,
    '--port', $DevPort,
    '--username', $DevUser,
    '--dbname', $DevDatabase,
    '--tuples-only',
    '--no-align',
    '--set', 'ON_ERROR_STOP=1',
    '--command', "SELECT name FROM storage.buckets ORDER BY name;"
  )
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to read storage buckets from Dev.'
  }

  $names = @()
  foreach ($row in @($rows)) {
    $name = "$row".Trim()
    if (-not [string]::IsNullOrWhiteSpace($name)) {
      $names += $name
    }
  }
  return $names
}

function Resolve-BucketsToSync([string[]]$AvailableBuckets) {
  $requestedRaw = Get-EnvOrDefault 'SUPABASE_STORAGE_SYNC_BUCKETS' ''
  if ([string]::IsNullOrWhiteSpace($requestedRaw)) {
    return $AvailableBuckets
  }

  $requested = @()
  foreach ($part in ($requestedRaw -split ',')) {
    $trimmed = $part.Trim()
    if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
      $requested += $trimmed
    }
  }

  if ($requested.Count -eq 0) {
    return $AvailableBuckets
  }

  $availableSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($bucket in $AvailableBuckets) {
    [void]$availableSet.Add($bucket)
  }

  $missing = @()
  foreach ($bucket in $requested) {
    if (-not $availableSet.Contains($bucket)) {
      $missing += $bucket
    }
  }
  if ($missing.Count -gt 0) {
    throw "Requested storage buckets not found in Dev: $($missing -join ', ')"
  }

  return $requested
}

function BucketHasFiles([string]$Bucket, [string]$DevWorkdir) {
  $json = Invoke-Capture supabase @(
    'storage', 'ls', "ss:///$Bucket",
    '--recursive',
    '--linked',
    '--workdir', $DevWorkdir,
    '--output', 'json'
  )
  if ([string]::IsNullOrWhiteSpace($json)) {
    return $false
  }
  $parsed = $json | ConvertFrom-Json
  return (@($parsed).Count -gt 0)
}

Assert-Exact -Label 'ApprovalText' -Actual $ApprovalText -Expected 'APPROVED FOR PROD'
Assert-Exact -Label 'CloneConfirmText' -Actual $CloneConfirmText -Expected 'CONFIRM DEV TO PROD CLONE'
Assert-Exact -Label 'ENABLE_PROD_RELEASES' -Actual (Assert-EnvVar 'ENABLE_PROD_RELEASES') -Expected '1'
Assert-Exact -Label 'ALLOW_PROD_DB_OVERWRITE' -Actual (Assert-EnvVar 'ALLOW_PROD_DB_OVERWRITE') -Expected 'YES_I_UNDERSTAND'

$null = Get-Command supabase -ErrorAction Stop
$null = Get-Command psql -ErrorAction Stop

$devRef = Assert-EnvVar 'SUPABASE_PROJECT_REF_DEV'
$prodRef = Assert-EnvVar 'SUPABASE_PROJECT_REF_PROD'
$devPassword = Assert-EnvVar 'SUPABASE_DB_PASSWORD_DEV'
$prodPassword = Assert-EnvVar 'SUPABASE_DB_PASSWORD_PROD'
$supabaseAccessToken = Assert-EnvVar 'SUPABASE_ACCESS_TOKEN'

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
$storageMirrorDir = Join-Path $artifactDir 'storage-mirror'
$devWorkdir = Join-Path $artifactDir 'supabase-dev-link'
$prodWorkdir = Join-Path $artifactDir 'supabase-prod-link'

New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
New-Item -ItemType Directory -Force -Path $storageMirrorDir | Out-Null
New-Item -ItemType Directory -Force -Path $devWorkdir | Out-Null
New-Item -ItemType Directory -Force -Path $prodWorkdir | Out-Null

$env:SUPABASE_ACCESS_TOKEN = $supabaseAccessToken

Write-Host "::STEP::storage_preflight::10"
Write-Host "[storage] artifacts directory: $artifactDir"

Write-Host "::STEP::storage_sync_buckets::30"
Sync-StorageBucketMetadata `
  -DevHost $devHost -DevPort $devPort -DevUser $devUser -DevDatabase $devDatabase -DevPassword $devPassword `
  -ProdHost $prodHost -ProdPort $prodPort -ProdUser $prodUser -ProdDatabase $prodDatabase -ProdPassword $prodPassword `
  -ArtifactDir $artifactDir

Initialize-SupabaseWorkdir -Workdir $devWorkdir -ProjectRef $devRef -DbPassword $devPassword
Initialize-SupabaseWorkdir -Workdir $prodWorkdir -ProjectRef $prodRef -DbPassword $prodPassword

$availableBuckets = @(Get-DevBucketNames -DevHost $devHost -DevPort $devPort -DevUser $devUser -DevDatabase $devDatabase -DevPassword $devPassword)
if ($availableBuckets.Count -eq 0) {
  Write-Host "[storage] No buckets found in Dev. Nothing to copy."
  Write-Host "::STEP::done::100"
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
  return
}

$bucketsToSync = @(Resolve-BucketsToSync -AvailableBuckets $availableBuckets)
Write-Host "[storage] buckets to sync: $($bucketsToSync -join ', ')"

Write-Host "::STEP::storage_copy_files::70"
foreach ($bucket in $bucketsToSync) {
  Write-Host "[storage] syncing bucket '$bucket'..."

  $hasFiles = BucketHasFiles -Bucket $bucket -DevWorkdir $devWorkdir
  if (-not $hasFiles) {
    Write-Host "[storage] bucket '$bucket' has no files in Dev. Skipping file copy."
    continue
  }

  $bucketMirrorPath = Join-Path $storageMirrorDir $bucket
  if (Test-Path -LiteralPath $bucketMirrorPath) {
    Remove-Item -LiteralPath $bucketMirrorPath -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $bucketMirrorPath | Out-Null

  Invoke-Checked supabase @(
    'storage', 'cp',
    '--recursive',
    "ss:///$bucket",
    $bucketMirrorPath,
    '--linked',
    '--workdir', $devWorkdir
  )

  Invoke-Checked supabase @(
    'storage', 'cp',
    '--recursive',
    $bucketMirrorPath,
    "ss:///$bucket",
    '--linked',
    '--workdir', $prodWorkdir
  )
}

Write-Host "::STEP::done::100"
Write-Host '[storage] Dev storage buckets/files synced to Prod successfully.'

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
