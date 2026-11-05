"""Ata kareleri -> piksel sanat sprite sayfası (6x4 ızgara) + json."""
import json, sys
import numpy as np
from PIL import Image
import os
DEPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
A = os.path.join(DEPO, "art-source", "ruh", "kare")
P = os.path.join(DEPO, "public", "ruh", "ata")
HUCRE, SUT, SAT = 192, 6, 4
# İçerik kırpma: kükreme+döngü karelerinin (10-23) birleşik kutusu kare bir pencereye %88 doluluk ile oturur; ayak çizgisi
# hücrenin AYAK_Y pikseline düşer (oyun anchor'ı bu sayıyı kullanır). Yükseliş kareleri aynı pencereden kesilir.
DOLULUK, AYAK_Y = 0.80, 184
TON = {"kasirga": ((0.8, 1.0, 0.95), 1.15)}  # çarpan, kontrast
for ad in sys.argv[1:]:
    ham = [Image.open(f"{A}/{ad}/{k:02d}.png").convert("RGBA") for k in range(24)]
    kut = [im.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox() for im in ham[10:24]]
    kut = [b for b in kut if b]
    x0, y0 = min(b[0] for b in kut), min(b[1] for b in kut)
    x1, y1 = max(b[2] for b in kut), max(b[3] for b in kut)
    kenar = max(x1 - x0, y1 - y0) / DOLULUK
    alt = y1 + kenar * (HUCRE - AYAK_Y) / HUCRE
    pencere = (round((x0 + x1) / 2 - kenar / 2), round(alt - kenar), round((x0 + x1) / 2 + kenar / 2), round(alt))
    kareler = []
    for k in range(24):
        im = ham[k].crop(pencere).resize((HUCRE, HUCRE), Image.BOX)
        a = np.asarray(im).astype(np.float32)
        if ad in TON:
            c, kon = TON[ad]
            rgb = a[..., :3] / 255
            rgb = np.clip((rgb - 0.5) * kon + 0.5, 0, 1) * np.array(c)
            a[..., :3] = rgb * 255
        al = a[..., 3]
        rgb = np.where(al[..., None] > 0, a[..., :3] / np.maximum(al[..., None] / 255, 1e-3), 0)
        kareler.append((np.clip(rgb, 0, 255).astype(np.uint8), al > 110))
    # ortak palet
    birlesik = Image.fromarray(np.concatenate([r for r, m in kareler], axis=0), "RGB")
    pal = birlesik.quantize(colors=40, method=Image.MEDIANCUT)
    sayfa = Image.new("RGBA", (HUCRE * SUT, HUCRE * SAT), (0, 0, 0, 0))
    for k, (rgb, m) in enumerate(kareler):
        q = np.asarray(Image.fromarray(rgb, "RGB").quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
        kontur = np.zeros_like(m)
        kontur[1:] |= m[:-1]; kontur[:-1] |= m[1:]; kontur[:, 1:] |= m[:, :-1]; kontur[:, :-1] |= m[:, 1:]
        kontur &= ~m
        out = np.zeros((HUCRE, HUCRE, 4), np.uint8)
        out[m, :3] = q[m]; out[m, 3] = 255
        out[kontur] = (10, 13, 24, 255)
        sayfa.paste(Image.fromarray(out, "RGBA"), ((k % SUT) * HUCRE, (k // SUT) * HUCRE))
    sayfa.save(f"{P}/{ad}.png", optimize=True)
    json.dump({"hucre": HUCRE, "sutun": SUT, "kare": 24, "fps": 16, "ayakY": AYAK_Y, "yukselis": [0, 9], "kukreme": [10, 15], "dongu": [16, 23]},
              open(f"{P}/{ad}.json", "w"))
    print(ad, sayfa.size)
