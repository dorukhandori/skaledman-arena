# 11 · Araştırma: craft, market ve ilerleme

**Tarih:** 2026-11-06
**Yöntem:** Web araması ve sayfa okuma (WebSearch + WebFetch). Okuyabildiğimiz birincil ve wiki kaynaklarını tercih ettik (uo.com, OSRS Wiki, Warframe Wiki, Slay the Spire Wiki, Lost Garden, Game Developer). Bazı sayfalar 403 döndü (uoguide.com, Albion wiki, Stratics); bunlar için yalnız arama özetini kullandık ve tabloda **(özet)** diye işaretledik.
**Uyarı:** Kaynak özetleri bizim okumamızdır. Topluluk wiki'lerindeki sayılar resmî olmayabilir, sürüm farkı olabilir. Burada yalnız **mekanikler** alındı. UO cevher adları, eşya adları ya da görselleri Devran önerilerine taşınmadı.
**Bağlayıcı kararlar (değişmez):** G-0 güç eşit (00 § 2), gerçek para yok, reklam yok, S1 kolay öğrenilir, S2 sade. Bu belge bu kararları sorgulamaz. Çatışmaları § 9'da işaretler.
**Kapsanmadı:** Minecraft ve Terraria kademe ilerlemesine ayrıca bakmadık. Bu oyunlar da OSRS ve Monster Hunter gibi "kademe = güç" modelini kullanır. Sonuç olarak § 9-Ç1 bunları da kapsar.

---

## 1. Kaynak tablosu

