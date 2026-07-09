#!/usr/bin/env python3
import os
import json

PUBLIC_DIR = "/Users/kyphan/ws/mora/public/scenes"
DIST_DIR = "/Users/kyphan/ws/mora/dist/scenes"

# Core 30 scenes
CORE_SCENES = [
  {
    "filename": "winter-nyc-sunset.mp4",
    "title": "Winter NYC Sunset",
    "url": "https://youtu.be/p_lw7qe-AHQ?si=KnuVeasB7aqML5WC"
  },
  {
    "filename": "soothing-rain-forest.mp4",
    "title": "Soothing Rain Forest",
    "url": "https://youtu.be/zF-__3RANT4"
  },
  {
    "filename": "sweden-christmas-penthouse.mp4",
    "title": "Sweden Christmas Penthouse",
    "url": "https://youtu.be/aMMK0Juv7xc"
  },
  {
    "filename": "morning-sea-cabin.mp4",
    "title": "Morning Sea Cabin",
    "url": "https://www.youtube.com/live/jNWZxqrZQ5U?si=tmiMvJ9mVD9vr41M"
  },
  {
    "filename": "autumn-lakeside-cafe.mp4",
    "title": "Autumn Lakeside Cafe",
    "url": "https://youtu.be/XPrubsEfA6A"
  },
  {
    "filename": "winter-forest-cabin.mp4",
    "title": "Winter Forest Cabin",
    "url": "https://www.youtube.com/live/RoG3DXiYvEw?si=q3nIIITIXJ3pAXTe"
  },
  {
    "filename": "coastal-beach-lofi.mp4",
    "title": "Coastal Beach Lofi",
    "url": "https://youtu.be/vIlzvUsB6H0"
  },
  {
    "filename": "seaside-coffee-morning.mp4",
    "title": "Seaside Coffee Morning",
    "url": "https://youtu.be/gUbNlN_SqpE"
  },
  {
    "filename": "alpine-morning-desk.mp4",
    "title": "Alpine Morning Desk",
    "url": "https://youtu.be/6OWbTLsx18c"
  },
  {
    "filename": "alpine-escapes-house.mp4",
    "title": "Alpine Escapes House",
    "url": "https://youtu.be/bWaeMxggYaM"
  },
  {
    "filename": "countryside-morning-river.mp4",
    "title": "Countryside Morning River",
    "url": "https://youtu.be/ZlkRzZAApS8"
  },
  {
    "filename": "summer-mountain-cabin.mp4",
    "title": "Summer Mountain Cabin",
    "url": "https://youtu.be/cYniat-NnUc"
  },
  {
    "filename": "lakeside-calm-rest.mp4",
    "title": "Lakeside Calm Rest",
    "url": "https://youtu.be/45k9Qn8ZSQk"
  },
  {
    "filename": "piano-lakeside-cabin.mp4",
    "title": "Piano Lakeside Cabin",
    "url": "https://youtu.be/9PCfRvmN44M"
  },
  {
    "filename": "calm-water-cabin.mp4",
    "title": "Calm Water Cabin",
    "url": "https://youtu.be/UW1JLXbyVhs"
  },
  {
    "filename": "clear-water-firelight.mp4",
    "title": "Clear Water Firelight",
    "url": "https://youtu.be/pwFwKbjUqOY"
  },
  {
    "filename": "lakeside-cabin-retreat.mp4",
    "title": "Lakeside Cabin Retreat",
    "url": "https://youtu.be/Crl_8hiMBUw"
  },
  {
    "filename": "home-office-ambience.mp4",
    "title": "Home Office Ambience",
    "url": "https://youtu.be/flZKsZLY51g"
  },
  {
    "filename": "programming-focus.mp4",
    "title": "Programming Focus",
    "url": "https://youtu.be/eE-1c4L8jf8"
  },
  {
    "filename": "snowy-mountain-ocean.mp4",
    "title": "Snowy Mountain Ocean",
    "url": "https://youtu.be/_y_LT54Elzg"
  },
  {
    "filename": "flow-state-ambient.mp4",
    "title": "Flow State Ambient",
    "url": "https://youtu.be/mAGsnMET6cg"
  },
  {
    "filename": "relaxing-coastal-focus.mp4",
    "title": "Relaxing Coastal Focus",
    "url": "https://youtu.be/KZdhzUVbPIE"
  },
  {
    "filename": "dark-academia-library.mp4",
    "title": "Dark Academia Library",
    "url": "https://youtu.be/eiP0Z-zJ_Q8?si=9NY4dfS6eAVeVe74"
  },
  {
    "filename": "coastal-cabin-study.mp4",
    "title": "Coastal Cabin Study",
    "url": "https://youtu.be/0xH6EkLj1mY"
  },
  {
    "filename": "binaural-study.mp4",
    "title": "Binaural Study",
    "url": "https://youtu.be/o7ywJ8ZtXKQ"
  },
  {
    "filename": "dark-concentration.mp4",
    "title": "Dark Concentration",
    "url": "https://youtu.be/Ft8-YR_gVqs"
  },
  {
    "filename": "spring-seaside-sunset.mp4",
    "title": "Spring Seaside Sunset",
    "url": "https://youtu.be/vpshjU-yhf4"
  },
  {
    "filename": "ambient-soundscapes.mp4",
    "title": "Ambient Soundscapes",
    "url": "https://youtu.be/Ao-zBXUYqJE"
  },
  {
    "filename": "cozy-morning-jazz.mp4",
    "title": "Cozy Morning Jazz",
    "url": "https://youtu.be/KL1ms1KU9ac"
  },
  {
    "filename": "indoor-cozy-jazz.mp4",
    "title": "Indoor Cozy Jazz",
    "url": "https://youtu.be/4BU9jc7jX2w?si=B0vzHrhusJXj-G4J"
  }
]

