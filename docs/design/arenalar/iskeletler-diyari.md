# Arena: İskeletler Diyarı

[@cove · Arena Designer] Durum: öneri, sahip onayı bekler. Sahip kararı (1 Kas 2026): "ilk arenamız 'iskeletler diyarı' olacak". Kapsam: tek 1v1 sahası, v1'de yüzey yok, sanatçısız (her şey `Graphics` ilkelleriyle). Sayılar F0 sim'ine (`ayar.ts`, `carpisma.ts`) göre doğrulandı; kalıcı denge sayıları `economy-designer`'ındır.

## 1. Kimlik

Dev bir yaratığın kemikleri üstünde kurulmuş, kuru toprak bir mezarlık düzlüğü: ortada kocaman bir kafatası, iki yanda bir omurga/kaburga sütunu, ufukta dev kaburga kemerleri ve dolunay. Ton: karanlık ama sevimli (Pokémon dövüşü, korku değil). Zemin bilerek sönük; renk yalnız telegraflarda ve dövüşçülerdedir.

## 2. Boyut ve sınırlar

Referans arena ölçüsü aynen: `yariGenislik 380`, `derinlik 480` (760×480), `govdeYaricap 14`. Gerekçe: spawn, hamle menzilleri (poke 58, mermi 300, ışın 250, dash 60) bu alana göre ölçülmüş; 90 s maçta (`mac.sure`) 760 genişlik iki yana kaçışa yeter, daha büyüğü temas süresini uzatır. Değiştirme gerekçesi yok.

## 3. Doğum noktaları ve güvenlik kuralı

