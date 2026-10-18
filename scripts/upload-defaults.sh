#!/usr/bin/env bash
# Uploads the default scenes (media/scenes, git-ignored) to Cloud Storage
# under defaults/scenes/. Files are named by id, so they never change in
# place: long cache, and re-running only copies new files.
#
#   scripts/upload-defaults.sh            # scenes
#   scripts/upload-defaults.sh audio      # sounds (media/audio -> defaults/audio)
#
# Needs gcloud signed in with access to the project.
set -euo pipefail
cd "$(dirname "$0")/.."

BUCKET="gs://kyphan38-mora-app.firebasestorage.app"
KIND="${1:-scenes}"
SRC="media/$KIND"

[ -d "$SRC" ] || { echo "Nothing to upload: $SRC is missing"; exit 1; }

# -n: skip files already in the bucket.
gsutil -m -h "Cache-Control:public, max-age=31536000, immutable" cp -n -r "$SRC"/* "$BUCKET/defaults/$KIND/"
echo "Uploaded $SRC to $BUCKET/defaults/$KIND/"
