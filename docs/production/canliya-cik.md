# Canlıya çıkış talimatı (VPS oturumu için)

**Okuyan:** sahibin VPS'inde (ya da Wyrmwar'ı yayınladığı makinede) çalışan Claude Code oturumu. Anahtarlar (Cloudflare,
SSH, VPS) o makinede kalır; bu depoya ya da sohbete yazılmaz. Sohbet Türkçe, commit mesajları İngilizce.
Kick OAuth ile ilgili HİÇBİR şeye dokunma (sahip yasakladı); giriş ad + şifre (`KIMLIK_MODU=sifre`).

## 0. Karar: Wyrmwar gibi yayınla
Wyrmwar'ın yayın düzeni neyse (aynı VPS, aynı Cloudflare hesabı ve Tunnel yöntemi, aynı alan adı bölgesi) Devran da öyle
yayınlanır. Önce o düzeni oku: Wyrmwar'ın deploy betikleri/servis dosyaları, Tunnel yapılandırması (`/etc/cloudflared/config.yml`
veya `cloudflared tunnel list`), hangi kullanıcıyla çalıştığı. Devran için **ayrı** servis, ayrı kullanıcı, ayrı veri dizini,
ayrı port (2567 başka bir şeyle çakışıyorsa `PORT` ile değiştir ve Tunnel hedefini ona göre yaz).

## 1. Depoyu al
```bash
git clone https://github.com/dorukhandori/skaledman-arena.git devran && cd devran
git checkout devran-kod && git pull origin devran-kod      # main'e PR birleşince main olabilir
```

## 2. Kurulum (ayrıntı: `deploy/README.md`)
```bash
sudo bash deploy/kur.sh        # Node 22, devran kullanıcısı, /opt/devran, npm ci, build, systemd servisi
sudo nano /opt/devran/.env
```
`.env` (değerleri sahip/oturum üretir, depoya YAZMA):
- `NODE_ENV=production`
- `OTURUM_SIRRI=<en az 32 karakter rastgele: openssl rand -hex 32>`
- `KIMLIK_MODU=sifre`
- `IZINLI_KOKENLER=https://<devran-alan-adı>`  (tam köken; yanlışsa kayıt/giriş 403 verir)
- `VERI_DIZINI=/opt/devran/veri-db`
- `GUVENILIR_VEKIL=1`  (Cloudflare arkasında IP başlığı)
Sonra: `sudo systemctl restart devran && curl -s http://127.0.0.1:2567/api/saglik`
(beklenen: `{"ok":true,"protokol":6,"katalog":"…","kimlik":"sifre",…}`).

## 3. Cloudflare Tunnel
Wyrmwar'ın mevcut Tunnel'ına yeni bir ingress satırı ekleyebilirsin (aynı tünel, ikinci hostname) ya da `devran` adlı yeni tünel:
```bash
cloudflared tunnel route dns <tünel> <devran-alan-adı>
# config.yml ingress:  - hostname: <devran-alan-adı>   service: http://127.0.0.1:2567
sudo systemctl restart cloudflared
```
WebSocket Cloudflare'den varsayılan geçer. Test dönemi için istersen Cloudflare Access (davetli e-postalar) önüne koy.
Alan adı: Wyrmwar'ın bölgesinde bir alt alan adı (örn. `devran.<alan-adı>`) öner; sahibe tek satırla teyit ettir.

## 4. Yedek ve sertleştirme
```bash
sudo bash deploy/yedek.sh      # elle bir kez: "bütünlük ok"
sudo cp deploy/devran-yedek.{service,timer} /etc/systemd/system/ && sudo systemctl enable --now devran-yedek.timer
```
Doğrula: `curl -X POST https://<alan>/api/gelistirme/altin-ver` → **404** (üretimde geliştirme uçları kapalı),
`/gizlilik` ve `/krediler` açılıyor, yanlış Origin'li kayıt isteği 403.

## 5. Uçtan uca doğrulama (gerçek)
1. `https://<alan>/api/saglik` yanıt veriyor.
2. Tarayıcıdan **Kayıt ol** (ad + şifre) → İlk Çekirdek → Antrenman → bir bot maçı.
3. İki hesapla Lobi › Oda kodu: biri oda açar, diğeri kodla katılır, maç oynanır; iki istemci hash'i uyumlu (sapma 0).
4. Telefonda aynı adres: yatay mod, dokunmatik kontroller (`docs/production/raporlar/MOBIL-1.md` gerçek cihaz listesi).
5. OBS seyirci bağlantısı: `https://<alan>/#izle=<KOD>`.
6. Günlük: `journalctl -u devran -n 100` hatasız. Bütçe/izleme: `docs/production/test-gecesi.md` § 4.

## 6. Güncelleme
`git pull && sudo bash deploy/kur.sh` (servis yeniden başlar, süren maçlar düşer; maç yokken yap).

## 7. Sonuç raporu
Yaptıklarını, sağlık çıktısını (anahtarsız), alan adını ve kalan sorunları `docs/production/raporlar/CANLI-1.md` olarak yaz;
`devran-kod`'a push et (yalnız rapor ve gerekirse `deploy/` düzeltmeleri; sır YOK).
