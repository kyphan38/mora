# PLAN-live-logi - mora và logi chạy cùng một đồng hồ

Viết ngày 2026-10-18. Thay cho cách hiện tại (gửi một bản ghi đã xong khi
block kết thúc).

## Mục tiêu

- Bấm Play trên mora → logi có ngay một hoạt động **đang chạy** (learn/work,
  tên task), hiện trên màn Now của logi.
- Stop trên mora → hoạt động bên logi dừng.
- Stop hoạt động đó trên logi → mora cũng dừng (lưu phần đã focus).
- Chạy được trên mọi máy (Mac, iPhone, PWA), không cần máy nào giữ token.

## Cách làm

```
mora (máy bất kỳ) ──ghi──▶ Firestore mora: live/current
                                  │ (trigger)
                                  ▼
                     Function mora: liveToLogi ──HTTP + token──▶ logi /api/ingest/mora/live
                                                                    │ ghi activity mora_<block>
                                                                    ▼
                                                        Firestore logi: activities
                                                                    │ (trigger khi bị stop từ logi)
                                                                    ▼
mora live/current ◀──ghi── Function mora: stopFromLogi ◀──HTTP + token── Function logi: moraStopped
```

1. **mora → logi.** Function `liveToLogi` chạy mỗi khi `live/current` đổi:
   - focus bắt đầu chạy → gọi logi `start` (activity `active`, id
     `mora_<blockId>`, giờ bắt đầu thật).
   - focus dừng (pause, done, stop, hết giờ) → gọi logi `stop` với giờ kết thúc.
   - Mỗi đoạn chạy giữa hai lần pause là một activity riêng, nên logi tính
     đúng thời gian focus (đề xuất, xem quyết định 1).
2. **logi → mora.** Function mới bên logi `moraStopped` chạy khi một activity
   có `source: 'mora'` bị đặt giờ kết thúc **từ logi** (không phải do mora
   gửi sang). Nó gọi Function `stopFromLogi` của mora, Function này dừng
   `live/current` và lưu session như khi bấm Stop. Mọi máy đang mở mora thấy
   dừng ngay (đã có sync đồng hồ S3).
3. **Không bị vòng lặp:** mỗi lần ghi có đánh dấu bên nào gây ra
   (`stoppedBy: 'mora' | 'logi'`), và lệnh stop cho một block đã dừng thì
   bỏ qua.
4. **Bảo mật:** hai token riêng trong Secret Manager của hai project
   (mora→logi đã có `MORA_INGEST_TOKEN`; thêm `LOGI_CONTROL_TOKEN` cho
   logi→mora).
5. **Bỏ cách cũ** (gửi bản ghi khi xong) để không bị trùng.
6. **Độ trễ:** mỗi chiều khoảng 1-3 giây (thời gian chạy Cloud Function).

## Việc cần làm

| Phần | Repo | Nội dung |
|---|---|---|
| L1 | logi | route `/api/ingest/mora/live` (start/stop, idempotent), test |
| L2 | mora | Function `liveToLogi` (trigger `live/current`), `blockId` cho mỗi đoạn chạy |
| L3 | logi | Function `moraStopped` (trigger activities), secret `LOGI_CONTROL_TOKEN` |
| L4 | mora | Function `stopFromLogi` (HTTPS + token), dừng `live/current` + lưu session |
| L5 | cả hai | bỏ cách gửi khi xong, test emulator hai chiều, deploy |

Owner cần: tạo token thứ hai và đặt vào cả hai project (mình đưa lệnh).

## Quyết định cần owner chọn

1. **Pause trên mora thì logi làm gì?**
   - (đề xuất) dừng activity bên logi, Play lại thì mở activity mới →
     logi chỉ tính thời gian thật sự focus.
   - hoặc giữ activity chạy suốt, chỉ dừng khi Stop/Done → logi tính cả lúc
     pause.
2. **Start trên logi có bật mora không?** (đề xuất: không, chỉ mora → logi
   khi start; stop thì hai chiều như owner yêu cầu.)

## Quyết định của owner (2026-10-18)

1. **Pause** trên mora → dừng activity bên logi; Play lại → mở activity mới.
   logi chỉ tính thời gian thật sự focus.
2. **Start chỉ từ mora.** Start trên logi là việc riêng của logi, không đụng
   tới mora. **Stop** thì hai chiều: dừng ở mora hoặc ở logi đều dừng cả hai.

## Tiến độ

- **L1-L4 code xong (2026-10-18):** logi route `/api/ingest/mora/live`,
  Function logi `moraStopped`; mora Function `liveToLogi` (trigger
  `live/current`) và `stopFromLogi` (HTTPS); `runId` mới mỗi lần đồng hồ
  chạy, doc đồng hồ có tên task, loại, thời điểm thao tác. Bỏ 2 Function cũ
  (`sessionToLogi`, `sendRecentToLogi`); web không còn nút gửi 7 ngày.
  Test: mora 255, logi 633.
- **Chờ owner:** đặt secret `LOGI_CONTROL_TOKEN` (cùng một giá trị) ở cả
  hai project, rồi deploy functions hai bên.
- **mora deploy xong (2026-10-18):** `liveToLogi`, `stopFromLogi` chạy; 2 Function cũ đã xoá. `stopFromLogi` trả 401 khi không có token (đúng). Còn: secret bên logi + deploy `moraStopped`.
