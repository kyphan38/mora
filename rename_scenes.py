#!/usr/bin/env python3
import os
import json
import subprocess
import shutil

METADATA_PATH = "/Users/kyphan/ws/mora/public/scenes/metadata.json"
SCENES_DIR = "/Users/kyphan/ws/mora/public/scenes"
CORNERS_TS_PATH = "/Users/kyphan/ws/mora/src/data/corners.ts"

# Original corners to keep tests green
original_corners = [
  {
    "id": "snowy-city-walk",
    "name": "Snowy City Walk",
    "description": "A walking POV through falling snow - steady, moving calm.",
    "ambient": "City Walk",
    "gradient": "linear-gradient(135deg,#8794a3,#4a5560)"
  },
  {
    "id": "autumn-forest-cabin",
    "name": "Autumn Forest Cabin",
    "description": "A grounded hideaway for long study blocks.",
    "ambient": "Fireplace",
    "gradient": "linear-gradient(135deg,#a9793f,#5f4327)"
  },
  {
    "id": "night-forest-study",
    "name": "Night Forest Study",
    "description": "Made for deep focus with a darker sound.",
    "ambient": "Forest Night",
    "gradient": "linear-gradient(135deg,#2b4657,#122029)"
  },
  {
    "id": "rainy-hobbit-library",
    "name": "Rainy Hobbit Library",
    "description": "A cozy reading room for slow, steady work.",
    "ambient": "Fireplace",
    "gradient": "linear-gradient(135deg,#836731,#3c3020)"
  },
  {
    "id": "rainy-night-cafe",
    "name": "Rainy Night Cafe",
    "description": "Pairs naturally with rain ambience and lo-fi.",
    "ambient": "Cafe Ambience",
    "gradient": "linear-gradient(135deg,#403c5e,#1d1c2f)"
  },
  {
    "id": "rainy-street-cafe",
    "name": "Rainy Street Cafe",
    "description": "A close, moody cafe corner for focused work.",
    "ambient": "Cafe Ambience",
    "gradient": "linear-gradient(135deg,#485a44,#26302a)"
  },
  {
    "id": "temple-of-literature-morning",
    "name": "Temple of Literature Morning",
    "description": "A still, historic setting for calm reading.",
    "ambient": "Wind",
    "gradient": "linear-gradient(135deg,#bcab7e,#84744f)"
  },
  {
    "id": "hoi-an-golden-afternoon",
    "name": "Hoi An Golden Afternoon",
    "description": "Slow and warm - ideal for light reading.",
    "ambient": "Wind",
    "gradient": "linear-gradient(135deg,#c39450,#875c2c)"
  },
  {
    "id": "da-lat-misty-dawn",
    "name": "Da Lat Misty Dawn",
    "description": "Cool and serene - perfect for early mornings.",
    "ambient": "Wind",
    "gradient": "linear-gradient(135deg,#7c8994,#49545f)"
  }
]

