#!/usr/bin/env bash
# Harita tanıtım kaydının kurgusu: hazırlığı keser, maçı ×4 hızlandırır, H.264 MP4 yazar.
# Kullanım: bash araclar/tanitim-harita-kurgu.sh <KLASOR (kareler.txt + k/ + zaman.json)> <cikti.mp4>
set -euo pipefail
K="$1"; CIKTI="$2"
oku() { node -e "const z=require('$K/zaman.json'); console.log((z['$1']/1000).toFixed(2))"; }
BAS=$(oku bas); MB=$(oku macBas); MS=$(oku macBit); SON=$(node -e "const z=require('$K/zaman.json'); console.log((z.son/1000+0.6).toFixed(2))")
# kareler.txt (zaman damgalı ekran görüntüleri) → sabit 30 kare/sn ham video
[ -f "$K/ham.mp4" ] || ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$K/kareler.txt" -vf fps=30 -c:v libx264 -pix_fmt yuv420p -crf 16 "$K/ham.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$K/ham.mp4" -filter_complex \
  "[0:v]trim=start=$BAS:end=$MB,setpts=PTS-STARTPTS[a];[0:v]trim=start=$MB:end=$MS,setpts=(PTS-STARTPTS)/4[b];[0:v]trim=start=$MS:end=$SON,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0,fps=30[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart "$CIKTI"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$CIKTI"
