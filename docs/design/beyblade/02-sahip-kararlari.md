# Sahibin vermesi gereken kararlar (Devran lore + arena eşlemesi)

**Tarih:** 2026-11-04 · **Yazar:** [@helix · Game Designer] · **Durum:** taslak, sahip onayı bekliyor.
Bağlı belgeler: `00-lore-cercevesi.md`, `01-arena-eslemesi.md`. İlk üç karar blokajdır (sıra önemli); gerisi paralel gidebilir.

| # | Karar | Seçenekler | Önerim | Tek satır gerekçe |
|---|---|---|---|---|
| **K-1** | Skaledman bağı: tamamen kopsun mu? | (a) tam bağımsız, kimlik yalnız Kick; (b) Skaledman kartları "Çekirdek" olarak içe aktarılır; (c) ikisi paralel | **(a)** | Yeni lore ve IP hijyeni Pokémon/füzyon sprite'larıyla bağdaşmaz; sprite boru hattı da iptal. |
| **K-2** | Oyunun kod adı | Devran / Girdap Çağı / Eksen Savaşı | **Devran** | Türkçe, lore'a yakın; marka taraması yapılmadı. |
| **K-3** | Kontrol modeli (C hibrit) | A doğrudan sürüş / B komut / C hibrit (sürüş + stamina barı + Enerji) | **C**, `Girdi` şeması aynı | Altyapının %80'i kalır, kanıtlı his (R05). |
| **K-4** | Maç bitişi | İlk 3 / ilk 4 puan; 60-90 sn hedefine uyum | **İlk 3**, 90 sn üst sınır + ani ölüm | 60-90 sn hedefi için kısa; X'in 4'ü uzun. |
| **K-5** | Merkez Kuyu bitişi (3 puan) | Yok / var | **İlk sürümde yok** | Ring Out + Parçalanma + Durma yeterli; Kuyu arena çeşitliliği için sonra. |
| **K-6** | Takım değişimi | Serbest Tab / yalnız bitiş sonrası / düşük devirde geri çek | **Bitiş sonrası zorunlu + `stamina<%25` geri çek** | Topaç temasında maç ortası serbest geçiş anlamsız (R05). |
| **K-7** | Lv.4 seviyesi ve Ulti ilk sürümde mi | Var / ikinci sezona | **İkinci sezona**; ilk sürümde Yetenek + Özel Yetenek | Ulti ve Ata görselleri en pahalı sanat; mekanik oturmadan eklenmesin. |
| **K-8** | Eş Çekirdek (iki çekirdek birleşimi) | İlk sürüm / sonra / hiç | **Sonra (ikinci sezon)** | Eski füzyon çeşitliliğini geri getirir, dengeyi bozar; önce tekil çekirdek. |
| **K-9** | Çekirdek staminası (Miras) ve ekonomi | Kapalı / yalnız ödül / oyuncular arası | **Kapalı; lore'da var** | Ekonomi sayıları ve sahtecilik riski `@ledger` + `@vault` işi; erken açma. |
| **K-10** | Kara (Karanlık) kökeni ilk sürümde | Var / sonra | **Var, tek Karanlık yetenek ile** | Sol dönüş ve Kararma kimlik katar; ilk üç köken olsa da Karanlık zıt yön eşitleme mekaniğinin tek test yolu. |
| **K-11** | Seyirci etkileşimi (Kick sohbeti arena olayı) | Yok / F2 sonrası | **F2 sonrası** | Webhook altyapısı hazır; ama önce çekirdek oyun. |
| **K-12** | Terimler: "Oyuncu", "Topaç", "Enerji" kalıcı mı | Onay / değiştir | **Onay** | Sözlük (00 § 8.2) IP hijyeni için tutarlı kalmalı. |

## Önce ilk üç (sahibe soru)
1. **K-1:** Skaledman bağı tamamen kopuyor mu, yoksa kartlar bir şekilde (ör. kozmetik Çekirdek) taşınacak mı? Buna göre `docs/tech/` ve `veri/` yeniden planlanır.
2. **K-3 + K-4:** Kontrol C hibrit ve "ilk 3 puan, 90 sn üst sınır" modelini onaylıyor musun? Sim ve HUD buna göre yeniden kurulur.
3. **K-2 + K-12:** Devran kod adı ve Oyuncu/Topaç/Enerji sözlüğü kabul mü? Marka taraması (TÜRKPATENT) hangi aşamada yapılsın?

## Not
Sayılar ve eşikler `economy-designer` ile `tuning.md`'de kararlaştırılır. Bu karar listesi yalnız şekli sorar. Netcode açısından telegraf süreleri ve Takım Ultisi gibi özellikler `network-programmer` onayından geçmeden kesinleşmez.

## Onaylanan referans görünümler (sahip, 2026-11-04)
Dokuz ekranın referans görünümü (Gemini `gemini-3.1-flash-image` ile üretilmiş konsept, nihai sanat değil) sahip tarafından tek tek onaylandı: giriş/profil, ilk çekirdek, atölye, market, başarımlar, lobi, maç arenası, ulti anı, sonuç. Canvas: <https://claude.ai/artifact/8P44Vjnp72DtkoLXFut5Ks>. Yerel dosyalar: `docs/research/beyblade/gorunum/0[1-9]-*.jpg` (repo dışı). Pixel planı (`docs/art/topac-pixel-plani.md`) ve HUD tasarımı bu kompozisyonları hedef alır; sözlük `04-sozluk.md`.

