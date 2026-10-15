#!/usr/bin/env bash
set -euo pipefail
# Publica o BI: staging -> live e recarrega o nginx. Roda na VPS via ssh 'bash -s'.
command -v rsync >/dev/null || { apt-get update -qq && apt-get install -y -qq rsync; }
mkdir -p /var/www/zupper-bi-live
rsync -a --delete /var/www/zupper-bi-staging/ /var/www/zupper-bi-live/
chmod -R a+rX /var/www/zupper-bi-live
echo "arquivos publicados: $(find /var/www/zupper-bi-live -type f | wc -l)"
ls /etc/nginx/sites-available/ | grep -q "zupper-bi" || { echo "ERRO: vhost zupper-bi nao existe. Rode deploy/vps-setup.sh uma vez." >&2; exit 1; }
nginx -t
systemctl reload nginx
echo "DEPLOY OK - $(date -u +%FT%TZ)"
