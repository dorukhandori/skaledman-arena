#!/usr/bin/env bash
# Devran VPS kurulumu (D4, D5: SQLite + OTURUM_SIRRI). Root ya da sudo ile, depo kökünden: sudo bash deploy/kur.sh
# Yapar: Node 22 (yoksa NodeSource), `devran` sistem kullanıcısı, /opt/devran'a kopya, npm ci, npm run build,
# .env (yoksa .env.example'dan), systemd servisi (127.0.0.1:2567). Cloudflare Tunnel ayrı adım: deploy/README.md.
set -euo pipefail
HEDEF=/opt/devran
KAYNAK="$(cd "$(dirname "$0")/.." && pwd)"
# Üretim portu: VPS'te 2567'yi WyrmWar tutar. Değiştirirsen deploy/devran.service ve tünel ingress'i de güncelle.
SUNUCU_PORT="${SUNUCU_PORT:-2568}"

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  echo "[kur] Node 22 kuruluyor"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

id devran >/dev/null 2>&1 || useradd --system --home "$HEDEF" --shell /usr/sbin/nologin devran
mkdir -p "$HEDEF" "$HEDEF/veri-db"
# yedek: devran-yedek.timer /opt/devran/yedek altına yazar; --delete onu silmesin
rsync -a --delete --exclude node_modules --exclude dist --exclude .git --exclude .env --exclude veri-db --exclude yedek "$KAYNAK/" "$HEDEF/"
if [ ! -f "$HEDEF/.env" ]; then
  cp "$HEDEF/.env.example" "$HEDEF/.env"
  # D5: oturum/bilet imza anahtarı rastgele üretilir (sunucu bunsuz açılmaz)
  sed -i "s|^OTURUM_SIRRI=.*|OTURUM_SIRRI=$(openssl rand -base64 48 | tr -d '\n')|" "$HEDEF/.env"
fi
chown -R devran:devran "$HEDEF"
chmod 600 "$HEDEF/.env"

cd "$HEDEF"
# better-sqlite3 yerel modül: Node 22 için önceden derlenmiş ikili indirilir (yoksa derlemek için build-essential gerekir)
sudo -u devran npm ci --no-audit --no-fund
sudo -u devran env SUNUCU_PORT="$SUNUCU_PORT" npm run build
grep -qE "listen\($SUNUCU_PORT[,)]" dist/server/server.mjs || { echo "[kur] HATA: derlenen sunucu $SUNUCU_PORT portunu dinlemiyor"; exit 1; }
test -f dist/server/server.mjs

install -m 644 "$HEDEF/deploy/devran.service" /etc/systemd/system/devran.service
systemctl daemon-reload
systemctl enable --now devran
sleep 2
systemctl --no-pager status devran | head -n 12
curl -fsS "http://127.0.0.1:$SUNUCU_PORT/api/saglik" && echo
echo "[kur] tamam. Tünel: deploy/README.md"
