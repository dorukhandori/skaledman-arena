# Devran dağıtımı (D4)

Durum: **dosyalar hazır, VPS'e bu ortamdan dağıtım yapılamadı** (oturumun VPS erişimi yok). Sahip ya da VPS
erişimi olan oturum aşağıdaki adımları uygular.

## Mimari
- Not: `colyseus/vite` üretim girişi `server.listen(2567)` ile tüm arayüzlere bağlanır; dış erişimi birim dosyasındaki `IPAddressDeny=any` + `IPAddressAllow=localhost` keser (ve VPS güvenlik duvarında 2567 kapalı tutulur).
- Tek Node 22 süreci (`dist/server/server.mjs`, `vite build --app` çıktısı): Colyseus 0.18 + istemci dosyaları
  (`serveClient`). Dinleme **yalnız `127.0.0.1:2567`**; dışarı açılan port yok.
- Dış erişim **Cloudflare Tunnel**, tünel adı `devran`. Alan adı **sahip kararı** (öneri B-24: `devran.ovarlak.games`).
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
```bash
cloudflared tunnel login
cloudflared tunnel create devran
cloudflared tunnel route dns devran <alan-adı>
# /etc/cloudflared/config.yml
#   tunnel: devran
#   credentials-file: /root/.cloudflared/<tünel-id>.json
#   ingress:
#     - hostname: <alan-adı>
#       service: http://127.0.0.1:2567
#     - service: http_status:404
sudo cloudflared service install && sudo systemctl enable --now cloudflared
```
WebSocket tünelden geçer (Cloudflare varsayılanı açık). Access: Zero Trust › Access › Applications › Self-hosted,
`<alan-adı>`, politika: davetli e-postalar.

## Güncelleme
`git pull && sudo bash deploy/kur.sh` (servis yeniden başlar; devam eden maçlar düşer: bakım duyurusu D8).

## Doğrulama
- `systemctl status devran`, `journalctl -u devran -f` (oda/ölçüm günlükleri: `[mac …]`, `[olcum …]`).
- `curl -s http://127.0.0.1:2567/api/saglik` → `{"ok":true,"protokol":3,...}`.
- Tarayıcıdan `https://<alan-adı>/?ekran=lobi` → Oda aç → ikinci cihazdan bağlantıyla katıl.
