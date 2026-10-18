# PLAN-motion - mora: chuyển động và tương tác

Viết ngày 2026-10-18 để giao cho một AI khác làm. Owner đã đồng ý P1-P4.

## Prompt để dán cho AI làm

```
Work in /Users/kyphan/ws/app/mora. Read ws/app/AGENTS.md, ws/app/DESIGN.md,
mora/context.md and mora/PLAN-motion.md first. Implement only phase <P1>
from PLAN-motion.md, exactly as written. Follow "Quy tắc cho mọi phase",
"CSS dùng chung" and "Lỗi hay gặp". Run every command in "Kiểm tra mỗi
phase" and fix all failures. Then update context.md (Motion section) and
the "Tiến độ" list, commit only the files you changed on main (no
Co-Authored-By), push, and stop. Tell me in Vietnamese, in short simple
sentences, what changed and how to try it. Do not start the next phase.
```

Đổi `<P1>` thành phase muốn làm. Mỗi lần chỉ một phase.

## Đọc trước khi làm

1. `ws/app/AGENTS.md`: không em dash (U+2014), code và comment bằng tiếng
   Anh, chữ trên UI càng ít càng tốt, không ghi `Co-Authored-By`.
2. `ws/app/DESIGN.md`: chỉ màu xám, không hue, không emoji, font hệ thống.
3. `mora/context.md`: bố cục code, phần **Motion** và **UI**.
4. mora có bản sắc riêng: "đồng hồ là màn hình". Không chép layout của
   hodi/legi. Cái mới là tương tác trên đồng hồ hoặc là một `Sheet`.

## Hệ thống chuyển động hiện có (dùng lại, đừng làm cái mới song song)

- Keyframes trong `src/styles/globals.css`: `fade-in`, `fade-out`,
  `sheet-up`, `sheet-down`, `rise`, `pop`, `row-out`, `scene-in`, `drift`,
  `breathe`. Easing chung: `var(--ease-soft)` = `cubic-bezier(0.22, 1, 0.36, 1)`.
- Cuối file có khối `@media (prefers-reduced-motion: reduce)` ép mọi
  animation/transition còn 1ms. Hiệu ứng mới bằng CSS tự được tắt.
- `reducedMotion()` trong `src/hooks/usePresence.ts`: dùng cho mọi độ trễ
  hoặc animation bằng JS (`el.animate`, `setTimeout` chờ hiệu ứng). Khi
  `matchMedia` không có (môi trường test jsdom) nó trả `true`, nên test
  mặc định chạy không có hiệu ứng. Muốn test hiệu ứng thì stub như
  `src/test/motion.test.tsx` (`stubMotion(false)` + fake timers).
- `usePresence` (giữ component thêm vài trăm ms để chạy hiệu ứng thoát),
  `useFlip` (FLIP khi danh sách đổi thứ tự).
- Chỉ animate `opacity` và `transform` (và `stroke-dashoffset`, `r` trong
  SVG). Không animate `width`, `height`, `top`, `left`, `filter` lớn.

## Quy tắc cho mọi phase

- Mỗi cử chỉ phải có cách thay thế: bàn phím, hoặc nút/chữ có sẵn.
- Reduced motion: hiệu ứng tắt, thao tác vẫn chạy (ví dụ giữ để dừng vẫn
  phải giữ, nhưng không có vạch chạy thì hiện chữ thay thế, xem P1).
- Rung: `navigator.vibrate?.(ms)`. Chỉ Android có; iPhone bỏ qua là đúng.
  Không thêm thư viện.
- Không thêm dependency mới (không framer-motion, không gesture lib).
  Pointer Events + CSS là đủ.
- Không đổi logic timer, sync, live logi. Chỉ đổi UI. Nếu cần hàm store
  mới thì viết test cho nó.
- Chữ trên UI: tiếng Anh, chữ thường, rất ngắn (ví dụ `hold`).
- Mỗi phase xong: cập nhật phần **Motion** trong `context.md`, ghi một
  dòng vào "Tiến độ" cuối file này, rồi **hỏi owner trước khi làm phase
  tiếp theo**.

## Kiểm tra mỗi phase

```bash
cd ws/app/mora
npx tsc --noEmit -p .
npx vitest run
npm run build
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emu
```

