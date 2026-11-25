# NỘI DUNG SLIDE THUYẾT TRÌNH LAB 1 (9 SLIDES)
## ĐỀ TÀI: ỨNG DỤNG DI ĐỘNG "SMART ALERT" NHẬN PUSH NOTIFICATION TỪ FIREBASE

---

### SLIDE 1: TRANG BÌA
- **Tiêu đề:** BÁO CÁO LAB 1 — XÂY DỰNG ỨNG DỤNG DI ĐỘNG NHẬN THÔNG BÁO ĐẨY TỪ FIREBASE
- **Tên ứng dụng:** **Smart Alert — Hệ thống cảnh báo thông minh**
- **Môn học:** Lập trình thiết bị di động / IoT
- **Sinh viên thực hiện:** [Họ và tên sinh viên - MSSV]
- **Giảng viên hướng dẫn:** [Tên giảng viên]

---

### SLIDE 2: ĐẶT VẤN ĐỀ & MỤC TIÊU LAB 1
- **Bối cảnh bài toán:** Hệ thống giám sát an toàn IoT cần một kênh thông báo khẩn cấp tới điện thoại người dùng theo thời gian thực ngay cả khi người dùng không mở ứng dụng.
- **Mục tiêu LAB 1:**
  - Xây dựng ứng dụng di động **Smart Alert** nhận trực tiếp Push Notification từ **Firebase Cloud Messaging (FCM)**.
  - Chạy thực tế trên điện thoại Android thật.
  - Quản lý lịch sử cảnh báo cục bộ và thiết kế cấu trúc Payload sẵn sàng mở rộng cho **LAB 2 (Node.js API)** và **LAB 3 (Thiết bị IoT)**.

---

### SLIDE 3: CÔNG NGHỆ LỰA CHỌN & LÝ DO DÙNG DEVELOPMENT BUILD
- **Frontend Mobile:** React Native + Expo SDK 52 + TypeScript + Expo Router.
- **Push Notification:** `@react-native-firebase/app` & `@react-native-firebase/messaging` (kết nối trực tiếp FCM Native, **không** dùng Expo Push Service).
- **Lưu trữ & Mạng:** `AsyncStorage` (lưu lịch sử cục bộ) + `NetInfo` (giám sát kết nối mạng).
- **Điểm nhấn kỹ thuật:** Sử dụng **Expo Development Build (APK)** thay vì Expo Go vì thư viện Firebase Messaging yêu cầu mã nguồn Native Android và file cấu hình `google-services.json` riêng của dự án.

---

### SLIDE 4: KIẾN TRÚC TỔNG THỂ (TỪ LAB 1 ĐẾN LAB 3)
- **LAB 1 (Hiện tại):** Firebase Console ➔ Firebase Cloud Messaging (FCM) ➔ Ứng dụng Smart Alert (Android) ➔ Lưu trữ AsyncStorage.
- **LAB 2 (Sắp tới):** Server Node.js (Express + Firebase Admin SDK) cung cấp REST API gửi thông báo qua FCM.
- **LAB 3 (Hoàn chỉnh):** Mạch cảm biến IoT (ESP32 phát hiện Cháy / Rò rỉ Gas / Nhiệt độ cao / Người lạ) ➔ Gọi API Node.js trên Cloud ➔ FCM đẩy cảnh báo tức thời về Smart Alert.

---

### SLIDE 5: CƠ CHẾ XỬ LÝ THÔNG BÁO FCM TRÊN 3 TRẠNG THÁI
1. **Foreground (App đang mở):**
   - Nhận sự kiện qua `messaging().onMessage()`.
   - Lưu ngay vào `AsyncStorage`, hiển thị Toast Banner trong App và thông báo cục bộ qua kênh ưu tiên cao.
2. **Background (App chạy ngầm):**
   - Hệ điều hành Android tự hiển thị thông báo FCM trên thanh trạng thái (tránh gọi trùng lặp thông báo).
   - Xử lý dữ liệu ngầm qua `setBackgroundMessageHandler()`.
