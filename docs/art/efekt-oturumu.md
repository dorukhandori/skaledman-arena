# Efekt araştırma oturumu: kayıt

**Tarih:** 2026-11-04 · **Şapka:** `@iris` · **Dal:** `devran-kod` · **Durum:** araştırma iki turda bitti; uygulama (indirme, pişirme, entegrasyon) **sahip kararı bekliyor**.
Bu belge oturumun **kaydıdır**; içerik ve ayrıntı `docs/art/efekt-kaynaklari.md`'de, lisanslar `docs/art/krediler.md`'de. O iki dosya ve `kaynak/efekt/**`, `veri/manifest-*.json` ayrı bulut oturumunun sorumluluğunda; bu belge onlara yalnız atıf yapar.
Tasarım dilindeki yeri: `docs/art/tasarim-dili.md` § 6.

---

## 1. İsteğin kaynağı

Sahip (2026-11-04): *"00gamedevs.com gibi sitelerden efektleri alabilirsin; böyle efekt araştırmaları yap."* (kaynak: `efekt-kaynaklari.md` başlık bölümü).
Bağlam: D3 sonunda oyunda efektler tamamen kodla (Graphics, `ParticleContainer`, `MeshRope`) ve sesler 16 sentez WAV; hiçbir dış varlık yoktu (kaynak: D3 raporu § 1, § 8). Hedef, 05 § 3.2 olay reçetelerini (özellikle bitiş anları, element patlamaları, Ulti) hazır ve lisansı temiz kaynaklarla güçlendirmek.

## 2. İki aşama

| Aşama | Kim / nerede | Commit | Ne yaptı |
|---|---|---|---|
| 1. tur | Ana oturumun (`session_01KrtXAEJc6nN2SyPJcv3nGr`) arka plan ajanı | `edc2c9c` "docs(art): effect and sound source research (00gamedevs, pixelfx, CC0 audio) with license map" | `docs/art/efekt-kaynaklari.md` (324 satır): görsel kaynak tablosu G1-G21, ses/müzik S1-S18 + M1-M9, 05 § 3.2 eşleme tablosu, 16+2 ses seti önerisi, entegrasyon notu, risk ve lisans haritası, sahip kararı listesi |
| 2. tur | Ayrı bulut oturumu `session_01KrtXAEgzkaTNFLENnLBkA9` ("Devran: efekt ve ses kaynakları araştırması (Opus)", ana oturumun çocuğu) | `590a067` "docs(art): verify effect sources, add CC0 impact sound candidates and pixelfx bake recipe" | Alan adı başına doğrulama denemesi (§ 8.1), 12 Kenney Impact Sounds OGG (CC0, 84 KB) `kaynak/efekt/kenney-impact-sounds/`, pixelfx ve pixel-vfx-codex MIT lisans dosyaları + 16 efektlik pişirme reçetesi, yeni `veri/manifest-gorsel.json`, `veri/manifest-ses.json` içinde `kayitAdaylari`, yeni `docs/art/krediler.md` |

`590a067`'den sonra `docs/art`, `kaynak/efekt`, `veri/manifest-ses.json` yollarında başka commit **yok** (kaynak: `git log --oneline -- docs/art veri/manifest-ses.json kaynak/efekt`, 2026-11-04). 2. tur oturumu şu an **boşta, karar bekliyor** (oturum durumu: idle / blocked, "3 karar bekliyor: ağ izni, render izni, Kenney sesleri").

## 3. Ne bulundu

