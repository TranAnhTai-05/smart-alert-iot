#include <WiFi.h>
#include <HTTPClient.h>
#include "DHTesp.h"

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

String FIREBASE_DATABASE_URL =
  "https://realtimewokwi-default-rtdb.asia-southeast1.firebasedatabase.app";

const int PIN_DHT      = 15;
const int PIN_PIR      = 13;
const int PIN_GAS_DOUT = 34;
const int PIN_FIRE_BTN = 14;
const int PIN_LED      = 26;
const int PIN_BUZZER   = 27;

DHTesp dht;
HTTPClient http; // Giữ kết nối Keep-Alive liên tục tới Firebase (không đóng socket sau mỗi lần gửi!)

float highTempThreshold = 38.0;
float lowTempThreshold  = 12.0;

unsigned long lastAlertTime   = 0;
unsigned long lastDhtReadTime = 0;
const unsigned long ALERT_REPEAT_MS = 2500;

float cachedTemp = 25.0;
bool  hasValidTemp = false;

bool wasGasDanger      = false;
bool wasHighTempDanger = false;
bool wasLowTempDanger  = false;
bool wasPirDanger      = false;
bool isAlarmCurrentlyOn = false;

volatile bool fireButtonPressedFlag = false;
void IRAM_ATTR onFireButtonISR() {
  fireButtonPressedFlag = true;
}

void setHardwareAlarm(bool active) {
  if (active == isAlarmCurrentlyOn && !active) return;
  isAlarmCurrentlyOn = active;
  digitalWrite(PIN_LED, active ? HIGH : LOW);
  if (active) {
    tone(PIN_BUZZER, 1800, 300);
  } else {
    noTone(PIN_BUZZER);
  }
}

void syncThresholdsFromApp() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient syncHttp;
  syncHttp.begin(FIREBASE_DATABASE_URL + "/settings/thresholds.json");
  int code = syncHttp.GET();
  if (code == 200) {
    String res = syncHttp.getString();
    int idxHigh = res.indexOf("\"highTempThreshold\":");
    if (idxHigh != -1) {
      float val = res.substring(idxHigh + 20).toFloat();
      if (val > 0) highTempThreshold = val;
    }
    int idxLow = res.indexOf("\"lowTempThreshold\":");
    if (idxLow != -1) {
      float val = res.substring(idxLow + 19).toFloat();
      if (val != 0) lowTempThreshold = val;
    }
  }
  syncHttp.end();
}

void sendAlertToFirebase(
  String type,
  String severity,
  String title,
  String body,
  String sensorValue
) {
  if (WiFi.status() != WL_CONNECTED) return;
  setHardwareAlarm(true);

  String eventId = "EVT-" + type + "-" + String(millis());
  String p = "{";
  p += "\"title\":\"" + title + "\",";
  p += "\"body\":\"" + body + "\",";
  p += "\"type\":\"" + type + "\",";
  p += "\"severity\":\"" + severity + "\",";
  p += "\"eventId\":\"" + eventId + "\",";
  p += "\"deviceId\":\"ESP32-WOKWI-01\",";
  p += "\"location\":\"Phòng Lab IoT\",";
  p += "\"sensorValue\":\"" + sensorValue + "\",";
  p += "\"calibrated\":\"true\",";
  p += "\"timestamp\":" + String(millis());
  p += "}";

  // Gửi trực tiếp trên kết nối Keep-Alive đang mở sẵn (KHÔNG gọi http.end() để giữ tốc độ tức thì!)
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(p);
  if (httpCode <= 0) {
    // Nếu socket hết hạn thì mở lại tự động
    http.end();
    http.setReuse(true);
    http.begin(FIREBASE_DATABASE_URL + "/alerts.json");
    http.addHeader("Content-Type", "application/json");
    httpCode = http.POST(p);
  }
  Serial.printf("⚡ [Wokwi -> Firebase] %s (%s) | HTTP %d\n", title.c_str(), sensorValue.c_str(), httpCode);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_GAS_DOUT, INPUT);
  pinMode(PIN_FIRE_BTN, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  attachInterrupt(digitalPinToInterrupt(PIN_FIRE_BTN), onFireButtonISR, FALLING);
  dht.setup(PIN_DHT, DHTesp::DHT22);

  Serial.print("Dang ket noi WiFi Wokwi-GUEST");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }
  Serial.println("\n✅ Da ket noi WiFi Wokwi!");

  // Đồng bộ ngưỡng 1 lần lúc khởi động
  syncThresholdsFromApp();

  // Mở sẵn đường ống Keep-Alive tới Firebase để khi bấm nút là bắn đi ngay lập tức!
  http.setReuse(true);
  http.begin(FIREBASE_DATABASE_URL + "/alerts.json");
  Serial.println("⚡ Duong truyen Keep-Alive da san sang (Phan hoi tuc thi)!");
}

