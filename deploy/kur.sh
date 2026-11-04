#!/usr/bin/env bash
# Devran VPS kurulumu (D4). Root ya da sudo ile, depo kökünden: sudo bash deploy/kur.sh
# Yapar: Node 22 (yoksa NodeSource), `devran` sistem kullanıcısı, /opt/devran'a kopya, npm ci, npm run build,
# .env (yoksa .env.example'dan), systemd servisi (127.0.0.1:2567). Cloudflare Tunnel ayrı adım: deploy/README.md.
set -euo pipefail
HEDEF=/opt/devran
KAYNAK="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  echo "[kur] Node 22 kuruluyor"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

id devran >/dev/null 2>&1 || useradd --system --home "$HEDEF" --shell /usr/sbin/nologin devran
mkdir -p "$HEDEF" "$HEDEF/veri-db"
rsync -a --delete --exclude node_modules --exclude dist --exclude .git --exclude .env --exclude veri-db "$KAYNAK/" "$HEDEF/"
[ -f "$HEDEF/.env" ] || cp "$HEDEF/.env.example" "$HEDEF/.env"
chown -R devran:devran "$HEDEF"
chmod 600 "$HEDEF/.env"

cd "$HEDEF"
sudo -u devran npm ci --no-audit --no-fund
sudo -u devran npm run build
test -f dist/server/server.mjs

install -m 644 "$HEDEF/deploy/devran.service" /etc/systemd/system/devran.service
systemctl daemon-reload
systemctl enable --now devran
sleep 2
systemctl --no-pager status devran | head -n 12
curl -fsS http://127.0.0.1:2567/api/saglik && echo
echo "[kur] tamam. Tünel: deploy/README.md"
