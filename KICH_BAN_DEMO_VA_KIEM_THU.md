# CHECKLIST KIỂM THỬ & KỊCH BẢN DEMO TRÌNH DIỄN (3–5 PHÚT)
## ỨNG DỤNG SMART ALERT — LAB 1 (FIREBASE CLOUD MESSAGING)

---

## PHẦN 1: CHECKLIST KIỂM THỬ LAB 1

> **Quy tắc đánh giá:** Chỉ đánh dấu `[x]` sau khi bạn đã trực tiếp chạy thử nghiệm trên điện thoại Android thật với file `google-services.json` của bạn. Hiện tại các mục phụ thuộc thiết bị thật được ghi rõ trạng thái **[Chưa kiểm chứng trên thiết bị thật]**.

- [ ] **1. App mở thành công:** Bản dựng APK Development Build cài đặt và mở mượt mà trên điện thoại Android thật, hiển thị giao diện Trang chủ Smart Alert. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **2. Firebase khởi tạo thành công:** Màn hình Cài đặt Firebase báo `Native Firebase Module: Đã liên kết (@react-native-firebase/messaging)`. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **3. Quyền thông báo được cấp:** Hộp thoại xin quyền Android 13+ (`POST_NOTIFICATIONS`) hoạt động và trạng thái hiển thị `Đã cấp quyền (Granted)`. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **4. Lấy được FCM Token:** Ứng dụng lấy được chuỗi FCM Registration Token thực tế từ máy chủ Firebase và cho phép sao chép vào Clipboard. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **5. Firebase Console gửi thông báo thành công:** Dán FCM Token vào mục *Send test message* trên Firebase Console và gửi không báo lỗi. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **6. App nhận thông báo khi đang mở (Foreground):** Ngay khi nhấn gửi trên Firebase Console, ứng dụng đang mở xuất hiện Banner cảnh báo nổi, phát âm thanh/rung và tăng số lượng thông báo chưa đọc. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **7. Điện thoại nhận notification khi App chạy nền (Background):** Ẩn ứng dụng xuống nền (bấm nút Home), gửi thông báo từ Firebase Console, thanh trạng thái Android hiển thị đúng tiêu đề và nội dung (không bị trùng lặp 2 thông báo). *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **8. Kiểm tra nhận notification khi App bị đóng (Terminated):** Vuốt đóng hoàn toàn ứng dụng khỏi màn hình đa nhiệm, gửi thông báo từ Firebase Console, điện thoại vẫn đổ chuông và hiện thông báo trên thanh trạng thái. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **9. Nhấn thông báo mở được App (Notification Tap):** Nhấn vào thông báo trên thanh trạng thái Android (cả lúc Background và lúc Terminated), ứng dụng tự động mở lên và chuyển thẳng vào màn hình **Chi tiết thông báo** của sự kiện đó. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **10. Lịch sử thông báo được lưu bền vững:** Đóng hoàn toàn ứng dụng và mở lại từ màn hình chính, toàn bộ danh sách thông báo đã nhận vẫn được khôi phục từ `AsyncStorage`, các thao tác Đánh dấu đã đọc / Đọc tất cả / Xóa hoạt động chính xác. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*
- [ ] **11. Xử lý lỗi khi mất mạng:** Tắt Wi-Fi và dữ liệu di động trên điện thoại, ứng dụng hiển thị ngay thẻ cảnh báo *Thiết bị đang ngoại tuyến (Offline)* mà không bị treo hoặc văng ứng dụng. *(Trạng thái hiện tại: Chưa kiểm chứng trên thiết bị thật)*

---

## PHẦN 2: KỊCH BẢN DEMO TRƯỚC GIẢNG VIÊN (THỜI LƯỢNG 3–5 PHÚT)

### Chuẩn bị trước khi lên bàn chấm (2 phút chuẩn bị)
1. Điện thoại Android thật đã cài sẵn bản dựng APK **Smart Alert** và kết nối mạng 4G/Wi-Fi ổn định.
2. Máy tính mở sẵn:
   - Cửa sổ trình duyệt tại trang **Firebase Console -> Messaging -> New campaign -> Notifications**.
   - Phần mềm chiếu màn hình điện thoại lên laptop (khuyên dùng `scrcpy` hoặc Zalo/Vysor) để giảng viên quan sát đồng thời cả màn hình Firebase Console và màn hình điện thoại.

---

### Phút 1: Giới thiệu giao diện & Xác thực kết nối Firebase thật (0:00 – 1:00)
- **Thao tác:** Mở ứng dụng **Smart Alert** trên điện thoại tại màn hình **Trang chủ (Dashboard)**.
- **Lời thuyết trình:**
  > *"Thưa thầy/cô, đây là ứng dụng Smart Alert của nhóm/em cho bài LAB 1. Trên màn hình Trang chủ, ứng dụng hiển thị trạng thái đã kết nối trực tiếp với Firebase Cloud Messaging và đã cấp quyền thông báo trên Android. Em không tạo bất kỳ dữ liệu cảm biến giả hay thông báo giả nào trong code."*
