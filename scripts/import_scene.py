#!/usr/bin/env python3
"""Turn a downloaded video or photo (Pexels, Unsplash, ...) into a mora scene.

    python3 scripts/import_scene.py <file> "Title" [source page URL]

Video: takes up to 20 s from the middle, fades the end into the start so it
loops without a jump, encodes 1080p (30 fps max, muted, faststart, 15 MB or
less) plus a 9:16 phone cut and thumbnails.
Photo: a 2560 px landscape JPEG plus a 9:16 phone cut; the app shows it as a
still scene with a slow drift.

Output goes to media/scenes/ (git-ignored) and src/data/scenes.json.
Then run scripts/upload-defaults.sh and add a description in src/data/corners.ts.
"""
import json
import os
import subprocess
import sys
import uuid

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "media", "scenes")
META = os.path.join(REPO, "src", "data", "scenes.json")
SEGMENT_SEC = 20.0
MAX_MB = 15


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def probe(path, entry):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", entry, "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    # Some files print extra lines (side data); the first value is the one.
    return out.splitlines()[0].split(",")[0]


def loop_video(src, sid):
    duration = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src],
        capture_output=True, text=True, check=True).stdout.strip())
    length = min(SEGMENT_SEC, duration)
    start = max(0.0, (duration - length) / 2)
    fade = 1.0 if length < 10 else 1.5
    num, den = probe(src, "stream=r_frame_rate").split("/")
    fps = min(30, round(int(num) / int(den)))
    landscape = os.path.join(OUT, f"{sid}.mp4")
    # body = [fade, L]; its last `fade` seconds dissolve into [0, fade], so the
    # final frame flows into the first frame of the body.
    graph = (
        f"[0:v]fps={fps},scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,split[a][b];"
        f"[a]trim={fade}:{length},setpts=PTS-STARTPTS[body];"
        f"[b]trim=0:{fade},setpts=PTS-STARTPTS[head];"
        f"[body][head]xfade=transition=fade:duration={fade}:offset={length - 2 * fade},format=yuv420p[v]"
    )
    for crf in (23, 26, 29):
        run(["ffmpeg", "-y", "-ss", f"{start:.2f}", "-t", f"{length:.2f}", "-i", src,
             "-filter_complex", graph, "-map", "[v]", "-an", "-c:v", "libx264", "-crf", str(crf),
             "-preset", "slow", "-movflags", "+faststart", landscape])
        if os.path.getsize(landscape) <= MAX_MB * 1_000_000:
            break
    run(["ffmpeg", "-y", "-ss", "1", "-i", landscape, "-vframes", "1", "-qscale:v", "3", os.path.join(OUT, f"{sid}.jpg")])
    run([os.path.join(REPO, "scripts", "make-portrait.sh"), sid])
    return os.path.getsize(landscape) / 1_000_000


def still_photo(src, sid):
    run(["ffmpeg", "-y", "-i", src, "-vf", "scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440",
         "-qscale:v", "3", os.path.join(OUT, f"{sid}.jpg")])
    run(["ffmpeg", "-y", "-i", src, "-vf", "crop=trunc(ih*9/16/2)*2:ih,scale=-2:'min(1920,ih)'",
         "-qscale:v", "3", os.path.join(OUT, f"{sid}.portrait.jpg")])


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    src, title = sys.argv[1], sys.argv[2].strip()
    source = sys.argv[3] if len(sys.argv) > 3 else f"local:{os.path.basename(src)}"
    os.makedirs(OUT, exist_ok=True)
    sid = f"scene_{uuid.uuid4().hex[:6]}"
    is_video = src.lower().endswith((".mp4", ".mov", ".m4v", ".webm"))
    entry = {"filename": f"{sid}.mp4", "title": title, "url": source, "portrait": True}
    if is_video:
        size = loop_video(src, sid)
        print(f"{sid}  {title}  video {size:.1f} MB")
    else:
        still_photo(src, sid)
        entry["still"] = True
        print(f"{sid}  {title}  still")
    data = json.load(open(META, encoding="utf-8"))
    data.append(entry)
    with open(META, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
