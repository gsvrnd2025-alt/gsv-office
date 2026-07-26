# Walkthrough: Bulk RFID Auto-Assignment & ESP32 Sequential LCD Update

This walkthrough summarizes the changes made to implement bulk RFID card auto-assignment, display detailed student information on all Request Management tables, resolve ESP32 `HTTP -11` read timeout issues, and enforce inventory/assignment validation on the LCD screens.

## Changes Made

### 1. Google Apps Script Backend (`code.js`)
- **Student Details in Requests**: Updated `getPendingAttendanceDetails()` to load all active student registration profiles and attach a comprehensive `StudentDetails` object (containing ID, Name, College, Batch, and Period dates) to each pending manual request, diary request, correction request, doc replacement, and access request.
- **Enforced RFID Validation**: Modified `markRfidAttendance()` to verify tags against the `RFID_Inventory` sheet.
  - If a tag does not exist: Return `UNKNOWN CARD` and message `'Not in Inventory: Contact Admin'`.
  - If a tag is unassigned: Return `CARD UNASSIGNED` and message `'Card Unassigned: Contact Admin'`.
  - If today is Sunday and no custom batch slot exception exists: Deny entry with `'Sunday Holiday'`.
- **Customized Check-in Limits**: Returns custom messages based on the scan source (`'Already Web Checkin'` vs `'Already RFID Checkin'`).
- **Student Details in Errors**: Returns name, registration ID, college, and slot timing alongside error structures on all validation failures so they can be shown on the microcontroller LCD.
- **Bulk RFID Assignment**: Created `bulkAssignRfidCards(regIds)` to assign available cards in bulk, with loop concurrency safety via `SpreadsheetApp.flush()`.

### 2. Admin Dashboard Front-End (`AdminDashboard.html`)
- **Student Details Integration**: Updated all 8 request tables under "Request Management" to display student name, college, batch, and internship dates using the custom `renderStudentDetailsHtml` helper.
- **Bulk Auto-Assignment Button**: Added the "Auto-Assign RFID" button to the `#manageStudentsBulkActions` toolbar.
- **Front-End Handler**: Implemented `handleBulkAssignRfid()` to gather selected student IDs, prompt for confirmation via SweetAlert, call the backend `bulkAssignRfidCards` function, show toast/modal status feedback, and reload the students list.

### 3. ESP32 Firmware (`esp32_v3.ino`)
- **HTTP Timeout Optimization**: Increased `http.setTimeout(8000)` to `15000` inside `processCardTask()` to handle long Apps Script run times and resolve `HTTP -11` read timeouts.
- **SSL Resource Release**: Added `client.stop()` immediately after every `http.end()` to prevent RAM fragmentation/handshake failures.
- **Sequential Screens**: Redesigned `updateUIEngine()`'s `UI_RESULT` state for standard mode cards to show a 2-second screen transition sequence:
  1. `RES_NAME` (Student Name)
  2. `RES_REG` (Registration ID)
  3. `RES_COLLEGE` (College Name - scrolls if > 16 chars)
  4. `RES_SLOT` (Regular Slot Timing)
  5. `RES_PUNCH_TIME` (Punch Time, success path only)
  6. `RES_STATUS_SUCCESS` (Formatted Date + Time + Success/Denied outcome)
  7. `RES_STATUS_DETAIL` (Detailed status or error, e.g. `Already Web Checkin`)
  8. `RES_DENIED_3` (`Contact Admin`, fail path only)
- **Date Retrieval Helper**: Added `String getRTCDate()` returning `%d/%m` format using local RTC time.

---

## Verification Results

### 1. Verification of ESP32 Compilation
- Successfully compiled the updated `esp32_v3.ino` using `arduino-cli`:
  ```bash
  arduino-cli compile --fqbn esp32:esp32:esp32 esp32_v3
  ```
  - **Result**: `Sketch uses 1282871 bytes (97%) of program storage space...` (Compiled successfully).

### 2. Deployment to Google Apps Script
- Pushed changes to Google Apps Script using `clasp push`.
- Redeployed the changes to the active deployment ID (`AKfycbxvPlPHaajzeUdf8JqzPBe_5n7vswC18RPv1N9rwprjf1w6k-4slmE2aCzjDgDRsoIGDw`) at Version 88:
  ```bash
  clasp deploy -i AKfycbxvPlPHaajzeUdf8JqzPBe_5n7vswC18RPv1N9rwprjf1w6k-4slmE2aCzjDgDRsoIGDw -d "V5.4.0 - Bulk RFID Auto-Assignment & ESP32 Sequential LCD Update"
  ```
  - **Result**: Successfully deployed. The web dashboard and ESP32 will immediately use the updated logic under the same URL.

---

# Walkthrough: Access Control Status Column, Profile Checkboxes, and Assigned Status Support

This walkthrough summarizes the changes made to introduce direct RFID/Attendance access columns, support the "Assigned" student status for check-ins, fix document summary and count discrepancies, and display student roll numbers in the request tables.

## Changes Made

