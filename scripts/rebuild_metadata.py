#!/usr/bin/env python3
import os
import json
import re

PUBLIC_DIR = "/Users/kyphan/ws/mora/public/scenes"
DIST_DIR = "/Users/kyphan/ws/mora/dist/scenes"

# Known cleaned title mapping for absolute precision
CLEANED_TITLES = {
    "scene_887eec": "Quiet Reading Jazz",
    "scene_e3f92c": "Chill Fireplace Lounge",
    "scene_0a850b": "Evening Living Room Jazz",
    "scene_850ce5": "Quiet Window Corner",
    "scene_185b83": "Warm Café Jazz",
    "scene_2459b0": "Serene Porch Jazz",
    "scene_971b43": "Cozy Garden Cafe",
    "scene_e443ea": "Warm Coffee Shop Jazz",
    "scene_d5aa07": "Beautiful Courtyard Jazz",
    "scene_784adf": "Calm Guitar Melodies",
    "scene_072605": "Coastal Cabin Fireplace",
    "scene_6be729": "Cozy Ocean Sunset",
}

def clean_scene_title(filename, title):
    base_id = os.path.splitext(filename)[0]
    if base_id in CLEANED_TITLES:
        return CLEANED_TITLES[base_id]
        
    # Programmatic fallback cleanup
    for sep in ("|", "-", ":"):
        if sep in title:
            title = title.split(sep)[0]
    
    # Strip emojis and non-standard chars
    title = re.sub(r'[^\w\s,.\'\-]', '', title)
    title = " ".join(title.split()).strip()
    return title

def main():
    metadata_path = os.path.join(PUBLIC_DIR, "metadata.json")
    if not os.path.exists(metadata_path):
        print("Metadata file not found!")
        return

    with open(metadata_path, "r", encoding="utf-8") as f:
        entries = json.load(f)

    active_scenes = []
    seen_urls = set()

    for item in entries:
        filename = item["filename"]
        title = item["title"]
        url = item["url"]

        # Clean URL to prevent duplicate tracking params
        url_cleaned = url.split("si=")[0].rstrip("?&") if "si=" in url else url

        # Verify both .mp4 and .jpg files physically exist on disk
        jpg_filename = filename.replace(".mp4", ".jpg")
        mp4_path = os.path.join(PUBLIC_DIR, filename)
        jpg_path = os.path.join(PUBLIC_DIR, jpg_filename)

        if not (os.path.exists(mp4_path) and os.path.exists(jpg_path)):
            print(f"Skipping missing scene from metadata: {filename}")
            continue

        if url_cleaned in seen_urls:
            print(f"Skipping duplicate download URL: {url}")
            continue
        
        seen_urls.add(url_cleaned)

        # Simplify title
        item["title"] = clean_scene_title(filename, title)
        active_scenes.append(item)

    # Save metadata.json to both public and dist directories
    for directory in (PUBLIC_DIR, DIST_DIR):
        out_path = os.path.join(directory, "metadata.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(active_scenes, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(active_scenes)} active scenes to {out_path}")

    # Delete any scene_*.mp4 and scene_*.jpg that are NOT in the active_scenes list
    active_filenames = {x["filename"] for x in active_scenes}
    for directory in (PUBLIC_DIR, DIST_DIR):
        for name in os.listdir(directory):
            if name.startswith("scene_") and name.endswith((".mp4", ".jpg")):
                mp4_name = name.replace(".jpg", ".mp4")
                if mp4_name not in active_filenames:
                    file_path = os.path.join(directory, name)
                    os.remove(file_path)
                    print(f"Deleted leftover unused scene file: {file_path}")

if __name__ == "__main__":
    main()
