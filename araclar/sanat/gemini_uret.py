"""Kutsal canavar + Pergel görsel üretimi (Gemini). Anahtar yalnız dosyadan okunur, yazdırılmaz.
Kullanım: python3 gen_ruh.py [grup ...]   grup: portre | tripo | pergel | pergel2 | <id>
"""
import json, os, sys, base64, urllib.request, urllib.error, concurrent.futures, time, datetime

KEY = json.load(open(os.path.expanduser("~/.facecodex/config.json")))["GEMINI_API_KEY"]
MODEL = "gemini-3.1-flash-image"
KOK = "/Users/dorukhanersoyleyen/dev/skaledman-arena/art-source"
KAYIT = KOK + "/ruh/manifest.jsonl"

PORTRE = ("High-quality 16-bit pixel art game sprite, crisp hard-edged pixels, no anti-aliasing, limited palette, bold dark "
          "outline, rich shading. A single majestic sacred spirit beast, full body, centered, filling about 80 percent of the "
          "frame, dramatic heroic rising pose seen slightly from below, its body made of glowing elemental energy but with a "
          "solid, clearly readable silhouette. Perfectly flat uniform solid {bg} background filling the whole image edge to edge, "
          "no gradient, no ground, no cast shadow, no text, no border, no frame, no logo. Square image. Subject: ")
ATA_EK = (" It is a colossal ancient primordial guardian, regal and awe-inspiring, ancient wise glowing eyes, no halo, no ring, no circle "
          "behind it, intricate ornate details, the most powerful creature of its element.")
TRIPO = ("Clean stylized 3D game creature concept render, a single creature sculpture, full body, three-quarter front view from "
         "slightly above, standing pose, every elemental feature sculpted as solid chunky stylized shapes attached to the body "
         "(no floating particles, no smoke, no loose sparks), hand-painted texture look, even soft studio lighting, plain flat "
         "light grey background, no ground, no shadow, no text. Subject: ")

MAG, YESIL = "magenta (#FF00FF)", "pure green (#00FF00)"

