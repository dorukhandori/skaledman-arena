# Lore'un mevcut arenaya bağlanması (Devran)

**Tarih:** 2026-11-04 · **Yazar:** [@helix · Game Designer] · **Durum:** taslak, sahip onayı bekliyor.
**Önkoşul:** `00-lore-cercevesi.md`. Araştırma atıfları R01..R05 (`docs/research/beyblade/`). Mevcut kontrol/kod gerçekleri: `docs/design/oyun-konsepti.md` § 3, § 11 ve `src/paylasilan/sim/Girdi.ts`. Sayılar yer tutucudur; dengeleme `@ledger`, netcode uygunluğu `@relay`, kod `@byte`.

---

## 1. Kontrol

### 1.1 R05'in C hibrit önerisi: kabul, iki değişiklikle
**R05 § 5a-C:** WASD ivmeli sürüş + çarpma = temel vuruş, Shift dash, yetenek tuşları, fare = yetenek yönü; tek `stamina` barı; burst eşiği.

| Konu | Karar | Gerekçe |
|---|---|---|
| WASD ivmeli sürüş | **Kabul** | Roblox X-BATTLES segmenti zaten tanıyor (R05 § 1c, § 2-8); mevcut hareket kodu korunur. İvme/kayma Uç'tan gelir (`desen`). |
| Çarpma = temel vuruş | **Kabul** | "Sol tık: temel vuruş" tuşu kalkar; temel vuruş bağıl hız × ön açı ile otomatik (R05 § 2-1, Rocket League kuralı; açı penceresi ≥60°, `allowRewindState` ile doğrulama). |
| Shift dash | **Kabul**, ama **şarjlı** değil ilk sürümde | Mevcut dash (60 br/0,15 s/10 s bekleme) kalır; şarj varyantı Mario Kart tarzı (R05 § 2-6) F1 sonrasına. Dash stamina harcar (Uç'a bağlı). |
| Space = zıplama | **Değiştir → "Sekme" (hop)** | R05 K-F: 0,3 s havada, çarpışma geçirmez, stamina harcar. Yer alanı ultilerinden kaçış aracı. Mevcut `zipla` alanı aynı. |
| Fare = yetenek yönü | **Kabul** | Mevcut sağ tuş basılı = nişan, bırak = fırlat akışı **aynen yetenek yönüne** döner. Ayrı yeni girdi yok. |
| 1-4 / tekerlek = yuva | **Anlam değişir** | Yuva 1 = Yetenek, 2 = Özel Yetenek, 3 = Ulti (kilitli, Lv.4), 4 = **Parça Tekniği** (Gövde/Uç kaynaklı kısa bekleme, ucuz). |
| Z = dinlenme | **Değiştir → "Sıkı Dönüş"** | Basılı tutarken hareket durur, `erime` düşer (Uç'a bağlı), itilmeye açık; stamina oyuncusunun aracı. Alan aynı. |
| Tab / Q / E = takım | **Kural değişir** (bkz. § 2.3) | Girdi alanı aynı. |

### 1.2 `Girdi` şeması değişiyor mu?
**Hayır, alanlar aynı** (`yonX, yonZ, nisanX, nisanZ, secilenYuva, atesle, dash, zipla, dinlen, degistir, dusus`). Yalnız **anlamlar** değişir:
- `atesle` → yetenek bırakma (Yetenek/Özel Yetenek/Ulti/Parça, `secilenYuva`'ya göre).
- `zipla` → Sekme. `dinlen` → Sıkı Dönüş.
- `dusus` → (Tab basılıyken) yeni topacın nişanlanan noktaya düşmesi **kalır**; topaç değişiminde "arenada konumlanma" olarak okunur.
- `sanitize` aynı sınırlarla çalışır; ağ şeması (`GirdiSemasi`) ve düğme maskesi değişmez.
Değişiklik **sim tarafındadır** (fizik, kaynaklar, kazanma). Bu büyük bir iş: `Dovuscu` HP yerine `stamina`, hamle tablosu yerine yetenek tablosu. `@byte` + `@relay` kapsamı; ben yalnız şekli yazıyorum.

---

## 2. Kazanma koşulları ve maç akışı

### 2.1 HP yerine tek kaynak: `stamina`
(R04 § 4.3, R05 § 5b-5: **tek bar**.) `stamina` dönüş enerjisidir. Zamanla erir (`erime`, Uç), dash/sekme/yetenek harcar, çarpışmada hem vuran hem vurulan kaybeder (vuran daha az, `saldiri`/`savunma` oranıyla). Sıfır = Durma.

Knockback `stamina` düştükçe büyür (Smash tarzı, R05 § 2-3, § 5b-6): okunabilir "yorgunluk". HUD'da **tek yay**; çatlak göstergesi parçalanma kilidini gösterir.

### 2.2 Üçlü bitiş + puan
| Bitiş | Puan (aday) | Koşul | Canon |
|---|---|---|---|
| **Durma** | 1 | Rakibin `stamina`i 0 | R03 § 3.1 Spin Finish |
| **Ring Out** | 2 | Rakip arena dışına (kenardan) düşer | R03 § 3.1 Over Finish |
| **Parçalanma** | 2 | `burstEsik` dolar (Disk/Uç şaftı), topaç dağılır | R03 § 3.1/3.2 kilit, R04 § 3.5 |
| **Kuyu** (isteğe bağlı) | 3 | Arena göbeğindeki kuyuya düşürme | R04 § 2.5 Xtreme (K-5) |

- **Kazanma:** ilk **3 puan** (R05 § 5b-6, R03 § 3.1). X'te 4 (R04 § 2.5). Hangisi: `02` K-4.
- **Eşzamanlı bitiş:** berabere, tur tekrar (R04 § 2.5).
- **Self-düşüş:** rakibe puan (R04 § 3.4 / § 4.3).
- **Öncelik:** Parçalanma, aynı anda Ring Out'e baskın (R03 § 3.1 doğrulanmamış; kural bizde yazılır: `@ledger` + `@qa-lead` onayı).
- **Tip üçgeni etkisi:** Saldırgan Ring Out/Parçalanma hedefler, Kale Durma'e doğru oynatır, Dayanıklı Durma'ü hedefler (R03 § 5 tablosu).

### 2.3 60-90 sn 1v1 ve 3'lü takım
**Sorun:** Üç puanlık maç 60-90 sn'ye sığmalı. Tur başına 15-25 sn.
**Önerim (Bizim önerimiz):**
- Tek arena, **kesintisiz akış**: her **bitiş** bir puandır ve **kaybeden taraf topacı değiştirir** (zorunlu), kazanan kalan topacıyla `stamina`ini kısmen (%x) geri alarak devam eder. Böylece 3 kartlı takım doğal biçimde "yedek topaç"tır (R05 § 5b-8; R04 § 4.3 3-bey deste).
- **Süre:** 90 sn üst sınır; dolunca **ani ölüm** (arena kenarı daralır, `erime` artar).
- **Serbest geçiş (Tab):** yalnız `stamina < %25` iken "geri çek" (2 s savunmasız, R05 § 5b-8) ya da bitiş sonrası zorunlu geçiş. Maç ortası keyfi geçiş yok.
- **Element uyumu:** komşu element devralınca yeni topaç Enerji'da küçük bir dolu başlar (§ 4).
- **Takım Ultisi** (takım yeteneği): üç topaç ayakta ve Yay/Üçgen diziliminde ise (00 § 4.6).

| Senaryo | Maç süresi (hedef) |
|---|---|
| Hızlı (3 Ring Out/Parçalanma) | ~40-60 sn |
| Orta (karışık) | ~70-90 sn |
| Uzun (Durma ağırlıklı) | 90 sn → ani ölüm |
Sayılar `@ledger` simülasyonuyla kalibre edilir (bot turnuvası).

---

## 3. Eşleme tablosu

### 3.1 Çekirdek → pasif, yön, yetenek
| Çekirdek öğesi | Oyun tarafı | Veri yeri (öneri) |
|---|---|---|
| Köken (Göktaşı/Maden/Yapay/Karanlık) | Pasif kuralı + yön (00 § 2.4) | `kurallar/cekirdek.ts` |
| Element | Tip **eğilimi**, hareket karakteri bonusu, yetenek ailesi, Enerji akışı | `kurallar/element.ts` |
| Seviye (Lv.1..Lv.4) | Hangi yetenekler açık | `kurallar/cekirdek.ts` |
| Ruh | Ulti görseli (avatar efekti) | art manifest |

### 3.2 Element → tip ve hareket
| Element | Eğilim | Hareket karakteri (oyun) |
|---|---|---|
| Kor | Saldırgan | Yüksek ivme, hız şeridi bonusu |
| Kasırga | Denge | Yan kayma, kavisli dönüş |
| Şimşek | Saldırgan | Kısa atılışlar, hızlı yön değişimi |
| Girdap | Dayanıklı | Merkeze çekim, `erime` düşük |
| Kaya | Kale | Yüksek kütle, düşük ivme |
| Don | Dayanıklı | Düşük sürtünme, uzun süzülme |
Eğilim tipin **yerine geçmez**; tip parçalardan çıkar (00 § 3.2).

### 3.3 Parça → 8 parametre (R04 § 4.1)
| # | Parametre | Birincil kaynak | İkincil |
|---|---|---|---|
| 1 | `kutle` | Gövde | Disk |
| 2 | `saldiri` | Gövde | |
| 3 | `savunma` | Gövde | Disk |
| 4 | `stamina` havuzu | Gövde (dış ağırlık) | Çekirdek payı, Uç |
| 5 | `erime` | Uç | |
| 6 | `desen` | Uç | |
| 7 | `burstEsik` | Disk | Uç şaftı |
| 8 | `yon` | Çekirdek | |
+ isteğe bağlı 9. `yukseklik` (Disk).

---

## 4. Ulti tetikleme

### 4.1 Enerji metresi nasıl dolar
3 dilimli metre (00 § 4.3). Üç kaynak (aday ağırlıklar):

| Kaynak | Dolum | Gerekçe |
|---|---|---|
| **Çarpışma** | Her temas: vuran + vurulan (ağır vuruş daha çok) | Metre maçın içinden dolar (R05 § 3 metre+tuş) |
| **Hasar alma** | Devir kaybı oranında küçük ek | Kaybeden toparlama şansı (R01 § 6-4; R02 § 7-4 kriz) |
| **Risk** | Kenar yakınlığı, hız şeridi, yakın geçiş (Wii Battle Fortress fikri, R05 § 3) | Güvenli oyuna karşı denge |
Zıt element çarpışması +%25 (00 § 3.3). Köken pasifleri (Kriz Alevi vb.) dolum çarpanlarını değiştirir.

**Çok dolum yok:** metre 3 dilimde durur; boşa taşmaz. Takım Enerjisi ayrı 4. dilim, yalnız Takım Ultisi için.

### 4.2 Ulti sırasında kontrol
- Telegraf (aviso) başlar; **hareket yavaşlar/kilitlenir** yeteneğe göre (R01 § 6-6 saldırı hamlesi hareketi kilitler).
- Fare yönü **bırakma anında** sabitlenir (sağ tuş bırak = fırlat, mevcut akış).
- Ulti sırasında WASD kısmi (kaçış değil ayar), dash kilitli.
- İptal: HUD üstünde bırakma (mevcut kural).

### 4.3 Telegraf okunurluğu (izleyici için)
- Üç katman: **zemin halkası** (kırmızı = tehlike alanı), **ruh silueti** (canavar 0,3 s belirir, elemente özel renk), **ekran kenarı parlaması** (Kick yayınında okunur).
- Telegraf süresi ≥ 2× tipik RTT; ağ gerçeklerine göre `@relay` onaylar (Yetenek 0,2 s, Özel Yetenek 0,45-0,7 s, Ulti 0,9 s örnek).
- Ara sahne yok; vurgu ≤0,5 s (R05 § 3). QTE/waggle yok (R05 § 5b-7).
- Sanat/UX: `@iris`, `@tide`.

---

## 5. Sunum ve sanat gereksinimi

**Değişiklik:** Fighter artık 8 yönlü karakter animasyonu değil, **üstten bakış dönen topaç**. `docs/art/fusion-animasyon.md` stratejisi (PMD SpriteCollab kompozisyonu, 8 yön, Sprite Lab) tamamen **gereksiz**.

`@iris` (art-director) için gereksinim listesi:
1. **Topaç sprite'ı:** üstten stilize disk; Gövde/Disk/Uç/Çekirdek katmanları ayrı çizilebilir; dönme **kod ile** (tek sprite + dönüş + hız bulanıklığı + gölge elipsi).
2. **Köken renk dili:** Göktaşı, Maden, Yapay, Karanlık (00 § 2.4).
3. **Element motifi:** altı element için gövde deseni + iz rengi.
4. **Ruh avatarları:** 12-15 örnek ruh, siluet + belirme efekti (0,3-0,5 s), Ulti için tam boy (kod ile parçacık + sprite).
5. **Efekt dili:** çarpışma kıvılcımı (zıt element karışık renk), parçalanma (gövde parçalarına ayrılma), çatlak (kilit göstergesi), düşüş.
6. **Sol/sağ dönüş okunur:** iz kuyruğu yönü.
7. **Arena:** arena, kuşak, kuyu, tehlikeli zemin (`@cove`).
8. **HUD:** stamina yayı, Enerji dilimleri, kilit çatlağı (`@glyph`).
9. IP hijyeni: kanatlı/ejderli üst tasarımlar yok; siluetler farklılaştırılır.
Tahmin: ucuz (kod odaklı), ama **eski sprite boru hattı** iptal edilir.

---

## 6. Mevcut dokümanlarda ne değişir (listele, değiştirme)

| Belge | Etkilenen kısım | Yeniden açılacak karar |
|---|---|---|
| `CLAUDE.md` | "What this is", "Decided", "Open", Skaledman çerçevesi | Proje kimliği, kimlik/hand-off Skaledman bağı |
| `AGENTS.md` | Proje özeti | Eşzamanlı güncelleme |
| `docs/design/oyun-konsepti.md` | § 1-3 (kart→dövüşçü), § 6, § 11, § 12 | Kart verisi → parça/çekirdek verisi; HP formülü → stamina; tip tablosu (18×18) → 4 tip + 6 element; hamle aileleri → yetenek aileleri |
| `docs/art/fusion-animasyon.md` | Tamamı | K-5 (8 yönlü sprite) |
| `docs/tech/mimari.md` | § 2 (`veri/` Skaledman snapshot), § 3b, Kick/Skaledman senkron | Skaledman bağımlılığı (K-12/K-13), `veri/*.json` kaynağı |
| `docs/tech/skaledman-eklenti.md`, `veri-cekimi.md` | Tamamı | Hand-off token, sync |
| `docs/production/roadmap.md` | K-kararları: K-5, K-7 (kontrol), K-12, K-13, K-1x (kart/IP) | Bkz. yukarı |
| `docs/design/arenalar/iskeletler-diyari.md` | Tema | Yeniden temalanır |
| `docs/tech/adr/ADR-003-kontroller.md` | Kontrol ADR'si | Anlam kaydı (şema aynı) |
| `README.md`, `CONTRIBUTING.md`, `docs/tanitim/paylasim.md` | Proje anlatımı, "fan project" ibaresi | "Orijinal IP" |
Not: `src/paylasilan/kurallar/` tabloları kodda; `tuning.md` ile **sessiz sapma** olmamalı (rolüm). Yeni sim için `tuning.md` baştan yazılır.