- Thử thật trên trình duyệt: `npm run dev` (port 1420), cần đăng nhập
  Google. Kiểm tra cả màn hẹp 375px (giả lập điện thoại, touch) và màn rộng,
  cả light và dark, cả có scene và không scene.
- Commit: chỉ add đúng đường dẫn đã sửa (`git add <file> ...`, không
  `git add -A`), kiểm tra `git branch --show-current` là `main` trước khi
  commit (có phiên AI khác có thể đổi branch). Message dạng
  `feat(motion): ...`. Không co-author. Push lên `main` thì Vercel tự deploy.

## Chỗ sửa chính (vị trí ngày 2026-10-18, có thể lệch vài dòng)

| Chỗ | File | Ghi chú |
|---|---|---|
| Trạng thái chờ `idle` | `src/ui/FocusView.tsx:54` | điều kiện bật kéo vòng (P1.1) |
| `<Ring progress=...>` | `src/ui/FocusView.tsx:118` | thêm `adjust`, `settle`, `breath`, `lastMinute` |
| Số lớn ở giữa | `src/ui/FocusView.tsx:131-132` | thay bằng `RollingDigits` (P3.2) |
| `<DurationPicker />` | `src/ui/FocusView.tsx:145` | giữ nguyên |
| Nút `stop` | `src/ui/FocusView.tsx:183-190` | thay bằng `HoldButton` (P1.2) |
| Phím tắt | `src/ui/FocusView.tsx:92` | thêm `[` `]` (P4.1) |
| Vòng tròn | `src/ui/Ring.tsx` | toàn bộ 30 dòng, SVG viewBox 100, `R = 47` |
| Sheet | `src/ui/Sheet.tsx` | P2.1 |
| Danh sách task | `src/ui/TaskList.tsx` | P2.2, P4.3 |
| Scene nền | `src/ui/SceneLayer.tsx`, dùng ở `src/App.tsx:44` | P3.3, P4.1 |
| Keyframes | `src/styles/globals.css` (khối "Motion", trước `@media (prefers-reduced-motion)`) | thêm CSS bên dưới |

Props mới của `Ring` (gom lại, thêm dần theo phase):

```ts
type RingProps = {
  progress: number;                 // có sẵn
  adjust?: { minutes: number; onChange: (m: number) => void }; // P1.1
  settleKey?: number;               // P2.3: tăng 1 mỗi lần xong block
  breath?: boolean;                 // P3.1: true trong giờ nghỉ
  lastMinute?: boolean;             // P4.2
  children: ReactNode;
};
```

## CSS dùng chung (thêm vào `globals.css`, khối Motion)

Đặt các khối này **trước** `@media (prefers-reduced-motion: reduce)`.

```css
/* P2.2: a line drawn across a finished task. */
.strike {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 180ms ease-in;
}
.strike[data-on='true'] {
  transform: scaleX(1);
  transform-origin: left;
  transition: transform 260ms var(--ease-soft);
}
.strike[data-instant='true'] {
  transition: none;
}

/* P2.3: the ring settles when a block ends. */
@keyframes ring-settle {
  0% { transform: scale(1); }
  35% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
.ring-settle {
  animation: ring-settle 600ms var(--ease-soft) both;
}
@keyframes ring-ripple {
  from { transform: scale(1); opacity: 0.5; }
  to { transform: scale(1.12); opacity: 0; }
}
.ring-ripple {
  animation: ring-ripple 900ms ease-out both;
  pointer-events: none;
}

/* P3.1: breathe in 4s, out 6s. */
@keyframes breath {
  0%, 100% { transform: scale(0.82); }
  40% { transform: scale(1); }
}
.breath {
  animation: breath 10s ease-in-out infinite;
  will-change: transform;
}

/* P3.2: one digit rolls up when it changes. */
@keyframes digit-out {
  to { transform: translateY(-40%); opacity: 0; }
}
@keyframes digit-in {
  from { transform: translateY(40%); opacity: 0; }
}
.digit-out {
  animation: digit-out 280ms var(--ease-soft) both;
}
.digit-in {
  animation: digit-in 280ms var(--ease-soft) both;
}
```

Thêm vào **bên trong** khối `@media (prefers-reduced-motion: reduce)`:

```css
  .breath {
    display: none;
  }
```

## Lỗi hay gặp (đọc kỹ)

