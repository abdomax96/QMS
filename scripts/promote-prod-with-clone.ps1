param(
  [Parameter(Mandatory = $true)]
  [string]$ApprovalText,

  [string]$CloneConfirmText = '',

  [ValidateSet('safe_full', 'safe_db_only', 'full', 'db_only', 'app_only')]
  [string]$Mode = 'safe_full',

  [switch]$CloneStorage,
  [switch]$CloneDashboardSettings,
  [switch]$CloneEdgeFunctions
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ScriptRoot = $PSScriptRoot

function Assert-Exact([string]$Label, [string]$Actual, [string]$Expected) {
  if ($Actual -ne $Expected) {
    throw "$Label must be exactly '$Expected'."
  }
}

function Assert-CleanGit() {
  $status = git status --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to read git status.'
  }
  if ($status) {
    throw 'Working tree is not clean. Commit or stash changes before prod promotion.'
  }
}

function Invoke-Checked([string]$Exe, [string[]]$Arguments) {
  & $Exe @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $Exe $($Arguments -join ' ')"
  }
}

function Is-CloneMode([string]$SelectedMode) {
  return $SelectedMode -eq 'full' -or $SelectedMode -eq 'db_only'
}

function Is-SafeMigrationMode([string]$SelectedMode) {
  return $SelectedMode -eq 'safe_full' -or $SelectedMode -eq 'safe_db_only'
}

Assert-Exact -Label 'ApprovalText' -Actual $ApprovalText -Expected 'APPROVED FOR PROD'
Assert-Exact -Label 'ENABLE_PROD_RELEASES' -Actual ([Environment]::GetEnvironmentVariable('ENABLE_PROD_RELEASES')) -Expected '1'
if (Is-CloneMode $Mode) {
  Assert-Exact -Label 'CloneConfirmText' -Actual $CloneConfirmText -Expected 'CONFIRM DEV TO PROD CLONE'
}

$currentBranch = git rev-parse --abbrev-ref HEAD
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to detect current branch.'
}

if ($currentBranch -ne 'main') {
  throw "Current branch is '$currentBranch'. Checkout 'main' after merging reviewed changes from 'develop'."
}

Write-Host "::STEP::preflight::10"
Assert-CleanGit

Write-Host "::STEP::verify_merge::20"
Invoke-Checked git @('fetch', 'origin', 'develop', 'main')
git merge-base --is-ancestor origin/develop origin/main
if ($LASTEXITCODE -ne 0) {
  throw "main does not contain origin/develop yet. Merge develop into main (via reviewed PR) first."
}

if (Is-CloneMode $Mode) {
  Write-Host "::STEP::clone_db::40"
  Invoke-Checked powershell.exe @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $ScriptRoot 'clone-dev-db-to-prod.ps1'),
    '-ApprovalText', $ApprovalText,
    '-CloneConfirmText', $CloneConfirmText
  )
} else {
  Write-Host "::STEP::clone_db_skipped::40"
}

if (Is-SafeMigrationMode $Mode) {
  Write-Host "::STEP::apply_prod_migrations::50"
  Invoke-Checked powershell.exe @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $ScriptRoot 'apply-prod-migrations.ps1'),
    '-ApprovalText', $ApprovalText
  )
} else {
  Write-Host "::STEP::apply_prod_migrations_skipped::50"
}

if ($CloneStorage) {
  Write-Host "::STEP::clone_storage::55"
  Invoke-Checked powershell.exe @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $ScriptRoot 'clone-storage-dev-to-prod.ps1'),
    '-ApprovalText', $ApprovalText,
    '-CloneConfirmText', $CloneConfirmText
  )
} else {
  Write-Host "::STEP::clone_storage_skipped::55"
}

if ($CloneDashboardSettings) {
  Write-Host "::STEP::sync_dashboard_settings::65"
  Invoke-Checked powershell.exe @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $ScriptRoot 'sync-dashboard-settings-to-prod.ps1'),
    '-ApprovalText', $ApprovalText
  )
} else {
  Write-Host "::STEP::sync_dashboard_settings_skipped::65"
}

if ($CloneEdgeFunctions) {
  Write-Host "::STEP::deploy_edge_functions::75"
  Invoke-Checked powershell.exe @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $ScriptRoot 'deploy-edge-functions-to-prod.ps1'),
    '-ApprovalText', $ApprovalText
  )
} else {
  Write-Host "::STEP::deploy_edge_functions_skipped::75"
}

if ($Mode -eq 'full' -or $Mode -eq 'safe_full' -or $Mode -eq 'app_only') {
  Write-Host "::STEP::deploy_prod::90"
  Invoke-Checked powershell.exe @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $ScriptRoot 'deploy-pages.ps1'),
    '-Target', 'prod'
  )
} else {
  Write-Host "::STEP::deploy_prod_skipped::90"
}

Write-Host "::STEP::done::100"
Write-Host "[promote] Completed with mode '$Mode'."
