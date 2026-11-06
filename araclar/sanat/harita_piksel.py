"""Harita sanat turu, adım 2: Gemini ham görselleri -> oyun PNG'leri (public/harita/**), aynı yol ve boyutlar.

- Alfa: anahtarla.py (köşe tohumu), sonra kırp.
- Piksele indirme: önce ham görselin kendi baskın renklerinden palet (medyan kesim), sonra BOX küçültme, 1 bit alfa,
  en yakın palet rengine eşleme (renk sayısı ikon için <= 32), dış 1 px kontur #05050A.
- Palet takası: gri kalıp parlaklığa göre 5 düzeye ayrılır, düzeyler kademe/bölge rampasına eşlenir (10 § 2).
Kullanım: ~/.venvs/uo-asset/bin/python araclar/sanat/harita_piksel.py [ikon|kalip|zemin|hepsi]
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from anahtarla import anahtarla  # noqa: E402
from harita_png import paletli_kaydet  # noqa: E402

DEPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
HAM = os.path.join(DEPO, "art-source", "harita", "ham")
ALFA = os.path.join(DEPO, "art-source", "harita", "alfa")
PUB = os.path.join(DEPO, "public", "harita")
KONTUR = (5, 5, 10)
SECIM = os.path.join(DEPO, "art-source", "harita", "secim.json")  # id -> seçilen varyant dosyası (ör. "zemin-yel-sirti-b")

# 10 § 2 kademe dili: koyu, ana, vurgu
KADEME = {
    "demir": ("#4A4846", "#8C8A88", "#C8C6C2"),
    "kaya": ("#45392A", "#B0743A", "#E6C08A"),
    "don": ("#3B7D8F", "#9FE3F5", "#FFFFFF"),
    "kor": ("#7A1D12", "#E8452C", "#FFD2A8"),
    "kasirga": ("#1F6B52", "#5BD1A5", "#E2FFF2"),
    "simsek": ("#8A6A08", "#F7D83A", "#FFFBE0"),
    "girdap": ("#14286B", "#2A5BD7", "#CFDCFF"),
    "devir": ("#6B5A8A", "#C9B8E8", "#F4E9FF"),
}
DEVIR_YANAR = ["#FFD2A8", "#E2FFF2", "#FFFBE0", "#CFDCFF", "#E6C08A", "#FFFFFF"]  # 6 element vurgusu (yanardöner)
BOLGE = {
    "ocak-yamaci": "kaya", "ayaz-gecidi": "don", "kor-kraterleri": "kor",
    "yel-sirti": "kasirga", "cakim-yaylasi": "simsek", "dip-magaralari": "girdap",
}
ALTIN = ("#6B5418", "#C9A33B", "#FCD35A")
KOLEKSIYON = ("#2E2440", "#6B5A8A", "#F4E9FF")

uretilen: list[dict] = []


def hx(h: str) -> np.ndarray:
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)


def secim(gid: str) -> str:
    s = json.load(open(SECIM)) if os.path.exists(SECIM) else {}
    return os.path.join(HAM, s.get(gid, gid) + ".png")


def alfali(gid: str) -> Image.Image:
    os.makedirs(ALFA, exist_ok=True)
    cik = os.path.join(ALFA, gid + ".png")
    anahtarla(secim(gid), cik, en_uzun=1024)
    return Image.open(cik).convert("RGBA")


def palet(im: Image.Image, n: int) -> np.ndarray:
    a = np.asarray(im)
    px = a[a[..., 3] > 200][:, :3]
    if len(px) == 0:
        return np.zeros((1, 3), np.float32)
    ornek = Image.fromarray(px.reshape(1, -1, 3).astype(np.uint8), "RGB")
    q = ornek.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    p = np.array(q.getpalette()[: n * 3], np.float32).reshape(-1, 3)
    return p


def kucult(im: Image.Image, w: int, h: int) -> tuple[np.ndarray, np.ndarray]:
    """Premultiplied BOX küçültme -> (rgb float, alfa 0..1)."""
    a = np.asarray(im).astype(np.float32) / 255
    pm = a.copy()
    pm[..., :3] *= pm[..., 3:4]
    k = Image.fromarray((pm * 255).astype(np.uint8), "RGBA").resize((w, h), Image.Resampling.BOX)
    b = np.asarray(k).astype(np.float32) / 255
    al = b[..., 3]
    rgb = np.where(al[..., None] > 0, b[..., :3] / np.maximum(al[..., None], 1e-3), 0) * 255
    return rgb, al


def eslestir(rgb: np.ndarray, pal: np.ndarray) -> np.ndarray:
    d = ((rgb[..., None, :] - pal[None, None]) ** 2).sum(-1)
    return pal[d.argmin(-1)]


def kontur_ekle(rgba: np.ndarray) -> np.ndarray:
    m = rgba[..., 3] > 0
    k = np.zeros_like(m)
    k[1:] |= m[:-1]
    k[:-1] |= m[1:]
    k[:, 1:] |= m[:, :-1]
    k[:, :-1] |= m[:, 1:]
    k &= ~m
    out = rgba.copy()
    out[k] = (*KONTUR, 255)
    return out


def ikon(gid: str, n: int, renk: int = 24, esik: float = 0.45, dolgu: float = 1.0) -> np.ndarray:
    """Ham -> n×n (iç n-2 + kontur), RGBA uint8."""
    im = alfali(gid)
    pal = palet(im, renk)
    ic = n - 2
    w, h = im.size
    s = ic * dolgu / max(w, h)
    tw, th = max(1, round(w * s)), max(1, round(h * s))
    rgb, al = kucult(im, tw, th)
    q = eslestir(rgb, pal)
    tuval = np.zeros((n, n, 4), np.uint8)
    ox, oy = (n - tw) // 2, (n - th) // 2
    m = al > esik
    blok = np.zeros((th, tw, 4), np.uint8)
    blok[m, :3] = q[m].astype(np.uint8)
    blok[m, 3] = 255
    tuval[oy:oy + th, ox:ox + tw] = blok
    return kontur_ekle(tuval)


def rampa(koyu: str, ana: str, vurgu: str) -> list[np.ndarray]:
    k, a, v = hx(koyu), hx(ana), hx(vurgu)
    return [k * 0.62, k, (k + a) / 2, a, (a + v) / 2, v]


def takas(gri: np.ndarray, ramp: list[np.ndarray], yanar: list[str] | None = None) -> np.ndarray:
    """Gri kalıp -> rampa. Kontur korunur; gri olmayan pikseller (ör. altın yıldız) aynen kalır."""
    out = gri.copy()
    m = (gri[..., 3] > 0) & ~np.all(gri[..., :3] == KONTUR, axis=-1)
    r, g, b = (gri[..., i].astype(np.int16) for i in range(3))
    gri_mi = (np.abs(r - g) < 14) & (np.abs(g - b) < 14)
    m &= gri_mi
    lum = gri[..., :3].astype(np.float32).mean(-1)
    if not m.any():
        return out
    lo, hi = np.percentile(lum[m], 3), np.percentile(lum[m], 97)
    t = np.clip((lum - lo) / max(hi - lo, 1), 0, 0.999)
    duzey = (t * len(ramp)).astype(int)
    for i, c in enumerate(ramp):
        out[m & (duzey == i), :3] = c.astype(np.uint8)
    if yanar:
        ys, xs = np.nonzero(m & (duzey == len(ramp) - 1))
        for y, x in zip(ys, xs):
            out[y, x, :3] = hx(yanar[(x + y) % len(yanar)]).astype(np.uint8)
    return out


def yaz(rgba: np.ndarray, yol: str, olay: str, kaynak: str, renk_tavan: int = 32) -> None:
    tam = os.path.join(PUB, yol + ".png")
    os.makedirs(os.path.dirname(tam), exist_ok=True)
    renkler = {tuple(p) for p in rgba.reshape(-1, 4) if p[3]}
    if len(renkler) > renk_tavan:
        rgb = Image.fromarray(rgba[..., :3]).quantize(colors=renk_tavan - 1, method=Image.Quantize.MEDIANCUT,
                                                      dither=Image.Dither.NONE).convert("RGB")
        a = rgba.copy()
        a[..., :3] = np.asarray(rgb)
        a[rgba[..., 3] == 0] = 0
        rgba = a
    renk = paletli_kaydet(rgba, tam)
    uretilen.append({"ad": yol, "dosya": f"harita/{yol}.png", "olay": olay, "kaynak": kaynak,
                     "bayt": os.path.getsize(tam), "renk": renk})


def kose_yildiz(a: np.ndarray, renk: str) -> np.ndarray:
    out = a.copy()
    c = hx(renk).astype(np.uint8)
    for cx, cy in ((2, 2), (21, 2), (2, 21), (21, 21)):
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            out[cy + dy, cx + dx] = (*c, 255)
    return out


def cerceve_kalip(gid: str) -> np.ndarray:
    """24×24 9-dilim (kenar 6): ham çerçeveyi 24'e indir, iç 12×12 boş, dış ve iç kenara kontur."""
    im = alfali(gid)
    pal = palet(im, 16)
    rgb, al = kucult(im, 22, 22)
    q = eslestir(rgb, pal)
    out = np.zeros((24, 24, 4), np.uint8)
    blok = np.zeros((22, 22, 4), np.uint8)
    blok[..., :3] = q.astype(np.uint8)
    blok[..., 3] = 255
    out[1:23, 1:23] = blok
    yy, xx = np.mgrid[0:24, 0:24]
    d = np.minimum(np.minimum(xx, yy), np.minimum(23 - xx, 23 - yy))
    out[d > 5] = 0
    out[(d == 0) | (d == 5)] = (*KONTUR, 255)
    return out


