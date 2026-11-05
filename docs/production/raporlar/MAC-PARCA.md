# MAC-PARCA raporu: topaç parçaları Mac hattı (Gemini + Tripo + Blender)

**Dal:** `devran-kod` · **Brief:** `docs/art/topac-uretim-istegi.md`, başlatma `docs/art/mac-oturum-baslat.md` · **Maliyet:** `docs/art/topac-uretim-kaydi.md`

## Parti 1 (kalite kapısı): Ok Gövde, Hafif Disk, Düz Uç, Kor Göktaşı

Sahip onayı: 2026-11-05 ("Approve, go to batch 2"). Kontakt levha `docs/art/topac-mac-onizleme.png`, kıyas
`docs/art/topac-mac-kiyas.png` (referans 07 | bulut spike'ı | Mac).

**Hat (`araclar/sanat/topac-mac.ts`):**
1. Gemini: ikon (katalog Element rengi, macenta zemin) + Tripo konsepti (beyaz zemin, Gövde orta gri). Gemini sayıları
   güvenilir tutmuyor: ilk turda 4 konseptin dördü ret (yanlış kanat/çıkıntı sayısı, Göktaşı bütün topaç); "EXACTLY N" vurgusuyla
   iki varyant üretilip seçildi.
2. Tripo image-to-model v3.1 (dokulu). Ok Gövde dik (eksen X) geldi; betik dönme eksenini bbox'ın en ince ekseni sayar.
3. Blender (`blender/topac_glb_render.py`): +Z'ye çevir, hedef ölçüye oturt (dış yarıçap ve zAlt..zUst parametrik modelden),
   **simetrileştir**: iki dikişi de dış yarıçap profilinin vadisine düşen 360/n dilim, n kez dairesel dizi + kaynaştırma. Kaynakta
   8 çıkıntı / 8 nervür olsa da çıktı tam 7 / 6; döngü dikişsiz (kontakt levhada kare 7 → 0 kesintisiz). Sınıf (boya/metal/koyu/
   kubbe/çerçeve) yüz başına doku rengi + konumdan. Veri geçişleri bulut hattıyla aynı (_n, _v) + `_t` doku albedosu.
4. Pişirme `topac-uret.ts` `parcaPisir` (aynı ışık, rampa, dither, çizgi, hız kademeleri); fark: ton albedoyla modüle
   (`ALBEDO`), Tripo'nun el boyası oluk/kenar ayrıntısı okunur. Albedo yoksa (bulut hattı) davranış aynı.
5. Biçim B şeritleri + json, Atölye GLB'si (sınıf adlı malzemeler, ≤ 19 000 üçgen, doku yok), 48/24 ikon, `bicimB` ve `glb` listeleri.

**Değerlendirme (dürüst):** referans 07'ye **3,5/5** (bulut 3/5; brief hedefi ≥ 4 karşılanmadı, sahip onayladı). Kanat sırtı ve
oluklar okunuyor, döngü dikişsiz, Disk ayrı okunuyor. Uç 45° kamerada Disk'in altında kalıyor (bulutta da öyle). 76 px'de süpürülmüş
kanatlar biraz pençe/yaprak gibi.

**Çalışma zamanı** (`KIMLIK_MODU=sifre` vite 5391 + Playwright, Google Chrome kanalı, SwiftShader): maç ve zorlanmış çarpışma
(`ekran/MAC-P1-01-mac.png`, `MAC-P1-02-carpisma.png`): atlas sprite kipinde, biçim B istekleri 200, konsol hatası 0. Atölye
(`MAC-P1-03-atolye.png`): 4 GLB 200 ile yüklendi ve toon gölgeyle çiziliyor.

**Kapılar:** `npm test` 26 dosya / 480 test · `lint` · `typecheck` · `build` yeşil · `test:tarayici` Node = Chrome bit bit aynı.
Test değişikliği: `atolye3d.test.ts` "liste boş" testi gerçek listeye bağlıydı, açık boş küme verildi; yeni test: `glb` listesindeki
her kimliğin dosyası var. `__pycache__/` `.gitignore`'a (d8 varlık taraması Blender'ın yazdığı .pyc'yi yakalıyordu).

**Bilinen sınırlar:**
- **İkonlar bağlı değil.** Menüler (Atölye ızgarası, Market, Başarımlar, Lobi) TEMIZLIK #4'ten beri Atölye 3B ikon önbelleğini
  kullanıyor; brief'teki "menü iki yolu da dener" kodda yok. `public/topac/ikon/<id>-48/-24.png` üretildi, kullanılmıyor.
- **3B ikonlar GLB'yi görmüyor.** `Goruntuleyici.tekKare` parçayı eşzamanlı kurup hemen atıyor; GLB yüklemesi eşzamansız olduğu için
  ikonlar parametrik modelden çiziliyor (Atölye sahnesi GLB'yi gösteriyor). Ayrıca localStorage ikon önbelleği sürümü GLB listesini
  içermiyor. Düzeltme Atölye kodunda (GLB önyükleme + sürüme liste özeti): ayrı iş.
- GLB'ler 350-380 KB (19 000 üçgen); yalnız Atölye'de seçili parça için iner. 27 parça ≈ 10 MB.
- Yerel Playwright: proje bağımlılığı yok; `test:tarayici` Mac'te global `playwright` + "chrome" kanalı shim'iyle koştu
  (önbellekteki Chromium 1194 kurulumu bozuk: framework eksik).
