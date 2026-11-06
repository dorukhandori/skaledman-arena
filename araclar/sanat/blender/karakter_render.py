"""Harita karakteri (13 § 2): Tripo GLB -> 27 kare (şeffaf PNG), sayfalama harita_karakter.py'de.

blender --background --python karakter_render.py -- <glb> <cikti_klasoru> [kontrol]

Tripo modeli iskeletsiz gelir. Burada ücretsiz bir iskelet kurulur: köşeler konuma göre 6 parçaya ayrılır (baş, gövde,
kol L/R, bacak L/R; A-duruşunda kol ile gövde arasındaki boşluk ölçülür), eklem yakınında ağırlık yumuşatılır.
Pozlar el ile yazılmış açılarla kare kare verilir. Kamera ortografik, 3/4 önden ve hafif üstten; karakter ekranda sağa
bakar (sola yürüme kodda ayna). KAZ karelerinde sağ ele ilkel geometriden bir kazma takılır.
Kareler: BEKLE 0-3, YÜRÜ 4-9, KAZ 10-15, DÖVÜŞE GİR 16-20, KUTLA 21-26.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

arg = sys.argv[sys.argv.index("--") + 1:]
GLB, OUT = arg[0], arg[1]
KONTROL = len(arg) > 2 and arg[2] == "kontrol"
os.makedirs(OUT, exist_ok=True)
H = 2.0  # normalize yükseklik

bpy.ops.wm.read_factory_settings(use_empty=True)
sahne = bpy.context.scene
motorlar = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
sahne.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in motorlar else "BLENDER_EEVEE_NEXT"
sahne.render.film_transparent = True
sahne.render.resolution_x, sahne.render.resolution_y = (256, 384)
sahne.render.image_settings.file_format = "PNG"
sahne.render.image_settings.color_mode = "RGBA"
sahne.view_settings.view_transform = "Standard"
sahne.view_settings.look = "None"

bpy.ops.import_scene.gltf(filepath=GLB)
parcalar = [o for o in sahne.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in parcalar:
    o.select_set(True)
bpy.context.view_layer.objects.active = parcalar[0]
if len(parcalar) > 1:
    bpy.ops.object.join()
govde = bpy.context.view_layer.objects.active
govde.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(sahne.objects):
    if o is not govde:
        bpy.data.objects.remove(o, do_unlink=True)

# normalize: yükseklik H, taban z=0, merkez xy=0. Tripo karakteri +X'e bakar, kollar Y ekseninde: -90° çevir
# (ön -Y, karakterin solu +X, sağı -X).
me = govde.data
vs = [v.co.copy() for v in me.vertices]
mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
s = H / (mx.z - mn.z)
cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
for v in me.vertices:
    x, y = (v.co.x - cx) * s, (v.co.y - cy) * s
    v.co = Vector((y, -x, (v.co.z - mn.z) * s))
me.update()
vs = [v.co.copy() for v in me.vertices]


def dilim_genislik(z0, z1):
    b = [abs(v.x) for v in vs if z0 <= v.z < z1]
    return max(b) if b else 0.0


# --- ölçüm: el ucu (A-duruşunda en dıştaki köşeler), göğüs genişliği, omuz
el_uc = {}
for isaret in (1, -1):
    aday = sorted((v for v in vs if 0.12 * H < v.z < 0.62 * H and v.x * isaret > 0), key=lambda v: -abs(v.x))
    ust = aday[: max(5, len(aday) // 100)]
    el_uc[isaret] = Vector((sum(v.x for v in ust) / len(ust), sum(v.y for v in ust) / len(ust), sum(v.z for v in ust) / len(ust)))
gogus = min(dilim_genislik(z / 100 * H, (z + 2) / 100 * H) for z in range(56, 68, 2))
omuz_z = el_uc[1].z
z = el_uc[1].z
while z < 0.72 * H:
    if dilim_genislik(z, z + 0.02 * H) < gogus * 1.12:
        omuz_z = z
        break
    z += 0.01 * H
omuz_z = max(omuz_z, el_uc[1].z + 0.1 * H)
omuz_x = gogus * 0.78
gövde_yari = gogus
kalca_z = 0.30 * H
bacak_vs = [v for v in vs if v.z < 0.15 * H]
bacak_x = sum(abs(v.x) for v in bacak_vs) / max(1, len(bacak_vs))
boyun_z = 0.64 * H
kol_r = 0.075 * H
print(f"olcum gogus={gogus:.3f} omuz_z={omuz_z:.3f} el={tuple(round(c, 2) for c in el_uc[1])} bacak_x={bacak_x:.3f}")

# --- iskelet (bütün kemikler yukarı bakar, roll 0: yerel X = yanal eksen, yerel Z = ileri/geri)
bpy.ops.object.armature_add(location=(0, 0, 0))
isk = bpy.context.active_object
bpy.ops.object.mode_set(mode="EDIT")
eb = isk.data.edit_bones
kok = eb[0]
kok.name = "kok"
kok.head, kok.tail = (0, 0, 0), (0, 0, 0.2)


def kemik(ad, bas, ebeveyn):
    k = eb.new(ad)
    k.head = bas
    k.tail = (bas[0], bas[1], bas[2] + 0.2)
    k.roll = 0
    k.parent = eb[ebeveyn]
    return k


kemik("govde", (0, 0, kalca_z), "kok")
kemik("bas", (0, 0, boyun_z), "govde")
kemik("kol.L", (omuz_x, 0, omuz_z), "govde")
kemik("kol.R", (-omuz_x, 0, omuz_z), "govde")
kemik("bacak.L", (bacak_x, 0, kalca_z), "kok")
kemik("bacak.R", (-bacak_x, 0, kalca_z), "kok")
bpy.ops.object.mode_set(mode="OBJECT")

# --- ağırlıklar: kol = omuz->el kapsülü; bacak = kalça altı; baş = boyun üstü; kalan gövde
gruplar = {ad: govde.vertex_groups.new(name=ad) for ad in ("govde", "bas", "kol.L", "kol.R", "bacak.L", "bacak.R")}


def yumusak(x, a, b):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def kol_agirlik(p, isaret):
    a = Vector((omuz_x * isaret, 0, omuz_z))
    b = el_uc[isaret]
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    d = (p - (a + ab * t)).length
    return yumusak(t, 0.08, 0.28) * (1 - yumusak(d, kol_r, kol_r * 1.5)) * yumusak(abs(p.x), gogus * 0.85, gogus * 1.0)


for v in me.vertices:
    p = v.co
    ag = {}
    isaret = 1 if p.x > 0 else -1
    kol = kol_agirlik(p, isaret)
    bacak = (1 - yumusak(p.z, kalca_z - 0.06 * H, kalca_z + 0.02 * H)) * (1 - kol)
    bas = yumusak(p.z, boyun_z - 0.02 * H, boyun_z + 0.03 * H) * (1 - kol)
    kalan = 1.0 - kol - bacak - bas
    if kol > 0:
        ag["kol.L" if isaret > 0 else "kol.R"] = kol
    if bacak > 0:
        ag["bacak.L" if isaret > 0 else "bacak.R"] = bacak
    if bas > 0:
        ag["bas"] = bas
    if kalan > 0:
        ag["govde"] = kalan
    for ad, w in ag.items():
        gruplar[ad].add([v.index], w, "REPLACE")
mod = govde.modifiers.new("isk", "ARMATURE")
mod.object = isk
govde.parent = isk

# --- kazma (ilkel geometri; sağ ele bağlı, kol sarkıkken sap ileri bakar)
el = el_uc[-1].copy()


def malzeme(ad, renk):
    m = bpy.data.materials.new(ad)
    m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*renk, 1)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
    return m


bpy.ops.mesh.primitive_cylinder_add(radius=0.075, depth=0.8, location=(el.x, el.y - 0.25, el.z), rotation=(math.pi / 2, 0, 0))
sap = bpy.context.active_object
sap.data.materials.append(malzeme("sap", (0.55, 0.30, 0.12)))
bpy.ops.mesh.primitive_cube_add(size=1, location=(el.x, el.y - 0.60, el.z))
bas_k = bpy.context.active_object
bas_k.scale = (0.13, 0.13, 0.8)
bas_k.data.materials.append(malzeme("demir", (0.85, 0.87, 0.9)))
kazma = [sap, bas_k]
for o in kazma:
    dunya_m = o.matrix_world.copy()
    o.parent = isk
    o.parent_type = "BONE"
    o.parent_bone = "kol.R"
    bpy.context.view_layer.update()
    o.matrix_world = dunya_m

# karakteri ekranda sağa ve kameraya 3/4 döndür
isk.rotation_euler = (0, 0, math.radians(55))

# --- ışık ve kamera
dunya = bpy.data.worlds.new("d")
sahne.world = dunya
dunya.use_nodes = True
dunya.node_tree.nodes["Background"].inputs["Color"].default_value = (0.9, 0.9, 1.0, 1)
dunya.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.9
gunes = bpy.data.objects.new("gunes", bpy.data.lights.new("gunes", "SUN"))
gunes.data.energy = 2.6
gunes.rotation_euler = (math.radians(50), math.radians(-25), math.radians(-35))
sahne.collection.objects.link(gunes)
kam = bpy.data.objects.new("kam", bpy.data.cameras.new("kam"))
kam.data.type = "ORTHO"
kam.data.ortho_scale = 24 / 18 * H * 1.0  # dikey: 18 px boy = H (sensor_fit dikey)
kam.data.sensor_fit = "VERTICAL"
yuk = math.radians(28)
uzak = 10
hedef = Vector((0, 0, H * 0.62))
kam.location = hedef + Vector((0, -math.cos(yuk) * uzak, math.sin(yuk) * uzak))
kam.rotation_euler = (math.pi / 2 - yuk, 0, 0)
kam.data.shift_y = 0.0
sahne.collection.objects.link(kam)
sahne.camera = kam

# --- pozlar: (kok_z, govde_egim, govde_don, bas_egim, kolL(x,z), kolR(x,z), bacakL_x, bacakR_x, kazma)
# açı derece; kemik yerel X pozitif = geriye, negatif = ileri; kol yerel Z: L için + dışa, R için - dışa.
P = []
for k in range(4):  # BEKLE: nefes, kollar gövdeye yakın
    b = [0, 0.012, 0.02, 0.012][k]
    P.append((b, 0, 0, [0, -2, -3, -2][k], (0, -22 + k % 2 * 2), (0, 22 - k % 2 * 2), 0, 0, False))
for k in range(6):  # YÜRÜ
    f = k / 6 * 2 * math.pi
    sn = math.sin(f)
    P.append((0.035 * abs(math.cos(f)), -6, 4 * sn, 0, (28 * sn, -20), (-28 * sn, 20), -32 * sn, 32 * sn, False))
for k in range(6):  # KAZ: kaldır, tepe, vur, saplan, geri
    kr = [-70, -150, -175, -95, -25, -55][k]
    eg = [0, 6, 10, -12, -22, -10][k]
    P.append((0, eg, 0, eg * 0.3, (kr * 0.35, -14), (kr, 6), [0, 0, 0, -10, -14, -6][k], [0, 0, 0, 8, 10, 4][k], True))
for k in range(5):  # DÖVÜŞE GİR: geri çek, gerin, fırlat, takip
    kr = [10, 55, 75, -85, -50][k]
    P.append((0, [0, 6, 10, -14, -8][k], [0, 18, 26, -22, -10][k], 0, (-kr * 0.4, -16), (kr, 4),
              [0, 8, 10, -18, -10][k], [0, -6, -8, 14, 6][k], False))
for k in range(6):  # KUTLA: zıpla, kollar havada (A-duruşundan dışa)
    z = [0, 0.08, 0.22, 0.28, 0.14, 0][k]
    ka = [-10, 60, 105, 115, 85, 0][k]
    P.append((z, 0, 0, [0, 5, 8, 8, 5, 0][k], (0, ka), (0, -ka), [0, -10, -20, -20, -10, 0][k], [0, 10, 20, 20, 10, 0][k],
              False))
assert len(P) == 27

pb = isk.pose.bones
for ad in pb.keys():
    pb[ad].rotation_mode = "XYZ"
r = math.radians
kareler = (0, 7, 11, 12, 18, 23) if KONTROL else range(27)
for k in kareler:
    kz, ge, gd, be, kl, kr_, bl, br, kz_var = P[k]
    pb["kok"].location = (0, kz, 0)  # kemik yerel Y = dünya Z
    pb["govde"].rotation_euler = (r(ge), r(gd), 0)
    pb["bas"].rotation_euler = (r(be), 0, 0)
    pb["kol.L"].rotation_euler = (r(kl[0]), 0, r(kl[1]))
    pb["kol.R"].rotation_euler = (r(kr_[0]), 0, r(kr_[1]))
    pb["bacak.L"].rotation_euler = (r(bl), 0, 0)
    pb["bacak.R"].rotation_euler = (r(br), 0, 0)
    for o in kazma:
        o.hide_render = not kz_var
    bpy.context.view_layer.update()
    sahne.render.filepath = os.path.join(OUT, f"{k:02d}.png")
    bpy.ops.render.render(write_still=True)
print("tamam", OUT)
