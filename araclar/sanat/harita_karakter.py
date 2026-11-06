"""Harita karakteri, adım 3: Blender kareleri (art-source/harita/kare/karakter-<g>/NN.png, 256×384) -> piksel sayfa.

Sayfa: public/harita/karakter/govde-<g>-renk-<r>.png, 144×72 = 9×3 hücre, hücre 16×24, 27 kare (13 § 2.2).
- Ölçek: BEKLE karesindeki boy 19 px olacak şekilde tek çarpan; ayak satırı 22 (23 kontur). Bütün kareler aynı çarpanla.
- Palet: gövde başına ortak <= 23 renk (medyan kesim) + 1 px kontur #05050A = <= 24 renk.
- Palet takası: parlak yeşil giysi pikselleri (render ana renk) parlaklık sırasıyla profil rengi rampasına eşlenir.
Kullanım: ~/.venvs/uo-asset/bin/python araclar/sanat/harita_karakter.py
"""
from __future__ import annotations

import colorsys
import json
import os

import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harita_png import paletli_kaydet  # noqa: E402

DEPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
KARE = os.path.join(DEPO, "art-source", "harita", "kare")
PUB = os.path.join(DEPO, "public", "harita", "karakter")
PROFIL = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"]
KONTUR = (5, 5, 10)
HW, HH, BOY, AYAK = 16, 24, 19, 22


def hx(h: str) -> np.ndarray:
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)


def kucult(im: Image.Image, f: float) -> tuple[np.ndarray, np.ndarray]:
    a = np.asarray(im.convert("RGBA")).astype(np.float32) / 255
    a[..., :3] *= a[..., 3:4]
    w, h = max(1, round(im.width * f)), max(1, round(im.height * f))
    k = np.asarray(Image.fromarray((a * 255).astype(np.uint8), "RGBA").resize((w, h), Image.Resampling.BOX)).astype(np.float32) / 255
    al = k[..., 3]
    rgb = np.where(al[..., None] > 0, k[..., :3] / np.maximum(al[..., None], 1e-3), 0) * 255
    return rgb, al


def yesil_mi(c: np.ndarray) -> bool:
    h, s, v = colorsys.rgb_to_hsv(*(c / 255))
    return 0.17 < h < 0.50 and s > 0.22 and v > 0.08


def profil_rampa(renk: str, n: int) -> list[np.ndarray]:
    c = hx(renk)
    tonlar = np.linspace(0.42, 1.18, n)
    return [np.clip(c * t if t <= 1 else c + (255 - c) * (t - 1) * 1.6, 0, 255) for t in tonlar]


def sayfa(g: int) -> list[str]:
    ham = [Image.open(os.path.join(KARE, f"karakter-{g}", f"{k:02d}.png")) for k in range(27)]
    kutu = ham[0].getchannel("A").point(lambda v: 255 if v > 100 else 0).getbbox()
    f = BOY / (kutu[3] - kutu[1])
    ox = HW / 2 - (kutu[0] + kutu[2]) / 2 * f
    oy = AYAK + 1 - kutu[3] * f
    hucreler = []
    for im in ham:
        rgb, al = kucult(im, f)
        h, w = al.shape
        tuval = np.zeros((HH, HW, 4), np.float32)
        x0, y0 = round(ox), round(oy)
        for yy in range(h):
            ty = yy + y0
            if not 0 <= ty < HH - 1:
                continue
            for xx in range(w):
                tx = xx + x0
                if 1 <= tx < HW - 1 and al[yy, xx] > 0.5:
                    tuval[ty, tx, :3] = rgb[yy, xx]
                    tuval[ty, tx, 3] = 1
        if tuval[0, ..., 3].any():
            tuval[0, ..., 3] = 0  # üst satır konturda kalsın
        hucreler.append(tuval)
    # ortak palet (<= 23 renk)
    px = np.concatenate([c[c[..., 3] > 0][:, :3] for c in hucreler])
    q = Image.fromarray(px.reshape(1, -1, 3).astype(np.uint8), "RGB").quantize(colors=23, method=Image.Quantize.MEDIANCUT)
    pal = np.array(q.getpalette()[: 23 * 3], np.float32).reshape(-1, 3)
    gri = np.zeros((HH * 3, HW * 9, 4), np.uint8)
    for k, c in enumerate(hucreler):
        m = c[..., 3] > 0
        d = ((c[..., None, :3] - pal[None, None]) ** 2).sum(-1).argmin(-1)
        out = np.zeros((HH, HW, 4), np.uint8)
        out[m, :3] = pal[d[m]].astype(np.uint8)
        out[m, 3] = 255
        km = np.zeros_like(m)
        km[1:] |= m[:-1]
        km[:-1] |= m[1:]
        km[:, 1:] |= m[:, :-1]
        km[:, :-1] |= m[:, 1:]
        km &= ~m
        out[km] = (*KONTUR, 255)
        gri[(k // 9) * HH:(k // 9 + 1) * HH, (k % 9) * HW:(k % 9 + 1) * HW] = out
    # palet takası: yeşil palet girdileri parlaklık sırasıyla
    yesiller = sorted((i for i, c in enumerate(pal) if yesil_mi(c)), key=lambda i: pal[i].mean())
    yazilan = []
    for r, renk in enumerate(PROFIL):
        rampa = profil_rampa(renk, max(2, len(yesiller)))
        out = gri.copy()
        for sira, i in enumerate(yesiller):
            mm = np.all(gri[..., :3] == pal[i].astype(np.uint8), axis=-1) & (gri[..., 3] > 0)
            out[mm, :3] = rampa[sira].astype(np.uint8)
        yol = os.path.join(PUB, f"govde-{g}-renk-{r}.png")
        paletli_kaydet(out, yol)
        yazilan.append(yol)
    print(f"gövde {g}: çarpan {f:.4f}, yeşil palet girdisi {len(yesiller)}")
    return yazilan


if __name__ == "__main__":
    os.makedirs(PUB, exist_ok=True)
    hepsi = [y for g in range(4) for y in sayfa(g)]
    kayit = os.path.join(DEPO, "art-source", "harita", "karakter-uretilen.json")
    json.dump([os.path.relpath(y, os.path.join(DEPO, "public")) for y in hepsi], open(kayit, "w"), indent=1)
    print(len(hepsi), "sayfa")