- **Thao tác tiếp theo:** Chuyển sang tab **Cài đặt Firebase** (góc dưới bên phải).
- **Lời thuyết trình:**
  > *"Tại màn hình Cài đặt Firebase, ứng dụng lấy trực tiếp FCM Registration Token thật của chiếc điện thoại này thông qua thư viện native `@react-native-firebase/messaging`. Bây giờ em xin phép nhấn Sao chép FCM Token để gửi thông báo thực tế từ Firebase Console."*

---

### Phút 2: Gửi thông báo thử nghiệm số 1 — Trạng thái Foreground (1:00 – 2:15)
- **Thao tác:**
  1. Giữ nguyên ứng dụng **Smart Alert** đang mở ở màn hình **Trang chủ**.
  2. Trên máy tính (Firebase Console):
     - Nhập **Notification title:** `Cảnh báo cháy khẩn cấp!`
     - Nhập **Notification text:** `Phát hiện khói và nhiệt độ tăng đột ngột tại Phòng Lab IoT A204.`
     - Nhấn nút **Send test message**, dán **FCM Token** của điện thoại vào và nhấn **Test**.
- **Kết quả trên điện thoại:** Ngay lập tức một Banner cảnh báo màu đỏ (`Cảnh báo cháy`) xuất hiện trên đỉnh màn hình ứng dụng, đồng thời số lượng **Tổng thông báo** và **Chưa đọc** trên Dashboard tự động tăng lên `1`.
- **Thao tác tiếp theo:** Nhấn vào thẻ thông báo vừa nhận để mở màn hình **Chi tiết thông báo**.
- **Lời thuyết trình:**
  > *"Khi ứng dụng đang mở (Foreground), hàm lắng nghe `onMessage` bắt được bản tin từ Firebase ngay lập tức, phân loại tự động vào nhóm Cảnh báo cháy với icon tương ứng và lưu vào AsyncStorage. Tại màn hình Chi tiết, vì vừa rồi em chỉ gửi Notification cơ bản chưa kèm Custom Data nên các trường như Mức độ nguy hiểm và Mã sự kiện được ứng dụng báo rõ là 'Không cung cấp trong payload' chứ không tự bịa dữ liệu."*

---

### Phút 3: Gửi thông báo thử nghiệm số 2 kèm Custom Data — Trạng thái Background / Terminated (2:15 – 3:45)
- **Thao tác:**
  1. Trên điện thoại: Bấm nút Home (hoặc vuốt đóng hẳn ứng dụng Smart Alert khỏi đa nhiệm) để chứng minh ứng dụng không còn mở trên màn hình.
  2. Trên Firebase Console:
     - Nhập **Notification title:** `Cảnh báo rò rỉ khí Gas`
     - Nhập **Notification text:** `Nồng độ khí LPG vượt ngưỡng an toàn tại Kho tầng 1.`
     - Tại phần **Additional options (Tuỳ chọn bổ sung) -> Custom data**, thêm 3 cặp khoá - giá trị:
       - `type` : `GAS_LEAK`
       - `severity` : `critical`
       - `eventId` : `EVT-GAS-2026`
     - Nhấn gửi tới thiết bị (Target -> Single device hoặc Publish tới Topic/Token).
- **Kết quả trên điện thoại:** Điện thoại đổ chuông và hiển thị thông báo `Cảnh báo rò rỉ khí Gas` trên thanh trạng thái hệ thống Android.
- **Thao tác tiếp theo:** Nhấn trực tiếp vào thông báo đó trên thanh trạng thái của điện thoại.
- **Kết quả:** Ứng dụng **Smart Alert** tự động khởi động lại và điều hướng thẳng vào màn hình **Chi tiết thông báo** của bản tin *Cảnh báo rò rỉ khí Gas*, hiển thị đầy đủ:
  - Loại cảnh báo: `Cảnh báo rò rỉ khí gas`
  - Mức độ nguy hiểm: `Nguy hiểm cao (Critical)`
  - Mã sự kiện (`eventId`): `EVT-GAS-2026`
  - Bảng dữ liệu thô (`remoteMessage.data`) hiển thị đầy đủ các key-value đã gửi.

---

### Phút 4: Kiểm chứng lưu trữ cục bộ AsyncStorage & Xử lý mất mạng (3:45 – 4:30)
- **Thao tác:**
  1. Quay lại màn hình **Danh sách thông báo**, thử lọc theo *Chưa đọc / Tất cả*, hoặc lọc theo loại *Báo cháy / Khí Gas*.
  2. Vuốt tắt hoàn toàn ứng dụng **Smart Alert**, sau đó mở lại ứng dụng từ biểu tượng ngoài màn hình chính.
  3. Tắt thử Wi-Fi/4G trên điện thoại trong 5 giây.
- **Lời thuyết trình:**
  > *"Thưa thầy/cô, sau khi đóng hẳn ứng dụng và mở lại, toàn bộ lịch sử thông báo vẫn được khôi phục nguyên vẹn từ AsyncStorage và được chống trùng lặp theo `messageId` và `eventId`. Khi điện thoại mất kết nối mạng, ứng dụng cũng phát hiện ngay qua `NetInfo` để hiển thị cảnh báo Offline rõ ràng. Kiến trúc payload này đã sẵn sàng 100% để ở LAB 2 em xây dựng Server Node.js REST API và LAB 3 kết nối cảm biến IoT thực tế. Em xin kết thúc phần demo ạ!"*