## 2026-11-05: Kutsal canavarlar ve Pergel

Sahip istedi, tüm üretim hatlarına (Tripo dahil) izin verdi. Varsayılanlar:

- Ulti'de elementin **Ata**'sı belirir (`06-kutsal-canavarlar.md`).
- Altı Ata'nın türleri **onaylandı**: Alaz Bizonu (Kor), Çakım Geyiği (Şimşek), Yel Vatozu (Kasırga), Dip Nautilusu (Girdap), Dağ Mamutu (Kaya), Ayaz Ayısı (Don).
- Kapsam = pixel planı § 4: ilk sürümde canavar yalnız Ulti'de. Özel Yetenek'te ruh portresi `RUH_PORTRE_OZEL_YETENEK = false` ile kapalı, sonraki sürümde açılır.
- Atölye'nin ipucu karakteri **Pergel** (`docs/ux/bilgic-pergel.md`). Adı ve kişiliği sahip onayı bekliyor.

## Menü kararları (2026-11-05, sahip: "onaylıyorum", `raporlar/MENU-DENETIM.md` önerileri olduğu gibi)

- **S-1 Gezinti modeli:** Atölye ana üs. Üst bantta yalnız lento (ekran adı + ◄), Altın ve tek ⚙ (Ayarlar; Çıkış onun içinde). Atölye alt sırası: MARKET · BAŞARIMLAR · GÜNLÜK · PROFİL. "Daha fazla" açılırı kalkar.
- **S-2 Oda QR'ı:** kaldırılır. Bağlantıyı kopyala yeterli; yayın için seyirci bağlantısı zaten var.
- **S-3 Krediler:** oyuncu sürümü yalnız oyunda kullanılanları gösterir; aday ve iç durum notları yalnız `docs/art/krediler.md`'de kalır.

## Devran karar özeti (2026-11-06)

[@nile · Producer] Yukarıdaki K-1…K-12 numaraları değişmedi. Bu bölüm beş maddeyi **kodla doğrulanmış** hâliyle yazar; çelişen eski satır varsa bu bölüm kazanır. Kaynak her satırda.

| Konu | Geçerli durum | Kod / belge kanıtı |
|---|---|---|
| İlk arena | **Kuşak Arenası**: daire çanak, dış hız şeridi 0,60R–0,85R, kenardan Ring Out. İskeletler Diyarı (eski roadmap K-14) tarihçe. | `boslukler/nile-kapsam.md` B-12; `src/istemci/oyun/KusakArenasi.ts`, `HibritArena.ts` ("Hibrit Kuşak Arenası"); `ayar.ts` `kusakIc`/`kusakDis`; `tuning.md` § 2 |
| Ödünç topaç | Sahip olunan kullanılabilir Çekirdek üçe ulaşana kadar boş yuvalar ödünç topaçla dolar: **Lv.1**, tecrübe almaz, başarımda "sahip olunan" sayılmaz; ömrü biten Yapay yuvası da ödünçle dolar (kota dışı). | B-10, B-27; `src/paylasilan/kurallar/atolye.ts` `oduncKotasi`; `ilerleme.ts` `oduncSeviye: 1`; `basarim.ts`; `test/db.test.ts` "takım ve ödünç" |
| Antrenman ve misafir | **Antrenman misafire açık** (girişsiz, oyuncuId yok, ilerleme/Altın yazılmaz). Oda kodu ve hızlı maç bilet (giriş) ister. `03-oyuncu-yolculugu.md` US-1.1'deki "misafir oyun yok" Antrenman için geçerli değil. | `tide-ux.md` O-1 (b); `src/sunucu/odalar/MacOdasi.ts` (misafir yalnız `antrenman`); `test/api.test.ts`; `ekonomi.ts` Antrenman Altını 0 |
| Rakip terk ederse | Kalan oyuncu **galibiyet + yarım Altın** (×0,5), stil bonusu yok, maç başarım sayacını işletmez. Terk eden 0 Altın, 0 XP. | `tide-ux.md` G-17, O-4; `src/paylasilan/kurallar/ekonomi.ts` `rakipTerkCarpani: 0.5`, `terkAltin: 0`; `src/sunucu/oyuncu/macSonu.ts`; `test/d7.test.ts` (G-17 satırı) |
| Parça seviyesi | Kodda **parçalar sabit** (`parca` tablosunda seviye yok); yalnız Çekirdek seviyelenir, ilk sürüm tavanı **Lv.3**. Kalıcı karar hâlâ sahipte (durum-20261105 § 6-7, öneri: sabit kalsın). | `src/sunucu/db/sema.ts` (`cekirdek.seviye` var, `parca` yok); `ilerleme.ts` `tavan: 3`; `nile-kapsam.md` 03 § 7-1 önerisi |
