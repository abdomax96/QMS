param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('dev', 'prod')]
  [string]$Target
)

$ErrorActionPreference = 'Stop'

function Invoke-Checked([string]$Exe, [string[]]$Args) {
  $pretty = @($Exe) + $Args
  Write-Host (">> " + ($pretty -join ' '))
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $Exe $($Args -join ' ')"
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

$projectName = if ($Target -eq 'dev') { 'qms-dev' } else { 'qms-prod' }
$branch = if ($Target -eq 'dev') { 'develop' } else { 'main' }
$mode = if ($Target -eq 'dev') { 'development' } else { 'production' }

if ($Target -eq 'dev' -and -not (Test-Path .env.local) -and -not (Test-Path .env.development.local)) {
  throw "Missing '.env.local' or '.env.development.local'. Create one with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for development."
}

if ($Target -eq 'prod' -and -not (Test-Path .env.production.local)) {
  throw "Missing '.env.production.local'. Create it with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production."
}

Write-Host "Building for $Target..."
Invoke-Checked npm @('ci')

# Use explicit Vite mode so dev/prod builds never accidentally pick up the wrong .env.* file.
Invoke-Checked npm @('run', 'build', '--', '--mode', $mode)

Write-Host "Deploying to Cloudflare Pages project '$projectName' (branch: $branch)..."
Invoke-Checked npx @('--yes', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', $projectName, '--branch', $branch)
