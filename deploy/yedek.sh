#!/usr/bin/env bash
# Devran SQLite günlük yedeği (D8, test gecesi). Çalışan sunucuyu durdurmadan tutarlı kopya: sqlite3 `.backup`
# (WAL dahil, çevrimiçi yedek API'si). Yoksa Node + better-sqlite3 `db.backup()`. Bütünlük denetimi + sıkıştırma,
# son 14 gün tutulur. systemd: deploy/devran-yedek.service + deploy/devran-yedek.timer (her gün 04:30 TR).
# Elle: sudo -u devran /opt/devran/deploy/yedek.sh
set -euo pipefail
VERI="${VERI_DIZINI:-/opt/devran/veri-db}"
HEDEF="${YEDEK_DIZINI:-/opt/devran/yedek}"
GUN="${YEDEK_GUN:-14}"
KAYNAK="$VERI/devran.sqlite"
DAMGA="$(date -u +%Y%m%dT%H%M%SZ)"
CIKTI="$HEDEF/devran-$DAMGA.sqlite"
mkdir -p "$HEDEF"
[ -f "$KAYNAK" ] || { echo "yedek: $KAYNAK yok" >&2; exit 1; }
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$KAYNAK" ".backup '$CIKTI'"
  SONUC="$(sqlite3 "$CIKTI" 'PRAGMA integrity_check;')"
else
  cd "${DEVRAN_DIZINI:-/opt/devran}"  # better-sqlite3 buradan çözülür
  SONUC="$(node -e "const D=require('better-sqlite3');const k=new D(process.argv[1],{readonly:true});k.backup(process.argv[2]).then(()=>{const y=new D(process.argv[2],{readonly:true});console.log(y.pragma('integrity_check',{simple:true}));})" "$KAYNAK" "$CIKTI")"
fi
if [ "$SONUC" != "ok" ]; then echo "yedek: bütünlük denetimi başarısız: $SONUC" >&2; exit 2; fi
gzip -9 "$CIKTI"
find "$HEDEF" -name 'devran-*.sqlite.gz' -mtime "+$GUN" -delete
echo "yedek: $CIKTI.gz ($(du -h "$CIKTI.gz" | cut -f1)), bütünlük ok"
