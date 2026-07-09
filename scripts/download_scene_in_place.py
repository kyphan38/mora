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

METADATA_PATH = "/Users/kyphan/ws/mora/public/scenes/metadata.json"
OUTPUT_DIR = "/Users/kyphan/ws/mora/public/scenes"

def check_ffmpeg():
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("\n[ERROR] ffmpeg or ffprobe is not installed or not found in your PATH.")
        print("Please install ffmpeg before running this script.")
        sys.exit(1)

def get_video_duration(filepath):
    """Sử dụng ffprobe để lấy thời lượng thực tế của file (giây)"""
    if not os.path.exists(filepath):
        return 0.0
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        filepath
    ]
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(result.stdout.strip())
    except Exception:
        return 0.0

def save_metadata(filename, title, url):
    data = []
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, list):
                    data = []
        except Exception:
            data = []

    exists = False
    for entry in data:
        if entry["filename"] == filename:
            entry["title"] = title
            entry["url"] = url
            exists = True
            break
            
    if not exists:
        data.append({
            "filename": filename,
            "title": title,
            "url": url
        })

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def download_and_process_segment(url, filename, start_sec, duration_sec):
    """Downloads a specific segment and processes it to 1440p muted video."""
    temp_output_path = os.path.join(OUTPUT_DIR, f"temp_{uuid.uuid4().hex[:4]}.mp4")
    final_output_path = os.path.join(OUTPUT_DIR, filename)

    print(f"-> Downloading segment (Start: {start_sec}s, Duration: {duration_sec}s) from: {url}")

    ydl_opts = {
        'format': 'bestvideo[height<=1440]/best[height<=1440]',
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
        print(f"   [ERROR] Failed to download from {url}: {e}")
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)
        return False

    print("   Processing with ffmpeg (1440p, Muted)...")
    vf_filter = "scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440"
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-i", temp_output_path,
        "-vf", vf_filter,
        "-an",  
        "-c:v", "libx264",
        "-crf", "16",  # Highly visually lossless for crisp details
        "-preset", "medium",
        final_output_path
    ]

    try:
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Extract high-quality thumbnail
        base_name = os.path.splitext(filename)[0]
        jpg_filename = f"{base_name}.jpg"
        jpg_path = os.path.join(OUTPUT_DIR, jpg_filename)
        print(f"   Extracting high-quality thumbnail -> {jpg_filename}")
        ffmpeg_thumb_cmd = [
            "ffmpeg", "-y",
            "-ss", "00:00:01",
            "-i", final_output_path,
            "-vframes", "1",
            "-qscale:v", "2",
            "-f", "image2",
            jpg_path
        ]
        try:
            subprocess.run(ffmpeg_thumb_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            print(f"   [WARN] Failed to extract thumbnail: {e}")

        print(f"   [SUCCESS] Overwritten -> {filename}\n")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   [ERROR] ffmpeg failed for {filename}: {e}\n")
        return False
    finally:
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)

def main():
    check_ffmpeg()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    force_download = "-f" in sys.argv or "--force" in sys.argv

    print("=" * 60)
    print("      YouTube Scene Manager (Smart Resume Enabled)      ")
    if force_download:
        print("                 --- FORCE MODE ACTIVE ---              ")
    print("=" * 60)
    print("1. Download a NEW custom scene")
    print("2. BATCH OVERWRITE/RESUME scenes from metadata.json")
    
    choice = input("Select mode (1 or 2): ").strip()

    if choice == "1":
        url = input("Enter YouTube video URL: ").strip()
        title = input("Enter Scene Title: ").strip()
        if not url or not title:
            print("[ERROR] URL and Title cannot be empty.")
            return

        start_sec = float(input("Start time in seconds (default 300): ") or 300.0)
        duration_sec = float(input("Duration in seconds (default 10): ") or 10.0)

        rand_id = uuid.uuid4().hex[:6]
        filename = f"scene_{rand_id}.mp4"

        if download_and_process_segment(url, filename, start_sec, duration_sec):
            save_metadata(filename, title, url)

    elif choice == "2":
        if not os.path.exists(METADATA_PATH):
            print(f"[ERROR] metadata.json not found at {METADATA_PATH}")
            return

        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            try:
                entries = json.load(f)
            except Exception as e:
                print(f"[ERROR] Could not parse JSON: {e}")
                return

        if not entries or not isinstance(entries, list):
            print("[INFO] No scenes found in metadata.json to update.")
            return

        target_start = 300.0
        target_duration = 10.0

        print(f"\n[INFO] Found {len(entries)} scenes in metadata.json.")
        print(f"Target Rules: Start at 5:00 ({target_start}s) | Duration: {target_duration}s")
        if force_download:
            print("[INFO] Force download active (-f). Re-downloading all scenes.")
        else:
            print("Checking existing files to skip completed ones...")
        print("-" * 60)

        success_count = 0
        failed_entries = []

        for entry in entries:
            filename = entry["filename"]
            url = entry["url"]
            final_output_path = os.path.join(OUTPUT_DIR, filename)

            # KIỂM TRA THÔNG MINH: Nếu file đã tồn tại và đúng độ dài 10s (sai số 0.5s) -> SKIP
            current_duration = get_video_duration(final_output_path)
            if not force_download and abs(current_duration - target_duration) < 0.5:
                print(f"[SKIP] {filename} is already {current_duration:.1f}s. Moving on.")
                success_count += 1
                continue

            # Chỉ tải lại nếu file chưa có hoặc độ dài cũ chưa chuẩn
            if download_and_process_segment(url, filename, start_sec=target_start, duration_sec=target_duration):
                success_count += 1
            else:
                failed_entries.append(entry)

        print("=" * 60)
        print(f"[BATCH FINISHED] Progress: {success_count}/{len(entries)} files are now ready.")
        
        # Nếu có file lỗi, in chi tiết danh sách để kiểm tra URL dead/private
        if failed_entries:
            print(f"\n[ALERT] The following {len(failed_entries)} files FAILED to update:")
            for idx, failed in enumerate(failed_entries, 1):
                print(f"  {idx}. File: {failed['filename']}")
                print(f"     Title: {failed['title']}")
                print(f"     URL: {failed['url']}")
            print("\n💡 Tip: Please check if these YouTube videos are deleted, private, or region-locked.")
        print("=" * 60)

    else:
        print("[ERROR] Invalid choice.")

if __name__ == "__main__":
    main()