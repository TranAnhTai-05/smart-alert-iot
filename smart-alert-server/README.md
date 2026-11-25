# LAB 2 & LAB 3 — Server Node.js REST API (`smart-alert-server`)

Server **Node.js + Express** cung cấp REST API để nhận yêu cầu gửi thông báo đẩy (từ **Postman** ở **LAB 2** hoặc từ **Mạch IoT Wokwi** ở **LAB 3**), sau đó đẩy thông báo qua **Firebase (`realtimewokwi`)** xuống ứng dụng di động **Smart Alert**.

---

## 1. Các Endpoint REST API hỗ trợ

### A. `POST /api/alerts` (hoặc `POST /api/send-notification`)
Gửi thông báo đẩy mới tới App di động.

- **Headers:** `Content-Type: application/json`
- **Body JSON mẫu (dùng khi test bằng Postman ở LAB 2):**
  ```json
  {
    "type": "FIRE",
    "severity": "critical",
    "title": "🔥 Cảnh báo cháy từ Server Node.js (LAB 2)!",
    "body": "Phát hiện nhiệt độ và khói vượt ngưỡng an toàn tại Phòng Lab.",
    "sensorValue": "49.5°C",
    "location": "Phòng Lab IoT Tầng 2",
    "deviceId": "ESP32-WOKWI-01"
  }
  ```
- **Các giá trị `type` hỗ trợ:**
  - `FIRE` (Cảnh báo cháy)
  - `GAS_LEAK` (Cảnh báo rò rỉ khí Gas)
  - `HIGH_TEMP` (Cảnh báo nhiệt độ cao)
  - `LOW_TEMP` (Cảnh báo nhiệt độ thấp)
  - `INTRUSION` (Cảnh báo phát hiện người lạ xâm nhập)
  - `SYSTEM_CHECK` (Thông báo kiểm tra hệ thống)

### B. `GET /api/health`
Kiểm tra trạng thái hoạt động của Server Node.js.

### C. `GET /api/alerts`
Lấy toàn bộ danh sách thông báo đã gửi trên Firebase.

---

## 2. Cách chạy Server Node.js trên máy tính (LAB 2)

```powershell
cd "d:\Năm 4\ltddkiemtra\smart-alert-server"
npm install
npm start
```
- Mở trình duyệt tại: **http://localhost:4000** (Có sẵn bảng điều khiển Web để bấm gửi thử cả 6 loại cảnh báo sang App di động, hoặc dùng **Postman** gọi `POST http://localhost:4000/api/alerts`).

---

## 3. Cách đưa Server Node.js lên Cloud để mạch Wokwi gọi API (LAB 3)

Để mạch ESP32 trên trang web **Wokwi.com** gọi được vào Server Node.js của bạn, bạn có thể dùng 1 trong 2 cách:

### Cách 1 (Nhanh nhất khi demo trực tiếp trên laptop — không cần tạo tài khoản Cloud):
Hệ thống đã mở sẵn một đường hầm **Cloud Tunnel công khai (`https://...`)** trỏ thẳng vào cổng `4000` của Server Node.js. Bạn chỉ cần dán link HTTPS đó vào biến `SERVER_API_URL` trong file `sketch_lab3_nodejs.ino` trên Wokwi là Wokwi gọi thẳng vào Server Node.js trên máy bạn!

### Cách 2 (Deploy miễn phí vĩnh viễn lên Render.com):
1. Đưa thư mục `smart-alert-server` lên GitHub.
2. Vào [https://dashboard.render.com/](https://dashboard.render.com/) → Chọn **New + → Web Service** → Kết nối repo GitHub đó.
3. Render sẽ tự đọc file `render.yaml` và cấp cho bạn 1 địa chỉ Cloud dạng:
   `https://smart-alert-nodejs-server.onrender.com/api/alerts`
