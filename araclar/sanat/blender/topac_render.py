# Devran topaç parçaları: parametrik 3B model -> veri geçişli render (ART-1, docs/art/topac-pixel-plani.md § 7.2).
#
# Çalıştırma (Blender 4.x, arka planda; tek süreç tüm parçaları üretir):
#   blender -b --factory-startup -P araclar/sanat/blender/topac_render.py -- <ayar.json>
# Normalde doğrudan değil `npm run topac:uret` (araclar/sanat/topac-uret.ts) çağırır; ayar.json o betikten gelir.
#
# Ne üretir: her parça (kaynak/topac/parcalar-3b.json) ve her dönüş açısı için iki 16 bit PNG:
#   <k>_n.png  RGB = dünya uzayı yüzey normali * 0,5 + 0,5   (ışık YOK: gölgeleme Node tarafında, sabit sol-üst ışık)
#   <k>_v.png  R = malzeme sınıfı / 16, G = kamera derinliği (0..1), A = kapsama
# Işıksız "veri render" seçildi: Cycles CPU başsız çalışır (EEVEE/Workbench GL ister), kenar yumuşatma kapalı
# (filtre 0,01 px, 1 örnek) ve ×4 süper örnekleme Node'da çoğunluk oyuyla 1 sanat pikseline indirilir. Toon rampa,
# palet, dither ve çizgi Node'da (araclar/sanat/topac-pisir.ts) uygulanır: aynı render 6 Element boyasına gider.
#
# Kamera: ortografik, yükselti `kamera.yukselti` derece (hibrit sahnenin zOrani 0,62 ≈ 38°), topaç ekseni dikey.
# Birim: topaç yerel birimi (Gövde yarıçapı ~32 = TopacGorsel.GORSEL.govdeYaricap); 1 sanat pikseli = `kamera.birimPx`.
# Sağ dönüş = üstten bakışta saat yönü (z ekseninde negatif açı); sol dönüş için kiral parçanın mesh'i x'te aynalanır
# ve saat yönünün tersine döndürülür (ışık aynalanmaz: pixel planı § 3.1 son satır).

import bpy
import json
import math
import os
import sys

SINIF = {"boya": 1, "boya2": 2, "metal": 3, "koyu": 4, "altin": 5, "kubbe": 6, "cerceve": 7, "lastik": 8, "beyaz": 9}


def ayar_oku():
    arg = sys.argv[sys.argv.index("--") + 1:]
    with open(arg[0], encoding="utf-8") as f:
        return json.load(f)


# ------------------------------------------------------------------ biçim işlevleri (açı derece değil radyan)

def lob_degeri(lob, th):
    """Taslak (dış çizgi) yarıçap katkısı. lob: {n, genlik, bicim, ...}; th radyan."""
    n = lob["n"]
    faz = (th * n / (2 * math.pi) + lob.get("faz", 0.0)) % 1.0
    A = lob["genlik"]
    b = lob["bicim"]
    if b == "supurme":  # yavaş yükselen, keskin düşen diş (sağ dönüşte kanat arkaya süpürülmüş)
        p = lob.get("p", 0.62)
        if faz < p:
            return A * (faz / p) ** lob.get("a", 0.75)
        return A * (1 - (faz - p) / (1 - p)) ** lob.get("b", 3.0)
    if b == "tarak":  # yuvarlak lob
        return A * (0.5 + 0.5 * math.cos(2 * math.pi * (faz - 0.5))) ** lob.get("q", 1.0)
    if b == "sivri":  # sivri diken
        w = lob.get("w", 0.25)
        d = abs(faz - lob.get("merkez", 0.5))
        return A * max(0.0, 1 - d / w) ** lob.get("q", 1.0)
    if b == "kare":  # düz üstlü çıkıntı (disk kilidi)
        w = lob.get("w", 0.3)
        kenar = lob.get("kenar", 0.06)
        d = abs(faz - 0.5)
        if d < w / 2:
            return A
        if d < w / 2 + kenar:
            return A * (1 - (d - w / 2) / kenar)
        return 0.0
    if b == "centik":  # içe çentik (negatif)
        w = lob.get("w", 0.12)
        d = abs(faz - 0.5)
        return -A * max(0.0, 1 - d / w)
    raise ValueError("bilinmeyen lob: " + b)


