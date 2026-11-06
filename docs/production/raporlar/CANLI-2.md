# CANLI-2 · Harita/Maden/Ocak ve menü turu canlıda (2026-11-06)

`[@vault · Backend Engineer]` Sahip: "her şeyi toparla ve canlıya çık". Neden: sahip yeni mekaniği oyunda göremedi; canlı site (https://devran.ovarlak.games) CANLI-1 sürümündeydi (protokol 6, harita görselleri yerine SPA `index.html` dönüyordu).

## Ne gitti
- Sürüm `d13cc81` (`devran-kod`): H1–H8 harita/maden/ocak kodu, sanat turu (HARITA-SANAT), menü denetimi P1A + P2, harita dengesi (HARITA-DENGE), sunucu `HOST` bağlama.
- Gönderim **commit'lenmiş hâlden** yapıldı (`git archive HEAD`): çalışma ağacında başka bir oturumun commit'lenmemiş Ata/PixelLab değişiklikleri vardı, canlıya gitmedi.
- Gönderimden önce dışa aktarılan kopyada kapılar: `npm test` 647/647, typecheck, lint, build yeşil.

## Adımlar
1. Yedek: `/root/devran-yedek-20261106-1803/` (VPS'te): `devran.sqlite` (`sqlite3 .backup`, `integrity_check` ok, 31 nesne), `kaynak.tgz` (eski `/root/devran-kaynak`), `opt-dist.tgz` (eski derleme).
2. `rsync -az --delete` dışa aktarım → `/root/devran-kaynak/` (`node_modules`, `dist` hariç), `bash deploy/kur.sh`.
3. `kur.sh` çalışan servisi yeniden başlatmadı (`enable --now` yalnız durmuş servisi açar); sağlık hâlâ protokol 6 → `systemctl restart devran`. Kalıcı düzeltme: `kur.sh` artık her kurulumda `systemctl restart devran` (bu commit).

## Doğrulama
- `https://devran.ovarlak.games/api/saglik` → `{"ok":true,"protokol":7,…}`; `/harita/zemin/ocak-yamaci.png` → `image/png`.
- Sunucu yalnız `127.0.0.1:2568`'de dinliyor (`ss -ltnp`): `HOST` bağlama üretimde de çalıştı.
- Veritabanı göçü: harita/maden/ocak tabloları oluştu (`harita_dugum`, `maden_seans`, `maden_vurus`, `maden_gunluk`, `cevher`, `ustalik`, `isleme_defteri`, `gorunum_sahip`, `bolge_rozet`, `seri_sayac`); mevcut 3 oyuncu korundu.
- Canlı sayfa tarayıcıda açıldı, konsol hatası 0. Canlı sitede test hesabı açılmadı; hesaplı akış yerelde `h:akis` ile uçtan uca doğrulandı (konsol hatası 0).
- Protokol 6 → 7: eski sekmesi açık oyuncular sayfayı yenilemeli (sürüm uyuşmazlığı 4101 ile söylenir).

## Geri dönüş
```bash
# VPS'te
systemctl stop devran
cp /root/devran-yedek-20261106-1803/devran.sqlite /opt/devran/veri-db/devran.sqlite && rm -f /opt/devran/veri-db/devran.sqlite-{wal,shm}
rm -rf /root/devran-kaynak && tar -xzf /root/devran-yedek-20261106-1803/kaynak.tgz -C /root
cd /root/devran-kaynak && bash deploy/kur.sh
```
(Veritabanı geri dönüşü, yedekten sonraki kayıtları siler; yalnız ciddi hatada.)

## İkinci çıkış: telefon menüleri geri (`5d5ada9`, 18:50)
- İlk çıkıştan sonra canlı kaynakla karşılaştırma: eski canlı, `devran-kod`'a hiç birleştirilmemiş `claude/mobil-menu-1b6ca9` dalından (MOBIL-2 telefon menüleri, `telefon.css`) kurulmuştu; `d13cc81` çıkışı telefon düzenini kaldırmıştı (masaüstü etkilenmedi; ~45 dk).
- Dal `devran-kod`'a birleştirildi (`5d5ada9`): P2 gezinti modeli korunarak telefon kancaları eklendi; `telefon.css`'e birleştirme düzeltmeleri (takım şeridinde `.tk-ad`, üst bant dokunma payları yukarı, Günlük/Profil/Başarımlar etiketleri telefonda iki satır).
- `araclar/mobil-menu-denetim.cjs`, 3 cihaz (iPhone 14, küçük, Pixel 7): tek uyarı Atölye'de kaydırma alanında kırpılmış bir ızgara hücresinin "binen" sayılması (orada tıklanamaz; yanlış alarm). Konsol hatası 0. Testler 647/647 (dışa aktarılan kopyada).
- Yedek `/root/devran-yedek-20261106-1849/devran.sqlite` (integrity ok); `kur.sh` servisi kendisi yeniden başlattı; sağlık protokol 7, `127.0.0.1:2568`.
- Ders: çıkıştan önce `/root/devran-kaynak` ile depo dalını karşılaştır (canlı başka daldan gelmiş olabilir); karşılaştırma artık bu sırayla yapılır.

## Tanıtım videosu
`docs/art/tanitim/devran-harita-nasil-oynanir.mp4` (depo dışında, 2:07, 1280×720, 18 MB): Atölye → OYNA → HARİTA, düğüm türleri ve aşamalar, yürüme, DÖVÜŞ (maç ×4 hızlı), harita ödülü, Maden (isabet halkası), Ocak (ERİT, ÜRET), Profil. Türkçe altyazılı. Yeniden üretim: `araclar/tanitim-harita.cjs` (yerel `KIMLIK_MODU=sifre` sunucu, yeni test hesabı) + `araclar/tanitim-harita-kurgu.sh`. Bu Mac'te başsız Chrome'un ekran akışı alttan 87 px kestiği için kayıt sürekli ekran görüntüsüyle (≈ 28 kare/sn) alınır.

Kayıt sırasında tarayıcı bir isteğin 400 döndüğünü bildirdi; ekran ekran yoklamada (Atölye, Oyna, Harita, Ocak, Profil) tekrar çıkmadı, sunucu günlüğünde iz yok. Kaynağı bulunmadı (kayıt akışındaki kazı/üretim isteklerinden biri olabilir); oyuncuya görünen bir hata yok.
