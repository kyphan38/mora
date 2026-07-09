#!/usr/bin/env python3
"""Tự động tìm 1 điểm cắt trong video YouTube để loop mượt (không giật khi lặp lại),
rồi tải đúng đoạn đó về ở chất lượng cao (giống pipeline của download_scene_in_place.py).

Nếu video không có đoạn nào loop đủ mượt trong khoảng thời gian đã phân tích,
script sẽ báo rõ và KHÔNG tạo file, để bạn chọn video khác."""
import os
import sys
import subprocess
import shutil
import uuid
import json

try:
    import yt_dlp
except ImportError:
    print("Installing required library 'yt-dlp'...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yt-dlp"])
    import yt_dlp

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import video_quality as vq

METADATA_PATH = "/Users/kyphan/ws/mora/public/scenes/metadata.json"
OUTPUT_DIR = "/Users/kyphan/ws/mora/public/scenes"

# --- Tham số tìm điểm loop ---
PROXY_FPS = 2.0            # số frame/giây lấy mẫu để so sánh (proxy nhỏ, không cần cao)
PROXY_SCALE_W = 64
PROXY_SCALE_H = 36
MIN_LOOP_SEC = 6
MAX_LOOP_SEC = 30
MARGIN_SEC = 2.0           # bỏ qua vài giây đầu/cuối đoạn phân tích (tránh intro/outro)
LOOP_SCORE_THRESHOLD = 0.04  # điểm lệch (0-1) giữa frame đầu/cuối; > ngưỡng này coi là không loop mượt
CUT_REL_MULTIPLIER = 4.0    # 1 frame bị coi là "cut cứng" nếu lệch > 4x median
CUT_ABS_THRESHOLD = 0.08    # và lệch tuyệt đối > 20/255


def check_ffmpeg():
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("\n[ERROR] ffmpeg hoặc ffprobe chưa được cài / không có trong PATH.")
        sys.exit(1)


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
        data.append({"filename": filename, "title": title, "url": url})

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def download_and_process_segment(url, filename, start_sec, duration_sec):
    """Tải đúng đoạn [start_sec, start_sec+duration_sec] ở chất lượng cao và encode
    1440p muted - giống hệt pipeline trong download_scene_in_place.py."""
    temp_output_path = os.path.join(OUTPUT_DIR, f"temp_{uuid.uuid4().hex[:4]}.mp4")
    final_output_path = os.path.join(OUTPUT_DIR, filename)

    print(f"-> Đang tải đoạn final (Start: {start_sec:.2f}s, Duration: {duration_sec:.2f}s)...")

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
        print(f"   [ERROR] Tải thất bại: {e}")
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)
        return False

    print("   Đang encode (1440p, Muted)...")
    vf_filter = "scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440"
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-i", temp_output_path,
        "-vf", vf_filter,
        "-an",
        "-c:v", "libx264",
        "-crf", "16",
        "-preset", "medium",
        final_output_path
    ]

    try:
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        base_name = os.path.splitext(filename)[0]
        jpg_path = os.path.join(OUTPUT_DIR, f"{base_name}.jpg")
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
            print(f"   [WARN] Không trích được thumbnail: {e}")

        print(f"   [SUCCESS] -> {filename}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   [ERROR] ffmpeg encode thất bại: {e}")
        return False
    finally:
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)


