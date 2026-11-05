"""Ata sayfası -> hologram sayfası (public/ruh/ata/<el>-holo.png).

Parlaklık element gradyanına eşlenir (koyu -> orta -> açık -> vurgu), koyu kontur parlak kenara döner, tek satırlar
sönükleşir (tarama çizgisi), gövde yarı saydam olur. Çalışma anında filtre gerekmez (pixel önbelleğinde filtre bozuluyor).
Renkler src/istemci/oyun/renkler.ts ELEMENT_RENK ile aynı.
"""
import os
import sys
import numpy as np
from PIL import Image

DEPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
P = os.path.join(DEPO, "public", "ruh", "ata")
RENK = {
    "kor": (0x7a1d12, 0xe8452c, 0xff8a5c, 0xffd2a8),
    "kasirga": (0x1f6b52, 0x5bd1a5, 0x9cebc9, 0xe2fff2),
    "simsek": (0x8a6a08, 0xf7d83a, 0xfbe97f, 0xfffbe0),
    "girdap": (0x14286b, 0x2a5bd7, 0x6f93ee, 0xcfdcff),
    "kaya": (0x5a3a14, 0xb07a2c, 0xf0b45a, 0xffe6b0),  # hologramda kehribar (taş grisi sönük kalıyordu)
    "don": (0x3b7d8f, 0x9fe3f5, 0xcff3fb, 0xffffff),
}
GOVDE_ALFA, TARAMA_ALFA, KENAR_ALFA = 0.80, 0.50, 1.0
KONTUR = np.array([10, 13, 24])


def rgb(h):
    return np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], dtype=np.float32)


def kaynak(el, kucuk):
    """Renkli sayfa; küçük sürüm hücre 96 (yarım boy, BOX), yer dar olduğunda oyunda yine ×2 net çizilir."""
    im = Image.open(os.path.join(P, f"{el}.png")).convert("RGBA")
    if not kucuk:
        return im
    k = im.resize((im.width // 2, im.height // 2), Image.BOX)
    a = np.asarray(k).copy()
    a[..., 3] = np.where(a[..., 3] > 100, 255, 0)  # yarı saydam kenar kalmasın (kontur tespiti için)
    return Image.fromarray(a, "RGBA")


for el, kucuk in [(e, k) for e in (sys.argv[1:] or list(RENK)) for k in (False, True)]:
    im = np.asarray(kaynak(el, kucuk)).astype(np.float32)
    a = im[..., 3] > 0
    kontur = a & (np.abs(im[..., :3] - KONTUR).sum(axis=2) < 6)
    lum = (0.299 * im[..., 0] + 0.587 * im[..., 1] + 0.114 * im[..., 2]) / 255
    # kontrastı aç: hologramda form ışıkla okunur
    lum = np.clip((lum - 0.18) / 0.7, 0, 1)
    duraklar = [rgb(h) for h in RENK[el]]
    t = lum * 3
    i = np.clip(t.astype(int), 0, 2)
    f = (t - i)[..., None]
    alt = np.stack([duraklar[0], duraklar[1], duraklar[2]])[i]
    ust = np.stack([duraklar[1], duraklar[2], duraklar[3]])[i]
    renk = alt * (1 - f) + ust * f
    alfa = np.where(a, GOVDE_ALFA, 0.0)
    satir = (np.arange(im.shape[0]) % 2 == 1)[:, None]
    alfa = np.where(a & satir, alfa * TARAMA_ALFA / GOVDE_ALFA * GOVDE_ALFA, alfa)
    renk = np.where(kontur[..., None], duraklar[3], renk)
    alfa = np.where(kontur, KENAR_ALFA, alfa)
    out = np.dstack([np.clip(renk, 0, 255), alfa * 255]).astype(np.uint8)
    if kucuk:  # küçültmede kontur seyreldi: dış kenara 1 px parlak kontur yeniden çiz
        dis = np.zeros_like(a)
        dis[1:] |= a[:-1]; dis[:-1] |= a[1:]; dis[:, 1:] |= a[:, :-1]; dis[:, :-1] |= a[:, 1:]
        dis &= ~a
        out[dis] = (*[int(v) for v in duraklar[3]], 255)
    ad = f"{el}-holo{'-k' if kucuk else ''}.png"
    Image.fromarray(out, "RGBA").save(os.path.join(P, ad), optimize=True)
    print(el, "->", ad)