def ikonlar() -> None:
    kaynak = "Gemini gemini-3.1-flash-image -> anahtarla.py -> harita_piksel.py"
    tablo = {
        "dugum/dusman": ("dugum-dusman", "Harita düğümü: DÜŞMAN (iki topaç çarpışıyor)"),
        "dugum/patron": ("dugum-patron", "Harita düğümü: PATRON (taçlı ağır topaç)"),
        "dugum/maden": ("dugum-maden", "Harita düğümü: MADEN (kaya + kazma)"),
        "dugum/sandik": ("dugum-sandik", "Harita düğümü: SANDIK (kapalı)"),
        "dugum/sandik-bos": ("dugum-sandik-bos", "Harita düğümü: SANDIK (açık, boş)"),
        "dugum/kilit": ("dugum-kilit", "Düğüm durum katmanı: kilit"),
        "ustalik/madencilik": ("ustalik-madencilik", "Ustalık rozeti: Madencilik (kazma)"),
        "ustalik/isleme": ("ustalik-isleme", "Ustalık rozeti: İşleme (çekiç + örs)"),
    }
    for yol, (gid, olay) in tablo.items():
        yaz(ikon(gid, 13, renk=20), yol, olay, kaynak)
    # A8 usta işi parıltısı: tek Gemini parıltısından 8 ölçek karesi (16×16), kontursuz ışık
    im = alfali("efekt-parilti")
    pal = palet(im, 8)
    serit = np.zeros((16, 128, 4), np.uint8)
    for k, boy in enumerate((5, 9, 13, 16, 14, 16, 11, 7)):
        rgb, al = kucult(im, boy, boy)
        q = eslestir(rgb, pal)
        m = al > 0.12
        o = (16 - boy) // 2
        blok = serit[o:o + boy, k * 16 + o:k * 16 + o + boy]
        blok[m, :3] = q[m].astype(np.uint8)
        blok[m, 3] = 255
    yaz(serit, "efekt/usta-isi", "Usta işi parıltısı (8 kare × 16×16, tek Gemini parıltısından ölçek dizisi)", kaynak)


