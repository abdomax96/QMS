#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

MM_DOMAIN="${MM_DOMAIN:-}"
MM_SUPPORT_EMAIL="${MM_SUPPORT_EMAIL:-}"

if [ -z "$MM_DOMAIN" ]; then
  read -r -p "Enter your Mattermost domain (e.g. chat.example.com): " MM_DOMAIN
fi

if [ -z "$MM_DOMAIN" ]; then
  echo "MM_DOMAIN is required."
  exit 1
fi

if [ -z "$MM_SUPPORT_EMAIL" ]; then
  read -r -p "Enter support email (optional, press Enter to skip): " MM_SUPPORT_EMAIL || true
fi

echo "[1/7] Installing prerequisites..."
$SUDO apt update -y
$SUDO apt install -y ca-certificates curl gnupg lsb-release git

if ! command -v docker >/dev/null 2>&1; then
  echo "[2/7] Installing Docker Engine + Compose..."
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt update -y
  $SUDO apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  $SUDO systemctl enable --now docker
fi

echo "[3/7] Preparing Mattermost directory..."
$SUDO mkdir -p /opt/mattermost
$SUDO chown -R "$USER":"$USER" /opt/mattermost
cd /opt/mattermost

if [ -d "./docker" ]; then
  echo "Directory /opt/mattermost/docker already exists. Remove it if you want a fresh install."
  exit 1
fi

git clone https://github.com/mattermost/docker
cd docker
cp env.example .env

echo "[4/7] Configuring .env..."
if grep -q "^DOMAIN=" .env; then
  sed -i "s|^DOMAIN=.*|DOMAIN=${MM_DOMAIN}|g" .env
else
  echo "DOMAIN=${MM_DOMAIN}" >> .env
fi

if grep -q "^MM_SERVICESETTINGS_SITEURL=" .env; then
  sed -i "s|^MM_SERVICESETTINGS_SITEURL=.*|MM_SERVICESETTINGS_SITEURL=https://${MM_DOMAIN}|g" .env
else
  echo "MM_SERVICESETTINGS_SITEURL=https://${MM_DOMAIN}" >> .env
fi

echo "[5/7] Creating volumes and permissions..."
mkdir -p ./volumes/app/mattermost/{config,data,logs,plugins,client/plugins,bleve-indexes}
$SUDO chown -R 2000:2000 ./volumes/app/mattermost

echo "[6/7] Issuing TLS certificate (optional)..."
if [ -n "$MM_SUPPORT_EMAIL" ]; then
  if grep -q "^MM_SUPPORTSETTINGS_SUPPORTEMAIL=" .env; then
    sed -i "s|^MM_SUPPORTSETTINGS_SUPPORTEMAIL=.*|MM_SUPPORTSETTINGS_SUPPORTEMAIL=${MM_SUPPORT_EMAIL}|g" .env
  else
    echo "MM_SUPPORTSETTINGS_SUPPORTEMAIL=${MM_SUPPORT_EMAIL}" >> .env
  fi
fi

bash scripts/issue-certificate.sh -d "${MM_DOMAIN}" -o "${PWD}/certs"

echo "CERT_PATH=./certs/etc/letsencrypt/live/${MM_DOMAIN}/fullchain.pem" >> .env
echo "KEY_PATH=./certs/etc/letsencrypt/live/${MM_DOMAIN}/privkey.pem" >> .env

echo "[7/7] Starting Mattermost (NGINX + HTTPS)..."
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d

echo "Done. Open https://${MM_DOMAIN} in your browser."
