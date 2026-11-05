"""Kutsal canavar + Pergel görsel üretimi (Gemini). Anahtar yalnız dosyadan okunur, yazdırılmaz.
Kullanım: python3 gen_ruh.py [grup ...]   grup: portre | tripo | pergel | pergel2 | <id>
"""
import json, os, sys, base64, urllib.request, urllib.error, concurrent.futures, time, datetime

KEY = json.load(open(os.path.expanduser("~/.facecodex/config.json")))["GEMINI_API_KEY"]
MODEL = "gemini-3.1-flash-image"
KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "art-source")
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


# Topaç parçaları (docs/art/topac-uretim-istegi.md § 2). Gruplar: topac-ikon | topac-tripo | topac:<id> | topac-tripo:<id>
TOPAC = ("High-quality 16-bit pixel art game sprite of a single mechanical spinning-top PART, crisp hard-edged pixels, no "
         "anti-aliasing, limited palette, bold 1-pixel dark outline in a darker shade of the part's own color (not pure black), "
         "rich cel shading with 4 tones, light from the upper left (bright top-left rim, darker lower-right side). Three-quarter "
         "view from above (camera about 45 degrees above the horizon), the part centered and filling about 80 percent of the "
         "frame, its rotation axis vertical. Original design, no logos, no text, no brand or toy-line styling, no animal, bird, "
         "dragon or wing shapes. Perfectly flat uniform solid magenta (#FF00FF) background edge to edge, no gradient, no ground, "
         "no cast shadow, no border. Square image. Part: ")
# Tripo konsepti (Parti 1 ikinci turda kalibre edildi: "EXACTLY N" vurgusu, yukarıdan ~50°, tek parça). Gemini sayıyı her zaman
# tutturmaz; Blender simetrik dilimi fazla/eksik kanadı ayıklar ama dilim içindeki biçim doğru olmalı: iki varyant (-a/-b) üretilir,
# gözle seçilen <id>.png'ye kopyalanır. Parti 2'den itibaren Gövde boyası MAT KIRMIZI istenir: pişirici sınıfı renkten seçer
# (kırmızı = boya, gri/çelik = metal, altın = altin, beyaz = beyaz); çıktı rengi zaten ELEMENT_RENK rampasından gelir.
TOPAC_TRIPO = ("Clean stylized 3D game asset concept render of ONE single isolated machined part, seen from above at about 50 "
               "degrees, rotation axis vertical, centered, filling 70 percent of the frame, chunky readable shapes with crisp "
               "bevels, hand-painted texture look, even soft studio lighting, plain flat pure white background, no ground, no "
               "shadow, no text, no logo, no other parts. Original design, no animal, bird, dragon or wing shapes. ")