def kaliplar() -> None:
    kaynak = "Gemini gri kalıp -> harita_piksel.py palet takası"
    cev, kul = ikon("kalip-cevher", 16, renk=12), ikon("kalip-kulce", 16, renk=12)
    for i, (kid, r) in enumerate(KADEME.items(), 1):
        yan = DEVIR_YANAR if kid == "devir" else None
        yaz(takas(cev, rampa(*r), yan), f"maden/cevher-{kid}", f"Cevher K{i} {kid} (gri kalıp + palet takası)", kaynak)
        yaz(takas(kul, rampa(*r), yan), f"maden/kulce-{kid}", f"Külçe K{i} {kid} (gri kalıp + palet takası)", kaynak)
    arma_c = ikon("kalip-arma-cevher", 24, renk=12)
    for kid, r in KADEME.items():
        yaz(takas(arma_c, rampa(*r), DEVIR_YANAR if kid == "devir" else None), f"arma/arma-cevher-{kid}",
            f"Arma: {kid} cevheri (Ocak tarifi)", kaynak)
    yaz(takas(arma_c, rampa(*KADEME["girdap"])), "arma/arma-dip", "Arma: Dip (sezon 2 başarımı)", kaynak)
    yaz(takas(ikon("kalip-arma-kazma", 24, renk=12), rampa(*KADEME["kaya"])), "arma/arma-kazma",
        "Arma: kazma (Ocak Yamacı başarımı)", kaynak)
    for b, e in BOLGE.items():
        yaz(takas(ikon(f"kalip-arma-{e}", 24, renk=12), rampa(*KADEME[e])), f"arma/arma-{b}",
            f"Arma: {b} (patron USTALAŞ; bölge motifi)", kaynak)
    perci, duz, krater = (cerceve_kalip(f"kalip-cerceve-{x}") for x in ("perci", "duz", "krater"))
    for kid, r in KADEME.items():
        yaz(takas(perci, rampa(*r), DEVIR_YANAR if kid == "devir" else None), f"cerceve/cerceve-{kid}",
            f"Çerçeve: {kid} (perçinli, 9-dilim kenar 6)", kaynak)
    for b, e in BOLGE.items():
        yaz(takas(duz, rampa(*KADEME[e])), f"cerceve/cerceve-{b}", f"Çerçeve: {b} (GÜMÜŞ rozet, oluklu)", kaynak)
    yaz(takas(krater, rampa(*KADEME["kor"])), "cerceve/cerceve-krater", "Çerçeve: krater", kaynak)
    yaz(kose_yildiz(takas(duz, rampa(*ALTIN)), "#FFFBE0"), "cerceve/cerceve-yildiz", "Çerçeve: yıldız (altın)", kaynak)
    yaz(takas(perci, rampa(*KOLEKSIYON), DEVIR_YANAR), "cerceve/cerceve-koleksiyon", "Çerçeve: koleksiyon", kaynak)
    yaz(kose_yildiz(takas(duz, rampa(*KADEME["demir"])), "#FCD35A"), "cerceve/cerceve-usta-madenci",
        "Çerçeve: usta madenci", kaynak)
    yaz(kose_yildiz(takas(krater, rampa(*KADEME["kor"])), "#FCD35A"), "cerceve/cerceve-usta-ocakci",
        "Çerçeve: usta ocakçı", kaynak)


