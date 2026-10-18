# PLAN-improve - mora: sửa lỗi, tối giản, chuyển động, tính năng mới

Review ngày 2026-10-18. Trạng thái lúc review: 195 test pass, `tsc` sạch.
Code mora là Tauri v2 + React 18 + Zustand, chạy local, không mạng.

---

## 1. Lỗi logic tìm được

Xếp theo mức độ. (A) = nặng, người dùng thấy ngay. (B) = sai số liệu. (C) = nhỏ.

### Timer và session

1. **(A) Timer đếm bằng `setInterval` cộng 1 mỗi giây.** Khi cửa sổ bị ẩn
   hoặc máy ngủ, WebKit làm chậm interval, nên timer chạy chậm hơn đồng hồ
   thật. App sống ở tray (cửa sổ hay bị ẩn) nên lỗi này xảy ra thường xuyên.
   Sửa: lưu `runStartedAt` + `accumulatedSec`, thời gian = `now - runStartedAt`
   (giống quy tắc "timer là derived state" của logi).
2. **(A) Hết giờ không có chuông, không có thông báo.** `useSound()` (chime +
   notification) chỉ được dùng trong test, không có màn hình nào gọi nó.
3. **(A) Trên desktop, phím tắt toàn cục bị đăng ký lại mỗi giây.**
   `useOsSync` gọi `createOsBridge()` mỗi lần render, tạo object mới, nên
   effect `[bridge]` chạy lại mỗi tick (Room render lại mỗi giây).
4. **(B) Review "Keep working" làm mất thời gian đã tập trung.** Nó đặt
   `elapsedSec = 0` mà không ghi session nào.
5. **(B) Bấm checkbox một task trong Room khi timer đang chạy:** task đó
   thành done nhưng không ghi thời gian, và số giây đã chạy chuyển sang task
   kế tiếp. Đổi thứ tự task (▲▼) khi đang chạy cũng vậy.
6. **(B) Review "Mark done" không đóng sheet.** Sheet vẫn hiện, nếu hết task
   thì vẫn mời "Take a break" / "Focus again".
7. **(B) `phase` và `lastFocusSec` không được lưu.** Thoát app lúc đang nghỉ,
   mở lại thì thời gian nghỉ bị tính là thời gian focus.
8. **(B) Đổi duration trong Room (panel Settings) xoá tiến độ đang chạy**
   mà không hỏi (`setDuration` đặt `elapsedSec = 0`).
9. **(B) "Mark done" ngay lập tức ghi session 1 phút** (`Math.max(1, ...)`),
   tạo số liệu giả trong History.
10. **(B) `startedAt = endedAt - elapsed`** bỏ qua thời gian pause, nên giờ
    bắt đầu trong History sai.
11. **(C) Phím tắt Cmd+Shift+M khi đang ở Review** bật `isRunning`, timer
    focus chạy tiếp ngầm phía sau sheet.
12. **(C) `finishBreak` (chế độ thường) khi hết task** vẫn để
    `sessionActive = true`, Landing có thể hiện "Continue" cho task không còn.
13. **(C) `hydrate` tin `activeTaskId` đã lưu** dù task đó đã xoá hoặc done.
14. **(C) Bản web: reload khi đang chạy** lưu `isRunning = true`, Landing
    hiện sai trạng thái.

### Dữ liệu scene

15. **(B) Toàn bộ mô tả và âm thanh của scene bị mất.** `corners.ts` có
    `customProps` theo tên slug cũ, nhưng file scene giờ là `scene_887eec`,
    nên mọi scene đều là "Study scene from YouTube", ambient "Wind", cùng một
    gradient. `setCorner` cũng không còn tự chọn ambient theo scene. Có 2
    ambient không tồn tại ("Summer Night", "Forest Birds").

### Khác

16. **(B) Lưu file mỗi giây** (mỗi tick đổi store, debounce 300ms). Tốn ổ đĩa,
    nên chỉ lưu khi đổi trạng thái, cộng một lần mỗi ~15s khi đang chạy.
