# Devran backend: kimlik, oturum, oda bileti, SQLite, API

**Tarih:** 2026-11-04 (D5; D6 Atölye eki; D7 ekonomi eki § 8) · **Şapka:** `@vault` · Kod: `src/sunucu/` · Testler: `test/kimlik.test.ts`, `test/db.test.ts`, `test/api.test.ts`.
Bağlı: axiom § 2 #19 (şema), #22 (kimlik), #24 (silme ucu D8); `netcode.md` (oda); tuning § 14, § 17 (XP, Yapay ömrü).

> **Sahip kararı (2026-11-04):** Kick OAuth en sona bırakıldı (D8 sonrası ayrı dilim). D5'te kimlik **oyuncu adı + şifre**.
> Oturum çerezi ve `/api/bilet` → `onAuth` akışı Kick gelince aynen kalır; yalnız "kimlik kanıtı" değişir.

## 1. Katmanlar

| Dosya | Ne |
|---|---|
| `src/sunucu/index.ts` | `defineServer`: açılışta `kimlikAyarlariniDenetle()` (eksik ortamda açık hata), `depo()` (göçler), REST uçları, `mac` odası |
| `src/sunucu/kimlik.ts` | scrypt şifre, HMAC imza, oturum çerezi, oda bileti (60 s, tek kullanımlık), Origin, kaba kuvvet sınırı |
| `src/sunucu/api/rotalar.ts` | REST uçları (Express 5, Colyseus `express` kancası), `zod` girdi doğrulama, `/api/ben` görünümü |
| `src/sunucu/oyuncu/kurallar.ts` | Saf kurallar: ad biçimi + küfür filtresi (`veri/yasak-sozcukler.json`), şifre uzunluğu, takım kuralı, ödünç doldurma |
| `src/sunucu/oyuncu/macSonu.ts` | Maç sonu: `mac` satırı + Çekirdek XP + Yapay ömrü (tek işlem, maç kimliğiyle idempotent) |
| `src/sunucu/db/sema.ts`, `depo.ts` | Göçler (`PRAGMA user_version`) ve veri erişimi. **better-sqlite3 yalnız burada** (eslint yalıtımı) |
| `src/paylasilan/kurallar/ilerleme.ts` | XP/seviye/ömür sayıları ve saf hesap (istemci gösterir, sunucu yazar) |
| `src/paylasilan/veri/takimlar.ts` | Kayıtlı takım kodu `cekirdek:govde:disk:uc:seviye:odunc:yon` × 3 (`|`) |
| `src/sunucu/api/ortak.ts` | D6: REST ortak yardımcılar (gövde, Origin, oturum, `yazimGirisi`) |
| `src/sunucu/api/atolye.ts` | D6: Atölye uçları (envanter/takım/ad/yön/aktif takım + geliştirme uçları) |
| `src/sunucu/oyuncu/takim.ts` | D6: kayıtlı takımın sunucu görünümü (ödünç kotası, oynanabilirlik, maç kodu) — `/api/ben`, `/api/atolye`, MacOdasi tek yol |
| `src/sunucu/oyuncu/defter.ts` | D6: maç içi en uzun dönüş sayacı (Çekirdek Günlüğü) |
| `src/paylasilan/kurallar/atolye.ts` | D6: saf takım kuralı (`takimDegerlendir`), parça takma/çakışma, envanter görünürlüğü |
| `src/paylasilan/veri/cubuklar.ts` | D6: 6 Atölye çubuğu (tide C-1), katalog aralığına göre 0-100 |
| `src/paylasilan/kurallar/ekonomi.ts` | D7: Altın kuralları (tuning § 15), gün 04:00, azalan getiri, stil, yenileme fiyatı, günün parçası (saf) |
| `src/paylasilan/kurallar/market.ts` | D7: 4 raf + tezgâh, kilit durumu (Açık / Kilitli-görünür / Gizli), satın alma kuralı, B-9 Kül geçersiz kılma |
| `src/paylasilan/kurallar/basarim.ts` | D7: `basarimIsle(girdi, mevcut)` (46 başarım, olay sözlüğü + koşul anahtarları, kapılar), şart metni |
| `src/paylasilan/kurallar/kuyruk.ts` | D7: hızlı maç zamanlamaları (20/30/60 sn), Elo penceresi |
| `src/sunucu/oyuncu/ozetSayaci.ts` | D7: sim olaylarından maç özeti (bitiş nedeni, kriz, kuşak, çarpışma, geri puan) |
| `src/sunucu/oyuncu/basarimYaz.ts` | D7: başarım yazımı + ödül defteri, tamamlananlar, takım tavanı |
| `src/sunucu/api/market.ts` | D7: Market / Başarımlar / defter uçları, `satinAl`, `yapayYenile` (tek işlem) |

