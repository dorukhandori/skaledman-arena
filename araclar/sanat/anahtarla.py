"""Düz zeminli Gemini görselini alfaya çevir (köşe tohumu, kenardan taşma doldurma + yumuşak kenar), kırp, sığdır."""
import sys
from collections import deque
import numpy as np
from PIL import Image

def anahtarla(giris, cikis, en_uzun=512, tol=70, tol2=150):
    im = np.asarray(Image.open(giris).convert("RGB")).astype(np.float32)
    h, w, _ = im.shape
    kose = np.array([im[3, 3], im[3, w - 4], im[h - 4, 3], im[h - 4, w - 4]])
    bg = np.median(kose, axis=0)
    d = np.sqrt(((im - bg) ** 2).sum(axis=2))
    # kenardan bağlı zemin (iç boşluklar da düz zeminse dahil olsun diye ikinci geçişte genel eşik)
    zemin = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        q.append((0, x)); q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0)); q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if zemin[y, x] or d[y, x] >= tol2:
            continue
        zemin[y, x] = True
        if y > 0: q.append((y - 1, x))
        if y < h - 1: q.append((y + 1, x))
        if x > 0: q.append((y, x - 1))
        if x < w - 1: q.append((y, x + 1))
    a = np.clip((d - tol) / (tol2 - tol), 0, 1)
    a = np.where(zemin, a, 1.0)
    a = np.where(d < tol * 0.6, 0.0, a)  # kapalı iç boşluklarda saf zemin rengi de silinir
    # zemin rengini geri çıkar (premultiply tersi)
    aa = np.maximum(a, 1e-3)[..., None]
    renk = np.clip((im - bg * (1 - aa)) / aa, 0, 255)
    rgba = np.dstack([renk, a * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    kutu = out.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if kutu:
        out = out.crop((max(0, kutu[0] - 4), max(0, kutu[1] - 4), min(w, kutu[2] + 4), min(h, kutu[3] + 4)))
    out.thumbnail((en_uzun, en_uzun), Image.LANCZOS)
    out.save(cikis, optimize=True)
    return out.size

if __name__ == "__main__":
    en = int(sys.argv[1]); cifti = sys.argv[2:]
    for k in range(0, len(cifti), 2):
        print(cifti[k + 1], anahtarla(cifti[k], cifti[k + 1], en))