1. **Test chạy không có hiệu ứng.** Trong jsdom không có `matchMedia`, nên
   `reducedMotion()` trả `true`. Test về thời gian (giữ 800ms) phải dùng
   `vi.useFakeTimers()` và `act(() => vi.advanceTimersByTime(800))`. Test
   hiệu ứng thì stub `matchMedia` như `src/test/motion.test.tsx`.
2. **jsdom không có Pointer Events đầy đủ.** `fireEvent.pointerDown` có
   thể thiếu `clientX/clientY`, `button`, `pointerId`. Truyền rõ:
   `fireEvent.pointerDown(el, { clientX, clientY, button: 0, pointerId: 1 })`.
   `getBoundingClientRect` trả toàn số 0: mock nó trên phần tử
   (`el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, ... })`).
   `setPointerCapture` không có: gọi kiểu `el.setPointerCapture?.(id)`.
3. **`navigator.vibrate` không có trên iPhone và jsdom.** Luôn gọi
   `navigator.vibrate?.(n)`.
4. **iPhone cuộn trang khi kéo.** Phần tử kéo được phải có
   `touch-action: none` (`touch-none`). Thiếu cái này thì kéo vòng và vuốt
   sheet đều hỏng trên PWA.
5. **Chữ số nhảy ngang.** Giữ class `digits` (tabular-nums) trên mọi ô số.
6. **Không setState mỗi frame** (parallax, kéo). Ghi `style.transform` qua
   `ref`. Với kéo vòng thì setState mỗi bước 5 phút là được (ít lần).
7. **Không đổi `transition` của cung khi đồng hồ chạy.** Cung đang có
   `duration-1000 ease-linear` để chạy đều theo giây. Chỉ tắt nó lúc đang
   kéo (P1.1).
8. **Phím tắt toàn cục.** `useShortcuts` nghe `keydown` trên `window`. Phím
   trên slider (mũi tên) phải `stopPropagation` và `preventDefault`. Phím
   `Space` vẫn là Play/Pause, đừng lấy nó cho slider.
9. **ReviewSheet không có `onClose`** và không được vuốt đóng (P2.1).
10. **Chữ trên UI:** chỉ được thêm `hold`, `holding…`, `done`, `delete`,
    `deleted · undo` như trong plan. Không thêm hướng dẫn, không tooltip dài.
11. **Không em dash.** Kiểm tra trước khi commit:
    `grep -rn $'\xe2\x80\x94' src PLAN-motion.md context.md` (zsh) phải rỗng.
12. **E2E/emulator test không liên quan UI** nhưng vẫn phải chạy và qua.

---

## P1 - Đồng hồ: kéo để chọn thời gian, giữ để dừng

### P1.1 Kéo trên vòng tròn để chọn thời gian

File: `src/ui/Ring.tsx`, `src/ui/FocusView.tsx`.

Khi nào bật: chỉ khi đồng hồ đang chờ (`idle` trong FocusView:
`phase === 'focus' && !isRunning && elapsedSec === 0`) và không ở Zen.

Hành vi:
- `Ring` nhận prop mới `adjust?: { minutes: number; onChange(min: number): void }`.
  FocusView truyền `minutes = setup.durationSec / 60` (Count Up = 0) và
  `onChange = setCustomDuration` (hàm này đã tự map 25/50/90/120 phút về
  nhãn preset).
- Một vòng = 120 phút. Bước 5 phút. Giá trị 5 đến 120.
- Chỉ bắt đầu kéo khi nhấn vào **dải vòng tròn** (khoảng cách từ tâm lớn
  hơn ~34% bề rộng). Nhấn vào giữa vẫn bấm được nút "Add a task to begin".
- Trong lúc kéo: cung tròn đầy theo số phút (tắt transition 1s để bám tay),
  số lớn ở giữa đổi ngay (đã có sẵn vì nó đọc `setup`), rung 4ms mỗi lần
  đổi bước.
- Kéo qua đỉnh không được nhảy từ 120 về 5 (hoặc ngược lại): nếu giá trị
  trước >= 90 mà giá trị mới < 30 thì giữ 120; nếu trước <= 30 mà mới > 90
  thì giữ 5.
