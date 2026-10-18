#!/usr/bin/env bash
# Makes a phone version (9:16, cut from the middle) of each scene in
# media/scenes that does not have one yet: <id>.portrait.mp4 and .jpg.
# Then mark the scene with "portrait": true in src/data/scenes.json and run
# scripts/upload-defaults.sh.
#
#   scripts/make-portrait.sh            # all scenes without a portrait file
#   scripts/make-portrait.sh scene_abc  # one scene
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="media/scenes"

ids=("$@")
if [ ${#ids[@]} -eq 0 ]; then
  for f in "$DIR"/*.mp4; do
    case "$f" in *.portrait.mp4) continue;; esac
    ids+=("$(basename "$f" .mp4)")
  done
fi

for id in "${ids[@]}"; do
  src="$DIR/$id.mp4"
  out="$DIR/$id.portrait.mp4"
  [ -f "$out" ] && { echo "skip $id (exists)"; continue; }
  # Crop the centre to 9:16, never upscale past the source height, max 1920.
  ffmpeg -v error -y -i "$src" \
    -vf "crop=trunc(ih*9/16/2)*2:ih,scale=-2:'min(1920,ih)'" \
    -an -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart "$out"
  ffmpeg -v error -y -ss 00:00:01 -i "$out" -vframes 1 -qscale:v 3 "$DIR/$id.portrait.jpg"
  size=$(du -h "$out" | cut -f1)
  echo "made $id.portrait.mp4 ($size)"
done
