# PLAN-media - mora: scene và âm thanh trên cloud, tự upload

Viết ngày 2026-10-18. Phụ thuộc: đăng nhập + sync (PLAN-sync S1, S2) đã xong.

## Vì sao

- `public/scenes` (91MB) và `public/audio` (101MB) nằm trong repo: deploy
  chậm, repo nặng, bản Tauri cũng nặng theo.
- Owner muốn tự thêm scene đẹp hơn, xoá scene mình thêm, nhưng **không xoá
  được scene mặc định**.

## Thiết kế

### Lưu ở đâu

| Loại | Nơi lưu | Ai ghi | Ai xoá |
|---|---|---|---|
| Scene/âm thanh mặc định | Firebase Storage `defaults/scenes/*`, `defaults/audio/*` | chỉ mình (bằng script, Admin) | không ai từ app |
| Scene owner upload | Storage `users/{uid}/scenes/{id}.mp4` + `.jpg` | owner | owner |
| Danh sách scene | Firestore `defaults` (đọc chung) + `users/{uid}/scenes/{id}` (tên, đường dẫn, hướng, ngày) | | |

- Storage rules: `defaults/**` chỉ đọc; `users/{uid}/**` chỉ owner đọc/ghi,
  file video tối đa ~40MB, ảnh tối đa ~2MB, đúng kiểu `video/mp4`,
  `image/jpeg`.
- Scene mặc định: app không có nút xoá. Thay vào đó có **"ẩn"** (lưu trong
  prefs, sync giữa các máy, bỏ ẩn được), để dọn danh sách mà không mất gì.

### Upload trong app

- Sheet Sound & scene → "add a scene": chọn file mp4 (từ Pexels, ...).
- App tự chụp một khung hình làm ảnh thumbnail (canvas), tự đoán hướng
  ngang/dọc, hỏi tên. Có thanh tiến độ khi upload, upload lại được khi
  rớt mạng (resumable upload của Firebase).
- Script `find_loop_scene.py` vẫn dùng để cắt đoạn lặp trước khi upload.

### Phát lại nhẹ và offline

- Lần đầu xem một scene: tải nguyên file một lần, lưu vào bộ nhớ máy
  (IndexedDB/Cache), lần sau phát từ máy, không tốn mạng, chạy offline.
  Có giới hạn dung lượng (ví dụ 500MB), scene lâu không dùng bị xoá khỏi
  máy trước.
- Ảnh thumbnail luôn được cache.

### Ngang hay dọc

- Nguồn: **video ngang 16:9, tốt nhất 4K**, chủ thể nằm giữa khung.
- Lúc xuất (script) tạo **2 bản**: ngang 1920x1080 cho laptop/PC, và **dọc
  1080x1920 cắt từ giữa** cho điện thoại. App chọn bản theo hướng màn hình.
  Từ nguồn 4K, bản dọc vẫn nét (cắt ra được 1215x2160).
- Video chỉ có bản dọc vẫn dùng được: trên máy tính sẽ hiện nền mờ hai bên.

### Bản Tauri

- Không đăng nhập được, nên chỉ thấy scene mặc định (Storage đọc công
  khai) và cache offline. Scene tự upload chỉ có trên web/PWA.

## Chi phí

Một người dùng: vài GB lưu trữ và lượng tải nhỏ, nằm trong hạn mức miễn phí
của Storage. Nhờ cache trên máy, mỗi scene chỉ tải một lần trên mỗi thiết bị.

## Phase

| Phase | Nội dung |
|---|---|
| **V1** | Script upload scene mặc định lên Storage + Firestore `defaults`; app đọc danh sách từ đó; bỏ `public/scenes` khỏi repo |
| **V2** | Cache scene trên máy (phát offline, giới hạn dung lượng) |
| **V3** | Upload/xoá scene của owner, ẩn scene mặc định |
| **V4** | Bản dọc cho điện thoại (script xuất 2 bản, app chọn theo hướng) |
| **V5** | Làm tương tự cho âm thanh (nếu owner muốn) |

## Quyết định của owner (2026-10-18)

- Làm media **trước** S3 (timer đồng bộ).
- Âm thanh cũng chuyển lên Firebase, làm **sau** scene (V5).
- **Tự cắt bản dọc** cho điện thoại (V4).