## 2. Kimlik

- **Kayıt** `POST /api/kayit {ad, sifre, sifreTekrar}`: ad `adTemizle` (NFC, kırp, iç boşluk tek), 3–16 karakter, desen
  `^[\p{L}\p{N}][\p{L}\p{N} _.-]*$`, filtre; şifre 8–128 ve tekrarla eşit; tekillik `ad_anahtar` = Türkçe küçük harf
  (`toLocaleLowerCase("tr-TR")`: "IŞIK" = "ışık", "İNCİ" = "inci"; SQLite NOCASE yalnız ASCII olduğu için ayrı sütun, UNIQUE).
- **Şifre:** `scrypt` (N = 2^15, r = 8, p = 1, 64 bayt) + 16 bayt rastgele tuz; tek alan `sifre_hash = scrypt$N$r$p$tuz$hash`
  (base64url). Düz şifre hiçbir yerde saklanmaz ve günlüğe yazılmaz (yalnız `[kimlik] kayıt: oyuncu <id>`). Karşılaştırma
  `timingSafeEqual`; bilinmeyen adda sahte hash doğrulanır (süre farkı ad sızdırmasın).
- **Giriş** `POST /api/giris {ad, sifre}` → 200 / 401 `yanlis` (ad mı şifre mi ayırt edilmez) / 429 `cok`.
- **Kaba kuvvet:** `(ip + ad_anahtar)` başına 60 sn'de 10 deneme (doğru şifre de sayılır); kayıt `ip` başına aynı sınır.
  IP: soket adresi; `GUVENILIR_VEKIL=1` ise `cf-connecting-ip` (Cloudflare Tunnel). Süreç belleğinde (tek VPS süreci).
- **Oturum çerezi:** `devran_oturum=<oturumId>.<HMAC-SHA256("oturum:"+id)>`; `HttpOnly; SameSite=Lax; Path=/; Max-Age=30 gün`,
  üretimde `Secure`. Oturum satırı `oturum(id, oyuncu_id, bitis)`; `/api/cikis` satırı siler ve çerezi boşaltır. İmza anahtarı
  `OTURUM_SIRRI` (≥ 32 karakter; üretimde zorunlu, geliştirmede süreç başına rastgele).
- **Oda bileti:** `POST /api/bilet` (oturum + Origin) → `base64url({o: oyuncuId, n: nonce, s: bitiş}).HMAC("bilet:"+gövde)`, 60 s.
  `MacOdasi.onAuth` imza → süre → **tek kullanım** (nonce defteri, süresi geçenler silinir) sırasıyla doğrular; hata kodu 4103
  `kimlik:<neden>`. Aynı hesap aynı odaya ikinci koltuğa oturamaz (4107). Yeniden bağlanma Colyseus belirteciyle (bilet gerekmez).
- **Misafir:** bilet yoksa yalnız `mod: "antrenman"` odası kabul edilir (tide O-1 b); Antrenman eğitimi zaten istemcide koşar.
- **Origin:** REST yazımları (`POST`) ve WS katılımı `IZINLI_KOKENLER` listesinden; geliştirmede localhost/127.0.0.1 ve
  Origin'siz (Node test istemcisi). Üretimde liste zorunlu, Origin'siz istek reddedilir. Çerez `SameSite=Lax` ek katman.

## 3. API uçları