| # | Kaynak (başlık + URL) | Ne öğrendik | Devran'a etkisi |
|---|---|---|---|
| 1 | UO Wiki · Mining — https://uo.com/wiki/ultima-online-wiki/skills/mining/ | 9 cevher; eşikler 0/65/70/75/80/85/90/95/99. Asgari eşikte renkli damar şansı %50, eşik+25'te %100. Damar her yeniden doğuşta türünü rastgele değiştirebilir. | **Uyarlama:** "Eşikte %50, eşik+25'te tavan" penceresi bizim %50→%95 eğrimizle aynı yapıda. Pencere genişliğini 25 tutalım. |
| 2 | UO · Guaranteed Gain System / Rate Over Time — https://uo.com/?p=6342 | GGS: başarılı kullanımlardan sonra süre dolunca kesin +0.1 kazanç verir; amaç "seyrek oynayan" ve "şanssız" oyuncu. RoT: 70 üstünde sabit aralık (5/8/12/15 dk) ve günlük sıfırlanma. | **Uyarlama:** Bir "kötü şans koruması" ekleyelim (§ 5.3). Saat tabanlı kazanç **ret**: arka planda zamanlayıcı S2'ye aykırı. |
| 3 | UO Tavern · Skill Gain — https://www.uotavern.com/wiki/mechanics/skill-gain/ | Başarı = (değer − min)/(max − min). Eşiğin altında kesin başarısızlık var, kazanç yok; max'ın üstünde "meydan okuma yok", kazanç yok. Kazanç zarı başarısızlıkta da atılır. Kazanç şansı, kalan pay ile birlikte düşer. 10'un altında her kullanımda kazanç olur. | **Kabul:** Iskada da yarım tecrübe kalsın. İlk seviyeler hızlı aksın (adım 20–30). Öğrenme bandı UO'dakinden yumuşak kalsın; ×0.1'de bile sıfır değil. |
| 4 | UO · Publish 04 (Mart 2000) — https://uo.com/wiki/ultima-online-wiki/technical/previous-publishes/2000-2/2000-publish-04-8th-march/ | Hedef: makro "normal oyundan daha iyi kazanç vermemeli". Çoğu yetenek farklı hedef ister. Günün ilk saatinde kazanç şansı daha yüksek ("power hour"). | **Uyarlama:** "Günün ilk N vuruşu daha verimli" UO'da da ödül olarak çerçevelendi. Bizim 40 tam + 20 yarım vuruş bunun karşılığı. Damarı her gün döndürmek (farklı hedef) makroyu zayıflatır. |
| 5 | UOGuide · Maker's Mark (özet) — https://uoguide.com/Makers_mark | İmza isteğe bağlıdır, aç-kapa düğmesiyle konur. İmzalamak için 100.0 ustalık gerekir. Her eşyaya konmaz. | **Uyarlama:** Damga isteğe bağlı olsun. Usta damgası yüksek eşik ister ama temel isim damgası herkese açık olsun (§ 6). |
| 6 | UO Wiki (Stratics) arama sonucu · runic çekiç + exceptional (özet) — https://wiki.ultimacodex.com/wiki/Blacksmithy | UO'da "exceptional" ve özel çekiç **hasar** ekler (+4, +9). | **Ret:** Usta işi yalnız görünüm ve rozet verir (G-0). |
| 7 | OSRS Wiki · Grand Exchange — https://oldschool.runescape.wiki/w/Grand_Exchange | Alım sınırı 4 saatte bir sıfırlanır. %2 vergi (önce %1'di, 2025'te %2 oldu) paranın çoğunu yok eder. Yeni F2P hesaplar cevher, kütük ve rün **satamaz**, çünkü bunlar en çok botlanan mallar. | **Kabul:** Cevher ve külçe Market'te satılmasın (zaten 06 § kapalı kurallar). Oyuncular arası takas ileride gelirse hesap yaşı kapısı konsun. |
| 8 | OSRS Wiki · Money sink — https://oldschool.runescape.wiki/w/Money_sink | Para sürekli doğduğu için gider şart; yoksa enflasyon olur. Giderler: tamir, geçiş ücreti, ölüm ücreti, büyük prestij gideri (100M+). | **Uyarlama:** Altın gideri olarak dövme işçiliği ve kozmetik vitrin kullanılsın. Kayıp ya da tamir türü giderler **ret** (güç eşit, kayıp yok). |
| 9 | OSRS Wiki · Smithing — https://oldschool.runescape.wiki/w/Smithing | Metal kademeleri sırasıyla 1/15/30/50/70/85 seviye ister. Bitmiş eşyanın çoğu, malzemesinden **ucuza** satılır, yani dövmek para kaybettirir. Oyuncu bunu tecrübe için yapar. | **Uyarlama:** Craft tecrübe ve prestij için yapılır. Fiyat farkı ise Market'i pahalı tutarak sağlanır (§ 3). |
| 10 | OSRS Wiki · Bots — https://oldschool.runescape.wiki/w/Bots | Botlar madencilik, odun ve balık gibi tekrarlı işleri hedefler. İşaretleri: tek yetenek, tekrarlı hareket. Serbest takas 2007'de kaldırıldı (botlar azaldı ama tartışmalı oldu), 2011'de geri geldi. | **Kabul:** Bot değeri düşük tutulsun (satılamaz ürün, günlük sınır, gerçek para yok). Davranış sinyalleri kaydedilsin (§ 7). |
| 11 | PC Gamer · RuneScape bot nuke (özet) — https://www.pcgamer.com/runescape-bot-nuking-event-bans-1-5-million-bots-in-one-day/ | 2011'de bir günde 1,5 milyon bot yasaklandı. Jagex %98 azalma iddia etti. Kalıcı otomatik tespit sistemi kuruldu. | **Uyarlama:** Tek seferlik temizlik yetmez. Sürekli ve sunucu tarafı istatistik gerekir. |
| 12 | Lost Garden · Value chains (Daniel Cook) — https://lostgarden.com/2021/12/12/value-chains/ | Her zincir bir **çapa** ile biter (yeterlik, kendini ifade, statü). Çapa yoksa önceki adımlar anlamsızlaşır. Kaynak tipleri: trickle, grind, capped. Giderler kaynaklardan biraz büyük olmalı ("gergin" zincir). Tekrar bıkkınlık yaratır. Hafif kıtlık motive eder, uzun bolluk körelir. Çapanın yolu erken görünmeli. | **Kabul:** Çapamız prestij (vitrin, damga, seri no). Bu yüzden ilk 15 dk içinde vitrin gösterilsin. Günlük sınır "hafif kıtlık" aracıdır. |
| 13 | Game Developer · Machinations (E. Adams) — https://gamedeveloper.com/design/the-designer-s-notebook-machinations-a-new-way-to-design-game-mechanics | Kaynak, gider, dönüştürücü ve geri besleme döngüleri. Eşik tabanlı negatif döngüler (depo dolunca dur) stoku sınırlar. Yapay oyuncu ile simülasyon yapılabilir. | **Kabul:** sim (`sim-cikti-*.md`) gibi yapay oyuncu profilleriyle "craft/Market oranı" test edilsin (§ 10). |
| 14 | Warframe Wiki · Crafting — https://wiki.warframe.com/w/Crafting | Dökümhane gerçek zamanlı çalışır (bileşen 12 sa, çerçeve 3 gün). Platin ile anında bitirilebilir. Hızlandırma bedeli %50 ilerlemeden sonra doğrusal düşer. | **Uyarlama:** "Zaman mı, Altın mı" seçimi dürüstçe gösterilsin. Gerçek parayla hızlandırma **ret**. Bekleme sayacı yok, süre kazı ve maçla dolar. |
| 15 | Warframe forum · hızlandırma maliyeti şikâyetleri (özet) — https://forums.warframe.com/topic/89207-rush-build-price-is-too-high | Oyuncular, hızlandırmanın hazır eşyayı almaktan **pahalı** olduğunu bulunca bunu hile gibi algıladı. | **Kabul:** Fiyat tutarlılığı kuralı: Market fiyatı her parça ailesinde kademeyle tekdüze artsın, gizli ucuz yol olmasın (§ 3). |
| 16 | Albion · Kara Pazar ve tam yağma (özet) — https://massivelyop.com/?p=105879 , https://mein-mmo.de/en/albion-online-der-schwarzmarkt,149214/ | Ekonomi oyuncu craft'ına dayanır. PvP ölümünde eşyanın bir kısmı yok olur (topluluk %30 diyor). Kara pazar bazı eşyaları "kaybederek" gider yaratır. Dayanıklılık gideri sevilmez. | **Ret:** Kayıp ve yok olma güç eşit modelinde gereksiz, cezalandırıcı. Craft'a talep kayıpla değil, pahalı Market ve prestijle yaratılsın. |
| 17 | Path of Exile · craft = para (saschb2b analizi) — https://saschb2b.github.io/game-mechanics/games/path-of-exile/crafting-and-currency | Para olan kürelerin craft'ta harcanması kendiliğinden gider olur. Harvest'in fazla deterministik craft'ı zenginliği üst %1'de topladı ve kısıldı. | **Uyarlama:** Dövme Altın (işçilik) yaksın. Deterministik craft tamam, çünkü güç yok ve zenginleşme riski yok. Ama prestij nadirliği (seri no) kıt kalsın. |
| 18 | Psychology of Games · WoW rest sistemi çerçevesi — https://www.psychologyofgames.com/2010/03/framing-and-world-of-warcrafts-rest-system/ | Aynı matematik "yorgunluk cezası" (%50) olarak sunulunca nefret edildi, "dinlenme bonusu" (%200→%100) olarak sunulunca sevildi. Hedef 12 saat yerine yaklaşık 2 saatlik oturumdu. | **Kabul:** 40 tam + 20 yarım vuruşu "**Dinç vuruş**" bonusu olarak göster. "Hakkın bitti" dili kullanılmasın (§ 4). |
| 19 | Game Developer · Disney enerji sistemini kaldırdı — https://gamedeveloper.com/business/disney-removes-energy-system-from-i-where-s-my-water-i-following-complaints | "1 saat bekle ya da öde" kilidi şikâyet üzerine kaldırıldı. | **Kabul:** Günlük sınır hiçbir zaman oyunu **durdurmaz**. Maç, harita ve Atölye sınırsız açık kalır, yalnız kazı verimi düşer. |
| 20 | PC Gamer · Genshin Resin (özet) — https://pcgamer.com/genshin-impact-resin-patch-changes | Tavanı 120→160 yükseltmek şikâyeti bitirmedi. Asıl sorun dolum hızı ve "dakikalar içinde bitti" hissiydi. | **Uyarlama:** Sınır oturumu en az 8–10 dk doldurmalı. 40 vuruş × ~3 sn ≈ 2 dk çok kısa; vuruşlar düğümlere ve maçlara yayılsın (§ 4). |
| 21 | Battlefield 6 günlük XP tavanı tepkisi (özet) — https://gaminghq.eu/2025/11/09/battlefield-6-daily-xp-cap-backlash | **Gizli** sert tavan, keşfedilince tepki çekti. Çift XP haftasonu ile çakışınca tepki büyüdü. | **Kabul:** Sınır hep görünür olsun. Etkinlik bonusları sınırla çelişmesin. |
| 22 | Slay the Spire Wiki · Map Generation — https://slaythespire.wiki.gg/wiki/Map_Generation | 17 kat, katta ≤6 düğüm, düğüm başına 1–3 bağlantı. Oranlar: savaş %53, elit %8, dinlenme %12, tüccar %5, bilinmeyen %22. Sabit katlar: 1 kolay savaş, 9 hazine, 15 dinlenme, 16 boss. | **Uyarlama:** Bölge başına 1 sandık ve boss öncesi 1 "güvenli" düğüm sabit olsun. Maden düğümü oranı yaklaşık %20–25. |
| 23 | saschb2b · dallanan DAG harita (özet) — https://saschb2b.github.io/game-mechanics/concepts/branching-dag-map | Bir düğüm türü hep en iyiyse harita tek karara iner. Gerçek ödünleşim gerekir. | **Kabul:** Maden ile dövüş düğümü farklı şey verir (cevher ↔ Altın/yıldız). Hiçbiri baskın olmamalı. |
| 24 | Hades meta ilerleme analizi (özet) — https://saschb2b.github.io/game-mechanics/games/hades/meta-progression | Kalıcı yükseltmelerin çoğu ham sayı değil oynanış değiştirir. Sıfırlama seçeneği vardır. | **Ret (güç kısmı):** Devran'da kalıcı güç yok. "Kalıcı ama güç dışı" ilerleme için örnek alınsın. |
| 25 | Animal Crossing NH · kaya numarası (özet) — https://www.nintendolife.com/guides/animal-crossing-new-horizons-rock-trick-how-to-get-8-things-from-rocks-clay-stones-bells-and-rock-respawns | Kayaya hızlıca 8 kez vurulur. Geri itilmeyi önleme, hız ve günde 1 kaya ile tek-tuş mini etkileşim tasarımı sevildi. | **Kabul:** Kazı = birkaç hızlı dokunuş + sunucu zarı. Günlük yeniden doğuş modeli bizimkine uyar. |
| 26 | IdleOn Steam tartışması · beceri mini oyunu (özet) — https://steamcommunity.com/app/1476970/discussions/0/3167694551647775610 | Ödülü kilitleyen beceri mini oyunu sinir bozdu ve oyuncuyu otomatik tıklayıcıya itti. | **Uyarlama:** İsabet halkası ödülü **kilitlemesin**, yalnız küçük bonus versin (≤ +15 puan). |
| 27 | Castronova · Virtual Worlds (CESifo WP 618) (özet) — https://www.cesifo.org/DocDL/cesifo_wp618.pdf | Sanal ekonomiler gerçek parayla ölçülebilir hâle gelince (eBay satışları) RMT ve enflasyon gerçek sorun olur. EQ2'de 5 ayda %50+ enflasyon görüldü. | **Kabul:** Gerçek para yokluğu en güçlü anti-bot ve anti-enflasyon aracıdır. Takas yoksa RMT de yoktur. |
| 28 | Zagal vd. karanlık desenler üzerine çalışma (arXiv 2412.05039) (özet) — https://arxiv.org/html/2412.05039v1 | Üç aile var: zamansal (grind, süreli etkinlik), parasal (gizli maliyet, sahte para, öde-geç), sosyal. | **Kabul:** § 8'deki etik kontrol listesi. |
| 29 | Game Developer · Belçika loot box kararı (özet) — https://gamedeveloper.com/business/belgian-gaming-commission-declares-loot-boxes-illegal | 2018'de Belçika ve Hollanda ücretli loot box'ları kumar saydı. | **Kabul:** Sandık parayla alınmaz. Olasılıklar görünür olsun (§ 8). |
| 30 | Monster Hunter Wiki · silah ağacı (özet) — https://www.monsterhunterwiki.org/wiki/MHi/Great_Sword_Tree | Parça tabanlı dallanan yükseltme ağacı var. En nadir malzeme listenin altındadır ve tekrar avlanarak elde edilir. | **Uyarlama:** Tarif kartında "en nadir malzeme" en altta, vurgulu olsun. Ağaç güce değil görünüme dallansın. |
| 31 | Stardew günü uzunluğu (özet) — https://matthewomara.com/2016/03/17/how-long-is-a-day-in-stardew-valley | Bir oyun günü yaklaşık 12,6–14 dk sürer. Kayıt uykuya bağlı olduğu için "bir gün daha" döngüsü oluşur. | **Uyarlama:** Bir Devran "günü" (dinç vuruşlar + 2–3 maç) yaklaşık 10–15 dk olsun. Bitişte net bir "gün bitti" özeti gösterilsin. |

