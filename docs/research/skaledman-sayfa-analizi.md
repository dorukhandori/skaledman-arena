# skaledman.com sayfa analizi — arenaya veri sağlayan platformun dışarıdan görünen her şeyi

`[@vault · Backend Engineer]` · Tarih: 2026-11-01 · Durum: araştırma çıktısı, karar değil. Kaynak kod elimizde yok; bu belge yalnızca sayfanın kendisinden, gömülü JS/CSS'ten ve herkese açık JSON uçlarından çıkarılanları toplar. "Çıkarım" diye işaretlenen her cümle doğrulanmamış yorumdur.

## Kaynaklar

| Kaynak | Ne | Boyut / not |
|---|---|---|
| `index.html` (indirildi 2026-11-01 16:43) | 1 351 satır, 273 KB; satır 1–12 `<head>`, 13–456 gömülü CSS, 457 tek satırlık `window.ILK = {...}` (178 KB), 459–573 HTML gövdesi, 574–1349 uygulama JS'i (~46 KB) | Harici JS yok, framework yok, sade DOM API |
| `/api/history` → `history.json` | 226 kayıt, 115 540 B | `window.ILK.history` ile bayt bayt aynı |
| `/api/kartlar` → `kartlar.json` | 226 anahtar, 63 870 B | `window.ILK.cards` ile aynı |
| `/api/detay?id=251.443` → `detay.json` | 7 891 B | tam Pokédex kaydı |
| `/api/kanal` | `{"channel":"swaggybark","url":"https://kick.com/swaggybark"}` | `window.ILK.channel` ile aynı |
| 6 ek HTTP isteği (2026-11-01 15:06 UTC, UA `SkaledmanArena-arastirma/0.1`) | `/robots.txt`, `/sitemap.xml`, `/api/kartlar?limit=1`, `/api/detay?id=999.999`, `/api/history`, `/api/yok` | yalnızca GET; yazma denemesi yapılmadı |
| 12 fusion sprite PNG'si + `base.png` | hepsi 288×288, 8 bit, RGBA ya da paletli, 1,3–8 KB | `sprites.infinite-fusion.net/custom/…` |

Bu belgedeki satır numaraları `index.html`'e aittir.

## 1. Sayfa iskeleti ve bileşenler

Tek sayfa, `lang="tr"`, başlık "Fusion koleksiyonu" (JS kanal adıyla "swaggybark fusion koleksiyonu" yapar, s. 1265). Google Fonts'tan Jersey 10, Jersey 15, Jost (500/600/700), Nunito Sans (400–800) yüklenir (s. 12); `theme-color #070a1c`; favicon `/logo.png`. Sayfanın diğer statik dosyaları: `/logo.png` (kart set simgesi olarak da kullanılır, s. 763) ve `/egitmen.jpg` (eğitmen portresi, s. 517).

