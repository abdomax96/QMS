param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('dev', 'prod')]
  [string]$Target
)

$ErrorActionPreference = 'Stop'

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

if ($Target -eq 'prod' -and -not (Test-Path .env.production.local)) {
  throw "Missing '.env.production.local'. Create it with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production."
}

Write-Host "Building for $Target..."
npm ci
npm run build

Write-Host "Deploying to Cloudflare Pages project '$projectName' (branch: $branch)..."
npx --yes wrangler pages deploy dist --project-name $projectName --branch $branch
