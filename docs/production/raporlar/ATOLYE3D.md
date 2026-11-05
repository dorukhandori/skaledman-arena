# ATOLYE3D: Atölye, referans 03 ve gerçek zamanlı 3B patlatılmış topaç

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Sahip talimatı:** "Atölye'de topacımın her parçasını 3D olarak ayrı ayrı görüp bakmak istiyorum."
**Görüntüler:** `docs/production/raporlar/ekran/ATOLYE3D-*.png` (1280×720 DPR 2; `*-1080p` 1920×1080 DPR 1) · kıyas: `ATOLYE3D-kiyas-03.png`.

## 1. Ne yapıldı

Atölye artık referans 03'ün düzenini izliyor. Ekranın kalbi gerçek zamanlı 3B patlatılmış topaç.

| Alan | Referans 03 | Bugün |
|---|---|---|
| Üst | ◄ ATÖLYE, kırmızı X | "◄ ATÖLYE" plakası (◄ süs: Atölye ana ekran, geri hedefi yok). AYARLAR · DAHA FAZLA · ÇIKIŞ · Altın yuvası lentoda kaldı |
| Sol | 4 ikonlu sekme, 4 sütunlu ikon ızgarası, turuncu çerçeve | ÇEKİRDEK / GÖVDE / DİSK / UÇ sekmeleri; sekme ikonu topaçta takılı parça. 4 sütunlu ızgara: 3B tek kare ikon + kısa ad. Durum rozetleri: fiyat, kilit + ilerleme, ???. Seçili topaçtaki parçada turuncu çerçeve + altın köşe, diğer topaçtakinde numara rozeti. Tek FİLTRE düğmesi |
| Orta | blueprint, ad + element, patlatılmış 4 katman, etiket + turuncu çizgi | Blueprint ızgara ve yordamsal hayalet çizimler. "1. KAYA MADEN" + element simgesi. **three.js** ile Çekirdek, Gövde, Disk ve Uç dikey ayrık çiziliyor; solda etiket ve turuncu bağlantı çizgisi, sağda çubuklara giden çizgi |
| Sağ-orta | 8 çubuk | 6 çubuk (Saldırı, Savunma, Ağırlık, Stamina, Hız, Sağlamlık): turuncu dolgu, değer, ± fark. Altında tip ve tek satır element uyumu |
| En sağ | TAKIM: 3 kart (simge, ad, mini topaç, mini çubuklar), ▼ | TAKIM + "TAKIM 1 ▾" menüsü. 3 kart: element simgesi, ad, **3B mini topaç**, SAL/SAV/STA mini çubukları, ▲▼ ve sürükle-bırak, seçili kartta turuncu çerçeve. TAKIM ULTİSİ rozeti yalnız oluşunca çıkıyor |
| Alt | — | MARKET · BAŞARIMLAR · DENE · 30 SN · KAYDET ikincil, OYNA ana ve sabit. OYNA nedeni ve durum mesajı düğmelerin üstünde yüzüyor, tıklamayı engellemiyor |

İkinci kat değişmedi:
- **Ayrıntı:** Uç deseni, yön, Yapay yön seçimi, Dene rakibi, parça çıkar.
- **Takım menüsü:** ad, kayıtlı takımlar, Aktif yap, Yeni takım.
- **Daha fazla:** Günlük, Profil; Topaç Lab yalnız `?gelistir=1` ile.
- Geliştirme paneli yalnız `?gelistir=1` ile.

Envanter, takım, API ve Pergel mantığı korundu. Mevcut `data-*` seçicilerinin hepsi duruyor: `data-yuva` artık 3B katman etiketinde, `data-eylem=dene` alt şeritte.

### Kod
- `src/istemci/atolye3d/geometri.ts`: `topac_render.py`'nin kutupsal gövde ve torna kurucularının saf TS karşılığı. 27 parçanın hepsi `kaynak/topac/parcalar-3b.json`'dan kuruluyor: kanat lobu `n` (süpürme, tarak, sivri, kare, çentik), halkalar, sırtlar, fasetler, kubbeler, pah, bölgeler, Uç tornası, nervür. Sol dönüşte kiral parça aynalanıyor.
  - Köşe sayısı (indekssiz): Gövde 21 600, Disk 11 520, Çekirdek 5 400, Uç 1 728–2 880.