17. **(C) History "Clear" xoá hết không hỏi**, không xoá được từng dòng.
18. **(C) Tài liệu cũ:** `CLAUDE_CONTEXT.md` nói 24 scene và Pomodoro "chưa
    xong". Thực tế 12 scene, Pomodoro đã có 20 test pass.
19. **(C) `csp: null`** trong `tauri.conf.json`. App local nên rủi ro thấp,
    nhưng nên đặt CSP chặt.

---

## 2. Thiết kế: tối giản theo DESIGN.md

mora chưa nằm trong `ws/app/DESIGN.md`. Hiện tại mora dùng màu sage
`#748158`, amber cho break, font Hanken Grotesk, shadow, pill bo tròn. Tất cả
đều trái với look chung (chỉ đen trắng xám, font hệ thống, không shadow,
bo góc 6-10px, chữ làm nút).

Đề xuất:

- Token xám theo DESIGN.md, có Theme `system · light · dark`.
- Break phân biệt bằng **chữ** ("break") và độ đậm, không dùng amber.
- Font hệ thống, bỏ `@fontsource/hanken-grotesk`.
- Scene mode giữ nguyên: ảnh/video là nội dung, không phải màu UI. Chữ trên
  scene vẫn trắng trên kính tối.
- Nav dạng chữ: `start · focus · history`.
- Nút phụ là chữ: `done`, `stop`, `skip`. Một nút đậm duy nhất (Play).
- Bỏ ký tự ▲▼, dùng kéo thả (đã có ở màn Session) hoặc icon nét mảnh.
- Room.tsx có 1563 dòng, phần lớn là inline style. Tách thành
  `TimerCard`, `ReviewSheet`, `TaskPanel`, `RoomSettings` + CSS class. Cần
  làm trước khi thêm animation, nếu không rất khó sửa.
- Rút gọn luồng: hiện tại phải qua 3 bước (corner → sound → session) mỗi
  lần. Đề xuất Landing có ô "task" + nút Start, dùng lại corner/sound lần
  trước. 3 bước vẫn còn cho ai muốn đổi.

## 3. Chuyển động (mượt, yên tĩnh)

Quy tắc: 160-320ms, ease-out, chỉ dùng `opacity` + `transform` (không giật
layout). Tôn trọng `prefers-reduced-motion`. Không có gì nhấp nháy để gây chú ý.

- Chuyển màn hình: fade + trượt 8px.
- Đổi scene: cross-fade ảnh/video cũ sang mới (hiện tại đổi cái rụp).
- **Âm thanh fade** in/out ~600ms khi play, pause, đổi track (hiện tại cắt
  ngang). Đây là "chuyển động" người dùng nghe thấy rõ nhất.
- Review sheet và Settings: trượt lên + nền mờ dần.
- Danh sách task: thêm / xoá / done có animation chiều cao; đổi thứ tự dùng
  FLIP (các dòng trượt tới chỗ mới).
- Số timer: `tabular-nums` để số không nhảy ngang; chấm "thở" khi đang chạy.
- Đổi phase focus → break → focus: chữ và số cross-fade.
- Chrome lùi lại: khi timer chạy, nav và panel task mờ dần sau 4s không đụng
  chuột; di chuột là hiện lại (DESIGN.md quy tắc 7).
- Thư viện: dùng `motion` (bản mới của framer-motion) cho sheet, danh sách,
  layout. Phần còn lại CSS thuần.

## 4. Tính năng mới đề xuất

Ưu tiên cao (ít công, dùng hằng ngày):

1. **Phím tắt trong app:** `Space` play/pause, `Enter` done, `S` skip break,
   `Z` zen, `N` thêm task, `Esc` đóng sheet. Trang nhỏ liệt kê phím (`?`).
2. **Zen mode:** ẩn hết, chỉ còn số giờ và tên task, toàn màn hình.
3. **Ghi chú nhanh lúc focus** (distraction inbox): bấm một phím, gõ ý vừa
   nảy ra, quay lại làm. Hiện ra lúc nghỉ.
