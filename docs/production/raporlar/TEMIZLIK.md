# TEMIZLIK: temizlik ve cila turu (sekiz açık kalem)

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Sahip talimatı:** "Hepsini yap."
**Kaynak raporlar:** SANAT-ENTEGRASYON, ATOLYE3D, ART-1, GU-A, GU-B (açık kalemler).
**Görüntüler:** `docs/production/raporlar/ekran/TEMIZLIK-*.png` (1280×720, DPR 2). Ölçüm ve canlı doğrulama özeti:
`TEMIZLIK-ozet.json`, `TEMIZLIK-yukleme-{once,sonra}.json`.
**Kapsam dışı (koordinatör, 2026-11-05):** Kick OAuth ve ona bağlı hiçbir şeye dokunulmadı. Sim (`src/paylasilan/sim/**`) değişmedi.

## Özet

| # | Kalem | Durum | Commit |
|---|---|---|---|
| 1 | Kasırga Ulti veri hatası | **yapıldı** | `3cc791b` |
| 2 | Maç ilk yükleme bütçesi | **yapıldı** (varlık 1 885 → 533 KB) | `23fa36d` |
| 3 | Kullanılmayan Ata kaynak sayfaları `public/` dışına | **yapıldı** | `64f3a4c` |
| 4 | Menü ikonları: ortak 3B ikon önbelleği | **yapıldı** | `996d86a` |
| 5 | `/api/ben` son maç → Pergel ring-out | **yapıldı** | `83d1267` |
| 6 | Atölye odak kartında "Market'te aç" | **yapıldı** | `91b8ad2` |
| 7 | Atölye cilaları (çizgi hizası, ızgara, yedek boyu) | **yapıldı** | `1ca0d4d` |
| 8 | Belgeler, rapor, canlı doğrulama | **yapıldı** | bu commit |

