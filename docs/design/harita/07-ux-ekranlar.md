# 07 · UX: ekranlar ve akışlar

**Şapka:** `@tide` (akış) + `@glyph` (yerleşim) · **Bağlı:** [`01`](01-harita-ve-dugumler.md), [`02`](02-maden-sistemi.md), [`03`](03-atolye-isleme.md), [`04`](04-ustalik-sistemi.md). Dil ve ölçü otoritesi: `docs/art/menu-tasarim-arastirma.md` § 5–6 (Kuşak Taşı, 480×270 mantıksal ızgara, Jersey 10 + m5x7), `docs/design/sadelik-ilkeleri.md` (S-1…S-11), `docs/production/raporlar/MOBIL-1.md` (dokunma).
**Maketler (yalnız yerleşim, stil değil):** [`maketler/harita.png`](maketler/harita.png), [`maketler/maden.png`](maketler/maden.png) (kaynak `maketler/*.html`).

## 0. Ortak kurallar

| Kural | Uygulama |
|---|---|
| Ortak kabuk | Sol üst kırmızı ◄ (Esc/Backspace), bronz başlık plakası, sağ üst Altın yuvası (menü 5.4) |
| Tek ana eylem | Her ekranda bir turuncu düğme, sağ alt (332, 218; 140×36); Maden'de alt orta (tam ekran eylem, S-3) |
| Metin taş üstünde durmaz | Bütün etiketler lacivert panelde ya da bronz plakada (menü 5.1/1) |
| Dokunma | Hedef ≥ 44 CSS px; görsel küçük ikonlarda görünmez isabet payı ≥ 48 px (MOBIL-1 #3) |
| Hover yok | Her ayrıntı **seçili öğe şeridinde** (dokun = seç); uzun basma = `title` ipucu (MOBIL-1 K18); hiçbir bilgi yalnız fare üstünde değil |
| Renk tek kanal değil | Kademe = renk + rakam rozeti; düğüm durumu = renk + biçim (kilitli: sönük + kilit; açık: dolu; tamam: ✓ çentik) |
| Klavye | Ok tuşları düğümler arasında grafik komşuluğuyla gezer (sol/sağ = önceki/sonraki, yukarı/aşağı = dal); Enter = ana düğme; Tab = odak sırası |
| Sesler | Mevcut menü ses ipuçları (menü 5.7) + 10 § 4'teki yeni sesler |

## 1. Ekran haritası (akış)

```
Atölye ──OYNA──► Oyna (mod sütunu: HIZLI MAÇ · ODA KODU · ANTRENMAN · HARİTA*)
                                                   │
                                                   ▼
                                   ┌──────────── HARİTA (bölge n) ◄──────────────┐
                                   │ düğüm seç → alt şerit (düğüm detayı)         │
                       DÖVÜŞ ◄─────┤        KAZ │          AÇ │                   │
                         │         │            ▼             ▼                   │
               Lobi (takım 20 sn)  │         MADEN         Sandık kartı (modal)   │
                         │         │            │             │                   │
                       Maç         │     (◄ ya da damar biter)└───────────────────┤
                         │         │            │                                 │
                  Sonuç + harita eki ─ HARİTA ──┴─────────────────────────────────┘

Atölye alt şerit: MARKET · BAŞARIMLAR · OCAK** · GÜNLÜK · PROFİL
                                         │
                                         ▼
                                       OCAK (ERİT / DÖV)
*  İlk Devir sonrası görünür   ** İlk Kazı sonrası görünür
```

## 2. Harita ekranı

**Bilgi hiyerarşisi (0,5 sn testi):** 1) bölge adı plakası, 2) ana düğme (seçili düğümün eylemi), 3) seçili düğüm, 4) açık düğümler, 5) günlük sayaçlar.
**Küme sayımı:** başlık bandı · harita alanı · alt şerit (düğüm detayı + ana düğme) · günlük sayaç rozeti = **4** (≤ 7).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│[◄] ╔══ ◄  OCAK YAMACI  1/3  ► ══╗                         ┌──────────────┐  │
│    ╚════════════════════════════╝                         │ ALTIN  1250 ◉│  │
│                                                           └──────────────┘  │
│                      ◆M───────────◆D═══════◆M─┐                             │
│                     ╱            ╱  ★★☆    ╲   ╲                            │
│            ◆D══════╯            ╱            ╲   ◆S════◆P  (taç)             │
│           ╱ ★★★                ╱       ◆D ────╯          │                   │
│     ◆M════╯                   ╱                          ◆M  (kilitli, sönük)│
│    ╱  ╲                      ╱                                              │
│ ◉D═╯   ◆S════════◆D═════════╯        ═══ yürünmüş yol (halka rengi)          │
│ ★★☆     (✓)                           ─── açık yol (bronz kesikli)          │
│                                       ··· kilitli yol (sönük)               │
├─────────────────────────────────────────────────────────────┬──────────────┤
│ [⚔] DÜŞMAN · ZORLUK ●●○○○                    ⛏ KAZI 12/40    │              │
│     ★ KAZAN   ★ RING OUT İLE PUAN   ☆ 60 SN'DE KAZAN         │    DÖVÜŞ     │
│     İLK: ★ başı 50 ALTIN + 2 DEMİR                ⚔ 3/10     │              │
└─────────────────────────────────────────────────────────────┴──────────────┘
```

| Öğe | Davranış |
|---|---|
| Bölge plakası `◄ ad n/N ►` | Okla önceki/sonraki bölge; kilitli bölge: ad + kilit + "OCAK USTASI'NI YEN" (tek satır) |
| Düğüm simgesi | 22×22 mantıksal (11×11 ikon × 2), isabet alanı ≥ 48 CSS px. Tür simgesi (§ 10 ikon listesi) + durum: **kilitli** sönük + küçük kilit · **açık** dolu, bronz halka · **tamam** ✓ çentik + yıldız sırası (★★☆) altında · **seçili** bronz köşe çentikleri (imza) |
| Maden düğümü | Kademe renginde simge + rakam rozeti; bugün kapasitesi bittiyse soluk + "0/6" |
| Yol | Yürünmüş = Kuşak halkası rengi `#FBBE88` (imza); açık = bronz kesikli; kilitli = `--halka-sonuk` noktalı |
| Alt şerit | Seçili düğümün detayı (§ 3); ana düğme sağda |
| Sayaç rozetleri | `⛏ KAZI 12/40` (41–60 arası "YARIM" etiketiyle sarı; 60'ta "BİTTİ") · `⚔ 3/10` sayılan harita maçı |
| İlk giriş | Harita açılınca **en mantıklı sonraki düğüm** seçili gelir (açık, tamamlanmamış, en kolay); oyuncu hiç dokunmadan ana düğmeye basabilir |

**Boş/hata durumları:**
| Durum | Ne görünür |
|---|---|
| Takım oynanamaz (ödünç kotası) | Ana düğme kapalı; şeritte mevcut engel cümlesi ("Takımda 3 farklı Çekirdek olmalı.") + ikincil düğme ATÖLYE |
| Sunucuya ulaşılamıyor | Harita gri, ortada tek satır "BAĞLANTI YOK · TEKRAR DENE" (ikincil düğme) |
| Bütün bölge tamam | Patron simgesi altın çerçeve; alt şeritte "BÖLGE TAMAM · ★ 16/18" |
| 10 sayılan maç doldu | DÖVÜŞ yine etkin; şeritte "BUGÜNLÜK ÖDÜL BİTTİ · 04:00" (ödülsüz oynanabilir) |

## 3. Düğüm detayı (alt şerit, tür başına)

| Tür | Satır 1 | Satır 2 | Satır 3 | Ana düğme |
|---|---|---|---|---|
| DÜŞMAN | `[⚔] DÜŞMAN · ZORLUK ●●○○○` | Üç yıldız şartı (kazanılan dolu ★, kalan ☆) | İlk ödül (yıldız başı) ya da "TEKRAR: 2 DEMİR + 50 ALTIN" | **DÖVÜŞ** |
| PATRON | `[♛] OCAK USTASI · ZORLUK ●●●●○` | Yıldızlar | "AÇAR: AYAZ GEÇİDİ" | **DÖVÜŞ** |
| MADEN | `[⛏] MADEN · KAYA CEVHERİ (2)` | `USTALIK 10 GEREKİR` / `BAŞARI %70 · ÖĞRETİR` | `BUGÜN 6/6` (+ "NADİR DAMAR ✦" varsa) | **KAZ** (Ustalık yetmiyorsa kapalı + kilit, yine de neden yazılı) |
| SANDIK | `[▣] SANDIK` | "150 ALTIN + 6 DEMİR" | — | **AÇ** (açıldıysa "BOŞ", düğme yok) |
| Kilitli düğüm | Türü görünür (ne olduğunu bil), ayrıntı yok | "ÖNCE: komşu düğüm" | — | yok |

Takım seçimi: DÖVÜŞ'e basınca mevcut **Lobi / takım seçimi** ekranı (20 sn) açılır; rakip sütununda bot takımının 3 elementi ve "ZORLUK ●●○○○" (referans 06 düzeni değişmez).

## 4. Maden ekranı

**Bilgi hiyerarşisi:** 1) damar + halka (eylem), 2) KAZ, 3) sonuç uçuşu, 4) Ustalık çubuğu, 5) damar kalan.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│[◄] ╔═ MADEN · OCAK YAMACI ═╗                              ┌──────────────┐  │
│    ╚═══════════════════════╝                              │ ALTIN  1250 ◉│  │
│ ┌────────────────────┐                                    └──────────────┘  │
│ │ MADENCİLİK   12    │              .-~~~~~-.                ┌────────────┐ │
│ │ ▰▰▰▰▰▰▱▱▱▱  +10    │           .'  ╭───╮   '.  ← isabet   │ BU SEANS   │ │
│ │ ÖĞRETİR            │          :    │▓▓▓│ ●   :    yayı    │ ◆2 DEMİR ×9│ │
│ │ BAŞARI %55         │          :    │▓▓▓│     :  (bronz)   │ ◆2 KAYA  ×3│ │
│ └────────────────────┘           '.  ╰───╯   .'             │            │ │
│                                    '-~~~~~-'                 └────────────┘ │
│                         KAYA CEVHERİ (2) · ●●●●○○ 4/6                         │
│                          ✦ NADİR DAMAR: 5. VURUŞ · USTALIK 25                 │
│                                                                              │
│                              ┌──────────────────┐            ⛏ KAZI 14/40    │
│                              │       KAZ        │                            │
│                              └──────────────────┘                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Öğe | Davranış |
|---|---|
| Halka | Kuşak halkası (imza): 1,4 sn'de bir tur, ışıklı uç; isabet yayı bronz, %22. "Hareketi azalt" açıksa uç sıçramalı (4 kare/tur değil, 8 sabit konum) ve isabet her zaman sayılır mı? **Hayır**: isabet yayı aynı, yalnız animasyon basamaklı; erişilebilirlik ayarı "İSABET HALKASI: KAPALI" seçilirse halka gizlenir ve her vuruş isabetsiz sayılır (ceza yok, yalnız +1 bonus yok) |
| KAZ | Ana düğme alt orta, ≥ 64 CSS px yükseklik; ekranın boş alanına dokunmak da KAZ; Boşluk/Enter. Basınca 700 ms kilit (düğme basılı hâl) |
| Sonuç | Damardan uçuşan sayı: başarılı "+3 ◆" (kademe renginde) + "İSABET" bronz etiket; ıska "ISKA" soluk + "+5" tecrübe; seviye atlayınca çubuk bronz yanar, "MADENCİLİK 13" plakası 1 sn |
| Ustalık paneli | Seviye, çubuk, bant etiketi (ÖĞRETİR / AZ ÖĞRETİR / ÖĞRETMEZ), başarı yüzdesi |
| Damar kalan | ●●●●○○ (renk + sayı) |
| Nadir damar | Damar üstünde parlayan çatlak + tek satır; Ustalık yetmiyorsa "USTALIĞIN YETMİYOR · 25" |
| Bitiş | Kapasite bitince KAZ → **HARİTA** olur (ana düğme değişir); ◄ her an çıkar |
| Günlük tavan | 41. vuruşta tek satırlık sarı bant "BUNDAN SONRA YARIM VERİM"; 60'ta KAZ → "BUGÜNLÜK KAZI BİTTİ · 04:00" (kapalı) + ikincil HARİTA |

