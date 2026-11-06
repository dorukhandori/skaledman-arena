# 08 · Teknik tasarım

**Şapka:** `@vault` (sunucu, veri) + `@relay` (oda) + `@axiom` (sınırlar) · **Bağlı:** `docs/tech/backend.md` (§ 1 katmanlar, § 4 şema, § 8 ekonomi, § 9 hesap silme), `docs/tech/netcode.md`, `docs/tech/veri-modeli.md`, `docs/gizlilik.md`. Belgeler [`01`](01-harita-ve-dugumler.md)–[`05`](05-basarim-entegrasyonu.md).
**Durum:** taslak şema ve sözleşme; bir sonraki kod oturumu buradan başlar (dilimler [`09`](09-uygulama-dilimleri.md)).

## 1. Sınırlar (değişmez kurallar)

| # | Kural | Nasıl korunur |
|---|---|---|
| T-1 | `src/paylasilan/sim/**` **değişmez**; altın hash'ler aynı | Yeni kod sim'e girmez; lint kapısı (§ 9); `npm run test:tarayici` |
| T-2 | Sunucu yetkili: ilerleme, damar, nadir yuva, başarı zarı, Ustalık, kilit, ödül sunucuda | İstemci yalnız niyet yollar (düğüm kimliği, "kaz", isabet ms, tarif kimliği) |
| T-3 | Yeni saf kurallar `src/paylasilan/kurallar/` altında (istemci gösterir, sunucu yazar), sim'den yalıtılmış | `harita.ts`, `maden.ts`, `ustalik.ts`, `ocak.ts` |
| T-4 | better-sqlite3 yalnız `src/sunucu/db/` | mevcut eslint yalıtımı |
| T-5 | Rastgelelik sunucuda: `crypto.randomInt` (zar) ve sunucu sırlı FNV tohumu (nadir yuva). `Math.random` yok | kod incelemesi; test enjekte edilen RNG ile |
| T-6 | Gün = 04:00 TRT (`ekonomi.ts` `gunAnahtari`) | tek yardımcı |
| T-7 | Kick OAuth'a dokunulmaz | kapsam dışı |

## 2. Modüller

| Dosya (yeni) | Ne |
|---|---|
| `src/paylasilan/veri/harita.ts` | `veri/harita.json`, `madenler.json`, `tarifler.json`, `ustalik.json` zod şemaları + yükleme (istemci ve sunucu paketler; **KATALOG_OZETI'ne girmez**: sim'i etkilemez) |
| `src/paylasilan/kurallar/ustalik.ts` | `seviye(tecrubeX100)`, `bant(fark)`, `basariSansi(U, E)`, `ilerleme()` (saf) |
| `src/paylasilan/kurallar/harita.ts` | düğüm durumu türetme (`acikMi`), yıldız değerlendirme (`yildizlar(ozet, sartlar)`), ödül hesabı (saf) |
| `src/paylasilan/kurallar/maden.ts` | vuruş sonucu (`vurusSonucu(U, kademe, zar, isabet, gunlukSira)`), günlük çarpan, isabet doğrulama (`isabetGecerli`) (saf) |
| `src/paylasilan/kurallar/ocak.ts` | eritme partisi, tarif uygunluğu, Usta işi olasılığı (saf) |
| `src/sunucu/api/harita.ts` | Harita + sandık uçları |
| `src/sunucu/api/maden.ts` | Kazı seansı uçları |
| `src/sunucu/api/ocak.ts` | Eritme, dövme, cila uçları |
| `src/sunucu/oyuncu/haritaMac.ts` | Harita maçı kurulumu (bot takımı/kipi/seviyesi) ve maç sonu (yıldız, ödül, sayılan maç) |
| `src/istemci/ekranlar/Harita.ts`, `Maden.ts`, `Ocak.ts` | Ekranlar (07) |
| değişen: `MacOdasi.ts`, `MacYonetimi.ts`, `macSonu.ts`, `basarim.ts`, `market.ts`, `depo.ts`, `sema.ts`, `protokol.ts`, `semalar.ts`, `Lobi.ts` (mod sütunu), `Atolye.ts` (alt şerit + cila), `Sonuc` (harita eki) | |

