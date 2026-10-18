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

## Tiến độ (dừng 2026-10-18, owner sắp hết quota)

- Đã có: `storage.rules.template` (defaults chỉ đọc công khai, users/{uid}
  chỉ owner, giới hạn kiểu và kích thước), `npm run rules` sinh cả
  `storage.rules`. **Chưa deploy** vì Storage chưa bật.
- Owner cần: Firebase Console → Storage → Get started → Production mode →
  asia-southeast1.
- Lần sau bắt đầu từ V1: deploy storage rules, upload defaults bằng gsutil
  (gcloud trên máy đã có quyền với project), đặt CORS cho bucket, đổi app
  sang đọc URL từ Storage, bỏ `public/scenes` khỏi repo.

- **V1 xong (2026-10-18):** Storage rules đã deploy; 8 scene (16 file,
  91MB) lên `defaults/scenes/` bằng `scripts/upload-defaults.sh`; CORS
  cho bucket; app đọc URL từ Storage; `public/scenes` rời khỏi repo,
  file gốc giữ ở `media/scenes/` (ngoài git); danh sách chuyển sang
  `src/data/scenes.json`. Script cắt scene giờ xuất vào `media/scenes/`.
- **V2 xong (2026-10-18):** `platform/mediaCache.ts` + `useCachedMedia`:
  lần đầu phát từ mạng và lưu bản sao nền vào Cache Storage
  (`mora-media-v1`), lần sau phát từ máy (chạy offline). Tối đa 500MB, bỏ
  file lâu không dùng trước. Đã thử với file thật trên Storage.
- **V3 xong (2026-10-18):** "add a scene" trong sheet Sound & scene (chỉ
  web/PWA đã đăng nhập): chọn mp4 ≤60MB, đặt tên, app tự chụp thumbnail,
  upload có tiến độ và nút huỷ, file ở `users/{uid}/scenes/`, danh sách ở
  Firestore `users/{uid}/scenes` (sync mọi máy). Scene của mình có "delete"
  (bấm 2 lần); scene mặc định chỉ có "hide", "N hidden · show" để hiện lại
  (danh sách ẩn sync trong prefs). Rules Firestore + Storage đã deploy.
  Thử thật bằng emulator trong trình duyệt: upload, thumbnail, tiến độ,
  xoá. Test emulator: 11 (thêm 4 cho Storage, cổng 9399).
- **V4 xong (2026-10-18):** `scripts/make-portrait.sh` cắt phần giữa thành
  9:16 (không phóng to quá nguồn, tối đa 1920 cao), kèm ảnh. 8 scene mặc
  định đã có bản dọc (1-3MB, nhẹ hơn nhiều bản ngang) trên Storage, cờ
  `"portrait": true` trong `src/data/scenes.json`. App chọn bản dọc khi
  màn hình dọc (`usePortrait`), đổi khi xoay máy. `find_loop_scene.py` (file
  local) tự tạo bản dọc. Scene tự upload vẫn dùng một bản.