### 1. Google Apps Script Backend (`code.js`)
- **Portal Inactive / Assigned Status Validation**: Updated the active validation logic in `recordWebCheckin()`, `recordWebCheckout()`, and `markRfidAttendance()` to accept the `assigned` status as a valid active status, preventing check-in denials for students whose cards were recently assigned.
- **Access Level Enforcement**: Updated `recordWebCheckin()`, `recordWebCheckout()`, and `markRfidAttendance()` to strictly enforce the `AttendanceAccess` configuration. If locked/disabled, students are denied check-in/out with a descriptive error.
- **Accurate Document Counts**: Modified `getAllStudents()` to query both the `FILE_MANAGER` and `GENERATED_DOCUMENTS` sheets, counting all student-uploaded files plus unique generated PDF files to reflect the correct number of documents (e.g. 9 files).
- **Document Summary Payload**: Fixed a bug in `getStudentComprehensiveProfile()` where the `summary` object (indicating completion of mandatory uploads like Bonafide, Declaration, and College ID) was discarded. It is now correctly embedded in the JSON payload and rendered inside the profile modal.
- **Roll Number Mapping**: Added the `RegisterNumber` (Roll Number) mapping to `getPendingAttendanceDetails()` so request tables can query it.
- **Assigned Status in RFID Management**: Updated `getRfidManagementState()` to treat the `assigned` status as valid, ensuring students show up on the RFID dashboard.

### 2. Admin Dashboard Front-End (`AdminDashboard.html`)
- **Manage Students Access Column**: Added an **Access** column showing a green `<span class="badge bg-success"><i class="fas fa-lock-open"></i> Active</span>` or red `<span class="badge bg-danger"><i class="fas fa-lock"></i> Locked</span>` status for attendance.
- **RFID Assigned Table Access Column**: Added the same **Access** status badge column to the RFID Assigned table to make permission locks immediately visible.
- **Edit Profile Checkboxes**: Appended checkboxes for both **Attendance Access** and **Diary Access** inside the profile edit modal. They are disabled by default and enabled when the admin clicks "Edit Profile".
- **Access Permission Saving**: Updated `saveProfileChanges()` to read and serialize the checkbox states as `'TRUE'`/`'FALSE'` strings and send them to the backend spreadsheet update handler.
- **Roll Number display in Request Management**: Updated `renderStudentDetailsHtml` to render the student's Roll Number (Register Number) as a badge right next to the registration ID in all 8 request management tables.

---

## Verification Results

### 1. Code Deployment
- Successfully pushed the updated files to Google Apps Script via `clasp push`.
- Deployed the code as Version 89 under the active deployment ID (`AKfycbxvPlPHaajzeUdf8JqzPBe_5n7vswC18RPv1N9rwprjf1w6k-4slmE2aCzjDgDRsoIGDw`):
  ```bash
  clasp deploy -i AKfycbxvPlPHaajzeUdf8JqzPBe_5n7vswC18RPv1N9rwprjf1w6k-4slmE2aCzjDgDRsoIGDw -d "V5.4.1 - Access Status Column & Assigned Status Fix"
  ```
- **Result**: Successfully deployed to Version 90.

### 3. College Name Header Robustness & Batch Support on scan
- **Fallback Headers**: Updated student properties parsing in `getCardInfo()` and `markRfidAttendance()` inside `code.js` to look for fallback property names:
  - `college`: Checks `student.CollegeName || student.College || student.college || student["College Name"] || 'N/A'`
  - `regId`: Checks `student.RegistrationID || student.registrationId || student["Registration ID"] || ''`
  - `batch`: Checks `student.Batch || student.batch || student["Batch"] || 'N/A'`
  - This ensures that if the Google Sheet headers are edited or differ, the values will still load successfully and not show "N/A" on the LCD.
- **Batch Field Added to response**: Added the `batch` parameter to all successful and validation error response objects returned by `markRfidAttendance()` and `getCardInfo()`.
- **LCD Batch Display**: Added the `RES_BATCH` state to the ESP32 UI results engine. When a card is scanned, it displays the student's batch details (e.g. `Batch: B1`) on Row 2 for 2 seconds right after the College Name and before the Slot Timings.
- **Verification of ESP32 Compile**:
  - Successfully compiled the updated `esp32_v3.ino` using `arduino-cli`:
    ```bash
    arduino-cli compile --fqbn esp32:esp32:esp32 esp32_v3
    ```
    - **Result**: Compiled successfully (Sketch uses 1283175 bytes (97%) of program storage space).

### 4. Deploy Version 91
- Successfully pushed the updated script using `clasp push`.
- Deployed the code as Version 91 under the active deployment ID (`AKfycbxvPlPHaajzeUdf8JqzPBe_5n7vswC18RPv1N9rwprjf1w6k-4slmE2aCzjDgDRsoIGDw`):
  ```bash
  clasp deploy -i AKfycbxvPlPHaajzeUdf8JqzPBe_5n7vswC18RPv1N9rwprjf1w6k-4slmE2aCzjDgDRsoIGDw -d "V5.4.3 - College Name Fallbacks & Batch Return on RFID Scan"
  ```
- **Result**: Successfully deployed to Version 91. The LCD display will now show the student's batch and correctly resolve college names under all variant column headers.
