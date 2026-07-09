#!/usr/bin/env python3
"""Quét toàn bộ public/scenes/*.mp4, chấm điểm chất lượng encode bằng video_quality.py
và in bảng xếp hạng xấu-trước để biết file nào cần tải lại từ nguồn tốt hơn."""
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import video_quality as vq

SCENES_DIR = "/Users/kyphan/ws/mora/public/scenes"

SEVERITY = {"danger": 0, "borderline": 1, "ok": 2, "safe": 3}


def human_size(path):
    size = os.path.getsize(path)
    return f"{size / (1024 * 1024):.1f}M"


def main():
    mp4_files = sorted(
        f for f in glob.glob(os.path.join(SCENES_DIR, "*.mp4"))
        if not os.path.basename(f).startswith("temp_")
    )

    if not mp4_files:
        print(f"[INFO] Không tìm thấy file .mp4 nào trong {SCENES_DIR}")
        return

    print("=" * 100)
    print(f"   Đang chấm điểm chất lượng {len(mp4_files)} file trong public/scenes/")
    print("=" * 100)

    results = []
    for i, path in enumerate(mp4_files, 1):
        filename = os.path.basename(path)
        print(f"[{i}/{len(mp4_files)}] Đang phân tích: {filename}...")
        try:
            r = vq.analyze(path)
        except Exception as e:
            print(f"   [ERROR] Không phân tích được {filename}: {e}")
            continue
        results.append(r)

    # Xấu trước: theo tier severity, rồi theo BPP tăng dần (BPP thấp = càng nghi ngờ)
    results.sort(key=lambda r: (SEVERITY[r["tier"]], r["bpp"]))

    print("\n" + "=" * 100)
    print(f"{'FILE':<32}{'SIZE':>8}{'RES':>12}{'BPP':>9}{'TIER':>12}{'BLOCK':>8}  LÝ DO")
    print("-" * 100)
    for r in results:
        filename = os.path.basename(r["path"])
        size = human_size(r["path"])
        res = f"{r['width']}x{r['height']}"
        block = f"{r['block_median']:.2f}" if r["block_median"] is not None else "-"
        reasons = "; ".join(r["reasons"])
        print(f"{filename:<32}{size:>8}{res:>12}{r['bpp']:>9.4f}{vq.TIER_SHORT[r['tier']]:>12}{block:>8}  {reasons}")

    print("=" * 100)
    bad = [r for r in results if r["tier"] in ("danger", "borderline")]
    if bad:
        print(f"\n[ALERT] {len(bad)} file có dấu hiệu chất lượng kém (nén quá tay / vỡ block):")
        for r in bad:
            print(f"  - {os.path.basename(r['path'])} ({human_size(r['path'])}, {r['width']}x{r['height']})")
        print("\n💡 Lưu ý: bộ tiêu chí này bắt lỗi 'nén quá tay so với độ phân giải' (BPP thấp)")
        print("   và 'vỡ macroblock'. Nó KHÔNG bắt được trường hợp nguồn gốc chỉ là 1080p")
        print("   bị scale/crop ép lên 1440p rồi encode CRF thấp (bitrate vẫn cao, ảnh vẫn mờ")
        print("   vì không có chi tiết thật để mã hoá) — muốn bắt case đó phải so sánh với")
        print("   độ phân giải gốc trên YouTube (yt-dlp -F <url>).")
    else:
        print("\n[OK] Không có file nào bị flag theo tiêu chí BPP/blockiness/profile.")
    print("=" * 100)


if __name__ == "__main__":
    main()
