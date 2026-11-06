# HARITA-TASARIM raporu: Harita, Maden ve İşleme tasarımı

**Tarih:** 2026-11-06 · **Dal:** `devran-kod` · **Oturum:** tasarım (bulut) · **Kod:** yok (yalnız prototip simülasyon betiği ve taslak veri). `src/`, `veri/`, `src/paylasilan/sim` **dokunulmadı**; Kick OAuth'a dokunulmadı; main'e yazılmadı, PR açılmadı.

## 1. Varsayım: video
Video başlığı ve kanalı oEmbed ile **doğrulandı**: *"While the Iron's Hot: Buried Treasure!: Episode 9"* (Steven Thomas Gaming). Açıklama, bölümler, döküm ve 0:18'deki görüntü **alınamadı** (sayfa JavaScript ile çiziliyor; yalnız küçük resim alındı, harita görünmüyor). **Varsaydım:** sabit kameralı, noktaları yol çizgileriyle bağlı bir dünya haritası; noktaya gidip tek tek ilerleme, tamamlanan nokta komşuyu açar; bazı noktalar dövüş, bazıları kaynak. Farklıysa yalnız yerleşim belgeleri (01 § 1–2, 07 § 2) değişir.

## 2. Ne üretildi

| Dosya | İçerik |
|---|---|
| `docs/design/harita/00-genel-bakis.md` | Vizyon, **G-0 kuralı (güç satın alma/kazanma yok, 6 alt kural ve testleri)**, döngü, S1–S4 uyumu, "ne DEĞİL", riskler |
| `01-harita-ve-dugumler.md` | 6 bölge × 12 düğüm DAG, 4 düğüm türü (DÜŞMAN, MADEN, SANDIK, PATRON), 7 yıldız şartı, ödüller, tekrar/yenilenme, kalıcı veri, ilk 5 dakika, Bölge 1 tablosu |
| `02-maden-sistemi.md` | 8 kademe cevher (Demir → Kaya → Don → Kor → Kasırga → Şimşek → Girdap → Devir Taşı; eşikler 0/10/25/40/55/70/82/92), kazı etkileşimi (sunucu zarı + isteğe bağlı isabet halkası), başarı formülü, damar/nadir yuva, günlük 40/60, anti-bot A1–A8 |
| `03-atolye-isleme.md` | Atölye › Ocak: ERİT (4:1 → 3:1, cüruf) → DÖV (arma, çerçeve, cila; bayraklı dövme parçalar), Usta işi, arbitraj kapatma A-1…A-8 |
| `04-ustalik-sistemi.md` | **Ustalık** (Madencilik, İşleme), 0–100, eğri, öğrenme bandı, tecrübe kaynakları, profil gösterimi, çapraz eşik tablosu |
| `05-basarim-entegrasyonu.md` | 23 yeni başarım (16 ilk sürüm, 6 600 Altın), olay sözlüğü, 46 mevcut başarımın haritada sayılma tablosu (29 sayılır) |
| `06-ekonomi-ve-denge.md` | Kaynak/gider, ilk tuning, Altın etkisi, hipotezler H-H1…H-H7, G-0 kanıt/test listesi, **Monte Carlo sonuç tabloları** |
| `07-ux-ekranlar.md` | Akış, Harita / düğüm şeridi / Maden / Ocak / Sonuç eki; ASCII wireframe, hiyerarşi, boş/hata durumları, mobil, erişilebilirlik, Pergel ipuçları |
| `08-teknik-tasarim.md` | Sınırlar, modüller, **göç 5 SQL**, REST uçları + zod taslağı, harita odası (protokol 6 → 7, katalog özeti etkisi), kazı algoritması, veri dosyaları, test planı, geri uyum, hesap silme/gizlilik |
| `09-uygulama-dilimleri.md` | H1…H8, kabul ölçütleri, bağımlılıklar, roadmap konumu |
| `10-stil-ve-asset-plani.md` | (EN SONA, plan) sanat yönü, kademe renk dili, asset listesi, ses, Mac hattı partileri, biçim sözleşmesi, maliyet (≈ $2, Tripo 0) |
| `99-acik-sorular.md` | 18 soru, hepsi varsayılanlı (bloklayıcı yok) |
| `veri-taslak/*.json` | `madenler`, `ustalik`, `tarifler`, `harita`, `basarimlar-harita` (tek sayı kaynağı; H1'de `veri/`'ye taşınır) |
| `maketler/harita.png`, `maden.png` (+ HTML) | Yerleşim maketleri (stil değil) |
| `araclar/harita-ekonomi-simulasyonu.ts` | Monte Carlo (4 profil × 500 koşu; v1 14 gün, tam 60 gün); çıktı `sim-cikti-v1.md`, `sim-cikti-tam.md` |
| Güncellenen | `docs/design/beyblade/04-sozluk.md` (16 terim), `docs/design/tasarim-sutunlari.md` (tutarlılık notu), `docs/production/roadmap.md` (satır), `docs/production/ACTIVE_WORK.md` |

## 3. Öne çıkan sayılar (sim, p50)
- Aktif oyuncu (≈ 25 dk/gün): Madencilik K3 eşiğine gün 5, K4'e gün 10; ilk sürüm tarifleri gün 13'te biter; tam içerikte Devir Taşı eşiği gün 53.
- Gündelik (≈ 10 dk/gün): 14. günde Madencilik 32; Bölge 1 patronu gün 5.
- **Bot çiftliği ÷ tutkulu insan: cevher 1,08, tecrübe 1,00** (azalan getiri kaldırılırsa 1,29–1,40; tavan kaldırılırsa 1,21–1,99).
- Harita tekrar Altını tavanı 440/gün (hızlı maçın ≈ %29'u); ilk sürüm tek seferlik harita Altını 8 775; dövme gideri 6 600 = yeni başarım Altını 6 600.

## 4. Sahibe sorular (özet; tamamı 99)
Video yerleşimi (S-1) · dinlenme/tüccar düğümü yok (S-2) · Keşif Ustalığı yok (S-3) · 6 başarım sekmesi (S-4) · Ustalık 0–100 (S-5) · artan cevher dönüşmez (S-6) · dövme parçalar bayrakla kapalı (S-7) · harita maçı XP verir, günde 10 (S-13) · roadmap konumu (S-16) · bölge/patron/cevher adları (S-17, S-18).

## 5. Uygulama sırası önerisi
H1 veri + saf kurallar → H2 harita maçı (sunucu/oda) → H3 kazı → H4 Ocak → H5 başarımlar → *(menü P1 + ilk test gecesi geri bildirimi)* → H6 Harita ekranı + Sonuç eki → H7 Maden + Ocak + cila → H8 cila/ölçüm → sanat hattı (10). Roadmap: **Kick'ten önce, test gecesinden sonra (ekranlar)**; H1–H5 test gecesi hazırlığıyla paralel yürüyebilir. Kick askıda kalır.

## 6. Tahmini kodlama turu
**≈ 8–10 tur** (H1–H5 ≈ 4–5, H6–H8 ≈ 4–5; varsayım). Sanat hattı ayrı, ≈ 1 Mac oturumu (≈ 43 Gemini çağrısı).

## 7. Kapılar
`npm test` 523/523 · `npm run lint` · `npm run typecheck` yeşil (bu oturumda; betik `araclar/` typecheck kapsamında). Sim ve üretim kodu değişmedi.

## 8. Paralel oturumlar
Bu oturum yalnız `docs/design/harita/**`, sözlük, sütunlar notu, roadmap satırı, ACTIVE_WORK satırı ve tek araç betiği yazdı; başka oturumların dosyalarına dokunmadı.
