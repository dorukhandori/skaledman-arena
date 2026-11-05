"""Ata GLB -> "Tam rezonans" kare dizisi (şeffaf PNG).
blender --background --python render_ata.py -- <glb> <cikti_klasoru> <element_renk_hex> <yaw_derece> [onizleme]

Kurgu (24 kare): 0-9 yükseliş (alttan çıkar, ölçek 0.8->1, yaw -40->0), 10-15 kükreme (öne eğil, ölçek 1.1 tepe),
16-23 nefes döngüsü (oyun bu 8 kareyi döngüler). Kamera 3/4 üstten (oyunun bakışı), arkadan güçlü element renginde
kenar ışığı, malzemeye hafif yayım (ruh parıltısı).
"""
import math
import sys

import bpy
from mathutils import Vector

arg = sys.argv[sys.argv.index("--") + 1:]
GLB, OUT, RENK, YAW0 = arg[0], arg[1], arg[2], float(arg[3])
ONIZLEME = len(arg) > 4 and arg[4] in ("onizleme", "yonler")
YONLER = len(arg) > 4 and arg[4] == "yonler"
KAM = (float(arg[4]), float(arg[5])) if len(arg) > 5 else (6.4, 3.6)
PAR = float(arg[6]) if len(arg) > 6 else 1.0
renk = tuple(int(RENK[i:i + 2], 16) / 255 for i in (0, 2, 4))

bpy.ops.wm.read_factory_settings(use_empty=True)
sahne = bpy.context.scene
sahne.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE_NEXT"
sahne.render.film_transparent = True
sahne.render.resolution_x = sahne.render.resolution_y = 256 if ONIZLEME else 512
sahne.render.image_settings.file_format = "PNG"
sahne.render.image_settings.color_mode = "RGBA"
sahne.view_settings.view_transform = "Standard"
sahne.view_settings.look = "Medium High Contrast" if not ONIZLEME else "None"

bpy.ops.import_scene.gltf(filepath=GLB)
nesneler = [o for o in sahne.objects if o.type == "MESH"]
kok = bpy.data.objects.new("AtaKok", None)
sahne.collection.objects.link(kok)
for o in sahne.objects:
    if o.parent is None and o is not kok:
        o.parent = kok

# ölçüyü normalize et: yükseklik ~2, taban z=0, merkez xy=0
bpy.context.view_layer.update()
kose = [o.matrix_world @ Vector(c) for o in nesneler for c in o.bound_box]
mn = Vector((min(v.x for v in kose), min(v.y for v in kose), min(v.z for v in kose)))
mx = Vector((max(v.x for v in kose), max(v.y for v in kose), max(v.z for v in kose)))
boyut = max(mx.x - mn.x, mx.y - mn.y, mx.z - mn.z)
olcek = 2.2 / boyut
ic = bpy.data.objects.new("AtaIc", None)
sahne.collection.objects.link(ic)
ic.parent = kok
for o in list(kok.children):
    if o is not ic:
        o.parent = ic
ic.scale = (olcek,) * 3
ic.location = (-(mn.x + mx.x) / 2 * olcek, -(mn.y + mx.y) / 2 * olcek, -mn.z * olcek)

# malzeme: taban rengine hafif yayım ekle (ruh parıltısı)
for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bsdf:
        continue
    taban = bsdf.inputs["Base Color"]
    if "Emission Color" in bsdf.inputs:
        if taban.is_linked:
            nt.links.new(taban.links[0].from_socket, bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 0.6 * PAR
    bsdf.inputs["Roughness"].default_value = 0.75

# ışıklar
def isik(ad, tur, enerji, konum, renk_, boyut_=1.0):
    d = bpy.data.lights.new(ad, tur)
    d.energy = enerji * PAR
    d.color = renk_
    if hasattr(d, "size"):
        d.size = boyut_
    o = bpy.data.objects.new(ad, d)
    sahne.collection.objects.link(o)
    o.location = konum
    yon = Vector((0, 0, 1.0)) - Vector(konum)
    o.rotation_euler = yon.to_track_quat("-Z", "Y").to_euler()
    return o

isik("anahtar", "AREA", 700, (2.5, -3.5, 4.5), (1.0, 0.97, 0.92), 3)
isik("dolgu", "AREA", 120, (-3.5, -2.5, 2.0), (0.75, 0.8, 1.0), 4)
isik("kenar1", "AREA", 2600, (-2.0, 3.5, 2.6), renk, 2)
isik("kenar2", "AREA", 1900, (2.6, 3.0, 1.2), renk, 2)
dunya = bpy.data.worlds.new("d")
sahne.world = dunya
dunya.use_nodes = True
dunya.node_tree.nodes["Background"].inputs[1].default_value = 0.25

# kamera: 3/4 üstten
kd = bpy.data.cameras.new("kam")
kd.lens = 72
kam = bpy.data.objects.new("kam", kd)
sahne.collection.objects.link(kam)
kam.location = (0, -KAM[0], KAM[1])
hedef = Vector((0, 0, 0.85))
kam.rotation_euler = (hedef - kam.location).to_track_quat("-Z", "Y").to_euler()
sahne.camera = kam

def poz(k):
    """k: kare 0..23 -> (z, ölçek, yaw, eğim)."""
    if k <= 9:
        t = k / 9
        e = 1 - (1 - t) ** 3
        return (-1.6 * (1 - e), 0.8 + 0.2 * e, YAW0 - 40 * (1 - e), 0.0)
    if k <= 15:
        t = (k - 10) / 5
        s = math.sin(t * math.pi)
        return (0.05 * s, 1.0 + 0.1 * s, YAW0 + 4 * s, -9 * s)
    t = (k - 16) / 8
    s = math.sin(t * 2 * math.pi)
    return (0.03 * s, 1.0 + 0.015 * s, YAW0 + 2 * s, 0.0)

kareler = [(18, a) for a in (0, 90, 180, 270)] if YONLER else [(k, None) for k in ([0, 9, 13, 18] if ONIZLEME else range(24))]
for k, ek in kareler:
    z, s, yaw, egim = poz(k)
    if ek is not None:
        yaw, k = ek, ek
    kok.location = (0, 0, z)
    kok.scale = (s,) * 3
    kok.rotation_euler = (math.radians(egim), 0, math.radians(yaw))
    sahne.render.filepath = f"{OUT}/{k:02d}.png"
    bpy.ops.render.render(write_still=True)
print("bitti", OUT)