| Uç | Yetki | Girdi | Çıktı |
|---|---|---|---|
| `GET /api/saglik` | — | — | `{ok, protokol, katalog, kimlik, odalar}` |
| `GET /api/ben` | çerez | — | `{girisli:false, protokol, katalog}` ya da `{girisli:true, oyuncu, cekirdekler, takimlar, basarimlar, marketAcik}` |
| `GET /api/ad-uygun?ad=` | — | ad | `{uygun}` / `{uygun:false, hata: uzunluk·karakter·uygunsuz·alinmis}` |
| `POST /api/kayit` | Origin | `{ad, sifre, sifreTekrar}` | 201 + çerez / 400 `uzunluk·karakter·uygunsuz·sifreKisa·sifreUzun·eslesmiyor` / 409 `alinmis` / 429 |
| `POST /api/giris` | Origin | `{ad, sifre}` | 200 + çerez / 401 `yanlis` / 429 `cok` |
| `POST /api/cikis` | Origin | — | 200, oturum silinir |
| `POST /api/profil` | çerez + Origin | `{arma: element, renk: 6 renkten, destekKanali?}` | 200 |
| `POST /api/ilk-cekirdek` | çerez + Origin | `{set: goktasi·maden·yapay}` | 201 / 409 `var` (tek sefer) |
| `POST /api/egitim-bitti` | çerez + Origin | — | `{yeni}`: "İlk Devir" başarımı (idempotent) |
| `POST /api/bilet` | çerez + Origin | — | `{bilet, sn: 60}` |
| `GET /api/oda/:kod` | — | — | `{durum: acik·dolu·suresiDoldu·yok}` |

**D6 Atölye uçları** (`src/sunucu/api/atolye.ts`; hepsi çerez, yazımlar + Origin; istemci yalnız örnek kimliği gönderir):

| Uç | Girdi | Çıktı / hata |
|---|---|---|
| `GET /api/atolye` | — | `{oyuncu (+adKalanGun), aktifTakim, cekirdekler (+defter, ciftYon, devreDisi), parcalar, takimlar (yuvalar = örnek kimlikleri, degerlendirme, oynanabilir, uyeler, cubuklar sunucuda), basarimIlerleme, takimTavani, gelistirme}` |
| `PUT /api/takim/:sira` | `{ad?, yuvalar: [{cekirdek, govde, disk, uc} kimlik\|null] × 3}` | 200 `{atolye}` · 400 `sahipDegil·yanlisTur·ayniCekirdek·parcaTekrar·parcaEksik·cekirdekYok` (+ `yuva`, `tur`) · 404 `yok` · 400 `sira` |
| `POST /api/takim` | `{ad?}` | 201 `{takimNo, atolye}` (yuvalar boş) · 409 `dolu` (3 takım) |
| `PATCH /api/takim/:sira` | `{ad}` (1-20, filtre) | 200 · 400 `ad-uzunluk·ad-karakter·ad-uygunsuz` |
| `PATCH /api/aktif-takim` | `{takimNo}` | 200 (maça girişte varsayılan takım) · 404 |
| `PATCH /api/cekirdek/:id` | `{yon: sag·sol}` | 200 · 400 `yonSabit` (yalnız çift yönlü Yapay) · 404 |
| `PATCH /api/ad` | `{ad}` | 200 · 400 `uzunluk·karakter·uygunsuz·ayni` · 409 `sure` (+`kalanGun`) · 409 `alinmis` |
| `POST /api/profil` | (D5, düzenlemede de) arma/renk/destek | 200 |
| `POST /api/gelistirme/parca-ver` | `{tanim}` | 201 (Çekirdek → Lv.1 satırı) — **yalnız NODE_ENV≠production ve geri döngü adresi**, yoksa 404 |
| `POST /api/gelistirme/xp-ver` | `{cekirdekId, xp ±5000}` | 200 `{seviye, tecrube}` — aynı kapı |