| Bulgu | Özet | Lisans | Durum | Kaynak |
|---|---|---|---|---|
| **00gamedevs.com** | Three.js (3B, shader) VFX kütüphanesi, 64 efekt + 46 oyun nesnesi; sprite sheet sitesi **değil**; dışa aktarılan kod MIT, site markası/avatarları kapsam dışı | MIT (codex LICENSE aktarımıyla doğrulandı) | Site **açılamadı**; tasarım ve zamanlama referansı | efekt-k. § 0, G1, § 8.2 |
| **pixel-vfx-codex** (888wing) | 00GameDevs'in 64 efektinin pixel yorumu; 3 kamera; bizim için **2D kamera** (160×100, düz bantlar, dither yok, 1 px çizgi, 12 fps); hazır sheet yok, `tools/snap.mjs` ile üretilir | MIT (commit `a7f829b`) | Lisans depoda; yedek kaynak | G2; § 8.2 |
| **pixelfx** (patch-gg) | 244 kodla çizilen pixel efekti, tohumlu, palet değiştirilebilir, CLI ile şeffaf PNG sheet + JSON; **en güçlü aday**; 16 efekt seçildi (hit-spark, crit-hit, ricochet, heavy-landing, ground-slam, poof, zap-hit, charge-up, ice-shatter, frost-nova, fire-ring, earth-spike, tornado, implosion, whirlpool, collect-burst) | MIT (commit `a841596`); Patch Pixel fontu MIT dışı, kullanılmaz | Reçete depoda, **PNG pişirilmedi**; atlas tahmini 2048²'nin ~%42'si | G3; § 8.2 |
| **Kenney Impact Sounds** | 130 OGG; 12'si indirildi (metal hafif/orta/ağır, teneke, plaka, cam, çan) | CC0 | **K-ayna**: GitHub aynasından doğrulandı, kenney.nl okunamadı; oyun yüklemiyor | S1; § 8.3; krediler |
| Diğer CC0 ses adayları | BigSoundBank bozuk para (Durma için birebir), OGA Glass Break, Kenney Interface, Junkala 512, qubodup | CC0 (yalnız arama özeti, "A") | İndirilemedi | S2-S11 |
| Müzik adayları | M1 "Chiptune Battle Music" (arena), M5 "Menu Theme" (menü) | CC0 ("A") | İndirilemedi; Content ID riski | M1-M9 |
| Üretim araçları | jfxr (BSD kod, çıktı serbest, **K**), ChipTone (çıktı CC0 beyanı, "A") | — | Kullanılabilir | S15-S16 |
| Kullanma | Reactorcore, ragnapixel (lisans çelişkili), BlackCreepyCat, Frostwindz (yeniden dağıtım yasak), Pixabay (CC0 değil), jsfxr çıktısı, Freesound NC | — | Dışarıda | efekt-k. § 0 madde 5; § 6.2 |

Ses bütçesi: mevcut sentez 204 716 + yeni 84 101 = **288 817 bayt ≤ 500 KB** (kaynak: § 8.3).

## 4. Ağ politikası engeli

Bulut oturumunun ağ politikası şu alanları reddetti (curl CONNECT 403, WebFetch ENOTFOUND): **00gamedevs.com, kenney.nl, opengameart.org, itch.io ve alt alanları, bigsoundbank.com, freesound.org, pixabay.com, spritefusion.com, particlefx.studio, \*.github.io**. Yalnız **github.com** ve **raw.githubusercontent.com** açık (kaynak: efekt-k. § 6.1, § 8.1).

**Sahibin atacağı adım:** oturum başlığındaki bulut ortamı menüsü → Edit → Network access → Allowed domains: `00gamedevs.com, kenney.nl, opengameart.org, itch.io, *.itch.io, bigsoundbank.com, freesound.org, spritefusion.com, particlefx.studio, *.github.io` (kaynak: § 8.1). Alternatif: sahip varlıkları kendi makinesinde indirip depoya koyar, ajan okur ve kaydeder (kaynak: § 7 madde 1).

## 5. Lisans uyarıları

- **MIT bildirimi zorunlu:** pixelfx (Patch, Hugo Duprez) ve pixel-vfx-codex (codex katkıcıları, 00GameDevs, pixel-plays); metin `docs/art/krediler.md` "MIT bildirimi" bölümünde, oyun içi krediler sayfasına girecek (kaynak: krediler).
- 00GameDevs adı, markası, avatarları oyunda görünmez; yalnız kredilerde (kaynak: § 5.5).
- Metin içeren efektler (POW!, crit-number, level-up) yazısız pişirilir ya da kullanılmaz (kaynak: § 5.5).
- "A" satırları (yalnız arama özeti) asıl sayfa okunmadan **indirilmez** (kaynak: § 6.1).
- Kenney sesleri ayna kökenli: entegrasyondan önce kenney.nl ile karşılaştırılmalı (kaynak: § 8.1, § 8.5 madde 3).
- CC0 müzik bile Content ID'ye kayıtlı olabilir; yayında ihtar riski (kaynak: § 5.5; `nile-kapsam.md` B-35).
- Ruh avatarları bu kaynaklardan **alınmaz** (B-36 ayrı denetim) (kaynak: § 5.5).

## 6. Kararlar

### 6.1 Alınan (öneri olarak belgelenen, sahip itirazı yok)
1. Hafif efektler (parçacık, şok çemberi, iz, flaş) kodla kalır; dış kaynak yalnız bitiş, element patlaması, Ulti (kaynak: § 0 madde 3).
2. pixelfx/codex **çalışma zamanında değil derleme anında** pişirilir; tek `public/efekt/efekt.png` atlası; commit SHA'ya kilitli; kaynak kod depoya girmez, reçete girer (kaynak: § 5.1).
3. codex kullanılırsa **2D kamera** (dither yok, 1 px çizgi) (kaynak: G2, § 8.2).
4. Ölçek yalnız tam sayı; palet pişirme tint'e tercih (kaynak: § 5.2-5.3).
5. Mevcut 16 sentez ses taban olarak kalır; kayıtlar katman olarak eklenir, sentez yedeği korunur (kaynak: § 4).
6. Kullanma listesi (§ 3 son satır) kesin.

