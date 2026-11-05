# Devran topaç parçaları, Mac hattı: Tripo GLB -> simetrik mesh -> veri geçişli render (docs/art/topac-uretim-istegi.md § 3).
#
#   blender -b --factory-startup -P araclar/sanat/blender/topac_glb_render.py -- <ayar.json>
# Normalde `npx tsx araclar/sanat/topac-mac.ts` çağırır.
#
# Her parça için:
#  1. GLB içe aktar, mesh'leri birleştir, dönme eksenini bul (bbox'ın en ince ekseni ya da ayar `eksen`), +Z'ye çevir
#     (ayar `ters` ile alt/üst değişir), xy'de ortala, hedef ölçüye (dış yarıçap R, zAlt..zUst) oturt.
#  2. Simetrileştir (§ 3.2): 360/n'lik dilim, iki dikişi de dış yarıçap profilinin vadisine düşecek açıdan kesilir; dilim n kez
#     dairesel dizilir ve kaynaştırılır. Kaynak modeldeki fazla/eksik kanat dilime girmez; döngü dikişsizdir.
#  3. Malzeme sınıfı (topac_render.SINIF) yüz başına Tripo dokusundan + konumdan seçilir (Gövde: göbek metal, gerisi boya; Disk
#     metal; Uç: koyu taban koyu, gövde metal; Çekirdek: kırmızı taş kubbe, gerisi çerçeve).
#  4. topac_render ile aynı kamera ve aynı iki veri geçişi (_n normal, _v sınıf/derinlik/kapsama) + üçüncü geçiş _t: doku albedosu
#     (Tripo'nun el boyası oluk/kenar ayrıntısı; pişirmede ton modülasyonu).
# Sol dönüş: kiral parçada mesh x'te aynalanır (ışık değil), kareler saat yönünün tersine.

import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix

sys.dont_write_bytecode = True  # depoda __pycache__ kalmasın (d8 varlık taraması)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import topac_render as TR  # noqa: E402  (main korumalı)


def ayar_oku():
    arg = sys.argv[sys.argv.index("--") + 1:]
    with open(arg[0], encoding="utf-8") as f:
        return json.load(f)


def glb_yukle(yol):
    once = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=yol)
    yeni = [o for o in bpy.data.objects if o not in once]
    mesler = [o for o in yeni if o.type == "MESH"]
    for o in mesler:
        o.data = o.data.copy() if o.data.users > 1 else o.data
        o.data.transform(o.matrix_world)
        o.parent = None
        o.matrix_world.identity()
        o.rotation_mode = "XYZ"  # glTF içe aktarıcı QUATERNION bırakır; kareler rotation_euler ile döner
    for o in yeni:
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    ana = mesler[0]
    if len(mesler) > 1:
        with bpy.context.temp_override(active_object=ana, selected_editable_objects=mesler):
            bpy.ops.object.join()
    img = None
    for m in ana.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image:
                    img = n.image
    return ana, img


def pca_ekseni(co):
    """En az varyans doğrultusu (yassı parçada dönme ekseni). Bir dünya eksenine 3°'den yakınsa o eksen adı, değilse vektör."""
    m = co - co.mean(axis=0)
    deger, vektor = np.linalg.eigh(m.T @ m)
    v = vektor[:, int(np.argmin(deger))]
    i = int(np.argmax(np.abs(v)))
    if abs(v[i]) > math.cos(math.radians(3)):
        return "xyz"[i], None
    return "pca", v * np.sign(v[i])


def eksene_cevir(co, eksen, ters):
    """co: (N,3). Dönme eksenini +Z yap; ters ise alt/üst değişir. auto: PCA, dünya eksenine yakınsa o eksen."""
    if eksen == "auto":
        eksen, v = pca_ekseni(co)
        if eksen == "pca":
            # v'yi +Z'ye çeviren dönme (Rodrigues)
            z = np.array([0.0, 0.0, 1.0])
            k = np.cross(v, z)
            sn, cs = np.linalg.norm(k), float(v @ z)
            K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]]) / max(sn, 1e-9)
            R = np.eye(3) + sn * K + (1 - cs) * (K @ K)
            co = co @ R.T
            if ters:
                co = co * np.array([1.0, -1.0, -1.0])
            return co, "pca(%.2f,%.2f,%.2f)" % tuple(v)
    if eksen == "x":
        co = co[:, [1, 2, 0]]
    elif eksen == "y":
        co = co[:, [2, 0, 1]]
    if ters:
        co = co * np.array([1.0, -1.0, -1.0])
    return co, eksen


