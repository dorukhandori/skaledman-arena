"""Harita / Maden / Ocak sanat turu: Gemini ham görselleri (docs/design/harita/10 § 3, § 5 partileri HP-1, HP-2, HP-K, HP-3).
Anahtar gemini_uret.py içinden dosyadan okunur, yazdırılmaz. Çıktı art-source/harita/ham/<id>.png (depo dışı); kayıt
art-source/harita/manifest.jsonl. Piksele indirme ve palet takası: harita_piksel.py.

Kullanım: ~/.venvs/uo-asset/bin/python araclar/sanat/harita_gemini.py <grup|id> [...] [--varyant b]
  gruplar: hp1 | hp2 | hpk | hp3 | hepsi
"""
import os
import sys
import concurrent.futures

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemini_uret as g  # noqa: E402

KOK = os.path.join(g.KOK, "harita")
g.KAYIT = KOK + "/manifest.jsonl"

IKON = ("Pixel art game icon in the style of a 16-bit era game menu, drawn on a coarse 16 by 16 pixel grid and scaled up so "
        "every pixel is a large crisp square block, no anti-aliasing, flat cel shading with 3 to 4 tones per colour, light "
        "from the upper left, bold near-black outline, ONE simple object with a bold readable silhouette that still reads at "
        "16 pixels, centered, filling about 85 percent of the frame. Perfectly flat uniform solid magenta (#FF00FF) background "
        "edge to edge, no gradient, no ground, no shadow, no text, no letters, no border, no frame. Square image. Original "
        "design; no runes, no flames, no fantasy decoration, no animals. Object: ")
GRI = (" The whole object is rendered ONLY in neutral grayscale (near white, light grey, mid grey, dark grey), no colour at "
       "all, so it can be recoloured later.")

# HP-1: düğüm türü (A1), durum (kilit), ustalık rozetleri (A5), usta işi parıltısı (A8)
HP1 = {
    "dugum-dusman": IKON + "two small round spinning tops colliding head-on, a bright white-yellow impact spark burst between "
                    "them; the left top brick red, the right top steel blue, each with a short pointed tip below.",
    "dugum-patron": IKON + "one big heavy menacing spinning top seen from the front, wide dark purple body with three short "
                    "sharp spikes on its rim, a bright gold crown-like jagged rim ring on top, gold gem in the center, short "
                    "pointed tip below.",
    "dugum-maden": IKON + "a chunk of grey rock with a glowing amber ore vein and a steel pickaxe stuck into it diagonally, "
                   "wooden handle.",
    "dugum-sandik": IKON + "a small closed wooden treasure chest seen from the front three-quarter, warm brown planks, bronze "
                    "metal corner bands and a round bronze lock plate in the middle.",
    "dugum-sandik-bos": IKON + "the same small wooden treasure chest but OPEN and EMPTY: the lid tipped back, dark empty "
                        "inside, warm brown planks, bronze metal bands.",
    "dugum-kilit": IKON + "a small chunky padlock, steel grey body with a darker keyhole, thick rounded shackle.",
    "ustalik-madencilik": IKON + "a steel pickaxe with a wooden handle, drawn diagonally, the steel head double pointed and "
                          "slightly curved, bright highlight on the steel.",
    "ustalik-isleme": IKON + "a blacksmith hammer resting on a small dark iron anvil, wooden hammer handle, steel hammer head.",
    "efekt-parilti": ("Pixel art game effect sprite, crisp large square pixels, no anti-aliasing: a single four-pointed "
                      "sparkle star, long thin vertical and horizontal rays and two short diagonal rays, warm gold outer "
                      "pixels and a pure white core, centered, filling 90 percent of the frame. Perfectly flat uniform solid "
                      "black (#000000) background edge to edge, no gradient, no text, no border. Square image."),
}

KALKAN = (IKON.replace("ONE simple object", "ONE simple heraldic badge") + "a small pointed-bottom shield badge with a thick "
          "raised bevelled rim, flat face, and in the middle of the face a single bold emblem: ")

