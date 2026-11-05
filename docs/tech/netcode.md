# Devran netcode (protokol 3, D4)

Kaynaklar: `src/ag/` (ortak sözleşme, Colyseus'suz), `src/sunucu/odalar/MacOdasi.ts` + `src/sunucu/mac/MacYonetimi.ts`
(yetkili oda), `src/istemci/ag/` (SDK cephesi, tahmin/uzlaşma, üst katman), `src/paylasilan/sim/tahmin.ts`.
Kararlar: ADR-002 (60 Hz), ADR-004 (determinizm), ADR-005 (tahmin A). Ölçüm: `docs/production/raporlar/D4.md`.

## 1. Yalıtım (ESLint, `npm run lint` = `eslint src`)
- `src/ag/**`: zod + `src/paylasilan`; Colyseus, pixi, Node, istemci/sunucu importu yasak.
- `src/istemci/ag/**`: yalnız `@colyseus/sdk`. Diğer istemci dosyaları Colyseus import etmez.
- `src/sunucu/**`: `colyseus` (+ şema sınıfları için `@colyseus/schema`); `@colyseus/core` doğrudan, `@colyseus/sdk`, istemci yasak.
- `src/paylasilan/**`: determinizm kapısı (ADR-004).
Sürümler `package.json`'da tam sabit (caret yok): colyseus 0.18.10, @colyseus/sdk 0.18.9, @colyseus/schema 5.0.43,
@colyseus/monitor 0.18.7, @colyseus/playground 0.18.6. Yükseltme ayrı commit + ağ matrisi.

## 2. Oda ve akış
Oda adı `mac`, `filterBy(["mod"])`. Modlar: `oda` (özel, roomId = 8 harfli kod), `hizli` (D7: genel kuyruk,
`joinOrCreate`; ilk gelen ikinciyle eşleşir, Elo D7'de 1000 sabit, pencere ±100 yer tutucu `kuyruk.ts`; 30-60 sn arası
istemci `botIste` gönderirse sunucu kendi saatiyle denetleyip paylaşılan botu ikinci koltuğa koyar (nile B-19); 60 sn'de
`kapandi{rakipGelmedi}` → "Şu an rakip bulamadık"), `antrenman` (tek kişi, rakip sunucuda paylaşılan bot). `maxClients = 2`; üçüncü bağlantı reddedilir.
Oda fazı (`OdaSema.faz`): `bekliyor` (rakip 60 sn içinde gelmezse kapanır) → `secim` (20 sn; ikisi Hazır ya da süre
dolunca seçili takım) → `mac` → `bitti` (iki taraf `rovans` → `secim`) ; maç oynanmayan oda 10 dk'da kapanır.
Kod biçimi ABCD-EFGH (0/O/1/I yok, büyük-küçük duyarsız, tire isteğe bağlı; `#oda=ABCDEFGH` bağlantısı lobiye açar).
HTTP: `/api/oda/:kod` → `acik|dolu|suresiDoldu|yok` (lobi hata metinleri), `/api/saglik`, `/api/olcum` (yalnız geliştirme).

**Protokol v5 (D7):** `PROTOKOL_SURUMU = 5`. Yeni istemci → sunucu mesajı `botIste {v}` (yalnız hızlı, bekliyor
fazında, oda kurucusu). `bilgi{tur:"odul"}` genişledi: `altin {kalemler[{neden, miktar}], carpanlar[{ad, deger}], toplam,
sifirNedeni, bakiye}`, `basarimlar[{id, ad, gizli, onceki, ilerleme, sayi, tamamlandi, odulAltin, acilanParcalar[{id, ad}],
acilanOzellik}]`, `basarimAltini`, `basarimSayilmadi` (teslim/hukmen/iptal/ciftTavani), `mod` (hizli/oda/bot). Sim, şema
ve hash değişmedi (altın hash'ler aynı); maç özeti sunucuda sim olaylarından (`MacOzetSayaci`, hash dışı).

## 3. Katılma ve kimlik
`KatilmaSema { v: 3, takimId, mod, ad, katalog }`. Parça listesi istemciden alınmaz: `takimId` başlangıç takımıdır
(`src/paylasilan/veri/takimlar.ts`; D5'te SQLite). `katalog` = `KATALOG_OZETI` (veri JSON'larının FNV-1a 64'ü);
uyuşmazsa ret (4102) → "Oyun güncellendi. Sayfayı yenile." `onAuth`: Origin kontrolü (`IZINLI_KOKENLER`; geliştirmede
localhost), `KIMLIK_MODU=yerel` (ad + rastgele id; yalnız geliştirme/Access arkası); D5'te Kick bileti.

## 4. Durum şeması (axiom #5)
Alan adı ve wire türü tek tabloda (`src/ag/durum.ts`), sunucu şema sınıflarını bundan kurar (`src/sunucu/odalar/sema.ts`):
- `Topac` (hash'teki 39 alanın tamamı + `uye: u8`, `yon: i8`): konum/hız/stamina/tık/Enerji/desen/yön vektörleri `f32`;
  süre sayaçları (`dashKalan`, `dashBekleme`, `sekmeKalan`, `koruma`, `bekleme1/2`, `yetenekKalan`, `kilitKalan`…) `u16`;
  `sahadaTick u32`; `durum`, `yetenekFaz`, bayraklar `u8`; `yetenekNo/etkinNo i16`, `yetenekYuva/kavisIsaret i8`.
- `Mac`: `faz u8, kalanTick u32, kutlamaKalan u16, saat u32, aniOlum u8, aniOlumTick u32, turNo u8, puan0/1 u8`, son tur
  sonucu ve maç sonucu (düz alanlar).
- Dünya kökü: `tick, tohum u32, temasKilidi u16, arenaYaricap f32`, Ulti kilidi/kullanımı, yakın geçiş beklemesi,
  Kararma, seviye, son yetenek, yetenek sayaçları, `takimEnerjisi0/1` (D8 yer tutucu); diziler `topaclar[2]`,
  `takimlar[2]{aktif, geriCekHedef, geriCekBekleme, secim, elenen, uyeler[3]}`, `alanlar[2]{var,…}`, `engeller[n]`.
- Oda kökü: `faz, kod, mod, macNo, secimKalan, beklemeKalan, donma, donmaKalan, kopan, dunyaVar, oyuncular[2]
  {oturum, ad, takimId, bagli, hazir, rovans, bot, ack, ackTick, dondurmaHakki}`.
float32 yalnız wire biçimi: sunucu sim'i float64 (fround yok). İstemci `gorunumdenDunya(state.dunya, profiller, f32)`
ile tam bir `Dunya` kurar; profiller `takimId` + `aktif`'ten.

## 5. Zamanlama
- Sunucu: `setFixedTimestep(adim, 60)`; **önce** sabit adım, **sonra** `patchRate = null` (ters sırada Colyseus boşta
  saat için ayrı 16 ms `clock.tick` kurar ve birikimcinin deltaTime'ını çalar: adım hızı 4-50 Hz'e düşüyordu).
- Yama elle ve adım hizalı: her 3 adımda `broadcastPatch()` (20 Hz) + hash adımında zorunlu yama.
- Olaylar: her adım sonunda `MESAJ.olaylar` `{ v, t, ms, o[] }` (patch beklemez); her 60 adımda ve maç sonunda `h`
  (tam float64 hash) + `hw` (sunucunun kendi şemasından f32 kurulan dünyanın hash'i).
- İstemci: girdi/tahmin döngüsü çizimden bağımsız zamanlayıcıda (performance.now birikimi, 60 adım/sn, kare başına ≤ 15);
  çizim rAF'ta. Sekme gizliyken girdi gönderilmez.

## 6. Girdi (`defineInput`, güvenilir kanal)
`GirdiSema { seq u32, yonX/yonZ i8 (±127), nisanX/nisanZ i16, yuva u8, tuslar u8 (TUS maskesi), degistir i8 }`.
İstemci nicemlenmiş girdiyi hem yollar hem kendi tahmininde kullanır (`agAlanlarindanGirdi`); sunucu `girdiTemizle` ile kırpar.
Sunucu tüketimi (`MacYonetimi.girdiSec`, adım başına bir):
- Girdi varsa uygula; `ack = seq`, `ackTick = adım`.
- **Boşluk:** son girdinin ekseni, nişanı ve basılı düğmeleri `BOSTA_TASIMA_ADIMI = 30` adım (0,5 sn) taşınır (tek
  seferlikler düşer), sonra nötr. 30: WebSocket TCP'dir; kayıp düşmez, yeniden iletim bekler (~RTO 200 ms + tek yön).
- **Borç:** aç kalınan her adım (≤ 30) borç yazar; geç gelen girdiler borç kadar atlanır, tek seferlik düğmeleri
  sonrakine birleştirilir (`girdileriBirlestir`: dash/sekme/yetenek kaybolmaz). Sunucu adımı ↔ istemci sırası hizalı kalır.
- **Birikme:** tampon `BIRIKME_ESIGI = 4`'ü aşarsa iki girdi tek adımda birleşir.
- ≥ 1 sn boşluk duraklama sayılır (borç sıfırlanır).

## 7. Tahmin modeli A ve uzlaşma (`src/istemci/ag/AgMaci.ts`)
- Kendi topacım: tamponda `{seq, girdi}`; her yerel adımda `kendiAdimi` (sayaç → eylem → hareket → erime → duvar,
  `olaylar = null`: bedel/olay/Ring Out yok). Yalnız faz `tur` ve topaç aktifken.
- Yama gelince: `ack`'e kadar tampon silinir; sunucu topacından başlayıp `seq > ack + (tick − ackTick)` girdileri yeniden
  oynatılır (sunucu taşımayla ilerlediyse o adımlar iki kez sayılmaz). Eski tahmin ile fark `e`:
  `e < 0,5` yok say · `0,5 ≤ e ≤ 8` yumuşak (görsel ofset 4 adımda erir) · `e > 8` atlama; son 600 ms'de bana darbe
  (çarpışma, yetenek isabeti, zincir) geldiyse yumuşak (6 adım). Hitstop sırasında ofset erimez. Efekt geri alınmaz;
  yalnız konum/hız/stamina/tık sunucudan.
- Rakip: anlık görüntü tamponundan `ARA_DEGER_GECIKMESI_MS = 100` geriden ara değer (sunucu adım saati tahmini);
  sıçrama (ışınlanma) varsa ara değer yok; en yeninin ötesinde ≤ 3 adım hızla ileri.
- Rakibe karşı konumsal ayırma (görsel): iki aktif topaç iç içe çizilmez; hız değişmez (hayalet çarpma 0).
- Stamina/tık/Enerji/yetenek/faz/puan: son sunucu dünyası. Efekt ve ses sunucu olayından, anında.

## 8. Hash karşılaştırma (flint § 2 madde 6)
1. **Wire:** her 60 adımda sunucu `hw` yollar; istemci aynı adımın yamasında aldığı durumun hash'ini hesaplar. Tek sapma S1.
2. **Yeniden oynatma:** `MESAJ.kayitIste` (yalnız geliştirme) → sunucunun `MacKaydi` (kurulum, tüketilen girdiler,
   sim dışı eylemler, 60 adımlık hash'ler); tarayıcı `kaydiOynat` ile paylaşılan sim'i koşar, hash'leri karşılaştırır.
`?debug` HUD satırı: `hash ok/n sapma · tick · rtt · uzlaşma · çarpışma · sunucu hash`.

## 9. Kopma, terk, AFK (flint #9-#12, ux § 1.4 / § 7)
- Kopma (`onDrop`): oyuncunun girdisi nötr, sim 3 sn akar; sonra **dondurulur** ("Rakip bağlanıyor… N"); toplam 20 sn
  (`allowReconnection(client, 20)` + sunucu sayacı). Aşılırsa kopan **0-3 hükmen** (`hukmenBitir`, neden `hukmen`).
- Dondurma oyuncu başına maçta 2 kez; hak bitince sonraki kopma 3 sn sonunda hükmen.
- İkisi de koptu ve dönmedi → **iptal** (`macIptal`, kazanan −1). Biri dönmedi, diğeri döndü → dönmeyen hükmen.
- Oda terk (bilinçli `leave`) = kopma (yeniden bağlanma yok, 20 sn sonra hükmen).
- Teslim: `MESAJ.teslim` (UI iki adım + 2 sn basılı) → 0-3. Kayda eylem olarak girer.
- AFK: bağlıyken 10 sn girdi yoksa uyarı (`bilgi afkUyari`), 30 sn'de hükmen. Sekme gizliyken istemci girdi göndermez;
  dönüşte tampon/tahmin atılır, tam durumdan yetişilir, "Oyuna dönüldü." 1 sn.
- İstemci yeniden bağlanma: SDK otomatik; en çok 1 sn arayla 30 deneme (varsayılan üstel bekleme 2 sn'lik kopmayı 3 sn
  sınırının ötesine taşıyordu). Bant: "Bağlantı koptu. Yeniden bağlanıyoruz… N"; kalıcı kayıpta "Bağlanamadık."
- Takım seçimi / bekleme sırasında rakip ayrılırsa: oda kapanır, lobiye dönüş ("Rakip maçtan ayrıldı."), ceza yok.

## 10. Bağlantı rozeti (H10)
Yalnız RTT > 150 ms ya da son 5 sn'de > 250 ms yama boşluğu (kayıp belirtisi; WebSocket'te kayıp = gecikme sıçraması).
RTT: SDK saatinin yumuşatılmış girdi-ack RTT'si, yoksa ping ortalaması.

## 11. Test araçları
- `araclar/ag-simulatoru.ts`: istemci başına HTTP+WS vekili; tek yön gecikme + jitter + kayıp (TCP yeniden iletim
  cezası: RTO 200 ms + tek yön, sıra korunur), patlama penceresi, `kes(ms)`; yön başına bayt sayacı. Sayfa da vekilden
  açılır (aynı köken), gecikme yalnız oyun trafiğine.
- `npm run ag:matris` (N0-N6, kopma 2/10/25 sn, üçüncü bağlantı, AFK, 60 sn bekleme), `npm run ag:ekran` (DPR 2).
- D8: `npm run ag:matris -- N2 --tekrar=10 --port=2631 --cikti=…` (profil başına N maç, paralel koşu için ayrı port ve çıktı);
  lobi "Hızlı maç" sekmesiyle açıldığı için otomasyon önce "Oda kodu" sekmesine tıklar (D7 sonrası bozulmuştu, düzeltildi).

## 12. D8: protokol 6, Takım Ultisi, seyirci odası
- **Protokol 6:** dünya şemasına `takimEnerjisi0/1` (f32, önceden yer tutucu 0) ve `takimUlti0/1` (u8) bağlandı; wire hash
  bunları kapsar (sunucu f32 yuvarlamasıyla aynı Dunya). Oda şemasına `izleKod` (oda modunda ev sahibinin yayın kodu).
  Girdi şeması değişmedi: Takım Ultisi `yuva = 3` (tuş 4) + `atesle`.
- **Seyirci odası `izle`** (`src/sunucu/odalar/IzleOdasi.ts`, `defineRoom(IzleOdasi).filterBy(["kod"])`): yayın kodu başına
  tek oda, `maxClients = 50` (`SEYIRCI_SINIRI`); dolu odanın yanına ikincisi açılmaz (onCreate 409 "dolu"). Katılma
  `{ v, kod }` (`IzleKatilmaSema`), **bilet yok, misafir serbest**, Origin + sürüm denetlenir. Seyircinin her mesajı
  `onMessage("*")` ile yok sayılır (girdi şeması yok). Durum `IzleSema`: faz, `kod` (yalnız bekleme fazında dolu; maç başlayınca
  boş), maç no, oyuncular (ad, takım kodu, bağlı, bot; **oturum kimliği / ack yok**), dünya (aynı `DunyaSema`), son maç skoru.
  Altın/başarım bilgisi seyirciye gitmez.
- **Yansıtma:** maç odası her yamasında (`yamaYay`: 20 Hz, adım hizalı) yayına bağlı seyirci odasının durumunu `dunyayiYaz` ile
  günceller ve `broadcastPatch` yapar; olay paketleri hash alanları atılarak iletilir. Seyirci istemcisi (`IzleAgi`) girdi
  yollamaz, **iki topacı da 100 ms geriden** ara değerler (rakip modeliyle aynı), geri kalanı son sunucu durumundan.
- **Yayın kodu** (`src/sunucu/izleKayit.ts`, süreç içi): ev sahibinin ilk oda kodu; aynı ev sahibi yeni oda açınca yayın yeni
  odaya taşınır (OBS bağlantısı değişmez), arada seyirci "Sıradaki maç bekleniyor" + son skor görür. Kaynaksız yayın 6 saat
  hatırlanır; oda kodu üreticisi yayın kodlarını yeniden vermez. `GET /api/izle/:kod` oda ya da yayın kodunu yayın koduna çözer.
- Ölçüm: oda adımı (`odaAdimSureleri`, sim + yama + seyirci yansıtma) p50/p95/p99 ve seyirci sayısı `[olcum …]` günlük satırında
  ve `/api/olcum`'da. D8 sayıları: `docs/production/raporlar/D8.md`.
