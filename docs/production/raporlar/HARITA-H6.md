# HARITA-H6 · Ekranlar 1: Oyna'da HARİTA, Harita ekranı, Sonuç eki

**Tarih:** 2026-11-06 · **Dal:** `devran-kod`

## Ne yapıldı
- **Oyna (Lobi):** İlk Devir sonrası mod sütununda **HARİTA** (`[data-mod=harita]` → Harita ekranı). `?ekran=lobi&dugum=b1-01` doğrudan düğüm botuna bağlanır (`Baglanti.harita`); takım seçiminde rakip düğüm botu + "DÜŞMAN · ZORLUK ●○○○○" (`[data-zorluk]`); ◄ haritaya döner; Tekrar aynı düğüme yeni maç.
- **Harita ekranı** (`src/istemci/ekranlar/Harita.ts`, `?ekran=harita`): bölge plakası `◄ OCAK YAMACI · %5 1/3 ►` (+ rozet), sayaç rozetleri `⛏ KAZI n/40` (YARIM/BİTTİ) · `⚔ n/10` · `★ n/18`; SVG harita (480×270 ızgara, `harita.json` konumları), yollar (yürünmüş halka rengi / açık bronz kesikli / kilitli noktalı), düğüm: tür harfi + kademe rengi/rakamı, **3 çentikli Kuşak halkası** (sandık 2), keşfedilmemiş açık düğümde "!", seçili bronz köşe çentikleri, yıldız sırası; **karakter yer tutucusu** (3 dikdörtgen, profil rengi, gövde biçimi 0–3, taşıdığı aktif takımın 1. topacının element rengi); açık düğüme dokununca **yol boyunca yürüme** (0,3 sn/kenar, ≤ 1,2 sn, 2 kareli sallanma; dokunuş/ana düğme anında bitirir; hareketi azalt → 0,15 sn solup belirme); varış sunucuya yürüyüş başında (`POST /api/harita/git`); alt şerit (tür başına 07 § 3: yıldız şartları, ilk/tekrar ödülü, maden eşiği/kalan/30 başarılı vuruş, sandık içeriği, kilitlide "ÖNCE: …") + tek ana düğme **DÖVÜŞ / KAZ / AÇ** (karakter düğümdeyken; değilse YÜRÜ); karaktere dokunma → **mini profil şeridi** (ad, arma, ⛏/⚒, bölge %, vitrin 3 yuva, PROFİL); dönüşte yükselen aşama → KUTLA + tek satır ("USTA DAMAR: +1 KAPASİTE"); klavye: oklar komşu düğüme yürür, Enter ana eylem, Esc geri; ilk ziyarette tek satır ipucu.
- **Sonuç eki** (`Mac.ts`): harita maçında başarım sütununda yıldız satırı (yeni yanan altı çizili), ödül (Altın, cevher, külçe, rozet), "DÜĞÜM: TEMİZLE", "N YENİ DÜĞÜM AÇILDI / YENİ BÖLGE AÇILDI", "Sayılan harita maçı n/10" ya da "BUGÜNLÜK ÖDÜL BİTTİ · 04:00"; ana düğme **HARİTA**.
- Araç: `araclar/h-akis.ts` (`npm run h:akis`), çıktı `raporlar/HARITA-H6-akis.json`.

## Doğrulama (Playwright, `KIMLIK_MODU=sifre npm run dev`, `NODE_PATH=/opt/node-tools/node_modules`)
- Akış: kayıt → İlk Devir → Oyna (HARİTA modu) → Harita (b1-01 seçili, karakter yanında) → yürü (KEŞFET, ana düğme DÖVÜŞ) → Lobi (düğüm botu, zorluk 1) → maç (oyuncu topacı `?oto=dolas`, otomatik) → Sonuç (ZAFER: ★ Kazan, +50 Altın · +2 Demir, TEMİZLE, 1 yeni düğüm) → HARİTA (b1-01 durum 3, b1-02 açık "!").
- **Konsol hatası 0** (masaüstü + telefon).
- **Telefon 844×390** (isMobile, hasTouch, DPR 2): yatay kayma yok; harita düğümleri ve karakter isabet alanı ≥ 44 CSS px; bölge ◄ ► ve şerit düğmeleri ≥ 44 px. Kalan iki öğe ortak lento (◄, Altın yuvası) — MOBIL-1 `::after` dokunma payıyla (ölçüm kutu boyutunu sayar).
- 0,5 sn testi verisi (masaüstü): bölge plakası sol üst, ana düğme sağ alt (turuncu), seçili düğüm + karakter haritada (`hiyerarsi` alanı).
- Ekranlar: `ekran/HARITA-H6-oyna-harita-modu.png`, `-harita-ilk.png`, `-harita-dusman-dovus.png`, `-lobi-dugum-botu.png`, `-sonuc-harita-eki.png`, `-harita-donus.png`, `-telefon-harita.png`.
- Testler 626 (değişmedi), lint/typecheck/build yeşil; sim dokunulmadı.

## Varsaydım
- Harita ve karakter yer tutucusu **SVG** (DOM menü ekranı, Pixi tuvali açılmaz); 13 § 2.2'deki "Pixi Graphics" yer tutucusunun eşdeğeri. Sanat hattı (10 § 3.6) gerçek atlası getirince çizim katmanı değişir, akış aynı.
- Pergel ipuçları (`harita-ilk`, `harita-dal`, `yildiz-sart`) Pergel veri şeması (koşul enum) değiştirilmeden şeritte tek satır ipucu olarak (ilk ziyaret, tarayıcıda bir kez).
- "Menü P1 bitmiş olmalı" bağımlılığı: P1 durumu belirsiz; ekranlar mevcut Kuşak Taşı bileşenleriyle yazıldı, menü dosyalarına (Lobi, Mac) yalnız ek dallar girdi.
- Bot (oto) bazen kukla düğümde kaybediyor (otomatik sürüş "dolas"); bu akış testi kazanç oranı ölçümü değildir (H-H4 H8'de).