def aci_profili(co, kutu=720):
    th = np.arctan2(co[:, 1], co[:, 0]) % (2 * math.pi)
    r = np.hypot(co[:, 0], co[:, 1])
    b = (th / (2 * math.pi) * kutu).astype(int) % kutu
    prof = np.zeros(kutu)
    np.maximum.at(prof, b, r)
    # boş kutuları komşudan doldur, 3° pencereyle yumuşat
    for _ in range(kutu):
        bos = prof == 0
        if not bos.any():
            break
        prof[bos] = np.maximum(np.roll(prof, 1), np.roll(prof, -1))[bos]
    w = max(1, kutu // 120)
    k = np.ones(2 * w + 1) / (2 * w + 1)
    return np.convolve(np.concatenate([prof[-w:], prof, prof[:w]]), k, mode="valid")


def kesim_acisi(co, n, kutu=720):
    """İki dikişin (s ve s+360/n) de vadide olduğu başlangıç açısı (radyan)."""
    prof = aci_profili(co, kutu)
    P = kutu / n
    en, enS = 0, 1e18
    for i in range(kutu):
        j = int(round(i + P)) % kutu
        skor = prof[i] + prof[j]
        if skor < enS:
            enS, en = skor, i
    return 2 * math.pi * en / kutu


def simetrilestir(me, n, s):
    """Dilim [s, s+2π/n] -> n kopya, kaynaştır. me yerinde değişir."""
    P = 2 * math.pi / n
    bm = bmesh.new()
    bm.from_mesh(me)
    n1 = (-math.sin(s), math.cos(s), 0.0)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=n1, clear_inner=True)
    n2 = (-math.sin(s + P), math.cos(s + P), 0.0)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=n2, clear_outer=True)
    bmesh.ops.rotate(bm, verts=bm.verts[:], cent=(0, 0, 0), matrix=Matrix.Rotation(-s, 3, "Z"))
    dilim = bm.verts[:] + bm.edges[:] + bm.faces[:]
    for k in range(1, n):
        d = bmesh.ops.duplicate(bm, geom=dilim)
        vs = [g for g in d["geom"] if isinstance(g, bmesh.types.BMVert)]
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(k * P, 3, "Z"))
    R = max((v.co.xy.length for v in bm.verts), default=1.0)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=R * 0.004)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()


def doku_dizisi(img):
    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    return buf.reshape(h, w, 4)


def yuz_ozellik(me, doku):
    """Yüz başına (renk RGB, merkez r, merkez z)."""
    nP = len(me.polygons)
    nL = len(me.loops)
    uv = np.empty(nL * 2, dtype=np.float32)
    me.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(nL, 2)
    bas = np.empty(nP, dtype=np.int32)
    say = np.empty(nP, dtype=np.int32)
    me.polygons.foreach_get("loop_start", bas)
    me.polygons.foreach_get("loop_total", say)
    idx = np.repeat(np.arange(nP), say)
    u = np.bincount(idx, uv[:, 0], nP) / say
    v = np.bincount(idx, uv[:, 1], nP) / say
    h, w, _ = doku.shape
    px = np.clip((u % 1.0) * w, 0, w - 1).astype(int)
    py = np.clip((v % 1.0) * h, 0, h - 1).astype(int)
    renk = doku[py, px, :3]
    mer = np.empty(nP * 3, dtype=np.float32)
    me.polygons.foreach_get("center", mer)
    mer = mer.reshape(nP, 3)
    return renk, np.hypot(mer[:, 0], mer[:, 1]), mer[:, 2]


def renk_tonu(renk):
    """RGB (N,3) 0..1 -> HSV tonu 0..1."""
    mx, mn = renk.max(axis=1), renk.min(axis=1)
    d = np.maximum(mx - mn, 1e-6)
    r_, g_, b_ = renk[:, 0], renk[:, 1], renk[:, 2]
    h = np.where(mx == r_, ((g_ - b_) / d) % 6, np.where(mx == g_, (b_ - r_) / d + 2, (r_ - g_) / d + 4))
    return (h / 6.0) % 1.0


