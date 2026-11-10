#!/bin/sh
# Full film build (not run at checkpoint). From library root or with LIB set.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/c/Users/gower/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to lemo-opuscar root"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/Scripts/python.exe"
[ -x "$PY" ] || PY="$LIB/.venv/bin/python"
sh "$HERE/tools/fonts.sh" 2>/dev/null || true
"$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voices"
"$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices"
# score + mix land later
node core/render/video.mjs "$HERE" --fps 24 --workers 2 --out "$HERE/build/video.mp4"
# sh core/render/mux.sh "$HERE/build/video.mp4" "$HERE/build/mix.wav" "$HERE/build/sentinel-log.mp4" 24 0
echo "checkpoint scaffold only — full mux not wired yet"