# HP-2: kalıplar (gri; palet takasıyla 8 kademe / 6 bölge)
HP2 = {
    "kalip-cevher": IKON + "a raw ore chunk: an irregular faceted rock nugget with several flat crystal faces, bright "
                    "highlight facets on the top left, darker facets on the lower right." + GRI,
    "kalip-kulce": IKON + "a single metal ingot bar seen from the front three-quarter, trapezoid block with a bevelled top "
                   "face, bright highlight edge along the top." + GRI,
    "kalip-arma-cevher": KALKAN + "a faceted ore crystal nugget." + GRI,
    "kalip-arma-kazma": KALKAN + "a pickaxe drawn diagonally." + GRI,
    "kalip-arma-kaya": KALKAN + "a stepped terraced hillside quarry, three flat stone terraces." + GRI,
    "kalip-arma-don": KALKAN + "a narrow mountain pass between two icy peaks with a small snowflake dot above." + GRI,
    "kalip-arma-kor": KALKAN + "a volcanic crater cone seen from the side with a glowing round mouth (no flames)." + GRI,
    "kalip-arma-kasirga": KALKAN + "three curved wind gust lines sweeping over a rounded ridge." + GRI,
    "kalip-arma-simsek": KALKAN + "a bold zigzag lightning bolt over a flat plateau line." + GRI,
    "kalip-arma-girdap": KALKAN + "a spiral whirlpool current inside a cave arch." + GRI,
    "kalip-cerceve-perci": ("Pixel art game UI element, crisp large square pixels, no anti-aliasing, flat cel shading, "
                            "light from the upper left: a SQUARE picture frame border seen straight on, a thick flat "
                            "metal band of equal width on all four sides (about one quarter of the image width), a raised "
                            "bevel on the outer and inner edges, small round rivets evenly spaced along the band, square "
                            "corners, the CENTER IS EMPTY and filled with the background colour. Perfectly flat uniform "
                            "solid magenta (#FF00FF) background, no text, no gradient. Square image." + GRI),
    "kalip-cerceve-duz": ("Pixel art game UI element, crisp large square pixels, no anti-aliasing, flat cel shading, light "
                          "from the upper left: a SQUARE picture frame border seen straight on, a thick plain flat metal "
                          "band of equal width on all four sides (about one quarter of the image width) with one engraved "
                          "groove line running around the middle of the band, bevelled edges, square corners, the CENTER IS "
                          "EMPTY and filled with the background colour. Perfectly flat uniform solid magenta (#FF00FF) "
                          "background, no text, no gradient. Square image." + GRI),
    "kalip-cerceve-krater": ("Pixel art game UI element, crisp large square pixels, no anti-aliasing, flat cel shading, "
                             "light from the upper left: a SQUARE picture frame border seen straight on made of rough "
                             "cracked volcanic rock, equal width on all four sides (about one quarter of the image width), "
                             "small round crater pits along it, square corners, the CENTER IS EMPTY and filled with the "
                             "background colour. Perfectly flat uniform solid magenta (#FF00FF) background, no text, no "
                             "gradient. Square image." + GRI),
}

# HP-K: karakter konseptleri (Tripo girdisi). Giysi parlak yeşil: render sonrası anahtar renk → profil rengi (palet takası).
KARAKTER = ("Clean stylized 3D game character concept render of ONE small chibi-proportioned person (head about one third of "
            "the body height, short sturdy legs), full body, seen from the front three-quarter view, standing in a relaxed "
            "A-pose: both arms held straight and angled about 35 degrees away from the body so there is clear empty space "
            "between arms and torso, legs slightly apart with a gap between them, hands empty, looking forward. Chunky "
            "simple readable shapes, hand-painted texture look, even soft studio lighting, plain flat pure white "
            "background, no ground, no shadow, no text, no props, no weapons. Colour rule (important): the main upper "
            "garment is solid bright green (#2ECC40) fabric; trousers dark navy blue; boots dark brown leather; skin warm "
            "light tan; hair dark brown; only small bronze buckles as accents. Original design. Body type: ")
HPK = {
    "karakter-0": KARAKTER + "average balanced build, a short work tunic belted at the waist with a small leather pouch, "
                  "short tousled hair.",
    "karakter-1": KARAKTER + "stocky broad-shouldered build, a thick padded sleeveless work vest over the shirt (vest and "
                  "shirt both green), thick leather gloves, short cropped hair.",
    "karakter-2": KARAKTER + "small nimble build with a big head of voluminous curly hair tied back with a band, a short "
                  "hooded jacket with the hood down.",
    "karakter-3": KARAKTER + "tall lean build, a long green work coat reaching mid-thigh, a short scarf, hair in a short "
                  "ponytail.",
}

ZEMIN = ("Top-down hand-drawn pixel art game MAP background, 16-bit era, crisp pixels, no anti-aliasing, limited palette of "
         "about 30 colours, flat shading with very little dithering, seen from STRAIGHT ABOVE (strict orthographic top-down, NO horizon, NO sky, NO perspective) like a painted terrain map on "
         "a table. Wide panoramic landscape image. Calm, mostly open readable ground with LOW detail so small icons and "
         "paths can sit on top: keep the middle area and the scattered spots for map markers plain. Darker muted tones, "
         "slightly desaturated, framed by a thin darker edge. No text, no labels, no icons, no characters, no buildings, "
         "no roads, no paths, no runes, no flames, no grid lines. Region: ")