def taslak_R(spec, th):
    R = spec["R0"]
    for lob in spec.get("loblar", []):
        R += lob_degeri(lob, th)
    return R


def parcali(noktalar, x):
    """[[x, y], ...] parçalı doğrusal; uçlarda sabit."""
    if x <= noktalar[0][0]:
        return noktalar[0][1]
    for (x0, y0), (x1, y1) in zip(noktalar, noktalar[1:]):
        if x <= x1:
            t = (x - x0) / max(1e-9, x1 - x0)
            return y0 + (y1 - y0) * t
    return noktalar[-1][1]


def aci_farki(a, b):
    d = (a - b) % (2 * math.pi)
    return d - 2 * math.pi if d > math.pi else d


def ust_yuzey(spec, r, th, R):
    """Üst yüz yüksekliği ve sınıfı (r mutlak, th radyan, R o açıdaki taslak yarıçapı)."""
    z = parcali(spec["profil"], r)
    sinif = spec.get("sinif", "boya")
    for h in spec.get("halkalar", []):  # eş merkezli kabartma (+) ya da oluk (-), r0..r1
        if h["r0"] <= r <= h["r1"]:
            pah = h.get("pah", 0.8)
            k = min(1.0, (r - h["r0"]) / pah, (h["r1"] - r) / pah) if pah > 0 else 1.0
            z += h["yukseklik"] * max(0.0, k)
            if "sinif" in h:
                sinif = h["sinif"]
    for s in spec.get("sirtlar", []):  # kanat başına sırt: açısal tümsek, kıvrımlı
        if s.get("r0", 0) <= r <= s.get("r1", 99):
            n = s["n"]
            merkez0 = math.radians(s.get("faz", 0.0)) + math.radians(s.get("kivrim", 0.0)) * (r - s.get("r0", 0))
            en = math.radians(s["genislik"]) * (1 + s.get("genisleme", 0.0) * (r - s.get("r0", 0)))
            enk = 1e9
            for i in range(n):
                enk = min(enk, abs(aci_farki(th, merkez0 + i * 2 * math.pi / n)))
            if enk < en:
                u = enk / en
                prof = s.get("profil", "duz")
                k = 1.0 if prof == "duz" and u < 0.7 else (1 - (u - 0.7) / 0.3 if prof == "duz" else math.cos(u * math.pi / 2))
                uc = s.get("ucIncelme", 0.0)
                if uc > 0 and s.get("r1", 99) - r < uc:
                    k *= (s["r1"] - r) / uc
                z += s["yukseklik"] * k
                if "sinif" in s and k > 0.5:
                    sinif = s["sinif"]
    for f in spec.get("fasetler", []):  # n yüzlü piramit (taş, çekirdek): z = h - s * r * max cos(th - th_k)
        if r <= f["r1"]:
            n = f["n"]
            enb = max(math.cos(aci_farki(th, math.radians(f.get("faz", 0.0)) + i * 2 * math.pi / n)) for i in range(n))
            z = max(z, f["tepe"] - f["egim"] * r * enb)
            if "sinif" in f:
                sinif = f["sinif"]
    for k in spec.get("kubbeler", []):
        if r <= k["r"]:
            z = max(z, k["taban"] + k["yukseklik"] * math.sqrt(max(0.0, 1 - (r / k["r"]) ** 2)))
            if "sinif" in k:
                sinif = k["sinif"]
    pah = spec.get("kenarPah")  # dış kenara doğru eğim (parlak/koyu kenar çizgisi okunur)
    if pah:
        w, d = pah
        kalan = R - r
        if kalan < w:
            z -= d * (1 - kalan / w)
    for b in spec.get("bolgeler", []):  # sınıf bölgesi: R'ye göre dış bant (ör. kanat ucu metal)
        if R - r <= b.get("kenardan", -1) and R >= b.get("enAzR", 0):
            sinif = b["sinif"]
        if "r0" in b and b["r0"] <= r <= b["r1"]:
            sinif = b["sinif"]
    return z, sinif