# (n, ikon tarifi (katalog Element rengi), Tripo tarifi)
TOPAC_PARCA = {
 "ok-govde": (3,
  "the attack ring of a spinning top: a thick round disc body with three broad arrowhead blades swept back, a raised ridge "
  "along each blade, two concentric engraved grooves, a polished steel hub ring in the center with an empty socket, painted "
  "glowing ember orange enamel.",
  "A flat round attack ring with EXACTLY THREE (3) identical broad arrowhead-shaped blades spaced 120 degrees apart, "
  "each blade swept back clockwise like a triangular arrow tip pointing along the rim, a raised ridge along each blade, two "
  "concentric engraved grooves on the flat top face, a round polished steel hub ring in the center with an empty round socket. "
  "Blades and body in plain matte medium grey enamel, the hub bright steel. Count: 3 blades only."),
 "hafif-disk": (7,
  "a thin polished steel weight disc for a spinning top with seven small square lock tabs around its rim and one raised "
  "ring on top, brushed metal.",
  "A thin flat steel ring disc (washer shape with a large round center hole) with EXACTLY SEVEN (7) identical small "
  "square tabs evenly spaced around its outer rim, 7 tabs only, and one raised ring on its top face. Brushed dark steel."),
 "duz-uc": (6,
  "the tip of a spinning top: a short dark gunmetal cone with six ribs ending in a wide flat rubber foot.",
  "The bottom tip of a spinning top: a short wide cylinder-cone of dark gunmetal with EXACTLY SIX (6) thick vertical "
  "ribs evenly spaced around it, 6 ribs only, and at the bottom a wide flat black rubber foot disc that is wider than the cone. "
  "Short and squat."),
 "kor-goktasi": (6,
  "a small six-faceted glowing ember-red gemstone set in a gold bezel ring, the core of a spinning top.",
  "A small round gem cap, only this single small part: a thick round gold bezel ring (flat circle) holding a low "
  "six-sided (hexagonal) pyramid-cut ember-red gemstone, 6 facets, nothing else attached, no blades, no stand."),
 # ---- Parti 2: kalan 7 Gövde (boya mat kırmızı; göbek çelik, boş yuva)
 "kalkan-govde": (6,
  "the defense ring of a spinning top: an almost circular thick disc with six shallow rounded lobes, a thick polished steel "
  "outer rim band like a shield edge, six short raised radial ribs on the top face, a steel hub ring with an empty socket, "
  "painted sandstone amber-brown enamel.",
  "A heavy almost circular defense ring with EXACTLY SIX (6) shallow rounded lobes around its edge, 6 lobes only, a thick "
  "bright polished steel outer rim band wrapping the whole edge like a shield rim, six short raised radial ribs on the flat "
  "top face, a round bright steel hub ring in the center with an empty round socket. Body painted matte brick red enamel, "
  "rim band and hub bright steel."),
 "savrulan-govde": (4,
  "the balance ring of a spinning top: a round disc body with four curled hook-shaped blades, curved ridges on each blade "
  "flowing backwards, one engraved groove ring, a polished steel hub ring with an empty socket, painted mint teal enamel.",
  # 2. tur: ilk model kancaları yüksek duvar yaptı (76 px'de yumru); yassı disk + alçak kanca sırtı
  "A LOW FLAT round balance ring, a thick flat disc no taller than a coin stack, with EXACTLY FOUR (4) identical curled "
  "hook-shaped blades spaced 90 degrees apart that stick out flat from the rim in the same plane as the disc (not raised, not "
  "vertical walls), each blade curling counter-clockwise like a flat hook, a low curved ridge along each blade, one engraved "
  "groove ring on the flat top face, a round bright steel hub ring in the center with an empty round socket. Body and blades "
  "painted matte brick red enamel, hub bright steel. Count: 4 blades only."),
 "halka-govde": (6,
  "the stamina ring of a spinning top: a flat perfectly round ring with six small notches on its outer edge, a wide sunken "
  "groove inside and a tall raised outer ring, a polished steel hub ring with an empty socket, painted deep ocean blue enamel.",
  "A flat perfectly round stamina ring with EXACTLY SIX (6) small V-shaped notches evenly spaced on its outer edge, 6 notches "
  "only, a wide sunken channel on the top face and a tall raised round outer ring, a round bright steel hub ring in the "
  "center with an empty round socket. Body painted matte brick red enamel, hub bright steel."),
 "ayaz-govde": (4,
  "the stamina ring of a spinning top: a round heavy weight ring with four low bumps, its top face cut into eight flat "
  "crystal facets like cut ice, a polished steel hub ring with an empty socket, painted icy pale cyan enamel.",
  "A round heavy stamina ring with EXACTLY FOUR (4) low rounded bumps evenly spaced on its edge, 4 bumps only, its top face "
  "cut into eight flat angular facets like a cut crystal, a round bright steel hub ring in the center with an empty round "
  "socket. Body painted matte brick red enamel, hub bright steel."),
 "dusurucu-govde": (2,
  "the attack ring of a spinning top: a small round disc body with two large curved wedge blades like sickles on opposite "
  "sides, a gold stripe along the ridge of each blade, a polished steel hub ring with an empty socket, painted glowing ember "
  "orange enamel.",
  "A compact round attack ring with EXACTLY TWO (2) large curved wedge blades on opposite sides, 180 degrees apart, each "
  "shaped like a sickle sweeping clockwise (a tool shape, not an animal), a raised gold stripe along the ridge of each blade, "
  "a round bright steel hub ring in the center with an empty round socket. Body and blades painted matte brick red enamel, "
  "stripes gold, hub bright steel. Count: 2 blades only."),
 "sivri-govde": (3,
  "the attack ring of a spinning top: a round disc body with three long sharp spikes, small rounded fillers between the "
  "spikes, a gold stripe along the ridge of each spike, a polished steel hub ring with an empty socket, painted electric "
  "yellow enamel.",
  "A round attack ring with EXACTLY THREE (3) long sharp pointed spikes spaced 120 degrees apart, slightly swept clockwise, "
  "small rounded filler bumps between the spikes, a raised gold stripe along the ridge of each spike, a round bright steel "
  "hub ring in the center with an empty round socket. Body and spikes painted matte brick red enamel, stripes gold, hub "
  "bright steel. Count: 3 spikes only."),
 "izli-govde": (4,
  "the balance ring of a spinning top: a round disc body with four long slanted blades and eight small notches on the rim, "
  "eight thin white fins on the top face, a polished steel hub ring with an empty socket, painted mint teal enamel.",
  "A round balance ring with EXACTLY FOUR (4) long slanted blades spaced 90 degrees apart swept clockwise, eight small notches "
  "on the rim, eight thin raised pure white fins radiating on the top face, a round bright steel hub ring in the center with "
  "an empty round socket. Body and blades painted matte brick red enamel, fins white, hub bright steel. Count: 4 blades only."),
}
TOPAC_KOK = KOK + "/topac"
TOPAC_KAYIT = TOPAC_KOK + "/manifest.jsonl"


def kaydet(satir):
    os.makedirs(os.path.dirname(KAYIT), exist_ok=True)
    yol = TOPAC_KAYIT if "/topac/" in satir.get("dosya", "") else KAYIT
    with open(yol, "a") as f:
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
    for d in ("ikon-ham", "tripo", "glb"):
        os.makedirs(f"{TOPAC_KOK}/{d}", exist_ok=True)
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
    for pid, (n, ikon, tripo) in TOPAC_PARCA.items():
        if "topac-ikon" in gruplar or f"topac:{pid}" in gruplar:
            out.append((f"topac-ikon:{pid}", TOPAC + ikon, f"{TOPAC_KOK}/ikon-ham/{pid}.png", "1:1", ()))
        if "topac-tripo" in gruplar or f"topac-tripo:{pid}" in gruplar:
            for v in ("a", "b"):
                out.append((f"topac-tripo:{pid}-{v}", TOPAC_TRIPO + tripo, f"{TOPAC_KOK}/tripo/{pid}-{v}.png", "1:1", ()))
    return out


if __name__ == "__main__":
    liste = isler(set(sys.argv[1:]))
    print(f"{len(liste)} görsel üretilecek", flush=True)
    with concurrent.futures.ThreadPoolExecutor(6) as ex:
        for ad, sonuc in ex.map(lambda a: uret(*a), liste):
            print(ad, "->", sonuc, flush=True)