def sinif_sec(tur, kural, renk, r, z, R):
    lum = renk @ np.array([0.3, 0.59, 0.11])
    mx, mn = renk.max(axis=1), renk.min(axis=1)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    kirmizi = (renk[:, 0] > renk[:, 1] * 1.6) & (sat > 0.35)
    S = TR.SINIF
    if tur == "govde" and kural.get("renkli"):
        # Parti 2+: konseptte boya mat kırmızı istendi; renkten sınıf (koyu gölge kıvrımları boyada kalır), göbek her zaman metal
        ton = renk_tonu(renk)
        c = np.full(len(r), S["metal"])
        c = np.where(((sat > 0.28) & ((ton < 0.06) | (ton > 0.93))) | (lum < 0.22), S["boya"], c)
        if kural.get("altin"):
            c = np.where((sat > 0.3) & (ton >= 0.07) & (ton <= 0.18), S["altin"], c)
        if kural.get("beyaz"):
            c = np.where((lum > 0.78) & (sat < 0.18), S["beyaz"], c)
        c = np.where(r < kural.get("gobekR", 11.5), S["metal"], c)
    elif tur == "govde":
        c = np.where(r < kural.get("gobekR", 11.5), S["metal"], S["boya"])
        if kural.get("altinSirt"):
            c = np.where((sat > 0.35) & (renk[:, 0] > renk[:, 2] * 1.4) & ~kirmizi, S["altin"], c)
    elif tur == "disk":
        c = np.full(len(r), S["metal"])
    elif tur == "uc":
        c = np.where(lum < kural.get("koyuLum", 0.09), S["koyu"], S["metal"])
    else:
        tas = kirmizi | (lum < kural.get("koyuKubbe", -1.0))  # Kül: konseptte taş koyu
        c = np.where(tas, S["kubbe"], S["cerceve"])
    return c.astype(np.float32)


def malzeme_albedo(img):
    m = bpy.data.materials.new("veri_albedo")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = img
    img.colorspace_settings.name = "Non-Color"  # Raw görünümde dokunun sRGB değeri olduğu gibi yazılsın
    tx.interpolation = "Closest"
    em = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tx.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def parca_kur(p):
    ob, img = glb_yukle(p["glb"])
    me = ob.data
    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co, eksen = eksene_cevir(co.reshape(-1, 3), p.get("eksen", "auto"), p.get("ters", False))
    mn, mx = co.min(axis=0), co.max(axis=0)
    # dönme ekseni = köşe ağırlık merkezi (n katlı parçada eksen üstünde; bbox merkezi tek n'de kayık: Sivri %17, Ok %9)
    co[:, :2] -= co[:, :2].mean(axis=0)
    H = p["hedef"]
    Rm = float(np.hypot(co[:, 0], co[:, 1]).max())
    co[:, :2] *= H["R"] / Rm
    co[:, 2] = H["zAlt"] + (co[:, 2] - mn[2]) * (H["zUst"] - H["zAlt"]) / (mx[2] - mn[2])
    me.vertices.foreach_set("co", co.astype(np.float32).ravel())
    me.update()
    # glTF özel normalleri dönüşümden sonra yanlış olur: sil, yeniden hesapla
    try:
        with bpy.context.temp_override(object=ob, active_object=ob):
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
    except Exception as e:  # noqa: BLE001
        print("UYARI özel normal:", e)
    if p.get("simetri", 1) > 1 and not p.get("simetriYok"):
        s = kesim_acisi(co, p["simetri"])
        simetrilestir(me, p["simetri"], s)
        print("SIMETRI", p["id"], "n", p["simetri"], "kesim", round(math.degrees(s), 1), flush=True)
    for poly in me.polygons:
        poly.use_smooth = True
    renk, r, z = yuz_ozellik(me, doku_dizisi(img))
    c = sinif_sec(p["tur"], p.get("kural", {}), renk, r, z, H["R"])
    at = me.attributes.get("sinif") or me.attributes.new("sinif", "FLOAT", "FACE")
    at.data.foreach_set("value", c)
    say = {k: int((c == v).sum()) for k, v in TR.SINIF.items() if (c == v).any()}
    print("PARCA", p["id"], "eksen", eksen, "ters", p.get("ters", False), "yuz", len(me.polygons), "sinif", say, flush=True)
    return ob, img


