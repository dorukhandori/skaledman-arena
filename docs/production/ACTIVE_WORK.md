# ACTIVE_WORK — eşzamanlı oturumların talep panosu

Her oturum işe başlamadan önce `git pull`, bu dosyayı oku, satırını ekle, yalnız bu dosyayı commit + push et. Format: `- YYYY-MM-DD HH:MM · @nick (araç) · dosyalar/alan · ne yapıyor`.

## Devam eden

- 2026-11-06 · Harita kod alt oturumu (bulut, `devran-kod`) · `veri/{madenler,ustalik,tarifler,harita,market-fiyat}.json`, `src/paylasilan/{veri/harita.ts,kurallar/{harita,maden,ustalik,ocak}.ts}`, `src/sunucu/{api/{harita,maden,ocak}.ts,oyuncu/haritaMac.ts,db}`, `src/istemci/ekranlar/{Harita,Maden,Ocak}.ts`, `test/harita*` · H1→H8 (brief `docs/production/harita-kod-brief.md`); raporlar `raporlar/HARITA-H<n>.md`
- 2026-11-05 · baş geliştirici (bulut kodlama oturumu, `devran-kod`) · `src/**`, `veri/`, `test/` · dilimler ve cila; haber yalnız `docs/production/devran-kod-brief.md` ile
- 2026-11-05 · yerel oturum "Oyun menüsü UI hataları" · `docs/production/raporlar/MENU-DENETIM.md`, `araclar/menu-denetim-*.cjs` · denetim bitti; düzeltmeler (P1-P5) başlarsa `src/istemci/ekranlar/**`, `src/istemci/stil/**` (S-1 kararı bekliyor)
- 2026-11-05 · yerel oturum "Mac oturum başlat dokümantasyonu" · `araclar/sanat/**`, `public/topac/**` · parça hattı Parti 1-3 işlendi; Disk/Uç parametrik
- 2026-11-05 · yerel oturum "Kutsal canavarlar ve rehber karakter" · `public/ruh/**`, `public/bilgic/` · boşta; Ata rig işi sahip onayı bekliyor

## Beklemede

(boş)

## Son kapanan işler

- 2026-11-06 · tasarım oturumu "Harita/Maden/İşleme" (bulut, `devran-kod`) · `docs/design/harita/**`, `araclar/harita-ekonomi-simulasyonu.ts`, `docs/design/beyblade/04-sozluk.md`, `roadmap.md`, `raporlar/HARITA-TASARIM.md` · tasarım bitti (H1–H8 kod dilimleri hazır); rapor `docs/production/raporlar/HARITA-TASARIM.md`
- (2026-11-01 satırı, Skaledman çağı, iptal ve tarihçe) 2026-11-01 20:00 · @glyph (Claude Code yan oturum) · `index.html`, `src/istemci/stil/`, `Hud.ts`, `KartPanosu.ts`, Arena üst satırı, Lab DOM kabuğu · arayüzü skaledman.com görsel diline benzetiyor
- (2026-11-01 satırı, Skaledman çağı, iptal ve tarihçe) 2026-11-01 19:15 · @nile (Claude Code, Opus 5.5 oturumu) · `src/paylasilan/sim`, `src/istemci/oyun`, `docs/` · F0 sonrası: zıplama/takım/dinlenme/kademe (bitti), İskeletler Diyarı + arenada kart panosu (bitti), alt ajanları topluyor
- (2026-11-01 satırı, Skaledman çağı, iptal ve tarihçe) 2026-11-01 19:15 · @relay (alt ajan) · `src/sunucu/**`, `src/paylasilan/sim/Girdi.ts`, `src/istemci/ag/**`, Oyun/Arena çevrimiçi yolu · sunucu yetkili 1v1, tahmin + interpolasyon, ADR-004
- (2026-11-01 satırı, Skaledman çağı, iptal ve tarihçe) 2026-11-01 19:00 · @iris (alt ajan) · `araclar/fusion/**`, `public/fusion/`, `src/istemci/sprite/**` · boyun köprüsü, soluk palet kontrastı, shiny hue
- (2026-11-01 satırı, Skaledman çağı, iptal ve tarihçe) 2026-11-01 19:00 · @ledger (alt ajan) · `docs/design/tuning.md`, `araclar/denge/` veya `test/denge/` · 20 kartlık bot turnuvası, çarpan seçenekleri


- 2026-11-05 · baş geliştirici (temizlik ve cila, Claude Code) · `veri/ruhlar.json` (Yapay/Karanlık Ulti), `public/efekt/` + `araclar/sanat/efekt-paketle.ts` (palet + tembel atlas), `kaynak/ruh/ata/`, `src/istemci/atolye3d/ikonOnbellek.ts` (ortak 3B ikon), `/api/ben` `sonMac` (Pergel ring-out), Atölye "Market'te aç" + cilalar · rapor `docs/production/raporlar/TEMIZLIK.md`
- 2026-11-05 · baş geliştirici (entegrasyon, Claude Code) · `devran-sanat` → `devran-kod` birleştirme, `RuhGorsel.ts` (hologram + tembel yükleme + Takım Ultisi), `MacHud.ts` (tek Ulti bandı), `src/istemci/bilgic/` (Kuşak Taşı stili, azalan sıklık), `Ayarlar.ts` (İpuçları), krediler + manifest · rapor `docs/production/raporlar/SANAT-ENTEGRASYON.md`
- 2026-11-05 · @nile (Claude Code) + @glyph (alt ajan) · `src/istemci/oyun/RuhGorsel.ts`, `YetenekGorsel.ts`, `src/istemci/bilgic/`, `Atolye.ts`, `Ayarlar.ts`, `veri/{ruhlar,ipuclari}.json`, `public/{ruh,bilgic}/`, `araclar/sanat/`, docs 06 + bilgic-pergel · kutsal canavar belirmesi ve Pergel ipucu karakteri (Paca SA #13-18)

- 2026-11-01 · @vault (alt ajan) · `eslint.config.js`, `araclar/veri-cek.ts`, `test/veri-cek.test.ts`, `docs/tech/veri-cekimi.md` · `src/paylasilan` lint kapısı + saatlik Skaledman çekimi
- 2026-11-01 · @cove (alt ajan) · `docs/design/arenalar/iskeletler-diyari.md` · ilk arena özelliği

- 2026-11-01 · @nile (Claude Code) · `docs/`, `.claude/agents/`, `CLAUDE.md`, `AGENTS.md` · proje kuruldu, roster ve belgeler yazıldı
- 2026-11-01 · (başka oturum, satır açılmamıştı) · `docs/research/` (yerel) · referans oyunun oynanış ve paket analizi
- 2026-11-01 · @nile (Claude Code) · `docs/design/oyun-konsepti.md` § 11, `docs/tech/mimari.md` § 3b, `roadmap.md` · araştırma değerleri aday olarak aktarıldı, K-6 adayı açıldı
- 2026-11-01 · @vault (Claude Code alt ajan, SA-8) · `docs/research/skaledman-sayfa-analizi.md` · Skaledman web sayfası dökümü bitti; açık noktalar roadmap'e taşındı
- 2026-11-01 · @byte (alt ajanlar) · `araclar/`, `src/istemci/sprite/`, `BirlestirmeLab.ts`, `src/paylasilan/{kurallar,sim}`, `src/istemci/oyun/`, `Arena.ts` · birleştirme hattı + Lab ve çevrimdışı arena bitti; F0 oynanabilir