- Một chấm tay cầm nhỏ (r 1.4 trong viewBox 100) nằm trên vòng ở vị trí số
  phút hiện tại khi `adjust` bật, to lên (r 2.2) khi đang kéo. Count Up thì
  chấm ở đỉnh. Thả tay thì cung trở về 0 như hiện nay (đồng hồ chưa chạy).
- `DurationPicker` (hàng chữ bên dưới) giữ nguyên, nó tự hiện giá trị mới
  (ví dụ `35 min`).
- Phải đặt `touch-action: none` (`touch-none`) và `select-none` trên vòng
  khi `adjust` bật, nếu không iPhone sẽ cuộn trang khi kéo.
- Dùng `setPointerCapture` để kéo ra ngoài vòng vẫn bám.

Công thức (gợi ý, SVG đang xoay `-rotate-90` nên 0 là đỉnh):

```ts
export const RING_MAX_MIN = 120;
const STEP = 5;
const clampMin = (m: number) => Math.max(STEP, Math.min(RING_MAX_MIN, m));

// Minutes for a point on the ring, 0 at the top, clockwise.
export function minutesAt(x: number, y: number, cx: number, cy: number) {
  const turn = (Math.atan2(x - cx, cy - y) / (2 * Math.PI) + 1) % 1;
  return Math.round((turn * RING_MAX_MIN) / STEP) * STEP;
}

// Keeps a drag from jumping between the two ends when it crosses the top.
export function nextDragMinutes(prev: number, raw: number) {
  if (prev >= RING_MAX_MIN - 30 && raw < 30) return RING_MAX_MIN;
  if (prev <= 30 && raw > RING_MAX_MIN - 30) return STEP;
  return clampMin(raw);
}
```

Vị trí chấm trong viewBox (trước khi xoay):
`cx = 50 + 47 * cos(a)`, `cy = 50 + 47 * sin(a)`, với
`a = min(minutes, 120) / 120 * 2π`.

Bàn phím và trợ năng:
- Vòng có `role="slider"`, `tabIndex=0`, `aria-label="Focus minutes"`,
  `aria-valuemin=5`, `aria-valuemax=120`, `aria-valuenow`.
- Mũi tên lên/phải +5, xuống/trái -5. Gọi `stopPropagation` để không đụng
  phím tắt trong `useShortcuts`.

Test (`src/test/ringDrag.test.tsx`, mới):
- `minutesAt`: đỉnh = 0, phải = 30, dưới = 60, trái = 90.
- `nextDragMinutes`: 115 -> raw 5 thành 120; 10 -> raw 110 thành 5; 40 -> 45.
- Render FocusView ở trạng thái chờ có task: `fireEvent.keyDown` mũi tên
  phải trên slider làm `setup.durationSec` tăng 300.
- Khi đồng hồ đang chạy thì không có `role="slider"`.

Xong khi: kéo mượt trên Mac (chuột, trackpad) và iPhone (PWA), trang không
cuộn khi kéo, bấm giữa vòng vẫn mở danh sách task.

### P1.2 Giữ để dừng

File mới `src/ui/HoldButton.tsx`, dùng trong `FocusView.tsx` cho nút `stop`
(chỉ nút stop; `done`, `skip break` giữ bấm thường).

Hành vi:
- Nhấn giữ 800ms (`HOLD_MS`) thì gọi `stop()`. Thả sớm thì huỷ.
- Trong lúc giữ: một vạch 1px dưới chữ `stop` chạy từ trái sang phải
  (`transform: scaleX(0 -> 1)`, `transform-origin: left`, linear 800ms). Thả
  sớm thì vạch rút về trong 150ms.
- Bấm nhanh (thả trước 800ms) thì hiện chữ nhỏ `hold` dưới nút khoảng 1,6
  giây (`aria-live="polite"`), rồi mờ đi.
- Đủ 800ms: rung 12ms rồi dừng.
- Bàn phím: Enter/Space trên nút dừng ngay. Nhận biết bằng
  `onClick` có `e.detail === 0` (click từ bàn phím hoặc công cụ trợ năng).
  Click chuột thật có `detail >= 1` nên bị bỏ qua, chỉ đường giữ mới dừng.
- `onContextMenu` preventDefault (giữ lâu trên điện thoại không bật menu).
- Rời con trỏ khỏi nút (`pointerleave`, `pointercancel`) thì huỷ, không
  hiện `hold`.
