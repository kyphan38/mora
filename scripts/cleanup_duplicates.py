#!/usr/bin/env python3
import os
import json

PUBLIC_DIR = "/Users/kyphan/ws/mora/public/scenes"
DIST_DIR = "/Users/kyphan/ws/mora/dist/scenes"

# Core 30 scenes mapping to their canonical titles and URLs
CORE_SCENES = {
    "winter-nyc-sunset": "https://youtu.be/p_lw7qe-AHQ?si=KnuVeasB7aqML5WC",
    "soothing-rain-forest": "https://youtu.be/zF-__3RANT4",
    "sweden-christmas-penthouse": "https://youtu.be/aMMK0Juv7xc",
    "morning-sea-cabin": "https://www.youtube.com/live/jNWZxqrZQ5U?si=tmiMvJ9mVD9vr41M",
    "autumn-lakeside-cafe": "https://youtu.be/XPrubsEfA6A",
    "winter-forest-cabin": "https://www.youtube.com/live/RoG3DXiYvEw?si=q3nIIITIXJ3pAXTe",
    "coastal-beach-lofi": "https://youtu.be/vIlzvUsB6H0",
    "seaside-coffee-morning": "https://youtu.be/gUbNlN_SqpE",
    "alpine-morning-desk": "https://youtu.be/6OWbTLsx18c",
    "alpine-escapes-house": "https://youtu.be/bWaeMxggYaM",
    "countryside-morning-river": "https://youtu.be/ZlkRzZAApS8",
    "summer-mountain-cabin": "https://youtu.be/cYniat-NnUc",
    "lakeside-calm-rest": "https://youtu.be/45k9Qn8ZSQk",
    "piano-lakeside-cabin": "https://youtu.be/9PCfRvmN44M",
    "calm-water-cabin": "https://youtu.be/UW1JLXbyVhs",
    "clear-water-firelight": "https://youtu.be/pwFwKbjUqOY",
    "lakeside-cabin-retreat": "https://youtu.be/Crl_8hiMBUw",
    "home-office-ambience": "https://youtu.be/flZKsZLY51g",
    "programming-focus": "https://youtu.be/eE-1c4L8jf8",
    "snowy-mountain-ocean": "https://youtu.be/_y_LT54Elzg",
    "flow-state-ambient": "https://youtu.be/mAGsnMET6cg",
    "relaxing-coastal-focus": "https://youtu.be/KZdhzUVbPIE",
    "dark-academia-library": "https://youtu.be/eiP0Z-zJ_Q8?si=9NY4dfS6eAVeVe74",
    "coastal-cabin-study": "https://youtu.be/0xH6EkLj1mY",
    "binaural-study": "https://youtu.be/o7ywJ8ZtXKQ",
    "dark-concentration": "https://youtu.be/Ft8-YR_gVqs",
    "spring-seaside-sunset": "https://youtu.be/vpshjU-yhf4",
    "ambient-soundscapes": "https://youtu.be/Ao-zBXUYqJE",
    "cozy-morning-jazz": "https://youtu.be/KL1ms1KU9ac",
    "indoor-cozy-jazz": "https://youtu.be/4BU9jc7jX2w?si=B0vzHrhusJXj-G4J",
}

# Mapping of YouTube URLs to their simplified title names
CLEANED_TITLES = {
    "https://youtu.be/_HvIkyzos3Y": "Quiet Reading Jazz",
    "https://youtu.be/_HvIkyzos3Y?si=-6VXmBnkFc7GPEXo": "Quiet Reading Jazz",
    "https://youtu.be/_HvIkyzos3Y?si=D_v1hvASs2NW7ATf": "Quiet Reading Jazz",
    "https://youtu.be/JMhS-34-Hxo?si=OjhuJOJOc2-X6z_Q": "Chill Fireplace Lounge",
    "https://youtu.be/9Jv6Vs5UftQ?si=-sSvV7_mXizKEivv": "Evening Living Room Jazz",
    "https://youtu.be/HhGDDCq38HQ?si=FZw9sIjTe6N8RZjH": "Quiet Window Corner",
    "https://youtu.be/zPWSA0KOa4M?si=vrouztVG9Jt6lcSF": "Warm Café Jazz",
    "https://youtu.be/MwSSZeRgSJo?si=FE5JoYQwldQp8IFh": "Serene Porch Jazz",
    "https://youtu.be/xqcC-QRgs78?si=LBMY84NmawG2h4kp": "Cozy Garden Cafe",
    "https://youtu.be/GSWypHW1qWs?si=xnDGdUMk7eiVi02O": "Warm Coffee Shop Jazz",
    "https://youtu.be/4ON1i6mPRYs?si=Eqw7HrmMEzQrQdVj": "Beautiful Courtyard Jazz"
}

def clean_url(url):
    # Remove simple tracking parameters like si=...
    if "si=" in url:
        return url.split("si=")[0].rstrip("?&")
    return url

def clean_files(filename):
    for directory in (PUBLIC_DIR, DIST_DIR):
        mp4_path = os.path.join(directory, filename)
        if os.path.exists(mp4_path):
            os.remove(mp4_path)
            print(f"  Deleted: {mp4_path}")
        jpg_path = os.path.join(directory, filename.replace(".mp4", ".jpg"))
        if os.path.exists(jpg_path):
            os.remove(jpg_path)
            print(f"  Deleted: {jpg_path}")

def main():
    metadata_path = os.path.join(PUBLIC_DIR, "metadata.json")
    if not os.path.exists(metadata_path):
        print("Metadata not found!")
        return

    with open(metadata_path, "r") as f:
        entries = json.load(f)

    # Compile core URLs cleaned
    core_urls_cleaned = {clean_url(url): key for key, url in CORE_SCENES.items()}
    
    unique_entries = []
    seen_urls = set()

    print("Checking for duplicates and cleaning up titles...")
    for item in entries:
        filename = item["filename"]
        title = item["title"]
        url = item["url"]
        url_cleaned = clean_url(url)

        # 1. Check if it matches a core scene URL but has a different filename
        if url_cleaned in core_urls_cleaned:
            core_id = core_urls_cleaned[url_cleaned]
            if filename != f"{core_id}.mp4":
                print(f"Duplicate of Core Scene '{core_id}' found: {filename} ({title})")
                clean_files(filename)
                continue

        # 2. Check if we already processed this URL
        if url_cleaned in seen_urls:
            print(f"Duplicate download of URL found: {filename} ({title})")
            clean_files(filename)
            continue

        seen_urls.add(url_cleaned)

        # 3. Clean up the title
        matched_cleaned_title = CLEANED_TITLES.get(url) or CLEANED_TITLES.get(url_cleaned)
        if matched_cleaned_title:
            item["title"] = matched_cleaned_title
        else:
            # Fallback title formatting: split by | or - and strip emojis
            cleaned = title.split("|")[0].split("-")[0].strip()
            # Strip some emojis
            cleaned = cleaned.replace("🌿", "").replace("😌", "").replace("🌊", "").replace("🌿", "").strip()
            item["title"] = cleaned

        unique_entries.append(item)

    # Save to public and dist directories
    for directory in (PUBLIC_DIR, DIST_DIR):
        out_path = os.path.join(directory, "metadata.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(unique_entries, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(unique_entries)} unique scenes to {out_path}")

if __name__ == "__main__":
    main()
