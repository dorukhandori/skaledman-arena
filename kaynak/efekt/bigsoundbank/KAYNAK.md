# BigSoundBank #2700 "Coin spinning on a table #4" (Durma)

- **Eser:** Joseph SARDIN, BigSoundBank #2700. Sayfa: https://bigsoundbank.com/coin-spinning-on-a-table-4-s2700.html
- **Lisans:** CC0 1.0. Ses sayfasından aynen: "License CC0 (public domain): Free and royalty-free". Lisans sayfasından (https://bigsoundbank.com/licenses.html) aynen: "You are allowed to: Share, copy, distribute and communicate the material by all means and in all formats. Adapt, remix, transform and create from material. Use, including for commercial purposes. Without any restrictions. Without asking permission. This is: Creative Commons CC0 1.0 Universal". `LICENSE` = CC0 1.0 yasal metni.
- **Açıklama (aynen):** "Sound of a €2 coin spinning on my varnished wooden kitchen table. It turns, then slows down and stops." Asıl kayıt 0:15 (14,58 sn), 48 kHz stereo.
- **İndirme:** https://bigsoundbank.com/UPLOAD/flac/2700.flac, sha256 `b945fc7b4b026ac3f78f2032b1b47592aa1e56827a0f551f83ab77944759a040`, 2 672 312 B, 2026-11-04.
- **Dönüştürme:** 12,60-13,95 sn kırpıldı (para 13,75 sn'de duruyor: son yalpalama + durma); 40 ms giriş, 150 ms çıkış sönümü; mono 22 050 Hz, Vorbis q2: `ffmpeg -ss 12.6 -to 13.95 -i 2700.flac -af "afade=t=in:d=0.04,afade=t=out:st=1.2:d=0.15" -ac 1 -ar 22050 -c:a libvorbis -q:a 2 -map_metadata -1`. Çıktı 1,35 sn, 9 773 B.
- **Atıf:** Gerekmez; kredilere "Durma sesi: Joseph Sardin, BigSoundBank (CC0)" yazılır.
