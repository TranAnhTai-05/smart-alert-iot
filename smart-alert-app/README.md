# Smart Alert — Hệ thống cảnh báo thông minh (LAB 1)

Ứng dụng di động **React Native + Expo + TypeScript** nhận thông báo đẩy (Push Notification) trực tiếp từ **Firebase Cloud Messaging (FCM)** thông qua thư viện native `@react-native-firebase/messaging`.

> **Lưu ý học thuật quan trọng:**
> - Ứng dụng sử dụng **Firebase Cloud Messaging (FCM)** và **FCM Registration Token** thật 100%, **không** sử dụng Expo Push Service hay Expo Push Token.
> - Vì `@react-native-firebase/messaging` là thư viện có mã nguồn Native Android, **ứng dụng không thể nhận FCM bên trong Expo Go**. Bạn cần tạo **Expo Development Build (file APK)** để cài lên điện thoại Android thật.
> - Mã nguồn được thiết kế độc lập cho **LAB 1**, đồng thời định nghĩa sẵn cấu trúc dữ liệu (`eventId`, `type`, `severity`, `deviceId`, `location`, `sensorValue`) để mở rộng liền mạch sang **LAB 2 (Server Node.js REST API)** và **LAB 3 (Cảm biến IoT)**.

---

## 1. Cấu trúc thư mục dự án

```text
smart-alert-app/
├── app/                          # Điều hướng Expo Router (Tabs + Stack)
│   ├── _layout.tsx               # Root Layout + đăng ký Background Handler FCM
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Thanh điều hướng dưới cùng (Bottom Tabs)
│   │   ├── index.tsx             # Màn hình 1: Trang chủ (Dashboard)
│   │   ├── notifications.tsx     # Màn hình 2: Danh sách thông báo & Bộ lọc
│   │   └── settings.tsx          # Màn hình 4: Cài đặt Firebase & Lấy FCM Token
│   └── notification/
│       └── [id].tsx              # Màn hình 3: Chi tiết thông báo & Payload
├── components/                   # Các thành phần giao diện tái sử dụng
│   ├── ForegroundAlertToast.tsx  # Banner nổi khi nhận FCM lúc App đang mở
│   ├── NotificationCard.tsx      # Card hiển thị từng thông báo
│   └── StatusBadge.tsx           # Nhãn hiển thị trạng thái kết nối/quyền
├── services/                     # Xử lý nghiệp vụ Firebase & Lưu trữ
│   ├── firebaseMessagingService.ts # Khởi tạo FCM, xin quyền Android 13+, lấy Token
│   └── storageService.ts         # Lưu lịch sử vào AsyncStorage (chống trùng lặp)
├── hooks/
│   └── useSmartAlert.tsx         # Context + Hook quản lý toàn bộ trạng thái ứng dụng
├── types/
│   └── notification.ts           # Định nghĩa TypeScript cho thông báo và FCM payload
├── constants/
│   ├── alerts.ts                 # Cấu hình 6 loại cảnh báo, icon, màu sắc & mẫu test
│   └── theme.ts                  # Bảng màu xanh dương chủ đạo & đổ bóng
├── utils/
│   └── formatters.ts             # Phân tích RemoteMessage từ FCM & định dạng thời gian
├── assets/                       # Tài nguyên tĩnh
├── app.config.ts                 # Cấu hình Expo + Plugin @react-native-firebase
├── eas.json                      # Cấu hình đóng gói APK qua EAS Build
├── google-services.json.example  # File mẫu hướng dẫn đặt google-services.json
├── package.json                  # Danh sách thư viện tương thích Expo SDK 52
└── tsconfig.json                 # Cấu hình TypeScript Strict Mode
```

---

## 2. Hướng dẫn 13 bước cài đặt và chạy trên Windows (PowerShell)

### Bước 1: Kiểm tra Node.js và môi trường trên Windows
Mở **PowerShell** và kiểm tra phiên bản Node.js, npm, Java:
```powershell
node -v
npm -v
java -version
```
*(Khuyến nghị Node.js >= 18/20/22/24. Nếu bạn muốn build trực tiếp trên máy tính thay vì Cloud thì cần cài thêm Android Studio + Android SDK Platform 35 và thêm `%LOCALAPPDATA%\Android\Sdk\platform-tools` vào biến môi trường `PATH` để dùng lệnh `adb`).*

