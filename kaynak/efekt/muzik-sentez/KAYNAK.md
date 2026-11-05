# Basit atari arka plan döngüsü (kendi üretimimiz)

- **Neden:** Sahip kararı (2026-11-04): lisanslı menü/arena müziği (OGA M1, M5) bütçeye sığmadığı için sona bırakıldı. Arkada basit bir atari sesi çalacak; oyuncu sesi her ekranda bir düğmeyle açıp kapatabilecek (`docs/ux/kontrol-ve-hud.md` H16).
- **Üretim:** `atari-dongu.py`: kare dalga melodi (%25 görev oranı), üçgen bas, gürültü hi-hat. 120 BPM, 8 ölçü, Am-F-C-G ×2, 16,0 sn, 22 050 Hz mono. Dış örnek ya da kaynak yok.
- **Komut:** `python3 atari-dongu.py atari.wav && ffmpeg -i atari.wav -c:a libvorbis -q:a 0 -map_metadata -1 atari-dongu.ogg`. WAV sha256 `fc7def01232333543523dd400db8c8ac3e11c3c7483ee6e701d534ed4afd2404`. Çıktı 60 053 B.
- **Lisans:** CC0 (bizim).
- **Döngü:** Dosya ölçü sınırında biter. Vorbis kodlayıcısı baş/sonda birkaç ms boşluk bırakabilir; entegrasyonda `loop: true` ile dinlenmeli, tık duyulursa WAV ya da örnek doğruluğunda döngü noktası kullanılmalı.