3. **Terminated / Notification Tap (Khi đóng App & nhấn thông báo):**
   - Bắt sự kiện nhấn qua `onNotificationOpenedApp()` và `getInitialNotification()`, tự động điều hướng thẳng tới màn hình **Chi tiết thông báo**.

---

### SLIDE 6: THIẾT KẾ GIAO DIỆN 4 MÀN HÌNH CHÍNH
1. **Màn hình 1 — Trang chủ (Dashboard):** Hiển thị trạng thái kết nối Firebase, quyền thông báo, thống kê tổng số/chưa đọc, danh sách gần đây và hướng dẫn test Firebase Console.
2. **Màn hình 2 — Danh sách thông báo:** Bộ lọc Tất cả / Chưa đọc, lọc theo 6 loại cảnh báo, đánh dấu đã đọc và xóa thông báo.
3. **Màn hình 3 — Chi tiết thông báo:** Hiển thị đầy đủ tiêu đề, nội dung, thời gian, loại payload, mức độ nguy hiểm (`severity`) và mã sự kiện (`eventId`) trung thực từ payload.
4. **Màn hình 4 — Cài đặt Firebase:** Hiển thị & sao chép **FCM Token thật**, làm mới token, mở cài đặt quyền của điện thoại.

---

### SLIDE 7: 6 LOẠI CẢNH BÁO & CẤU TRÚC PAYLOAD CHUẨN
- **6 loại cảnh báo hỗ trợ:**
  1. 🔥 Cảnh báo cháy (`FIRE`)
  2. 🧪 Cảnh báo rò rỉ khí gas (`GAS_LEAK`)
  3. 🌡️ Cảnh báo nhiệt độ cao (`HIGH_TEMP`)
  4. ❄️ Cảnh báo nhiệt độ thấp (`LOW_TEMP`)
  5. 🛡️ Cảnh báo phát hiện người lạ (`INTRUSION`)
  6. ✅ Thông báo kiểm tra hệ thống (`SYSTEM_CHECK`)
- **Cấu trúc Custom Data:** `{ type, severity, eventId, location, deviceId, sensorValue }`.
- **Nguyên tắc minh bạch:** Nếu payload không gửi `severity` hoặc `eventId`, ứng dụng hiển thị rõ *"Không cung cấp trong payload"*, tuyệt đối không tự bịa dữ liệu.

---

### SLIDE 8: DEMO TRỰC TIẾP TRÊN ĐIỆN THOẠI ANDROID THẬT
- **Bước 1:** Mở ứng dụng Smart Alert trên điện thoại, kiểm tra quyền thông báo và sao chép **FCM Token** tại màn hình Cài đặt Firebase.
- **Bước 2:** Mở **Firebase Console -> Messaging**, nhập nội dung cảnh báo kèm Custom Data và gửi tới FCM Token của điện thoại.
- **Bước 3:** Trình diễn nhận thông báo khi App đang mở (Foreground) và khi App đã đóng/ẩn xuống nền (Background/Terminated).
- **Bước 4:** Nhấn vào thông báo trên thanh trạng thái để mở thẳng màn hình **Chi tiết thông báo** và kiểm tra lưu trữ bền vững khi tắt/mở lại App.

---

### SLIDE 9: KẾT LUẬN & HƯỚNG PHÁT TRIỂN
- **Kết quả đạt được:**
  - Hoàn thiện ứng dụng **Smart Alert** chuẩn TypeScript, kết nối trực tiếp FCM, xử lý tốt quyền Android 13+, mất mạng và lưu trữ lịch sử `AsyncStorage`.
- **Sẵn sàng cho giai đoạn tiếp theo:**
  - Tiếp tục triển khai **LAB 2** (Xây dựng REST API bằng Node.js + Firebase Admin SDK) và **LAB 3** (Kết nối phần cứng IoT gửi cảnh báo tự động lên Cloud).
- **Cảm ơn thầy/cô và các bạn đã lắng nghe! Mời thầy/cô đặt câu hỏi.**