HP3 = {
    "zemin-ocak-yamaci": ZEMIN + "a terraced quarry hillside of sandstone and amber earth, a few flat stone terraces and "
                         "scattered boulders, dusty brown and warm amber.",
    "zemin-ayaz-gecidi": ZEMIN + "a frozen mountain pass, icy blue-white snowfields with a few pale cyan ice patches and dark "
                         "rocky outcrops, cold teal shadows.",
    "zemin-kor-kraterleri": ZEMIN + "a dark basalt volcanic field with several round crater mouths glowing dull orange from "
                            "inside (no flames), black and dark red rock, cracks with faint ember glow.",
    "zemin-yel-sirti": ZEMIN + "a windswept grassy ridge, mint green and teal grass streaked by curved wind lines, a few pale "
                       "rocks.",
    "zemin-cakim-yaylasi": ZEMIN + "a high stormy plateau of yellow-ochre dry grass and pale stone with a few dark scorch "
                           "marks shaped like branching lightning scars.",
    "zemin-dip-magaralari": ZEMIN + "a deep cave floor of dark blue stone with shallow pools of glowing blue water flowing "
                            "in spiral currents, cave rock edges.",
    "ocak-agzi": ("Pixel art game background, 16-bit era, crisp pixels, no anti-aliasing, limited palette of about 30 "
                  "colours: looking straight at a dark rough rock face at the mouth of a mine. The rock fills only the "
                  "OUTER EDGES of the image like a thick irregular frame (wider at the bottom and the sides), and the large "
                  "CENTER area is plain uniform very dark navy (#0B0F18) empty space. Dark grey-blue cracked stone with a "
                  "few thin faint amber ore veins near the edges, a couple of wooden support beams at the top corners. No "
                  "text, no characters, no flames, no torches, no runes. Wide image."),
}

# İkinci tur (13/24 px okunurluğu): tek, iri motif. secim.json ile seçilir.
HP_B = {
    "dugum-dusman-b": IKON + "a single bold spinning top tilted to one side, brick red body and a steel tip, with a big "
                      "bright white-yellow four-pointed impact spark burst at its rim as if it just hit something.",
    "ustalik-isleme-b": IKON + "a single blacksmith hammer drawn diagonally, big chunky steel head, short wooden handle.",
    "kalip-arma-simsek-b": KALKAN + "one big bold zigzag lightning bolt filling the shield face from top to bottom." + GRI,
    "kalip-arma-girdap-b": KALKAN + "one big bold three-turn spiral filling the shield face." + GRI,
    "kalip-arma-don-b": KALKAN + "one big bold six-armed snowflake crystal filling the shield face, dark grey emblem on a "
                        "light grey face." + GRI,
}

# M1 damar kayası (10 § 3.3): gri kaya + anahtar yeşili damar → damar pikselleri kademe rampasına (harita_piksel.py damar)
DAMAR = (IKON.replace("16 by 16 pixel grid", "48 by 48 pixel grid").replace("still reads at 16 pixels", "reads at 96 pixels")
         + "a single big rough rock boulder seen from the front, chunky faceted stone, a few cracks, with three or four thick "
         "ore veins running diagonally across its face. The stone is ONLY neutral grey (light grey top-left, dark grey "
         "lower-right). The veins are flat pure bright green (#00FF00) with a few lighter green highlight pixels, clearly "
         "separated from the grey stone.")
HP_M = {"kalip-damar": DAMAR}

GRUPLAR = {"hp1": HP1, "hp2": HP2, "hpk": HPK, "hp3": HP3, "hpb": HP_B, "hpm": HP_M}
ORAN = {"zemin": "21:9", "ocak-agzi": "16:9"}


def isler(secim, varyant):
    out = []
    for grup, tablo in GRUPLAR.items():
        for gid, prompt in tablo.items():
            if "hepsi" in secim or grup in secim or gid in secim:
                oran = next((v for k, v in ORAN.items() if gid.startswith(k)), "1:1")
                ek = f"-{varyant}" if varyant else ""
                out.append((f"{gid}{ek}", prompt, f"{KOK}/ham/{gid}{ek}.png", oran, ()))
    return out


if __name__ == "__main__":
    argv = sys.argv[1:]
    varyant = ""
    if "--varyant" in argv:
        i = argv.index("--varyant")
        varyant = argv[i + 1]
        del argv[i:i + 2]
    os.makedirs(f"{KOK}/ham", exist_ok=True)
    liste = isler(set(argv), varyant)
    print(f"{len(liste)} görsel üretilecek (~${0.045 * len(liste):.2f})", flush=True)
    with concurrent.futures.ThreadPoolExecutor(6) as ex:
        for ad, sonuc in ex.map(lambda a: g.uret(*a), liste):
            print(ad, "->", sonuc, flush=True)