RUHLAR = {
 "kozkartal": (MAG, "Közkartal, a fierce fire HAWK spirit (compact raptor body, strongly hooked beak, short squared tail, NO long tail plumes, NOT a phoenix), feathers of glowing ember scales with dark coal edges, wings half spread, talons forward in a diving strike, orange-red and charcoal palette."),
 "kozkaracal": (MAG, "Közkaracal, a fire caracal (lynx-like wild cat) spirit leaping mid-air, long ear tufts burning like candle flames, ember-speckled fur, orange-red palette."),
 "cakmakcakal": (MAG, "Çakmakçakal, a lightning jackal spirit howling upward, crackling electric yellow veins along its back, sparks at its paws, yellow and white palette."),
 "catirgeyik": (MAG, "Çatırgeyik, a lightning deer spirit in a calm counter stance, antlers forked like lightning bolts, electric yellow mane, yellow and white palette."),
 "sarmalbaykus": (MAG, "Sarmalbaykuş, a wind owl spirit with wings spread wide, huge spiral-ringed eyes, feathers trailing into spiral wind ribbons, mint-teal and white palette."),
 "savrukkirlangic": (MAG, "Savrukkırlangıç, a wind swallow spirit seen from the side in a sharp glide: clearly a swallow bird with a small round head, short beak, long pointed swept-back wings and a deeply forked tail, a few wind ribbons trailing behind, mint-teal and white palette."),
 "emisahtapot": (MAG, "Emişahtapot, a whirlpool octopus spirit made of deep blue water, tentacles spiraling outward like a vortex, foam highlights, deep blue palette."),
 "cevrenbalina": (MAG, "Çevrenbalina, a whirlpool whale spirit breaching upward out of a curling wave of water, huge and heavy, deep blue and foam white palette."),
 "kiragitilki": (MAG, "Kırağıtilki, a frost fox spirit, sly and slender, its bushy tail wrapped in a swirl of frost crystals, icy cyan and white palette."),
 "ayazmors": (MAG, "Ayazmors, a frost walrus spirit with heavy chest armored in ice plates and long crystal ice tusks, icy cyan and white palette."),
 "dagzirhli": (MAG, "Dağzırhlı, an earth armadillo spirit half curled, its shell made of carved stone plates with glowing amber cracks, sandstone brown palette."),
 "yontuboga": (MAG, "Yontuboğa, an earth bull spirit charging with lowered head, body of carved granite blocks, massive stone horns, amber glow in the cracks, brown palette."),
 "kulkartal": (YESIL, "Külkartal, a corrupted dark eagle spirit made of black ash and smoldering purple embers, cracked feathers leaking violet light, menacing, purple and black palette."),
 "dokum-karacal": (MAG, "Döküm Karacal, a synthetic cast-metal caracal spirit leaping, steel-blue riveted plates with visible seam lines, ember-orange glow at the joints, steel blue palette."),
 "dokum-sarmalbaykus": (MAG, "Döküm Sarmalbaykuş, a synthetic cast-metal owl spirit with wings spread, steel-blue riveted feathers with seam lines, mint wind glow at the joints, steel blue palette."),
 "ata-kor": (MAG, "Ata Kor, the Alaz Bison: a colossal fire bison with magma veins across its dark hide, a mane of roaring flame on its high hump, short thick horns glowing like hot coals, stomping."),
 "ata-simsek": (MAG, "Ata Şimşek, the Çakım Stag: a colossal white stag with enormous branching antlers made of forked lightning, electric yellow light, head raised toward the sky."),
 "ata-kasirga": (MAG, "Ata Kasırga, the Yel Ray: a colossal sky manta ray gliding with vast diamond-shaped wings, spiral wind trails flowing from the wingtips, long whip tail, mint-teal and white."),
 "ata-girdap": (MAG, "Ata Girdap, the Deep Nautilus: a colossal ancient nautilus with a great spiral shell spinning like a top, a fringe of thick tentacles, deep blue water glowing with abyssal light."),
 "ata-kaya": (MAG, "Ata Kaya, the Mountain Mammoth: a colossal stone mammoth carrying a rocky mountain ridge on its back, huge curved carved stone tusks, trunk raised, amber glowing cracks."),
 "ata-don": (MAG, "Ata Don, the Ayaz Bear: a colossal white ice bear rearing up, a row of large ice crystals along its spine, frost breath, icy cyan and white."),
}

TRIPO_KONSEPT = {
 "ata-kor": "a massive bison with dark basalt-like hide cracked by orange magma veins, a tall mane on its hump sculpted as solid stylized flame shapes, short thick glowing horns, sturdy legs.",
 "ata-simsek": "a massive white stag with huge branching antlers sculpted as solid zigzag lightning-bolt shapes, slender strong legs, short mane with angular electric yellow accents.",
 "ata-kasirga": "a giant manta ray creature with wide diamond-shaped wings, long thin whip tail, cephalic horn lobes, mint-teal top side with white spiral swirl patterns, shown gliding level.",
 "ata-girdap": "a giant nautilus creature with a large ornate spiral shell, many thick curling tentacles below, deep blue shell with glowing cyan spiral bands, big wise eye.",
 "ata-kaya": "a giant stone mammoth with a rocky mountain ridge on its back, huge curved stone tusks, raised trunk, body made of carved granite plates with amber cracks, thick pillar legs.",
 "ata-don": "a giant white polar bear standing on four legs, a row of large pointed blue ice crystals along its spine, frosty fur, pale cyan claws.",
}