- `palet.ts`: sprite hattıyla aynı 5 tonlu sınıf rampaları. Gövde boyası takılı Çekirdeğin Element'i, Çekirdek çerçevesi Köken rengi, Disk ve Uç metal.
- `Goruntuleyici.ts`: three.js, tembel yükleniyor.
  - Ortografik kamera; sol-üstte sabit ışık (görüş uzayında).
  - 4 kademe toon ShaderMaterial.
  - Alfa kanalında katman kimliği tutuluyor. İkinci geçişte 1 px koyu siluet ve katmanlar arası kontur, vurgulu/odaktaki katmana turuncu halka çiziliyor.
  - **Pixel:** sahne, UI mantıksal pikseli çözünürlüğünde çiziliyor (orta alan yaklaşık 170×240). CSS'te `image-rendering: pixelated` ile tam sayı `--o` katına büyüyor; UI ile aynı piksel ızgarası.
  - İkon ve mini topaç aynı hattan tek kare olarak üretiliyor ve önbellekte tutuluyor.
- `durum.ts`: saf görünüm durum makinesi (patlatılmış / birleşik / odak, açılar, klavye) ve patlatılmış düzen. Katmanlar her kamera eğiminde ekranda değmeyecek şekilde aralanıyor. Okunurluk için patlatılmış görünümde Çekirdek ×1,6, Uç ×1,3; birleşikte gerçek ölçü.
- `AtolyeSahnesi.ts`: three.js'siz DOM ve etkileşim katmanı. Etiketler, çizgiler, araç düğmeleri ve ekran okuyucu listesi burada; çizeri tembel yüklüyor, gerekirse yedeğe düşüyor.
- `Yedek2B.ts`: WebGL yoksa ya da bağlam kaybolursa topaç atlasının (`public/topac/**`) keskin karelerinden 2B patlatılmış yığın. Etiketler aynı; `?webgl=0` yedeği zorluyor.
- `tipler.ts` + `veri/topac-model.json`: GLB kancası (§ 6).

## 2. Etkileşim listesi

| Eylem | Fare / dokunma | Klavye |
|---|---|---|
| Döndür | Tuvalde sürükle. Yatay serbest; dikey 8°–72° | Görünümde ←/→ 15°, ↑/↓ 8° (sınırlı) |
| Katmanı incele (odak) | Katmana ya da etiketine tıkla. Parça büyüyüp ortaya geliyor, diğerleri soluklaşıp geri çekiliyor, turuncu halka çıkıyor. Envanter o türün sekmesine geçiyor; çubuk sütununda **parça kartı** açılıyor: ad, tür, kanat/çıkıntı/desen, element, tip, Takılı/fiyat/kilit, 6 çubuğa katkı. Odaktaki parça kendi açısıyla dönüyor | Tab ile etiketlere, Enter seçer |
| Geri | ◄ GERİ ya da boşluğa tıkla | Esc |
| Birleştir / ayır | BİRLEŞTİR / AYIR düğmesi (0,6 sn geçiş) | B |
| Canlı önizleme | Envanterde parçanın üstüne gel: eski parça yana uçup çıkıyor, yenisi yukarıdan iniyor. Çubuklar önizleme değeri ve şimdiki topaca göre ± fark gösteriyor; etiket yeşile dönüyor | Parçaya Tab/ok ile odaklan |
| Uygula | Tıkla = mevcut "tak" işlemi (önizlemeden geldiyse ikinci kez animasyon oynamıyor) | Enter |
| Parça çıkar | Ayrıntı › çıkar | Etikette Delete |
| Boşta dönme | Etkileşimden 2,5 sn sonra yavaş dönüş ve sallanma | — |

- **Azaltılmış hareket:** `prefers-reduced-motion` açıksa (CSS `--kare: 0`) boşta dönme, sallanma ve geçişler kapanıyor; sahne yalnız değişince çiziliyor.
- **ARIA:** görünüm `role=group` + kullanım talimatı. Tuval `role=img` ve tüm parçaları sayan etiket taşıyor. Katman etiketleri `aria-pressed` kullanıyor. Ekran okuyucu için gizli parça listesi var; parça kartı `role=region`.
- **Gizli parça (???)** önizlenmiyor.

## 3. Ölçümler

