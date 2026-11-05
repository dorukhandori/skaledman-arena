> **TARİHÇE: 2026-11-04'ten beri İPTAL.** Sahip kararı: "skaledman'dan bağımsız bir proje olacak." Proje **Devran** oldu
> (özgün topaç dövüşü, kâr amaçsız); Skaledman eklentisi, kart verisi, fusion sprite'ları ve Kick `user_id` eşleşmesi yok.
> **Yerine:** [ADR-006](adr/ADR-006-devran-donusumu.md) (dönüşüm), [mimari.md](mimari.md) (güncel mimari),
> [veri-modeli.md](veri-modeli.md) (kendi `veri/*.json` verimiz), [backend.md](backend.md) (ad + şifre kimliği; Kick OAuth askıda).
> Aşağıdaki gövde değiştirilmeden tarihçe olarak tutulur; otorite değildir.

# Skaledman'a eklenti olarak arena: entegrasyon yazısı

> **TARİHÇE / İPTAL (D8, B-37):** Bu belge iptal edilen ilk fikrin (hayran kartlarıyla arena, 2026-11-01) kaydıdır; içerik değiştirilmeden tarihçe olarak tutulur. Proje **Devran**'a (özgün dönen topaç dövüşü, kâr amaçsız) döndü; marka, kart, sprite ve dış site bağımlılığı yoktur. Güncel belgeler: `docs/production/devran-kod-brief.md`, `docs/production/raporlar/D1.md … D8.md`.

`[@axiom · Technical Director]` · 2026-11-01 · Durum: teknik öneri; Skaledman deposu görülünce (K-13) kesinleşir. Kaynaklar: [skaledman-sayfa-analizi.md](../research/skaledman-sayfa-analizi.md), [mimari.md](mimari.md), [oyun-konsepti.md § 1b](../design/oyun-konsepti.md).

Bu belge Skaledman'ı yazan kişiye verilecek şekilde yazıldı: arenanın Skaledman'dan ne beklediği, Skaledman'a eklenecek asgari parça ve neden ayrı bir süreç olarak çalıştığı.

## 1. Arena nedir, Skaledman'a ne kadar dokunur

Arena, Skaledman'daki fusion kartlarıyla oynanan gerçek zamanlı 1v1 dövüş katmanıdır. Albüm, kart açma ve Kick ödül akışı Skaledman'da kalır. Skaledman'a yalnız üç dokunuş gerekir:

| Dokunuş | Nerede | Boyut |
|---|---|---|
| **"Arenada savaş" düğmesi** | kart ayrıntı penceresi (`dialog#dlg`, "Bağlantıyı kopyala"nın yanı) ve/veya koleksiyoncu satırı | birkaç satır HTML + JS |
| **Devir ucu** `POST /api/arena/devir` | mevcut yetkili API yüzeyi (`/giris` arkası, 401 veren katman) | ~40 satır Express |
| **Sonuç ucu** `POST /api/arena/sonuc` (isteğe bağlı, F3) | aynı katman | ~30 satır + bir tablo |

Skaledman'ın mevcut dört public GET ucu (`/api/history`, `/api/kartlar`, `/api/detay`, `/api/kanal`) olduğu gibi kalır; arena bunları **yalnız sunucu tarafında, saatte bir** çeker.

## 2. Neden depo içinde değil, yanında

Arena tek bir Node süreci olarak çalışır: Vite ile paketlenmiş istemci + Colyseus 0.18 sunucusu, kalıcı WebSocket odaları, 60 Hz sabit adım, kendi SQLite'ı. Skaledman ise istek-yanıt çalışan sade bir sayfa + JSON API. İki yük profili farklıdır: arena bir maç boyunca CPU tüketir ve uzun bağlantılar tutar; Skaledman'ın 15 saniyelik polling'i ve kart üretimi bundan etkilenmemeli.

Bu yüzden önerilen model **yan süreç + ince köprü**:

```
 Tarayıcı ──GET──► skaledman.com (albüm, kartlar, Kick ödülü)
     │                 │  "Arenada savaş" → POST /api/arena/devir → imzalı token
     │                 ▼
     └──WS/HTTP──► arena.skaledman.com (Colyseus + Pixi istemcisi, kendi süreci)
                       ▲
                       └── saatte bir GET /api/history, /api/kartlar  (sunucudan sunucuya)
```

Depo düzeni için iki seçenek; karar sahibin (K-13):

- **A. Ayrı depo (önerilen başlangıç):** bu depo (`skaledman-arena`) kendi başına yaşar. Skaledman'a eklenecek köprü kodu burada `eklenti/skaledman/` altında hazırlanır, Skaledman'a tek bir PR olarak gider. Sürüm bağımsızlığı tam; Skaledman'ın bağımlılıkları şişmez.
- **B. Aynı depo, ayrı paket:** Skaledman deposunda `packages/arena/` (ya da `arena/`) klasörü; kendi `package.json`, kendi build, kendi systemd birimi. Ortak tip tanımları (`Acilis`, `Kart` şemaları) tek yerde durur. Tek PR akışı; ama Skaledman CI'ı arenanın testlerini de koşturur.