> Not: TF2'deki "craft number" (ilk üretilen eşyalara sıra no) fikrini wiki'de aradık ama ilgili bölümü okuyamadık (https://wiki.teamfortress.com/wiki/Craft_number). Bu yüzden § 6'daki seri no önerisi kaynağa değil kendi gerekçemize dayanıyor.

---

## 2. Çıkan dersler (kısa)

1. **Craft'ı itecek kaldıraç güç değil fiyat ve prestijdir.** OSRS'te dövülmüş eşya zarar ettirir ama oyuncu yine de döver (tecrübe ve çapa). Bizim çapamız vitrin, damga ve seri no.
2. **Sınır, ödül diliyle anlatılınca kabul görür** (WoW, UO power hour). Gizli ya da oyunu durduran sınırlar tepki çeker (BF6, Disney, Genshin).
3. **Makroya karşı en iyi araç değeri düşürmektir:** satılamaz ürün, gerçek para yok, günlük verim eğrisi. Tespit ancak ikinci savunmadır (OSRS, Castronova).
4. **Ustalık eğrisinde başarısızlık da öğretmeli.** Kolay iş öğretmemeli. Şanssızlık bir koruma ile tavanlanmalı (UO, GGS).
5. **Dürüstlük:** Zaman ile Altın arasındaki seçim tek ekranda, aynı birimle ("gün") gösterilmeli. Kademe atlayınca ucuzlayan gizli yol olmamalı (Warframe).

---

## 3. Önerilen Market çarpanları

Hedef: `T_market / T_craft ∈ [5, 10]`. Burada `T_market`, tipik oyuncunun o Altın'ı biriktirmesi için gereken gündür (yalnız maç ve harita geliri, 06'daki profil). `T_craft`, aynı parçayı Atölye'de yapma günüdür (cevher, eritme, dövme). Çarpan, bugünkü Market fiyatına uygulanır.

