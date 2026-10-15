#!/usr/bin/env bash
# Preparacao unica do VPS (rodar como root, UMA vez):
#   DOMAIN=zupperbi.ai.metrixconsultoria.com bash vps-setup.sh
# Pre-requisito: o DNS (registro A) de $DOMAIN ja aponta para este servidor.
set -euo pipefail
: "${DOMAIN:?defina DOMAIN, ex.: DOMAIN=zupperbi.ai.metrixconsultoria.com}"
mkdir -p /var/www/zupper-bi-live /var/www/zupper-bi-staging
cat > /etc/nginx/sites-available/zupper-bi-$DOMAIN <<CONF
server {
  listen 80;
  server_name $DOMAIN;
  root /var/www/zupper-bi-live;
  index index.html;

  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options DENY always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header Permissions-Policy "microphone=(self), camera=(), geolocation=()" always;

  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; try_files \$uri =404; }
  location = /index.html { add_header Cache-Control "no-store"; }
  location / { try_files \$uri /index.html; }
}
CONF
ln -sf /etc/nginx/sites-available/zupper-bi-$DOMAIN /etc/nginx/sites-enabled/zupper-bi-$DOMAIN
nginx -t && systemctl reload nginx
command -v certbot >/dev/null || apt-get install -y -qq certbot python3-certbot-nginx
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m wesley.ferreira@metrixconsultoria.com --redirect
echo "VPS pronto para $DOMAIN"
