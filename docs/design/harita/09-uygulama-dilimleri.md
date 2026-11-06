# 09 · Uygulama dilimleri (H1…H8)

**Şapka:** `@nile` · **Bağlı:** [`08`](08-teknik-tasarim.md) (sözleşmeler), [`07`](07-ux-ekranlar.md) (ekranlar), [`10`](10-stil-ve-asset-plani.md) (sanat, en son).
**Kurallar (her dilim):** `devran-kod`; `npm test`, `npm run lint`, `npm run typecheck` yeşil; altın hash'ler aynı (`npm run test:tarayici`); dilim sonunda `docs/production/raporlar/H<n>.md` (ne oynanabilir, test çıktısı, ekran görüntüsü, açık riskler); İngilizce commit; Kick OAuth'a dokunma; main'e yazma.

## 1. Sıra ve gerekçe

```
H1 veri + saf kurallar ──► H2 harita maçı (sunucu+oda) ──► H3 kazı (sunucu) ──► H4 Ocak (sunucu)
        │                                                                           │
        └──────────────► H5 başarımlar ◄────────────────────────────────────────────┘
                                   │
            (ilk test gecesi geri bildirimi; menü P1 bitmiş olmalı)
                                   ▼
                H6 ekranlar: Harita + Sonuç eki ──► H7 ekranlar: Maden + Ocak + Atölye cila
                                   │
                                   ▼
                H8 cila, mobil denetim, ses yer tutucuları, ekonomi yeniden ölçüm  ──►  (10) sanat hattı
```

Önce veri ve sunucu (oynanmadan test edilebilir, menü işleriyle çakışmaz), sonra ekranlar (Oyna, Atölye ve Sonuç dosyaları menü düzeltmeleri P1 ile aynı dosyalar: P1 bitmeden başlanmaz), en son görsel. H2–H4 birbirinden bağımsızdır (farklı uç ve tablolar); sırayla yapılır ama paralel oturuma bölünebilir.

## 2. Dilimler

### H1 · Veri, şema, saf kurallar
- **Kapsam:** `veri-taslak/*.json` → `veri/` (madenler, ustalik, tarifler, harita, basarimlar eki, parcalar-dovme); zod şemaları (`src/paylasilan/veri/harita.ts`); saf kurallar `ustalik.ts`, `harita.ts`, `maden.ts`, `ocak.ts`; göç 5 (`sema.ts`) + `Depo` okuma/yazma yardımcıları; `hesapSil` eki; lint kapısı satırı; tuning.md § 22 özeti; sözlük güncel.
- **Kabul:** veri testi (graf, takımlar, eşikler) yeşil; birim testler (08 § 9 "Birim") yeşil; göç 4 → 5 boş ve dolu veritabanında yerinde çalışır; `hesapSil` yeni tabloları boşaltır; sim'e içe aktarma lint'te kırmızı (negatif test); sim dosyası değişmedi (`git diff -- src/paylasilan/sim` boş).
- **Bağımlılık:** yok. **Risk:** düşük. **Büyüklük:** orta (≈ 1 tur).

### H2 · Harita maçı (sunucu + oda)
- **Kapsam:** `GET /api/harita`, `POST /api/harita/sandik`; `MOD` + `harita`, `KatilmaSema.dugum`, `PROTOKOL_SURUMU` 7; `MacKurulumu.botKipleri`; `haritaMac.ts` (bot takımı, maç sonu yıldız/ödül/kilit/sayılan maç); `MacOzeti.mod = "harita"`; ilk açılışta b1-01.
- **Kabul:** oda testi: AÇIK DÜŞMAN düğümüne katılım → bot maçı → galibiyet → yıldız maskesi + Altın defteri + cevher + komşu AÇIK; kilitli düğüme 4110; misafir reddi; 11. maçta ödül 0; patron → sonraki bölge 01 AÇIK; Ustalık 0 ve 100 iki hesabın aynı tohumda aynı maç hash'i (G-0); H-H4 için bot turnuvası çalıştırılabilir (sonuç raporda, kabul eşiği değil).
- **Bağımlılık:** H1. **Risk:** orta (oda akışı, protokol). **Büyüklük:** orta-büyük (≈ 1–1,5 tur).

### H3 · Kazı (sunucu)
- **Kapsam:** `POST /api/maden/basla|kaz|bitir`; nadir yuva tohumu; günlük sayaç; isabet doğrulama; telemetri tablosu ve 30 gün temizliği (mevcut yedek zamanlayıcısına ek görev ya da açılışta temizlik).
- **Kabul:** API testleri (700 ms, tek seans, sıra, tavan 40/60, nadir yuva aynı gün aynı sıra, Ustalık yetmeyen nadir yuva ana kademe verir); `ag:matris` ile H-H6 ölçümü raporda (150 ms + 20 ms jitter + %2 kayıp altında gerçek isabet kabul oranı).
- **Bağımlılık:** H1. **Risk:** orta (zamanlama toleransı). **Büyüklük:** orta (≈ 1 tur).

