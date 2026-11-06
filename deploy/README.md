# Devran dağıtımı (D4)

Durum (2026-11-06): **VPS'te canlı: https://devran.ovarlak.games** (kur.sh ile kuruldu, `devran.service` + `cloudflared-devran.service`).
Aşağıdaki "Cloudflare Tunnel" bölümündeki genel komutlar yerine VPS'te şu kalıp kullanıldı: tünel `3ba11d38…` (`cloudflared tunnel create devran`),
ayar `/etc/cloudflared/devran.yml`, servis `cloudflared-devran` (diğer tüneller gibi ayrı yapılandırma; varsayılan `config.yml`'e dokunulmaz),
DNS `cloudflared tunnel --config /etc/cloudflared/devran.yml route dns <id> devran.ovarlak.games`.

## Mimari
- **Port 2568** (2567'yi VPS'te WyrmWar tutuyor). Port yapı sırasında gömülür: `SUNUCU_PORT` ortam değişkeni `vite.config.ts` içinde okunur,
  `deploy/kur.sh` varsayılan 2568 ile derler ve çıktıyı doğrular. Birim dosyasındaki `PORT=` yalnız bilgi amaçlıdır; sunucu gömülü portu dinler.
- Bağlanma adresi: `vite.config.ts` içindeki `hostBagla()` derlenen girişe `listen(<port>, process.env.HOST)` yazar; birim dosyasındaki `Environment=HOST=127.0.0.1` ile sunucu yalnız yerel arayüzü dinler (2026-11-06 yerelde `lsof` ile doğrulandı). `IPAddressDeny=any` + `IPAddressAllow=localhost` ve kapalı güvenlik duvarı ikinci kat olarak kalır.
- Tek Node 22 süreci (`dist/server/server.mjs`, `vite build --app` çıktısı): Colyseus 0.18 + istemci dosyaları
  (`serveClient`). Dışarı açılan port yok.
- Dış erişim **Cloudflare Tunnel**, tünel adı `devran`, alan adı `devran.ovarlak.games`.
- Test döneminde site **Cloudflare Access** arkasında (yalnız davetli e-postalar); `KIMLIK_MODU=yerel` yalnız bu
  koşulda kabul edilebilir. D5'te Kick OAuth gelince `KIMLIK_MODU=kick`.
- systemd: ayrı `devran` kullanıcısı, `CPUQuota=150%`, `MemoryMax=1G`, sertleştirme (`deploy/devran.service`).

## Kurulum
```bash
git clone <depo> devran && cd devran && git checkout devran-kod
sudo bash deploy/kur.sh          # Node 22, kullanıcı, /opt/devran, npm ci, build, servis
sudo nano /opt/devran/.env       # IZINLI_KOKENLER=https://<alan-adı>
sudo systemctl restart devran
curl http://127.0.0.1:2567/api/saglik
```

## Cloudflare Tunnel (`devran`)
Tuzak: `cloudflared tunnel route dns` ve `cloudflared service install` varsayılan `/etc/cloudflared/config.yml`'yi okur; VPS'te o
dosya başka bir projenin (tradebot) tüneline aittir. Devran için **ayrı yapılandırma** ve tünel kimliği kullanılır:
```bash
cloudflared tunnel login
cloudflared tunnel create devran                      # çıktıdaki <tünel-id>'yi not et
# /etc/cloudflared/devran.yml
#   tunnel: <tünel-id>
#   credentials-file: /root/.cloudflared/<tünel-id>.json
#   ingress:
#     - hostname: <alan-adı>
#       service: http://127.0.0.1:2568
#     - service: http_status:404
cloudflared tunnel --config /etc/cloudflared/devran.yml route dns <tünel-id> <alan-adı>
# ayrı systemd birimi (cloudflared-devran.service):
#   ExecStart=/usr/bin/cloudflared --no-autoupdate --config /etc/cloudflared/devran.yml tunnel run <tünel-id>
sudo systemctl enable --now cloudflared-devran
```
WebSocket tünelden geçer (Cloudflare varsayılanı açık). Access: Zero Trust › Access › Applications › Self-hosted,
`<alan-adı>`, politika: davetli e-postalar.

## Güncelleme
`git pull && sudo bash deploy/kur.sh` (servis yeniden başlar; devam eden maçlar düşer: bakım duyurusu D8).

## Doğrulama
- `systemctl status devran`, `journalctl -u devran -f` (oda/ölçüm günlükleri: `[mac …]`, `[olcum …]`).
- `curl -s http://127.0.0.1:2567/api/saglik` → `{"ok":true,"protokol":3,...}`.
- Tarayıcıdan `https://<alan-adı>/?ekran=lobi` → Oda aç → ikinci cihazdan bağlantıyla katıl.