# Hand-crafted clean mappings based on unique YouTube URLs
url_to_info = {
    "p_lw7qe-AHQ": {
        "id": "winter-nyc-sunset",
        "name": "Winter NYC Sunset",
        "description": "Sunset view over snowy NYC",
        "ambient": "Wind",
        "gradient": "linear-gradient(135deg, #4b5563, #1f2937)"
    },
    "zF-__3RANT4": {
        "id": "soothing-rain-forest",
        "name": "Soothing Rain Forest",
        "description": "Soothing rain sounds in nature",
        "ambient": "Rain",
        "gradient": "linear-gradient(135deg, #2a4d3b, #132a1e)"
    },
    "YqzKltZ-ueU": {
        "id": "summer-rain-nyc",
        "name": "Summer Rain NYC",
        "description": "Rain falling on NYC street",
        "ambient": "Rain",
        "gradient": "linear-gradient(135deg, #374151, #111827)"
    },
    "aMMK0Juv7xc": {
        "id": "sweden-christmas-penthouse",
        "name": "Sweden Christmas Penthouse",
        "description": "Cozy winter night near window",
        "ambient": "Fireplace",
        "gradient": "linear-gradient(135deg, #b91c1c, #450a0a)"
    },
    "_gHpCLU3XMc": {
        "id": "autumn-cafe-italy",
        "name": "Autumn Cafe Italy",
        "description": "Cozy balcony cafe in Italy",
        "ambient": "Cafe Ambience",
        "gradient": "linear-gradient(135deg, #d97706, #78350f)"
    },
    "ObHHw_o9iGU": {
        "id": "paris-balcony-jazz",
        "name": "Paris Balcony Jazz",
        "description": "Night jazz on Paris balcony",
        "ambient": "Cafe Ambience",
        "gradient": "linear-gradient(135deg, #312e81, #1e1b4b)"
    },
    "8w5ELqXNlvk": {
        "id": "late-night-jazz-lounge",
        "name": "Late Night Jazz Lounge",
        "description": "Relaxing dim light jazz lounge",
        "ambient": "Cafe Ambience",
        "gradient": "linear-gradient(135deg, #1e293b, #0f172a)"
    },
    "jNWZxqrZQ5U": {
        "id": "morning-sea-cabin",
        "name": "Morning Sea Cabin",
        "description": "Sunny cabin overlooking calm sea",
        "ambient": "Waves",
        "gradient": "linear-gradient(135deg, #0284c7, #0369a1)"
    },
    "XPrubsEfA6A": {
        "id": "autumn-lakeside-cafe",
        "name": "Autumn Lakeside Cafe",
        "description": "Cozy outdoor autumn coffee shop",
        "ambient": "Cafe Ambience",
        "gradient": "linear-gradient(135deg, #b45309, #78350f)"
    },
    "RoG3DXiYvEw": {
        "id": "winter-forest-cabin",
        "name": "Winter Forest Cabin",
        "description": "Snowy forest view with fireplace",
        "ambient": "Fireplace",
        "gradient": "linear-gradient(135deg, #4b5563, #1f2937)"
    },
    "vIlzvUsB6H0": {
        "id": "coastal-beach-lofi",
        "name": "Coastal Beach Lofi",
        "description": "Lofi beats on summer beach",
        "ambient": "Waves",
        "gradient": "linear-gradient(135deg, #0d9488, #115e59)"
    },
    "gUbNlN_SqpE": {
        "id": "seaside-coffee-morning",
        "name": "Seaside Coffee Morning",
        "description": "Peaceful morning by the sea",
        "ambient": "Waves",
        "gradient": "linear-gradient(135deg, #0e7490, #155e75)"
    },
    "JdqL89ZZwFw": {
        "id": "serene-lofi-room",
        "name": "Serene Lofi Room",
        "description": "Quiet study desk lo-fi vibes",
        "ambient": "Forest Birds",
        "gradient": "linear-gradient(135deg, #16a34a, #14532d)"
    },
    "OcWONxkfMqw": {
        "id": "peaceful-lofi-night",
        "name": "Peaceful Lofi Night",
        "description": "Night desk view for study",
        "ambient": "Summer Night",
        "gradient": "linear-gradient(135deg, #4338ca, #312e81)"
    },
    "OgGSarEnma0": {
        "id": "mountain-sunrise-retreat",
        "name": "Mountain Sunrise Retreat",
        "description": "Sunrise with peaceful bird songs",
        "ambient": "Forest Birds",
        "gradient": "linear-gradient(135deg, #ca8a04, #854d0e)"
    },
    "6OWbTLsx18c": {
        "id": "alpine-morning-desk",
        "name": "Alpine Morning Desk",
        "description": "Mountain morning view deep focus",
        "ambient": "Wind",
        "gradient": "linear-gradient(135deg, #38bdf8, #0369a1)"
    },
    "bWaeMxggYaM": {
        "id": "alpine-escapes-house",
        "name": "Alpine Escapes House",
        "description": "Luxury cabin in snowy mountains",
        "ambient": "Wind",
        "gradient": "linear-gradient(135deg, #0f766e, #115e59)"
    },
    "ZlkRzZAApS8": {
        "id": "countryside-morning-river",
        "name": "Countryside Morning River",
        "description": "River flow and bird songs",
        "ambient": "Forest Birds",
        "gradient": "linear-gradient(135deg, #15803d, #166534)"
    },
    "cYniat-NnUc": {
        "id": "summer-mountain-cabin",
        "name": "Summer Mountain Cabin",
        "description": "Mountain cabin by the lake",
        "ambient": "Waves",
        "gradient": "linear-gradient(135deg, #0284c7, #075985)"
    },
    "45k9Qn8ZSQk": {
        "id": "lakeside-calm-rest",
        "name": "Lakeside Calm Rest",
        "description": "Lakeside view for deep rest",
        "ambient": "Waves",
        "gradient": "linear-gradient(135deg, #0ea5e9, #0369a1)"
    },
    "9PCfRvmN44M": {
        "id": "piano-lakeside-cabin",
        "name": "Piano Lakeside Cabin",
        "description": "Lakeside cabin with fireplace sounds",
        "ambient": "Fireplace",
        "gradient": "linear-gradient(135deg, #854d0e, #713f12)"
    },
    "UW1JLXbyVhs": {
        "id": "calm-water-cabin",
        "name": "Calm Water Cabin",
        "description": "Calm water and birds singing",
        "ambient": "Forest Birds",
        "gradient": "linear-gradient(135deg, #0d9488, #115e59)"
    },
    "pwFwKbjUqOY": {
        "id": "clear-water-firelight",
        "name": "Clear Water Firelight",
        "description": "Clear lake water with fireplace",
        "ambient": "Fireplace",
        "gradient": "linear-gradient(135deg, #b45309, #7c2d12)"
    },
    "Crl_8hiMBUw": {
        "id": "lakeside-cabin-retreat",
        "name": "Lakeside Cabin Retreat",
        "description": "Lakeside cabin peaceful retreat",
        "ambient": "Waves",
        "gradient": "linear-gradient(135deg, #0284c7, #1e3a8a)"
    }
}

