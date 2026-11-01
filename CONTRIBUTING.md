# Katkı rehberi

Skaledman Arena topluluk projesidir; her katkı PR ile gelir, `main` dalına doğrudan push yok. Bu belge ilk PR'ınıza kadar bilmeniz gereken her şeyi toplar.

## 1. Nereden başlarım

1. [Issues](https://github.com/dorukhandori/skaledman-arena/issues) sayfasına bakın. Planlanan özellikler `F1`, `F2`, `F3` etiketleriyle aşamalara ayrılmıştır; yeni başlayanlar için `iyi ilk görev` etiketi var.
2. Üzerinde çalışacağınız issue'ya kısa bir yorum yazın ("ben alıyorum"), böylece iki kişi aynı işi yapmaz. 10 gün hareket olmazsa görev yeniden boşa düşer.
3. Issue yoksa önce bir **özellik** ya da **hata** issue'su açın (şablonlar var). Tasarımı değiştiren işler (yeni hamle ailesi, formül, kontrol şeması) önce issue'da tartışılır, sonra kodlanır; `docs/design/` bu konularda son sözdür.

## 2. Kurulum

```bash
git clone https://github.com/dorukhandori/skaledman-arena.git
cd skaledman-arena
npm install
npm run birlestir -- --rastgele 20 --tohum 1   # fusion sprite'ları (git dışı)
npm run dev                                     # http://localhost:5173
```

Node 22+. Depoyu iCloud/Drive gibi eşitlenen bir klasöre koymayın; `.git` bozulabiliyor.

## 3. Dal ve commit

- `main` korumalıdır: PR + yeşil CI + bir onay gerekir. Kendi fork'unuzdan ya da `f1/<konu>`, `fix/<konu>`, `docs/<konu>` gibi bir daldan PR açın. Aşama öneki roadmap'teki aşamaya karşılık gelir (`f1/` çevrimiçi, `f2/` kimlik ve kartlar, `f3/` yayın).
- Commit mesajları **İngilizce**, [Conventional Commits](https://www.conventionalcommits.org/): `feat: …`, `fix: …`, `docs: …`, `refactor: …`, `test: …`, `chore: …`. Gövdede *neden* yazın; *ne* zaten diff'te.
- Küçük PR büyük PR'dan iyidir. Bir PR tek konuyu kapatır; "bu arada şunu da düzelttim" ayrı PR.

## 4. Kod kuralları

- **Tanımlayıcılar Türkçe** (`dovuscu`, `hamleBas`, `ArenaOdasi`), kütüphane API'leri ve commit mesajları İngilizce. Oyuncuya görünen her metin Türkçe. Yorumlar Türkçe.
- **`src/paylasilan` kutsaldır.** İstemci ve sunucu aynı adımı bit bit aynı koşturmalı; bu yüzden orada DOM, Node API'si, `Date.now`, `Math.random`, `setTimeout`, `fetch`, `pixi.js`, `colyseus` yoktur. `npm run lint` bunu zorlar; rastgelelik için `sim/rastgele.ts`, zaman için adım sayacı.
- **Sunucu karar verir.** Konum, HP, cooldown, vuruş, hasar, maç sonucu yalnız sunucuda. İstemci yalnız `Girdi` gönderir; her alan `sanitize` ile kırpılır.
- **Kurallar veridir.** Hamle, tip ve stat kuralları `src/paylasilan/kurallar/` tablolarında; iki taraf aynı tabloyu okur. Yeni hamle = tabloya satır, kod değil.
- **Skaledman'ı canlı çağırma.** Oyun kodu `skaledman.com`'a istek atmaz; veri `araclar/veri-cek.ts` ile saatte bir çekilir, `veri/*.json` fixture'dır. Site sahibinin dur demesi hâlinde çekim durur.
- Dosyalar 400 satır civarı, fonksiyonlar kısa; sihirli sayılar `kurallar/ayar.ts`'e. `any` yok; dış veri zod ile doğrulanır.

## 5. Test

```bash
npm run typecheck && npm run lint && npm test
```

- Simülasyon değişikliği → `test/sim*.test.ts` içinde determinizm testi (aynı girdi dizisi, aynı durum; `toBe`, `toBeCloseTo` değil).
- Kural/formül değişikliği → `test/kurallar.test.ts`; denge iddiası varsa `araclar/denge/turnuva.ts` çıktısını PR'a ekleyin (kart sayısı, maç sayısı, kazanma oranı bandı).
- Ağ değişikliği (F1+) → yapay gecikme/jitter/kayıp değerlerini ve iki gerçek istemciyle denendiğini PR'da yazın; Colyseus'un `@colyseus/sdk/debug` panelleri bunun için var.
- Görsel/his değişikliği → ekran görüntüsü ya da kısa video. "Kodu okudum, doğru görünüyor" yetmez; gerçek çalışma zamanına bakılır.

## 6. PR kontrol listesi

PR şablonu bunları sorar:

- [ ] Hangi issue'yu kapatıyor (`Closes #…`)
- [ ] `typecheck`, `lint`, `test` yerelde yeşil
- [ ] Yeni davranışın testi var
- [ ] `src/paylasilan`'a dokunduysa determinizm korunuyor
- [ ] Oyuncuya görünen metin Türkçe, tanımlayıcılar Türkçe
- [ ] Tasarım/sayı değiştiyse ilgili `docs/` dosyası güncellendi
- [ ] Görsel değişiklikte ekran görüntüsü

İnceleme: en az bir onay (şimdilik depo sahibi). İnceleyen önce doğruluk ve kurallara uyuma, sonra okunabilirliğe bakar; stil tartışması lint'in işi.

## 7. Yapmayın

- Üçüncü taraf varlık (sprite, ses, font) eklemek: lisansı ve kredisi netleşmeden depoya girmez. Fusion çizimleri sanatçılara, animasyon kareleri PMD SpriteCollab'a aittir; `public/fusion/` üretilen çıktıdır ve git dışıdır.
- Ücretli servis çağrısı (PixelLab, Gemini vb.) içeren kod ya da anahtar: anahtarlar yalnız ortam değişkeninden, depoya ve loga girmez.
- Para, reklam, satış: kâr amaçsız hayran projesi, bu sınır sabittir.
- Skaledman'a yazma denemesi: devir ve sonuç uçları Skaledman'ı geliştiren kişiyle birlikte tasarlanır ([docs/tech/skaledman-eklenti.md](docs/tech/skaledman-eklenti.md)).

## 8. Belgeler nerede

| Soru | Belge |
|---|---|
| Oyun nasıl çalışmalı, hamle aileleri, modlar | `docs/design/oyun-konsepti.md` |
| Mimari, netcode, deploy | `docs/tech/mimari.md`, `docs/tech/adr/` |
| Sprite üretimi | `docs/art/fusion-animasyon.md` |
| Skaledman entegrasyonu | `docs/tech/skaledman-eklenti.md` |
| Nerede olduğumuz, kararlar (K-numaraları) | `docs/production/roadmap.md` |
| Skaledman'ın dışarıdan görünen her şeyi | `docs/research/skaledman-sayfa-analizi.md` |

Belgelerde karar hiyerarşisi: `docs/design/` oyunu, `docs/tech/` yapılabilirliği belirler; ikisi çakışırsa issue'da konuşulur, son söz depo sahibinde.

## 9. Davranış

Kibar ve açık olun; hata bildirimi yazana teşekkür edin, inceleyene sabır gösterin. Taciz, hakaret, kişisel saldırı yoktur; böyle bir durumu depo sahibine issue dışı bir kanaldan bildirin. Sanatçıların ve Skaledman'ın emeğine saygı bu projenin var olma koşuludur.
