param(
  [Parameter(Mandatory = $true)]
  [string]$ApprovalText
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

$prodRef = Assert-EnvVar 'SUPABASE_PROJECT_REF_PROD'
$supabaseAccessToken = Assert-EnvVar 'SUPABASE_ACCESS_TOKEN'

$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot 'supabase\config.toml'
if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Missing 'supabase/config.toml'. Cannot sync dashboard settings."
}

$env:SUPABASE_ACCESS_TOKEN = $supabaseAccessToken

Write-Host "::STEP::dashboard_settings_push::90"
Write-Host "[dashboard] Applying repository config to Prod project '$prodRef'..."
Invoke-Checked supabase @(
  'config', 'push',
  '--project-ref', $prodRef,
  '--workdir', $projectRoot,
  '--yes'
)

Write-Host "[dashboard] Dashboard settings sync completed."

Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