**Pergel ipuçları (bir kez, `veri/ipuclari.json`):** `maden-ilk` "Işık bronz yaydayken bas: **İSABET** +1 cevher." · `maden-ustalik` "Damar kilitli mi? **Madencilik** yükselince açılır; ileri bölgelerdeki damarlar daha çok öğretir." · `maden-ogretmez` (ilk ÖĞRETMEZ etiketinde) "Bu damar artık sana bir şey öğretmiyor. Bir sonraki bölgeye bak."

## 5. Ocak ekranı (Atölye › OCAK)

Atölye'nin blueprint dili (referans 03): lacivert ızgara, ince bronz çizgiler. **Küme sayımı:** başlık · Ustalık bandı · cevher listesi · seçili kademe paneli (ERİT + tarifler) · ana düğme = **5**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│[◄] ╔═══ OCAK ═══╗     ⛏ MADENCİLİK 23 ▰▰▰▰▱   ⚒ İŞLEME 26 ▰▰▱▱▱  ┌────────┐ │
│    ╚════════════╝                                            │ALTIN 900│ │
│ ┌──────────────────────────┐ ┌──────────────────────────────────────────┐   │
│ │ CEVHER        CEV.  KÜL. │ │ ◆3 DON CEVHERİ                           │   │
│ │ ◆1 DEMİR       14    9   │ │ ERİT  [−] 3 PARTİ [+]  12 CEV → 3 KÜLÇE   │   │
│ │ ◆2 KAYA        22    6   │ │       BAŞARI %52 · 4:1 · ÖĞRETİR          │   │
│ │▶◆3 DON         12    0  ◀│ │ ─────────────────────────────────────────│   │
│ │ ◆4 KOR  USTALIK 40  🔒   │ │ TARİF                                     │   │
│ │ ◆? ???                   │ │ ▣ DON ARMASI   3 DON + 2 KAYA · 300  ✓EŞİK│   │
│ │                          │ │ ▣ DON ÇERÇEVE  6 DON + 4 KAYA · 600 İŞL.30│   │
│ │                          │ │ ▣ DON CİLASI  10 DON + 6 KAYA ·1200 İŞL.35│   │
│ └──────────────────────────┘ └──────────────────────────────────────────┘   │
│                                                            ┌──────────────┐ │
│  (seçili tarif yoksa ana düğme ERİT; tarif seçiliyse DÖV)  │     ERİT     │ │
│                                                            └──────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Öğe | Davranış |
|---|---|
| Cevher listesi | 8 satır en çok; görünmeyen üst kademeler "???" (en çok 1 satır). Satır: kademe rozeti, ad, cevher, külçe; kilitli kademe "USTALIK 40" + kilit |
| ERİT | Parti stepper (1–20, varsayılan = yapılabilecek en çok, 20 ile sınırlı), dönüşüm önizlemesi, başarı %, oran, bant etiketi. Sonuç: liste "3 KÜLÇE · 1 CÜRUF" tek satır |
| Tarif listesi | Seçili kademenin tarifleri (en çok 3 + parça): ad, girdi, Altın, durum (✓ eşik / İŞL. n / ✓ SAHİP / eksik malzeme kırmızı değil **soluk** + eksik sayı) |
| DÖV | Tarif seçilince ana düğme DÖV; ≥ 1 000 Altın onay modalı (sadelik S-2 kuralı ≥ 100 Altın modalı Market'e özgü; Ocak'ta 1 000) |
| Sonuç kartı | Ürün ikonu büyük, "ARMA AÇILDI · PROFİLDE KULLAN" + Usta işi ise bronz parıltı ve "USTA İŞİ" |
| Usta işi | Sahip olunan tarifte ikincil düğme "YENİDEN DÖV · %12" |
| Cila uygulama | Ocak'ta değil; Atölye'de parça seçiliyken "CİLA ▾" (03 § 8) |