def extract_video_id(url):
    if "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]
    elif "watch?v=" in url:
        return url.split("watch?v=")[1].split("&")[0]
    elif "youtube.com/live/" in url:
        return url.split("youtube.com/live/")[1].split("?")[0]
    return None

def main():
    if not os.path.exists(METADATA_PATH):
        print(f"[ERROR] metadata.json not found at {METADATA_PATH}")
        return

    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        entries = json.load(f)

    processed_urls = set()
    new_corners = []

    for entry in entries:
        filename = entry.get("filename")
        url = entry.get("url")
        
        video_id = extract_video_id(url)
        if not video_id:
            continue

        if video_id in processed_urls:
            # Duplicate
            old_file_path = os.path.join(SCENES_DIR, filename)
            if os.path.exists(old_file_path):
                print(f"[INFO] Deleting duplicate file: {filename}")
                os.remove(old_file_path)
            continue

        info = url_to_info.get(video_id)
        if not info:
            continue

        old_file_path = os.path.join(SCENES_DIR, filename)
        new_filename = f"{info['id']}.mp4"
        new_file_path = os.path.join(SCENES_DIR, new_filename)

        if os.path.exists(old_file_path):
            print(f"[INFO] Renaming {filename} -> {new_filename}")
            shutil.move(old_file_path, new_file_path)
            
            # Extract thumbnail
            new_jpg_filename = f"{info['id']}.jpg"
            new_jpg_path = os.path.join(SCENES_DIR, new_jpg_filename)
            print(f"[INFO] Extracting thumbnail to {new_jpg_filename}...")
            ffmpeg_cmd = [
                "ffmpeg", "-y",
                "-ss", "00:00:01",
                "-i", new_file_path,
                "-vframes", "1",
                "-f", "image2",
                new_jpg_path
            ]
            try:
                subprocess.run(ffmpeg_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as e:
                print(f"[WARN] Failed to extract thumbnail: {e}")

        processed_urls.add(video_id)
        new_corners.append(info)

    # Write corners.ts file
    print(f"[INFO] Writing new corners to {CORNERS_TS_PATH}")
    with open(CORNERS_TS_PATH, "w", encoding="utf-8") as f:
        f.write("import type { Corner } from '../types';\n\n")
        f.write("export const CORNERS: Corner[] = ")
        f.write(json.dumps(new_corners, ensure_ascii=False, indent=2))
        f.write(";\n")

    # Save cleaned metadata file
    cleaned_metadata = []
    for info in new_corners:
        matching_key = [k for k, v in url_to_info.items() if v['id'] == info['id']][0]
        cleaned_metadata.append({
            "filename": f"{info['id']}.mp4",
            "title": info["name"],
            "url": f"https://youtu.be/{matching_key}"
        })
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(cleaned_metadata, f, ensure_ascii=False, indent=2)

    print("\n[SUCCESS] All scenes renamed and deduplicated successfully!")

if __name__ == "__main__":
    main()