# ------------------------------------------------------------------ mesh kurucular

def kutupsal_govde(spec, ayna, nTh=360, nT=56):
    """Kutupsal yükseklik alanı katı: üst yüz (r = t * R(th)), dış duvar (pah + alt daralma), alt kapak."""
    V, F, C = [], [], []
    ths = [2 * math.pi * j / nTh for j in range(nTh)]
    Rs = [taslak_R(spec, th) for th in ths]
    # üst yüz: merkez + halkalar (merkeze yakın sık)
    ts = [((i + 1) / nT) ** 1.0 for i in range(nT)]
    merkez_z, _ = ust_yuzey(spec, 0.0, 0.0, Rs[0])
    V.append((0.0, 0.0, merkez_z))
    halka_idx = []
    for i, t in enumerate(ts):
        idx = []
        for j, th in enumerate(ths):
            r = t * Rs[j]
            z, _ = ust_yuzey(spec, r, th, Rs[j])
            V.append((r * math.cos(th), r * math.sin(th), z))
            idx.append(len(V) - 1)
        halka_idx.append(idx)
    for j in range(nTh):
        j2 = (j + 1) % nTh
        F.append((0, halka_idx[0][j], halka_idx[0][j2]))
        _, s = ust_yuzey(spec, ts[0] * Rs[j] * 0.5, ths[j] + math.pi / nTh, Rs[j])
        C.append(s)
    for i in range(nT - 1):
        a, b = halka_idx[i], halka_idx[i + 1]
        for j in range(nTh):
            j2 = (j + 1) % nTh
            F.append((a[j], b[j], b[j2], a[j2]))
            tm = (ts[i] + ts[i + 1]) / 2
            thm = ths[j] + math.pi / nTh
            Rm = (Rs[j] + Rs[j2]) / 2
            _, s = ust_yuzey(spec, tm * Rm, thm, Rm)
            C.append(s)
    # duvar: ayrı köşeler (keskin kenar), [ölçek, z] halkaları
    yan = spec.get("yanSinif")
    zAlt = spec["zAlt"]
    duvar = spec.get("duvar", [[1.0, None], [1.0, zAlt + 1.5], [0.82, zAlt]])
    ust_kenar = halka_idx[-1]
    onceki = None
    for k, (olcek, zz) in enumerate(duvar):
        idx = []
        for j, th in enumerate(ths):
            x, y, z = V[ust_kenar[j]]
            if zz is None:
                V.append((x, y, z))
            else:
                V.append((x * olcek, y * olcek, zz))
            idx.append(len(V) - 1)
        if onceki is not None:
            for j in range(nTh):
                j2 = (j + 1) % nTh
                F.append((onceki[j], idx[j], idx[j2], onceki[j2]))
                if yan:
                    C.append(yan)
                else:
                    _, s = ust_yuzey(spec, Rs[j] - 0.05, ths[j], Rs[j])
                    C.append(s)
        onceki = idx
    # alt kapak
    V.append((0.0, 0.0, zAlt))
    m = len(V) - 1
    for j in range(nTh):
        j2 = (j + 1) % nTh
        F.append((m, onceki[j2], onceki[j]))
        C.append(spec.get("altSinif", "koyu"))
    return V, F, C