## 6. Sonuç ekranı eki (harita maçı)

Mevcut Sonuç (referans 09) düzeni korunur; üç kartın ilki "ALTIN" yerine **"ÖDÜL"** (Altın + cevher ikonları), plakanın altına **yıldız satırı** (★ ★ ☆, her biri şart adıyla, sırayla yanar 0,3 sn arayla, Kuşak çentiği animasyonu). Ana düğme **TEKRAR** yerine **HARİTA**; ikincil **TEKRAR** (aynı düğüm). Başarım kartı aynen.

## 7. Ustalık paneli
Ayrı ekran **yok** (S2). Ustalık üç yerde görünür: Maden sol paneli, Ocak üst bandı, Profil kartında iki rozet (04 § 6). Profil rozetine dokunmak tek satır ipucu: "MADENCİLİK 47 · SONRAKİ KADEME: KASIRGA 55".

## 8. Mobil / masaüstü

| Konu | Masaüstü | Mobil (yatay, MOBIL-1) |
|---|---|---|
| Ölçek | `o ≥ 2` tam sayı | `o = 1`, yazı `yo = 1,5` |
| Harita düğümü | Tık | Dokun; isabet alanı ≥ 48 CSS px; komşu düğümler arası en az 26 mantıksal px (≥ 39 CSS px @1,5) |
| Harita kaydırma | Yok | Yok (tek ekran); yanlışlıkla sayfa kaydırma `overscroll-behavior: none` |
| KAZ | Tık / Boşluk / Enter | Ekranın herhangi yeri; Android geri jesti sol kenarda: KAZ alanı sol kenardan 60 px içeride başlar |
| Ocak stepper | ◄ ► tuşları | −/+ düğmeler 44 px |
| Uzun ipuçları | `title` | Uzun basma balonu |
| Dikey | — | Mevcut "CİHAZI YATAY ÇEVİR" örtüsü |

