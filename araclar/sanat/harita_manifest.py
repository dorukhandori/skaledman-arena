"""veri/manifest-gorsel.json `harita` bloğunu sanat turu kayıtlarından yazar (diğer bloklar korunur).

Girdi: art-source/harita/uretilen.json (harita_piksel.py), karakter-uretilen.json (harita_karakter.py),
art-source/harita/manifest.jsonl (Gemini çağrıları), tripo-kayit.jsonl (Tripo görevleri). public/harita/** taranır;
kaydı olmayan dosya "kod (harita-asset-uret.ts)" yer tutucusu sayılır.
Kullanım: python3 araclar/sanat/harita_manifest.py
"""
from __future__ import annotations

import glob
import json
import os

DEPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
A = os.path.join(DEPO, "art-source", "harita")
NOT = ("Yapay zekâ üretimi (sahip onaylı Mac sanat hattı): Gemini gemini-3.1-flash-image konsept/ham görsel, karakter için "
       "Tripo image-to-model v3.1 + Blender 5.2 kare render; piksele indirme, palet takası ve kontur kendi betiklerimiz. "
       "Mevcut bir serinin karakteri ya da tasarımı bilerek kullanılmadı. Ham dosyalar depo dışında (art-source/harita/).")


def jsonl(yol: str) -> list[dict]:
    return [json.loads(s) for s in open(yol)] if os.path.exists(yol) else []


def main() -> None:
    kayit = {u["dosya"]: u for u in json.load(open(os.path.join(A, "uretilen.json")))}
    karakter = set(json.load(open(os.path.join(A, "karakter-uretilen.json"))))
    gemini = jsonl(os.path.join(A, "manifest.jsonl"))
    tripo = jsonl(os.path.join(A, "tripo-kayit.jsonl"))
    dosyalar = []
    for yol in sorted(glob.glob(os.path.join(DEPO, "public", "harita", "**", "*.png"), recursive=True)):
        rel = os.path.relpath(yol, os.path.join(DEPO, "public"))
        ad = rel[len("harita/"):-4]
        satir = {"ad": ad, "dosya": rel, "bayt": os.path.getsize(yol), "lisans": "bizim (yapay zekâ çıktısı)"}
        if rel in kayit:
            satir |= {"olay": kayit[rel]["olay"], "kaynak": kayit[rel]["kaynak"], "renk": kayit[rel]["renk"]}
        elif rel in karakter:
            g, r = ad.split("-")[1], ad.split("-")[3]
            satir |= {"olay": f"Karakter sayfası: gövde {g}, profil rengi {r} (27 kare: BEKLE 4, YÜRÜ 6, KAZ 6, "
                              "DÖVÜŞE GİR 5, KUTLA 6)",
                      "kaynak": "Gemini konsept -> Tripo image-to-model v3.1 -> Blender 5.2 (karakter_render.py, konuma "
                                "göre iskelet) -> harita_karakter.py (16×24, <= 24 renk, yeşil giysi -> profil rengi)"}
        else:
            satir |= {"olay": "yer tutucu", "kaynak": "kod (araclar/sanat/harita-asset-uret.ts)", "lisans": "CC0-1.0"}
        dosyalar.append(satir)
    yol = os.path.join(DEPO, "veri", "manifest-gorsel.json")
    m = json.load(open(yol))
    m["harita"] = {
        "aciklama": "Harita/Maden/Ocak 2B varlıkları, sanat turu (docs/production/raporlar/HARITA-SANAT.md). Kodun beklediği "
                    "yol ve boyutlar değişmedi (haritaVarlik.ts); zeminler (zemin/) yeni.",
        "kaynak": "Gemini + Tripo + Blender (araclar/sanat/harita_gemini.py, harita_piksel.py, blender/karakter_render.py, "
                  "harita_karakter.py)",
        "yapayZekaNotu": NOT,
        "lisans": "bizim (yapay zekâ çıktısı; hizmet koşulları: çıktı kullanıcıya ait, sahip doğrulayacak)",
        "tarih": "2026-11-06",
        "uretim": {
            "geminiCagri": len(gemini),
            "geminiTahminiUSD": round(sum(g.get("tahminiMaliyetUSD", 0) for g in gemini), 3),
            "tripoGorev": len(tripo),
            "tripoKredi": sum(t.get("kredi", 0) for t in tripo if isinstance(t.get("kredi"), int)),
        },
        "toplamBayt": sum(d["bayt"] for d in dosyalar),
        "karakterKareleri": {"bekle": [0, 4], "yuru": [4, 6], "kaz": [10, 6], "dovus": [16, 5], "kutla": [21, 6]},
        "dosyalar": dosyalar,
    }
    json.dump(m, open(yol, "w"), ensure_ascii=False, indent=1)
    open(yol, "a").write("\n")
    print(len(dosyalar), "dosya", m["harita"]["uretim"], m["harita"]["toplamBayt"], "bayt")


if __name__ == "__main__":
    main()