4. **Một dòng ghi chú khi hết session** ("đã làm được gì"), lưu cùng session.
5. **Nghỉ dài** sau mỗi 4 lần focus (Pomodoro chuẩn).
6. **Duration tuỳ chọn** (nhập số phút), ngoài 25/50/1.5h/2h.
7. **History tốt hơn:** xoá một dòng, có Undo; sửa tên/phút; xem theo tuần
   (cột xám theo ngày), tổng theo task, streak ngày.
8. **Mục tiêu ngày** (ví dụ 4h focus), hiện nhỏ, mờ: `2h 10m / 4h`.
9. **Xuất dữ liệu** JSON/CSV (backup).

Ưu tiên vừa:

10. **Ước lượng task** theo số pomodoro (`est 3 · done 2`).
11. **Trộn âm thanh:** bật nhiều ambient cùng lúc (mưa + lửa).
12. **Tray menu** hiện tên task, phase, và Skip break.

## 5. Liên kết với logi: có nên không?

**Có, đáng làm**, nhưng sau khi sửa lỗi.

Lý do: logi đo "giờ đi đâu" theo nhóm learn / work / fitness / leisure. Một
session focus trong mora chính là một khoảng "learn" hoặc "work". Hiện tại
muốn có số liệu trong logi thì phải bấm timer ở cả hai app.

Cách làm đề xuất:

- **mora:** mỗi task có nhóm `learn` hoặc `work` (mặc định `learn`). Khi một
  khối focus kết thúc, mora gửi lên logi:
  `{ id, category, label: tên task, startAt, endAt, source: 'mora' }`.
  Mỗi đoạn chạy giữa hai lần pause là một bản ghi, để giờ trong logi đúng.
- **Vẫn offline-first:** tắt mặc định, bật trong Settings (URL logi + token).
  Gửi qua một hàng đợi (outbox), mất mạng thì gửi lại sau. Dùng
  `tauri-plugin-http` để khỏi dính CORS.
- **logi:** thêm route `/api/ingest/mora`, xác thực bằng token
  `MORA_INGEST_TOKEN` (giống `WIDGET_TOKEN` của fina). Ghi bằng Admin SDK,
  doc id = `mora_<id>` nên gửi lại 2 lần không bị trùng. Cần tách
  `derive` / `validateTimes` khỏi `src/lib/activities.ts` (file đó import
  firebase-client) sang file thuần để server dùng được.
- **Sau này (tuỳ chọn):** mora đọc target tuần của logi và hiện một dòng mờ:
  `learn 12h / 31h this week`.

Không nên: đồng bộ hai chiều task, hay bắt mora đăng nhập Google. Phức tạp,
phá tính chất local của mora.

---

## 6. Các phase

| Phase | Nội dung | Kiểm chứng |
|---|---|---|
| **M0** | Sửa lỗi 1-17 + test cho từng lỗi | `npm test`, `npm run build`, thử tay trên web |
| **M1** | Token xám + theme + font hệ thống; tách Room thành component + CSS | Light/dark, Color/Scene đều đúng; test cũ xanh |
| **M2** | Chuyển động + audio fade + chrome lùi lại | Xem trên web; reduced-motion tắt hết |
| **M3** | Tính năng 1-9 + quick start | Test mới cho từng tính năng |
| **M4** | Liên kết logi (mora outbox + route logi) | Session mora hiện trong logi History |
| **M5** | Dọn dẹp: docs, CSP, code chết, kiểm tra `npm run tauri dev` | App desktop chạy, phím tắt, tray, âm thanh |

---

## 7. Quyết định của owner (2026-10-18)

- Màu: chuyển sang look xám chung (DESIGN.md). Ảnh scene giữ nguyên.
- logi: làm, sau phần sửa lỗi (M4).
- Tính năng: cả 4 nhóm (phím tắt + zen, ghi chú nhanh, History tốt hơn,
  Pomodoro đầy đủ).
- Cách làm: từng phase, xong phase nào báo và hỏi lại rồi mới làm tiếp.

## 8. Tiến độ

- [x] M0 sửa lỗi (2026-10-18, 218 test pass; lỗi 18 docs và 19 CSP để M5)
- [ ] M1 thiết kế xám + tách Room
- [ ] M2 chuyển động
- [ ] M3 tính năng
- [ ] M4 liên kết logi
- [ ] M5 dọn dẹp