def torna(spec, ayna, nTh=180):
    """Eksenel profil (Uç): [[r, z, sinif], ...] alttan üste; isteğe bağlı nervür (r modülasyonu)."""
    V, F, C = [], [], []
    prof = spec["torna"]
    nerv = spec.get("nervur")
    ths = [2 * math.pi * j / nTh for j in range(nTh)]

    def rmod(th):
        if not nerv:
            return 1.0
        return 1.0 + lob_degeri({"n": nerv["n"], "genlik": nerv["genlik"], "bicim": nerv.get("bicim", "kare"), "w": nerv.get("w", 0.4)}, th)

    V.append((0.0, 0.0, prof[0][1]))
    halkalar = []
    for (r, z, _s) in prof:
        idx = []
        for th in ths:
            rr = r * rmod(th) if r > 0.5 else r
            V.append((rr * math.cos(th), rr * math.sin(th), z))
            idx.append(len(V) - 1)
        halkalar.append(idx)
    for j in range(nTh):
        j2 = (j + 1) % nTh
        F.append((0, halkalar[0][j2], halkalar[0][j]))
        C.append(prof[0][2])
    for i in range(len(prof) - 1):
        a, b = halkalar[i], halkalar[i + 1]
        for j in range(nTh):
            j2 = (j + 1) % nTh
            F.append((a[j], a[j2], b[j2], b[j]))
            C.append(prof[i + 1][2])
    V.append((0.0, 0.0, prof[-1][1]))
    m = len(V) - 1
    for j in range(nTh):
        j2 = (j + 1) % nTh
        F.append((m, halkalar[-1][j], halkalar[-1][j2]))
        C.append(prof[-1][2])
    return V, F, C


def nesne_kur(ad, spec, ayna):
    if spec.get("torna"):
        V, F, C = torna(spec, ayna)
    else:
        V, F, C = kutupsal_govde(spec, ayna)
    if ayna:
        V = [(-x, y, z) for (x, y, z) in V]
        F = [tuple(reversed(f)) for f in F]
    me = bpy.data.meshes.new(ad)
    me.from_pydata(V, [], F)
    me.validate(clean_customdata=False)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    at = me.attributes.new("sinif", "FLOAT", "FACE")
    for i, s in enumerate(C):
        at.data[i].value = float(SINIF[s])
    ob = bpy.data.objects.new(ad, me)
    bpy.context.scene.collection.objects.link(ob)
    # yüzey normalini tutarlı tut (alt kapak/üst yüz ters sarım yanlış ışık verir)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    ob.select_set(False)
    # pürüzsüz gölgeleme + keskin kenar (açı > 40°): Blender 4.1 öncesi auto smooth
    if hasattr(me, "use_auto_smooth"):
        me.use_auto_smooth = True
        me.auto_smooth_angle = math.radians(spec.get("puruzAci", 40))
    return ob


# ------------------------------------------------------------------ sahne ve veri malzemeleri