Kapılar her dilimde yeşil: `npm test` (son: 24 dosya, 466 test), `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run test:tarayici` (16 altın senaryo, Node = Chromium = `.hash`, **hash'lerin hiçbiri değişmedi**).

## 1. Kasırga Ulti veri hatası

**Neden:** `veri/ruhlar.json`'da üç ruhun `ulti` alanı `null` idi: Döküm Sarmalbaykuş (`kasirga-yapay` Çekirdeğinin ruhu),
Döküm Karacal ve Külkartal (`kul-cekirdegi`). Bu bilinçli bir ledger notundan (`ledger-sayilar.md` #13: "Yapay/Karanlık
ulti `null`") kalmıştı. Ulti'nin Lv.3'e çekildiği K-23 kararından sonra Kasırga'nın tek başlangıç Çekirdeği Ulti'siz
kalıyordu; sanat oturumu Kasırga Ulti'sini yalnız debug yazımıyla gösterebilmişti.

**Düzeltme (yalnız veri, yorum yok):** ruh elementinin Ata Ultisi bağlandı. Yeni yetenek tanımı gerekmedi; mevcut Ata
Ultileri § 9 kademe kurallarına zaten uyuyor (kademe 3, telegraf 0,90 s, bedel 3 dilim).

| Ruh | Çekirdek | Element | Ulti |
|---|---|---|---|
| Döküm Sarmalbaykuş | Kasırga Döküm (`kasirga-yapay`) | Kasırga | **Ata Savruğu** (`ata-savrugu`, Yel Vatozu) |
| Külkartal | Kül Çekirdeği (`kul-cekirdegi`) | Kor | Ata Közü (`ata-kozu`) |
| Döküm Karacal | (kataloğda Çekirdeği yok) | Kor | Ata Közü |

Ledger notu yeni kararla güncellendi.

**Test:** `test/yetenek.test.ts` "8 Çekirdeğin hepsi Lv.3'te Yetenek, Özel Yetenek ve Ulti'yi çözer". Her Çekirdek için
yuvalar `[1, 2, 3]` kademesinde, Ulti Çekirdekle aynı elementte ve Lv.3 dünyasında üç yuva da `yuvaDurumu = null`
(kullanılabilir).

**Altın hash'ler değişmedi.** Gerekçe: altın senaryolar bot kararlarını değil, üretim anında **kaydedilmiş girdileri**
oynatır. `kasirga-yapay` ve `kul-cekirdegi` kullanan senaryolarda (tam-bot-maci, tam-bot-yetenek, ani-olum, geri-cek,
yetenek-kademeler …) o tarafın girdisi Ulti yuvasını (2) hiç istemiyor. Yuva boşken bot onu seçmiyordu; kayıt da öyle.
`npm run altin:uret` çalıştırılmadı: yeniden üretilseydi botlar artık Ulti seçebileceği için `tam-bot-*` hash'leri
değişirdi. Bu bir veri kararı olduğundan kayıtlı altınlar korundu.

**Canlı:** § 8'de yeni hesap + Kasırga Döküm + gerçek bot maçında gerçek Ulti (`TEMIZLIK-kasirga-ulti.png`).

## 2. Maç ilk yükleme bütçesi

**Ölçüm yöntemi:** `araclar/yukleme-olc.cjs` (Playwright `page.on('response')` + `request.sizes()`; `?ekran=mac` açılışından
tur başı + 4 s'ye kadar, URL başına bir kez). Üretim paketi (`vite build --app` → `node dist/server/server.mjs`).
"Önce": `83d1267` aynı yöntemle ayrı worktree'de.

| | Önce | Sonra |
|---|---|---|
| Efekt atlasları (`/efekt/**`) | **1 384 KB** (`efekt.png` 657 + `efekt-kor.png` 524 + `efekt-kaya.png` 189 + json) | **32 KB** (`efekt-cekirdek` png 28 + json 4) |
| Ses | 365 KB | 365 KB |
| Yazı tipleri | 109 KB | 109 KB |
| Topaç sprite'ları | 27 KB | 27 KB |
| **Varlık toplamı** (SANAT raporundaki 1,88 MB'nin aynı ölçüsü) | **1 885 KB** | **533 KB** ✓ (≤ 1,5 MB) |
| Kod (JS + CSS, sıkıştırmasız) | 1 074 KB | 1 085 KB (+10: maç sonu kartı 3B ikon modülü) |
| **Toplam, sunucu sıkıştırmasız** | 2 963 KB | 1 621 KB |
| **Toplam, gzip tahmini** (üretimde Cloudflare Tunnel sıkıştırır) | 2 060 KB | **750 KB** ✓ |

Not: yerel Node sunucusu JS'yi sıkıştırmadan veriyor; dağıtımda trafik Cloudflare Tunnel'dan geçtiği için kablodaki boyut
gzip satırına yakındır. Sıkıştırmasız toplam 1,5 MB'ı 0,12 MB aşıyor; bunun tamamı kod (efekt değil).

**Ne yapıldı:**
- **Yeniden paketleme:** `araclar/sanat/efekt-paketle.ts` (sharp). `public/efekt/` artık kayıpsız kaynak atlaslardan
  (`kaynak/efekt/pixelfx/atlas/`, değişmedi) üretiliyor. Yalnız oyunun gerçekten çaldığı animasyonlar alınıyor
  (`Efektler.ts`'deki `sheet(...)` çağrıları). Sonuç 256 renk palet PNG; titreşim yok, pixel ızgarası ve `nearest`
  korunuyor. Görünür piksellerde ortalama kanal hatası 0–2,1/255. WebP denendi: kayıpsız WebP paletten büyük çıktı
  (efekt.png: WebP 455 KB, palet 192 KB), PNG'de kalındı (Safari sorunu da yok).
- **Yayımlanan efekt toplamı 3 041 KB → 392 KB.** Oyunda çalınmayan animasyonlar kaynakta kaldı: sekme-iz, toz-halka,
  zemin-sok, ulti-kor, ulti-don, girdap-dekal, telegraf-sarj. Kullanılırsa `GRUP`'a eklenir; test denetliyor.
- **Tembel yükleme** (`Efektler.atlasHazirla`):
  - Açılışta yalnız `efekt-cekirdek` (kıvılcım, kritik: ilk çarpışma).
  - `efekt` (toz bulutu, Enerji doldu) ilk çarpışmada ya da bir topacın Enerjisi ≥ 60 olunca.
  - Element atlası (Ulti, parçalanma) o topacın Enerjisi ≥ 150, staminası ≤ %50 ya da yeteneği başlayınca. Ulti
    telegrafı 0,9 s; atlas en büyüğü 95 KB.
  - Şimşek atlası hemen (çarpışma kıvılcımında çalınıyor).
  - Eşikler olaylarla ve `guncelle(dt, dunya)` ile ~4 Hz denetleniyor.
  - Yüklenmeden çalınan an yordamsal yedekle çiziliyor (değişmedi).
- **Doğrulama:** Enerji doldurulunca `efekt.json/png` ve `efekt-kor.*` isteniyor, konsol hatası 0.
- **Test:** `test/efekt-atlas.test.ts`:
  - Efektler.ts'deki her (atlas, animasyon) çifti yayımlanan atlasta var.
  - Reçete ile yayımlanan dosyalar aynı; çekirdek ≤ 40 KB, toplam ≤ 600 KB.
  - Açılışta yalnız çekirdek isteniyor.
- Belgeler: `efekt-kaynaklari.md` § 8.7 notu, `veri/manifest-gorsel.json` `atlas` bölümü.

## 3. Kullanılmayan Ata kaynak sayfaları

- `public/ruh/ata/<element>.png` + `.json` (6 + 6, 1,38 MB) → `kaynak/ruh/ata/`: depoda duruyor, dağıtılmıyor. `dist/client/ruh/ata/`
  artık yalnız 12 `-holo*.png` içeriyor.
- `araclar/sanat/sayfala.py` yazma yolu ve `hologram.py` okuma yolu yeni yere çevrildi. `hologram.py kor` yeni yoldan
  çalıştırıldı; çıktı mevcut `kor-holo*.png` ile **piksel piksel aynı**.
- Yollar güncellendi: `veri/manifest-gorsel.json` (`ruh.ata-kaynak`), `docs/art/krediler.md` (krediler sayfası testi
  yeşil), `ruh-entegrasyon-notu.md`, `topac-pixel-plani.md`.

## 4. Menü ikonları: ortak 3B ikon önbelleği

`src/istemci/atolye3d/ikonOnbellek.ts` (three.js'siz):
- Parça (`parça id + boya`) ve birleşik topaç ikonu ister, data URL olarak döner.
- Çizer ilk istekte `import("./Goruntuleyici.ts")` ile yüklenir. Atölye açıksa onun canlı çizeri bağlanır, ikinci WebGL
  bağlamı açılmaz. Değilse kare döngüsü olmayan gizli bir çizer kurulur (`ikonCizeriKur`).
- Önbellek bellekte ve localStorage'da tutulur. Anahtar katalog özeti + model özeti (`MODEL_OZETI`, test dosyayla
  eşleştiriyor) + çizim sürümü. Sonraki sayfa açılışında three.js hiç yüklenmez.
- Önce yordamsal ikon çizilir. `data-ikon3b` işaretli öğe hazır olunca aynı yerde, tam sayı ölçekli `<img>` ile değişir
  (`ikonGozle`: MutationObserver).
- WebGL yoksa, `?webgl=0` verilmişse ya da çizim hata verirse yordamsal ikon yerinde kalır. Gizli parça siluet kalır.
  Ödünç topaç yordamsal kalır (ödünç işareti orada).

Kullanıldığı yerler:
- Market hücreleri, günün parçası, Dökümhane satırı, ürün kutuları (`TEMIZLIK-market-ikonlar.png`).
- Başarım ödül parçaları (`TEMIZLIK-basarim-ikonlar.png`).
- Lobi takım kartları: büyük takım sahnesi ve seçim kartı minileri (`TEMIZLIK-lobi-takim-ikon.png`).
- Maç sonu "Market'te açıldı" kartı.
- Atölye ızgarası ve takım kartı mevcut 3B yolunu kullanmaya devam ediyor; canlı çizerini önbelleğe veriyor.

**Paket ölçümü (üretim, bayt):**

| Parça | Önce | Sonra |
|---|---|---|
| `index.js` (ana) | 357 010 | 356 994 |
| `Goruntuleyici.js` (three) | 581 938 | 582 165 |
| `Atolye.js` | 98 077 | 84 942 (geometri ayrı paylaşılan parçaya çıktı, 15 850) |
| `Market.js` / `Lobi.js` / `Basarimlar.js` / `Mac.js` | 21 484 / 44 276 / 9 972 / 45 816 | 22 254 / 44 275 / 10 068 / 45 923 |
| `pikselTopac.js` | 6 208 | 10 494 (ikon önbelleği modülü) |

Ana paket büyümedi. Three.js yalnız ikon gerektiğinde ve önbellekte yoksa iniyor.

Canlı (DPR 2, SwiftShader): Market'te 16 ikon 3B'ye geçti, Başarım ve Lobi'de de geçti, konsol hatası 0.

## 5. `/api/ben` son maç sonucu → Pergel ring-out

- **Sunucu:** `src/sunucu/oyuncu/sonMac.ts`, zod `SonMacSema`. `/api/ben` yanıtına tek alan eklendi: `sonMac` (hiç maç
  yoksa `null`). Belge: `docs/tech/backend.md` § 9a.
  - `neden`: `mac.bitis_nedeni`.
  - `kazandi`.
  - `bitis`: son turun bitiş türü. `bitis_turleri` telemetrisinden zod ile okunuyor; bozuksa `null`.
  - `ringOutKayip`: maç kaybedildi, iptal değil ve son tur rakip lehine ring out.
  - `zaman`.
  - `macSayisi`: iptal olmayan maç sayısı, yeni `Depo.bitenMacSayisi`.
  - `sonMaclar` sıralamasına `rowid` eşitlik bozucusu eklendi.
- **İstemci:** `secim.ts` `sonMacDurumu` → Atölye Pergel durumuna bağlanıyor (`sonMacRingOutKayip`, `bitenMac`). Azalan
  ipucu sıklığı artık sunucudaki maç sayısını kullanıyor. Alan gelmezse tarayıcı sayacı yedek.
- **Testler:**
  - `test/d7-api.test.ts`: maç yok → null; ring out ile kayıp → `ringOutKayip`; kazanan için false; sonraki maç durma
    ile → false; iptal sayılmaz; bozuk telemetri yanıtı düşürmez.
  - `test/pergel.test.ts`: ring-out ipucu açılıyor; 10 maçtan sonra (sunucu sayacı) susuyor.
- **Canlı:** § 8 (`TEMIZLIK-pergel-ringout.png`).

## 6. Atölye odak kartında "Market'te aç"

- 3B odak kartında, sahip olunmayan ve Market'te alınabilir ya da kilitli parça için küçük **ikincil** düğme
  (`data-eylem=markette-ac`). Bu durum ödünç topaçta ya da önizlemede çıkıyor. Ana eylem Kaydet / Oyna olarak kalıyor
  (sadelik-ilkeleri: tek ana eylem).
- `?ekran=market&vurgu=<id>`: Market ürünü ortalar, seçer, odaklar ve 4 s altın çerçeveyle vurgular. Diyalog açılmıyor:
  ana eylem Satın Al. Azaltılmış harekette yanıp sönme yok. Eski `&parca=` (diyalog açar) aynen duruyor.
- Canlı: kartta düğme var (`TEMIZLIK-atolye-markette-ac.png`). Tıklayınca `?vurgu=kalkan-govde` açılıyor, hücre vurgulu
  ve odakta (`TEMIZLIK-market-vurgu.png`).

## 7. Atölye cilaları

- **(a) Etiket çizgileri:** birleşik görünümde etiket 15 px kuralıyla aşağı itildiyse çizgi dirsek yapıyor: etiket
  hizasında yatay → dikey → **katmanın tam hizasında** yatay. Dikeyler katman sırasıyla kademeli, kesişmiyor.
  Patlatılmışta düz çizgi (`TEMIZLIK-atolye-birlesik.png`).
- **(b) Izgara:** az parçalı sekmede ızgara 5 satıra (referans 03) tamamlanıyor:
  - İlk boş hücre "Market'ten al" ipucu. Yalnız Market açıksa; ikincil, Market'e götürür.
  - Kalanlar soluk yer tutucu: etkileşimsiz, `aria-hidden` (`TEMIZLIK-atolye-izgara-az.png`).
- **(c) Yedek boyu:** `Yedek2B` önceden kaba bir yükseklik payıyla (+40 / +20) ölçeği 1'e düşürüyordu; topaç WebGL'in
  yarısı kadar çiziliyordu.
  - Artık gerçek yığın kapsamını ölçüp WebGL'in ppu formülüne en yakın **tam sayı** ölçeği seçiyor (nearest korunuyor).
  - Sığmazsa önce patlatma boşluğunu daraltıyor, sonra ölçeği küçültüyor.
  - Tuval boyu ikisinde de 356×468 CSS px. Yığın yüksekliği artık WebGL ile aynı aralıkta (`TEMIZLIK-atolye-yedek.png`
    ↔ `TEMIZLIK-atolye-webgl-boyut.png`).
- Atölye3D kararları korundu: kırmızı X yok; patlatılmışta Çekirdek ×1,6, Uç ×1,3; GLB sol dönüş parametrik ayna;
  takım kartı mini çubukları SAL/SAV/STA.

## 8. Canlı doğrulama

Ortam ve betik:
- Kendi worktree'de `npx vite --port 5197` (`KIMLIK_MODU=sifre`, geçici `VERI_DIZINI`).
- Playwright Chromium, SwiftShader WebGL, 1280×720, DPR 2.
- `araclar/temizlik-ekran.cjs` (adımlar: market basarim lobi atolye marketteac yedek ringout ulti).

| Doğrulama | Sonuç | Ekran |
|---|---|---|
| Market 3B ikonları | 16 ikon yordamsaldan 3B'ye geçti; gizli = siluet, kilitli = kilit | `TEMIZLIK-market-ikonlar.png` |
| Başarım ödül parçası | "Açar: [3B disk] Parlak Disk" | `TEMIZLIK-basarim-ikonlar.png` |
| Lobi takım kartı | kendi Çekirdeği 3B, ödünçler yordamsal | `TEMIZLIK-lobi-takim-ikon.png` |
| Atölye patlatılmış / birleşik / az parçalı sekme | dirsekli çizgi; ızgara 5 satır + "Market'ten al" | `TEMIZLIK-atolye-patlatilmis.png`, `-birlesik.png`, `-izgara-az.png` |
| Yedek boyu | WebGL ve yedek tuvali 356×468; yığın aynı aralıkta | `TEMIZLIK-atolye-webgl-boyut.png` ↔ `TEMIZLIK-atolye-yedek.png` |
| Market'te aç | ödünç topacın Gövdesi (Kalkan Gövde) odakta → düğme → `?vurgu=kalkan-govde`; hücre vurgulu, seçili, odakta | `TEMIZLIK-atolye-markette-ac.png`, `TEMIZLIK-market-vurgu.png` |
| **Pergel ring-out** | Yeni hesap. Atölye bir kez açıldı, sonra girdisiz topaçla **gerçek sunucu botu maçı**. Maç 1: yenilgi, son tur durma (`ringOutKayip:false`, ipucu yok). Maç 2: yenilgi, son tur ring out → `/api/ben` `sonMac = {neden:"puan", kazandi:false, bitis:"ringOut", ringOutKayip:true, macSayisi:2}`. Atölye'ye dönünce Pergel kendiliğinden "Aslında kenara yakın dönmek Enerji doldurur ama riskli…" dedi | `TEMIZLIK-pergel-ringout.png` (balon belirme animasyonunun ortasında) |
| **Kasırga Ulti** | Yeni hesap, Yapay set (Kasırga Döküm). Lv.3'e geliştirme ucu `xp-ver` ile çıkarıldı; sim'e ve istemci dünyasına yazım yok. **Antrenman** hesabın kayıtlı takımını ve seviyesini kullanıyor: profil `kasirga-yapay`, yuvalar `[14, 6, 18]` (18 = Ata Savruğu), seviye 3. Eğitimin 4. adımında Enerji oyun kuralıyla dolu; fare rakipte iken **3** tuşu → Ata hologramı (Yel Vatozu) yükseliyor, HUD 3. yuvada "Ata Savruğu" | `TEMIZLIK-kasirga-ulti.png` |
| Kasırga Ulti, çevrimiçi | Aynı hesapla **4 gerçek sunucu botu maçı** (`?oto=dolas`). Paylaşılan bot tur başına %25 olasılıkla Ulti'yi hedefliyor; Enerjiyi 300'e biriktirmeden Yetenek/Özel'e harcadı (maç başına en çok 217 / 236 / 61 / 158). Çevrimiçi maçta Ulti anı yakalanamadı; veri tarafı Antrenman'da ve birim testte doğrulandı | — |
| Maç ilk yüklemesi | § 2 tablosu (üretim paketi) | `TEMIZLIK-yukleme-{once,sonra}.json` |

**Konsol hatası:** 0. Bütün adımlarda `console.error` ve `pageerror` sayıldı; 4xx kaynak hatası filtresi yalnız beklenen oturum kontrolleri için (`TEMIZLIK-ozet.json` `hatalar: []`).

## Kalan sorunlar / notlar

- Sıkıştırmasız toplam ilk yükleme 1,62 MB (kodun tamamı; varlık 533 KB). Dağıtım Cloudflare Tunnel üzerinden sıkıştırıyor
  (≈ 750 KB). Yerel Node sunucusuna gzip eklenmedi: yeni bağımlılık gerektiriyor ve dağıtımda gereksiz.
- 3B ikonlar ilk kez (localStorage boşken) three.js paketini (582 KB, gzip ≈ 150 KB) Market / Başarımlar / Lobi'de de
  indiriyor. Yordamsal ikon hemen görünüyor, sonra 3B'ye dönüyor. Sonraki açılışlarda ikonlar önbellekten geliyor.
- Lobi takım sahnesinde 3B kare ikon (48×48) yordamsal tuvalden (48×39) biraz uzun; kaide üstünde 9 px yukarıda duruyor.
  Göze batmıyor.
- `npm run altin:uret` bilerek çalıştırılmadı (§ 1).
- Çevrimiçi maçta paylaşılan bot (`?oto`) Ulti için Enerji biriktirmiyor. Bu yüzden otomatik testte çevrimiçi Ulti anı
  yakalanamıyor; insan oyuncu biriktirip 3'e basabilir. Bot denge konusu (`BOT_YETENEK.ultiBiriktir`), bu turda
  değiştirilmedi.
