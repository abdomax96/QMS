param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('dev', 'prod')]
  [string]$Target
)

$ErrorActionPreference = 'Stop'

function Invoke-Checked([string]$Exe, [string[]]$Arguments) {
  $pretty = @($Exe) + $Arguments
  Write-Host (">> " + ($pretty -join ' '))
  & $Exe @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $Exe $($Arguments -join ' ')"
  }
}

function Assert-EnvVar([string]$Name) {
  $val = [Environment]::GetEnvironmentVariable($Name)
  if (-not $val -or [string]::IsNullOrWhiteSpace($val)) {
    throw "Missing environment variable '$Name'."
  }
}

Assert-EnvVar 'CLOUDFLARE_ACCOUNT_ID'
Assert-EnvVar 'CLOUDFLARE_API_TOKEN'

function Has-Value([string]$Value) {
  return -not [string]::IsNullOrWhiteSpace($Value)
}

$projectName = if ($Target -eq 'dev') { 'qms-dev' } else { 'qms-prod' }
$branch = if ($Target -eq 'dev') { 'develop' } else { 'main' }
$mode = if ($Target -eq 'dev') { 'development' } else { 'production' }

if ($Target -eq 'dev' -and -not (Test-Path .env.local) -and -not (Test-Path .env.development.local)) {
  throw "Missing '.env.local' or '.env.development.local'. Create one with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for development."
}

if ($Target -eq 'prod' -and -not (Test-Path .env.production.local)) {
  $prodUrl = [Environment]::GetEnvironmentVariable('VITE_SUPABASE_URL')
  $prodAnonKey = [Environment]::GetEnvironmentVariable('VITE_SUPABASE_ANON_KEY')
  if (-not (Has-Value $prodUrl) -or -not (Has-Value $prodAnonKey)) {
    throw "Missing '.env.production.local' and missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in environment."
  }
  Write-Host "'.env.production.local' not found in current worktree. Using VITE_SUPABASE_* from environment."
}

Write-Host "Building for $Target..."
Write-Host "::STEP::build_$Target::35"
if (-not (Test-Path node_modules)) {
  Invoke-Checked npm.cmd @('ci')
} else {
  Write-Host "node_modules already exists; skipping npm ci"
}

# Use explicit Vite mode so dev/prod builds never accidentally pick up the wrong .env.* file.
Invoke-Checked npm.cmd @('run', 'build', '--', '--mode', $mode)

Write-Host "::STEP::deploy_$Target::75"
Write-Host "Deploying to Cloudflare Pages project '$projectName' (branch: $branch)..."
Invoke-Checked npx.cmd @('--yes', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', $projectName, '--branch', $branch)
Write-Host "::STEP::done::100"
