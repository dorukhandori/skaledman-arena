# İlk test gecesi: yayıncı kontrol listesi (D8)

**Hedef (nile D8):** yayıncının Kick kanalında bir gece; **≥ 10 izleyici kendi hesabıyla oynar**, yayıncı OBS'te
**seyirci görünümünü** gösterir, kritik hata yok. Kapı durumu: `docs/production/raporlar/D8.md` § QA kapısı
(kırmızı madde varsa önce o).

## 1. Bir gün önce (sahip)
- [ ] **Alan adı** alındı, Cloudflare'de (DNS). Adımlar: [deploy/README.md](../../deploy/README.md) § Cloudflare Tunnel.
- [ ] **VPS:** `deploy/kur.sh` ile kurulum, `.env`: `NODE_ENV=production`, `OTURUM_SIRRI` (≥ 32 karakter, rastgele),
      `IZINLI_KOKENLER=https://<alan-adı>`, `VERI_DIZINI=/opt/devran/veri-db`, `GUVENILIR_VEKIL=1` (Cloudflare IP başlığı).
- [ ] **Cloudflare Tunnel** `devran` → `http://127.0.0.1:2567`; `https://<alan-adı>/api/saglik` → `{"ok":true,"protokol":6,…}`.
- [ ] **Yedek:** `deploy/yedek.sh` elle bir kez (çıktı "bütünlük ok"), sonra `devran-yedek.timer` açık
      (`sudo cp deploy/devran-yedek.{service,timer} /etc/systemd/system/ && sudo systemctl enable --now devran-yedek.timer`).
- [ ] **Geliştirme uçları kapalı:** `curl -X POST https://<alan-adı>/api/gelistirme/altin-ver` → 404 (NODE_ENV=production).
- [ ] Yayıncı hesabı açıldı, İlk Devir (eğitim) bitti, en az bir takım kayıtlı.
- [ ] **OBS:** Tarayıcı kaynağı 1920×1080 (tam sayı ölçek ×2), adres Lobi'deki **Seyirci bağlantısını kopyala**
      (`https://<alan-adı>/#izle=ABCDEFGH`); tribün/çerçeve kendi sahnende ise sonuna `&seffaf=1`. "Sayfa görünür değilken
      kapat" KAPALI. Ses: tarayıcı kaynağı sesi OBS'e (Ayarlar › Ses açık).
- [ ] Gizlilik sayfası (`/gizlilik`) ve krediler (`/krediler`) açılıyor; yayın açıklamasına gizlilik bağlantısı.

## 2. Yayın başında (10 dk)
- [ ] `systemctl status devran` aktif, `journalctl -u devran -n 50` hatasız.
- [ ] Yayıncı Lobi › **Oda kodu › Oda aç**. Seyirci görünümü OBS'te "Sıradaki maç bekleniyor" + **katılma kodu** gösteriyor.
- [ ] Bir deneme maçı (yayıncı + bir moderatör): HUD iki tarafta, stamina yüzdeleri, parça kartları, kod maç başlayınca gizli.