| Parça sınıfı (Market rafı) | Önerilen çarpan | Hedef `T_craft` | Ortaya çıkan `T_market` | Not |
|---|---|---|---|---|
| Başlangıç / açılmış parçalar | **×1, ücretsiz** | — | — | Sahip kararı. Hiç değişmez. |
| Yaygın | **×4–×5** | 1 gün | 5–8 gün | İlk hafta oyuncu ikisini de dener. |
| Sağlam | **×6–×7** | 2–3 gün | 12–20 gün | |
| Nadir | **×8–×10** | 4–7 gün | 30–50 gün | |
| Seçkin / en üst raf | **×10–×12** | 7–10 gün | 50–75 gün | **Tavan ×12.** Bunun üstü "satılık değil" gibi algılanır ve Market dürüst kısayol olmaktan çıkar. |

**Kurallar:**
- **Tekdüzelik:** Bir aile içinde Market fiyatı kademeyle her zaman artar. Hiçbir Market yolu craft'tan **hızlı ve ucuz** olamaz (Warframe dersi).
- **Tavan:** Herhangi bir parça için `T_market ≤ 75 gün`. Sim'deki tipik oyuncuyla doğrulanır.
- Malzeme kademesi (K1…K8) Market fiyatını **etkilemez**. Market yalnız "standart" görünümlü parçayı satar. Kademeli görünüm ve damga yalnız Atölye'den gelir (prestij Market'te satılmaz).