| Ölçüm | Değer |
|---|---|
| Ana paket `index-*.js` | Önce (`d9921e8`) 358,33 KB / gzip 103,53 KB, sonra 356,98 KB / gzip 102,98 KB. **Büyümedi**; three ana pakete girmiyor (küçük fark paralel oturumun değişikliklerinden) |
| Tembel `Goruntuleyici-*.js` (three dahil) | 581,93 KB / **gzip 147,20 KB** (hedef ≤ ~700 KB gzip) |
| Tembel `GLTFLoader-*.js` | 45,19 KB / gzip 13,47 KB. Yalnız `glb` listesi doluysa iniyor (bugün inmiyor) |
| `Atolye-*.js` | 60,79 → 97,88 KB (gzip 19,06 → 30,05); geometri ve yedek kodu dahil |
| 3B sahne kare CPU işi (headless Chromium + SwiftShader, `update` + çizim gönderimi) | 1280×720 DPR 2: p50 0,10 ms, **p95 0,20 ms**, en çok 0,6 ms (600 kare). 1920×1080: p50 0,20 ms, **p95 0,30 ms**. Bütçe 16,7 ms. GPU raster bu ölçüme dahil değil |
| Konsol hatası | 0. Ekran betikleri: WebGL, yedek ve 1080p |
| `three` | 0.186.1 (MIT, `--save-exact`); `@types/three` 0.186.0 (geliştirme) |

## 4. Doğrulama
- `npm test`: 22 dosya, **456 test geçti**. Yeni `test/atolye3d.test.ts` (37) şunları sınıyor:
  - 27 parçanın her biri için iki yönde geometri: sonlu, ≤ 40 000 köşe, birim normal, ölçü sınırları, dışa bakan üst yüz;
  - kanat `n` = katalog `kanat`, aynalama;
  - palet;
  - katman sırası ve etiketleri;
  - patlatılmış katmanların üç eğimde de ekranda ayrık kalması;
  - odak/klavye durum makinesi;
  - GLB listesi boşken istek atılmaması, yüklenince GLB, hata verince parametrik yedek.
- `npm run lint`, `npm run typecheck`, `npm run build`: yeşil.
- `npm run test:tarayici`: Node ve Chromium bit bit aynı; altın hash'ler değişmedi, sim'e dokunulmadı.
- `araclar/d6-akis.ts`: uçtan uca geçti. `konsolHatalari: []`; ham listede yalnız beklenen 409 (ad değiştirme 30 gün kuralı). Akışta şunlar çalıştı: Uç değişimi (çubuk önce/sonra), uyumsuzluk uyarısı, Dene → Atölye taslak koruma, çakışma uyarısı, sürükle-bırak + klavye sırası, kaydet, yeni takım, Yapay yön, Günlük, oda kodu maçı. Betik değiştirilmedi.
- d7'nin `[data-parca=parlak-disk]` seçicisi ızgarada aynı kaldı.

## 5. Referans 03 uyum puanı: **4,5 / 5** (GU-A § 4.3'te 4'tü)

