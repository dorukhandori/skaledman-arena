import sys
from PIL import Image
cikti, boy, sut = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); dosyalar = sys.argv[4:]
n = len(dosyalar); sat = (n + sut - 1) // sut
p = Image.new("RGBA", (sut * boy, sat * boy), (24, 30, 46, 255))
for k, f in enumerate(dosyalar):
    im = Image.open(f).convert("RGBA"); im.thumbnail((boy, boy))
    p.alpha_composite(im, ((k % sut) * boy + (boy - im.width) // 2, (k // sut) * boy + (boy - im.height) // 2))
p.convert("RGB").save(cikti, quality=85)
