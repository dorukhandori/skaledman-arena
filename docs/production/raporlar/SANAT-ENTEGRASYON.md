# SANAT entegrasyonu: Ata hologramları, ruh portreleri, Pergel → `devran-kod`

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` (worktree, ana çalışma ağacına dokunulmadı) · **Kaynak dal:** `origin/devran-sanat` (sahibe ait; silinmedi, push edilmedi) · **Durum:** tamam, push edildi.

## 1. Ne birleşti

İki birleştirme (`git merge --no-ff`, rebase değil):

| Commit | Ne |
|---|---|
| `e8a5dd2` merge | `devran-sanat` 99dfb40 → 297f286: 6 Ata sayfası (`public/ruh/ata/<element>.png` + `.json`), 21 ruh portresi (`public/ruh/portre/`), Pergel portreleri (`public/bilgic/`), `src/istemci/oyun/RuhGorsel.ts`, `src/istemci/bilgic/*`, `veri/ipuclari.json`, `veri/ruhlar.json` (`unvan`), `semalar.ts` (`unvan`, `IpucuSema`), `Ayarlar.ts` (`pergel`), `Atolye.ts` (Pergel bağlama, `data-pergel-hedef`), `YetenekGorsel.ts` (ruh çağrısı, eski silüet yedekte), `araclar/sanat/*`, `test/pergel.test.ts`, belgeler (06, bilgic-pergel, üretim kaydı, entegrasyon notu), `.gitignore` `art-source/` |
| `45d242a` merge | `devran-sanat` b925e37 (birleştirme sırasında geldi; sahip yönlendirmesi brief 641d31f): Ata **hologram** (çağıranın çekirdeğinden V ışığı, 12 şeritte alttan şekillenme), `<element>-holo.png` (192 px) + `-holo-k.png` (96 px), `Mac.ts` `topacKonumu` kancası, `araclar/sanat/hologram.py` |

Entegrasyon commit'leri (hepsi `devran-kod`'da): `ea62f5b` (hibrit kamera + Takım Ultisi + çift bant; RuhGorsel kısmı 45d242a'da hologram sürümüyle değişti, MacHud kısmı geçerli), `515f8dc` (tembel yükleme), `7f43d1c` (Pergel Kuşak Taşı stili, İpuçları anahtarı, azalan sıklık), `53187c7` (krediler + manifest), bu rapor commit'i.

## 2. Çakışmalar ve çözüm

- **1. birleştirme: metin çakışması yok.** GU-A (Atölye) ve GU-B (Ulti telegrafı, hibrit kamera) zaten ortak tabandaydı (sanat dalı `d360444` üstüne rebase edilmişti). Beklenen örtüşme dosyaları (`YetenekGorsel.ts`, `Atolye.ts`, `Ayarlar.ts`, `semalar.ts`, `ruhlar.json`, `.gitignore`, brief) otomatik birleşti; anlamca kontrol edildi (GU-B telegrafı ve GU-A Atölye düzeni korunuyor, Pergel alt şeridin üstünde).
- **2. birleştirme: `src/istemci/oyun/RuhGorsel.ts` çakıştı.** Benim ilk dilimim (yarı saydam "hayalet" Ata, canavarın arkasında) ile sanatçının hologram yeniden yazımı. **Çözüm:** sahip yönlendirmesi (06 § 1.2, sahip kararı 3) daha yeni ve doğrudan sahipten olduğu için *onların* sürümü alındı; benim niyetlerim üstüne yeniden uygulandı: (a) `?debug&ruhportre=1` bayrak geçersiz kılma (yalnız doğrulama), (b) Takım Ultisi'nde bayrak kapalıyken **üç Ata hologramı** (ortada çağıranın kendi Ata'sı tam boy, yanlarda diğer iki üye yarım boy, yalnız ortadaki kükrer/sarsar), (c) tek bant ilkesi (aşağıda), (d) kalan ruh bandı pixel yazı. `Mac.ts` / `YetenekGorsel.ts` kancaları (`topacKonumu`, `ilerle(dt, d)`) çakışmasız geldi.
- **Çift mesaj (sadelik çelişkisi):** Ulti anında HUD bandı ("ULTİ · Ata Közü", üstte) ile RuhGorsel bandı ("ATA KOR UYANDI · Alaz Bizonu", alt-orta) aynı anda çıkıyordu. **Çözüm (en sade):** tek bant. HUD bandı Ulti/Takım Ultisi anında alt-ortaya iner (`.bant.asagi`, 06 § 1.2'nin istediği yer; Ata'nın başı ve üst HUD serbest) ve unvanı taşır: "ULTİ · Ata Közü · Alaz Bizonu". RuhGorsel Ata bandı kaldırıldı. Ayrıca "ATA … UYANDI" lore dili (sözlük: "Ata Çağrısı" → Ulti) oyuncuya görünmez.
- **Yedek:** kodla çizilmiş `ruhSiluet.ts` (D8c) yalnız yedek: hologram sayfası yüklenmemişse (yüklenemedi ya da Ulti yüklemeden önce geldi) Ulti'de ve Takım Ultisi'nde o çizilir (`sayac.yedek`). Doğrulamada her senaryoda `yedek = 0` (sayfalar zamanında yüklendi).

## 3. Yapılan işler (dilimler)

1. **Birleştirme** (`e8a5dd2`, `45d242a`).
2. **Hibrit kamera uyumu:** hologram GU-B izdüşümünde (×1,44, z 0,62) çağıran topacın *çizildiği* yerden çıkar, topacı her kare izler, sprite ekranda tam ×2 ve önbellek ızgarasına oturur (pixel nearest, `cacheAsTexture` içinde maske/filtre yok). Üst HUD'a taşacaksa yarım boy sayfa. "Düz görünüm"de de çalışır (`SANAT-ulti-duz-gorunum.png`). Takım Ultisi'nde üç Ata.
3. **Pergel (Kuşak Taşı stili):** taş-bronz panel (`--panel` + `--k-doku-panel`, bronz iç çizgi, köşe yuvarlatma/gradyan/bulanık gölge yok), m5x7 `--y-16`, kalın terim `--gold`, kare çerçeveli portre, 2 basamaklı pixel kuyruk, 3 kare `steps()` giriş (hareket azaltmada yok). Balonda **tek düğme** TAMAM (`k-dugme kucuk`); "Başka?" kaldırıldı, yerine rozet tıklaması / **H** (balonda küçük not). Ayarlar'da **"İpuçları: Açık / Kapalı"** tek anahtar. **Azalan sıklık:** 3 biten maçtan sonra iki kendiliğinden ipucu arası 45 s → 3 dk; 10 maçtan sonra kendiliğinden yalnız engelleyen / yeni açılan ipuçları (öncelik ≤ 40). Biten maç sayısı mevcut "Sekme: Space" sayacından (`bitenMacSayisi`). Metinler sözlüğe göre düzeltildi (aşağıda). Testler: azalan sıklık, Lab görünürlüğü, "Ata" sözcüğü yasağı.
4. **Krediler ve manifest:** `docs/art/krediler.md` § Kendi üretimimiz'e 3 satır (Ata sayfaları, 21 portre, Pergel; Gemini → Tripo → Blender hattı, **yapay zekâ üretimi** notu); `veri/manifest-gorsel.json`'a `ruh.ata-hologram`, `ruh.ata-kaynak`, `ruh.portre`, `bilgic.pergel` (`yapayZeka: true`, bayt). `npm run krediler:uret`: eksik atıf yok; `.gitignore` `art-source/` var.
5. **Tembel yükleme:** maç başında hiçbir ruh sayfası inmez. Bir topacın Ulti yuvası açık ve Enerjisi Ulti bedelinin yarısına gelince yalnız o topacın elementinin hologramı (tam + yarım boy); Takım Enerjisi yarıya gelince takımın üç üyesininki. Portre bayrağı kapalıyken portre hiç inmez.

## 4. Kontroller

| Kapı | Sonuç |
|---|---|
| `npm run typecheck` | temiz |
| `npm run lint` | temiz |
| `npm test` | 20 dosya, **419 test geçti** (ilk birleştirmede 413; aynı sürede gelen ART-1 `topac-atlas` testleriyle 417; +2 Pergel testi) |
| `npm run build` | geçti |
| `npm run test:tarayici` | altın hash'ler **AYNI** (Node = Chromium = kayıt); sim'e dokunulmadı |
| `npm run krediler:uret` | eksik atıf yok |

**Gerçek çalışma zamanı** (`npx vite --port 5196`, `KIMLIK_MODU=sifre`, geçici `VERI_DIZINI`; Playwright Chromium 153 headless, 1280×720 DPR 2; betik `araclar/sanat-ekran.cjs`, özet `docs/production/raporlar/ekran/SANAT-ozet.json`):

| Senaryo | Sonuç |
|---|---|
| 6 element Ulti (yerel, `enerjiDoldur` debug kancası; telegrafın 16. render karesinde durdurulup çekildi) | 6/6 hologram, `ata = 1`, `kukreme = 1`, `yedek = 0` |
| Takım Ultisi (Takım Enerjisi 100) | üç Ata hologramı, tek kükreme, `yedek = 0` |
| Düz görünüm (`gorunum=duz`) Ulti | hologram çizildi |
| Özel Yetenek, portre bayrağı **kapalı** | portre belirmedi (`bagli = 0`), portre isteği **0** |
| Özel Yetenek, bayrak **açık** (`?debug&ruhportre=1`) | Közkartal portresi belirdi (`bagli = 1`) |
| Pergel (yeni hesap → Atölye) | 1,5 s sonra `ilk-ziyaret`; balon OYNA ile örtüşmüyor; odak OYNA'da kaldı; Esc kapatır; H yeni ipucu; Ayarlar'da "İpuçları"; Kapalı'da Pergel DOM'da yok |
| Konsol hatası / pageerror / requestfailed | **0** (tüm senaryolar) |
| Kare CPU işi (mantık + Pixi render, `olcumBaslat`; Ulti dahil ~130 kare/element) | p95: Kor 4,4 · Şimşek 7,8 · Kasırga 4,8 · Girdap 5,0 · Kaya 5,5 · Don 4,7 ms (hepsi ≤ 16,7 ms); en kötü tek kare 16,6 ms (headless SwiftShader, gerçek GPU değil) |

**ZORLAMA notu:** Kasırga'nın başlangıç Çekirdeği (`kasirga-yapay`) Ulti yuvası boş (`yetenekler[2] = -1`); Kasırga Ulti'si yalnız `profiller[0].yetenekler[2] = 18` (Ata Savruğu) debug yazımıyla çekildi. Bu bir veri boşluğu (aşağıda karar bekleyen).

## 5. Ekran görüntüleri

`docs/production/raporlar/ekran/`:
- `SANAT-ulti-{kor,simsek,kasirga,girdap,kaya,don}.png`, pano `SANAT-ulti-pano.jpg`
- `SANAT-takim-ultisi.png`, `SANAT-ulti-duz-gorunum.png`
- `SANAT-ozel-portre-kapali.png`, `SANAT-ozel-portre-acik.png`
- `SANAT-pergel-atolye-ilk.png`, `SANAT-pergel-atolye-sor.png`, `SANAT-pergel-ayarlar.png`
- Referans 08 ile yan yana: `SANAT-kiyas-08.jpg`

## 6. Uyum puanı (referans 08)

**7 / 10.** Tutan: element renginde yarı saydam canavar, çağıran topaçtan yükselir, topaç önde okunur, HUD örtülmez, pixel nearest, kırmızı telegraf halkası ile birlikte okunuyor, kükremede zemin halkası + küçük sarsıntı. Fark: (1) canavar referanstakinden küçük (ekran yüksekliğinin ~%30'u, referansta ~%45; yarım boya düşme kuralı ve HUD payı yüzünden), (2) referanstaki ekran kenarı turuncu ışıması bizde yalnız 0,3 s kenar parlaması (Flaş: Normal) + koyu vinyet, (3) bizde hologram (V ışığı + tarama), referansta düz hayalet: bu **sahip kararıyla** bilerek farklı (06 § 1.2), puandan düşülmedi. (4) Ulti bandı altta (referansta yazı yok).

## 7. Boyut ölçümü

| Klasör | KB | Maçta ilk yükleme |
|---|---|---|
| `public/ruh/ata/*-holo*.png` (12) | 1 717 | **0** (tembel) |
| `public/ruh/ata/<element>.png` + `.json` (renkli kaynak, 6) | 1 383 | 0 (çalışma anında hiç yüklenmez) |
| `public/ruh/portre/` (21) | 464 | 0 (bayrak kapalı) |
| `public/bilgic/` (3) | 52 | 0 (yalnız Atölye) |
| **`public/ruh` + `public/bilgic` toplam** | **3 616 KB** (du: 3 728) | **0 KB** |

Ulti yaklaşınca element başına: 138 KB (Şimşek) – 464 KB (Girdap), ortalama 293 KB (Kor 291 KB ölçüldü). Bir maçta en kötü durum (iki taraf da Ulti + Takım Ultisi, 6 farklı element): 1 717 KB, dağınık zamanda.

**Maç ilk yükleme (ölçüldü, maç başı + 4 s, Enerji yok):** ~1 883 KB benzersiz (yazı tipleri 112, sesler ~420, topaç sprite'ları 27, **efekt atlasları 1 370 KB** [`efekt.png` 657 + `efekt-kor.png` 524 + `efekt-kaya.png` 189] + json). **Ruh/Pergel katkısı 0 KB.** 1,5 MB hedefini aşan kısım bu entegrasyondan değil, efekt atlaslarından (ayrı oturum); aşağıda öneri.

## 8. Varsayımlar

- Sahibin hologram kararı (brief 641d31f, 06 § 1.2) görevdeki "atanın arkasında, yarı saydam hayalet" tarifinin yerine geçer; hologram topacın üstünde (efekt katmanı) çizilir, yarı saydamdır. Görev metnindeki "arkasında" bu yüzden uygulanmadı.
- Takım Ultisi "Ulti katmanı" sayıldı: bayrak kapalıyken üç Ata hologramı (kapsam: element başına 1 Ata; yeni varlık yok).
- Azalan sıklık eşikleri (3 maç → 3 dk ara, 10 maç → yalnız öncelik ≤ 40) benim seçimim; biten maç sayısı tarayıcı yereli (sunucuda antrenman dahil maç sayısı yok; `yuz-mac` ilerlemesi yalnız hızlı/dereceli sayar).
- Lore adı "Ata" oyuncu metninde (Pergel) kaldırıldı, "ruh" kullanıldı (06: oyuncuya görünen ad Ruh). Yetenek adları ("Ata Közü" vb.) veri adı olarak aynen kaldı.

## 9. Sütun / sadelik çelişkileri (işaretlendi, en sade seçenek uygulandı)

1. **sütun/sadelik çelişkisi:** `bilgic-pergel.md` § 2.6 "Açık / Yalnız sorunca / Kapalı" üç seçenek + balonda "Başka?" ve "Tamam" iki düğme ↔ `sadelik-ilkeleri.md` S-2 (ekran başına tek ana eylem), S-7 (kısa). **Uygulanan:** tek anahtar Açık/Kapalı, balonda tek TAMAM, "yalnız sorunca" davranışını azalan sıklık karşılar. Belge güncellendi (§ 2.6, § 5.3, yeni § 6).
2. **sütun/sadelik çelişkisi:** Ulti anında iki bant (HUD + Ata adı) ↔ "anda tek mesaj". **Uygulanan:** tek bant alt-ortada, unvanla.
3. **sütun/sadelik çelişkisi:** `ruh-ozel` ipucu "Özel Yetenek'te ruh arkanda belirir" diyordu, bayrak kapalıyken yanlış bilgi; `lab` ipucu oyuncuya görünmeyen Topaç Lab'ı anlatıyordu (S-10). **Uygulanan:** `ruh-ozel` metni "Özel Yetenek farklıdır, **2** tuşu"; `lab` yalnız `?gelistir=1` ile.

## 10. Sahip kararı bekleyenler

1. **Kasırga Ulti'si başlangıç parçalarında yok** (`kasirga-yapay` Ulti yuvası boş; Ata Savruğu'nun ruhu `sarmalbaykus`'a bağlı Çekirdek kataloğda yok). Kasırga oyuncusu Yel Vatozu'nu hiç görmez. Veri/denge kararı.
2. Efekt atlasları (1,37 MB) maç ilk yükleme hedefini (1,5 MB) tek başına zorluyor: element atlaslarını da tembel yükleme ya da WebP önerisi (efekt oturumu).
3. `public/ruh/ata/<element>.png` renkli kaynak sayfalar (1,38 MB) çalışma anında kullanılmıyor ama `public/` altında dağıtılıyor: `kaynak/` ya da `art-source/` altına taşınması önerilir (sanat oturumunun hattı `hologram.py` buradan okuyor; o oturum taşımalı).
4. Yapay zekâ çıktılarının hizmet koşulları (Gemini, Tripo ücretli plan) ticari kullanım için sahip tarafından doğrulanmalı (krediler satırında not var).
5. Portre bayrağı (`RUH_PORTRE_OZEL_YETENEK`) sonraki sürümde açılacak mı (kapalı başlıyor; açıkken çalıştığı doğrulandı).
6. Uyum farkı (canavar boyu ~%30 vs referans ~%45): hologramın büyütülmesi HUD payıyla çatışıyor; sahip görsel tercihi.

## 11. Paralel oturumlardan beklenen / alınan

- **Alınan:** `origin/devran-sanat` 99dfb40, f42388c, 8c78235, 297f286 (ilk birleştirme) ve b925e37 (hologram, ikinci birleştirme); brief 641d31f yönlendirmesi uygulandı. Aynı sürede `devran-kod`'a gelen ART-1 (27c3e01, f1fb83d: topaç atlas yükleyicisi) ve GU-A2 (d9921e8) ile çakışma yok; birlikte doğrulandı.
- **Beklenen:** sanat oturumundan Kasırga Ulti/Çekirdek kararı (§ 10.1), renkli kaynak sayfaların `public/` dışına taşınması (§ 10.3), varsa Ata rig/gerçek kükreme (Tripo, SA #18; sahip onayı olmadan başlatılmaz). `/api/ben` son maç sonucu (Pergel `ring-out`, SA #17) hâlâ yok.