## 3. SQLite göç 5 (taslak)

`PRAGMA user_version` 4 → 5. Yalnız ekleme.

```sql
-- 5: Harita / Maden / Ocak
CREATE TABLE harita_dugum (
  oyuncu_id  INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  dugum_id   TEXT    NOT NULL,                 -- "b1-07"
  durum      INTEGER NOT NULL,                 -- 1 açık, 2 tamam
  yildiz     INTEGER NOT NULL DEFAULT 0,       -- bit maskesi (bit0 = şart 1)
  ilk_tamam  INTEGER,                          -- ms
  PRIMARY KEY (oyuncu_id, dugum_id)
);
CREATE TABLE maden_gunluk (
  oyuncu_id  INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  gun        INTEGER NOT NULL,                 -- ekonomi gun anahtarı
  dugum_id   TEXT    NOT NULL,                 -- '*' satırı = günün toplam vuruşu ve isabet serisi
  vurus      INTEGER NOT NULL DEFAULT 0,
  seri       INTEGER NOT NULL DEFAULT 0,       -- yalnız '*' satırında: ardışık isabet
  PRIMARY KEY (oyuncu_id, gun, dugum_id)
);
CREATE TABLE maden_seans (
  id          TEXT PRIMARY KEY,                -- uuid
  oyuncu_id   INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  dugum_id    TEXT    NOT NULL,
  gun         INTEGER NOT NULL,
  baslangic   INTEGER NOT NULL,
  vurus_bas   INTEGER NOT NULL,                -- son vuruş penceresinin sunucu başlangıç anı (ms)
  faz_ms      INTEGER NOT NULL,                -- halka fazı (her vuruşta yenilenir)
  sira        INTEGER NOT NULL DEFAULT 0,      -- bu seansta kaçıncı vuruş
  bitti       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX maden_seans_oyuncu ON maden_seans(oyuncu_id);
CREATE TABLE maden_vurus (                     -- telemetri (A7), 30 gün tutulur
  seans_id   TEXT    NOT NULL REFERENCES maden_seans(id) ON DELETE CASCADE,
  sira       INTEGER NOT NULL,
  kademe     INTEGER NOT NULL,
  basari     INTEGER NOT NULL,
  isabet     INTEGER NOT NULL,
  isabet_ms  INTEGER,                          -- istemcinin bildirdiği
  sunucu_ms  INTEGER NOT NULL,                 -- sunucu geçen süre
  verim      INTEGER NOT NULL,
  tecrube    INTEGER NOT NULL,                 -- x100
  zaman      INTEGER NOT NULL,
  PRIMARY KEY (seans_id, sira)
);
CREATE TABLE cevher (
  oyuncu_id  INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  kademe     INTEGER NOT NULL CHECK (kademe BETWEEN 1 AND 8),
  cevher     INTEGER NOT NULL DEFAULT 0 CHECK (cevher >= 0),
  kulce      INTEGER NOT NULL DEFAULT 0 CHECK (kulce >= 0),
  PRIMARY KEY (oyuncu_id, kademe)
);
CREATE TABLE ustalik (
  oyuncu_id    INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  tur          TEXT    NOT NULL CHECK (tur IN ('madencilik','isleme')),
  tecrube_x100 INTEGER NOT NULL DEFAULT 0,      -- yüzde birlik tam sayı (0,25 tecrübe = 25)
  PRIMARY KEY (oyuncu_id, tur)
);
CREATE TABLE isleme_defteri (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  tur       TEXT    NOT NULL,                  -- 'erit' | 'dov' | 'yeniden'
  tarif_id  TEXT,
  girdi     TEXT    NOT NULL,                  -- JSON {kademe: adet}
  cikti     TEXT    NOT NULL,                  -- JSON
  usta      INTEGER NOT NULL DEFAULT 0,
  ref       TEXT    NOT NULL UNIQUE,           -- istemci istek kimliği (idempotent)
  zaman     INTEGER NOT NULL
);
CREATE INDEX isleme_oyuncu ON isleme_defteri(oyuncu_id);
CREATE TABLE gorunum_sahip (
  oyuncu_id   INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  gorunum_id  TEXT    NOT NULL,                -- "arma-cevher-kaya", "cerceve-don", "cila-kor"
  usta        INTEGER NOT NULL DEFAULT 0,
  edinme      INTEGER NOT NULL,
  PRIMARY KEY (oyuncu_id, gorunum_id)
);
ALTER TABLE parca ADD COLUMN cila TEXT;        -- NULL ya da kademe kimliği ('kaya'…)
ALTER TABLE oyuncu ADD COLUMN cerceve TEXT;    -- profil çerçevesi (arma zaten var)
ALTER TABLE mac ADD COLUMN dugum_id TEXT;
ALTER TABLE mac ADD COLUMN yildiz INTEGER;     -- bu maçta kazanılan yıldız maskesi
CREATE INDEX mac_dugum ON mac(dugum_id);
```