## 9. Erişilebilirlik
- Her düğüm ARIA: "Düşman, zorluk 2, iki yıldız, açık"; harita bir `role="list"` (grafik komşuluğu ok tuşlarıyla).
- Kademe: renk + rakam + element simgesi (İ-3); renk körlüğü için Devir Taşı yanardöner değil çizgili desen ile de ayrılır.
- İsabet halkası: "Hareketi azalt" → basamaklı; "İsabet halkası kapalı" seçeneği (Ayarlar › Erişilebilirlik); halkasız oyuncu yalnız +1 bonusu kaçırır (ceza yok).
- Ses ipucu: isabet yayına girişte hafif tık (isteğe bağlı, Ayarlar › Ses › "Kazı ritmi").
- Kontrast: menü 5.2 jetonları; kademe renkleri metin olarak kullanılmaz, yalnız simge dolgusu (açık kademeler — Don, Devir — koyu konturla).

## 10. İlk kullanım ipuçları (Pergel)

| Kimlik | Koşul | Metin |
|---|---|---|
| `harita-ilk` | Harita ilk açılış | "Noktaya dokun, alttaki düğmeye bas. **Yıldızlar** ek ödül verir." |
| `harita-dal` | İlk dallanma | "İki yol da 07'de buluşur. Diğerine sonra dönebilirsin." |
| `maden-ilk` | Maden ilk açılış | § 4 |
| `ocak-ilk` | Ocak ilk açılış | "Önce **ERİT**: cevher külçe olur. Sonra **DÖV**." |
| `ocak-alasim` | İlk alt kademe gereken tarif | "Her tarif bir alt kademenin külçesini de ister." |
| `yildiz-sart` | İlk eksik yıldızlı galibiyet | "Eksik yıldız için düğümü tekrar oyna; ödül bir kez daha gelir." |
