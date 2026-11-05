"""Dış CC0 sprite şeritlerini (Aim Studios) element rampasına boyayıp pack.py'nin okuduğu
render biçimine (S/render/<id>/<ad>.png + .json) yazar. Kullanım: harici.py <S> <recete.json> <efekt-kök>"""
import json,sys,os
from PIL import Image
S,RC,K=sys.argv[1],sys.argv[2],sys.argv[3]
def hx(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
for e in json.load(open(RC))["efektler"]:
    h=e.get("harici")
    if not h: continue
    src=Image.open(os.path.join(K,h["dosya"])).convert("RGBA"); fw,fh=h["kare"]
    ramp=[hx(c) for c in e["palet"]]; n=len(ramp)
    cols,rows=src.width//fw,src.height//fh; cnt=h.get("adet",cols*rows)
    sheet=Image.new("RGBA",(fw*cnt,fh)); frames=[]
    # şeritteki benzersiz renkleri parlaklığa göre sırala, sırayı rampaya eşit dağıt (kontrast korunur)
    lum=lambda r,g,b:0.2126*r+0.7152*g+0.0722*b
    uniq=sorted({p[:3] for p in src.getdata() if p[3]>0},key=lambda c:lum(*c))
    m={c:ramp[round(i*(n-1)/max(1,len(uniq)-1))] for i,c in enumerate(uniq)}
    for k,v in h.get("renkHaritasi",{}).items(): m[hx("#"+k)]=hx(v)  # elle düzeltme
    for i in range(cnt):
        c=src.crop(((i%cols)*fw,(i//cols)*fh,(i%cols+1)*fw,(i//cols+1)*fh)); px=c.load()
        for y in range(fh):
            for x in range(fw):
                r,g,b,a=px[x,y]
                if a: px[x,y]=m[(r,g,b)]+(a,)
        sheet.paste(c,(i*fw,0)); frames.append({"frame":{"x":i*fw,"y":0,"w":fw,"h":fh}})
    sid,name=e["id"].split("/")
    d=os.path.join(S,"render",e["id"]); os.makedirs(d,exist_ok=True)
    sheet.save(os.path.join(d,name+".png"))
    json.dump({"frames":frames,"meta":{"pixelfx":{"fps":e["fps"],"loop":False,"frameSize":[fw,fh],"pivot":[fw//2,fh//2]}}},open(os.path.join(d,name+".json"),"w"))
    print(e["id"],cnt,"kare")