**Gerekçeler:** düğüm durumu türetilebilir olsa da saklanır (topoloji sezon 2'de değişirse açık düğümler korunur). Bakiye deseni Altın'daki gibi defter değil, sayaç tablo (`cevher`): miktarlar küçük, işlem içinde güncellenir, `isleme_defteri` denetim izi. Tecrübe tam sayı (×100) çünkü bant 0,1 ve günlük 0,5 çarpanı kesir üretir; float birikim farkı olmasın.

**Hesap silme (`Depo.hesapSil`, backend § 9):** aynı işlemde `harita_dugum`, `maden_gunluk`, `maden_seans` (+ `maden_vurus` cascade), `cevher`, `ustalik`, `isleme_defteri`, `gorunum_sahip` silinir; `mac.dugum_id` kalır (kişisel veri değil). `oyuncu` silinince `ON DELETE CASCADE` zaten keser ama mevcut düzen açık `DELETE` yazdığı için aynı desen sürdürülür.
**Gizlilik (`docs/gizlilik.md`):** "toplanan veriler" listesine bir satır: "Harita ilerlemesi, kazı ve işleme kayıtları (oyun içi; kazı zamanlama telemetrisi 30 gün sonra silinir)". Yeni kişisel veri türü yok.

## 4. REST uçları (hepsi çerez; yazımlar + Origin; gövde ≤ 16 KB; zod)

| Uç | Girdi | Çıktı / hata |
|---|---|---|
| `GET /api/harita` | — | `{gun, bolgeler[{id, no, ad, element, acik, kilitNedeni?, yildiz:{alinan, toplam}, dugumler[{id, tur, konum, durum: kilitli·acik·tamam, yildiz, sartlar?, zorluk?, kademe?, kalanVurus?, nadir?: {kademe, kazilabilir}, odul?}]}], sayac:{haritaMac:{sayilan, tavan:10}, vurus:{bugun, tam:40, tavan:60}}}` |
| `POST /api/harita/sandik` | `{dugum}` | 200 `{altin, cevher, bakiye, harita}` · 404 `yok` · 409 `kilitli·acilmis` · 400 `tur` |
| `POST /api/maden/basla` | `{dugum}` | 201 `{seans, kademe, kalan, kapasite, nadir?:{sira, kademe, kazilabilir}, ustalik:{seviye, ilerleme, bant, basari}, halka:{periyotMs:1400, pencere:[bas, bit], fazMs}, vurus:{bugun, carpan}}` · 409 `kilitli·ustalik·bitti·gunlukTavan·acikSeans` |
| `POST /api/maden/kaz` | `{seans, sira, isabetMs: int \| null}` | 200 `{basari, isabet, kademe, verim, tecrube, ustalik:{seviye, ilerleme, atladi}, kalan, vurus:{bugun, carpan}, halka:{fazMs}, yeniBasarimlar[]}` · 429 `erken` (< 700 ms) · 409 `sira·bitti·gunlukTavan` · 404 `seans` |
| `POST /api/maden/bitir` | `{seans}` | 200 `{ozet:{cevher:{kademe:adet}, tecrube}}` (idempotent) |
| `GET /api/ocak` | — | `{cevher:[8], kulce:[8], ustalik, tarifler[{id, tur, kademe, girdi, altin, esik, durum: acik·ustalik·eksik·sahip·gizli, ustaIsiSansi}], gorunumler[], cilalar[]}` |
| `POST /api/ocak/erit` | `{kademe, parti: 1..20, ref}` | 200 `{sonuc:{kulce, curuf, geri}, cevher, kulce, ustalik, yeniBasarimlar}` · 409 `ustalik·yetersiz` · 200 aynı `ref` için önceki sonuç (idempotent) |
| `POST /api/ocak/dov` | `{tarif, ref, yeniden?: boolean}` | 201 `{cikti, usta, bakiye, kulce, ustalik, yeniBasarimlar}` · 402 `altin` · 409 `ustalik·eksik·sahip·bayrak` |
| `PATCH /api/parca/:id/cila` | `{cila: kimlik \| null}` | 200 · 403 `sahipDegil` (cila) · 404 · 400 `tur` (yalnız Gövde/Disk) |
| `POST /api/profil` | (mevcut) + `cerceve?` | 200 · 403 `sahipDegil` |
| `GET /api/ben` | — | (mevcut) + `harita:{acik}`, `ocakAcik`, `ustalik:{madencilik, isleme}`, `cerceve` |

**Zod taslağı (paylaşılan, `src/paylasilan/veri/harita.ts`):**
```ts
export const DugumKimlik = z.string().regex(/^b[1-9]-(0[1-9]|1[0-2])$/);
export const KazSema = z.object({ seans: z.string().uuid(), sira: z.number().int().min(0).max(7), isabetMs: z.number().int().min(0).max(5000).nullable() });
export const EritSema = z.object({ kademe: z.number().int().min(1).max(8), parti: z.number().int().min(1).max(20), ref: z.string().uuid() });
export const DovSema = z.object({ tarif: z.string().regex(/^[a-z0-9-]{3,40}$/), ref: z.string().uuid(), yeniden: z.boolean().optional() });
const Adet = z.object({ kademe: z.number().int().min(1).max(8), adet: z.number().int().min(1).max(50) });
export const DugumSema = z.discriminatedUnion("tur", [
  z.object({ id: DugumKimlik, tur: z.literal("dusman"), konum: z.tuple([z.number(), z.number()]), komsu: z.array(DugumKimlik),
    zorluk: z.number().int().min(1).max(5), botKip: z.enum(["kukla","dolas","kenar","dayaniklilik"]), botSeviye: z.number().int().min(1).max(3),
    takim: z.array(z.tuple([z.string(), z.string(), z.string(), z.string()])).length(3), yildiz: z.array(YildizSart).length(3),
    odul: z.object({ altinYildiz: z.number().int(), cevherYildiz: Adet, tekrar: z.object({ cevher: Adet }) }) }),
  /* patron: + ad, sonrakiBolge?, odul.altinIlk, odul.kulceIlk · maden: kademe, kapasite, nadir{kademe, olasilik} · sandik: odul{altin, cevher} */
]);
```
Veri testi (`test/harita-veri.test.ts`): her `komsu` var olan düğüm; her bölgede tek giriş (01) ve 11'den sonraki bölgeye kenar; graf döngüsüz; takımlarda 3 farklı Çekirdek ve katalogda var olan parçalar; her tarifin girdisi geçerli kademe; eşikler ≤ 100; kademe eşikleri artan.

## 5. Colyseus: harita maçı

| Değişiklik | Ayrıntı |
|---|---|
| `MOD` | `["oda", "hizli", "antrenman", "harita"]` |
| `KatilmaSema` | `+ dugum: DugumKimlik.optional()`; `mod === "harita"` ise zorunlu (`superRefine`) |
| `PROTOKOL_SURUMU` | **6 → 7** (mod enum'u ve katılma şeması değişti; eski istemci "sürüm" hatasıyla sayfayı yeniler) |
| `KATALOG_OZETI` | `harita.json` ve diğer maden JSON'ları **girmez** (sim'i etkilemez). Dövme parçalar `parcalar.json`'a eklendiğinde (bayrak açılırken) özet doğal olarak değişir |
| `MacOdasi` harita akışı | `onAuth`: bilet zorunlu (misafir yok). `onJoin`: sunucu `harita_dugum` durumunu okur; düğüm AÇIK ve DÜŞMAN/PATRON değilse 4110 `dugum`. Oda tek oyunculu: hızlı maçtaki bot yolu hemen (`botIste` beklemesi yok); `mac.bot = 1`, `mac.mod = "harita"`, `mac.dugum_id` |
| `MacKurulumu` (sunucu, sim dışı) | `+ botKipleri?: [BotKipi \| null, BotKipi \| null]`; varsa `botKipi(i)` tip eşlemesi yerine onu döndürür. Bot takımı `harita.json` `takim` → mevcut `takimKoduYaz` (üye `seviye = botSeviye`) |
| Maç sonu | `macSonuKaydet` dalı: mod `harita` → (a) `macAltini` yerine harita ödülü (01 § 4–5), (b) yıldız maskesi `harita.ts` `yildizlar(ozet, sartlar)`, (c) düğüm TAMAM + komşular AÇIK + patron → sonraki bölge, (d) `MacOzeti.mod = "harita"`, `dugumZorluk`, `haritaSayilan`, (e) Çekirdek XP hızlı maç tablosu (sayılansa), Yapay ömrü −1. Tek işlem, `mac.id` idempotent (mevcut) |
| Bilgi mesajı | `{tur:"odul", ...}` + `harita:{yildiz, yeniYildiz, altin, cevher, kulce, acilan:[dugum], bolgeAcildi?}` |

Sim'e giden tek şey zaten var olan girdiler: iki takım kodu, tohum, üye seviyeleri. **Sim kodu değişmez.**

## 6. Kazı seansı: sunucu algoritması

```
basla(oyuncu, dugum):
  düğüm AÇIK ve tur=maden? değilse 409 kilitli
  gun = gunAnahtari(simdi)
  toplam = maden_gunluk[gun,'*'].vurus;  toplam >= 60 → 409 gunlukTavan
  kalan = kapasite − maden_gunluk[gun,dugum].vurus;  0 → 409 bitti
  nadirSira = fnv64(SUNUCU_SIRRI, oyuncu, gun, dugum) → (olasilik altında mı? sira = h mod kapasite : yok)
  açık seans varsa kapat (tek seans)
  seans = {id: uuid, vurus_bas: simdi, faz_ms: randomInt(0,1400), sira: kapasite − kalan}

kaz(seans, sira, isabetMs):
  sira == seans.sira değilse 409 sira (çift gönderim/yarış)
  simdi − son_vurus < 700 → 429 erken
  U = seviye(ustalik.madencilik); K = (sira == nadirSira && U >= esik(nadirK)) ? nadirK : dugum.kademe
  K = min(K, surumKademeTavani)
  gecen = simdi − seans.vurus_bas
  isabet = isabetMs != null && |isabetMs − gecen| <= TOLERANS_MS && halkaIcinde(isabetMs + faz_ms)   // TOLERANS_MS = 150
  basari = randomInt(0, 10000) < basariSansi(U, esik(K)) * 10000
  carpan = toplam < 40 ? 1 : 0.5
  verim = basari ? max(1, floor((verim(K) + (isabet?1:0)) * carpan)) : 0
  tecrube_x100 = round((basari?10:5) * bant(U − esik(K)) * carpan * 100)
  TEK İŞLEM: cevher[K] += verim; ustalik += tecrube; maden_gunluk(gun,dugum).vurus++, ('*').vurus++,
             seri = isabet ? seri+1 : 0; maden_vurus satırı; başarım olayları (cevherKazildi, nadirDamar, isabetSerisi,
             cevherCesidi, ustalikSeviye); seans.sira++, vurus_bas = simdi, faz_ms = randomInt(0,1400)
```
**Tolerans:** ilk sürümde sabit **±150 ms** (`ustalik.json` `isabet.toleransMs`). REST'te sunucunun güvenilir bir RTT ölçümü yok; istemci zaman damgasına güvenilmez. H-H6 ölçümü gerçek isabetlerin %95'inden azını kabul ederse tolerans en çok 250 ms'ye genişletilir (99 S-9). Gecikme yalnız +1 bonusu etkiler, cezası yoktur.

## 7. Veri dosyaları (H1'de `veri/`'ye)

| Dosya | Şema (özet) | Örnek içerik |
|---|---|---|
| `veri/madenler.json` | `{surum, kademeler[{kademe, id, ad, loreAd, element\|null, esik, verim, nadirlik, renk{ana, koyu}, aciklama, ilkSurum}]}` | [`veri-taslak/madenler.json`](veri-taslak/madenler.json) (8 kademe) |
| `veri/ustalik.json` | `{surum, turler[], seviyeTavan, kumulatif[101], ogrenmeBandi[], basari{taban, egim, tavan}, madencilik{xpBasari, xpBasarisiz}, isleme{xpEritme, xpDovme{}}, gunluk{vurusTam, vurusYarim, haritaMaciSayilan}, isabet{periyotMs, pencereOran, toleransMs, verimEk}}` | [`veri-taslak/ustalik.json`](veri-taslak/ustalik.json) |
| `veri/tarifler.json` | `{surum, eritme{oranTaban, oranUsta, ustaFarki, basarisizKayip}, ustaIsi{}, yenidenDov{}, tarifler[{id, tur: arma·cerceve·cila·parca, kademe, girdi[{kademe, kulce}], altin, esik, cikti{gorunum\|cila\|parca}, ilkSurum, bayrak?}]}` | [`veri-taslak/tarifler.json`](veri-taslak/tarifler.json) (29 tarif) |
| `veri/harita.json` | `{surum, gun, bolgeler[{id, no, ad, element, ilkSurum, dugumler[Dugum]}]}` | [`veri-taslak/harita.json`](veri-taslak/harita.json) (6 bölge × 12 düğüm) |
| `veri/basarimlar.json` | mevcut + 23 başarım + isteğe bağlı `haritaZorlukMin` alanı | [`veri-taslak/basarimlar-harita.json`](veri-taslak/basarimlar-harita.json), 05 § 3 tablosu |
| `veri/parcalar.json` | `KatmanSema` + `"dovme"`; 3 dövme parça (bayrak kapalıyken katalogda değil: ayrı dosya `veri/parcalar-dovme.json`, bayrak açılınca birleştirilir) | 03 § 4.3 |
| `veri/ipuclari.json` | 9 yeni ipucu (07 § 4, § 10) | |
| tuning.md | § 22 "Harita, maden, işleme" (özet tablo + bu klasöre bağlantı) | |

**Bayrak** `dovmeParcalari`: sunucu ortam/yapılandırma bayrağı değil, `tarifler.json` + `parcalar-dovme.json` ikilisi; bayrak açılırken dövme parçalar `parcalar.json`'a taşınır (katalog özeti değişir, protokol aynı). Böylece bayrak kapalıyken eski istemci/sunucu katalog uyumu bozulmaz.

## 8. Anti-hile özeti
02 § 7 (A1–A8) + Ocak: istekler `ref` ile idempotent; Altın ve külçe düşümü tek işlemde (`BEGIN IMMEDIATE`); CHECK kısıtları eksiye düşmeyi engeller; harita maçı düğüm uygunluğu sunucuda; yıldız maç özetinden (istemci yıldız bildirmez); sandık tek seferlik `ref = sandik:<oyuncu>:<dugum>`; harita Altını `altin_defteri` referansı `harita:<mac_id>:<oyuncu>`, yıldız `yildiz:<oyuncu>:<dugum>:<bit>`.

## 9. Test planı

| Katman | Test | Dosya |
|---|---|---|
| Birim (saf) | `seviye`/`bant`/`basariSansi` sınırları; vuruş sonucu tablosu; günlük çarpan geçişleri (40/41, 60/61); isabet doğrulama (±150, faz, pencere); eritme oranı 4:1 → 3:1 geçişi; Usta işi formülü; yıldız değerlendirme (7 şart × kazan/kaybet); kilit türetme | `test/harita.test.ts`, `test/maden.test.ts`, `test/ocak.test.ts` |
| Veri | § 4 veri testi; tarif eşikleri ≤ 100; JSON ↔ belge tablo eşleşmesi (kademe sayısı 8, eşikler) | `test/harita-veri.test.ts` |
| G-0 | Lint: `src/paylasilan/sim/**` → `kurallar/{harita,maden,ustalik,ocak}`, `veri/harita` içe aktaramaz (mevcut `lint-kapisi.test.ts`'e satır); cilalı/cilasız aynı `topacParametreleri`; altın hash'ler aynı | `test/lint-kapisi.test.ts`, `test/harita-guc.test.ts` |
| API | Uç sözleşmeleri, hata kodları, idempotentlik (`ref`, `mac.id`), günlük tavan, 700 ms, tek seans, hesap silme yeni tabloları temizler | `test/harita-api.test.ts` |
| Oda | `mod:"harita"` katılma (bilet, düğüm uygunluğu, protokol 7), bot kipi/takım kurulumu, maç sonu yıldız + ödül + kilit, 10 sayılan maç | `test/harita-oda.test.ts` |
| Uçtan uca | `araclar/h-akis.ts` (d7-akis deseni): kayıt → eğitim → harita → maç (bot) → kazı → erit → döv → profil arması; ekran görüntüleri `docs/production/raporlar/ekran/H*.png` | `npm run h:akis` |
| Bot sim | H-H4 düğüm zorlukları, H-H5 dövme parçalar (`test/denge/botTurnuvasi.ts` + harita kipleri) | `npm run denge:turnuva` |
| Ekonomi | `araclar/harita-ekonomi-simulasyonu.ts` veri `veri/`'ye taşınınca oradan okur; sonuç tabloları 06 ile karşılaştırılır | elle |
| Mobil | `araclar/mobil-denetim.cjs`'ye Harita, Maden, Ocak ekranları (44 px hedef, yatay sığma) | `npm run mobil:denetim` |

## 10. Geri uyumluluk
- Eski hesaplar: göç 5 tabloları boş başlar; ilk `GET /api/harita` çağrısında `b1-01` AÇIK satırı yazılır (İlk Devir'i olanlar için).
- Eski istemci: protokol 7 ile harita moduna giremez; REST uçları yeni (eski istemci çağırmaz).
- `basarimlar.json` 46 → 69: mevcut ilerlemeler etkilenmez; yeni durum başarımları ilk değerlendirmede geriye dönük tamamlanabilir (ör. zaten Lv.3 Çekirdek → etkilenmez; Ustalık sıfırdan başlar).
- Sezon 2 bölgeleri `ilkSurum:false` → sunucu `ilkSurum` filtreler; açıldığında Bölge 3 patronunu yenmiş oyuncuya b4-01 AÇIK yazılır (geriye dönük kilit açma işlemi, göç 6 ya da açılışta).
