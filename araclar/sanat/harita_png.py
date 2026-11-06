"""Paletli PNG yazıcı (10 § 6: PNG palet, alfa 1 bit). harita_piksel.py ve harita_karakter.py kullanır."""
from __future__ import annotations

import numpy as np
from PIL import Image


def paletli_kaydet(rgba: np.ndarray, yol: str) -> int:
    """RGBA (alfa 0/255) -> 'P' kipli PNG; indeks 0 saydam. Döner: renk sayısı (saydam hariç)."""
    m = rgba[..., 3] > 0
    renkler = sorted({tuple(int(c) for c in p) for p in rgba[m][:, :3]})
    if len(renkler) > 255:
        raise ValueError(f"{yol}: {len(renkler)} renk paletli PNG'ye sığmaz")
    sira = {c: i + 1 for i, c in enumerate(renkler)}
    idx = np.zeros(m.shape, np.uint8)
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        idx[y, x] = sira[tuple(int(c) for c in rgba[y, x, :3])]
    im = Image.fromarray(idx, "P")
    pal = [0, 0, 0] + [v for c in renkler for v in c]
    im.putpalette(pal)
    if m.all():
        im.save(yol, optimize=True)
    else:
        im.save(yol, optimize=True, transparency=0)
    return len(renkler)