PERGEL = ("High-quality 16-bit pixel art character portrait for a game dialogue box, crisp hard-edged pixels, no anti-aliasing, "
          "limited warm palette, bold dark outline. Waist-up view, centered, facing slightly to the right. Perfectly flat uniform "
          "solid magenta (#FF00FF) background edge to edge, no gradient, no text, no border, no frame. Square image. Character: "
          "Pergel, an original nerdy know-it-all young scholar-tinkerer of a spinning-top workshop: thick round brass-rimmed "
          "glasses that slightly enlarge the eyes, messy chestnut hair, a pencil behind one ear, a small brass drafting compass "
          "and folded notes in the breast pocket of a navy scholar's vest, rolled shirt sleeves, a worn leather work apron, a "
          "tiny wooden spinning top hanging from a string in one hand. ")
PERGEL_IFADE = {
 "anlatiyor": "Friendly, eager expression, mouth open mid-explanation, one open palm gesturing as if explaining something.",
 "aslinda": "Smug know-it-all expression, index finger raised in the air as if saying 'actually...', light glinting on the glasses lenses.",
 "sevinc": "Delighted, excited expression, both fists raised in celebration, the little spinning top bouncing on its string.",
}


def kaydet(satir):
    with open(KAYIT, "a") as f:
        f.write(json.dumps(satir, ensure_ascii=False) + "\n")


def uret(ad, prompt, cikti, oran="1:1", refler=()):
    parts = [{"text": prompt}]
    for r in refler:
        parts.append({"inlineData": {"mimeType": "image/png", "data": base64.b64encode(open(r, "rb").read()).decode()}})
    body = {"contents": [{"parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": oran}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    j = None
    for deneme in range(3):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                j = json.load(r)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300].replace(KEY, "***")
            if deneme == 2:
                return ad, f"HTTP {e.code}: {msg}"
            time.sleep(6)
        except Exception as e:  # ağ zaman aşımı
            if deneme == 2:
                return ad, f"hata: {str(e)[:200]}"
            time.sleep(6)
    for p in (j or {}).get("candidates", [{}])[0].get("content", {}).get("parts", []):
        if "inlineData" in p:
            open(cikti, "wb").write(base64.b64decode(p["inlineData"]["data"]))
            kaydet({"dosya": cikti, "model": MODEL, "tarih": datetime.datetime.now().isoformat(timespec="seconds"),
                    "tahminiMaliyetUSD": 0.045, "prompt": prompt[:600]})
            return ad, cikti
    return ad, "görsel yok: " + json.dumps(j)[:300]


def isler(gruplar):
    out = []
    hepsi = not gruplar
    for rid, (bg, tarif) in RUHLAR.items():
        if hepsi or "portre" in gruplar or rid in gruplar:
            p = PORTRE.format(bg=bg) + tarif + (ATA_EK if rid.startswith("ata-") else "")
            out.append((f"portre:{rid}", p, f"{KOK}/ruh/ham/{rid}.png", "1:1", ()))
    for rid, tarif in TRIPO_KONSEPT.items():
        if hepsi or "tripo" in gruplar or f"tripo:{rid}" in gruplar:
            out.append((f"tripo:{rid}", TRIPO + tarif, f"{KOK}/ruh/tripo/{rid}.png", "1:1", ()))
    if hepsi or "pergel" in gruplar:
        out.append(("pergel:anlatiyor", PERGEL + PERGEL_IFADE["anlatiyor"], f"{KOK}/bilgic/anlatiyor.png", "1:1", ()))
    if "pergel2" in gruplar:
        ref = f"{KOK}/bilgic/anlatiyor.png"
        for k in ("aslinda", "sevinc"):
            p = ("Same character as in the reference image, identical face, hair, glasses, outfit, palette and pixel art style, "
                 "same framing and flat magenta background. ") + PERGEL + PERGEL_IFADE[k]
            out.append((f"pergel:{k}", p, f"{KOK}/bilgic/{k}.png", "1:1", (ref,)))
    return out


if __name__ == "__main__":
    liste = isler(set(sys.argv[1:]))
    print(f"{len(liste)} görsel üretilecek", flush=True)
    with concurrent.futures.ThreadPoolExecutor(6) as ex:
        for ad, sonuc in ex.map(lambda a: uret(*a), liste):
            print(ad, "->", sonuc, flush=True)