---

## 4. Craft süresi hedefleri

| Kilometre taşı | Hedef | Gerekçe |
|---|---|---|
| İlk dövülmüş parça | **10–15 dk** (ilk oturum) | Lost Garden: çapa erken görünmeli. K1 cevher, tek tarif, yönlendirmeli. |
| İlk "Market'ten ucuz" anı | **1. gün** | Yaygın parçada Market ×4–×5, craft 1 gün sürer. Oyuncu farkı ilk gün görür. |
| Yaygın parça | ~1 gün (1 oturum) | |
| Sağlam parça | 2–3 gün | |
| Nadir parça | 4–7 gün | Haftalık hedef tek, okunur bir amaç olur. |
| Aynı parça K8 malzemeyle (prestij) | **4–6 hafta** | Ustalık 92'ye yaklaşık 33 gün (§ 5) + malzeme. Güç değil statü. |
| Ustalık 100 ("USTA" rozeti) | ~6–8 hafta | Sezon uzunluğuyla uyumlu. |

**"Craft ile ~N günde" gösterimi (örnek metinler):**
- `Sağlam Disk — Market: 9 600 Altın (≈ 16 gün kazanç) · Atölye: ≈ 2 gün · Cevherin %60'ı hazır`
- `Nadir Uç — Market: ≈ 41 gün · Atölye: ≈ 5 gün (Ustalık 40 gerekir, sende 33: ≈ 2 gün)`
- `K6 görünümlü Gövde — yalnız Atölye · ≈ 18 gün · Seri no tahmini: #0xx`
- Gün tahmini oyuncunun **son 7 günlük** ortalamasından hesaplanır (en az 1 maç/gün varsayılır). Yuvarlanır ve "≈" ile gösterilir. 1 günden kısa süre "bugün" diye yazılır.

---

## 5. Günlük sınır ve Ustalık eğrisi

### 5.1 Günlük sınırın çerçevesi (Dinç vuruş)

