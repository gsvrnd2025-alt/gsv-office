# GSV Office / Internship Student Portal — Multiplatform Flutter Client

This directory contains the source code for the multiplatform Flutter-based workspace client. It connects dynamically to either the E-Office TrueNAS web application portal or the Google Apps Script Web App host.

## Features
- **Embedded Web View**: Runs a secure, high-performance `flutter_inappwebview` instance.
- **Settings Gear Dialog**: Toggle and save custom server URLs (either the TrueNAS portal `http://<IP>:8080` or the Google Apps Script web app URL `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`).
- **Hardware Integrations**: Ready for native desktop/mobile file downloads, notifications, and web view sessions.

---

## 🛠️ Requirements & Setup

Before building the application, ensure you have the [Flutter SDK](https://docs.flutter.dev/get-started/install) installed and configured on your machine. Run `flutter doctor` to verify your environment.

1. **Install dependencies**:
   ```bash
   flutter pub get
   ```

2. **Run the app locally in debug mode**:
   - To run on a connected Android/iOS device or emulator:
     ```bash
     flutter run
     ```
   - To run on Windows Desktop:
     ```bash
     flutter run -d windows
     ```

---

## 📦 Compilation & Build Commands

Compile release-ready binaries for Desktop, Android, and iOS using the following commands:

### 🤖 1. Android (APK & AAB)
To generate a standalone APK package to install on Android devices:
```bash
flutter build apk --release
```
*Output Path:* `build/app/outputs/flutter-apk/app-release.apk`

To generate an Android App Bundle (AAB) for Google Play Store upload:
```bash
flutter build appbundle --release
```
*Output Path:* `build/app/outputs/bundle/release/app-release.aab`

---

### 🍏 2. iOS App (Apple devices)
*Requires a macOS machine with Xcode installed.*
To generate a release build archive for iOS:
```bash
flutter build ios --release
```
*Output Path:* `build/ios/iphoneos/Runner.app` (Can be archived and uploaded via Xcode/Transporter).

---

### 🪟 3. Windows Desktop
*Requires Visual Studio with C++ desktop development package.*
To generate a standalone Windows executable (`.exe`):
```bash
flutter build windows --release
```
*Output Path:* `build/windows/x64/runner/Release/` (Zip the entire `Release` folder to distribute the desktop app).

---

### 🍎 4. macOS Desktop
*Requires a macOS machine with Xcode.*
To generate a macOS desktop app:
```bash
flutter build macos --release
```
*Output Path:* `build/macos/Build/Products/Release/`

---

## ⚙️ Connecting to Google Apps Script or TrueNAS
1. Open the application.
2. Tap the semi-transparent **Settings Gear** icon in the top-right corner.
3. Enter your target URL:
   - For **TrueNAS E-Office**: `http://192.168.0.177:8080`
   - For **Apps Script Internship Portal**: `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`
4. Click **Connect**. The settings are persisted locally via `SharedPreferences`.