### 6.2 Karar bekleyen (sahip)
| # | Karar | Kaynak |
|---|---|---|
| K1 | Ağ izni (§ 4) | § 7 m.1, § 8.5 m.1 |
| K2 | pixelfx render aracını (`node tools/render.mjs`, sabit commit, ağsız, yalnız PNG/JSON yazar) ajanın çalıştırması ya da sahibin yerelde çalıştırması; yeni geliştirme bağımlılığı (`@axiom` onayı) | § 7 m.2, § 8.5 m.2 |
| K3 | Kenney sesleri ayna kopyasından şimdi mi entegre edilsin, kenney.nl doğrulaması mı beklensin (öneri: bekle) | § 8.5 m.3 |
| K4 | Görsel çıta: dither'lı codex dili mi, düz bant mı (D1 Lab'da yan yana) | § 7 m.3 |
| K5 | Kayıt ses katmanları (Durma bozuk parası, Parçalanma camı, metal çınlama) | § 7 m.4 |
| K6 | Müzik: M1/M5 dinlenip seçilsin; Content ID riski kabul mü | § 7 m.5 |
| K7 | Pixabay ve Freesound tamamen dışarıda mı (öneri: evet) | § 7 m.6 |
| K8 | Ses biçimi: OGG + Safari yedeği mi, WAV mı | § 7 m.7 |
| K9 | `pixi-filters` (Ulti şok dalgası) bağımlılığı denensin mi | § 7 m.8 |

## 7. Sonraki adımlar (kararlardan sonra)

1. **Varlık indirme** (K1 sonrası): A satırlarını asıl sayfadan doğrula; BigSoundBank bozuk para (S10), OGA Glass Break (S8), müzik M1/M5; Kenney orijinal paketiyle karşılaştırma (kaynak: § 8.5 m.1).
2. **pixelfx pişirme** (K2 sonrası): `araclar/efekt-pisir.ts` (ad öneri) reçetedeki 16 efekti `efekt.png` + `efekt.json`'a; D1 Topaç Lab'da kod parçacık ile pişmiş sheet yan yana; ışık katmanı ayrımı (normal + `add`) denenir (kaynak: § 5.1, § 3.1 m.2).
3. **Ses seti entegrasyonu** (K3, K5, K8 sonrası): `Efektler.olay` → `sesKanca` değişmeden kayıt katmanları; `araclar/ses-uret.ts` `manifest-ses.json`'u baştan yazdığı için `kayitAdaylari` bloğu ayrı dosyaya taşınmalı ya da araç bloğu korumalı (kaynak: § 8.3 "Dikkat"); sesler **gerçek kulakla** dinlenip karışım (−16 LUFS efekt, −20 müzik) (kaynak: § 4; D3 § 11 m.5).
4. **Krediler:** her entegre varlık `docs/art/krediler.md` + manifest satırı; oyun içi Krediler sayfası D8 (kaynak: krediler; `nile-kapsam.md` § 2 D8).
5. **Öneri sırası** (kaynak: § 3.1): Durma sesi + Parçalanma camı → hit-spark/crit-hit pişirme denemesi → metal çarpışma katmanları → 6 element Ulti sheet ailesi → UI sesleri + 2 müzik → alan dekalleri.
6. Tasarım dili kapısı: pişmiş efektler `tasarim-dili.md` § 6.2 element kimliğine ve § 5 hareket sınırlarına göre gözden geçirilir; Görsel Uyum Geçişi'nde (`tasarim-dili.md` § 8.3, özellikle GU-04 çarpışma efekti ve GU-05 Ulti) 07/08 ekranlarının sanat puanını belirler; referans 07'deki ışınsal yıldız patlaması ve takım renkli hız çizgileri, 08'deki eş merkezli kırmızı halka ve kenar parlaması (`#E6680C`) hedef görünüştür.

## 8. Mevcut durum (2026-11-04)

- `docs/art/efekt-kaynaklari.md` 2. turda ("Durum: 2. tur (§ 8)"); `docs/art/krediler.md` var; `kaynak/efekt/` altında 12 OGG + pixelfx/codex lisans ve reçete; `veri/manifest-gorsel.json` yeni.
- **Oyun bu varlıkların hiçbirini yüklemiyor.** `src/` değişmedi; atlas PNG yok.
- 2. tur oturumu boşta; onay bekleyen üç madde: **K1 ağ izni, K2 render izni, K3 Kenney sesleri** (kaynak: oturum özeti). K4-K9 1. turdan beri açık.
- Bilinmeyenler: Kenney paket içi adların asıl sayfayla eşleşmesi; "A" satırlarındaki kare boyutları; Safari Ogg desteği; pişmiş efektlerin topaç diliyle görsel uyumu (yan yana kare yok).
