#!/usr/bin/env python3
"""Bộ tiêu chí chấm điểm chất lượng encode cho video nền (BPP, resolution floor,
blockiness, Laplacian tương đối, codec profile). Dùng chung cho
check_video_quality.py và find_loop_scene.py."""
import json
import statistics
import subprocess

import numpy as np

# Ngưỡng BPP (bits per pixel = bitrate / (width*height*fps)) cho H.264
BPP_DANGER = 0.04
BPP_BORDERLINE = 0.08
BPP_OK = 0.15

MIN_SHORT_SIDE = 720
BLOCKINESS_THRESHOLD = 1.4

TIER_ORDER = ["safe", "ok", "borderline", "danger"]
TIER_LABEL = {
    "safe": "TỐT",
    "ok": "ỔN",
    "borderline": "CẢNH BÁO",
    "danger": "NGUY HIỂM (nén quá tay)",
}
TIER_SHORT = {
    "safe": "TỐT",
    "ok": "ỔN",
    "borderline": "CẢNH BÁO",
    "danger": "NGUY HIỂM",
}


def ffprobe_info(path):
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,bit_rate,codec_name,profile:format=duration,bit_rate",
        "-of", "json",
        path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=True)
    data = json.loads(result.stdout)
    stream = data["streams"][0]
    fmt = data.get("format", {})

    num, den = stream.get("r_frame_rate", "0/1").split("/")
    fps = float(num) / float(den) if float(den) != 0 else 0.0

    bitrate = stream.get("bit_rate") or fmt.get("bit_rate")
    bitrate = float(bitrate) if bitrate is not None else 0.0

    duration = fmt.get("duration")
    duration = float(duration) if duration is not None else 0.0

    return {
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "fps": fps,
        "bitrate": bitrate,
        "duration": duration,
        "codec": stream.get("codec_name", "?"),
        "profile": stream.get("profile", "?"),
    }


def compute_bpp(bitrate, width, height, fps):
    denom = width * height * fps
    if denom <= 0:
        return 0.0
    return bitrate / denom


def classify_bpp(bpp):
    if bpp < BPP_DANGER:
        return "danger"
    if bpp < BPP_BORDERLINE:
        return "borderline"
    if bpp < BPP_OK:
        return "ok"
    return "safe"


def check_resolution_floor(width, height, min_short_side=MIN_SHORT_SIDE):
    return min(width, height) >= min_short_side


def sample_grayscale_frames(path, n=12):
    """Trích n frame grayscale cách đều theo timeline, giữ nguyên độ phân giải gốc
    (blockiness cần lưới pixel chính xác 8x8, không thể downscale như proxy tìm loop)."""
    info = ffprobe_info(path)
    width, height, duration = info["width"], info["height"], info["duration"]
    if duration <= 0 or width <= 0 or height <= 0:
        return np.empty((0, height, width), dtype=np.uint8)

    fps_value = n / duration
    cmd = [
        "ffmpeg", "-i", path,
        "-vf", f"fps={fps_value:.6f},format=gray",
        "-f", "rawvideo", "-pix_fmt", "gray",
        "-",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    raw = proc.stdout
    frame_size = width * height
    num_frames = len(raw) // frame_size
    if num_frames == 0:
        return np.empty((0, height, width), dtype=np.uint8)
    frames = np.frombuffer(raw[: num_frames * frame_size], dtype=np.uint8).reshape(num_frames, height, width)
    return frames[:n]


def laplacian_variance(frame):
    """Variance of Laplacian (độ nét) - dùng tương đối, không so với hằng số tuyệt đối."""
    f = frame.astype(np.float64)
    lap = -4 * f[1:-1, 1:-1] + f[:-2, 1:-1] + f[2:, 1:-1] + f[1:-1, :-2] + f[1:-1, 2:]
    return float(lap.var())


def blockiness_ratio(frame, block=8):
    """So sánh gradient tại biên block (8/16px) với gradient bên trong block.
    Tỷ lệ càng cao -> càng nhiều dấu hiệu vỡ macroblock."""
    f = frame.astype(np.float64)
    gx = np.abs(np.diff(f, axis=1))  # (H, W-1)
    gy = np.abs(np.diff(f, axis=0))  # (H-1, W)

    col_idx = np.arange(gx.shape[1])
    boundary_cols = (col_idx + 1) % block == 0
    row_idx = np.arange(gy.shape[0])
    boundary_rows = (row_idx + 1) % block == 0

    boundary_energy = np.concatenate([gx[:, boundary_cols].ravel(), gy[boundary_rows, :].ravel()])
    interior_energy = np.concatenate([gx[:, ~boundary_cols].ravel(), gy[~boundary_rows, :].ravel()])

    boundary_mean = boundary_energy.mean() if boundary_energy.size else 0.0
    interior_mean = interior_energy.mean() if interior_energy.size else 1e-9
    return float(boundary_mean / max(interior_mean, 1e-9))


def analyze(path, num_samples=12):
    info = ffprobe_info(path)
    bpp = compute_bpp(info["bitrate"], info["width"], info["height"], info["fps"])
    bpp_tier = classify_bpp(bpp)
    resolution_ok = check_resolution_floor(info["width"], info["height"])

    frames = sample_grayscale_frames(path, n=num_samples)

    lap_median = lap_min = block_median = block_max = None
    blockiness_flag = False
    if len(frames) > 0:
        laps = [laplacian_variance(fr) for fr in frames]
        blocks = [blockiness_ratio(fr) for fr in frames]
        lap_median = statistics.median(laps)
        lap_min = min(laps)
        block_median = statistics.median(blocks)
        block_max = max(blocks)
        blockiness_flag = block_median > BLOCKINESS_THRESHOLD

    profile_flag = info["profile"] in ("Baseline", "Constrained Baseline")

    tier = bpp_tier
    if blockiness_flag:
        idx = TIER_ORDER.index(tier)
        tier = TIER_ORDER[min(idx + 1, len(TIER_ORDER) - 1)]

    reasons = [f"BPP={bpp:.4f} -> {TIER_LABEL[bpp_tier]}"]
    if not resolution_ok:
        reasons.append(f"Độ phân giải {info['width']}x{info['height']} dưới ngưỡng sàn (min side < {MIN_SHORT_SIDE})")
    if blockiness_flag:
        reasons.append(f"Blockiness ratio median={block_median:.2f} > ngưỡng {BLOCKINESS_THRESHOLD} -> có dấu hiệu vỡ macroblock")
    if profile_flag:
        reasons.append(f"Codec profile = {info['profile']} -> có thể từng qua re-encode chất lượng thấp")
    if lap_median is not None and lap_median > 0 and lap_min < lap_median * 0.4:
        reasons.append(f"Một vài frame mờ bất thường so với phần còn lại (lap_min={lap_min:.1f} vs median={lap_median:.1f})")

    return {
        "path": path,
        "width": info["width"],
        "height": info["height"],
        "fps": info["fps"],
        "bitrate": info["bitrate"],
        "duration": info["duration"],
        "codec": info["codec"],
        "profile": info["profile"],
        "bpp": bpp,
        "bpp_tier": bpp_tier,
        "tier": tier,
        "resolution_ok": resolution_ok,
        "blockiness_flag": blockiness_flag,
        "block_median": block_median,
        "block_max": block_max,
        "profile_flag": profile_flag,
        "lap_median": lap_median,
        "lap_min": lap_min,
        "reasons": reasons,
    }
