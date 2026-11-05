"""Devran basit atari arka plan döngüsü (kendi sentezimiz, CC0).
Kare dalga melodi + üçgen bas + gürültü hi-hat; 120 BPM, 8 ölçü (16 sn), örnek doğruluğunda döngü.
Kullanım: python3 atari-dongu.py cikti.wav  → sonra ffmpeg ile mono OGG."""
import sys,math,random,struct,wave
SR=22050; BPM=120; BEAT=60/BPM; BARS=8; N=int(SR*BEAT*4*BARS)
buf=[0.0]*N
def hz(m): return 440*2**((m-69)/12)
def nota(t0,dur,m,dalga,vol,duty=0.5):
    i0=int(t0*SR); n=int(dur*SR); f=hz(m); ph=0.0
    for i in range(n):
        if i0+i>=N: break
        ph=(ph+f/SR)%1
        if dalga=='kare': v=1 if ph<duty else -1
        else: v=4*abs(ph-0.5)-1          # üçgen
        a=min(1,i/40)*min(1,(n-i)/200)*(1-0.35*i/n)   # kısa atak, yumuşak bitiş
        buf[i0+i]+=v*vol*a
rnd=random.Random(7)
def hat(t0,vol):
    i0=int(t0*SR)
    for i in range(int(0.03*SR)):
        if i0+i<N: buf[i0+i]+=rnd.uniform(-1,1)*vol*(1-i/(0.03*SR))**2
# Am - F - C - G (iki kez); akorlar (kök MIDI, üçlü, beşli)
akor=[(57,60,64),(53,57,60),(48,52,55),(55,59,62)]*2
melodi=[[76,72,69,72, 76,77,76,72],[77,72,69,72, 77,79,77,72],[76,72,67,72, 76,79,76,72],[74,71,67,71, 74,79,74,71],
        [76,72,69,72, 81,79,76,72],[77,72,69,72, 77,81,79,77],[76,72,67,72, 76,79,84,79],[74,71,67,74, 79,74,71,67]]
e=BEAT/2
for b,(k,t,f) in enumerate(akor):
    t0=b*4*BEAT
    for s in range(8): nota(t0+s*e, e*0.9, melodi[b][s], 'kare', 0.11, 0.25)   # melodi (%25 görev)
    for s,m in enumerate([k-12,k-12,f-12,k-12]): nota(t0+s*BEAT, BEAT*0.85, m, 'ucgen', 0.22)  # bas
    for s in range(8): hat(t0+s*e, 0.05 if s%2 else 0.08)
peak=max(abs(x) for x in buf); g=0.6/peak
with wave.open(sys.argv[1],'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<h',int(max(-1,min(1,x*g))*32767)) for x in buf))
