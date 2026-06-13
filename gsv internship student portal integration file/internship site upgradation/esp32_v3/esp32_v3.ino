

/**
 * V-VARMA RFID ATTENDANCE SYSTEM - ENHANCED INTEGRATED VERSION (FIXED)
 * Hardware: ESP32 + RDM6300 (RFID) + I2C LCD (16x2) + LED (Pin2) + Buzzer
 * (Pin25)
 *
 * Features (All gaps closed):
 * - 3-minute boot delay with scrolling intro
 * - Strict startup validation (WiFi, Internet, Database) – errors stay on
 * screen
 * - Exact home screen layout [MODE] [WiFi] [DB] [NET] [TIME]
 * - Step-by-step LCD flow (Card → Validating → Result → Name → Status)
 * - Extended status parsing (Present, Early/Late, Slot Over, Inventory Not
 * Assigned)
 * - Single-scan lock (no repeated reads)
 * - Time sync only once; 00:00 if no internet
 * - No background polling
 * - Real-time dashboard sync
 * - Complete inventory capture flow
 * - Instant RFID detection (non-blocking, HardwareSerial)
 **/

#include <ArduinoJson.h> // Install via Library Manager
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <esp_task_wdt.h>
#include <time.h>

// ArduinoJson 6/7 Compatibility
#if ARDUINOJSON_VERSION_MAJOR >= 7
#define JSON_DOC_TYPE JsonDocument
#else
#define JSON_DOC_TYPE DynamicJsonDocument
#endif

// ==================== CONFIGURATION ====================
#define FIRMWARE_VERSION "v7.0.1-ELITE"
#define DEVICE_NAME "vvarma-rfid"
#define AP_SSID "VARMA RFID SYSTEM"
#define AP_PASS "GSVRF001"
#define BOOT_DELAY_MS 10000 // 10sec  intro as per audio request

// Intervals moved to const globals for logic consistency

// ==================== PINS ====================
#define BTN_STATS 26
#define BTN_MODE 15
#define LED_PIN 2    // RED LED
#define LED_GREEN 13 // GREEN LED
#define BUZZER_PIN 25
#define RFID_RX_PIN 16

// ==================== ENUMS ====================
enum SystemState {
  BOOT_INTRO,
  BOOT_WIFI_INIT,
  BOOT_IP_SHOW,
  BOOT_VALIDATE,
  BOOT_ERROR,
  SYSTEM_READY,
  SYSTEM_WIFI_CONFIG,
  SYSTEM_PROCESSING,
  SYSTEM_RESULT,
  SYSTEM_INFO_SHOW
};

enum UIState {
  UI_HOME,
  UI_CARD,
  UI_VALIDATING,
  UI_RESULT,
  UI_ERROR,
  UI_INFO_SHOW
};

UIState uiState = UI_HOME;
unsigned long uiTimer = 0;
String uiMessage = "";

enum ResultStep {
  RES_NONE,
  RES_DENIED_1,
  RES_DENIED_2,
  RES_DENIED_3,
  RES_NAME,
  RES_REG,
  RES_COLLEGE,
  RES_SLOT,
  RES_STATUS_SUCCESS,
  RES_STATUS_DETAIL
};

ResultStep resultStep = RES_NONE;
unsigned long resultTimer = 0;

enum SyncStatus {
  SYNC_INITIAL,
  SYNC_OK,
  SYNC_WIFI_ERROR,
  SYNC_DATABASE_CONFIG_ERROR,
  SYNC_DATABASE_SYNC_ERROR
};

enum OperationMode { MODE_IN, MODE_OUT, MODE_INV, MODE_VERIFY };

enum ProcessStep {
  STEP_NONE,
  STEP_CARD_NUM,
  STEP_VALIDATING,
  STEP_RESULT,
  STEP_NAME,
  STEP_STATUS
};

// ==================== OBJECTS ====================
LiquidCrystal_I2C lcd(0x27, 16, 2);
Preferences preferences;
WebServer server(80);
DNSServer dnsServer;
HardwareSerial rfidSerial(2); // Use Serial2
// RFID_RX_PIN already defined above (Pin 16)

// ==================== GLOBALS ====================
volatile SystemState currentState = BOOT_INTRO;
OperationMode currentMode = MODE_IN;
ProcessStep currentStep = STEP_NONE;
volatile bool hasInternet = false;
volatile bool deviceVerified = false;
bool timeSynced = false;
String savedSSID = "", savedPass = "", scriptId = "";
String deviceUser = "", devicePass = ""; // ⭐️ ADDED: Mandatory Auth
String localIpStr = "0.0.0.0", myMac = "";
volatile SyncStatus currentSyncStatus = SYNC_INITIAL;
unsigned long lastErrorBeepTime = 0;
bool initialSyncDone = false;

// RFID Debounce & Scan Lock
const unsigned long RFID_DEBOUNCE_MS = 3000; // Ignore same card for 3s
const unsigned long SCAN_COOLDOWN_MS = 1500; // Min time between ANY scans
unsigned long lastSuccessfulScanTime = 0;
String lastScannedCard = "";
unsigned long lastScannedCardTime = 0;

unsigned long stateTimer = 0;
unsigned long lastLcdUpdate = 0;
unsigned long lastScrollTime = 0;
int scrollPosition = 0;

// RFID Buffer
char rfidBuffer[15];
int rfidIndex = 0;

// Web Log Infrastructure
String webSerialLog = "";
void webLog(String msg) {
  Serial.println(msg);
  webSerialLog += msg + "\n";
  if (webSerialLog.length() > 2000) {
    webSerialLog = webSerialLog.substring(1000); // Truncate old logs
  }
}
unsigned long rebootTimer = 0;
String lastCardNum = "---";
String lastUserName = "---";
String lastStatusMsg = "Scan Ready...";
String lastDetailedStatus = "";
String capturedUid = "--------";
String currentStatusText = "";
unsigned long lastRfidPacketTime = 0;
String lastRawUid = "";
bool cardInRange = false;

// 🔧 ADDED MISSING GLOBALS
volatile bool cardProcessing = false;
volatile bool lastResponseSuccess = false; // ⭐️ Track cloud response outcome
volatile bool scanLocked = false;          // ⭐️ Master scan lock
String currentCardNum = "";
String currentName = "";
String currentRegId = ""; // ⭐️ ADDED: Registration ID
String currentCollege = "";
String currentSlotTiming = "";
String currentPunchTime = "";
String currentDetailStatus = "";
int infoCycle = 0;        // 0: None, 1: MAC, 2: IP
unsigned long infoTimer = 0;
unsigned long lastScanTime = 0;
unsigned long lastSyncTime = 0; // For background heartbeat sync
const unsigned long HEARTBEAT_OK =
    900000; // 15 min regular heartbeat (Industrial Std)
const unsigned long HEARTBEAT_ERROR = 5000; // 5 sec recovery ping (Spec §11)
SemaphoreHandle_t lcdMutex;  // ⭐️ THREAD SAFETY: Mutex for LCD access
SemaphoreHandle_t syncMutex; // ⭐️ Priority lock for background sync

void lcdLock() {
  if (lcdMutex)
    xSemaphoreTake(lcdMutex, portMAX_DELAY);
}
void lcdUnlock() {
  if (lcdMutex)
    xSemaphoreGive(lcdMutex);
}
const unsigned long WDT_TIMEOUT = 1800000; // 30 mins system watchdog
unsigned long lastActivityTime = 0;        // For WDT Tracking
int syncFailureCount = 0; // Watchdog for repeated sync failures
const int MAX_SYNC_FAILURES =
    3; // Show error on LCD only after 3 failures (Industrial Stability)
bool serverStarted = false;
bool rfidAutomationMode = false; // ⭐️ ADDED: Persistence for Auto Assign
bool isDisplayingCommand = false;
unsigned long commandReceivedTime = 0;

// LCD Custom Icons
byte wifiIcon[8] = {0b00000, 0b01110, 0b10001, 0b00100,
                    0b01010, 0b00100, 0b00000, 0b00000};
byte netIcon[8] = {0b00000, 0b01110, 0b10001, 0b11111,
                   0b10101, 0b01110, 0b00100, 0b00000};
byte dbIcon[8] = {0b00000, 0b01110, 0b11111, 0b10011,
                  0b10101, 0b11001, 0b11111, 0b00000};
byte signal0[8] = {0b00000, 0b00000, 0b00000, 0b00000,
                   0b00000, 0b00000, 0b00000, 0b11111};
byte signal1[8] = {0b00000, 0b00000, 0b00000, 0b00000,
                   0b00000, 0b00000, 0b01110, 0b10001};
byte signal2[8] = {0b00000, 0b00000, 0b00000, 0b00000,
                   0b01110, 0b10001, 0b10001, 0b10001};
byte signal3[8] = {0b00000, 0b00000, 0b01110, 0b10001,
                   0b10001, 0b10001, 0b10001, 0b10001};
byte coffeeIcon[8] = {0b00000, 0b01010, 0b01010, 0b11111,
                      0b11111, 0b11111, 0b01110, 0b00000};

// ==================== PROTOTYPES ====================
void webLog(String msg);
void initializeLCD();
void mDNS_begin();
void setupWebServer();
void startAPMode();
void connectWiFi();
bool checkInternet();
void checkDB();
void factoryReset();
void updateUIEngine();
void scrollRow2(String text);
void setCustomIcons();
void beep(int freq, int duration);
String formatCardNumber(String hexUid);
void processCard(String uid);
void processCardTask(void *parameter);
void backgroundSyncTask(void *pvParameters);
void parseGoogleResponse(String response);
void saveInventoryToSheet(String uid);
void handleRFID();
void handleButtons();

void updateLcdConnectionIcons();
void showBootError(String errorMsg);
void updateRTC();
String getRTC();
void setRtcTime(String timeStr);
void logDeviceEvent(String event, String details);
void fetchSwitchStatus();

// Web Handlers
void serveAPLoginPage();
void serveConfigPage();
void handleDashboard();
void handleLogin();
void handleStatus();
void handleMode();
void handleCapture();
void handleSaveInventory();
void handleSaveNetwork();
void handleSaveSystem();
void handleFactoryReset();
void handleScanWiFi();
void handleLogs();
void handleInventory();
void handleValidate();
void handleResetDisplay();
void handleGetScriptId();
void fetchSwitchStatus(); // ⭐️ ADDED