## 3. İlk 10 izleyici akışı
1. İzleyici `https://<alan-adı>` → **Kayıt ol** (kullanıcı adı + şifre; e-posta yok) → profil → ilk Çekirdek → kısa eğitim (İlk Devir).
2. Lobi › **Oda kodu** → ekrandaki kodu yaz → **Odaya katıl** → takım seç → **Hazır**.
3. Maç (≈ 1 dk). Sonuç ekranı: Altın, Çekirdek kartı, başarım. İzleyici çıkınca oda kapanır.
4. Yayıncı yeni oda açar (**seyirci bağlantısı aynı kalır**; OBS'e dokunma). Sıradaki izleyici yeni kodla katılır.
5. Sırada bekleyenler bu arada **Hızlı maç** ile birbirleriyle oynayabilir (60 sn rakip yoksa bot teklifi).

Kural notları (sorulursa): aynı iki hesap günde en çok 3 sayılan maç; oda maçı Altını ×0,25; bot maçı yarı Altın.
Kick girişi bu gecede **yok** (ad + şifre).

## 4. İzleme (gece boyunca)
- Sunucu günlüğü: `journalctl -u devran -f | grep -E "error|hata|kayıt|maç bitti"` (her maç sonu `kayıt … altın+N`).
- Oda adımı süresi: maç sonunda günlükte `[olcum …] p95 … oda p95 … (seyirci N)`; bütçe 4 ms (axiom § 3). D8 ölçümü raporda.
- Kaynak: `systemctl status devran` (MemoryMax 1G, CPUQuota %150). Seyirci odası en çok 50 kişi.
- Disk: `du -sh /opt/devran/veri-db /opt/devran/yedek`.

## 5. Bilinen riskler
- **Tek süreç:** sunucu düşerse süren maçlar kaydedilmez (Altın yok, maç sayılmaz; D8 çökme testi), systemd 3 sn'de kaldırır;
  oyuncular "Bağlanamadık" görür, oturumlar kalır, yeniden oda açılır.
- **Bot oynanışı test edildi, insan play pass yok:** his ve denge izleyicilerle ilk kez sınanacak (bot turnuvası kazanım bandı
  kırmızıysa raporda yazılı).
- **Görsel yer tutucular:** ruh siluetleri, ikonlar kodla çizildi (Görsel Uyum Geçişi sonraya).
- **Ağ:** N3 (150 ms) profilinde hash sapması 0 ama düzeltme sıçramaları görünür olabilir (D4/D8 matrisi).
- **Kaba kuvvet sınırı:** aynı IP + ad dakikada 10 giriş denemesi; aynı Wi-Fi'deki stüdyo misafirleri etkilenmez (ad başına).
- **Hesap adı filtresi** kaba sözcükleri reddeder; yanlış pozitif olursa farklı ad.

## 6. Kırmızı olursa ne yapılır
| Belirti | İlk adım | Sonra |
|---|---|---|
| Site açılmıyor | `curl localhost:2567/api/saglik` (VPS'te) | çalışıyorsa tünel: `systemctl restart cloudflared`; değilse `systemctl restart devran`, `journalctl -u devran -n 200` |
| Maçlar donuyor / sıçrıyor | H10 rozeti (ms) ve kayıp; tek oyuncu mu herkes mi | herkes: VPS CPU (`top`), seyirci sayısı; tek: oyuncunun ağı |
| Seyirci görünümü boş | OBS kaynağını yenile (bağlantı aynı) | Lobi'den bağlantıyı yeniden kopyala; yayıncı yeni oda açtı mı |
| Sonuç ekranında Altın yok | maç < 20 sn, oda maçı ×0,25, aynı çift 4. maç (kural) | günlükte `kayıt …` satırı; yoksa hata satırı |
| Veritabanı hatası | `systemctl stop devran`, son yedeği `gunzip` + `PRAGMA integrity_check` | yedekten dön: `cp devran-<damga>.sqlite /opt/devran/veri-db/devran.sqlite` (önce bozuğu sakla) |
| Kritik hata (çökme döngüsü) | yayında "bakım" de, sunucuyu durdur | `bakim.html` Cloudflare'de; hatayı issue'ya (günlük + adım) |

## 7. Geri bildirim formu (yer tutucu)
Gece sonunda izleyicilere tek bağlantı: **(form adresi buraya; sahip açacak)**. Sorular: 1) Kayıt ve ilk maça kaç dakikada
geldin? 2) Topacın ne yaptığını anladın mı (1-5)? 3) Takım Ultisi'ni gördün mü, anlaşıldı mı? 4) Bir hata gördün mü
(ne, ne zaman)? 5) Tekrar oynar mısın? Cevaplar `docs/production/raporlar/` altına test gecesi notu olarak işlenir.
