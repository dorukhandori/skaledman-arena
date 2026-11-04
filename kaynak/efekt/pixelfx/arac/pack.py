import json,sys,os
from PIL import Image
S,OUT=sys.argv[1],sys.argv[2]
G={"efekt":["impacts/hit-spark","impacts/crit-hit","impacts/ricochet","impacts/heavy-landing","impacts/ground-slam","spawn/poof","pickups/collect-burst"],
"efekt-kor":["fire/fire-ring"],"efekt-don":["ice/ice-shatter","ice/frost-nova"],"efekt-kaya":["nature/earth-spike"],
"efekt-kasirga":["nature/tornado"],"efekt-girdap":["explosions/implosion","water/whirlpool"],"efekt-simsek":["lightning/zap-hit","lightning/charge-up"]}
rc=json.load(open(sys.argv[3]))
for e in rc["efektler"]:
    if e.get("harici") and e["id"] not in G[e["atlas"]]: G[e["atlas"]].append(e["id"])
AD={e["id"]:e["ad"].split(".",1)[1] for e in rc["efektler"]}
os.makedirs(OUT,exist_ok=True); rap={}
for atlas,ids in G.items():
    items=[];anim={};dv={}
    for id in ids:
        base=f"{S}/render/{id}/{id.split('/')[1]}"; d=json.load(open(base+".json")); im=Image.open(base+".png").convert("RGBA")
        px=d["meta"]["pixelfx"]; ad=AD[id]; crops=[]
        for f in d["frames"]:
            r=f["frame"]; c=im.crop((r["x"],r["y"],r["x"]+r["w"],r["y"]+r["h"])); crops.append((c,c.getchannel("A").getbbox()))
        last=max(i for i,(c,b) in enumerate(crops) if b) if not px["loop"] else len(crops)-1
        names=[]
        for i,(c,b) in enumerate(crops[:last+1]):
            if not b: b=(0,0,1,1)
            n=f"{ad}/{i:02d}"; names.append(n); items.append((n,c.crop(b),b,px["frameSize"]))
        anim[ad]=names; fw,fh=px["frameSize"]
        dv[ad]={"kaynak":("Aim Studios (CC0) " if id.startswith("aim/") else "pixelfx ")+id,"fps":px["fps"],"dongu":px["loop"],"kare":len(names),"kareMs":round(1000/px["fps"]),"kaynakBoyut":[fw,fh],"pivotPx":px["pivot"],"anchor":[round(px["pivot"][0]/fw,4),round(px["pivot"][1]/fh,4)]}
    # shelf pack, 1px padding
    items.sort(key=lambda t:-t[1].height); W=1024; 
    def pack(W):
        x=y=sh=0;pos={}
        for n,c,b,fs in items:
            w,h=c.size
            if x+w>W: x=0;y+=sh+1;sh=0
            pos[n]=(x,y);x+=w+1;sh=max(sh,h)
        return pos,y+sh
    while True:
        pos,H=pack(W)
        if H<=W or W>=2048: break
        W*=2
    H2=1
    while H2<H: H2*=2
    assert W<=2048 and H2<=2048,(atlas,W,H)
    img=Image.new("RGBA",(W,H2),(0,0,0,0)); fr={}
    for n,c,b,fs in items:
        x,y=pos[n]; img.paste(c,(x,y))
        ad=n.split("/")[0]
        fr[n]={"frame":{"x":x,"y":y,"w":c.width,"h":c.height},"rotated":False,"trimmed":True,
               "spriteSourceSize":{"x":b[0],"y":b[1],"w":c.width,"h":c.height},"sourceSize":{"w":fs[0],"h":fs[1]},"anchor":{"x":dv[ad]["anchor"][0],"y":dv[ad]["anchor"][1]}}
    img.save(f"{OUT}/{atlas}.png",optimize=True)
    js={"frames":fr,"animations":anim,"meta":{"app":"Devran efekt pişirme (pixelfx render.mjs + kırpma/paketleme)","image":f"{atlas}.png","format":"RGBA8888","size":{"w":W,"h":H2},"scale":"1","devran":dv,
        "lisans":"MIT — pixelfx, Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez (kaynak/efekt/pixelfx/LICENSE)"+("; CC0 — Aim Studios (kaynak/efekt/aim-explosions/)" if any(i.startswith("aim/") for i in ids) else "")}}
    json.dump(js,open(f"{OUT}/{atlas}.json","w"),ensure_ascii=False,separators=(",",":"))
    rap[atlas]={"boyut":[W,H2],"kare":len(items),"bayt":os.path.getsize(f"{OUT}/{atlas}.png"),"efektler":list(anim)}
    print(atlas,W,H2,len(items),os.path.getsize(f"{OUT}/{atlas}.png"))
json.dump(rap,open(S+"/rapor.json","w"),ensure_ascii=False,indent=1)
