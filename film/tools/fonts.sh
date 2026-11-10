#!/bin/sh
# Fetch OFL fonts into ../fonts (same sources as dark-keynote demo).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
OUT="$HERE/../fonts"
mkdir -p "$OUT"
GF=https://raw.githubusercontent.com/google/fonts/main
get() { f=$1; url=$2; [ -f "$OUT/$f" ] && return; echo "↓ $f"; curl -fsSL "$url" -o "$OUT/$f"; }
get Inter.ttf "$GF/ofl/inter/Inter[opsz,wght].ttf"
get InterTight-var.woff2 "$GF/ofl/intertight/InterTight%5Bwght%5D.woff2"
get JetBrainsMono-var.ttf "$GF/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"
cat > "$OUT/fonts.css" <<'CSS'
@font-face{font-family:Inter;src:url(Inter.ttf) format('truetype');font-weight:100 900;font-display:block}
@font-face{font-family:InterTight;src:url(InterTight-var.woff2) format('woff2');font-weight:100 900;font-display:block}
@font-face{font-family:JBMono;src:url(JetBrainsMono-var.ttf) format('truetype');font-weight:100 800;font-display:block}
CSS
echo "fonts ok → $OUT"
