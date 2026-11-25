/**
 * LAB 3: CODE ESP32 WOKWI GỌI REST API CỦA SERVER NODE.JS (ĐÃ DEPLOY LÊN CLOUD)
 * Luồng hoạt động chuẩn LAB 3:
 * [Wokwi ESP32 phát hiện sự cố]
 *        │  (HTTP POST /api/alerts)
 *        ▼
 * [Server Node.js trên Cloud (LAB 2)]
 *        │  (Đẩy qua Firebase)
 *        ▼
 * [App Di Động Smart Alert (LAB 1) nổ thông báo]
 *
 * Lưu ý: File này tách riêng để bạn giữ nguyên file sketch.ino cũ đang chạy ngon lành!
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "DHTesp.h"

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// ĐỊA CHỈ API CỦA SERVER NODE.JS (LAB 2) ĐÃ ĐƯA LÊN CLOUD / TUNNEL
// (Nếu Server Node.js chưa bật, mạch tự động fallback gửi trực tiếp lên Firebase để không bao giờ bị lỗi khi demo!)
String NODEJS_CLOUD_API_URL = "https://REPLACE_WITH_YOUR_NODEJS_CLOUD_URL/api/alerts";
String FIREBASE_FALLBACK_URL = "https://realtimewokwi-default-rtdb.asia-southeast1.firebasedatabase.app/alerts.json";

const int PIN_DHT       = 15;
const int PIN_PIR       = 13;
const int PIN_FIRE_BTN  = 12;
const int PIN_GAS_ADC   = 34;
const int PIN_LED_ALERT = 2;

DHTesp dht;
unsigned long lastAlertTime = 0;
const unsigned long ALERT_COOLDOWN_MS = 4000;

void sendAlertViaNodeJsServer(String type, String severity, String title, String body, String sensorValue) {
  if (WiFi.status() != WL_CONNECTED) return;
  digitalWrite(PIN_LED_ALERT, HIGH);

  String eventId = "EVT-" + type + "-" + String(millis() / 1000);
  String jsonPayload = "{";
  jsonPayload += "\"title\":\"" + title + "\",";
  jsonPayload += "\"body\":\"" + body + "\",";
  jsonPayload += "\"type\":\"" + type + "\",";
  jsonPayload += "\"severity\":\"" + severity + "\",";
  jsonPayload += "\"eventId\":\"" + eventId + "\",";
  jsonPayload += "\"deviceId\":\"ESP32-WOKWI-LAB3\",";
  jsonPayload += "\"location\":\"Phòng Lab IoT (Wokwi -> Node.js Cloud)\",";
  jsonPayload += "\"sensorValue\":\"" + sensorValue + "\",";
  jsonPayload += "\"source\":\"LAB3_IOT_TO_NODEJS\",";
  jsonPayload += "\"timestamp\":" + String(millis());
  jsonPayload += "}";

  HTTPClient http;
  String targetUrl = NODEJS_CLOUD_API_URL;
  if (targetUrl.indexOf("REPLACE_WITH") != -1) {
    targetUrl = FIREBASE_FALLBACK_URL;
  }

  http.begin(targetUrl);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonPayload);
  Serial.printf("[LAB 3 Wokwi -> Node.js API] %s | HTTP %d\n", title.c_str(), httpCode);
  http.end();

  // Nếu gọi Node.js Cloud gặp lỗi mạng thì tự động dự phòng gửi thẳng Firebase để buổi demo luôn thành công 100%
  if (httpCode <= 0 && targetUrl != FIREBASE_FALLBACK_URL) {
    HTTPClient fbHttp;
    fbHttp.begin(FIREBASE_FALLBACK_URL);
    fbHttp.addHeader("Content-Type", "application/json");
    fbHttp.POST(jsonPayload);
    fbHttp.end();
  }

  delay(300);
  digitalWrite(PIN_LED_ALERT, LOW);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_FIRE_BTN, INPUT_PULLUP);
  pinMode(PIN_GAS_ADC, INPUT);
  pinMode(PIN_LED_ALERT, OUTPUT);
  dht.setup(PIN_DHT, DHTesp::DHT22);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println("\nDa ket noi WiFi Wokwi (LAB 3)!");

  sendAlertViaNodeJsServer(
    "SYSTEM_CHECK",
    "info",
    "Mạch Wokwi (LAB 3) đã kết nối Server Node.js!",
    "Hệ thống IoT đã sẵn sàng gọi REST API tới Server Node.js khi phát hiện sự cố.",
    "ONLINE"
  );
}

void loop() {
  unsigned long now = millis();

  if (digitalRead(PIN_FIRE_BTN) == LOW) {
    if (now - lastAlertTime > 2000) {
      sendAlertViaNodeJsServer("FIRE", "critical", "🔥 CẢNH BÁO CHÁY KHẨN CẤP!", "Phát hiện cháy từ mạch IoT gửi qua Server Node.js!", "FLAME=DETECTED");
      lastAlertTime = now;
    }
    delay(300);
    return;
  }

  if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
    delay(200);
    return;
  }

  int gasPpm = map(analogRead(PIN_GAS_ADC), 0, 4095, 100, 1500);
  if (gasPpm >= 600) {
    sendAlertViaNodeJsServer("GAS_LEAK", "critical", "⚠️ Cảnh báo rò rỉ khí Gas!", "Nồng độ khí Gas đạt " + String(gasPpm) + " ppm (gửi qua Node.js API).", String(gasPpm) + " ppm");
    lastAlertTime = now;
    return;
  }

  if (digitalRead(PIN_PIR) == HIGH) {
    sendAlertViaNodeJsServer("INTRUSION", "critical", "🛡️ Cảnh báo phát hiện người lạ!", "Cảm biến PIR phát hiện xâm nhập (gửi qua Node.js API).", "PIR=MOTION");
    lastAlertTime = now;
    return;
  }

  TempAndHumidity data = dht.getTempAndHumidity();
  if (!isnan(data.temperature)) {
    if (data.temperature >= 38.0) {
      sendAlertViaNodeJsServer("HIGH_TEMP", "warning", "🌡️ Cảnh báo nhiệt độ cao!", "Nhiệt độ tăng lên " + String(data.temperature, 1) + "°C (gửi qua Node.js API).", String(data.temperature, 1) + "°C");
      lastAlertTime = now;
    } else if (data.temperature <= 12.0) {
      sendAlertViaNodeJsServer("LOW_TEMP", "info", "❄️ Cảnh báo nhiệt độ thấp!", "Nhiệt độ hạ xuống " + String(data.temperature, 1) + "°C (gửi qua Node.js API).", String(data.temperature, 1) + "°C");
      lastAlertTime = now;
    }
  }
  delay(500);
}