def download_analysis_proxy(url, max_minutes):
    """Tải bản 144p nhẹ, dùng ffmpeg trim tại local để tránh bị YouTube throttle băng thông."""
    temp_full_path = os.path.join(OUTPUT_DIR, f"temp_full_144p_{uuid.uuid4().hex[:4]}.mp4")
    temp_path = os.path.join(OUTPUT_DIR, f"temp_proxy_{uuid.uuid4().hex[:4]}.mp4")
    end_sec = max_minutes * 60

    print(f"-> Đang tải bản phân tích (144p, tải tốc độ cao)...")
    ydl_opts = {
        'format': 'bestvideo[height<=144]/worst',
        'outtmpl': temp_full_path,
        'merge_output_format': 'mp4',
        'quiet': True,
        'overwrites': True,
        'js_runtimes': {'node': {}},
        'remote_components': ['ejs:github'],
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        print(f"   [ERROR] Không tải được bản phân tích: {e}")
        if os.path.exists(temp_full_path):
            os.remove(temp_full_path)
        return None

    if not os.path.exists(temp_full_path):
        return None

    print(f"   Đang cắt {max_minutes} phút đầu tiên tại máy cục bộ...")
    trim_cmd = [
        "ffmpeg", "-y",
        "-ss", "0",
        "-to", str(end_sec),
        "-i", temp_full_path,
        "-c", "copy",
        temp_path
    ]
    try:
        subprocess.run(trim_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"   [WARN] Không cắt được local, sử dụng trực tiếp file tải về: {e}")
        shutil.copy(temp_full_path, temp_path)
    finally:
        if os.path.exists(temp_full_path):
            os.remove(temp_full_path)

    return temp_path


def extract_proxy_frames(path):
    """Trích frame grayscale nhỏ (64x36) ở PROXY_FPS trên toàn bộ proxy, dùng để so khớp loop."""
    cmd = [
        "ffmpeg", "-i", path,
        "-vf", f"fps={PROXY_FPS},scale={PROXY_SCALE_W}:{PROXY_SCALE_H},format=gray",
        "-f", "rawvideo", "-pix_fmt", "gray",
        "-",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    raw = proc.stdout
    frame_size = PROXY_SCALE_W * PROXY_SCALE_H
    num_frames = len(raw) // frame_size
    if num_frames == 0:
        return np.empty((0, PROXY_SCALE_H, PROXY_SCALE_W), dtype=np.float32)
    frames = np.frombuffer(raw[: num_frames * frame_size], dtype=np.uint8).reshape(num_frames, PROXY_SCALE_H, PROXY_SCALE_W)
    return frames.astype(np.float32)


def detect_cut_positions(frames):
    """Trả về tập các frame-index là ranh giới scene-cut cứng (jump đột ngột)."""
    if len(frames) < 2:
        return set()
    diffs = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2)) / 255.0
    median_diff = float(np.median(diffs)) if len(diffs) else 0.0
    cut_threshold = max(median_diff * CUT_REL_MULTIPLIER, CUT_ABS_THRESHOLD)
    cut_positions = {i + 1 for i, d in enumerate(diffs) if d > cut_threshold}
    return cut_positions


def search_best_loop(frames, cut_positions):
    """Quét mọi (start, duration) hợp lệ, trả về (start_frame, duration_frames, score) tốt nhất
    (score thấp nhất = frame đầu/cuối giống nhau nhất). None nếu không có candidate nào."""
    total = len(frames)
    margin_frames = int(round(MARGIN_SEC * PROXY_FPS))

    best = None  # (score, start_frame, duration_frames)

    for dur_sec in range(MIN_LOOP_SEC, MAX_LOOP_SEC + 1):
        dur_frames = int(round(dur_sec * PROXY_FPS))
        if dur_frames <= 0 or dur_frames >= total:
            continue

        a = frames[:-dur_frames]
        b = frames[dur_frames:]
        diffs = np.abs(a - b).mean(axis=(1, 2)) / 255.0

        for s in range(len(diffs)):
            if s < margin_frames:
                continue
            end = s + dur_frames
            if end > total - margin_frames:
                continue
            if any(s < c < end for c in cut_positions):
                continue
            score = float(diffs[s])
            if best is None or score < best[0]:
                best = (score, s, dur_frames)

    if best is None:
        return None
    score, s, dur_frames = best
    return s, dur_frames, score