void loop() {
  unsigned long now = millis();

  // 1. Nút nhấn Báo Cháy (Chân 14 - phản hồi tức thì)
  if (fireButtonPressedFlag || digitalRead(PIN_FIRE_BTN) == LOW) {
    fireButtonPressedFlag = false;
    if (now - lastAlertTime > 1000) {
      sendAlertToFirebase(
        "FIRE",
        "critical",
        "🔥 CẢNH BÁO CHÁY KHẨN CẤP!",
        "Nút báo cháy khẩn cấp (FIRE) trên mạch Wokwi vừa được kích hoạt!",
        "FLAME=DETECTED"
      );
      lastAlertTime = millis();
    }
    delay(25);
    return;
  }

  bool isGasDanger = (digitalRead(PIN_GAS_DOUT) == LOW);
  bool isPirDanger = (digitalRead(PIN_PIR) == HIGH);

  // Chỉ đọc DHT22 mỗi 250ms để vòng lặp loop() chạy cực nhanh 40 lần/giây
  if (now - lastDhtReadTime >= 250) {
    lastDhtReadTime = now;
    TempAndHumidity data = dht.getTempAndHumidity();
    if (!isnan(data.temperature)) {
      cachedTemp = data.temperature;
      hasValidTemp = true;
    }
  }

  bool isHighTempDanger = hasValidTemp && (cachedTemp >= highTempThreshold);
  bool isLowTempDanger  = hasValidTemp && (cachedTemp <= lowTempThreshold);

  // 2. Cảnh báo Khí Gas
  if (isGasDanger) {
    if (!wasGasDanger || (now - lastAlertTime >= ALERT_REPEAT_MS)) {
      wasGasDanger = true;
      sendAlertToFirebase(
        "GAS_LEAK",
        "critical",
        "⚠️ Cảnh báo rò rỉ khí Gas!",
        "Cảm biến khí Gas MQ-2 phát hiện nồng độ khí Gas vượt ngưỡng an toàn!",
        "GAS=DANGER"
      );
      lastAlertTime = millis();
    }
    delay(25);
    return;
  } else {
    wasGasDanger = false;
  }

  // 3. Cảnh báo Người lạ (PIR)
  if (isPirDanger) {
    if (!wasPirDanger || (now - lastAlertTime >= ALERT_REPEAT_MS)) {
      wasPirDanger = true;
      sendAlertToFirebase(
        "INTRUSION",
        "critical",
        "🛡️ Cảnh báo phát hiện người lạ!",
        "Cảm biến chuyển động PIR trên Wokwi phát hiện xâm nhập.",
        "PIR=MOTION"
      );
      lastAlertTime = millis();
    }
    delay(25);
    return;
  } else {
    wasPirDanger = false;
  }

  // 4. Cảnh báo Nhiệt độ cao
  if (isHighTempDanger) {
    if (!wasHighTempDanger || (now - lastAlertTime >= ALERT_REPEAT_MS)) {
      wasHighTempDanger = true;
      sendAlertToFirebase(
        "HIGH_TEMP",
        "warning",
        "🌡️ Cảnh báo nhiệt độ cao!",
        "Nhiệt độ tăng lên " + String(cachedTemp, 1) + "°C (Vượt ngưỡng " + String(highTempThreshold, 1) + "°C).",
        String(cachedTemp, 1) + "°C"
      );
      lastAlertTime = millis();
    }
    delay(25);
    return;
  } else {
    wasHighTempDanger = false;
  }

  // 5. Cảnh báo Nhiệt độ thấp
  if (isLowTempDanger) {
    if (!wasLowTempDanger || (now - lastAlertTime >= ALERT_REPEAT_MS)) {
      wasLowTempDanger = true;
      sendAlertToFirebase(
        "LOW_TEMP",
        "info",
        "❄️ Cảnh báo nhiệt độ thấp!",
        "Nhiệt độ hạ xuống " + String(cachedTemp, 1) + "°C (Dưới ngưỡng " + String(lowTempThreshold, 1) + "°C).",
        String(cachedTemp, 1) + "°C"
      );
      lastAlertTime = millis();
    }
    delay(25);
    return;
  } else {
    wasLowTempDanger = false;
  }

  setHardwareAlarm(false);
  delay(25);
}