// ==================== SETUP ====================
void setup() {
  // On ESP-IDF 5.x (Core 3.x), the TWDT is auto-initialized.
  // We simply disable it during setup to avoid spam during blocking boot.
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
  esp_task_wdt_deinit(); // Disable during setup
#endif

  Serial.begin(115200);
  rfidSerial.begin(9600, SERIAL_8N1, 16, -1); // Force Pin 16 for RX
  rfidSerial.setRxBufferSize(256);

  pinMode(BTN_STATS, INPUT_PULLUP);
  pinMode(BTN_MODE, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(LED_GREEN, LOW);

  // ⭐️ Initialize Mutex  // Threads & Locks
  lcdMutex = xSemaphoreCreateMutex();
  syncMutex = xSemaphoreCreateMutex();

  // Create Background Sync Task on Core 0 (Priority 1)
  xTaskCreatePinnedToCore(backgroundSyncTask, "SyncTask", 8192, NULL, 1, NULL,
                          0);

  Serial.println("System: Industrial Multi-Threading Initialized");

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcdLock();
  setCustomIcons();
  lcdUnlock();

  preferences.begin("gsv-rfid", false);
  savedSSID = preferences.getString("ssid", "");
  savedPass = preferences.getString("pass", "");
  scriptId = preferences.getString("scriptId", "");
  if (scriptId == "") {
    scriptId = ""; // No default, force portal config
  }
  deviceUser = preferences.getString("devUser", "admin");
  devicePass = preferences.getString("devPass", "password123");
  preferences.end();

  Serial.println("Hardware: Admin Credentials Loaded:");
  Serial.println("  User: " + deviceUser);
  Serial.println("  Pass: " + String(devicePass.length()) + " chars");

  // Initialize Network mode to get MAC ID
  WiFi.mode(WIFI_STA);
  delay(100);
  myMac = WiFi.macAddress();
  myMac.toUpperCase();
  webLog("System Booting: MAC ID is " + myMac);

  // 1. INTRO SCREEN (5 seconds as per request)
  lcdLock();
  lcd.clear();
  lcdUnlock();
  unsigned long startIntro = millis();
  while (millis() - startIntro < 5000) {
    lcdLock();
    lcd.setCursor(0, 0);
    lcd.print("  V-VARMA RFID  "); // 16 chars centered
    lcdUnlock();
    scrollRow2("Attndnce Sys V3 ");
    feedWatchdog(); // 🔥 FIX: Feed Watchdog during blocking loops
    delay(20);
  }

  // 2. CONFIGURATION VALIDATION (3 seconds)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Checking Config ");
  lcd.setCursor(0, 1);
  lcd.print("Please wait...  ");
  feedWatchdog();
  delay(3000);
  feedWatchdog();

  // AP MODE CHECK (Only if credentials are wiped)
  if (savedSSID == "") {
    webLog("Hardware: No credentials found. Mandatory AP Mode.");
    startAPMode();
  } else {
    // Try to connect to WiFi (maximum 3 attempts / 60 seconds)
    int retryCount = 0;
    bool connected = false;
    while (retryCount < 3) {
      handleButtons();
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Connecting WiFi:");
      lcd.setCursor(0, 1);
      lcd.print(savedSSID.substring(0, 16));

      WiFi.mode(WIFI_STA); // Use STA mode so AP isn't broadcast unnecessarily
      WiFi.setHostname(DEVICE_NAME);
      WiFi.begin(savedSSID.c_str(), savedPass.c_str());
      int counter = 0;
      while (WiFi.status() != WL_CONNECTED &&
             counter < 40) { // 20 seconds per cycle
        handleButtons();
        delay(500);
        lcdLock();
        lcd.setCursor(15, 0);
        lcd.print(counter % 2 == 0 ? "." : " ");
        lcdUnlock();
        feedWatchdog(); // 🔥 FIX: Prevents WiFi connection reboot loops
        counter++;
      }

      if (WiFi.status() == WL_CONNECTED) {
        connected = true;
        break;
      }

      retryCount++;
      webLog("WiFi: Attempt " + String(retryCount) + " failed. Retrying...");
      lcd.setCursor(0, 1);
      lcd.print("Retry #" + String(retryCount) + "...    ");
      feedWatchdog();
      delay(3000);
    }

    if (connected) {
      hasInternet = true;
      localIpStr = WiFi.localIP().toString();

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("WiFi Connected!");
      lcd.setCursor(0, 1);
      lcd.print("Signal: GOOD   ");
      delay(3000);

      // 1. IP Address Display (Static, 3 seconds)
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("IP Address:     ");
      lcd.setCursor(0, 1);
      {
        String ipShow = localIpStr;
        while (ipShow.length() < 16) ipShow += " ";
        lcd.print(ipShow.substring(0, 16));
      }
      delay(3000);

      // 2. MAC Address Display (Scrolling, 3 seconds)
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MAC Address:    ");
      {
        String macShow = myMac + "  ";
        unsigned long macStart = millis();
        int macOffset = 0;
        while (millis() - macStart < 3000) {
          lcd.setCursor(0, 1);
          String view = macShow.substring(macOffset) + macShow.substring(0, macOffset);
          lcd.print(view.substring(0, 16));
          delay(300);
          macOffset = (macOffset + 1) % macShow.length();
          feedWatchdog();
        }
      }

      // ⭐️ STABILIZED FLOW: Finalize Network identity
      WiFi.setHostname(DEVICE_NAME);
      delay(200);

      setupWebServer();
      mDNS_begin();

      webLog("System: Network Identity set as " + String(DEVICE_NAME));
      webLog("Dashboard: http://" + String(DEVICE_NAME) + ".local");

      if (scriptId != "") {
        // Clear LCD completely and show connecting status for 3 seconds
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Connecting DB...");
        lcd.setCursor(0, 1);
        lcd.print("Please wait...  ");
        delay(3000);

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Validating DB...");
        checkDB();

        // Database connection verification loop
        while (currentSyncStatus != SYNC_OK) {
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("DB Conn Failed! ");
          lcd.setCursor(0, 1);
          lcd.print("Retrying in 3s  ");
          for (int i = 0; i < 30; i++) {
            server.handleClient();
            delay(100);
            feedWatchdog();
          }
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("Validating DB...");
          checkDB();
          feedWatchdog();
        }

        initialSyncDone = true; // ✅ ONLY ONCE
        fetchSwitchStatus();
        delay(1000);
      } else {
        webLog("Hardware: Script ID missing. Skipping Cloud Sync.");
        currentSyncStatus = SYNC_DATABASE_CONFIG_ERROR;
        deviceVerified = false;
      }

      // Flush and drain any boot-up serial noise
      while (rfidSerial.available()) {
        rfidSerial.read();
      }
      delay(100);
      while (rfidSerial.available()) {
        rfidSerial.read();
      }

      currentState = SYSTEM_READY;
      webLog("Device Active: System Ready (Local Dashboard ON).");

      // ⭐️ STARTUP BEEP: System ready and home screen starting
      beep(1200, 200);
      delay(100);
      beep(1800, 300);

      return; // Success! Exit setup
    } else {
      // WiFi failed to connect after 3 attempts -> Activate AP mode!
      webLog("WiFi: Failed to connect after 3 attempts. Activating AP Mode.");
      startAPMode();
    }
  }
}

void loop() {
  handleRFID(); // 🔥 PRIORITY 1: Instant Detection

  // Local Sync / Reboot Logic
  if (rebootTimer > 0 && millis() > rebootTimer) {
    ESP.restart();
  }

  // UI Engine runs on high frequency (Core 1)
  static unsigned long lastUIRun = 0;
  if (!isDisplayingCommand && (millis() - lastUIRun > 100)) {
    updateUIEngine();
    lastUIRun = millis();
  }

  // Essential non-blocking background tasks
  server.handleClient();

  feedWatchdog();

  // Mode/Info Buttons - only when not processing
  if (!cardProcessing && !scanLocked) {
    handleButtons();
  }

  // ⭐️ FIX: Restore command display timeout (15 sec)
  if (isDisplayingCommand && (millis() - commandReceivedTime > 15000)) {
    isDisplayingCommand = false;
    lcd.clear();
  }

  // ⭐️ SAFETY: Stuck-state watchdog
  // If scanLocked is true for > 25s, force unlock
  static unsigned long stuckCheckTime = 0;
  if (scanLocked) {
    if (stuckCheckTime == 0) {
      stuckCheckTime = millis();
    } else if (millis() - stuckCheckTime > 25000) {
      webLog("SAFETY: Force-unlocking stuck scan lock!");
      scanLocked = false;
      cardProcessing = false;
      uiState = UI_HOME;
      currentStep = STEP_NONE;
      stuckCheckTime = 0;
    }
  } else {
    stuckCheckTime = 0;
  }

  // Auto-timeout for info screens (10 seconds)
  if (currentState == SYSTEM_INFO_SHOW && (millis() - infoTimer > 10000)) {
    currentState = SYSTEM_READY;
    uiState = UI_HOME;
    infoCycle = 0;
    lcd.clear();
  }

  // Periodic State Debug Print
  static unsigned long lastDebugPrint = 0;
  if (millis() - lastDebugPrint > 2000) {
    Serial.printf("STATE DEBUG: scanLocked=%d, cardProcessing=%d, currentSyncStatus=%d, currentState=%d, wifiStatus=%d\n",
                  scanLocked, cardProcessing, currentSyncStatus, currentState, WiFi.status());
    lastDebugPrint = millis();
  }
}

// 🌐 BACKGROUND SYNC TASK (Core 0)
// This task handles all blocking network calls so RFID detection stays instant.
void backgroundSyncTask(void *pvParameters) {
  for (;;) {
    unsigned long now = millis();

    // ⭐️ SYSTEM READY GATE: Do not run background sync tasks during boot setup
    if (currentState != SYSTEM_READY && currentState != SYSTEM_INFO_SHOW) {
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }

    // ⭐️ HARD BLOCK: Never do ANY network work during card processing
    if (cardProcessing || scanLocked) {
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }

    // ⭐️ PRIORITY LOCK: Only sync if idle on Home/Error screen
    if (isDisplayingCommand || (uiState != UI_HOME && uiState != UI_ERROR)) {
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }

    // ── WiFi MONITORING & RECOVERY ──
    static wl_status_t lastWiFiStatus = WL_IDLE_STATUS;
    static unsigned long disconnectStartTime = 0;
    wl_status_t currentWiFiStatus = WiFi.status();

    if (currentWiFiStatus == WL_CONNECTED) {
      disconnectStartTime = 0; // Reset disconnect timer
      if (lastWiFiStatus != WL_CONNECTED) {
        webLog("WiFi: Reconnected! Re-starting mDNS.");
        localIpStr = WiFi.localIP().toString();
        WiFi.setHostname(DEVICE_NAME);
        vTaskDelay(pdMS_TO_TICKS(500)); // Let stack stabilize
        mDNS_begin();
      }
    } else {
      // WiFi Disconnected - Background Reconnect
      if (disconnectStartTime == 0) {
        disconnectStartTime = now;
      }
      
      static unsigned long lastReconnectAttempt = 0;
      if (now - lastReconnectAttempt > 10000 && savedSSID != "") {
        WiFi.reconnect();
        lastReconnectAttempt = now;
        webLog("WiFi: Lost connection. Retrying...");
      }

      // If disconnected for more than 30 seconds, activate AP mode!
      if (now - disconnectStartTime > 30000 && currentState != SYSTEM_WIFI_CONFIG) {
        webLog("WiFi: Lost connection for >30s. Activating AP Mode.");
        startAPMode();
      }

      lastWiFiStatus = currentWiFiStatus;
      vTaskDelay(pdMS_TO_TICKS(1000));
      continue; // Skip all sync if WiFi is down
    }
    lastWiFiStatus = currentWiFiStatus;

    // ── ADAPTIVE SYNC: only sync in error mode (no heartbeat when OK) ──
    if (currentSyncStatus != SYNC_OK) {
      if (now - lastSyncTime > HEARTBEAT_ERROR || lastSyncTime == 0) {
        // Re-check: still safe to sync?
        if (!cardProcessing && !scanLocked) {
          xSemaphoreTake(syncMutex, portMAX_DELAY);
          if (WiFi.status() == WL_CONNECTED && scriptId != "") {
            // Internet check first (quick)
            hasInternet = checkInternet();

            if (hasInternet) {
              checkDB();
            } else {
              currentSyncStatus = SYNC_WIFI_ERROR;
            }
          }
          lastSyncTime = millis();
          xSemaphoreGive(syncMutex);
        }
      }
    }

    // ── PERIODIC INTERNET CHECK (separate from sync) ──
    static unsigned long lastNetCheck = 0;
    unsigned long netCheckInterval =
        (currentSyncStatus == SYNC_OK) ? 30000 : 5000;
    if (now - lastNetCheck > netCheckInterval) {
      if (!cardProcessing && !scanLocked) {
        hasInternet = checkInternet();
        lastNetCheck = now;
      }
    }

    // ── 30-MINUTE ONLINE HEARTBEAT ──
    static unsigned long lastOnlinePing = 0;
    if (now - lastOnlinePing > 1800000 ||
        lastOnlinePing == 0) { // 1800000 ms = 30 minutes
      if (!cardProcessing && !scanLocked && WiFi.status() == WL_CONNECTED &&
          hasInternet) {
        xSemaphoreTake(syncMutex, portMAX_DELAY);
        fetchSwitchStatus();
        lastOnlinePing = millis();
        xSemaphoreGive(syncMutex);
      } else if (lastOnlinePing == 0) {
        // Prevent immediate spamming if booting up without wifi
        lastOnlinePing = millis();
      }
    }

    // DNS Maintenance (Only in Config Mode)
    if (currentState == SYSTEM_WIFI_CONFIG) {
      dnsServer.processNextRequest();
    }

    vTaskDelay(pdMS_TO_TICKS(200)); // Keep task yielding
  }
}

void feedWatchdog() {
  // On ESP-IDF 5.x, we don't use TWDT for the main loop.
  // Our stuck-state watchdog in loop() handles lockup detection.
  // Just yield to prevent soft WDT triggers.
  yield();
}

void sendOnlineStatus() {
  if (scriptId == "")
    return;
  HTTPClient http;
  String url = "https://script.google.com/macros/s/" + scriptId +
               "/exec?action=online&mac=" + myMac;
  http.begin(url);
  http.GET();
  http.end();
  webLog("System: Executed 30 min online status ping");
}

// ==================== LCD FUNCTIONS ====================
void setCustomIcons() {
  lcd.createChar(0, wifiIcon);
  lcd.createChar(1, netIcon);
  lcd.createChar(2, dbIcon);
  lcd.createChar(3, signal0);
  lcd.createChar(4, signal1);
  lcd.createChar(5, signal2);
  lcd.createChar(6, signal3);
  lcd.createChar(7, coffeeIcon);
}

String getRTC() {
  if (!hasInternet)
    return "00:00:00";
  if (!timeSynced) {
    configTime(19800, 0, "pool.ntp.org", "time.google.com");
    timeSynced = true;
    return "00:00";
  }
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 100))
    return "00:00";
  char t[6];
  strftime(t, sizeof(t), "%H:%M", &timeinfo);
  return String(t);
}

String cleanLCD(String s) {
  String res = "";
  for (int i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c >= 32 && c <= 126)
      res += c; // Only printable ASCII
    else
      res += ' ';
  }
  return res;
}

void updateLCDRow1() {
  lcd.setCursor(0, 0);
  if (currentMode == MODE_VERIFY)
    lcd.print("VRF");
  else if (currentMode == MODE_INV)
    lcd.print("INV");
  else if (currentMode == MODE_IN)
    lcd.print("IN ");
  else
    lcd.print("OUT");

  lcd.print("  "); // 2 spaces

  // Icons: ☕ (Wifi), 🌐 (Net), 📦 (DB)
  if (WiFi.status() == WL_CONNECTED)
    lcd.write((uint8_t)7);
  else
    lcd.print("X");
  if (hasInternet)
    lcd.write((uint8_t)1);
  else
    lcd.print("X");
  if (currentSyncStatus == SYNC_OK)
    lcd.write((uint8_t)2);
  else
    lcd.print("X");

  lcd.print("   "); // Clear indices 8, 9, 10
  lcd.setCursor(11, 0);
  lcd.print(getRTC());
}

void scrollRow2(String text) {
  static unsigned long lastScroll = 0;
  static int index = 0;
  static String prev = "";

  if (text != prev) {
    index = 0;
    prev = text;
    lastScroll = 0; // Force immediate update on text change
  }

  // If text fits in 16 chars, just display it statically
  if (text.length() <= 16) {
    if (millis() - lastScroll > 500) { // Refresh rate for static text
      lastScroll = millis();
      String padded = text;
      while (padded.length() < 16)
        padded += " ";
      lcdLock();
      lcd.setCursor(0, 1);
      lcd.print(padded);
      lcdUnlock();
    }
    return;
  }

  // Scrolling for long text
  if (millis() - lastScroll > 300) {
    lastScroll = millis();

    String padded = text + "    ";
    int maxIndex = padded.length() - 16;
    if (maxIndex < 0)
      maxIndex = 0;

    String view = padded.substring(index, index + 16);

    lcdLock();
    lcd.setCursor(0, 1);
    lcd.print(view);
    lcdUnlock();

    index++;
    if (index > maxIndex)
      index = 0;
  }
}

void updateUIEngine() {
  if (!lcdMutex)
    return;

  // LED Status Handling (per spec: GREEN=ready, RED=error/processing)
  bool isReady = (uiState == UI_HOME && currentSyncStatus == SYNC_OK &&
                  !cardProcessing && !scanLocked);
  if (isReady) {
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_PIN, LOW);
  } else {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_PIN, HIGH);
  }

  // --- BOOT SCREENS (can use clear) ---
  if (currentState == BOOT_INTRO || currentState == BOOT_WIFI_INIT ||
      currentState == BOOT_IP_SHOW || currentState == SYSTEM_WIFI_CONFIG ||
      currentState == BOOT_ERROR) {
    static SystemState lastBootState = BOOT_INTRO;
    lcdLock();
    if (currentState != lastBootState) {
      lcd.clear();
      lastBootState = currentState;
    }
    if (currentState == BOOT_INTRO) {
      lcd.setCursor(0, 0);
      lcd.print("  V-VARMA RFID  ");
      lcdUnlock();
      scrollRow2("Attndnce Sys V3 ");
      return;
    }
    if (currentState == BOOT_WIFI_INIT) {
      lcd.setCursor(0, 0);
      lcd.print("WiFi Connecting ");
      lcd.setCursor(0, 1);
      lcd.print(savedSSID.substring(0, 16));
      lcdUnlock();
      return;
    }
    if (currentState == BOOT_IP_SHOW) {
      lcd.setCursor(0, 0);
      lcd.print("Assigned IP     ");
      lcd.setCursor(0, 1);
      lcd.print(localIpStr + "      ");
      lcdUnlock();
      return;
    }
    if (currentState == SYSTEM_WIFI_CONFIG) {
      lcd.setCursor(0, 0);
      lcd.print("Connect to WIFI ");
      lcdUnlock();
      scrollRow2(String(AP_SSID) + " ");
    }
    return;
  }

  // --- MAIN ENGINE (NON-BLOCKING, NO CLEAR) ---
  lcdLock();
  updateLCDRow1();
  lcdUnlock();

  switch (uiState) {
  case UI_HOME:
    if (!hasInternet)
      scrollRow2(">>> INTERNET DISCONNECTED <<< ");
    else if (currentSyncStatus == SYNC_WIFI_ERROR)
      scrollRow2(">>> WIFI SYNC ERROR <<< ");
    else if (currentSyncStatus == SYNC_DATABASE_CONFIG_ERROR)
      scrollRow2(">>> DATABASE CONFIG ERROR <<< ");
    else if (currentSyncStatus == SYNC_DATABASE_SYNC_ERROR)
      scrollRow2(">>> DATABASE ERROR <<< ");
    else
      scrollRow2(">>> Ready to Scan <<<");
    break;

  case UI_CARD:
    lcdLock();
    lcd.setCursor(0, 1);
    {
      String msg = "Card: " + currentCardNum;
      while (msg.length() < 16)
        msg += " ";
      lcd.print(msg);
    }
    lcdUnlock();

    if (millis() - uiTimer > 800) { // Reduced delay for snappier feel
      uiState = UI_VALIDATING;
      uiTimer = millis();
    }
    break;

  case UI_VALIDATING:
    scrollRow2(">>> Validating Please Wait <<<");
    break;

  case UI_RESULT: {
    String displayMsg = "";
    unsigned long elapsed = millis() - resultTimer;

    if (resultStep == RES_DENIED_1 || resultStep == RES_DENIED_2 || resultStep == RES_DENIED_3) {
      if (currentMode == MODE_VERIFY) {
        // VRF Mode Denied Path
        if (resultStep == RES_DENIED_1) {
          displayMsg = lastUserName; // Shows e.g. "Record Not Found"
          if (elapsed > 2000) {
            resultStep = RES_DENIED_2;
            resultTimer = millis();
          }
        } else if (resultStep == RES_DENIED_2) {
          displayMsg = lastDetailedStatus; // Shows e.g. "Add to Inventory"
          if (elapsed > 2000) {
            if (lastDetailedStatus == "Card Available") {
              resultStep = RES_DENIED_3;
              resultTimer = millis();
            } else {
              uiState = UI_HOME;
              resultStep = RES_NONE;
            }
          }
        } else if (resultStep == RES_DENIED_3) {
          displayMsg = lastStatusMsg; // Shows e.g. "Not Assigned"
          if (elapsed > 2000) {
            uiState = UI_HOME;
            resultStep = RES_NONE;
          }
        }
      } else {
        // Standard Attendance Mode Denied Path
        if (resultStep == RES_DENIED_1) {
          displayMsg = "Denied";
          if (elapsed > 2000) {
            resultStep = RES_DENIED_2;
            resultTimer = millis();
          }
        } else if (resultStep == RES_DENIED_2) {
          displayMsg = lastStatusMsg; // Shows the reason, e.g. "Portal Inactive: Please Activate" or "Slot Timing Over"
          if (elapsed > 2000) {
            resultStep = RES_DENIED_3;
            resultTimer = millis();
          }
        } else if (resultStep == RES_DENIED_3) {
          displayMsg = "Contact Admin";
          if (elapsed > 2000) {
            uiState = UI_HOME;
            resultStep = RES_NONE;
          }
        }
      }
    } else {
      // Success Path
      if (currentMode == MODE_VERIFY) {
        // VRF Verification Mode Success Flow:
        // Name -> RID -> College -> Slot Timing
        if (resultStep == RES_NAME) {
          displayMsg = currentName;
          if (elapsed > 2000) {
            resultStep = RES_REG;
            resultTimer = millis();
          }
        } else if (resultStep == RES_REG) {
          displayMsg = currentRegId;
          if (elapsed > 2000) {
            resultStep = RES_COLLEGE;
            resultTimer = millis();
          }
        } else if (resultStep == RES_COLLEGE) {
          displayMsg = currentCollege;
          if (elapsed > 2000) {
            resultStep = RES_SLOT;
            resultTimer = millis();
          }
        } else if (resultStep == RES_SLOT) {
          displayMsg = currentSlotTiming;
          if (elapsed > 2000) {
            uiState = UI_HOME;
            resultStep = RES_NONE;
          }
        }
      } else {
        // Standard Attendance Mode Success Flow:
        // Name -> RID -> Slot Timing -> Success - [Time] -> [Detail Status] (Present/Late/Checked Out/etc.)
        if (resultStep == RES_NAME) {
          displayMsg = currentName;
          if (elapsed > 2000) {
            resultStep = RES_REG;
            resultTimer = millis();
          }
        } else if (resultStep == RES_REG) {
          displayMsg = currentRegId;
          if (elapsed > 2000) {
            resultStep = RES_SLOT;
            resultTimer = millis();
          }
        } else if (resultStep == RES_SLOT) {
          displayMsg = currentSlotTiming;
          if (elapsed > 2000) {
            resultStep = RES_STATUS_SUCCESS;
            resultTimer = millis();
          }
        } else if (resultStep == RES_STATUS_SUCCESS) {
          displayMsg = "Success";
          if (currentPunchTime.length() > 0) {
            displayMsg += " - " + currentPunchTime;
          }
          if (elapsed > 2000) {
            resultStep = RES_STATUS_DETAIL;
            resultTimer = millis();
          }
        } else if (resultStep == RES_STATUS_DETAIL) {
          displayMsg = currentDetailStatus;
          if (elapsed > 2000) {
            uiState = UI_HOME;
            resultStep = RES_NONE;
          }
        }
      }
    }

    scrollRow2(displayMsg);
    break;
  }

  case UI_ERROR: {
    scrollRow2(">>> DATABASE ERROR <<<");
    // Recovery is now managed by adaptive heartbeats in systemControlBlock
    break;
  }

  case UI_INFO_SHOW:
    scrollRow2((infoCycle == 1 ? ("IP: " + localIpStr) : ("MAC: " + myMac)) +
               "   ");
    break;

  default:
    break;
  }
}