Her iki durumda arena **ayrı süreç ve ayrı port** olarak kalır; tek fark kaynak kodun nerede durduğu.

## 3. Devir sözleşmesi (Skaledman → arena)

Kullanıcı Skaledman'da oturum açmıştır (Kick kimliği). "Arenada savaş" düğmesi Skaledman'ın kendi oturumunu kullanır; arena ikinci bir giriş istemez.

**İstek:** `POST /api/arena/devir` (Skaledman oturum çerezi ile)

```json
{ "kartlar": ["01M6BKJS8NQS2VKPSYM3ESFJWM", "01M6B..."], "baglam": "duello" }
```

**Skaledman'ın yaptığı:** oturumdaki Kick `userId`'yi alır, istenen kart ULID'lerinin `history` kayıtlarında bu kullanıcıya ait olduğunu doğrular (1–3 kart), kısa ömürlü imzalı bir token üretir ve arena adresini döner:

```json
{ "url": "https://arena.skaledman.com/?devir=<token>" }
```

**Token:** HMAC-SHA256 ile imzalı JWT (HS256) ya da eşdeğer kompakt biçim. Gizli anahtar iki tarafta da ortam değişkeni (`ARENA_DEVIR_SIRRI`); repoya girmez.

| Alan | Örnek | Not |
|---|---|---|
| `sub` | `9414359` | Kick `userId` (history'deki `userId` ile aynı) |
| `ad` | `YSQ3` | görünen ad (`user`) |
| `kartlar` | `["01M6B…", …]` | 1–3 kart ULID'i; fusionId arena tarafında history'den çözülür |
| `baglam` | `duello` / `oda:ABCD` | meydan okuma bağlamı; isteğe bağlı |
| `iat`, `exp` | +60 s | tek kullanımlık; arena `jti`'yi 5 dk tutup tekrarı reddeder |
| `jti` | ULID | tekrar koruması |

**Arenanın yaptığı:** imzayı ve süreyi doğrular, `jti`'yi kaydeder, kartları **kendi SQLite anlık görüntüsünden** çözer (fusionId, sprite, stats, saldırılar). Kart anlık görüntüde yoksa (açılıştan dakikalar sonra dolan `v: 2` gövdesi) arena bir kez `history` imzasını (kayıt sayısı + son ULID) kontrol eder; değişmişse saatlik senkronu erkene alır. Hâlâ yoksa kullanıcıya "kart henüz hazır değil, biraz sonra dene" der. Oyun kodu Skaledman'ı istek anında çağırmaz.

Token'ı doğrulayan arena, kullanıcıya kendi HTTP-only oturum çerezini yazar; Colyseus odasına girişte `onAuth` bu çerezi okur. Böylece sayfa yenilenince token tekrar gerekmez.

**Yedek yol (Skaledman'a dokunmadan):** arena kendi Kick OAuth 2.1 (PKCE, `user:read`) girişini yapar ve `user_id`'yi history'deki `userId` ile eşleyip kartları listeler. Devir ucu gelene kadar F2'nin planı budur; iki yol birlikte de yaşayabilir.

## 4. Veri akışı (arena → Skaledman okumaları)

Sayfa analizinde kesinleşenler ve bunların arena tarafındaki karşılığı:

| Skaledman gerçeği | Arena davranışı |
|---|---|
| CORS yok | yalnız sunucu tarafı çekim (`araclar/veri-cek.ts`, F1'de `sunucu/veri/skaledman.ts`) |
| ETag / `?since` yok, her yanıt tam gövde (~180 KB) | saatte en çok 1 istek/uç; değişiklik testi `history` imzası |
| `cache-control: no-store`, kart gövdesi gecikmeli dolabilir | gövdesi olmayan açılış oynanabilir sayılmaz |
| `sprite` alanı esas (29 `a`, 5 `b` alternatif) | görsel fusionId'den türetilmez |
| shiny = aynı PNG + `hue` | arena aynı `hue-rotate` kuralını uygular |
| `Detay.abilities[].key` | pasif yetenek eşlemesi için anahtar; kart başına tembel çekim |

Skaledman tarafında **isteğe bağlı iyileştirmeler** (hiçbiri zorunlu değil): `ETag` ya da `?since=<ULID>` parametresi (bant genişliği), tek toplu uç `/api/arena/kartlar` (history + kart gövdesi birleşik), yeni kart açılışında arenaya webhook (`POST https://arena…/api/skaledman/yeni`, aynı HMAC). Bunlar gelirse saatlik çekim yerine anlık güncelleme olur.

## 5. Sonuçların geri yazımı (isteğe bağlı, F3)

Arena maç sonucunu kendi SQLite'ında tutar (`mac`, `oyuncu.elo`). Albümde rozet/galibiyet gösterilmesi istenirse Skaledman'a tek bir uç yeter:

`POST /api/arena/sonuc`, gövde HMAC ile imzalı (`X-Arena-Imza: sha256=<hex>`):

```json
{ "macId": "01M6C…", "kazanan": 9414359, "kaybeden": 1234567,
  "kartlar": { "9414359": ["01M6B…"], "1234567": ["01M6A…"] },
  "sureSn": 74, "bitis": "2026-11-01T20:12:03Z" }
```

Alternatif, Skaledman'ın itmesini istememesi hâlinde: arena `GET /api/maclar?since=<ULID>` sunar, Skaledman isterse çeker.

## 6. Yayına alma ve alan adı

- Arena VPS'te ayrı kullanıcı + systemd birimi (`CPUQuota`, `MemoryMax`), `127.0.0.1:2567`'ye bağlı, dışarıya Cloudflare Tunnel ile.
- **Alt alan (önerilen):** `arena.skaledman.com` CNAME → tunnel. Skaledman oturum çerezi buraya taşınmaz; devir token'ı tam da bu yüzden var.
- **Yol tabanlı alternatif:** Skaledman'ın kendi ters vekili `/arena/*` isteklerini (WebSocket `Upgrade` dahil) arena sürecine iletir. Çerez paylaşılır ama Skaledman'ın sunucusu WebSocket trafiğini taşır; önerilmez.
- Arena istemcisi Skaledman'ın görsel jetonlarını (gece zemini, altın çerçeve, Jersey/Jost yazı tipleri, tip renkleri ve glifler) zaten kullanır; logo ve marka alınmaz. Sanatçı kredileri `artists` alanından ekranda gösterilir.

## 7. Güvenlik özeti

- Token ömrü 60 s, tek kullanım (`jti`), HS256, sır yalnız ortam değişkeninde; iki tarafta da saat kayması için ±30 s tolerans.
- Arena kart sahipliğini token'a güvenmeden **kendi anlık görüntüsünden ikinci kez** doğrular (`history[].userId === sub`).
- Kullanıcı girdisi (`Girdi`) sunucuda `sanitize` ile kırpılır; konum, HP, hasar, sonuç yalnız sunucuda hesaplanır.
- Devir ucuna oran sınırı (kullanıcı başına dakikada 5), arenaya oda başına 2 oyuncu + izleyici kotası.
- Arena Skaledman'a yalnız okuma yapar; yazma (sonuç) imzalı ve isteğe bağlıdır.

## 8. Skaledman'a gidecek asgari PR (taslak)

```js
// routes/arena.js — mevcut yetkili katmanın içine
import { SignJWT } from "jose";
const SIR = new TextEncoder().encode(process.env.ARENA_DEVIR_SIRRI);
const ARENA_URL = process.env.ARENA_URL ?? "https://arena.skaledman.com";

router.post("/api/arena/devir", girisGerekli, async (req, res) => {
  const { kartlar = [], baglam } = req.body ?? {};
  if (!Array.isArray(kartlar) || kartlar.length < 1 || kartlar.length > 3) return res.status(400).json({ error: "1-3 kart seç" });
  const benim = history.filter((h) => h.userId === req.user.id).map((h) => h.id);
  if (!kartlar.every((k) => benim.includes(k))) return res.status(403).json({ error: "Bu kartlar sana ait değil" });
  const token = await new SignJWT({ ad: req.user.name, kartlar, baglam })
    .setProtectedHeader({ alg: "HS256" }).setSubject(String(req.user.id))
    .setJti(ulid()).setIssuedAt().setExpirationTime("60s").sign(SIR);
  res.json({ url: `${ARENA_URL}/?devir=${token}` });
});
```

```js
// kart ayrıntı penceresine düğme (fillDetail içinde, "Bağlantıyı kopyala"nın yanına)
const arenaBtn = el("button", { class: "btn", type: "button" }, "Arenada savaş");
arenaBtn.onclick = async () => {
  const r = await fetch("/api/arena/devir", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ kartlar: [kayit.id], baglam: "duello" }) });
  if (!r.ok) return toast((await r.json()).error ?? "Arena şu an açılamadı");
  location.href = (await r.json()).url;
};
```

Değişken ve yardımcı adları (`history`, `girisGerekli`, `el`, `toast`, `kayit`) Skaledman'ın gerçek koduna göre uyarlanır; depo görülünce bu taslak gerçek bir PR'a dönüşür.

## 9. Depo görülünce kapanacak sorular

1. Yetkili API katmanı nasıl kuruldu (oturum çerezi mi, Kick OAuth mı); `req.user` eşdeğeri ne.
2. `userId` gerçekten Kick `user_id` mi (bir OAuth girişiyle doğrulanır).
3. Barındırma ve ters vekil (Node/Express çıkarımı); `arena.skaledman.com` için DNS kimde.
4. Aynı fusion ikinci kez açılırsa yeni ULID mi; arena dövüşçüyü `id` ile anahtarlar, kuralları `fusionId` ile.
5. Lisans: arenanın kod lisansı henüz seçilmedi (öneri MIT); Skaledman'ın lisansı A/B seçimini etkiler.