- Mevcut 40 tam + 20 yarım + 10 sayılan harita maçı **sayı olarak korunur**. Yalnız dil değişir:
  - 40 tam vuruş → **"Dinç vuruş: 40"** (bonus). Bitince metin: "Kazman dinlendi, yarın yine dinç. Bugün yarım verimle 20 vuruş daha var."
  - 60'tan sonra kazı kapanmaz. Ustalık tecrübesi ×0,1 olur, cevher yok. Metin "Damar yoruldu, yarın yenilenir." Böylece oyunu durduran kilit olmaz (Disney dersi).
  - Kullanılmayan "Dinç" hakkı **en fazla 1 gün** devretsin (tavan 80). Seyrek oynayan (UO GGS hedefi) cezalanmaz. Bot tarafında günlük değer artmaz. → **Sahip kararı gerekir (S2 riski, § 9-Ç5).**
- Sınır göstergesi her zaman görünür: maden ekranında "Dinç 23/40", harita şeridinde küçük ikon (BF6 dersi).
- Vuruşlar 3–6 maden düğümüne yayılsın (düğüm başına 6–8 vuruş, 01 § tablo). 40 dinç vuruş kabaca 6 düğüm ve 2–3 maçla 10–15 dk tutar (Genshin ve Stardew dersi).

### 5.2 Ustalık eğrisi: mevcut ile karşılaştırma

Mevcut: eşikler 0/10/25/40/55/70/82/92, `adim(L)=20+1,2L+0,03L²`, bant ×1/×0,5/×0,1 (fark 0–14/15–29/≥30), başarı %50→%95.

| Konu | UO (mekanik) | Devran mevcut | Öneri |
|---|---|---|---|
| Kademe eşik aralığı | Renkli cevherde 65–99 sıkışık; 0–65 tek tür | 8 kademe 0–92'ye yayılmış | **Koru.** Bizimki daha erken çeşit verir (S1). |
| Başarı penceresi | Eşikte %50, eşik+25'te %100 | %50→%95 | **Koru**, pencereyi fark 0→25'te doğrusal kur. Tavan %95: ıska ihtimali her zaman kalır ama azdır. |
| Iskada tecrübe | Var (bonussuz) | Yarım (5) | **Koru.** |
| Kolay iş öğretmez | Eşik+25 üstünde sıfır | ×0,1 (≥30) | **Koru.** Sıfır değil ×0,1 olması S1 için daha nazik. |
| İlk seviyeler | 10 altı her kullanımda kazanır | adım 20–33 | **Koru.** Yaklaşık 2–3 vuruşta 1 seviye. |
| Kötü şans koruması | GGS (zaman tabanlı) | yok | **Ekle:** 3 ardışık ıskadan sonra 4. vuruş kesin isabet. Bu sayı sunucuda tutulur ve ekranda gösterilmez. |
| Makro koruması | Aynı hedefte kazanç sınırı | Bant + günlük sınır | **Ekle:** Aynı düğüm günde en çok 8 vuruş versin. Zaten düğüm başına 6–8. |

**Tahmini ilerleme** (yalnız kazı, bant ×1, ~%75 başarı, 40 dinç ×1 + 20 × 0,5 → ≈ 437 tecrübe/gün; eritme ve dövme hariç, bant yavaşlaması hariç):

| Hedef | Kümülatif | ≈ Gün |
|---|---|---|
| 10 | 263 | 0,6 |
| 25 | 1 008 | 2,3 |
| 40 | 2 351 | 5,4 |
| 55 | 4 501 | 10,3 |
| 70 | 7 657 | 17,5 |
| 82 | 11 039 | 25,3 |
| 92 | 14 523 | 33,2 |
| 100 | 17 791 | 40,7 |

Değerlendirme: Eğri UO'nun "yüksekte yavaşlar" hissini verir. İlk hafta 40'a ulaşılabilir. Bu, Yaygın ve Sağlam craft hedefleriyle (§ 4) uyumlu, **değişiklik önermiyoruz.** Bant gerçekte yüksek seviyeleri yaklaşık %20–30 yavaşlatır. Sim (`sim-cikti-tam.md`) ile doğrulansın.

### 5.3 Kazı etkileşimi (mobil/tarayıcı)

- **Önerilen model:** Sonucu sunucu zarı belirler. Her vuruş tek dokunuştur (Animal Crossing modeli). İsabet halkası isteğe bağlı küçük bir bonus verir (≤ +15 puan başarı), ödülü kilitlemez (IdleOn dersi).
- **Zamanlayıcıyla bekleme** (Warframe tarzı) kazıda yok. Atölye'de de gerçek zaman sayacı yok (S2, karanlık desen riski).
- Vuruş arası en az ~0,6 sn olsun, sunucuda zorlanır. Halka hızı her vuruşta ±%15 oynasın (makro zorlaşır, insan fark etmez).

---

## 6. Usta damgası ve seri no