Takım kuralı (paylaşılan `takimDegerlendir`, istemci aynısını anında gösterir): yuva ya tamamen boş ya da Çekirdek + Gövde +
Disk + Uç; sahiplik; tür/yuva; 3 farklı Çekirdek (örnek ve tanım); bir parça takımda tek topaçta. **Ödünç kotası** =
3 − kullanılabilir Çekirdek sayısı: boş yuvalar kota kadar ödünçle dolar, aşan boş yuva takımı oynanamaz yapar (ux § 7
"Takımda 3 farklı Çekirdek olmalı. N yuva boş."). Ömrü biten Yapay yuvası kota dışı ödünçle dolar (B-27). Ad değişimi:
kayıttan sonraki ilk değişim serbest, sonra `ad_degisti`'den 30 gün. İstemci hiçbir sayaç, Altın ya da XP göndermez. Gövde ≤ 16 KB, `zod` ile doğrulanır; hatalı gövde 400 `bicim`.

## 4. SQLite şeması (göç 1)

`VERI_DIZINI/devran.sqlite` (geliştirmede `./.veri/`, gitignore). WAL, `foreign_keys = ON`. Axiom § 2 #19'dan farklar (SAPMA,
sahip kararı): birincil anahtar `oyuncu.id` (otomatik artan) + `kick_id TEXT UNIQUE NULL` (ileride bağlanır); diğer tablolar
`oyuncu_id`; `takim` satırı **bir yuva**dır (`takim_no`, `sira 0-2`), boş yuva = ödünç (`odunc = 1`).

```
oyuncu(id PK, kick_id UNIQUE NULL, ad, ad_anahtar UNIQUE, sifre_hash, ad_degisti, arma, renk, destek_kanali, elo=1000, olusturma)
oturum(id PK, oyuncu_id → oyuncu, bitis)
cekirdek(id PK, oyuncu_id, tanim_id, seviye, tecrube, kararma=0, omur NULL|kalan maç, yon)
parca(id PK, oyuncu_id, tanim_id, edinme)
takim(id PK, oyuncu_id, takim_no, ad, sira, cekirdek_id NULL, govde_id NULL, disk_id NULL, uc_id NULL, odunc,
      UNIQUE(oyuncu_id, takim_no, sira)); UNIQUE(takim_no, cekirdek_id|govde_id|disk_id|uc_id) dolu yuvalarda
altin_defteri(id PK, oyuncu_id, miktar, neden, ref UNIQUE)          -- D7
basarim(oyuncu_id, basarim_id, ilerleme, tamam, PK(oyuncu_id, basarim_id))   -- D5: yalnız ilk-devir
mac(id PK uuid, mod, a, b, kazanan (oyuncu id), puan "3-1", sure sn, bitis_nedeni, katalog_ozeti, baslangic ms, takim_a, takim_b)
cekirdek_xp(mac_id → mac, cekirdek_id, kazanc, PK(mac_id, cekirdek_id))   -- XP günlüğü (idempotentlik)
```

**Göç 2 (D6):** `cekirdek` + `mac_sayisi`, `galibiyet`, `kriz_galibiyet`, `en_uzun_donus_sn`, `edinme`; `oyuncu` +
`aktif_takim`, `ad_degisim` (hepsi `DEFAULT 0`, `ALTER TABLE ADD COLUMN`; D5 veritabanı açılışta yerinde göç eder).
Defter maç sonunda `macYaz` işleminde (aynı `mac.id` ikinci kez yazılmaz): sayılan maçta +1, galibiyet, krizden galibiyet,
`MAX(en_uzun_donus_sn)` (sahada kesintisiz süre, `DonusSayaci`), Kararma (oyuncu başı sim sayacı takımdaki Karanlık
Çekirdeklere). Rövanşta oda takımları SQLite'tan tazelenir (seviye atlayan Çekirdek yeni yuva kapısıyla girer).

Doldurulan (D5): `oyuncu`, `oturum`, `cekirdek`, `parca`, `takim`, `basarim` (ilk-devir), `mac`, `cekirdek_xp`. `altin_defteri` D7.

