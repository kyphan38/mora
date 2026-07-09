#!/usr/bin/env python3
import os
import sys
import subprocess
import shutil
import uuid
import json

# Ensure we have yt-dlp installed
try:
    import yt_dlp
except ImportError:
    print("Installing required library 'yt-dlp'...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yt-dlp"])
    import yt_dlp

def check_ffmpeg():
    if not shutil.which("ffmpeg"):
        print("\n[ERROR] ffmpeg is not installed or not found in your PATH.")
        print("Please install ffmpeg before running this script.")
        print("On macOS, you can install it using Homebrew:")
        print("    brew install ffmpeg")
        sys.exit(1)

def save_metadata(filename, title, url):
    metadata_path = "/Users/kyphan/ws/mora/public/scenes/metadata.json"
    data = []
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, list):
                    data = []
        except Exception:
            data = []
            
    data.append({
        "filename": filename,
        "title": title,
        "url": url
    })
    
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n[INFO] Saved metadata mapping to public/scenes/metadata.json")

def main():
    check_ffmpeg()
    
    print("=" * 60)
    print("      YouTube Scene Downloader & Cutter (Muted/1080p)     ")
    print("=" * 60)
    
    url = input("Enter YouTube video URL: ").strip()
    if not url:
        print("[ERROR] URL cannot be empty.")
        return

    title = input("Enter Scene Title: ").strip()
    if not title:
        print("[ERROR] Title cannot be empty.")
        return

    # Background default settings
    start_sec = 120.0
    duration_sec = 5.0

    # Generate a random output filename
    rand_id = uuid.uuid4().hex[:6]
    output_filename = f"scene_{rand_id}.mp4"

    output_dir = "/Users/kyphan/ws/mora/public/scenes"
    os.makedirs(output_dir, exist_ok=True)
    temp_output_path = os.path.join(output_dir, "temp_download.mp4")
    final_output_path = os.path.join(output_dir, output_filename)

    print(f"\n[1/3] Downloading muted video segment (start: {start_sec}s, duration: {duration_sec}s)...")
    
    # Download best video format only (height <= 1080)
    ydl_opts = {
        'format': 'bestvideo[height<=1080]/best[height<=1080]',
        'outtmpl': temp_output_path,
        'merge_output_format': 'mp4',
        'download_ranges': lambda info_dict, dict_path: [{
            'start_time': start_sec,
            'end_time': start_sec + duration_sec,
        }],
        'force_keyframes_at_cuts': True,
        'quiet': True,
        'overwrites': True,
        'js_runtimes': {'node': {}},
        'remote_components': ['ejs:github'],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        print(f"\n[ERROR] Failed to download video: {e}")
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)
        return

    print("\n[2/3] Processing video with ffmpeg to ensure exactly 1080p and NO audio (-an)...")
    # Cut, crop to 1920x1080, and disable audio (-an)
    vf_filter = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080"
    
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-i", temp_output_path,
        "-vf", vf_filter,
        "-an", # Mute / disable audio stream
        "-c:v", "libx264",
        "-crf", "20",
        "-preset", "medium",
        final_output_path
    ]

    try:
        subprocess.run(ffmpeg_cmd, check=True)
        print(f"\n[3/3] Success! Video saved to:")
        print(f"      {final_output_path}")
        
        # Save metadata mapping
        save_metadata(output_filename, title, url)
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] ffmpeg processing failed: {e}")
    finally:
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)

if __name__ == "__main__":
    main()