- **İsim damgası:** Atölye'de dövülen her parçaya isteğe bağlı olarak "Yapan: <oyuncu>" yazılır. Ustalık şartı yok. Aç-kapa düğmesi tarif ekranındadır (UO'da isteğe bağlı aç-kapa).
- **Usta damgası** (çerçeveli işaret): İşleme Ustalığı ≥ 82 ister. Ustalık 100'de "USTA" mührü gelir. Yalnız görünüm.
- **Seri no:** `<parça ailesi>-<malzeme kademesi>-#<sıra>`. Sıra, sunucu genelinde o aile ve kademe için artar. Sezonla sıfırlanmaz, sezon etiketi ayrıca eklenir (`S1`). İlk 100'e küçük bir "ilk yüz" kenarlığı verilir. Daha fazla katman yok (S2).
- **Vitrin:** Profilde 3 yuva. Parçanın kademe rengi, damga, seri no ve yapım tarihi görünür. Maç öncesi rakip kartında 1 vitrin parçası gösterilir (statü çapası; Lost Garden).
- **Yarış etkisi:** Açılışta düşük seri no yarışı olur, bu kabul edilir. Seri no güç vermediği için adalet sorunu doğurmaz.
- **Market'te prestij yok:** Damgalı ya da seri numaralı parça satın alınamaz (takas yok). Prestij ancak emekle kazanılır.

---

## 7. Anti-bot önlemleri

1. **Değeri sıfırla:** Cevher, külçe ve damgalı parça satılamaz ve takas edilemez. Gerçek para yok (OSRS F2P kısıtı, Castronova).
2. **Verim eğrisi:** 40 dinç → 20 yarım → ×0,1. 24 saat çalışan bir bot, 15 dk oynayan oyuncudan en fazla yaklaşık %10 fazla tecrübe toplar.
3. **Sunucu yetkili zar:** Başarı, cevher türü ve kötü şans sayacı yalnız sunucudadır. İstemci yalnız "vurdum" der.
4. **Hız sınırı:** Vuruş arası ≥ 0,6 sn. Düğüm başına günde ≤ 8 vuruş. Saatlik toplam istek tavanı vardır.
5. **Davranış sinyalleri** (yalnız kayıt ve inceleme, otomatik ceza yok): vuruş aralığı varyansı çok düşükse, halka isabet zamanı her seferinde aynı ms'deyse, 7 gün boyunca 24 saate yayılan oturumlar varsa.
6. **Damar döndürme:** Maden düğümlerinin kademe ve cevher türü günlük tohumla değişir. Sabit rota scripti işe yaramaz (UO Publish 04: farklı hedef).
7. **Harita maçı:** Günde 10 sayılan maç. Bot rakipleri sunucuda simüle edilir, istemci sonucu kabul edilmez (08 ile uyumlu).

---

## 8. Yasal / etik

- **Loot box:** Gerçek para olmadığı için Belçika/Hollanda tipi kumar tanımına girmez. Yine de sandık düğümlerinin içerik **olasılıkları görünür** olsun. Sandık hiçbir para birimiyle satın alınamasın. "Bir sandık daha aç" teşviki olmasın.
- **Zamansal karanlık desenler** (Zagal): FOMO sayacı yok, kaçınca kaybolan günlük ödül yok, seri (streak) cezası yok. Dinç hakkının 1 günlük devri bu yüzden önerildi.
- **Parasal karanlık desenler:** Tek para birimi (Altın) kullanılır. Market fiyatının yanında her zaman "≈ gün" karşılığı gösterilir. Gizli maliyet yok. Gerçek parayla "öde-geç" yok.
- **Şeffaflık:** Günlük sınırlar, başarı yüzdesi ve öğrenme bandı ekranda yazılıdır (gizli tavan yok; BF6).
- **Çocuk oyuncular:** Sohbet ya da takas olmadığı için risk düşük. Seri no ve damgada yalnız oyuncu adı görünür, takma ad filtresi uygulanır.

---

## 9. Çelişkiler (bağlayıcı kararlarla)