| Bölüm | id / sınıf | Satır | İçerik |
|---|---|---|---|
| Üst çubuk | `header.top` | 460–471 | marka (logo + kanal adı + "fusion koleksiyonu"), "Kick'te izle" bağlantısı (`/api/kanal`'dan `url`, başta `hidden`) |
| Sahne | `section.hero` | 474–485 | `canvas#route` (piksel piksel çizilen gece rotası, s. 844–964), son açılan kart (`#heroIn`), konuşma kutusu `#say` ("Sıradaki fusion'ı sen aç! …", harf harf yazılır, s. 971–987) |
| Albüm | `section#koleksiyon` | 488–517 | arama (`#q`), Tümü/Shiny (`#fAll/#fShiny`), sıralama (En yeni/En eski/A'dan Z'ye), tip çubuğu `#typesBar`, sonuç satırı `#resinfo`, kart ızgarası `#grid`, "N kart daha göster" `#moreBox` |
| Eğitmen kartı + koleksiyoncular | `section#egitmen` | 520–545 | eğitmen kartı (`#trRows`, 18 tip rozeti `#badges`), koleksiyoncular listesi `ol#lb` |
| Alt yazı | `footer.love` | 547–550 | "Dayı'ya, emeğine ve kurduğu bu güzel sohbete." |
| Kart ayrıntısı | `dialog#dlg` | 553–572 | solda kart + baş/gövde ebeveynler + "Açan/Tarih/Kart no." + "Bağlantıyı kopyala"; sağda Pokédex alıntısı ve Genel / İstatistikler / Hareketler sekmeleri |
| Bildirim | `div.toast` | 573 | "Bağlantı kopyalandı" vb. |

HTML'de yorum, yazar, lisans, GitHub, Discord ya da e-posta izi **yok**. Gizli görünen değer (anahtar/token) sayfada **yok**.

## 2. JavaScript: veri akışı, sabitler, akışlar

### 2.1 Başlangıç verisi ve yenileme

- Sunucu ilk veriyi `window.ILK = {history, cards, channel}` olarak sayfaya gömer (s. 457). JS önce bunu uygular (s. 1339–1345); `ILK` yoksa `/api/kanal`'ı çeker.
- `load()` (s. 1324): `/api/history` → `applyHistory`. İmza `uzunluk:sonKaydınId`si (s. 1317); değişmediyse hiçbir şey yeniden çizilmez. Değiştiyse `render()` ve `loadCards()`.
- **Polling: `setInterval(load, 15000)`** (s. 1348). EventSource, WebSocket, Service Worker yok.
- `loadCards()` (s. 1277–1286): `/api/kartlar`; imza `JSON uzunluğu:anahtar sayısı`. Geçmişte kartı olmayan fusion varsa (`cardsMissing`, s. 1276) **4 sn arayla en çok 40 kez** yeniden dener. Yorum (s. 1273): "sunucu eksikleri arka planda tamamlar" → çıkarım: kart üretimi (`stats/ability/attacks`) ödülden sonra asenkron tamamlanıyor.
- "35 dakika önce" metni `ago()` ile (`Intl.RelativeTimeFormat('tr')`, s. 607) yalnızca `render()` sırasında üretilir; geçmiş değişmedikçe **güncellenmez** (sayfa yenilenene ya da yeni kart gelene kadar eski kalır).
- Kart ayrıntısı: `getDetail(fusionId)` (s. 1099) → `/api/detay?id=…`, bellek içi `Map` önbelleği; `r.ok` değilse ya da yanıtta `missing` varsa önbellekten silinir. Hata metni: "Ayrıntılar şu an alınamadı. Birkaç saniye sonra kartı yeniden aç." (s. 1145).
- **Yerel depolama yok** (`localStorage`/`sessionStorage`/çerez okuması aranmadı bulunmadı). Durum yalnızca URL'de: `?f=<ULID>` açık kart (s. 1139, kapanınca silinir s. 1252), `?kullanici=<ad>` arama kutusunu doldurur (s. 604).

### 2.2 Çağrılan uçlar (JS'ten)

| Uç | Satır | Ne zaman |
|---|---|---|
| `GET /api/history` | 1326 | açılışta ve her 15 sn |
| `GET /api/kartlar` | 1280 | geçmiş değişince; eksik kart varsa 4 sn × 40 |
| `GET /api/detay?id=<fusionId>` | 1101 | kart açılınca (önbellekli) |
| `GET /api/kanal` | 1272 | yalnızca `window.ILK` yoksa |

Başka uç, POST, oturum, `credentials`, `Authorization` başlığı ya da admin yolu JS'te **yok**.

### 2.3 Sabitler ve sözlükler

- `TYPE_COLORS` (s. 575): 18 tip, standart Bulbapedia paleti — NORMAL `#A8A77A`, FIRE `#EE8130`, WATER `#6390F0`, ELECTRIC `#F7D02C`, GRASS `#7AC74C`, ICE `#96D9D6`, FIGHTING `#C22E28`, POISON `#A33EA1`, GROUND `#E2BF65`, FLYING `#A98FF3`, PSYCHIC `#F95587`, BUG `#A6B91A`, ROCK `#B6A136`, GHOST `#735797`, DRAGON `#6F35FC`, DARK `#705746`, STEEL `#B7B7CE`, FAIRY `#D685AD`.
- `TYPE_BADGE` (s. 577): açık tiplerde beyaz yazı okunsun diye koyulaştırılmış rozet zemini — ELECTRIC `#b08e00`, ICE `#3a9894`, GROUND `#a2823a`, STEEL `#6f7092`, NORMAL `#7a7956`, BUG `#788612`, ROCK `#887826`, FLYING `#7a63c9`, FAIRY `#b8628c`, GRASS `#4f9a2a`.
- `TYPE_TR` (s. 578): Normal, Ateş, Su, Elektrik, Çimen, Buz, Dövüş, Zehir, Toprak, Uçan, Psişik, Böcek, Kaya, Hayalet, Ejderha, Karanlık, Çelik, Peri.
- `TYPE_GLYPH` (s. 620–639): 18 tipin 24×24 SVG simgesi, `typeIcon()` (s. 640) daire zemin + beyaz glif üretir — **arena HUD'u için doğrudan alınabilir**.
- `GENDER`, `GROWTH`, `COLOR`, `HABITAT`, `EGG` (s. 579–585): Essentials/Infinite Fusion anahtarlarının (ör. `FemaleOneEighth`, `MediumSlow`, `WatersEdge`, `Humanlike`) Türkçe karşılıkları. Çıkarım: arka uç Pokémon Essentials (Infinite Fusion PBS) veri biçimini kullanıyor.
- `MOVE_CAT = ['Fiziksel','Özel','Durum']` (s. 586) → `moves[].cat` 0/1/2.
- `STATS` sırası hp, atk, def, spa, spd, spe (s. 587); altıgen sırası hp, atk, def, spe, spd, spa (s. 588); `PAGE = 40` (s. 589).
- `EFF` (s. 655–673): tam 18×18 tip etkinlik tablosu (saldıran → [×2, ×½, ×0]). `weakRes()` (s. 675) kartın zayıflık/direncini iki tipin çarpımından seçer. **Arena için hazır veri.**

### 2.4 Kart kuralları (`cardMeta`, s. 689–700)

| Değer | Kural | Kanıt |
|---|---|---|
| BST | 6 stat toplamı | s. 692 |
| Kart HP | `clamp(30, 340, round((hp·0,8 + BST·0,15)/10)·10)` | s. 693; albümde 40–230 |
| Nadirlik | BST ≥ 580 `double` ★★ "Çift nadir"; ≥ 500 `rare` ★ "Nadir"; ≥ 400 `uncommon` ◆ "Az bulunur"; altı `common` ● "Yaygın" | s. 688, 694 |
| Shiny | nadirlik sembolü ★ (double ise ★★), adı "Shiny nadir", `.rar.gold` | s. 696–699 |
| Saldırı maliyeti | güç ≤ 40 → 1, ≤ 80 → 2, ≤ 110 → 3, üstü 4 enerji; ilki saldırı tipi, kalanı NORMAL simgesi | s. 743–745 |
| Kart hasarı | `max(10, round(power/10)·10)` | s. 746 |
| Geri çekilme | ağırlık (kg) < 10 → 1, < 50 → 2, < 120 → 3, üstü 4 (`weight/10` = kg) | s. 700 |
| Zayıflık / direnç | `weakRes` → "×2" / "-30" | s. 752–758 |
| Numara | `001/226` koleksiyondaki sıra (`numbers` haritası, kronolojik) | s. 616, 1320 |

Albüm dağılımı (226 kart): common 89, uncommon 98, rare 31, double 8; geri çekilme 1→37, 2→114, 3→41, 4→34.

### 2.5 Shiny ve `hue`

`spriteImg()` (s. 650): shiny ise aynı sprite'a `filter: hue-rotate(${hue}deg) saturate(1.3)` uygulanır. Yani **shiny için ayrı sprite yok**, sunucu bir `hue` açısı üretiyor. Albümde 8 shiny (3,5 %); hue değerleri 72, 132, 163, 170, 212, 264, 273, 274; shiny olmayanlarda hue hep 0. Üretim oranı/kuralı sayfadan çıkmaz.

### 2.6 UI akışları

- **Sahne** (`renderHero`, s. 795–826): `data`'nın son elemanı; etiket "Son açılan" ya da "Shiny fusion" + `ago(at)`; büyük isim; Baş + Gövde pod'ları (base sprite'lar); "@kullanıcı açtı" + tip rozetleri; "Kartı incele" (dialog) ve "Albüme göz at" (#koleksiyon). Sayfa vurgu rengi `--a1/--a2` ilk/ikinci tipe göre değişir (s. 804–805); rota canvas'ı aynı renge boyanır.
- **Kart** (`tradingCard`, s. 702–774): `button.tcard` > `.tc` (shiny / `r-<nadirlik>` sınıfları, `--t1/--t2` tip renkleri) > `.face`: başlık satırı (evre "Fusion", isim, HP + tip simgeleri) → `.art/.scene` (sprite, lazy; `✦ Shiny` bayrağı) → `.strip` (kategori, boy m, kilo kg) → `.body` (Yetenek, 2 saldırı) → `.wrr` (zayıflık, direnç, geri çekilme) → `.foot` (`@kullanıcı`, logo, `No/Toplam`, nadirlik sembolü). Kart bilgisi yoksa iskelet çizgiler. İmleçle eğilme (±7°) ve parlama `pointermove` ile (s. 776–793), `prefers-reduced-motion`'da kapalı.
- **Süzme** (`filtered`, s. 989): arama `user, name, head.name, body.name` içinde `toLocaleLowerCase('tr')`; Shiny anahtarı; tek tip süzgeci (toggle); sıralama new (ters kronolojik), old, name (`localeCompare('tr')`). Sayfalama `shown += 40`. Sonuç satırı "226 karttan N tanesi gösteriliyor".
- **Tip çubuğu** (s. 1002): tip başına kart sayısı, çoktan aza.
- **Eğitmen kartı** (s. 1023–1045): "Kimlik No." = kanal adının 31'li hash'i mod 100000; satırlar Eğitmen, Albümdeki kart, Koleksiyoncu (benzersiz `user`), Shiny kart, En sık tip, İlk kart tarihi; rozet sayısı `N/18`.
- **Koleksiyoncular** (`renderBoard`, s. 1047–1070): `user`'a göre gruplama, ilk 6; top (master/ultra/great), son kartın sprite'ı, "Sv. min(100, kartSayısı)", can çubuğu = kart sayısı / liderin sayısı (>%50 yeşil, >%20 sarı, altı kırmızı), "Son kartı: …". Tıklayınca `#q` o ada eşitlenir (tam eşleşme değil, `includes`).
- **Ayrıntı** (`openDetail/fillDetail`, s. 1120–1224): üstte `No. 001` + kategori; Pokédex alıntısı `dex[0].text`; Genel: yetenekler (`abilities` + `hidden`'dan farklı olanlar "Gizli yetenek" rozetiyle, `title` ile İngilizce adı), Boy, Ağırlık, Cinsiyet, Yumurta grubu, Büyüme hızı, Yakalama oranı, Renk, Yaşam alanı; İstatistikler: altıgen (150 tavan) + çubuklar (180 tavan; renk <50 kırmızı … ≥115 turkuaz, s. 1226) + Toplam; Hareketler: `lv`'ye göre sıralı tablo Sv./Hareket/Tip/Tür/Güç/İsabet/PP, `lv 0` → "Başta".
- Erişilebilirlik: `aria-pressed`, `role=listbox/option` klavye gezinimi (s. 1288–1313), `aria-live="polite"` ızgara (s. 512), `:focus-visible` altın çerçeve, `prefers-reduced-motion` desteği, kart düğmelerinde tam `aria-label` ("Gorupt: Golem ile Camerupt, @Swaggybark açtı, Yaygın. Ayrıntıları aç.").

### 2.7 Hata ve boş durumlar

| Durum | Davranış | Satır |
|---|---|---|
| `/api/history` başarısız | `catch {}` sessiz; eldeki veri kalır, 15 sn sonra yeniden denenir | 1324–1334 |
| `/api/kartlar` başarısız | sessiz; kart yüzü iskelet çizgilerle (`.sk`) kalır | 750, 1277–1286 |
| Geçmiş boş | sahnede "İlk fusion seni bekliyor", ızgarada "Albüm henüz boş", koleksiyoncularda "İlk fusion'ı açan listenin başına yazılır." | 800, 1081, 1069 |
| Süzgeç boş | "Eşleşen kart yok — Aramayı ya da tip seçimini değiştir." | 1080 |
| `/api/detay` 404/ağ hatası | üç sekmeye "Ayrıntılar şu an alınamadı…" notu; önbellek temizlenir | 1101–1103, 1145 |
| `detay.stats` / `detay.moves` yok | "Bu kart için istatistik bilgisi yok." / "Bu kart için hareket bilgisi yok." | 1198, 1223 |
| Pano erişimi reddedildi | toast "Bağlantı kopyalanamadı" | 1254–1256 |
| `?f=<id>` eşleşmez | sessizce yok sayılır | 1329–1331 |

## 3. CSS: görsel dil

`:root` jetonları (s. 14–38): `--night #070a1c`, `--bg #0c191d`, `--panel #10222a`, `--panel-2 #173039`, `--edge #24414b`, `--shade #050d10`, `--ink #f3f1e8`, `--muted #a3b2b6`, `--faint #6f8287`, `--gold #f4cf47`, `--red #e3350d`, `--kick #53fc18`, `--paper-ui #eef2f5`, `--ink-ui #1d2230`, kart çerçevesi `--frame #f4cf47 / --frame-2 #d9ac24`, kart kâğıdı `--paper #f4f0e3`. `color-scheme: dark`; açık tema yok (tek koyu tema, "karanlık tema" ayrı değil).

Fontlar: `--display 'Jersey 10'` (büyük başlıklar, 46–150 px), `--pixel 'Jersey 15'` (düğme, konuşma kutusu, sayılar), `--card-font 'Jost'` (kart yüzü), gövde Nunito Sans 16/1.6.

8-bit estetiği: 3–4 px sert kenarlıklar + `0 4px 0 var(--shade)` düşen gölge, basınca `translateY(2–3px)`; RPG "pencere" (`.win`, `.say`, `blockquote`): krem zemin, çift iç çerçeve `#b9c4cf`, kırmızı menü imleci (`::before` üçgen); `image-rendering: pixelated` sprite'lar; canvas rota 4 ekran pikseli = 1 piksel (mobilde 3), Bayer 4×4 dither gökyüzü, seed 7331 LCG (s. 834, 850) → her yüklemede aynı sahne.

Kart: oran 63/88, `container-type: inline-size` ve `cqw` birimleriyle ölçeklenir; çerçeve altın gradyan; nadirlik: `.r-rare` holografik görsel + altın ışıltı, `.r-double` parlak altın çerçeve + tüm kartta folyo, `.shiny` gümüş çerçeve + mavi ışıltı (s. 236–247).

Kırılımlar: ≤1080 (sahne 280 px kart, eğitmen tek sütun), ≤820 (sahne tek sütun, dialog tam ekran), ≤600 (ızgara 2 sütun, rozetler 6 sütun), ≤520 (tek sütun, kart en çok 360 px). Hareket azaltma: tüm animasyon/geçişler kapalı.

Arenaya alınacak jetonlar (çıkarım): `--night/--bg/--panel/--edge/--shade`, `--gold`, `--red`, `--kick`, Jersey 10/15 + Jost, tip renkleri + `TYPE_BADGE`, `TYPE_GLYPH` simgeleri, `.win` penceresi ve `.btn` düğmesi.

## 4. API

Ortak başlıklar (6 istekte aynı): `cache-control: no-store` (JSON uçlarında), `content-type: application/json; charset=utf-8`, `cross-origin-resource-policy: same-origin`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `strict-transport-security: max-age=31536000`, `permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`, `alt-svc: h3`. `server`, `etag`, `last-modified`, `vary`, `access-control-allow-origin`, `set-cookie`, `cf-*` **yok** → çıkarım: CORS kapalı (tarayıcıdan başka origin çekemez; sunucu tarafı çekim serbest), ETag yok (koşullu istek yapılamaz, her çekim tam gövde), Cloudflare imzası yok.

| Uç | Yöntem | Parametre | Yanıt | Boyut | Not |
|---|---|---|---|---|---|
| `/api/history` | GET | yok | `Acilis[]` kronolojik (eski→yeni) | 115,5 KB | sayfalama yok; `?limit` denenmedi (bütçe) |
| `/api/kartlar` | GET | yok | `{ [fusionId]: Kart }` | 63,9 KB | `?limit=1` **yok sayılır** (aynı 63 870 B) |
| `/api/detay` | GET | `id=<fusionId>` | `Detay` | ~8 KB | yok id → **404** `{"error":"Fusion bulunamadı"}` |
| `/api/kanal` | GET | yok | `{channel, url}` | ~60 B | |
| `/api/<bilinmeyen>` | GET | | **401** `{"error":"Giriş gerekli"}` | 26 B | bkz. aşağı |
| `/robots.txt`, `/sitemap.xml` | GET | | **302 → `/giris`** | 0 B | |

**Oturum / yazma izi:** `/api/yok` 401 "Giriş gerekli" ve bilinmeyen yolların `/giris`'e yönlenmesi, sitede bir **giriş sayfası ve yetkili API yüzeyi** olduğunu gösterir (çıkarım: yönetim paneli ya da yayıncı/ödül ayarları). Hangi uçlar olduğu bilinmiyor; `/giris` açılmadı, yazma denenmedi. Public JS hiçbirini çağırmaz.

### 4.1 Şemalar

`Acilis` (history kaydı; anahtar birliği 15 alan, hepsi her kayıtta var):

| Alan | Tip | Örnek | Not |
|---|---|---|---|
| `id` | string ULID (26) | `01M6BKJS8NQS2VKPSYM3ESFJWM` | sıralı; `?f=` paylaşım anahtarı |
| `fusionId` | string `"baş.gövde"` | `"295.215"` | hep `head.id + "." + body.id` |
| `name` | string | `Spirisel` | Infinite Fusion ad kuralı (baş ön ek + gövde son ek) |
| `head`, `body` | `{id:number, name:string, sprite:url}` | `…/base/295.png` | id aralığı 2–568 (IF Pokédex) |
| `sprite` | url | `…/custom/251.443a.png` | **192 düz, 29 `a`, 5 `b` son ekli** — fusionId tek başına görseli vermez, `sprite` alanı esastır |
| `artists` | string[] | `["maskedking"]` | 217 kartta 1, 8'inde 2, 1'inde 4 isim; 195 farklı sanatçı |
| `types` | string[] 1–2 | `["DARK","ICE"]` | 213 çift, 13 tek tip |
| `category` | string **İngilizce** | `Sharp Forbidden` | kart/detay'da Türkçe "… Pokémon" |
| `shiny` / `hue` | bool / number | `false` / `0` | §2.5 |
| `user` / `userId` | string / number | `YSQ3` / `9414359` | çıkarım: Kick kullanıcı adı ve Kick `user_id`; 112 benzersiz, ad↔id tutarlı |
| `test` | bool | `false` | 226'sında da false; çıkarım: yayın dışı deneme açılışı bayrağı |
| `at` | ISO 8601 UTC | `2026-11-01T13:08:04.286Z` | monoton artan |

`Kart` (`/api/kartlar[fusionId]`): `v: 2` (hepsi), `stats {hp, atk, def, spa, spd, spe}`, `category` (TR), `height` (dm), `weight` (hg), `ability` (TR ad), `attacks[2] {name (TR), type, power}`. Güç 40–160; 199 kartta artan güç sırası; 333/452 saldırı STAB tipinde, 119 değil. Çıkarım: iki saldırı hamle havuzundan seçiliyor ama kural tam "en güçlü iki" değil (Celeria'da 140 Gök Saldırısı + 90 Yere Devirme seçilmiş, 130 Yaprak Fırtınası ve 120 Gelecek Görüşü atlanmış; olası ölçüt erken seviyede öğrenilen fiziksel hamleler, doğrulanmadı). `v` çıkarım: üretim şeması sürümü; v değişirse kart yeniden üretilebilir.

`Detay` (`/api/detay?id=`): `id, name, category (TR), types, stats, abilities[] {key, name, desc, en}, hidden[] {aynı}, dex[] {text, author}, height, weight, color, habitat, growth, catchRate, gender, eggGroups[], baseExp, moves[] {key, lv, name, type, cat 0/1/2, power, acc, pp, desc, en}, spriteCount`. Celeria'da 31 hamle (lv 0 = başlangıç), `spriteCount: 2` (alternatif sprite sayısıyla uyumlu), `dex[0].author` boş. `hidden` listesi normal yetenekleri de tekrar içerebiliyor (JS `key`'e göre ayıklıyor, s. 1167). Kartın `stats`'ı detayla birebir aynı; kartın `ability`'si `abilities ∪ hidden` içinde.

### 4.2 Örnek kayıtlar (kısaltılmış, gerçek veriden)

```json
// /api/history[225] (en yeni)
{"fusionId":"295.215","name":"Spirisel","head":{"id":295,"name":"Spiritomb","sprite":"https://sprites.infinite-fusion.net/base/295.png"},
 "body":{"id":215,"name":"Sneasel","sprite":"https://sprites.infinite-fusion.net/base/215.png"},
 "sprite":"https://sprites.infinite-fusion.net/custom/295.215.png","artists":["maskedking"],"types":["DARK","ICE"],
 "category":"Sharp Forbidden","shiny":false,"hue":0,"id":"01M6BKJS8NQS2VKPSYM3ESFJWM","user":"YSQ3","userId":9414359,"test":false,"at":"2026-11-01T13:08:04.286Z"}
// /api/kartlar["76.538"]
{"v":2,"stats":{"hp":76,"atk":106,"def":90,"spa":71,"spd":68,"spe":41},"category":"Püskürme Megaton Pokémon","height":16,"weight":2600,
 "ability":"Dayanıklılık","attacks":[{"name":"Yer Gücü","type":"GROUND","power":90},{"name":"Püskürme","type":"FIRE","power":150}]}
// /api/detay?id=251.443 (kesit)
{"id":"251.443","name":"Celeria","types":["PSYCHIC","FLYING"],"abilities":[{"key":"NATURALCURE","name":"Doğal İyileşme","desc":"Savaştan çekilince tüm durum bozuklukları iyileşir.","en":"Natural Cure"}],
 "hidden":[{"key":"CLOUDNINE","name":"Dokuzuncu Bulut","en":"Cloud Nine"}],"dex":[{"text":"Bu Pokémon, zaman içinde geçiş yaparak gelecekten geldi. …","author":""}],
 "gender":"Genderless","eggGroups":["Undiscovered","Flying","Dragon"],"growth":"Erratic","catchRate":45,"baseExp":221,"spriteCount":2,
 "moves":[{"key":"DRAGONBREATH","lv":0,"name":"Ejderha Nefesi","type":"DRAGON","cat":1,"power":60,"acc":100,"pp":20,"desc":"…","en":"Dragon Breath"}, "… 31 hamle"]}
```

### 4.3 Albümün sayısal profili (2026-11-01 13:08 UTC itibarıyla)

| Ölçü | Değer |
|---|---|
| Kart / benzersiz fusionId / koleksiyoncu / shiny | 226 / 226 / 112 / 8 |
| Günlük açılış | 30 Ekim 20 · 31 Ekim 200 · 1 Kasım 6 (ilk kayıt 2026-10-30 05:32 UTC) |
| Kart sayısına göre kullanıcı | 1 kart: 70 · 2 kart: 28 · ≥3 kart: 14 (3 kartlık takım kuralı için anlamlı) |
| En çok açanlar | YSQ3 27 · Swaggybark 13 · FEODAX 9 · ISharpei 8 · OrderReed 8 · Zephyralis 7 · seselim 5 |
| BST aralığı / kart HP aralığı | 206–634 / 40–230 |
| Saldırı gücü aralığı | 40–160 (hepsinde tam 2 saldırı) |
| Boy / ağırlık aralığı | 0,3–7,9 m / 0,5–405 kg |
| Farklı yetenek (kart) | 82 |
| Farklı sanatçı | 195 |

Tip dağılımı (kart sayısı; çift tipliler iki kez sayılır): WATER 50, NORMAL 41, GRASS 36, FLYING 34, FIRE 31, GHOST 31, POISON 26, GROUND 25, PSYCHIC 23, ELECTRIC 20, DRAGON 20, ROCK 18, FIGHTING 18, BUG 18, ICE 14, STEEL 13, DARK 11, FAIRY 10 — 18 tipin hepsi albümde var (eğitmen kartı rozeti 18/18).

## 5. Dövüş katmanı için çıkarımlar (aday, karar değil)

- **Dövüşçü profili** şu alanlardan kurulur: `Acilis.{id, fusionId, name, types, sprite, shiny, hue, head, body, artists, user, userId, at}` + `Kart.{stats, ability, attacks, weight, height}`; isteğe bağlı zenginlik `Detay.{abilities[].desc, hidden, moves}`. Yetenek pasifini eşlemek için `Detay.abilities[].key` (ör. `NATURALCURE`) güvenilir anahtar; `Kart.ability` yalnız Türkçe ad.
- **Kimlik eşleşmesi:** `userId` sayısal ve `user` ile 1:1 (112/112); Kick OAuth `user:read`'den dönen `user_id` ile doğrudan karşılaştırılabilir (çıkarım; tek kayıtla doğrulanmalı). Görünen ad değişse `userId` sabit kalır.
- **Kart kimliği:** `id` (ULID) açılış/kart örneğini, `fusionId` fusion türünü tanımlar. Bugün 226 kayıtta **226 benzersiz fusionId** var (kopya yok), ama şema kopyayı yasaklamıyor; `kartlar` fusionId'ye anahtarlı olduğundan iki kişi aynı fusion'ı açarsa aynı stat/saldırı setini paylaşır (çıkarım). Arena, dövüşçüyü `id` ile, kuralları `fusionId` ile anahtarlamalı.
- **Değişkenlik:** `cache-control: no-store`, `v: 2` ve "eksikleri arka planda tamamlar" yorumu, kart gövdesinin açılıştan dakikalar sonra dolabildiğini ve ileride şema sürümüyle değişebileceğini gösterir. Saatlik senkron (mimari § Skaledman verisi) yeterli; yeni kartın hemen oynanabilmesi gerekirse `history` imzası (uzunluk + son `id`) ucuz bir değişiklik testi sağlar.
- **Geri yazma:** API'de yazma ucu, rozet, galibiyet, oturum ya da webhook izi yok; yetkili yüzey (401) var ama belgelenmemiş. Arena rozetleri/galibiyetleri kendi SQLite'ında tutar; albüme yansıtmak Skaledman sahibiyle anlaşma ve depo gerektirir.
- **Görsel dil:** §3'teki jetonlar, `TYPE_GLYPH`, `.win/.btn` dili ve kart nadirlik sınıfları (`r-rare/r-double/shiny`) HUD'da aynı şekilde kullanılabilir; sprite'lar 288×288 tek poz (animasyon yok), sanatçı adı `artists` ile kredi için hazır.
- **Hazır tablolar:** `EFF` tip etkinliği, `TYPE_TR`, saldırı maliyeti/hasar bantları (§2.4) doğrudan `src/paylasilan` veri dosyalarına aktarılabilir.

## 6. Açık noktalar (sayfadan çıkarılamaz, depo ya da sahip gerekir)

1. Kim yazdı, depo nerede, lisans ne (sayfada hiçbir iz yok; roadmap K-12 sorusu açık).
2. Barındırma: `server`/`cf-*` başlığı yok, helmet benzeri başlık seti ve JSON hata gövdeleri Node/Express'i düşündürür; kesin değil.
3. Kick ödülünü nasıl dinliyor (webhook `channel.reward.redemption`, chat botu ya da Pusher dinleyicisi), gecikme ne, ödül adı "Random Pokemon Fusion" sabit mi.
4. Kart üretim kuralı: fusion seçimi (rastgele 2–568 × 2–568 mi, yalnız özel sprite'ı olanlar mı — 226/226'sı `custom/` olduğu için muhtemelen evet), `attacks` seçim ölçütü, `ability` seçimi (normal mi gizli mi), shiny oranı ve `hue` üretimi, `name`/`category` Türkçeleştirme kaynağı, alternatif sprite (`a`/`b`) seçimi.
5. Veri tabanı ve kalıcılık; ULID üreticisi; `test` bayrağının ne zaman true olduğu ve test kayıtlarının public uçta görünüp görünmediği.
6. Oran sınırı, önbellek katmanı, `?limit`/`?since` gibi parametreler (yalnız `kartlar?limit=1` denendi, yok sayıldı), `history` büyüyünce sayfalama planı.
7. `/giris` arkasındaki yetkili API (hangi uçlar, kim giriyor), `/api/yok` → 401 davranışının kapsamı.
8. Sprite'lar `sprites.infinite-fusion.net`'ten doğrudan geliyor; bu sunucunun hotlink/CORS/oran politikası ve `base/` ile `custom/` dışındaki (ör. `autogen/`) yollar.
9. Kick `userId`'nin gerçekten Kick `user_id` olduğu bir OAuth girişiyle doğrulanmalı.
10. Aynı fusion'ın ikinci kez açılması halinde davranış (yeni ULID ile ikinci kayıt mı, engel mi).
