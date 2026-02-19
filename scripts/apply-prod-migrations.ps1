param(
  [Parameter(Mandatory = $true)]
  [string]$ApprovalText,

  [switch]$IncludeSeed
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

function Invoke-Checked([string]$Exe, [string[]]$Arguments) {
  & $Exe @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $Exe $($Arguments -join ' ')"
  }
}

Assert-Exact -Label 'ApprovalText' -Actual $ApprovalText -Expected 'APPROVED FOR PROD'
Assert-Exact -Label 'ENABLE_PROD_RELEASES' -Actual (Assert-EnvVar 'ENABLE_PROD_RELEASES') -Expected '1'

$null = Get-Command supabase -ErrorAction Stop

$projectRoot = Split-Path -Parent $PSScriptRoot
$migrationsPath = Join-Path $projectRoot 'supabase\migrations'
if (-not (Test-Path -LiteralPath $migrationsPath)) {
  throw "Missing '$migrationsPath'. Cannot apply production migrations."
}

$prodRef = Assert-EnvVar 'SUPABASE_PROJECT_REF_PROD'
$prodDbPassword = Assert-EnvVar 'SUPABASE_DB_PASSWORD_PROD'
$supabaseAccessToken = Assert-EnvVar 'SUPABASE_ACCESS_TOKEN'

$env:SUPABASE_ACCESS_TOKEN = $supabaseAccessToken
$env:SUPABASE_DB_PASSWORD = $prodDbPassword

Push-Location $projectRoot
try {
  Write-Host "::STEP::prod_link::52"
  Write-Host "[migrate] Linking Supabase CLI to production project '$prodRef'..."
  Invoke-Checked supabase @(
    'link',
    '--project-ref', $prodRef,
    '--yes'
  )

  Write-Host "::STEP::prod_db_push::60"
  Write-Host '[migrate] Applying SQL migrations to production (data-preserving path)...'

  $pushArgs = @(
    'db', 'push',
    '--include-all',
    '--yes'
  )
  if ($IncludeSeed) {
    $pushArgs += '--include-seed'
  }

  Invoke-Checked supabase $pushArgs
  Write-Host '[migrate] Production migrations applied successfully.'
} finally {
  Pop-Location
  Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
}