void showBootError(String errorMsg) {
  currentState = BOOT_ERROR;
  lastStatusMsg = errorMsg;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BOOT FAILURE");
  lcd.setCursor(0, 1);
  lcd.print(errorMsg);
  // Start AP mode anyway so user can reconfigure
  startAPMode();
}

bool isValidHex(String s) {
  if (s.length() < 10)
    return false;
  for (int i = 0; i < s.length(); i++) {
    char c = toupper(s[i]);
    if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F')))
      return false;
  }
  return true;
}

String formatCardNumber(String hexUid) {
  if (hexUid.length() < 6)
    return "0000000000";
  String hex6 = hexUid.substring(hexUid.length() - 6);
  long val = strtol(hex6.c_str(), NULL, 16);
  char buf[11];
  sprintf(buf, "%010ld", val);
  return String(buf);
}

// ==================== RFID HANDLING ====================
void handleRFID() {
  unsigned long now = millis();

  // ── DRAIN BUFFER when locked (always read to prevent overflow) ──
  if (scanLocked || cardProcessing) {
    static unsigned long lastBusyBeep = 0;
    bool cardDetectedWhileBusy = false;
    while (rfidSerial.available()) {
      byte b = rfidSerial.read();
      if (b == 0x03 && rfidIndex >= 12)
        cardDetectedWhileBusy = true;
      if (b == 0x02)
        rfidIndex = 0;
    }
    if (cardDetectedWhileBusy && (now - lastBusyBeep > 2000)) {
      beep(300, 100);
      webLog("RFID: Scan locked - rejected");
      lastBusyBeep = now;
    }
    return;
  }

  // ── STATE GATE: Only allow scanning when system is booted and NO DB ERROR ──
  if (currentState < SYSTEM_READY || currentSyncStatus != SYNC_OK) {
    while (rfidSerial.available())
      rfidSerial.read(); // drain
    return;
  }

  // ── COOLDOWN: Minimum gap between any two scans ──
  if (now - lastSuccessfulScanTime < SCAN_COOLDOWN_MS) {
    while (rfidSerial.available())
      rfidSerial.read(); // drain
    return;
  }

  while (rfidSerial.available()) {
    byte b = rfidSerial.read();
    Serial.printf("RFID Byte: 0x%02X (%c)\n", b, isPrintable(b) ? (char)b : '.');

    if (b == 0x02) {
      Serial.println("RFID: STX received");
      rfidIndex = 0;
      memset(rfidBuffer, 0, sizeof(rfidBuffer));
    } else if (b == 0x03) {
      if (rfidIndex >= 12) {
        rfidBuffer[rfidIndex] = '\0';
        String rawUid = String(rfidBuffer);

        if (isValidHex(rawUid)) {
          String hexId = rawUid.substring(0, 10);
          String cardNum = formatCardNumber(hexId);

          if (cardNum != "0000000000") {
            // ── DEBOUNCE: Same card within window → ignore ──
            if (cardNum == lastScannedCard &&
                (now - lastScannedCardTime < RFID_DEBOUNCE_MS)) {
              // Same card still on reader - silently ignore
              rfidIndex = 0;
              continue;
            }

            Serial.println("RDM6300 Valid: " + cardNum);
            lastScannedCard = cardNum;
            lastScannedCardTime = now;

            // ⭐️ LOCK immediately before any processing
            scanLocked = true;
            cardProcessing = true;

            // ⭐️ INSTANT FEEDBACK
            beep(1500, 150);
            uiState = UI_CARD;
            uiTimer = millis();
            currentCardNum = cardNum;

            processCard(cardNum);
          } else {
            webLog("RDM6300: Ignored null card read (noise).");
          }
        } else {
          webLog("RDM6300: Invalid hex packet ignored.");
        }
      }
      rfidIndex = 0;
    } else if (rfidIndex < 14 && isPrintable(b)) {
      rfidBuffer[rfidIndex++] = (char)b;
    }
  }
}

void processCardTask(void *parameter);

void processCard(String uid) {
  // Lock already set by handleRFID — don't re-check cardProcessing here

  // ⭐️ CRITICAL: Clear ALL stale state from previous scan
  lastResponseSuccess = false;
  lastUserName = "---";
  lastStatusMsg = "Scan Ready...";
  lastDetailedStatus = "";
  currentName = "";
  currentRegId = "";
  currentCollege = "";
  currentSlotTiming = "";
  currentPunchTime = "";
  currentDetailStatus = "";
  currentStep = STEP_CARD_NUM;

  capturedUid = uid;

  // Spawn validation task (higher priority than background sync)
  String *uidPtr = new String(uid);
  xTaskCreate(processCardTask, "rfid_task", 16384, (void *)uidPtr, 3, NULL);
}

void processCardTask(void *parameter) {
  String uid = *((String *)parameter);
  delete (String *)parameter;

  webLog("Process: Card detected " + uid);

  // Wait for UI to show card number (UI_CARD → UI_VALIDATING transition)
  int waitCount = 0;
  while (uiState == UI_CARD && waitCount < 200) { // Max 2s safety
    vTaskDelay(pdMS_TO_TICKS(10));
    waitCount++;
  }
  uiState = UI_VALIDATING;

  // ════════════════════════════════════════════════════
  //  PRIORITY VALIDATION CHAIN
  // ════════════════════════════════════════════════════

  // ── P1: WiFi ──
  if (WiFi.status() != WL_CONNECTED) {
    webLog("Process: P1 FAIL - WiFi disconnected.");
    lastUserName = "NO WIFI";
    lastDetailedStatus = "WiFi Disconnected";
    lastStatusMsg = "WiFi Disconnected";
    currentName = "NO WIFI";
    beep(400, 300);
    uiState = UI_RESULT;
    resultStep = RES_DENIED_1;
    resultTimer = millis();
    goto WAIT_AND_UNLOCK;
  }

  // ── P1b: Internet ──
  if (!hasInternet) {
    webLog("Process: P1 FAIL - No internet.");
    lastUserName = "NO INTERNET";
    lastDetailedStatus = "Check Connection";
    lastStatusMsg = "Check Connection";
    currentName = "NO INTERNET";
    beep(400, 300);
    uiState = UI_RESULT;
    resultStep = RES_DENIED_1;
    resultTimer = millis();
    goto WAIT_AND_UNLOCK;
  }

  // ── P2: Script ID ──
  if (scriptId == "") {
    webLog("Process: P2 FAIL - Script ID missing.");
    lastUserName = "CONFIG ERROR";
    lastDetailedStatus = "No Script ID";
    lastStatusMsg = "No Script ID";
    currentName = "CONFIG ERROR";
    beep(400, 300);
    uiState = UI_RESULT;
    resultStep = RES_DENIED_1;
    resultTimer = millis();
    goto WAIT_AND_UNLOCK;
  }

  // ── P2b: Database sync status ──
  if (currentSyncStatus != SYNC_OK) {
    webLog("Process: P2 FAIL - DB not verified. Status=" +
           String(currentSyncStatus));
    lastUserName = "DATABASE ERROR";
    lastDetailedStatus = "Device Not Verified";
    lastStatusMsg = "Device Not Verified";
    currentName = "DATABASE ERROR";
    beep(400, 300);
    uiState = UI_RESULT;
    resultStep = RES_DENIED_1;
    resultTimer = millis();
    goto WAIT_AND_UNLOCK;
  }

  // ── P3: Cloud API Call ──
  {
    webLog("Process: Pre-checks OK. Calling cloud...");
    currentStep = STEP_VALIDATING;

    String action =
        (currentMode == MODE_VERIFY)
            ? "check"
            : ((currentMode == MODE_INV)
                   ? "inventory"
                   : (currentMode == MODE_IN ? "checkin" : "checkout"));

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = "https://script.google.com/macros/s/" + scriptId +
                 "/exec?action=" + action + "&uid=" + uid + "&mac=" + myMac +
                 "&user=" + deviceUser + "&pass=" + devicePass;

    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

    int code = -1;
    // ⭐️ RETRY LOGIC: Google Apps Script TLS can fail transiently (HTTP -11)
    for (int attempt = 0; attempt < 3; attempt++) {
      if (http.begin(client, url)) {
        http.setTimeout(8000);
        code = http.GET();
        if (code == 200 || code == 302) {
          break; // Success
        }
        http.end();
        webLog("Cloud: Attempt " + String(attempt + 1) + " failed (HTTP " +
               String(code) + "). Retrying...");
      }
      if (attempt < 2) {
        vTaskDelay(pdMS_TO_TICKS(1000)); // Wait before retry
        client.stop();
        client.setInsecure(); // Re-init TLS
      }
    }

    if (code == 200 || code == 302) {
      String response = http.getString();
      http.end();
      webLog("Cloud: HTTP " + String(code) + " OK");
      parseGoogleResponse(response);

      // Route to correct UI result flow
      uiState = UI_RESULT;
      resultTimer = millis();
      if (lastResponseSuccess) {
        resultStep = RES_NAME;
      } else {
        resultStep = RES_DENIED_1;
      }
    } else {
      http.end();
      webLog("Cloud Error: HTTP " + String(code) + " after 3 attempts");
      lastUserName = "CLOUD ERROR";
      lastDetailedStatus = "Code: " + String(code);
      lastStatusMsg = "HTTP " + String(code);
      currentName = "CLOUD ERROR";
      beep(400, 600);
      uiState = UI_RESULT;
      resultStep = RES_DENIED_1;
      resultTimer = millis();
    }
  }

WAIT_AND_UNLOCK:
  // ⭐️ CRITICAL: Wait for UI result sequence to complete BEFORE unlocking
  // This prevents re-scanning while result is still being displayed
  {
    int safetyCounter = 0;
    while (uiState == UI_RESULT && safetyCounter < 2000) { // Max 20s safety
      vTaskDelay(pdMS_TO_TICKS(10));
      safetyCounter++;
    }
  }

  // ⭐️ FULL UNLOCK SEQUENCE
  currentStep = STEP_NONE;
  cardProcessing = false;
  lastSuccessfulScanTime = millis(); // Start cooldown timer

  // Small extra delay before unlocking scan to prevent immediate re-detect
  vTaskDelay(pdMS_TO_TICKS(500));
  scanLocked = false;

  webLog("Process: Scan unlocked. Ready for next card.");
  vTaskDelete(NULL);
}

// (startProcessingSteps logic merged into processCardTask)

void parseGoogleResponse(String response) {
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  DynamicJsonDocument doc(1024);
#endif

  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    if (response.indexOf("<html") != -1 ||
        response.indexOf("Google Accounts") != -1) {
      lastUserName = "DATABASE ERROR";
      lastDetailedStatus = "Script Private";
      webLog("ERROR: Google Script is PRIVATE. Change access to 'Anyone'.");
    } else {
      lastUserName = "DATABASE ERROR";
      lastDetailedStatus = "Bad Response";
      webLog("ERROR: JSON Parse failed. Length: " + String(response.length()));
    }
    beep(400, 300);
    delay(100);
    beep(400, 300);
    return;
  }

  if (doc["status"] == "success") {
    lastResponseSuccess = true;
    String name = doc["name"] | "Unknown";
    String regId = doc["regId"] | "";

    // ⭐️ VRF MODE REFINEMENT: If card is in inventory but student is unknown
    if (currentMode == MODE_VERIFY && (name == "Unknown" || regId == "")) {
      lastResponseSuccess = false; // Treat as "Denied path" to show Inventory msg
      lastUserName = "UNASSIGNED";
      lastDetailedStatus = "Inventory Available"; // Trigger "Record Found"
      lastStatusMsg = "Not Assigned";
      currentName = "UNASSIGNED";
      beep(400, 600);
      return;
    }

    lastUserName = name;
    currentName = lastUserName;
    currentRegId = regId;
    currentCollege = doc["college"] | "N/A";
    currentSlotTiming = doc["slotTiming"] | "N/A";
    currentPunchTime = doc["time"] | "";
    currentDetailStatus = doc["detailStatus"] | "";
    lastStatusMsg = doc["message"] | "Success";
    lastDetailedStatus = lastStatusMsg;
    beep(1500, 100);
    delay(80);
    beep(2000, 150);
  } else {
    lastResponseSuccess = false; // ⭐️ §3: Track validation failure
    String errName = doc["name"] | "Denied";
    String errMsg = doc["message"] | "Access Denied";

    if (errName == "UNAUTHORIZED") {
      lastUserName = "REGISTRY ERROR";
      lastDetailedStatus = "Device not Config";
      // ⭐️ Device-level error → re-enter DB Error Mode
      currentSyncStatus = SYNC_DATABASE_SYNC_ERROR;
      deviceVerified = false;
    } else if (errName == "BLOCKED") {
      lastUserName = "DEVICE BLOCKED";
      lastDetailedStatus = "Contact Admin";
      // ⭐️ Device-level error → re-enter DB Error Mode
      currentSyncStatus = SYNC_DATABASE_SYNC_ERROR;
      deviceVerified = false;
    } else if (errName == "DATABASE ERROR") {
      lastUserName = "DATABASE ERROR";
      lastDetailedStatus = errMsg;
      // ⭐️ Device auth failed → re-enter DB Error Mode with recovery pings
      currentSyncStatus = SYNC_DATABASE_SYNC_ERROR;
      deviceVerified = false;
    } else {
      // Card-level errors (TAG NOT FOUND, UNASSIGNED, etc.) → NOT a DB error
      lastUserName = errName;
      lastDetailedStatus = errMsg;
    }

    currentName = lastUserName;
    lastStatusMsg = lastDetailedStatus;
    
    // ⭐️ VRF MODE REFINEMENT: Suppress generic "Denied" message, use status codes
    if (currentMode == MODE_VERIFY) {
      String lowerMsg = lastStatusMsg;
      lowerMsg.toLowerCase();
      if (lowerMsg.indexOf("not found") != -1 || lowerMsg.indexOf("no record") != -1) {
         lastUserName = "Record Not Found";
         lastDetailedStatus = "Add To Inventory";
      } else if (lowerMsg.indexOf("unassigned") != -1 || lowerMsg.indexOf("available") != -1 || lastUserName == "UNASSIGNED") {
         lastUserName = "Record Found";
         lastDetailedStatus = "Card Available";
         lastStatusMsg = "Not Assigned";
      }
    }

    // ⭐️ DENIED BEEP (Slightly longer for registry errors)
    if (errName == "UNAUTHORIZED" || errName == "DATABASE ERROR") {
      beep(300, 1000);
    } else {
      beep(400, 600);
    }
  }
}

