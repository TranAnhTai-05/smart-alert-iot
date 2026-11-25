/**
 * LAB 2 & LAB 3: SERVER NODE.JS CUNG CẤP REST API GỬI THÔNG BÁO ĐẨY TỚI APP SMART ALERT
 *
 * Kiến trúc hoạt động:
 * [Postman (LAB 2) / Mạch IoT Wokwi (LAB 3)]
 *        │  (HTTP POST /api/alerts)
 *        ▼
 * [Server Node.js Express]
 *        │  (Đẩy bản tin cảnh báo lên Firebase)
 *        ▼
 * [Firebase (realtimewokwi)] ──► [App di động Smart Alert nổ thông báo thời gian thực]
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Đường dẫn Firebase Realtime Database đang liên kết với App Smart Alert của bạn
const FIREBASE_DATABASE_URL = (
  process.env.FIREBASE_DATABASE_URL ||
  'https://realtimewokwi-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/+$/, '');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bảng mẫu mặc định cho 6 loại cảnh báo (nếu Postman hoặc IoT chỉ gửi { type, sensorValue })
const DEFAULT_ALERT_TEMPLATES = {
  FIRE: {
    title: '🔥 CẢNH BÁO CHÁY KHẨN CẤP!',
    body: 'Phát hiện lửa hoặc khói vượt ngưỡng an toàn từ hệ thống cảm biến!',
    severity: 'critical',
  },
  GAS_LEAK: {
    title: '⚠️ Cảnh báo rò rỉ khí Gas!',
    body: 'Nồng độ khí Gas vượt ngưỡng an toàn cho phép.',
    severity: 'critical',
  },
  HIGH_TEMP: {
    title: '🌡️ Cảnh báo nhiệt độ cao!',
    body: 'Nhiệt độ môi trường vượt ngưỡng an toàn cài đặt (>= 38°C).',
    severity: 'warning',
  },
  LOW_TEMP: {
    title: '❄️ Cảnh báo nhiệt độ thấp!',
    body: 'Nhiệt độ môi trường giảm xuống dưới ngưỡng cài đặt (<= 12°C).',
    severity: 'info',
  },
  INTRUSION: {
    title: '🛡️ Cảnh báo phát hiện người lạ xâm nhập!',
    body: 'Cảm biến chuyển động PIR phát hiện có người xâm nhập trái phép.',
    severity: 'critical',
  },
  SYSTEM_CHECK: {
    title: '✅ Thông báo kiểm tra hệ thống (Server Node.js)',
    body: 'Kiểm tra kết nối từ Server Node.js REST API (LAB 2) qua Firebase tới App di động thành công!',
    severity: 'info',
  },
};

/**
 * Hàm xử lý chung cho POST /api/alerts và POST /api/send-notification
 */