- Reduced motion: vạch không chạy được (transition 1ms), nên khi giữ thì
  đổi chữ `stop` thành `holding…` cho người dùng biết đang giữ.
- Dọn `setTimeout` khi unmount.

Test (`src/test/holdStop.test.tsx`, mới, dùng fake timers):
- `pointerDown` rồi chờ 800ms: session dừng (`sessionActive` false).
- `pointerDown`, chờ 300ms, `pointerUp`: chưa dừng, có chữ `hold`.
- `fireEvent.click` (detail 0): dừng ngay.

---

## P2 - Sheet, task, kết thúc block

### P2.1 Vuốt xuống để đóng sheet (điện thoại)

File: `src/ui/Sheet.tsx`.

- Chỉ bật khi có `onClose` (ReviewSheet không có `onClose`, nên không vuốt
  được, đúng ý: phải chọn) và màn hẹp (`matchMedia('(max-width: 767px)')`,
  cùng mốc `md` của Tailwind).
- Thêm một thanh nắm nhỏ ở đầu sheet (rộng 36px, cao 4px, bo tròn, màu
  `var(--line-strong)`), chỉ hiện trên màn hẹp. Kéo bắt đầu từ thanh nắm,
  hoặc từ bất kỳ đâu trong sheet **khi nội dung đang ở đầu**
  (`scrollTop === 0`) và hướng kéo là xuống.
- Khi kéo: sheet đi theo ngón tay (`translateY(dy)`, chỉ dy > 0; kéo lên thì
  cản lại, `dy * 0.2`), lớp nền tối mờ dần theo `1 - dy / height`.
- Thả tay: đóng nếu `dy > 25% chiều cao` hoặc vận tốc > 0.5 px/ms; nếu
  không thì bật về 0 trong 200ms với `var(--ease-soft)`.
- Khi đóng bằng vuốt, sheet tiếp tục trượt xuống từ vị trí hiện tại (không
  nhảy về rồi mới chạy `sheet-down`). Cách đơn giản: set
  `transform: translateY(100%)` với transition 180ms, rồi gọi `onClose`.
- Input/textarea bên trong vẫn cuộn và gõ bình thường; không bắt đầu kéo khi
  pointer bắt đầu trong `input`, `textarea`, `[role=slider]`.

Test: thêm vào `src/test/motion.test.tsx`: stub màn hẹp, pointerDown trên
thanh nắm, pointerMove xuống 300px (sheet giả cao 400px), pointerUp: gọi
`onClose`. Kéo 40px rồi thả: không gọi.

### P2.2 Gạch ngang dần khi task xong

File: `src/ui/TaskList.tsx`, `src/styles/globals.css`.

- Bỏ `line-through` của CSS. Thay bằng một `span` 1px nằm ngang giữa chữ,
  `transform: scaleX(0 -> 1)`, origin trái, 260ms `var(--ease-soft)`. Bỏ
  tick thì rút về (origin phải, 180ms).
- Chữ chuyển sang `text-faint` như hiện nay.
- Checkbox: khi tick, chấm bên trong `pop` nhẹ (dùng keyframe `pop` có sẵn).
- Lần render đầu (mở sheet với task đã xong sẵn) không chạy hiệu ứng: gạch
  hiện sẵn. Chỉ chạy khi đổi trạng thái lúc đang xem.
- Gạch phải theo bề rộng chữ thật (chữ bị `truncate`): đặt span gạch bên
  trong span tên, `position: relative` trên span tên.

Test: render TaskList, tick một task: có phần tử `data-testid="strike"`
với class trạng thái done; tên không còn class `line-through`.

### P2.3 Vòng tròn "lắng xuống" khi xong một block

File: `src/ui/Ring.tsx`, `src/ui/FocusView.tsx`, `globals.css`.

- Khi focus block kết thúc (phase đổi từ `focus` sang `review`, cả khi hết
  giờ và khi bấm `done`): vòng tròn phóng nhẹ lên `scale(1.03)` rồi về `1`
  trong 600ms, cung đầy sáng lên (opacity 1) rồi mờ về.
- Một vòng mỏng thứ hai lan ra từ vòng chính (`scale 1 -> 1.12`, opacity
  `0.5 -> 0`, 900ms) rồi biến mất. Chỉ một lần, không lặp.