def main():
    check_ffmpeg()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("   Tự động tìm điểm loop mượt trong 1 video YouTube")
    print("=" * 60)

    url = input("Nhập URL video YouTube: ").strip()
    if not url:
        print("[ERROR] URL không được để trống.")
        return
    title = input("Nhập tên Scene: ").strip()
    if not title:
        print("[ERROR] Tên Scene không được để trống.")
        return

    max_minutes_raw = input("Phân tích bao nhiêu phút đầu video? (mặc định 15): ").strip()
    max_minutes = float(max_minutes_raw) if max_minutes_raw else 15.0

    proxy_path = download_analysis_proxy(url, max_minutes)
    if not proxy_path:
        return

    try:
        print("-> Đang trích frame để phân tích...")
        frames = extract_proxy_frames(proxy_path)
        if len(frames) < (MIN_LOOP_SEC + 2 * MARGIN_SEC) * PROXY_FPS:
            print("[ERROR] Video/đoạn phân tích quá ngắn để tìm loop. Hãy tăng số phút phân tích.")
            return

        cut_positions = detect_cut_positions(frames)
        print(f"   Phát hiện {len(cut_positions)} vị trí scene-cut cứng trong đoạn phân tích.")

        result = search_best_loop(frames, cut_positions)
        if result is None:
            print("\n[RESULT] Video không có loop — không tìm được đoạn nào tránh được scene-cut.")
            print("          Vui lòng chọn video khác.")
            return

        s, dur_frames, score = result
        start_sec = s / PROXY_FPS
        duration_sec = dur_frames / PROXY_FPS

        if score > LOOP_SCORE_THRESHOLD:
            print(f"\n[RESULT] Video không có loop thật sự trong {max_minutes:.0f} phút đầu đã phân tích")
            print(f"          (điểm lệch tốt nhất tìm được = {score:.4f}, ngưỡng chấp nhận = {LOOP_SCORE_THRESHOLD}).")
            print("          Vui lòng chọn video khác, hoặc tăng số phút phân tích rồi thử lại.")
            return

        print(f"\n[FOUND] Điểm loop mượt: bắt đầu {start_sec:.1f}s, dài {duration_sec:.1f}s "
              f"(độ lệch frame đầu/cuối = {score:.4f}, ngưỡng {LOOP_SCORE_THRESHOLD})")
        print("-> Tự động tải đoạn này về ở chất lượng cao...")

    finally:
        if proxy_path and os.path.exists(proxy_path):
            os.remove(proxy_path)

    rand_id = uuid.uuid4().hex[:6]
    filename = f"scene_{rand_id}.mp4"

    if not download_and_process_segment(url, filename, start_sec, duration_sec):
        return

    final_output_path = os.path.join(OUTPUT_DIR, filename)
    print("-> Đang chấm điểm chất lượng encode...")
    quality = vq.analyze(final_output_path)
    bpp_val = quality.get("bpp", 0.0)

    print(f"   Chất lượng encode: {vq.TIER_LABEL[quality['tier']]} (BPP={bpp_val:.4f})")

    if bpp_val >= 0.05:
        print(f"   [INFO] BPP ({bpp_val:.4f}) >= 0.05 -> Tự động GIỮ scene này.")
    else:
        print(f"\n[CẢNH BÁO] Chất lượng encode của scene này quá kém!")
        for reason in quality.get("reasons", []):
            print(f"   - {reason}")
        print(f"   [INFO] BPP ({bpp_val:.4f}) < 0.05 -> Tự động REJECT (xoá scene này).")
        if os.path.exists(final_output_path):
            os.remove(final_output_path)
        jpg_path = os.path.join(OUTPUT_DIR, f"{os.path.splitext(filename)[0]}.jpg")
        if os.path.exists(jpg_path):
            os.remove(jpg_path)
        print("   Đã xoá, không lưu vào metadata.json.")
        return

    save_metadata(filename, title, url)
    print(f"\n[DONE] Đã lưu scene '{title}' -> {filename}")


if __name__ == "__main__":
    main()