def zeminler() -> None:
    kaynak = "Gemini gemini-3.1-flash-image -> harita_piksel.py (kırp, BOX küçült, <= 48 renk)"
    isler = {f"zemin/{b}": (f"zemin-{b}", 480, 200, f"Bölge zemini: {b}") for b in BOLGE}
    isler["zemin/ocak-agzi"] = ("ocak-agzi", 480, 270, "Maden ekranı: ocak ağzı kaya çerçevesi")
    for yol, (gid, w, h, olay) in isler.items():
        im = Image.open(secim(gid)).convert("RGB")
        W, H = im.size
        kenar = round(min(W, H) * 0.04)  # Gemini'nin ince çerçeve çizgisini at
        im = im.crop((kenar, kenar, W - kenar, H - kenar))
        W, H = im.size
        if W / H > w / h:
            nw = round(H * w / h)
            im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
        else:
            nh = round(W * h / w)
            im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
        pal = palet(im.convert("RGBA"), 48)
        rgb = np.asarray(im.resize((w, h), Image.Resampling.BOX)).astype(np.float32)
        q = eslestir(rgb, pal).astype(np.uint8)
        a = np.dstack([q, np.full((h, w), 255, np.uint8)])
        yaz(a, yol, olay, kaynak, renk_tavan=48)


if __name__ == "__main__":
    s = set(sys.argv[1:]) or {"hepsi"}
    if s & {"ikon", "hepsi"}:
        ikonlar()
    if s & {"kalip", "hepsi"}:
        kaliplar()
    if s & {"zemin", "hepsi"}:
        zeminler()
    os.makedirs(os.path.join(DEPO, "art-source", "harita"), exist_ok=True)
    kayit = os.path.join(DEPO, "art-source", "harita", "uretilen.json")
    eski = json.load(open(kayit)) if os.path.exists(kayit) else []
    yeni = {u["ad"]: u for u in eski} | {u["ad"]: u for u in uretilen}
    json.dump(list(yeni.values()), open(kayit, "w"), ensure_ascii=False, indent=1)
    print(f"{len(uretilen)} dosya; renk tavanı aşan yok" if all(u["renk"] <= 48 for u in uretilen) else "renk!")