### Bước 2: Di chuyển vào thư mục dự án React Native Expo
```powershell
cd "d:\Năm 4\ltddkiemtra\smart-alert-app"
```

### Bước 3: Cài đặt các thư viện (Dependencies)
```powershell
npm install
```
Kiểm tra TypeScript không có lỗi:
```powershell
npm run typecheck
```

### Bước 4: Tạo Firebase Project
1. Truy cập [https://console.firebase.google.com/](https://console.firebase.google.com/).
2. Nhấn **Create a project** (hoặc **Add project**), đặt tên ví dụ: `smart-alert-lab1`.
3. Tắt hoặc bật Google Analytics tuỳ ý và nhấn **Create project**.

### Bước 5: Đăng ký Android App trên Firebase
1. Tại trang tổng quan Project Overview của Firebase Console, nhấn biểu tượng **Android** để thêm ứng dụng.
2. Tại ô **Android package name**, nhập chính xác:
   ```text
   com.smartalert.app
   ```
3. Đặt App nickname (tuỳ chọn): `Smart Alert Android` rồi nhấn **Register app**.

### Bước 6: Tải `google-services.json`
1. Nhấn nút **Download google-services.json**.
2. Sao chép file `google-services.json` vừa tải về vào đúng thư mục gốc của project:
   ```text
   d:\Năm 4\ltddkiemtra\smart-alert-app\google-services.json
   ```
   *(Lưu ý: File phải có tên chính xác là `google-services.json`, nằm cùng cấp với `package.json` và `app.config.ts`).*

### Bước 7: Kiểm tra cấu hình Firebase trong Expo
File `app.config.ts` đã được cấu hình tự động nhận diện `./google-services.json`, khai báo package `com.smartalert.app`, quyền `android.permission.POST_NOTIFICATIONS` cho Android 13+, và tích hợp plugin `@react-native-firebase/app`, `@react-native-firebase/messaging`.

### Bước 8: Tạo Development Build (Chọn 1 trong 2 cách)

> **Tại sao bắt buộc dùng Development Build?**  
> `Expo Go` là ứng dụng dùng chung trên CH Play, không chứa native SDK `@react-native-firebase/messaging` và không đọc file `google-services.json` riêng của bạn. Do đó bạn cần build một bản APK Development Build.

#### Cách 8A (Khuyên dùng trên Windows khi chưa cài Android Studio): Build APK trên đám mây bằng EAS Build
```powershell
# Cài đặt EAS CLI toàn cục
npm install -g eas-cli

# Đăng nhập tài khoản Expo (miễn phí tại expo.dev)
eas login

# Khởi tạo liên kết project với EAS
eas project:init

# Ra lệnh build file APK Development Build trên Cloud của Expo
eas build --platform android --profile development
```
Sau khi build xong (khoảng 5–10 phút), EAS sẽ cung cấp **mã QR và đường link tải file `.apk`**.

#### Cách 8B (Nếu máy đã cài Android Studio & Android SDK): Build trực tiếp trên máy qua cáp USB
```powershell
# Sinh thư mục native android/ từ cấu hình Expo
npx expo prebuild --platform android

# Cắm điện thoại Android thật (đã bật USB Debugging) và biên dịch cài đặt trực tiếp
npx expo run:android
```

### Bước 9: Cài ứng dụng lên điện thoại Android thật
- **Nếu dùng Cách 8A (EAS Build):** Quét mã QR hoặc mở link tải file `.apk` trên điện thoại Android thật và nhấn **Cài đặt (Install)**. Sau khi cài xong, trên máy tính chạy lệnh khởi động Metro bundler (cùng mạng Wi-Fi với điện thoại):
  ```powershell
  npx expo start --dev-client
  ```
- **Nếu dùng Cách 8B (`npx expo run:android`):** Ứng dụng sẽ tự động được cài vào điện thoại qua cáp USB.

### Bước 10: Cấp quyền nhận thông báo
Khi mở ứng dụng **Smart Alert** lần đầu trên điện thoại Android (đặc biệt Android 13 trở lên):
- Một hộp thoại hệ thống sẽ hỏi quyền **Cho phép Smart Alert gửi thông báo cho bạn? (Allow notifications)**. Hãy nhấn **Cho phép (Allow)**.
- Nếu lỡ nhấn từ chối, bạn có thể vào tab **Cài đặt Firebase** trong ứng dụng và nhấn nút **Mở cài đặt quyền của điện thoại** để bật lại.

### Bước 11: Lấy FCM Token
1. Trên ứng dụng, chuyển sang tab **Cài đặt Firebase** (biểu tượng ngọn lửa Firebase ở góc dưới bên phải).
2. Kiểm tra mục **Firebase FCM Registration Token** đã hiển thị chuỗi token thật từ Firebase.
3. Nhấn nút **Sao chép FCM Token** và gửi chuỗi token này qua Zalo/Email/Messenger sang máy tính của bạn.

### Bước 12: Gửi Test Notification bằng Firebase Console
1. Trên máy tính, mở **Firebase Console** → chọn Project của bạn.
2. Ở menu bên trái, chọn **Run (hoặc Engage) → Messaging**.
3. Nhấn **Create your first campaign** (hoặc **New campaign**) → chọn **Firebase Notification messages** → nhấn **Create**.
4. Nhập thông tin thông báo:
   - **Notification title:** `Cảnh báo cháy khẩn cấp!`
   - **Notification text:** `Phát hiện khói và nhiệt tăng đột ngột tại Phòng Lab IoT A204.`
5. Nhấn nút **Send test message** ở khung bên phải:
   - Dán **FCM Token** vừa copy từ điện thoại vào ô **Add an FCM registration token** → nhấn dấu `+`.
   - Tích chọn token đó và nhấn **Test**.
6. *(Khuyến nghị kiểm thử thêm Custom Data):* Bạn cũng có thể đóng hộp thoại test, bấm **Next** tới bước **Additional options (Tuỳ chọn bổ sung)** → tại mục **Custom data**, nhập thêm:
   - `type` = `FIRE` (hoặc `GAS_LEAK`, `HIGH_TEMP`, `LOW_TEMP`, `INTRUSION`, `SYSTEM_CHECK`)
   - `severity` = `critical` (hoặc `warning`, `info`)
   - `eventId` = `EVT-FIRE-001`
   - `location` = `Phòng Lab IoT A204`

### Bước 13: Kiểm tra thông báo được nhận trên điện thoại
Kiểm tra lần lượt ở 3 trạng thái:
1. **Khi App đang mở (Foreground):** Banner nổi xuất hiện ngay trong ứng dụng + thông báo hệ thống bung xuống, số lượng thông báo trên Dashboard tăng lên ngay lập tức.
2. **Khi App chạy nền (Background - bấm nút Home thoát ra màn hình chính):** Điện thoại đổ chuông và hiện thông báo trên thanh trạng thái Android. Nhấn vào thông báo sẽ mở thẳng vào màn hình **Chi tiết thông báo**.
3. **Khi App đã đóng hoàn toàn (Terminated - vuốt tắt App khỏi đa nhiệm):** Gửi thông báo từ Firebase Console → điện thoại vẫn nhận thông báo trên thanh trạng thái → nhấn vào thông báo sẽ khởi động lại App và điều hướng tới màn hình **Chi tiết thông báo**.

---

## 3. Liên kết tài liệu nộp giảng viên

Bên cạnh mã nguồn trong `smart-alert-app/`, bộ tài liệu phục vụ nộp báo cáo và thuyết trình được đặt tại thư mục gốc `d:\Năm 4\ltddkiemtra\`:
- [`BAO_CAO_LAB1.md`](../BAO_CAO_LAB1.md): Báo cáo hoàn chỉnh LAB 1 (Mục tiêu, Công nghệ, Kiến trúc, Giải thích FCM, Kịch bản kiểm thử, Hướng mở rộng LAB 2 & LAB 3).
- [`SLIDE_THUYET_TRINH_LAB1.md`](../SLIDE_THUYET_TRINH_LAB1.md): Nội dung 10 Slide thuyết trình ngắn gọn, súc tích.
- [`KICH_BAN_DEMO_VA_KIEM_THU.md`](../KICH_BAN_DEMO_VA_KIEM_THU.md): Checklist kiểm thử 11 mục và Kịch bản trình diễn (Demo) 3–5 phút trước giảng viên.
