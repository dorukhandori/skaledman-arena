# Harita / Maden / İşleme: kod alt oturumu brief'i

**Tarih:** 2026-11-06 · **Sahip kararı:** "Harita mekanikleri harita üzerinde dolaşma, oyuncu profili, harita hareketleri ve her düğümün ayrıntıları gelişme processi gibi konular netleşince alt oturumlarda kodlanmaya başlayabilir." Bu konular `docs/design/harita/13-dolasma-karakter-dugum-gelisimi.md`'de sahibin seçimleriyle netleşti. Kodlama **alt oturumlarda**, dilim dilim yapılır.
**Dal:** `devran-kod` (bulut `main`'den açılırsa: `git fetch origin && git checkout devran-kod`). Sohbet Türkçe, kod tanımlayıcıları Türkçe ASCII, commit iletileri İngilizce.

## Önce oku (sırayla)
1. `docs/design/harita/00-genel-bakis.md` (G-0: güç yok; dizin)
2. `13-dolasma-karakter-dugum-gelisimi.md` (sahip kararları: dolaşma, karakter, hareket, düğüm aşamaları) — **çelişkide 13 kazanır**
3. `12-parca-uretimi-ve-market.md` (madenden parça üretimi, malzeme kademesi, pahalı Market SAPMA)
4. `09-uygulama-dilimleri.md` (H1…H8; § 2b ekleri; 13 ekleri başta)
5. `08-teknik-tasarim.md` (şema göç 5, uçlar, zod, oda, test planı) + 13 § 4
6. `01`–`07` ilgili bölümler; `11` § 10 sınama ölçütleri; `99` açık soruların varsayılanları
7. Sayılar: `docs/design/harita/veri-taslak/*.json` (H1'de `veri/`'ye taşınır; sonra otorite `veri/`)

## Dilim sırası (bir alt oturum = bir ya da iki dilim)
| Dilim | Kapsam (özet) | Bağımlılık |
|---|---|---|
| H1 | veri + zod + saf kurallar (`ustalik`, `maden`, `ocak`, `harita` + `enKisaYol`, `asamaHesapla`, `bolgeIlerlemesi`, `rozetHesapla`) + göç 5 (08 § 3 + 12 § 10 + 13 § 4.1) + `hesapSil` + lint kapısı + takımda aynı tanım tek | — |
| H2 | `GET /api/harita`, `POST /api/harita/git`, sandık; `mod:"harita"` oda, `PROTOKOL_SURUMU` 7, bot kipi/takımı, maç sonu yıldız + aşama + rozet + ödül; oda şemasında üye `malzeme` (kozmetik) | H1 |
| H3 | Kazı uçları; dinç vuruş 40/60, 61+ verimsiz; şanssızlık koruması; isabet doğrulama; USTALAŞ sayacı + USTA DAMAR; telemetri | H1 |
| H4 | Ocak: erit, kozmetik döv, **parça üretimi** (malzeme, yapımcı, seri), parça eritme, vitrin; `veri/market-fiyat.json` + Market `craft` alanı | H1 |
| H5 | 29 başarım + `haritaZorlukMin` + olay sözlüğü | H2–H4 |
| H6 | Oyna'da HARİTA modu; Harita ekranı: karakter yer tutucusu, yürüme, halka çentikleri, düğüm şeridi, mini profil; Sonuç eki | H2 (+ menü P1) |
| H7 | Maden, Ocak, Atölye biçim yığını, Market craft satırı, Profil KARAKTER + vitrin; maç/seyirci malzeme rozetleri | H3, H4, H6 |
| H8 | Ses yer tutucuları, mobil denetim, sim'i `veri/`'den yeniden koşma, rapor | H6, H7 |

## Değişmezler
- `src/paylasilan/sim/**` **değişmez**; altın hash'ler aynı (`npm run test:tarayici` Node = Chromium). Malzeme, karakter, Ustalık sim'e ve hash'e girmez.
- Güç eşit (ledger #25, G-0). Kick OAuth'a dokunma (askıda). `main`'e yazma, PR açma. Sır/anahtar yazma.
- Stil ve asset üretimi **en son** (10); kodda yer tutucu (Pixi figür, metin rozetleri, kademe renkli kareler, mevcut ikon önbelleği).
- Market fiyat SAPMA'sı `veri/market-fiyat.json` + `tuning.md` SAPMA satırı; denge bandı kapısı yeşil kalır.

## Her dilimde
- Kapılar: `npm test` (mevcut 523+ bozulmaz, yeni testler eklenir), `npm run lint`, `npm run typecheck`, `npm run build`; `git diff --stat -- src/paylasilan/sim` boş.
- Ekran dilimlerinde gerçek çalışma zamanı doğrulaması: `KIMLIK_MODU=sifre npm run dev`, Playwright (`NODE_PATH=/opt/node-tools/node_modules`), masaüstü + telefon 844×390, konsol hatası 0; ağ etkisi olan dilimde `npm run ag:matris -- N0 N1` (hash sapma 0).
- Ekran görüntüleri `docs/production/raporlar/ekran/HARITA-H<n>-*.png`; rapor `docs/production/raporlar/HARITA-H<n>.md` (kısa: ne yapıldı, test sayısı, "varsaydım"lar, riskler, sonraki dilim için notlar).
- Küçük commit'ler; dilim sonunda `git fetch origin devran-kod && git pull --rebase origin devran-kod && git push origin HEAD:devran-kod` (konteyner yeniden başlarsa iş kaybolmasın). `docs/production/ACTIVE_WORK.md` satırı.
- Sahibe soru sorma; açık noktada `99-acik-sorular.md` varsayılanını uygula ve raporda "varsaydım" yaz. Alt ajan gerekirse Opus.
- Bitince (H8) `docs/production/raporlar/HARITA-KOD.md`: dilim tablosu, ölçümler, kalan işler.
