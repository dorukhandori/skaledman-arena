import json,glob,sys
from PIL import Image,ImageDraw
A=sys.argv[1]; rows=[]
for j in sorted(glob.glob(A+"/*.json")):
    d=json.load(open(j)); im=Image.open(j[:-5]+".png"); atlas=j.split("/")[-1][:-5]
    for ad,names in d["animations"].items():
        pick=[names[int(k*(len(names)-1))] for k in (0.0,0.2,0.4,0.6,0.8)]
        cells=[]
        for n in pick:
            f=d["frames"][n]; r=f["frame"]; ss=f["sourceSize"]; sp=f["spriteSourceSize"]
            c=Image.new("RGBA",(ss["w"],ss["h"]),(40,36,48,255)); c.alpha_composite(im.crop((r["x"],r["y"],r["x"]+r["w"],r["y"]+r["h"])),(sp["x"],sp["y"])); cells.append(c)
        dv=d["meta"]["devran"][ad]; rows.append((f'{atlas}.png · {ad} · {dv["kaynak"]} · {dv["kare"]} kare @ {dv["fps"]} fps{" döngü" if dv["dongu"] else ""}',cells))
W=max(sum(c.width+4 for c in r) for _,r in rows); H=sum(max(c.height for c in r)+18 for _,r in rows)
out=Image.new("RGBA",(W,H),(20,18,24,255)); dr=ImageDraw.Draw(out); y=0
for lab,r in rows:
    dr.text((2,y+2),lab,fill=(240,230,200,255)); y+=16; x=0
    for c in r: out.paste(c,(x,y)); x+=c.width+4
    y+=max(c.height for c in r)+2
out.save(sys.argv[2],optimize=True); print(out.size)