- FocusView giữ `settleKey` (state số). Một `useRef` nhớ phase trước; khi
  phase đổi từ `focus` sang `review` thì `settleKey + 1`. `Ring` dùng
  `key={settleKey}` trên lớp bọc SVG để chạy lại class `ring-settle`, và
  render vòng `ring-ripple` (`data-testid="ring-settle"`) khi
  `settleKey > 0`, gỡ nó sau 900ms. Không thêm gì vào store.
- Chạy cùng lúc với ReviewSheet trượt lên; không làm chậm sheet.

Test: đổi phase sang `review` thì có phần tử `data-testid="ring-settle"`;
reduced motion (mặc định trong test) thì vẫn render được, không lỗi.

---

## P3 - Giờ nghỉ, số, scene

### P3.1 Hướng dẫn thở trong giờ nghỉ

File: `src/ui/Ring.tsx` (hoặc component nhỏ mới `BreathGuide.tsx`),
`globals.css`, `FocusView.tsx`.

- Chỉ khi `phase === 'break'`.
- Một hình tròn mờ đầy (`var(--ink)` opacity ~0.05, trong scene thì
  `white` ~0.06) nằm sau chữ ở giữa vòng, đường kính ~70% vòng.
- Nhịp 10 giây: hít vào 4 giây (`scale 0.82 -> 1`), thở ra 6 giây
  (`1 -> 0.82`). Keyframe: `0% scale(.82)`, `40% scale(1)`, `100% scale(.82)`,
  `ease-in-out`, lặp vô hạn.
- Không có chữ "inhale/exhale". Chỉ có hình.
- Reduced motion: không hiện hình tròn (ẩn hẳn, vì đứng yên thì vô nghĩa).
- Không ảnh hưởng tới chữ, số, nút `skip break`.

Test: phase `break` có `data-testid="breath"`; phase `focus` không có.

### P3.2 Số phút lăn khi đổi

File: component mới `src/ui/RollingDigits.tsx`, dùng trong `FocusView.tsx`
thay cho `{formatTime(remainingSec(timer))}`.

- Chỉ chữ số **phút** (và giờ nếu có) lăn: số cũ trượt lên và mờ đi
  (`translateY(0 -> -40%)`, opacity 1 -> 0), số mới trượt từ dưới lên
  (`40% -> 0`), 280ms `var(--ease-soft)`.
- Giây **không** lăn (đổi mỗi giây, lăn sẽ rối mắt).
- Mỗi chữ số là một ô riêng, chỉ ô nào đổi mới lăn (ví dụ 24 -> 23 chỉ ô
  hàng đơn vị lăn).
- Giữ `tabular-nums` (class `digits`) để không xê dịch ngang.
- Đầu ra cho trình đọc màn hình là cả chuỗi thời gian một lần
  (`aria-label` hoặc span `sr-only`), các ô chữ số `aria-hidden`.
- Lúc kéo vòng tròn (P1.1) số cũng lăn; nếu nhìn rối khi kéo nhanh thì tắt
  lăn trong lúc kéo.
- Reduced motion: đổi ngay, không lăn.

Test: render với 25:00 rồi 24:59: text đọc được vẫn là thời gian đúng
(`getByText` hoặc `aria-label`), không lỗi; `formatTime` không đổi.

### P3.3 Scene nghiêng nhẹ theo chuột

File: `src/ui/SceneLayer.tsx`.

- Chỉ máy có chuột: `matchMedia('(hover: hover) and (pointer: fine)')`.
  Điện thoại không có (đừng dùng con quay hồi chuyển, iOS cần xin quyền).
- Nền scene dịch tối đa 12px theo vị trí chuột (ngược hướng chuột), qua
  `transform: translate3d(...) scale(1.04)` để không lộ mép.
- Mượt: cập nhật trong `requestAnimationFrame`, nội suy `cur += (target - cur) * 0.06`
  mỗi frame, dừng vòng rAF khi gần đúng chỗ. Không setState mỗi frame:
  ghi thẳng `el.style.transform` qua ref.
- Áp lên một lớp bọc ngoài `SceneSlide`, không đè lên animation `drift` của
  ảnh tĩnh (drift nằm ở lớp trong).
- Tắt khi: reduced motion, tab ẩn, Zen đang `away` (người dùng không động
  vào máy), đồng hồ đang chạy và chuột đứng yên quá 4 giây (dùng lại
  `useIdle` nếu tiện).