void fetchSwitchStatus() {
  if (WiFi.status() != WL_CONNECTED || scriptId == "")
    return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = "https://script.google.com/macros/s/" + scriptId +
               "/exec?action=get_switches&mac=" + myMac;

  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  if (http.begin(client, url)) {
    int code = http.GET();
    if (code == 200 || code == 302) {
      String response = http.getString();
#if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
#else
      DynamicJsonDocument doc(1024);
#endif
      DeserializationError error = deserializeJson(doc, response);
      if (!error && doc["status"] == "success") {
        // --- Process Remote Commands from Admin Panel ---
        if (doc.containsKey("command")) {
          String cmd = doc["command"] | "";
          if (cmd != "") {
            webLog("Cloud: Executing Remote Command: " + cmd);
            isDisplayingCommand = true;
            commandReceivedTime = millis();
            if (cmd == "SET_MODE_IN") {
              currentMode = MODE_IN;
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Remote Command:");
              lcd.setCursor(0, 1);
              lcd.print("Switching -> IN ");
              lcdUnlock();
              beep(1000, 100);
            } else if (cmd == "SET_MODE_OUT") {
              currentMode = MODE_OUT;
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Remote Command:");
              lcd.setCursor(0, 1);
              lcd.print("Switching -> OUT");
              lcdUnlock();
              beep(1000, 100);
            } else if (cmd == "SET_MODE_INV") {
              currentMode = MODE_INV;
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Remote Command:");
              lcd.setCursor(0, 1);
              lcd.print("Switching -> INV");
              lcdUnlock();
              beep(1000, 100);
            } else if (cmd == "REBOOT") {
              ESP.restart();
            } else if (cmd == "PING") {
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Hardware Ping:");
              lcd.setCursor(0, 1);
              lcd.print("Echo: 200 OK    ");
              lcdUnlock();
              beep(1500, 100);
              delay(100);
              beep(1500, 100);
            } else {
              isDisplayingCommand = false;
            }
          }
        }
      }
    }
    http.end();
  }
}

void saveInventoryToSheet(String uid) {
  if (!hasInternet || scriptId == "") {
    lastStatusMsg = "Cannot save: no internet";
    return;
  }
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = "https://script.google.com/macros/s/" + scriptId +
               "/exec?action=inventory&uid=" + uid + "&mac=" + myMac;
  // 🔧 FIXED: use the library constant directly
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  if (http.begin(client, url)) {
    int code = http.GET();
    if (code == 200 || code == 302) {
      lastStatusMsg = "Inventory saved";
      beep(2500, 100);
    } else {
      lastStatusMsg = "Save failed";
    }
    http.end();
  }
}

// ==================== BUTTON HANDLING ====================
void handleButtons() {
  if (millis() < 3000) {
    // Ignore startup pin glitches during boot
    return;
  }

  static bool lastStatsState = HIGH;
  static bool lastModeState = HIGH;
  static unsigned long statsPressStart = 0;
  static unsigned long modePressStart = 0;

  bool statsPressed = (digitalRead(BTN_STATS) == LOW);
  bool modePressed = (digitalRead(BTN_MODE) == LOW);

  // Stats button (Pin 26) - Long press reset, Short press Toggle Info
  if (statsPressed && !lastStatsState)
    statsPressStart = millis();
  if (!statsPressed && lastStatsState && statsPressStart > 0) {
    unsigned long dur = millis() - statsPressStart;
    if (dur > 5000) {
      factoryReset();
    } else if (dur > 50) {
      // Cycle: Home (0) -> IP (1) -> MAC (2) -> Home (0)
      if (currentState == SYSTEM_READY || currentState == SYSTEM_INFO_SHOW) {
        infoCycle = (infoCycle + 1) % 3;
        if (infoCycle == 0) {
          currentState = SYSTEM_READY;
          uiState = UI_HOME;
        } else {
          currentState = SYSTEM_INFO_SHOW;
          uiState = UI_INFO_SHOW;
          infoTimer = millis();
          beep(1200, 100);
          webLog("UI: Showing " + String(infoCycle == 1 ? "IP" : "MAC"));
        }
      }
    }
    statsPressStart = 0;
  }

  // Mode button (Pin 15) - Short press toggle IN/OUT, Long press for Inventory
  if (modePressed && !lastModeState)
    modePressStart = millis();
  if (!modePressed && lastModeState && modePressStart > 0) {
    if (millis() - modePressStart > 3000) {
      currentMode = MODE_INV;
      beep(1500, 200);
    } else if (millis() - modePressStart > 50) {
      if (currentMode == MODE_INV)
        currentMode = MODE_IN;
      else if (currentMode == MODE_IN)
        currentMode = MODE_OUT;
      else if (currentMode == MODE_OUT)
        currentMode = MODE_VERIFY;
      else
        currentMode = MODE_IN;
      beep(1000, 100);
    }
    modePressStart = 0;
  }

  lastStatsState = statsPressed;
  lastModeState = modePressed;
}

void beep(int freq, int duration) { tone(BUZZER_PIN, freq, duration); }

// ==================== WIFI & NETWORK ====================
void connectWiFi() {
  if (savedSSID == "" || scriptId == "") {
    startAPMode();
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_NAME);
  WiFi.begin(savedSSID.c_str(), savedPass.c_str());
  Serial.println("Attempting connection to: " + savedSSID);

  // We don't block infinitely here; loop() handles the IP assigned transition
  // But we give it a few seconds initially
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 5000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    localIpStr = WiFi.localIP().toString();
    configTime(19800, 0, "pool.ntp.org", "time.google.com");
    timeSynced = true;
  }
}

bool checkInternet() {
  HTTPClient http;
  http.begin("http://clients3.google.com/generate_204");
  http.setTimeout(3000);
  int code = http.GET();
  http.end();
  return (code == 200 || code == 204);
}

void checkDB() {
  if (scriptId == "")
    return;

  if (myMac == "" || myMac == "00:00:00:00:00:00") {
    myMac = WiFi.macAddress();
    myMac.toUpperCase();
    webLog("Hardware: MAC re-captured: " + myMac);
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String rssi = String(WiFi.RSSI());
  String ip = WiFi.localIP().toString();

  String url = "https://script.google.com/macros/s/" + scriptId +
               "/exec?action=check_device&mac=" + myMac + "&rssi=" + rssi +
               "&ip=" + ip +
               "&user=" + (deviceUser == "" ? "admin" : deviceUser) +
               "&pass=" + (devicePass == "" ? "password123" : devicePass);

  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  if (http.begin(client, url)) {
    http.setTimeout(8000); // ⭐️ OPTIMIZED: 8s timeout for background sync
    int code = http.GET();
    // webLog("DB: Response Code: " + String(code));
    if (code == 200 || code == 302) {
      String res = http.getString();
      String escapedRes = res;
      escapedRes.replace("\r", " ");
      escapedRes.replace("\n", " ");
      webLog("DB: RAW RES: [" + escapedRes + "]");
      JSON_DOC_TYPE doc;
      DeserializationError error = deserializeJson(doc, res);

      if (!error) {
        if (doc.containsKey("command")) {
          String cmd = doc["command"] | "";
          if (cmd.startsWith("HANDSHAKE:")) {
            webLog("Handshake: Request Received: " + cmd);
            int firstColon = cmd.indexOf(':');
            int secondColon = cmd.indexOf(':', firstColon + 1);
            if (secondColon != -1) {
              String hUser = cmd.substring(firstColon + 1, secondColon);
              String hPass = cmd.substring(secondColon + 1);
              bool hMatch = (hUser == deviceUser && hPass == devicePass);

              String reportUrl =
                  "https://script.google.com/macros/s/" + scriptId +
                  "/exec?action=handshake_result&mac=" + myMac +
                  "&success=" + String(hMatch ? "true" : "false") +
                  "&ip=" + WiFi.localIP().toString();

              WiFiClientSecure rClient;
              rClient.setInsecure();
              HTTPClient rHttp;
              rHttp.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
              if (rHttp.begin(rClient, reportUrl)) {
                rHttp.GET();
                rHttp.end();
                webLog("Handshake: Result sent to cloud -> " +
                       String(hMatch ? "SUCCESS" : "FAILED"));
                // Visual/Audio Feedback
                if (hMatch) {
                  digitalWrite(LED_GREEN, HIGH);
                  beep(1000, 100);
                  delay(50);
                  beep(1500, 150);
                  digitalWrite(LED_GREEN, LOW);
                } else {
                  digitalWrite(LED_PIN, HIGH);
                  beep(400, 500);
                  digitalWrite(LED_PIN, LOW);
                }
              }
              // ⭐️ HANDSHAKE COMPLETED: Return to home screen immediately
              isDisplayingCommand = false;
              lcdLock();
              lcd.clear();
              lcdUnlock();
            }
          }
        }
        // -----------------------
        String status = doc["status"] | "";
        String msg = doc["message"] | "";

        deviceVerified = (status == "REGISTERED" || status == "ok" ||
                          status == "success" || status == "SUCCESS");

        if (deviceVerified) {
          currentSyncStatus = SYNC_OK;
          initialSyncDone = true;
        } else {
          currentSyncStatus = SYNC_DATABASE_SYNC_ERROR;
          if (status == "NOT_REGISTERED" || status == "PENDING") {
            lastDetailedStatus = "Awaiting Approval";
          } else {
            lastDetailedStatus = "DATABASE ERROR";
          }
          // ⭐️ ERROR BEEP: Unauthorized or Database issue detected
          beep(300, 1000);
        }

        syncFailureCount = 0;

        // Process Commands...
        if (doc.containsKey("command")) {
          String cmd = doc["command"] | "";
          if (cmd != "") {
            commandReceivedTime = millis();
            isDisplayingCommand = true;
            if (cmd == "SET_MODE_IN") {
              currentMode = MODE_IN;
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Remote Command:");
              lcd.setCursor(0, 1);
              lcd.print("Switching -> IN ");
              lcdUnlock();
              beep(1000, 100);
            } else if (cmd == "SET_MODE_OUT") {
              currentMode = MODE_OUT;
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Remote Command:");
              lcd.setCursor(0, 1);
              lcd.print("Switching -> OUT");
              lcdUnlock();
              beep(1000, 100);
            } else if (cmd == "SET_MODE_INV") {
              currentMode = MODE_INV;
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Remote Command:");
              lcd.setCursor(0, 1);
              lcd.print("Switching -> INV");
              lcdUnlock();
              beep(1000, 100);
            } else if (cmd == "RFID_CAPTURE_START") {
              currentMode = MODE_INV;
              capturedUid = "--------";
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Remote Capture:");
              lcd.setCursor(0, 1);
              lcd.print("Place Card Now  ");
              lcdUnlock();
              beep(1200, 200);
            } else if (cmd == "PING") {
              lcdLock();
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Hardware Ping:");
              lcd.setCursor(0, 1);
              lcd.print("Echo: 200 OK    ");
              lcdUnlock();
              beep(1500, 100);
              delay(100);
              beep(1500, 100);
              // ⭐️ STARTUP FANFARE
              delay(500);
              beep(800, 100);
              delay(100);
              beep(1000, 100);
              delay(100);
              beep(1200, 300);
            }
          }
        }
      } else {
        webLog("DB: JSON Error: " + String(error.c_str()));
        webLog("DB: Code: " + String(code));
        if (res.length() > 0) {
          webLog("DB: Start of Payload: " + res.substring(0, 100));
        } else {
          webLog("DB: Payload was EMPTY");
        }
        currentSyncStatus = SYNC_DATABASE_CONFIG_ERROR;
        lastStatusMsg = "DB: Invalid Resp";
      }

      webLog(deviceVerified ? "DB: Verified OK" : "DB: Verification Failed");
    } else {
      String err = "DB Error: HTTP " + String(code);
      webLog(err);
      if (code == 404)
        currentSyncStatus = SYNC_DATABASE_CONFIG_ERROR;
      else
        currentSyncStatus = SYNC_DATABASE_SYNC_ERROR;

      deviceVerified = false;
      syncFailureCount++;
      webLog("DB: Sync Failure #" + String(syncFailureCount) +
             " - HTTP Code: " + String(code));
    }
    http.end();
  } else {
    currentSyncStatus = SYNC_DATABASE_SYNC_ERROR;
    webLog("DB: Could not start HTTP connection");
  }
}

void initializeLCD() {
  Wire.begin(21, 22);
  Wire.setClock(100000); // 100kHz for stability
  if (lcdMutex == NULL)
    lcdMutex = xSemaphoreCreateMutex();
  lcdLock();
  lcd.init();
  delay(100);
  lcd.backlight();
  setCustomIcons();
  lcdUnlock();
}

void mDNS_begin() {
  bool staActive = (WiFi.status() == WL_CONNECTED);
  bool apActive = (WiFi.softAPIP() != IPAddress(0, 0, 0, 0) && (WiFi.getMode() == WIFI_AP || WiFi.getMode() == WIFI_AP_STA));

  if (!staActive && !apActive)
    return;

  // ⭐️ REFRESH: Always end before begin to clear cache/sockets
  MDNS.end();

  if (MDNS.begin(DEVICE_NAME)) {
    MDNS.addService("http", "tcp", 80);
    // Add TXT records for enhanced discovery
    MDNS.addServiceTxt("http", "tcp", "id", myMac);
    MDNS.addServiceTxt("http", "tcp", "ver", FIRMWARE_VERSION);

    webLog("Responder: mDNS active at http://" + String(DEVICE_NAME) +
           ".local");
  } else {
    webLog("CRITICAL: mDNS startup failed");
  }
}

void startAPMode() {
  currentState = SYSTEM_WIFI_CONFIG;

  if (savedSSID == "") {
    WiFi.mode(WIFI_AP); // Only AP mode, do not open STA mode since credentials are empty
  } else {
    WiFi.mode(WIFI_AP_STA); // Use AP_STA to allow scanning while in AP mode
  }
  WiFi.softAP(AP_SSID, AP_PASS);
  delay(1000);
  IPAddress apIP = WiFi.softAPIP();
  localIpStr = apIP.toString();

  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(53, "*", apIP);
  setupWebServer();
  mDNS_begin(); // Call mDNS_begin so that http://vvarma-rfid.local works in AP mode!

  Serial.println("\n=== AP MODE STARTED ===");
  Serial.print("SSID: ");
  Serial.println(AP_SSID);
  Serial.print("Password: ");
  Serial.println(AP_PASS);
  Serial.print("IP: ");
  Serial.println(apIP);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("AP: CONFIGURE");
  lcd.setCursor(0, 1);
  lcd.print(apIP.toString());
}

void factoryReset() {
  lcd.clear();
  lcd.print("FACTORY RESET...");
  lcd.setCursor(0, 1);
  lcd.print("Please Wait");
  preferences.begin("gsv-rfid", false);
  preferences.clear();
  preferences.end();
  delay(2000);
  ESP.restart();
}

// ==================== AUTH HELPER ====================
bool isAuth() {
  lastActivityTime = millis(); // ⭐️ Track web activity
  if (server.hasHeader("Cookie")) {
    String cookie = server.header("Cookie");
    if (cookie.indexOf("VARMA_SID_V4_SECURE=GSV_OS_TRUSTED") != -1)
      return true;
  }
  return false;
}

// ==================== WEB SERVER ====================
void setupWebServer() {
  if (serverStarted)
    return;

  const char *headerkeys[] = {"Cookie"};
  size_t headerkeyssize = sizeof(headerkeys) / sizeof(char *);
  server.collectHeaders(headerkeys, headerkeyssize);

  server.on("/", []() {
    bool authed = isAuth();
    if (currentState == SYSTEM_WIFI_CONFIG) {
      if (authed)
        serveConfigPage();
      else
        serveAPLoginPage();
    } else {
      // In STA Mode, we redirect to dashboard which handles its own overlay
      // login
      server.sendHeader("Location", "/dashboard", true);
      server.send(302, "text/plain", "");
    }
  });
  // Captive portal redirects
  server.on("/generate_204", []() {
    server.sendHeader("Location", "http://" + WiFi.softAPIP().toString() + "/",
                      true);
    server.send(302, "text/plain", "");
  });
  server.on("/hotspot-detect.html", []() {
    server.sendHeader("Location", "http://" + WiFi.softAPIP().toString() + "/",
                      true);
    server.send(302, "text/plain", "");
  });
  server.on("/library/test/success.html", []() {
    server.sendHeader("Location", "http://" + WiFi.softAPIP().toString() + "/",
                      true);
    server.send(302, "text/plain", "");
  });
  server.on("/connecttest.txt", []() {
    server.sendHeader("Location", "http://" + WiFi.softAPIP().toString() + "/",
                      true);
    server.send(302, "text/plain", "");
  });
  server.on("/ncsi.txt", []() {
    server.sendHeader("Location", "http://" + WiFi.softAPIP().toString() + "/",
                      true);
    server.send(302, "text/plain", "");
  });

  server.on("/serve_config", []() {
    if (currentState == SYSTEM_WIFI_CONFIG)
      serveConfigPage();
    else
      server.send(403, "text/plain", "Forbidden");
  });

  server.on("/serial_data", []() {
    server.send(200, "text/plain", webSerialLog);
    webSerialLog = ""; // Clear after sending to avoid duplicates
  });
  server.on("/dashboard", handleDashboard);
  server.on("/login", handleLogin); // Allow GET/POST
  server.on("/status", handleStatus);
  server.on("/mode", handleMode);
  server.on("/capture", handleCapture);
  server.on("/sync", handleSaveInventory); // New mapping for 'SAVE TO CLOUD'
  server.on("/save_inventory", HTTP_POST, handleSaveInventory);
  server.on("/save_net", handleSaveNetwork);
  server.on("/save_sys", handleSaveSystem);
  server.on("/factory_reset", handleFactoryReset);
  server.on("/scan_wifi", handleScanWiFi);
  server.on("/logs", handleLogs);
  server.on("/inventory", handleInventory);
  server.on("/validate", handleValidate);
  server.on("/reset_display", handleResetDisplay);
  server.on("/get_script_id", handleGetScriptId);

  server.onNotFound([]() {
    if (currentState == SYSTEM_WIFI_CONFIG) {
      server.sendHeader("Location",
                        "http://" + WiFi.softAPIP().toString() + "/", true);
      server.send(302, "text/plain", "");
    } else {
      server.send(404, "text/plain", "Not Found");
    }
  });
  server.begin();
  serverStarted = true;
}

void serveAPLoginPage() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>V-VARMA | Secure Access</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --v-orange: #f39c12;
            --bg-dark: #0d0d0d;
            --card-bg: #1a1a1a;
            --border-color: #333;
        }
        * { margin:0; padding:0; box-sizing:border-box; font-family:'Space Grotesk', sans-serif; }
        body { 
            background: var(--bg-dark); 
            color: #eee; 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            backdrop-filter: blur(20px);
        }
        .login-card {
            background: var(--card-bg); border: 2px solid var(--v-orange); border-radius: 28px;
            padding: 3rem; width: 95%; max-width: 420px; text-align: center;
            box-shadow: 0 0 60px rgba(243,156,18,0.2);
        }
        .v-shield-logo-big { 
            width: 120px; height: 120px; color: var(--v-orange); margin: 0 auto 1rem auto; 
            filter: drop-shadow(0 0 15px rgba(243,156,18,0.5)); 
        }
        .login-subtext { font-size: 0.9rem; color: #888; text-transform: lowercase; margin-bottom: 2rem; }
        .input-group-v { position: relative; margin-bottom: 1.2rem; text-align: left; }
        .v-input {
            width: 100%; background: #0a0a0a; border: 2px solid var(--border-color);
            padding: 1rem; border-radius: 12px; color: white; outline: none; transition: 0.3s;
        }
        .v-input:focus { border-color: var(--v-orange); }
        .btn-v { 
            width: 100%; padding: 1rem; border-radius: 12px; font-weight: 800; text-transform: uppercase;
            transition: 0.3s; border: none; background: linear-gradient(135deg, #8B4513, #f39c12); color: white;
            cursor: pointer; font-size: 0.9rem; letter-spacing: 1px;
        }
        .btn-v:active { transform: scale(0.98); }
        .error-msg { color: #ff4d4d; font-size: 0.8rem; margin-top: 1rem; display: block; }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="v-shield-logo-big">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
                <path d="M466.5 83.7l-192-80c-11.8-4.9-25.2-4.9-37 0l-192 80C27.3 91.3 16 108.3 16 128c0 198.5 114.5 335.7 221.5 380.3 11.8 4.9 25.1 4.9 36.9 0C381.5 463.7 496 326.5 496 128c0-19.7-11.3-36.7-29.5-44.3z" fill="currentColor"/>
                <path d="M160 160 C180 250 220 380 256 400 C300 350 340 220 360 160" fill="none" stroke="var(--bg-dark)" stroke-width="45" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h1 style="letter-spacing: 4px; font-weight: 800; margin-bottom: 0.5rem;">V-VARMA</h1>
        <div class="login-subtext">Configuration Access Mode</div>
        
        <div class="input-group-v">
            <input type="text" id="login-user" class="v-input" value="admin" placeholder="Admin Username" required>
        </div>
        <div class="input-group-v">
            <input type="password" id="login-pass" class="v-input" placeholder="Security Key" required>
            <i class="fa-solid fa-eye eye-icon" onclick="togglePass('login-pass', this)" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: #555; cursor: pointer;"></i>
        </div>
        
        <div class="input-group-v" style="display: flex; align-items: center; gap: 10px; margin-top: -0.5rem; margin-bottom: 1.5rem;">
            <input type="checkbox" id="remember" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--v-orange);">
            <label for="remember" style="font-size: 0.85rem; color: #888; cursor: pointer; user-select: none;">Stay logged in (365 days)</label>
        </div>

        <button onclick="doLogin()" class="btn-v">Unlock System</button>
        <div id="login-err" class="error-msg" style="display:none;">Verification Failed: Invalid Key</div>
        
        <script>
            function togglePass(id, el) {
                const inp = document.getElementById(id);
                if (inp.type === 'password') {
                    inp.type = 'text';
                    el.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    inp.type = 'password';
                    el.classList.replace('fa-eye-slash', 'fa-eye');
                }
            }
            async function doLogin() {
                const u = document.getElementById('login-user').value;
                const p = document.getElementById('login-pass').value;
                const r = document.getElementById('remember').checked ? 1 : 0;
                const err = document.getElementById('login-err');
                err.style.display = 'none';
                
                try {
                    const res = await fetch(`/login?u=${u}&p=${p}&r=${r}`);
                    const data = await res.json();
                    if (data.success) {
                        location.href = '/';
                    } else {
                        err.style.display = 'block';
                    }
                } catch(e) { 
                    err.innerText = "Connection Error";
                    err.style.display = 'block';
                }
            }
        </script>
    </div>
</body>
</html>
)rawliteral";
  server.send(200, "text/html", html);
}

