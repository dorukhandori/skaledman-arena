import json,subprocess,sys
S=sys.argv[1]; rc=json.load(open(sys.argv[2]))
for e in rc["efektler"]:
    if e.get("harici"): continue  # dış şerit: arac/harici.py
    id=e["id"]; ad=e["ad"].split(".",1)[1]
    meta={"impacts/hit-spark":(0.5,0),"impacts/crit-hit":(0.9,0),"impacts/ricochet":(1.1,0),"impacts/heavy-landing":(1.6,0),"impacts/ground-slam":(3.2,0),"spawn/poof":(1.6,0),"lightning/zap-hit":(0.9,0),"lightning/charge-up":(2.7,0),"ice/ice-shatter":(2.8,0),"ice/frost-nova":(3.4,0),"fire/fire-ring":(3.9,0),"nature/earth-spike":(3.4,0),"nature/tornado":(2.0,1),"explosions/implosion":(1.65,0),"water/whirlpool":(3.0,1),"pickups/collect-burst":(1.35,0)}[id]
    dur,loop=meta
    fps=12.0
    root=S+"/dl/pixelfx-fork" if id=="water/whirlpool" else S+"/dl/pixelfx"
    cmd=["node",root+"/tools/render.mjs",id,"--sheet","--no-actor","--bg","none","--fps",f"{fps:.4f}","--out",S+"/render"]
    o=dict(e.get("secenek") or {})
    if e["palet"]: o["palette"]=e["palet"]
    if o: cmd+=["--opts",json.dumps(o)]
    r=subprocess.run(cmd,capture_output=True,text=True,timeout=300,cwd=S)
    print(id, f"fps={fps:.2f}", r.stdout.strip().split("->")[0], r.stderr[-300:])