---

## 9. Dọn dẹp và refactor (owner yêu cầu thêm, 2026-10-18)

### Đã làm

- Xoá code chết: hook `useSound`, method widget cũ, event STOP, action
  không ai gọi, lệnh Rust `greet`, plugin `opener`, 5 script scene cũ.
- Bỏ tính năng thừa (owner chọn): màn Landing, wizard 3 bước
  (Corner/Sound/Session + Stepper), nút Color/Scene trên nav, nút Shuffle,
  pill trạng thái + nhãn + dòng scene trên timer, scene nền ngoài Room,
  cờ `audioActive`. Room là màn chính, bấm Play là bắt đầu phiên.
- Giữ lại: Hide Tasks, upload nhạc riêng, Count Up, Auto-continue.

### Hướng refactor (owner chọn)

Mục tiêu: tối giản, sau này chạy được trên điện thoại (PWA) và desktop
(Tauri) từ một code. Học từ hodi/legi.

- **Stack:** giữ Vite + React + Zustand, thêm Tailwind v4. Bỏ inline style.
- **Token:** đúng DESIGN.md (xám), theme `system · light · dark`, đặt bằng
  script trong `<head>` trước lần vẽ đầu. Font hệ thống.
- **Cấu trúc thư mục:**
  - `src/core/` logic thuần (timer, pomodoro, format).
  - `src/platform/` mọi thứ đụng tới thiết bị (lưu trữ, âm thanh,
    thông báo, tray/phím tắt, theme). Web và Tauri khác nhau chỉ ở đây.
  - `src/ui/` component. `src/store/` Zustand.
- **Màn hình:** nav chữ `focus · history · settings` (như hodi TopBar), mờ
  đi khi timer chạy.
  - Focus: một cột hẹp. Tên task, số giờ lớn, chọn duration bằng chữ,
    một nút Play đậm, `done` / `stop` / `skip` là chữ. Danh sách task dạng
    dòng trơn, nút sửa hiện khi rê chuột. Chữ `sound` mở sheet chọn âm
    thanh và scene.
  - History: nhóm theo ngày, meta nhỏ.
  - Settings: theme, nền color/scene, auto-continue, xoá lịch sử.
- **Sheet** như legi (trượt lên trên điện thoại, panel giữa trên máy tính).
- **Dữ liệu:** local trên mỗi thiết bị. Lớp lưu trữ tách riêng để sau này
  thêm sync (Firebase) mà không sửa UI.

### Phase mới (thay M1-M3 cũ)

| Phase | Nội dung |
|---|---|
| **R1** | Tailwind + token + theme, tách `core/platform/ui`, viết lại 3 màn hình |
| **R2** | Chuyển động (cũ M2) |
| **R3** | PWA: manifest, service worker, icon, kiểm tra trên iPhone |
| **M3** | Tính năng (phím tắt, zen, ghi chú, history tốt hơn, pomodoro) |
| **M4** | Liên kết logi |
| **M5** | Dọn dẹp cuối, docs, CSP, thử `tauri dev` |

### Cập nhật 2026-10-18 (tối)

- Owner: hodi/legi chỉ để tham khảo cách tối giản, mora phải có cá tính
  riêng. Chọn hướng **"Đồng hồ là màn hình"**: không có nav chữ, đồng hồ
  lớn ở giữa với vòng tiến độ mảnh; task, âm thanh + scene, history,
  settings đều là sheet nổi lên trên đồng hồ; thanh icon dưới cùng tự mờ
  khi đang tập trung. "Hide tasks" không còn cần: task nằm trong sheet,
  mặc định đóng.
- **R1 xong:** Tailwind v4 + token xám + theme, tách `core/platform/ui`,
  giao diện mới, 164 test pass. Docs gộp vào `context.md`
  (`CLAUDE_CONTEXT.md` đã xoá).
- Tiếp theo: **R2** chuyển động (cross-fade scene, fade âm thanh, sheet,
  danh sách task), rồi **R3** PWA.