`(-110,120) yon 2` ve `(110,120) yon 6` (referans değer). Aralarında 220 birim var; ışın (250) ve mermi (300) menzili bundan uzun. Bu yüzden **güvenlik mesafeyle değil geometriyle** sağlanır: iki doğum noktasını birleştiren doğru büyük kafatasını keser.
- Işın ince bir doğru parçasıdır (`parcaEngel` şişirmesiz); kafatası z aralığı 94..146. İki oyuncunun orta noktası bu aralığın dışına çıkınca hat açılır: tek taraflı 52 birim kayma (bir dash'ten az, 0,35 s yürüyüş) yeter.
- Mermi yarıçap 10 kadar şişirilir; aralık 84..156; hattı açmak için toplam 72 birim kayma gerekir (iki oyuncu 36'şar, ~0,25 s).
- Yani hat kalıcı kapalı değil, ama maçın ilk anında kimse atış yapamaz, açılış anı "yan adım" ile başlar. Doğum noktaları köşeden çok uzak (en yakın duvar 270, en yakın engel 86), köşe cebi yok.

## 4. Engeller (hepsi gövde + mermi + ışın engeller, F0 sim'inin tek listesi)

```
 x: -380      -230   -115      0     115    230       380      (z=0 ufuk/uzak)
 z=0  +--------------------------------------------------+
      |                                                    |
 120  |        [S1]   .        [KAFA]       .   [S2]       |  S1/S2 = doğum
 170  |  [mezar]                                [mezar]    |
 250  |            (kafa)               (kafa)             |  yer kafatası
 270  |          ||                                ||       |
 330  |          || omurga      [=== uyluk ===]    ||       |
 410  |          ||                                ||       |
 480  +--------------------------------------------------+
```

| Engel | Şekil | x, z | Boyut | Rol |
|---|---|---|---|---|
| Büyük kafatası | dikdörtgen | 0, 120 | yarı 24×26 | açılış hattını keser; hat 52/72 birimlik kayma ile açılır |
| Omurga/kaburga ×2 | dikdörtgen | ±230, 340 | yarı 16×70 | alt yarıyı orta koridor (±214) ve yan koridor (134 geniş) diye böler; uzun ışın için ana siper |
| Uyluk kemiği | dikdörtgen | 0, 330 | yarı 52×10 | ince yatay siper; dash ile etrafından dönülür |
| Yer kafatası ×2 | daire | ±115, 250 | yarıçap 16 | orta alanda küçük siper; mermiyi böler, kaçışı zorlamaz |
| Mezar taşı ×2 | dikdörtgen | ±310, 170 | yarı 12×9 | yan koridor sipere ulaşır; duvara 58 boşluk (gövde 28 geçer) |

Sayı gerekçeleri: tüm boşluklar ≥ 28 (gövde çapı) olduğundan hiçbir cep tıkanmaz. Siperler en çok ~150 birim aralıkla durur: mermi telegrafı `anlik` (0,08 s) olduğundan karşı oyun dash (0,12 s dokunulmazlık) ve siperdir. Işın telegrafı `uzun` (0,45 s): yürüyerek 67 birim yan adım, ışın yarı kalınlığı + gövde = 22'yi aşar, yani ışın yürüyerek de kaçılabilir. Işın 250 uzunluğu orta koridorda omurgayı geçemez: omurga arkası güvenli ama kıstırılabilir (aynı sütunun öbür yanına dash). Köşelerde (|x|>320, z<100) siper yok; bilinçli, bkz. açık sorular.

Hiçbir engel hareket etmez ya da yıkılmaz (ağ maliyeti sıfır; 8 engel, `konumCoz` iki geçişte ihmal edilebilir).

## 5. Görüş hatları ve adalet

- **Simetri:** tüm engeller x'te birebir ayna (`x → -x`); z'de simetri aranmadı (ikisi de z=120'de başlar). Uyluk ve kafatası x=0'da, kendi aynası.
- Her doğum noktasının rakibe hattı yalnız kafatasıyla (§3) kapalı; başka engel o hatta girmez. Omurga/yer kafatası doğum noktasından en az 130 uzak.
- Işın karşı oyunu: kaçış (yan adım/dash), siper, omurgaya geçmek. Mermi karşı oyunu: siper, dash, mermi hızı 760 olduğundan 300'de uçuş 0,39 s.
- Orta alanda her noktadan en yakın siper ≤ ~130 (köşeler hariç).

## 6. İlk 10 saniye

0–1 s: iki dövüşçü kafatasının iki yanında, birbirine dönük; ufukta dolunay, hat kapalı, oyuncular hat açmak için yan adım atar. 1–4 s: orta bantta (z 150–260) yer kafatasları etrafında dolaşma, ilk poke/mermi denemeleri, dash'ler. 4–10 s: biri omurga arkasına çekilir, öbürü uyluk üzerinden yan koridora dash eder; bu sırada ilk ışın telegrafı yer görsel olarak zemini boyar.

## 7. Görsel dil (kodla çizilen, sanatçısız)

`Sahne.zeminCiz/engelleriCiz` için. Okunabilirlik kuralı: **zeminin parlaklığı %10–22 aralığında, doygunluğu düşük; zeminde telegraf renklerine benzeyen parlak desen yok.** Telegraf dolgusu tip rengi (`TIP_RENK`) alpha ~0,4 + açık 2 px kenar; bu zeminde en riskli tipler DARK (0x705848) ve GHOST (0x705898), kenar çizgisi onları ayırır. Telegraflar engellerin üstünde değil zeminin üstünde çizilir.

| Eleman | Hex |
|---|---|
| gök / ufuk sisi | 0x0e0f16 / 0x26212c |
| dış zemin | 0x1a1a1f |
| zemin / açık şerit (farkı küçük) | 0x2e2b2a / 0x33302e |
| ızgara çizgisi, saha sınırı | 0x4a443d, sınır 0x6b6254 |
| çatlak, toprak yaması | 0x1e1c1b (alpha 0,6), 0x262322 |
| kemik açık (üst) / koyu (ön) / kenar | 0xd9d2bd / 0xa59d86 / 0x2a2520 |
| göz çukuru, diş arası | 0x14110f |
| ufuk silueti (kaburga kemerleri, mezar taşları) | 0x181720 |
| dolunay | 0xcfc8b0 alpha 0,5, x=480 (ortada, taraf yok) |

- **Zemin dokusu:** `SAHNE_RENK.zemin` üstüne sabit tohumlu (LCG, `Math.random` yok; kare kare aynı) 40–60 kısa çatlak çizgisi ve 8–10 koyu elips yama, hepsi alpha ≤ 0,12; küçük kemik kırıntıları (alpha 0,25) yalnız kenar bandında (|x| > 300 veya z > 450), dövüş şeridinde değil.
- **Kafatası** (ön yüz üstünde): üstte elips kafatası, iki siyah elips göz, üçgen burun, altta çene dikdörtgeni ve 3 dikey diş çizgisi. Yükseklik 44 (dövüşçü başı üstünden görünsün).
- **Omurga/kaburga:** dikey omurga topuzları (yuvarlak uçlu kapsül) + her iki yana ayak izi içinde kalan kısa yay kaburga çizgileri. Çizim ayak izinden taşmaz: görsel ile çarpışma uyumsuzluğu okunabilirliği bozar. Yükseklik 34.
- **Uyluk:** yatay dikdörtgen, iki uçta yuvarlak diz topuzu (yarıçap 10, ayak izi içinde). Yükseklik 18.
- **Yer kafatası:** küçük elips kafatası, yükseklik 26. **Mezar taşı:** yuvarlak üstlü dikdörtgen, yükseklik 30, sahne sıralaması z'ye göre.
- Dövüşçü arkasında kalırsa gizlenmemesi için tüm yükseklikler ≤ 44.

## 8. `ayar.ts` `saha` verisi

```ts
saha: {
  id: "iskeletler-diyari",
  ad: "İskeletler Diyarı",
  yariGenislik: 380,
  derinlik: 480,
  govdeYaricap: 14,
  dogum: [
    { x: -110, z: 120, yon: 2 },
    { x: 110, z: 120, yon: 6 },
  ],
  engeller: [
    { tur: "dikdortgen", gorsel: "kafatasi", x: 0, z: 120, yariGenislik: 24, yariDerinlik: 26 },
    { tur: "dikdortgen", gorsel: "omurga", x: -230, z: 340, yariGenislik: 16, yariDerinlik: 70 },
    { tur: "dikdortgen", gorsel: "omurga", x: 230, z: 340, yariGenislik: 16, yariDerinlik: 70 },
    { tur: "dikdortgen", gorsel: "uyluk", x: 0, z: 330, yariGenislik: 52, yariDerinlik: 10 },
    { tur: "daire", gorsel: "yerKafatasi", x: -115, z: 250, yaricap: 16 },
    { tur: "daire", gorsel: "yerKafatasi", x: 115, z: 250, yaricap: 16 },
    { tur: "dikdortgen", gorsel: "mezarTasi", x: -310, z: 170, yariGenislik: 12, yariDerinlik: 9 },
    { tur: "dikdortgen", gorsel: "mezarTasi", x: 310, z: 170, yariGenislik: 12, yariDerinlik: 9 },
  ],
},
```

## 9. Sim / kod değişiklikleri

- **Zorunlu değil, v1 mevcut sim ile çalışır.** `gorsel`, `id`, `ad` alanları sim için gereksiz; `Arena.ts` arayüzüne eklenmeleri gerekir: `Engel`'e `gorsel?: string` (yalnız `Sahne` okur, sim yok sayar), `Arena`'ya `id?: string; ad?: string`. Küçük tip değişikliği, `gameplay-programmer`.
- **`mermiGecer` önerilmedi (v1):** sim'de tek engel listesi hem gövdeyi hem mermi/ışını durdurur. Gövde geçmeyen ama mermi geçiren engel daireler ile yapılamaz: gövde çapı 28 > mermi çapı 20, bir aralık mermiyi geçirmeden gövdeyi durdurmak için aralık 20..28 olmalı ve ışın (ince doğru) bu aralıktan zaten geçer, yani davranış öngörülemez. İstenirse v2'de `Engel.mermiGecer?: boolean`: `konumCoz` hepsine bakar, `parcaEngel` mermi/ışın çağrıları (`hamle.ts:102`, `mermiler.ts:31`) bayraklı engelleri atlar, `Bot.ts:122,183` görüş testi ayrı karar. Bu bir paylaşılan sim kuralı: `game-designer` onayı gerekir.
- **Bot notu:** `Bot.hedefNokta` yalnız dikdörtgen köşelerine yönelir; yer kafatası daireleri bota görünmez (kayma ile geçer, takılma düşük). Yer kafatasları hatta oturunca bot testi yapılmalı (`qa-tester`).

## 10. v2 adayları (v1'e girmez)

Kemik çukuru (lava benzeri tehlike, ortada alt bölge), mezar sisi (sis yüzeyi), kemik çit (`mermiGecer` gerektirir), dönen kafatası (hareketli engel: ağ ve tick maliyeti, `network-programmer` görüşü şart).

## 11. Sahibe açık sorular

1. Büyük kafatası ilk anda hattı kapatsın mı, yoksa spawn güvenliği için ilk saniyelerde tamamen açık alan mı tercih edilir? (Öneri: kapalı, yan adım kuralı.)
2. Köşeler (|x|>320, z<100) siperli mi olsun? Şu an boş; kaçış bölgesi olarak kalması "kaçarak oyalama"yı kolaylaştırabilir.
3. Zemin tonu: gri-kahve (önerilen) mi, soluk mor mu? Telegraf okunabilirliği için ikisi de uygun, `art-director` ile hizalanacak.
4. Dolunay ve ufuk kaburga siluetleri onaylanır mı, yoksa tek renk gök mü?
