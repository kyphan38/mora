# PLAN-sync - mora: đồng bộ PC, Mac, điện thoại

Viết ngày 2026-10-18. Firebase project: `kyphan38-mora-app` (Blaze,
Firestore ở Singapore, Auth đã bật cho `mora.kyphan38.com`).

## Mục tiêu

- Task, lịch sử, ghi chú, cài đặt giống nhau trên mọi thiết bị.
- Vẫn **chạy offline**: ghi vào máy trước, có mạng thì tự đẩy lên.
- Một người dùng (email của owner). Người lạ đăng nhập cũng không đọc/ghi
  được gì.
- Làm giống hệ sinh thái: cách đăng nhập và rules giống hodi/legi.

## Kiến trúc

- **Firebase Auth (Google).** Đăng nhập là **tuỳ chọn**: chưa đăng nhập thì
  app chạy local như bây giờ; đăng nhập thì bật sync.
- **Firestore với cache offline** (`persistentLocalCache` +
  `persistentMultipleTabManager`, giống hodi). Ghi khi offline vẫn thành
  công ngay trên máy, có mạng thì SDK tự đẩy.
- **iPhone Safari:** `authDomain` = `mora.kyphan38.com`, proxy `/__/auth/*`
  sang `kyphan38-mora-app.firebaseapp.com` bằng `vercel.json` (cách đã làm
  ở cogi/hodi). Trên iPhone và PWA dùng redirect thay cho popup.
- **Env (Vite):** `VITE_FIREBASE_API_KEY`, `..._PROJECT_ID`,
  `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID`,
  `VITE_ALLOWED_USER_EMAIL`. Ở `.env.local` và Vercel.
- **Code:** thêm `src/platform/firebase.ts`, `src/platform/sync.ts`. Store
  không đổi cách dùng: sync nằm ở lớp platform, lắng nghe store và
  Firestore, giống cách `persist.ts` đang làm với localStorage.

## Dữ liệu trên Firestore

Tất cả dưới `users/{uid}/`:

| Đường dẫn | Nội dung | Ghi chú |
|---|---|---|
| `tasks/{id}` | name, done, kind, est, blocks, order, updatedAt | thứ tự bằng `order` |
| `sessions/{id}` | taskName, minutes, startedAt, endedAt, kind, note | id giữ nguyên như hiện tại |
| `notes/{id}` | text, createdAt | ý tưởng đã ghi nhanh |
| `prefs/main` | sound, setup, nền, scene id, auto-continue, mục tiêu ngày | một doc |
| `live/current` | phase, mốc thời gian chạy, task đang làm | chỉ có ở S3 |

Không sync: nhạc tự upload (file nằm trong máy), theme (mỗi máy một kiểu
như các app khác), âm lượng đang tắt tiếng.

**Xung đột:** mỗi doc có `updatedAt`, ghi sau thắng. Với một người dùng
thì đủ, vì hiếm khi sửa cùng một task trên hai máy cùng lúc.

**Lần đăng nhập đầu:** đẩy dữ liệu local lên (gộp theo id, không xoá gì),
rồi từ đó Firestore là nguồn chính.

## Rules

Giống hodi: `request.auth.uid == uid` **và** email đúng + đã xác minh.
Kiểm tra kiểu dữ liệu từng doc (độ dài tên, số phút 1-600, ...). Email
thật được chèn từ template bằng script, file rules thật nằm ngoài git.

## Các phase

| Phase | Nội dung | Kiểm chứng |
|---|---|---|
| **S0** | Owner làm các bước trong Firebase/Google Cloud/Vercel (danh sách bên dưới) | |
| **S1** | Firebase client, đăng nhập Google (tuỳ chọn), proxy `/__/auth`, rules + deploy | Đăng nhập được trên Mac và iPhone |
| **S2** | Sync task, session, note, prefs; cache offline; gộp dữ liệu lần đầu | Thêm task trên Mac, thấy trên iPhone; tắt mạng vẫn dùng được |
| **S3** | Timer sống giữa các máy: bắt đầu trên Mac, thấy và pause được trên iPhone | Hai máy cùng hiện một đồng hồ |
| **S4** | Gửi sang logi bằng Cloud Function khi có session mới; máy không cần giữ token | Session hiện trong logi dù máy đã tắt |
| **S5** | Desktop: chọn PWA hay Tauri (xem quyết định 1) | |

Test: emulator Auth + Firestore như hodi (`npm run emu`), không chạm dữ
liệu thật khi chạy test.

## S0 - việc owner cần làm

1. Firebase → Authentication → Sign-in method: bật **Google**.
2. Authentication → Settings → Authorized domains: có
   `mora.kyphan38.com` (đã có) và `localhost`.
3. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client
   (Web client do Firebase tạo) → Authorized redirect URIs: thêm
   `https://mora.kyphan38.com/__/auth/handler`. **Làm bước này trước** khi
   đổi env ở Vercel.
4. Vercel (project mora) → Environment Variables: thêm các biến
   `VITE_FIREBASE_*` và `VITE_ALLOWED_USER_EMAIL` (mình sẽ đưa danh sách
   chính xác khi làm S1).
5. Billing → Budgets: đặt cảnh báo ngân sách (ví dụ 5 USD/tháng). Dùng
   một người thì gần như luôn nằm trong mức miễn phí.

## Quyết định cần owner chọn

1. **Desktop:** Tauri không đăng nhập Google được (Google chặn đăng nhập
   trong webview nhúng). Đề xuất: trên Mac/PC dùng **PWA** (cài từ
   Chrome/Edge, hoặc Safari "Add to Dock"), giữ Tauri làm bản offline
   không sync, hoặc bỏ hẳn sau này.
2. **Timer sống giữa các máy (S3):** có làm không.
3. **Gửi sang logi bằng Cloud Function (S4):** có làm không.
4. **Đăng nhập:** tuỳ chọn (đề xuất) hay bắt buộc.

## Quyết định của owner (2026-10-18)

1. Desktop: **PWA** trên Mac/PC (có sync). Bản Tauri giữ lại, chạy local,
   không đăng nhập, không sync.
2. Timer sống giữa các máy: **có**, làm ở S3.
3. Gửi sang logi bằng **Cloud Function** (S4). Sau đó bỏ phần nhập token
   trên từng máy.
4. Đăng nhập **bắt buộc** trên web/PWA (giống hodi/legi): mở app là thấy
   màn đăng nhập trước. Riêng bản Tauri bỏ qua màn này (chạy local).

Màn đăng nhập dùng **mẫu chung của hệ sinh thái** (giống hodi/legi/fina/
logi: icon, tên viết thường, một dòng, nút viền "Continue with Google").
Kiểu "đồng hồ là màn hình" chỉ áp dụng cho bên trong app.

## Tiến độ

- **S0 xong** (owner): bật Google, authorized domains, OAuth redirect URI.
- **S1 xong (2026-10-18):** Firebase client (khởi tạo lười, cache offline,
  emulator `npm run emu` + `npm run dev:emu`), đăng nhập Google bắt buộc
  trên web/PWA (màn đăng nhập là đồng hồ giờ trong ngày), tài khoản khác bị
  đăng xuất ngay, Tauri bỏ qua đăng nhập. Proxy `/__/auth` và
  `/__/firebase` trong `vercel.json`; service worker bỏ qua `/__/`.
  Rules (template + `npm run rules`) đã deploy lên `kyphan38-mora-app`.
  7 biến `VITE_*` đã đặt trên Vercel (production + preview).
- **Sửa (2026-10-18):** màn đăng nhập đổi về mẫu chung; thêm `favicon.ico`.
- **S2 xong (2026-10-18):** `platform/sync.ts` lắng nghe `tasks`,
  `sessions`, `notes`, `prefs/main` và chỉ ghi doc thay đổi (so bằng
  fingerprint), chia batch 400, gửi sửa đổi local trước khi nhận snapshot.
  Lần đầu trên mỗi máy gộp theo id (cờ `mora.synced.<uid>`), sau đó cloud
  là nguồn chính. Không sync: nhạc tự upload, tắt tiếng, theme, token logi.
  Firebase tách thành file JS riêng, sync chỉ tải trên web.
  Test emulator (`npm run test:emu`, cần Java 21) bắt được lỗi rules
  `prefs` (đọc bị từ chối); đã sửa và deploy lại. Emulator dùng cổng
  9199/8180 và file rules riêng `firestore.emu.rules`.
- **S3 xong (2026-10-18):** `platform/liveSync.ts` + `core/liveModel.ts`.
  Doc `live/current` lưu phase, chạy/dừng, số giây tại một mốc thời gian,
  máy ghi gần nhất. Chỉ ghi khi có thao tác (gom trong 300ms), không ghi
  theo từng giây. Máy nhận tự tính đồng hồ từ mốc, khớp cả phần lẻ của
  giây. Máy bấm gần nhất là "máy chính" và ghi session khi hết giờ; máy đi
  theo chờ, quá 10 giây thì tự hoàn tất (máy chính đã tắt/ngủ). Hết giờ
  tự nhiên thì máy kia cũng kêu chuông. Thao tác trước khi snapshot đầu tiên
  về tới vẫn được giữ (đã sửa một lỗi tranh chấp tìm thấy nhờ test
  emulator). Test emulator chạy lần lượt từng file; tổng 14.
