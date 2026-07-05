#!/usr/bin/env python3
import os
import glob
import shutil
import subprocess

# Cấu hình đường dẫn hệ thống của bạn
BASE_DIR = "/Users/kyphan/ws/mora"
SCENES_DIR = os.path.join(BASE_DIR, "public/scenes")
REVIEW_DIR = os.path.join(BASE_DIR, "review")

BEFORE_DIR = os.path.join(REVIEW_DIR, "before")
AFTER_DIR = os.path.join(REVIEW_DIR, "after")
COMPARE_DIR = os.path.join(REVIEW_DIR, "side_by_side")

# Tọa độ vùng Logo bạn muốn test thử (Mặc định: Góc dưới bên phải)
LOGO_ZONE = {"x": 1650, "y": 950, "w": 220, "h": 80}

def init_folders():
    """Tạo cấu trúc thư mục review sạch sẽ mỗi lần chạy"""
    if os.path.exists(REVIEW_DIR):
        shutil.rmtree(REVIEW_DIR)
    os.makedirs(BEFORE_DIR, exist_ok=True)
    os.makedirs(AFTER_DIR, exist_ok=True)
    os.makedirs(COMPARE_DIR, exist_ok=True)

def main():
    init_folders()
    
    # Lấy toàn bộ file mp4 trong thư mục gốc (bỏ qua các file temp nếu có)
    mp4_files = [f for f in glob.glob(os.path.join(SCENES_DIR, "*.mp4")) if not os.path.basename(f).startswith("temp_")]
    
    if not mp4_files:
        print("[INFO] Không tìm thấy file .mp4 nào trong public/scenes/")
        return

    print("=" * 60)
    print(f"   Bắt đầu xử lý tự động {len(mp4_files)} files để Review")
    print("=" * 60)

    x, y, w, h = LOGO_ZONE["x"], LOGO_ZONE["y"], LOGO_ZONE["w"], LOGO_ZONE["h"]

    for index, src_path in enumerate(mp4_files, 1):
        filename = os.path.basename(src_path)
        print(f"[{index}/{len(mp4_files)}] Đang xử lý: {filename}")

        before_path = os.path.join(BEFORE_DIR, filename)
        after_path = os.path.join(AFTER_DIR, filename)
        compare_path = os.path.join(COMPARE_DIR, filename)

        # 1. Copy file gốc sang thư mục 'before' (Không động vào file gốc ở public/scenes)
        shutil.copy2(src_path, before_path)

        # 2. Xử lý xóa logo lưu sang thư mục 'after' (Giữ nguyên chất lượng với CRF 18)
        delogo_filter = f"delogo=x={x}:y={y}:w={w}:h={h}"
        cmd_after = [
            "ffmpeg", "-y", "-i", src_path,
            "-vf", delogo_filter,
            "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-an",
            after_path
        ]
        subprocess.run(cmd_after, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 3. Kỹ thuật nâng cao: Ghép hstack (Side-by-Side) để review trực quan
        # Thêm text overlay 'BEFORE' và 'AFTER' lên video để dễ nhìn
        compare_filter = (
            f"[0:v]drawtext=text='BEFORE':x=20:y=20:fontsize=40:fontcolor=white:box=1:boxcolor=black@0.5[v1];"
            f"[1:v]{delogo_filter},drawtext=text='AFTER':x=20:y=20:fontsize=40:fontcolor=white:box=1:boxcolor=black@0.5[v2];"
            f"[v1][v2]hstack=inputs=2"
        )
        cmd_compare = [
            "ffmpeg", "-y",
            "-i", src_path,
            "-i", src_path,
            "-filter_complex", compare_filter,
            "-c:v", "libx264", "-crf", "22", "-preset", "fast", "-an",
            compare_path
        ]
        subprocess.run(cmd_compare, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("\n" + "=" * 60)
    print("🎉 ĐÃ HOÀN THÀNH TỰ ĐỘNG XỬ LÝ REVIEW!")
    print(f"-> Thư mục gốc AN TOÀN TUYỆT ĐỐI tại: public/scenes/")
    print(f"-> File gốc dự phòng: review/before/")
    print(f"-> File xóa logo thử nghiệm: review/after/")
    print(f"🔥 Xem so sánh trực quan (Trái/Phải) tại: review/side_by_side/")
    print("=" * 60)

if __name__ == "__main__":
    main()