- Lớp scrim tối (`bg-black/45`) không di chuyển.

Test: không cần test hình; chỉ cần test SceneLayer vẫn render khi
`matchMedia` không có.

---

## P4 - Thêm tương tác (owner đã chọn)

### P4.1 Vuốt trái/phải trên đồng hồ để đổi scene

File: `FocusView.tsx`, `SceneLayer.tsx`, `ScenePicker.tsx` (lấy danh sách).

- Chỉ khi đang ở chế độ scene (`roomBackground === 'scene'`) và không có
  sheet mở.
- Vuốt ngang trên vùng đồng hồ (ngoài dải vòng khi P1.1 đang bật) quá 60px:
  sang scene kế (trái) hoặc trước (phải) trong danh sách scene đang hiện
  (bỏ scene đã ẩn `hiddenScenes`, gồm cả scene owner upload). Dùng
  `setCorner`.
- Trong lúc vuốt, nền dịch theo tay tối đa 24px (cảm giác "kéo được"), thả
  thì crossfade như bây giờ (`scene-in` có sẵn).
- Tên scene ở góc trên (`data-testid="scene-name"`) hiện rõ 2 giây rồi mờ.
- Bàn phím: `[` và `]` (thêm vào `useShortcuts` trong FocusView).
- Nhạc ambient đi theo scene như khi chọn trong sheet (dùng cùng hàm, không
  viết lại logic).

### P4.2 Phút cuối: báo sắp xong không cần âm thanh

File: `Ring.tsx`, `FocusView.tsx`.

- Khi đếm ngược còn <= 60 giây và đang chạy: nét cung tăng từ 0.9 lên 1.4
  (chuyển trong 1s), số lớn từ `font-extralight` lên `font-light` (hoặc
  opacity muted -> ink). Một lần, không nhấp nháy.
- Count Up và giờ nghỉ không có hiệu ứng này.

### P4.3 Vuốt dòng task

File: `TaskList.tsx`.

- Vuốt phải quá 72px = tick xong; vuốt trái quá 72px = xoá.
- Khi vuốt, dòng đi theo tay; phía sau hiện chữ nhỏ `done` (trái) hoặc
  `delete` (phải), màu `text-faint`, không màu đỏ.
- Xoá bằng vuốt có thanh `deleted · undo` 5 giây như History đang có (xem
  `HistoryView.tsx`, state `undo`). Cần hàm khôi phục task trong store (nếu
  chưa có thì thêm `restoreTask(task, index)` và test).
- Nút xoá và checkbox hiện có giữ nguyên (thay thế cho bàn phím/chuột).
- Không xung đột với kéo sheet (P2.1): vuốt ngang thì không kéo sheet; khóa
  hướng sau 8px di chuyển đầu tiên.

### P4.4 View Transitions: tên task bay vào vòng tròn

File: `FocusView.tsx`, `TaskList.tsx`, `App.tsx` hoặc nơi đổi `screen`.

- Dùng `document.startViewTransition` nếu trình duyệt có (Safari 18+,
  Chrome). Không có thì đổi bình thường.
- Khi task đang làm (`now`) đổi (tick xong, sắp xếp lại), đặt
  `view-transition-name: active-task` lên tên task trong vòng và dòng task
  tương ứng, để tên "bay" giữa hai chỗ.
- Đổi màn `focus` / `history` / `settings`: crossfade + trượt nhẹ 8px,
  220ms, qua `::view-transition-old(root)` / `::view-transition-new(root)`.
- Store thay đổi bên trong callback của `startViewTransition`, dùng
  `flushSync` của React để DOM cập nhật đồng bộ.
- Reduced motion: không gọi `startViewTransition`.

## Tiến độ

(AI làm ghi một dòng mỗi phase: ngày, commit, ghi chú.)

- P1 (2026-10-18): ring drag + hold to stop. `Ring.tsx`, `HoldButton.tsx`, tests `ringDrag`, `holdStop`; jsdom `PointerEvent` polyfill in `src/test/setup.ts`.
- P2 (2026-10-18): swipe sheet down, task strike, ring settle. `Sheet.tsx`, `TaskList.tsx`, `Ring.tsx`, tests in `motion`, `taskStrike`.