# The 9 unique custom scenes with simplified clean titles
CUSTOM_SCENES = [
  {
    "filename": "scene_887eec.mp4",
    "title": "Quiet Reading Jazz",
    "url": "https://youtu.be/_HvIkyzos3Y?si=-6VXmBnkFc7GPEXo"
  },
  {
    "filename": "scene_e3f92c.mp4",
    "title": "Chill Fireplace Lounge",
    "url": "https://youtu.be/JMhS-34-Hxo?si=OjhuJOJOc2-X6z_Q"
  },
  {
    "filename": "scene_0a850b.mp4",
    "title": "Evening Living Room Jazz",
    "url": "https://youtu.be/9Jv6Vs5UftQ?si=-sSvV7_mXizKEivv"
  },
  {
    "filename": "scene_850ce5.mp4",
    "title": "Quiet Window Corner",
    "url": "https://youtu.be/HhGDDCq38HQ?si=FZw9sIjTe6N8RZjH"
  },
  {
    "filename": "scene_185b83.mp4",
    "title": "Warm Café Jazz",
    "url": "https://youtu.be/zPWSA0KOa4M?si=vrouztVG9Jt6lcSF"
  },
  {
    "filename": "scene_2459b0.mp4",
    "title": "Serene Porch Jazz",
    "url": "https://youtu.be/MwSSZeRgSJo?si=FE5JoYQwldQp8IFh"
  },
  {
    "filename": "scene_971b43.mp4",
    "title": "Cozy Garden Cafe",
    "url": "https://youtu.be/xqcC-QRgs78?si=LBMY84NmawG2h4kp"
  },
  {
    "filename": "scene_e443ea.mp4",
    "title": "Warm Coffee Shop Jazz",
    "url": "https://youtu.be/GSWypHW1qWs?si=xnDGdUMk7eiVi02O"
  },
  {
    "filename": "scene_d5aa07.mp4",
    "title": "Beautiful Courtyard Jazz",
    "url": "https://youtu.be/4ON1i6mPRYs?si=Eqw7HrmMEzQrQdVj"
  }
]

def main():
    combined = CORE_SCENES + CUSTOM_SCENES
    
    # Only keep scenes that physically exist in the public directory
    active_scenes = []
    for item in combined:
        filename = item["filename"]
        jpg_filename = filename.replace(".mp4", ".jpg")
        mp4_path = os.path.join(PUBLIC_DIR, filename)
        jpg_path = os.path.join(PUBLIC_DIR, jpg_filename)
        if os.path.exists(mp4_path) and os.path.exists(jpg_path):
            active_scenes.append(item)
        else:
            print(f"Skipping missing scene file: {filename}")

    # Save metadata.json to both public and dist directories
    for directory in (PUBLIC_DIR, DIST_DIR):
        out_path = os.path.join(directory, "metadata.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(active_scenes, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(active_scenes)} active scenes to {out_path}")

    # Delete any scene_*.mp4 and scene_*.jpg that are NOT in the CUSTOM_SCENES list
    custom_filenames = {x["filename"] for x in CUSTOM_SCENES}
    
    for directory in (PUBLIC_DIR, DIST_DIR):
        for name in os.listdir(directory):
            if name.startswith("scene_") and name.endswith((".mp4", ".jpg")):
                # Get the mp4 counterpart
                mp4_name = name.replace(".jpg", ".mp4")
                if mp4_name not in custom_filenames:
                    file_path = os.path.join(directory, name)
                    os.remove(file_path)
                    print(f"Deleted leftover unused scene file: {file_path}")

if __name__ == "__main__":
    main()