def glb_yaz(ob, p, yol, ucgen_tavan=19000):
    """Atölye 3B GLB'si (ATOLYE3D § 6): sınıf adlı malzemeler, ≤ ucgen_tavan üçgen, taban (Uç'ta temas ucu) z = 0, Y yukarı."""
    me = ob.data.copy()
    o = bpy.data.objects.new(ob.name + "_glb", me)
    bpy.context.scene.collection.objects.link(o)
    sinif = np.empty(len(me.polygons), dtype=np.float32)
    me.attributes["sinif"].data.foreach_get("value", sinif)
    ad = {v: k for k, v in TR.SINIF.items()}
    kodlar = sorted({int(round(c)) for c in sinif})
    me.materials.clear()
    for k in kodlar:
        m = bpy.data.materials.get(ad[k]) or bpy.data.materials.new(ad[k])
        me.materials.append(m)
    me.polygons.foreach_set("material_index", np.array([kodlar.index(int(round(c))) for c in sinif], dtype=np.int32))
    me.attributes.remove(me.attributes["sinif"])
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    ucgen = sum(len(q.vertices) - 2 for q in me.polygons)
    if ucgen > ucgen_tavan:
        d = o.modifiers.new("azalt", "DECIMATE")
        d.ratio = ucgen_tavan / ucgen
        with bpy.context.temp_override(object=o, active_object=o):
            bpy.ops.object.modifier_apply(modifier=d.name)
    taban = 0.0 if p["tur"] == "uc" else p["hedef"]["zAlt"]
    o.data.transform(Matrix.Translation((0, 0, -taban)))
    for x in bpy.context.scene.objects:
        x.select_set(x is o)
    bpy.context.view_layer.objects.active = o
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=yol, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=False, export_normals=True, export_materials="EXPORT")
    print("GLB", p["id"], "ucgen", sum(len(q.vertices) - 2 for q in o.data.polygons), "malzeme", [ad[k] for k in kodlar], flush=True)
    bpy.data.objects.remove(o, do_unlink=True)


def aynala(ob):
    me = ob.data.copy()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.scale(bm, vec=(-1, 1, 1), verts=bm.verts[:])
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    o2 = bpy.data.objects.new(ob.name + "_l", me)
    bpy.context.scene.collection.objects.link(o2)
    return o2


def main():
    A = ayar_oku()
    sc, co = TR.sahne_kur(A)
    mN = TR.malzeme_normal()
    mV = TR.malzeme_veri(200 - 80, 160)
    K = A["kamera"]
    M = A["inceKare"]
    ss = A["superOrnek"]
    for p in A["parcalar"]:
        ob, img = parca_kur(p)
        mA = malzeme_albedo(img)
        if p.get("glb_cikti") and not A.get("onizle"):
            glb_yaz(ob, p, p["glb_cikti"])
        yonler = ["s", "l"] if p.get("kiral") else ["s"]
        periyot = 2 * math.pi / p["simetri"]
        onizle = A.get("onizle")
        for yon in yonler:
            o = ob if yon == "s" else aynala(ob)
            for x in sc.objects:
                if x.type == "MESH":
                    x.hide_render = x is not o
            TR.kamera_ayarla(sc, co, K["yukselti"], K["kareBirim"], K["kareW"], K["kareH"], K["capaX"], K["capaY"], ss)
            klasor = os.path.join(A["cikti"], p["tur"], p["id"], yon)
            os.makedirs(klasor, exist_ok=True)
            for k in range(1 if onizle else M):
                a = k * periyot / M
                o.rotation_euler = (0, 0, -a if yon == "s" else a)
                gecis = (("t", mA),) if onizle else (("n", mN), ("v", mV), ("t", mA))
                for (son, mal) in gecis:
                    bpy.context.view_layer.material_override = mal
                    sc.render.filepath = os.path.join(klasor, "%02d_%s.png" % (k, son))
                    bpy.ops.render.render(write_still=True)
            if o is not ob:
                bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.objects.remove(ob, do_unlink=True)
        bpy.context.view_layer.material_override = None


main()