**Göç 3 (D7):** `altin_defteri` + `zaman` (+ indeks `altin_oyuncu`); `basarim` + `tamam_tarihi`; yeni tablo
`basarim_kume(oyuncu_id, basarim_id, anahtar, PK üçü)` (farklı Çekirdek / element / rakip / alan yeteneği küme sayaçları);
`mac` + `gun` (04:00 gün anahtarı, indeks), `bitis` (ms), `bot`, `bitis_turleri` (JSON tur sonuçları), `yetenek_a/b`
(JSON kademe 1-3 sayısı), `altin_a/b` (B-40 telemetri). Bakiye = `SUM(altin_defteri.miktar)`; ayrı bakiye sütunu yok.

## 5. Takım, ödünç topaç, maç sonu

- **İlk Çekirdek:** başlangıç seti → `cekirdek` (Lv.2, 150 XP; Yapay `omur = 30`) + Gövde/Disk/Uç `parca` + `takim_no 0`:
  yuva 0 sahip olunan, yuva 1-2 ödünç.
- **Ödünç (nile B-10):** `oduncDoldur` boş (ya da ömrü bitmiş) yuvaları takımda olmayan başlangıç setleriyle Lv.1 doldurur;
  ödünç XP ve başarım almaz. Kural: takımda 3 farklı Çekirdek (`takimEksigi`).
- **Odada:** `onAuth` oyuncunun takımlarını okur → `takimId` = takım kodu (şemada; istemci profilleri bundan kurar),
  `takimNo` = kayıtlı numara. Seçim fazında istemci yalnız **numara** yollar (`takimSec`), sunucu kendi listesinden kodu yazar.
  Süre dolunca son seçilen (katılmada istemcinin hatırladığı) takım (B-21). Sim'de üye seviyesi: sahaya giren üyenin seviyesi
  oyuncu seviyesidir (`TakimUyesi.seviye`, yuva kapıları; hash'e `d.seviye` girer, mevcut altın hash'ler değişmez).
- **Maç sonu (`macSonuIsle`, antrenman hariç):** sonuç türü galibiyet / mağlubiyet / terk (teslim ya da hükmen kaybeden) /
  iptal; takımdaki her sahip olunan Çekirdeğe `macXp` (40/25/0, kriz +30 = maçta sahadaki topaç stamina < %25 gördü ve kazandı,
  temiz +20 = kalan takım stamina oranı ≥ %50 ve kazandı; Yapay ×1,5; oda ×0,5; yuvarlama sonda), seviye eşikleri 150/700
  (Lv.3 tavan), Yapay ömrü −1 (iptal sayılmaz). Hepsi tek işlemde; `mac.id` aynıysa hiçbir şey yazılmaz. Her oyuncuya `bilgi`
  `{tur:"odul", cekirdekler:[...]}` (sonuç ekranı "Çekirdek kartı").

## 6. Kick OAuth (ileride)

Uçlar mimari § 4'te (`https://id.kick.com/oauth/authorize`, `/oauth/token`, `https://api.kick.com/public/v1/users`, kapsam
`user:read`, PKCE S256) — **doğrulanmadı**, Kick geliştirici belgesine göre güncellenmeli. Gelince: `/api/kick/giris` (state +
code_verifier sunucu belleğinde, 10 dk), `/api/kick/geri-donus` → `oyuncu.kick_id` bağla ya da yeni oyuncu; çerez/bilet aynı.
Sahip işi: Kick App kaydı (2FA şart), redirect URI (alan adı), `KICK_CLIENT_ID/SECRET/REDIRECT_URI`; systemd `IPAddressDeny=any`
dış çıkışı da keser, Kick token ucu için gevşetilmeli.

## 7. Ortam değişkenleri

`KIMLIK_MODU` (`sifre`, varsayılan) · `OTURUM_SIRRI` (üretimde zorunlu, ≥ 32) · `IZINLI_KOKENLER` (üretimde zorunlu) ·
`VERI_DIZINI` (üretimde zorunlu) · `GUVENILIR_VEKIL=1` (Tunnel arkasında). Eksikse sunucu açılmaz:
`[devran] Sunucu başlatılamadı, ortam eksik/yanlış: OTURUM_SIRRI (≥ 32 karakter); IZINLI_KOKENLER; VERI_DIZINI`.


## 8. D7 ekonomi: Altın defteri, başarımlar, Market, hızlı maç

