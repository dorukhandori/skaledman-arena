# Skaledman Arena — ekip ve çalışma düzeni

Kick yayıncısı swaggybark'ın izleyicilerinin [skaledman.com](https://skaledman.com) albümündeki Pokémon Infinite Fusion kartlarıyla dövüştüğü, tarayıcıda çalışan **gerçek zamanlı 1v1 arena**. Kontroller PokeRivals'ınki (K-7): WASD hareket, 1–4 veya tekerlek hamle, sağ tuş basılı nişan, Shift dash, Space zıplama, Tab takım; kartın iki saldırısı ve tipi hamle yuvalarını doldurur, yeteneği pasif; 3'lü takım. Karakterler 8 yönlü kare animasyonlu piksel sprite (K-5). Albüm ve kart açma Skaledman'da kalır; biz yalnız dövüş katmanıyız. **Durum: planlama bitti, kararlar K-1…K-12 alındı, kod yok.** Belgeler: `docs/design/oyun-konsepti.md`, `docs/tech/mimari.md`, `docs/art/fusion-animasyon.md`, `docs/research/pokerivals-inceleme.md`.

WyrmWar'dan yalnız ekip yapısı ve süreç taşındı; kod taşınmadı.

## Nasıl çalışır

- Claude Code: `CLAUDE.md` otomatik okunur; ajanlar `.claude/agents/`.
- Takip: Paca (http://localhost:8090). Proje **Skaledman Arena** açık (kart öneki `SA`). Kimlik: her yorum `[@nick · Title]` ile başlar; kart başlığı `Ortam │ State │ Title`.
- Karar veren sahip. Ajanlar seçenek + sonuç + öneri sunar, "bu senin kararın" der.

## Çoklu-ajan koordinasyonu (aynı repo'da birden çok oturum)

1. `git pull origin master`
2. `docs/production/ACTIVE_WORK.md`'yi oku: biri aynı dosyalarda mı?
3. Kendi satırını ekle, **yalnız bu dosyayı** commit + push et.
4. İşe başla; küçük ve sık commit (sahip istediğinde).
5. Bitince satırını kapat.

Kararlar `docs/production/roadmap.md`'ye K-numarasıyla, silinmeden, sonuç ve tarihle eklenir; numara tekrar kullanılmaz. Aynı port'ta ikinci dev server açma (`lsof -i :5173`), repo'yu iCloud klasörüne koyma.

## Bağlayıcı gerçekler

- Kâr amaçsız hayran projesi. Pokémon IP'si Nintendo/Creatures/GAME FREAK'in, fusion sprite'ları topluluk sanatçılarının. Reklam ve satış yok; sanatçı kredisi oyun içinde.
- Skaledman bizim değil. API saatte bir çekilir, SQLite'a yazılır; oyun kodu Skaledman'ı canlı çağırmaz. Sahibin onayı alınana kadar yan proje.
- `src/paylasilan` deterministik: DOM yok, Node yok, `Date.now` yok, tohumsuz `Math.random` yok.
- Sunucu yetkili: istemci yalnız girdi yollar.
- Ücretli her çağrı (PixelLab, Gemini, Tripo), alan adı ve bulut kaynağı öncesi sahip onayı. Anahtarlar yalnız ortamdan veya `~/.openclaw/credentials/`.
- VPS kuralları `~/.claude/rules/vps.md`: ayrı systemd birimi + kullanıcı + kota, 127.0.0.1'e bağla, tünelle çık.

## Yasak

Commit ancak sahip isterse. Dev server'ı gereksiz yere öldürme. Anahtar/secret'ı repoya, loga, Paca'ya yazma. Localhost testini çok oyunculu kanıt sayma.