### H4 · Ocak (sunucu)
- **Kapsam:** `GET /api/ocak`, `POST /api/ocak/erit|dov`, `PATCH /api/parca/:id/cila`, profil `cerceve`; Usta işi + yeniden döv; `ref` idempotentliği.
- **Kabul:** eritme 4:1/3:1, cüruf, toplu 20 parti; dövme 402/409 kodları; tek seferlik tarif; cila yalnız Gövde/Disk ve sahip olunan; `harita-guc.test.ts` (cilalı = cilasız parametreler); Market dövme parçayı listelemez; Dökümhane eritmesi dövme parçayı reddeder.
- **Bağımlılık:** H1 (H3 olmadan test verisiyle). **Risk:** düşük. **Büyüklük:** orta (≈ 1 tur).

### H5 · Başarımlar
- **Kapsam:** 23 başarım `veri/basarimlar.json`'a; olay sözlüğü (05 § 2.2); `haritaZorlukMin` alanı ve `macKapisi` dalı; şart metinleri (`sartMetni`); maç dışı olay girişi; "AÇILDI" kartı verisi.
- **Kabul:** 05 § 3 tablosundaki her satır için "sayılır / sayılmaz" testi (zorluk 1'de yalnız `takim-ultisi`); yeni başarımların idempotent ödülü; `/api/basarimlar` 69 kayıt; sekme sayısı 6.
- **Bağımlılık:** H2–H4. **Risk:** düşük. **Büyüklük:** küçük-orta.

### H6 · Ekranlar 1: Oyna modu, Harita, düğüm şeridi, Sonuç eki
- **Kapsam:** Oyna mod sütununa HARİTA (İlk Devir kapısı); `Harita.ts` (07 § 2–3, yer tutucu ikonlar = metin rozetleri + kademe rengi); Lobi'de bot zorluğu; Sonuç "ÖDÜL" kartı + yıldız satırı + HARİTA düğmesi; Pergel `harita-ilk`, `harita-dal`, `yildiz-sart`.
- **Kabul:** `h:akis` uçtan uca (kayıt → eğitim → harita → maç → sonuç → harita) ekran görüntüleri; 0,5 sn testi (07 § 2 hiyerarşi); klavye ile tam gezinme; mobil denetimde 44 px ve yatay sığma.
- **Bağımlılık:** H2, **menü P1 bitmiş**, ilk test gecesi geri bildirimi okunmuş. **Risk:** orta (menü dosyalarıyla çakışma). **Büyüklük:** büyük (≈ 1,5–2 tur).

### H7 · Ekranlar 2: Maden, Ocak, Atölye cila ve alt şerit, Profil
- **Kapsam:** `Maden.ts` (halka, KAZ, sonuç uçuşları, Ustalık paneli), `Ocak.ts`, Atölye alt şeridi OCAK (İlk Kazı kapısı), parça "CİLA ▾", Profil arma/çerçeve seçimi, Ustalık rozetleri; Pergel `maden-*`, `ocak-*`; erişilebilirlik ayarları (İsabet halkası kapalı, Kazı ritmi sesi).
- **Kabul:** `h:akis` devamı (kazı → erit → döv → profil arması); isabet halkası 60 fps (orta telefon emülasyonu); "Hareketi azalt" basamaklı halka; mobilde KAZ ekranın her yerinden.
- **Bağımlılık:** H3, H4, H6. **Risk:** orta (halka zamanlaması ile sunucu toleransı). **Büyüklük:** büyük (≈ 1,5–2 tur).

### H8 · Cila ve ölçüm
- **Kapsam:** ses yer tutucuları (`ses-uret.ts` sentez: kazı tık, isabet çınlaması, eritme cızırtısı, dövme çekici; 10 § 4); ekonomi sim'i `veri/`'den yeniden koşturma ve 06'yı güncelleme; MOBIL denetim; gizlilik metni satırı; `HARITA-UYGULAMA` raporu.
- **Kabul:** hepsi yeşil; 06 tablolarıyla fark ≤ %10 ya da gerekçeli güncelleme.
- **Bağımlılık:** H6, H7. **Risk:** düşük. **Büyüklük:** küçük-orta.

### Sonra (bu planın dışında)
- **Sanat hattı** (10): ikonlar, harita zeminleri, damar/külçe, cila paletleri, arma/çerçeve: Mac oturumu.
- **Dövme parçaları bayrağı:** H-H5 bot turnuvası geçerse ayrı küçük dilim (veri taşıma + katalog özeti).
- **Sezon 2:** bölge 4–6, K5–K8, 7 başarım (veri işi + sanat).

## 3. Tahmini toplam
H1–H8: **≈ 8–10 kodlama turu** (bir tur = birkaç saatlik ajan oturumu; varsayım, ölçüm değil). Veri + sunucu (H1–H5) ≈ 4–5 tur, ekranlar ve cila (H6–H8) ≈ 4–5 tur. Sanat hattı ayrı (10 § 6).

## 4. Roadmap konumu (öneri)
**Kick'ten ÖNCE, ilk test gecesinden SONRA (ekranlar için).** Gerekçe: (1) Kick sahibin kararıyla askıda; Harita Kick'e bağlı değil (ad + şifre hesaplarıyla çalışır). (2) Harita hesap ister; test gecesi hesap akışını ve temel maç hissini doğrular, Harita o zemine kurulmalı. (3) H1–H5 (sunucu) test gecesi hazırlığıyla paralel yürüyebilir: farklı dosyalar. (4) Ekranlar menü P1 düzeltmelerinden sonra (aynı ekran dosyaları). Kick askıda kalır; sahip "Kick'e başla" derse Harita onunla çakışmaz (farklı modüller).