**Defter referansları (UNIQUE, idempotent):** `mac:<mac_id>:<oyuncu>` (maç Altını, yalnız maç sonunda sunucu) ·
`basarim:<başarım>:<oyuncu>` (ödül bir kez) · `satin:<oyuncu>:<parça>` (−fiyat; aynı parça ikinci kez alınamaz) ·
`yenile:<oyuncu>:<çekirdek>:<mac_sayisi>` (−fiyat; aynı ömür döneminde bir kez) · `gelistirme:<uuid>` (yalnız yerel).

**Maç sonu (`macSonuKaydet`, TEK işlem, BEGIN IMMEDIATE):** günlük sayaçlar bu maçtan önce `mac` tablosundan okunur
(oyuncunun bugünkü iptal dışı maçları → azalan getiri numarası; bugünkü galibiyeti → günün ilk galibiyeti; aynı iki
hesap → çift sayısı) → `mac` satırı + telemetri → Çekirdek XP/defter (D5/D6) → `macAltini` → defter → başarım
(`basarimIsle`: maç özeti + kalıcı durum) → tamamlanan başarımın Altını. Aynı `mac_id` ikinci kez hiçbir şey yazmaz.
Gün: Türkiye saati 04:00 (UTC 01:00), sunucu duvar saatinden (`Date.now()`; testlerde enjekte), sim dışı.

**Kapılar:** misafir / Antrenman Altın ve başarım yok · oda ×0,25, başarımda yalnız Sosyal · bot (hızlı kuyruk dolgusu)
×0,5, yalnız Yol · teslim/hükmen: teslim eden 0; kazanan yarım Altın, stil yok, başarım sayacı işlemez (tide G-17) ·
iptal sayılmaz · maç < 20 sn Altın 0 · aynı çift günde 3'ten sonra Altın ve başarım yok · durum başarımları (Çekirdek
Lv.3, Yapay ömrü bitti, parça sayısı) moddan bağımsız. İstemci hiçbir sayaç/Altın göndermez.

**Uçlar (`src/sunucu/api/market.ts`; hepsi çerez, yazımlar + Origin):**

| Uç | Girdi | Çıktı / hata |
|---|---|---|
| `GET /api/market` | — | `{acik, bakiye, gun, gununParcasi, raflar[4]{tur, ad, tezgah, urunler[]}, yenileme[], referans}`; gizli ürünün kimliği/adı/fiyatı gitmez |
| `POST /api/market/satin-al` | `{parca}` | 201 `{fiyat, bakiye, tur, id, market}` · 402 `yetersiz` (+`eksik`) · 403 `kilitli·marketKapali` · 409 `sahip` · 404 `yok` |
| `POST /api/market/yenile` | `{cekirdekId}` | 200 `{omur:30, fiyat, bakiye, market}` · 402 `yetersiz` · 409 `tam·yapayDegil` · 404 |
| `GET /api/basarimlar` | — | 46 başarım `{id, kategori, gorunur, ad, aciklama, sayi, ilerleme, tamam, tamamTarihi, odulAltin, zorluk, acilanParcalar}`; gizli + tamamlanmamış "???" |
| `GET /api/defter` | — | `{bakiye, satirlar[50]}` |
| `POST /api/egitim-bitti` | — | (D7) İlk Devir başarım yolundan: `{yeni, altin: 100 ilk seferde, bakiye}` |
| `GET /api/ben`, `/api/atolye` | — | (D7) + `altin`; Atölye + `tamamlanan`, `yenileme[]`, `takimTavani` (Üçlü → 4) |
| `POST /api/gelistirme/altin-ver`, `/basarim` | `{miktar}` · `{basarim, ilerleme}` | yalnız NODE_ENV≠production + geri döngü (uçtan uca ekran görüntüsü) |

**Hızlı maç:** `mod:"hizli"` odası `joinOrCreate`; bekleme 60 sn; `botIste` 30-60 sn arası sunucu saatiyle kabul (bot
takımı üç başlangıç seti Lv.2, `oyuncular[1] = null`, `mac.bot = 1`). Seçimde `aktif_takim` varsayılan (D6).