def malzeme_normal():
    m = bpy.data.materials.new("veri_normal")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    g = nt.nodes.new("ShaderNodeNewGeometry")
    vm = nt.nodes.new("ShaderNodeVectorMath")
    vm.operation = "MULTIPLY_ADD"
    vm.inputs[1].default_value = (0.5, 0.5, 0.5)
    vm.inputs[2].default_value = (0.5, 0.5, 0.5)
    em = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(g.outputs["Normal"], vm.inputs[0])
    nt.links.new(vm.outputs[0], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def malzeme_veri(derinlik0, derinlikAralik):
    m = bpy.data.materials.new("veri_sinif")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    at = nt.nodes.new("ShaderNodeAttribute")
    at.attribute_type = "GEOMETRY"
    at.attribute_name = "sinif"
    bol = nt.nodes.new("ShaderNodeMath")
    bol.operation = "DIVIDE"
    bol.inputs[1].default_value = 16.0
    cam = nt.nodes.new("ShaderNodeCameraData")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = derinlik0
    mr.inputs["From Max"].default_value = derinlik0 + derinlikAralik
    birles = nt.nodes.new("ShaderNodeCombineColor")
    em = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(at.outputs["Fac"], bol.inputs[0])
    nt.links.new(bol.outputs[0], birles.inputs[0])
    nt.links.new(cam.outputs["View Z Depth"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], birles.inputs[1])
    nt.links.new(birles.outputs[0], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def sahne_kur(A):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 1
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 0
    sc.cycles.seed = 0
    sc.render.film_transparent = True
    sc.render.filter_size = 0.01
    sc.view_settings.view_transform = "Raw"
    sc.view_settings.look = "None"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.compression = 15
    sc.world = None
    cam = bpy.data.cameras.new("kamera")
    cam.type = "ORTHO"
    co = bpy.data.objects.new("kamera", cam)
    sc.collection.objects.link(co)
    sc.camera = co
    return sc, co


def kamera_ayarla(sc, co, yukselti, kareBirim, kareW, kareH, capaX, capaY, ss):
    """Ortografik kamera: dünya orijini (uç temas noktası) karede (capaX, capaY) pikseline düşer (sol üst 0,0)."""
    e = math.radians(yukselti)
    sc.render.resolution_x = kareW * ss
    sc.render.resolution_y = kareH * ss
    co.data.ortho_scale = max(kareW, kareH) * kareBirim
    d = (0.0, math.cos(e), -math.sin(e))  # bakış yönü
    u = (0.0, math.sin(e), math.cos(e))  # ekran yukarı
    # orijinin kare merkezine göre ekran kayması (birim): sağa +dx, yukarı +dy
    dx = (capaX - kareW / 2) * kareBirim
    dy = (kareH / 2 - capaY) * kareBirim
    # kamera merkezi C: orijin ekranda (dx, dy) olsun → C = -dx * sag - dy * u
    C = (-dx, -dy * u[1], -dy * u[2])
    co.location = (C[0] - d[0] * 200, C[1] - d[1] * 200, C[2] - d[2] * 200)
    co.rotation_euler = (math.pi / 2 - e, 0.0, 0.0)
    co.data.clip_start = 1
    co.data.clip_end = 400


def main():
    A = ayar_oku()
    sc, co = sahne_kur(A)
    mN = malzeme_normal()
    mV = malzeme_veri(200 - 80, 160)
    K = A["kamera"]
    with open(A["parcaDosyasi"], encoding="utf-8") as f:
        PAR = json.load(f)
    secili = set(A.get("parcalar") or [])
    cikti = A["cikti"]
    ozet = {}
    for pid, spec in PAR["parcalar"].items():
        if secili and pid not in secili:
            continue
        yonler = ["s", "l"] if spec.get("kiral") else ["s"]
        n = spec["simetri"]
        periyot = 2 * math.pi / n
        M = A["inceKare"]
        gorunumler = [("oyun", K["yukselti"], K["kareBirim"], K["kareW"], K["kareH"], K["capaX"], K["capaY"], M)]
        for ik in A.get("ikonlar", []):
            gorunumler.append((ik["ad"], ik["yukselti"], ik["kareBirim"][spec["tur"]], ik["kare"], ik["kare"], ik["kare"] / 2, ik["kare"] / 2 + ik["capaDy"][spec["tur"]], 1))
        for yon in yonler:
            ob = nesne_kur(pid + "_" + yon, spec, yon == "l")
            ob.location = (0, 0, A.get("zKayma", {}).get(spec["tur"], 0.0))
            for (gad, yuk, birim, w, h, cx, cy, adet) in gorunumler:
                kamera_ayarla(sc, co, yuk, birim, w, h, cx, cy, A["superOrnek"])
                klasor = os.path.join(cikti, spec["tur"], pid, yon if gad == "oyun" else gad + "-" + yon)
                os.makedirs(klasor, exist_ok=True)
                for k in range(adet):
                    a = k * periyot / M
                    ob.rotation_euler = (0, 0, (-a if yon == "s" else a) + math.radians(spec.get("ikonAci", 0) if gad != "oyun" else 0))
                    for (son, mal) in (("n", mN), ("v", mV)):
                        bpy.context.view_layer.material_override = mal
                        sc.render.filepath = os.path.join(klasor, "%02d_%s.png" % (k, son))
                        bpy.ops.render.render(write_still=True)
            bpy.data.objects.remove(ob, do_unlink=True)
        ozet[pid] = {"tur": spec["tur"], "simetri": n, "yonler": yonler}
        print("PARCA", pid, yonler, flush=True)
    with open(os.path.join(cikti, "ozet.json"), "w", encoding="utf-8") as f:
        json.dump(ozet, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":  # topac_glb_render.py yardımcıları içe aktarır
    main()