| # | Bulgu | Çatıştığı karar | Öneri (varsayılan: bağlayıcı karar kalır) |
|---|---|---|---|
| Ç1 | OSRS, Monster Hunter, Minecraft/Terraria ve UO exceptional modellerinde craft'ın asıl çekiciliği **güç** ilerlemesi. | G-0 güç eşit | **Güç eşit kalır.** Risk: çapa zayıf kalabilir (Lost Garden). Azaltmak için vitrin + rakip kartında gösterim + seri no + kademe görünümü kullanılsın, ilk 15 dk'da çapa gösterilsin. 2. haftada "Atölye kullanım oranı < %30" ise prestij görünürlüğü artırılsın, güç asla eklenmesin. |
| Ç2 | Albion: craft talebini **eşya yok olması** besler. | G-0, S2 | **Ret.** Talebi pahalı Market ve prestij yaratır. Kayıp yok. |
| Ç3 | Warframe: zaman ile para seçimi gerçek parayla yapılır. | Gerçek para yok | **Ret.** Kısayol yalnız Altın'la, yani Market. Bekleme sayacı yok. |
| Ç4 | UO GGS ve RoT: zaman tabanlı kazanç. | S2 sade | **Ret.** Yerine ekranda görünmeyen basit "3 ıska → kesin isabet" kuralı. |
| Ç5 | WoW rested birikimi seyrek oyuncuyu korur. | S2 sade | **Uyarlama, sahibe sorulur:** en fazla 1 gün devir (tavan 80). Reddedilirse 40+20 sabit kalır, çerçeve dili yine "Dinç" olur. |
| Ç6 | Beceri mini oyunu (halka) ödülü kilitlerse oyuncuyu otomatik tıklayıcıya iter (IdleOn). | S1 kolay öğrenilir | Halka **bonus**, kilit değil (≤ +15 puan). Halkayı hiç vurmayan oyuncu da eşikte %50 başarı alır. |
| Ç7 | OSRS ve Albion vergileri ile alım sınırları oyuncu takasına dayanır. | Takas yok (Market NPC) | **Gerek yok.** Takas eklenirse hesap yaşı kapısı + %2–5 vergi yeniden değerlendirilir. |
| Ç8 | Market ×10–×12 çok pahalı görünürse "satılık değil" algısı oluşur (dürüst kısayol ilkesine aykırı). | Market dürüst kısayol | Tavan ×12 ve `T_market ≤ 75 gün`. Fiyatın yanında "≈ gün" gösterilsin. |

---

## 10. Sınama kriterleri (kod dilimlerine)

1. **Oran:** Sim'de tipik profil (10–15 dk/gün) için her Market parçasında `T_market / T_craft ∈ [5, 10]`. Hiçbir parçada `T_market > 75 gün` olmaz.
2. **Tekdüzelik:** `market.test` bir aile içinde fiyatın kademeyle kesin arttığını doğrular. Başlangıç ve açılmış parçaların fiyatı 0 kalır.
3. **İlk parça:** Yeni hesap betikli öğreticide ilk dövülmüş parçayı **≤ 15 dk** oyun süresinde alır (e2e zamanlama).
4. **Ustalık hızı:** Sim, tam dinç oynayan oyuncuda Ustalık 40'a 4–7 günde, 92'ye 30–45 günde ulaşıldığını gösterir.
5. **Başarı eğrisi:** fark=0 → %50 (±1), fark≥25 → %95. Eğri arada tekdüze artar (`ustalik.test`).
6. **Iska tecrübesi:** Başarısız vuruş başarılının tam yarısını verir (bant ve günlük çarpan dahil).
7. **Kötü şans:** 3 ardışık ıskadan sonraki vuruş %100 isabettir. Sayaç sunucuda tutulur, istemci yükü bunu değiştiremez.
8. **Günlük eğri:** 1–40. vuruş ×1, 41–60. ×0,5, 61+ cevher 0 ve tecrübe ×0,1. Kazı ekranı hiçbir durumda "kilitli" dönmez.
9. **Bot verimi:** 24 saat sürekli vuran sim botunun günlük tecrübesi, 60 vuruşluk insan profilinin ≤ %110'u kalır.
10. **Hız sınırı:** 0,6 sn'den sık vuruş isteği reddedilir (HTTP 429 ya da eşdeğeri). Düğüm başına günde 9. vuruş reddedilir.
11. **Görünürlük:** Maden ve harita ekranında dinç sayaç her zaman görünür (UI snapshot testi). Hiçbir sınır metni "ceza/yasak" sözcüğü içermez (metin lint).
12. **G-0:** Damga, seri no ve malzeme kademesi `veri/parcalar.json` `katki` değerlerini değiştirmez. Altın hash'ler sabit kalır (08 § 9).
13. **Seri no:** Eşzamanlı 100 dövme isteğinde sıra numaraları çakışmaz ve boşluk bırakmaz (atomik sayaç testi).
14. **Sandık:** Sandık içerik olasılıkları istemcide gösterilen değerle sunucu tablosunda birebir aynı (veri tutarlılık testi). Sandık için satın alma yolu yok.
15. **Gün tahmini:** "≈ N gün" metni son 7 günlük ortalamadan hesaplanır. Veri yoksa varsayılan profil kullanılır ve metin "tahmini" etiketi taşır.