async function handleSendAlert(req, res) {
  try {
    const rawType = String(req.body.type || 'SYSTEM_CHECK')
      .trim()
      .toUpperCase();
    const template =
      DEFAULT_ALERT_TEMPLATES[rawType] || DEFAULT_ALERT_TEMPLATES.SYSTEM_CHECK;

    const sensorValue = req.body.sensorValue
      ? String(req.body.sensorValue).trim()
      : null;

    const title = req.body.title
      ? String(req.body.title).trim()
      : template.title;

    const body = req.body.body
      ? String(req.body.body).trim()
      : sensorValue
      ? `${template.body} (Giá trị đo: ${sensorValue})`
      : template.body;

    const severity = req.body.severity
      ? String(req.body.severity).trim().toLowerCase()
      : template.severity;

    const eventId = req.body.eventId
      ? String(req.body.eventId).trim()
      : `EVT-${rawType}-${Date.now().toString().slice(-6)}`;

    const deviceId = req.body.deviceId
      ? String(req.body.deviceId).trim()
      : 'NODEJS-API-GATEWAY';

    const location = req.body.location
      ? String(req.body.location).trim()
      : 'Phòng Lab IoT';

    const alertPayload = {
      title,
      body,
      type: rawType,
      severity,
      eventId,
      deviceId,
      location,
      sensorValue: sensorValue || 'N/A',
      source: req.body.source || 'LAB2_NODEJS_API',
      timestamp: Date.now(),
    };

    // Gửi trực tiếp lên Firebase để App Smart Alert nhận thông báo ngay lập tức
    const firebaseEndpoint = `${FIREBASE_DATABASE_URL}/alerts.json`;
    const fbResponse = await fetch(firebaseEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload),
    });

    if (!fbResponse.ok) {
      const errText = await fbResponse.text();
      return res.status(502).json({
        success: false,
        message: 'Không thể đẩy thông báo lên Firebase',
        firebaseStatus: fbResponse.status,
        error: errText,
      });
    }

    const fbResult = await fbResponse.json();
    console.log(
      `[LAB 2 Node.js Server] ✅ Đã gửi thông báo [${rawType}] "${title}" -> Firebase ID: ${fbResult.name}`
    );

    return res.status(201).json({
      success: true,
      message: 'Đã gửi Push Notification qua Firebase tới App di động thành công!',
      firebaseNodeId: fbResult.name,
      data: alertPayload,
    });
  } catch (error) {
    console.error('[LAB 2 Node.js Server] ❌ Lỗi khi gửi thông báo:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ khi gửi thông báo',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ================= CÁC ENDPOINT REST API (LAB 2 & LAB 3) =================

// 1. Kiểm tra trạng thái Server
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Smart Alert Node.js Server (LAB 2 & LAB 3)',
    firebaseTarget: FIREBASE_DATABASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// 2. Lấy danh sách lịch sử cảnh báo từ Firebase
app.get('/api/alerts', async (req, res) => {
  try {
    const fbRes = await fetch(`${FIREBASE_DATABASE_URL}/alerts.json`);
    const data = await fbRes.json();
    res.json({
      success: true,
      alerts: data || {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 3. POST API gửi thông báo đẩy tới App di động (Dùng cho cả Postman ở LAB 2 và Wokwi ở LAB 3)
app.post('/api/alerts', handleSendAlert);
app.post('/api/send-notification', handleSendAlert);

// 4. Giao diện Web Dashboard có sẵn trên Server Node.js để demo LAB 2 trực quan cho giảng viên
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LAB 2 — Smart Alert Node.js Server API Console</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #F4F7FB; color: #0F172A; margin: 0; padding: 24px; }
    .container { max-width: 820px; margin: 0 auto; background: #FFF; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(15,23,42,0.08); border: 1px solid #E2E8F0; }
    h1 { margin-top: 0; color: #0F4C81; font-size: 22px; }
    .badge { display: inline-block; background: #DCFCE7; color: #16A34A; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 16px 0; }
    button { cursor: pointer; border: none; border-radius: 10px; padding: 12px 14px; font-weight: 700; font-size: 13.5px; transition: opacity 0.15s; }
    button:hover { opacity: 0.9; }
    .btn-fire { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
    .btn-gas { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
    .btn-htemp { background: #FFF7ED; color: #EA580C; border: 1px solid #FED7AA; }
    .btn-ltemp { background: #F0F9FF; color: #0284C7; border: 1px solid #BAE6FD; }
    .btn-pir { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }
    .btn-sys { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
    .form-group { margin-bottom: 12px; }
    label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 4px; color: #334155; }
    input, select, textarea { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 14px; font-family: inherit; }
    .submit-btn { background: #1D4ED8; color: #FFF; width: 100%; padding: 13px; font-size: 15px; margin-top: 8px; }
    pre { background: #0F172A; color: #38BDF8; padding: 14px; border-radius: 10px; overflow-x: auto; font-size: 12.5px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">● LAB 2 & LAB 3 — SERVER NODE.JS ĐANG HOẠT ĐỘNG</span>
    <h1>Smart Alert — Bảng Điều Khiển Server Node.js REST API</h1>
    <p style="font-size:14px;color:#475569;">
      Endpoint gửi Push Notification: <code>POST /api/alerts</code> hoặc <code>POST /api/send-notification</code><br/>
      Đang kết nối tới Firebase: <code>${FIREBASE_DATABASE_URL}</code>
    </p>

    <h3>1. Bắn nhanh thông báo đẩy từ Server Node.js sang App di động:</h3>
    <div class="grid">
      <button class="btn-fire" onclick="quickSend('FIRE', 'critical', '🔥 Cảnh báo cháy từ Server Node.js!', 'Phát hiện cháy tại tầng 2 qua REST API.', 'FLAME=1')">🔥 Gửi Báo Cháy</button>
      <button class="btn-gas" onclick="quickSend('GAS_LEAK', 'critical', '⚠️ Cảnh báo rò rỉ khí Gas!', 'Nồng độ khí Gas đạt 820 ppm.', '820 ppm')">⚠️ Gửi Rò rỉ Gas</button>
      <button class="btn-htemp" onclick="quickSend('HIGH_TEMP', 'warning', '🌡️ Cảnh báo nhiệt độ cao!', 'Nhiệt độ phòng máy chủ lên tới 41.5°C.', '41.5°C')">🌡️ Gửi Nhiệt độ cao</button>
      <button class="btn-ltemp" onclick="quickSend('LOW_TEMP', 'info', '❄️ Cảnh báo nhiệt độ thấp!', 'Nhiệt độ kho lạnh giảm xuống 9.0°C.', '9.0°C')">❄️ Gửi Nhiệt độ thấp</button>
      <button class="btn-pir" onclick="quickSend('INTRUSION', 'critical', '🛡️ Cảnh báo người lạ xâm nhập!', 'Cảm biến PIR phát hiện chuyển động tại cửa sau.', 'PIR=1')">🛡️ Gửi Người lạ xâm nhập</button>
      <button class="btn-sys" onclick="quickSend('SYSTEM_CHECK', 'info', '✅ Kiểm tra REST API Node.js (LAB 2)', 'Server Node.js gửi Push Notification thành công!', 'OK')">✅ Gửi Kiểm tra hệ thống</button>
    </div>

    <h3>2. Tuỳ chỉnh nội dung POST API:</h3>
    <div class="form-group">
      <label>Loại cảnh báo (type):</label>
      <select id="type">
        <option value="FIRE">FIRE (Cảnh báo cháy)</option>
        <option value="GAS_LEAK">GAS_LEAK (Rò rỉ khí Gas)</option>
        <option value="HIGH_TEMP">HIGH_TEMP (Nhiệt độ cao)</option>
        <option value="LOW_TEMP">LOW_TEMP (Nhiệt độ thấp)</option>
        <option value="INTRUSION">INTRUSION (Người lạ xâm nhập)</option>
        <option value="SYSTEM_CHECK">SYSTEM_CHECK (Kiểm tra hệ thống)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tiêu đề thông báo (title):</label>
      <input id="title" value="🔥 Cảnh báo từ Server Node.js (LAB 2)" />
    </div>
    <div class="form-group">
      <label>Nội dung chi tiết (body):</label>
      <textarea id="body" rows="2">Bản tin được gửi qua phương thức HTTP POST tới Server Node.js và đẩy về App di động.</textarea>
    </div>
    <div class="form-group">
      <label>Giá trị cảm biến (sensorValue):</label>
      <input id="sensorValue" value="43.2°C" />
    </div>
    <button class="submit-btn" onclick="customSend()">🚀 Gửi POST /api/alerts tới App Di Động</button>

    <h3>Kết quả phản hồi từ Server Node.js:</h3>
    <pre id="result">Chưa gửi request nào. Hãy nhấn một nút ở trên để test!</pre>
  </div>

  <script>
    async function sendPayload(payload) {
      document.getElementById('result').textContent = 'Đang gửi POST /api/alerts...';
      try {
        const res = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        document.getElementById('result').textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        document.getElementById('result').textContent = 'Lỗi: ' + e.message;
      }
    }
    function quickSend(type, severity, title, body, sensorValue) {
      sendPayload({ type, severity, title, body, sensorValue, source: 'LAB2_NODEJS_WEB_CONSOLE' });
    }
    function customSend() {
      sendPayload({
        type: document.getElementById('type').value,
        title: document.getElementById('title').value,
        body: document.getElementById('body').value,
        sensorValue: document.getElementById('sensorValue').value,
        severity: 'critical',
        source: 'LAB2_NODEJS_CUSTOM_POST'
      });
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log('==============================================================');
  console.log(`🚀 [LAB 2] Server Node.js đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Endpoint POST API: http://localhost:${PORT}/api/alerts`);
  console.log(`🔥 Liên kết Firebase: ${FIREBASE_DATABASE_URL}`);
  console.log('==============================================================');
});