void serveConfigPage() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>V-VARMA | System Configuration</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --v-orange: #f39c12;
            --v-brown: #8B4513;
            --v-green: #2ecc71;
            --bg-dark: #0d0d0d;
            --card-bg: #1a1a1a;
            --border-color: #333;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Space Grotesk', sans-serif; }
        body { background: var(--bg-dark); color: #eee; min-height: 100vh; padding: 20px; }
        .input-group-v { position: relative; margin-bottom: 1.5rem; }
        .eye-icon { 
            position: absolute; right: 15px; top: 50%; transform: translateY(-50%); 
            color: #555; cursor: pointer; transition: 0.2s; z-index: 10;
        }
        .eye-icon:hover { color: var(--v-orange); }
        .container { max-width: 600px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .v-shield-logo { width: 80px; height: 80px; color: var(--v-orange); margin: 0 auto 10px; }
        .v-card {
            background: var(--card-bg); border: 2px solid var(--border-color);
            border-radius: 24px; padding: 2rem; margin-bottom: 1.5rem;
            border-left: 6px solid var(--v-brown);
        }
        .card-title { color: var(--v-orange); font-weight: 800; text-transform: uppercase; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; }
        .input-label { display: block; font-size: 0.75rem; color: #888; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px; }
        .v-input {
            width: 100%; background: #0a0a0a; border: 2px solid var(--border-color);
            padding: 1rem; border-radius: 12px; color: white; outline: none; margin-bottom: 1.5rem;
        }
        .v-input:focus { border-color: var(--v-orange); }
        .btn-v { 
            width: 100%; padding: 1rem; border-radius: 12px; font-weight: 800; text-transform: uppercase;
            border: none; cursor: pointer; transition: 0.3s; font-size: 0.85rem;
        }
        .btn-v-orange { background: linear-gradient(135deg, var(--v-brown), var(--v-orange)); color: white; }
        .btn-v-blue { background: #2980b9; color: white; margin-bottom: 1rem; }
        .wifi-list { max-height: 200px; overflow-y: auto; background: #0a0a0a; border-radius: 12px; margin-bottom: 1.5rem; display: none; border: 1px solid #333; }
        .wifi-item { padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #222; display: flex; justify-content: space-between; font-size: 0.85rem; }
        .wifi-item:hover { background: #111; color: var(--v-orange); }
        #status-msg { text-align: center; font-size: 0.85rem; margin-top: 1rem; }
        .mac-info { font-size: 0.7rem; color: #555; text-align: center; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="v-shield-logo">
                <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
                    <path d="M466.5 83.7l-192-80c-11.8-4.9-25.2-4.9-37 0l-192 80C27.3 91.3 16 108.3 16 128c0 198.5 114.5 335.7 221.5 380.3 11.8 4.9 25.1 4.9 36.9 0C381.5 463.7 496 326.5 496 128c0-19.7-11.3-36.7-29.5-44.3z" fill="currentColor"/>
                    <path d="M160 160 C180 250 220 380 256 400 C300 350 340 220 360 160" fill="none" stroke="#2c3e50" stroke-width="45" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h2 style="letter-spacing: 2px;">V-VARMA</h2>
            <div class="mac-info">MAC: )rawliteral" +
                myMac + R"rawliteral(</div>
        </div>

        <div class="v-card">
            <div class="card-title"><i class="fas fa-wifi"></i> AP Mode - WiFi Credential Integration</div>
            <label class="input-label">Available SSIDs</label>
            <button class="btn-v btn-v-blue" onclick="scanWiFi()">Scan for Networks</button>
            <div id="wifiList" class="wifi-list"></div>
            
            <label class="input-label">SSID</label>
            <input type="text" id="ssid" class="v-input" placeholder="Select or type SSID">
            
            <label class="input-label">Security Key</label>
            <div class="input-group-v">
                <input type="password" id="pass" class="v-input" placeholder="WiFi Password">
                <i class="fa-solid fa-eye eye-icon" onclick="togglePass('pass', this)"></i>
            </div>

            <div class="card-title" style="margin-top: 1rem;"><i class="fas fa-lock"></i> Admin Credentials</div>
            <label class="input-label">Admin Name</label>
            <input type="text" id="devUser" class="v-input" value=")rawliteral" +
                deviceUser + R"rawliteral(">
            
            <label class="input-label">Admin Password</label>
            <div class="input-group-v">
                <input type="password" id="devPass" class="v-input" value=")rawliteral" +
                devicePass + R"rawliteral(">
                <i class="fa-solid fa-eye eye-icon" onclick="togglePass('devPass', this)"></i>
            </div>

            <div class="card-title" style="margin-top: 1rem;"><i class="fas fa-link"></i> Cloud Sync</div>
            <label class="input-label">Google Script ID</label>
            <input type="text" id="scriptId" class="v-input" placeholder="AKfycb..." value=")rawliteral" +
                scriptId + R"rawliteral(">
            
            <button class="btn-v btn-v-orange" onclick="save()">Initialize & Reboot</button>
            <div id="status-msg"></div>
            <div class="mac-info" style="margin-top: 1.5rem; border-top: 1px solid #333; padding-top: 1rem;">
                DEVICE MAC: <span style="color:var(--v-orange)">)rawliteral" +
                myMac + R"rawliteral(</span>
            </div>
        </div>
    </div>

    <script>
        function togglePass(id, el) {
            const inp = document.getElementById(id);
            if (inp.type === 'password') {
                inp.type = 'text';
                el.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                inp.type = 'password';
                el.classList.replace('fa-eye-slash', 'fa-eye');
            }
        }
        async function scanWiFi() {
            const list = document.getElementById('wifiList');
            list.style.display = 'block';
            list.innerHTML = '<div style="padding:15px; color:#888;">Scanning...</div>';
            try {
                const res = await fetch('/scan_wifi');
                const nets = await res.json();
                list.innerHTML = nets.map(n => `<div class="wifi-item" onclick="select('${n.ssid}')"><span>${n.ssid}</span><span>${n.rssi} dBm</span></div>`).join('');
            } catch(e) { list.innerHTML = '<div style="padding:15px; color:red;">Scan failed</div>'; }
        }
        function select(s) { document.getElementById('ssid').value = s; document.getElementById('wifiList').style.display = 'none'; }
        async function save() {
            const s = document.getElementById('ssid').value;
            const p = document.getElementById('pass').value;
            const sid = document.getElementById('scriptId').value;
            const u = document.getElementById('devUser').value;
            const pw = document.getElementById('devPass').value;
            const msg = document.getElementById('status-msg');
            msg.innerHTML = "Syncing with hardware...";
            const data = new URLSearchParams();
            data.append('ssid', s); data.append('pass', p); data.append('scriptId', sid);
            data.append('adminUser', u); data.append('adminPass', pw); 
            try {
                const res = await fetch('/save_net', { method: 'POST', body: data });
                const resSys = await fetch('/save_sys?script=' + encodeURIComponent(sid) + '&adminUser=' + encodeURIComponent(u) + '&adminPass=' + encodeURIComponent(pw));
                if(res.ok && resSys.ok) {
                    msg.innerHTML = "<span style='color:var(--v-green)'>SUCCESS! Rebooting system...</span>";
                    setTimeout(() => location.reload(), 5000);
                } else msg.innerHTML = "<span style='color:red'>Hardware Reject</span>";
            } catch(e) { msg.innerHTML = "<span style='color:red'>Network Error</span>"; }
        }
    </script>
</body>
</html>
)rawliteral";
  server.send(200, "text/html", html);
}

void handleLogin() {
  String u = server.hasArg("u") ? server.arg("u") : server.arg("user");
  String p = server.hasArg("p") ? server.arg("p") : server.arg("pass");
  String r = server.arg("r"); // remember checkbox

  bool authenticated = false;
  // 1. Check against saved credentials
  if (u == deviceUser && p == devicePass) {
    authenticated = true;
  }
  // 2. Fallback for defaults (prevent lockout)
  if (!authenticated && u == "admin" &&
      (p == "password123" || p == "GSVRF001")) {
    authenticated = true;
  }

  if (authenticated) {
    String cookie = "VARMA_SID_V4_SECURE=GSV_OS_TRUSTED; path=/";
    if (r == "1") {
      cookie += "; Max-Age=31536000"; // 1 Year persistence
    }
    server.sendHeader("Set-Cookie", cookie);
    server.send(200, "application/json", "{\"success\":true}");
  } else {
    server.send(200, "application/json", "{\"success\":false}");
  }
}

void handleDashboard() {
  bool authed = isAuth();

  // ⭐️ MEMORY FIX: Use chunked transfer to avoid allocating 40KB+ for string
  // concatenation
  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.send(200, "text/html", "");

  server.sendContent(R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>V-VARMA RFID | GSV ELECTRICAL ENTERPRISES v1.1</title>
    <!-- CSS Dependencies -->
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root {
            --v-orange: #f39c12;
            --v-brown: #8B4513;
            --v-red: #ff4d4d;
            --v-green: #2ecc71;
            --v-blue: #1a2a6c;
            --bg-dark: #0d0d0d;
            --card-bg: #1a1a1a;
            --border-color: #333;
            --header-gradient: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
        }

        * { margin:0; padding:0; box-sizing:border-box; font-family:'Space Grotesk', sans-serif; }
        body { background: var(--bg-dark); color: #eee; min-height: 100vh; overflow-x:hidden; }

        /* Custom Hand-Drawn V-Shield Styling */
        .v-shield-svg {
            display: inline-block;
            vertical-align: middle;
            width: 100%;
            height: 100%;
        }

        /* Login System */
        #login-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.98); z-index: 9999;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(20px);
            transition: opacity 0.5s ease;
        }
        .login-card {
            background: var(--card-bg); border: 2px solid var(--v-orange); border-radius: 28px;
            padding: 3rem; width: 90%; max-width: 420px; text-align: center;
            box-shadow: 0 0 60px rgba(243,156,18,0.2);
        }
        .v-shield-logo-big { 
            width: 140px; 
            height: 140px; 
            color: var(--v-orange); 
            margin: 0 auto 1rem auto; 
            filter: drop-shadow(0 0 15px rgba(243,156,18,0.5)); 
            animation: shieldPulse 2s infinite ease-in-out; 
        }
        .login-subtext { font-size: 1rem; color: #888; text-transform: lowercase; margin-bottom: 0.2rem; }
        .sta-mode-tag { font-size: 0.7rem; color: var(--v-orange); letter-spacing: 2px; font-weight: 700; margin-bottom: 2rem; }
        
        @keyframes shieldPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

        /* Premium Header */
        .v-header {
            background: var(--header-gradient);
            padding: 1.5rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            position: sticky; top: 0; z-index: 1000;
        }
        .header-title { font-size: 1.4rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 20px; }
        .header-logo { 
            width: 85px; 
            height: 85px; 
            color: white; 
            filter: drop-shadow(0 0 10px rgba(255,255,255,0.3)); 
        } 
        
        .nav-links-container {
            background: rgba(0,0,0,0.3); border-radius: 50px; padding: 5px;
            display: inline-flex; gap: 5px; margin-top: 1.2rem; border: 1px solid rgba(255,255,255,0.1);
        }
        .nav-tab {
            padding: 0.5rem 1.5rem; border-radius: 30px; cursor: pointer;
            transition: 0.3s; font-weight: 700; font-size: 0.8rem; color: rgba(255,255,255,0.7);
        }
        .nav-tab.active { background: white; color: var(--v-blue); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }

        /* Status Icons */
        .status-container { position: absolute; top: 1.5rem; right: 2rem; display: flex; gap: 1.5rem; align-items: center; }
        .stat-icon { font-size: 1.2rem; transition: 0.3s; }
        .stat-online { color: var(--v-green); filter: drop-shadow(0 0 5px var(--v-green)); }
        .stat-offline { color: var(--v-red); filter: drop-shadow(0 0 5px var(--v-red)); }
        .pulse { animation: p 2s infinite; }

        /* Cards */
        .container-custom { max-width: 1100px; margin: 2rem auto; padding: 0 1.5rem; }
        .tab-content { display: none; animation: slideUp 0.5s ease; }
        .tab-content.active { display: block; }

        .v-card {
            background: var(--card-bg); border: 2px solid var(--border-color);
            border-radius: 24px; padding: 1.8rem; margin-bottom: 1.5rem;
            transition: transform 0.3s ease; border-left: 6px solid var(--v-brown);
        }
        .card-title { color: var(--v-orange); font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 1.2rem; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

        /* Monitor */
        .live-monitor {
            background: linear-gradient(180deg, #0f0f0f, #000000);
            border-radius: 25px; padding: 2.5rem 1.5rem; text-align: center;
            border: 1px solid #333; margin-bottom: 2rem; position: relative; overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }
        .status-badge { font-size: 3.5rem; font-weight: 900; line-height: 1; color: var(--v-orange); text-shadow: 0 0 25px rgba(243,156,18,0.4); margin-bottom: 1.5rem; letter-spacing: 5px; }
        .student-name { font-size: 1.8rem; font-weight: 600; color: #ccc; margin-bottom: 0.8rem; text-transform: uppercase; }
        .uid-text { font-family: 'Inter', sans-serif; font-size: 4rem; font-weight: 900; color: white; letter-spacing: 2px; line-height: 1.1; margin-bottom: 1rem; }

        /* Buttons */
        .btn-v { 
            padding: 0.8rem 1.5rem; border-radius: 12px; font-weight: 800; text-transform: uppercase;
            transition: 0.3s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem;
        }
        .btn-v-orange { background: linear-gradient(135deg, var(--v-brown), var(--v-orange)); color: white; }
        .btn-v-green { background: var(--v-green); color: white; }
        .btn-v-red { background: var(--v-red); color: white; }
        .btn-v-outline { background: transparent; border: 2px solid var(--border-color); color: white; }
        .btn-v:active { transform: scale(0.95); }

        /* Serial Monitor */
        #serial-monitor {
            background: #000; border: 1px solid #333; border-radius: 12px; 
            margin-top: 1rem; display: none; overflow: hidden;
        }
        .serial-header { background: #1a1a1a; padding: 8px 15px; font-size: 0.75rem; color: #666; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
        .serial-output { 
            height: 150px; overflow-y: auto; padding: 10px; font-family: 'Consolas', 'Monaco', monospace; 
            font-size: 0.75rem; color: #00ff00; line-height: 1.4;
        }

        /* Inputs & Password Eye */
        .input-group-v { position: relative; margin-bottom: 1rem; }
        .v-input {
            width: 100%; background: #0a0a0a; border: 2px solid var(--border-color);
            padding: 1rem; border-radius: 12px; color: white; outline: none; transition: 0.3s;
        }
        .v-input:focus { border-color: var(--v-orange); }
        .eye-icon { 
            position: absolute; right: 15px; top: 50%; transform: translateY(-50%); 
            color: #555; cursor: pointer; transition: 0.2s; z-index: 10;
        }
        .eye-icon:hover { color: var(--v-orange); }

        @keyframes p { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .toast-v {
            position: fixed; bottom: 30px; right: 30px; background: var(--card-bg);
            border-left: 5px solid var(--v-orange); padding: 1.2rem 2rem; border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6); display: none; z-index: 10001; animation: slideUp 0.3s ease;
        }
        
        .inv-history-container { max-height: 350px; overflow-y: auto; padding-right: 5px; }
        .inv-history-container::-webkit-scrollbar { width: 6px; }
        .inv-history-container::-webkit-scrollbar-thumb { background: var(--v-brown); border-radius: 10px; }
    </style>
</head>
<body>

    <!-- Updated Login Overlay with Custom Brush-Stroke V-Shield -->
    <div id="login-overlay" style="display: )rawliteral");

  server.sendContent(authed ? "none" : "flex");

  server.sendContent(R"rawliteral(;">
        <div class="login-card">
            <div class="v-shield-logo-big">
                <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="v-shield-svg">
                    <!-- Outer Shield -->
                    <path d="M466.5 83.7l-192-80c-11.8-4.9-25.2-4.9-37 0l-192 80C27.3 91.3 16 108.3 16 128c0 198.5 114.5 335.7 221.5 380.3 11.8 4.9 25.1 4.9 36.9 0C381.5 463.7 496 326.5 496 128c0-19.7-11.3-36.7-29.5-44.3z" fill="currentColor"/>
                    <!-- Custom Brush Stroke V (matching physical controller photo) -->
                    <path d="M160 160 C180 250 220 380 256 400 C300 350 340 220 360 160" fill="none" stroke="var(--card-bg)" stroke-width="45" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1 class="fw-bold text-white mb-1" style="letter-spacing: 4px;">V-VARMA</h1>
            <div class="login-subtext">secure login for dash board</div>

            <div class="input-group-v">
                <input type="text" class="v-input" id="admin-user" value="admin" placeholder="Username">
            </div>
            <div class="input-group-v">
                <input type="password" class="v-input" id="admin-pass" placeholder="Authorization Key">
                <i class="fa-solid fa-eye eye-icon" onclick="togglePass('admin-pass', this)"></i>
            </div>
            
            <div class="input-group-v" style="display: flex; align-items: center; gap: 10px; margin-top: -0.5rem; margin-bottom: 1.5rem; text-align: left;">
                <input type="checkbox" id="admin-remember" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--v-orange);">
                <label for="admin-remember" style="font-size: 0.85rem; color: #888; cursor: pointer; user-select: none;">Stay logged in (365 days)</label>
            </div>
            
            <button class="btn-v btn-v-orange w-100 mt-2" onclick="handleLogin()">GRANT SYSTEM ACCESS</button>
        </div>
    </div>

    <!-- Main UI -->
    <div id="app-ui" style="display: )rawliteral" +
                     String(authed ? "block" : "none") + R"rawliteral(;">
        <header class="v-header text-center">
            <div class="container">
                <div class="header-title text-white">
                    <div class="header-logo">
                        <!-- Updated Dashboard Header Logo to use custom V-Shield -->
                        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="v-shield-svg">
                            <path d="M466.5 83.7l-192-80c-11.8-4.9-25.2-4.9-37 0l-192 80C27.3 91.3 16 108.3 16 128c0 198.5 114.5 335.7 221.5 380.3 11.8 4.9 25.1 4.9 36.9 0C381.5 463.7 496 326.5 496 128c0-19.7-11.3-36.7-29.5-44.3z" fill="currentColor"/>
                            <path d="M160 160 C180 250 220 380 256 400 C300 350 340 220 360 160" fill="none" stroke="var(--v-blue)" stroke-width="45" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div>V-VARMA RFID Attendance Management System</div>
                </div>
                <p class="text-white-50 small mt-1">GSV Electrical Enterprises | v1.1</p>
                
                <div class="nav-links-container">
                    <div class="nav-tab active" onclick="switchTab('overview', this)">OVERVIEW</div>
                    <div class="nav-tab" onclick="switchTab('attendance', this)">ATTENDANCE</div>
                    <div class="nav-tab" onclick="switchTab('inventory', this)">RFID INVENTORY</div>
                    <div class="nav-tab" onclick="switchTab('verify', this)">VERIFY RFID</div>
                    <div class="nav-tab" onclick="switchTab('settings', this)">CONFIGURATION</div>
                </div>
            </div>
            
            <div class="status-container">
                <i class="fa-solid fa-terminal stat-icon" onclick="toggleSerial()" title="Serial Monitor" style="color:#888; cursor:pointer;"></i>
                <i class="fa-solid fa-microchip stat-icon stat-offline pulse" id="stat-mcu" title="Controller"></i>
                <i class="fa-solid fa-network-wired stat-icon stat-offline pulse" id="stat-net" title="Network"></i>
                <i class="fa-solid fa-database stat-icon stat-offline pulse" id="stat-db" title="Database"></i>
                <i class="fa-solid fa-wifi stat-icon stat-offline pulse" id="stat-wifi" title="WiFi"></i>
            </div>
        </header>

        <div class="container-custom">
            <!-- Serial Monitor -->
            <div id="serial-monitor">
                <div class="serial-header">
                    <span><i class="fa-solid fa-terminal me-2"></i> HARDWARE SERIAL DATA FLOW</span>
                    <button class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size: 0.6rem;" onclick="clearSerial()">CLEAR</button>
                </div>
                <div id="serial-out" class="serial-output"></div>
            </div>

            <!-- Overview -->
            <div id="overview" class="tab-content active">
                <div class="live-monitor">
                    <div class="status-badge" id="live-status">SCAN READY</div>
                    <div class="student-name" id="live-name">---</div>
                    <div class="uid-text" id="live-uid">0000000000</div>
                    <div id="live-status-msg" style="color: var(--v-orange); font-weight: 900; margin-top: 20px; font-size: 1.4rem; text-transform: uppercase; text-shadow: 0 0 15px rgba(243,156,18,0.5);"></div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="v-card">
                            <div class="card-title"><i class="fa-solid fa-broadcast-tower"></i> DEVICE INFO</div>
                            <div class="d-flex justify-content-between py-2 border-bottom border-dark"><span>Identity</span><span class="text-white" id="disp-dev-name">--</span></div>
                            <div class="d-flex justify-content-between py-2 border-bottom border-dark"><span>Assigned IP</span><span class="text-white" id="disp-ip">--</span></div>
                            <div class="d-flex justify-content-between py-2 border-bottom border-dark"><span>MAC ID</span><span class="text-white small" id="disp-mac">--</span></div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="v-card">
                            <div class="card-title"><i class="fa-solid fa-cloud"></i> CLOUD STATUS</div>
                            <div class="d-flex justify-content-between py-2 border-bottom border-dark"><span>Sync Engine</span><span class="text-white" id="disp-script">--</span></div>
                            <div class="d-flex justify-content-between py-2 border-bottom border-dark"><span>Signal</span><span class="text-white" id="disp-rssi">--</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Attendance -->
            <div id="attendance" class="tab-content">
                <div class="v-card">
                    <div class="card-title"><i class="fa-solid fa-sliders"></i> MODE CONTROL</div>
                    <div class="d-flex gap-3 mb-4 flex-wrap">
                        <button class="btn-v btn-v-green" onclick="setMode('IN')"><i class="fa-solid fa-right-to-bracket"></i> SET IN</button>
                        <button class="btn-v btn-v-red" onclick="setMode('OUT')"><i class="fa-solid fa-right-from-bracket"></i> SET OUT</button>
                        <button class="btn-v btn-v-orange" onclick="setMode('INV')"><i class="fa-solid fa-boxes-stacked"></i> SET INV</button>
                        <button class="btn-v btn-v-outline" onclick="resetUI(this)"><i class="fa-solid fa-refresh"></i> CLEAR MONITOR</button>
                    </div>
                    
                    <div class="card-title mt-4 d-flex justify-content-between align-items-center">
                        <span><i class="fa-solid fa-clock-rotate-left"></i> LOG HISTORY</span>
                        <button class="btn-v btn-v-outline py-1" onclick="fetchLogs(this)"><i class="fa-solid fa-rotate"></i> RELOAD</button>
                    </div>
                    <div id="log-list"></div>
                </div>
            </div>

            <!-- Inventory -->
            <div id="inventory" class="tab-content">
                <div class="v-card text-center" style="min-height: 250px;">
                    <div class="card-title justify-content-center"><i class="fa-solid fa-id-card"></i> TAG REGISTRATION</div>
                    <div class="d-flex justify-content-center gap-3 mb-4 flex-wrap">
                        <button class="btn-v btn-v-orange" id="btn-capture" onclick="startCaptureFlow()"><i class="fa-solid fa-crosshairs"></i> START CAPTURE</button>
                        <button class="btn-v btn-v-outline" onclick="resetCapture()"><i class="fa-solid fa-eraser"></i> REFRESH</button>
                        <button class="btn-v btn-v-green" id="cloud-save-btn" style="display: none;" onclick="pushToCloud()">
                            <i class="fa-solid fa-cloud-arrow-up"></i> SAVE TO CLOUD
                        </button>
                    </div>
                    <div id="capture-uid" class="status-badge" style="font-size: 3rem; letter-spacing: 5px; color: var(--v-blue);">--------</div>
                    <div id="capture-msg" class="text-white-50 small mt-2">Ready for card registration</div>
                </div>

                <div class="v-card">
                    <div class="card-title d-flex justify-content-between align-items-center">
                        <span><i class="fa-solid fa-history"></i> INVENTORY DATABASE</span>
                        <button class="btn-v btn-v-outline py-1" onclick="fetchInventory(this)"><i class="fa-solid fa-rotate"></i> RELOAD</button>
                    </div>
                    <div id="inv-history" class="inv-history-container"></div>
                </div>
            </div>

            <!-- Settings -->
            <div id="settings" class="tab-content">
                <div class="row">
                    <div class="col-md-6">
                        <div class="v-card">
                            <div class="card-title"><i class="fa-solid fa-wifi"></i> NETWORK TOPOLOGY</div>
                            <label class="text-white-50 small mb-2">TARGET SSID</label>
                            <div class="input-group-v">
                                <input type="text" class="v-input" id="conf-ssid" placeholder="Select or type SSID">
                                <button class="btn-v btn-v-outline" onclick="scanWiFi(this)" style="padding: 0 15px;"><i class="fa-solid fa-magnifying-glass"></i> SCAN</button>
                            </div>
                            <div id="wifi-scan-results" style="max-height: 150px; overflow-y: auto; background: #000; border-radius: 8px; margin-bottom: 1rem; display: none; border: 1px solid #333;"></div>
                            <label class="text-white-50 small mb-2">SECURITY KEY</label>
                            <div class="input-group-v">
                                <input type="password" class="v-input" id="conf-pass">
                                <i class="fa-solid fa-eye eye-icon" onclick="togglePass('conf-pass', this)"></i>
                            </div>
                            <button class="btn-v btn-v-orange w-100" id="btn-save-net" onclick="saveNetwork()"><i class="fa-solid fa-save me-2"></i>SAVE & CONNECT</button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="v-card">
                            <div class="card-title"><i class="fa-solid fa-gears"></i> SYSTEM CONFIG</div>
                            <label class="text-white-50 small mb-2">GOOGLE SCRIPT ID</label>
                            <input type="text" class="v-input mb-3" id="conf-script">
                            
                            <label class="text-white-50 small mb-2">ADMIN NAME</label>
                            <input type="text" class="v-input mb-3" id="conf-admin-user">
                            
                            <label class="text-white-50 small mb-2">ADMIN PASSWORD</label>
                            <div class="input-group-v mb-3">
                                <input type="password" class="v-input" id="conf-admin-pass">
                                <i class="fa-solid fa-eye eye-icon" onclick="togglePass('conf-admin-pass', this)"></i>
                            </div>
                            
                            <button class="btn-v btn-v-green w-100" id="btn-save-sys" onclick="saveSystem()"><i class="fa-solid fa-save me-2"></i>SAVE & REBOOT</button>
                        </div>
                    </div>
                </div>

                <div class="v-card">
                    <div class="card-title text-danger"><i class="fa-solid fa-triangle-exclamation"></i> ADVANCED RECOVERY</div>
                    <p class="text-white-50 small mb-4">Factory reset wipes all local NVS memory (WiFi, Script ID). Device will reboot in AP mode.</p>
                    <button class="btn-v btn-v-red w-100" onclick="factoryReset()">WIPE DEVICE & RESET</button>
                </div>
            </div>

            <!-- Verify Tab -->
            <div id="verify" class="tab-content">
                <div class="v-card">
                    <div class="card-title"><i class="fa-solid fa-magnifying-glass"></i> INSTANT RFID PROFILER</div>
                    <div class="input-group-v mb-4">
                        <input type="text" class="v-input mb-0" id="verify-search-input" placeholder="Enter Tag ID or Scan Card">
                        <button class="btn-v btn-v-orange" id="btn-start-verify" onclick="startVerifyFlow()" title="Capture via Hardware">
                            <i class="fa-solid fa-crosshairs"></i> CAPTURE
                        </button>
                        <button class="btn-v btn-v-outline" onclick="performLookup()" title="Manual Search"><i class="fa-solid fa-search"></i></button>
                        <button class="btn-v btn-v-outline text-danger" onclick="resetVerifyUI()" title="Clear"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                    <div id="verify-loader" style="display:none;" class="text-center p-4">
                        <div class="spinner-border text-warning" role="status"></div>
                        <div class="mt-2 small text-white-50">SYNCING PROFILE...</div>
                    </div>
                    <div id="verify-results"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast UI -->
    <div id="toast" class="toast-v">
        <i class="fa-solid fa-circle-check me-2"></i> <span id="toast-msg"></span>
    </div>

    <script>
        // --- System Globals ---
        let pollTimer = null;

        // --- Core Functions ---
        function togglePass(id, el) {
            const inp = document.getElementById(id);
            if (inp.type === 'password') {
                inp.type = 'text';
                el.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                inp.type = 'password';
                el.classList.replace('fa-eye-slash', 'fa-eye');
            }
        }

        function toggleSerial() {
            const sm = document.getElementById('serial-monitor');
            sm.style.display = sm.style.display === 'none' ? 'block' : 'none';
        }

        function logSerial(msg) {
            const out = document.getElementById('serial-out');
            const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
            const line = document.createElement('div');
            line.style.fontSize = '0.75rem';
            line.innerHTML = `<span style="color:#555;">[${now}]</span> <span style="color:#0f0;">${msg}</span>`;
            out.appendChild(line);
            out.scrollTop = out.scrollHeight;
        }

        function clearSerial() { document.getElementById('serial-out').innerHTML = ''; }

        // --- Hardware API Interface ---
        async function fetchAPI(endpoint, params = {}) {
            try {
                const url = new URL(endpoint, window.location.origin);
                Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
                const res = await fetch(url);
                const text = await res.text();
                try {
                  return JSON.parse(text);
                } catch(e) {
                  // Fallback for non-JSON responses
                  if (endpoint !== '/serial_data') {
                    console.error("JSON Parse Error at " + endpoint + ":", text);
                  }
                  return text; 
                }
            } catch (err) {
                console.error("Fetch failure:", endpoint, err);
                return null;
            }
        }

        // --- Polling Logic ---
        let settingsInitialized = false;
        async function startPolling() {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = setInterval(async () => {
                const data = await fetchAPI('/status');
                if (data && typeof data === 'object') {
                    updateDashboard(data);
                    if (!settingsInitialized && data.script_id) {
                        document.getElementById('conf-script').value = data.script_id;
                        document.getElementById('conf-ssid').value = data.saved_ssid || '';
                        document.getElementById('conf-admin-user').value = data.dev_user || 'admin';
                        document.getElementById('conf-admin-pass').value = data.dev_pass || 'password123';
                        settingsInitialized = true;
                    }
                }
                
                // Fetch real hardware logs
                const logs = await fetchAPI('/serial_data');
                if (logs && typeof logs === 'string' && logs.trim()) {
                  logs.split('\n').forEach(line => {
                    if (line.trim()) logSerial(line);
                  });
                }
            }, 1000); // 1s interval for better real-time sync
        }

        function updateDashboard(d) {
            // Update Status Icons
            document.getElementById('stat-mcu').className = `fa-solid fa-microchip stat-icon ${d.mcu ? 'stat-online' : 'stat-offline'}`;
            document.getElementById('stat-net').className = `fa-solid fa-network-wired stat-icon ${d.net ? 'stat-online' : 'stat-offline'}`;
            document.getElementById('stat-db').className = `fa-solid fa-database stat-icon ${d.db ? 'stat-online' : 'stat-offline'}`;
            document.getElementById('stat-wifi').className = `fa-solid fa-wifi stat-icon ${d.wifi ? 'stat-online' : 'stat-offline'}`;

            // Update Text
            document.getElementById('disp-dev-name').innerText = d.name || '--';
            document.getElementById('disp-ip').innerText = d.ip || '0.0.0.0';
            document.getElementById('disp-mac').innerText = d.mac || '--';
            document.getElementById('disp-script').innerText = d.script ? 'DEPLOYED' : 'NOT SET';
            document.getElementById('disp-rssi').innerText = (d.rssi || 0) + ' dBm';

            // Update Live Card if data present
            const statusEl = document.getElementById('live-status');
            const nameEl = document.getElementById('live-name');
            const uidEl = document.getElementById('live-uid');
            const msgEl = document.getElementById('live-status-msg');

            if (d.loading) {
                statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>VALIDATING';
                uidEl.innerText = d.last_uid;
                nameEl.innerText = 'CONTACTING CLOUD...';
                msgEl.innerText = '';
            } else if (d.last_uid && d.last_uid !== "--------" && d.last_uid !== "0") {
                statusEl.innerText = (d.process_step === 'Ready' || d.process_step === 'None') ? d.mode : d.process_step.toUpperCase();
                uidEl.innerText = d.last_uid;
                nameEl.innerText = (d.last_user && d.last_user !== '---') ? d.last_user : 'SCAN COMPLETED';
                msgEl.innerText = d.detailed_status || d.last_status_msg || "";
            } else {
                statusEl.innerText = d.mode;
                uidEl.innerText = 'WAITING FOR CARD...';
                nameEl.innerText = '---';
                msgEl.innerText = d.last_status_msg || "";
            }
        }

        // --- Auth & Tabs ---
        async function handleLogin() {
            const u = document.getElementById('admin-user').value;
            const p = document.getElementById('admin-pass').value;
            const r = document.getElementById('admin-remember').checked ? 1 : 0;
            
            // Note: Sending to hardware for real auth check
            const res = await fetchAPI('/login', { u, p, r });
            if (res && res.success) {
                document.getElementById('login-overlay').style.display = 'none';
                document.getElementById('app-ui').style.display = 'block';
                logSerial("GSV_OS: Dashboard Access Authorized.");
                startPolling();
                fetchLogs();
            } else {
                showToast("Access Denied", "danger");
            }
        }

        function switchTab(id, el) {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            el.classList.add('active');
            
            // Sync hardware mode with tab where appropriate
            if (id === 'verify') setMode('VERIFY');
            else if (id === 'inventory') setMode('INV');
            else if (id === 'attendance') setMode('IN');
            
            logSerial(`UI: Switched to ${id.toUpperCase()}`);
        }

        async function setMode(m) {
            const res = await fetchAPI('/mode', { m: m });
            if (res && res.success) {
                showToast(`System Mode: ${m}`, "green");
                logSerial(`UI: Hardware mode manually set to ${m}`);
                // Immediate update of status if polling hasn't hit yet
                const statusEl = document.getElementById('live-status');
                if (statusEl) statusEl.innerText = m;
            } else {
                showToast("Failed to switch mode", "danger");
            }
        }

        // --- Functional Actions ---
        let captureActive = false;
        async function startCaptureFlow() {
            if (captureActive) return;
            captureActive = true;

            const el = document.getElementById('capture-uid');
            const msg = document.getElementById('capture-msg');
            const btn = document.getElementById('btn-capture');
            const icon = btn.querySelector('i');
            
            el.innerText = "SCAN NOW";
            el.style.color = "var(--v-orange)";
            msg.innerText = "Bring an unassigned card near the sensor...";
            icon.className = 'fa-solid fa-spinner fa-spin';

            // Reset current capture on hardware
            await fetchAPI('/capture', { reset: '1' });
            logSerial("Capture: Waiting for new card... (Hardware capture reset)");

            // Polling for detection
            let attempts = 0;
            const pollInt = setInterval(async () => {
                const res = await fetchAPI('/capture');
                if (res && res.uid && res.uid !== "--------") {
                    el.innerText = res.uid;
                    el.style.color = "var(--v-green)";
                    msg.innerText = "TAG DETECTED! Use save below.";
                    document.getElementById('cloud-save-btn').style.display = "inline-flex";
                    icon.className = 'fa-solid fa-crosshairs';
                    captureActive = false;
                    clearInterval(pollInt);
                }
                attempts++;
                if (attempts > 30) { // 30s timeout
                    el.innerText = "TIMEOUT";
                    el.style.color = "var(--v-red)";
                    msg.innerText = "No card detected. Try again.";
                    icon.className = 'fa-solid fa-crosshairs';
                    captureActive = false;
                    clearInterval(pollInt);
                }
            }, 1000);
        }

        async function pushToCloud() {
            const btn = document.getElementById('cloud-save-btn');
            const icon = btn.querySelector('i');
            const uid = document.getElementById('capture-uid').innerText;
            
            icon.className = 'fa-solid fa-spinner fa-spin';
            const res = await fetchAPI('/sync', { uid });
            icon.className = 'fa-solid fa-cloud-arrow-up';
            
            if (res) {
                showToast('Cloud Sync Success', 'green');
                document.getElementById('cloud-save-btn').style.display = "none";
                fetchInventory();
            } else {
                showToast('Cloud Sync Failed', 'danger');
            }
        }

        async function saveNetwork() {
            const btn = document.getElementById('btn-save-net');
            const icon = btn.querySelector('i');
            const ssid = document.getElementById('conf-ssid').value;
            const pass = document.getElementById('conf-pass').value;
            
            icon.className = 'fa-solid fa-spinner fa-spin';
            const res = await fetchAPI('/save_net', { ssid, pass });
            icon.className = 'fa-solid fa-save';
            
            if (res) {
              showToast('WiFi Settings Saved. Applying...', 'green');
              logSerial("GSV_OS: WiFi Credentials committed to NVS.");
            } else {
              showToast('Hardware Connection Error', 'danger');
            }
        }

        async function scanWiFi(btn) {
            const icon = btn.querySelector('i');
            const orig = icon.className;
            const resDiv = document.getElementById('wifi-scan-results');
            
            icon.className = 'fa-solid fa-spinner fa-spin';
            resDiv.innerHTML = '<div class="p-2 small text-white-50">Searching...</div>';
            resDiv.style.display = 'block';
            
            const res = await fetchAPI('/scan_wifi');
            icon.className = orig;
            
            if (res && res.length > 0) {
                resDiv.innerHTML = res.map(w => `
                    <div class="p-2 border-bottom border-dark small d-flex justify-content-between" style="cursor:pointer;" onclick="selectSSID('${w.ssid}')">
                        <span>${w.ssid}</span>
                        <span class="text-white-50">${w.rssi} dBm</span>
                    </div>
                `).join('');
                showToast(`Found ${res.length} networks`, 'green');
            } else {
                resDiv.innerHTML = '<div class="p-2 small text-danger">No networks found</div>';
                showToast("Scan failed or no networks", "danger");
            }
        }

        function selectSSID(s) {
            document.getElementById('conf-ssid').value = s;
            document.getElementById('wifi-scan-results').style.display = 'none';
        }

        async function saveSystem() {
            const btn = document.getElementById('btn-save-sys');
            const icon = btn.querySelector('i');
            const script = document.getElementById('conf-script').value;
            const user = document.getElementById('conf-admin-user').value;
            const pass = document.getElementById('conf-admin-pass').value;
            
            icon.className = 'fa-solid fa-spinner fa-spin';
            const res = await fetchAPI('/save_sys', { script, adminUser: user, adminPass: pass });
            icon.className = 'fa-solid fa-save';
            
            if (res) {
              showToast('System Rebooting in 3s...', 'green');
              logSerial("GSV_OS: System parameters updated. Restarting...");
              setTimeout(() => { 
                window.location.href = "http://vvarma-rfid.local/dashboard";
              }, 4000);
            } else {
              showToast('Hardware Connection Error', 'danger');
            }
        }

        async function factoryReset() {
            if(confirm("DANGER: This will wipe all system data. Continue?")) {
                await fetchAPI('/factory_reset');
                window.location.reload();
            }
        }

        async function resetCapture() {
            await fetchAPI('/capture', { reset: '1' });
            document.getElementById('capture-uid').innerText = "--------";
            document.getElementById('capture-msg').innerText = "Card capture cleared";
            document.getElementById('cloud-save-btn').style.display = "none";
            showToast("Capture Ready", "orange");
        }

        // --- List Rendering ---
        async function fetchLogs(btn) {
            let icon, orig;
            if (btn) {
                icon = btn.querySelector('i');
                orig = icon.className;
                icon.className = 'fa-solid fa-spinner fa-spin';
            }
            
            const data = await fetchAPI('/logs');
            if (btn) icon.className = orig;
            
            const list = document.getElementById('log-list');
            if (!data || data.length === 0) { 
                list.innerHTML = `<p class="text-center text-white-50 p-4">No Students Available (Today/Yesterday)</p>`; 
                return; 
            }
            
            list.innerHTML = data.map(l => {
                const statusColor = (l.status || '').toUpperCase() === 'LATE' ? 'var(--v-orange)' : 'var(--v-green)';
                return `
                <div class="hist-item p-3 mb-2" style="background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 4px solid ${statusColor};">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <div class="fw-bold text-white fs-5">${l.name}</div>
                            <div class="small text-white-50">${l.regId} | ${l.date}</div>
                        </div>
                        <div class="badge" style="background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44;">
                            ${(l.status || 'PRESENT').toUpperCase()}
                        </div>
                    </div>
                    
                    <div class="row g-2 small">
                        <div class="col-6">
                            <i class="fa-solid fa-users-gear me-1 text-white-50"></i> BATCH: <span class="text-white">${l.batch}</span>
                        </div>
                        <div class="col-6">
                            <i class="fa-solid fa-clock me-1 text-white-50"></i> SLOT: <span class="text-white">${l.slot}</span>
                        </div>
                        <div class="col-6">
                            <i class="fa-solid fa-business-time me-1 text-white-50"></i> PERIOD: <span class="text-white">${l.period}</span>
                        </div>
                        <div class="col-6">
                            <i class="fa-solid fa-hourglass-start me-1 text-white-50"></i> IN: <span class="text-green fw-bold">${l.inTime}</span>
                        </div>
                        <div class="col-6 offset-6">
                            <i class="fa-solid fa-hourglass-end me-1 text-white-50"></i> OUT: <span class="text-orange fw-bold">${l.outTime}</span>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

        async function fetchInventory(btn) {
            let icon, orig;
            if (btn) {
                icon = btn.querySelector('i');
                orig = icon.className;
                icon.className = 'fa-solid fa-spinner fa-spin';
            }
            
            const data = await fetchAPI('/inventory');
            if (btn) icon.className = orig;
            
            const list = document.getElementById('inv-history');
            if (!data || data.length === 0) { list.innerHTML = `<p class="text-center text-white-50">Empty</p>`; return; }
            list.innerHTML = data.map(i => {
                let statusColor = i.status === 'Available' ? 'var(--v-green)' : 'var(--v-orange)';
                let details = (i.status === 'Available' || (!i.name && !i.studentName))
                    ? `<div class="small text-white-50">AVAILABLE SINCE: ${i.date || '---'}</div>`
                    : `
                        <div class="small text-white-80">NAME: ${i.name || i.studentName || '---'}</div>
                        <div class="small text-white-50">REG_NO: ${i.reg_no || i.regNo || '---'} | ID: ${i.reg_id || i.regId || '---'}</div>
                        <div class="small text-white-50">COLL: ${i.college || '---'} | DEPT: ${i.dept || i.department || '---'}</div>
                        <div class="small text-white-50">BATCH: ${i.batch || '---'}</div>
                      `;
                return `
                <div class="hist-item d-block text-start p-3" style="border-bottom: 1px solid #333; transition: 0.3s; cursor: pointer;" onmouseover="this.style.background='#222'" onmouseout="this.style.background='transparent'">
                    <div class="d-flex justify-content-between">
                        <div class="text-warning fw-bold">${i.uid}</div>
                        <div style="color:${statusColor}; font-weight:800; font-size:0.7rem;">${(i.status || 'AVAILABLE').toUpperCase()}</div>
                    </div>
                    ${details}
                </div>
                `;
            }).join('');
        }

        let verifyActive = false;
        async function startVerifyFlow() {
            if (verifyActive) return;
            verifyActive = true;

            const input = document.getElementById('verify-search-input');
            const btn = document.getElementById('btn-start-verify');
            const icon = btn.querySelector('i');
            
            input.value = "READING CARD...";
            icon.className = 'fa-solid fa-spinner fa-spin';
            
            // Switch hardware to VERIFY mode
            await fetchAPI('/mode', { m: 'VERIFY' });
            await fetchAPI('/capture', { reset: '1' });
            
            let attempts = 0;
            const poll = setInterval(async () => {
                const res = await fetchAPI('/capture');
                if (res && res.uid && res.uid !== "--------") {
                    input.value = res.uid;
                    clearInterval(poll);
                    verifyActive = false;
                    icon.className = 'fa-solid fa-crosshairs';
                    performLookup();
                }
                attempts++;
                if (attempts > 20) {
                    clearInterval(poll);
                    verifyActive = false;
                    icon.className = 'fa-solid fa-crosshairs';
                    input.value = "";
                    showToast("Verify Timeout", "danger");
                }
            }, 1000);
        }

        async function performLookup() {
            const uid = document.getElementById('verify-search-input').value;
            if (!uid || uid.length < 4) return;
            
            const loader = document.getElementById('verify-loader');
            const results = document.getElementById('verify-results');
            
            loader.style.display = 'block';
            results.innerHTML = '';
            
            const res = await fetchAPI('/validate', { action: 'check', uid: uid });
            loader.style.display = 'none';
            
            if (res && res.status === 'success') {
                renderVerifyResults(res, uid);
            } else {
                let isNewCard = false;
                if (res && res.message && (res.message.toLowerCase().includes('not in') || res.message.toLowerCase().includes('unknown'))) {
                    isNewCard = true;
                }
                
                if (isNewCard) {
                    results.innerHTML = `
                        <div class="alert border-0 bg-dark text-white text-center py-4" style="border-radius:15px; border:2px dashed var(--v-orange)!important;">
                            <i class="fa-solid fa-id-card fs-1 mb-3" style="color:var(--v-orange);"></i>
                            <h4 class="fw-bold text-orange" style="color:var(--v-orange);">NEW CARD SCANNED</h4>
                            <p class="mb-3 text-white-50">This RFID card [${uid}] is a new card and not in inventory.</p>
                            <button class="btn-v btn-v-orange px-4" onclick="switchTab('inventory', this); setTimeout(()=>startCaptureFlow(), 500);">
                                <i class="fa-solid fa-plus me-2"></i>ADD TO INVENTORY
                            </button>
                        </div>
                    `;
                } else {
                    results.innerHTML = `
                        <div class="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger text-center py-4">
                            <i class="fa-solid fa-circle-exclamation fs-1 mb-2"></i>
                            <h4 class="fw-bold">TAG NOT FOUND</h4>
                            <p class="mb-0">${(res && res.message) ? res.message : `This RFID card [${uid}] validation failed.`}</p>
                        </div>
                    `;
                }
            }
        }

        function renderVerifyResults(d, uid) {
            const results = document.getElementById('verify-results');
            const s = d.student || d;
            const inv = d.inventory || {};
            
            if (!s || (!s.name && !s.studentName) || s.name === "UNAUTHORIZED" || s.name === "Unknown" || s.name === "---") {
                results.innerHTML = `
                    <div class="alert alert-warning border-0 bg-warning bg-opacity-10 text-warning text-center py-4">
                        <i class="fa-solid fa-box-open fs-1 mb-3"></i>
                        <h4 class="fw-bold">AVAILABLE IN INVENTORY</h4>
                        <p class="mb-3">This tag is available in inventory but not assigned to any student. You can assign it.</p>
                        <div class="small text-white-50 mb-3">Inventory Added By: ${inv.AddedBy || 'Admin'} | Date: ${inv.AddedDate || '---'}</div>
                        <button class="btn-v btn-v-green px-4" onclick="switchTab('settings', this);">
                            <i class="fa-solid fa-user-plus me-2"></i>ASSIGN STUDENT IN SETTINGS
                        </button>
                    </div>
                `;
                return;
            }

            results.innerHTML = `
                <div class="v-card border-success" style="border-left-color: var(--v-green);">
                    <div class="row align-items-center mb-4">
                        <div class="col-auto">
                            <div class="bg-success bg-opacity-10 p-3 rounded-circle" style="width:70px; height:70px; display:flex; align-items:center; justify-content:center;">
                                <i class="fa-solid fa-user-check text-success fs-1"></i>
                            </div>
                        </div>
                        <div class="col">
                            <h3 class="fw-bold text-white mb-0 text-uppercase">${s.name || s.studentName || '---'}</h3>
                            <div class="text-success small fw-bold"><i class="fa-solid fa-shield-halved me-1"></i> VERIFIED POSITIVE</div>
                        </div>
                    </div>
                    
                    <div class="row g-3">
                        <div class="col-md-6 border-end border-dark">
                            <div class="mb-3">
                                <label class="text-white-50 x-small text-uppercase">Registration ID</label>
                                <div class="text-white fw-bold">${s.regId || s.reg_id || '---'}</div>
                            </div>
                            <div class="mb-3">
                                <label class="text-white-50 x-small text-uppercase">Register Number</label>
                                <div class="text-white fw-bold">${s.regNo || s.reg_no || '---'}</div>
                            </div>
                            <div class="mb-3">
                                <label class="text-white-50 x-small text-uppercase">College / University</label>
                                <div class="text-white small">${s.college || '---'}</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="text-white-50 x-small text-uppercase">Batch Allocation</label>
                                <div class="text-orange fw-bold">${s.batch || '---'}</div>
                            </div>
                            <div class="mb-3">
                                <label class="text-white-50 x-small text-uppercase">Department</label>
                                <div class="text-white fw-bold">${s.dept || s.department || '---'}</div>
                            </div>
                            <div class="row">
                                <div class="col-6">
                                    <label class="text-white-50 x-small text-uppercase">Start Date</label>
                                    <div class="text-white small">${s.startDate || '---'}</div>
                                </div>
                                <div class="col-6">
                                    <label class="text-white-50 x-small text-uppercase">End Date</label>
                                    <div class="text-white small">${s.endDate || '---'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4 pt-3 border-top border-dark d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-white-50 small">Tag Status:</span>
                            <span class="badge bg-success ms-1">${s.status || 'ACTIVE'}</span>
                        </div>
                        <div class="text-white-50 x-small">
                            MSG: <span class="text-white font-monospace">${s.message || '---'}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        function resetVerifyUI() {
            document.getElementById('verify-search-input').value = "";
            document.getElementById('verify-results').innerHTML = "";
            fetchAPI('/capture', { reset: '1' });
        }

        async function resetUI(btn) {
            if(btn) {
                const icon = btn.querySelector('i');
                const orig = icon.className;
                icon.className = 'fa-solid fa-spinner fa-spin';
                await fetchAPI('/reset_display');
                icon.className = orig;
            } else {
                await fetchAPI('/reset_display');
            }
            document.getElementById('live-status').innerText = "WAITING";
            document.getElementById('live-uid').innerText = "READY FOR SCAN";
            document.getElementById('live-name').innerText = "---";
            document.getElementById('live-status-msg').innerText = "";
            showToast("Display Reset", "green");
        }

        function showToast(msg, type = 'orange') {
            const t = document.getElementById('toast');
            document.getElementById('toast-msg').innerText = msg;
            t.style.borderLeftColor = type === 'danger' ? 'var(--v-red)' : (type === 'green' ? 'var(--v-green)' : 'var(--v-orange)');
            t.style.display = 'block';
            setTimeout(() => { t.style.display = 'none'; }, 3000);
        }
        if (document.getElementById('app-ui').style.display === 'block') {
            startPolling();
        }
    </script>
</body>
</html>
)rawliteral");
  server.sendContent(""); // End of chunked response
}

void handleStatus() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  String stepStr;
  switch (currentStep) {
  case STEP_CARD_NUM:
    stepStr = "Card Number";
    break;
  case STEP_VALIDATING:
    stepStr = "Validating";
    break;
  case STEP_RESULT:
    stepStr = "Result";
    break;
  case STEP_NAME:
    stepStr = "Name";
    break;
  case STEP_STATUS:
    stepStr = "Status";
    break;
  default:
    stepStr = "Ready";
    break;
  }

  auto escapeJ = [](String s) {
    s.replace("\"", "'");
    s.replace("\r", "");
    s.replace("\n", " ");
    return s;
  };

  String json = "{";
  json += "\"mcu\":true,";
  json +=
      "\"net\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") +
      ",";
  json += "\"db\":" + String(deviceVerified ? "true" : "false") + ",";
  json +=
      "\"wifi\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") +
      ",";
  json += "\"name\":\"" + escapeJ(String(DEVICE_NAME)) + "\",";
  json += "\"ip\":\"" + localIpStr + "\",";
  json += "\"mac\":\"" + myMac + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"script_id\":\"" + scriptId + "\",";
  json += "\"saved_ssid\":\"" + escapeJ(savedSSID) + "\",";
  json += "\"loading\":" + String(cardProcessing ? "true" : "false") + ",";
  json += "\"mode\":\"" +
          String(currentMode == MODE_IN
                     ? "IN"
                     : (currentMode == MODE_OUT
                            ? "OUT"
                            : (currentMode == MODE_INV ? "INV" : "VERIFY"))) +
          "\",";
  json += "\"last_uid\":\"" + escapeJ(capturedUid) + "\",";
  json += "\"last_user\":\"" + escapeJ(lastUserName) + "\",";
  json += "\"detailed_status\":\"" + escapeJ(lastDetailedStatus) + "\",";
  json += "\"last_status_msg\":\"" + escapeJ(lastStatusMsg) + "\",";
  json += "\"dev_user\":\"" + escapeJ(deviceUser) + "\",";
  json += "\"dev_pass\":\"" + escapeJ(devicePass) + "\",";
  json += "\"process_step\":\"" + stepStr + "\"";
  json += "}";
  server.send(200, "application/json", json);
}

void handleMode() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  if (server.hasArg("m")) {
    String m = server.arg("m");
    if (m == "IN")
      currentMode = MODE_IN;
    else if (m == "OUT")
      currentMode = MODE_OUT;
    else if (m == "INV")
      currentMode = MODE_INV;
    else if (m == "VERIFY")
      currentMode = MODE_VERIFY;
    server.send(200, "application/json", "{\"success\":true}");
  } else {
    server.send(400, "application/json", "{\"success\":false}");
  }
}

void handleCapture() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  if (server.hasArg("reset")) {
    capturedUid = "--------";
    server.send(200, "application/json", "{\"success\":true}");
  } else {
    server.send(200, "application/json", "{\"uid\":\"" + capturedUid + "\"}");
  }
}

void handleSaveInventory() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  if (server.hasArg("uid")) {
    String uid = server.arg("uid");
    saveInventoryToSheet(uid);
    server.send(200, "application/json", "{\"success\":true}");
  } else {
    server.send(400, "application/json", "{\"success\":false}");
  }
}

void handleSaveNetwork() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  String ssid = server.arg("ssid");
  String pass = server.arg("pass");
  String script = server.arg("scriptId");

  preferences.begin("gsv-rfid", false);
  preferences.putString("ssid", ssid);
  preferences.putString("pass", pass);
  if (script != "")
    preferences.putString("scriptId", script);
  preferences.end();

  server.send(200, "application/json", "{\"success\":true}");
  rebootTimer = millis() + 2000;
}

void handleSaveSystem() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  String script = server.arg("script");
  String user = server.arg("adminUser");
  String pass = server.arg("adminPass");

  preferences.begin("gsv-rfid", false);
  if (script != "") {
    preferences.putString("scriptId", script);
    scriptId = script;
  }
  if (user != "") {
    preferences.putString("devUser", user);
    deviceUser = user;
  }
  if (pass != "") {
    preferences.putString("devPass", pass);
    devicePass = pass;
  }
  preferences.end();

  server.send(200, "application/json", "{\"success\":true}");
  rebootTimer = millis() + 2000;
}

void handleFactoryReset() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  server.send(200, "application/json", "{\"success\":true}");
  delay(500);
  factoryReset();
}

void handleScanWiFi() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  webLog("WiFi: Scanning networks...");
  int n = WiFi.scanNetworks(false, false, false, 300); // Faster scan
  if (n < 0) {
    webLog("WiFi: Scan failed!");
    server.send(500, "application/json", "[]");
    return;
  }

  String json = "[";
  for (int i = 0; i < n; i++) {
    if (i > 0)
      json += ",";
    int encType = (int)WiFi.encryptionType(i);
    bool isEncrypted = (encType != 0);
    json += "{\"ssid\":\"" + WiFi.SSID(i) +
            "\",\"rssi\":" + String(WiFi.RSSI(i)) +
            ",\"encrypted\":" + String(isEncrypted) + "}";
  }
  json += "]";
  server.send(200, "application/json", json);
  WiFi.scanDelete();
  webLog("WiFi: Found " + String(n) + " networks.");
}

void handleLogs() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  if (scriptId == "") {
    server.send(200, "application/json", "[]");
    return;
  }
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = "https://script.google.com/macros/s/" + scriptId +
               "/exec?action=get_logs&mac=" + myMac;
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  if (http.begin(client, url)) {
    int code = http.GET();
    if (code == 200 || code == 302)
      server.send(200, "application/json", http.getString());
    else
      server.send(200, "application/json", "[]");
    http.end();
  } else
    server.send(200, "application/json", "[]");
}

void handleInventory() {
  if (!isAuth()) {
    server.send(403, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  if (scriptId == "") {
    server.send(200, "application/json", "[]");
    return;
  }
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url =
      "https://script.google.com/macros/s/" + scriptId +
      "/exec?action=get_inventory&mac=" + myMac + "&user=" + deviceUser +
      "&pass=" +
      devicePass; // ⭐ FIX: Include auth params for reliable GSheet access
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  if (http.begin(client, url)) {
    http.setTimeout(15000); // ⭐ FIX: Add timeout to prevent hanging
    int code = http.GET();
    if (code == 200 || code == 302)
      server.send(200, "application/json", http.getString());
    else
      server.send(200, "application/json", "[]");
    http.end();
  } else
    server.send(200, "application/json", "[]");
}

void handleValidate() {
  if (!server.hasArg("uid")) {
    server.send(400, "application/json",
                "{\"status\":\"error\",\"message\":\"Missing UID\"}");
    return;
  }
  String uid = server.arg("uid");
  String action = server.hasArg("action") ? server.arg("action") : "check";

  if (scriptId == "") {
    server.send(
        400, "application/json",
        "{\"status\":\"error\",\"message\":\"Script ID not configured\"}");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = "https://script.google.com/macros/s/" + scriptId +
               "/exec?action=" + action + "&uid=" + uid + "&mac=" + myMac +
               "&user=" + deviceUser +
               "&pass=" + devicePass; // ⭐ FIX: Include auth for verify lookup
  // 🔧 FIXED: use the library constant directly
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  if (http.begin(client, url)) {
    http.setTimeout(10000);
    int code = http.GET();
    if (code == 200 || code == 302) {
      server.send(200, "application/json", http.getString());
    } else {
      server.send(500, "application/json",
                  "{\"status\":\"error\",\"message\":\"HTTP " + String(code) +
                      "\"}");
    }
    http.end();
  } else {
    server.send(500, "application/json",
                "{\"status\":\"error\",\"message\":\"Connection Failed\"}");
  }
}

void handleResetDisplay() {
  capturedUid = "--------";
  lastUserName = "READY TO SCAN";
  lastStatusMsg = "Scan Ready...";
  lastDetailedStatus = "";
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

void handleGetScriptId() {
  server.send(200, "application/json", "{\"scriptId\":\"" + scriptId + "\"}");
}