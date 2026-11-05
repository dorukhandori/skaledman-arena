# Mac oturumu başlatma talimatı: topaç parçaları üretimi (Gemini + Tripo + Blender)

**Okuyan:** sahibin Mac'inde çalışan Claude Code oturumu. Bu hattı bulut oturumu çalıştıramaz (anahtarlar, Blender 5.2 ve
Python sanal ortamı yalnız Mac'te). Sohbet Türkçe, kod tanımlayıcıları Türkçe ASCII, commit mesajları İngilizce.

## 0. Hazırlık
1. Depoda `devran-kod` dalına geç ve güncelle: `git fetch origin && git checkout devran-kod && git pull origin devran-kod`.
   (`devran-sanat` zaten `devran-kod`'a birleşti; `devran-sanat`'a push etme.) `main`'e dokunma, PR açma.
2. Oku: `docs/art/topac-uretim-istegi.md` (ana brief: 27 parça tarifi, Gemini şablonları, Tripo/Blender kuralları,
   çıktı sözleşmesi, parti sırası), `araclar/sanat/README.md` (hat), `docs/art/topac-pixel-plani.md`,
   `docs/design/beyblade/gorunum/07-arena-mac.jpg` (referans), `docs/art/topac-sprite-onizleme.png` (bulut yedeği, 3/5),
   `docs/production/raporlar/ATOLYE3D.md` § 6 (GLB sözleşmesi), `docs/production/raporlar/GU-D.md` (güncel kamera: eğim 45°,
   `zOrani` 0,52, topaç çizim ölçeği 1,08 ve sprite karesi 76×76; kare/ölçü için `veri/topac-gorsel.json` ve
   `araclar/sanat/topac-uret.ts` esas alınır, brief'teki 64×64 eskidir).
3. Ortam kontrolü (anahtar değerlerini ASLA ekrana yazma ya da commit'leme): Gemini anahtarı `~/.facecodex/config.json`,
   Tripo `~/.openclaw/credentials/tripo-api-key`, Blender 5.2, `~/.venvs/uo-asset`. Eksik olan varsa dur ve sahibe söyle.

## 1. Parti 1 (kalite kapısı)
`ok-govde` + `hafif-disk` + `duz-uc` + `kor-goktasi`, Kor boyası; keskin/bulanık/disk şeritleri + 48/24 ikon. Çıktı sözleşmesi:
`topac-uretim-istegi.md` § 5 (biçim B). Kontakt levhayı `docs/art/topac-mac-onizleme.png` olarak yaz; bulut yedeği ve
referans 07 ile yan yana kıyas görüntüsü üret. Ölçüt (§ 6): referansa bulut spike'ından açıkça yakın (≥ 4/5), döngüde dikiş yok,
Uç ve Disk ayrı okunuyor.
**Maliyet:** yaklaşık $0,5 Gemini + 160-200 Tripo kredisi. Harcamadan önce ve her partiden önce sahibe kısa özet ver
(`uretim-kaydi`: `docs/art/topac-uretim-kaydi.md`, `docs/art/ruh-uretim-kaydi.md` biçiminde).

**DUR: Parti 1 sonucu bitince kontakt levhayı sahibe göster ve onay bekle.** Onay yoksa yalnız ikonlar devam eder.

## 2. Onaydan sonra
- **Parti 2:** kalan 7 Gövde. **Parti 3:** 4 Disk + 5 Uç + 7 Çekirdek (Uç/Disk için bulut parametrik modelini
  `kaynak/topac/parcalar-3b.json` Blender'da kullanmak 440 krediyi kurtarır; kararı sahibe sor).
- Her partiden sonra: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` yeşil; `npm run test:tarayici`
  (altın hash değişmemeli, bu yalnız görsel); Playwright ile Atölye ve bir maçı gerçek çalışma zamanında çek, ekran
  görüntüsünü sahibe göster. Sonra `git pull --rebase origin devran-kod && git push origin HEAD:devran-kod`.
- **GLB bağlama (Atölye 3B):** `public/topac/model/<parcaId>.glb` (Y yukarı, kök dönme ekseninde, Uç ucunda, 1 birim =
  topaç birimi, malzeme adları `boya`/`metal`/`koyu`…) ve kimliği `veri/topac-model.json` `glb` listesine ekle. Listede
  olmayan parça parametrik modelle çizilmeye devam eder.
- Manifest ve krediler: her dosya için `veri/manifest-gorsel.json` satırı; `npm run krediler:uret` yeşil kalsın.
- Biçim B kimliklerini `veri/topac-gorsel.json` `bicimB` listesine ekle.

## 3. Kurallar
- Özgün tasarım: marka/logo/yazı yok; kanatlı kuş, ejderha, anka biçimi yok.
- **Kick OAuth** ile ilgili HİÇBİR şeye dokunma (sahip yasakladı).
- Ham dosyalar `art-source/` (depo dışı, `.gitignore`); yalnız oyuna giren çıktı `public/` altına.
- Anahtarları loglara, komut çıktısına, commit'e yazma.
- Varsayımları "varsaydım" diye işaretle; gerçek çalışma zamanında doğrula ("kodu okudum çalışıyor" kabul edilmez).
- Commit sonu: `Co-Authored-By: Claude <noreply@anthropic.com>`.
