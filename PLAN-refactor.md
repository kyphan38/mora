# PLAN-refactor (mora)

Mục tiêu: chia `src/store/useStore.ts` (874 dòng, một store chứa mọi thứ) thành nhiều phần nhỏ theo tính năng. Đưa logic thuần sang `core/`. Sửa chiều phụ thuộc giữa `platform/` và `store/`.

Không đổi tính năng. Không đổi giao diện. API `useStore` giữ nguyên, nên UI và test không phải sửa.

## Nguyên tắc chung

- Mỗi phase là một commit. Hỏi owner trước khi bắt đầu phase mới.
- Trước và sau mỗi phase: `npm test` (41 file test) và `npm run test:emu`. Số test pass phải giống nhau.
- Chỉ di chuyển code. Không đổi logic, tên action, tên field.
- File mới nên dưới khoảng 300 dòng.
- Giữ nguyên clock-first UI. Không copy cách làm của hodi/legi.

## Hiện trạng

Cấu trúc mora đã tốt nhất trong 8 app: `core/` (logic thuần), `platform/` (trình duyệt, Firebase, audio), `store/`, `ui/`, `hooks/`.

Vấn đề:
1. `useStore.ts` gộp 6 nhóm việc:
   - Âm thanh: ambient, music, idle track, volume, custom track, muted.
   - Task + note: add/remove/restore/reorder/toggle task, pick/start task, note, noteToTask, resetDay.
   - Phiên tập trung (pomodoro): startFocus, tickSession, syncClock, togglePlay, enterReview, startBreak, finishBreak, focusAgain, stopAll, autoContinue, duration.
   - Lịch sử: sessions, buildSession, update/remove/restore session, daily goal.
   - Scene + giao diện: screen, corner, scene, hidden scenes, room background.
   - Liên kết: logi link, logi routine, logi status, live timer (applyLive, leadLive), applyRemote, hydrate.
2. Nhiều action chứa logic tính toán (ví dụ `tickSession`, `enterReview`, `completeActive`) nằm trong store, khó test riêng.
3. `platform/persist.ts` và `hooks/useCloudSync.ts` import `useStore`. Nghĩa là tầng platform phụ thuộc store (chiều ngược).
4. `platform/persistence.ts` tự khai báo lại `LogiLink` và `Phase` thay vì import.

## Phase 1: chia store thành slice

Dùng cách "slice" của zustand: mỗi slice là một hàm trả về một phần state + action, `useStore` ghép lại.

```
src/store/
  useStore.ts          # create<AppStore>()((...a) => ({ ...soundSlice(...a), ... }))
  types.ts             # AppStore = SoundSlice & TaskSlice & ...
  slices/
    sound.ts
    tasks.ts           # task + note
    session.ts         # pomodoro runtime
    history.ts         # sessions + daily goal
    scenes.ts          # screen, corner, scene, room background
    link.ts            # logi, live, applyRemote
  hydrate.ts           # hydrate() đụng nhiều slice nên để riêng
```

Thứ tự: `sound` và `scenes` (độc lập, dễ nhất), `history`, `tasks`, `session`, `link`. Mỗi slice một commit.

Chú ý: một số action gọi qua slice khác (ví dụ `completeActive` sửa task và thêm session; `tellLogi` theo dõi task thay đổi). Các action này dùng `get()` của store chung, không import slice khác trực tiếp.

Xong khi: `useStore.ts` dưới 80 dòng, không slice nào trên 300 dòng.

## Phase 2: đưa logic thuần sang `core/`

1. Chuyển các hàm tính toán ra khỏi action:
   - `buildSession`, `MIN_LOG_SEC`, quy tắc ghi phiên ngắn → `core/session.ts`.
   - Phần tính của `tickSession` và `syncClock` (thời gian còn lại, khi nào hết phiên) → `core/sessionTimer.ts` (đã có, bổ sung).
   - Quy tắc chuyển pha focus / review / break / long break → `core/pomodoro.ts` (đã có, bổ sung).
   - So sánh task trước/sau để báo logi (`tellLogi`) → `core/logiTasks.ts`.
2. Action trong slice chỉ gọi hàm core rồi `set(...)`.
3. Thêm unit test cho các hàm core mới (không cần render UI).

## Phase 3: sửa chiều phụ thuộc

Quy tắc: `core` không import gì của app. `platform` không import `store`. `store` và `hooks` được import cả hai.

1. Chuyển phần "nối store với lưu trữ" của `platform/persist.ts` sang `store/persist.ts`. `platform/persistence.ts` chỉ còn adapter + migrate (thuần).
2. `persistence.ts`: import `LogiLink`, `Phase` từ `types/` thay vì khai báo lại.
3. Kiểm tra các file `platform/` khác: `grep -n "store/useStore" src/platform`. Mỗi chỗ thì chuyển phần dùng store lên `hooks/`.
4. (Tuỳ chọn) Thêm luật eslint `no-restricted-imports` để chặn `platform/` import `store/`.

## Phase 4 (tuỳ chọn)

`ui/TaskList.tsx` (408 dòng): chỉ tách nếu sắp thêm tính năng cho danh sách task. Ví dụ tách phần kéo thả thành hook `useTaskReorder`.

## Rủi ro

- Persist chỉ lưu một số key (`toPersisted`). Khi chia slice, không đổi tên key, nếu không dữ liệu cũ của người dùng sẽ mất. Có test persistence, chạy kỹ sau mỗi bước.
- Live sync với logi chạy theo thời gian thực. Sau Phase 1 và 3, thử bằng tay: start trong mora, stop ở logi và ngược lại.