**Kalan farklar:**
1. **Parça ayrıntısı:** referanstaki parçalar elle çizilmiş, girintili ve parlak metal ayrıntılı. Bizimkiler parametrik ve yalın. Mac hattının GLB'leri gelince (§ 6) aynı görüntüleyici onları çizecek.
2. **Kırmızı X yok.** Atölye ana ekran (ux § 3.2). Yerinde ÇIKIŞ ve DAHA FAZLA duruyor.
3. **8 çubuk yerine 6** (tide C-1 kararı). Takım kartı mini çubukları 3 tane (SAL/SAV/STA); referansta HIZ/GÜÇ/AT ve sayı sütunu var.
4. **Izgara doluluğu:** referansta 5 satır var. Bizde sekme başına 5–8 parça, alt kısım boş kalıyor. → **Çözüldü (TEMIZLIK #7b):** 5 satıra soluk yer tutucu + "Market'ten al" ipucu hücresi.
5. **◄ ve "geri" anlamı:** ◄ süs. Atölye'den geri gidilecek ekran yok.
6. **Birleşik görünümde etiketler** üst üste binmesin diye en az 15 px aralıkla itiliyor; çizgiler katmanın tam hizasına değil yakınına iniyor. → **Çözüldü (TEMIZLIK #7a):** dirsekli çizgi katman hizasına iner.
7. **Yedek görünüm** atlas karelerini ×1 ölçekte çiziyor (alana sığdırma); WebGL görünümünden küçük. → **Çözüldü (TEMIZLIK #7c):** WebGL boyuna en yakın tam sayı ölçek.

## 6. GLB yükleme sözleşmesi (Mac hattı)

1. **Yol:** `public/topac/model/<parcaId>.glb`. `parcaId`, `veri/parcalar.json` kimliği (ör. `ok-govde`).
2. **Liste:** kimlik `veri/topac-model.json` `glb` dizisine eklenir. Listede olmayan parça için istek atılmaz; 404 ve konsol hatası olmaz.
3. **Eksen:** glTF standardı Y yukarı. Kök (0,0,0) dönme ekseninde; Uç'ta temas ucunda, diğer parçalarda parçanın kendi tabanında.
4. **Ölçek:** 1 birim = topaç birimi (Gövde dış yarıçapı ~32). Yükleyici yine de normalleştirir: yatay yarıçapı parametrik modelinkine eşitler, tabanı parametrik `zAlt`'a oturtur, x/z'de ortalar. Bu yüzden ölçek ve kök hatası görüntüyü bozmaz.
5. **Yön:** sağ dönüş için modellenir (kanat süpürmesi saat yönünde). Sol dönüş varyantı bugün parametrik aynayla karşılanıyor; GLB'de ayrı sol dosya `<parcaId>-l.glb` önerilir (henüz okunmuyor, sahip kararı).
6. **Katman ve malzeme adlandırması:** her mesh'in malzeme adı bir sınıf adıdır: `boya` (Element boyası), `boya2`, `metal`, `koyu`, `altin`, `kubbe`, `cerceve` (Köken), `lastik`, `beyaz`. Bilinmeyen adda türün ana sınıfı kullanılır: Gövde `boya`, Disk `metal`, Uç `koyu`, Çekirdek `cerceve`. Doku ve renk kullanılmaz; toon gölgeleme ve palet çalışma zamanında uygulanır, aynı GLB 6 Element'e boyanır.
7. **Bütçe:** parça başına ≤ 20 000 üçgen önerilir, normaller dahil; yoksa hesaplanır. Draco ve meshopt kullanılmasın (çözücü yüklenmiyor).
8. **Yedek:** yükleme başarısızsa parça parametrik kalır.

Not: `docs/art/topac-uretim-istegi.md` § 5'e tek satır eklendi.

## 7. Varsayımlar
- "Sekiz çubuk (biz 6)" talimatına uyuldu; çubuk listesi ve sırası `CUBUK_SIRA`'dan geliyor.
- Gövde boyası seçili topacın Çekirdek Element'i (pixel planı § 2.3 ve maçtaki `TopacYandan` ile aynı). Ödünç yuvada ödünç seti çiziliyor.
- Parça kartındaki "6 çubuk katkısı" parçanın ham `katki` değerleri: saldırı, savunma, kütle, stamina havuzu, Uç ivmesi, burst eşiği. Çubuklar katalog en büyüğüne göre ölçekleniyor.
- Izgara ikonları 3B görüntüleyiciden tek kare olarak üretiliyor. `public/topac/ikon-48.png` Çekirdek ikonlarında üstten kırpık olduğu için kullanılmadı. WebGL yoksa yordamsal pixel ikon kullanılıyor.
- Hover önizlemesi `pointerenter` ve `focus` ile açılıyor; tak işlemi yine tıklamayla. Böylece d6/d7 betikleri değişmeden çalışıyor.
- DENE ve KAYDET alt şeride taşındı. Kaydet takım panelinde sığmıyordu; d6 onu doğrudan tıklıyor.

## 8. Sahip kararı bekleyenler
1. **Kırmızı X:** Atölye'de bir anlamı olsun mu (ör. Çıkış onayı)? Yoksa referans dışı kalsın mı?
2. **Patlatılmış görünümdeki büyütme** (Çekirdek ×1,6, Uç ×1,3): okunurluk mu, gerçek oran mı?
3. **GLB sol dönüş:** ayrı dosya mı (`-l.glb`), parametrik ayna mı?
4. **Takım kartı mini çubukları:** SAL/SAV/STA mı, başka üçlü mü (referans: HIZ/GÜÇ/AT)?
5. **Parça kartı:** kilitli/Market parçasına odakta "Market'te aç" düğmesi eklensin mi? Bugün yalnız durum metni var.
