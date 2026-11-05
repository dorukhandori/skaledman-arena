# GU-D: topaç sprite sayfalarında kare kenarına değen opak piksel (kırpılma) denetimi.
#   python3 -I araclar/sanat/kare-tasma.py  →  kenara değen kare sayısı (tür/parça başına) ve her karede en dış opak sınırlar
import glob
import json
import os
import sys

from PIL import Image

KOK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
meta = json.load(open(os.path.join(KOK, "veri", "topac-gorsel.json")))
W, H = meta["kamera"]["kare"]
sinir = [W, H, 0, 0]
tasan = 0
for yol in sorted(glob.glob(os.path.join(KOK, "public", "topac", "*", "*.png"))):
    im = Image.open(yol).convert("RGBA")
    a = im.getchannel("A")
    for oy in range(0, im.height, H):
        for ox in range(0, im.width, W):
            k = a.crop((ox, oy, ox + W, oy + H)).getbbox()
            if not k:
                continue
            sinir = [min(sinir[0], k[0]), min(sinir[1], k[1]), max(sinir[2], k[2]), max(sinir[3], k[3])]
            if k[0] == 0 or k[1] == 0 or k[2] == W or k[3] == H:
                tasan += 1
                print("kenara değiyor:", os.path.relpath(yol, KOK), ox // W, oy // H, k)
print("kare", W, H, "opak sınır (x0, y0, x1, y1):", sinir, "kenara değen kare:", tasan)
sys.exit(1 if tasan else 0)
