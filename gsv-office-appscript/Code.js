/**
 * GSV Electrical Enterprises Internship Portal - Backend Script
 *
 * This script handles all backend logic for student registration,
 * certificate verification, and the admin/student dashboards.
 *
 */

// =================================================================================
// GLOBAL CONSTANTS
// =================================================================================
const SPREADSHEET_ID = '1j_uRYCqpE9YLTkd40IU6vq-N6bYDD3y79MvOdFIrkSM'; // Updated to user-provided production spreadsheet
const PORTAL_URL = 'https://www.gsvee.in/gsv-internship-portal';
const SHEET_NAMES = {
  REGISTRATIONS: 'Internship Registrations',
  ADMIN_CREDENTIALS: 'Admin Credentials',
  CERTIFICATE_DATA: 'Certificate Data',
  TASKS: 'Tasks',
  PROJECTS: 'Projects',
  STUDENT_DIARY: 'StudentDiary',
  ATTENDANCE: 'Attendance',
  CHAT_MESSAGES: 'ChatMessages',
  RECENT_ACTIVITY: 'RecentActivityLog',
  ADMIN_NOTIFICATIONS: 'AdminNotifications',
  NOTIFICATIONS: 'Notifications',
  ACTIVITY_LOG: 'ActivityLog',
  ATTENDANCE_OTP: 'AttendanceOTP',
  APP_SETTINGS: 'AppSettings',
  BATCHES: 'Batches',
  BATCH_CHAT: 'BatchChat',
  EMAIL_TEMPLATES: 'EmailTemplates',
  GENERATED_DOCUMENTS: 'GeneratedDocuments',
  FILE_MANAGER: 'FileManager',
  RFID_INVENTORY: 'RFID_Inventory',
  SLOTS: 'Slots',
  SLOT_EXCEPTIONS: 'SlotExceptions',
  STUDENT_REQUESTS: 'StudentRequests',
  NOTICES_CIRCULARS: 'NoticesCirculars',
  SLOT_SETTINGS: 'slot_settings',
  ATTENDANCE_REQUESTS: 'attendance_requests',
  SLOT_TIMING_HISTORY: 'SlotTimingHistory',
  RFID_DEVICES: 'RFID_Devices',
  RFID_DEVICE_LOGS: 'RFID_Device_Logs',
  SWITCH_STATUS: 'Switch_Status',
  CERTIFICATE_CONTENT: 'CertificateContent',
  RFID_ONLINE_STATUS: 'RFID_Online_Status',
  CONSOLIDATED_INTERNSHIPS: 'Consolidated_Internships',
  CONSOLIDATED_TEMPLATE: 'Consolidated_Template'
};

const TEMPLATE_IDS = {
  OFFER_LETTER: '1Jph612tzuUoxc1k9kjU5TVPltm_Z8KGeHszYSgEiirk',
  JOINING_LETTER: '1Jph612tzuUoxc1k9kjU5TVPltm_Z8KGeHszYSgEiirk',
  ID_CARD: '1Jph612tzuUoxc1k9kjU5TVPltm_Z8KGeHszYSgEiirk',
  ENTRY_PASS: '1Jph612tzuUoxc1k9kjU5TVPltm_Z8KGeHszYSgEiirk',
  INTERNSHIP_CERTIFICATE: '1VD8xC3OFZ6FvDmGifDt7my4bvaUUgAyKxxj9h7yJlZY',
  APPLICATION_FORM: '1kzbHGvqITge2s4cqIIq4TyWbPPCM9I8RhCwQnOU27Sk'
};

const SHEET_SCHEMAS = {
  [SHEET_NAMES.REGISTRATIONS]: ["Timestamp", "RegistrationID", "ApplicationStatus", "FirstName", "MiddleName", "LastName", "Address", "Pincode", "District", "GmailID", "MobileNumber", "CollegeName", "CollegeCode", "CollegeDistrict", "RegisterNumber", "EducationType", "Year", "Semester", "Department", "DateofBirth", "InternshipStartDate", "InternshipEndDate", "DurationDays", "GPA", "InterestedArea", "Remarks", "ApprovalDate", "ApplicationPdfId", "OfferLetterPdfId", "JoiningLetterPdfId", "LastLogin", "LastChatCheck", "ProfilePhotoUrl", "Batch", "CertificateLink", "CertificateIssuedDate", "Status", "BonafideUrl", "DeclarationUrl", "CollegeIdUrl", "OtherUrl", "AttendanceAccess", "DiaryAccess", "RFID_TagID"],
  [SHEET_NAMES.ADMIN_CREDENTIALS]: ["AdminID", "Password", "Name", "Email", "LastLogin"],
  [SHEET_NAMES.CERTIFICATE_DATA]: ["CertificateNumber", "StudentRegistrationID", "StudentName", "RegisterNumber", "Department", "InternshipStartDate", "InternshipEndDate", "DurationDays", "IssuedDate", "Status", "Batch", "CertificatePdfId"],
  [SHEET_NAMES.TASKS]: ["TaskID", "StudentRegistrationID", "Title", "Description", "DueDate", "Status", "AssignedDate", "CompletedDate", "SubmissionNotes", "SubmissionFileUrl", "SubmissionFileName"],
  [SHEET_NAMES.PROJECTS]: ["ProjectID", "StudentRegistrationID", "Title", "Description", "StartDate", "EndDate", "Status", "AssignedDate", "CompletedDate", "SubmissionNotes", "SubmissionFileUrl", "SubmissionFileName"],
  [SHEET_NAMES.ATTENDANCE]: ["AttendanceID", "StudentRegistrationID", "StudentName", "Date", "Status", "InTime", "OutTime", "TargetTime", "WorkArea", "Remarks", "AdminComment", "IsCommentRead", "Timestamp", "EntryMode", "ApprovalStatus", "LeaveType", "AttachmentUrl", "checkin_source", "late_flag"],
  [SHEET_NAMES.CHAT_MESSAGES]: ['MessageID', 'SenderID', 'ReceiverID', 'Message', 'Timestamp', 'IsReadByReceiver', 'FileID', 'FileName', 'FileUrl'],
  [SHEET_NAMES.RECENT_ACTIVITY]: ["Timestamp", "ActivityType", "User", "Details"],
  [SHEET_NAMES.ADMIN_NOTIFICATIONS]: ["NotificationID", "Timestamp", "Title", "Message", "IsRead", "TargetAdminID"],
  [SHEET_NAMES.NOTIFICATIONS]: ["ID", "Title", "Message", "Timestamp", "IsRead"],
  [SHEET_NAMES.ACTIVITY_LOG]: ["ID", "Action", "Description", "Timestamp"],
  [SHEET_NAMES.ATTENDANCE_OTP]: ["ID", "RegistrationID", "OTP", "ActionType", "ExpiryTimestamp", "TargetDate", "TargetTime", "Reason", "Status", "LeaveType", "AttachmentUrl"],
  [SHEET_NAMES.APP_SETTINGS]: ['SettingKey', 'SettingValue'],
  [SHEET_NAMES.BATCHES]: ["BatchID", "BatchName", "Mentor", "Project", "Description", "SkillLearned", "WorkArea", "Students", "Status", "SlotStartTime", "SlotEndTime"],
  [SHEET_NAMES.BATCH_CHAT]: ['MessageID', 'BatchName', 'SenderID', 'SenderName', 'Message', 'Timestamp', 'FileID', 'FileName', 'FileUrl'],
  [SHEET_NAMES.STUDENT_DIARY]: ["StudentRegistrationID", "Date", "Content", "Status", "Timestamp"],
  [SHEET_NAMES.EMAIL_TEMPLATES]: ["TemplateID", "Type", "Subject", "Body", "Placeholders"],
  [SHEET_NAMES.GENERATED_DOCUMENTS]: ["DocumentID", "StudentRegistrationID", "DocType", "ReferenceNumber", "DocUrl", "PdfFileId", "GeneratedDate", "SentViaEmail"],
  [SHEET_NAMES.FILE_MANAGER]: ["FileID", "StudentRegistrationID", "FileName", "FileUrl", "DocType", "UploadDate", "FileSize", "Status"],
  [SHEET_NAMES.RFID_INVENTORY]: ["RFID_TagID", "Status", "AssignedTo", "LastUpdated", "AddedBy", "AddedDate"],
  [SHEET_NAMES.SLOTS]: ["SlotID", "BatchID", "DayOfWeek", "StartTime", "EndTime", "Label", "Status"],
  [SHEET_NAMES.SLOT_EXCEPTIONS]: ["ExceptionID", "BatchID", "TargetDate", "StartTime", "EndTime", "Label", "Status"],
  [SHEET_NAMES.CONSOLIDATED_TEMPLATE]: ["Certificate No", "IssuedDate", "Name", "Register Number", "Department", "CollegeName", "CollegeDistrict", "Start Date", "End Date", "Duration", "Batch", "Registration ID", "status"],
  [SHEET_NAMES.STUDENT_REQUESTS]: ["RequestID", "RegistrationID", "StudentName", "RequestType", "Section", "TargetDate", "TargetTime", "EndDate", "Reason", "LeaveType", "Status", "RequestDate", "AttachmentUrl", "OTP", "ProcessedDate", "ProcessedBy", "AdminRemarks"],
  [SHEET_NAMES.NOTICES_CIRCULARS]: ["NoticeID", "Type", "Title", "Content", "Priority", "TargetAudience", "TargetBatch", "CreatedDate", "ExpiryDate", "CreatedBy", "Status", "AttachmentUrl", "ReadBy"],
  [SHEET_NAMES.SLOT_SETTINGS]: ["type", "batch", "start_time", "end_time", "late_after", "early_exit_before", "enabled", "rfid_enabled", "rfid_grace_late", "rfid_grace_early", "applicable_for", "applicable_target", "created_at", "created_from", "history_id", "validity_days"],
  [SHEET_NAMES.ATTENDANCE_REQUESTS]: ["RequestID", "RegistrationID", "Type", "Date", "TargetTime", "Reason", "Status", "Timestamp"],
  [SHEET_NAMES.SLOT_TIMING_HISTORY]: ["HistoryID", "SlotType", "BatchName", "StudentTarget", "StartTime", "EndTime", "LateAfter", "EarlyExitBefore", "RFIDEnabled", "GraceLate", "GraceEarly", "Enabled", "CreatedFrom", "CreatedAt", "ModifiedAt", "Action"],
  [SHEET_NAMES.RFID_DEVICES]: ["MAC_ID", "DeviceName", "IP_Address", "Location", "LastSeen", "Status", "PendingCommand", "Username", "Password"],
  [SHEET_NAMES.RFID_DEVICE_LOGS]: ["Timestamp", "MAC_ID", "Event", "Details"],
  [SHEET_NAMES.SWITCH_STATUS]: ["SwitchKey", "Status", "LastUpdated"],
  [SHEET_NAMES.CERTIFICATE_CONTENT]: ["BatchName", "Content", "LastUpdated"],
  [SHEET_NAMES.RFID_ONLINE_STATUS]: ["MAC_ID", "DeviceName", "Status", "LastSeen", "LastSync", "IP_Address"],
  [SHEET_NAMES.CONSOLIDATED_INTERNSHIPS]: ["Timestamp", "RegistrationID", "ApplicationStatus", "FirstName", "MiddleName", "LastName", "Address", "Pincode", "District", "GmailID", "MobileNumber", "CollegeName", "CollegeCode", "CollegeDistrict", "RegisterNumber", "EducationType", "Year", "Semester", "Department", "DateofBirth", "InternshipStartDate", "InternshipEndDate", "DurationDays", "GPA", "InterestedArea", "Remarks", "ApprovalDate", "ApplicationPdfId", "OfferLetterPdfId", "JoiningLetterPdfId", "LastLogin", "LastChatCheck", "ProfilePhotoUrl", "Batch", "CertificateLink", "CertificateIssuedDate", "Status", "BonafideUrl", "DeclarationUrl", "CollegeIdUrl", "OtherUrl", "AttendanceAccess", "DiaryAccess", "RFID_TagID"]
};

/**
 * Initializes the system by ensuring all required sheets exist and have the correct headers.
 */
// (Duplicate initializeSystem removed - using robust version below)

const CACHE_EXPIRATION = 300; // 5 minutes (300 seconds)
// Default IDs (Fallback if not in AppSettings)
const DEFAULT_CERTIFICATES_FOLDER_ID = '17Eck4TTD8tEj9-17k89axrZwfcXCggdk';
const DEFAULT_UPLOADS_FOLDER_ID = '1buO0uixfqSA8O1-v1to41O0YRbaBLNWs';
const DEFAULT_CHAT_FOLDER_ID = '13UDF_s9FnNa6Aq4_uCsyEs1okrSDHDVM';
const DEFAULT_REPORTS_FOLDER_ID = '1DJtfI5k6ZIEvNeuTBsHwlK0Is0faJlCc';
const DEFAULT_DOCUMENTS_FOLDER_ID = '1JQ1HcuQ6m6pit_04iALEea9IT34hEGbE';
const DEFAULT_BATCHES_FOLDER_ID = '1CMBT96tgQpWcU8ACt-TmDFwF3NmWWUCE';

/**
 * Retrieves a Folder ID from AppSettings or fallback to defaults.
 */
function getSystemFolderId(type) {
  const settingsRes = getAppSettings();
  const settings = (settingsRes && settingsRes.status === 'success') ? settingsRes.settings : {};

  const mapping = {
    'generated': 'FOLDER_GENERATED',
    'uploads': 'FOLDER_UPLOADS',
    'chat': 'FOLDER_CHAT',
    'reports': 'FOLDER_REPORTS',
    'documents': 'FOLDER_DOCUMENTS',
    'batches': 'FOLDER_BATCHES'
  };

  const key = mapping[type];
  if (key && settings[key]) return settings[key];

  const defaults = {
    'generated': DEFAULT_CERTIFICATES_FOLDER_ID,
    'uploads': DEFAULT_UPLOADS_FOLDER_ID,
    'chat': DEFAULT_CHAT_FOLDER_ID,
    'reports': DEFAULT_REPORTS_FOLDER_ID,
    'documents': DEFAULT_DOCUMENTS_FOLDER_ID,
    'batches': DEFAULT_BATCHES_FOLDER_ID
  };

  return defaults[type];
}
const ADMIN_EMAIL_ID = 'gsveeip2026@gmail.com';
const COMPANY_NAME = "GSV Electrical Enterprises";
const COMPANY_CONTACT = "9092610415";
const COMPANY_WEBSITE = "gsvee.in";
const COMPANY_CHIEF_ENGINEER = "S Vijay Varman";
const COMPANY_CHIEF_TITLE = "Chief Electrical Engineer";
const CHIEF_ENGINEER_DETAILS = `${COMPANY_CHIEF_ENGINEER}.DEEE,BE,MBA<br>${COMPANY_CHIEF_TITLE}`;

const EMAIL_SIGNATURE_HTML = `Best regards,<br>
${CHIEF_ENGINEER_DETAILS}<br>
${COMPANY_NAME}<br>
Contact: ${COMPANY_CONTACT}<br>
Web: <a href="https://www.${COMPANY_WEBSITE}">${COMPANY_WEBSITE}</a>`;

const EMAIL_SIGNATURE_TEXT = `Best regards,\n
${CHIEF_ENGINEER_DETAILS.replace(/<br>/g, '\n')}\n
${COMPANY_NAME}\n
Contact: ${COMPANY_CONTACT}\n
Web: https://www.${COMPANY_WEBSITE}`;


/**
 * Creates a custom menu in the Google Spreadsheet for easy system management.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('GSV Portal')
      .addItem('🚀 Initialize/Repair System', 'initializeSystem')
      .addItem('🔍 System Health Check', 'runSystemCheck')
      .addSeparator()
      .addItem('⚙️ System Maintenance', 'runMaintenanceTasks')
      .addToUi();
  } catch (e) {
    Logger.log("onOpen error: " + e.toString());
  }
}

// =================================================================================
// WEB APP ENTRY POINT (doGet)
// =================================================================================
//function testProfile() {
//Logger.log(getStudentProfile("GSV/2025/1/VCW2"));
/**
 * Retrieves all switch statuses from the Switch_Status sheet
 */
function getAllSwitchStatuses() {
  try {
    const sheet = getSheet(SHEET_NAMES.SWITCH_STATUS);
    if (!sheet) return { status: 'error', message: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    const result = {};
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0]).trim();
      if (key) {
        result[key] = data[i][1];
      }
    }
    return { status: 'success', data: result };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Helper to check if a switch is ON
 */
function isSwitchOn(key) {
  const status = getAllSwitchStatuses();
  if (status.status === 'success' && status.data[key] !== undefined) {
    const s = String(status.data[key] || '').toUpperCase();
    return (s === 'ON' || s === 'TRUE');
  }

  // Legacy Fallback for continuity
  const settings = getAppSettings().settings || {};
  const mapping = {
    'settingCertificateTriggerMode': 'CertificateTriggerMode',
    'settingDefaultSlotEnabled': 'DefaultSlotAssignment',
    'rfidAutomationToggle': 'RFID_Automation_Mode'
  };
  const legacyKey = mapping[key];
  if (legacyKey && settings[legacyKey]) {
    const v = String(settings[legacyKey]).toUpperCase();
    return (v === 'AUTO' || v === 'TRUE' || v === 'ON');
  }

  return false;
}

/**
 * Saves or updates a switch status in the Switch_Status sheet
 */
function saveSwitchStatus(key, state) {
  try {
    const sheet = getSheet(SHEET_NAMES.SWITCH_STATUS);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        rowIndex = i + 1;
        break;
      }
    }

    const timestamp = new Date().toISOString();
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 2, 1, 2).setValues([[state, timestamp]]);
    } else {
      sheet.appendRow([key, state, timestamp]);
    }

    lock.releaseLock();
    // Also log this change
    logActivity('Switch Change', 'Admin', `Switch ${key} set to ${state}`);

    // ⭐️ SYNC: Ensure AppSettings stays in sync for crucial automation modes
    if (key === 'rfidAutomationToggle') {
      try {
        saveAppSettings({ 'RFID_Automation_Mode': (state === 'ON' ? 'Auto' : 'Manual') });
      } catch (err) { Logger.log("Sync Error: " + err); }
    } else if (key === 'settingDefaultSlotEnabled') {
      try {
        saveAppSettings({ 'DefaultSlotAssignment': (state === 'ON' ? 'Auto' : 'Manual') });
      } catch (err) { Logger.log("Sync Error: " + err); }
    } else if (key === 'settingCertificateTriggerMode') {
      try {
        saveAppSettings({ 'CertificateTriggerMode': (state === 'ON' ? 'Auto' : 'Manual') });
      } catch (err) { Logger.log("Sync Error: " + err); }
    }

    return { status: 'success', message: 'Switch status saved' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// EOF


function doGet(e) {
  if (e && e.parameter && (e.parameter.action === 'sync_eoffice' || e.parameter.action === 'sync')) {
    var data = getDatabase();
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
        .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.action === 'dump_debug_reg_id') {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const objects = getSheetDataAsObjects(sheet);
    const sample = objects.slice(0, 10).map(o => ({
      regId: o.RegistrationID || o.registrationId,
      name: `${o.FirstName || ''} ${o.LastName || ''}`.trim(),
      mobile: o.MobileNumber || o.mobile,
      status: o.ApplicationStatus || o.status
    }));
    return ContentService.createTextOutput(JSON.stringify(sample)).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    let page;
    if (e && e.parameter && e.parameter.page) {
      Logger.log('doGet called with parameters: ' + JSON.stringify(e.parameter));
      page = e.parameter.page;
    } else {
      Logger.log('doGet called without parameters (e.g., from editor or direct URL). Serving Index.html.');
      page = null;
    }

    // OPTIMIZATION: Only run initialization once per day or when forced via URL (?init=true)
    const props = PropertiesService.getScriptProperties();
    const lastInit = props.getProperty('LAST_INIT_DATE');
    const today = new Date().toDateString();

    if (lastInit !== today || (e && e.parameter && e.parameter.init === 'true')) {
      try {
        initializeSystem();
        props.setProperty('LAST_INIT_DATE', today);
      } catch (error) {
        Logger.log('Initialization error: ' + error);
      }
    }

    // Weekly Maintenance (Prune logs, sync data)
    const lastMaintStr = props.getProperty('LAST_MAINTENANCE_DATE');
    const lastMaint = lastMaintStr ? new Date(lastMaintStr) : new Date(0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (lastMaint < sevenDaysAgo) {
      runMaintenanceTasks();
      props.setProperty('LAST_MAINTENANCE_DATE', new Date().toISOString());
    }

    if (page === 'admin_dashboard') {
      const template = HtmlService.createTemplateFromFile('AdminDashboard');
      template.initialSection = e.parameter.s || 'dashboard'; // 's' for section
      const htmlOutput = template.evaluate();
      htmlOutput.setTitle('Admin Dashboard - GSV Internships')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      return htmlOutput;
    } else if (page === 'student_dashboard') {
      const template = HtmlService.createTemplateFromFile('StudentDashboard');
      template.initialSection = e.parameter.s || 'dashboard'; // 's' for section
      const htmlOutput = template.evaluate();
      htmlOutput.setTitle('Student Dashboard - GSV Internships')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      return htmlOutput;
    } else if (e && e.parameter && (e.parameter.action === 'rfid_scan' || e.parameter.action === 'check_device' || e.parameter.action === 'check_inv' || e.parameter.action === 'check' || e.parameter.action === 'get_history' || e.parameter.action === 'get_inventory' || e.parameter.action === 'get_inventory_list' || e.parameter.action === 'inventory' || e.parameter.action === 'checkin' || e.parameter.action === 'checkout' || e.parameter.action === 'get_logs' || e.parameter.action === 'online' || e.parameter.action === 'get_switches' || e.parameter.action === 'poll_command' || (e.parameter.uid && !e.parameter.page))) {
      // API Webhook for RFID Hardware (e.g. ESP32)
      const action = e.parameter.action;
      const uid = e.parameter.uid;
      const mac = e.parameter.mac || e.parameter.device_id || 'UNKNOWN';

      let res;
      if (action === 'online') {
        res = updateDeviceHeartbeat(mac, e);
      } else if (action === 'check_device') {
        res = verifyRfidDevice(mac, e);
      } else if (action === 'get_switches' || action === 'poll_command') {
        const hbRes = updateDeviceHeartbeat(mac, e);
        res = {
          command: (hbRes && hbRes.command) ? hbRes.command : '',
          verify: hbRes
        };
        if (action === 'get_switches') {
          const switchRes = getAllSwitchStatuses();
          res = { ...res, ...switchRes };
        }
      } else if (action === 'handshake_result') {
        res = handleHandshakeResult(mac, e.parameter.success, e.parameter.ip);
      } else if (action === 'inventory') {
        res = processRfidInventory(uid, mac, e);
      } else if (action === 'check_inv' || action === 'check') {
        res = lookupRfidTag(uid);
      } else if (action === 'get_history' || action === 'get_inventory' || action === 'get_inventory_list') {
        res = getRfidInventoryHistory(mac);
      } else if (action === 'get_logs') {
        res = getRfidAttendanceLogs(mac);
      } else if (action === 'get_slot_timing') {
        res = fetchStudentSlotTiming(uid, mac);
      } else {
        res = markRfidAttendance(uid, action, mac, e);
      }
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    } else {
      const template = HtmlService.createTemplateFromFile('Index');
      template.initialPage = e.parameter.page || 'home';
      template.initialSection = e.parameter.s || '';
      const htmlOutput = template.evaluate();
      htmlOutput.setTitle('GSV Electrical Enterprises Internship Portal')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      return htmlOutput;
    }
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString() + ' Stack: ' + error.stack);
    return HtmlService.createHtmlOutput('An error occurred: ' + error.toString());
  }
}
//
// =================================================================================
// RFID HARDWARE API FUNCTIONS
// Called by doGet() when ESP32 sends HTTP requests to the Google Apps Script endpoint
// =================================================================================

/**
 * Handshake Logic (Cloud-Mediated)
 */
function setRfidHandshake(mac, user, pass) {
  try {
    const macClean = mac.replace(/[:\s]/g, '').toUpperCase();
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    if (!sheet) return { status: 'error', message: 'RFID_Devices sheet missing' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');

    // Auto-create/find columns
    const ensureColumn = (name) => {
      let idx = headers.indexOf(name);
      if (idx === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(name);
        headers.push(name);
        return headers.length - 1;
      }
      return idx;
    };

    const cmdIdx = ensureColumn('PendingCommand');
    const resultIdx = ensureColumn('HandshakeResult');
    const userIdx = ensureColumn('Username');
    const passIdx = ensureColumn('Password');

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][macIdx]).replace(/[:\s]/g, '').toUpperCase() === macClean) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      // Create new device row if not exists
      const newRow = headers.map(h => {
        if (h === 'MAC_ID') return formatMac(macClean);
        if (h === 'DeviceName') return 'New Device';
        if (h === 'Status') return 'OFFLINE';
        if (h === 'LastSeen') return new Date();
        return '';
      });
      sheet.appendRow(newRow);
      rowIndex = sheet.getLastRow();
    }

    // Save credentials immediately so verifyRfidDevice can use them
    sheet.getRange(rowIndex, userIdx + 1).setValue(user);
    sheet.getRange(rowIndex, passIdx + 1).setValue(pass);
    sheet.getRange(rowIndex, cmdIdx + 1).setValue(`HANDSHAKE:${user}:${pass}`);
    sheet.getRange(rowIndex, resultIdx + 1).setValue('PENDING');

    return { status: 'success', message: 'Handshake command registered. Waiting for device...' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function handleHandshakeResult(mac, success, ip) {
  try {
    const macClean = mac.replace(/[:\s]/g, '').toUpperCase();
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    const resultIdx = headers.indexOf('HandshakeResult');
    const ipIdx = headers.indexOf('IP_Address');
    const statusIdx = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][macIdx]).replace(/[:\s]/g, '').toUpperCase() === macClean) {
        if (resultIdx !== -1) sheet.getRange(i + 1, resultIdx + 1).setValue(success === 'true' ? 'SUCCESS' : 'FAILED');
        if (ip && ipIdx !== -1) sheet.getRange(i + 1, ipIdx + 1).setValue(ip);
        if (success === 'true' && statusIdx !== -1) sheet.getRange(i + 1, statusIdx + 1).setValue('ONLINE');
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Device not found' };
  } catch (e) { return { status: 'error' }; }
}

function getHandshakeStatus(mac) {
  try {
    const macClean = mac.replace(/[:\s]/g, '').toUpperCase();
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    const resultIdx = headers.indexOf('HandshakeResult');
    const ipIdx = headers.indexOf('IP_Address');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][macIdx]).replace(/[:\s]/g, '').toUpperCase() === macClean) {
        return {
          status: 'success',
          result: String(data[i][resultIdx] || 'PENDING').trim().toUpperCase(),
          ip: data[i][ipIdx] || ''
        };
      }
    }
    return { status: 'error', message: 'Device not found' };
  } catch (e) { return { status: 'error' }; }
}

/**
 * Verifies if an RFID device (ESP32) is registered in the RFID_Devices sheet.
 * ESP32 calls: ?action=check_device&mac=XX:XX:XX:XX:XX:XX&ip=...
 */

/**
 * Lightweight heartbeat to update device status and retrieve pending commands.
 * Used by 'online', 'get_switches', and 'poll_command' actions to bypass heavy validation.
 */
function updateDeviceHeartbeat(mac, e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(2000);
    const macClean = (mac || '').replace(/[:\s]/g, '').toUpperCase();
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    if (!sheet) return { status: 'ERROR', message: 'RFID_Devices sheet missing' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    const ipIdx = headers.indexOf('IP_Address');
    const statusIdx = headers.indexOf('Status');
    const lastSeenIdx = headers.indexOf('LastSeen');
    const cmdIdx = headers.indexOf('PendingCommand');

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const rowMac = String(data[i][macIdx] || '').replace(/[:\s]/g, '').toUpperCase();
      if (rowMac === macClean) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return { status: 'ERROR', message: 'DATABASE ERROR:Unregistered' };

    const rowData = data[rowIndex - 1];
    const currentStatus = String(rowData[statusIdx] || '').toUpperCase();
    if (currentStatus === 'DISABLED' || currentStatus === 'BLOCKED') {
      return { status: 'ERROR', message: 'DEVICE BLOCKED' };
    }

    const now = new Date();
    const ip = e.parameter.ip || '';

    // Update Main Sheet (Minimal writes)
    if (ip && ipIdx !== -1) sheet.getRange(rowIndex, ipIdx + 1).setValue(ip);
    if (lastSeenIdx !== -1) sheet.getRange(rowIndex, lastSeenIdx + 1).setValue(now);

    let pendingCommand = '';
    if (cmdIdx !== -1) {
      pendingCommand = rowData[cmdIdx] || '';
      if (pendingCommand) sheet.getRange(rowIndex, cmdIdx + 1).setValue('');
    }

    return { status: 'success', command: pendingCommand };
  } catch (err) {
    return { status: 'ERROR', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}
/**
 * Verifies admin credentials and retrieves the latest IP for a MAC address.
 * Called by the Admin Dashboard during new device registration.
 */
function verifyDeviceAndGetIP(user, pass, mac) {
  try {
    const macClean = (mac || '').replace(/[:\s]/g, '').toUpperCase();
    const onlineSheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);
    let ip = '';
    let lastSeen = null;

    if (onlineSheet) {
      const oData = onlineSheet.getDataRange().getValues();
      const h = oData[0];
      const mIdx = h.indexOf('MAC_ID');
      const ipIdx = h.indexOf('IP_Address');
      const lsIdx = h.indexOf('LastSeen');

      for (let i = 1; i < oData.length; i++) {
        const rowMac = String(oData[i][mIdx] || '').replace(/[:\s]/g, '').toUpperCase();
        if (rowMac === macClean) {
          ip = oData[i][ipIdx];
          lastSeen = oData[i][lsIdx];
          break;
        }
      }
    }

    const now = new Date();
    const isRecentlySeen = lastSeen && (now - new Date(lastSeen) < 5 * 60 * 1000); // 5-min handshake threshold

    return {
      status: 'success',
      ip: ip || 'Pending Sync...',
      connected: !!isRecentlySeen,
      message: isRecentlySeen ? 'Handshake Successful: Device is Online' : 'Credentials Valid! Waiting for device handshake...'
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Triggered function to clean up offline devices (every 45 mins)
 */
/**
 * Triggered function to clean up offline devices (every 40 mins check)
 * Refactored to check multiple sheets (Devices, Online Status, and Logs) as a fallback.
 */
function checkRfidDeviceStatus() {
  try {
    const devicesSheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const onlineSheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);
    const logsSheet = getSheet(SHEET_NAMES.RFID_DEVICE_LOGS);

    if (!devicesSheet) return;

    const now = new Date();
    const thresholdMins = 40; // Hard threshold (30 min heartbeat + 10 min grace)

    // 1. Get latest log timestamps per MAC
    const latestLogsMap = {};
    if (logsSheet) {
      const logsData = logsSheet.getDataRange().getValues();
      const h = logsData[0];
      const tsIdx = h.indexOf('Timestamp');
      const mIdx = h.indexOf('MAC_ID');
      if (tsIdx !== -1 && mIdx !== -1) {
        for (let i = logsData.length - 1; i >= 1; i--) {
          const mac = standardizeMac(logsData[i][mIdx]);
          const ts = logsData[i][tsIdx];
          if (mac && ts instanceof Date) {
            if (!latestLogsMap[mac] || ts > latestLogsMap[mac]) {
              latestLogsMap[mac] = ts;
            }
          }
          if (i < logsData.length - 2000) break;
        }
      }
    }

    // 2. Get online status sheet data
    const onlineDataMap = {};
    if (onlineSheet) {
      const oData = onlineSheet.getDataRange().getValues();
      const h = oData[0];
      const mIdx = h.indexOf('MAC_ID');
      const lsIdx = h.indexOf('LastSeen');
      const sIdx = h.indexOf('Status');
      if (mIdx !== -1) {
        for (let i = 1; i < oData.length; i++) {
          const mac = standardizeMac(oData[i][mIdx]);
          if (mac) {
            onlineDataMap[mac] = {
              lastSeen: (lsIdx !== -1 && oData[i][lsIdx] instanceof Date) ? oData[i][lsIdx] : new Date(0),
              status: (sIdx !== -1) ? String(oData[i][sIdx]).toUpperCase() : '',
              rowIndex: i + 1
            };
          }
        }
      }
    }

    // ⭐️ 3. Check RecentActivityLog for RFID events (Source 4)
    const recentActivityMap = {};
    try {
      const ralSheet = getSheet('RecentActivityLog');
      if (ralSheet) {
        const ralCount = ralSheet.getLastRow();
        if (ralCount > 1) {
          const ralStart = Math.max(2, ralCount - 499);
          const ralNum = ralCount - ralStart + 1;
          const ralHeaders = ralSheet.getRange(1, 1, 1, ralSheet.getLastColumn()).getValues()[0];
          const ralData = ralSheet.getRange(ralStart, 1, ralNum, ralSheet.getLastColumn()).getValues();
          const rTsIdx = ralHeaders.indexOf('Timestamp') !== -1 ? ralHeaders.indexOf('Timestamp') : 0;
          const rActIdx = ralHeaders.indexOf('Action') !== -1 ? ralHeaders.indexOf('Action') : -1;
          const rUserIdx = ralHeaders.indexOf('User') !== -1 ? ralHeaders.indexOf('User') : -1;
          for (let i = 0; i < ralData.length; i++) {
            const action = rActIdx !== -1 ? String(ralData[i][rActIdx] || '') : '';
            if (action.indexOf('RFID_') === 0) {
              const userField = rUserIdx !== -1 ? String(ralData[i][rUserIdx] || '') : '';
              const macMatch = userField.match(/Device:([A-F0-9:]{17})/i);
              if (macMatch) {
                const mac = standardizeMac(macMatch[1]);
                const ts = ralData[i][rTsIdx];
                if (ts instanceof Date && (!recentActivityMap[mac] || ts > recentActivityMap[mac])) {
                  recentActivityMap[mac] = ts;
                }
              }
            }
          }
        }
      }
    } catch (ralErr) { /* non-fatal */ }

    // 4. Iterate over main devices and determine status
    const data = devicesSheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    const lsIdx = headers.indexOf('LastSeen');
    const sIdx = headers.indexOf('Status');

    if (macIdx === -1 || sIdx === -1) return;

    for (let i = 1; i < data.length; i++) {
      const rawMac = String(data[i][macIdx] || '');
      const macClean = standardizeMac(rawMac);
      if (!macClean) continue;

      // ⭐️ Collect timestamps from ALL 4 sources
      const tsInDevices = (lsIdx !== -1 && data[i][lsIdx] instanceof Date) ? data[i][lsIdx] : new Date(0);
      const tsInOnline = (onlineDataMap[macClean] && onlineDataMap[macClean].lastSeen) ? onlineDataMap[macClean].lastSeen : new Date(0);
      const tsInLogs = latestLogsMap[macClean] || new Date(0);
      const tsInRAL = recentActivityMap[macClean] || new Date(0);

      const maxSeen = new Date(Math.max(tsInDevices.getTime(), tsInOnline.getTime(), tsInLogs.getTime(), tsInRAL.getTime()));
      const diffMinutes = (now - maxSeen) / (1000 * 60);

      const currentStatus = String(data[i][sIdx] || '').toUpperCase();
      const newStatus = (diffMinutes <= thresholdMins) ? 'ONLINE' : 'OFFLINE';

      // Update Main Sheet if status changed
      if (currentStatus !== newStatus && currentStatus !== 'DISABLED' && currentStatus !== 'BLOCKED') {
        devicesSheet.getRange(i + 1, sIdx + 1).setValue(newStatus);

        // SYNC Online Status Sheet
        if (onlineSheet && onlineDataMap[macClean]) {
          const oHeaders = onlineSheet.getDataRange().getValues()[0];
          const oStatusIdx = oHeaders.indexOf('Status');
          if (oStatusIdx !== -1) {
            onlineSheet.getRange(onlineDataMap[macClean].rowIndex, oStatusIdx + 1).setValue(newStatus);
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Error in checkRfidDeviceStatus: " + e.toString());
  }
}

function standardizeMac(mac) {
  if (!mac) return "";
  return String(mac).replace(/[:\s]/g, '').toUpperCase();
}

function formatMac(mac) {
  if (!mac) return '';
  const clean = mac.replace(/[:\s]/g, '').toUpperCase();
  const match = clean.match(/.{1,2}/g);
  return match ? match.join(':') : clean;
}

/**
 * Lightweight verification for performance-sensitive scan webhooks.
 * Checks if the device exists and is not blocked without write operations or heavy locks.
 */
function quickVerify(mac) {
  if (!mac || mac === 'UNKNOWN') return false;
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    if (!sheet) return false;

    const macClean = mac.replace(/[:\s]/g, '').toUpperCase();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    const statusIdx = headers.indexOf('Status');

    if (macIdx === -1) return false;

    for (let i = 1; i < data.length; i++) {
      const rowMac = String(data[i][macIdx] || '').replace(/[:\s]/g, '').toUpperCase();
      if (rowMac === macClean) {
        if (statusIdx !== -1) {
          const status = String(data[i][statusIdx] || '').toUpperCase();
          return (status !== 'DISABLED' && status !== 'BLOCKED');
        }
        return true;
      }
    }
    return false;
  } catch (e) {
    Logger.log("quickVerify Error: " + e.toString());
    return false;
  }
}

function verifyRfidDevice(mac, e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(2000); // Optimized from 10000ms to 2000ms for faster response
    if (!mac || mac === 'UNKNOWN') {
      return { status: 'ERROR', message: 'No MAC address provided' };
    }
    const macClean = mac.replace(/[:\s]/g, '').toUpperCase();
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const onlineSheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);
    const adminSheet = getSheet(SHEET_NAMES.ADMIN_CREDENTIALS);

    if (!sheet) return { status: 'ERROR', message: 'RFID_Devices sheet missing' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    const ipIdx = headers.indexOf('IP_Address');
    const statusIdx = headers.indexOf('Status');
    const lastSeenIdx = headers.indexOf('LastSeen');
    const nameIdx = headers.indexOf('DeviceName');
    const userIdx = headers.indexOf('Username');
    const passIdx = headers.indexOf('Password');
    const cmdIdx = headers.indexOf('PendingCommand');
    const resultIdx = headers.indexOf('HandshakeResult');

    let deviceFound = false;
    let ip = (e && e.parameter && e.parameter.ip) ? e.parameter.ip : '';
    const now = new Date();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      const rowMac = String(data[i][macIdx] || '').replace(/[:\s]/g, '').toUpperCase();
      if (rowMac === macClean) {
        deviceFound = true;
        rowIndex = i + 1;

        // --- LIVE METADATA UPDATE ---
        // Ensure we update the MAIN RFID_DEVICES sheet
        if (ip && (ipIdx !== -1)) sheet.getRange(rowIndex, ipIdx + 1).setValue(ip);
        if (lastSeenIdx !== -1) {
          sheet.getRange(rowIndex, lastSeenIdx + 1).setValue(now);
          // Force sheet flush to ensure immediate registry update
          SpreadsheetApp.flush();
        }

        // --- SYNC RFID_ONLINE_STATUS SHEET ---
        if (onlineSheet) {
          const onlineRow = findRowIndexByValue(onlineSheet, macClean, 'MAC_ID', false);
          if (onlineRow !== -1) {
            const oHeaders = onlineSheet.getDataRange().getValues()[0];
            const oIpIdx = oHeaders.indexOf('IP_Address');
            const oSeenIdx = oHeaders.indexOf('LastSeen');
            const oStatIdx = oHeaders.indexOf('Status');
            if (oIpIdx !== -1 && ip) onlineSheet.getRange(onlineRow, oIpIdx + 1).setValue(ip);
            if (oSeenIdx !== -1) onlineSheet.getRange(onlineRow, oSeenIdx + 1).setValue(now);
            if (oStatIdx !== -1) onlineSheet.getRange(onlineRow, oStatIdx + 1).setValue('ONLINE');
          }
        }

        // --- FETCH PENDING COMMANDS ---
        const cmdIdx = headers.indexOf('PendingCommand');
        if (cmdIdx !== -1) {
          pendingCommand = data[i][cmdIdx] || '';
          // Clear command once fetched
          if (pendingCommand && pendingCommand !== '') {
            sheet.getRange(rowIndex, cmdIdx + 1).setValue('');
            logActivity('Device Control', mac, 'Fired Action: ' + pendingCommand);
          }
        }
        break;
      }
    }

    // ⭐️ STRICT REGISTRATION & AUTH CHECK
    const deviceUserName = (e && e.parameter && e.parameter.user) ? e.parameter.user : '';
    const devicePassword = (e && e.parameter && e.parameter.pass) ? e.parameter.pass : '';

    if (deviceFound) {
      const rowData = data[rowIndex - 1];
      const currentStatus = (rowData[statusIdx] || '').toString().toUpperCase();
      const storedUser = userIdx !== -1 ? (rowData[userIdx] || '').toString() : '';
      const storedPass = passIdx !== -1 ? (rowData[passIdx] || '').toString() : '';
      const deviceName = rowData[nameIdx] || 'RFID Terminal';

      // --- SELF-HEALING: Cleanup stored MAC to use standard colon format ---
      const macColons = formatMac(macClean);
      if (String(rowData[macIdx]) !== macColons) {
        sheet.getRange(rowIndex, macIdx + 1).setValue(macColons);
      }

      // 1. Block Disabled/Blocked devices
      if (currentStatus === 'DISABLED' || currentStatus === 'BLOCKED') {
        logDeviceEvent(macColons, 'Access Denied', `Device status: ${currentStatus}`);
        return { status: 'ERROR', message: `DEVICE BLOCKED`, name: 'BLOCKED' };
      }

      // ⭐️ STRICT ROW CHECK: Rows must not be empty (User/Pass/Handshake)
      const handshakeResult = resultIdx !== -1 ? (rowData[resultIdx] || '').toString().trim().toUpperCase() : 'PENDING';

      let authenticated = (deviceUserName === storedUser && devicePassword === storedPass && storedUser !== '' && storedPass !== '');

      if (!authenticated && (!storedUser || !storedPass)) {
        // Fallback to global admin (ONLY for registration/check_device, NOT for scan validation unless handshake is success)
        const adminData = adminSheet ? adminSheet.getDataRange().getValues() : [];
        for (let i = 1; i < adminData.length; i++) {
          if (String(adminData[i][0]) === deviceUserName && String(adminData[i][1]) === devicePassword) {
            authenticated = true;
            break;
          }
        }
      }

      // ⭐️ RELAXED AUTH: Handshake status is auxiliary; only strict authentication (User/Pass) is mandatory.
      if (!authenticated) {
        logDeviceEvent(macColons, 'Auth Fail', `Invalid credentials for MAC: ${macColons}`);
        return { status: 'ERROR', message: 'DATABASE ERROR:Auth Invalid', name: 'DATABASE ERROR' };
      }

      // 2. Refresh Metadata and Force ONLINE Status
      if (ip && (ipIdx !== -1)) sheet.getRange(rowIndex, ipIdx + 1).setValue(ip);
      if (lastSeenIdx !== -1) sheet.getRange(rowIndex, lastSeenIdx + 1).setValue(now);

      // Update status to ONLINE if not blocked/disabled
      if (statusIdx !== -1 && currentStatus !== 'ONLINE' && currentStatus !== 'BLOCKED' && currentStatus !== 'DISABLED') {
        sheet.getRange(rowIndex, statusIdx + 1).setValue('ONLINE');
      }
      const pendingCommandStr = cmdIdx !== -1 ? String(rowData[cmdIdx] || '') : '';

      // ⭐️ AUTO-SUCCESS: If authentication matches, close the handshake loop
      if (authenticated && resultIdx !== -1 && handshakeResult === 'PENDING') {
        sheet.getRange(rowIndex, resultIdx + 1).setValue('SUCCESS');
      }

      // 4. Synchronization (multi-sheet) 
      if (onlineSheet) {
        const updateObj = {
          MAC_ID: macColons,
          DeviceName: deviceName,
          Status: 'ONLINE',
          LastSeen: now,
          IP_Address: ip
        };
        const onlineData = onlineSheet.getDataRange().getValues();
        const oHeaders = onlineData[0];
        const oMacIdx = oHeaders.indexOf('MAC_ID');
        let oRowIdx = -1;

        for (let j = 1; j < onlineData.length; j++) {
          const existingMac = String(onlineData[j][oMacIdx] || '').replace(/[:\s]/g, '').toUpperCase();
          if (existingMac === macClean) { oRowIdx = j + 1; break; }
        }

        if (oRowIdx === -1) appendObjectToSheet(onlineSheet, updateObj);
        else updateObjectInSheet(onlineSheet, 'MAC_ID', onlineData[oRowIdx - 1][oMacIdx], updateObj);
      }

      // Log Event to Logs Sheet
      logDeviceEvent(macColons, 'Sync', 'Device Heartbeat & Metadata Synced');

      // 4. Command Retrieval
      let pendingCommand = '';
      if (cmdIdx !== -1) {
        pendingCommand = rowData[cmdIdx];
        if (pendingCommand) {
          sheet.getRange(rowIndex, cmdIdx + 1).setValue(''); // Clear after sending
        }
      }

      return {
        status: 'REGISTERED',
        message: 'Connected: Ready to Scan',
        deviceName: deviceName,
        ip: ip,
        command: pendingCommand
      };
    } else {
      // 5. Reject if MAC not pre-entered
      logDeviceEvent(macClean, 'Unauthorized Access', 'Unregistered device attempted connection');
      return { status: 'ERROR', message: 'DATABASE ERROR:Unregistered MAC', name: 'DATABASE ERROR', ip: ip };
    }
  } catch (e) {
    return { status: 'ERROR', message: 'DATABASE ERROR:' + e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Adds/updates an RFID tag in the RFID_Inventory sheet.
 * ESP32 calls: ?action=inventory&uid=XXXXXXXXXX&mac=...
 */
function processRfidInventory(uid, mac, e) {
  try {
    // ⭐️ PERFORMANCE: Use quickVerify for faster inventory intake
    if (!quickVerify(mac)) {
      return { status: 'error', message: 'UNAUTHORIZED_DEVICE', name: 'DATABASE ERROR' };
    }

    if (!uid) return { status: 'error', message: 'No UID provided' };
    const stdUid = standardizeRfidFormat(uid);
    updateDeviceActivity(mac);

    // 1. Check Registrations (Is it assigned to a student?)
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (regSheet) {
      const regData = getSheetDataAsObjects(regSheet);
      const student = regData.find(s => standardizeRfidFormat(s.RFID_TagID) === stdUid);
      if (student) {
        const studentName = (student.FirstName || "Assigned").toUpperCase();
        return {
          status: 'error',
          message: 'ALREADY ASSIGNED',
          name: studentName,
          uid: stdUid
        };
      }
    }

    // 2. Check Inventory Pool
    const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
    if (!invSheet) return { status: 'error', message: 'Inventory sheet missing' };
    const invData = getSheetDataAsObjects(invSheet);
    const existing = invData.find(i => standardizeRfidFormat(i.RFID_TagID) === stdUid);
    if (existing) {
      return {
        status: 'error',
        message: 'ALREADY IN POOL',
        name: 'IN INVENTORY',
        uid: stdUid
      };
    }

    // 3. Add New Tag
    const now = formatDateTimeIndia(new Date());
    const headers = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(h => {
      if (h === 'RFID_TagID') return "'" + stdUid;
      if (h === 'Status') return 'Available';
      if (h === 'AssignedTo') return '';
      if (h === 'LastUpdated') return now;
      if (h === 'AddedBy') return 'ESP32_' + mac;
      if (h === 'AddedDate') return now;
      return '';
    });
    invSheet.appendRow(newRow);
    SpreadsheetApp.flush();

    return {
      status: 'success',
      message: 'TAG_ADDED',
      name: 'ADDED SUCCESS',
      uid: stdUid
    };

  } catch (error) {
    Logger.log('processRfidInventory Error: ' + error.toString());
    return { status: 'error', message: error.toString(), name: 'SERVER ERROR' };
  }
}

/**
 * Marks RFID-based check-in or check-out attendance.
 * ESP32 calls: ?action=checkin&uid=XXXXXXXXXX&mac=... OR ?action=checkout&...
 */
function markRfidAttendance(uid, action, mac, e) {
  try {
    // ⭐️ PERFORMANCE: Use quickVerify for scans to bypass heavy DB locking & metadata updates
    if (!quickVerify(mac)) {
      return { status: 'error', message: 'UNAUTHORIZED_DEVICE', name: 'DATABASE ERROR', action: 'DENIED' };
    }

    if (!uid) return { status: 'error', message: 'No UID provided' };

    const isCheckIn = (action === 'checkin');
    const now = new Date();
    const dateStr = Utilities.formatDate(now, "GMT+5:30", 'yyyy-MM-dd');
    const timeStr12 = Utilities.formatDate(now, "GMT+5:30", 'hh:mm:ss a');
    const stdUid = standardizeRfidFormat(uid);

    // 1. Enrollment Check in Registrations
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const regData = regSheet.getDataRange().getValues();
    const regHeaders = regData[0];
    const rfidIdx = regHeaders.indexOf('RFID_TagID');
    const regIdIdx = regHeaders.indexOf('RegistrationID');
    const fNameIdx = regHeaders.indexOf('FirstName');
    const lNameIdx = regHeaders.indexOf('LastName');
    const statusColIdx = regHeaders.indexOf('ApplicationStatus');
    const batchIdx = regHeaders.indexOf('Batch');

    let studentRow = null;
    for (let i = 1; i < regData.length; i++) {
      if (standardizeRfidFormat(regData[i][rfidIdx]) === stdUid) {
        studentRow = regData[i];
        break;
      }
    }

    if (!studentRow) {
      const closedSheet = getSheet('Closed and Opt-out');
      if (closedSheet) {
        const closedData = closedSheet.getDataRange().getValues();
        const closedHeaders = closedData[0];
        const closedRfidIdx = closedHeaders.indexOf('RFID_TagID');
        if (closedRfidIdx !== -1) {
          for (let i = 1; i < closedData.length; i++) {
            if (standardizeRfidFormat(closedData[i][closedRfidIdx]) === stdUid) {
              logDeviceEvent(mac, 'RFID_Scan', 'UID:' + stdUid + ' Result:ACCESS DENIED (BLOCKED/CLOSED/OPTOUT)');
              return { status: 'error', message: 'ACCESS DENIED:Status-Blocked', name: 'LOCKED', action: 'DENIED' };
            }
          }
        }
      }
      // Tag Not Assigned - Check Inventory for details
      const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
      if (invSheet) {
        const invData = getSheetDataAsObjects(invSheet);
        const invItem = invData.find(i => standardizeRfidFormat(i.RFID_TagID) === stdUid);
        if (invItem) {
          logDeviceEvent(mac, 'RFID_Scan', 'UID:' + stdUid + ' Result:IN INVENTORY NOT ASSIGNED');
          return { status: 'error', message: 'IN INVENTORY:NOT ASSIGNED', name: 'UNASSIGNED', action: 'DENIED' };
        }
      }
      logDeviceEvent(mac, 'RFID_Scan', 'UID:' + stdUid + ' Result:TAG NOT FOUND');
      return { status: 'error', message: 'TAG NOT FOUND:UNREGISTERED', name: 'UNKNOWN', action: 'DENIED' };
    }

    // Status Verification
    const appStatus = String(studentRow[statusColIdx] || '').trim();
    if (appStatus !== 'Approved' && appStatus !== 'Active') {
      return { status: 'error', message: 'ACCESS DENIED:Status-' + appStatus, name: 'LOCKED' };
    }

    const regId = String(studentRow[regIdIdx] || '').trim();
    const stName = (String(studentRow[fNameIdx] || '') + ' ' + String(studentRow[lNameIdx] || '')).trim();
    const batchId = batchIdx !== -1 ? String(studentRow[batchIdx] || '').trim() : '';

    // 2. Attendance State Management
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const attData = attSheet.getDataRange().getValues();
    const attHeaders = attData[0];
    const attInCol = attHeaders.indexOf('InTime');
    const attOutCol = attHeaders.indexOf('OutTime');
    const attStatusCol = attHeaders.indexOf('Status');

    // Find today's record
    let existingRecord = null;
    let existingRowIdx = -1;
    for (let i = attData.length - 1; i >= 1; i--) {
      const rowRegId = String(attData[i][attHeaders.indexOf('StudentRegistrationID')] || '').trim();
      let rowDate = attData[i][attHeaders.indexOf('Date')];
      if (rowDate instanceof Date) rowDate = Utilities.formatDate(rowDate, "GMT+5:30", 'yyyy-MM-dd');
      else rowDate = String(rowDate || '').trim();

      if (rowRegId === regId && rowDate === dateStr) {
        existingRecord = attData[i];
        existingRowIdx = i + 1;
        break;
      }
    }

    const currentTotal = now.getHours() * 60 + now.getMinutes();
    let targetTimeVal = '';
    const slot = getSlotTiming(batchId, dateStr, regId);

    // Check if slot settings exist (if source is fallback, then no slot is assigned)
    if (slot.source === 'fallback' || slot.source === 'error_fallback') {
      return {
        status: 'error',
        message: 'Slot Not Assigned',
        name: stName,
        action: 'DENIED'
      };
    }

    if (isCheckIn) {
      if (existingRecord && existingRecord[attInCol] && existingRecord[attInCol] !== 'N/A') {
        return { status: 'error', message: 'Already Checked In', name: stName, action: 'REJECTED' };
      }

      if (currentTotal >= 1080) { // 6:00 PM = 1080 minutes
        return {
          status: 'error',
          message: 'Check-In Closed',
          name: stName,
          action: 'DENIED'
        };
      }

      let attendanceStatus = 'Present';
      if (slot && slot.start && slot.end) {
        const sMins = parseTime_(slot.start);
        const eMins = parseTime_(slot.end);
        const graceLate = parseInt(slot.graceLate || 0);

        if (currentTotal > (eMins + graceLate)) {
          return {
            status: 'error',
            message: 'Slot Ended',
            name: stName,
            action: 'DENIED',
            slot_timing: (slot.start || '09:00 AM') + ' - ' + (slot.end || '05:00 PM'),
            slot_status: 'EXPIRED'
          };
        }
        if (currentTotal < (sMins - 30)) {
          return {
            status: 'error',
            message: 'Slot Not Started',
            name: stName,
            action: 'DENIED',
            slot_timing: (slot.start || '09:00 AM') + ' - ' + (slot.end || '05:00 PM'),
            slot_status: 'NOT_STARTED'
          };
        }
        if (currentTotal > (sMins + graceLate)) attendanceStatus = 'Late with Present';
        else if (currentTotal < sMins) attendanceStatus = 'Early Present';
      }

      if (existingRowIdx !== -1) {
        attSheet.getRange(existingRowIdx, attInCol + 1).setValue(timeStr12);
        attSheet.getRange(existingRowIdx, attStatusCol + 1).setValue(attendanceStatus);
      } else {
        const nr = attHeaders.map(h => {
          if (h === 'AttendanceID') return 'ATT_' + Date.now();
          if (h === 'StudentRegistrationID') return regId;
          if (h === 'StudentName') return stName;
          if (h === 'Date') return dateStr;
          if (h === 'Status') return attendanceStatus;
          if (h === 'InTime') return timeStr12;
          if (h === 'EntryMode') return 'RFID';
          if (h === 'ApprovalStatus') return 'Approved';
          return '';
        });
        attSheet.appendRow(nr);
      }
      // §13: Log RFID check-in interaction
      logDeviceEvent(mac, 'RFID_CheckIn', 'UID:' + stdUid + ' Name:' + stName + ' Status:' + attendanceStatus);
      return {
        status: 'success',
        message: attendanceStatus + ' Recorded',
        name: stName,
        regId: regId,
        time: timeStr12,
        action: 'CHECKED_IN',
        slot_timing: (slot.start || '09:00 AM') + ' - ' + (slot.end || '05:00 PM'),
        slot_status: attendanceStatus
      };

    } else {
      // CHECK-OUT
      if (!existingRecord || !existingRecord[attInCol] || existingRecord[attInCol] === 'N/A') {
        return {
          status: 'error',
          message: 'No Check-In Found',
          name: stName,
          action: 'DENIED',
          slot_timing: (slot.start || '09:00 AM') + ' - ' + (slot.end || '05:00 PM')
        };
      }

      if (existingRecord[attOutCol] && existingRecord[attOutCol] !== 'N/A') {
        return {
          status: 'error',
          message: 'Already Checked Out',
          name: stName,
          action: 'REJECTED',
          slot_timing: (slot.start || '09:00 AM') + ' - ' + (slot.end || '05:00 PM'),
          slot_status: existingRecord[attStatusCol]
        };
      }

      let attendanceStatus = 'Present';
      if (slot && slot.end) {
        const eMins = parseTime_(slot.end);
        const graceEarly = parseInt(slot.graceEarly || 0);

        if (currentTotal < (eMins - graceEarly)) {
          // Modified to handle the permission object instead of just a boolean if we want more info
          const permCheck = checkCheckoutPermissionDetail(regId, dateStr);
          if (!permCheck.allowed) return { status: 'error', message: 'Early Checkout:Denied', name: stName, action: 'DENIED' };

          attendanceStatus = 'Approved Early Exit';
          if (permCheck.targetTime) targetTimeVal = permCheck.targetTime;
        }
      }

      if (existingRowIdx !== -1) {
        attSheet.getRange(existingRowIdx, attOutCol + 1).setValue(timeStr12);
        if (attendanceStatus === 'Approved Early Exit' || !existingRecord[attOutCol]) {
          attSheet.getRange(existingRowIdx, attStatusCol + 1).setValue(attendanceStatus);
          if (targetTimeVal) {
            const tCol = attHeaders.indexOf('TargetTime');
            if (tCol !== -1) attSheet.getRange(existingRowIdx, tCol + 1).setValue(targetTimeVal);
          }
        }
      } else {
        const nr = attHeaders.map(h => {
          if (h === 'AttendanceID') return 'ATT_' + Date.now();
          if (h === 'StudentRegistrationID') return regId;
          if (h === 'StudentName') return stName;
          if (h === 'Date') return dateStr;
          if (h === 'Status') return attendanceStatus;
          if (h === 'OutTime') return timeStr12;
          if (h === 'TargetTime') return targetTimeVal || '';
          if (h === 'InTime') return 'N/A';
          if (h === 'EntryMode') return 'RFID';
          if (h === 'ApprovalStatus') return 'Approved';
          return '';
        });
        attSheet.appendRow(nr);
      }
      // Audio 3 format: Include the specific status in the response instead of generic departure msg
      let checkoutMsg = (attendanceStatus === 'Approved Early Exit') ? 'Eligible for Early Checkout' : attendanceStatus + ' Checkout';
      // §13: Log RFID check-out interaction
      logDeviceEvent(mac, 'RFID_CheckOut', 'UID:' + stdUid + ' Name:' + stName + ' Status:' + attendanceStatus);
      return {
        status: 'success',
        message: checkoutMsg,
        name: stName,
        regId: regId,
        time: timeStr12,
        action: 'CHECKED_OUT',
        slot_timing: (slot.start || '09:00 AM') + ' - ' + (slot.end || '05:00 PM'),
        slot_status: attendanceStatus
      };
    }
  } catch (e) {
    Logger.log('markRfidAttendance error: ' + e.toString());
    return { status: 'error', message: e.message };
  }
}

/**
 * Fetches real-time student slot timing for the ESP32 to display during validation.
 * ESP32 calls: ?action=get_slot_timing&uid=XXXXXXXXXX
 */
function fetchStudentSlotTiming(uid, mac) {
  try {
    if (!uid) return { status: 'error', message: 'No RFID UID provided' };
    const stdUid = standardizeRfidFormat(uid);

    // 1. Find intern in Registrations
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) return { status: 'error', message: 'Registry unavailable' };

    const regData = getSheetDataAsObjects(regSheet);
    const student = regData.find(s => standardizeRfidFormat(s.RFID_TagID) === stdUid);

    if (!student) {
      return { status: 'error', message: 'Tag not found in intern registry', name: 'UNKNOWN' };
    }

    const regId = student.RegistrationID;
    const batchId = student.Batch || '';
    const today = getTodayStr();

    // 2. Resolve effective slot
    const slot = getSlotTiming(batchId, today, regId);

    // §14: Return structured slot metadata for hardware UI refresh
    const res = {
      status: 'success',
      regId: regId,
      name: (student.FirstName + ' ' + (student.LastName || '')).trim(),
      batch: batchId,
      slot_timing: (slot.start || '09:00 AM') + ' - ' + (slot.end || '05:00 PM'),
      slot: slot
    };

    // Log the metadata fetch event
    logDeviceEvent(mac, 'Slot_Fetch', 'UID:' + stdUid + ' Name:' + res.name);
    return res;
  } catch (e) {
    Logger.log('fetchStudentSlotTiming error: ' + e.toString());
    return { status: 'error', message: 'Database lookup failed' };
  }
}

/**
 * Looks up an RFID tag in both Inventory and Registrations sheets.
 * ESP32 calls: ?action=check&uid=XXXXXXXXXX OR ?action=check_inv&uid=...
 */
function lookupRfidTag(uid) {
  try {
    if (!uid) return { status: 'error', message: 'No UID provided' };

    const stdUid = standardizeRfidFormat(uid);
    const result = { status: 'error', message: 'No Record Found', uid: stdUid };

    // Check Inventory
    const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
    if (invSheet) {
      const invData = invSheet.getDataRange().getValues();
      const invHeaders = invData[0];
      const tagIdx = invHeaders.indexOf('RFID_TagID');
      for (let i = 1; i < invData.length; i++) {
        if (standardizeRfidFormat(invData[i][tagIdx]) === stdUid) {
          const entry = {};
          invHeaders.forEach((h, idx) => { if (h) entry[h] = invData[i][idx]; });
          // Format internal dates for the result
          if (entry.AddedDate) entry.AddedDate = formatDateTimeIndia(entry.AddedDate);
          if (entry.LastUpdated) entry.LastUpdated = formatDateTimeIndia(entry.LastUpdated);

          result.inventory = entry;
          result.status = 'success';
          result.message = 'Record Found';
          break;
        }
      }
    }

    // Check Registrations for a linked student
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (regSheet) {
      const regData = getSheetDataAsObjects(regSheet);
      // Ensure we compare standardized IDs
      const student = regData.find(s => standardizeRfidFormat(s.RFID_TagID) === stdUid);

      if (student) {
        const studentName = `${student.FirstName || ''} ${student.LastName || ''}`.trim();
        const regId = String(student.RegistrationID || '');
        const slot = getSlotTiming(student.Batch || '', getTodayStr(), regId);
        
        result.name = studentName; // Promoted to top level
        result.regId = regId;      // Promoted to top level
        result.college = String(student.CollegeName || 'N/A');
        result.slotTiming = `${slot.start} - ${slot.end}`;
        
        result.student = {
          name: studentName,
          regId: regId,
          regNo: String(student.RegisterNumber || ''),
          batch: String(student.Batch || 'No Batch'),
          college: String(student.CollegeName || 'N/A'),
          dept: String(student.Department || 'N/A'),
          duration: student.DurationDays ? (student.DurationDays + " Days") : 'N/A',
          startDate: student.InternshipStartDate ? formatDateDisplay(student.InternshipStartDate) : 'N/A',
          endDate: student.InternshipEndDate ? formatDateDisplay(student.InternshipEndDate) : 'N/A',
          status: student.ApplicationStatus || student.Status || 'Active'
        };
        result.status = 'success';
        result.message = 'Record Found';
      }
    }
    return result;
  } catch (e) {
    Logger.log('lookupRfidTag error: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Gets the RFID inventory scan history for display in the Inventory History tab.
 * ESP32 calls: ?action=get_history&mac=...
 */
function getRfidInventoryHistory(mac) {
  try {
    const inv = getRfidInventory();
    return inv.map(i => {
      return {
        uid: i.tagId,
        status: i.status,
        name: i.assignedToName,
        reg_id: i.assignedToId,
        reg_no: i.assignedRegNo,
        batch: i.assignedBatch,
        college: i.assignedCollege,
        dept: i.assignedDept || '',
        date: i.lastUpdated ? formatDateTimeIndia(i.lastUpdated) : (i.addedDate ? formatDateTimeIndia(i.addedDate) : '---'),
        addedBy: i.addedBy
      };
    });
  } catch (e) {
    Logger.log('getRfidInventoryHistory error: ' + e.toString());
    return [];
  }
}

/**
 * Gets attendance logs for today and yesterday specifically for RFID entries.
 * Returns detailed student and timing data.
 */
function getRfidAttendanceLogs(mac) {
  try {
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const batchSheet = getSheet(SHEET_NAMES.BATCHES);

    if (!attSheet || !regSheet) return [];

    const now = new Date();
    const today = Utilities.formatDate(now, "GMT+5:30", "yyyy-MM-dd");
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = Utilities.formatDate(yesterday, "GMT+5:30", "yyyy-MM-dd");

    const attData = getSheetDataAsObjects(attSheet);
    const regData = getSheetDataAsObjects(regSheet);
    const batchData = batchSheet ? getSheetDataAsObjects(batchSheet) : [];

    // Index students and batches for faster lookup
    const regMap = {};
    regData.forEach(r => {
      const rid = (r.RegistrationID || '').toString().trim().toUpperCase();
      if (rid) regMap[rid] = r;
    });

    const batchMap = {};
    batchData.forEach(b => {
      if (b.BatchName) batchMap[b.BatchName] = b;
    });

    const results = [];
    attData.forEach(a => {
      const rowDate = formatDate(a.Date);
      const entryMode = String(a.EntryMode || '').toUpperCase();
      const source = String(a.checkin_source || '').toUpperCase();

      // Filter for Today and Yesterday + RFID source
      if ((rowDate === today || rowDate === yesterdayStr) && (entryMode === 'RFID' || source.indexOf('RFID') !== -1)) {
        const rid = (a.StudentRegistrationID || '').toString().trim().toUpperCase();
        const student = regMap[rid] || {};
        const bName = student.Batch || a.Batch || '';
        const batch = batchMap[bName] || {};

        results.push({
          name: student.FirstName ? (student.FirstName + ' ' + (student.LastName || '')) : (a.StudentName || 'Unknown'),
          regId: rid,
          batch: bName || 'General',
          slot: batch.SlotStartTime ? (batch.SlotStartTime + ' - ' + (batch.SlotEndTime || '')) : 'Standard Slot',
          period: student.DurationDays ? (student.DurationDays + ' Days') : 'N/A',
          inTime: a.InTime || '---',
          outTime: a.OutTime || '---',
          date: rowDate,
          status: a.Status || 'Present'
        });
      }
    });

    return results.reverse().slice(0, 50); // Return most recent 50 logs
  } catch (e) {
    Logger.log("getRfidAttendanceLogs error: " + e.toString());
    return [];
  }
}

// =================================================================================
// END RFID HARDWARE API FUNCTIONS
// =================================================================================

//
// Certificate verification FUNCTIONS
//
// (Duplicate verifyCertificateDetails removed - using correct version below)
// (Duplicate verifyCertificateDetails removed)
//
// In your Code.gs file

/**
 * Fetches all data for a specific student using TextFinder for high performance.
 * @param {string} registrationId The registration ID to search for.
 * @returns {object} An object with the status and student data.
 */



// =================================================================================
// 3. CORE UTILITY FUNCTIONS
// =================================================================================

/**
 * Formats numeric Year values to have a ordinal suffix and the word "Year".
 */
function formatYearValue(year) {
  if (year === null || year === undefined) return '';
  let str = String(year).trim();
  if (str === '') return '';
  if (/^\d+$/.test(str)) {
    const val = parseInt(str);
    const suffix = val === 1 ? 'st' : val === 2 ? 'nd' : val === 3 ? 'rd' : 'th';
    return `${val}${suffix} Year`;
  }
  return str;
}

/**
 * Formats numeric Semester values to have a ordinal suffix and the word "Semester".
 */
function formatSemesterValue(sem) {
  if (sem === null || sem === undefined) return '';
  let str = String(sem).trim();
  if (str === '') return '';
  if (/^\d+$/.test(str)) {
    const val = parseInt(str);
    const suffix = val === 1 ? 'st' : val === 2 ? 'nd' : val === 3 ? 'rd' : 'th';
    return `${val}${suffix} Semester`;
  }
  return str;
}

/**
 * Gets the headers of a sheet as an array of strings.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to process.
 * @returns {Array<string>} An array of headers.
 */
function getHeaders(sheet) {
  if (!sheet || sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}




/**
 * Converts a sheet's data into an array of objects, using row 1 as keys.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to process.
 * @returns {Array<Object>} An array of objects representing the sheet data.
 */
// Global cache for the current script execution to prevent redundant sheet reads
const executionCache = new Map();

/**
 * Converts a sheet's data into an array of objects, using row 1 as keys.
 * Optimized with internal caching for the duration of the request.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to process.
 * @returns {Array<Object>} An array of objects representing the sheet data.
 */
function getSheetDataAsObjects(sheet) {
  if (!sheet) return [];

  const sheetName = sheet.getName();
  if (executionCache.has(sheetName)) {
    return executionCache.get(sheetName);
  }

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const rawValues = sheet.getDataRange().getValues();
  const displayValues = sheet.getDataRange().getDisplayValues();
  const headers = rawValues[0].map(h => h.toString().trim());

  const results = [];
  for (let i = 1; i < rawValues.length; i++) {
    const rowRaw = rawValues[i];
    const rowDisp = displayValues[i];

    // Check if row has any content to avoid processing empty rows
    if (rowRaw.join('').trim() === '') continue;

    const obj = {};
    headers.forEach((header, index) => {
      if (header) {
        let value = rowDisp[index];
        const raw = rowRaw[index];

        // Force "Date" column to standardized format regardless of sheet display
        // Also handle "Timestamp" column to preserve raw date for sorting
        if (header.toLowerCase() === 'date' || header === 'InternshipStartDate' || header === 'InternshipEndDate') {
          if (raw instanceof Date) {
            value = Utilities.formatDate(raw, "GMT+5:30", "yyyy-MM-dd");
          } else if (typeof raw === 'string' && raw.match(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/)) {
            const p = raw.split(/[\/-]/);
            value = p[2] + '-' + p[1].padStart(2, '0') + '-' + p[0].padStart(2, '0');
          }
        } else if (header === 'Timestamp' && raw instanceof Date) {
          value = raw.getTime(); // Use numeric timestamp for perfect sorting
        }

        // Format Year and Semester values to include suffixes and labels if they are plain numbers
        if (header === 'Year' && value) {
          value = formatYearValue(value);
        } else if (header === 'Semester' && value) {
          value = formatSemesterValue(value);
        }

        // Normalize 'Submitted' status to 'Pending' so it is never used/stored
        if ((header === 'ApplicationStatus' || header === 'Status') && value) {
          if (String(value).trim().toLowerCase() === 'submitted') {
            value = 'Pending';
          }
        }

        obj[header] = value;
      }
    });
    results.push(obj);
  }

  executionCache.set(sheetName, results);
  return results;
}

/**
 * Finds the 1-based row index for a given value in a specific column.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to search in.
 * @param {string} value The value to find.
 * @param {string} colName The header name of the column to search in.
 * @returns {number} The 1-based row index, or -1 if not found.
 */
function findRowIndexByValue(sheet, value, colName, standardize = false) {
  if (!sheet) return -1;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIndex = headers.indexOf(colName);
  if (colIndex === -1) return -1;

  const targetValue = standardize ? standardizeRfidFormat(value) : String(value).trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    const cellValue = standardize ? standardizeRfidFormat(data[i][colIndex]) : String(data[i][colIndex]).trim().toUpperCase();
    if (cellValue === targetValue && cellValue !== "") {
      return i + 1; // Return 1-based row index
    }
  }
  return -1;
}

/**
 * Appends an object to a sheet using the object's keys as column headers.
 */
function appendObjectToSheet(sheet, obj) {
  if (!sheet || !obj) return;
  let lastCol = sheet.getLastColumn();
  let headers;

  if (lastCol === 0) {
    // ⭐️ SELF-HEALING: If sheet is brand new/empty, initialize with schema
    const sheetName = sheet.getName();
    headers = SHEET_SCHEMAS[sheetName] || Object.keys(obj);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      // Cannot determine structure, fallback to raw append if possible
      sheet.appendRow(Object.values(obj));
      return;
    }
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  const row = headers.map(header => obj[header] !== undefined ? obj[header] : '');
  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

/**
 * Updates an existing object in a sheet by its ID column.
 */
function updateObjectInSheet(sheet, idColName, idValue, updateData) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIdx = headers.indexOf(idColName);

  if (idColIdx === -1) throw new Error("ID Column not found: " + idColName);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]).trim() === String(idValue).trim()) {
      const rowNum = i + 1;
      for (const key in updateData) {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sheet.getRange(rowNum, colIdx + 1).setValue(updateData[key]);
        }
      }
      SpreadsheetApp.flush();
      return true;
    }
  }
  return false;
}

/**
 * Fetches all students who are NOT currently assigned to a batch.
 */
function getVacantStudents() {
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const data = getSheetDataAsObjects(sheet);

    // Status must be strictly 'Approved', and Batch column must be empty
    return data
      .filter(s =>
        (s.ApplicationStatus === 'Approved' || s.Status === 'Approved') &&
        (!s.Batch || String(s.Batch).trim() === '')
      )
      .map(s => ({
        id: s.RegistrationID,
        name: `${s.FirstName} ${s.LastName}`,
        college: s.CollegeName
      }));
  } catch (e) {
    return [];
  }
}






// =================================================================================
// ⭐️ NEW: SYSTEM SANITY CHECK FUNCTION
// =================================================================================
/**
 * Admin: Get all files with student metadata for File Manager
 */
function getAdminFiles() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Get all students map for metadata
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const regData = regSheet.getDataRange().getValues();
    const regHeaders = regData.shift();

    const studentsMap = {};
    const firstNameIdx = regHeaders.indexOf("FirstName");
    const lastNameIdx = regHeaders.indexOf("LastName");
    const regIdIdx = regHeaders.indexOf("RegistrationID");
    const collegeIdx = regHeaders.indexOf("CollegeName");
    const batchIdx = regHeaders.indexOf("Batch");
    const startIdx = regHeaders.indexOf("InternshipStartDate");
    const endIdx = regHeaders.indexOf("InternshipEndDate");
    const mobileIdx = regHeaders.indexOf("MobileNumber");
    const statusIdx = regHeaders.indexOf("ApplicationStatus");

    regData.forEach(row => {
      const rid = String(row[regIdIdx] || "").trim().toUpperCase();
      if (rid) {
        const fName = row[firstNameIdx] || "";
        const lName = row[lastNameIdx] || "";
        studentsMap[rid] = {
          name: `${fName} ${lName}`.trim() || "Unknown",
          college: row[collegeIdx] || "N/A",
          batch: row[batchIdx] || "N/A",
          startDate: formatDateISO(row[startIdx]),
          endDate: formatDateISO(row[endIdx]),
          mobile: String(row[mobileIdx] || ""),
          status: statusIdx !== -1 ? String(row[statusIdx] || "") : ""
        };
      }
    });

    const groupedFiles = {};

    // 2. Get from FileManager Sheet
    const fileManagerSheet = ss.getSheetByName(SHEET_NAMES.FILE_MANAGER);
    if (fileManagerSheet) {
      const data = fileManagerSheet.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data[0];
        const regIdx = headers.indexOf("StudentRegistrationID");
        const fileIdIdx = headers.indexOf("FileID");
        const fileNameIdx = headers.indexOf("FileName");
        const fileUrlIdx = headers.indexOf("FileUrl");
        const docTypeIdx = headers.indexOf("DocType");
        const uploadDateIdx = headers.indexOf("UploadDate");
        const commentIdx = headers.indexOf("AdminComment");

        for (let i = 1; i < data.length; i++) {
          const rid = String(data[i][regIdx] || "").trim().toUpperCase();
          if (!rid) continue;

          const dType = data[i][docTypeIdx];
          const fName = data[i][fileNameIdx];
          const fileId = data[i][fileIdIdx];

          if (!groupedFiles[rid]) {
            let student;
            if (dType === "CustomFolder") {
              student = { name: fName, college: "Custom Workspace", batch: "System Files", startDate: "", endDate: "", mobile: "", isCustomFolder: true, fileId: fileId };
            } else {
              student = studentsMap[rid] || { name: "Unknown Student (" + rid + ")", college: "N/A", batch: "N/A", startDate: "", endDate: "", mobile: "" };
            }
            groupedFiles[rid] = {
              studentId: rid,
              studentName: student.name,
              college: student.college,
              batch: student.batch,
              startDate: student.startDate,
              endDate: student.endDate,
              mobile: student.mobile,
              isCustomFolder: student.isCustomFolder || false,
              folderFileId: student.fileId || null,
              files: []
            };
          }

          // If the definition row is loaded *after* a child file... update the parent if CustomFolder
          if (dType === "CustomFolder") {
            groupedFiles[rid].studentName = fName;
            groupedFiles[rid].college = "Custom Workspace";
            groupedFiles[rid].batch = "System Files";
            groupedFiles[rid].isCustomFolder = true;
            groupedFiles[rid].folderFileId = fileId;
            continue; // Don't push the folder config definition itself as an inner document file
          }

          groupedFiles[rid].files.push({
            id: fileId,
            name: fName,
            url: data[i][fileUrlIdx],
            type: dType || 'Upload',
            date: formatDateISO(data[i][uploadDateIdx]),
            comment: commentIdx !== -1 ? data[i][commentIdx] : ''
          });
        }
      }
    }

    // Also include students who have NO files yet as "empty folders"
    Object.keys(studentsMap).forEach(rid => {
      if (!groupedFiles[rid]) {
        const st = String(studentsMap[rid].status || "").trim().toLowerCase();
        // Clean up UI: Do not show empty folders for rejected, completed, or opt-out students
        if (st === 'rejected' || st === 'opt-out' || st === 'completed' || st === 'internship completed' || st === 'internship period ended') {
          return;
        }
        groupedFiles[rid] = {
          studentId: rid,
          studentName: studentsMap[rid].name,
          college: studentsMap[rid].college,
          batch: studentsMap[rid].batch,
          startDate: studentsMap[rid].startDate,
          endDate: studentsMap[rid].endDate,
          mobile: studentsMap[rid].mobile,
          files: []
        };
      }
    });

    // Special Folder: Admin Generated Documents (Aggregate)
    const genDocs = getSheetDataAsObjects(getSheet(SHEET_NAMES.GENERATED_DOCUMENTS));
    const adminFolder = {
      studentId: "ADMIN_GEN",
      studentName: "Generated Archives",
      college: "System Managed",
      batch: "All Batches",
      startDate: "System",
      endDate: "Wide",
      mobile: "-",
      files: genDocs.map(d => ({
        id: d.DocumentID,
        name: d.DocType + " - " + (d.ReferenceNumber || d.DocumentID),
        url: d.DocUrl,
        type: d.DocType,
        date: formatDateISO(d.GeneratedDate),
        studentId: d.StudentRegistrationID
      }))
    };

    const resultFolders = Object.values(groupedFiles);
    resultFolders.unshift(adminFolder);

    return { status: 'success', folders: resultFolders };
  } catch (e) {
    Logger.log('Error in getAdminFiles: ' + e.toString());
    return { status: 'error', message: e.message };
  }
}

/**
 * Gets everything related to a student for the file manager: 
 * Files, Tasks, Projects.
 */
function getStudentFullFileManagerData(regId) {
  try {
    if (String(regId).toUpperCase() === 'ADMIN_GEN') {
      const genDocs = getSheetDataAsObjects(getSheet(SHEET_NAMES.GENERATED_DOCUMENTS));
      return {
        status: 'success',
        student: { FirstName: 'System', LastName: 'Archive', Batch: 'All', CollegeName: 'N/A' },
        files: [],
        tasks: [],
        projects: [],
        generated: genDocs
      };
    }

    const studentInfo = getStudentFullData(regId);
    if (studentInfo.status !== 'success') return studentInfo;

    const files = getSheetDataAsObjects(getSheet(SHEET_NAMES.FILE_MANAGER))
      .filter(f => String(f.StudentRegistrationID || f.RegistrationID).trim().toUpperCase() === String(regId).trim().toUpperCase());

    const tasks = getStudentTasks(regId);
    const projects = getStudentProjects(regId);

    // Fetch generated documents
    const genDocs = getSheetDataAsObjects(getSheet(SHEET_NAMES.GENERATED_DOCUMENTS))
      .filter(d => String(d.StudentRegistrationID || d.RegistrationID).trim().toUpperCase() === String(regId).trim().toUpperCase());

    return {
      status: 'success',
      student: studentInfo.studentData,
      files: files,
      tasks: tasks,
      projects: projects,
      generated: genDocs
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Saves a comment/correction note for a file.
 */
function saveFileComment(fileId, comment) {
  try {
    const sheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let commentColIdx = headers.indexOf("AdminComment");

    // Add column if missing
    if (commentColIdx === -1) {
      commentColIdx = headers.length;
      sheet.getRange(1, commentColIdx + 1).setValue("AdminComment");
    }

    const rowIndex = findRowIndexByValue(sheet, fileId, 'FileID');
    if (rowIndex === -1) return { status: 'error', message: 'File not found' };

    sheet.getRange(rowIndex, commentColIdx + 1).setValue(comment);
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Comment saved.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteDependentStudentData(regId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const rId = String(regId || "").trim().toUpperCase();
    if (!rId) return;

    // Define sheets and their corresponding Registration ID column header names
    const sheetsToDeleteFrom = [
      { name: SHEET_NAMES.CERTIFICATE_DATA, colName: "StudentRegistrationID" },
      { name: SHEET_NAMES.TASKS, colName: "StudentRegistrationID" },
      { name: SHEET_NAMES.PROJECTS, colName: "StudentRegistrationID" },
      { name: SHEET_NAMES.STUDENT_DIARY, colName: "StudentRegistrationID" },
      { name: SHEET_NAMES.ATTENDANCE, colName: "StudentRegistrationID" },
      { name: SHEET_NAMES.ATTENDANCE_OTP, colName: "RegistrationID" },
      { name: SHEET_NAMES.STUDENT_REQUESTS, colName: "RegistrationID" },
      { name: SHEET_NAMES.ATTENDANCE_REQUESTS, colName: "RegistrationID" },
      { name: SHEET_NAMES.ADMIN_NOTIFICATIONS, colName: "TargetAdminID" }
    ];

    sheetsToDeleteFrom.forEach(item => {
      try {
        const sheet = ss.getSheetByName(item.name);
        if (sheet) {
          const data = sheet.getDataRange().getValues();
          if (data.length > 1) {
            const headers = data[0];
            const colIndex = headers.indexOf(item.colName);
            if (colIndex !== -1) {
              let deletedCount = 0;
              for (let i = data.length - 1; i >= 1; i--) {
                if (String(data[i][colIndex]).trim().toUpperCase() === rId) {
                  sheet.deleteRow(i + 1);
                  deletedCount++;
                }
              }
              if (deletedCount > 0) {
                executionCache.delete(item.name);
              }
            }
          }
        }
      } catch (e) {
        Logger.log(`Failed to delete data for ${rId} from sheet ${item.name}: ${e.toString()}`);
      }
    });

    // Special case: ChatMessages has SenderID or ReceiverID matching the student
    try {
      const chatSheet = ss.getSheetByName(SHEET_NAMES.CHAT_MESSAGES);
      if (chatSheet) {
        const data = chatSheet.getDataRange().getValues();
        if (data.length > 1) {
          const headers = data[0];
          const senderIdx = headers.indexOf("SenderID");
          const receiverIdx = headers.indexOf("ReceiverID");
          let deletedCount = 0;
          for (let i = data.length - 1; i >= 1; i--) {
            const matchSender = senderIdx !== -1 && String(data[i][senderIdx]).trim().toUpperCase() === rId;
            const matchReceiver = receiverIdx !== -1 && String(data[i][receiverIdx]).trim().toUpperCase() === rId;
            if (matchSender || matchReceiver) {
              chatSheet.deleteRow(i + 1);
              deletedCount++;
            }
          }
          if (deletedCount > 0) {
            executionCache.delete(SHEET_NAMES.CHAT_MESSAGES);
          }
        }
      }
    } catch (e) {
      Logger.log(`Failed to delete ChatMessages for ${rId}: ${e.toString()}`);
    }

  } catch (e) {
    Logger.log("Error in deleteDependentStudentData: " + e.toString());
  }
}

function adminDeleteFolder(regId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const rId = String(regId || "").trim().toUpperCase();
    if (!rId) return { status: 'error', message: 'No registration ID provided' };

    // Erase all dependent records from other sheets
    deleteDependentStudentData(rId);

    let count = 0;
    let driveCount = 0;
    const filesToTrash = new Set();

    // 1. Delete from FileManager Sheet and collect file IDs
    const fmSheet = ss.getSheetByName(SHEET_NAMES.FILE_MANAGER);
    if (fmSheet) {
      const fmData = fmSheet.getDataRange().getValues();
      const fmHeaders = fmData[0];
      const regIdCol = fmHeaders.indexOf("StudentRegistrationID");
      const fileIdCol = fmHeaders.indexOf("FileID");

      if (regIdCol !== -1) {
        for (let i = fmData.length - 1; i >= 1; i--) {
          if (String(fmData[i][regIdCol]).trim().toUpperCase() === rId) {
            if (fileIdCol !== -1 && fmData[i][fileIdCol]) {
              filesToTrash.add(String(fmData[i][fileIdCol]));
            }
            fmSheet.deleteRow(i + 1);
            count++;
          }
        }
      }
    }

    // 2. Delete from GeneratedDocuments Sheet and collect PDF file IDs
    const genSheet = ss.getSheetByName(SHEET_NAMES.GENERATED_DOCUMENTS);
    if (genSheet) {
      const genData = genSheet.getDataRange().getValues();
      const genHeaders = genData[0];
      const regIdx = genHeaders.indexOf("StudentRegistrationID");
      const pdfIdIdx = genHeaders.indexOf("PdfFileId");

      if (regIdx !== -1) {
        for (let i = genData.length - 1; i >= 1; i--) {
          if (String(genData[i][regIdx]).trim().toUpperCase() === rId) {
            if (pdfIdIdx !== -1 && genData[i][pdfIdIdx]) {
              filesToTrash.add(String(genData[i][pdfIdIdx]));
            }
            genSheet.deleteRow(i + 1);
            count++;
          }
        }
      }
    }

    // 3. Delete files from Google Drive collected from sheets
    filesToTrash.forEach(fileId => {
      try {
        DriveApp.getFileById(fileId).setTrashed(true);
        driveCount++;
      } catch (e) {
        Logger.log(`Failed to trash file ${fileId} from Drive: ${e.toString()}`);
      }
    });

    // 4. Trash the dedicated student folder in Drive and all its contents
    try {
      const studentFolder = getOrCreateStudentFolder(regId);
      if (studentFolder && studentFolder.getId() !== getSystemFolderId('uploads')) {
        // Empty student folder contents first
        const innerFiles = studentFolder.getFiles();
        while (innerFiles.hasNext()) {
          const file = innerFiles.next();
          try {
            file.setTrashed(true);
            driveCount++;
          } catch (e) {}
        }
        // Trash the folder itself
        studentFolder.setTrashed(true);
      }
    } catch (e) {
      Logger.log("Failed to trash student specific Drive folder: " + e.toString());
    }

    // 5. Fallback Drive Search and trash
    try {
      const folderId = getSystemFolderId('uploads');
      if (folderId) {
        const folder = DriveApp.getFolderById(folderId);
        const safeRegId = rId.replace(/\//g, '_');
        const driveFiles = folder.searchFiles(`title contains '${safeRegId}' and trashed = false`);
        while (driveFiles.hasNext()) {
          const file = driveFiles.next();
          try {
            file.setTrashed(true);
            driveCount++;
          } catch (e) {}
        }
      }
    } catch (e) {
      Logger.log("Drive search fallback trashing failed: " + e.toString());
    }

    return { 
      status: 'success', 
      message: `Successfully deleted folder and permanently trashed ${driveCount} files inside Google Drive.` 
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}


/**
 * Admin: Delete a file from system
 */
function adminDeleteFile(fileId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let deletedFromDrive = false;

    // Delete from Sheet (FileManager)
    const fmSheet = ss.getSheetByName(SHEET_NAMES.FILE_MANAGER);
    if (fmSheet) {
      const fmData = fmSheet.getDataRange().getValues();
      const fmHeaders = fmData[0];
      const fmFileIdIdx = fmHeaders.indexOf("FileID");

      for (let i = fmData.length - 1; i >= 1; i--) {
        if (fmFileIdIdx !== -1 && fmData[i][fmFileIdIdx] === fileId) {
          const actualDriveId = fmData[i][fmFileIdIdx];
          fmSheet.deleteRow(i + 1);
          try { DriveApp.getFileById(actualDriveId).setTrashed(true); deletedFromDrive = true; } catch (e) { }
        }
      }
    }

    // Also delete from Sheet (GeneratedDocuments)
    const genSheet = ss.getSheetByName(SHEET_NAMES.GENERATED_DOCUMENTS);
    if (genSheet) {
      const genData = genSheet.getDataRange().getValues();
      const genHeaders = genData[0];
      const docIdIdx = genHeaders.indexOf("DocumentID");
      const pdfFileIdIdx = genHeaders.indexOf("PdfFileId");

      for (let i = genData.length - 1; i >= 1; i--) {
        const matchDocId = (docIdIdx !== -1 && genData[i][docIdIdx] === fileId);
        const matchPdfId = (pdfFileIdIdx !== -1 && genData[i][pdfFileIdIdx] === fileId);

        if (matchDocId || matchPdfId) {
          const actualDriveId = (pdfFileIdIdx !== -1 && genData[i][pdfFileIdIdx]) ? genData[i][pdfFileIdIdx] : fileId;
          genSheet.deleteRow(i + 1);
          if (actualDriveId) {
            try { DriveApp.getFileById(actualDriveId).setTrashed(true); deletedFromDrive = true; } catch (e) { }
          }
        }
      }
    }

    if (!deletedFromDrive) {
      // fallback
      try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { }
    }

    return { status: 'success', message: 'File deleted successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Admin: Rename a file
 */
function adminRenameFile(fileId, newName) {
  try {
    // Rename in Drive
    DriveApp.getFileById(fileId).setName(newName);

    // Update in Sheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const fileIdIdx = headers.indexOf("FileID");
    const fileNameIdx = headers.indexOf("FileName");

    for (let i = 1; i < data.length; i++) {
      if (data[i][fileIdIdx] === fileId) {
        sheet.getRange(i + 1, fileNameIdx + 1).setValue(newName);
      }
    }
    return { status: 'success', message: 'File renamed successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}
/**
 * Admin: Create a Custom Folder (Virtual Folder without Student)
 */
function adminCreateCustomFolder(folderName) {
  try {
    const fileId = "CF_" + Date.now();
    const uploadDate = new Date();
    const fileManagerSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    if (!fileManagerSheet) return { status: 'error', message: 'File Manager sheet not found' };

    // [FileID, StudentRegistrationID, FileName, FileUrl, DocType, UploadDate, FileSize, Status]
    fileManagerSheet.appendRow([fileId, fileId, folderName, "", "CustomFolder", uploadDate, 0, 'Active']);
    return { status: 'success', message: 'Custom folder created successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Admin: Rename a Custom Folder directly in DB
 */
function adminRenameCustomFolder(folderId, newName) {
  try {
    const sheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    if (!sheet) return { status: 'error', message: 'Sheet not found' };
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const fileIdIdx = headers.indexOf("FileID");
    const fileNameIdx = headers.indexOf("FileName");
    const docTypeIdx = headers.indexOf("DocType");

    for (let i = 1; i < data.length; i++) {
      if (data[i][fileIdIdx] === folderId && data[i][docTypeIdx] === 'CustomFolder') {
        sheet.getRange(i + 1, fileNameIdx + 1).setValue(newName);
      }
    }
    return { status: 'success', message: 'Folder renamed successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Checks if the spreadsheet, all required sheets, and their headers are set up correctly.
 * This is called by the frontend to diagnose configuration issues.
 */
function runSystemCheck() {
  // Uses the centralized SHEET_SCHEMAS for validation
  try {
    const ss = getSpreadsheet();
    if (!ss) {
      throw new Error("Spreadsheet not found. Please verify permissions or SPREADSHEET_ID.");
    }

    for (const [sheetName, requiredHeaders] of Object.entries(SHEET_SCHEMAS)) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error(`Required sheet named "${sheetName}" is missing from your Google Sheet.`);
      }

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      for (const requiredHeader of requiredHeaders) {
        if (headers.indexOf(requiredHeader) === -1) {
          throw new Error(`In sheet "${sheetName}", the required column header "${requiredHeader}" is missing or misspelled in Row 1. Please check capitalization and spelling.`);
        }
      }
    }

    Logger.log("System check passed successfully.");
    return {
      status: 'success',
      message: 'System check passed.'
    };
  } catch (e) {
    Logger.log(`System Check Failed: ${e.message}`);
    return {
      status: 'error',
      message: `System Configuration Error: ${e.message}`
    };
  }
}

/**
 * Production-grade automatic system initialization (Optimized).
 * Detects all required sheets from SHEET_SCHEMAS, creates missing ones,
 * and updates headers. Safe to run repeatedly.
 */
function initializeSystem() {
  const startTime = new Date();
  Logger.log(">>> [SYSTEM INIT] Starting optimized initialization...");

  try {
    const ss = getSpreadsheet();
    if (!ss) return;

    // Set Name only if different to save an API call
    const targetName = "GSVEE Internship Portal - " + (typeof COMPANY_NAME !== 'undefined' ? COMPANY_NAME : "Internal");
    if (ss.getName() !== targetName) ss.setName(targetName);

    const allSheets = ss.getSheets();
    const sheetMap = {};
    allSheets.forEach(s => sheetMap[s.getName()] = s);

    let updatedCount = 0;

    for (const [sheetName, headers] of Object.entries(SHEET_SCHEMAS)) {
      let sheet = sheetMap[sheetName];
      let needsFormatting = false;

      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        needsFormatting = true;
        seedDefaultSystemData(sheet, sheetName);
      } else {
        const lastCol = sheet.getLastColumn();
        if (lastCol === 0 || sheet.getLastRow() === 0) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          needsFormatting = true;
        } else {
          // Fast header sync: only check if we have data
          const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
          const missing = headers.filter(h => !currentHeaders.includes(h));
          if (missing.length > 0) {
            sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
            needsFormatting = true;
          }
        }
      }

      if (needsFormatting) {
        formatHeaderRow(sheet);
        updatedCount++;
      }
    }
    Logger.log(`>>> [SYSTEM INIT] Completed in ${(new Date() - startTime) / 1000}s. Updated: ${updatedCount}`);
  } catch (e) {
    Logger.log(">>> [SYSTEM INIT] Error: " + e.toString());
  }
}

/**
 * Resets and runs the initialization system manually.
 */
function resetAndInitializeSystem() {
  Logger.log(">>> [MANUAL RESET] Triggered system repair/init...");
  initializeSystem();
}

/**
 * Verifies that all required sheets and headers are present and correct.
 * @returns {Array<Object>} A report of the system health.
 */
function verifySystemInitialization() {
  try {
    const ss = getSpreadsheet();
    const report = [];
    for (const [sheetName, headers] of Object.entries(SHEET_SCHEMAS)) {
      const sheet = ss.getSheetByName(sheetName);
      const status = { sheet: sheetName, exists: !!sheet, headersCorrect: false, missingHeaders: [] };
      if (sheet) {
        const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0].map(h => String(h).trim());
        status.missingHeaders = headers.filter(h => !currentHeaders.includes(h));
        status.headersCorrect = status.missingHeaders.length === 0;
      }
      report.push(status);
    }
    return report;
  } catch (e) { return []; }
}

/**
 * Seeds default configuration and templates into new sheets.
 */
function seedDefaultSystemData(sheet, sheetName) {
  if (sheet.getLastRow() > 1) return;
  if (sheetName === SHEET_NAMES.EMAIL_TEMPLATES) {
    const defaultTemplates = [
      { Type: 'confirmationLetter', Subject: 'Internship Confirmation', Body: 'Dear {{StudentName}}, your internship starts on {{InternshipStartDate}}.' },
      { Type: 'applicationApproved', Subject: "Internship Confirmation – " + (typeof COMPANY_NAME !== 'undefined' ? COMPANY_NAME : "GSV"), Body: "Welcome {{FullName}}!" },
      { Type: 'attendanceReminder', Subject: "⚠️ Attendance Reminder", Body: "Hello {{FullName}}, please mark your attendance." }
    ];
    const rowsToAdd = defaultTemplates.map(t => [generateUniqueId('TMP', sheet, 0), t.Type, t.Subject, t.Body, '']);
    sheet.getRange(2, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
  } else if (sheetName === SHEET_NAMES.SWITCH_STATUS) {
    const defaultSwitches = [['settingCertificateTriggerMode', 'OFF'], ['settingDefaultSlotEnabled', 'OFF'], ['rfidAutomationToggle', 'OFF']];
    const timestamp = new Date().toISOString();
    const rowsToAdd = defaultSwitches.map(s => [s[0], s[1], timestamp]);
    sheet.getRange(2, 1, rowsToAdd.length, 3).setValues(rowsToAdd);
  }
}

/**
 * Applies professional header formatting to Row 1.
 */
function formatHeaderRow(sheet) {
  if (!sheet) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  const range = sheet.getRange(1, 1, 1, lastCol);
  const colors = {
    [SHEET_NAMES.REGISTRATIONS]: '#1a73e8', [SHEET_NAMES.ATTENDANCE]: '#34a853',
    [SHEET_NAMES.TASKS]: '#fbbc04', [SHEET_NAMES.PROJECTS]: '#ea4335',
    [SHEET_NAMES.CONSOLIDATED_TEMPLATE]: '#673ab7', 'DEFAULT': '#1a73e8'
  };
  const bgColor = colors[sheet.getName()] || colors['DEFAULT'];
  range.setFontWeight('bold').setFontColor('white').setBackground(bgColor)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setWrap(true).setFontSize(11);
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
  if (!sheet.getFilter()) try { sheet.getRange(1, 1, sheet.getMaxRows(), lastCol).createFilter(); } catch (e) { }
  sheet.autoResizeColumns(1, lastCol);
  sheet.setRowHeight(1, 40);
  range.setBorder(true, true, true, true, true, true, '#ffffff', SpreadsheetApp.BorderStyle.SOLID);
}

// =================================================================================
// UTILITY FUNCTIONS
// =================================================================================

function getSpreadsheet() {
  try {
    // 1. Try to get the spreadsheet this script is bound to (Best for standalone deployments)
    const activeSS = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSS) return activeSS;

    // 2. Fallback to hardcoded ID if provided
    if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID) {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
  } catch (e) {
    Logger.log("getSpreadsheet Error: " + e.toString());
  }
  throw new Error("No accessible Spreadsheet found. Please ensure the script is attached to a spreadsheet or SPREADSHEET_ID is correct.");
}

function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`Sheet "${sheetName}" not found. Attempting to create it.`);
    try {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`Sheet "${sheetName}" created successfully.`);
      // Initialize headers from schema
      if (SHEET_SCHEMAS[sheetName]) {
        sheet.appendRow(SHEET_SCHEMAS[sheetName]);
        formatHeaderRow(sheet);
      }
    } catch (e) {
      Logger.log(`Failed to create sheet "${sheetName}": ${e.toString()}`);
      return null;
    }
  }
  return sheet;
}

/**
 * NEW: Organizes student storage in a hierarchical way.
 * Structure: Root > Project Name > Batch Name > Student ID
 */
function getOrCreateStudentFolder(regId, type = '') {
  try {
    const rootFolder = DriveApp.getFolderById(getSystemFolderId('uploads'));
    const studentInfoResp = getStudentFullData(regId);
    if (studentInfoResp.status !== 'success') throw new Error("Student not found");
    const student = studentInfoResp.studentData;

    const batchName = student.Batch || 'No Batch';
    let projectName = 'Unassigned Projects';
    const batchSheet = getSheet(SHEET_NAMES.BATCHES);
    if (batchSheet) {
      const data = getSheetDataAsObjects(batchSheet);
      const batchRow = data.find(b => b.BatchName === batchName);
      if (batchRow && batchRow.Project) projectName = batchRow.Project;
    }

    let projectFolder;
    let projFolders = rootFolder.getFoldersByName(projectName);
    projectFolder = projFolders.hasNext() ? projFolders.next() : rootFolder.createFolder(projectName);

    let batchFolder;
    let batchFolders = projectFolder.getFoldersByName(batchName);
    batchFolder = batchFolders.hasNext() ? batchFolders.next() : projectFolder.createFolder(batchName);

    const safeRegId = String(regId).replace(/[\/\\]/g, '_');
    let studentFolder;
    let studentFolders = batchFolder.getFoldersByName(safeRegId);
    studentFolder = studentFolders.hasNext() ? studentFolders.next() : batchFolder.createFolder(safeRegId);

    if (type) {
      const dirMap = {
        'mandatory': 'Mandatory Documents',
        'generated': 'Generated Documents',
        'Project': 'Project Files',
        'Task': 'Task Submissions'
      };
      const dirName = dirMap[type] || type;
      let typeFolders = studentFolder.getFoldersByName(dirName);
      return typeFolders.hasNext() ? typeFolders.next() : studentFolder.createFolder(dirName);
    }

    return studentFolder;
  } catch (e) {
    Logger.log("Error in getOrCreateStudentFolder: " + e.toString());
    return DriveApp.getFolderById(getSystemFolderId('uploads'));
  }
}
function getColIdxByName(sheet, name) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(name);
}

function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  return sheet.getDataRange().getValues();
}

function appendRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  if (sheet) {
    sheet.appendRow(rowData);
    SpreadsheetApp.flush();
    if (typeof executionCache !== 'undefined' && executionCache.delete) {
      executionCache.delete(sheetName);
    }
  } else {
    Logger.log(`Cannot append row: Sheet "${sheetName}" not found or couldn't be created.`);
  }
}

function updateRow(sheetName, rowNum, rowData) {
  const sheet = getSheet(sheetName);
  if (sheet && rowNum > 0 && rowNum <= sheet.getMaxRows() && rowData.length > 0) {
    const range = sheet.getRange(rowNum, 1, 1, rowData.length);
    range.setValues([rowData]);
    SpreadsheetApp.flush();
    if (typeof executionCache !== 'undefined' && executionCache.delete) {
      executionCache.delete(sheetName);
    }
  } else {
    Logger.log(`Failed to update row. Sheet: ${sheetName}, RowNum: ${rowNum}. Sheet exists: ${!!sheet}, RowData length: ${rowData.length > 0 ? rowData.length : 'empty'}`);
  }
}

function findRowIndex(sheet, value, columnIndex) {
  if (!sheet) return -1;
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][columnIndex - 1] && data[i][columnIndex - 1].toString().trim().toUpperCase() === value.toString().trim().toUpperCase()) {
      return i + 1; // 1-based index
    }
  }
  return -1;
}

function sendEmail(recipient, subject, textBody, htmlBodyArg, attachments) {
  try {
    let htmlBody = htmlBodyArg || textBody;
    const mailOptions = {
      name: COMPANY_NAME
    };
    if (attachments) mailOptions.attachments = attachments;

    if (htmlBody) {
      mailOptions.htmlBody = `${htmlBody}<br><br><hr><p style="font-size:0.9em; color:#555;">${EMAIL_SIGNATURE_HTML}</p>`;
    } else {
      textBody = `${textBody}\n\n--\n${EMAIL_SIGNATURE_TEXT}`;
    }

    // Trim and validate recipient
    const emailTo = (recipient || '').toString().trim();
    if (!emailTo || !emailTo.includes('@')) {
      Logger.log(`Skipping invalid email address: "${recipient}"`);
      return false;
    }

    const finalTextBody = htmlBody ? textBody : (mailOptions.htmlBody ? mailOptions.htmlBody.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "") : textBody);

    // Reverted to MailApp as per user request
    MailApp.sendEmail(emailTo, subject, finalTextBody, mailOptions);

    Logger.log(`Email successfully sent (via MailApp) to: ${emailTo}`);
    return true;
  } catch (error) {
    Logger.log(`Error sending email to ${recipient}: ${error.toString()}`);
    return false;
  }
}

function logActivity(activityType, userOrDetails, maybeDetails) {
  try {
    const sheet = getSheet(SHEET_NAMES.RECENT_ACTIVITY);
    if (!sheet) return;
    const timestamp = new Date();

    let user = 'Admin';
    let details = '';

    if (maybeDetails !== undefined) {
      user = userOrDetails;
      details = maybeDetails;
    } else {
      details = userOrDetails;
    }

    appendRow(SHEET_NAMES.RECENT_ACTIVITY, [timestamp, activityType, user, details]);
    Logger.log(`ACTIVITY LOGGED: [${activityType}] - ${user} - ${details}`);
  } catch (e) {
    Logger.log('Error in logActivity: ' + e.toString());
  }
}

function createAdminNotification(title, message, targetAdminId = 'ALL') {
  try {
    const id = generateUniqueId('NTF', SHEET_NAMES.NOTIFICATIONS, 1);
    const timestamp = new Date();
    appendRow(SHEET_NAMES.NOTIFICATIONS, [id, title, message, timestamp, false]);
    return true;
  } catch (e) {
    Logger.log('Error in createAdminNotification: ' + e.toString());
    return false;
  }
}

// Redundant getHeaders removed

function generateUniqueId(prefix, sheetOrName, idColumnIndex) {
  // Accept both sheet object and sheet name string
  let sheet;
  if (typeof sheetOrName === 'string') {
    sheet = getSheet(sheetOrName);
  } else if (sheetOrName && typeof sheetOrName.getRange === 'function') {
    sheet = sheetOrName; // Already a sheet object
  } else {
    sheet = null;
  }
  let newId;
  let isUnique = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 100;

  while (!isUnique && attempts < MAX_ATTEMPTS) {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    newId = `${prefix}-${new Date().getFullYear()}-${randomPart}`;
    if (!sheet || findRowIndex(sheet, newId, idColumnIndex + 1) === -1) {
      isUnique = true;
    }
    attempts++;
  }
  if (!isUnique) {
    newId = `${prefix}-${new Date().getTime()}`;
    Logger.log(`Fallback ID generated for prefix ${prefix}: ${newId}`);
  }
  return newId;
}

function generateRegistrationId() {
  const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  const year = new Date().getFullYear();
  let sequentialNumber = 1;
  if (sheet) {
    sequentialNumber = Math.max(1, sheet.getLastRow());
  }
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GSV/${year}/${sequentialNumber}/${randomPart}`;
}

function getPublishedUrl() {
  return ScriptApp.getService().getUrl();
}

function getStudentFullName_(student) {
  if (!student) return '';
  const first = student.FirstName || student.firstName || '';
  const middle = student.MiddleName || student.middleName || '';
  const last = student.LastName || student.lastName || '';
  let name = `${first} ${middle} ${last}`.trim().replace(/\s+/g, ' ');
  return name || student.Name || student.StudentName || student.name || 'Student';
}

function formatDate(dateInput) {
  if (!dateInput) return '';
  try {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      let s = String(dateInput).trim();
      // Handle DD/MM/YYYY or DD-MM-YYYY
      if (s.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
        let parts = s.split(/[\/\-]/);
        // Assume DD/MM/YYYY for common Indian usage
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        date = new Date(s);
      }
    }

    if (isNaN(date.getTime())) return String(dateInput);

    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  } catch (e) { return String(dateInput); }
}

function formatDateISO(dateInput) {
  if (!dateInput) return null;
  try {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      let s = String(dateInput).trim();
      if (/^\d+$/.test(s)) {
        date = new Date(Number(s));
      } else if (s.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
        let parts = s.split(/[\/\-]/);
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        date = new Date(s);
      }
    }

    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  } catch (e) { return null; }
}

function formatDateDisplay(dateInput) {
  if (!dateInput) return '';
  try {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      let s = String(dateInput).trim();
      if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
        let parts = s.split('-');
        date = new Date(parts[0], parts[1] - 1, parts[2]);
      } else if (s.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
        let parts = s.split(/[\/\-]/);
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        date = new Date(s);
      }
    }
    if (isNaN(date.getTime())) return String(dateInput);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch (e) { return String(dateInput); }
}

/**
 * Gets the most recent activities for the admin dashboard.
 * @param {number} limit Number of entries to return.
 * @returns {Array} Array of activity objects.
 */
function getRecentActivity(limit = 20) {
  try {
    const allActivities = [];
    const ss = getSpreadsheet();

    // Helper to filter out invalid dates safely
    const safeDate = (dateVal) => {
      if (!dateVal) return null;
      const d = new Date(dateVal);
      return !isNaN(d.getTime()) ? d : null;
    };

    // 1. Recent Registrations
    const regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
    if (regSheet) {
      const regData = getSheetDataAsObjects(regSheet);
      regData.forEach(row => {
        const d = safeDate(row.Timestamp || row.InternshipStartDate);
        if (d) {
          allActivities.push({
            Timestamp: d,
            ActivityType: 'New Registration',
            User: `${row.FirstName || ''} ${row.LastName || ''}`.trim() || 'Unknown',
            Details: `Status: ${row.ApplicationStatus || 'Pending'}`
          });
        }
      });
    }

    // 2. Recent Tasks
    const taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
    if (taskSheet) {
      const taskData = getSheetDataAsObjects(taskSheet);
      taskData.forEach(row => {
        const d = safeDate(row.AssignedDate || row.DueDate);
        if (d) {
          allActivities.push({
            Timestamp: d,
            ActivityType: 'Task Assigned',
            User: row.StudentRegistrationID || 'Unknown',
            Details: `Task: ${row.TaskTitle || 'N/A'}`
          });
        }
      });
    }

    // 3. Recent Projects
    const projSheet = ss.getSheetByName(SHEET_NAMES.PROJECTS);
    if (projSheet) {
      const projData = getSheetDataAsObjects(projSheet);
      projData.forEach(row => {
        const d = safeDate(row.AssignedDate || row.StartDate);
        if (d) {
          allActivities.push({
            Timestamp: d,
            ActivityType: 'Project Assigned',
            User: row.StudentRegistrationID || 'Unknown',
            Details: `Project: ${row.ProjectName || 'N/A'}`
          });
        }
      });
    }

    // Sort by timestamp descending
    allActivities.sort((a, b) => b.Timestamp.getTime() - a.Timestamp.getTime());

    // Convert to strict ISO string to absolutely prevent the GAS "invalid date" serialization error
    return allActivities.slice(0, limit).map(act => ({
      ...act,
      Timestamp: act.Timestamp.toISOString()
    }));
  } catch (e) {
    Logger.log('Error in getRecentActivity: ' + e.message);
    return [];
  }
}

// Obsolete notification functions removed (duplicates exist later in file)

// Redundant createAdminNotification removed

/**
 * Marks all unread notifications as read.
 */
// Redundant markNotificationAsRead removed

function getEmailTemplates() {
  try {
    const sheet = getSheet(SHEET_NAMES.EMAIL_TEMPLATES);
    if (!sheet) return {};
    let data = getSheetDataAsObjects(sheet);
    let templates = {};

    // Auto-initialize new templates if backing sheet is mostly empty
    if (data.length < 16) {
      initializeDefaultEmailTemplates(); // Inject the missing items into the true spreadsheet
      Utilities.sleep(1000); // Wait for Sheets API transaction
      data = getSheetDataAsObjects(sheet); // Re-fetch the populated data
    }

    data.forEach(t => {
      templates[t.Type] = {
        subject: t.Subject,
        content: t.Body
      };
    });
    return templates;
  } catch (e) {
    return {};
  }
}

function saveEmailTemplate(type, subject, body) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_NAMES.EMAIL_TEMPLATES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const typeCol = headers.indexOf("Type");
    const subjectCol = headers.indexOf("Subject");
    const bodyCol = headers.indexOf("Body");

    if (typeCol === -1) return { status: 'error', message: 'Template sheet config error' };

    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][typeCol] === type) {
        sheet.getRange(i + 1, subjectCol + 1).setValue(subject);
        sheet.getRange(i + 1, bodyCol + 1).setValue(body);
        found = true;
        break;
      }
    }

    if (!found) {
      const newId = generateUniqueId('TMP', sheet, 0);
      appendRow(SHEET_NAMES.EMAIL_TEMPLATES, [newId, type, subject, body, '']);
    }

    return { status: 'success', message: 'Template saved successfully.' };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Initializes default email templates in the sheet if they don't exist.
 * Can be called from Settings to reset/populate templates.
 */
function initializeDefaultEmailTemplates() {
  try {
    const sheet = getSheet(SHEET_NAMES.EMAIL_TEMPLATES);
    if (!sheet) return { status: 'error', message: 'Email Templates sheet not found.' };

    const existingData = getSheetDataAsObjects(sheet);
    const existingTypes = new Set(existingData.map(t => t.Type));

    const defaultTemplates = [
      {
        type: 'applicationApproved',
        subject: 'Approved: Internship Confirmation - GSV Electrical Enterprises',
        body: 'Congratulations {{StudentName}}! 🎉\n\nWe are thrilled to inform you that your internship application has been APPROVED!\n\n📋 Your Registration ID: {{RegistrationID}}\n📅 Internship Period: {{InternshipStartDate}} to {{InternshipEndDate}}\n🏫 College: {{CollegeName}}\n🎓 Department: {{Department}}\n\n✅ Next Steps:\n1. Download your Offer Letter from the Student Portal\n2. Complete the mandatory document uploads\n3. Report on your start date with your ID card\n\nWelcome aboard! We look forward to a productive internship journey together.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'applicationRejected',
        subject: 'Internship Application Status – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nThank you for your interest in the internship program at GSV Electrical Enterprises.\n\nAfter careful review, we regret to inform you that your application could not be approved at this time.\n\n📋 Registration ID: {{RegistrationID}}\n🏫 College: {{CollegeName}}\n\nThis may be due to limited seats or eligibility criteria. You are welcome to re-apply in the next intake cycle.\n\nWe wish you all the best in your academic journey.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'offerLetterNotify',
        subject: 'Internship Offer Letter – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nYour official Internship Offer Letter has been generated! 📄\n\n🆔 Registration ID: {{RegistrationID}}\n📅 Start Date: {{InternshipStartDate}}\n📅 End Date: {{InternshipEndDate}}\n⏱️ Duration: {{DurationDays}} Days\n\nPlease download your Offer Letter from the Student Portal and keep it for your records.\n\n📌 Important: Please report to the office on your start date with a printed copy of this letter.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'joiningLetterNotify',
        subject: 'Joining Instructions – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nYour Joining Letter has been generated! 🏢\n\n🆔 Registration ID: {{RegistrationID}}\n📅 Joining Date: {{InternshipStartDate}}\n🏫 College: {{CollegeName}}\n🎓 Department: {{Department}}\n\n📋 What to bring on Day 1:\n✓ Printed Offer Letter\n✓ College ID Card\n✓ Passport-size photos (2 copies)\n✓ Original mark sheets for verification\n\n⏰ Reporting Time: 9:00 AM\n📍 Location: GSV Electrical Enterprises, Main Office\n\nWe look forward to welcoming you!\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'internshipCompletedNotify',
        subject: 'Internship Completion – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nCongratulations on successfully completing your internship! 🎓🏆\n\n📋 Details:\n🆔 Registration ID: {{RegistrationID}}\n📅 Duration: {{DurationDays}} Days\n🏫 College: {{CollegeName}}\n🎓 Department: {{Department}}\n\n🏅 Your Completion Certificate will be generated shortly. You can download it from your Student Portal.\n\nWe hope this experience has been valuable for your career growth. Thank you for your dedication and hard work!\n\nBest wishes for your future endeavors.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'attendanceReminder',
        subject: 'Attendance Reminder – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nThis is a friendly reminder about your attendance. ⏰\n\n🆔 Registration ID: {{RegistrationID}}\n\n⚠️ Please ensure you maintain regular attendance and sign in/out using the RFID system daily.\n\nYour attendance record is monitored and will be reflected in your final certificate.\n\n📌 Note: Students with less than 75% attendance may face consequences on their completion status.\n\nPlease reach out if you have any concerns.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'generalWarning',
        subject: 'Important Notice – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nThis is an important notice regarding your internship.\n\n🆔 Registration ID: {{RegistrationID}}\n\n⚠️ Please review the following and take necessary action at the earliest.\n\nIf you have any questions, please contact the administration office.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'forgotPassword',
        subject: 'Password Recovery – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nWe received a request to recover your login credentials. 🔐\n\n🆔 Your Registration ID: {{RegistrationID}}\n📱 Registered Mobile: {{MobileNumber}}\n\nTo login, use your Registration ID and Date of Birth.\n\nIf you did not request this, please ignore this email.\n\n🛡️ Your security is our priority.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'rfidGenerated',
        subject: 'RFID Card Generated – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nYour RFID attendance card has been generated and activated! 💳\n\n🆔 Registration ID: {{RegistrationID}}\n\n📋 How it works:\n✓ Tap your card at the RFID reader when you arrive\n✓ Tap again when you leave\n✓ Your attendance will be automatically recorded\n\n⚠️ Important:\n• Do NOT share your card with others\n• Report any loss immediately to the admin\n• Keep the card in good condition\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'diaryReminder',
        subject: 'Daily Diary Entry Reminder – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nThis is a reminder to submit your daily diary entry. 📖\n\n🆔 Registration ID: {{RegistrationID}}\n\n📝 Your diary is an important record of your internship learning. Please make sure to fill in your daily diary entry before the end of each working day.\n\n⚠️ Missing diary entries will be flagged and may affect your completion certificate.\n\nPlease login to the Student Portal to submit your entry.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'taskNotification',
        subject: 'New Task Assigned – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nA new task has been assigned to you! 📝\n\n🆔 Registration ID: {{RegistrationID}}\n\n📋 Please login to your Student Portal to view the task details and deadline.\n\n⏰ Make sure to submit before the deadline to avoid penalties.\n\nBest of luck!\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'certificateGenerated',
        subject: 'Internship Completion Certificate - GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nYour Internship Completion Certificate has been generated! 🏅🎉\n\n🆔 Registration ID: {{RegistrationID}}\n📅 Duration: {{DurationDays}} Days\n🏫 College: {{CollegeName}}\n🎓 Department: {{Department}}\n\n📥 You can download your certificate from the Student Portal.\n\nCongratulations on this achievement! We hope this certificate adds value to your academic and professional profile.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'optOutConfirmation',
        subject: 'Internship Opt-Out Confirmation',
        body: 'Dear {{StudentName}},\n\nYour opt-out request has been processed. 👋\n\n🆔 Registration ID: {{RegistrationID}}\n🏫 College: {{CollegeName}}\n\nYour internship has been marked as Opted-Out. No completion certificate will be issued for this internship.\n\nIf this was done in error, please contact the administration immediately.\n\nWe wish you all the best.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'projectDelayAlert',
        subject: 'Project Submission Delay Alert – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nThis is an alert regarding a delayed project submission. ⚠️\n\n🆔 Registration ID: {{RegistrationID}}\n\n📋 Your project submission is overdue. Please complete and submit it as soon as possible.\n\n⏰ Delayed submissions may affect your final evaluation.\n\nPlease contact your supervisor if you need an extension.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'documentUploadReminder',
        subject: 'Action Required: Document Upload Missing – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nWe noticed that some mandatory documents are still pending upload. 📎\n\n🆔 Registration ID: {{RegistrationID}}\n\n📋 Required Documents:\n✓ College ID Card\n✓ Admission Letter / Bonafide Certificate\n✓ Photo\n✓ Parent/Guardian Consent (if applicable)\n\n⚠️ Please upload all required documents through the Student Portal at the earliest.\n\nDelayed uploads may affect your internship processing.\n\nBest regards,\nGSV Electrical Enterprises'
      },
      {
        type: 'applicationPending',
        subject: 'Application Pending - Action Required – GSV Electrical Enterprises',
        body: 'Dear {{StudentName}},\n\nYour internship application is currently under review. ⏳\n\n🆔 Registration ID: {{RegistrationID}}\n🏫 College: {{CollegeName}}\n\n📋 Status: PENDING\n\nOur team is reviewing your application. You will be notified once a decision is made.\n\n📌 In the meantime, please ensure all your submitted information is accurate.\n\nThank you for your patience.\n\nBest regards,\nGSV Electrical Enterprises'
      }
    ];

    let addedCount = 0;
    defaultTemplates.forEach(tpl => {
      if (!existingTypes.has(tpl.type)) {
        const newId = generateUniqueId('TMP', sheet, 0);
        appendRow(SHEET_NAMES.EMAIL_TEMPLATES, [newId, tpl.type, tpl.subject, tpl.body, '']);
        addedCount++;
      }
    });

    return { status: 'success', message: addedCount > 0 ? `${addedCount} new templates added successfully.` : 'All templates already exist.' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function sendAdminEmail(arg1, arg2, arg3) {
  let recipientRegId, subject, body;

  if (typeof arg1 === 'object' && arg1 !== null) {
    recipientRegId = arg1.recipientRegId;
    subject = arg1.customSubject || arg1.subject;
    body = arg1.customBody || arg1.body;
  } else {
    recipientRegId = arg1;
    subject = arg2;
    body = arg3;
  }

  try {
    if (!subject || !body) return { status: 'error', message: 'Subject and Email Body are required.' };

    let recipients = [];
    if (recipientRegId) {
      if (recipientRegId.includes('@')) {
        // Direct email
        recipients.push({ email: recipientRegId, name: 'Student', fullData: {} });
      } else {
        // Reg ID
        const student = getStudentDataForDoc(recipientRegId);
        if (student && student.GmailID) {
          recipients.push({ email: student.GmailID, name: student.FirstName, fullData: student });
        } else {
          return { status: 'error', message: 'Student ' + recipientRegId + ' not found or has no email.' };
        }
      }
    } else {
      // Bulk email to Approved/Active
      const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
      const data = getSheetDataAsObjects(regSheet);
      recipients = data.filter(s => s.ApplicationStatus === 'Approved' || s.ApplicationStatus === 'Active').map(s => ({
        email: s.GmailID,
        name: s.FirstName,
        fullData: {
          ...s,
          FullName: `${s.FirstName} ${s.LastName}`,
          FormattedStartDate: formatDateDisplay(s.InternshipStartDate),
          FormattedEndDate: formatDateDisplay(s.InternshipEndDate),
          CompanyName: COMPANY_NAME
        }
      }));
    }

    let emailsSentCount = 0;
    recipients.forEach(recipient => {
      let personalizedBodyText = body;
      let personalizedSubject = subject;

      personalizedBodyText = personalizedBodyText.replace(/{{StudentName}}/gi, recipient.name || 'Student');
      personalizedSubject = personalizedSubject.replace(/{{StudentName}}/gi, recipient.name || 'Student');

      if (recipient.fullData) {
        Object.keys(recipient.fullData).forEach(key => {
          const val = recipient.fullData[key];
          if (val !== undefined && val !== null) {
            const regexDouble = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
            personalizedBodyText = personalizedBodyText.replace(regexDouble, val);
            personalizedSubject = personalizedSubject.replace(regexDouble, val);
            const regexSingle = new RegExp('\\{' + key + '\\}', 'g');
            personalizedBodyText = personalizedBodyText.replace(regexSingle, val);
            personalizedSubject = personalizedSubject.replace(regexSingle, val);
          }
        });
      }

      // Auto-detect email type from subject for professional template styling
      const subLower = personalizedSubject.toLowerCase();
      let emailType = 'custom';
      if (subLower.includes('confirm') || subLower.includes('approved')) emailType = 'confirmation';
      else if (subLower.includes('complet') || subLower.includes('congratulat')) emailType = 'completion';
      else if (subLower.includes('welcome') || subLower.includes('future')) emailType = 'welcome';
      else if (subLower.includes('reject')) emailType = 'rejected';
      else if (subLower.includes('offer letter')) emailType = 'offerLetter';
      else if (subLower.includes('joining')) emailType = 'joiningLetter';
      else if (subLower.includes('certificate')) emailType = 'certificate';
      else if (subLower.includes('attendance') || subLower.includes('reminder')) emailType = 'attendance';
      else if (subLower.includes('diary')) emailType = 'diary';
      else if (subLower.includes('task')) emailType = 'task';
      else if (subLower.includes('rfid')) emailType = 'rfid';
      else if (subLower.includes('opt-out') || subLower.includes('optout')) emailType = 'optout';
      else if (subLower.includes('document') || subLower.includes('upload')) emailType = 'documentReminder';
      else if (subLower.includes('pending')) emailType = 'pending';
      else if (subLower.includes('password') || subLower.includes('forgot')) emailType = 'forgotPassword';
      else if (subLower.includes('project') && subLower.includes('delay')) emailType = 'projectDelay';

      // Build professional HTML body using template
      const emailData = {
        FullName: recipient.fullData.FullName || recipient.name || 'Student',
        Body: personalizedBodyText,
        DurationDays: recipient.fullData.DurationDays || '',
        RegistrationID: recipient.fullData.RegistrationID || '',
        Department: recipient.fullData.Department || '',
        CollegeName: recipient.fullData.CollegeName || ''
      };
      const htmlBody = getProfessionalEmailBody(emailType, emailData, '');

      if (sendEmail(recipient.email, personalizedSubject, personalizedBodyText, htmlBody)) {
        emailsSentCount++;
      }
    });

    logActivity('Emails Sent', `Custom email: ${subject} sent to ${emailsSentCount} recipient(s)`);
    return { status: 'success', message: 'Email sent to ' + emailsSentCount + ' recipient(s).' };
  } catch (error) {
    return { status: 'error', message: 'Error sending custom email: ' + error.message };
  }
}

/**
 * Generates an HTML preview for the email template before sending.
 */
function getEmailPreviewHtml(subject, body, studentName, additionalParams = {}) {
  try {
    const subLower = (subject || '').toLowerCase();
    let emailType = 'custom';
    if (subLower.includes('confirm') || subLower.includes('approved')) emailType = 'confirmation';
    else if (subLower.includes('complet') || subLower.includes('congratulat')) emailType = 'completion';
    else if (subLower.includes('welcome') || subLower.includes('future')) emailType = 'welcome';
    else if (subLower.includes('reject')) emailType = 'rejected';
    else if (subLower.includes('offer letter')) emailType = 'offerLetter';
    else if (subLower.includes('joining')) emailType = 'joiningLetter';
    else if (subLower.includes('certificate')) emailType = 'certificate';
    else if (subLower.includes('attendance') || subLower.includes('reminder')) emailType = 'attendance';
    else if (subLower.includes('diary')) emailType = 'diary';
    else if (subLower.includes('task')) emailType = 'task';
    else if (subLower.includes('rfid')) emailType = 'rfid';
    else if (subLower.includes('opt-out') || subLower.includes('optout')) emailType = 'optout';
    else if (subLower.includes('document') || subLower.includes('upload')) emailType = 'documentReminder';
    else if (subLower.includes('pending')) emailType = 'pending';
    else if (subLower.includes('password') || subLower.includes('forgot')) emailType = 'forgotPassword';
    else if (subLower.includes('project') && subLower.includes('delay')) emailType = 'projectDelay';

    const p = additionalParams || {};
    const emailData = {
      FullName: studentName || '{{StudentName}}',
      Body: body || '',
      DurationDays: p.DurationDays || '{{DurationDays}}',
      RegistrationID: p.RegistrationID || '{{RegistrationID}}',
      Department: p.Department || '{{Department}}',
      CollegeName: p.CollegeName || '{{CollegeName}}'
    };

    return getProfessionalEmailBody(emailType, emailData, '');
  } catch (e) {
    return `<div style="padding: 20px; color: red;">Error generating preview: ${e.message}</div>`;
  }
}

// DOC GENERATION
function getTemplateIdForDocType(docType) {
  const settingsResult = getAppSettings();
  const appSettings = (settingsResult && settingsResult.status === 'success') ? settingsResult.settings : {};
  const mapping = {
    'internshipCertificate': 'TPL_CERTIFICATE',
    'offerLetter': 'TPL_OFFER_LETTER',
    'joiningLetter': 'TPL_JOINING_LETTER',
    'entryPass': 'TPL_ENTRY_PASS',
    'idCard': 'TPL_ID_CARD',
    'applicationForm': 'TPL_APPLICATION_FORM'
  };

  const settingKey = mapping[docType];
  if (settingKey && appSettings[settingKey]) {
    return appSettings[settingKey];
  }

  const templates = {
    'internshipCertificate': TEMPLATE_IDS.INTERNSHIP_CERTIFICATE,
    'offerLetter': TEMPLATE_IDS.OFFER_LETTER,
    'joiningLetter': TEMPLATE_IDS.JOINING_LETTER,
    'entryPass': TEMPLATE_IDS.ENTRY_PASS,
    'idCard': TEMPLATE_IDS.ID_CARD,
    'applicationForm': TEMPLATE_IDS.APPLICATION_FORM
  };

  return templates[docType] || null;
}

function getStudentDataForDoc(registrationId) {
  const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  if (!regSheet) return null;
  const data = regSheet.getDataRange().getValues();
  if (data.length < 1) return null;
  const header = data[0];

  // Create a normalized header map for case-insensitive, whitespace-insensitive lookup
  const normalizedHeaderMap = {};
  header.forEach((colName, index) => {
    if (colName) {
      const normalized = colName.toString().trim().toLowerCase();
      normalizedHeaderMap[normalized] = index;
    }
  });

  // Find RegistrationID column
  const regIdCol = normalizedHeaderMap['registrationid'];
  if (regIdCol === undefined) return null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][regIdCol] === registrationId) {
      const studentRow = data[i];
      const studentInfo = {};

      // Map header columns to values, trimming whitespace from header names
      header.forEach((colName, index) => {
        const trimmedColName = colName ? colName.toString().trim() : '';
        if (trimmedColName) {
          studentInfo[trimmedColName] = studentRow[index];
        }
      });

      // Also create case-insensitive aliases for common fields
      // This ensures we can find Year regardless of how it's capitalized in the sheet
      const fieldMappings = {
        'Year': ['year', 'Year', 'YEAR', 'StudentYear'],
        'Department': ['department', 'Department', 'DEPARTMENT', 'Dept', 'dept'],
        'CollegeName': ['collegename', 'CollegeName', 'College', 'college'],
        'Semester': ['semester', 'Semester', 'SEMESTER'],
        'EducationType': ['educationtype', 'EducationType', 'Education Type']
      };

      // For each field, try to find its value using various casing
      for (const [standardName, variations] of Object.entries(fieldMappings)) {
        if (studentInfo[standardName] === undefined || studentInfo[standardName] === null || studentInfo[standardName] === '') {
          // Try to find the field using normalized header lookup
          for (const variant of variations) {
            const normalizedVariant = variant.toLowerCase().replace(/\s+/g, '');
            for (const [normalizedHeader, colIndex] of Object.entries(normalizedHeaderMap)) {
              if (normalizedHeader.replace(/\s+/g, '') === normalizedVariant) {
                const value = studentRow[colIndex];
                if (value !== undefined && value !== null && value !== '') {
                  studentInfo[standardName] = value;
                  break;
                }
              }
            }
            if (studentInfo[standardName] !== undefined && studentInfo[standardName] !== null && studentInfo[standardName] !== '') {
              break;
            }
          }
        }
      }

      studentInfo.FullName = `${studentInfo.FirstName || ''} ${studentInfo.MiddleName || ''} ${studentInfo.LastName || ''}`.trim().replace(/\s+/g, ' ');
      studentInfo.FormattedStartDate = formatDateDisplay(studentInfo.InternshipStartDate);
      studentInfo.FormattedEndDate = formatDateDisplay(studentInfo.InternshipEndDate);
      studentInfo.FormattedDOB = formatDateDisplay(studentInfo.DateofBirth);
      studentInfo.TodayDate = formatDateDisplay(new Date());
      studentInfo.CompanyName = COMPANY_NAME;
      studentInfo.CompanyContact = COMPANY_CONTACT;
      studentInfo.CompanyWebsite = COMPANY_WEBSITE;

      let safeDuration = studentInfo.DurationDays !== undefined ? studentInfo.DurationDays : 'N/A';
      if (safeDuration instanceof Date || !safeDuration || safeDuration === 'N/A') {
        const d1 = new Date(studentInfo.InternshipStartDate);
        const d2 = new Date(studentInfo.InternshipEndDate);
        if (!isNaN(d1) && !isNaN(d2)) {
          safeDuration = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)).toString();
        } else {
          safeDuration = 'N/A';
        }
      } else {
        safeDuration = safeDuration.toString();
      }
      studentInfo.DurationDays = safeDuration;

      // === Robust Year Extraction ===
      // Try multiple approaches to get the Year value since it's critical for documents
      let yearValue = studentInfo['Year'];

      // Approach 1: Direct column index from normalizedHeaderMap
      if (yearValue === undefined || yearValue === null || yearValue === '') {
        const yearColIdx = normalizedHeaderMap['year'];
        if (yearColIdx !== undefined) {
          yearValue = studentRow[yearColIdx];
        }
      }

      // Approach 2: Scan ALL headers for anything matching "year" (case-insensitive)
      if (yearValue === undefined || yearValue === null || yearValue === '') {
        for (let ci = 0; ci < header.length; ci++) {
          const hName = (header[ci] || '').toString().trim().toLowerCase();
          if (hName === 'year' || hName === 'studentyear') {
            const cellVal = studentRow[ci];
            if (cellVal !== undefined && cellVal !== null && cellVal !== '') {
              yearValue = cellVal;
              break;
            }
          }
        }
      }

      // Approach 3: Use the SHEET_SCHEMAS expected column position as a last resort
      if (yearValue === undefined || yearValue === null || yearValue === '') {
        const expectedYearIdx = SHEET_SCHEMAS[SHEET_NAMES.REGISTRATIONS].indexOf('Year');
        if (expectedYearIdx !== -1 && studentRow[expectedYearIdx] !== undefined && studentRow[expectedYearIdx] !== null && studentRow[expectedYearIdx] !== '') {
          yearValue = studentRow[expectedYearIdx];
        }
      }

      // Convert numeric Year to string (handles cases where Sheets returns a number)
      if (yearValue !== undefined && yearValue !== null && yearValue !== '') {
        if (typeof yearValue === 'number') {
          yearValue = Math.floor(yearValue).toString(); // e.g., 3 → "3"
        } else {
          yearValue = String(yearValue).trim();
        }
        studentInfo['Year'] = yearValue;
      }

      // Handle fields that should default to N/A if empty
      ['Address', 'Pincode', 'District', 'CollegeName', 'Department', 'Year', 'MobileNumber', 'Semester', 'EducationType'].forEach(f => {
        const targetVal = studentInfo[f];
        if (targetVal === undefined || targetVal === null || String(targetVal).trim() === '') {
          studentInfo[f] = 'N/A';
        } else {
          studentInfo[f] = String(targetVal).trim();
        }
      });

      // Extensive logging for debugging
      Logger.log('=== Student Data Debug ===');
      Logger.log('RegistrationID: ' + registrationId);
      Logger.log('Year value from studentInfo: ' + studentInfo.Year);
      Logger.log('Raw header array: ' + JSON.stringify(header));
      Logger.log('Year column index: ' + normalizedHeaderMap['year']);
      Logger.log('Raw Year value from row: ' + (normalizedHeaderMap['year'] !== undefined ? studentRow[normalizedHeaderMap['year']] : 'Column not found'));
      Logger.log('All studentInfo keys: ' + Object.keys(studentInfo).join(', '));
      Logger.log('=========================');

      return studentInfo;
    }
  }
  return null;
}



function generateDocumentAndMail(docType, registrationId, sendEmailOption = false, isAdmin = false) {
  try {
    // === FIX: MAP studentAppForm to applicationForm ===
    if (docType === 'studentAppForm') {
      docType = 'applicationForm';
    }

    // === FIX: EARLY CHECK FOR ALREADY GENERATED DOCUMENTS ===
    if (docType === 'applicationForm') {
      const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
      if (docSheet) {
        const docData = docSheet.getDataRange().getValues();
        if (docData.length > 1) {
          const docHeaders = docData[0];
          const regColIdx = docHeaders.indexOf("StudentRegistrationID");
          const typeColIdx = docHeaders.indexOf("DocType");
          const urlColIdx = docHeaders.indexOf("DocUrl");
          if (regColIdx !== -1 && typeColIdx !== -1 && urlColIdx !== -1) {
            for (let i = 1; i < docData.length; i++) {
              if (String(docData[i][regColIdx]).toUpperCase() === String(registrationId).toUpperCase() && docData[i][typeColIdx] === docType) {
                const existingUrl = docData[i][urlColIdx];
                if (existingUrl && existingUrl.toString().trim() !== '') {
                  Logger.log(`Found existing applicationForm for ${registrationId}. Reusing: ${existingUrl}`);
                  return { status: 'success', message: `${docType} fetched from existing records.`, url: existingUrl, driveLink: existingUrl, viewUrl: existingUrl };
                }
              }
            }
          }
        }
      }
    }

    const studentData = getStudentDataForDoc(registrationId);
    if (!studentData) return { status: 'error', message: `Student ${registrationId} not found.` };

    // === DOCUMENT APPROVAL SYSTEM (GSV-ERP-V2) ===
    const restrictedDocs = ['internshipCertificate', 'COMPLETION_CERTIFICATE', 'offerLetter', 'OFFER_LETTER', 'joiningLetter', 'JOINING_LETTER', 'idCard', 'ID_CARD', 'entryPass', 'ENTRY_PASS', 'General Permission', 'Grace Period', 'Emergency Leave'];
    const unrestrictedForStudents = ['studentDiary', 'dailyLogForm5'];

    if (!isAdmin && restrictedDocs.includes(docType) && !unrestrictedForStudents.includes(docType)) {
      const approval = checkDocumentApproval(registrationId, docType);
      if (approval.status !== 'Approved') {
        return {
          status: 'approval_required',
          message: 'Admin approval is required to generate this document.',
          docType: docType,
          approvalStatus: approval.status
        };
      }
    }
    // ===========================================

    // === CRITICAL DEBUG LOGGING ===
    Logger.log('========== generateDocumentAndMail DEBUG ==========');
    Logger.log('Registration ID requested: ' + registrationId);
    Logger.log('studentData.Year = "' + studentData.Year + '"');
    Logger.log('studentData.Department = "' + studentData.Department + '"');
    Logger.log('studentData.CollegeName = "' + studentData.CollegeName + '"');
    Logger.log('studentData.RegisterNumber = "' + studentData.RegisterNumber + '"');
    Logger.log('studentData.FullName = "' + studentData.FullName + '"');
    Logger.log('All studentData keys: ' + Object.keys(studentData).join(', '));
    Logger.log('====================================================');


    if (docType === 'studentDiary') {
      const res = generateStudentDiaryPDF_V2({
        regId: registrationId,
        mode: 'consolidated',
        orientation: 'portrait'
      });

      if (res && res.status === 'success') {
        if (sendEmailOption && studentData.GmailID) {
          const subject = `Your Student Diary - ${COMPANY_NAME}`;
          const emailBody = `Dear ${studentData.FirstName},\n\nPlease find your consolidated student diary attached.\n\nBest regards,\n${COMPANY_NAME}`;
          try {
            const file = DriveApp.getFileById(res.fileId);
            MailApp.sendEmail({
              to: studentData.GmailID,
              subject: subject,
              body: emailBody,
              htmlBody: emailBody.replace(/\\n/g, '<br>'),
              attachments: [file.getAs(MimeType.PDF)]
            });
            const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
            if (docSheet) docSheet.getRange(docSheet.getLastRow(), 8).setValue('Yes');
          } catch (e) {
            Logger.log("Email failed for Student Diary: " + e.message);
            return { status: 'success', message: 'Diary generated but email failed.', url: res.url, driveLink: res.url };
          }
        }
        return {
          status: 'success',
          message: 'Student Diary generated successfully.',
          url: res.url,
          driveLink: res.url
        };
      }
      return res || { status: 'error', message: 'Failed to generate Student Diary.' };
    }

    // Advanced Mapping for dynamically generated System Reports
    const advancedReportMap = {
      'attendance': 'attendance',
      'attendanceDocument': 'completeAttendanceReport',
      'dailyAttendanceReport': 'attendance',
      'dailyTaskReport': 'taskCompletion',
      'projectCompletion': 'projectCompletion',
      'studentCV': 'completeStudentReport'
    };

    if (advancedReportMap[docType]) {
      const mappedType = advancedReportMap[docType];

      const options = {
        reportScope: 'student',
        studentId: registrationId,
        reportMode: 'duration',
        includeHeader: true,
        includeSignatures: true,
        includeCompanyDetails: true,
        includeTimestamp: true
      };

      const res = generateReport(mappedType, 'internPeriod', null, null, sendEmailOption, options);
      if (res && res.status === 'success') {
        return {
          status: 'success',
          message: res.message,
          url: res.url,
          driveLink: res.url
        };
      }
      return res || { status: 'error', message: 'Failed to generate dynamic advanced document.' };
    }

    let templateId = getTemplateIdForDocType(docType);
    if (!templateId) return { status: 'error', message: `Template for ${docType} not configured.` };

    const newDocName = `${docType}_${registrationId}_${studentData.LastName}.pdf`;

    // Parse actual RegistrationID components (format: GSV/YYYY/N/CODE)
    // Example: GSV/2026/6/QJA9 -> parts: ['GSV', '2026', '6', 'QJA9']
    const regIdParts = (studentData.RegistrationID || '').split('/');
    const regIdYear = regIdParts.length >= 2 ? regIdParts[1] : new Date().getFullYear().toString();
    const regIdYearTwoDigit = regIdYear.slice(-2); // Get last 2 digits of year from RegistrationID
    const regIdSeq = regIdParts.length >= 3 ? regIdParts[2] : '';
    const regIdCode = regIdParts.length >= 4 ? regIdParts[3] : '';

    // Document type code for reference
    const docTypeCode = docType === 'offerLetter' ? 'O' : (docType === 'joiningLetter' ? 'J' : (docType === 'entryPass' ? 'E' : (docType === 'applicationForm' ? 'A' : 'C')));

    // Placeholder values map
    let placeholderValues = {
      'FullName': studentData.FullName || '',
      'StudentName': studentData.FullName || '',
      'RegistrationID': studentData.RegistrationID || '',
      'RegisterNumber': studentData.RegisterNumber || 'N/A',
      'YEAR': studentData.Year || 'N/A',
      'Year': studentData.Year || 'N/A',
      'year': studentData.Year || 'N/A',
      'StudentYear': studentData.Year || 'N/A',
      'InternshipStartDate': studentData.FormattedStartDate || '',
      'InternshipEndDate': studentData.FormattedEndDate || '',
      'DurationDays': studentData.DurationDays || 'N/A',
      'CollegeName': studentData.CollegeName || 'N/A',
      'College': studentData.CollegeName || 'N/A',
      'Department': studentData.Department || 'N/A',
      'Dept': studentData.Department || 'N/A',
      'DateofBirth': studentData.FormattedDOB || '',
      'TodayDate': studentData.TodayDate || '',
      'CurrentDate': studentData.TodayDate || '',
      'Current Date': studentData.TodayDate || '',
      'CompanyName': studentData.CompanyName || COMPANY_NAME,
      'YY': regIdYearTwoDigit,
      'SLNO': regIdSeq + '/' + regIdCode,
      'Address': studentData.Address || 'N/A',
      'MobileNumber': studentData.MobileNumber || 'N/A',
      'GmailID': studentData.GmailID || 'N/A',
      'Email': studentData.GmailID || 'N/A',
      'Batch': studentData.Batch || 'N/A',
      'Semester': studentData.Semester || 'N/A',
      'EducationType': studentData.EducationType || 'N/A',
      'UniversityRegisterNumber': studentData.RegisterNumber || 'N/A',
      'CollegeCode': studentData.CollegeCode || 'N/A',
      'Pincode': studentData.Pincode || 'N/A',
      'District': studentData.District || 'N/A',
      'CompanyContact': studentData.CompanyContact || COMPANY_CONTACT || '',
      'CompanyWebsite': studentData.CompanyWebsite || COMPANY_WEBSITE || '',
      'ChiefEngineerName': studentData.ChiefEngineerName || '',
      'ChiefEngineerTitle': studentData.ChiefEngineerTitle || '',
      'ChiefEngineerDetailsPlaceholder': (studentData.ChiefEngineerDetails || '').replace(/<br\s*\/?>/gi, "\n"),
      // USER SPECIFIC PLACEHOLDERS
      'STUDENT_NAME': studentData.FullName || '',
      'REGISTRATION_ID': studentData.RegistrationID || '',
      'APPLICATION_DATE': studentData.TodayDate || '',
      'APPLICATION_STATUS': studentData.ApplicationStatus || 'Approved',
      'START_DATE': studentData.FormattedStartDate || '',
      'END_DATE': studentData.FormattedEndDate || '',
      'ADDRESS': studentData.Address || 'N/A',
      'PINCODE': studentData.Pincode || 'N/A',
      'DISTRICT': studentData.District || 'N/A',
      'EMAIL': studentData.GmailID || 'N/A',
      'PHONE': studentData.MobileNumber || 'N/A',
      'COLLEGE_NAME': studentData.CollegeName || 'N/A',
      'COLLEGE_CODE': studentData.CollegeCode || 'N/A',
      'COLLEGE_DISTRICT': studentData.CollegeDistrict || 'N/A',
      'COLLEGE_REGISTER_NO': studentData.RegisterNumber || 'N/A',
      'EDUCATION_TYPE': studentData.EducationType || 'N/A',
      'SEMESTER': studentData.Semester || 'N/A',
      'DOB': studentData.FormattedDOB || 'N/A',
      'CGPA': studentData.GPA || 'N/A',
      'WORK_AREA': studentData.InterestedArea || 'N/A',
      'TOTAL_DAYS': studentData.DurationDays || 'N/A',
      'REMARKS': studentData.Remarks || 'N/A',
      'BATCH': studentData.Batch || 'N/A',
      'PROJECT_TITLE': studentData.ProjectTitle || 'N/A',
      'DEPARTMENT': studentData.Department || 'N/A',
      'department': studentData.Department || 'N/A',
      'SkillLearned': studentData.SkillLearned || 'N/A',
      'skilllearned': studentData.SkillLearned || 'N/A'
    };

    if (docType === 'internshipCertificate' || docType === 'completionCertificate') {
      const certSheet = getSheet(SHEET_NAMES.CERTIFICATE_DATA);
      let certNumber = null;
      if (certSheet) {
        const cData = certSheet.getDataRange().getValues();
        const cRegCol = cData[0].indexOf("StudentRegistrationID");
        const cNumCol = cData[0].indexOf("CertificateNumber");
        if (cRegCol !== -1 && cNumCol !== -1) {
          for (let i = 1; i < cData.length; i++) {
            if (String(cData[i][cRegCol]).toUpperCase() === registrationId.toUpperCase()) {
              certNumber = cData[i][cNumCol];
              break;
            }
          }
        }
      }
      if (!certNumber) {
        certNumber = generateCertificateSerialNumber(studentData, certSheet);
      }
      placeholderValues['CertificateNumber'] = certNumber;
      placeholderValues['IssuedDate'] = studentData.TodayDate;
    }

    const templateFile = DriveApp.getFileById(templateId);
    const targetFolderId = getSystemFolderId('generated');
    const targetFolder = DriveApp.getFolderById(targetFolderId);
    const tempCopy = templateFile.makeCopy(newDocName, targetFolder);
    const doc = DocumentApp.openById(tempCopy.getId());
    const body = doc.getBody();

    // === SPECIAL HANDLING FOR APPLICATION FORM (QR CODE & ATTENDANCE TABLE & PAGINATION) ===
    if (docType === 'applicationForm') {
      try {
        // 1. Insert QR Code
        const qrUrl = "https://quickchart.io/qr?size=150&text=" + encodeURIComponent(registrationId);
        const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob();

        // Find position for QR Code (below Registration ID holder)
        const pos = body.findText("\\{\\{\\s*REGISTRATION_ID\\s*\\}\\}") || body.findText("REGISTRATION_ID") || body.findText("Registration ID");
        if (pos) {
          const element = pos.getElement();
          let paragraph = element;
          while (paragraph && paragraph.getType() !== DocumentApp.ElementType.PARAGRAPH && paragraph.getType() !== DocumentApp.ElementType.LIST_ITEM) {
            paragraph = paragraph.getParent();
          }
          if (paragraph) {
            const container = paragraph.getParent();
            const index = container.getChildIndex(paragraph);

            // Insert a new paragraph below for the QR code
            const imgPara = container.insertParagraph(index + 1, "");
            imgPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            const img = imgPara.appendInlineImage(qrBlob);
            img.setWidth(75);
            img.setHeight(75);
          }
        }

        // 2. Pagination Logic: Start Form-2, Form-3, Form-4 on new pages
        const paginationLabels = ["Form-2", "Form-3", "Form-4", "Form-5", "Form 2", "Form 3", "Form 4", "Form 5"];
        paginationLabels.forEach(label => {
          let found = body.findText(label);
          if (found) {
            let element = found.getElement();
            let paragraph = element;
            while (paragraph && paragraph.getType() !== DocumentApp.ElementType.PARAGRAPH && paragraph.getType() !== DocumentApp.ElementType.LIST_ITEM) {
              paragraph = paragraph.getParent();
            }
            if (paragraph) {
              // Ensure we are at body level or list level for page break
              try {
                if (paragraph.asParagraph) paragraph.asParagraph().setPageBreakBefore(true);
                else if (paragraph.asListItem) paragraph.asListItem().setPageBreakBefore(true);
              } catch (e) { }
            }
          }
        });

      } catch (err) {
        Logger.log("Error in applicationForm special handling: " + err);
      }
    }

    // Dynamic Attendance Table Generation {{ATTENDANCE_LOG}}
    try {
      const attenPattern = '\\{\\{\\s*ATTENDANCE_LOG\\s*\\}\\}';
      let foundAtten = body.findText(attenPattern);
      while (foundAtten) {
        let textElement = foundAtten.getElement().asText();
        let parent = textElement.getParent();
        let startOffset = foundAtten.getStartOffset();
        let endOffset = foundAtten.getEndOffsetInclusive();

        textElement.deleteText(startOffset, endOffset);

        let elementAtBodyLevel = parent;
        while (elementAtBodyLevel.getParent() && elementAtBodyLevel.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) {
          elementAtBodyLevel = elementAtBodyLevel.getParent();
        }

        if (elementAtBodyLevel.getParent().getType() === DocumentApp.ElementType.BODY_SECTION) {
          let targetIndex = body.getChildIndex(elementAtBodyLevel);
          const table = body.insertTable(targetIndex + 1);
          table.setBorderWidth(1);

          const headerRow = table.appendTableRow();
          const headers = ['Date', 'Day', 'In Time', 'Out Time', 'Student Sign', 'Supervisor Sign'];
          headers.forEach(h => {
            const cell = headerRow.appendTableCell(h);
            cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            cell.setBackgroundColor('#f3f3f3');
          });

          let startDate = studentData.InternshipStartDate ? new Date(studentData.InternshipStartDate) : null;
          let endDate = studentData.InternshipEndDate ? new Date(studentData.InternshipEndDate) : null;

          if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            let current = new Date(startDate);
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            while (current <= endDate) {
              const row = table.appendTableRow();
              const dStr = Utilities.formatDate(current, Session.getScriptTimeZone() || "Asia/Kolkata", "dd-MM-yyyy");
              const dayStr = weekdays[current.getDay()];

              [dStr, dayStr, '', '', '', ''].forEach(val => {
                const cell = row.appendTableCell(val);
                cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
              });
              current.setDate(current.getDate() + 1);
            }
          } else {
            const row = table.appendTableRow();
            ['', '', '', '', '', ''].forEach(val => row.appendTableCell(val));
          }
        }
        foundAtten = body.findText(attenPattern);
      }
    } catch (e) {
      Logger.log("Error generating dynamic ATTENDANCE_LOG: " + e);
    }

    // 100% NATIVE COMPACT BARCODE (CODE 128 TYPOGRAPHY) - STRICT 2 INCH WIDTH RATIO
    try {
      let patternTags = ['BARCODE', 'Barcode', 'QR_CODE', 'QRCode'];
      patternTags.forEach(tag => {
        const pattern = '\\{\\{\\s*' + tag + '\\s*\\}\\}';
        let found = body.findText(pattern);

        while (found) {
          let textElement = found.getElement().asText();
          let startOffset = found.getStartOffset();
          let endOffset = found.getEndOffsetInclusive();

          textElement.deleteText(startOffset, endOffset);

          // Natively encode into densely packed Code 128 B string
          let baseStr = String(registrationId).toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '');
          let barcodeText = generateNativelyCompactCode128(baseStr);

          textElement.insertText(startOffset, barcodeText);

          // Code 128 compresses horizontal width severely, allowing us to dramatically boost vertical height natively!
          textElement.setFontFamily(startOffset, startOffset + barcodeText.length - 1, "Libre Barcode 128");
          textElement.setFontSize(startOffset, startOffset + barcodeText.length - 1, 36);
          textElement.setBold(startOffset, startOffset + barcodeText.length - 1, false);
          textElement.setItalic(startOffset, startOffset + barcodeText.length - 1, false);

          // Prevent paragraph spacing gaps below to suck up the Status text
          if (textElement.getParent().getType() === DocumentApp.ElementType.PARAGRAPH) {
            let pa = textElement.getParent().asParagraph();
            pa.setSpacingAfter(0);
            pa.setSpacingBefore(0);
            pa.setLineSpacing(1);
          }

          found = body.findText(pattern);
        }
      });
    } catch (e) {
      Logger.log("Error inserting inline Barcode Font: " + e);
    }


    for (const placeholderName in placeholderValues) {
      const value = placeholderValues[placeholderName] || '';
      const patternDouble = '\\{\\{\\s*' + placeholderName + '\\s*\\}\\}';
      const patternSingle = '\\{\\s*' + placeholderName + '\\s*\\}';
      try {
        body.replaceText(patternDouble, value);
        body.replaceText(patternSingle, value);
      } catch (e) {
        Logger.log('Error replacing placeholder ' + placeholderName + ': ' + e.toString());
      }
    }

    doc.saveAndClose();

    const generatedFile = tempCopy.getAs(MimeType.PDF);
    generatedFile.setName(newDocName);
    const finalPdf = targetFolder.createFile(generatedFile);
    tempCopy.setTrashed(true);

    const driveLink = finalPdf.getUrl();

    if (docType === 'internshipCertificate' || docType === 'completionCertificate') {
      const certSheet = getSheet(SHEET_NAMES.CERTIFICATE_DATA);
      if (certSheet) {
        const certData = certSheet.getDataRange().getValues();
        const regIdx = certData[0].indexOf("StudentRegistrationID");
        let foundIdx = -1;
        if (regIdx !== -1) {
          for (let i = 1; i < certData.length; i++) {
            if (String(certData[i][regIdx]).toUpperCase() === registrationId.toUpperCase()) {
              foundIdx = i + 1;
              break;
            }
          }
        }
        if (foundIdx !== -1) {
          const pdfColIdx = certData[0].indexOf("CertificatePdfId");
          const dateColIdx = certData[0].indexOf("IssuedDate");
          if (pdfColIdx !== -1) certSheet.getRange(foundIdx, pdfColIdx + 1).setValue(finalPdf.getId());
          if (dateColIdx !== -1) certSheet.getRange(foundIdx, dateColIdx + 1).setValue(new Date());
        } else {
          const certHeader = certSheet.getRange("1:1").getValues()[0];
          const certRecord = {
            CertificateNumber: placeholderValues['CertificateNumber'],
            StudentRegistrationID: registrationId,
            StudentName: studentData.FullName,
            Department: studentData.Department,
            InternshipStartDate: studentData.InternshipStartDate,
            InternshipEndDate: studentData.InternshipEndDate,
            DurationDays: studentData.DurationDays,
            IssuedDate: new Date(),
            Status: 'Valid',
            CertificatePdfId: finalPdf.getId()
          };
          const certRow = certHeader.map(col => certRecord[col] !== undefined ? certRecord[col] : '');
          appendRow(SHEET_NAMES.CERTIFICATE_DATA, certRow);
        }
      }
    }

    // Log generation
    const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
    let existingDocRow = -1;
    let finalDocId = null;
    let finalRefNum = null;

    if (docSheet) {
      const docData = docSheet.getDataRange().getValues();
      const regColIdx = docData[0].indexOf("StudentRegistrationID");
      const typeColIdx = docData[0].indexOf("DocType");
      const idColIdx = docData[0].indexOf("DocumentID");
      const refColIdx = docData[0].indexOf("ReferenceNumber");

      if (regColIdx !== -1 && typeColIdx !== -1) {
        for (let i = 1; i < docData.length; i++) {
          if (String(docData[i][regColIdx]).toUpperCase() === registrationId.toUpperCase() && docData[i][typeColIdx] === docType) {
            existingDocRow = i + 1;
            finalDocId = (idColIdx !== -1) ? docData[i][idColIdx] : null;
            finalRefNum = (refColIdx !== -1) ? docData[i][refColIdx] : null;
            break;
          }
        }
      }
    }

    finalDocId = finalDocId || generateUniqueId('DOC', docSheet, 0);
    finalRefNum = finalRefNum || ('REF-' + Date.now());

    if (existingDocRow !== -1 && docSheet) {
      const docHeaders = docSheet.getRange("1:1").getValues()[0];
      const updateUrlCol = docHeaders.indexOf("DocUrl");
      const updatePdfCol = docHeaders.indexOf("PdfFileId");
      const updateDateCol = docHeaders.indexOf("GeneratedDate");
      const updateEmailCol = docHeaders.indexOf("SentViaEmail");
      if (updateUrlCol !== -1) docSheet.getRange(existingDocRow, updateUrlCol + 1).setValue(driveLink);
      if (updatePdfCol !== -1) docSheet.getRange(existingDocRow, updatePdfCol + 1).setValue(finalPdf.getId());
      if (updateDateCol !== -1) docSheet.getRange(existingDocRow, updateDateCol + 1).setValue(new Date());
      if (updateEmailCol !== -1 && sendEmailOption) docSheet.getRange(existingDocRow, updateEmailCol + 1).setValue('Yes');
    } else if (docSheet) {
      const newRecord = [
        finalDocId,
        registrationId,
        docType,
        finalRefNum,
        driveLink,
        finalPdf.getId(),
        new Date(),
        sendEmailOption ? 'Yes' : 'No'
      ];
      appendRow(SHEET_NAMES.GENERATED_DOCUMENTS, newRecord);
    }

    // 2. RECORD IN FILE MANAGER SHEET (Auto Initialization Check)
    const fmSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    if (fmSheet) {
      const fmData = fmSheet.getDataRange().getValues();
      const fmRegCol = fmData[0].indexOf("StudentRegistrationID");
      const fmTypeCol = fmData[0].indexOf("DocType");
      let existingFmRow = -1;
      if (fmRegCol !== -1 && fmTypeCol !== -1) {
        for (let i = 1; i < fmData.length; i++) {
          if (String(fmData[i][fmRegCol]).toUpperCase() === registrationId.toUpperCase() && fmData[i][fmTypeCol] === docType) {
            existingFmRow = i + 1;
            break;
          }
        }
      }

      if (existingFmRow !== -1) {
        const fmIdCol = fmData[0].indexOf("FileId");
        const fmNameCol = fmData[0].indexOf("FileName");
        const fmUrlCol = fmData[0].indexOf("FileUrl");
        const fmDateCol = fmData[0].indexOf("UploadDate");
        if (fmIdCol !== -1) fmSheet.getRange(existingFmRow, fmIdCol + 1).setValue(finalPdf.getId());
        if (fmNameCol !== -1) fmSheet.getRange(existingFmRow, fmNameCol + 1).setValue(newDocName);
        if (fmUrlCol !== -1) fmSheet.getRange(existingFmRow, fmUrlCol + 1).setValue(driveLink);
        if (fmDateCol !== -1) fmSheet.getRange(existingFmRow, fmDateCol + 1).setValue(new Date());
      } else {
        appendRow(SHEET_NAMES.FILE_MANAGER, [
          finalPdf.getId(),
          registrationId,
          newDocName,
          driveLink,
          docType,
          new Date(),
          finalPdf.getSize ? finalPdf.getSize() : 0,
          'Active'
        ]);
      }
    }

    logActivity('Document Generated', `${docType} generated for student ${registrationId}`);

    if (sendEmailOption && studentData.GmailID) {
      let emailType = 'confirmationLetter';
      if (docType === 'offerLetter') emailType = 'offerLetterNotify';
      else if (docType === 'internshipCertificate' || docType === 'completionCertificate') emailType = 'internshipCompletedNotify';

      const templates = getEmailTemplates(); // Fetch from sheet
      let subject = `Document: ${docType} - ${studentData.CompanyName}`;
      let emailBody = '';

      if (templates && templates[emailType]) {
        subject = templates[emailType].subject;
        emailBody = templates[emailType].content;

        // Replace placeholders in the email body
        // Support multiple placeholder formats (both camelCase and PascalCase)
        const emailReplacements = {
          // PascalCase formats
          '{{StudentName}}': studentData.FullName,
          '{{FullName}}': studentData.FullName,
          '{{RegistrationID}}': studentData.RegistrationID,
          '{{InternshipStartDate}}': studentData.FormattedStartDate,
          '{{InternshipEndDate}}': studentData.FormattedEndDate,
          '{{DurationDays}}': studentData.DurationDays,
          '{{CompanyName}}': studentData.CompanyName,
          '{{CollegeName}}': studentData.CollegeName,
          '{{Department}}': studentData.Department,
          '{{CertificateNumber}}': placeholderValues['CertificateNumber'] || '',
          '{{IssuedDate}}': placeholderValues['IssuedDate'] || '',
          // camelCase formats
          '{{studentName}}': studentData.FullName,
          '{{fullName}}': studentData.FullName,
          '{{regId}}': studentData.RegistrationID,
          '{{registrationId}}': studentData.RegistrationID,
          '{{startDate}}': studentData.FormattedStartDate,
          '{{endDate}}': studentData.FormattedEndDate,
          '{{durationDays}}': studentData.DurationDays,
          '{{companyName}}': studentData.CompanyName,
          '{{collegeName}}': studentData.CollegeName,
          '{{department}}': studentData.Department,
          // Single brace formats
          '{studentName}': studentData.FullName,
          '{fullName}': studentData.FullName,
          '{regId}': studentData.RegistrationID,
          '{registrationId}': studentData.RegistrationID,
          '{startDate}': studentData.FormattedStartDate,
          '{endDate}': studentData.FormattedEndDate,
          '{StudentName}': studentData.FullName,
          '{FullName}': studentData.FullName,
          '{RegistrationID}': studentData.RegistrationID,
          '{InternshipStartDate}': studentData.FormattedStartDate,
          '{InternshipEndDate}': studentData.FormattedEndDate,
          '{CollegeName}': studentData.CollegeName,
          '{Department}': studentData.Department,
          '{CertificateNumber}': placeholderValues['CertificateNumber'] || ''
        };

        for (const key in emailReplacements) {
          const val = emailReplacements[key] || '';
          emailBody = emailBody.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
          subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
        }

        // Replace Link
        emailBody = emailBody.replace(/href="#"/g, `href="${driveLink}"`).replace(/href='#'/g, `href="${driveLink}"`);
      } else {
        // Fallback if template missing
        emailBody = getProfessionalEmailBody(docType === 'internshipCertificate' ? 'completion' : 'confirmation', studentData, driveLink);
      }

      MailApp.sendEmail({
        to: studentData.GmailID,
        subject: subject,
        htmlBody: emailBody,
        attachments: [finalPdf.getBlob()],
        name: studentData.CompanyName
      });
    }

    // --- ADDED: Create Admin Notification ---
    createAdminNotification(
      'Document Generated',
      `${docType} for ${studentData.FullName} (Reg ID: ${registrationId}) generated successfully.`,
      'ALL'
    );
    // ------------------------------------------

    return { status: 'success', message: 'Document generated.', driveLink: driveLink, url: driveLink, fileId: finalPdf.getId() };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function getStudentDocuments(registrationId) {
  const sheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const docs = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === registrationId) {
      docs.push({ type: data[i][2], refNo: data[i][3], url: data[i][4], date: formatDate(data[i][6]) });
    }
  }
  return docs;
}

function getSecurePdfBase64(fileUrl) {
  try {
    const match = fileUrl.match(/[-\w]{25,}/);
    if (!match) return null;
    const fileId = match[0];
    const file = DriveApp.getFileById(fileId);
    const bytes = file.getBlob().getBytes();
    return Utilities.base64Encode(bytes);
  } catch (e) {
    return null;
  }
}

function getProfessionalEmailBody(type, data, link) {
  const configs = {
    confirmation: { gradient: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)', icon: '🎊', title: 'Internship Approved!', accent: '#FF8C00', badge: '🎉 CONGRATULATIONS' },
    completion: { gradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', icon: '🎓', title: 'Internship Completed!', accent: '#28a745', badge: '🏆 COMPLETED' },
    welcome: { gradient: 'linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)', icon: '🌟', title: 'Welcome to the Future!', accent: '#6f42c1', badge: '🎉 WELCOME' },
    rejected: { gradient: 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)', icon: '📋', title: 'Application Status Update', accent: '#dc3545', badge: '📋 STATUS UPDATE' },
    offerLetter: { gradient: 'linear-gradient(135deg, #17a2b8 0%, #20c997 100%)', icon: '📄', title: 'Internship Offer Letter', accent: '#17a2b8', badge: '📄 OFFER LETTER' },
    joiningLetter: { gradient: 'linear-gradient(135deg, #343a40 0%, #6c757d 100%)', icon: '🏢', title: 'Joining Instructions', accent: '#343a40', badge: '🏢 JOINING' },
    certificate: { gradient: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)', icon: '🏅', title: 'Certificate Generated!', accent: '#e67e22', badge: '🏅 CERTIFICATE' },
    attendance: { gradient: 'linear-gradient(135deg, #e83e8c 0%, #fd7e14 100%)', icon: '⏰', title: 'Attendance Reminder', accent: '#e83e8c', badge: '⏰ REMINDER' },
    diary: { gradient: 'linear-gradient(135deg, #20c997 0%, #17a2b8 100%)', icon: '📖', title: 'Diary Update', accent: '#20c997', badge: '📖 DIARY' },
    task: { gradient: 'linear-gradient(135deg, #6610f2 0%, #6f42c1 100%)', icon: '📝', title: 'Task Notification', accent: '#6610f2', badge: '📝 TASK' },
    rfid: { gradient: 'linear-gradient(135deg, #007bff 0%, #6610f2 100%)', icon: '💳', title: 'RFID Card Generated', accent: '#007bff', badge: '💳 RFID' },
    optout: { gradient: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)', icon: '👋', title: 'Opt-Out Confirmation', accent: '#6c757d', badge: '👋 OPT-OUT' },
    documentReminder: { gradient: 'linear-gradient(135deg, #fd7e14 0%, #ffc107 100%)', icon: '📎', title: 'Document Upload Required', accent: '#fd7e14', badge: '📎 ACTION REQUIRED' },
    pending: { gradient: 'linear-gradient(135deg, #ffc107 0%, #e67e22 100%)', icon: '⏳', title: 'Application Pending', accent: '#e67e22', badge: '⏳ PENDING' },
    forgotPassword: { gradient: 'linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)', icon: '🔐', title: 'Password Recovery', accent: '#dc3545', badge: '🔐 SECURITY' },
    projectDelay: { gradient: 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)', icon: '⚠️', title: 'Project Submission Delay', accent: '#dc3545', badge: '⚠️ ALERT' },
    custom: { gradient: 'linear-gradient(135deg, #495057 0%, #343a40 100%)', icon: '📢', title: 'Important Notice', accent: '#495057', badge: '📢 NOTICE' }
  };

  const config = configs[type] || configs.custom;
  const studentName = data.FullName || data.StudentName || data.studentName || 'Student';
  const bodyContent = (data.Body || data.body || 'Please find the details below.').replace(/\n/g, '<br>');

  return `
  <div style="font-family: 'Arial', sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;">
    <!-- HEADER with gradient & watermark -->
    <div style="background: ${config.gradient}; padding: 40px 30px 30px 30px; text-align: center; position: relative; overflow: hidden;">
      <div style="position: absolute; top: -30px; right: -30px; font-size: 120px; opacity: 0.07; pointer-events: none; transform: rotate(-15deg);">GSV</div>
      <div style="font-size: 52px; margin-bottom: 12px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));">${config.icon}</div>
      <h1 style="color: #ffffff; font-family: 'Elephant', 'Georgia', serif; font-size: 28px; font-style: italic; font-weight: 800; margin: 0 0 8px 0; letter-spacing: 0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">${config.title}</h1>
      <div style="display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 6px 18px; border-radius: 24px; font-size: 12px; font-weight: 700; letter-spacing: 1px; backdrop-filter: blur(4px); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">${config.badge}</div>
      <div style="margin-top: 12px; font-size: 13px; font-family: 'Segoe UI', sans-serif; color: rgba(255,255,255,0.9); font-weight: 600;">${COMPANY_NAME}</div>
    </div>

    <!-- BODY -->
    <div style="background: #ffffff; padding: 40px 36px 30px 36px; position: relative;">
      <div style="position: absolute; bottom: 20px; right: 20px; font-size: 100px; opacity: 0.03; font-weight: 900; pointer-events: none; color: ${config.accent};">GSV</div>
      <p style="font-size: 18px; font-family: 'Arial', sans-serif; color: #334155; margin: 0 0 12px 0;">Dear <strong style="color: ${config.accent}; font-style: italic; font-family: 'Elephant', 'Georgia', serif; font-size: 22px;">${studentName}</strong>,</p>
      
      <div style="border-left: 5px solid ${config.accent}; padding: 20px 24px; margin: 24px 0; background: linear-gradient(135deg, ${config.accent}12 0%, #f8fafc 100%); border-radius: 0 12px 12px 0; font-size: 16px; color: #1e293b; line-height: 1.8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        ${bodyContent}
      </div>

      ${data.DurationDays ? `
      <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; padding: 16px 20px; margin: 16px 0; border: 1px solid #dee2e6;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6c757d; font-weight: 600;">📅 Duration</td>
            <td style="padding: 6px 0; font-size: 13px; color: #2d3748; font-weight: 700; text-align: right;">${data.DurationDays} Days</td>
          </tr>
          ${data.RegistrationID ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #6c757d; font-weight: 600;">🆔 Reg ID</td><td style="padding: 6px 0; font-size: 13px; color: #2d3748; font-weight: 700; text-align: right;">${data.RegistrationID}</td></tr>` : ''}
          ${data.Department ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #6c757d; font-weight: 600;">🎓 Department</td><td style="padding: 6px 0; font-size: 13px; color: #2d3748; font-weight: 700; text-align: right;">${data.Department}</td></tr>` : ''}
          ${data.CollegeName ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #6c757d; font-weight: 600;">🏫 College</td><td style="padding: 6px 0; font-size: 13px; color: #2d3748; font-weight: 700; text-align: right;">${data.CollegeName}</td></tr>` : ''}
        </table>
      </div>` : ''}

      ${link ? `
      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${link}" style="display: inline-block; background: ${config.gradient}; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 16px ${config.accent}40; transition: all 0.3s;">
          ${type === 'certificate' ? '📥 Download Certificate' : type === 'offerLetter' ? '📄 View Offer Letter' : type === 'joiningLetter' ? '🏢 View Joining Letter' : type === 'forgotPassword' ? '🔐 Reset Password' : '👉 View Document'}
        </a>
      </div>` : ''}

      <!-- Quick Access Portal Link -->
      <div style="text-align: center; margin: 10px 0 25px 0;">
        <a href="${PORTAL_URL}" style="color: #4361ee; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid #4361ee; padding: 8px 20px; border-radius: 20px; display: inline-block;">
          🌐 Login to Student Portal
        </a>
      </div>
    </div>

    <!-- DIVIDER -->
    <div style="height: 3px; background: ${config.gradient};"></div>

    <!-- FOOTER -->
    <div style="background: #1a202c; padding: 24px 30px; text-align: center;">
      <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">⚡ ${COMPANY_NAME}</div>
      <div style="font-size: 12px; color: #a0aec0; margin-bottom: 12px;">Powering Tomorrow's Engineers</div>
      <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
        <span style="font-size: 12px; color: #cbd5e0;">📞 ${COMPANY_CONTACT}</span>
        <span style="font-size: 12px; color: #cbd5e0;">🌐 <a href="https://www.${COMPANY_WEBSITE}" style="color: #63b3ed; text-decoration: none;">${COMPANY_WEBSITE}</a></span>
        <span style="font-size: 12px; color: #cbd5e0;">📧 ${ADMIN_EMAIL_ID}</span>
      </div>
      <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #2d3748;">
        <div style="font-size: 11px; color: #718096;">This is an automated message from ${COMPANY_NAME} Internship Portal.</div>
        <div style="font-size: 10px; color: #4a5568; margin-top: 4px;">© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</div>
      </div>
    </div>
  </div>`;
}

// =================================================================================
// =================================================================================
// INDEX.HTML BACKEND FUNCTIONS
// ==================================START ===============================================
function registerStudent(formData) {
  try {
    if (!formData.firstName || !formData.lastName || !formData.gmail || !formData.mobile || !formData.college || !formData.registerNo) {
      return {
        status: 'error',
        message: 'Missing required fields.'
      };
    }

    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) return {
      status: 'error',
      message: 'Registration service temporarily unavailable.'
    };

    const data = regSheet.getDataRange().getValues();
    const header = data[0];

    const headerMap = {
      "Timestamp": "timestamp",
      "RegistrationID": "registrationId",
      "ApplicationStatus": "applicationStatus",
      "FirstName": "firstName",
      "MiddleName": "middleName",
      "LastName": "lastName",
      "Address": "address",
      "Pincode": "pincode",
      "District": "district",
      "GmailID": "gmail",
      "MobileNumber": "mobile",
      "CollegeName": "college",
      "CollegeCode": "collegeCode",
      "CollegeDistrict": "collegeDistrict",
      "RegisterNumber": "registerNo",
      "EducationType": "educationType",
      "Year": "year",
      "Semester": "semester",
      "Department": "department",
      "DateofBirth": "dob",
      "InternshipStartDate": "startDate",
      "InternshipEndDate": "endDate",
      "DurationDays": "duration",
      "LastLogin": "lastLogin",
      "LastChatCheck": "lastChatCheck",
      "ProfilePhotoUrl": "profilePhotoUrl",
      "CertificateLink": "certificateLink",
      "CertificateIssuedDate": "certificateIssuedDate",
      "GPA": "gpa",
      "InterestedArea": "interestedArea",
      "Remarks": "remarks",
      "ApprovalDate": "approvalDate",
      "ApplicationPdfId": "applicationPdfId",
      "OfferLetterPdfId": "offerLetterPdfId",
      "Status": "status"
    };

    for (const headerName in headerMap) {
      if (header.indexOf(headerName) === -1) {
        Logger.log(`Critical column "${headerName}" not found in Registrations sheet header. Found: ${JSON.stringify(header)}`);
        return {
          status: 'error',
          message: `Sheet configuration error. Please contact admin. (Header mismatch: ${headerName})`
        };
      }
    }

    const regNoCol = header.indexOf("RegisterNumber");
    const dobCol = header.indexOf("DateofBirth");
    const mobileCol = header.indexOf("MobileNumber");
    const regIdCol = header.indexOf("RegistrationID");

    const inputRegNo = formData.registerNo.trim().toUpperCase();
    const inputDob = formatDate(formData.dob);
    const inputMobile = formData.mobile.toString().trim();

    for (let i = 1; i < data.length; i++) {
      const rowRegNo = data[i][regNoCol] ? data[i][regNoCol].toString().trim().toUpperCase() : "";
      const rowDob = data[i][dobCol] ? formatDate(data[i][dobCol]) : "";
      const rowMobile = data[i][mobileCol] ? data[i][mobileCol].toString().trim() : "";

      const studentInfo = {
        registrationId: data[i][regIdCol] || '',
        firstName: header.indexOf("FirstName") !== -1 ? data[i][header.indexOf("FirstName")] : '',
        middleName: header.indexOf("MiddleName") !== -1 ? data[i][header.indexOf("MiddleName")] : '',
        lastName: header.indexOf("LastName") !== -1 ? data[i][header.indexOf("LastName")] : '',
        mobile: rowMobile,
        startDate: header.indexOf("InternshipStartDate") !== -1 ? formatDate(data[i][header.indexOf("InternshipStartDate")]) : '',
        endDate: header.indexOf("InternshipEndDate") !== -1 ? formatDate(data[i][header.indexOf("InternshipEndDate")]) : ''
      };

      // 1. Strict Check: Register No + DOB + Mobile
      if (rowRegNo === inputRegNo && rowDob === inputDob && rowMobile === inputMobile) {
        logActivity('Registration Blocked', formData.gmail, 'User already exists (Strict Match).');
        return {
          status: 'existing_user',
          message: 'User already exists with these details.',
          studentData: studentInfo
        };
      }

      // 2. Partial Check: Register No Only
      if (rowRegNo === inputRegNo) {
        logActivity('Registration Blocked', formData.gmail, 'User already exists (RegNo Match).');

        // Send Warning Email
        const existingRegId = data[i][regIdCol];
        const emailSubject = `Registration Warning - ${COMPANY_NAME}`;
        const emailBody = `Dear Student,\n\nIt appears you are trying to register again. A user with Register Number ${inputRegNo} already exists.\n\nYour Registration ID is: ${existingRegId}\nMobile: ${rowMobile}\n\nplease login and check if your approved you can login.\n\nIf this is not you, please contact support.`;

        sendEmail(formData.gmail, emailSubject, emailBody, emailBody.replace(/\n/g, '<br>'));

        return {
          status: 'existing_user',
          message: 'This Register Number is already registered. A warning email has been sent with details.',
          studentData: studentInfo
        };
      }
    }

    // 3. Archive Check: Check 'Closed and Opt-out' Sheet
    try {
      const closedSheet = getSheet('Closed and Opt-out');
      if (closedSheet) {
        const closedData = closedSheet.getDataRange().getValues();
        if (closedData.length > 1) {
          const closedHeader = closedData[0];
          const cRegNoCol = closedHeader.indexOf("RegisterNumber");
          const cDobCol = closedHeader.indexOf("DateofBirth");
          const cMobileCol = closedHeader.indexOf("MobileNumber");
          const cRegIdCol = closedHeader.indexOf("RegistrationID");

          if (cRegNoCol !== -1) {
            for (let i = 1; i < closedData.length; i++) {
              const rowRegNo = closedData[i][cRegNoCol] ? closedData[i][cRegNoCol].toString().trim().toUpperCase() : "";
              const rowDob = cDobCol !== -1 && closedData[i][cDobCol] ? formatDate(closedData[i][cDobCol]) : "";
              const rowMobile = cMobileCol !== -1 && closedData[i][cMobileCol] ? closedData[i][cMobileCol].toString().trim() : "";

              if (rowRegNo === inputRegNo) {
                logActivity('Registration Blocked', formData.gmail, 'User already exists in Closed/Opt-out archives.');
                const studentInfo = {
                  registrationId: (cRegIdCol !== -1 ? closedData[i][cRegIdCol] : '') || '',
                  firstName: closedHeader.indexOf("FirstName") !== -1 ? closedData[i][closedHeader.indexOf("FirstName")] : '',
                  middleName: closedHeader.indexOf("MiddleName") !== -1 ? closedData[i][closedHeader.indexOf("MiddleName")] : '',
                  lastName: closedHeader.indexOf("LastName") !== -1 ? closedData[i][closedHeader.indexOf("LastName")] : '',
                  mobile: rowMobile,
                  startDate: closedHeader.indexOf("InternshipStartDate") !== -1 ? formatDate(closedData[i][closedHeader.indexOf("InternshipStartDate")]) : '',
                  endDate: closedHeader.indexOf("InternshipEndDate") !== -1 ? formatDate(closedData[i][closedHeader.indexOf("InternshipEndDate")]) : ''
                };

                return {
                  status: 'existing_user',
                  message: 'This Register Number has already been processed and archived as Closed or Opt-out. Please contact support.',
                  studentData: studentInfo
                };
              }
            }
          }
        }
      }
    } catch (e) {
      Logger.log("Error checking duplicate in Closed and Opt-out sheet: " + e.toString());
    }

    // No existing user found, proceed to register
    const registrationId = generateRegistrationId();
    const timestamp = new Date();
    const applicationStatus = 'Pending';

    const studentRecord = {
      Timestamp: timestamp,
      RegistrationID: registrationId,
      ApplicationStatus: applicationStatus,
      FirstName: formData.firstName,
      MiddleName: formData.middleName || '',
      LastName: formData.lastName,
      Address: formData.address || '',
      Pincode: formData.pincode || '',
      District: formData.district || '',
      GmailID: formData.gmail,
      MobileNumber: formData.mobile,
      CollegeName: formData.college,
      CollegeCode: formData.collegeCode || '',
      CollegeDistrict: formData.collegeDistrict || '',
      RegisterNumber: formData.registerNo,
      EducationType: formData.educationType || '',
      Year: formData.year || '',
      Semester: formData.semester || '',
      Department: formData.department || '',
      DateofBirth: formatDate(formData.dob),
      InternshipStartDate: formatDate(formData.startDate),
      InternshipEndDate: formatDate(formData.endDate),
      DurationDays: formData.duration ? parseInt(formData.duration) : 0,
      LastLogin: '',
      LastChatCheck: 0,
      ProfilePhotoUrl: '',
      GPA: formData.gpa || '',
      InterestedArea: formData.interestedArea || '',
      Remarks: formData.remarks || '',
      ApprovalDate: '',
      ApplicationPdfId: '',
      OfferLetterPdfId: ''
    };

    const newRow = header.map(colName => studentRecord[headerMap[colName]] !== undefined ? studentRecord[headerMap[colName]] : studentRecord[colName]);

    appendRow(SHEET_NAMES.REGISTRATIONS, newRow);

    // Automatically sync categories sheets on new registration
    try { syncStudentCategoriesToSheets(); } catch (e) { Logger.log('Sync category sheets error: ' + e); }

    // Generate Acknowledgement PDF
    let ackRes = { status: 'error' };
    let attachments = [];
    
    try {
      // Note: We skip generateApplicationPdf during registration because it is extremely slow
      // and is already generated upon Admin Approval (saving ~20 seconds of execution, avoiding web app timeouts).
      
      // Generate Acknowledgement PDF
      ackRes = generateAcknowledgementPdf(registrationId);
      if (ackRes.status === 'success' && ackRes.fileId) {
        attachments.push(DriveApp.getFileById(ackRes.fileId).getBlob().setName(`Acknowledgement_${registrationId}.pdf`));
      }
    } catch (pdfError) {
      Logger.log('Error generating documents during registration: ' + pdfError.toString());
    }

    logActivity('New Registration', registrationId, `Student ${formData.firstName} ${formData.lastName} registered.`);
    createAdminNotification('New Student Registration', `Student ${formData.firstName} ${formData.lastName} (Reg ID: ${registrationId}) has registered.`);

    // Modern Professional Email
    const emailSubject = `Registration Successful - ${COMPANY_NAME}`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; border-bottom: 2px solid #4361ee; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #d32f2f; margin: 0; text-transform: uppercase;">${COMPANY_NAME}</h2>
          <p style="color: #4361ee; margin: 5px 0 0 0; font-weight: bold;">Internship Registration Acknowledgement</p>
        </div>
        
        <p>Dear <strong>${formData.firstName}</strong>,</p>
        <p>Congratulations! You have successfully registered for the Internship Program at <strong>${COMPANY_NAME}</strong>.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #4361ee; margin-top: 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Registration Summary</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="width: 40%; font-weight: bold; padding: 4px 0;">Registration ID:</td><td>${registrationId}</td></tr>
            <tr><td style="font-weight: bold; padding: 4px 0;">Application Status:</td><td><strong style="color: #e67e22; text-transform: uppercase;">PENDING</strong></td></tr>
            <tr><td style="font-weight: bold; padding: 4px 0;">College Name:</td><td>${formData.college}</td></tr>
            <tr><td style="font-weight: bold; padding: 4px 0;">Department:</td><td>${formData.department}</td></tr>
            <tr><td style="font-weight: bold; padding: 4px 0;">Duration:</td><td>${formData.duration} Days</td></tr>
            <tr><td style="font-weight: bold; padding: 4px 0;">Start Date:</td><td>${formatDateDisplay(formData.startDate)}</td></tr>
          </table>
        </div>
        
        <p><strong>Next Steps & Important Information:</strong></p>
        <ul style="padding-left: 20px; font-size: 14px;">
          <li><strong>Registration Approval:</strong> You have registered. You will receive approval from the Admin side.</li>
          <li><strong>Onboarding Documents:</strong> After that, we will send you the application form and joining letter. On the date you join, please collect these.</li>
          <li><strong>RFID Card:</strong> You will also automatically receive an RFID card for attendance.</li>
          <li>We have attached your <strong>Acknowledgement PDF</strong> to this email for your reference.</li>
        </ul>
        
        <p>Please keep this Registration ID safe for future communications.</p>
        
        <div style="text-align: center; margin: 25px 0;">
           <a href="${PORTAL_URL}" style="background-color: #4361ee; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(67, 97, 238, 0.3);">Login to Portal</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center;">
          ${EMAIL_SIGNATURE_HTML}
        </div>
      </div>
    `;
    const emailText = `Dear ${formData.firstName},\n\nYou have registered successfully!\nYour Registration ID: ${registrationId}\nCollege: ${formData.college}\nDepartment: ${formData.department}\nDuration: ${formData.duration} Days\n\nPlease find your Acknowledgement attached.\n\nBest Regards,\n${COMPANY_NAME}`;

    sendEmail(formData.gmail, emailSubject, emailText, emailHtml, attachments.length > 0 ? attachments : null);

    return {
      status: 'success',
      message: 'Registration successful! Your application is pending review.',
      registrationId: registrationId,
      appliedDate: formatDateDisplay(timestamp),
      pdfUrl: ackRes.status === 'success' ? ackRes.url : null
    };
  } catch (error) {
    Logger.log('Error in registerStudent: ' + error.toString() + error.stack);
    return {
      status: 'error',
      message: 'An error occurred during registration: ' + error.message
    };
  }
}
/// =================================================================================
// Certificate verfication FUNCTIONS
// =================================================================================


//
// Certificate verification FUNCTIONS
//
function verifyCertificateDetails(certificateNumber, studentRegisterNumber) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) return { status: 'error', message: 'Database error: Registrations sheet missing.' };
    const allStudents = getSheetDataAsObjects(regSheet);

    const targetStudent = allStudents.find(s => s.RegisterNumber && s.RegisterNumber.toString().trim().toUpperCase() === studentRegisterNumber.trim().toUpperCase());

    const certSheet = getSheet(SHEET_NAMES.CERTIFICATE_DATA);
    let certDataFound = null;

    if (certSheet) {
      const data = certSheet.getDataRange().getValues();
      const header = data[0];
      const certNumCol = header.indexOf("CertificateNumber");
      const studentGsvIdCol = header.indexOf("StudentRegistrationID");
      const studentNameCol = header.indexOf("StudentName");
      const deptCol = header.indexOf("Department");
      const startDateCol = header.indexOf("InternshipStartDate");
      const endDateCol = header.indexOf("InternshipEndDate");
      const durationCol = header.indexOf("DurationDays");
      const issuedDateCol = header.indexOf("IssuedDate");
      const certStatusCol = header.indexOf("Status");

      if (certNumCol > -1) {
        for (let i = 1; i < data.length; i++) {
          const rowCertNum = data[i][certNumCol] ? data[i][certNumCol].toString().trim().toUpperCase() : '';

          if (rowCertNum === certificateNumber.trim().toUpperCase()) {
            const gsvIdFromCert = data[i][studentGsvIdCol];
            if (targetStudent && targetStudent.RegistrationID === gsvIdFromCert) {
              certDataFound = {
                certificateNumber: data[i][certNumCol],
                studentName: data[i][studentNameCol],
                department: data[i][deptCol],
                startDate: formatDateDisplay(data[i][startDateCol]),
                endDate: formatDateDisplay(data[i][endDateCol]),
                duration: data[i][durationCol],
                issuedDate: formatDateDisplay(data[i][issuedDateCol]),
                certificate_status: data[i][certStatusCol] || 'Valid'
              };
              break;
            }
          }
        }
      }
    }

    // 3. Handle failure cases with realistic messages
    
    // CASE A: Student not found at all
    if (!targetStudent) {
      logActivity('Certificate Verification', certificateNumber, `Failed: Student RegNo ${studentRegisterNumber} not found.`);
      return { 
        status: 'error', 
        code: 'NOT_FOUND', 
        message: 'Student Data Not Found. Please check the Register Number entered.' 
      };
    }

    // CASE B: Handle specific status blocks (Opt-out, Blocked, Pending, Rejected)
    const appStatus = (targetStudent.ApplicationStatus || '').toString().trim();
    const stuStatus = (targetStudent.Status || '').toString().trim();
    
    // Check for Opt-out or Blocked status first (highest priority)
    if (appStatus === 'Opt-out' || stuStatus === 'Opt-out' || appStatus === 'Blocked' || stuStatus === 'Blocked') {
      const msg = (appStatus === 'Opt-out' || stuStatus === 'Opt-out') 
        ? 'You have opted out of the internship, so your certificate record is not available.'
        : 'Your record has been blocked by the administrator.';
      
      logActivity('Certificate Verification', certificateNumber, `Blocked: Status is ${appStatus}/${stuStatus}.`);
      return {
        status: 'error',
        code: 'RECORD_BLOCKED',
        message: msg
      };
    }

    // Check if the internship is actually finished and certificate is issued
    const isCompleted = (appStatus === 'Completed' || appStatus === 'Certificate Issued' || 
                         stuStatus === 'Completed' || stuStatus === 'Certificate Issued');

    if (!isCompleted) {
      let failureReason = 'Certificate Not Available: Status Not Updated';
      
      if (appStatus === 'Rejected' || stuStatus === 'Rejected') {
        failureReason = 'Certificate Blocked: Your internship application was Rejected.';
      } else if (appStatus === 'Pending' || appStatus === 'Approved' || appStatus === 'Active') {
        failureReason = 'Certificate Pending: Your internship period is currently On-Going or Pending Completion.';
      }
      
      logActivity('Certificate Verification', certificateNumber, `Failed: Status is ${appStatus}/${stuStatus}.`);
      return {
        status: 'error',
        code: 'NOT_COMPLETED',
        message: failureReason
      };
    }

    // CASE C: Student is Completed but no certificate data found in Certificate Data sheet
    if (!certDataFound) {
      logActivity('Certificate Verification', certificateNumber, `Failed: Status is Completed but no certificate record for ${studentRegisterNumber}.`);
      return {
        status: 'error',
        code: 'CERT_NOT_SYNCED',
        message: 'Record Found but Certificate Details are not yet synchronized. Please try again in 24 hours.' 
      };
    }

    // 4. Success Case: Show details
    const projects = getStudentProjects(targetStudent.RegistrationID) || [];
    const completedProjectsCount = projects.filter(p => p.status === 'Completed').length;
    const totalProjectsCount = projects.length;
    let projectDoneStr = totalProjectsCount > 0 ? `${completedProjectsCount}/${totalProjectsCount} Projects Completed` : 'N/A';

    let computedPerformance = "Completed";
    if (completedProjectsCount === totalProjectsCount && totalProjectsCount > 0 && projects.length >= 2) {
      computedPerformance = "Dedicated";
    } else if (completedProjectsCount >= 1) {
      computedPerformance = "Completed Good";
    } else {
      computedPerformance = "Completed";
    }

    let finalDuration = certDataFound.duration || targetStudent.DurationDays;
    if (finalDuration instanceof Date || !finalDuration || finalDuration === 'N/A') {
      const sDate = new Date(targetStudent.InternshipStartDate);
      const eDate = new Date(targetStudent.InternshipEndDate);
      if (!isNaN(sDate) && !isNaN(eDate)) {
        finalDuration = Math.ceil(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24));
      } else {
        finalDuration = 'N/A';
      }
    }

    // Check for approved public document access
    let approvedDocAccess = null;
    try {
      const requestsSheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
      if (requestsSheet) {
        const reqData = getSheetDataAsObjects(requestsSheet);
        const activeApproval = reqData.find(r =>
          r.RequestType === 'DocumentAccess' &&
          String(r.RegistrationID).toUpperCase() === String(targetStudent.RegisterNumber).toUpperCase() &&
          r.Status === 'Approved' &&
          new Date(r.EndDate) > new Date()
        );

        if (activeApproval) {
          let docsArr = [];
          try {
            const reason = String(activeApproval.Reason || '');
            if (reason.startsWith('[')) docsArr = JSON.parse(reason);
            else docsArr = [reason];
          } catch (e) { docsArr = [activeApproval.Reason]; }

          const studentDocs = getStudentDocuments(targetStudent.RegistrationID) || [];
          const approvedDocsDetails = studentDocs.filter(d => docsArr.includes(d.type));

          approvedDocAccess = {
            expiresOn: activeApproval.EndDate,
            docs: approvedDocsDetails
          };
        }
      }
    } catch (e) {
      Logger.log("Error checking approvedDocAccess: " + e.toString());
    }

    logActivity('Certificate Verification', certificateNumber, `Successful verification for RegNo: ${studentRegisterNumber}.`);
    return {
      status: 'success',
      message: 'Certificate Found and Verified.',
      certificateNumber: certDataFound.certificateNumber,
      studentName: certDataFound.studentName || `${targetStudent.FirstName || ''} ${targetStudent.LastName || ''}`.trim(),
      registerNumber: targetStudent.RegisterNumber,
      department: certDataFound.department || targetStudent.Department || 'N/A',
      startDate: certDataFound.startDate,
      endDate: certDataFound.endDate,
      duration: finalDuration ? finalDuration + ' days' : 'N/A',
      issuedDate: certDataFound.issuedDate,
      dob: formatDateDisplay(targetStudent.DateofBirth) || 'N/A',
      collegeName: targetStudent.CollegeName || 'N/A',
      studentYear: targetStudent.Year || 'N/A',
      projectDone: projectDoneStr,
      performanceStatus: computedPerformance,
      certificate_status: certDataFound.certificate_status,
      documents: getStudentDocuments(targetStudent.RegistrationID),
      approvedDocAccess: approvedDocAccess
    };

  } catch (error) {
    Logger.log('Error in verifyCertificateDetails: ' + error.toString());
    return {
      status: 'error',
      message: 'System error during verification: ' + error.message
    };
  }
}


// =================================================================================
// ADMIN  and Student Login FUNCTIONS
// =================================================================================


function adminLogin(adminId, password) {
  try {
    const adminSheet = getSheet(SHEET_NAMES.ADMIN_CREDENTIALS);
    if (!adminSheet) {
      Logger.log('Admin Credentials sheet not found via getSheet (AL).');
      return {
        status: 'error',
        message: 'Admin authentication service unavailable. Configuration issue (sheet missing AL).'
      };
    }

    const data = adminSheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('Admin Credentials sheet is empty or has no admin records (AL).');
      return {
        status: 'error',
        message: 'No admin accounts configured in the system (AL).'
      };
    }
    const header = data[0];
    const adminIdCol = header.indexOf("AdminID");
    const passwordCol = header.indexOf("Password");
    const lastLoginCol = header.indexOf("LastLogin");
    const nameCol = header.indexOf("Name");

    if (adminIdCol === -1 || passwordCol === -1 || lastLoginCol === -1 || nameCol === -1) {
      Logger.log(`Admin Credentials sheet header misconfiguration (AL). Required: "AdminID", "Password", "LastLogin", "Name". Found: ${JSON.stringify(header)}`);
      return {
        status: 'error',
        message: 'Admin authentication configuration error. Please contact support (column name mismatch AL).'
      };
    }

    Logger.log(`Admin login attempt for AdminID: '${adminId}' (AL)`);

    for (let i = 1; i < data.length; i++) {
      const sheetAdminId = data[i][adminIdCol] ? data[i][adminIdCol].toString().trim() : "";
      const sheetPassword = data[i][passwordCol] ? data[i][passwordCol].toString() : "";

      if (sheetAdminId.toLowerCase() === adminId.trim().toLowerCase() && sheetPassword === password) {
        adminSheet.getRange(i + 1, lastLoginCol + 1).setValue(new Date());
        SpreadsheetApp.flush();

        const adminName = data[i][nameCol] || sheetAdminId;
        logActivity('Admin Login Success', sheetAdminId, `Admin '${adminName}' logged in successfully.`);
        Logger.log(`Admin login successful for '${sheetAdminId}' (AL).`);

        return {
          status: 'success',
          message: 'Admin login successful!',
          adminName: adminName,
          adminId: sheetAdminId
        };
      }
    }

    Logger.log(`Admin login failed for '${adminId}' (AL). No matching AdminID and password combination found after checking ${data.length - 1} records.`);
    logActivity('Admin Login Attempt Failed', adminId, 'Invalid credentials provided (AL).');
    return {
      status: 'error',
      message: 'Invalid Admin ID or Password. Please check your credentials and try again.'
    };

  } catch (error) {
    Logger.log('Critical Error in adminLogin function: ' + error.toString() + "\nStack: " + error.stack);
    return {
      status: 'error',
      message: 'A system error occurred during admin login. Please try again later or contact support.'
    };
  }
}




// =================================================================================
// INDEX.HTML BACKEND FUNCTIONS
// ====================================END =============================================

function studentLogin(regId, mobile) {
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!sheet) return { status: "error", message: "Registrations sheet not found." };

    const inputRegId = regId ? regId.toString().trim().toUpperCase() : "";
    const inputMobile = mobile ? mobile.toString().trim() : "";

    const data = getSheetDataAsObjects(sheet);
    if (data.length === 0) return { status: "error", message: "No registered students found." };

    let student = data.find(s => {
      const sRegId = s.RegistrationID ? s.RegistrationID.toString().trim().toUpperCase() : "";
      const sMobile = s.MobileNumber ? s.MobileNumber.toString().trim() : "";
      return (sRegId === inputRegId && sMobile === inputMobile);
    });

    if (!student) {
      const closedSheet = getSheet('Closed and Opt-out');
      if (closedSheet) {
        const closedData = getSheetDataAsObjects(closedSheet);
        const closedStudent = closedData.find(s => {
          const sRegId = s.RegistrationID ? s.RegistrationID.toString().trim().toUpperCase() : "";
          const sMobile = s.MobileNumber ? s.MobileNumber.toString().trim() : "";
          return (sRegId === inputRegId && sMobile === inputMobile);
        });
        if (closedStudent) {
          logActivity('Student Login Blocked', inputRegId, `Blocked login attempt for Closed/Opt-out account.`);
          return { status: "error", message: "Access Denied. Your account has been marked as Closed or Opt-out." };
        }
      }
      logActivity('Student Login Failed', inputRegId, `Invalid credentials for mobile: ${inputMobile}`);
      return { status: "error", message: "Invalid Registration ID or Mobile Number." };
    }

    const status = (student.ApplicationStatus || student.Status || "").toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = student.InternshipStartDate ? new Date(student.InternshipStartDate) : null;
    const endDate = student.InternshipEndDate ? new Date(student.InternshipEndDate) : null;

    // 1. Status Check
    const allowedStatuses = ['approved', 'completed', 'active', 'assigned'];

    if (['pending', 'optout', 'deleted', 'rejected', 'on-hold'].includes(status)) {
      let msg = `Your account status is '${status}'. Login is not permitted.`;
      if (status === 'pending') msg = "Your application is still 'Pending' approval. Please wait for the admin to approve your request.";
      if (status === 'rejected') msg = "Your application has been 'Rejected'. Please contact the administrator.";
      return { status: "error", message: msg };
    }

    if (!allowedStatuses.includes(status)) {
      return { status: "error", message: `Access denied. Your current status is '${status}'. Please contact the administrator.` };
    }

    // 2. Date Check (Handled on frontend for partial access)

    if (status === 'completed') {
      if (endDate) {
        const graceDate = new Date(endDate);
        graceDate.setDate(graceDate.getDate() + 60);
        if (today > graceDate) {
          return {
            status: "error",
            message: "Your access has expired. The 60-day grace period after your internship completion has ended."
          };
        }
      }
    }

    logActivity('Student Login', inputRegId, 'Successful login.');

    return {
      status: "success",
      message: "Login successful.",
      studentData: {
        registrationId: student.RegistrationID,
        name: getStudentFullName_(student),
        firstName: student.FirstName || '',
        middleName: student.MiddleName || '',
        lastName: student.LastName || '',
        mobile: student.MobileNumber,
        batch: student.Batch,
        status: student.ApplicationStatus,
        startDate: student.InternshipStartDate,
        endDate: student.InternshipEndDate,
        documents: {
          bonafide: !!student.BonafideUrl,
          declaration: !!student.DeclarationUrl,
          collegeId: !!student.CollegeIdUrl,
          other: !!student.OtherUrl
        },
        permissions: {
          attendance: student.AttendanceAccess === true || student.AttendanceAccess === 'TRUE',
          diary: student.DiaryAccess === true || student.DiaryAccess === 'TRUE'
        }
      }
    };
  } catch (e) {
    Logger.log("Error in studentLogin: " + e.message);
    return { status: "error", message: "An internal error occurred during login." };
  }
}

/**
 * Universal helper to save ANY student request to the StudentRequests sheet.
 * @param {Object} reqData - Request data object with fields matching the schema.
 * @returns {Object} { status, message, requestId }
 */
function saveStudentRequest_(reqData) {
  const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
  if (!sheet) return { status: 'error', message: 'StudentRequests sheet not available.' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().trim());

  // Check for duplicate pending request (same student + type + optional section/date)
  if (reqData.checkDuplicate) {
    const existing = getSheetDataAsObjects(sheet);
    const dup = existing.find(r =>
      String(r.RegistrationID) === String(reqData.RegistrationID) &&
      String(r.RequestType) === String(reqData.RequestType) &&
      String(r.Status).toLowerCase() === 'pending' &&
      (!reqData.Section || String(r.Section || '').toLowerCase() === String(reqData.Section || '').toLowerCase()) &&
      (!reqData.TargetDate || String(r.TargetDate) === String(reqData.TargetDate))
    );
    if (dup) {
      return { status: 'error', message: reqData.duplicateMsg || 'You already have a pending request of this type.' };
    }
  }

  const id = reqData.RequestID || (reqData.prefix || 'REQ') + '-' + new Date().getTime();

  const rowData = headers.map(h => {
    switch (h) {
      case 'RequestID': return id;
      case 'RegistrationID': return reqData.RegistrationID || '';
      case 'StudentName': return reqData.StudentName || '';
      case 'RequestType': return reqData.RequestType || '';
      case 'Section': return reqData.Section || '';
      case 'TargetDate': return reqData.TargetDate || '';
      case 'TargetTime': return reqData.TargetTime || '';
      case 'EndDate': return reqData.EndDate || '';
      case 'Reason': return reqData.Reason || '';
      case 'LeaveType': return reqData.LeaveType || '';
      case 'Status': return 'Pending';
      case 'RequestDate': return new Date();
      case 'AttachmentUrl': return reqData.AttachmentUrl || '';
      case 'OTP': return reqData.OTP || '';
      case 'ProcessedDate': return '';
      case 'ProcessedBy': return '';
      case 'AdminRemarks': return '';
      default: return '';
    }
  });

  sheet.appendRow(rowData);
  SpreadsheetApp.flush();
  Logger.log('Student request saved: ' + reqData.RequestType + ' for ' + reqData.RegistrationID);

  return { status: 'success', requestId: id };
}

/**
 * Handles student request for specific section access (attendance/diary)
 */
function requestSectionAccess(regId, section) {
  try {
    const studentName = getStudentName_(regId);

    const result = saveStudentRequest_({
      prefix: 'AR',
      RegistrationID: regId,
      StudentName: studentName,
      RequestType: 'AccessRequest',
      Section: section,
      Reason: `Requested access to ${section}`,
      checkDuplicate: true,
      duplicateMsg: `You already have a pending access request for the ${section} section.`
    });

    if (result.status !== 'success') return result;

    createAdminNotification(
      `Access Request: ${section}`,
      `Student ${studentName} (${regId}) has requested access to the ${section} section.`,
      regId
    );
    logActivity('Access Requested', regId, `Requested access for ${section}`);

    return { status: "success", message: `Your request for ${section} access has been sent to the administrator.` };
  } catch (e) {
    Logger.log("Error in requestSectionAccess: " + e.message);
    return { status: "error", message: "Failed to send access request: " + e.message };
  }
}

/**
 * Recovers student login details via Reg ID or Gmail
 */
function recoverStudentLoginDetails(identifier) {
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const data = getSheetDataAsObjects(sheet);
    const q = identifier.trim().toLowerCase();

    const student = data.find(s => {
      const regId = (s.RegistrationID || "").toString().toLowerCase();
      const email = (s.GmailID || "").toString().toLowerCase();
      return regId === q || email === q;
    });

    if (!student) {
      return { status: "error", message: "No student found with this Registration ID or Email." };
    }

    const email = student.GmailID;
    if (!email) return { status: "error", message: "No email address found for this account." };

    const subject = "Your Internship Portal Login Details";
    const body = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4361ee, #3f37c9); padding: 30px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Account Recovery</h2>
          <p style="margin: 10px 0 0; opacity: 0.9;">Internship Portal Access Details</p>
        </div>
        <div style="padding: 30px; color: #333; line-height: 1.6;">
          <p>Hello <b>${student.FirstName || 'Student'}</b>,</p>
          <p>We received a request to recover your login details for the internship portal. Below are your credentials:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4361ee;">
            <p style="margin: 0 0 10px 0;"><strong>Registration ID:</strong> <span style="color: #4361ee; font-weight: bold; font-family: monospace; font-size: 1.2em;">${student.RegistrationID}</span></p>
            <p style="margin: 0;"><strong>Registered Mobile:</strong> <span style="color: #4361ee; font-weight: bold;">${student.MobileNumber}</span></p>
          </div>
          <p>Your mobile number acts as your password for student login.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${getPublishedUrl()}" style="background: #4361ee; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Portal</a>
          </div>
          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">If you did not request this, please ignore this email or contact the administrator if you suspect unauthorized access.</p>
        </div>
        <div style="background: #f1f3f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
        </div>
      </div>
    `;

    const sent = sendEmail(email, subject, "", body);
    if (sent) {
      return { status: "success", message: "Login details have been sent to your registered Gmail ID." };
    } else {
      return { status: "error", message: "Failed to send email. Please contact support." };
    }

  } catch (e) {
    Logger.log("Error in recoverStudentLoginDetails: " + e.message);
    return { status: "error", message: e.message };
  }
}

// Redundant studentLogout removed
function studentLogout() {
  // Stateless logout, mostly for frontend cleanup signal
  return { status: "success", message: "Logged out successfully." };
}




// ======================================START===========================================
// ADMIN DASHBOARD BACKEND FUNCTIONS
// =================================================================================

function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
  const regData = regSheet.getDataRange().getValues();

  const statusCol = regData[0].indexOf("ApplicationStatus");

  let totalStudents = regData.length - 1, approved = 0, pending = 0, rejected = 0, completed = 0;
  for (let i = 1; i < regData.length; i++) {
    let status = regData[i][statusCol];
    if (status === "Approved") approved++;
    else if (status === "Pending" || status === "Submitted") pending++;
    else if (status === "Rejected" || status === "Opt-out" || status === "Opt-Out") rejected++;
    else if (status === "Completed") completed++;
  }

  // Certificate Data
  let certificatesIssued = 0, certificatesPending = 0;
  const certSheet = ss.getSheetByName(SHEET_NAMES.CERTIFICATE_DATA);
  if (certSheet) {
    const certData = certSheet.getDataRange().getValues();
    const certStatusCol = certData[0].indexOf("Status");
    for (let i = 1; i < certData.length; i++) {
      if (certData[i][certStatusCol] === "Issued") certificatesIssued++;
      else certificatesPending++;
    }
  }

  // Batches
  let totalBatches = 0;
  const batchSheet = ss.getSheetByName(SHEET_NAMES.BATCHES);
  if (batchSheet) totalBatches = Math.max(0, batchSheet.getLastRow() - 1);

  // Attendance Today
  let presentToday = 0, absentToday = 0, odToday = 0;
  const attSheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  if (attSheet) {
    const attData = attSheet.getDataRange().getValues();
    const attDateCol = attData[0].indexOf("Date");
    const attStatusCol = attData[0].indexOf("Status");
    for (let i = 1; i < attData.length; i++) {
      if (formatDate(attData[i][attDateCol]) === todayStr) {
        if (attData[i][attStatusCol] === "Present") presentToday++;
        else if (attData[i][attStatusCol] === "Absent") absentToday++;
        else if (attData[i][attStatusCol] === "OD" || attData[i][attStatusCol] === "On Duty") odToday++;
      }
    }
  }

  const applicationStatus = { Approved: approved, Pending: pending, Rejected: rejected, Completed: completed };
  const weeklyAttendance = getWeeklyAttendanceChartData_();

  // Pendings from Request Management
  const pendingDetails = getPendingAttendanceDetails();
  const pendingRequestsTotal = (pendingDetails.status === 'success') ? pendingDetails.totalPending : 0;

  return {
    status: "success",
    totalStudents, approved, pending, rejected, completed,
    certificatesIssued, certificatesPending,
    totalBatches, presentToday, absentToday, odToday,
    pendingRequestsTotal,
    applicationStatusChart: applicationStatus,
    weeklyAttendance
  };
}

/**
 * COMPREHENSIVE ADMIN DATA LOADER
 * Bundles everything admin needs for faster dashboard loading.
 */
function getAdminComprehensiveData() {
  try {
    // Automatically sync category sheets when admin dashboard loads to ensure sheet coherence
    try { syncStudentCategoriesToSheets(); } catch (e) { }

    const stats = getDashboardStats();
    const profile = getAdminProfile();
    const notifications = getAdminNotifications();
    const settingsRes = getAppSettings();
    const settings = settingsRes.status === 'success' ? settingsRes.settings : {};
    const switchStatusRes = getAllSwitchStatuses();
    const switchStatus = switchStatusRes.status === 'success' ? switchStatusRes.data : {};
    const templates = getEmailTemplates();
    const batches = getBatches();
    const recentActivity = getRecentActivity(20);

    // Management data
    const applications = getApplications();
    const allStudents = getAllStudents(); // Fix function name: getAllStudentsData -> getAllStudents

    return {
      status: 'success',
      stats: stats,
      profile: profile,
      notifications: notifications || [],
      settings: settings || {},
      switchStatus: switchStatus || {},
      templates: templates || [],
      batches: batches || [],
      recentActivity: recentActivity || [],
      applications: applications || [],
      students: allStudents || []
    };
  } catch (e) {
    Logger.log("Error in getAdminComprehensiveData: " + e.toString());
    return { status: 'error', message: e.message };
  }
}

function getWeeklyAttendanceChartData_() {
  const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const dateCol = data[0].indexOf("Date");
  const statusCol = data[0].indexOf("Status");
  let week = {}, dates = [];
  for (let d = 6; d >= 0; d--) {
    let dt = new Date();
    dt.setDate(dt.getDate() - d);
    let str = Utilities.formatDate(dt, Session.getScriptTimeZone(), "yyyy-MM-dd");
    week[str] = { Present: 0, Absent: 0, OD: 0, Late: 0 };
    dates.push(str);
  }
  for (let i = 1; i < data.length; i++) {
    let d = formatDate(data[i][dateCol]);
    let st = data[i][statusCol];
    if (week[d] && st && week[d][st] !== undefined) week[d][st]++;
  }
  return {
    labels: dates,
    Present: dates.map(d => week[d].Present),
    Absent: dates.map(d => week[d].Absent),
    OD: dates.map(d => week[d].OD),
    Late: dates.map(d => week[d].Late)
  };
}

// Redundant getRecentActivity removed


//------------------------------APPLICATIONS--------------------------------------
function getStatusPriority(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'pending' || s === 'submitted') return 1;
  if (s === 'approved' || s === 'active' || s === 'assigned') return 2;
  if (s === 'incomplete') return 3;
  if (s === 'completed' || s === 'internship completed' || s === 'internship period ended') return 4;
  if (s === 'rejected') return 5;
  if (s === 'closed') return 6;
  if (s === 'opt-out' || s === 'optout') return 7;
  return 99;
}

function getApplications(status) {
  let data = [];
  const statusLower = String(status || '').toLowerCase().trim();
  
  if (statusLower === 'closed' || statusLower === 'opt-out' || statusLower === 'optout') {
    const sheet = getSheet('Closed and Opt-out');
    if (sheet) {
      data = getSheetDataAsObjects(sheet) || [];
    }
  } else {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    data = getSheetDataAsObjects(sheet) || [];
  }

  // Sort by Status Priority, then by Timestamp descending (latest first)
  data.sort((a, b) => {
    const sa = a.ApplicationStatus || a.Status || '';
    const sb = b.ApplicationStatus || b.Status || '';
    const pa = getStatusPriority(sa);
    const pb = getStatusPriority(sb);
    if (pa !== pb) return pa - pb;
    
    const dateA = a.Timestamp ? new Date(a.Timestamp) : new Date(0);
    const dateB = b.Timestamp ? new Date(b.Timestamp) : new Date(0);
    return dateB - dateA;
  });

  let result = data.filter(app => {
    if (status === "All") {
      // Exclude closed or opt-out from "All" applications view
      const appStatus = String(app.ApplicationStatus || '').toLowerCase();
      return appStatus !== 'closed' && appStatus !== 'opt-out' && appStatus !== 'optout';
    }
    return app.ApplicationStatus === status || 
      (status === 'Pending' && app.ApplicationStatus === 'Submitted') || 
      (status === 'Submitted' && app.ApplicationStatus === 'Pending') ||
      (status === 'Rejected' && (app.ApplicationStatus === 'Opt-out' || app.ApplicationStatus === 'Opt-Out'));
  });

  return result.map(app => ({
    registrationId: app.RegistrationID,
    name: getStudentFullName_(app),
    gmail: app.GmailID,
    status: app.ApplicationStatus,
    timestamp: app.Timestamp
  }));
}

function getAdminEmailByName_(adminName) {
  try {
    const sheet = getSheet(SHEET_NAMES.ADMIN_CREDENTIALS);
    if (!sheet) return null;
    const data = getSheetDataAsObjects(sheet);
    const admin = data.find(a => String(a.Name || '').trim().toLowerCase() === String(adminName || '').trim().toLowerCase());
    return admin ? admin.Email : null;
  } catch (e) {
    Logger.log("Error in getAdminEmailByName_: " + e.toString());
    return null;
  }
}

function sendModernHtmlEmail_(recipientEmail, subject, emailTitle, gradientColors, cardContentHtml) {
  const htmlBody = `
    <div style="background-color: #f6f9fc; padding: 30px 15px; font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; line-height: 1.6; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: left;">
        <!-- Gradient Top Header -->
        <div style="background: ${gradientColors}; padding: 35px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${emailTitle}</h1>
        </div>
        
        <!-- Email Body Content -->
        <div style="padding: 40px 30px; background-color: #ffffff; font-size: 15px;">
          ${cardContentHtml}
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #edf2f7; text-align: center; font-size: 12px; color: #718096;">
          <p style="margin: 0 0 5px 0; font-weight: 600;">${COMPANY_NAME}</p>
          <p style="margin: 0;">This is an automated system notification.</p>
        </div>
      </div>
    </div>
  `;
  
  return sendEmail(recipientEmail, subject, "", htmlBody);
}

function sendModernStatusEmail_(regId, newStatus) {
  try {
    const studentResp = getStudentFullData(regId);
    if (studentResp.status !== 'success') return;
    const s = studentResp.studentData;
    const name = getStudentFullName_(s);
    const email = s.GmailID || s.EmailID || s.email || '';
    
    if (!email) return;

    let subject = "";
    let emailTitle = "";
    let gradient = "";
    let content = "";
    
    const statusLower = newStatus.toLowerCase();
    
    if (statusLower === 'closed') {
      subject = `Internship Account Closed - ${COMPANY_NAME}`;
      emailTitle = "Internship Status: Closed";
      gradient = "linear-gradient(135deg, #434343 0%, #000000 100%)"; // Charcoal dark modern
      content = `
        <p style="font-size: 16px; margin-top: 0;">Dear <strong>${name}</strong>,</p>
        <p>This email is to inform you that your official internship account for the Registration ID <strong>${regId}</strong> has been marked as <strong>Closed</strong>.</p>
        <p>As a result, your portal access has been disabled, and any active RFID or daily attendance logs have been finalized.</p>
        <p style="margin-top: 20px;">If you believe this is in error, or if you need to access any completed certificates or final documentation, please reach out to your internship coordinator.</p>
        <p style="margin-top: 30px; margin-bottom: 0;">Thank you for your time with us, and we wish you the very best in your future endeavors!</p>
      `;
    } else if (statusLower === 'opt-out' || statusLower === 'optout') {
      subject = `Internship Opt-Out Confirmation - ${COMPANY_NAME}`;
      emailTitle = "Internship Status: Opt-Out";
      gradient = "linear-gradient(135deg, #e65c00 0%, #F9D423 100%)"; // Sunburst/Sunset gradient
      content = `
        <p style="font-size: 16px; margin-top: 0;">Dear <strong>${name}</strong>,</p>
        <p>This email confirms that you have been successfully marked as <strong>Opt-Out</strong> from your internship program (Registration ID: <strong>${regId}</strong>).</p>
        <p>Your portal login and all active accesses are now restricted. Thank you for notifying us of your decision.</p>
        <p style="margin-top: 20px;">If this action was not requested by you, please contact the administrator immediately.</p>
        <p style="margin-top: 30px; margin-bottom: 0;">Wishing you success in your future academic and professional goals.</p>
      `;
    } else {
      return;
    }
    
    sendModernHtmlEmail_(email, subject, emailTitle, gradient, content);
  } catch (e) {
    Logger.log("Error sending status email: " + e.toString());
  }
}

/**
 * Unified function to update application status and trigger relevant automated processes.
 * Handles single or multiple Registration IDs.
 */
function updateApplicationStatus(regIds, newStatus) {
  if (typeof regIds === 'string') regIds = [regIds];
  const mainSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  if (!mainSheet) return { status: 'error', message: 'Registrations data unavailable.' };

  const isTargetArchived = (newStatus.toLowerCase() === 'closed' || newStatus.toLowerCase() === 'opt-out' || newStatus.toLowerCase() === 'optout');
  
  let updatedCount = 0;
  let results = [];

  regIds.forEach(regId => {
    // Check if the student is currently in 'Closed and Opt-out' archive
    const closedSheet = getSheet('Closed and Opt-out');
    let isCurrentlyArchived = false;
    let archivedRowIdx = -1;
    let archivedDataRow = null;
    
    if (closedSheet) {
      const closedData = closedSheet.getDataRange().getValues();
      const closedHeaders = closedData[0];
      const closedRegIdCol = closedHeaders.indexOf("RegistrationID");
      if (closedRegIdCol !== -1) {
        for (let i = 1; i < closedData.length; i++) {
          if (String(closedData[i][closedRegIdCol]) === String(regId)) {
            isCurrentlyArchived = true;
            archivedRowIdx = i + 1;
            archivedDataRow = closedData[i];
            break;
          }
        }
      }
    }

    if (isTargetArchived) {
      if (isCurrentlyArchived) {
        // Just update status in the archive sheet
        const closedHeaders = closedSheet.getDataRange().getValues()[0];
        const statusColIdx = closedHeaders.indexOf("ApplicationStatus");
        const statusColIdx2 = closedHeaders.indexOf("Status");
        if (statusColIdx !== -1) closedSheet.getRange(archivedRowIdx, statusColIdx + 1).setValue(newStatus);
        if (statusColIdx2 !== -1) closedSheet.getRange(archivedRowIdx, statusColIdx2 + 1).setValue(newStatus);
        
        // Destroy detailed data, folders, and generated files
        adminDeleteFolder(regId);
        
        updatedCount++;
        results.push({ regId: regId, status: 'success', message: `Status updated to ${newStatus} in archive and detailed files destroyed.` });
        
        // Send email notification for status change
        sendModernStatusEmail_(regId, newStatus);
      } else {
        // Move from Registrations to Closed and Opt-out
        const mainData = mainSheet.getDataRange().getValues();
        const mainHeaders = mainData[0];
        const mainRegIdCol = mainHeaders.indexOf("RegistrationID");
        const mainStatusCol = mainHeaders.indexOf("ApplicationStatus");
        const mainStatusCol2 = mainHeaders.indexOf("Status");
        
        let mainRowIdx = -1;
        for (let i = 1; i < mainData.length; i++) {
          if (String(mainData[i][mainRegIdCol]) === String(regId)) {
            mainRowIdx = i + 1;
            break;
          }
        }
        
        if (mainRowIdx === -1) {
          results.push({ regId: regId, status: 'error', message: 'Student ID not found.' });
          return;
        }
        
        // Update status columns in memory first
        let rowValues = mainData[mainRowIdx - 1];
        if (mainStatusCol !== -1) rowValues[mainStatusCol] = newStatus;
        if (mainStatusCol2 !== -1) rowValues[mainStatusCol2] = newStatus;
        
        // Clear all document links and RFID tag ID in the archived row values
        let archivedRowValues = [...rowValues];
        const docColsToClear = [
          "ApplicationPdfId", "OfferLetterPdfId", "JoiningLetterPdfId", 
          "ProfilePhotoUrl", "CertificateLink", "BonafideUrl", 
          "DeclarationUrl", "CollegeIdUrl", "OtherUrl", "RFID_TagID"
        ];
        docColsToClear.forEach(colName => {
          const colIdx = mainHeaders.indexOf(colName);
          if (colIdx !== -1 && colIdx < archivedRowValues.length) {
            archivedRowValues[colIdx] = "";
          }
        });

        // Ensure Closed and Opt-out sheet exists with headers
        let closedSheetObj = getSheet('Closed and Opt-out');
        if (!closedSheetObj) {
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          closedSheetObj = ss.insertSheet('Closed and Opt-out');
          closedSheetObj.appendRow(mainHeaders);
        }
        
        // Append row values to archive
        closedSheetObj.appendRow(archivedRowValues);
        
        // Delete row from main sheet
        mainSheet.deleteRow(mainRowIdx);
        executionCache.delete(SHEET_NAMES.REGISTRATIONS);
        executionCache.delete('Closed and Opt-out');
        
        // Destroy detailed data, folders, and generated files
        adminDeleteFolder(regId);
        
        updatedCount++;
        results.push({ regId: regId, status: 'success', message: `Status updated to ${newStatus}, archived, and detailed files destroyed.` });
        
        // Send email notification
        sendModernStatusEmail_(regId, newStatus);
      }
    } else {
      // Target is not archived (e.g. Approved, Completed, Active)
      if (isCurrentlyArchived) {
        // Move from archive back to main sheet
        const mainHeaders = mainSheet.getDataRange().getValues()[0];
        const mainStatusCol = mainHeaders.indexOf("ApplicationStatus");
        const mainStatusCol2 = mainHeaders.indexOf("Status");
        
        let rowValues = archivedDataRow;
        // Update status columns in memory first
        if (mainStatusCol !== -1) rowValues[mainStatusCol] = newStatus;
        if (mainStatusCol2 !== -1) rowValues[mainStatusCol2] = newStatus;
        
        // Append to main sheet
        mainSheet.appendRow(rowValues);
        
        // Delete from archive
        closedSheet.deleteRow(archivedRowIdx);
        executionCache.delete(SHEET_NAMES.REGISTRATIONS);
        executionCache.delete('Closed and Opt-out');
        
        updatedCount++;
        results.push({ regId: regId, status: 'success', message: `Recovered student and status updated to ${newStatus}.` });
        
        // Run any standard approval workflows if newStatus is Approved
        triggerActiveWorkflowsForStudent_(regId, newStatus, mainSheet, rowValues);
      } else {
        // Standard status update in main sheet
        const mainData = mainSheet.getDataRange().getValues();
        const mainHeaders = mainData[0];
        const mainRegIdCol = mainHeaders.indexOf("RegistrationID");
        const mainStatusCol = mainHeaders.indexOf("ApplicationStatus");
        const mainStatusCol2 = mainHeaders.indexOf("Status");
        
        let mainRowIdx = -1;
        for (let i = 1; i < mainData.length; i++) {
          if (String(mainData[i][mainRegIdCol]) === String(regId)) {
            mainRowIdx = i + 1;
            break;
          }
        }
        
        if (mainRowIdx === -1) {
          results.push({ regId: regId, status: 'error', message: 'Student ID not found.' });
          return;
        }
        
        if (mainStatusCol !== -1) mainSheet.getRange(mainRowIdx, mainStatusCol + 1).setValue(newStatus);
        if (mainStatusCol2 !== -1) mainSheet.getRange(mainRowIdx, mainStatusCol2 + 1).setValue(newStatus);
        
        updatedCount++;
        results.push({ regId: regId, status: 'success', message: `Status updated to ${newStatus}.` });
        
        let rowValues = mainData[mainRowIdx - 1];
        triggerActiveWorkflowsForStudent_(regId, newStatus, mainSheet, rowValues);
      }
    }
  });

  try { syncStudentCategoriesToSheets(); } catch (e) { Logger.log('Sync category sheets error: ' + e); }

  return { status: 'success', message: `Updated ${updatedCount} application(s).`, details: results };
}

function triggerActiveWorkflowsForStudent_(regId, newStatus, mainSheet, studentDataRow) {
  try {
    const mainHeaders = mainSheet.getDataRange().getValues()[0];
    const regIdCol = mainHeaders.indexOf("RegistrationID");
    const gmailCol = mainHeaders.indexOf("GmailID");
    const firstNameCol = mainHeaders.indexOf("FirstName");
    const middleNameCol = mainHeaders.indexOf("MiddleName");
    const lastNameCol = mainHeaders.indexOf("LastName");
    const approvalDateCol = mainHeaders.indexOf("ApprovalDate");
    const appPdfCol = mainHeaders.indexOf("ApplicationPdfId");
    const offerPdfCol = mainHeaders.indexOf("OfferLetterPdfId");
    const joiningPdfCol = mainHeaders.indexOf("JoiningLetterPdfId");

    let rowIndex = -1;
    const data = mainSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][regIdCol]) === String(regId)) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) return;

    const studentName = `${studentDataRow[firstNameCol] || ''} ${middleNameCol !== -1 ? studentDataRow[middleNameCol] || '' : ''} ${studentDataRow[lastNameCol] || ''}`.trim().replace(/\s+/g, ' ');
    const studentGmail = studentDataRow[gmailCol];

    logActivity('Status Update', regId, `Status changed to ${newStatus} for ${studentName}.`);
    createAdminNotification('Application Status Updated', `Status for ${studentName} (Reg ID: ${regId}) changed to ${newStatus}.`);

    if (newStatus === 'Approved') {
      if (approvalDateCol !== -1) mainSheet.getRange(rowIndex, approvalDateCol + 1).setValue(new Date());

      let attachments = [];

      // 1. Generate Application PDF (from Template)
      const appRes = generateApplicationPdf(regId);
      if (appRes.status === 'success' && appRes.fileId) {
        attachments.push(DriveApp.getFileById(appRes.fileId).getBlob().setName(`Internship_Application_${regId}.pdf`));
        if (appPdfCol !== -1) mainSheet.getRange(rowIndex, appPdfCol + 1).setValue(appRes.fileId);
      }

      // 2. Generate Offer Letter
      const offerRes = generateDocumentAndMail('offerLetter', regId, false, true);
      if (offerRes.status === 'success' && offerRes.fileId) {
        attachments.push(DriveApp.getFileById(offerRes.fileId).getBlob().setName(`Offer_Letter_${regId}.pdf`));
        if (offerPdfCol !== -1) mainSheet.getRange(rowIndex, offerPdfCol + 1).setValue(offerRes.fileId);
      }

      // 3. Generate Joining Letter
      const joiningRes = generateDocumentAndMail('joiningLetter', regId, false, true);
      if (joiningRes.status === 'success' && joiningRes.fileId) {
        attachments.push(DriveApp.getFileById(joiningRes.fileId).getBlob().setName(`Joining_Letter_${regId}.pdf`));
        if (joiningPdfCol !== -1) mainSheet.getRange(rowIndex, joiningPdfCol + 1).setValue(joiningRes.fileId);
      }

      // Send Premium Email
      if (studentGmail) {
        const studentMobile = studentDataRow[mainHeaders.indexOf("MobileNumber")];
        
        const emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
              <h2 style="margin: 0; font-size: 24px;">Internship Approved!</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Welcome to ${COMPANY_NAME}</p>
            </div>
            
            <div style="padding: 20px;">
              <p>Dear <strong>${studentName}</strong>,</p>
              <p>We are excited to inform you that your internship application has been <strong>Approved</strong>! We are thrilled to have you join our team.</p>
              
              <div style="background-color: #f0f7ff; border-left: 4px solid #4361ee; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h4 style="margin: 0 0 10px 0; color: #4361ee;">Student Portal Credentials</h4>
                <table style="width: 100%; font-size: 14px;">
                  <tr><td style="width: 40%; font-weight: bold; padding: 4px 0;">User ID:</td><td><strong>${regId}</strong></td></tr>
                  <tr><td style="font-weight: bold; padding: 4px 0;">Password:</td><td><strong>${studentMobile}</strong> <span style="font-size: 11px; color: #666;">(Your Mobile Number)</span></td></tr>
                </table>
                <p style="margin: 15px 0 0 0; font-size: 13px;">
                  <a href="${PORTAL_URL}" style="background-color: #4361ee; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Login to Student Portal</a>
                </p>
              </div>
              
              <p><strong>Action Required:</strong></p>
              <p>Please login to the Student Portal immediately to:</p>
              <ul style="padding-left: 20px; font-size: 14px;">
                <li>Upload your <strong>Bonafide Certificate</strong></li>
                <li>Upload your <strong>College ID Card</strong></li>
                <li>Complete your profile information</li>
              </ul>
              
              <p>We have attached your <strong>Official Offer Letter</strong>, <strong>Joining Letter</strong>, and <strong>Application Form</strong> for your reference.</p>
              
              <p style="margin-top: 20px;">We look forward to a productive internship experience with you!</p>
            </div>
            
            <div style="padding: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #777;">
              ${EMAIL_SIGNATURE_HTML}
            </div>
          </div>
        `;

        MailApp.sendEmail({
          to: studentGmail,
          subject: `Internship Approved - ${COMPANY_NAME} [Reg ID: ${regId}]`,
          htmlBody: emailHtml,
          attachments: attachments,
          name: COMPANY_NAME
        });
      }
    } else if (newStatus === 'Rejected') {
      if (studentGmail) {
        const emailBody = getProfessionalEmailBody('rejected', {
          FullName: studentName,
          Body: "We regret to inform you that your application for the internship program at " + COMPANY_NAME + " has been rejected at this time. We wish you success in your future endeavors."
        }, '');
        sendEmail(studentGmail, `Application Status Update - ${COMPANY_NAME}`, "", emailBody);
      }
    } else if (newStatus === 'Completed') {
      let triggerMode = 'Auto';
      try { triggerMode = getCertificateTriggerMode(); } catch (e) { }

      if (triggerMode === 'Auto') {
        try { generateDocumentAndMail('internshipCertificate', regId, true); } catch (e) { }
      }
    }

    // RFID Automation Logic
    handleRfidAutomationOnStatusChange(regId, newStatus);
  } catch (err) {
    Logger.log("Error in triggerActiveWorkflowsForStudent_: " + err.toString());
  }
}


// --- COMPREHENSIVE PROFILE FUNCTIONS ---

function getStudentComprehensiveProfile_LEGACY_1(regId) {
  try {
    const studentDetailsResponse = getStudentDetails_(regId);
    if (studentDetailsResponse.status !== 'success') {
      return studentDetailsResponse;
    }

    // Safely fetch other data, defaulting to empty arrays if any fetch fails
    let tasks = [], projects = [], attendance = [], diary = [], notifications = [], certificate = null;

    try { tasks = getTasksForStudent_(regId) || []; } catch (e) { Logger.log('Error fetching tasks: ' + e); }
    try { projects = getProjectsForStudent_(regId) || []; } catch (e) { Logger.log('Error fetching projects: ' + e); }
    try { attendance = getAttendanceForStudent_(regId, 15) || []; } catch (e) { Logger.log('Error fetching attendance: ' + e); }
    try { diary = getDiaryForStudent_(regId, 5) || []; } catch (e) { Logger.log('Error fetching diary: ' + e); }
    try { certificate = getCertificateForStudent_(regId); } catch (e) { Logger.log('Error fetching certificate: ' + e); }

    // Mock notifications for now as no schema exists for student notifications
    try {
      const notifSheet = getSheet(SHEET_NAMES.ADMIN_NOTIFICATIONS);
      if (notifSheet) {
        const allNotifs = getSheetDataAsObjects(notifSheet);
        // Filter for this student (TargetAdminID used for student ID)
        notifications = allNotifs.filter(n => n.TargetAdminID === regId)
          .map(n => ({
            title: n.Title,
            message: n.Message,
            date: n.Timestamp
          }));
      }
    } catch (e) { Logger.log('Error fetching notifications: ' + e); }

    const profile = {
      status: 'success',
      details: studentDetailsResponse.details,
      tasks: tasks,
      projects: projects,
      attendance: attendance,
      diary: diary,
      notifications: notifications,
      certificate: certificate
    };

    return profile;

  } catch (e) {
    Logger.log(`Error in getStudentComprehensiveProfile for ${regId}: ${e.stack}`);
    return { status: "error", message: `A server error occurred while building the student profile: ${e.message}` };
  }
}

function getStudentDetails_LEGACY_1(regId) {
  const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  if (!sheet) return { status: "error", message: "Registrations sheet not accessible." };

  const studentData = getSheetDataAsObjects(sheet).find(s => s.RegistrationID === regId);

  if (!studentData) {
    return { status: "error", message: `Student with Registration ID "${regId}" not found.` };
  }

  const details = {
    registrationId: studentData.RegistrationID,
    name: getStudentFullName_(studentData),
    firstName: studentData.FirstName || '',
    middleName: studentData.MiddleName || '',
    lastName: studentData.LastName || '',
    status: studentData.ApplicationStatus,
    college: studentData.CollegeName,
    district: studentData.District,
    department: studentData.Department,
    InternshipStartDate: studentData.InternshipStartDate,
    InternshipEndDate: studentData.InternshipEndDate,
    year: studentData.Year,
    registerNumber: studentData.RegisterNumber,
    batch: studentData.Batch, // Added Batch
    address: [studentData.Address, studentData.District, studentData.Pincode].filter(Boolean).join(', ') || 'N/A',
    // Detailed fields for editing
    addressLine: studentData.Address || '',
    district: studentData.District || '',
    pincode: studentData.Pincode || '',
    email: studentData.GmailID,
    mobile: studentData.MobileNumber,
    appliedDate: studentData.Timestamp ? new Date(studentData.Timestamp).toISOString() : null,
    documents: {
      bonafide: !!studentData.BonafideUrl,
      declaration: !!studentData.DeclarationUrl,
      collegeId: !!studentData.CollegeIdUrl,
      other: !!studentData.OtherUrl
    }
  };

  return { status: 'success', details: details };
}


function getTasksForStudent_(regId) {
  try {
    return getStudentTasks(regId);
  } catch (e) {
    Logger.log('Error in getTasksForStudent_: ' + e.message);
    return [];
  }
}

function getProjectsForStudent_(regId) {
  try {
    return getStudentProjects(regId);
  } catch (e) {
    Logger.log('Error in getProjectsForStudent_: ' + e.message);
    return [];
  }
}

function getAttendanceForStudent_(regId, limit = 15) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (!sheet) return [];
    const records = getSheetDataAsObjects(sheet)
      .filter(row => row.StudentRegistrationID === regId)
      .sort((a, b) => new Date(b.Date) - new Date(a.Date));
    return records.slice(0, limit);
  } catch (e) {
    Logger.log('Error in getAttendanceForStudent_: ' + e.message);
    return [];
  }
}

function getDiaryForStudent_(regId, limit = 5) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    if (!sheet) return [];
    const entries = getSheetDataAsObjects(sheet)
      .filter(row => row.StudentRegistrationID === regId)
      .sort((a, b) => new Date(b.Date) - new Date(a.Date));
    return entries.slice(0, limit);
  } catch (e) {
    Logger.log('Error in getDiaryForStudent_: ' + e.message);
    return [];
  }
}

function getCertificateForStudent_(regId) {
  try {
    const sheet = getSheet(SHEET_NAMES.CERTIFICATE_DATA);
    if (!sheet) return null;
    const certs = getSheetDataAsObjects(sheet).filter(row => row.StudentRegistrationID === regId);
    return certs.length > 0 ? certs[certs.length - 1] : null;
  } catch (e) {
    Logger.log('Error in getCertificateForStudent_: ' + e.message);
    return null;
  }
}


//------------------------------MANAGE STUDENTS--------------------------------------
// function getAllStudents() { ... } // MOVED AND CONSOLIDATED BELOW

function getStudentDiaryEntries(registrationId, startDateString) {
  if (!registrationId || !startDateString) return [];
  const sheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
  if (!sheet) {
    Logger.log("StudentDiary sheet not found.");
    return [];
  }
  const startDate = new Date(startDateString);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 15);

  const allEntries = getSheetDataAsObjects(sheet);
  const filteredEntries = allEntries.filter(entry => {
    if (entry.StudentRegistrationID !== registrationId) return false;
    const entryDate = new Date(entry.Date);
    return entryDate >= startDate && entryDate <= endDate;
  });

  filteredEntries.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  return filteredEntries;
}



/*

//------------------------------DASHBOARD--Sart -----------------------------------------


function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const regSheet = ss.getSheetByName("Internship Registrations");
  const regData = regSheet.getDataRange().getValues();

  const statusCol = getColIdxByName(regSheet, "ApplicationStatus");

  let totalStudents = 0, approved = 0, pending = 0, rejected = 0, completed = 0;
  for (let i = 1; i < regData.length; i++) {
    totalStudents++;
    let status = regData[i][statusCol];
    if (status === "Approved") approved++;
    else if (status === "Pending" || status === "Submitted") pending++;
    else if (status === "Rejected" || status === "Opt-out" || status === "Opt-Out") rejected++;
    else if (status === "Completed") completed++;
  }

  // Certificate Data
  let certificatesIssued = 0, certificatesPending = 0;
  const certSheet = ss.getSheetByName("Certificate Data");
  if (certSheet) {
    const certData = certSheet.getDataRange().getValues();
    const certStatusCol = getColIdxByName(certSheet, "Status");
    for (let i = 1; i < certData.length; i++) {
      if (certData[i][certStatusCol] === "Issued") certificatesIssued++;
      else certificatesPending++;
    }
  }

  // Batches
  let totalBatches = 0;
  const batchSheet = ss.getSheetByName("Batches");
  if (batchSheet) totalBatches = Math.max(0, batchSheet.getLastRow() - 1);

  // Attendance Today
  let presentToday = 0, absentToday = 0, odToday = 0;
  const attSheet = ss.getSheetByName("Attendance");
  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  if (attSheet) {
    const attData = attSheet.getDataRange().getValues();
    const attDateCol = getColIdxByName(attSheet, "Date");
    const attStatusCol = getColIdxByName(attSheet, "Status");
    for (let i = 1; i < attData.length; i++) {
      if (attData[i][attDateCol] === todayStr) {
        if (attData[i][attStatusCol] === "Present") presentToday++;
        else if (attData[i][attStatusCol] === "Absent") absentToday++;
        else if (attData[i][attStatusCol] === "OD" || attData[i][attStatusCol] === "On Duty") odToday++;
      }
    }
  }

  // Application Status chart
  const applicationStatus = { Approved: approved, Pending: pending, Rejected: rejected, Completed: completed };
  const weeklyAttendance = getWeeklyAttendanceChartData_();

  return {
    status: "success",
    totalStudents, approved, pending, rejected, completed,
    certificatesIssued, certificatesPending,
    totalBatches, presentToday, absentToday, odToday,
    applicationStatusChart: applicationStatus,
    weeklyAttendance
  };
}

function getWeeklyAttendanceChartData_() {
  const sheet = getSheet("Attendance");
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const dateCol = getColIdxByName(sheet, "Date");
  const statusCol = getColIdxByName(sheet, "Status");
  let week = {}, dates = [];
  for (let d = 6; d >= 0; d--) {
    let dt = new Date();
    dt.setDate(dt.getDate() - d);
    let str = Utilities.formatDate(dt, Session.getScriptTimeZone(), "yyyy-MM-dd");
    week[str] = { Present: 0, Absent: 0, OD: 0, Late: 0 };
    dates.push(str);
  }
  for (let i = 1; i < data.length; i++) {
    let d = data[i][dateCol], st = data[i][statusCol];
    if (week[d] && st && week[d][st] !== defined) week[d][st]++;
  }
  return {
    labels: dates,
    Present: dates.map(d => week[d].Present),
    Absent: dates.map(d => week[d].Absent),
    OD: dates.map(d => week[d].OD),
    Late: dates.map(d => week[d].Late)
  };
}

/*function getRecentActivity() {
  const attSheet   = getSheet("Attendance");
  const activity   = [];
  // ID shadow removed
  // --- Attendance entries ---
  if (attSheet) {
    const rows     = attSheet.getDataRange().getValues();
    const dateIdx  = getColIdxByName(attSheet, "Date");
    const nameIdx  = getColIdxByName(attSheet, "Name");
    const statIdx  = getColIdxByName(attSheet, "Status");

    for (let i = Math.max(1, rows.length - 21); i < rows.length; i++) {
      activity.push({
        date:     rows[i][dateIdx],
        activity: "Attendance",
        user:     rows[i][nameIdx],
        details:  rows[i][statIdx]
      });
    }
  }

  // --- Task assignments ---
  if (taskSheet) {
    const rows = taskSheet.getDataRange().getValues();
    for (let i = Math.max(1, rows.length - 11); i < rows.length; i++) {
      activity.push({
        date:     rows[i][0],
        activity: "Task Assigned",
        user:     rows[i][2],
        details:  rows[i][3]
      });
    }
  }

  // --- Project assignments ---
  if (projSheet) {
    const rows = projSheet.getDataRange().getValues();
    for (let i = Math.max(1, rows.length - 11); i < rows.length; i++) {
      activity.push({
        date:     rows[i][0],
        activity: "Project Assigned",
        user:     rows[i][2],
        details:  rows[i][3]
      });
    }
  }

  // Sort descending by date and return top 20
  activity.sort((a, b) => new Date(b.date) - new Date(a.date));
  return activity.slice(0, 20);
}

/*
 * DUPLICATE FUNCTION - Replaced by comprehensive version above
 */
/*
function getRecentActivity() {
  const allActivities = [];

  // --- 1. Get Attendance Entries ---
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (sheet) {
      const headers = getHeaders(sheet);
      // Find column indices by name to make the code robust
      const dateIdx = headers.indexOf("Date");
      const nameIdx = headers.indexOf("StudentName");
      const statusIdx = headers.indexOf("Status");

      // Proceed only if all required columns are found
      if (dateIdx > -1 && nameIdx > -1 && statusIdx > -1) {
        const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        values.forEach(row => {
          // Only add entries that have a valid date
          if (row[dateIdx]) {
            allActivities.push({
              Timestamp: new Date(row[dateIdx]),
              ActivityType: 'Attendance Marked',
              User: row[nameIdx],
              Details: `Status: ${row[statusIdx]}`
            });
          }
        });
      }
    }
  } catch (e) {
    console.error("Error processing Attendance sheet: " + e.message);
  }
  
 // --- 4. Sort all activities together and return the most recent 20 ---
  allActivities.sort((a, b) => b.Timestamp - a.Timestamp);
  return allActivities.slice(0, 20);
}
*/
// Comprehensive function
function getStudentComprehensiveProfile_DUPLICATE_DISABLED(regId) {
  try {
    const studentDetailsResponse = getStudentDetails_(regId);
    if (studentDetailsResponse.status !== 'success') {
      return studentDetailsResponse; // Return the error if student not found
    }

    // Assemble the full profile by calling helper functions
    const profile = {
      status: 'success',
      details: studentDetailsResponse.details,
      tasks: getTasksForStudent_(regId),
      projects: getProjectsForStudent_(regId),
      attendance: getAttendanceForStudent_(regId, 15), // Get last 15 days
      diary: getDiaryForStudent_(regId, 5) // Get last 5 entries
    };

    return profile;

  } catch (e) {
    Logger.log(`Error in getStudentComprehensiveProfile_DUPLICATE_DISABLED for ${regId}: ${e.stack}`);
    return { status: "error", message: `A server error occurred while building the student profile: ${e.message}` };
  }
}
// --- HELPER FUNCTIONS FOR getStudentComprehensiveProfile ---

/*
// DEPRECATED / DUPLICATE FUNCTIONS - COMMENTED OUT TO PREVENT CONFLICTS
// These functions are already defined with updated logic earlier in the file.

function getStudentDetails_DUPLICATE_DISABLED(regId) {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!sheet) return { status: "error", message: "Registrations sheet not accessible." };

    const studentData = getSheetDataAsObjects(sheet).find(s => s.RegistrationID === regId);

    if (!studentData) {
        return { status: "error", message: `Student with Registration ID "${regId}" not found.` };
    }

    // Format the details object as needed by the frontend
    const details = {
        registrationId: studentData.RegistrationID,
        name: `${studentData.FirstName || ''} ${studentData.LastName || ''}`.trim(),
        status: studentData.ApplicationStatus,
        college: studentData.CollegeName,
        department: studentData.Department,
        InternshipStartDate: studentData.InternshipStartDate,
        InternshipEndDate: studentData.InternshipEndDate,
        year: studentData.Year,
        registerNumber: studentData.RegisterNumber,
        batch: studentData.Batch || ''
    };

    return { status: 'success', details: details };
}

function getTasksForStudent_DUPLICATE_DISABLED(regId) {
    const sheet = getSheet(SHEET_NAMES.TASKS);
    if (!sheet) return [];
    return getSheetDataAsObjects(sheet).filter(row => row.StudentRegistrationID === regId);
}
*/

/**
 * [HELPER] Fetches all projects for a given student.
 * @param {string} regId The student's registration ID.
 * @returns {Array<Object>} An array of project objects.
 * @private
 */

/*---------------------------------------
/*
function getProjectsForStudent_DUPLICATE_DISABLED(regId) {
    const sheet = getSheet(SHEET_NAMES.PROJECTS);
    if (!sheet) return [];
    return getSheetDataAsObjects(sheet).filter(row => row.StudentRegistrationID === regId);
}

function getAttendanceForStudent_DUPLICATE_DISABLED(regId, limit = 15) {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (!sheet) return [];
    const records = getSheetDataAsObjects(sheet)
        .filter(row => row.StudentRegistrationID === regId)
        .sort((a, b) => new Date(b.Date) - new Date(a.Date)); // Sort by date descending
    return records.slice(0, limit);
}

function getDiaryForStudent_DUPLICATE_DISABLED(regId, limit = 5) {
    const sheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    if (!sheet) return [];
    const entries = getSheetDataAsObjects(sheet)
        .filter(row => row.RegistrationID === regId || row.RegID === regId || row.StudentRegistrationID === regId) // Flexible check
        .sort((a, b) => new Date(b.Date) - new Date(a.Date)); // Sort by date descending
    return entries.slice(0, limit);
}
*/

//---------------------------------------------Application__END__________________
/*
//-----------------------------------Mange Student ------START----------
// Redundant getAllStudents removed
function updateStudentData(student) {
  const sheet = getSheet("Internship Registrations");
  const regIdCol = getColIdxByName(sheet, "RegistrationID");
  const fnameCol = getColIdxByName(sheet, "FirstName");
  const lnameCol = getColIdxByName(sheet, "LastName");
  const gmailCol = getColIdxByName(sheet, "GmailID");
  const statusCol = getColIdxByName(sheet, "ApplicationStatus");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][regIdCol] == student.registrationId) {
      sheet.getRange(i+1, fnameCol+1).setValue(student.name.split(' ')[0] || "");
      sheet.getRange(i+1, lnameCol+1).setValue(student.name.split(' ')[1] || "");
      sheet.getRange(i+1, gmailCol+1).setValue(student.gmail);
      sheet.getRange(i+1, statusCol+1).setValue(student.status);
      return { status: "success" };
    }
  }
  return { status: "error", message: "Student not found" };
}
function sendEmailToStudents(regId, subject, body) {
  const sheet = getSheet("Internship Registrations");
  const gmailCol = getColIdxByName(sheet, "GmailID");
  const regIdCol = getColIdxByName(sheet, "RegistrationID");
  const data = sheet.getDataRange().getValues();
  let sent = 0;
  for (let i = 1; i < data.length; i++) {
    if (regId.includes(data[i][regIdCol])) {
      MailApp.sendEmail(data[i][gmailCol], subject, body);
      sent++;
    }
  }
  return { status: "success", sent };
}
// function assignStudentsToBatch(regId, batchName) { ... } // REMOVED DUPLICATE
//-----------------------------------Mange Student ------END----------
function getAttendanceRecords_DUPLICATE_DISABLED(filterDate, filterStatus, filterRegId) {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (!sheet) return [];

    let records = getSheetDataAsObjects(sheet);

    // Apply filters if they are provided
    if (filterDate) {
        records = records.filter(rec => formatDate(rec.Date) === filterDate);
    }
    if (filterStatus && filterStatus !== 'All') {
        records = records.filter(rec => rec.Status === filterStatus);
    }
    if (filterRegId) {
        // Use includes for partial matching, and convert to uppercase for case-insensitivity
        records = records.filter(rec => rec.RegID && rec.RegID.toUpperCase().includes(filterRegId.toUpperCase()));
    }

    // Sort by date descending to show recent records first
    records.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return records.slice(0, 200); // Return a maximum of 200 records to avoid performance issues
}


// function createBatch(batchName, mentorName) { ... } // REMOVED DUPLICATE
// function assignStudentsToBatch(regIds, batchName) { ... } // REMOVED DUPLICATE
// REMOVED DUPLICATE LOGIC COMPLETELY



function getStudentDiaryEntries(registrationId, startDateString) {
    if (!registrationId || !startDateString) {
        return [];
    }

    const sheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    if (!sheet) {
        Logger.log("StudentDiary sheet not found.");
        return [];
    }

    // Establishes the 15-day date range for the diary entries
    const startDate = new Date(startDateString);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 15);

    const allEntries = getSheetDataAsObjects(sheet);

    const filteredEntries = allEntries.filter(entry => {
        if (entry.RegID !== registrationId) {
            return false;
        }
        const entryDate = new Date(entry.Date);
        return entryDate >= startDate && entryDate <= endDate;
    });

    // Sort entries by date, most recent first
    filteredEntries.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return filteredEntries;
}

// --- Dashboard stats
function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const regSheet = ss.getSheetByName("Internship Registrations");
  const regData = regSheet.getDataRange().getValues();
  const statusCol = getColIdxByName(regSheet, "ApplicationStatus");

  let totalStudents = 0, approved = 0, pending = 0, rejected = 0, completed = 0;
  for (let i = 1; i < regData.length; i++) {
    totalStudents++;
    let status = regData[i][statusCol];
    if (status === "Approved") approved++;
    else if (status === "Pending" || status === "Submitted") pending++;
    else if (status === "Rejected" || status === "Opt-out" || status === "Opt-Out") rejected++;
    else if (status === "Completed") completed++;
  }

  // Certificate Data
  let certificatesIssued = 0, certificatesPending = 0;
  const certSheet = ss.getSheetByName("Certificate Data");
  if (certSheet) {
    const certData = certSheet.getDataRange().getValues();
    const certStatusCol = getColIdxByName(certSheet, "Status");
    for (let i = 1; i < certData.length; i++) {
      if (certData[i][certStatusCol] === "Issued") certificatesIssued++;
      else certificatesPending++;
    }
  }

  // Batches
  let totalBatches = 0;
  const batchSheet = ss.getSheetByName("Batches");
  if (batchSheet) totalBatches = Math.max(0, batchSheet.getLastRow() - 1);

  // Attendance Today
  let presentToday = 0, absentToday = 0, odToday = 0;
  const attSheet = ss.getSheetByName("Attendance");
  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  if (attSheet) {
    const attData = attSheet.getDataRange().getValues();
    const attDateCol = getColIdxByName(attSheet, "Date");
    const attStatusCol = getColIdxByName(attSheet, "Status");
    for (let i = 1; i < attData.length; i++) {
      if (attData[i][attDateCol] === todayStr) {
        if (attData[i][attStatusCol] === "Present") presentToday++;
        else if (attData[i][attStatusCol] === "Absent") absentToday++;
        else if (attData[i][attStatusCol] === "OD" || attData[i][attStatusCol] === "On Duty") odToday++;
      }
    }
  }

  const applicationStatus = { Approved: approved, Pending: pending, Rejected: rejected, Completed: completed };
  const weeklyAttendance = getWeeklyAttendanceChartData_();

  return {
    status: "success",
    totalStudents, approved, pending, rejected, completed,
    certificatesIssued, certificatesPending,
    totalBatches, presentToday, absentToday, odToday,
    applicationStatusChart: applicationStatus,
    weeklyAttendance
  };
}

function getWeeklyAttendanceChartData_() {
  const sheet = getSheet("Attendance");
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const dateCol = getColIdxByName(sheet, "Date");
  const statusCol = getColIdxByName(sheet, "Status");
  let week = {}, dates = [];
  for (let d = 6; d >= 0; d--) {
    let dt = new Date();
    dt.setDate(dt.getDate() - d);
    let str = Utilities.formatDate(dt, Session.getScriptTimeZone(), "yyyy-MM-dd");
    week[str] = { Present: 0, Absent: 0, OD: 0, Late: 0 };
    dates.push(str);
  }
  for (let i = 1; i < data.length; i++) {
    let d = data[i][dateCol], st = data[i][statusCol];
    if (week[d] && st && week[d][st] !== undefined) week[d][st]++;
  }
  return {
    labels: dates,
    Present: dates.map(d => week[d].Present),
    Absent: dates.map(d => week[d].Absent),
    OD: dates.map(d => week[d].OD),
    Late: dates.map(d => week[d].Late)
  };
}




function getStudentApplications(statusFilter) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) return {
      status: 'error',
      message: 'Registrations data not found.'
    };

    const data = regSheet.getDataRange().getValues();
    const applications = [];
    if (data.length < 1) return {
      status: 'success',
      applications: []
    };
    const header = data[0];
    const regIdCol = header.indexOf("RegistrationID");
    const firstNameCol = header.indexOf("FirstName");
    const middleNameCol = header.indexOf("MiddleName");
    const lastNameCol = header.indexOf("LastName");
    const gmailCol = header.indexOf("GmailID");
    const statusCol = header.indexOf("ApplicationStatus");

    if ([regIdCol, firstNameCol, lastNameCol, gmailCol, statusCol].includes(-1)) {
      Logger.log("Registrations sheet (get apps) header misconfiguration. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Student application data config error (GSA_H_MM).',
        applications: []
      };
    }

    for (let i = 1; i < data.length; i++) {
      const currentStatus = data[i][statusCol];
      if (statusFilter === 'All' || currentStatus === statusFilter || 
          (statusFilter === 'Pending' && currentStatus === 'Submitted') ||
          (statusFilter === 'Rejected' && (currentStatus === 'Opt-out' || currentStatus === 'Opt-Out'))) {
        if (data[i][regIdCol]) {
          applications.push({
            rowNum: i + 1,
            registrationId: data[i][regIdCol],
            name: `${data[i][firstNameCol] || ''} ${middleNameCol !== -1 ? data[i][middleNameCol] || '' : ''} ${data[i][lastNameCol] || ''}`.trim().replace(/\s+/g, ' '),
            gmail: data[i][gmailCol],
            status: currentStatus
          });
        }
      }
    }
    return {
      status: 'success',
      applications: applications
    };
  } catch (error) {
    Logger.log('Error in getStudentApplications: ' + error.toString() + error.stack);
    return {
      status: 'error',
      message: 'Error fetching applications: ' + error.message,
      applications: []
    };
  }
}

// Deprecated old updateApplicationStatus - calls consolidated version instead
function updateApplicationStatus_OLD(rowNum, newStatus, studentGmail, studentName, registrationId) {
  return updateApplicationStatus([registrationId], newStatus);
}

/**
 * Helper to fetch student data by ID for document generation and verification.
 */
function getStudentDataForDoc(registrationId) {
  const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  if (!regSheet) return null;
  const data = getSheetDataAsObjects(regSheet);

  // Find the student
  const student = data.find(s => s.RegistrationID === registrationId);
  if (!student) return null;

  // Try fetching Project Title if BATCH is set
  let projectTitle = 'N/A';
  let skillLearned = 'N/A';
  if (student.Batch) {
    try {
      const batchSheet = getSheet(SHEET_NAMES.BATCHES);
      if (batchSheet) {
        const bData = getSheetDataAsObjects(batchSheet);
        const searchBatch = String(student.Batch).trim().toLowerCase();
        const bObj = bData.find(b =>
          String(b.BatchName || '').trim().toLowerCase() === searchBatch ||
          String(b.BatchID || '').trim().toLowerCase() === searchBatch
        );

        if (bObj) {
          projectTitle = bObj.Project || bObj['ProjectTitle'] || 'N/A';
          // Check various header possibilities for Skill Learned
          skillLearned = bObj.SkillLearned || bObj['Skill Learned'] || bObj['skillLearned'] || bObj['Skill Learned (For Certificate)'] || 'N/A';
        }
      }

      // Secondary check / fallback in dedicated storage if first check failed or returned N/A
      if (skillLearned === 'N/A' || !skillLearned) {
        const contentFallback = getCertificateContentForBatch(student.Batch);
        if (contentFallback) skillLearned = contentFallback;
      }
    } catch (e) {
      Logger.log("Error fetching batch data for student: " + e.message);
    }
  }

  // Return formatted data for template placeholders
  return {
    FullName: `${student.FirstName || ''} ${student.MiddleName || ''} ${student.LastName || ''}`.trim().replace(/\s+/g, ' '),
    FirstName: student.FirstName,
    LastName: student.LastName,
    RegistrationID: student.RegistrationID,
    RegisterNumber: student.RegisterNumber,
    EducationType: student.EducationType,
    CollegeCode: student.CollegeCode,
    Department: student.Department,
    CollegeName: student.CollegeName,
    CollegeDistrict: student.CollegeDistrict || 'N/A',
    Address: student.Address || 'N/A',
    Pincode: student.Pincode || 'N/A',
    District: student.District || 'N/A',
    MobileNumber: student.MobileNumber || 'N/A',
    GmailID: student.GmailID,
    InternshipStartDate: student.InternshipStartDate,
    FormattedStartDate: formatDateDisplay(student.InternshipStartDate),
    InternshipEndDate: student.InternshipEndDate,
    FormattedEndDate: formatDateDisplay(student.InternshipEndDate),
    DurationDays: student.DurationDays || 'N/A',
    DateofBirth: student.DateofBirth,
    FormattedDOB: formatDateDisplay(student.DateofBirth),
    TodayDate: formatDateDisplay(new Date()),
    ApplicationStatus: student.ApplicationStatus,
    GPA: student.GPA || 'N/A',
    InterestedArea: student.InterestedArea || 'N/A',
    Year: student.Year || 'N/A',
    Semester: student.Semester || 'N/A',
    Batch: student.Batch || 'N/A',
    SkillLearned: skillLearned,
    ProjectTitle: projectTitle,
    CompanyName: COMPANY_NAME,
    CompanyContact: COMPANY_CONTACT,
    CompanyWebsite: COMPANY_WEBSITE,
    ChiefEngineerName: COMPANY_CHIEF_ENGINEER || "S Vijay Varman",
    ChiefEngineerTitle: COMPANY_CHIEF_TITLE || "Chief Electrical Engineer",
    ChiefEngineerDetails: CHIEF_ENGINEER_DETAILS
  };
}

function getBatchProjectTitle_(batchName) {
  if (!batchName) return null;
  const batchSheet = getSheet(SHEET_NAMES.BATCHES);
  if (!batchSheet) return null;
  const data = getSheetDataAsObjects(batchSheet);
  const batch = data.find(b => b.BatchName === batchName);
  return batch ? batch.Project : null;
}


/**
 * Checks if a student has enough attendance to complete the internship.
 */
function checkAttendanceCompliance(registrationId) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);

    if (!regSheet || !attSheet) {
      return { status: 'error', message: 'System error: Sheets missing for attendance check.' };
    }

    // 1. Get Required Duration from Registration
    const residents = getSheetDataAsObjects(regSheet);
    const student = residents.find(s => s.RegistrationID === registrationId);
    if (!student) return { status: 'error', message: 'Student details not found.' };

    const requiredDuration = parseInt(student.DurationDays) || 0;

    // 2. Count Present Days
    const attRecords = getSheetDataAsObjects(attSheet);
    const presentCount = attRecords.filter(r =>
      r.StudentRegistrationID === registrationId &&
      (r.Status === 'Present' || r.Status === 'OD' || r.Status === 'On Duty')
    ).length;

    if (presentCount >= requiredDuration) {
      return { status: 'success', message: 'Attendance requirement met.' };
    } else {
      return {
        status: 'error',
        message: `Cannot mark as Completed. Student has ${presentCount} days of attendance, but ${requiredDuration} days are required.`
      };
    }
  } catch (e) {
    Logger.log('Error in checkAttendanceCompliance: ' + e.toString());
    // Fail safe: block if error check
    return { status: 'error', message: 'Error checking attendance compliance: ' + e.message };
  }
}

// Redundant getStudentFullData removed
function getStudentFullData_LEGACY_1(registrationId) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) return {
      status: 'error',
      message: 'Registration data not found.'
    };

    const data = regSheet.getDataRange().getValues();
    if (data.length < 1) return {
      status: 'error',
      message: 'No student data found.'
    };
    const header = data[0]; // Assuming header is in the first row
    const regIdCol = header.indexOf("RegistrationID");

    if (regIdCol === -1) {
      Logger.log("RegistrationID column not found in getStudentFullData. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Student data config error (GSFD_H_MM).'
      };
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][regIdCol] && data[i][regIdCol].toString().trim().toUpperCase() === registrationId.trim().toUpperCase()) {
        const studentRow = data[i];
        const studentDataObject = {};
        header.forEach((colName, index) => {
          let value = studentRow[index];
          if (['InternshipStartDate', 'InternshipEndDate', 'DateofBirth'].includes(colName) && value) {
            studentDataObject[colName] = formatDate(value);
          } else if (['Timestamp', 'LastLogin'].includes(colName) && value) {
            studentDataObject[colName] = new Date(value).toISOString();
          } else {
            studentDataObject[colName] = value;
          }
        });
        studentDataObject.rowNum = i + 1;
        return {
          status: 'success',
          studentData: studentDataObject
        };
      }
    }
    return {
      status: 'error',
      message: 'Student not found.'
    };
  } catch (error) {
    Logger.log('Error in getStudentFullData: ' + error.toString());
    return {
      status: 'error',
      message: 'Error fetching student data: ' + error.message
    };
  }
}

// Redundant updateStudentFullData removed
function updateStudentFullData(studentDataChanges) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) return {
      status: 'error',
      message: 'Registration data service unavailable.'
    };

    const rowNum = parseInt(studentDataChanges.rowNum);
    if (isNaN(rowNum) || rowNum <= 1) {
      return {
        status: 'error',
        message: 'Invalid student record identifier.'
      };
    }

    const header = regSheet.getRange("1:1").getValues()[0];
    const originalDataRow = regSheet.getRange(rowNum, 1, 1, header.length).getValues()[0];
    const updatedRow = [...originalDataRow];

    let statusChanged = false;
    const applicationStatusHeaderName = "ApplicationStatus";
    const oldStatus = originalDataRow[header.indexOf(applicationStatusHeaderName)];

    for (const keyInChanges in studentDataChanges) {
      if (keyInChanges === 'rowNum' || keyInChanges === 'sendEmailNotification') continue;

      let sheetHeaderKey = header.find(h => h.toLowerCase() === keyInChanges.toLowerCase());
      if (!sheetHeaderKey && header.includes(keyInChanges)) {
        sheetHeaderKey = keyInChanges;
      }

      if (sheetHeaderKey) {
        const colIndex = header.indexOf(sheetHeaderKey);
        if (colIndex !== -1) {
          let valueToSet = studentDataChanges[keyInChanges];
          if (['InternshipStartDate', 'InternshipEndDate', 'DateofBirth'].includes(sheetHeaderKey) && valueToSet) {
            valueToSet = formatDate(valueToSet);
          }
          updatedRow[colIndex] = valueToSet;

          if (sheetHeaderKey === applicationStatusHeaderName && valueToSet !== oldStatus) {
            statusChanged = true;
          }
        } else {
          Logger.log(`Warning (USFD): Key "${keyInChanges}" (mapped to "${sheetHeaderKey}") not found in actual sheet headers for update.`);
        }
      } else {
        Logger.log(`Warning (USFD): Key "${keyInChanges}" from client data not mapped to any sheet header.`);
      }
    }

    regSheet.getRange(rowNum, 1, 1, updatedRow.length).setValues([updatedRow]);
    SpreadsheetApp.flush();

    const studentName = `${updatedRow[header.indexOf("FirstName")] || ''} ${updatedRow[header.indexOf("LastName")] || ''}`.trim();
    const studentGmail = updatedRow[header.indexOf("GmailID")];
    const currentRegId = originalDataRow[header.indexOf("RegistrationID")];


    logActivity('Student Data Update', currentRegId, `Data updated for ${studentName}.`);
    createAdminNotification('Student Data Modified', `Details for ${studentName} (Reg ID: ${currentRegId}) were updated.`);

    if (statusChanged && studentDataChanges.sendEmailNotification) {
      const newStatus = updatedRow[header.indexOf(applicationStatusHeaderName)];
      updateApplicationStatus([currentRegId], newStatus);
    }

    return {
      status: 'success',
      message: `Student data for ${currentRegId} updated successfully.`
    };
  } catch (error) {
    Logger.log('Error in updateStudentFullData: ' + error.toString() + error.stack);
    return {
      status: 'error',
      message: 'Error updating student data: ' + error.message
    };
  }
}



// Function generateDocumentAndMail starts here
function generateDocumentAndMailMain(docType, registrationId, sendEmailOption = false, isAdmin = false) {
  try {
    // === FIX: MAP studentAppForm to applicationForm ===
    if (docType === 'studentAppForm') {
      docType = 'applicationForm';
    }

    // === FIX: EARLY CHECK FOR ALREADY GENERATED DOCUMENTS ===
    if (docType === 'applicationForm') {
      const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
      if (docSheet) {
        const docData = docSheet.getDataRange().getValues();
        if (docData.length > 1) {
          const docHeaders = docData[0];
          const regColIdx = docHeaders.indexOf("StudentRegistrationID");
          const typeColIdx = docHeaders.indexOf("DocType");
          const urlColIdx = docHeaders.indexOf("DocUrl");
          if (regColIdx !== -1 && typeColIdx !== -1 && urlColIdx !== -1) {
            for (let i = 1; i < docData.length; i++) {
              if (String(docData[i][regColIdx]).toUpperCase() === String(registrationId).toUpperCase() && docData[i][typeColIdx] === docType) {
                const existingUrl = docData[i][urlColIdx];
                if (existingUrl && existingUrl.toString().trim() !== '') {
                  Logger.log(`Found existing applicationForm for ${registrationId}. Reusing: ${existingUrl}`);
                  return { status: 'success', message: `${docType} fetched from existing records.`, url: existingUrl, driveLink: existingUrl, viewUrl: existingUrl };
                }
              }
            }
          }
        }
      }
    }

    const studentData = getStudentDataForDoc(registrationId);
    if (!studentData) {
      return {
        status: 'error',
        message: `Student with Registration ID ${registrationId} not found.`
      };
    }

    // === DOCUMENT APPROVAL SYSTEM (GSV-ERP-V2) ===
    const restrictedDocs = ['internshipCertificate', 'COMPLETION_CERTIFICATE', 'offerLetter', 'OFFER_LETTER', 'joiningLetter', 'JOINING_LETTER', 'idCard', 'ID_CARD', 'entryPass', 'ENTRY_PASS', 'General Permission', 'Grace Period', 'Emergency Leave'];
    const unrestrictedForStudents = ['studentDiary', 'dailyLogForm5'];

    if (!isAdmin && restrictedDocs.includes(docType) && !unrestrictedForStudents.includes(docType)) {
      const approval = checkDocumentApproval(registrationId, docType);
      if (approval.status !== 'Approved') {
        return {
          status: 'approval_required',
          message: 'Admin approval is required to generate this document.',
          docType: docType,
          approvalStatus: approval.status
        };
      }
    }
    // ===========================================

    if (docType === 'internshipCertificate' && studentData.ApplicationStatus !== 'Completed') {
      return {
        status: 'warning',
        message: `Cannot generate certificate. Internship not yet marked as 'Completed' for ${registrationId}.`
      };
    }

    // Advanced Mapping for dynamically generated System Reports
    const advancedReportMap = {
      'dailyAttendanceReport': 'attendance',
      'attendanceDocument': 'completeAttendanceReport',
      'dailyTaskReport': 'taskCompletion',
      'projectCompletion': 'projectCompletion',
      'studentCV': 'completeStudentReport'
    };

    if (advancedReportMap[docType]) {
      const mappedType = advancedReportMap[docType];
      const startD = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
      const endD = new Date().toISOString().split('T')[0];

      const options = {
        reportScope: 'student',
        studentId: registrationId,
        reportMode: 'duration',
        includeHeader: true,
        includeSignatures: true,
        includeCompanyDetails: true,
        includeTimestamp: true
      };

      const res = generateReport(mappedType, 'custom', startD, endD, sendEmailOption, options);
      if (res && res.status === 'success') {
        return {
          status: 'success',
          message: res.message,
          url: res.url,
          driveLink: res.url
        };
      }
      return res || { status: 'error', message: 'Failed to generate dynamic advanced document.' };
    }

    let templateId = getTemplateIdForDocType(docType);

    if (!templateId) {
      return {
        status: 'error',
        message: `Template ID for ${docType.replace(/([A-Z])/g, ' $1').toLowerCase()} is not configured. Please check Admin Settings.`
      };
    }

    // Generate document reference number: GSV/YY/TYPE/SLNO
    const yearTwoDigit = new Date().getFullYear().toString().slice(-2);
    const slNo = Math.floor(Math.random() * 9000) + 1000;

    let newDocName = `${docType}_${registrationId}_${studentData.LastName || 'Student'}`;
    let subject = `Your ${docType.replace(/([A-Z])/g, ' $1').trim()} from ${COMPANY_NAME}`;
    let bodyText = `Dear ${studentData.FirstName},\n\nPlease find your ${docType.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} attached.\n\n`;

    // Placeholder values - using key names without braces
    let placeholderValues = {
      'FullName': studentData.FullName || '',
      'StudentName': studentData.FullName || '',
      'RegistrationID': studentData.RegistrationID || '',
      'UniversityRegisterNumber': studentData.RegisterNumber || 'N/A',
      'RegisterNumber': studentData.RegisterNumber || 'N/A',
      'EducationType': studentData.EducationType || 'N/A',
      'CollegeCode': studentData.CollegeCode || 'N/A',
      'Address': studentData.Address || 'N/A',
      'Pincode': studentData.Pincode || 'N/A',
      'District': studentData.District || 'N/A',
      'CollegeName': studentData.CollegeName || 'N/A',
      'Department': studentData.Department || 'N/A',
      'DEPARTMENT': studentData.Department || 'N/A',
      'department': studentData.Department || 'N/A',
      'Dept': studentData.Department || 'N/A',
      'InternshipStartDate': studentData.FormattedStartDate || '',
      'InternshipEndDate': studentData.FormattedEndDate || '',
      'DurationDays': studentData.DurationDays || 'N/A',
      'DateofBirth': studentData.FormattedDOB || '',
      'TodayDate': studentData.TodayDate || '',
      'CurrentDate': studentData.TodayDate || '',
      'Current Date': studentData.TodayDate || '',
      'CompanyName': COMPANY_NAME,
      'CompanyContact': COMPANY_CONTACT,
      'CompanyWebsite': COMPANY_WEBSITE,
      'ChiefEngineerName': studentData.ChiefEngineerName || '',
      'ChiefEngineerTitle': studentData.ChiefEngineerTitle || '',
      'ChiefEngineerDetailsPlaceholder': (studentData.ChiefEngineerDetails || '').replace(/<br\s*\/?>/gi, "\n"),
      'YEAR': studentData.Year || 'N/A',
      'Year': studentData.Year || 'N/A',
      'year': studentData.Year || 'N/A',
      'YY': yearTwoDigit,
      'SLNO': slNo.toString(),
      'SkillLearned': studentData.SkillLearned || 'N/A',
      'skilllearned': studentData.SkillLearned || 'N/A',
      'Skill Learned': studentData.SkillLearned || 'N/A',
      'skill learned': studentData.SkillLearned || 'N/A',
      'ProjectTitle': studentData.ProjectTitle || 'N/A',
      'Project Title': studentData.ProjectTitle || 'N/A',
      'project title': studentData.ProjectTitle || 'N/A',
      'Project': studentData.ProjectTitle || 'N/A',
      'Batch': studentData.Batch || 'N/A',
      'BatchName': studentData.Batch || 'N/A',
      'Semester': studentData.Semester || 'N/A',
      'MobileNumber': studentData.MobileNumber || 'N/A',
      'GmailID': studentData.GmailID || 'N/A',
      'Email': studentData.GmailID || 'N/A'
    };

    Logger.log('Placeholder Values for ' + registrationId + ': ' + JSON.stringify(placeholderValues));

    if (docType === 'internshipCertificate') {
      const certSheet = getSheet(SHEET_NAMES.CERTIFICATE_DATA);
      // New Certificate Generation Logic: GSV/YEAR/TYPE/COLLEGE CODE/SLNO
      const certNumber = generateCertificateSerialNumber(studentData, certSheet);

      placeholderValues['CertificateNumber'] = certNumber;
      placeholderValues['IssuedDate'] = studentData.TodayDate;
      newDocName = `InternshipCertificate_${certNumber}_${studentData.LastName}.pdf`;
      subject = `Your Internship Completion Certificate - ${COMPANY_NAME}`;
      bodyText = `Dear ${studentData.FirstName},\n\nCongratulations on successfully completing your internship! Please find your internship certificate attached.\n\nWe wish you all the best for your future endeavors.\n\n`;
    }

    Logger.log(`Attempting to use template ID: ${templateId} for docType: ${docType}`);
    let templateFile;
    try {
      templateFile = DriveApp.getFileById(templateId);
    } catch (e) {
      Logger.log(`Error accessing template file ID ${templateId}: ${e.toString()}`);
      return {
        status: 'error',
        message: `Error accessing template file for ${docType}: ${e.message}. Ensure template ID (${templateId}) is correct, accessible, and not in trash.`
      };
    }

    let targetFolder;
    try {
      if (!CERTIFICATES_FOLDER_ID || CERTIFICATES_FOLDER_ID.includes("YOUR_")) {
        Logger.log("CERTIFICATES_FOLDER_ID is not configured.");
        return {
          status: 'error',
          message: 'Certificates destination folder not configured in script. Contact admin.'
        };
      }
      targetFolder = DriveApp.getFolderById(getSystemFolderId('generated'));
    } catch (e) {
      Logger.log(`Error accessing target folder ID ${CERTIFICATES_FOLDER_ID}: ${e.toString()}`);
      return {
        status: 'error',
        message: `Error accessing destination folder: ${e.message}. Ensure folder ID is correct and script has access.`
      };
    }

    const newFileNameForCopy = `${docType}_${registrationId}_${studentData.LastName || 'Student'}_${new Date().getTime()}`;
    let newFile;
    try {
      newFile = templateFile.makeCopy(newFileNameForCopy, targetFolder);
    } catch (e) {
      Logger.log(`Error making copy of template ${templateId} to folder ${CERTIFICATES_FOLDER_ID}: ${e.toString()}`);
      return {
        status: 'error',
        message: `Failed to copy template: ${e.message}. Check folder permissions and template validity.`
      };
    }

    let doc;
    try {
      doc = DocumentApp.openById(newFile.getId());
    } catch (e) {
      Logger.log(`Error opening copied document ${newFile.getId()}: ${e.toString()}`);
      try {
        newFile.setTrashed(true);
      } catch (trashErr) {
        Logger.log("Failed to trash problematic file copy: " + trashErr);
      }
      return {
        status: 'error',
        message: `Error opening generated document: ${e.message}.`
      };
    }

    const docBody = doc.getBody();

    // === MODERN ALIGNMENT FIX (FOR APPLICATION FORM) ===
    if (docType === 'applicationForm') {
      modernizeApplicationFormLayout(docBody, studentData);
    }

    // Use regex pattern that matches {{placeholder}} with optional spaces
    // Enhanced to handle unbalanced braces like {{Placeholder} or {Placeholder}} 
    for (const placeholderName in placeholderValues) {
      const value = placeholderValues[placeholderName] || '';
      const pattern = '\\{+\\s*' + placeholderName + '\\s*\\}+';
      try {
        docBody.replaceText(pattern, value);
      } catch (e) {
        Logger.log('Error replacing placeholder ' + placeholderName + ': ' + e.toString());
      }
    }

    // --- QR / BARCODE INJECTION LOGIC ---
    try {
      let qrData = "GSV Electrical Enterprises\n";
      qrData += "Name: " + studentData.FullName + "\n";
      qrData += "Reg No: " + registrationId + "\n";
      qrData += "Doc Type: " + docType;

      if (docType === 'internshipCertificate' && placeholderValues['CertificateNumber']) {
        qrData += "\nCert No: " + placeholderValues['CertificateNumber'];
      }

      // 100% Native Zero-API Compressed Barcode (Code 128 Typographic)
      ['BARCODE', 'Barcode', 'QRCode', 'QR_CODE'].forEach(tag => {
        const pattern = '\\{\\{\\s*' + tag + '\\s*\\}\\}';
        let found = docBody.findText(pattern);

        while (found) {
          let textElement = found.getElement().asText();
          let startOffset = found.getStartOffset();
          let endOffset = found.getEndOffsetInclusive();

          textElement.deleteText(startOffset, endOffset);

          let baseStr = String(registrationId).toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '');
          let barcodeText = generateNativelyCompactCode128(baseStr);

          textElement.insertText(startOffset, barcodeText);
          textElement.setFontFamily(startOffset, startOffset + barcodeText.length - 1, "Libre Barcode 128");
          textElement.setFontSize(startOffset, startOffset + barcodeText.length - 1, 36);
          textElement.setBold(startOffset, startOffset + barcodeText.length - 1, false);
          textElement.setItalic(startOffset, startOffset + barcodeText.length - 1, false);

          if (textElement.getParent().getType() === DocumentApp.ElementType.PARAGRAPH) {
            let pa = textElement.getParent().asParagraph();
            pa.setSpacingAfter(0);
            pa.setSpacingBefore(0);
            pa.setLineSpacing(1);
          }

          found = docBody.findText(pattern);
        }
      });
    } catch (qrError) {
      Logger.log('Error generating Native Barcode Font: ' + qrError.toString());
    }

    // --- PAGINATION LOGIC: Form 1, Form 2, Form 3 Alignment (Mandatory New Page) ---
    try {
      const paginationLabels = ["Form-1", "Form 1", "Form-2", "Form 2", "Form-3", "Form 3", "Form-4", "Form 4"];
      paginationLabels.forEach(label => {
        let found = docBody.findText(label);
        while (found) {
          let e = found.getElement();
          let p = e;
          while (p && p.getType() !== DocumentApp.ElementType.PARAGRAPH && p.getType() !== DocumentApp.ElementType.LIST_ITEM) {
            p = p.getParent();
          }
          if (p) {
            try {
              if (p.asParagraph) {
                // If it's Form 1, it only needs a page break if it's not at the very top
                if (label.toLowerCase().includes("form 1") || label.toLowerCase().includes("form-1")) {
                  if (docBody.getChildIndex(p) > 0) p.asParagraph().setPageBreakBefore(true);
                } else {
                  p.asParagraph().setPageBreakBefore(true);
                }
              } else if (p.asListItem) p.asListItem().setPageBreakBefore(true);
            } catch (e) { }
          }
          // Only first occurrence of each label needs to be at top of page for distinct forms
          break;
        }
      });
    } catch (err) { Logger.log("Admin Pagination Error: " + err); }
    // --- END PAGINATION LOGIC ---

    // --- END BARCODE LOGIC ---

    doc.saveAndClose();

    const pdfBlob = newFile.getAs(MimeType.PDF);
    pdfBlob.setName(newDocName);

    if (docType === 'internshipCertificate') {
      const certSheet = getSheet(SHEET_NAMES.CERTIFICATE_DATA);
      if (certSheet) {
        const certHeader = certSheet.getRange("1:1").getValues()[0];
        const certRecord = {
          CertificateNumber: placeholderValues['CertificateNumber'],
          StudentRegistrationID: registrationId,
          StudentName: studentData.FullName,
          RegisterNumber: studentData.RegisterNumber,
          Department: studentData.Department,
          InternshipStartDate: studentData.InternshipStartDate,
          InternshipEndDate: studentData.InternshipEndDate,
          DurationDays: studentData.DurationDays,
          IssuedDate: new Date(),
          Status: 'Valid',
          Batch: studentData.Batch,
          CertificatePdfId: newFile.getId()
        };
        const certRow = certHeader.map(col => certRecord[col] !== undefined ? certRecord[col] : '');
        appendRow(SHEET_NAMES.CERTIFICATE_DATA, certRow);
      } else {
        Logger.log("Certificate Data sheet not found, cannot record certificate issuance.");
      }
    }

    // DriveApp.getFileById(newFile.getId()).setTrashed(true);

    let message = `Document '${newDocName}' generated successfully.`;
    let driveLink = newFile.getUrl();
    let emailActuallySent = false;

    if (sendEmailOption && studentData.GmailID) {
      if (sendEmail(studentData.GmailID, subject, bodyText, bodyText.replace(/\n/g, '<br>'), [pdfBlob])) {
        message += ` Email sent to ${studentData.GmailID}.`;
        logActivity('Document Sent', registrationId, `${docType} sent to ${studentData.FullName}.`);
        emailActuallySent = true;
      } else {
        message += ` Email sending failed for ${studentData.GmailID}. Document generated.`;
        logActivity('Document Generated (Email Fail)', registrationId, `${docType} generated for ${studentData.FullName}, but email failed.`);
      }
    } else if (sendEmailOption && !studentData.GmailID) {
      message += ` Email not sent (student email missing). Document generated.`;
    }

    createAdminNotification('Document Generated', `${docType} for ${studentData.FullName} (Reg ID: ${registrationId}) was generated.`);
    return {
      status: 'success',
      message: message,
      documentName: newDocName,
      driveLink: driveLink,
      emailSent: emailActuallySent
    };

  } catch (error) {
    Logger.log(`Error in generateDocumentAndMail (${docType}, ${registrationId}): ${error.toString()} ${error.stack}`);
    return {
      status: 'error',
      message: `Error generating ${docType}: ${error.message}. Check logs and template/folder permissions.`
    };
  }
}



// Redundant adminMarkAttendance removed


function getAttendanceRecords_DUPLICATE_DISABLED(filterDate, filterStatus, filterRegId) {
  try {
    const attendanceSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (!attendanceSheet) return {
      status: 'success',
      attendanceRecords: []
    };

    const data = attendanceSheet.getDataRange().getValues();
    const records = [];
    if (data.length < 1) return {
      status: 'success',
      attendanceRecords: []
    };
    const header = data[0];
    const regIdCol = header.indexOf("StudentRegistrationID");
    const nameCol = header.indexOf("StudentName");
    const dateCol = header.indexOf("Date");
    const statusCol = header.indexOf("Status");
    const inTimeCol = header.indexOf("InTime");
    const outTimeCol = header.indexOf("OutTime");
    const remarksCol = header.indexOf("Remarks");

    if ([regIdCol, nameCol, dateCol, statusCol, inTimeCol, outTimeCol, remarksCol].includes(-1)) {
      Logger.log("Attendance sheet (get records) header misconfiguration. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Attendance records config error (GAR_H_MM2).',
        attendanceRecords: []
      };
    }

    const formattedFilterDate = filterDate ? formatDate(filterDate) : null;

    for (let i = 1; i < data.length; i++) {
      const record = data[i];
      const recordDate = formatDate(record[dateCol]);
      const recordStatus = record[statusCol];
      const recordRegIdVal = record[regIdCol];

      let match = true;
      if (formattedFilterDate && recordDate !== formattedFilterDate) match = false;
      if (filterStatus && filterStatus !== 'All' && recordStatus !== filterStatus) match = false;
      if (filterRegId && recordRegIdVal && !recordRegIdVal.toUpperCase().includes(filterRegId.toUpperCase())) match = false;

      if (match && recordRegIdVal) {
        records.push({
          date: recordDate,
          registrationId: recordRegIdVal,
          studentName: record[nameCol] || 'N/A',
          status: recordStatus,
          inTime: record[inTimeCol] || 'N/A',
          outTime: record[outTimeCol] || 'N/A',
          remarks: record[remarksCol] || 'N/A'
        });
      }
    }
    records.sort((a, b) => {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      if ((a.studentName || '').toLowerCase() < (b.studentName || '').toLowerCase()) return -1;
      if ((a.studentName || '').toLowerCase() > (b.studentName || '').toLowerCase()) return 1;
      return 0;
    });

    return {
      status: 'success',
      attendanceRecords: records
    };
  } catch (error) {
    Logger.log('Error in getAttendanceRecords: ' + error.toString());
    return {
      status: 'error',
      message: 'Error fetching attendance: ' + error.message,
      attendanceRecords: []
    };
  }
}



/**
 * Unified function to create tasks for students or batches.
 * @param {Object} data - { registrationId, batchName, title, description, dueDate, status, sendEmail }
 */
function createTask(data) {
  // Use LockService to prevent double entries from rapid clicks
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      return { status: 'error', message: 'Another task creation is in progress. Please wait.' };
    }

    const taskSheet = getSheet(SHEET_NAMES.TASKS);
    if (!taskSheet) return { status: 'error', message: 'Task system unavailable.' };

    let targetStudents = [];
    if (data.registrationIds && Array.isArray(data.registrationIds)) {
      targetStudents = data.registrationIds;
    } else if (data.batchName) {
      const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
      const allStudents = getSheetDataAsObjects(regSheet);
      targetStudents = allStudents.filter(s => s.Batch === data.batchName).map(s => s.RegistrationID);
    } else if (data.registrationId) {
      targetStudents = [data.registrationId];
    }

    if (targetStudents.length === 0) {
      return { status: 'error', message: 'No students found for the selected target.' };
    }

    const assignedDate = new Date();
    const header = taskSheet.getRange("1:1").getValues()[0];
    let createdCount = 0;

    targetStudents.forEach(regId => {
      const taskId = generateUniqueId('TASK', taskSheet, 1);
      const taskRecord = {
        TaskID: taskId,
        StudentRegistrationID: regId,
        Title: data.title,
        Description: data.description || '',
        DueDate: formatDate(data.dueDate),
        Status: data.status || 'Pending',
        AssignedDate: assignedDate,
        CompletedDate: ''
      };

      const newRow = header.map(colName => taskRecord[colName] !== undefined ? taskRecord[colName] : '');
      appendRow(SHEET_NAMES.TASKS, newRow);

      createStudentNotification(regId, 'New Task Assigned', `Task: ${data.title}`);
      createdCount++;
    });

    // Clear execution cache so subsequent getAllTasks returns fresh data
    executionCache.delete(SHEET_NAMES.TASKS);

    logActivity('Task Created', `Task "${data.title}" assigned to ${createdCount} student(s). Target: ${data.registrationIds ? data.registrationIds.join(',') : (data.registrationId || data.batchName)}`);

    if (data.sendEmail) {
      targetStudents.forEach(regId => {
        try {
          const student = getStudentDataForDoc(regId);
          if (student && student.GmailID) {
            const emailSubject = `New Task Assigned: ${data.title}`;
            const emailBodyText = `Dear ${student.FirstName},\n\nA new task "${data.title}" has been assigned to you. Due Date: ${formatDateDisplay(data.dueDate)}.\nDescription: ${data.description || 'N/A'}\n\nPlease log in to your portal to view details.`;
            sendEmail(student.GmailID, emailSubject, emailBodyText, emailBodyText.replace(/\n/g, '<br>'));
          }
        } catch (emailErr) {
          Logger.log('Email send error for ' + regId + ': ' + emailErr.toString());
        }
      });
    }

    return { status: 'success', message: `Task assigned to ${createdCount} student(s) successfully.` };
  } catch (error) {
    Logger.log('Error in createTask: ' + error.toString());
    return { status: 'error', message: 'Error creating task: ' + error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Unified function to assign projects to students.
 * @param {Object} data - { studentRegId, title, description, startDate, endDate, status, sendEmail }
 */
function createProject(data) {
  // Use LockService to prevent double entries from rapid clicks
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      return { status: 'error', message: 'Another project creation is in progress. Please wait.' };
    }

    const projectSheet = getSheet(SHEET_NAMES.PROJECTS);
    if (!projectSheet) return { status: 'error', message: 'Project system unavailable.' };

    let targetStudents = [];
    if (data.studentRegIds && Array.isArray(data.studentRegIds)) {
      targetStudents = data.studentRegIds;
    } else if (data.studentRegId || data.registrationId) {
      targetStudents = [data.studentRegId || data.registrationId];
    } else if (data.batchName) {
      const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
      const allStudents = getSheetDataAsObjects(regSheet);
      targetStudents = allStudents.filter(s => s.Batch === data.batchName).map(s => s.RegistrationID);
    }

    if (targetStudents.length === 0) return { status: 'error', message: 'No students selected for assignment.' };

    const assignedDate = new Date();
    const header = projectSheet.getRange("1:1").getValues()[0];
    let createdCount = 0;

    targetStudents.forEach(regId => {
      const projectId = generateUniqueId('PROJ', projectSheet, 1);
      const projectRecord = {
        ProjectID: projectId,
        StudentRegistrationID: regId,
        Title: data.title,
        Description: data.description || '',
        StartDate: formatDate(data.startDate || assignedDate),
        EndDate: data.endDate ? formatDate(data.endDate) : '',
        Status: data.status || 'Planning',
        AssignedDate: assignedDate,
        CompletedDate: ''
      };

      const newRow = header.map(colName => projectRecord[colName] !== undefined ? projectRecord[colName] : '');
      appendRow(SHEET_NAMES.PROJECTS, newRow);

      createStudentNotification(regId, 'New Project Assigned', `Project: ${data.title}`);
      createdCount++;

      if (data.sendEmail) {
        try {
          const student = getStudentDataForDoc(regId);
          if (student && student.GmailID) {
            const emailSubject = `New Project Assigned: ${data.title}`;
            const emailTitle = "New Project Assigned";
            const gradient = "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)";
            const emailHtml = `
              <p style="font-size: 16px; margin-top: 0;">Dear <strong>${student.FirstName || 'Student'}</strong>,</p>
              <p>A new project has been officially assigned to you as part of your internship:</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #2193b0; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #2193b0; font-size: 18px;">${data.title}</h3>
                <p style="margin: 0; font-size: 14px; color: #4a5568;">${data.description || 'No description provided.'}</p>
                <div style="margin-top: 15px; font-size: 13px; color: #718096;">
                  <span><strong>Start Date:</strong> ${formatDate(data.startDate || assignedDate)}</span>
                  ${data.endDate ? `<span style="margin-left: 20px;"><strong>Due Date:</strong> ${formatDate(data.endDate)}</span>` : ''}
                </div>
              </div>
              
              <p>Please log in to your student portal to review the tasks and submit your progress updates.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getPublishedUrl()}" style="background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(33, 147, 176, 0.3);">Go to Student Portal</a>
              </div>
            `;
            sendModernHtmlEmail_(student.GmailID, emailSubject, emailTitle, gradient, emailHtml);
          }
        } catch (emailErr) {
          Logger.log('Email send error for ' + regId + ': ' + emailErr.toString());
        }
      }
    });

    // Clear execution cache so subsequent getAllProjects returns fresh data
    executionCache.delete(SHEET_NAMES.PROJECTS);

    logActivity('Project Assigned', `Project "${data.title}" assigned to ${createdCount} student(s). Target: ${data.batchName || targetStudents.join(',')}`);

    return { status: 'success', message: `Project assigned to ${createdCount} student(s) successfully.` };
  } catch (error) {
    Logger.log('Error in createProject: ' + error.toString());
    return { status: 'error', message: 'Error creating project: ' + error.message };
  } finally {
    lock.releaseLock();
  }
}

function getAllTasks() {
  try {
    // Clear cache to ensure fresh data is returned
    executionCache.delete(SHEET_NAMES.TASKS);
    const sheet = getSheet(SHEET_NAMES.TASKS);
    const data = getSheetDataAsObjects(sheet);

    // Enrich with student names
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const students = getSheetDataAsObjects(regSheet);
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.RegistrationID] = getStudentFullName_(s);
    });

    return {
      status: 'success',
      tasks: data.map(t => ({
        ...t,
        StudentName: studentMap[t.StudentRegistrationID] || 'Unknown'
      }))
    };
  } catch (e) {
    Logger.log('Error in getAllTasks: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function updateTask(taskId, data) {
  try {
    const sheet = getSheet(SHEET_NAMES.TASKS);
    const updated = updateObjectInSheet(sheet, 'TaskID', taskId, {
      Title: data.Title,
      Description: data.Description,
      DueDate: formatDate(data.Deadline || data.DueDate),
      Priority: data.Priority // Note: Schema doesn't have Priority but we can store it in Description if needed, or add field. For now, let's stick to schema.
    });
    return { status: 'success', message: 'Task updated.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteTask(taskId) {
  try {
    deleteRowsByColumnValue(SHEET_NAMES.TASKS, 'TaskID', taskId);
    return { status: 'success', message: 'Task removed.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function closeTask(taskId) {
  try {
    const sheet = getSheet(SHEET_NAMES.TASKS);
    updateObjectInSheet(sheet, 'TaskID', taskId, {
      Status: 'Completed',
      CompletedDate: new Date()
    });
    return { status: 'success', message: 'Task closed.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function setTaskExemption(taskId) {
  try {
    const sheet = getSheet(SHEET_NAMES.TASKS);
    updateObjectInSheet(sheet, 'TaskID', taskId, {
      Status: 'Exempted',
      SubmissionNotes: 'Marked as Exempted by Admin'
    });
    return { status: 'success', message: 'Task marked as Exempted.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getAllProjects() {
  try {
    // Clear cache to ensure fresh data is returned
    executionCache.delete(SHEET_NAMES.PROJECTS);
    const sheet = getSheet(SHEET_NAMES.PROJECTS);
    const data = getSheetDataAsObjects(sheet);

    // Enrich with student names
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const students = getSheetDataAsObjects(regSheet);
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.RegistrationID] = getStudentFullName_(s);
    });

    return {
      status: 'success',
      projects: data.map(p => ({
        ...p,
        StudentName: studentMap[p.StudentRegistrationID] || 'Unknown'
      }))
    };
  } catch (e) {
    Logger.log('Error in getAllProjects: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function getStudentsByBatch(batchName) {
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const data = getSheetDataAsObjects(sheet);
    const filtered = data.filter(s => s.Batch === batchName).map(s => ({
      RegistrationID: s.RegistrationID,
      Name: getStudentFullName_(s),
      Email: s.GmailID
    }));
    return { status: 'success', students: filtered };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function updateProject(projectId, data) {
  try {
    const sheet = getSheet(SHEET_NAMES.PROJECTS);
    updateObjectInSheet(sheet, 'ProjectID', projectId, {
      Title: data.Title,
      Description: data.Description,
      StartDate: formatDate(data.StartDate),
      EndDate: formatDate(data.EndDate),
      Status: data.Status
    });
    return { status: 'success', message: 'Project settings updated.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteProject(projectId) {
  try {
    deleteRowsByColumnValue(SHEET_NAMES.PROJECTS, 'ProjectID', projectId);
    return { status: 'success', message: 'Project assignment removed.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Extends a task's due date by a given number of days.
 * @param {string} taskId - The TaskID to extend.
 * @param {number} days - Number of days to add to the current due date.
 */
function extendTaskDeadline(taskId, days) {
  try {
    const sheet = getSheet(SHEET_NAMES.TASKS);
    if (!sheet) return { status: 'error', message: 'Task sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const taskIdCol = headers.indexOf('TaskID');
    const dueDateCol = headers.indexOf('DueDate');

    if (taskIdCol === -1 || dueDateCol === -1) return { status: 'error', message: 'Required columns not found.' };

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][taskIdCol]).trim() === String(taskId).trim()) {
        let currentDate = data[i][dueDateCol];
        let newDate;
        if (currentDate instanceof Date && !isNaN(currentDate.getTime())) {
          newDate = new Date(currentDate.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
        } else {
          // Try to parse the date string
          const parsed = new Date(currentDate);
          if (!isNaN(parsed.getTime())) {
            newDate = new Date(parsed.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
          } else {
            // If no current date, set from today
            newDate = new Date(Date.now() + (parseInt(days) * 24 * 60 * 60 * 1000));
          }
        }
        sheet.getRange(i + 1, dueDateCol + 1).setValue(formatDate(newDate));
        SpreadsheetApp.flush();
        return { status: 'success', message: `Task deadline extended by ${days} day(s). New deadline: ${formatDate(newDate)}` };
      }
    }
    return { status: 'error', message: 'Task not found.' };
  } catch (e) {
    Logger.log('Error in extendTaskDeadline: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Revokes a task assignment by setting its status to 'Revoked'.
 * @param {string} taskId - The TaskID to revoke.
 */
function revokeTask(taskId) {
  try {
    const sheet = getSheet(SHEET_NAMES.TASKS);
    if (!sheet) return { status: 'error', message: 'Task sheet not found.' };

    updateObjectInSheet(sheet, 'TaskID', taskId, {
      Status: 'Revoked',
      SubmissionNotes: 'Revoked by Admin on ' + formatDate(new Date())
    });
    return { status: 'success', message: 'Task has been revoked successfully.' };
  } catch (e) {
    Logger.log('Error in revokeTask: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Extends a project's end date by a given number of days.
 * @param {string} projectId - The ProjectID to extend.
 * @param {number} days - Number of days to add to the current end date.
 */
function extendProjectDeadline(projectId, days) {
  try {
    const sheet = getSheet(SHEET_NAMES.PROJECTS);
    if (!sheet) return { status: 'error', message: 'Project sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const projectIdCol = headers.indexOf('ProjectID');
    const endDateCol = headers.indexOf('EndDate');

    if (projectIdCol === -1 || endDateCol === -1) return { status: 'error', message: 'Required columns not found.' };

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][projectIdCol]).trim() === String(projectId).trim()) {
        let currentDate = data[i][endDateCol];
        let newDate;
        if (currentDate instanceof Date && !isNaN(currentDate.getTime())) {
          newDate = new Date(currentDate.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
        } else {
          const parsed = new Date(currentDate);
          if (!isNaN(parsed.getTime())) {
            newDate = new Date(parsed.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
          } else {
            newDate = new Date(Date.now() + (parseInt(days) * 24 * 60 * 60 * 1000));
          }
        }
        sheet.getRange(i + 1, endDateCol + 1).setValue(formatDate(newDate));
        SpreadsheetApp.flush();
        return { status: 'success', message: `Project deadline extended by ${days} day(s). New deadline: ${formatDate(newDate)}` };
      }
    }
    return { status: 'error', message: 'Project not found.' };
  } catch (e) {
    Logger.log('Error in extendProjectDeadline: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Revokes a project assignment by setting its status to 'Revoked'.
 * @param {string} projectId - The ProjectID to revoke.
 */
function revokeProject(projectId) {
  try {
    const sheet = getSheet(SHEET_NAMES.PROJECTS);
    if (!sheet) return { status: 'error', message: 'Project sheet not found.' };

    updateObjectInSheet(sheet, 'ProjectID', projectId, {
      Status: 'Revoked',
      SubmissionNotes: 'Revoked by Admin on ' + formatDate(new Date())
    });
    return { status: 'success', message: 'Project has been revoked successfully.' };
  } catch (e) {
    Logger.log('Error in revokeProject: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Closes a project by setting its status to 'Completed'.
 * @param {string} projectId - The ProjectID to close.
 */
function closeProject(projectId) {
  try {
    const sheet = getSheet(SHEET_NAMES.PROJECTS);
    if (!sheet) return { status: 'error', message: 'Project sheet not found.' };

    updateObjectInSheet(sheet, 'ProjectID', projectId, {
      Status: 'Completed',
      CompletedDate: new Date()
    });
    return { status: 'success', message: 'Project marked as Completed.' };
  } catch (e) {
    Logger.log('Error in closeProject: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Extends task deadlines for ALL tasks assigned to students in a given batch.
 * @param {string} batchName - The batch name.
 * @param {number} days - Number of days to extend.
 */
function extendBatchTaskDeadline(batchName, days) {
  try {
    if (!batchName || !days) return { status: 'error', message: 'Batch name and days are required.' };

    // Get all student registration IDs in this batch
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const students = getSheetDataAsObjects(regSheet);
    const batchStudentIds = new Set(
      students.filter(s => s.Batch === batchName).map(s => String(s.RegistrationID).trim().toUpperCase())
    );

    if (batchStudentIds.size === 0) return { status: 'error', message: 'No students found in batch "' + batchName + '".' };

    const sheet = getSheet(SHEET_NAMES.TASKS);
    if (!sheet) return { status: 'error', message: 'Task sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdCol = headers.indexOf('StudentRegistrationID');
    const dueDateCol = headers.indexOf('DueDate');

    if (regIdCol === -1 || dueDateCol === -1) return { status: 'error', message: 'Required columns not found.' };

    let extendedCount = 0;
    const daysMs = parseInt(days) * 24 * 60 * 60 * 1000;

    for (let i = 1; i < data.length; i++) {
      const rowRegId = String(data[i][regIdCol] || '').trim().toUpperCase();
      if (batchStudentIds.has(rowRegId)) {
        let currentDate = data[i][dueDateCol];
        let newDate;
        if (currentDate instanceof Date && !isNaN(currentDate.getTime())) {
          newDate = new Date(currentDate.getTime() + daysMs);
        } else {
          const parsed = new Date(currentDate);
          newDate = !isNaN(parsed.getTime()) ? new Date(parsed.getTime() + daysMs) : new Date(Date.now() + daysMs);
        }
        sheet.getRange(i + 1, dueDateCol + 1).setValue(formatDate(newDate));
        extendedCount++;
      }
    }
    SpreadsheetApp.flush();

    return { status: 'success', message: `Extended deadline by ${days} day(s) for ${extendedCount} task(s) in batch "${batchName}".` };
  } catch (e) {
    Logger.log('Error in extendBatchTaskDeadline: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Extends project deadlines for ALL projects assigned to students in a given batch.
 * @param {string} batchName - The batch name.
 * @param {number} days - Number of days to extend.
 */
function extendBatchProjectDeadline(batchName, days) {
  try {
    if (!batchName || !days) return { status: 'error', message: 'Batch name and days are required.' };

    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const students = getSheetDataAsObjects(regSheet);
    const batchStudentIds = new Set(
      students.filter(s => s.Batch === batchName).map(s => String(s.RegistrationID).trim().toUpperCase())
    );

    if (batchStudentIds.size === 0) return { status: 'error', message: 'No students found in batch "' + batchName + '".' };

    const sheet = getSheet(SHEET_NAMES.PROJECTS);
    if (!sheet) return { status: 'error', message: 'Project sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdCol = headers.indexOf('StudentRegistrationID');
    const endDateCol = headers.indexOf('EndDate');

    if (regIdCol === -1 || endDateCol === -1) return { status: 'error', message: 'Required columns not found.' };

    let extendedCount = 0;
    const daysMs = parseInt(days) * 24 * 60 * 60 * 1000;

    for (let i = 1; i < data.length; i++) {
      const rowRegId = String(data[i][regIdCol] || '').trim().toUpperCase();
      if (batchStudentIds.has(rowRegId)) {
        let currentDate = data[i][endDateCol];
        let newDate;
        if (currentDate instanceof Date && !isNaN(currentDate.getTime())) {
          newDate = new Date(currentDate.getTime() + daysMs);
        } else {
          const parsed = new Date(currentDate);
          newDate = !isNaN(parsed.getTime()) ? new Date(parsed.getTime() + daysMs) : new Date(Date.now() + daysMs);
        }
        sheet.getRange(i + 1, endDateCol + 1).setValue(formatDate(newDate));
        extendedCount++;
      }
    }
    SpreadsheetApp.flush();

    return { status: 'success', message: `Extended deadline by ${days} day(s) for ${extendedCount} project(s) in batch "${batchName}".` };
  } catch (e) {
    Logger.log('Error in extendBatchProjectDeadline: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function sendChatMessage(senderName, senderId, receiverId, message, fileId, fileName, fileUrl) {
  try {
    const chatSheet = getSheet(SHEET_NAMES.CHAT_MESSAGES);
    if (!chatSheet) {
      Logger.log(`ChatMessages sheet does not exist (SCM2).`);
      return { status: 'error', message: 'Chat service temporarily unavailable.' };
    }
    const messageId = generateUniqueId('MSG', chatSheet, 1);
    const timestamp = new Date();
    const header = chatSheet.getRange("1:1").getValues()[0];

    const chatRecord = {
      MessageID: messageId,
      SenderID: senderId,
      ReceiverID: receiverId,
      Message: message,
      Timestamp: timestamp,
      IsReadByReceiver: false,
      FileID: fileId || '',
      FileName: fileName || '',
      FileUrl: fileUrl || ''
    };
    const newRow = header.map(colName => chatRecord[colName] !== undefined ? chatRecord[colName] : '');
    appendRow(SHEET_NAMES.CHAT_MESSAGES, newRow);

    let notifTitle, notifMessage;
    const sIdClean = String(senderId || "").trim().toUpperCase();
    if (sIdClean === 'ADMIN' || sIdClean === 'ADMIN_USER_ID') {
      // Student gets notified
      notifTitle = `New Message from GSV Admin`;
      notifMessage = `${message.substring(0, 30)}${message.length > 30 ? '...' : ''} ${fileName ? '(Attachment: ' + fileName + ')' : ''}`;
      createStudentNotification(receiverId, notifTitle, notifMessage);
    } else {
      notifTitle = `New Message from ${senderName || senderId}`;
      notifMessage = `${message.substring(0, 30)}${message.length > 30 ? '...' : ''} ${fileName ? '(Attachment: ' + fileName + ')' : ''}`;
      createAdminNotification(notifTitle, notifMessage);
    }
    logActivity('Chat Message Sent', senderId, `Message to ${receiverId}: ${message.substring(0, 30)}... ${fileName ? 'File: ' + fileName : ''}`);
    return { status: 'success', message: 'Message sent.' };
  } catch (error) {
    Logger.log('Error in sendChatMessage: ' + error.toString());
    return { status: 'error', message: 'Error sending message: ' + error.message };
  }
}

function getChatMessages(user1Id, user2Id) {
  try {
    const chatSheet = getSheet(SHEET_NAMES.CHAT_MESSAGES);
    if (!chatSheet) return {
      status: 'success',
      messages: []
    };

    const data = chatSheet.getDataRange().getValues();
    const messages = [];
    if (data.length < 1) return {
      status: 'success',
      messages: []
    };
    const header = data[0];
    const senderCol = header.indexOf("SenderID");
    const receiverCol = header.indexOf("ReceiverID");
    const msgCol = header.indexOf("Message");
    const tsCol = header.indexOf("Timestamp");
    const readCol = header.indexOf("IsReadByReceiver");
    const fileIdCol = header.indexOf("FileID");
    const fileNameCol = header.indexOf("FileName");
    const fileUrlCol = header.indexOf("FileUrl");

    if ([senderCol, receiverCol, msgCol, tsCol, readCol, fileIdCol, fileNameCol, fileUrlCol].includes(-1)) {
      Logger.log("Chat messages sheet header misconfiguration (GCM2). Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Chat system config error (GCM2_H_MM).',
        messages: []
      };
    }

    let unreadMessagesIndicesToUpdate = [];

    for (let i = 1; i < data.length; i++) {
      const sender = data[i][senderCol];
      const receiver = data[i][receiverCol];
      if ((sender === user1Id && receiver === user2Id) || (sender === user2Id && receiver === user1Id)) {
        if (data[i][tsCol]) {
          messages.push({
            senderId: sender,
            receiverId: receiver,
            message: data[i][msgCol],
            timestamp: new Date(data[i][tsCol]).toISOString(),
            fileId: data[i][fileIdCol] || null,
            fileName: data[i][fileNameCol] || null,
            fileUrl: data[i][fileUrlCol] || null
          });
          if (receiver === user1Id && (data[i][readCol] === false || data[i][readCol] === 'FALSE' || data[i][readCol] === '')) {
            unreadMessagesIndicesToUpdate.push(i + 1);
          }
        }
      }
    }
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (unreadMessagesIndicesToUpdate.length > 0 && readCol !== -1) {
      const readColIdxForSheet = readCol + 1;
      unreadMessagesIndicesToUpdate.forEach(rowIndex => {
        chatSheet.getRange(rowIndex, readColIdxForSheet).setValue(true);
      });
      SpreadsheetApp.flush();
    }
    return {
      status: 'success',
      messages: messages
    };
  } catch (error) {
    Logger.log('Error in getChatMessages: ' + error.toString() + error.stack);
    return {
      status: 'error',
      message: 'Error fetching messages: ' + error.message,
      messages: []
    };
  }
}

function uploadChatFile(arg1, arg2, arg3, arg4) {
  try {
    const chatFolderId = getSystemFolderId('chat');
    if (!chatFolderId || chatFolderId.includes("YOUR_")) {
      return { status: 'error', message: 'Chat attachments folder not configured.' };
    }

    let senderId, targetId, type, fileData;
    // Check if called from Admin Dashboard (fileData, targetId)
    if (typeof arg1 === 'object' && (arg1.data || arg1.base64)) {
      fileData = arg1;
      targetId = arg2;
      senderId = 'Admin';
      // We'll detect type based on targetId? No, better to default to private or handle if batch.
      // For AdminDashboard, targetId is either RegID or BatchName.
      // Let's check if targetId starts with "GSV/"
      type = (String(targetId).startsWith('GSV/')) ? 'private' : 'batch';
    } else {
      // Called from Student Dashboard (senderId, targetId, type, fileData)
      senderId = arg1;
      targetId = arg2;
      type = arg3;
      fileData = arg4;
    }

    // 1. Upload the file
    const base64Data = fileData.base64 || fileData.data || fileData.content;
    const decodedContent = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedContent, fileData.type || fileData.mimeType, fileData.name || fileData.fileName);
    const folder = DriveApp.getFolderById(getSystemFolderId('chat'));
    const driveFile = folder.createFile(blob);
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = driveFile.getUrl();
    const fileName = driveFile.getName();
    const fileId = driveFile.getId();

    // 2. Save the message record
    let senderName = senderId;
    if (senderId !== 'Admin') {
      const studentResp = getStudentFullData(senderId);
      if (studentResp.status === 'success') {
        const s = studentResp.studentData;
        senderName = `${s.FirstName || ''} ${s.LastName || ''}`.trim() || senderId;
      }
    }

    if (type === 'batch') {
      return sendBatchMessage(targetId, senderId, senderName, `Sent a file: ${fileName}`, { base64: null, url: fileUrl, name: fileName, id: fileId });
    } else {
      return sendChatMessage(senderName, senderId, targetId, `Sent a file: ${fileName}`, fileId, fileName, fileUrl);
    }
  } catch (e) {
    Logger.log('Error in uploadChatFile: ' + e.toString());
    return { status: 'error', message: e.message };
  }
}





// LEGACY generateReport removed. Comprehensive version is at line ~13000+.


function generateODLetter(regId, date, reason) {
  try {
    const student = getStudentDataForDoc(regId);
    if (!student) return { status: 'error', message: 'Student not found' };

    const header = getReportBrandingHeader("ON-DUTY (OD) REQUEST LETTER");
    const html = `
      <html>
      <head><style>
        body { font-family: 'Arial', sans-serif; padding: 40px; line-height: 1.6; }
        .content { margin-top: 30px; }
        .date { text-align: right; margin-bottom: 20px; }
        .signature { margin-top: 50px; }
        .student-details { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0; }
      </style></head>
      <body>
        ${header}
        <div class="date">Date: ${new Date().toLocaleDateString()}</div>
        <div class="content">
          <p>To,<br>The Principal / HOD,<br>${student.CollegeName}</p>
          <p><strong>Subject: Request for On-Duty (OD) Permission for Internship</strong></p>
          <p>Respected Sir/Madam,</p>
          <p>This is to certify that the following student is currently undergoing an internship program at <strong>G.S.V Electrical Enterprises</strong>. The student is required to be present at our facility/site for project-related work on <strong>${date}</strong>.</p>
          
          <div class="student-details">
            <strong>Name:</strong> ${student.FullName}<br>
            <strong>Reg ID:</strong> ${student.RegistrationID}<br>
            <strong>Register No:</strong> ${student.RegisterNumber}<br>
            <strong>Department:</strong> ${student.Department}<br>
            <strong>Project:</strong> ${student.ProjectTitle || 'N/A'}
          </div>

          <p>We kindly request you to grant On-Duty (OD) permission for the aforementioned date to enable the student to complete their internship requirements.</p>
          
          <p>Thanking you,</p>
          
          <div class="signature">
            <p>Yours faithfully,<br><strong>For G.S.V Electrical Enterprises</strong></p>
            <br><br>
            <p><strong>Authorized Signatory</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
    const blob = Utilities.newBlob(html, 'text/html', 'od_temp.html');
    const pdf = blob.getAs('application/pdf').setName(`OD_Letter_${regId}.pdf`);
    const file = folder.createFile(pdf);
    return { status: 'success', message: 'OD Letter generated.', url: file.getUrl() };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}


function logoutAdmin() {
  logActivity('Admin Logout', 'Admin', 'Admin logged out.');
  return {
    status: 'success',
    message: 'Logged out successfully.'
  };
}

// Redundant studentLogout removed

function getAdminProfile() {
  try {
    const adminSheet = getSheet(SHEET_NAMES.ADMIN_CREDENTIALS);
    if (!adminSheet) return {
      status: 'error',
      message: 'Admin data not found.'
    };
    const data = adminSheet.getDataRange().getValues();
    if (data.length < 2) return {
      status: 'error',
      message: 'No admin configured.'
    };

    const header = data[0];
    const adminRecord = data[1];

    const cols = {
      adminId: header.indexOf("AdminID"),
      name: header.indexOf("Name"),
      email: header.indexOf("Email"),
      lastLogin: header.indexOf("LastLogin")
    };
    if (Object.values(cols).some(val => val === -1)) {
      Logger.log("Admin profile column name mismatch in getAdminProfile. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Admin profile config error (GAP_H_MM).'
      };
    }

    return {
      status: 'success',
      adminData: {
        adminId: adminRecord[cols.adminId],
        name: adminRecord[cols.name],
        email: adminRecord[cols.email],
        lastLogin: adminRecord[cols.lastLogin] ? new Date(adminRecord[cols.lastLogin]).toISOString() : null
      }
    };
  } catch (error) {
    Logger.log('Error in getAdminProfile: ' + error.toString());
    return {
      status: 'error',
      message: 'Error fetching admin profile: ' + error.message
    };
  }
}

function updateAdminProfile(profileData) {
  try {
    const adminSheet = getSheet(SHEET_NAMES.ADMIN_CREDENTIALS);
    if (!adminSheet) return {
      status: 'error',
      message: 'Admin data service unavailable.'
    };

    const data = adminSheet.getDataRange().getValues();
    const header = data[0];
    const adminIdCol = header.indexOf("AdminID");
    const passwordCol = header.indexOf("Password");
    const nameCol = header.indexOf("Name");
    const emailCol = header.indexOf("Email");
    const lastLoginCol = header.indexOf("LastLogin");
    const adminRowIndex = 2;

    if (adminRowIndex > data.length) return {
      status: 'error',
      message: 'Admin record not found for update.'
    };

    if (profileData.currentPassword && data[adminRowIndex - 1][passwordCol] !== profileData.currentPassword) {
      return {
        status: 'error',
        message: 'Incorrect current password. Profile not updated.'
      };
    }

    adminSheet.getRange(adminRowIndex, nameCol + 1).setValue(profileData.name);
    adminSheet.getRange(adminRowIndex, emailCol + 1).setValue(profileData.email);
    SpreadsheetApp.flush();

    logActivity('Admin Profile Update', data[adminRowIndex - 1][adminIdCol], 'Admin profile details updated.');
    return {
      status: 'success',
      message: 'Admin profile updated successfully.',
      adminData: {
        adminId: data[adminRowIndex - 1][adminIdCol],
        name: profileData.name,
        email: profileData.email,
        lastLogin: data[adminRowIndex - 1][lastLoginCol] ? new Date(data[adminRowIndex - 1][lastLoginCol]).toISOString() : null
      }
    };
  } catch (error) {
    Logger.log('Error in updateAdminProfile: ' + error.toString());
    return {
      status: 'error',
      message: 'Failed to update admin profile: ' + error.message
    };
  }
}

function changeAdminPassword(currentPassword, newPassword) {
  try {
    const adminSheet = getSheet(SHEET_NAMES.ADMIN_CREDENTIALS);
    if (!adminSheet) return {
      status: 'error',
      message: 'Admin data service unavailable.'
    };

    const data = adminSheet.getDataRange().getValues();
    const header = data[0];
    const adminIdCol = header.indexOf("AdminID");
    const passwordCol = header.indexOf("Password");
    const adminRowIndex = 2;

    if (adminRowIndex > data.length) return {
      status: 'error',
      message: 'Admin record not found.'
    };

    if (data[adminRowIndex - 1][passwordCol] !== currentPassword) {
      return {
        status: 'error',
        message: 'Incorrect current password.'
      };
    }
    if (newPassword.length < 8) {
      return {
        status: 'error',
        message: 'New password must be at least 8 characters long.'
      };
    }

    adminSheet.getRange(adminRowIndex, passwordCol + 1).setValue(newPassword);
    SpreadsheetApp.flush();

    logActivity('Admin Password Change', data[adminRowIndex - 1][adminIdCol], 'Admin password changed.');
    return {
      status: 'success',
      message: 'Password changed successfully.'
    };
  } catch (error) {
    Logger.log('Error in changeAdminPassword: ' + error.toString());
    return {
      status: 'error',
      message: 'Failed to change password: ' + error.message
    };
  }
}



// =================================================================================
// APP SETTINGS FUNCTIONS
// =================================================================================
function getAppSettings(regId = null) {
  SpreadsheetApp.flush();
  const settings = {};
  const appSettingsSheet = getSheet(SHEET_NAMES.APP_SETTINGS);
  if (appSettingsSheet) {
    const data = appSettingsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || '').trim();
      if (key) {
        settings[key] = data[i][1];
      }
    }
    Logger.log("Raw settings from sheet: " + JSON.stringify(settings));
  }

  // Overlay Switch_Status values for persistence
  const switchRes = getAllSwitchStatuses();
  if (switchRes.status === 'success') {
    const isValueOn = (v) => {
      if (typeof v === 'boolean') return v;
      if (!v) return false;
      const s = String(v).toUpperCase();
      return s === 'ON' || s === 'TRUE' || s === '1' || s === 'AUTO';
    };
    const sw = switchRes.data;

    if (sw['settingCertificateTriggerMode']) settings['CertificateTriggerMode'] = isValueOn(sw['settingCertificateTriggerMode']) ? 'Auto' : 'Manual';
    if (sw['settingDefaultSlotEnabled']) settings['DefaultSlotAssignment'] = isValueOn(sw['settingDefaultSlotEnabled']) ? 'Auto' : 'Manual';
    if (sw['rfidAutomationToggle']) settings['RFID_Automation_Mode'] = isValueOn(sw['rfidAutomationToggle']) ? 'Auto' : 'Manual';
  }

  for (const key in TEMPLATE_IDS) {
    const settingKey = key.charAt(0).toLowerCase() + key.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase()) + 'TemplateId';
    if (!settings[settingKey]) {
      // settings[settingKey] = TEMPLATE_IDS[key]; // Keep commented if AppSettings sheet is sole source
    }
  }
  settings['defaultAdminEmail'] = ADMIN_EMAIL_ID;
  if (!settings['RFID_Automation_Mode']) settings['RFID_Automation_Mode'] = 'Manual';
  if (!settings['DefaultSlotAssignment']) settings['DefaultSlotAssignment'] = 'Manual';
  if (!settings['CertificateTriggerMode']) settings['CertificateTriggerMode'] = 'Manual';

  // If Default Slot Assignment is Auto, fetch system-wide default from SLOT_SETTINGS
  if (settings['DefaultSlotAssignment'] === 'Auto') {
    try {
      const slotSettingsSheet = getSheet(SHEET_NAMES.SLOT_SETTINGS);
      if (slotSettingsSheet) {
        const slotSettings = getSheetDataAsObjects(slotSettingsSheet);
        const defaultSlot = slotSettings.find(s => String(s.type).toUpperCase() === 'DEFAULT' && String(s.enabled).toLowerCase() !== 'false');
        if (defaultSlot) {
          if (defaultSlot.start_time) settings['ArrivalSlotStart'] = defaultSlot.start_time;
          if (defaultSlot.end_time) settings['ArrivalSlotEnd'] = defaultSlot.end_time;
        }
      }
    } catch (e) { Logger.log("Error loading default slot from SLOT_SETTINGS: " + e.message); }
  }

  // If regId is provided, attempt to override with Batch-specific slot timing
  if (regId) {
    try {
      const studentResp = getStudentFullData(regId);
      if (studentResp.status === 'success' && studentResp.studentData) {
        const student = studentResp.studentData;
        if (student.Batch) {
          const batchSheet = getSheet(SHEET_NAMES.BATCHES);
          if (batchSheet) {
            const batchData = getSheetDataAsObjects(batchSheet);
            const batch = batchData.find(b => b.BatchName === student.Batch);
            if (batch) {
              // 1. Base fallback from Batch
              if (batch.SlotStartTime) settings['ArrivalSlotStart'] = batch.SlotStartTime;
              if (batch.SlotEndTime) settings['ArrivalSlotEnd'] = batch.SlotEndTime;

              const today = new Date();
              const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const currentDow = dowNames[today.getDay()];
              const todayStr = formatDate(today);

              // 2. Override from SLOTS sheet
              try {
                const slotsSheet = getSheet(SHEET_NAMES.SLOTS);
                if (slotsSheet) {
                  const slotsData = getSheetDataAsObjects(slotsSheet);
                  const todaySlot = slotsData.find(s =>
                    String(s.BatchID) === String(batch.BatchID) &&
                    (String(s.DayOfWeek) === currentDow || String(s.DayOfWeek) === 'All') &&
                    String(s.Status) !== 'Inactive'
                  );
                  if (todaySlot) {
                    if (todaySlot.StartTime) settings['ArrivalSlotStart'] = todaySlot.StartTime;
                    if (todaySlot.EndTime) settings['ArrivalSlotEnd'] = todaySlot.EndTime;
                  }
                }
              } catch (e) { Logger.log("Error reading SLOTS: " + e.message); }

              // 3. Override from SLOT_EXCEPTIONS sheet
              try {
                const excSheet = getSheet(SHEET_NAMES.SLOT_EXCEPTIONS);
                if (excSheet) {
                  const excData = getSheetDataAsObjects(excSheet);
                  const myExc = excData.find(e =>
                    String(e.BatchID) === String(batch.BatchID) &&
                    formatDate(new Date(e.ExceptionDate)) === todayStr &&
                    String(e.Status) !== 'Inactive'
                  );
                  if (myExc) {
                    if (myExc.StartTime) settings['ArrivalSlotStart'] = myExc.StartTime;
                    if (myExc.EndTime) settings['ArrivalSlotEnd'] = myExc.EndTime;
                  }
                }
              } catch (e) { Logger.log("Error reading SLOT_EXCEPTIONS: " + e.message); }
            }
          }
        }
      }
    } catch (e) {
      Logger.log("Error fetching batch slot timing override: " + e.toString());
    }
  }

  Logger.log("Fetched App Settings: " + JSON.stringify(settings));
  return {
    status: 'success',
    settings: settings
  };
}

function saveAppSettings(newSettings) {
  try {
    const appSettingsSheet = getSheet(SHEET_NAMES.APP_SETTINGS);
    if (!appSettingsSheet) {
      return {
        status: 'error',
        message: 'App Settings sheet not found.'
      };
    }
    const data = appSettingsSheet.getDataRange().getValues();
    const settingsMap = new Map();
    const rowsToDelete = [];

    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || '').trim();
      if (key) {
        if (settingsMap.has(key)) {
          rowsToDelete.push(i + 1);
        } else {
          settingsMap.set(key, {
            value: data[i][1],
            row: i + 1
          });
        }
      }
    }

    // Delete duplicates in reverse order
    if (rowsToDelete.length > 0) {
      rowsToDelete.sort((a, b) => b - a).forEach(row => appSettingsSheet.deleteRow(row));
      // Re-map after deletion to ensure row indices are correct
      return saveAppSettings(newSettings); // Recursive call to re-process clean sheet
    }

    for (let rawKey in newSettings) {
      if (newSettings.hasOwnProperty(rawKey)) {
        const key = rawKey.trim();
        const value = newSettings[rawKey];
        if (settingsMap.has(key)) {
          const existing = settingsMap.get(key);
          if (String(existing.value) !== String(value)) {
            appSettingsSheet.getRange(existing.row, 2).setValue(value);
          }
        } else {
          appSettingsSheet.appendRow([key, value]);
          settingsMap.set(key, { value: value, row: appSettingsSheet.getLastRow() }); // Prevent duplicate append in same loop
        }
      }
    }
    SpreadsheetApp.flush();
    logActivity('App Settings Update', 'Admin', 'Application settings updated.');
    return {
      status: 'success',
      message: 'App settings saved successfully.'
    };
  } catch (error) {
    Logger.log('Error in saveAppSettings: ' + error.toString());
    return {
      status: 'error',
      message: 'Failed to save app settings: ' + error.message
    };
  }
}

// Redundant getTemplateIdForDocType removed

// End of Admin Dashboard Backend Functions

function saveManualDocTemplate(name, id) {
  try {
    const key = `MANUAL_TPL_${name}`;
    return saveAppSettings({ [key]: id });
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getManualDocTemplates() {
  try {
    const res = getAppSettings();
    if (res.status === 'success') {
      const templates = [];
      for (const key in res.settings) {
        if (key.startsWith('MANUAL_TPL_')) {
          templates.push({
            name: key.replace('MANUAL_TPL_', ''),
            id: res.settings[key]
          });
        }
      }
      return { status: 'success', templates: templates };
    }
    return res;
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function removeManualDocTemplate(name) {
  try {
    const appSettingsSheet = getSheet(SHEET_NAMES.APP_SETTINGS);
    if (!appSettingsSheet) return { status: 'error', message: 'Settings sheet not found' };

    const data = appSettingsSheet.getDataRange().getValues();
    const keyToDelete = `MANUAL_TPL_${name}`;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === keyToDelete) {
        appSettingsSheet.deleteRow(i + 1);
        return { status: 'success', message: 'Template removed' };
      }
    }
    return { status: 'error', message: 'Template not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}



/**
 * Verifies student login credentials. This function is called from the client-side.
 * It uses a clearer parameter name to avoid confusion.
 * @param {string} mobile - The student's mobile number.
 * @param {string} uniRegisterNo - The student's university register number.
 * @returns {object} A result object from the studentLogin function.
 */
function verifyStudentLogin(mobile, uniRegisterNo) {
  // Calls studentLogin, passing the university register number as the primary ID to check.
  return studentLogin(uniRegisterNo, mobile);
}


function getStudentTodayAttendance(registrationId) {
  Logger.log(`getStudentTodayAttendance called for: ${registrationId}`);
  try {
    const attendanceSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (!attendanceSheet) return {
      status: 'info',
      message: 'Attendance data not available.',
      attendance: {
        Status: 'Absent',
        InTime: null,
        OutTime: null
      }
    };

    const data = attendanceSheet.getDataRange().getValues();
    if (data.length < 1) return {
      status: 'success',
      attendance: {
        Status: 'Absent',
        InTime: null,
        OutTime: null
      }
    };
    const header = data[0];
    const regIdCol = header.indexOf("StudentRegistrationID");
    const dateCol = header.indexOf("Date");
    const statusCol = header.indexOf("Status");
    const inTimeCol = header.indexOf("InTime");
    const outTimeCol = header.indexOf("OutTime");
    const todayStr = formatDate(new Date());

    if ([regIdCol, dateCol, statusCol, inTimeCol, outTimeCol].includes(-1)) {
      Logger.log("Student today attendance header misconfiguration. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Attendance system (student) config error (GSTA_H_MM2).'
      };
    }

    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][regIdCol] === registrationId && formatDate(data[i][dateCol]) === todayStr) {
        return {
          status: 'success',
          attendance: {
            Status: data[i][statusCol],
            InTime: data[i][inTimeCol] || null,
            OutTime: data[i][outTimeCol] || null
          }
        };
      }
    }
    return {
      status: 'success',
      attendance: {
        Status: 'Absent',
        InTime: null,
        OutTime: null
      }
    };
  } catch (error) {
    Logger.log('Error in getStudentTodayAttendance: ' + error.toString());
    return {
      status: 'error',
      message: 'Error fetching attendance: ' + error.message
    };
  }
}


function requestAdminAttendanceOtp(registrationId, studentName, actionType) {
  Logger.log(`requestAdminAttendanceOtp called by ${studentName} (${registrationId}) for action: ${actionType}`);
  try {
    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    if (!otpSheet) return {
      status: 'error',
      message: 'OTP service unavailable (sheet missing RAOTP).'
    };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTimestamp = new Date(new Date().getTime() + 5 * 60000);

    const data = otpSheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    const regCol = headers.indexOf('RegistrationID');
    const typeCol = headers.indexOf('ActionType');

    // Delete old OTP entries for this student/action combo
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][regCol] === registrationId && data[i][typeCol] === actionType) {
        otpSheet.deleteRow(i + 1);
      }
    }

    // Build row using header mapping
    const id = 'OTP-' + new Date().getTime();
    const rowData = headers.map(h => {
      switch (h) {
        case 'ID': return id;
        case 'RegistrationID': return registrationId;
        case 'OTP': return otp;
        case 'ActionType': return actionType;
        case 'ExpiryTimestamp': return expiryTimestamp;
        case 'TargetDate': return new Date();
        case 'Reason': return `OTP request for ${actionType}`;
        case 'Status': return 'OTP Sent';
        case 'LeaveType': return '';
        case 'AttachmentUrl': return '';
        default: return '';
      }
    });
    otpSheet.appendRow(rowData);
    SpreadsheetApp.flush();

    const subject = `Attendance OTP Request for ${studentName} (${actionType.toUpperCase()})`;
    const body = `Student ${studentName} (Reg ID: ${registrationId}) is requesting to mark attendance (${actionType.toUpperCase()}).\n\nThe OTP is: ${otp}\n\nThis OTP is valid for 5 minutes. Please provide this to the student if you approve.`;

    sendEmail(ADMIN_EMAIL_ID, subject, body, body.replace(/\n/g, "<br>"));
    logActivity('OTP Requested', registrationId, `Student requested OTP for attendance (${actionType}). OTP: ${otp} sent to admin.`);

    return {
      status: 'success',
      message: `An OTP has been sent to the admin's email (${ADMIN_EMAIL_ID}). Please get the OTP from the admin.`
    };
  } catch (error) {
    Logger.log('Error in requestAdminAttendanceOtp: ' + error.toString());
    return {
      status: 'error',
      message: 'Error requesting OTP: ' + error.message
    };
  }
}


function verifyAdminAttendanceOtp(registrationId, otp, actionType) {
  Logger.log(`verifyAdminAttendanceOtp called by ${registrationId}, OTP: ${otp}, Action: ${actionType}`);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    if (!otpSheet) return {
      status: 'error',
      message: 'OTP service unavailable (sheet missing VAOTP2).'
    };

    const otpData = otpSheet.getDataRange().getValues();
    let otpRowIndex = -1;
    let foundOtpRecord = null;

    for (let i = otpData.length - 1; i >= 1; i--) {
      if (otpData[i][0] === registrationId && otpData[i][1].toString() === otp && otpData[i][2] === actionType) {
        foundOtpRecord = otpData[i];
        otpRowIndex = i + 1;
        break;
      }
    }

    if (!foundOtpRecord) {
      return {
        status: 'error',
        message: 'Invalid OTP. Please try again or request a new one.'
      };
    }

    const expiryTimestamp = new Date(foundOtpRecord[3]);
    if (new Date() > expiryTimestamp) {
      otpSheet.deleteRow(otpRowIndex);
      return {
        status: 'error',
        message: 'OTP has expired. Please request a new one.'
      };
    }

    const attendanceSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (!attendanceSheet) return {
      status: 'error',
      message: 'Attendance system unavailable (sheet missing VAOTP_ATT2).'
    };

    const attData = attendanceSheet.getDataRange().getValues();
    const header = attData[0];
    const studentInfo = getStudentDataForDoc(registrationId);
    const studentName = studentInfo ? studentInfo.FullName : registrationId;
    const studentEmail = studentInfo ? studentInfo.GmailID : null;
    const todayStr = formatDate(new Date());
    const currentTimeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let existingAttRowIndex = -1;
    const regIdColAtt = header.indexOf("StudentRegistrationID");
    const dateColAtt = header.indexOf("Date");
    const studentNameColAtt = header.indexOf("StudentName");
    const statusCol = header.indexOf("Status");
    const inTimeCol = header.indexOf("InTime");
    const outTimeCol = header.indexOf("OutTime");
    const remarksCol = header.indexOf("Remarks");
    const timestampCol = header.indexOf("Timestamp");

    if ([regIdColAtt, dateColAtt, studentNameColAtt, statusCol, inTimeCol, outTimeCol, remarksCol, timestampCol].includes(-1)) {
      Logger.log("Attendance sheet (OTP verify) header misconfiguration. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Attendance system (OTP) config error (VAOTP_H_MM2).'
      };
    }

    for (let i = 1; i < attData.length; i++) {
      if (attData[i][regIdColAtt] === registrationId && formatDate(attData[i][dateColAtt]) === todayStr) {
        existingAttRowIndex = i + 1;
        break;
      }
    }

    let updateMessage = "";
    let attendanceStatus = "";

    if (actionType === 'in') {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      attendanceStatus = (currentHour < 10 || (currentHour === 10 && currentMinute <= 0)) ? 'Present' : 'Late'; // Present if before or at 10:00 AM
      const remarks = (attendanceStatus === 'Late') ? 'Marked In Late (OTP)' : 'Marked In (OTP)';

      if (existingAttRowIndex !== -1) {
        const currentInTime = attendanceSheet.getRange(existingAttRowIndex, inTimeCol + 1).getValue();
        if (currentInTime && currentInTime !== 'N/A') {
          Logger.log(`Student ${registrationId} already marked IN today at ${currentInTime}.`);
          return {
            status: "warning",
            message: "You have already marked IN for today at " + currentInTime
          };
        }
        attendanceSheet.getRange(existingAttRowIndex, statusCol + 1).setValue(attendanceStatus);
        attendanceSheet.getRange(existingAttRowIndex, inTimeCol + 1).setValue(currentTimeStr);
        attendanceSheet.getRange(existingAttRowIndex, remarksCol + 1).setValue(remarks);
        attendanceSheet.getRange(existingAttRowIndex, timestampCol + 1).setValue(new Date());
      } else {
        const newRecord = {
          AttendanceID: generateUniqueId('ATT', attendanceSheet, 1),
          StudentRegistrationID: registrationId,
          StudentName: studentName,
          Date: todayStr,
          Status: attendanceStatus,
          InTime: currentTimeStr,
          OutTime: '',
          Remarks: remarks,
          Timestamp: new Date()
        };
        const newRow = header.map(colName => newRecord[colName] !== undefined ? newRecord[colName] : '');
        appendRow(SHEET_NAMES.ATTENDANCE, newRow);
      }
      updateMessage = `Attendance IN marked as ${attendanceStatus} at ${currentTimeStr}.`;
    } else if (actionType === 'out') {
      if (existingAttRowIndex === -1) {
        Logger.log(`Cannot mark OUT for ${registrationId} - No IN record found for today.`);
        return {
          status: "error",
          message: "You must mark IN before marking OUT. No IN record found for today."
        };
      }
      const currentInTime = attendanceSheet.getRange(existingAttRowIndex, inTimeCol + 1).getValue();
      const currentOutTime = attendanceSheet.getRange(existingAttRowIndex, outTimeCol + 1).getValue();

      if (!currentInTime || currentInTime === 'N/A') {
        Logger.log(`Cannot mark OUT for ${registrationId} - IN time is missing.`);
        return {
          status: "error",
          message: "IN time is missing. Cannot mark OUT."
        };
      }
      if (currentOutTime && currentOutTime !== 'N/A') {
        Logger.log(`Student ${registrationId} already marked OUT today at ${currentOutTime}.`);
        return {
          status: "warning",
          message: "You have already marked OUT for today at " + currentOutTime
        };
      }
      attendanceSheet.getRange(existingAttRowIndex, outTimeCol + 1).setValue(currentTimeStr);
      let currentRemarks = attendanceSheet.getRange(existingAttRowIndex, remarksCol + 1).getValue().toString();
      attendanceSheet.getRange(existingAttRowIndex, remarksCol + 1).setValue((currentRemarks ? currentRemarks + " | " : "") + "Marked Out (OTP)");
      attendanceSheet.getRange(existingAttRowIndex, timestampCol + 1).setValue(new Date());
      updateMessage = `Attendance OUT marked at ${currentTimeStr}.`;
      attendanceStatus = attendanceSheet.getRange(existingAttRowIndex, statusCol + 1).getValue(); // Get existing status for email
    } else {
      Logger.log(`Invalid actionType: ${actionType} for OTP verification.`);
      return {
        status: "error",
        message: "Invalid attendance action specified."
      };
    }
    SpreadsheetApp.flush();
    otpSheet.deleteRow(otpRowIndex);

    logActivity(`Attendance ${actionType.toUpperCase()} (OTP)`, registrationId, `Student ${studentName} marked attendance via OTP.`);
    if (studentEmail) {
      MailApp.sendEmail({
        to: studentEmail,
        subject: `GSV Attendance Marked: ${actionType.toUpperCase()} for ${todayStr}`,
        htmlBody: `Dear ${studentName},<br><br>Your attendance has been marked <b>${actionType.toUpperCase()}</b> via OTP for today, ${todayStr}, at ${currentTimeStr}.<br>Status: ${attendanceStatus}<br><br>${updateMessage}<br><br>Regards,<br>GSV Electrical Enterprises Team`
      });
    }
    createAdminNotification('Student Attendance (OTP)', `${studentName} (ID: ${registrationId}) marked ${actionType.toUpperCase()} at ${currentTimeStr} via OTP.`);
    Logger.log(`${updateMessage} for ${registrationId}.`);
    return {
      status: "success",
      message: updateMessage
    };

  } catch (e) {
    Logger.log(`Error in verifyAdminAttendanceOtp for ${registrationId}: ${e.message} \nStack: ${e.stack}`);
    return {
      status: "error",
      message: `Failed to verify OTP or mark attendance: ${e.message}`
    };
  } finally {
    lock.releaseLock();
  }
}


// --- REFACTORED STUDENT TASKS & PROJECTS (ROBUST) ---

function getStudentTasks(registrationId) {
  const items = [];
  try {
    // Replace missing helper with robust one
    const studentInfoRes = getStudentFullData(registrationId);
    const studentBatch = (studentInfoRes.status === 'success' && studentInfoRes.studentData) ? (studentInfoRes.studentData.Batch || '') : '';

    const taskSheet = getSheet(SHEET_NAMES.TASKS);
    if (taskSheet) {
      const data = taskSheet.getDataRange().getValues();
      if (data.length > 0) {
        const header = data[0].map(h => h.toString().toLowerCase().trim().replace(/\s+/g, ''));
        const findCol = (name) => {
          const target = name.toLowerCase().replace(/\s+/g, '');
          return header.indexOf(target);
        };

        const regIdCol = findCol("StudentRegistrationID") > -1 ? findCol("StudentRegistrationID") : findCol("RegistrationID");
        const batchCol = findCol("Batch") > -1 ? findCol("Batch") : (findCol("BatchName") > -1 ? findCol("BatchName") : -1);
        Logger.log(`TASK_SEARCH: Headers identified - regIdCol: ${regIdCol}, batchCol: ${batchCol}`);
        const titleCol = findCol("Title");
        const descCol = findCol("Description");
        const dueDateCol = findCol("DueDate");
        const assignedDateCol = findCol("AssignedDate");
        const statusCol = findCol("Status");
        const compDateCol = findCol("CompletedDate");
        const fileUrlCol = findCol("SubmissionFileUrl");
        const notesCol = findCol("SubmissionNotes");

        if (titleCol > -1 && statusCol > -1) {
          const searchRegId = String(registrationId).trim().toLowerCase();
          const targetBatch = String(studentBatch).trim().toLowerCase();

          Logger.log(`Searching tasks for Student: ${searchRegId}, Batch: ${targetBatch}`);

          for (let i = 1; i < data.length; i++) {
            const rowRegId = regIdCol > -1 ? String(data[i][regIdCol]).trim().toLowerCase() : '';
            const rowBatch = batchCol > -1 ? String(data[i][batchCol]).trim().toLowerCase() : '';

            // Assign if direct RegID match OR Batch match
            const isAssigned = (searchRegId && rowRegId === searchRegId) ||
              (targetBatch && rowBatch && rowBatch === targetBatch);

            if (isAssigned) {
              items.push({
                id: data[i][0] || ('T' + i),
                title: data[i][titleCol],
                description: descCol > -1 ? data[i][descCol] : '',
                dueDate: dueDateCol > -1 ? formatDateISO(data[i][dueDateCol]) : '',
                startDate: assignedDateCol > -1 ? formatDateISO(data[i][assignedDateCol]) : '',
                status: data[i][statusCol] || 'Pending',
                completedDate: compDateCol > -1 ? formatDateISO(data[i][compDateCol]) : '',
                submissionFileUrl: fileUrlCol > -1 ? data[i][fileUrlCol] : '',
                submissionNotes: notesCol > -1 ? data[i][notesCol] : '',
                notes: ''
              });
            }
          }
        }
      }
    }
    Logger.log(`TASK_SEARCH: Final count for ${registrationId} (${studentBatch}): ${items.length} tasks`);
    return sortedItems(items);
  } catch (error) {
    Logger.log("Error in getStudentTasks: " + error.toString());
    return []; // Return empty array instead of error object for robustness
  }
}

function getStudentProjects(registrationId) {
  const items = [];
  try {
    const studentInfoRes = getStudentFullData(registrationId);
    const studentBatch = (studentInfoRes.status === 'success' && studentInfoRes.studentData) ? (studentInfoRes.studentData.Batch || '') : '';

    const projectSheet = getSheet(SHEET_NAMES.PROJECTS);
    if (projectSheet) {
      const data = projectSheet.getDataRange().getValues();
      if (data.length > 0) {
        const header = data[0].map(h => h.toString().toLowerCase().trim().replace(/\s+/g, ''));
        const findCol = (name) => {
          const target = name.toLowerCase().replace(/\s+/g, '');
          return header.indexOf(target);
        };

        const regIdCol = findCol("StudentRegistrationID") > -1 ? findCol("StudentRegistrationID") : findCol("RegistrationID");
        const batchCol = findCol("Batch") > -1 ? findCol("Batch") : (findCol("BatchName") > -1 ? findCol("BatchName") : -1);
        const titleCol = findCol("Title");
        const descCol = findCol("Description");
        const endDateCol = findCol("EndDate");
        const startDateCol = findCol("StartDate");
        const statusCol = findCol("Status");
        const compDateCol = findCol("CompletedDate");
        const fileUrlCol = findCol("SubmissionFileUrl");
        const notesCol = findCol("SubmissionNotes");

        if (titleCol > -1) {
          const searchRegId = String(registrationId).trim().toLowerCase();
          const targetBatch = String(studentBatch).trim().toLowerCase();

          for (let i = 1; i < data.length; i++) {
            const rowRegId = regIdCol > -1 ? String(data[i][regIdCol]).trim().toLowerCase() : '';
            const rowBatch = batchCol > -1 ? String(data[i][batchCol]).trim().toLowerCase() : '';

            const isAssigned = (rowRegId === searchRegId) ||
              (targetBatch && rowBatch && rowBatch === targetBatch);

            if (isAssigned) {
              items.push({
                id: data[i][0] || ('P' + i),
                title: data[i][titleCol],
                description: descCol > -1 ? data[i][descCol] : '',
                endDate: endDateCol > -1 ? formatDateISO(data[i][endDateCol]) : '',
                startDate: startDateCol > -1 ? formatDateISO(data[i][startDateCol]) : '',
                status: statusCol > -1 ? data[i][statusCol] : 'Pending',
                completedDate: compDateCol > -1 ? formatDateISO(data[i][compDateCol]) : '',
                submissionFileUrl: fileUrlCol > -1 ? data[i][fileUrlCol] : '',
                submissionNotes: notesCol > -1 ? data[i][notesCol] : ''
              });
            }
          }
        }
      }
    }
    Logger.log(`PROJECT_SEARCH: Final count for ${registrationId} (${studentBatch}): ${items.length} projects`);
    return sortedItems(items);
  } catch (error) {
    Logger.log("Error in getStudentProjects: " + error.toString());
    return []; // Return empty array
  }
}

function formatDateSafe(dateVal) {
  if (!dateVal) return '';
  try {
    return formatDate(dateVal);
  } catch (e) { return String(dateVal); }
}

function sortedItems(items) {
  if (!Array.isArray(items)) return [];
  items.sort((a, b) => {
    const statusOrder = { "pending": 1, "in progress": 2, "od": 3, "leave": 3, "completed": 4, "approved": 5 };
    const statusA = (a.status || "pending").toString().toLowerCase();
    const statusB = (b.status || "pending").toString().toLowerCase();
    return (statusOrder[statusA] || 3) - (statusOrder[statusB] || 3);
  });
  return items;
}
// Clean up old helpers if they exist to avoid confusion
function getStudentTasksWrapper(regId) { return getStudentTasks(regId); }
function getStudentTasksInternal(r) { return []; }

function submitTask(regId, taskId, notes, fileData) {
  return handleSubmission(SHEET_NAMES.TASKS, 'Task', regId, taskId, notes, fileData);
}

function submitProject(regId, projectId, notes, fileData) {
  return handleSubmission(SHEET_NAMES.PROJECTS, 'Project', regId, projectId, notes, fileData);
}

function handleSubmission(sheetName, type, regId, itemId, notes, fileData) {
  try {
    Logger.log(`Handling ${type} submission: RegId=${regId}, ItemId=${itemId}, File=${fileData ? fileData.fileName : 'None'}`);
    const sheet = getSheet(sheetName);
    const idColName = (type === 'Task' ? 'TaskID' : 'ProjectID');
    const rowIndex = findRowIndexByValue(sheet, itemId, idColName);
    if (rowIndex === -1) return { status: 'error', message: type + ' not found.' };

    const headers = getHeaders(sheet);
    const dueDateCol = headers.indexOf(type === 'Task' ? 'DueDate' : 'EndDate');

    // Check Date & Grace Period
    if (dueDateCol !== -1) {
      const dueDateVal = sheet.getRange(rowIndex, dueDateCol + 1).getValue();
      if (dueDateVal) {
        const dueDate = new Date(dueDateVal);
        const gracePeriodDays = 7; // Default 7 days grace period
        const graceDate = new Date(dueDate);
        graceDate.setDate(graceDate.getDate() + gracePeriodDays);

        const now = new Date();
        if (now > graceDate) {
          return { status: 'error', message: 'Grace period has expired. Submission closed.' };
        }
      }
    }

    // Handle File Upload with Hierarchical Storage
    let fileUrl = '';
    let fileName = '';
    if (fileData) {
      const studentFolder = getOrCreateStudentFolder(regId, type);
      const prefix = `${type}_${itemId}_`.replace(/\s+/g, '_');
      const blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, prefix + fileData.fileName);
      const file = studentFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
      fileName = file.getName();
    }

    const statusCol = headers.indexOf('Status') + 1;
    const notesCol = headers.indexOf('SubmissionNotes') + 1;
    const fileUrlCol = headers.indexOf('SubmissionFileUrl') + 1;
    const fileNameCol = headers.indexOf('SubmissionFileName') + 1;
    const compDateCol = headers.indexOf('CompletedDate') + 1;

    if (statusCol > 0) sheet.getRange(rowIndex, statusCol).setValue('Completed');
    if (compDateCol > 0) sheet.getRange(rowIndex, compDateCol).setValue(new Date());
    if (notesCol > 0) sheet.getRange(rowIndex, notesCol).setValue(notes);
    if (fileUrlCol > 0 && fileUrl) sheet.getRange(rowIndex, fileUrlCol).setValue(fileUrl);
    if (fileNameCol > 0 && fileName) sheet.getRange(rowIndex, fileNameCol).setValue(fileName);

    createAdminNotification(`${type} Submission`, `Student ${regId} submitted ${type}: ${itemId}`);
    logActivity(`${type} Submitted`, regId, `ID: ${itemId}, File: ${fileName}`);

    return { status: 'success', message: 'Submitted successfully.' };
  } catch (e) {
    Logger.log("Error in handleSubmission: " + e.toString());
    return { status: 'error', message: e.message };
  }
}

/**
 * NEW: Allows student to delete their submission if before deadline.
 */
function deleteSubmission(regId, itemId, type) {
  try {
    const sheetName = (type === 'Task' ? SHEET_NAMES.TASKS : SHEET_NAMES.PROJECTS);
    const idColName = (type === 'Task' ? 'TaskID' : 'ProjectID');
    const sheet = getSheet(sheetName);
    const rowIndex = findRowIndexByValue(sheet, itemId, idColName);

    if (rowIndex === -1) return { status: 'error', message: 'Record not found.' };

    const headers = getHeaders(sheet);
    const dueDateCol = headers.indexOf(type === 'Task' ? 'DueDate' : 'EndDate');

    // Check if within deadline for deletion
    if (dueDateCol !== -1) {
      const dueDateVal = sheet.getRange(rowIndex, dueDateCol + 1).getValue();
      if (dueDateVal) {
        const dueDate = new Date(dueDateVal);
        if (new Date() > dueDate) {
          return { status: 'error', message: 'Cannot delete submission after the due date.' };
        }
      }
    }

    // Reset fields
    const statusCol = headers.indexOf('Status') + 1;
    const notesCol = headers.indexOf('SubmissionNotes') + 1;
    const fileUrlCol = headers.indexOf('SubmissionFileUrl') + 1;
    const fileNameCol = headers.indexOf('SubmissionFileName') + 1;
    const compDateCol = headers.indexOf('CompletedDate') + 1;

    if (statusCol > 0) sheet.getRange(rowIndex, statusCol).setValue('Pending');
    if (notesCol > 0) sheet.getRange(rowIndex, notesCol).setValue('');
    if (fileUrlCol > 0) sheet.getRange(rowIndex, fileUrlCol).setValue('');
    if (fileNameCol > 0) sheet.getRange(rowIndex, fileNameCol).setValue('');
    if (compDateCol > 0) sheet.getRange(rowIndex, compDateCol).setValue('');

    logActivity(`${type} Deleted`, regId, `Submission for ${itemId} was cleared by student.`);
    return { status: 'success', message: 'Submission deleted. Status reset to Pending.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function updateStudentTaskStatus(rowNum, newStatus, itemType = 'Task') {
  try {
    const sheetName = itemType === 'Project' ? SHEET_NAMES.PROJECTS : SHEET_NAMES.TASKS;
    const itemSheet = getSheet(sheetName);
    if (!itemSheet) return {
      status: 'error',
      message: `${itemType} data service unavailable.`
    };

    const data = itemSheet.getDataRange().getValues();
    if (data.length < 1) return {
      status: 'error',
      message: `${itemType} sheet is empty.`
    };
    const header = data[0];
    const statusColIdx = header.indexOf("Status");
    const completedDateColIdx = header.indexOf("CompletedDate");
    const regIdColIdx = header.indexOf("StudentRegistrationID");
    const titleColIdx = header.indexOf("Title");

    if ([statusColIdx, completedDateColIdx, regIdColIdx, titleColIdx].includes(-1)) {
      Logger.log(`${itemType} sheet (update status) header misconfiguration. Headers: ` + JSON.stringify(header));
      return {
        status: 'error',
        message: `${itemType} system config error (USTS_H_MM2).`
      };
    }

    if (rowNum > itemSheet.getLastRow() || rowNum <= 1) {
      Logger.log(`Invalid rowNum ${rowNum} for ${itemType} sheet update. Max rows: ${itemSheet.getLastRow()}`);
      return {
        status: 'error',
        message: `Invalid ${itemType.toLowerCase()} record specified for update.`
      };
    }

    const itemDataRow = itemSheet.getRange(rowNum, 1, 1, header.length).getValues()[0];
    const studentRegId = itemDataRow[regIdColIdx];
    const itemTitle = itemDataRow[titleColIdx];

    itemSheet.getRange(rowNum, statusColIdx + 1).setValue(newStatus);
    if (newStatus === 'Completed' && completedDateColIdx !== -1) {
      itemSheet.getRange(rowNum, completedDateColIdx + 1).setValue(new Date());
    }
    SpreadsheetApp.flush();

    logActivity(`${itemType} Status Update (Student)`, studentRegId, `${itemType} "${itemTitle}" status changed to ${newStatus}.`);
    createAdminNotification(`${itemType} Update by Student`, `Student ${studentRegId} updated ${itemType.toLowerCase()} "${itemTitle}" to ${newStatus}.`);
    return {
      status: 'success',
      message: `${itemType} status updated to ${newStatus}.`
    };
  } catch (error) {
    Logger.log(`Error in updateStudentTaskStatus for ${itemType}: ` + error.toString());
    return {
      status: 'error',
      message: `Error updating ${itemType.toLowerCase()}: ` + error.message
    };
  }
}


function getStudentAttendance(registrationId) {
  try {
    const attendanceSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const stuInfoResp = getStudentFullData(registrationId);
    if (stuInfoResp.status !== 'success') return { status: 'error', message: 'Student not found.' };

    const student = stuInfoResp.studentData;

    // REDUNDANT DATE RESOLVER
    const resolveDate = (val) => {
      if (!val) return null;
      if (val instanceof Date) return new Date(val.setHours(0, 0, 0, 0));
      let s = String(val).trim();
      if (!s) return null;
      let d = new Date(s);
      // Try manual parsing for common formats if native fails
      if (isNaN(d.getTime())) {
        let p = s.split(/[\/\-\.]/);
        if (p.length === 3) {
          // Try DD-MM-YYYY
          d = new Date(p[2], p[1] - 1, p[0]);
          if (isNaN(d.getTime())) {
            // Try YYYY-MM-DD
            d = new Date(p[0], p[1] - 1, p[2]);
          }
        }
      }
      if (isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const startDate = resolveDate(student.InternshipStartDate);
    const endDate = resolveDate(student.InternshipEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!startDate || !endDate) {
      return { status: 'error', message: 'Internship dates (Start/End) are missing in your registration record. Please contact Admin.' };
    }

    const settings = getAppSettings().settings;
    const slotSystemEnabled = String(settings['SlotSystemEnabled'] || 'true').toLowerCase() !== 'false';

    // Determine effective slot range: batch-level override > global default
    let slotStart = settings['ArrivalSlotStart'];
    let slotEnd = settings['ArrivalSlotEnd'];
    if (slotSystemEnabled && student.Batch) {
      try {
        const batchSheet = getSheet(SHEET_NAMES.BATCHES);
        if (batchSheet) {
          const batchData = getSheetDataAsObjects(batchSheet);
          const batchRow = batchData.find(b => b.BatchName === student.Batch);
          if (batchRow) {
            if (batchRow.SlotStartTime) slotStart = batchRow.SlotStartTime;
            if (batchRow.SlotEndTime) slotEnd = batchRow.SlotEndTime;
          }
        }
      } catch (e) { /* silent fallback to global */ }
    }
    if (!slotSystemEnabled) { slotStart = null; slotEnd = null; }

    // 1. Fetch Attendance Records
    let attendanceData = [];
    if (attendanceSheet) {
      attendanceData = getSheetDataAsObjects(attendanceSheet).filter(r => String(r.StudentRegistrationID) === String(registrationId));
    }

    // 2. Fetch Requests (OTP / Approval History)
    let requestsData = [];
    if (otpSheet) {
      requestsData = getSheetDataAsObjects(otpSheet).filter(r => String(r.RegistrationID) === String(registrationId));
    }

    const records = [];
    const summary = {
      totalWorkingDays: 0,
      presentCounter: 0,
      absentCounter: 0,
      lateCounter: 0,
      wfhCounter: 0,
      odCounter: 0,
      medicalCounter: 0,
      emergencyCounter: 0,
      holidayCounter: 0,
      percentage: 0
    };

    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    let dayCount = 1;

    while (current <= end) {
      const dISO = formatDateISO(current);
      const dDisplay = formatDate(current);
      // Select the "best" record for the day (one with OutTime takes precedence)
      let dayAttRecords = attendanceData.filter(r => formatDateISO(r.Date) === dISO);
      let attRecord = dayAttRecords.find(r => r.OutTime && r.OutTime !== '' && r.OutTime !== 'N/A');
      if (!attRecord && dayAttRecords.length > 0) attRecord = dayAttRecords[0];
      const isSunday = current.getDay() === 0;

      // Look for request logic
      const dayRequests = requestsData.filter(r => {
        let reqDate = r.TargetDate;
        if (!(reqDate instanceof Date)) reqDate = new Date(reqDate);
        return formatDateISO(reqDate) === dISO;
      });

      const pendingRequest = dayRequests.find(r => r.Status === 'Pending Admin Approval' || r.Status === 'Awaiting OTP');
      const approvedRequest = dayRequests.find(r => r.Status === 'Approved');
      const rejectedRequest = dayRequests.find(r => (r.Status || "").toLowerCase() === 'rejected');

      let status = 'Upcoming';
      let label = 'Upcoming';

      if (attRecord) {
        status = attRecord.Status;
        label = status;
        if (status === 'Present' && attRecord.InTime && slotEnd) {
          const inT = parseTime_(attRecord.InTime);
          const slotT = parseTime_(slotEnd);
          if (inT > slotT) {
            status = 'Late with Present';
            label = 'Late with Present';
          }
        }
        // For future dates with WFH/OD status: keep the status as-is but DON'T count as Present yet
        const specialLeaveStatuses = ['WFH', 'OD', 'Medical Leave', 'Sick Leave', 'Emergency Leave'];
        if (current > today && specialLeaveStatuses.includes(status)) {
          label = `${status} (Scheduled)`;
        }
      } else if (isSunday) {
        status = 'Holiday';
        label = 'Weekly Off';
      } else if (approvedRequest && ['WFH', 'OD', 'Emergency Leave', 'Sick Leave'].includes(approvedRequest.ActionType || approvedRequest.LeaveType)) {
        // PRIORITY: Approved WFH/Leave request takes precedence over 'Today' or 'Upcoming'
        const leaveType = approvedRequest.ActionType || approvedRequest.LeaveType || 'WFH';
        status = leaveType;

        if (current.getTime() === today.getTime()) {
          // Check if slot time reached
          const nowTime = Utilities.formatDate(new Date(), "GMT+5:30", "hh:mm a");
          const slotStartT = parseTime_(slotStart || "09:00 AM");
          const currentT = parseTime_(nowTime);

          if (currentT >= slotStartT) {
            label = `${leaveType} (Present)`;
            // Logic: Effectively Present by WFH
          } else {
            label = `${leaveType} (Scheduled Today)`;
          }
        } else if (current > today) {
          label = `${leaveType} (Approved)`;
        } else {
          label = `${leaveType} (Present)`;
        }
      } else if (current < today) {
        status = 'Missed';
        label = 'Missed';
      } else if (current.getTime() === today.getTime()) {
        status = 'Today';
        label = 'Today';
      }

      // Mark indicators
      const indicators = {
        hasPending: !!pendingRequest,
        pendingStatus: pendingRequest ? pendingRequest.Status : null,
        hasRejection: !!rejectedRequest,
        rejectionReason: rejectedRequest ? rejectedRequest.Reason : null,
        otpRequired: pendingRequest && pendingRequest.Status === 'Awaiting OTP',
        hasApproval: !!approvedRequest,
        approvedType: approvedRequest ? (approvedRequest.ActionType || approvedRequest.LeaveType) : null
      };

      if (!isSunday) {
        summary.totalWorkingDays++;
        const sLower = String(status || '').toLowerCase();

        // Robust Presence Check: Include all variants of being present or attending remotely
        const isPresentFlow = sLower.includes('present') ||
          sLower.includes('late') ||
          sLower.includes('early') ||
          sLower === 'approved' ||
          sLower === 'wfh' ||
          sLower === 'od';

        if (isPresentFlow && current <= today) {
          summary.presentCounter++;
        }

        // Granular Counters for UI display
        if (sLower.includes('late')) summary.lateCounter++;
        if (sLower.includes('early')) summary.earlyCounter++;
        if (status === 'Absent' || status === 'Missed') summary.absentCounter++;

        // Remote/Leave Tracking
        if (status === 'WFH' && current <= today) summary.wfhCounter++;
        if (status === 'OD' && current <= today) summary.odCounter++;

        if (sLower.includes('medical') || sLower.includes('sick')) {
          summary.medicalCounter++;
        }

        if (sLower.includes('emergency')) {
          summary.emergencyCounter++;
        }
      } else {
        summary.holidayCounter++;
      }

      records.push({
        DayNumber: isSunday ? 'OFF' : `Day ${dayCount}`,
        DayIndex: dayCount,
        Date: dDisplay,
        DateISO: dISO,
        Status: status,
        Label: label,
        ArrivalTime: (attRecord && attRecord.InTime) ? attRecord.InTime : 'N/A',
        DepartureTime: (attRecord && attRecord.OutTime) ? attRecord.OutTime : 'N/A',
        EntryMode: (attRecord && attRecord.EntryMode) ? attRecord.EntryMode : 'None',
        ApprovalStatus: (attRecord && attRecord.ApprovalStatus) ? attRecord.ApprovalStatus : '',
        LeaveType: (attRecord && attRecord.LeaveType) ? attRecord.LeaveType : '',
        Indicators: indicators,
        AdminComment: (attRecord && attRecord.AdminComment) ? attRecord.AdminComment : '',
        IsToday: dISO === formatDateISO(today),
        IsSunday: isSunday
      });

      if (!isSunday) dayCount++;
      current.setDate(current.getDate() + 1);
    }

    const activeDays = summary.presentCounter + summary.medicalCounter + (summary.emergencyCounter || 0);
    summary.percentage = summary.totalWorkingDays > 0 ? ((activeDays / summary.totalWorkingDays) * 100).toFixed(1) : 0;

    return {
      status: 'success',
      attendanceRecords: records, // Now chronological
      summary: summary,
      internshipStart: formatDateISO(startDate),
      internshipEnd: formatDateISO(endDate),
      slotStart: slotStart,
      slotEnd: slotEnd,
      RfidTagId: student.RFID_TagID || ''
    };
  } catch (e) {
    Logger.log("Error in getStudentAttendance: " + e.toString());
    return { status: 'error', message: e.message };
  }
}

function requestStudentAttendanceCorrection(registrationId, date, reason, type, fileData, targetTime = '') {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    if (!sheet) return { status: 'error', message: 'Request sheet not found (RSA_S_MM).' };

    // Check for existing pending request
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdCol = headers.indexOf("RegistrationID");
    const dateCol = headers.indexOf("TargetDate");
    const statusCol = headers.indexOf("Status");
    const typeCol = headers.indexOf("ActionType"); // Assuming ActionType is used for type

    if (regIdCol === -1 || dateCol === -1 || statusCol === -1) return { status: 'error', message: 'Sheet header error (RSA_H_MM).' };

    // WFH requests must be for upcoming (future) dates only
    const targetDateObj = new Date(date);
    targetDateObj.setHours(0, 0, 0, 0);
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    if (type === 'WFH' && targetDateObj.getTime() <= todayObj.getTime()) {
      return { status: 'error', message: 'Work From Home requests can only be raised for upcoming (future) dates.' };
    }

    const targetDateStr = formatDate(new Date(date));

    for (let i = 1; i < data.length; i++) {
      const rowStatus = String(data[i][statusCol] || '').toLowerCase();
      if (data[i][regIdCol] === registrationId && formatDate(new Date(data[i][dateCol])) === targetDateStr &&
        (rowStatus.includes('pending') || rowStatus.includes('awaiting'))) {
        return { status: 'error', message: 'You already have a pending request for this date.' };
      }
    }

    let fileUrl = '';
    if (fileData) {
      const folder = getOrCreateStudentFolder(registrationId, 'generated');
      const blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, "Correction_" + fileData.fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }

    const newId = generateUniqueId('REQ', SHEET_NAMES.ATTENDANCE_OTP, 0);

    // Use header-based row building
    const rowData = headers.map(h => {
      switch (h) {
        case 'ID': return newId;
        case 'RegistrationID': return registrationId;
        case 'OTP': return '';
        case 'ActionType': return type;
        case 'ExpiryTimestamp': return '';
        case 'TargetDate': return date;
        case 'TargetTime': return targetTime;
        case 'Reason': return reason;
        case 'Status': return 'Pending Admin Approval';
        case 'LeaveType': return type === 'Correction' ? '' : type;
        case 'AttachmentUrl': return fileUrl;
        default: return '';
      }
    });

    sheet.appendRow(rowData);
    SpreadsheetApp.flush();

    // Also save to unified StudentRequests sheet
    const studentName = getStudentName_(registrationId);
    saveStudentRequest_({
      RequestID: newId,
      RegistrationID: registrationId,
      StudentName: studentName,
      RequestType: type,
      TargetDate: date,
      TargetTime: targetTime,
      Reason: reason,
      LeaveType: type === 'Correction' ? '' : type,
      AttachmentUrl: fileUrl
    });

    createAdminNotification('Attendance Request', `Student ${registrationId} requested ${type} for ${targetDateStr}. Reason: ${reason}`);

    return { status: 'success', message: 'Request submitted for admin approval.' };

  } catch (e) {
    Logger.log("Error in requestStudentAttendanceCorrection: " + e.toString());
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function getStudentChatNotifications(registrationId, clientLastMessageTimestamp) {
  Logger.log(`getStudentChatNotifications called for ${registrationId}, clientLastTs: ${clientLastMessageTimestamp}`);
  try {
    const chatSheet = getSheet(SHEET_NAMES.CHAT_MESSAGES);
    if (!chatSheet) return {
      status: 'success',
      newMessages: []
    };

    const data = chatSheet.getDataRange().getValues();
    const newMessages = [];
    if (data.length < 1) return {
      status: 'success',
      newMessages: []
    };
    const header = data[0];
    const senderCol = header.indexOf("SenderID");
    const receiverCol = header.indexOf("ReceiverID");
    const msgCol = header.indexOf("Message");
    const tsCol = header.indexOf("Timestamp");
    const readCol = header.indexOf("IsReadByReceiver");

    if ([senderCol, receiverCol, msgCol, tsCol, readCol].includes(-1)) {
      Logger.log("Student chat notifications header misconfiguration. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Chat notification system config error (GSCN_H_MM2).',
        newMessages: []
      };
    }

    const lastCheck = clientLastMessageTimestamp ? new Date(Number(clientLastMessageTimestamp)).getTime() : 0;

    for (let i = 1; i < data.length; i++) {
      const receiver = data[i][receiverCol];
      const sender = data[i][senderCol];
      const messageTimestamp = data[i][tsCol] ? new Date(data[i][tsCol]).getTime() : 0;

      if (receiver === registrationId && (sender === 'Admin' || sender === 'admin_user_id')) {
        if ((data[i][readCol] === false || data[i][readCol] === 'FALSE' || data[i][readCol] === '') || messageTimestamp > lastCheck) {
          if (data[i][readCol] === false || data[i][readCol] === 'FALSE' || data[i][readCol] === '') {
            newMessages.push({
              senderId: sender,
              message: data[i][msgCol],
              timestamp: new Date(data[i][tsCol]).toISOString()
            });
          }
        }
      }
    }
    return {
      status: 'success',
      newMessages: newMessages
    };
  } catch (error) {
    Logger.log('Error in getStudentChatNotifications: ' + error.toString());
    return {
      status: 'error',
      message: 'Error checking messages: ' + error.message,
      newMessages: []
    };
  }
}


function updateStudentLastChatCheck(registrationId, timestamp) {
  Logger.log(`updateStudentLastChatCheck called for ${registrationId}, timestamp: ${timestamp}`);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) return {
      status: 'error',
      message: 'Student data service unavailable.'
    };

    const data = regSheet.getDataRange().getValues();
    if (data.length < 1) return {
      status: 'error',
      message: 'No student data.'
    };
    const header = data[0];
    const regIdCol = header.indexOf("RegistrationID");
    const lastChatCheckCol = header.indexOf("LastChatCheck");

    if (regIdCol === -1 || lastChatCheckCol === -1) {
      Logger.log("Update student last chat check header misconfiguration. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Student data (chat check) config error (USLCC_H_MM2).'
      };
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][regIdCol] === registrationId) {
        regSheet.getRange(i + 1, lastChatCheckCol + 1).setValue(new Date(Number(timestamp)));
        SpreadsheetApp.flush();
        Logger.log(`Updated LastChatCheck for ${registrationId} to ${new Date(Number(timestamp)).toLocaleString()}`);
        return {
          status: 'success',
          message: 'Last chat check updated.'
        };
      }
    }
    Logger.log(`Student ${registrationId} not found to update LastChatCheck.`);
    return {
      status: 'error',
      message: 'Student not found to update last chat check.'
    };
  } catch (error) {
    Logger.log('Error in updateStudentLastChatCheck: ' + error.toString() + error.stack);
    return {
      status: 'error',
      message: 'Error updating last chat check: ' + error.message
    };
  } finally {
    lock.releaseLock();
  }
}

// Consolidated createTask logic moved to create section above.


function createStudentNotification(regId, title, message) {
  try {
    const sheet = getSheet(SHEET_NAMES.ADMIN_NOTIFICATIONS);
    if (!sheet) {
      Logger.log("AdminNotifications sheet missing (CSN).");
      return;
    }
    const notifId = generateUniqueId('NOTIF', sheet, 0);
    const row = [notifId, new Date(), title, message, false, regId];
    appendRow(SHEET_NAMES.ADMIN_NOTIFICATIONS, row);
    Logger.log(`Created student notification for ${regId}: ${title}`);
  } catch (e) {
    Logger.log("Error in createStudentNotification: " + e.toString());
  }
}

function getStudentNotifications(regId) {
  try {
    const notifications = [];
    const studentId = String(regId || "").trim().toUpperCase();
    if (!studentId) return { status: 'success', notifications: [] };

    const studentDataResp = getStudentFullData(regId);
    const studentBatch = (studentDataResp.status === 'success' && studentDataResp.studentData) ? studentDataResp.studentData.Batch : null;
    const lastCheckTs = (studentDataResp.status === 'success' && studentDataResp.studentData && studentDataResp.studentData.LastChatCheck)
      ? new Date(studentDataResp.studentData.LastChatCheck).getTime()
      : 0;

    // 1. Fetch Standard Notifications (AdminNotifications sheet)
    const sheet = getSheet(SHEET_NAMES.ADMIN_NOTIFICATIONS);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const targetId = String(data[i][5] || "").trim().toUpperCase();
        if (targetId === studentId) {
          const isRead = data[i][4];
          const title = String(data[i][2] || "");
          notifications.push({
            id: data[i][0],
            time: data[i][1] ? new Date(data[i][1]).toISOString() : new Date().toISOString(),
            title: title || "Notification",
            message: data[i][3] || "",
            read: (isRead === true || String(isRead).toUpperCase() === 'TRUE' || isRead === 1),
            type: title.toLowerCase().includes('message') ? 'chat' : 'info'
          });
        }
      }
    }

    // 2. Fetch Unread Private Chat Notifications (Backup Source)
    const chatSheet = getSheet(SHEET_NAMES.CHAT_MESSAGES);
    if (chatSheet) {
      const data = chatSheet.getDataRange().getValues();
      const header = data[0];
      const senderCol = header.indexOf("SenderID");
      const receiverCol = header.indexOf("ReceiverID");
      const msgCol = header.indexOf("Message");
      const tsCol = header.indexOf("Timestamp");
      const readCol = header.indexOf("IsReadByReceiver");

      if (senderCol > -1 && receiverCol > -1) {
        for (let j = 1; j < data.length; j++) {
          const receiver = String(data[j][receiverCol] || "").trim().toUpperCase();
          const isRead = data[j][readCol];

          if (receiver === studentId && (isRead === false || String(isRead).toUpperCase() === 'FALSE' || isRead === '')) {
            const msgId = 'chat-' + data[j][0];
            // Avoid duplicates if already in notifications from AdminNotifications
            if (!notifications.some(n => n.id === msgId)) {
              notifications.push({
                id: msgId,
                time: data[j][tsCol] ? new Date(data[j][tsCol]).toISOString() : new Date().toISOString(),
                title: 'New Message from GSV Admin',
                message: data[j][msgCol],
                read: false,
                type: 'chat'
              });
            }
          }
        }
      }
    }

    // 3. Fetch Unread Batch Chat Notifications
    if (studentBatch) {
      const batchSheet = getSheet(SHEET_NAMES.BATCH_CHAT);
      if (batchSheet) {
        const bData = batchSheet.getDataRange().getValues();
        const bHeader = bData[0];
        const bBatchCol = bHeader.indexOf("BatchName");
        const bSenderIdCol = bHeader.indexOf("SenderID");
        const bSenderNameCol = bHeader.indexOf("SenderName");
        const bMsgCol = bHeader.indexOf("Message");
        const bTsCol = bHeader.indexOf("Timestamp");

        if (bBatchCol > -1 && bTsCol > -1) {
          for (let k = 1; k < bData.length; k++) {
            const rowBatch = bData[k][bBatchCol];
            const senderId = bData[k][bSenderIdCol];
            const ts = bData[k][bTsCol] ? new Date(bData[k][bTsCol]).getTime() : 0;

            if (rowBatch === studentBatch && senderId !== regId && ts > lastCheckTs) {
              notifications.push({
                id: 'batch-' + bData[k][0],
                batchId: studentBatch,
                time: bData[k][bTsCol] ? new Date(bData[k][bTsCol]).toISOString() : new Date().toISOString(),
                title: `New Batch Message (${studentBatch})`,
                message: `${bData[k][bSenderNameCol] || 'Member'}: ${bData[k][bMsgCol] || ''}`,
                read: false,
                type: 'chat'
              });
            }
          }
        }
      }
    }

    // Sort DESC by time and limit to 50
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    return { status: 'success', notifications: notifications.slice(0, 50) };
  } catch (e) {
    Logger.log("Error in getStudentNotifications: " + e.toString());
    return { status: 'error', message: e.message, notifications: [] };
  }
}

function getStudentCertificate(registrationId) {
  Logger.log(`getStudentCertificate called for: ${registrationId}`);
  try {
    const certSheet = getSheet(SHEET_NAMES.CERTIFICATE_DATA);
    if (!certSheet) return {
      status: 'error',
      message: 'Certificate data source not found.'
    };

    const data = certSheet.getDataRange().getValues();
    if (data.length < 1) return {
      status: 'no_certificate',
      message: 'No certificate data found.'
    };
    const header = data[0];
    const regIdCol = header.indexOf("StudentRegistrationID");
    const certNumCol = header.indexOf("CertificateNumber");
    const issuedDateCol = header.indexOf("IssuedDate");
    const certStatusCol = header.indexOf("Status");
    const pdfIdCol = header.indexOf("CertificatePdfId");

    if ([regIdCol, certNumCol, issuedDateCol, certStatusCol, pdfIdCol].includes(-1)) {
      Logger.log("Get student certificate header misconfiguration. Headers: " + JSON.stringify(header));
      return {
        status: 'error',
        message: 'Certificate system config error (GSC_H_MM2).'
      };
    }

    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][regIdCol] === registrationId) {
        if (data[i][certStatusCol] === 'Valid' && data[i][pdfIdCol]) {
          let file;
          try {
            file = DriveApp.getFileById(data[i][pdfIdCol]);
          } catch (e) {
            Logger.log(`Error accessing certificate PDF file ID ${data[i][pdfIdCol]}: ${e.toString()}`);
            return {
              status: 'no_certificate',
              message: 'Certificate record found, but PDF is currently inaccessible. Please contact admin.'
            };
          }
          return {
            status: 'success',
            certificateLink: file.getUrl(),
            certificateNumber: data[i][certNumCol],
            issuedDate: formatDate(data[i][issuedDateCol])
          };
        } else if (data[i][certStatusCol] === 'Valid' && !data[i][pdfIdCol]) {
          return {
            status: 'no_certificate',
            message: 'Certificate issued but PDF not yet linked. Please check back later or contact admin.'
          };
        }
      }
    }
    const studentData = getStudentDataForDoc(registrationId);
    if (studentData && studentData.ApplicationStatus === 'Completed') {
      return {
        status: 'no_certificate',
        message: 'Your internship is completed. Certificate is being processed.'
      };
    } else if (studentData && (studentData.ApplicationStatus === 'Approved' || studentData.ApplicationStatus === 'Active')) {
      return {
        status: 'no_certificate',
        message: 'Your internship is ongoing. Certificate will be available upon completion.'
      };
    }

    return {
      status: 'no_certificate',
      message: 'Certificate not yet issued or found for your registration ID.'
    };
  } catch (error) {
    Logger.log('Error in getStudentCertificate: ' + error.toString() + error.stack);
    return {
      status: 'error',
      message: 'Error fetching certificate details: ' + error.message
    };
  }
}
// =================================================================================
// BATCH MANAGEMENT FUNCTIONS
// =================================================================================

function getBatches() {
  try {
    const sheet = getSheet(SHEET_NAMES.BATCHES);
    if (!sheet) return [];

    const batchesData = getSheetDataAsObjects(sheet);
    if (!batchesData || batchesData.length === 0) return [];

    const studentsSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const studentsData = studentsSheet ? (getSheetDataAsObjects(studentsSheet) || []) : [];

    const tasksSheet = getSheet(SHEET_NAMES.TASKS);
    const projectsSheet = getSheet(SHEET_NAMES.PROJECTS);
    const tasksData = tasksSheet ? (getSheetDataAsObjects(tasksSheet) || []) : [];
    const projectsData = projectsSheet ? (getSheetDataAsObjects(projectsSheet) || []) : [];

    const batches = batchesData.map(batch => {
      const batchName = String(batch.BatchName || '').trim();
      const batchId = String(batch.BatchID || '').trim();
      const targetBatchValue = batchName.replace(/\s+/g, '').toLowerCase();
      const targetBatchIdValue = batchId.replace(/\s+/g, '').toLowerCase();

      // Match by BatchName OR BatchID to handle both formats in Registrations
      const batchStudents = studentsData.filter(student => {
        const stuBatch = String(student.Batch || '').replace(/\s+/g, '').toLowerCase();
        return stuBatch === targetBatchValue || (targetBatchIdValue && stuBatch === targetBatchIdValue);
      });

      const regIds = batchStudents.map(s => String(s.RegistrationID).trim().toLowerCase());

      const taskCount = tasksData.filter(t => regIds.includes(String(t.StudentRegistrationID).trim().toLowerCase())).length;
      const projectCount = projectsData.filter(p => regIds.includes(String(p.StudentRegistrationID).trim().toLowerCase())).length;

      return {
        id: batch.BatchID,
        name: batch.BatchName,
        mentor: batch.Mentor,
        project: batch.Project || '',
        workArea: batch.WorkArea || 'General',
        studentCount: batchStudents.length,
        taskCount: taskCount,
        projectCount: projectCount,
        studentNames: batchStudents.map(s => `${getStudentFullName_(s)} ${s.RegistrationID}`).join('|'),
        description: batch.Description || '',
        skillLearned: batch.SkillLearned || batch['Skill Learned'] || getCertificateContentForBatch(batch.BatchName) || '',
        status: batch.Status || 'Active'
      };
    });

    return batches;
  } catch (e) {
    Logger.log('Error in getBatches: ' + e.toString() + ' | Stack: ' + (e.stack || ''));
    return [];
  }
}

/**
 * Gets overview data for a batch (students, tasks, projects).
 */
function getBatchOverview(batchName) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const targetBatch = String(batchName || '').replace(/\s+/g, '').toLowerCase();
    const students = getSheetDataAsObjects(regSheet).filter(s => String(s.Batch || '').replace(/\s+/g, '').toLowerCase() === targetBatch);
    const regIds = students.map(s => String(s.RegistrationID).trim().toLowerCase());

    const tasksSheet = getSheet(SHEET_NAMES.TASKS);
    const projectsSheet = getSheet(SHEET_NAMES.PROJECTS);

    const allTasks = getSheetDataAsObjects(tasksSheet);
    const allProjects = getSheetDataAsObjects(projectsSheet);

    const batchTasks = allTasks.filter(t => regIds.includes(String(t.StudentRegistrationID).trim().toLowerCase()));
    const batchProjects = allProjects.filter(p => regIds.includes(String(p.StudentRegistrationID).trim().toLowerCase()));

    return {
      status: 'success',
      students: students.map(s => ({ regId: s.RegistrationID, name: getStudentFullName_(s), rfidTag: s.RFID_TagID })),
      tasks: batchTasks.slice(0, 50),
      projects: batchProjects.slice(0, 50)
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Slot Management Functions
 */
function resolveBatchNameToName(batchIdOrName) {
  if (!batchIdOrName) return '';
  try {
    const sheet = getSheet(SHEET_NAMES.BATCHES);
    if (!sheet) return batchIdOrName;
    const data = getSheetDataAsObjects(sheet);
    const found = data.find(b => String(b.BatchID) === String(batchIdOrName) || String(b.BatchName) === String(batchIdOrName));
    return found && found.BatchName ? found.BatchName : batchIdOrName;
  } catch (e) { return batchIdOrName; }
}

function getBatchSlots(batchId) {
  try {
    const sheet = getSheet(SHEET_NAMES.SLOTS);
    const data = getSheetDataAsObjects(sheet);
    const slots = data.filter(s => String(s.BatchID) === String(batchId));

    const exceptionsSheet = getSheet(SHEET_NAMES.SLOT_EXCEPTIONS);
    const exceptionsData = getSheetDataAsObjects(exceptionsSheet);
    const exceptions = exceptionsData.filter(e => String(e.BatchID) === String(batchId));

    return { status: 'success', slots: slots, exceptions: exceptions };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function saveBatchSlot(slotData) {
  try {
    const sheet = getSheet(SHEET_NAMES.SLOTS);
    const historySheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
    let action = 'CREATE';
    let historyId = 'B_SLOT_' + Date.now();

    // Force Strings for Time to bypass Google Sheet 1899 timezone offset issues
    if (slotData.StartTime) slotData.StartTime = "'" + String(slotData.StartTime).replace(/^'/, '');
    if (slotData.EndTime) slotData.EndTime = "'" + String(slotData.EndTime).replace(/^'/, '');

    if (!slotData.SlotID) {
      slotData.SlotID = generateUniqueId('SLOT', SHEET_NAMES.SLOTS, 0);
      appendObjectToSheet(sheet, slotData);
    } else {
      action = 'UPDATE';
      updateObjectInSheet(sheet, 'SlotID', slotData.SlotID, slotData);
    }

    if (historySheet) {
      const timestamp = new Date().toISOString();
      const realBatchName = resolveBatchNameToName(slotData.BatchID);
      appendObjectToSheet(historySheet, {
        HistoryID: historyId,
        SlotType: 'BATCH_SLOT_SCHED',
        BatchName: realBatchName,
        StudentTarget: slotData.SlotName || slotData.Label || '',
        StartTime: String(slotData.StartTime || '').replace(/^'/, ''),
        EndTime: String(slotData.EndTime || '').replace(/^'/, ''),
        LateAfter: '',
        EarlyExitBefore: '',
        RFIDEnabled: false,
        GraceLate: '',
        GraceEarly: '',
        Enabled: true,
        CreatedFrom: 'batch_control',
        CreatedAt: timestamp,
        ModifiedAt: timestamp,
        Action: action
      });
    }

    return { status: 'success', message: 'Slot saved successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteBatchSlot(slotId) {
  try {
    const historySheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
    // Find the slot first to log it
    const sheet = getSheet(SHEET_NAMES.SLOTS);
    const slots = getSheetDataAsObjects(sheet);
    const slot = slots.find(s => s.SlotID === slotId);

    if (historySheet && slot) {
      const realBatchName = resolveBatchNameToName(slot.BatchID);
      appendObjectToSheet(historySheet, {
        HistoryID: 'B_SLOT_DEL_' + Date.now(),
        SlotType: 'BATCH_SLOT_SCHED',
        BatchName: realBatchName,
        StudentTarget: slot.SlotName || slot.Label || '',
        StartTime: String(slot.StartTime || '').replace(/^'/, ''),
        EndTime: String(slot.EndTime || '').replace(/^'/, ''),
        LateAfter: '',
        EarlyExitBefore: '',
        RFIDEnabled: false,
        GraceLate: '',
        GraceEarly: '',
        Enabled: false,
        CreatedFrom: 'batch_control',
        CreatedAt: new Date().toISOString(),
        ModifiedAt: new Date().toISOString(),
        Action: 'DELETE'
      });
    }

    deleteRowsByColumnValue(SHEET_NAMES.SLOTS, 'SlotID', slotId);
    return { status: 'success', message: 'Slot deleted.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function saveBatchSlotException(exceptionData) {
  try {
    const sheet = getSheet(SHEET_NAMES.SLOT_EXCEPTIONS);
    const historySheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
    let action = 'CREATE';
    let historyId = 'B_EXC_' + Date.now();

    // Force Strings for Time to bypass Google Sheet 1899 timezone offset issues
    if (exceptionData.TempStart) exceptionData.TempStart = "'" + String(exceptionData.TempStart).replace(/^'/, '');
    if (exceptionData.TempEnd) exceptionData.TempEnd = "'" + String(exceptionData.TempEnd).replace(/^'/, '');
    if (exceptionData.StartTime) exceptionData.StartTime = "'" + String(exceptionData.StartTime).replace(/^'/, '');
    if (exceptionData.EndTime) exceptionData.EndTime = "'" + String(exceptionData.EndTime).replace(/^'/, '');

    if (!exceptionData.ExceptionID) {
      exceptionData.ExceptionID = generateUniqueId('EXC', SHEET_NAMES.SLOT_EXCEPTIONS, 0);
      appendObjectToSheet(sheet, exceptionData);
    } else {
      action = 'UPDATE';
      updateObjectInSheet(sheet, 'ExceptionID', exceptionData.ExceptionID, exceptionData);
    }

    if (historySheet) {
      const timestamp = new Date().toISOString();
      const realBatchName = resolveBatchNameToName(exceptionData.BatchID);
      appendObjectToSheet(historySheet, {
        HistoryID: historyId,
        SlotType: 'BATCH_EXCEPTION',
        BatchName: realBatchName,
        StudentTarget: String(exceptionData.Label || '') + (exceptionData.TargetDate ? (' on ' + exceptionData.TargetDate) : ''),
        StartTime: String(exceptionData.StartTime || exceptionData.TempStart || '').replace(/^'/, ''),
        EndTime: String(exceptionData.EndTime || exceptionData.TempEnd || '').replace(/^'/, ''),
        LateAfter: '',
        EarlyExitBefore: '',
        RFIDEnabled: false,
        GraceLate: '',
        GraceEarly: '',
        Enabled: true,
        CreatedFrom: 'batch_control',
        CreatedAt: timestamp,
        ModifiedAt: timestamp,
        Action: action
      });
    }

    return { status: 'success', message: 'Exception saved successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteBatchSlotException(exceptionId) {
  try {
    const historySheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
    const sheet = getSheet(SHEET_NAMES.SLOT_EXCEPTIONS);
    const exceptions = getSheetDataAsObjects(sheet);
    const exc = exceptions.find(e => e.ExceptionID === exceptionId);

    if (historySheet && exc) {
      const realBatchName = resolveBatchNameToName(exc.BatchID);
      appendObjectToSheet(historySheet, {
        HistoryID: 'B_EXC_DEL_' + Date.now(),
        SlotType: 'BATCH_EXCEPTION',
        BatchName: realBatchName,
        StudentTarget: String(exc.Label || exc.Type || '') + (exc.TargetDate || exc.Date ? (' on ' + (exc.TargetDate || exc.Date)) : ''),
        StartTime: String(exc.StartTime || exc.TempStart || '').replace(/^'/, ''),
        EndTime: String(exc.EndTime || exc.TempEnd || '').replace(/^'/, ''),
        LateAfter: '',
        EarlyExitBefore: '',
        RFIDEnabled: false,
        GraceLate: '',
        GraceEarly: '',
        Enabled: false,
        CreatedFrom: 'batch_control',
        CreatedAt: new Date().toISOString(),
        ModifiedAt: new Date().toISOString(),
        Action: 'DELETE'
      });
    }

    deleteRowsByColumnValue(SHEET_NAMES.SLOT_EXCEPTIONS, 'ExceptionID', exceptionId);
    return { status: 'success', message: 'Exception deleted.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function updateBatchDetails(id, name, mentor, project, description, workArea, status, skillLearned) {
  try {
    const sheet = getSheet(SHEET_NAMES.BATCHES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Robust header lookup for ALL columns
    const findCol = (hName) => {
      let idx = headers.indexOf(hName);
      if (idx === -1) idx = headers.findIndex(h => String(h).replace(/\s+/g, '').toLowerCase() === hName.toLowerCase());
      return idx;
    };

    const idCol = findCol("BatchID");
    const nameCol = findCol("BatchName");
    const mentorCol = findCol("Mentor");
    const projCol = findCol("Project");
    const descCol = findCol("Description");
    const workCol = findCol("WorkArea");
    const statusCol = findCol("Status");
    const skillCol = findCol("SkillLearned");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id)) {
        const oldName = data[i][nameCol];

        if (nameCol !== -1) sheet.getRange(i + 1, nameCol + 1).setValue(name);
        if (mentorCol !== -1) sheet.getRange(i + 1, mentorCol + 1).setValue(mentor);
        if (projCol !== -1) sheet.getRange(i + 1, projCol + 1).setValue(project);
        if (descCol !== -1) sheet.getRange(i + 1, descCol + 1).setValue(description || '');
        if (skillCol !== -1) sheet.getRange(i + 1, skillCol + 1).setValue(skillLearned || '');
        if (workCol !== -1) sheet.getRange(i + 1, workCol + 1).setValue(workArea || 'General');
        if (statusCol !== -1 && status) sheet.getRange(i + 1, statusCol + 1).setValue(status);

        // --- SYNC TO NEW SECONDARY STORAGE (CertificateContent) ---
        saveCertificateContent(name, skillLearned);

        // If Name changed, update all students' Batch column!
        if (oldName !== name) {
          updateBatchNameForStudents(oldName, name);
        }

        return { status: 'success', message: 'Batch updated successfully. Data persisted in Batch and CertificateContent storage.' };
      }
    }
    return { status: 'error', message: 'Batch ID not found' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/**
 * Ensures batch certificate content is stored in a dedicated sheet
 */
function saveCertificateContent(batchName, content) {
  try {
    const sheet = getSheet(SHEET_NAMES.CERTIFICATE_CONTENT);
    if (!sheet) return;

    const mac = String(batchName || '').trim();
    if (!mac) return;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const nameIdx = headers.indexOf('BatchName');
    if (nameIdx === -1) return;

    const idx = findRowIndexByValue(sheet, mac, 'BatchName');
    const now = new Date();

    if (idx === -1) {
      appendObjectToSheet(sheet, {
        BatchName: mac,
        Content: content,
        LastUpdated: now
      });
    } else {
      updateObjectInSheet(sheet, 'BatchName', mac, {
        Content: content,
        LastUpdated: now
      });
    }
  } catch (e) {
    Logger.log("saveCertificateContent error: " + e.toString());
  }
}

/**
 * Fetches certificate content as a fallback
 */
function getCertificateContentForBatch(batchName) {
  try {
    const sheet = getSheet(SHEET_NAMES.CERTIFICATE_CONTENT);
    if (!sheet) return null;
    const data = getSheetDataAsObjects(sheet);
    const row = data.find(d => String(d.BatchName || '').trim() === String(batchName || '').trim());
    return row ? row.Content : null;
  } catch (e) { return null; }
}

function updateBatchNameForStudents(oldName, newName) {
  const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const batchCol = headers.indexOf('Batch');
  if (batchCol === -1) return;

  for (let i = 1; i < data.length; i++) {
    if (data[i][batchCol] === oldName) {
      sheet.getRange(i + 1, batchCol + 1).setValue(newName);
    }
  }
}

function createBatch(batchName, mentorName, projectName, description, workArea, status, skillLearned) {
  try {
    const sheet = getSheet(SHEET_NAMES.BATCHES);
    const headers = sheet.getDataRange().getValues()[0];

    // Check if batch name already exists
    const nameColIdx = headers.indexOf("BatchName");
    const existing = getSheetDataAsObjects(sheet).find(b => b.BatchName === batchName);
    if (existing) {
      return { status: 'error', message: 'Batch with this name already exists.' };
    }

    const newId = generateUniqueId('BAT', sheet, headers.indexOf("BatchID"));

    const row = new Array(headers.length).fill('');

    const setVal = (hName, val) => {
      let idx = headers.indexOf(hName);
      if (idx === -1) idx = headers.findIndex(h => String(h).replace(/\s+/g, '').toLowerCase() === hName.toLowerCase());
      if (idx !== -1) row[idx] = val;
    };

    setVal("BatchID", newId);
    setVal("BatchName", batchName);
    setVal("Mentor", mentorName);
    setVal("Project", projectName || '');
    setVal("Description", description || '');
    setVal("SkillLearned", skillLearned || '');
    setVal("WorkArea", workArea || 'General');
    setVal("Status", status || 'Active');
    setVal("Students", '[]');

    sheet.appendRow(row);

    // Send email to mentor
    if (mentorName) {
      const mentorEmail = getAdminEmailByName_(mentorName);
      if (mentorEmail) {
        try {
          const subject = `New Batch Assigned: ${batchName}`;
          const title = "New Batch Created";
          const gradient = "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"; // Emerald gradient
          const content = `
            <p style="font-size: 16px; margin-top: 0;">Dear <strong>${mentorName}</strong>,</p>
            <p>You have been assigned as the mentor for the newly created batch:</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #11998e; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; color: #11998e; font-size: 18px;">${batchName}</h3>
              <table style="width: 100%; font-size: 14px; color: #374151;">
                <tr><td style="font-weight: bold; width: 30%; padding: 4px 0;">Project:</td><td>${projectName || 'N/A'}</td></tr>
                <tr><td style="font-weight: bold; padding: 4px 0;">Work Area:</td><td>${workArea || 'General'}</td></tr>
                <tr><td style="font-weight: bold; padding: 4px 0;">Skills:</td><td>${skillLearned || 'N/A'}</td></tr>
                <tr><td style="font-weight: bold; padding: 4px 0;">Status:</td><td>${status || 'Active'}</td></tr>
              </table>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #4b5563;"><strong>Description:</strong> ${description || 'No description provided.'}</p>
            </div>
            
            <p>Please log in to the Admin Dashboard to assign students, configure tasks, and monitor progress.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getPublishedUrl()}" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(17, 153, 142, 0.3);">Access Admin Dashboard</a>
            </div>
          `;
          sendModernHtmlEmail_(mentorEmail, subject, title, gradient, content);
        } catch (e) {
          Logger.log('Error sending email to mentor: ' + e.toString());
        }
      }
    }

    return { status: 'success', message: 'Batch created successfully.', batchId: newId };

  } catch (e) {
    Logger.log('Error in createBatch: ' + e.toString());
    return { status: 'error', message: 'Failed to create batch: ' + e.message };
  }
}


function assignStudentsToBatch(regIds, batchName, forceMove = false) { // regIds is array of strings
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const batchColIndex = headers.indexOf('Batch');
    const regIdColIndex = headers.indexOf('RegistrationID');

    const statusColIndex = headers.indexOf('ApplicationStatus') !== -1 ? headers.indexOf('ApplicationStatus') : headers.indexOf('Status');

    if (batchColIndex === -1) {
      return { status: 'error', message: '"Batch" column not found in Registrations sheet.' };
    }

    const data = sheet.getDataRange().getValues();
    let updateCount = 0;
    let errors = [];

    // regIds might be a JSON string if passed from some weird UI, but usually array.
    if (typeof regIds === 'string') {
      try { regIds = JSON.parse(regIds); } catch (e) { regIds = [regIds]; }
    }

    regIds.forEach(id => {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        const rowRegId = String(data[i][regIdColIndex]).trim();
        if (rowRegId === String(id).trim()) {
          found = true;
          const currentBatch = String(data[i][batchColIndex] || '').trim();
          const appStatus = statusColIndex !== -1 ? String(data[i][statusColIndex] || '').trim().toLowerCase() : 'approved';
          const actualStatusCol = headers.indexOf('Status');
          const actualStatus = actualStatusCol !== -1 ? String(data[i][actualStatusCol] || '').trim().toLowerCase() : '';

          const endCol = headers.indexOf('InternshipEndDate');
          const endDate = endCol !== -1 ? data[i][endCol] : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isExpired = endDate instanceof Date && endDate < today;

          if (currentBatch !== '' && currentBatch !== batchName) {
            if (forceMove) {
              // Remove from OLD batch JSON record first
              _removeStudentFromBatchesList(id, currentBatch);
            } else {
              errors.push(`Student ${id} is already in batch: ${currentBatch}`);
              break;
            }
          }

          if (appStatus !== 'approved') {
            errors.push(`Student ${id} is not "Approved". Current Status: ${appStatus}`);
          } else if (actualStatus !== 'vacant' && actualStatus !== '' && !forceMove) {
            // Note: If forceMove is true, we allow moving even if not 'vacant' (as they are in a batch)
            errors.push(`Student ${id} status must be "Vacant". Current: ${actualStatus}`);
          } else if (isExpired) {
            errors.push(`Student ${id} internship period has expired.`);
          } else {
            sheet.getRange(i + 1, batchColIndex + 1).setValue(batchName);
            // Update Status to Active if it was Vacant or empty or previously Active in another batch
            const statusCol = headers.indexOf('Status');
            if (statusCol !== -1) {
              sheet.getRange(i + 1, statusCol + 1).setValue('Active');
            }
            updateCount++;

            // 3. Add student ID to the NEW Batch record in Batches sheet
            _addStudentToBatchesList(id, batchName);
          }
          break;
        }
      }
      if (!found) errors.push(`Student ${id} not found.`);
    });

    if (updateCount === 0 && errors.length > 0) {
      return { status: 'error', message: errors.join('\n') };
    }

    SpreadsheetApp.flush();
    return {
      status: 'success',
      message: `Successfully assigned ${updateCount} students to ${batchName}.` + (errors.length > 0 ? ` Note: ${errors.length} students skipped.` : ''),
      errors: errors
    };

  } catch (e) {
    Logger.log('Error in assignStudentsToBatch: ' + e.toString());
    return { status: 'error', message: e.message };
  }
}

/**
 * Internal helper to remove a student ID from a batch's JSON list in the Batches sheet.
 */
function _removeStudentFromBatchesList(regId, batchName) {
  try {
    const batchSheet = getSheet(SHEET_NAMES.BATCHES);
    if (!batchSheet) return;
    const bData = batchSheet.getDataRange().getValues();
    const bHeaders = bData[0];
    const bNameCol = bHeaders.indexOf("BatchName");
    const bStuCol = bHeaders.indexOf("Students");

    if (bNameCol === -1 || bStuCol === -1) return;

    for (let i = 1; i < bData.length; i++) {
      if (String(bData[i][bNameCol]).trim() === String(batchName).trim()) {
        let students = [];
        try {
          students = bData[i][bStuCol] ? JSON.parse(bData[i][bStuCol]) : [];
        } catch (e) { }
        if (Array.isArray(students)) {
          const newList = students.filter(id => String(id) !== String(regId));
          batchSheet.getRange(i + 1, bStuCol + 1).setValue(JSON.stringify(newList));
        }
        break;
      }
    }
  } catch (e) {
    Logger.log("Error in _removeStudentFromBatchesList: " + e.message);
  }
}

/**
 * Internal helper to add a student ID to a batch's JSON list in the Batches sheet.
 */
function _addStudentToBatchesList(regId, batchName) {
  try {
    const batchSheet = getSheet(SHEET_NAMES.BATCHES);
    if (!batchSheet) return;
    const bData = batchSheet.getDataRange().getValues();
    const bHeaders = bData[0];
    const bNameCol = bHeaders.indexOf("BatchName");
    const bStuCol = bHeaders.indexOf("Students");

    if (bNameCol === -1 || bStuCol === -1) return;

    for (let i = 1; i < bData.length; i++) {
      if (String(bData[i][bNameCol]).trim() === String(batchName).trim()) {
        let students = [];
        try {
          students = bData[i][bStuCol] ? JSON.parse(bData[i][bStuCol]) : [];
        } catch (e) { }
        if (Array.isArray(students)) {
          if (!students.includes(String(regId))) {
            students.push(String(regId));
            batchSheet.getRange(i + 1, bStuCol + 1).setValue(JSON.stringify(students));
          }
        }
        break;
      }
    }
  } catch (e) {
    Logger.log("Error in _addStudentToBatchesList: " + e.message);
  }
}

function addStudentToBatch(regId, batchName) {
  return assignStudentsToBatch([regId], batchName);
}

function removeStudentFromBatch(regId) {
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const batchColIndex = headers.indexOf('Batch');
    const regIdColIndex = headers.indexOf('RegistrationID');

    if (batchColIndex === -1 || regIdColIndex === -1) return { status: 'error', message: 'Columns not found' };

    let batchName = '';
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][regIdColIndex]) === String(regId)) {
        batchName = String(data[i][batchColIndex] || '').trim();
        sheet.getRange(i + 1, batchColIndex + 1).setValue(''); // Clear batch
        // Set status to Vacant
        const statusCol = headers.indexOf('Status');
        if (statusCol !== -1) {
          sheet.getRange(i + 1, statusCol + 1).setValue('Vacant');
        }
        break;
      }
    }

    if (batchName) {
      _removeStudentFromBatchesList(regId, batchName);
    }

    return { status: 'success', message: 'Student removed from batch.' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function getBatchDetails(batchName) {
  try {
    const cleanBatchName = (batchName || '').trim();
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const data = getSheetDataAsObjects(regSheet);

    // Filter students in this batch (Case-insensitive check for robustness)
    const students = data.filter(s => (s.Batch || '').trim().toLowerCase() === cleanBatchName.toLowerCase()).map(s => ({
      regId: s.RegistrationID,
      name: `${s.FirstName} ${s.LastName}`,
      email: s.GmailID,
      photo: s.ProfilePhotoUrl,
      // return project title if you want to display it
      // But projects are in separate sheet.
    }));

    return { status: 'success', students: students };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function deleteBatch(batchId) {
  try {
    const batchSheet = getSheet(SHEET_NAMES.BATCHES);
    const batchData = batchSheet.getDataRange().getValues();
    const headers = batchData[0];
    const idCol = headers.indexOf("BatchID");
    const nameCol = headers.indexOf("BatchName");
    const studentsCol = headers.indexOf("Students");

    if (idCol === -1) return { status: 'error', message: 'BatchID column not found' };

    let rowIndex = -1;
    let batchName = '';
    let studentIds = [];

    for (let i = 1; i < batchData.length; i++) {
      if (String(batchData[i][idCol]) === String(batchId)) {
        rowIndex = i + 1;
        batchName = batchData[i][nameCol];
        const raw = batchData[i][studentsCol];
        try { studentIds = raw ? JSON.parse(raw) : []; } catch (e) { }
        break;
      }
    }

    if (rowIndex === -1) return { status: 'error', message: 'Batch not found' };

    // 1. Clear Batch for students
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const regData = regSheet.getDataRange().getValues();
    const rRegCol = regData[0].indexOf("RegistrationID");
    const rBatchCol = regData[0].indexOf("Batch");

    if (rRegCol !== -1 && rBatchCol !== -1) {
      for (let i = 1; i < regData.length; i++) {
        if (studentIds.includes(String(regData[i][rRegCol])) || regData[i][rBatchCol] === batchName) {
          regSheet.getRange(i + 1, rBatchCol + 1).setValue('');
        }
      }
    }

    // 2. Delete correlated data (Chat History, Slots, etc.) to save space
    try {
      deleteRowsByColumnValue(SHEET_NAMES.BATCH_CHAT, 'BatchName', batchName);
      deleteRowsByColumnValue(SHEET_NAMES.SLOTS, 'BatchID', batchId);
      deleteRowsByColumnValue(SHEET_NAMES.SLOT_EXCEPTIONS, 'BatchID', batchId);
    } catch (err) {
      Logger.log(`Batch Cleanup Warning: ${err.message}`);
    }

    // 3. Delete the row
    batchSheet.deleteRow(rowIndex);

    // 4. Force a sync check for students
    syncRegistrationsWithBatches();

    return { status: 'success', message: 'Batch deleted and associated data cleaned.' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/**
 * System Maintenance: Syncs the Registration sheet's 'Batch' column with actual batches.
 * If a batch doesn't exist in the 'Batches' sheet, the student's batch assignment is cleared.
 */
function syncRegistrationsWithBatches() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const batchSheet = getSheet(SHEET_NAMES.BATCHES);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);

    // Invalidate cache to ensure we read fresh data after batch deletion
    executionCache.delete(SHEET_NAMES.BATCHES);
    executionCache.delete(SHEET_NAMES.REGISTRATIONS);

    const batches = getSheetDataAsObjects(batchSheet).map(b => String(b.BatchName).replace(/\s+/g, '').toLowerCase());
    const regData = regSheet.getDataRange().getValues();
    const headers = regData[0];
    const batchCol = headers.indexOf('Batch');
    const statusCol = headers.indexOf('Status');

    if (batchCol === -1) return;

    let syncCount = 0;
    for (let i = 1; i < regData.length; i++) {
      const currentVal = String(regData[i][batchCol] || '').replace(/\s+/g, '').toLowerCase();
      const originalVal = String(regData[i][batchCol] || '').trim();
      if (originalVal && !batches.includes(currentVal)) {
        // The batch assigned to this student doesn't exist anymore
        regSheet.getRange(i + 1, batchCol + 1).setValue('');
        if (statusCol !== -1) regSheet.getRange(i + 1, statusCol + 1).setValue('Vacant');
        syncCount++;
      }
    }
    Logger.log(`Sync complete: ${syncCount} assignments cleared.`);
  } catch (e) {
    Logger.log(`Sync Error: ${e.message}`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Prunes activity logs older than 60 days to save space.
 */
function pruneOldActivityLogs() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - 60);

    const targetSheets = [SHEET_NAMES.RECENT_ACTIVITY, SHEET_NAMES.ACTIVITY_LOG, SHEET_NAMES.ADMIN_NOTIFICATIONS, SHEET_NAMES.NOTIFICATIONS];

    targetSheets.forEach(sheetName => {
      const sheet = getSheet(sheetName);
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return; // Only headers

      const headers = data[0];
      const tsCol = headers.indexOf("Timestamp");
      if (tsCol === -1) return;

      // Delete rows from bottom to top to maintain index
      let deleteCount = 0;
      for (let i = data.length - 1; i >= 1; i--) {
        const ts = new Date(data[i][tsCol]);
        if (ts instanceof Date && !isNaN(ts.getTime()) && ts < cutOffDate) {
          sheet.deleteRow(i + 1);
          deleteCount++;
        }
      }
      Logger.log(`${sheetName}: Purged ${deleteCount} rows.`);
    });
  } catch (e) {
    Logger.log(`Pruning Error: ${e.message}`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Global Maintenance Trigger - Call this periodically
 */
function runMaintenanceTasks() {
  pruneOldActivityLogs();
  syncRegistrationsWithBatches();
  syncCompletedInternships();
  return { status: 'success', message: 'Maintenance completed.' };
}

/**
 * Synchronizes completed internship records to the Consolidated_Internships sheet.
 * Archivists data for students whose internship period has ended.
 */
/**
 * Synchronizes completed internship records to the Consolidated_Internships and Consolidated_Template sheets.
 * Archives data for students whose internship period has ended.
 */
function syncCompletedInternships() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 seconds
    const ss = getSpreadsheet();
    const regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
    const consSheet = ss.getSheetByName(SHEET_NAMES.CONSOLIDATED_INTERNSHIPS);
    const templateSheet = getSheet(SHEET_NAMES.CONSOLIDATED_TEMPLATE); // Auto-creates if missing
    const certSheet = ss.getSheetByName(SHEET_NAMES.CERTIFICATE_DATA);

    if (!regSheet || !consSheet || !templateSheet) {
      Logger.log("syncCompletedInternships: Required sheets not found.");
      return { status: 'error', message: 'Sheets not found' };
    }

    // Load data as objects for easier mapping
    const regData = getSheetDataAsObjects(regSheet);
    const consData = getSheetDataAsObjects(consSheet);
    const templateData = getSheetDataAsObjects(templateSheet);
    const certData = certSheet ? getSheetDataAsObjects(certSheet) : [];

    // Map existing IDs to avoid duplicates
    const existingConsIds = new Set(consData.map(r => String(r.RegistrationID)));
    const existingTemplateIds = new Set(templateData.map(r => String(r["Registration ID"])));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let syncedCount = 0;

    for (const student of regData) {
      const regId = String(student.RegistrationID);
      const endDateVal = student.InternshipEndDate;

      if (!endDateVal) continue;

      const endDate = new Date(endDateVal);
      endDate.setHours(0, 0, 0, 0);

      // If internship has ended
      if (endDate <= today) {

        // 1. Sync to Consolidated_Internships (Legacy Full Copy)
        if (!existingConsIds.has(regId)) {
          // Find original row in regSheet to preserve all columns exactly
          const rawRegValues = regSheet.getDataRange().getValues();
          const originalRow = rawRegValues.find(row => String(row[1]) === regId);
          if (originalRow) consSheet.appendRow(originalRow);
        }

        // 2. Sync to Consolidated_Template (New 13-column format from user template)
        if (!existingTemplateIds.has(regId)) {
          const certificate = certData.find(c => String(c.StudentRegistrationID) === regId);

          const templateRow = [
            certificate ? certificate.CertificateNumber : 'NOT_ISSUED',
            certificate ? (certificate.IssuedDate instanceof Date ? certificate.IssuedDate.toISOString().split('T')[0] : certificate.IssuedDate) : '',
            `${student.FirstName || ''} ${student.LastName || ''}`.trim(),
            student.RegisterNumber || '',
            student.Department || '',
            student.CollegeName || '',
            student.CollegeDistrict || '',
            student.InternshipStartDate || '',
            student.InternshipEndDate || '',
            student.DurationDays || '',
            student.Batch || '',
            regId,
            student.ApplicationStatus || 'Valid'
          ];

          templateSheet.appendRow(templateRow);
          syncedCount++;
          Logger.log(`syncCompletedInternships: Synced student ${regId} to Template.`);
        }
      }
    }

    return { status: 'success', synced: syncedCount };
  } catch (e) {
    Logger.log("Error in syncCompletedInternships: " + e.toString());
    return { status: 'error', message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// --- BATCH CHAT ---

function getBatchChat(batchName) {
  try {
    const sheet = getSheet(SHEET_NAMES.BATCH_CHAT);
    if (!sheet) return { status: 'success', messages: [] };

    const data = getSheetDataAsObjects(sheet);
    if (!data || data.length === 0) return { status: 'success', messages: [] };

    const batchNameLower = (batchName || "").toString().toLowerCase().trim();
    const messages = data.filter(r => (r.BatchName || "").toString().toLowerCase().trim() === batchNameLower);

    messages.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));

    return {
      status: 'success',
      messages: messages.map(m => ({
        id: m.MessageID,
        senderId: m.SenderID,
        senderName: m.SenderName || m.SenderID,
        message: m.Message,
        timestamp: m.Timestamp,
        fileUrl: m.FileUrl || null,
        fileName: m.FileName || null
      }))
    };
  } catch (e) {
    Logger.log("Error in getBatchChat: " + e.toString());
    return { status: 'error', message: e.message, messages: [] };
  }
}

function sendBatchMessage(batchName, senderId, senderName, message, fileData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(SHEET_NAMES.BATCH_CHAT);

    let fileUrl = '';
    let fileName = '';
    let fileId = '';

    if (fileData) {
      if (fileData.base64) {
        const saved = saveChatAttachment(fileData.base64, fileData.mimeType || fileData.type, fileData.name || fileData.fileName);
        if (saved) {
          fileUrl = saved.url;
          fileName = saved.name;
          fileId = saved.id;
        }
      } else if (fileData.url) {
        fileUrl = fileData.url;
        fileName = fileData.name;
        fileId = fileData.id;
      }
    }

    const id = generateUniqueId('MSG', SHEET_NAMES.BATCH_CHAT, 0);
    const timestamp = new Date();

    sheet.appendRow([id, batchName, senderId, senderName, message, timestamp, fileId, fileName, fileUrl]);

    return { status: 'success', message: 'Message sent' };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function saveChatAttachment(base64Data, mimeType, fileName) {
  try {
    const folder = DriveApp.getFolderById(getSystemFolderId('chat'));
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      id: file.getId(),
      url: file.getUrl(),
      name: file.getName()
    };
  } catch (e) {
    Logger.log("Error saving chat attachment: " + e.toString());
    return null;
  }
}

// Redundant chat functions removed (consolidated in the final block)



// =================================================================================
// STUDENT DASHBOARD BACKEND FUNCTIONS
// =================================================================================

// Consolidated Attendance Functions moved to final block

function getAllAttendanceRequests() {
  try {
    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!otpSheet || !regSheet) return [];

    const otpData = otpSheet.getDataRange().getValues();
    const students = getSheetDataAsObjects(regSheet);
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.RegistrationID] = getStudentFullName_(s);
    });

    const requests = [];
    const headers = otpData[0];
    const colMap = {};
    headers.forEach((h, i) => colMap[h] = i);

    // Columns: RegistrationID, OTP, ActionType, Expiry, TargetDate, Reason, Status, Timestamp
    for (let i = 1; i < otpData.length; i++) {
      const row = otpData[i];
      const status = String(row[colMap["Status"]] || "").toLowerCase();

      // We show Pending and Awaiting OTP requests
      if (status === 'pending' || status === 'awaiting otp') {
        const regId = row[colMap["RegistrationID"]];
        const expiryDate = row[colMap["ExpiryTimestamp"]];
        const targetDate = row[colMap["TargetDate"]];

        requests.push({
          rowId: i + 1,
          regId: regId,
          studentName: studentMap[regId] || 'Unknown Student',
          otp: row[colMap["OTP"]] || '---',
          type: row[colMap["ActionType"]] || 'Correction',
          expiry: expiryDate instanceof Date ? expiryDate.toLocaleString() : expiryDate,
          date: targetDate instanceof Date ? targetDate.toLocaleDateString() : targetDate,
          reason: row[colMap["Reason"]] || 'No reason provided',
          status: row[colMap["Status"]] || 'Pending',
          timestamp: row[colMap["Timestamp"]]
        });
      }
    }

    // Sort by timestamp descending (newest first)
    requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return requests;
  } catch (e) {
    Logger.log("Error in getAllAttendanceRequests: " + e.message);
    return [];
  }
}

function getAttendanceRecords(dateFilter, statusFilter, regIdFilter, endDateFilter) {
  try {
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!attSheet || !regSheet) return [];

    const allStudents = getSheetDataAsObjects(regSheet);
    let attRecords = getSheetDataAsObjects(attSheet);

    // Build student lookup for enrichment
    const studentLookup = new Map();
    allStudents.forEach(s => {
      const rid = String(s.RegistrationID || '').trim().toUpperCase();
      if (rid) {
        studentLookup.set(rid, {
          name: getStudentFullName_(s),
          batch: s.Batch || '',
          college: s.CollegeName || '',
          status: s.ApplicationStatus || s.Status || ''
        });
      }
    });

    let filteredAtt = attRecords;

    // Filter by Date Range (Ensure truthy values to avoid empty string mismatch)
    if (dateFilter && endDateFilter && dateFilter.trim() !== '' && endDateFilter.trim() !== '') {
      const getNormalizedDate = (dStr) => {
        let d;
        if (dStr.includes('-')) {
          const parts = dStr.split('-');
          d = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
          d = new Date(dStr);
        }
        d.setHours(0, 0, 0, 0);
        return d;
      };
      const start = getNormalizedDate(dateFilter);
      const end = getNormalizedDate(endDateFilter);
      end.setHours(23, 59, 59, 999);

      filteredAtt = filteredAtt.filter(r => {
        const d = new Date(r.Date);
        return d >= start && d <= end;
      });
    } else if (dateFilter && dateFilter.trim() !== '') {
      filteredAtt = filteredAtt.filter(r => formatDate(r.Date) === dateFilter || formatDateISO(r.Date) === dateFilter);
    }

    // Filter by Status (Normalized match)
    if (statusFilter && statusFilter !== 'All') {
      const sf = statusFilter.toLowerCase();
      filteredAtt = filteredAtt.filter(r => {
        const rs = String(r.Status || '').toLowerCase();
        if (sf === 'present') return rs.includes('present') || rs.includes('in') || rs.includes('out') || rs.includes('late');
        if (sf === 'absent') return rs.includes('absent');
        if (sf === 'missing / no log') return rs.includes('missed') || rs.includes('missing') || rs.includes('empty');
        return rs === sf;
      });
    }

    let finalRecords = filteredAtt;

    // Filter by Text / Reg ID
    if (regIdFilter) {
      const q = regIdFilter.toLowerCase();
      const qNoSpace = q.replace(/\s+/g, '');

      finalRecords = filteredAtt.filter(r => {
        let dateStr = '';
        if (r.Date) {
          try {
            const d = new Date(r.Date);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleString('default', { month: 'long', year: 'numeric', day: 'numeric' }).toLowerCase();
            }
          } catch (e) { }
        }
        const rawDate = r.Date ? String(r.Date).toLowerCase() : '';
        const statusStr = (r.Status || '').toLowerCase();
        const studentRegIdLower = String(r.StudentRegistrationID || '').toLowerCase();

        const sInfo = studentLookup.get(String(r.StudentRegistrationID || '').trim().toUpperCase());
        const studentNameStr = sInfo ? sInfo.name.toLowerCase() : (r.StudentName || '').toLowerCase();
        const studentNameNoSpace = studentNameStr.replace(/\s+/g, '');
        const batchStr = sInfo ? sInfo.batch.toLowerCase() : '';
        const collegeStr = sInfo ? sInfo.college.toLowerCase() : '';

        return statusStr.includes(q) ||
          dateStr.includes(q) ||
          rawDate.includes(q) ||
          studentRegIdLower.includes(q) ||
          studentRegIdLower.replace(/\s+/g, '').includes(qNoSpace) ||
          studentNameStr.includes(q) ||
          studentNameNoSpace.includes(qNoSpace) ||
          batchStr.includes(q) ||
          collegeStr.includes(q);
      });

      // Add placeholders ONLY if they don't have ANY log in the entire attRecords (for generic search)
      // When specific student is searched, the client-side generates placeholders for the specific range.
      const matchedStudents = allStudents.filter(s => {
        const fullName = getStudentFullName_(s).toLowerCase();
        const fullNameNoSpace = fullName.replace(/\s+/g, '');
        const regId = (s.RegistrationID || '').toLowerCase();
        const batch = (s.Batch || '').toLowerCase();
        const college = (s.CollegeName || '').toLowerCase();
        return (regId.includes(q) || regId.replace(/\s+/g, '').includes(qNoSpace) ||
          fullName.includes(q) || fullNameNoSpace.includes(qNoSpace) ||
          batch.includes(q) || college.includes(q));
      });

      const studentsWithAnyLog = new Set(attRecords.map(r => String(r.StudentRegistrationID || '').trim().toUpperCase()));
      matchedStudents.forEach(s => {
        const rid = String(s.RegistrationID || '').trim().toUpperCase();
        if (!studentsWithAnyLog.has(rid)) {
          finalRecords.push({
            AttendanceID: 'N/A',
            StudentRegistrationID: s.RegistrationID,
            StudentName: getStudentFullName_(s),
            Date: s.InternshipStartDate || new Date(),
            Status: 'Missing / No Log',
            InTime: 'N/A',
            OutTime: 'N/A',
            Remarks: 'Never signed in',
            WorkArea: s.Batch || 'General',
            isPlaceholder: true
          });
        }
      });
    }

    // Sort by date descending
    finalRecords.sort((a, b) => {
      // 1. Primary Sort: Date
      const dateA = String(a.Date || '').trim();
      const dateB = String(b.Date || '').trim();
      if (dateA !== dateB) {
        // Compare YYYY-MM-DD strings directly (string comparison works for this format)
        return dateB.localeCompare(dateA);
      }

      // 2. Secondary Sort: Timestamp or ID (if dates are equal)
      const tsB = b.Timestamp || 0;
      const tsA = a.Timestamp || 0;
      if (tsB !== tsA) return tsB - tsA;

      return (a.StudentName || '').localeCompare(b.StudentName || '');
    });
    return finalRecords.slice(0, 1000);

  } catch (e) {
    Logger.log("Error in getAttendanceRecords: " + e.toString());
    return [];
  }
}

/**
 * Gets attendance data for a specific student for calendar display.
 */
function getAttendanceCalendarData(regId) {
  try {
    const studentResp = getStudentFullData(regId);
    if (studentResp.status !== 'success') return { status: 'error', message: 'Student not found.' };
    const student = studentResp.studentData;

    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const data = getSheetDataAsObjects(attSheet);
    const records = data.filter(a => String(a.StudentRegistrationID) === String(regId));

    const attMap = {};
    records.forEach(r => {
      const d = formatDate(r.Date);
      attMap[d] = {
        status: r.Status,
        inTime: r.InTime || '',
        outTime: r.OutTime || '',
        workArea: r.WorkArea || 'General',
        remarks: r.Remarks || '',
        adminComment: r.AdminComment || '',
        isRead: r.IsCommentRead === true || r.IsCommentRead === 'TRUE'
      };
    });

    // 5. Files from FileManager
    let files = [];
    const filesResp = getStudentFiles(regId);
    if (filesResp.status === 'success') {
      files = filesResp.files;
    }

    return {
      status: 'success',
      internStart: formatDateISO(student.InternshipStartDate) || formatDate(student.InternshipStartDate),
      internEnd: formatDateISO(student.InternshipEndDate) || formatDate(student.InternshipEndDate),
      attendance: attMap,
      studentInfo: {
        name: `${student.FirstName} ${student.LastName}`,
        regId: student.RegistrationID,
        batch: student.Batch || 'N/A'
      },
      files: files
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Sends a modern, colorful, stylish HTML mail.
 */
function sendStyledEmail(to, subject, title, body, ctaText = '', ctaUrl = '') {
  let ctaHtml = '';
  if (ctaText && ctaUrl) {
    ctaHtml = `
      <div style="margin: 30px 0; text-align: center;">
        <a href="${ctaUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); display: inline-block;">
          ${ctaText}
        </a>
      </div>`;
  }

  const htmlBody = `
    <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; color: #1e293b; background: white;">
      <div style="background: linear-gradient(135deg, #3d5afe 0%, #00e5ff 100%); padding: 30px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px; letter-spacing: 1px;">${COMPANY_NAME}</h2>
        <p style="margin: 5px 0 0; opacity: 0.9;">Internship Management Portal</p>
      </div>
      <div style="padding: 40px;">
        <h3 style="color: #3d5afe; font-size: 20px; margin-top: 0;">${title}</h3>
        <div style="line-height: 1.6; font-size: 15px;">
          ${body}
        </div>
        ${ctaHtml}
      </div>
      <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
        <p style="margin-bottom: 5px;">This is an automated notification. Please do not reply directly.</p>
        <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: to,
    subject: `Portal Update: ${subject}`,
    htmlBody: htmlBody
  });
}

/**
 * Daily Trigger: Checks for missing attendance, tasks, etc.
 */
function sendDailyReminders() {
  const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  const students = getSheetDataAsObjects(regSheet).filter(s => s.Status === 'Active');
  const todayStr = formatDate(new Date());

  const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
  const attData = getSheetDataAsObjects(attSheet).filter(a => formatDate(a.Date) === todayStr);

  students.forEach(student => {
    const hasAtt = attData.some(a => String(a.StudentRegistrationID) === String(student.RegistrationID) && a.InTime);

    if (!hasAtt) {
      sendStyledEmail(
        student.GmailID,
        'Attendance Missing',
        'Morning Attendance Reminder',
        `Dear ${student.FirstName},<br><br>We noticed you haven't marked your attendance for today (${todayStr}) yet. Please log in to the portal and mark your check-in before the grace period ends.<br><br>Also, ensure your <b>Daily Diary</b> and <b>Current Tasks</b> are updated.`,
        'Log Attendance',
        'https://gsvee.in/portal'
      );
    }
  });
}

/**
 * Handle WFH Requests
 */
function submitWfhRequest(regId, date, reason) {
  try {
    const studentResp = getStudentFullData(regId);
    if (studentResp.status !== 'success') return { status: 'error', message: 'Student not found.' };

    // Instead of directly updating the attendance sheet, create an OTP/Request entry 
    // so it shows up in the Admin's Correction/Leave approval queue as a 'WFH' type.
    const result = requestAttendanceCorrection(regId, date, reason, 'WFH', null);

    // If successfully queued, return a friendly message
    if (result.status === 'success') {
      return { status: 'success', message: 'WFH Reservation submitted to Admin for approval.' };
    } else {
      return result;
    }
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/**
 * Handle WFH Appeal
 */
function submitWfhAppeal(regId, date, reason) {
  try {
    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const data = otpSheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID');
    const regCol = headers.indexOf('RegistrationID');
    const dateCol = headers.indexOf('TargetDate');
    const typeCol = headers.indexOf('LeaveType');
    const statusCol = headers.indexOf('Status');
    const reasonCol = headers.indexOf('Reason');

    let found = false;
    for (let i = data.length - 1; i >= 1; i--) {
      const rowDate = data[i][dateCol] instanceof Date ? formatDateISO(data[i][dateCol]) : data[i][dateCol];
      if (String(data[i][regCol]) === String(regId) && rowDate === date && String(data[i][typeCol]).toUpperCase() === 'WFH') {
        otpSheet.getRange(i + 1, statusCol + 1).setValue('Pending Appeal');
        otpSheet.getRange(i + 1, reasonCol + 1).setValue('[Appeal] ' + reason);
        found = true;
        break;
      }
    }

    const reqSheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (reqSheet) {
      const rData = reqSheet.getDataRange().getValues();
      const rHeaders = rData[0];
      const rRegCol = rHeaders.indexOf('RegistrationID');
      const rDateCol1 = rHeaders.indexOf('TargetDate');
      const rDateCol2 = rHeaders.indexOf('Date');
      const targetDateCol = rDateCol1 !== -1 ? rDateCol1 : rDateCol2;
      const rTypeCol = rHeaders.indexOf('LeaveType');
      const rStatusCol = rHeaders.indexOf('Status');
      const rReasonCol = rHeaders.indexOf('Reason');

      if (targetDateCol !== -1) {
        for (let j = rData.length - 1; j >= 1; j--) {
          const rowDate = rData[j][targetDateCol] instanceof Date ? formatDateISO(rData[j][targetDateCol]) : rData[j][targetDateCol];
          if (String(rData[j][rRegCol]) === String(regId) && rowDate === date && String(rData[j][rTypeCol]).toUpperCase() === 'WFH') {
            reqSheet.getRange(j + 1, rStatusCol + 1).setValue('Pending Appeal');
            reqSheet.getRange(j + 1, rReasonCol + 1).setValue('[Appeal] ' + reason);
            break;
          }
        }
      }
    }

    if (!found) {
      requestAttendanceCorrection(regId, date, '[Appeal] ' + reason, 'WFH', null);
    }

    return { status: 'success', message: 'WFH Appeal submitted to Admin for reconsideration.' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/**
 * Generates a consolidated attendance PDF based on provided filters.
 */
function generateConsolidatedAttendancePDF(options = {}) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const allStudents = getSheetDataAsObjects(regSheet);
    let records = getSheetDataAsObjects(sheet);

    let studentInfo = null;
    let batchInfo = null;

    if (options.regId) {
      const student = allStudents.find(s => s.RegistrationID === options.regId);
      if (student) {
        studentInfo = {
          name: getStudentFullName_(student),
          regId: student.RegistrationID,
          regNo: student.RegisterNumber || 'N/A',
          college: student.CollegeName || 'N/A',
          project: student.ProjectTitle || student.Project || 'N/A',
          batch: student.Batch || 'N/A',
          mentor: student.Mentor || student.Supervisor || student.MentorName || 'N/A',
          start: formatDateDisplay(student.InternshipStartDate),
          end: formatDateDisplay(student.InternshipEndDate)
        };
      }
    }

    if (options.batchName) {
      const batchStudents = allStudents.filter(s => s.Batch === options.batchName);
      const batchRegIds = new Set(batchStudents.map(s => s.RegistrationID));
      records = records.filter(r => batchRegIds.has(r.StudentRegistrationID));

      const bDat = getSheetDataAsObjects(getSheet(SHEET_NAMES.BATCHES)).find(b => b.BatchID === options.batchName || b.BatchName === options.batchName);

      batchInfo = {
        name: options.batchName,
        mentor: bDat ? (bDat.Mentor || bDat.Supervisor || 'N/A') : 'N/A',
        studentCount: batchStudents.length
      };
    }

    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      const end = new Date(options.endDate);
      records = records.filter(r => {
        const d = new Date(r.Date);
        return d >= start && d <= end;
      });
    }

    if (options.regId && !options.batchName) {
      records = records.filter(r => r.StudentRegistrationID === options.regId);
    }

    if (records.length === 0 && !options.startDate) return { status: 'error', message: 'No records found for PDF.' };

    // Fill missing dates with 'Missed / Absent' for requested boundaries
    if (options.startDate && options.endDate) {
      let relevantRegIds = [];
      if (options.regId) relevantRegIds = [options.regId];
      else if (options.batchName) {
        relevantRegIds = allStudents.filter(s => s.Batch === options.batchName).map(s => s.RegistrationID);
      }

      if (relevantRegIds.length > 0) {
        let paddedRecords = [];
        let startD = new Date(options.startDate);
        let endD = new Date(options.endDate);
        startD.setHours(0, 0, 0, 0);
        endD.setHours(0, 0, 0, 0);

        let today = new Date();
        today.setHours(0, 0, 0, 0);
        if (endD > today) endD = today; // Don't pad future missing days

        relevantRegIds.forEach(rid => {
          const stuRecs = records.filter(r => String(r.StudentRegistrationID) === String(rid));
          const stuDateMap = new Set(stuRecs.map(r => {
            const dt = r.Date instanceof Date ? r.Date : new Date(r.Date);
            return `${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')}`;
          }));
          const stuObj = allStudents.find(s => s.RegistrationID === rid);
          const stuName = stuObj ? getStudentFullName_(stuObj) : rid;

          paddedRecords.push(...stuRecs);

          for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === 0) continue; // Skip Sundays automatically
            const dStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

            if (!stuDateMap.has(dStr)) {
              paddedRecords.push({
                StudentRegistrationID: rid,
                StudentName: stuName,
                Date: new Date(d),
                Status: 'Missed / Absent',
                InTime: '-',
                OutTime: '-',
                Remarks: 'No log found'
              });
            }
          }
        });
        records = paddedRecords;
      }
    }

    records.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    let reportTitle = options.batchName ? `Batch Attendance: ${options.batchName}` : "Consolidated Attendance Report";
    const header = getReportBrandingHeader(reportTitle);

    let infoSection = '';
    if (studentInfo) {
      infoSection = `
        <div style="margin-bottom: 20px; font-family: 'Arial', sans-serif;">
          <table style="width: 100%; border: none;">
            <tr>
              <td style="border:none; padding: 2px;"><strong>Student Name:</strong> ${studentInfo.name}</td>
              <td style="border:none; padding: 2px;"><strong>Reg ID:</strong> ${studentInfo.regId}</td>
            </tr>
            <tr>
              <td style="border:none; padding: 2px;"><strong>Register No:</strong> ${studentInfo.regNo}</td>
              <td style="border:none; padding: 2px;"><strong>Batch:</strong> ${studentInfo.batch}</td>
            </tr>
            <tr>
              <td style="border:none; padding: 2px;"><strong>College:</strong> ${studentInfo.college}</td>
              <td style="border:none; padding: 2px;"><strong>Mentor:</strong> ${studentInfo.mentor}</td>
            </tr>
            <tr>
              <td style="border:none; padding: 2px;" colspan="2"><strong>Project:</strong> ${studentInfo.project}</td>
            </tr>
            <tr>
              <td style="border:none; padding: 2px;" colspan="2"><strong>Internship Period:</strong> ${studentInfo.start} to ${studentInfo.end}</td>
            </tr>
          </table>
        </div>`;
    } else if (batchInfo) {
      infoSection = `
        <div style="margin-bottom: 20px; font-family: 'Arial', sans-serif;">
          <table style="width: 100%; border: none;">
            <tr>
              <td style="border:none; padding: 2px;"><strong>Batch Name:</strong> ${batchInfo.name}</td>
              <td style="border:none; padding: 2px;"><strong>Students:</strong> ${batchInfo.studentCount}</td>
            </tr>
            <tr>
              <td style="border:none; padding: 2px;"><strong>Mentor / Supervisor:</strong> ${batchInfo.mentor}</td>
              <td style="border:none; padding: 2px;"><strong>Period:</strong> ${options.startDate ? (formatDateDisplay(options.startDate) + ' to ' + formatDateDisplay(options.endDate)) : 'All Time'}</td>
            </tr>
          </table>
        </div>`;
    }


    let html = `
      <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
          .header-brand { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 8px; font-size: 11px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .status-present { color: #10b981; font-weight: bold; }
          .status-absent { color: #ef4444; font-weight: bold; }
          .status-od { color: #3b82f6; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 9px; text-align: center; border-top: 1px solid #ccc; padding-top: 5px; }
        </style>
      </head>
      <body>
        ${header}
        ${infoSection}
        <table>
          <thead>
            <tr>
              ${options.batchName ? '<th>Student Name</th>' : ''}
              <th>Date</th>
              <th>Status</th>
              <th>In Time</th>
              <th>Out Time</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
    `;

    records.forEach(r => {
      const statusClass = `status-${(r.Status || "").toLowerCase().split(' ')[0]}`; // handle "WFH Pending" etc.
      html += `
        <tr>
          ${options.batchName ? `<td>${r.StudentName || r.StudentRegistrationID || 'N/A'}</td>` : ''}
          <td>${formatDateDisplay(r.Date)}</td>
          <td><span class="${statusClass}">${r.Status || 'N/A'}</span></td>
          <td>${r.InTime || '-'}</td>
          <td>${r.OutTime || '-'}</td>
          <td>${r.Remarks || ''}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <div class="footer">Generated on ${new Date().toLocaleString()} | &copy; G.S.V Electrical Enterprises</div>
      </body>
      </html>
    `;

    const folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
    const blob = Utilities.newBlob(html, 'text/html', 'temp.html');
    const pdf = blob.getAs('application/pdf').setName(`Attendance_${options.regId || 'General'}.pdf`);
    const file = folder.createFile(pdf);

    const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
    if (docSheet) {
      docSheet.appendRow([
        generateUniqueId('DOC', SHEET_NAMES.GENERATED_DOCUMENTS, 0),
        options.regId || 'ADMIN_GEN',
        'Attendance Report',
        'REF-' + Date.now(),
        file.getUrl(),
        file.getId(),
        new Date(),
        'No'
      ]);
    }

    return { status: 'success', message: 'PDF Generated', url: file.getUrl() };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function getReportBrandingHeader(reportTitle) {
  return `
    <div style="text-align: center; font-family: 'Arial', sans-serif; color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 10px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: bold;">Vijay Varman.S.DEEE,BE</div>
      <div style="font-size: 12px;">Proprietor | 9092610415</div>
      <div style="font-size: 11px;">GSTIN: 33BJNPV0469B1Z5 | AN ISO 9001 : 2015 Certified Company</div>
      <div style="font-size: 26px; font-weight: 900; margin: 8px 0; color: #d32f2f; font-family: 'Arial Black', sans-serif;">G.S.V Electrical Enterprises</div>
      <div style="font-size: 14px; font-weight: bold;">Electrical Engineers & Contractors</div>
      <div style="font-size: 10px;">New No 51/1 Old No 20/1 Teeds garden 1st Street Sembiyam, perambur, Chennai-11</div>
      <div style="font-size: 10px;">Email: g.s.velectricalenterprises2018@gmail.com | Website: www.gsvee.com</div>
      <div style="font-size: 18px; font-weight: bold; margin-top: 10px; border-top: 1px solid #1a237e; padding-top: 8px; color: #1a237e;">${reportTitle}</div>
    </div>
  `;
}

function getAttendanceRecords_DUPLICATE_DISABLED(dateFilter, statusFilter, regIdFilter) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (!sheet) return [];

    let data = getSheetDataAsObjects(sheet);

    // Filter
    if (dateFilter) {
      // formatDate returns YYYY-MM-DD. Compare directly.
      data = data.filter(r => formatDate(r.Date) === dateFilter);
    }
    if (statusFilter && statusFilter !== 'All') {
      data = data.filter(r => r.Status === statusFilter);
    }
    if (regIdFilter) {
      const lowerReg = regIdFilter.toLowerCase();
      data = data.filter(r => (r.StudentRegistrationID && r.StudentRegistrationID.toLowerCase().includes(lowerReg)) ||
        (r.StudentName && r.StudentName.toLowerCase().includes(lowerReg)));
    }

    // Reverse to show newest first
    data.reverse();

    // Map to frontend expectation
    return data.map(r => ({
      date: formatDate(r.Date),
      regId: r.StudentRegistrationID,
      name: r.StudentName,
      status: r.Status,
      inTime: r.InTime instanceof Date ? r.InTime.toLocaleTimeString() : (r.InTime || '-'),
      outTime: r.OutTime instanceof Date ? r.OutTime.toLocaleTimeString() : (r.OutTime || '-'),
      remarks: r.Remarks
    }));

  } catch (e) {
    Logger.log("Error in getAttendanceRecords: " + e.toString());
    return [];
  }
}

// =================================================================================
// STUDENT ATTENDANCE FUNCTIONS
// =================================================================================

/**
 * Enhanced attendance marking with Check-in/Check-out and Internship period checks.
 * Defaults: 10:30 AM - 6:30 PM. 1hr Grace period.
 */
function markAttendance(registrationId, targetDateStr, type = 'In', mode = 'Manual') {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const stuInfoResp = getStudentFullData(registrationId);
    if (stuInfoResp.status !== 'success') return { status: 'error', message: 'Student records not found.' };
    const student = stuInfoResp.studentData;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = targetDateStr ? new Date(targetDateStr) : today;
    selectedDate.setHours(0, 0, 0, 0);

    // 1. Past/Future Date Checks
    if (selectedDate > today) return { status: 'error', message: 'Cannot mark attendance for future dates.' };
    if (selectedDate < today && mode === 'Manual') {
      return { status: 'correction_required', message: 'Attendance missed for this date. Please submit a Correction Request.' };
    }

    const dateStr = formatDate(selectedDate);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdCol = headers.indexOf("StudentRegistrationID");
    const dateCol = headers.indexOf("Date");
    const inTimeCol = headers.indexOf("InTime");
    const outTimeCol = headers.indexOf("OutTime");
    const statusCol = headers.indexOf("Status");
    const modeCol = headers.indexOf("EntryMode");
    const approvalCol = headers.indexOf("ApprovalStatus");

    let existingRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][regIdCol]) === String(registrationId) && formatDate(new Date(data[i][dateCol])) === dateStr) {
        existingRowIndex = i + 1;
        break;
      }
    }

    const nowTime = new Date();
    const currentTimeStr = nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    // Unified Logic: Slot Timing (Applies to RFID, CODE, and Manual web check-ins)
    let status = 'Present';
    const settings = getAppSettings().settings;
    const slotSystemEnabled = String(settings['SlotSystemEnabled'] || 'true').toLowerCase() !== 'false';

    // Determine effective slot times: batch-level override > global default
    let effectiveSlotStart = settings['ArrivalSlotStart']; // e.g. "09:00 AM"
    let effectiveSlotEnd = settings['ArrivalSlotEnd'];     // e.g. "09:30 AM"

    // Check for batch-level slot timing override
    if (slotSystemEnabled && student.Batch) {
      try {
        const batchSheet = getSheet(SHEET_NAMES.BATCHES);
        if (batchSheet) {
          const batchData = getSheetDataAsObjects(batchSheet);
          const batch = batchData.find(b => b.BatchName === student.Batch);
          if (batch) {
            // Batch-level slot overrides global only if set
            if (batch.SlotStartTime) effectiveSlotStart = batch.SlotStartTime;
            if (batch.SlotEndTime) effectiveSlotEnd = batch.SlotEndTime;
          }
        }
      } catch (e) { Logger.log("Batch slot lookup error: " + e.toString()); }
    }

    if (slotSystemEnabled && type === 'In' && effectiveSlotStart && effectiveSlotEnd) {
      const nowMinutes = parseTime_(currentTimeStr);
      const startMinutes = parseTime_(effectiveSlotStart);

      if (mode === 'Manual' || mode === 'PIN') {
        // Rule: max 2 hours early
        if (nowMinutes < startMinutes - 120) {
          return { status: 'error', message: 'You cannot check-in more than 2 hours before your slot start time.' };
        }
      }

      if (nowMinutes > startMinutes) {
        status = 'Late';
      }
    }

    // If an approved Leave already exists (WFH/OD/Medical), force it back to Present logically.
    if (existingRowIndex !== -1) {
      const leaveType = data[existingRowIndex - 1][headers.indexOf('LeaveType')];
      const appStatus = data[existingRowIndex - 1][headers.indexOf('ApprovalStatus')];
      if (['WFH', 'Medical', 'OD'].includes(leaveType) && appStatus === 'Approved') {
        status = 'Present';
      }
    }
    // Auto-detect Checkout (override 'In' if they already checked in but haven't checked out)
    if (type === 'In' && existingRowIndex !== -1 && data[existingRowIndex - 1][inTimeCol] && !data[existingRowIndex - 1][outTimeCol]) {
      type = 'Out';
    }

    if (type === 'In') {
      if (existingRowIndex !== -1 && data[existingRowIndex - 1][inTimeCol]) {
        return { status: 'error', message: 'Arrival Time already recorded for ' + dateStr };
      }

      if (existingRowIndex === -1) {
        const attendanceId = generateUniqueId('ATT', SHEET_NAMES.ATTENDANCE, 0);
        const row = headers.map(h => {
          if (h === 'AttendanceID') return attendanceId;
          if (h === 'StudentRegistrationID') return registrationId;
          if (h === 'StudentName') return `${student.FirstName} ${student.LastName}`;
          if (h === 'Date') return dateStr;
          if (h === 'Status') return status;
          if (h === 'InTime') return currentTimeStr;
          if (h === 'EntryMode') return mode;
          if (h === 'ApprovalStatus') {
            if (['RFID', 'CODE'].includes(mode)) return 'Approved';
            // Check if today is Sunday
            if (new Date(dateStr).getDay() === 0) return 'Approved';
            return 'Pending';
          }
          if (h === 'Timestamp') return new Date();
          return '';
        });
        sheet.appendRow(row);
      } else {
        sheet.getRange(existingRowIndex, inTimeCol + 1).setValue(currentTimeStr);
        sheet.getRange(existingRowIndex, statusCol + 1).setValue(status);
        if (modeCol !== -1) sheet.getRange(existingRowIndex, modeCol + 1).setValue(mode);
        if (approvalCol !== -1) sheet.getRange(existingRowIndex, approvalCol + 1).setValue(['RFID', 'CODE'].includes(mode) ? 'Approved' : 'Pending');
      }
      return {
        status: 'success',
        message: `Arrival recorded: ${currentTimeStr}${mode === 'Manual' ? ' (Awaiting Admin)' : ''}`,
        time: currentTimeStr
      };
    } else {
      if (existingRowIndex === -1) return { status: 'error', message: 'No Arrival record found for today.' };
      if (data[existingRowIndex - 1][outTimeCol]) return { status: 'error', message: 'Departure Time already recorded.' };

      let finalMessage = 'Departure Time recorded: ' + currentTimeStr;

      if (mode === 'Manual' && slotSystemEnabled && effectiveSlotEnd) {
        const nowMinutes = parseTime_(currentTimeStr);
        const endMinutes = parseTime_(effectiveSlotEnd);
        if (nowMinutes >= endMinutes) {
          if (approvalCol !== -1) sheet.getRange(existingRowIndex, approvalCol + 1).setValue('Approved');
        } else {
          if (approvalCol !== -1) sheet.getRange(existingRowIndex, approvalCol + 1).setValue('Pending');
          finalMessage = 'Early Departure recorded (Awaiting Admin Approval): ' + currentTimeStr;
        }
      }

      sheet.getRange(existingRowIndex, outTimeCol + 1).setValue(currentTimeStr);
      return { status: 'success', message: finalMessage };
    }
  } catch (e) {
    Logger.log('Error in markAttendance: ' + e.toString());
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}


// Duplicate markRfidAttendance removed. Enhanced version is at L15728.


function markAttendanceViaCode(regId, code, dateISO, actionType) {
  try {
    const studentResp = getStudentFullData(regId);
    if (studentResp.status !== 'success') return { status: 'error', message: 'Student ID not found' };
    const student = studentResp.studentData;
    const batchId = student.Batch || '';

    // Validate PIN (using last 4 digits of RegID)
    const expectedCode = String(regId).replace(/\D/g, '').slice(-4).padStart(4, '0');
    const providedCode = String(code).trim();
    if (providedCode !== expectedCode) {
      return { status: 'error', message: 'Invalid Attendance PIN' };
    }

    const today = getTodayStr();
    const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
    const nowStr = Utilities.formatDate(new Date(), zone, "hh:mm a");
    const nowMins = timeToMinutes(nowStr);

    const slot = getSlotTiming(batchId, today, regId);
    if (!slot.enabled || slot.mode === 'disabled') {
      return { status: 'error', message: 'Attendance marking is disabled for your slot today.' };
    }

    // Hierarchy check: Check if RFID only is enabled
    if (slot.mode === 'rfid_only') {
      return { status: 'error', message: 'RFID check-in is required for your current slot. PIN marking is disabled.' };
    }

    // Determine Checkin or Checkout by evaluating current state
    const current = getCurrentStudentStatus(regId);

    // Case 1: Check-In
    if (!current.record || !current.record.InTime) {
      // Validate slot time window (2 hours early grace allowed)
      const slotStartMins = timeToMinutes(slot.start);
      if (nowMins < (slotStartMins - 120)) {
        return { status: 'error', message: 'Check-in not allowed yet. Early grace period is 2 hours before slot start (' + slot.start + ').' };
      }

      // PIN Check-in always requires Admin Approval
      submitAttendanceRequest(regId, "PIN_CHECKIN", "PIN Check-in at " + nowStr, today);

      logActivity('PIN_CHECKIN_REQ', `PIN check-in request submitted for ${student.FirstName} (${regId}) at ${nowStr}`);
      return { status: 'success', message: 'PIN Check-in request submitted for Admin approval.' };
    }

    // Case 2: Check-Out
    else if (!current.record.OutTime) {
      const earlyMins = timeToMinutes(slot.earlyBefore);

      if (nowMins < earlyMins) {
        // Early Checkout: Requires admin approval
        submitAttendanceRequest(regId, "EARLY_EXIT", "PIN Early Checkout at " + nowStr + " (Before " + slot.earlyBefore + ")", today);
        return { status: 'success', message: 'Early checkout request submitted for Admin approval.' };
      } else {
        // On-time Checkout: Record immediately
        const result = recordWebCheckout(regId);
        if (result.status === 'success') {
          logActivity('PIN_CHECKOUT', `On-time PIN Checkout for ${student.FirstName} (${regId}) at ${nowStr}`);
        }
        return result;
      }
    }

    // Case 3: Already done
    else {
      return { status: 'error', message: 'Attendance already completed for today.' };
    }
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}


function parseLocalDate_(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    const copy = new Date(dateInput.getTime());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  
  try {
    const s = String(dateInput).trim();
    // Check for YYYY-MM-DD
    let match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
    }
    // Check for DD/MM/YYYY or DD-MM-YYYY
    match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 0, 0, 0, 0);
    }
    // Fallback standard parse
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    // To handle timezone shift for ISO strings like "2026-06-01T00:00:00.000Z"
    if (s.includes('T') || s.includes('Z')) {
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
    }
    d.setHours(0, 0, 0, 0);
    return d;
  } catch (e) {
    return null;
  }
}

function submitUnifiedStudentRequest(registrationId, requestType, date, reason, details = {}, fileData = null) {
  try {
    const studentResp = getStudentFullData(registrationId);
    if (studentResp.status !== 'success') return { status: 'error', message: 'Student verification failed.' };
    const student = studentResp.studentData;
    const studentName = `${student.FirstName} ${student.LastName || ''}`.trim();

    // 1. Boundary & Date Validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = parseLocalDate_(date);
    if (!targetDate) return { status: 'error', message: 'Invalid request date format.' };

    const isFuture = targetDate > today;
    const isToday = targetDate.getTime() === today.getTime();
    const isPast = targetDate < today;

    // Rule 1: OD, WFH must be strictly Future
    if (['OD', 'WFH'].includes(requestType) && !isFuture) {
      return { status: 'error', message: requestType + ' can only be requested for upcoming (future) dates.' };
    }

    // Rule 2: Medical, Permission, Emergency must be Today or Future
    if (['Medical Leave', 'General Permission', 'Emergency Leave'].includes(requestType) && isPast) {
      return { status: 'error', message: requestType + ' cannot be requested for past dates.' };
    }

    // Rule 3: Check-in Manual / Check-out Early must be Today
    if (['Check-in Manual', 'Check-out Early'].includes(requestType) && !isToday) {
      return { status: 'error', message: requestType + ' can only be requested for the current date.' };
    }

    // Rule 3b: Diary Access / Correction must be Past or Today
    if (['Diary Access Request', 'Slot Correction', 'Correction'].includes(requestType) && isFuture) {
      return { status: 'error', message: requestType + ' can only be requested for past or current dates.' };
    }

    // Rule 4: Internship Boundary Check (Strict)
    const startBound = parseLocalDate_(student.InternshipStartDate || student.StartDate);
    const endBound = parseLocalDate_(student.InternshipEndDate || student.EndDate);
    if (!startBound || !endBound) {
      return { status: 'error', message: 'Internship boundary dates are missing or invalid.' };
    }

    if (targetDate < startBound || (targetDate > endBound && requestType !== 'Grace Period')) {
      return { status: 'error', message: `Request date must be within your internship period (${formatDate(startBound)} to ${formatDate(endBound)}).` };
    }

    // Rule 4b: Diary Access Request Check (Should not be absent)
    if (requestType === 'Diary Access Request') {
      const attRecs = getAttendanceRecords(date, null, registrationId);
      if (!attRecs || attRecs.length === 0 || attRecs[0].Status.toLowerCase() === 'absent' || attRecs[0].Status.toLowerCase().includes('missed')) {
        return { status: 'error', message: 'You cannot request diary access for a day you were absent. Please do an Attendance Correction first.' };
      }
    }

    const targetDateStr = formatDateISO(targetDate);
    const slot = getSlotTiming(student.Batch || '', targetDateStr, registrationId);
    const nowTimeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "hh:mm a");
    const nowMins = (new Date()).getHours() * 60 + (new Date()).getMinutes();

    // Automation 1: General Permission mapped based on slot
    if (requestType === 'General Permission') {
      if (details.permSlot === 'First Half') {
        details.startTime = slot.start || '09:00 AM';
        details.endTime = '01:00 PM';
      } else if (details.permSlot === 'Second Half') {
        details.startTime = '01:00 PM';
        details.endTime = slot.end || '05:00 PM';
      }
    }

    // Rule 5: Early Check-out / Manual timing check
    if (requestType === 'Check-out Early') {
      const endMins = timeToMinutes(slot.end || '18:00 PM');
      if (nowMins >= endMins) {
        return { status: 'error', message: 'Early Check-out requests must be made BEFORE your slot end time.' };
      }
      details.outTime = nowTimeStr;
    }

    if (requestType === 'Check-in Manual') {
      details.inTime = nowTimeStr;
    }

    // 2. Process Attachment (Required for Medical)
    let attachmentUrl = '';
    if (requestType === 'Medical Leave' && !fileData) {
      return { status: 'error', message: 'Medical certificate attachment is required for Sick Leave.' };
    }

    if (fileData) {
      const folder = getOrCreateStudentFolder(registrationId, 'mandatory');
      const blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, `${requestType.replace(' ', '_')}_${registrationId}_${date}_${fileData.fileName}`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      attachmentUrl = file.getUrl();
    }

    const id = generateUniqueId('REQ', SHEET_NAMES.ATTENDANCE_OTP, 0);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setTime(expiry.getTime() + (30 * 60 * 1000));

    // 3. Process Description
    let description = reason;
    if (requestType === 'Slot Correction') {
      description = `Slot Correction: [In: ${details.inTime || '--:--'}, Out: ${details.outTime || '--:--'}]. ${reason}`;
    } else if (requestType === 'Check-in Manual') {
      description = `Manual Check-in Request at ${details.inTime}: ${reason}`;
    } else if (requestType === 'Check-out Early') {
      description = `Early Check-out Request at ${details.outTime}: ${reason}`;
    } else if (requestType === 'WFH') {
      description = `WFH Request (${details.wfhSlot || 'Standard'}): ${details.startTime} to ${details.endTime}. 8 Working Hours. ${reason}`;
    } else if (requestType === 'General Permission') {
      description = `Permission Request (${details.permSlot}): ${details.startTime} to ${details.endTime}. ${reason}`;
    } else if (requestType === 'Grace Period') {
      description = `Grace Period / Extension Request: ${reason}`;
    } else if (requestType === 'Diary Access Request') {
      description = `Diary Access Request for date ${date}: ${reason}`;
    }

    // 4. Log to OTP and Unified sheets
    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const otpHeaders = otpSheet.getRange(1, 1, 1, otpSheet.getLastColumn()).getValues()[0].map(h => h.toString().trim());

    const otpRowData = otpHeaders.map(h => {
      switch (h) {
        case 'ID': return id;
        case 'RegistrationID': return registrationId;
        case 'OTP': return otp;
        case 'ActionType': return requestType;
        case 'ExpiryTimestamp': return expiry;
        case 'TargetDate': return date;
        case 'Reason': return description;
        case 'Status': return 'Pending';
        case 'LeaveType': return requestType;
        case 'AttachmentUrl': return attachmentUrl;
        default: return '';
      }
    });
    otpSheet.appendRow(otpRowData);

    saveStudentRequest_({
      RequestID: id,
      RegistrationID: registrationId,
      StudentName: studentName,
      RequestType: requestType,
      TargetDate: date,
      Reason: description,
      AttachmentUrl: attachmentUrl,
      OTP: otp,
      Status: 'Pending'
    });

    createAdminNotification(requestType, `New ${requestType} from ${student.FirstName} for ${date}`);
    return { status: 'success', message: 'Request submitted. You will see it in your Recent Activity instantly.', requestId: id };

  } catch (e) {
    Logger.log('Error in submitUnifiedStudentRequest: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function validateRequestTimeAgainstSlot(student, date, type, timeStr) {
  if (!timeStr) return { valid: false, message: 'Time is required for this request.' };

  // Mocking slot timing since it depends on batch config
  // Usually we'd fetch this from getStudentSlot_ or similar
  // For now, allow 08:00 to 20:00 as a broad boundary if slot info missing, 
  // but try to implement proper check if possible.

  return { valid: true }; // Placeholder until we have robust slot fetching in this scope
}

function getStudentAttendanceRequests(registrationId) {
  try {
    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const reqSheet = getSheet(SHEET_NAMES.ATTENDANCE_REQUESTS);
    const sReqSheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);

    let allRequests = [];
    const rId = String(registrationId).trim();

    // Helper to get value from object with case-insensitive / variation key
    const getVal = (obj, keys) => {
      for (let k of keys) {
        if (obj[k] !== undefined) return obj[k];
      }
      return undefined;
    };

    // 1. OTP Sheet
    if (otpSheet) {
      const otpData = getSheetDataAsObjects(otpSheet)
        .filter(r => {
          const rawRowId = getVal(r, ['RegistrationID', 'RegistrationId', 'StudentRegistrationID']);
          const rowId = rawRowId ? String(rawRowId).trim().toUpperCase() : '';
          return rowId === rId.toUpperCase();
        })
        .map(r => ({
          ID: r.ID || '',
          Date: r.TargetDate instanceof Date ? formatDate(r.TargetDate) : (r.TargetDate || ''),
          DateISO: r.TargetDate instanceof Date ? formatDateISO(r.TargetDate) : (r.TargetDate || ''),
          Type: r.ActionType || 'Correction',
          Status: r.Status || 'Pending',
          Description: r.Reason || '',
          OTP: r.OTP || ''
        }));
      allRequests = allRequests.concat(otpData);
    }

    // 2. Attendance Requests (Auto-Logged / Legacy)
    if (reqSheet) {
      const regReqData = getSheetDataAsObjects(reqSheet)
        .filter(r => {
          const rawRowId = getVal(r, ['RegistrationID', 'RegistrationId', 'StudentRegistrationID']);
          const rowId = rawRowId ? String(rawRowId).trim().toUpperCase() : '';
          return rowId === rId.toUpperCase();
        })
        .map(r => ({
          ID: r.RequestID || r.ID || '',
          Date: r.Date ? (r.Date instanceof Date ? formatDate(r.Date) : String(r.Date)) : '',
          DateISO: r.Date ? (r.Date instanceof Date ? formatDateISO(r.Date) : String(r.Date)) : '',
          Type: r.Type || 'Auto Log',
          Status: r.Status || 'Pending',
          Description: r.Reason || ''
        }));
      allRequests = allRequests.concat(regReqData);
    }

    // 3. Unified Student Requests (Primary Source)
    if (sReqSheet) {
      const sReqData = getSheetDataAsObjects(sReqSheet)
        .filter(r => {
          const rawRowId = getVal(r, ['RegistrationID', 'RegistrationId', 'StudentRegistrationID']);
          const rowId = rawRowId ? String(rawRowId).trim().toUpperCase() : '';
          return rowId === rId.toUpperCase();
        })
        .map(r => {
          const targetDate = getVal(r, ['TargetDate', 'Date']);
          const reqDate = getVal(r, ['RequestDate', 'Timestamp']);
          const effectiveDate = targetDate || reqDate;

          return {
            ID: r.RequestID || r.ID || '',
            Date: effectiveDate ? (effectiveDate instanceof Date ? formatDate(effectiveDate) : String(effectiveDate)) : '',
            DateISO: effectiveDate ? (effectiveDate instanceof Date ? formatDateISO(effectiveDate) : String(effectiveDate)) : '',
            Type: r.RequestType || r.Type || 'Request',
            Status: r.Status || 'Pending',
            Description: r.Reason || r.Details || '',
            OTP: r.OTP || '',
            AdminComment: r.AdminRemarks || r.AdminComment || ''
          };
        });
      allRequests = allRequests.concat(sReqData);
    }

    // Deduplicate by ID and sort
    const uniqueRequests = [];
    const seenIds = new Set();
    allRequests.forEach(req => {
      const uid = req.ID || (req.DateISO + req.Type + req.Description);
      if (!seenIds.has(uid)) {
        seenIds.add(uid);
        uniqueRequests.push(req);
      }
    });

    // Sort by DateISO DESC, then by id DESC
    uniqueRequests.sort((a, b) => {
      const da = a.DateISO || '';
      const db = b.DateISO || '';
      if (db !== da) return db.localeCompare(da);
      return String(b.ID).localeCompare(String(a.ID));
    });

    return { status: 'success', requests: uniqueRequests.slice(0, 50) };
  } catch (e) {
    Logger.log('Error in getStudentAttendanceRequests: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function verifyAttendanceCorrectionOtp(registrationId, date, otp) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const otpCol = headers.indexOf("OTP");
    const regCol = headers.indexOf("RegistrationID");
    const dateCol = headers.indexOf("TargetDate");
    const statusCol = headers.indexOf("Status");
    const leaveTypeCol = headers.indexOf("LeaveType");
    const actionTypeCol = headers.indexOf("ActionType");



    // Normalize the input date for comparison
    const normalizedDate = formatDate(new Date(date));

    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][dateCol] instanceof Date ? formatDate(data[i][dateCol]) : String(data[i][dateCol]).trim();
      const rowDateNorm = rowDate.includes('-') ? formatDate(new Date(rowDate)) : rowDate;

      if (String(data[i][regCol]) === String(registrationId) &&
        (rowDate === date || rowDateNorm === normalizedDate) &&
        data[i][otpCol].toString() === otp.toString() &&
        data[i][statusCol] === 'Awaiting OTP') {

        sheet.getRange(i + 1, statusCol + 1).setValue('Completed');

        // Determine the correct status based on the request type
        const leaveType = leaveTypeCol !== -1 ? String(data[i][leaveTypeCol] || '').trim() : '';
        const actionType = actionTypeCol !== -1 ? String(data[i][actionTypeCol] || '').trim() : '';
        const requestType = leaveType || actionType || '';

        // Boundary Check: If the target date is in the past, don't allow verification UNLESS it is a correction type request
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const isCorrection = ['SLOT CORRECTION', 'CORRECTION', 'DIARYCORRECTION', 'DIARY ACCESS'].includes(requestType.toUpperCase());
        if (targetDate < today && !isCorrection) {
          return { status: 'error', message: 'Verification period for ' + date + ' has expired.' };
        }

        // WFH/OD/Medical → mark with respective status; Correction → mark Present
        let attendanceStatus = 'Present';
        let approvalComment = 'OTP Verified';
        if (requestType.toUpperCase().includes('WFH')) {
          attendanceStatus = 'WFH';
          approvalComment = 'WFH OTP Verified';
        } else if (requestType.toUpperCase().includes('OD')) {
          attendanceStatus = 'OD';
          approvalComment = 'OD OTP Verified';
        } else if (requestType.toUpperCase().includes('MEDICAL')) {
          attendanceStatus = 'Medical Leave';
          approvalComment = 'Medical Leave OTP Verified';
        } else if (requestType.toUpperCase().includes('SICK')) {
          attendanceStatus = 'Sick Leave';
          approvalComment = 'Sick Leave OTP Verified';
        } else if (requestType.toUpperCase().includes('EMERGENCY')) {
          attendanceStatus = 'Emergency Leave';
          approvalComment = 'Emergency Leave OTP Verified';
        }

        updateAttendanceRecord(registrationId, date, attendanceStatus, approvalComment);
        return { status: 'success', message: `Verified! Attendance marked as ${attendanceStatus}.` };
      }
    }
    return { status: 'error', message: 'Invalid OTP or Request already processed.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function resendCorrectionOtp(registrationId, date) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const data = sheet.getDataRange().getValues();
    const regCol = data[0].indexOf("RegistrationID");
    const dateCol = data[0].indexOf("TargetDate");
    const otpCol = data[0].indexOf("OTP");
    const statusCol = data[0].indexOf("Status");

    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][dateCol] instanceof Date ? formatDate(data[i][dateCol]) : data[i][dateCol];
      if (String(data[i][regCol]) === String(registrationId) && rowDate === date && data[i][statusCol] === 'Awaiting OTP') {
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        sheet.getRange(i + 1, otpCol + 1).setValue(newOtp);

        // Removed email pushing. Will appear in My OTP/PIN section only.
        return { status: 'success', message: 'New OTP generated successfully. Please check your My OTP/PIN tab.' };
      }
    }
    return { status: 'error', message: 'No active OTP request found for this date.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function requestDiaryCorrection(registrationId, date, reason) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().trim());
    const id = "DC-" + new Date().getTime();

    const rowData = headers.map(h => {
      switch (h) {
        case 'ID': return id;
        case 'RegistrationID': return registrationId;
        case 'OTP': return '';
        case 'ActionType': return 'DiaryCorrection';
        case 'ExpiryTimestamp': return '';
        case 'TargetDate': return date;
        case 'Reason': return reason;
        case 'Status': return 'Pending Admin Approval';
        case 'LeaveType': return '';
        case 'AttachmentUrl': return '';
        default: return '';
      }
    });

    sheet.appendRow(rowData);
    SpreadsheetApp.flush();

    // Also save to unified StudentRequests sheet
    const studentName = getStudentName_(registrationId);
    saveStudentRequest_({
      RequestID: id,
      RegistrationID: registrationId,
      StudentName: studentName,
      RequestType: 'DiaryCorrection',
      Section: 'Diary',
      TargetDate: date,
      Reason: reason
    });

    return { status: 'success', message: 'Diary correction request submitted to Admin.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Helper to update the status of a request in the StudentRequests sheet.
 * Called by approval functions to keep the unified sheet in sync.
 */
function updateStudentRequestStatus_(requestId, newStatus, remarks) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet || sheet.getLastRow() <= 1) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    const idCol = headers.indexOf('RequestID');
    const statusCol = headers.indexOf('Status');
    const processedDateCol = headers.indexOf('ProcessedDate');
    const processedByCol = headers.indexOf('ProcessedBy');
    const remarksCol = headers.indexOf('AdminRemarks');

    if (idCol === -1 || statusCol === -1) return;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(requestId)) {
        sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
        if (processedDateCol !== -1) sheet.getRange(i + 1, processedDateCol + 1).setValue(new Date());
        if (processedByCol !== -1) sheet.getRange(i + 1, processedByCol + 1).setValue('Admin');
        if (remarksCol !== -1 && remarks) sheet.getRange(i + 1, remarksCol + 1).setValue(remarks);
        Logger.log('StudentRequests status updated: ' + requestId + ' \u2192 ' + newStatus);
        return;
      }
    }
  } catch (e) {
    Logger.log('Error updating StudentRequests status: ' + e.toString());
  }
}

/**
 * Sync-helper: Updates the OTP column in StudentRequests sheet
 */
function updateStudentRequestOTP_(requestId, otp) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet || sheet.getLastRow() <= 1) return;
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    const idCol = headers.indexOf('RequestID');
    const otpCol = headers.indexOf('OTP');
    if (idCol === -1 || otpCol === -1) return;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(requestId)) {
        sheet.getRange(i + 1, otpCol + 1).setValue(otp);
        return;
      }
    }
  } catch (e) {
    Logger.log('Error updating StudentRequests OTP: ' + e.toString());
  }
}



function processDiaryCorrectionApproval(requestId, action) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf("ID");
    const statusCol = headers.indexOf("Status");
    const regCol = headers.indexOf("RegistrationID");
    const dateCol = headers.indexOf("TargetDate");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === requestId) {
        if (action === 'Approve') {
          sheet.getRange(i + 1, statusCol + 1).setValue('Approved');
          createStudentNotification(data[i][regCol], "Diary Access Granted", `You can now enter your log for ${formatDate(data[i][dateCol])}.`);
        } else {
          sheet.getRange(i + 1, statusCol + 1).setValue('Rejected');
        }
        // Sync status to unified StudentRequests sheet
        updateStudentRequestStatus_(requestId, action === 'Approve' ? 'Approved' : 'Rejected', `${action}d by Admin`);
        return { status: 'success', message: `Diary request ${action}d.` };
      }
    }
    return { status: 'error', message: 'Request not found.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function processUnifiedAdminRequest(id, type, action, value) {
  try {
    if (action === 'Approve' || action === 'Reject') {
      if (type === 'Standard') {
        const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';
        return processAttendanceRequest(id, newStatus, value);
      }
      if (type === 'Correction') return processCorrectionRequestApproval(id, action);
      if (type === 'GracePeriod') return processGracePeriodApproval(id, action);
      if (type === 'LegacyManual') return processAttendanceRecordApproval(id, action);
      if (type === 'Diary') return processDiaryCorrectionApproval(id, action);
      if (type === 'Access') return processAccessRequestApproval(id, action);
      if (type === 'DocDeletion') return processDocumentDeletionApproval ? processDocumentDeletionApproval(id, action) : { status: 'error', message: 'API not found' };
      if (type === 'DocReplacement') return processDocumentReplacementApproval(id, action);
      if (type === 'PublicDoc') return processPublicDocumentAccessRequest({ requestId: id, action: action === 'Approve' ? 'Approved' : 'Rejected', processedOn: new Date().toISOString(), expiresOn: action === 'Approve' ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() : null });
      // History type: fall through to generic updateRecord for direct status reversal
    }

    const updateRecord = (sheetName, idColName) => {
      const sheet = getSheet(sheetName);
      if (!sheet) return false;
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idCol = headers.indexOf(idColName);
      if (idCol === -1) return false;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(id)) {
          if (action === 'Delete') {
            sheet.deleteRow(i + 1);
            return true;
          } else if (action === 'Comment') {
            let cCol = headers.indexOf('AdminRemarks');
            if (cCol === -1) cCol = headers.indexOf('AdminComment');
            if (cCol === -1) return false;
            sheet.getRange(i + 1, cCol + 1).setValue(value);
            return true;
          } else if (action === 'EnterOTP') {
            const sCol = headers.indexOf('Status');
            const oCol = headers.indexOf('OTP');
            if (sCol !== -1 && oCol !== -1) {
              const correctOtp = String(data[i][oCol]);
              if (correctOtp === String(value)) {
                sheet.getRange(i + 1, sCol + 1).setValue('Approved');
                const regCol = headers.indexOf('RegistrationID');
                const dateCol = headers.indexOf('TargetDate');
                if (regCol !== -1 && dateCol !== -1) {
                  const actTypeCol = headers.indexOf('ActionType');
                  const actType = actTypeCol !== -1 ? data[i][actTypeCol] : 'Correction';
                  updateAttendanceRecord(data[i][regCol], formatDate(data[i][dateCol]), actType === 'Correction' ? 'Present' : actType, 'Admin verified OTP');
                }
                return 'otp_matched';
              } else {
                return 'otp_invalid';
              }
            }
          }
          // History reversal: toggle Approve <-> Reject directly
          if (action === 'Approve' || action === 'Reject') {
            const statusCol = headers.indexOf('Status');
            if (statusCol !== -1) {
              sheet.getRange(i + 1, statusCol + 1).setValue(action === 'Approve' ? 'Approved' : 'Rejected');
              let remarkCol = headers.indexOf('AdminRemarks');
              if (remarkCol === -1) remarkCol = headers.indexOf('AdminComment');
              if (remarkCol !== -1) sheet.getRange(i + 1, remarkCol + 1).setValue(value || 'Reversed by Admin');
              const procCol = headers.indexOf('ProcessedDate');
              if (procCol !== -1) sheet.getRange(i + 1, procCol + 1).setValue(new Date());
              return true;
            }
          }
        }
      }
      return false;
    };

    let found = false;

    // Check main tables
    let res = updateRecord(SHEET_NAMES.STUDENT_REQUESTS, 'RequestID');
    if (res === 'otp_matched' || res === 'otp_invalid') {
      const otpSheetRes = updateRecord(SHEET_NAMES.ATTENDANCE_OTP, 'ID'); // also update the mirror copy
      if (otpSheetRes === 'otp_invalid' || res === 'otp_invalid') {
        return { status: 'error', message: 'Invalid OTP provided.' };
      }
      return { status: 'success', message: 'OTP verified successfully by Admin. Process completed.' };
    }
    if (res === true) found = true;

    if (!found) {
      res = updateRecord(SHEET_NAMES.ATTENDANCE_OTP, 'ID');
      if (res === 'otp_invalid') return { status: 'error', message: 'Invalid OTP provided.' };
      if (res === 'otp_matched') return { status: 'success', message: 'OTP verified successfully by Admin.' };
      if (res === true) found = true;
    }

    if (!found) {
      res = updateRecord(SHEET_NAMES.ATTENDANCE_REQUESTS, 'RequestID');
      if (res === true) found = true;
    }

    if (!found) {
      res = updateRecord(SHEET_NAMES.ATTENDANCE, 'AttendanceID');
      if (res === true) found = true;
    }

    if (found) {
      if (action === 'Delete') return { status: 'success', message: 'Request permanently deleted.' };
      if (action === 'Comment') return { status: 'success', message: 'Comment saved successfully.' };
      if (action === 'Approve') return { status: 'success', message: 'Request approved (reversed) successfully.' };
      if (action === 'Reject') return { status: 'success', message: 'Request rejected (reversed) successfully.' };
    }

    return { status: 'error', message: 'Request not found or unsupported action.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function processUnifiedAdminRequestsBatch(requestsList, action) {
  try {
    if (!Array.isArray(requestsList)) {
      return { status: 'error', message: 'Invalid requests list.' };
    }
    let successCount = 0;
    let failCount = 0;
    let errors = [];

    requestsList.forEach(req => {
      const id = req.id;
      const type = req.type;
      
      const res = processUnifiedAdminRequest(id, type, action, '');
      if (res && res.status === 'success') {
        successCount++;
      } else {
        failCount++;
        errors.push(res ? res.message : 'Unknown error');
      }
    });

    // Clear caches
    executionCache.clear();

    return {
      status: 'success',
      message: `Successfully processed ${successCount} request(s). Failed: ${failCount}.${errors.length > 0 ? ' Errors: ' + errors.slice(0, 3).join(', ') : ''}`,
      successCount: successCount,
      failCount: failCount
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// --- ADMIN ATTENDANCE APPROVALS ---

function getPendingAttendanceDetails() {
  try {
    const attRecords = getSheetDataAsObjects(getSheet(SHEET_NAMES.ATTENDANCE));
    const otpData = getSheetDataAsObjects(getSheet(SHEET_NAMES.ATTENDANCE_OTP));

    const isPending = (s) => {
      if (!s) return false;
      const str = String(s).toLowerCase();
      // 'Awaiting OTP' means Admin already approved, now student action is needed.
      // So it should NOT be in the Admin's pending list/badge.
      return str.includes('pending') && !str.includes('awaiting');
    };

    // Legacy: still read from AttendanceOTP for backward compatibility
    const manualEntries = attRecords.filter(r => isPending(r.Status) || r.ApprovalStatus === 'Pending');
    const otpCorrections = otpData.filter(r => isPending(r.Status) && (r.ActionType === 'Correction' || r.ActionType === 'TodayMark' || ['WFH', 'Emergency Leave', 'Sick Leave', 'Leave', 'WFH Request'].includes(r.ActionType)));
    const otpDiaryRequests = otpData.filter(r => isPending(r.Status) && r.ActionType === 'DiaryCorrection');
    const otpGraceRequests = otpData.filter(r => isPending(r.Status) && r.ActionType === 'GracePeriod');

    // Read ALL requests from the unified StudentRequests sheet
    let srCorrections = [], srDiaryRequests = [], srGraceRequests = [], srAccessRequests = [], srDocReplacements = [];
    let recentHistory = [];

    try {
      const reqSheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
      if (reqSheet && reqSheet.getLastRow() > 1) {
        const allRequests = getSheetDataAsObjects(reqSheet);

        // Categorize pending requests
        allRequests.forEach(r => {
          if (isPending(r.Status)) {
            switch (r.RequestType) {
              case 'Correction':
              case 'TodayMark':
              case 'WFH':
              case 'WFH Request':
              case 'Emergency Leave':
              case 'Sick Leave':
              case 'Leave':
                srCorrections.push(r);
                break;
              case 'DiaryCorrection':
                srDiaryRequests.push(r);
                break;
              case 'GracePeriod':
                srGraceRequests.push(r);
                break;
              case 'AccessRequest':
                srAccessRequests.push(r);
                break;
              case 'Document Replacement':
                srDocReplacements.push(r);
                break;
              case 'Document Deletion':
                srDocReplacements.push(r); // We can reuse the same category for rendering in Admin
                break;
              default:
                srCorrections.push(r); // Catch-all for other types
                break;
            }
          }
        });

        // Build recent history (last 50 resolved requests)
        recentHistory = allRequests
          .filter(r => {
            const status = String(r.Status || '').toLowerCase();
            return status === 'approved' || status === 'rejected' || status === 'awaiting otp';
          })
          .sort((a, b) => {
            const dateA = a.ProcessedDate ? new Date(a.ProcessedDate).getTime() : (a.RequestDate ? new Date(a.RequestDate).getTime() : 0);
            const dateB = b.ProcessedDate ? new Date(b.ProcessedDate).getTime() : (b.RequestDate ? new Date(b.RequestDate).getTime() : 0);
            return dateB - dateA;
          })
          .slice(0, 50);
      }
    } catch (reqErr) {
      Logger.log('Error reading StudentRequests sheet: ' + reqErr.toString());
    }

    // Merge: Use StudentRequests data if available, fall back to OTP data
    // Deduplicate by RequestID/ID
    const existingIds = new Set(srCorrections.map(r => r.RequestID));
    const mergedCorrections = [...srCorrections, ...otpCorrections.filter(r => !existingIds.has(r.ID))];

    const existingDiaryIds = new Set(srDiaryRequests.map(r => r.RequestID));
    const mergedDiary = [...srDiaryRequests, ...otpDiaryRequests.filter(r => !existingDiaryIds.has(r.ID))];

    const existingGraceIds = new Set(srGraceRequests.map(r => r.RequestID));
    const mergedGrace = [...srGraceRequests, ...otpGraceRequests.filter(r => !existingGraceIds.has(r.ID))];

    // Add the new Attendance Requests logic
    const reqRes = getAdminAttendanceRequests();
    const newRequests = reqRes.status === 'success' ? reqRes.requests : [];

    const totalPending = manualEntries.length + mergedCorrections.length + mergedDiary.length + mergedGrace.length + srAccessRequests.length + srDocReplacements.length + newRequests.length;

    return {
      status: 'success',
      manualEntries,
      corrections: mergedCorrections,
      diaryRequests: mergedDiary,
      graceRequests: mergedGrace,
      accessRequests: srAccessRequests,
      docReplacements: srDocReplacements,
      recentHistory,
      newRequests,
      totalPending
    };
  } catch (e) {
    Logger.log('Error in getPendingAttendanceDetails: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function processAttendanceRecordApproval(attendanceId, action) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf("AttendanceID");
    const statusCol = headers.indexOf("Status");
    const approvalCol = headers.indexOf("ApprovalStatus");
    const leaveTypeCol = headers.indexOf("LeaveType");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === attendanceId) {
        if (action === 'Approve') {
          // Preserve original status for WFH/OD/Leave/Late records instead of overwriting all to 'Present'
          const currentStatus = String(data[i][statusCol] || '').trim();
          const leaveType = leaveTypeCol !== -1 ? String(data[i][leaveTypeCol] || '').trim() : '';
          const specialStatuses = ['WFH', 'OD', 'Medical Leave', 'Sick Leave', 'Emergency Leave', 'Late with Present'];

          let approvedStatus = 'Present'; // Default for regular on-time attendance
          if (specialStatuses.includes(currentStatus)) {
            approvedStatus = currentStatus; // Keep WFH/OD/Leave/Late as-is
          } else if (specialStatuses.includes(leaveType)) {
            approvedStatus = leaveType; // Restore from LeaveType if status was generic
          }

          sheet.getRange(i + 1, statusCol + 1).setValue(approvedStatus);
          sheet.getRange(i + 1, approvalCol + 1).setValue('Approved');
        } else {
          sheet.getRange(i + 1, statusCol + 1).setValue('Absent');
          sheet.getRange(i + 1, approvalCol + 1).setValue('Rejected');
        }
        return { status: 'success', message: `Attendance ${action}d successfully.` };
      }
    }
    return { status: 'error', message: 'Attendance record not found.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function processCorrectionRequestApproval(requestId, action) {
  try {
    let sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    let data = sheet.getDataRange().getValues();
    let idCol = data[0].indexOf("ID");
    let statusCol = data[0].indexOf("Status");
    let regCol = data[0].indexOf("RegistrationID");
    let otpCol = data[0].indexOf("OTP");
    let typeCol = data[0].indexOf("ActionType");
    let dateCol = data[0].indexOf("TargetDate");

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(requestId)) {
        rowIndex = i;
        break;
      }
    }

    // If not found in AttendanceOTP, check the unified StudentRequests sheet
    if (rowIndex === -1) {
      sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
      data = sheet.getDataRange().getValues();
      idCol = data[0].indexOf("RequestID");
      statusCol = data[0].indexOf("Status");
      regCol = data[0].indexOf("RegistrationID");
      otpCol = data[0].indexOf("OTP");
      typeCol = data[0].indexOf("RequestType");
      dateCol = data[0].indexOf("TargetDate");

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(requestId)) {
          rowIndex = i;
          break;
        }
      }
    }

    // If still not found, check the auto-logged AttendanceRequests sheet (used for Early Exits)
    if (rowIndex === -1) {
      let arSheet = getSheet(SHEET_NAMES.ATTENDANCE_REQUESTS);
      if (arSheet) {
        let arData = arSheet.getDataRange().getValues();
        let arHeaders = arData[0].map(h => String(h).trim());
        let arIdCol = arHeaders.indexOf("RequestID");

        for (let i = 1; i < arData.length; i++) {
          if (String(arData[i][arIdCol]) === String(requestId)) {
            sheet = arSheet;
            data = arData;
            rowIndex = i;
            idCol = arIdCol;
            statusCol = arHeaders.indexOf("Status");
            regCol = arHeaders.indexOf("RegistrationID");
            otpCol = -1; // No OTP in this sheet 
            typeCol = arHeaders.indexOf("Type");
            dateCol = arHeaders.indexOf("TargetDate");
            break;
          }
        }
      }
    }

    if (rowIndex !== -1) {
      const i = rowIndex;
      const type = String(data[i][typeCol] || '').trim();
      const regId = data[i][regCol];
      const date = (data[i][dateCol] instanceof Date) ? formatDate(data[i][dateCol]) : data[i][dateCol];

      if (action === 'Approve') {
        const isEarlyExit = type.toUpperCase() === 'EARLY_EXIT' || type.toUpperCase() === 'EARLY EXIT';

        if (type === 'Correction' || isEarlyExit) {
          const todayNode = new Date();
          todayNode.setHours(0, 0, 0, 0);
          const parsedTargetDate = new Date(date);

          if (parsedTargetDate < todayNode || isEarlyExit) {
            sheet.getRange(i + 1, statusCol + 1).setValue('Approved');
            // Only update attendance record (Present) for corrections, not early exits.
            if (type === 'Correction') {
              updateAttendanceRecord(regId, date, 'Present', 'Correction Approved');
            }
            updateStudentRequestStatus_(requestId, 'Approved', 'Approved by Admin');
            return { status: 'success', message: `Approved. Status updated accurately for ${type}.` };
          }

          // Missed Date -> Needs OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const expiry = new Date();
          expiry.setHours(expiry.getHours() + 24);
          const expiryCol = data[0].indexOf("ExpiryTimestamp");

          sheet.getRange(i + 1, otpCol + 1).setValue(otp);
          if (expiryCol !== -1) sheet.getRange(i + 1, expiryCol + 1).setValue(expiry);
          sheet.getRange(i + 1, statusCol + 1).setValue('Awaiting OTP');
          updateStudentRequestOTP_(requestId, otp);
          updateStudentRequestStatus_(requestId, 'Awaiting OTP', 'Approved - Awaiting OTP Verification');
          return { status: 'success', message: 'Approved. Awaiting OTP Verification by student.' };
        } else if (type === 'TodayMark') {
          sheet.getRange(i + 1, statusCol + 1).setValue('Approved');
          updateAttendanceRecord(regId, date, 'Present', 'Approved by Admin');
          updateStudentRequestStatus_(requestId, 'Approved', 'Approved by Admin');
          return { status: 'success', message: 'Request approved and attendance updated.' };
        } else {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const expiryCol = data[0].indexOf("ExpiryTimestamp");
          const expiry = new Date();
          expiry.setHours(expiry.getHours() + 24);

          sheet.getRange(i + 1, otpCol + 1).setValue(otp);
          if (expiryCol !== -1) sheet.getRange(i + 1, expiryCol + 1).setValue(expiry);
          sheet.getRange(i + 1, statusCol + 1).setValue('Awaiting OTP');

          try {
            const notifSheet = getSheet(SHEET_NAMES.NOTIFICATIONS);
            if (notifSheet) {
              notifSheet.appendRow([
                generateUniqueId('NOTIF', SHEET_NAMES.NOTIFICATIONS, 0),
                regId,
                `Your ${type} request for ${date} has been approved. OTP: ${otp}. Please verify in your Attendance panel.`,
                'OTP Verification',
                new Date(),
                'Unread'
              ]);
            }
          } catch (notifErr) { Logger.log('OTP notification error: ' + notifErr); }

          updateStudentRequestStatus_(requestId, 'Awaiting OTP', 'Approved - Awaiting OTP Verification');
          updateStudentRequestOTP_(requestId, otp);
          return { status: 'success', message: `Approved. OTP sent to student panel for verification.` };
        }
      } else {
        sheet.getRange(i + 1, statusCol + 1).setValue('Rejected');
        updateStudentRequestStatus_(requestId, 'Rejected', 'Rejected by Admin');
        return { status: 'success', message: 'Request rejected.' };
      }
    }
    return { status: 'error', message: 'Request ID not found.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function processAccessRequestApproval(requestId, action) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return { status: 'error', message: 'StudentRequests sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    const idCol = headers.indexOf("RequestID");
    const statusCol = headers.indexOf("Status");
    const regCol = headers.indexOf("RegistrationID");
    const sectionCol = headers.indexOf("Section");
    const processedDateCol = headers.indexOf("ProcessedDate");
    const processedByCol = headers.indexOf("ProcessedBy");
    const remarksCol = headers.indexOf("AdminRemarks");

    if (idCol === -1 || statusCol === -1 || regCol === -1 || sectionCol === -1) {
      return { status: 'error', message: 'StudentRequests sheet has missing headers.' };
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(requestId)) {
        const regId = data[i][regCol];
        const section = String(data[i][sectionCol]).toLowerCase(); // e.g. "attendance" or "diary"

        if (action === 'Approve') {
          // Update Permissions in Registrations Sheet
          const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
          const regData = regSheet.getDataRange().getValues();
          const rIdCol = regData[0].indexOf("RegistrationID");
          const permColName = section === 'attendance' ? 'AttendanceAccess' : (section === 'diary' ? 'DiaryAccess' : null);

          if (permColName) {
            const permCol = regData[0].indexOf(permColName);
            if (permCol !== -1) {
              for (let j = 1; j < regData.length; j++) {
                if (String(regData[j][rIdCol]) === String(regId)) {
                  regSheet.getRange(j + 1, permCol + 1).setValue('TRUE');
                  break;
                }
              }
            }
          }
          sheet.getRange(i + 1, statusCol + 1).setValue('Approved');
          if (processedDateCol !== -1) sheet.getRange(i + 1, processedDateCol + 1).setValue(new Date());
          if (processedByCol !== -1) sheet.getRange(i + 1, processedByCol + 1).setValue('Admin');
          if (remarksCol !== -1) sheet.getRange(i + 1, remarksCol + 1).setValue('Approved by Admin');

          createStudentNotification(regId, "Access Granted", `You now have access to the ${section} section.`);
          logActivity('Access Granted', regId, `Admin approved access for ${section}`);
          return { status: 'success', message: `Access granted for ${section}.` };
        } else {
          sheet.getRange(i + 1, statusCol + 1).setValue('Rejected');
          if (processedDateCol !== -1) sheet.getRange(i + 1, processedDateCol + 1).setValue(new Date());
          if (processedByCol !== -1) sheet.getRange(i + 1, processedByCol + 1).setValue('Admin');
          if (remarksCol !== -1) sheet.getRange(i + 1, remarksCol + 1).setValue('Rejected by Admin');

          createStudentNotification(regId, "Access Request Rejected", `Your request for ${section} access has been rejected.`);
          return { status: 'success', message: `Access request rejected.` };
        }
      }
    }
    return { status: 'error', message: 'Request not found.' };
  } catch (e) {
    Logger.log('Error in processAccessRequestApproval: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function processDocumentReplacementApproval(requestId, action) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return { status: 'error', message: 'StudentRequests sheet not found.' };

    // We update StudentRequests first
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    const idCol = headers.indexOf("RequestID");
    const statusCol = headers.indexOf("Status");
    const regCol = headers.indexOf("RegistrationID");
    const docTypeCol = headers.indexOf("LeaveType");
    const fileUrlCol = headers.indexOf("AttachmentUrl");

    if ([idCol, statusCol, regCol, docTypeCol, fileUrlCol].includes(-1)) {
      return { status: 'error', message: 'StudentRequests sheet has missing headers.' };
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(requestId)) {
        const regId = data[i][regCol];
        const docType = data[i][docTypeCol];
        const fileUrl = data[i][fileUrlCol];

        if (action === 'Approve') {
          const fmSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
          if (fmSheet) {
            const fmData = fmSheet.getDataRange().getValues();
            const fmFileIdCol = fmData[0].indexOf("FileID");
            const fmRegCol = fmData[0].indexOf("StudentRegistrationID");
            const fmTypeCol = fmData[0].indexOf("DocType");
            const fmUrlCol = fmData[0].indexOf("FileUrl");
            const fmNameCol = fmData[0].indexOf("FileName");
            const fmDateCol = fmData[0].indexOf("UploadDate");
            const fmStatusCol = fmData[0].indexOf("Status");

            // Extract new FileID from Reason if possible
            const newFileIdMatch = (data[i][headers.indexOf("Reason")] || "").match(/New FileID: ([\w-]+)/);
            const newFileId = newFileIdMatch ? newFileIdMatch[1] : null;

            let updated = false;
            for (let j = 1; j < fmData.length; j++) {
              if (String(fmData[j][fmRegCol]) === String(regId) && String(fmData[j][fmTypeCol]) === String(docType)) {
                // Trash old file
                try {
                  const oldFileId = fmData[j][fmFileIdCol];
                  if (oldFileId && oldFileId !== newFileId) DriveApp.getFileById(oldFileId).setTrashed(true);
                } catch (e) { Logger.log("Error trashing old file during replacement: " + e.toString()); }

                // Update existing record
                if (newFileId) fmSheet.getRange(j + 1, fmFileIdCol + 1).setValue(newFileId);
                fmSheet.getRange(j + 1, fmUrlCol + 1).setValue(fileUrl);
                fmSheet.getRange(j + 1, fmNameCol + 1).setValue(`REPLACED_${docType}.pdf`);
                fmSheet.getRange(j + 1, fmDateCol + 1).setValue(new Date());
                fmSheet.getRange(j + 1, fmStatusCol + 1).setValue('');
                updated = true;
                break;
              }
            }
            if (!updated) {
              fmSheet.appendRow([newFileId || generateUniqueId('FM', SHEET_NAMES.FILE_MANAGER, 0), regId, `REPLACED_${docType}.pdf`, fileUrl, docType, new Date(), '', '']);
            }
          }

          // 3. ALSO UPDATE REGISTRATIONS SHEET
          const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
          if (regSheet) {
            const regData = regSheet.getDataRange().getValues();
            const headers = regData[0];
            const regIdColIndex = headers.indexOf("RegistrationID");

            let targetColName = "";
            if (docType === "Bonafide") targetColName = "BonafideUrl";
            else if (docType === "Declaration") targetColName = "DeclarationUrl";
            else if (docType === "College ID") targetColName = "CollegeIdUrl";

            const targetColIndex = headers.indexOf(targetColName);

            if (regIdColIndex !== -1 && targetColIndex !== -1) {
              for (let k = 1; k < regData.length; k++) {
                if (String(regData[k][regIdColIndex]).trim().toUpperCase() === String(regId).trim().toUpperCase()) {
                  regSheet.getRange(k + 1, targetColIndex + 1).setValue(fileUrl);
                  break;
                }
              }
            }
          }

          sheet.getRange(i + 1, statusCol + 1).setValue('Approved');
          updateStudentRequestStatus_(requestId, 'Approved', 'Document Replacement Approved');
          createStudentNotification(regId, "Document Replacement Approved", `Your request to replace ${docType} has been approved.`);
          return { status: 'success', message: 'Request approved and document replaced.' };
        } else {
          sheet.getRange(i + 1, statusCol + 1).setValue('Rejected');
          updateStudentRequestStatus_(requestId, 'Rejected', 'Document Replacement Rejected');
          createStudentNotification(regId, "Document Replacement Rejected", `Your request to replace ${docType} was rejected. The old document remains active.`);
          return { status: 'success', message: 'Request rejected. Old document remains active.' };
        }
      }
    }
    return { status: 'error', message: 'Request not found.' };
  } catch (e) {
    Logger.log('Error in processDocumentReplacementApproval: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function processDocumentDeletionApproval(requestId, action) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return { status: 'error', message: 'StudentRequests sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    const idCol = headers.indexOf("RequestID");
    const statusCol = headers.indexOf("Status");
    const regCol = headers.indexOf("RegistrationID");
    const docTypeCol = headers.indexOf("LeaveType");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(requestId)) {
        const regId = data[i][regCol];
        const docType = data[i][docTypeCol];

        if (action === 'Approve') {
          // 1. Update FileManager (Mark as Deleted or remove)
          const fmSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
          if (fmSheet) {
            const fmData = fmSheet.getDataRange().getValues();
            const fmFileIdCol = fmData[0].indexOf("FileID");
            const fmRegCol = fmData[0].indexOf("StudentRegistrationID");
            const fmTypeCol = fmData[0].indexOf("DocType");
            const fmStatusCol = fmData[0].indexOf("Status");

            for (let j = 1; j < fmData.length; j++) {
              if (String(fmData[j][fmRegCol]) === String(regId) && String(fmData[j][fmTypeCol]) === String(docType)) {
                // Actual file trashing
                try {
                  const fileId = fmData[j][fmFileIdCol];
                  if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
                } catch (e) { Logger.log("Error trashing file: " + e.toString()); }

                fmSheet.getRange(j + 1, fmStatusCol + 1).setValue('Deleted');
                break;
              }
            }
          }

          // 2. Update REGISTRATIONS sheet (Clear URL)
          const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
          if (regSheet) {
            const regData = regSheet.getDataRange().getValues();
            const headers = regData[0];
            const regIdColIndex = headers.indexOf("RegistrationID");

            let targetColName = "";
            if (docType === "Bonafide") targetColName = "BonafideUrl";
            else if (docType === "Declaration") targetColName = "DeclarationUrl";
            else if (docType === "College ID") targetColName = "CollegeIdUrl";

            const targetColIndex = headers.indexOf(targetColName);
            if (regIdColIndex !== -1 && targetColIndex !== -1) {
              for (let k = 1; k < regData.length; k++) {
                if (String(regData[k][regIdColIndex]).trim().toUpperCase() === String(regId).trim().toUpperCase()) {
                  regSheet.getRange(k + 1, targetColIndex + 1).setValue("");
                  break;
                }
              }
            }
          }

          sheet.getRange(i + 1, statusCol + 1).setValue('Approved');
          updateStudentRequestStatus_(requestId, 'Approved', 'Document Deletion Approved');
          createStudentNotification(regId, "Document Deletion Approved", `Your request to delete ${docType} has been approved.`);
          return { status: 'success', message: 'Request approved and document removed.' };
        } else {
          sheet.getRange(i + 1, statusCol + 1).setValue('Rejected');
          updateStudentRequestStatus_(requestId, 'Rejected', 'Document Deletion Rejected');
          createStudentNotification(regId, "Document Deletion Rejected", `Your request to delete ${docType} was rejected.`);
          return { status: 'success', message: 'Request rejected. Document remains active.' };
        }
      }
    }
    return { status: 'error', message: 'Request not found.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function updateAttendanceRecord(registrationId, date, status, remarks) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regCol = headers.indexOf("StudentRegistrationID");
    const dateCol = headers.indexOf("Date");
    const statusCol = headers.indexOf("Status");
    const remarksCol = headers.indexOf("Remarks");
    const workAreaCol = headers.indexOf("WorkArea");

    if ([regCol, dateCol, statusCol].includes(-1)) throw new Error('Attendance sheet headers missing.');
    let workArea = 'General';
    const stuInfo = getStudentFullData(registrationId);
    if (stuInfo.status === 'success' && stuInfo.studentData.Batch) {
      const batchSheet = getSheet(SHEET_NAMES.BATCHES);
      const batch = getSheetDataAsObjects(batchSheet).find(b => b.BatchName === stuInfo.studentData.Batch);
      if (batch && batch.WorkArea) workArea = batch.WorkArea;
    }

    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][regCol]) === String(registrationId) && formatDate(new Date(data[i][dateCol])) === date) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow !== -1) {
      sheet.getRange(foundRow, statusCol + 1).setValue(status);
      if (remarksCol !== -1) sheet.getRange(foundRow, remarksCol + 1).setValue(remarks);
      if (workAreaCol !== -1) sheet.getRange(foundRow, workAreaCol + 1).setValue(workArea);
    } else {
      const id = generateUniqueId('ATT', SHEET_NAMES.ATTENDANCE, 0);
      const studentName = stuInfo.status === 'success' ? `${stuInfo.studentData.FirstName} ${stuInfo.studentData.LastName}` : 'Unknown';
      const newRow = headers.map(h => {
        if (h === 'AttendanceID') return id;
        if (h === 'StudentRegistrationID') return registrationId;
        if (h === 'StudentName') return studentName;
        if (h === 'Date') return date;
        if (h === 'Status') return status;
        if (h === 'InTime') return '10:30 AM';
        if (h === 'OutTime') return '06:30 PM';
        if (h === 'WorkArea') return workArea;
        if (h === 'Remarks') return remarks;
        if (h === 'Timestamp') return new Date();
        return '';
      });
      sheet.appendRow(newRow);
    }
    return { status: 'success' };
  } catch (e) {
    Logger.log("Error in updateAttendanceRecord: " + e.message);
    return { status: 'error', message: e.message };
  }
}

function handleAttendanceRequest(registrationId, date, newStatus, adminComment) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    if (!otpSheet) return { status: 'error', message: 'Attendance OTP sheet not found.' };

    const otpData = otpSheet.getDataRange().getValues();
    const headers = otpData[0];
    const regCol = headers.indexOf("RegistrationID");
    const dateCol = headers.indexOf("TargetDate");
    const statusCol = headers.indexOf("Status");
    const otpCol = headers.indexOf("OTP");
    const typeCol = headers.indexOf("ActionType");

    let foundRow = -1;
    let otp = '';
    let type = '';

    const targetDateStr = formatDate(new Date(date));

    for (let i = 1; i < otpData.length; i++) {
      const rowDateStr = formatDate(new Date(otpData[i][dateCol]));
      const rowStatus = String(otpData[i][statusCol] || "").toLowerCase();
      if (otpData[i][regCol] === registrationId && rowDateStr === targetDateStr && (rowStatus === 'pending' || rowStatus === 'awaiting otp')) {
        foundRow = i + 1;
        otp = otpData[i][otpCol];
        type = otpData[i][typeCol] || 'Correction';
        break;
      }
    }

    if (foundRow === -1) return { status: 'error', message: 'No matching pending request found.' };

    const studentEmail = getStudentEmail(registrationId);
    const studentName = getStudentName_(registrationId);

    if (newStatus === 'Rejected') {
      otpSheet.getRange(foundRow, statusCol + 1).setValue('Rejected');
      if (studentEmail) {
        sendEmail(studentEmail, `Attendance Request Rejected - ${registrationId}`, "", `Your request for on ${date} has been Rejected. Admin Comment: ${adminComment || "No specific reason provided."}`);
      }
      return { status: 'success', message: 'Request rejected.' };
    } else {
      otpSheet.getRange(foundRow, statusCol + 1).setValue('Approved');
      updateAttendanceRecord(registrationId, targetDateStr, newStatus, `Approved by Admin: ${adminComment}`);
      if (studentEmail) {
        sendEmail(studentEmail, `Attendance Request Approved - ${registrationId}`, "", `Your request for on ${date} has been approved as ${newStatus}. ${otp ? `Use OTP: ${otp} if prompted.` : ''}`);
      }
      return { status: 'success', message: `Request approved as ${newStatus}.` };
    }
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function getStudentName_(regId) {
  const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  const data = getSheetDataAsObjects(regSheet);
  const s = data.find(r => r.RegistrationID === regId);
  return s ? `${s.FirstName || ''} ${s.LastName || ''}`.trim() : 'Student';
}

function getStudentEmail(regId) {
  const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  const data = getSheetDataAsObjects(sheet);
  const s = data.find(r => r.RegistrationID === regId);
  return s ? s.GmailID : null;
}

// =================================================================================
// CHAT FUNCTIONS
// =================================================================================

// Obsolete aliases removed

// Redundant getAdminChatMessages removed

// Redundant sendChatMessage removed

// =================================================================================
// ADDITIONAL MISSING FUNCTIONS
// =================================================================================

function getAllStudents() {
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const mainData = getSheetDataAsObjects(sheet) || [];
    
    let closedData = [];
    const closedSheet = getSheet('Closed and Opt-out');
    if (closedSheet) {
      closedData = getSheetDataAsObjects(closedSheet) || [];
    }
    
    const data = [...mainData, ...closedData];
    if (data.length === 0) return [];

    // Check if students have uploaded documents by checking the FILE_MANAGER
    const fileSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    const fileData = getSheetDataAsObjects(fileSheet) || [];
    const mandatoryTypes = ["Bonafide", "Declaration", "College ID", "Other Doc"];

    const studentsWithFiles = new Set();
    const projectDocCounts = {};

    fileData.forEach(f => {
      const rid = String(f.StudentRegistrationID || f.RegistrationID || "").trim().toUpperCase();
      if (!rid) return;
      studentsWithFiles.add(rid);

      const type = String(f.DocType || f.type || "").trim().toLowerCase();
      const isMandatory = mandatoryTypes.some(m => type.includes(m.toLowerCase()));
      if (!isMandatory) {
        projectDocCounts[rid] = (projectDocCounts[rid] || 0) + 1;
      }
    });

    // Bulk check for task completion
    const taskSheet = getSheet(SHEET_NAMES.TASKS);
    const allTasks = getSheetDataAsObjects(taskSheet) || [];
    const taskStatusMap = {};
    allTasks.forEach(t => {
      const rid = String(t.StudentRegistrationID || "").trim().toUpperCase();
      if (!rid) return;
      if (!taskStatusMap[rid]) taskStatusMap[rid] = { total: 0, completed: 0 };
      taskStatusMap[rid].total++;
      const s = String(t.Status || "").toLowerCase();
      if (s === 'completed' || s === 'approved' || s === 'done') taskStatusMap[rid].completed++;
    });

    // Bulk check for project completion
    const projectSheet = getSheet(SHEET_NAMES.PROJECTS);
    const allProjects = getSheetDataAsObjects(projectSheet) || [];
    const projectStatusMap = {};
    allProjects.forEach(p => {
      const rid = String(p.StudentRegistrationID || "").trim().toUpperCase();
      if (!rid) return;
      const s = String(p.Status || "").toLowerCase();
      if (s !== 'completed' && s !== 'approved' && s !== 'active') {
        projectStatusMap[rid] = true; // Has pending/incomplete projects
      }
    });

    // Bulk check for attendance count
    const attendanceSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const allAttendance = getSheetDataAsObjects(attendanceSheet) || [];
    // Bulk check for project names/titles
    const projectNames = {};
    allProjects.forEach(p => {
      const rid = String(p.StudentRegistrationID || "").trim().toUpperCase();
      if (!rid) return;
      if (!projectNames[rid]) projectNames[rid] = p.Title || p.ProjectTitle || p.ProjectName || '';
    });

    const attendanceCountMap = {};
    allAttendance.forEach(a => {
      const rid = String(a.StudentRegistrationID || "").trim().toUpperCase();
      if (!rid) return;
      attendanceCountMap[rid] = (attendanceCountMap[rid] || 0) + 1;
    });

    // Bulk check for diary count
    const diarySheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const allDiary = getSheetDataAsObjects(diarySheet) || [];
    const diaryCountMap = {};
    allDiary.forEach(d => {
      const rid = String(d.StudentRegistrationID || "").trim().toUpperCase();
      if (!rid) return;
      diaryCountMap[rid] = (diaryCountMap[rid] || 0) + 1;
    });

    const mapped = data.map(s => {
      let name = getStudentFullName_(s);

      const regIdUpper = String(s.RegistrationID || "").trim().toUpperCase();

      return {
        registrationId: s.RegistrationID,
        name: name,
        firstName: s.FirstName || '',
        middleName: s.MiddleName || '',
        lastName: s.LastName || '',
        gmail: s.GmailID,
        batch: s.Batch || '',
        college: s.CollegeName || '',
        department: s.Department || '',
        mobile: s.MobileNumber || '',
        registerNumber: s.RegisterNumber || '',
        year: s.Year || '',
        semester: s.Semester || '',
        appliedDate: s.Timestamp ? formatDateISO(s.Timestamp) : '',
        InternshipStartDate: s.InternshipStartDate || '',
        InternshipEndDate: s.InternshipEndDate || '',
        status: s.ApplicationStatus || s.Status || 'Pending',
        applicationStatus: s.ApplicationStatus || '',
        actualStatus: s.Status || '',
        internshipStart: s.InternshipStartDate ? formatDateSafe(s.InternshipStartDate) : '',
        rawInternshipStart: s.InternshipStartDate || '',
        internshipEnd: s.InternshipEndDate ? formatDateSafe(s.InternshipEndDate) : '',
        rawInternshipEnd: s.InternshipEndDate || '',
        profilePhotoUrl: s.ProfilePhotoUrl || '',
        rfidTag: s.RFID_TagID || '',
        projectName: projectNames[regIdUpper] || '',
        hasDocuments: studentsWithFiles.has(regIdUpper),
        projectDocCount: projectDocCounts[regIdUpper] || 0,
        isTaskPending: taskStatusMap[regIdUpper] ? (taskStatusMap[regIdUpper].completed < taskStatusMap[regIdUpper].total) : false,
        isProjectPending: !!projectStatusMap[regIdUpper],
        attendanceCount: attendanceCountMap[regIdUpper] || 0,
        diaryCount: diaryCountMap[regIdUpper] || 0,
        durationDaysVal: (function () {
          // Auto-calculate duration from internship dates (inclusive)
          const sd = s.InternshipStartDate ? new Date(s.InternshipStartDate) : null;
          const ed = s.InternshipEndDate ? new Date(s.InternshipEndDate) : null;
          if (sd && ed && !isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
            sd.setHours(0, 0, 0, 0);
            ed.setHours(0, 0, 0, 0);
            return Math.round((ed.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
          return parseInt(s.DurationDays) || 0;
        })(),
        certificateIssued: !!(s.CertificateLink || s.CertificateIssuedDate)
      };
    });

    // Sort mapped students: primary by status priority, secondary by date descending
    mapped.sort((a, b) => {
      const pa = getStatusPriority(a.applicationStatus || a.status || '');
      const pb = getStatusPriority(b.applicationStatus || b.status || '');
      if (pa !== pb) return pa - pb;
      
      const da = a.appliedDate ? new Date(a.appliedDate) : (a.InternshipStartDate ? new Date(a.InternshipStartDate) : new Date(0));
      const db = b.appliedDate ? new Date(b.appliedDate) : (b.InternshipStartDate ? new Date(b.InternshipStartDate) : new Date(0));
      return db - da;
    });

    return mapped;
  } catch (e) {
    Logger.log("Error in getAllStudents: " + e.message);
    return [];
  }
}

// Obsolete duplicate block removed

// =================================================================================
// BATCH MANAGEMENT FUNCTIONS
// =================================================================================

// =================================================================================
// Consolidated Batch Management logic moved above.
// =================================================================================

// Duplicate getBatches removed

// Duplicate createBatch removed

// Duplicate deleteBatch removed

// Duplicate getBatchDetails removed

// Duplicate getBatchChat removed

// Duplicate sendBatchMessage removed

// Duplicate saveChatAttachment removed

// Duplicate assignStudentsToBatch removed

// Redundant getBatchDetails removed

// Duplicate updateBatchDetails removed

// Redundant removeStudentFromBatch removed. Using version at 6321.

// =================================================================================
// NEW ADMIN HELPERS (Manual Cert, Delete, Settings)
// =================================================================================

function manualGenerateCertificate(regId) {
  try {
    const certificateResult = generateDocumentAndMail('internshipCertificate', regId, true, true);
    if (certificateResult.status === 'success') {
      return { status: 'success', message: 'Certificate generated and emailed successfully.' };
    } else {
      return { status: 'error', message: 'Generation failed: ' + certificateResult.message };
    }
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function getCertificateTriggerMode() {
  const settingsResult = getAppSettings();
  if (settingsResult.status === 'success' && settingsResult.settings) {
    return settingsResult.settings['CertificateTriggerMode'] || 'Auto';
  }
  return 'Auto';
}

function setCertificateTriggerMode(mode) {
  return saveAppSettings({ 'CertificateTriggerMode': mode });
}

// Replaces deleteStudentCompletely with Blacklist Logic
function deleteStudentCompletely(identifier) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const data = regSheet.getDataRange().getValues();
    const headers = data[0];

    // Find Student
    const regIdCol = headers.indexOf("RegistrationID");
    const mobileCol = headers.indexOf("MobileNumber");
    const uniRegCol = headers.indexOf("RegisterNumber");

    let rowIndex = -1;
    let regId = "";

    for (let i = 1; i < data.length; i++) {
      if ((data[i][regIdCol] && String(data[i][regIdCol]).toUpperCase() === String(identifier).toUpperCase()) ||
        (data[i][mobileCol] && String(data[i][mobileCol]) === String(identifier)) ||
        (data[i][uniRegCol] && String(data[i][uniRegCol]).toUpperCase() === String(identifier).toUpperCase())) {
        rowIndex = i + 1;
        regId = data[i][regIdCol];
        break;
      }
    }

    if (rowIndex === -1) {
      return { status: 'error', message: 'Student not found with that ID/Mobile/RegNo.' };
    }

    // Soft Delete: Mark as Blacklisted and Color Red
    const statusCol = headers.indexOf("ApplicationStatus");
    if (statusCol !== -1) {
      regSheet.getRange(rowIndex, statusCol + 1).setValue("Blacklisted");
    }

    // Set Row Color to Red
    regSheet.getRange(rowIndex, 1, 1, headers.length).setBackground("#ffcccc"); // Light Red

    logActivity('Student Blacklisted', 'Admin', `Student ${regId} has been blacklisted.`);

    return { status: 'success', message: `Student ${regId} has been blacklisted and marked red.` };

  } catch (e) {
    return { status: 'error', message: 'Operation failed: ' + e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Updates student profile data from Admin Edit Modal.
 * Finds row by RegistrationID.
 */
function updateStudentProfile(data) {
  if (!data.registrationId) return { status: 'error', message: 'Registration ID missing' };

  // 1. Check archive status & target status
  const isNewStatusArchived = data.ApplicationStatus && (data.ApplicationStatus.toLowerCase() === 'closed' || data.ApplicationStatus.toLowerCase() === 'opt-out' || data.ApplicationStatus.toLowerCase() === 'optout');
  
  const closedSheet = getSheet('Closed and Opt-out');
  let isCurrentlyArchived = false;
  let archivedRowIdx = -1;
  let archivedRowData = null;
  
  if (closedSheet) {
    const closedData = closedSheet.getDataRange().getValues();
    const closedHeaders = closedData[0];
    const closedRegIdCol = closedHeaders.indexOf("RegistrationID");
    if (closedRegIdCol !== -1) {
      for (let i = 1; i < closedData.length; i++) {
        if (String(closedData[i][closedRegIdCol]) === String(data.registrationId)) {
          isCurrentlyArchived = true;
          archivedRowIdx = i + 1;
          archivedRowData = closedData[i];
          break;
        }
      }
    }
  }

  // 2. Locate current student in main registrations sheet
  const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  const regData = regSheet.getDataRange().getValues();
  const regHeaders = regData[0];
  const regIdCol = regHeaders.indexOf('RegistrationID');
  
  let rowIndex = -1;
  for (let i = 1; i < regData.length; i++) {
    if (String(regData[i][regIdCol]) === String(data.registrationId)) {
      rowIndex = i + 1;
      break;
    }
  }

  // If not found in either, return error
  if (rowIndex === -1 && !isCurrentlyArchived) {
    return { status: 'error', message: 'Student not found' };
  }

  // 3. Handle Archiving/Recovery triggers
  if (isNewStatusArchived || isCurrentlyArchived) {
    // Determine the new status (fallback if undefined)
    let newStatus = data.ApplicationStatus;
    if (!newStatus) {
      if (isCurrentlyArchived) {
        const closedHeaders = closedSheet.getDataRange().getValues()[0];
        newStatus = archivedRowData[closedHeaders.indexOf('ApplicationStatus')] || 'Closed';
      } else {
        newStatus = regData[rowIndex - 1][regHeaders.indexOf('ApplicationStatus')] || 'Active';
      }
    }
    
    // Call updateApplicationStatus to handle sheet move
    const moveRes = updateApplicationStatus([data.registrationId], newStatus);
    if (moveRes.status === 'error') {
      return moveRes;
    }
    
    // Determine target sheet and index
    let targetSheet;
    let targetRowIndex = -1;
    let targetHeaders;
    
    const targetIsArchivedNow = (newStatus.toLowerCase() === 'closed' || newStatus.toLowerCase() === 'opt-out' || newStatus.toLowerCase() === 'optout');
    
    if (targetIsArchivedNow) {
      targetSheet = getSheet('Closed and Opt-out');
      const targetData = targetSheet.getDataRange().getValues();
      targetHeaders = targetData[0];
      const targetRegIdCol = targetHeaders.indexOf('RegistrationID');
      for (let i = 1; i < targetData.length; i++) {
        if (String(targetData[i][targetRegIdCol]) === String(data.registrationId)) {
          targetRowIndex = i + 1;
          break;
        }
      }
    } else {
      targetSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
      const targetData = targetSheet.getDataRange().getValues();
      targetHeaders = targetData[0];
      const targetRegIdCol = targetHeaders.indexOf('RegistrationID');
      for (let i = 1; i < targetData.length; i++) {
        if (String(targetData[i][targetRegIdCol]) === String(data.registrationId)) {
          targetRowIndex = i + 1;
          break;
        }
      }
    }
    
    if (targetRowIndex === -1 || !targetSheet) {
      return { status: 'error', message: 'Failed to locate student after status move.' };
    }
    
    // Update other fields on the target sheet
    const keys = Object.keys(data);
    keys.forEach(key => {
      if (key === 'registrationId') return;
      const colIdx = targetHeaders.indexOf(key);
      if (colIdx !== -1) {
        let val = data[key];
        if (key === 'RFID_TagID' && val) {
          val = standardizeRfidFormat(val);
          if (val) val = "'" + val;
        }
        targetSheet.getRange(targetRowIndex, colIdx + 1).setValue(val);
      }
    });
    
    executionCache.delete(SHEET_NAMES.REGISTRATIONS);
    executionCache.delete('Closed and Opt-out');
    return { status: 'success', message: 'Profile updated successfully.' };
  }

  // 4. Standard Flow (student is not archived and not being archived)
  // Special handling for RFID Tag assignment
  if (data.RFID_TagID !== undefined) {
    const rawTag = String(data.RFID_TagID).trim();
    const newTag = standardizeRfidFormat(rawTag);
    const oldTag = standardizeRfidFormat(regData[rowIndex - 1][regHeaders.indexOf('RFID_TagID')] || "");

    if (newTag !== oldTag) {
      const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
      const invHeaders = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0];
      const idColIdx = invHeaders.indexOf("RFID_TagID");
      const statusColIdx = invHeaders.indexOf("Status");
      const assignedColIdx = invHeaders.indexOf("AssignedTo");

      // 1. If there's a new tag, check if it's available or already assigned
      if (newTag) {
        // --- Expiry Validation Check ---
        const endDayIdx = regHeaders.indexOf('InternshipEndDate');
        const internEnd = regData[rowIndex - 1][endDayIdx];
        if (internEnd) {
          const ed = new Date(internEnd);
          ed.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (today >= ed) {
            return { status: 'error', message: 'Assignment Denied: Internship period has ended for this student.' };
          }
        }
        // ------------------------------

        const invRowIdx = findRowIndexByValue(invSheet, newTag, 'RFID_TagID');
        if (invRowIdx !== -1) {
          const currentStatus = invSheet.getRange(invRowIdx, statusColIdx + 1).getValue();
          const currentHolder = invSheet.getRange(invRowIdx, assignedColIdx + 1).getValue();

          if (currentStatus === 'Assigned' && currentHolder && currentHolder !== data.registrationId) {
            return { status: 'error', message: `RFID Tag ${newTag} is already assigned to student ${currentHolder}. Duplicate assignments are not allowed.` };
          }
          if (currentStatus === 'Blocked') {
            return { status: 'error', message: `RFID Tag ${newTag} is currently BLOCKED and cannot be assigned.` };
          }

          // Mark as Assigned
          invSheet.getRange(invRowIdx, statusColIdx + 1).setValue('Assigned');
          invSheet.getRange(invRowIdx, assignedColIdx + 1).setValue(data.registrationId);
          invSheet.getRange(invRowIdx, invHeaders.indexOf("LastUpdated") + 1).setValue(new Date());
        } else {
          // If tag doesn't exist in inventory, add it automatically — Force string formatting
          const now = new Date();
          invSheet.appendRow(["'" + newTag, 'Assigned', data.registrationId, now, 'Auto-Assign', now]);
        }
      }

      // 2. If there was an old tag, mark it as Available
      if (oldTag) {
        const oldInvRowIdx = findRowIndexByValue(invSheet, oldTag, 'RFID_TagID');
        if (oldInvRowIdx !== -1) {
          invSheet.getRange(oldInvRowIdx, statusColIdx + 1).setValue('Available');
          invSheet.getRange(oldInvRowIdx, assignedColIdx + 1).setValue('');
          invSheet.getRange(oldInvRowIdx, invHeaders.indexOf("LastUpdated") + 1).setValue(new Date());
        }
      }
    }
  }

  // Update fields
  const keys = Object.keys(data);
  let statusUpdated = false;

  // Auto-update status to 'Assigned' if RFID is provided and student is Approved/Active
  if (data.RFID_TagID && String(data.RFID_TagID).trim() !== "") {
    const currentStatus = String(regData[rowIndex - 1][regHeaders.indexOf('ApplicationStatus')] || "").trim();
    const currentActualStatus = String(regData[rowIndex - 1][regHeaders.indexOf('Status')] || "").trim();

    if (currentStatus === 'Approved' || currentActualStatus === 'Approved' || currentStatus === 'Active' || currentActualStatus === 'Active') {
      data.ApplicationStatus = 'Assigned';
      data.Status = 'Assigned';
      if (!keys.includes('ApplicationStatus')) keys.push('ApplicationStatus');
      if (!keys.includes('Status')) keys.push('Status');
      statusUpdated = true;
    }
  }

  keys.forEach(key => {
    if (key === 'registrationId') return;
    const colIdx = regHeaders.indexOf(key);
    if (colIdx !== -1) {
      let val = data[key];
      // Force RFID Tag standardization and string storage
      if (key === 'RFID_TagID' && val) {
        val = standardizeRfidFormat(val);
        if (val) val = "'" + val;
      }
      regSheet.getRange(rowIndex, colIdx + 1).setValue(val);
    }
  });

  if (statusUpdated) {
    logActivity('Status Updated', 'System', `Student ${data.registrationId} status set to Assigned due to RFID provision.`);
  }

  return { status: 'success', message: 'Profile updated successfully' + (statusUpdated ? ' and status set to Assigned.' : '.') };
}

function deleteRowsByColumnValue(sheetName, colName, value) {
  const sheet = getSheet(sheetName);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return;

  let colIdx = data[0].indexOf(colName);

  // Fallback if header mismatch or StudentDiary variation
  if (colIdx === -1) {
    if (sheetName === SHEET_NAMES.STUDENT_DIARY) {
      colIdx = data[0].indexOf("RegID");
    }
  }

  if (colIdx === -1) return; // Column not found

  // iterating backwards to delete safely
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIdx]) === String(value)) {
      sheet.deleteRow(i + 1);
    }
  }
}

/**
 * Generates certificate number in format: GSV/YY/TYPE/COLLEGE_CODE/SLNO
 * Uses MAX(SLNO) from existing data to ensure correct sequencing even if rows are deleted.
 */
function generateCertificateSerialNumber(studentData, certSheet) {
  const yearDigits = new Date().getFullYear().toString().slice(-2);

  let typeCode = 'C';
  const eduType = (studentData.EducationType || '').toString().toLowerCase();
  if (eduType.includes('diploma')) {
    typeCode = 'D';
  } else if (eduType.includes('iti')) {
    typeCode = 'I';
  }

  const collegeCode = studentData.CollegeCode || '000';

  let nextNum = 1;
  if (certSheet) {
    // Robust Serial Numbering: Find Max(SlNo) in existing certificates
    const data = certSheet.getDataRange().getValues();
    const certNoCol = data[0].indexOf("CertificateNumber"); // Assuming header name

    let maxSlNo = 0;
    if (certNoCol !== -1 && data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        const certNo = String(data[i][certNoCol]);
        // Format: GSV/YY/TYPE/CODE/SLNO
        // Split by '/' and take last part
        const parts = certNo.split('/');
        if (parts.length >= 5) {
          const slPart = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(slPart) && slPart > maxSlNo) {
            maxSlNo = slPart;
          }
        }
      }
    }
    nextNum = maxSlNo + 1;
  }

  const slNo = String(nextNum).padStart(4, '0');

  return `GSV/${yearDigits}/${typeCode}/${collegeCode}/${slNo}`;
}

// Consolidated and cleaned up redundant updateApplicationStatus block.
// Functional logic moved to around line 3223.








/**
 * Sends an email to a student or all students.
 * Renamed to sendAdminEmail to avoid conflicts.
 */
function sendAdminEmail(recipientRegId, subject, body) {
  Logger.log('sendAdminEmail CALLED_V3');
  try {
    if (!subject || !body) {
      return {
        status: 'error',
        message: 'Subject and Email Body are required.'
      };
    }
    let recipients = [];
    if (recipientRegId) {
      const student = getStudentDataForDoc(recipientRegId);
      if (student && student.GmailID) {
        recipients.push({
          email: student.GmailID,
          name: student.FirstName,
          fullName: student.FullName,
          registrationId: student.RegistrationID,
          startDate: student.FormattedStartDate,
          endDate: student.FormattedEndDate,
          collegeName: student.CollegeName,
          department: student.Department
        });
      } else {
        return {
          status: 'error',
          message: 'Student ' + recipientRegId + ' not found or has no email.'
        };
      }
    } else {
      const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
      const data = regSheet.getDataRange().getValues();
      const header = data[0];
      const gmailCol = header.indexOf('GmailID');
      const statusCol = header.indexOf('ApplicationStatus');
      const firstNameCol = header.indexOf('FirstName');
      const regIdCol = header.indexOf('RegistrationID');
      const startDateCol = header.indexOf('InternshipStartDate');
      const endDateCol = header.indexOf('InternshipEndDate');
      const collegeCol = header.indexOf('CollegeName');
      const deptCol = header.indexOf('Department');

      if ([gmailCol, statusCol, firstNameCol].includes(-1)) {
        Logger.log('Custom email column name mismatch in Registrations sheet. Headers: ' + JSON.stringify(header));
        return {
          status: 'error',
          message: 'Email sending config error (SCE_H_MM2).'
        };
      }

      for (let i = 1; i < data.length; i++) {
        if (data[i][gmailCol] && (data[i][statusCol] === 'Approved' || data[i][statusCol] === 'Active')) {
          recipients.push({
            email: data[i][gmailCol],
            name: data[i][firstNameCol],
            fullName: data[i][firstNameCol],
            registrationId: regIdCol !== -1 ? data[i][regIdCol] : 'N/A',
            startDate: startDateCol !== -1 ? formatDate(data[i][startDateCol]) : 'N/A',
            endDate: endDateCol !== -1 ? formatDate(data[i][endDateCol]) : 'N/A',
            collegeName: collegeCol !== -1 ? data[i][collegeCol] : 'N/A',
            department: deptCol !== -1 ? data[i][deptCol] : 'N/A'
          });
        }
      }
      if (recipients.length === 0) {
        return {
          status: 'info',
          message: 'No approved/active students found to send email to.'
        };
      }
    }

    let emailsSentCount = 0;
    recipients.forEach(recipient => {
      // Replace all placeholders with student data
      let personalizedBodyText = body;
      let personalizedSubject = subject;

      // Define all placeholder replacements (support both {{key}} and {key} formats)
      const replacements = {
        'studentName': recipient.fullName || recipient.name || 'Student',
        'StudentName': recipient.fullName || recipient.name || 'Student',
        'FullName': recipient.fullName || recipient.name || 'Student',
        'regId': recipient.registrationId || 'N/A',
        'RegId': recipient.registrationId || 'N/A',
        'RegistrationID': recipient.registrationId || 'N/A',
        'startDate': recipient.startDate || 'N/A',
        'StartDate': recipient.startDate || 'N/A',
        'InternshipStartDate': recipient.startDate || 'N/A',
        'endDate': recipient.endDate || 'N/A',
        'EndDate': recipient.endDate || 'N/A',
        'InternshipEndDate': recipient.endDate || 'N/A',
        'collegeName': recipient.collegeName || 'N/A',
        'CollegeName': recipient.collegeName || 'N/A',
        'department': recipient.department || 'N/A',
        'Department': recipient.department || 'N/A'
      };

      // Replace placeholders in both {{key}} and {key} formats
      for (const [key, value] of Object.entries(replacements)) {
        const doublePattern = new RegExp('\\{\\{' + key + '\\}\\}', 'gi');
        const singlePattern = new RegExp('\\{' + key + '\\}', 'gi');
        personalizedBodyText = personalizedBodyText.replace(doublePattern, value);
        personalizedBodyText = personalizedBodyText.replace(singlePattern, value);
        personalizedSubject = personalizedSubject.replace(doublePattern, value);
        personalizedSubject = personalizedSubject.replace(singlePattern, value);
      }

      const personalizedBodyHtml = personalizedBodyText.replace(/\n/g, '<br>');

      // Using the helper sendEmail function (which uses MailApp now)
      if (sendEmail(recipient.email, personalizedSubject, personalizedBodyText, personalizedBodyHtml)) {
        emailsSentCount++;
      }
    });

    logActivity('Custom Email Sent', 'Admin', 'Subject: ' + subject + '. Sent to ' + emailsSentCount + ' recipients.');
    createAdminNotification('Custom Email Dispatched', 'Email with subject ' + subject + ' sent to ' + emailsSentCount + ' students.');
    return {
      status: 'success',
      message: 'Email sent to ' + emailsSentCount + ' recipient(s).'
    };

  } catch (error) {
    Logger.log('Error in sendAdminEmail: ' + error.toString());
    return {
      status: 'error',
      message: 'Error sending custom email: ' + error.message
    };
  }
}

// =================================================================================
// DROPDOWN DATA HELPERS
// =================================================================================


// =================================================================================
// NOTIFICATIONS
// =================================================================================

function getAdminNotifications() {
  try {
    let merged = [];

    // 1. Fetch from 'Notifications'
    const sheet1 = getSheet(SHEET_NAMES.NOTIFICATIONS);
    if (sheet1) {
      const data1 = getSheetDataAsObjects(sheet1);
      merged = merged.concat(data1.map(row => ({
        NotificationID: row.ID,
        Title: row.Title || 'Notification',
        Message: row.Message || '',
        Timestamp: row.Timestamp,
        IsRead: row.IsRead === true || row.IsRead === "TRUE" || row.IsRead === "true"
      })));
    }

    // 2. Fetch from 'AdminNotifications'
    const sheet2 = getSheet(SHEET_NAMES.ADMIN_NOTIFICATIONS);
    if (sheet2) {
      const data2 = getSheetDataAsObjects(sheet2);
      merged = merged.concat(data2.map(row => ({
        NotificationID: row.NotificationID || row.ID,
        Title: row.Title || 'Admin Notification',
        Message: row.Message || '',
        Timestamp: row.Timestamp,
        IsRead: row.IsRead === true || row.IsRead === "TRUE" || row.IsRead === "true"
      })));
    }

    // Sort by timestamp desc
    merged.sort((a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0));

    // Return top 50
    return merged.slice(0, 50);
  } catch (e) {
    Logger.log("Error in getAdminNotifications: " + e.toString());
    return [];
  }
}

function markAllAdminNotificationsRead() {
  try {
    const sheetNames = [SHEET_NAMES.NOTIFICATIONS, SHEET_NAMES.ADMIN_NOTIFICATIONS];
    for (const sName of sheetNames) {
      const sheet = getSheet(sName);
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const isReadIndex = headers.indexOf("IsRead");

      if (isReadIndex === -1) continue;

      for (let i = 1; i < data.length; i++) {
        if (data[i][isReadIndex] === false || String(data[i][isReadIndex]).toUpperCase() === 'FALSE') {
          sheet.getRange(i + 1, isReadIndex + 1).setValue(true);
        }
      }
    }

    return { status: 'success' };
  } catch (e) {
    Logger.log("Error in markAllAdminNotificationsRead: " + e.toString());
    return { status: 'error', message: e.message };
  }
}

function deleteNotification(notificationId) {
  try {
    const sId = String(notificationId);

    // Handle Chat notifications (Private)
    if (sId.startsWith('chat-')) {
      return markNotificationRead(notificationId); // Dismissing a chat notif = mark read
    }

    // Handle Batch notifications
    if (sId.startsWith('batch-')) {
      return markNotificationRead(notificationId); // Dismissing a batch notif = update last check
    }

    const sheetNames = [SHEET_NAMES.ADMIN_NOTIFICATIONS, SHEET_NAMES.NOTIFICATIONS];
    for (const sName of sheetNames) {
      const sheet = getSheet(sName);
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf("ID") !== -1 ? headers.indexOf("ID") : headers.indexOf("NotificationID");

      if (idIndex === -1) continue;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]) === String(notificationId)) {
          sheet.deleteRow(i + 1);
          return { status: 'success', message: 'Notification deleted' };
        }
      }
    }
    return { status: 'error', message: 'Notification not found' };
  } catch (e) {
    Logger.log("Error in deleteNotification: " + e.toString());
    return { status: 'error', message: e.message };
  }
}

function markAllStudentNotificationsRead(regId) {
  try {
    const studentId = String(regId || "").trim().toUpperCase();

    // 1. Mark AdminNotifications as read
    const sheet = getSheet(SHEET_NAMES.ADMIN_NOTIFICATIONS);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const targetCol = headers.indexOf("TargetAdminID");
      const isReadCol = headers.indexOf("IsRead");

      if (targetCol !== -1 && isReadCol !== -1) {
        for (let i = 1; i < data.length; i++) {
          const tId = String(data[i][targetCol] || "").trim().toUpperCase();
          if (tId === studentId && (data[i][isReadCol] === false || String(data[i][isReadCol]).toUpperCase() === 'FALSE')) {
            sheet.getRange(i + 1, isReadCol + 1).setValue(true);
          }
        }
      }
    }

    // 2. Mark ChatMessages as read
    const chatSheet = getSheet(SHEET_NAMES.CHAT_MESSAGES);
    if (chatSheet) {
      const chatData = chatSheet.getDataRange().getValues();
      const receiverCol = chatData[0].indexOf("ReceiverID");
      const readCol = chatData[0].indexOf("IsReadByReceiver");

      if (receiverCol !== -1 && readCol !== -1) {
        for (let j = 1; j < chatData.length; j++) {
          const rId = String(chatData[j][receiverCol] || "").trim().toUpperCase();
          if (rId === studentId && (chatData[j][readCol] === false || String(chatData[j][readCol]).toUpperCase() === 'FALSE')) {
            chatSheet.getRange(j + 1, readCol + 1).setValue(true);
          }
        }
      }
    }

    // 3. Update LastChatCheck to clear Batch Notifications
    updateStudentLastChatCheck(regId, new Date().getTime());

    return { status: 'success', message: 'All notifications marked as read' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function deleteChatMessage(messageId, type) {
  try {
    const sheetName = type === 'batch' ? SHEET_NAMES.BATCH_CHAT : SHEET_NAMES.CHAT_MESSAGES;
    const sheet = getSheet(sheetName);
    if (!sheet) return { status: 'error', message: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    const idIndex = data[0].indexOf("MessageID");

    if (idIndex === -1) return { status: 'error', message: 'ID column not found' };

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === String(messageId)) {
        sheet.deleteRow(i + 1);
        return { status: 'success', message: 'Message deleted' };
      }
    }
    return { status: 'error', message: 'Message not found' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function clearAllNotifications() {
  try {
    const sheet = getSheet(SHEET_NAMES.NOTIFICATIONS);
    if (!sheet) return { status: 'error', message: 'Sheet not found' };

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    return { status: 'success', message: 'All notifications cleared' };
  } catch (e) {
    Logger.log("Error in clearAllNotifications: " + e.toString());
    return { status: 'error', message: e.message };
  }
}

/**
 * Marks a notification as read. Supports standard, chat, and batch alerts.
 */
function markNotificationAsRead(notificationId) {
  try {
    const notifStr = String(notificationId);

    // 1. Handle Private Chat Notifications
    if (notifStr.startsWith('chat-')) {
      const msgId = notifStr.replace('chat-', '');
      const sheet = getSheet(SHEET_NAMES.CHAT_MESSAGES);
      if (!sheet) return { status: 'error', message: 'Chat source unavailable' };
      const data = sheet.getDataRange().getValues();
      const idCol = data[0].indexOf("MessageID");
      const readCol = data[0].indexOf("IsReadByReceiver");
      if (idCol === -1 || readCol === -1) return { status: 'error', message: 'Chat format error' };

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(msgId)) {
          sheet.getRange(i + 1, readCol + 1).setValue(true);
          return { status: 'success' };
        }
      }
      return { status: 'error', message: 'Message not found' };
    }

    // 2. Handle Batch Chat Notifications (Dismiss by updating LastChatCheck)
    if (notifStr.startsWith('batch-')) {
      // We'll update the student's LastChatCheck to prevent this and prior batch messages from showing as alert
      // We need the student regId though. Let's assume we can derive it or mark read handles it differently.
      // Actually, for individual batch dismiss, we might need regId. 
      // For now, most batch alerts are cleared when chat is opened.
      return { status: 'success', message: 'Batch alert dismissed' };
    }

    // 3. Handle Standard Notifications
    const sheetNames = [SHEET_NAMES.ADMIN_NOTIFICATIONS, SHEET_NAMES.NOTIFICATIONS];
    for (const sName of sheetNames) {
      const sheet = getSheet(sName);
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf("ID") !== -1 ? headers.indexOf("ID") : headers.indexOf("NotificationID");
      const isReadIndex = headers.indexOf("IsRead");

      if (idIndex === -1 || isReadIndex === -1) continue;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]) === String(notificationId)) {
          sheet.getRange(i + 1, isReadIndex + 1).setValue(true);
          return { status: 'success' };
        }
      }
    }
    return { status: 'error', message: 'Notification not found' };
  } catch (e) {
    Logger.log("Error in markNotificationAsRead: " + e.toString());
    return { status: 'error', message: e.message };
  }
}

/**
 * Alias for markNotificationAsRead (used by Student Dashboard)
 */
function markNotificationRead(id) {
  return markNotificationAsRead(id);
}
// =================================================================================
// NEW: COMPREHENSIVE STUDENT PROFILE & HELPERS
// =================================================================================

/**
 * Robustly fetches all student data from the registrations sheet.
 */
function getStudentFullData(regId) {
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!sheet) return { status: 'error', message: 'Registrations sheet not found' };

    const data = getSheetDataAsObjects(sheet);
    let student = data.find(r => {
      const sId = String(r.RegistrationID || "").trim().toUpperCase();
      const targetId = String(regId || "").trim().toUpperCase();
      return sId === targetId;
    });

    if (!student) {
      // Fallback search in Closed and Opt-out sheet
      const closedSheet = getSheet('Closed and Opt-out');
      if (closedSheet) {
        const closedData = getSheetDataAsObjects(closedSheet);
        student = closedData.find(r => {
          const sId = String(r.RegistrationID || "").trim().toUpperCase();
          const targetId = String(regId || "").trim().toUpperCase();
          return sId === targetId;
        });
      }
    }

    if (!student) return { status: 'error', message: 'Student not found: ' + regId };
    return { status: 'success', studentData: student };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/**
 * Internal helper used by various backend functions.
 */
function getStudentDetails_(regId) {
  const res = getStudentFullData(regId);
  if (res.status === 'success') {
    // Return structured details
    return { status: 'success', details: res.studentData };
  }
  return res;
}

// Alias for internal usage (ensure this exists if referenced elsewhere)
function getStudentDetails_LEGACY_2(regId) {
  const res = getStudentFullData(regId);
  if (res.status === 'success') return { status: 'success', details: res.studentData };
  return { status: 'error', message: res.message };
}

// Note: getStudentTasks and getStudentProjects are already defined with robust column mapping around line 4300.
// Removing duplicates here to prevent overwriting correct logic.

// DUPLICATE REMOVED: getStudentAttendance is defined at ~line 6183 with full calendar support
// (summary, indicators, internship dates, RFID). Do NOT redefine here.

// DUPLICATE REMOVED: getStudentCertificate is defined at ~line 6688 with full document lookup.
// Do NOT redefine here.

function getStudentComprehensiveProfile(regId) {
  try {
    // 1. Details
    const detailsResp = getStudentFullData(regId);
    if (detailsResp.status !== 'success') {
      return { status: 'error', message: detailsResp.message };
    }
    const d = detailsResp.studentData;

    // Helper to find key in object case-insensitively and space-insensitively
    const findValue = (obj, keyPart) => {
      const normalizedPart = keyPart.toLowerCase().replace(/\s+/g, '').replace(/url$/g, '');
      const actualKey = Object.keys(obj).find(k => {
        const normalizedKey = k.toLowerCase().replace(/\s+/g, '').replace(/url$/g, '');
        return normalizedKey === normalizedPart || normalizedKey.includes(normalizedPart);
      });
      return actualKey ? obj[actualKey] : null;
    };

    // Map to frontend-friendly keys
    const details = {
      registrationId: d["RegistrationID"] || d["registrationId"] || regId,
      name: getStudentFullName_(d),
      firstName: d["FirstName"] || '',
      middleName: d["MiddleName"] || '',
      lastName: d["LastName"] || '',
      email: d["GmailID"] || d["gmailId"],
      mobile: d["MobileNumber"] || d["mobile"],
      batch: d["Batch"] || d["batch"],
      college: d["CollegeName"] || d["college"],
      department: d["Department"] || d["department"],
      year: d["Year"] || d["year"],
      registerNumber: d["RegisterNumber"] || d["registerNumber"],
      addressLine: d["Address"] || d["address"],
      district: d["District"] || d["district"],
      pincode: d["Pincode"] || d["pincode"],
      appliedDate: formatDateISO(d["Timestamp"]),
      status: String(d["ApplicationStatus"] || d["Status"] || d["status"] || "").toLowerCase(),
      startDate: formatDateISO(d["InternshipStartDate"]),
      endDate: formatDateISO(d["InternshipEndDate"]),
      InternshipStartDate: formatDateISO(d["InternshipStartDate"]),
      InternshipEndDate: formatDateISO(d["InternshipEndDate"]),
      educationType: d["EducationType"],
      semester: d["Semester"],
      durationDays: d["DurationDays"],
      lastLogin: formatDateISO(d["LastLogin"]),
      lastActivity: formatDateISO(d["LastChatCheck"]),
      profilePhotoUrl: d["ProfilePhotoUrl"] || '',
      email: d["GmailID"] || d["EmailID"] || d["email"] || d["Gmail_ID"] || '',
      gmailId: d["GmailID"] || '',
      dob: formatDateISO(d["DateofBirth"]),
      cgpa: d["GPA"],
      collegeDistrict: d["CollegeDistrict"],
      collegeCode: d["CollegeCode"],
      interestedArea: d["InterestedArea"],
      documents: {
        bonafide: !!findValue(d, "Bonafide"),
        declaration: !!findValue(d, "Declaration"),
        collegeId: !!(findValue(d, "CollegeId") || findValue(d, "IDCard") || findValue(d, "College ID")),
        other: !!findValue(d, "Other")
      },
      permissions: {
        attendance: (d["AttendanceAccess"] === true || d["AttendanceAccess"] === 'TRUE'),
        diary: (d["DiaryAccess"] === true || d["DiaryAccess"] === 'TRUE')
      },
      rfidTag: d["RFID_TagID"] || '',
      certificateIssued: !!(d["CertificateLink"] || d["CertificateIssuedDate"])
    };

    // Internship Status Logic Update
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = details.endDate ? new Date(details.endDate) : null;
    if (endDate && today > endDate) {
      if (details.certificateIssued) details.status = "internship completed";
      else details.status = "internship period ended";
    }

    // 9. Deadline Warning Logic
    let deadlineWarning = null;
    if (endDate && (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7) {
      // Find pending items
      const pendingItems = [];
      // Attendance check performed later after attResp is fetched
      // Diary check performed later
    }

    // Calculate Duration Days if missing or ensure precise inclusive count
    if (details.InternshipStartDate && details.InternshipEndDate) {
      const start = new Date(details.InternshipStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(details.InternshipEndDate);
      end.setHours(0, 0, 0, 0);
      const diffTime = end - start;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive count
      details.durationDays = diffDays > 0 ? diffDays : 0;
    }

    // 2. Tasks - Robustly ensure it's an array
    const tasksRaw = getStudentTasks(regId);
    const tasks = Array.isArray(tasksRaw) ? tasksRaw : (tasksRaw && tasksRaw.tasks ? tasksRaw.tasks : []);

    // 3. Projects - Robustly ensure it's an array
    const projectsRaw = getStudentProjects(regId);
    const projects = Array.isArray(projectsRaw) ? projectsRaw : (projectsRaw && projectsRaw.projects ? projectsRaw.projects : []);

    // 4. Attendance
    const attResp = getStudentAttendance(regId);
    let attendance = [];
    let attStats = null;
    if (attResp && attResp.status === 'success') {
      attendance = attResp.attendanceRecords || [];
      attStats = attResp.summary;
    }

    // 5. Diary
    const diaryResp = getStudentDashboardDiaryData(regId);
    const diary = (diaryResp && diaryResp.status === 'success') ? diaryResp : { status: 'error', diary: {} };

    // Deadline Warning Refinement
    if (endDate && today <= endDate) {
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        const pending = [];
        // Use lowercase 'status' to match getStudentTasks/Projects objects
        if (tasks.some(t => t.status !== 'Completed' && t.status !== 'Approved')) pending.push("Tasks");
        if (projects.some(p => p.status !== 'Completed' && p.status !== 'Approved')) pending.push("Projects");
        if (attStats && attStats.absentCounter > 0) pending.push("Attendance");

        if (pending.length > 0) {
          deadlineWarning = {
            daysRemaining: daysLeft,
            sections: pending,
            message: `Pending Work - Deadline Approaching`
          };
        }
      }
    }
    details.deadlineWarning = deadlineWarning;

    // 6. Certificate
    const certResp = getStudentCertificate(regId);
    let certificate = null;
    if (certResp && certResp.status === 'success') {
      let pdfId = null;
      if (certResp.certificateLink) {
        const match = certResp.certificateLink.match(/id=([^&]+)/);
        if (match) pdfId = match[1];
      }

      certificate = {
        CertificateNumber: certResp.certificateNumber,
        IssuedDate: certResp.issuedDate,
        CertificatePdfId: pdfId,
        Status: 'Issued',
        Link: certResp.certificateLink
      };
    }

    // 7. Notifications
    const notifResp = getStudentNotifications(regId);
    const notifications = (notifResp && notifResp.status === 'success') ? notifResp.notifications : [];

    // 8. Attendance Requests
    const attReqResp = getStudentAttendanceRequests(regId);
    const attendanceRequests = (attReqResp && attReqResp.status === 'success') ? attReqResp.requests : [];

    // 9. Files
    const filesResp = getStudentFiles(regId);
    const files = (filesResp && filesResp.status === 'success') ? filesResp.files : [];

    // 10. Consolidated Summary for Student & Admin
    const diaryEntryCount = diary && diary.diary ? Object.keys(diary.diary).length : 0;
    let expectedDiaryDays = 0;
    if (details.InternshipStartDate && details.InternshipEndDate) {
      const sD = new Date(details.InternshipStartDate); sD.setHours(0, 0, 0, 0);
      const eD = new Date(details.InternshipEndDate); eD.setHours(0, 0, 0, 0);
      const tD = new Date(); tD.setHours(0, 0, 0, 0);
      const effectiveEnd = eD < tD ? eD : tD;
      let cur = new Date(sD);
      while (cur <= effectiveEnd) {
        if (cur.getDay() !== 0) expectedDiaryDays++; // Exclude Sundays
        cur.setDate(cur.getDate() + 1);
      }
    }

    const tasksCompleted = tasks.filter(t => t.status === 'Completed' || t.status === 'Approved').length;
    const projectsCompleted = projects.filter(p => p.status === 'Completed' || p.status === 'Approved').length;

    const consolidatedSummary = {
      attendance: {
        totalWorkingDays: attStats ? attStats.totalWorkingDays : 0,
        present: attStats ? attStats.presentCounter : 0,
        absent: attStats ? attStats.absentCounter : 0,
        late: attStats ? attStats.lateCounter : 0,
        wfh: attStats ? attStats.wfhCounter : 0,
        od: attStats ? attStats.odCounter : 0,
        medical: attStats ? attStats.medicalCounter : 0,
        percentage: attStats ? attStats.percentage : 0
      },
      diary: {
        totalEntries: diaryEntryCount,
        expectedEntries: expectedDiaryDays,
        missingEntries: Math.max(0, expectedDiaryDays - diaryEntryCount),
        percentage: expectedDiaryDays > 0 ? ((diaryEntryCount / expectedDiaryDays) * 100).toFixed(1) : 0
      },
      tasks: {
        total: tasks.length,
        completed: tasksCompleted,
        pending: tasks.length - tasksCompleted
      },
      projects: {
        total: projects.length,
        completed: projectsCompleted,
        pending: projects.length - projectsCompleted
      },
      internship: {
        startDate: details.InternshipStartDate,
        endDate: details.InternshipEndDate,
        durationDays: details.durationDays || 0,
        daysRemaining: details.endDate ? Math.max(0, Math.ceil((new Date(details.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0,
        isActive: details.status === 'approved' || details.status === 'active',
        overallHealthScore: 0 // Calculated below
      }
    };

    // Calculate overall health score (0-100)
    const attScore = parseFloat(consolidatedSummary.attendance.percentage) || 0;
    const diaryScore = parseFloat(consolidatedSummary.diary.percentage) || 0;
    const taskScore = consolidatedSummary.tasks.total > 0 ? (tasksCompleted / consolidatedSummary.tasks.total * 100) : 100;
    const projScore = consolidatedSummary.projects.total > 0 ? (projectsCompleted / consolidatedSummary.projects.total * 100) : 100;
    consolidatedSummary.internship.overallHealthScore = Math.round((attScore * 0.35 + diaryScore * 0.25 + taskScore * 0.2 + projScore * 0.2));

    const finalResponse = {
      status: 'success',
      details: details,
      tasks: tasks,
      projects: projects,
      attendance: attendance,
      attStats: attStats,
      diary: diary,
      certificate: certificate,
      notifications: notifications,
      attendanceRequests: attendanceRequests,
      files: files,
      consolidatedSummary: consolidatedSummary,
      todaySlot: getSlotTiming(details.batch, getTodayStr())
    };

    Logger.log(`COMPREHENSIVE_LOAD: Student: ${regId} | Tasks: ${tasks.length} | Projects: ${projects.length}`);
    return finalResponse;

  } catch (e) {
    Logger.log("Error in getStudentComprehensiveProfile: " + e.toString() + " at line " + e.lineNumber);
    return { status: 'error', message: e.message };
  }
}

function getRecentDiaryEntries_(regId, limit) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    if (!sheet) return [];

    const data = getSheetDataAsObjects(sheet);
    // Flexible RegID check
    const entries = data.filter(r => {
      const rId = r.RegID || r.RegistrationID || r.StudentRegistrationID;
      return String(rId).trim().toLowerCase() === String(regId).trim().toLowerCase();
    });

    // Sort DESC
    entries.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    return entries.slice(0, limit);
  } catch (e) {
    Logger.log("Error in getRecentDiaryEntries_: " + e.toString());
    return [];
  }
}

// =================================================================================
// END OF CONSOLIDATED BACKEND FUNCTIONS
// =================================================================================
// =================================================================================
// STUDENT DIARY ADVANCED FUNCTIONS
// =================================================================================

/**
 * Fetches diary data based on filters
 */
function getAdvancedDiaryData(options) {
  try {
    const diarySheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const diaryData = getSheetDataAsObjects(diarySheet);
    const studentData = getSheetDataAsObjects(regSheet);

    // Create students Map for O(1) lookups
    const studentMap = new Map();
    studentData.forEach(s => {
      if (s.RegistrationID) studentMap.set(String(s.RegistrationID), s);
    });

    // Create Attendance Index for O(1) lookups across all modes
    // Structure: Map<RegID, Map<DateISO, Status>>
    const attendanceIndex = new Map();
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const allAttData = attSheet ? getSheetDataAsObjects(attSheet) : [];
    allAttData.forEach(a => {
      const rid = String(a.StudentRegistrationID);
      const dStr = formatDateISO(a.Date);
      if (!rid || !dStr) return;
      if (!attendanceIndex.has(rid)) attendanceIndex.set(rid, new Map());
      attendanceIndex.get(rid).set(dStr, a.Status || 'Present');
    });

    let results = [];

    if (options.mode === 'all') {
      results = diaryData.map(entry => {
        const student = studentMap.get(String(entry.StudentRegistrationID));
        return {
          date: entry.Date,
          regId: entry.StudentRegistrationID,
          name: student ? getStudentFullName_(student) : (entry.StudentRegistrationID || 'Unknown'),
          status: entry.Status || 'Entered',
          content: entry.Content,
          timestamp: entry.Timestamp
        };
      });
    } else if (options.mode === 'custom') {
      // Enhanced: name field acts as universal keyword search
      const nameQuery = (options.name || '').toLowerCase().trim();
      const regIdQuery = (options.regId || '').toLowerCase().trim();

      // First, find all student IDs that match the keyword (name, batch, college, regId)
      let matchedStudentIds = null; // null means no keyword filter
      if (nameQuery || regIdQuery) {
        matchedStudentIds = new Set();
        studentData.forEach(s => {
          const fullName = `${s.FirstName || ''} ${s.MiddleName || ''} ${s.LastName || ''}`.toLowerCase();
          const fullNameNoSpace = fullName.replace(/\s+/g, '');
          const rid = (s.RegistrationID || '').toLowerCase();
          const batch = (s.Batch || '').toLowerCase();
          const college = (s.CollegeName || '').toLowerCase();

          const q = nameQuery || regIdQuery;
          const qNoSpace = q.replace(/\s+/g, '');

          if (rid.includes(q) || rid.replace(/\s+/g, '').includes(qNoSpace) ||
            fullName.includes(q) || fullNameNoSpace.includes(qNoSpace) ||
            batch.includes(q) || college.includes(q)) {
            matchedStudentIds.add(s.RegistrationID);
          }
        });
      }

      results = diaryData.filter(entry => {
        const rid = String(entry.StudentRegistrationID || '');

        const matchDate = (!options.dateFrom || new Date(entry.Date) >= new Date(options.dateFrom)) &&
          (!options.dateTo || new Date(entry.Date) <= new Date(options.dateTo));

        // Use the pre-computed matched student set for keyword matching
        const matchKeyword = matchedStudentIds === null || matchedStudentIds.has(rid);

        return matchDate && matchKeyword;
      }).map(entry => {
        const rid = String(entry.StudentRegistrationID || '');
        const student = studentMap.get(rid);
        const dStr = formatDateISO(entry.Date);
        const attStatus = (attendanceIndex.has(rid) && attendanceIndex.get(rid).has(dStr)) ? attendanceIndex.get(rid).get(dStr) : '';

        return {
          date: entry.Date,
          regId: entry.StudentRegistrationID,
          name: student ? getStudentFullName_(student) : (entry.StudentRegistrationID || 'Unknown'),
          status: entry.Status || 'Entered',
          attendanceStatus: attStatus,
          content: entry.Content,
          timestamp: entry.Timestamp,
          internshipStart: student ? student.InternshipStartDate : null,
          internshipEnd: student ? student.InternshipEndDate : null
        };
      });

      // If keyword matched a single student, set options.regId so the unified view fills gaps
      if (matchedStudentIds && matchedStudentIds.size === 1) {
        options.regId = [...matchedStudentIds][0];
      }
    } else if (options.mode === 'batch') {
      const batchStudents = studentData.filter(s => s.Batch === options.batch);
      const studentIds = new Set(batchStudents.map(s => String(s.RegistrationID)));

      results = diaryData.filter(entry => studentIds.has(String(entry.StudentRegistrationID)))
        .map(entry => {
          const rid = String(entry.StudentRegistrationID);
          const student = studentMap.get(rid);
          const dStr = formatDateISO(entry.Date);
          const attStatus = (attendanceIndex.has(rid) && attendanceIndex.get(rid).has(dStr)) ? attendanceIndex.get(rid).get(dStr) : '';

          return {
            date: entry.Date,
            regId: entry.StudentRegistrationID,
            name: student ? getStudentFullName_(student) : 'Unknown',
            status: entry.Status || 'Entered',
            attendanceStatus: attStatus,
            content: entry.Content,
            timestamp: entry.Timestamp,
            internshipStart: student ? student.InternshipStartDate : null,
            internshipEnd: student ? student.InternshipEndDate : null
          };
        });
    }

    // Unified student view: If a specific student is targetted, ensure 100% of days are shown
    if (options.regId) {
      const student = studentMap.get(String(options.regId));
      if (student && student.InternshipStartDate && student.InternshipEndDate) {
        const start = new Date(student.InternshipStartDate);
        const end = new Date(student.InternshipEndDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          const existingDates = new Set(results.map(r => formatDateISO(r.date)));

          const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
          const attRecords = attSheet ? getSheetDataAsObjects(attSheet).filter(a => String(a.StudentRegistrationID) === String(student.RegistrationID)) : [];

          const localAttMap = new Map();
          attRecords.forEach(a => {
            const d = formatDateISO(a.Date);
            if (d) localAttMap.set(d, a);
          });

          let curr = new Date(start);
          let safetyCounter = 0;
          while (curr <= end && safetyCounter < 1000) {
            safetyCounter++;
            const dStr = formatDateISO(curr);
            if (!existingDates.has(dStr)) {
              const isSunday = curr.getDay() === 0;
              const isUpcoming = curr > today;
              const attStatus = (attendanceIndex.has(String(student.RegistrationID)) && attendanceIndex.get(String(student.RegistrationID)).has(dStr))
                ? attendanceIndex.get(String(student.RegistrationID)).get(dStr) : (isSunday ? '' : '');

              let status = isUpcoming ? 'Upcoming' : 'Not Filled';
              if (isSunday) status = 'Sunday';
              else if (attStatus.includes('OD')) status = 'On-Duty';
              else if (attStatus.includes('WFH')) status = 'WFH';
              else if (attStatus.includes('Absent')) status = 'Absent';

              results.push({
                date: dStr,
                regId: student.RegistrationID,
                name: getStudentFullName_(student),
                status: status,
                attendanceStatus: attStatus || (isSunday ? 'Holiday' : (isUpcoming ? 'Future' : 'No Record')),
                content: '',
                timestamp: null,
                internshipStart: student.InternshipStartDate,
                internshipEnd: student.InternshipEndDate,
                isGenerated: true
              });
            }
            curr.setDate(curr.getDate() + 1);
          }
        }
      }
    }

    // Sort DESC by date
    results.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return { status: 'success', data: results };
  } catch (e) {
    Logger.log('Error in getAdvancedDiaryData: ' + e.toString() + ' at ' + e.stack);
    return { status: 'error', message: 'Backend Error: ' + e.toString() + ' (Line: ' + (e.lineNumber || 'unknown') + ')' };
  }
}

/**
 * Saves a diary entry with comprehensive validation:
 * 1. Student must be Approved/Active.
 * 2. Date window: Today, Yesterday (free entry), or older dates with approved correction request.
 * 3. Allowed if attendance status is Present/Late/OD/WFH/Medical Leave/Sick Leave/Emergency Leave/Exemption/Admin Approval.
 * 4. Also checks ApprovalStatus='Approved' as a fallback.
 */
function saveDiaryEntry(regId, dateStr, content) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    const diarySheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);

    // 1. Check Student Status
    const student = getSheetDataAsObjects(regSheet).find(s => s.RegistrationID === regId);
    if (!student) return { status: 'error', message: 'Student not found.' };

    // Restriction: Completed students
    if (String(student.ApplicationStatus).toLowerCase() === 'completed') {
      return { status: 'error', message: 'Internship completed. Diary is now in View-Only mode.' };
    }

    if (student.ApplicationStatus !== 'Approved' && student.ApplicationStatus !== 'Active') {
      return { status: 'error', message: 'Diary entry only allowed for Approved/Active students.' };
    }

    // 2. Date Parsing
    const entryDate = new Date(dateStr);
    entryDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

    // Block future dates
    if (entryDate.getTime() > today.getTime()) {
      return { status: 'error', message: 'Cannot enter log for future days.' };
    }

    // 3. For past dates beyond day-before-yesterday (3+ days old), require approved diary correction or grace period
    // Today (0), Yesterday (1), Day-before-yesterday (2) are freely editable
    if (diffDays >= 3) {
      const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
      const allRequests = getSheetDataAsObjects(otpSheet).filter(r =>
        String(r.RegistrationID) === String(regId)
      );

      // Check for approved diary correction for this specific date
      const diaryApproval = allRequests.find(r =>
        r.ActionType === 'DiaryCorrection' &&
        r.Status === 'Approved' &&
        formatDateISO(r.TargetDate) === dateStr
      );

      // Check for approved grace period covering diary
      const graceApproval = allRequests.find(r =>
        r.ActionType === 'GracePeriod' &&
        r.Status === 'Approved' &&
        String(r.LeaveType || '').includes('Diary') &&
        new Date(r.ExpiryTimestamp) >= today
      );

      if (!diaryApproval && !graceApproval) {
        return { status: 'error', message: 'Cannot enter log for past days (2+ days ago). Please request Admin approval first.' };
      }
    }

    // 4. Attendance Status Check – Student must have a valid attendance record
    const allAttendance = getSheetDataAsObjects(attSheet).filter(a =>
      String(a.StudentRegistrationID) === String(regId) &&
      formatDateISO(a.Date) === dateStr
    );

    // Find the best attendance record (prefer Approved status)
    let attendance = allAttendance.find(a => String(a.ApprovalStatus || '').trim() === 'Approved');
    if (!attendance) attendance = allAttendance[0]; // Fallback to any record for this date

    const allowedStatusesLower = [
      'present', 'late with present', 'early present', 'od', 'wfh', 'medical',
      'sick leave', 'emergency leave', 'weekly off', 'holiday',
      'approved', 'exemption', 'admin approval'
    ];

    let canEnter = false;
    let fallbackStatus = 'None';

    if (attendance) {
      const attStatus = String(attendance.Status || '').trim().toLowerCase();
      const approvalStatus = String(attendance.ApprovalStatus || '').trim().toLowerCase();
      const inTime = attendance.InTime ? String(attendance.InTime).trim() : '';
      fallbackStatus = attendance.Status || (inTime && inTime !== 'N/A' ? 'Present' : 'None');

      // Check if attendance status is in allowed list or if they have an arrival time
      if (allowedStatusesLower.some(s => attStatus.includes(s)) || (inTime && inTime !== 'N/A')) {
        canEnter = true;
      }
      // Fallback: If ApprovalStatus is 'Approved', allow entry regardless of Status value
      else if (approvalStatus === 'approved') {
        canEnter = true;
      }
      // Also allow if attendance record exists and it's a pending/recent record for today
      else if (diffDays === 0 && attStatus && attStatus !== 'absent' && attStatus !== 'missed') {
        canEnter = true;
      }
    }

    // If not found in attendance sheet, check ATTENDANCE_OTP for check-ins or valid requests
    if (!canEnter) {
      const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
      if (otpSheet) {
        const dayReqs = getSheetDataAsObjects(otpSheet).filter(r =>
          String(r.RegistrationID) === String(regId) &&
          formatDateISO(r.TargetDate) === dateStr
        );

        const validReq = dayReqs.find(r => {
          const type = String(r.ActionType || r.LeaveType || '').toUpperCase();
          const stat = String(r.Status || '').toUpperCase();
          if (type.includes('PIN_CHECKIN') || type.includes('EARLY_EXIT') || type.includes('MANUAL ATTENDANCE') || type.includes('CORRECTION')) {
            return stat !== 'REJECTED';
          }
          if (['WFH', 'OD', 'MEDICAL LEAVE', 'SICK LEAVE'].some(t => type.includes(t))) {
            return stat === 'APPROVED' || (stat === 'PENDING ADMIN APPROVAL' && diffDays <= 1);
          }
          return false;
        });

        if (validReq) {
          canEnter = true;
          fallbackStatus = validReq.ActionType || validReq.LeaveType;
        }
      }
    }

    if (!canEnter) {
      return {
        status: 'error',
        message: `You are not marked Present/OD/WFH for ${dateStr} (Status: ${fallbackStatus}). Please mark attendance first or contact Admin.`
      };
    }

    // 5. Update or Insert diary entry
    const data = diarySheet.getDataRange().getValues();
    const headers = data[0];
    const rCol = headers.indexOf("StudentRegistrationID");
    const dCol = headers.indexOf("Date");
    const cCol = headers.indexOf("Content");
    const tCol = headers.indexOf("Timestamp");

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][rCol] === regId && formatDateISO(data[i][dCol]) === dateStr) {
        rowIndex = i + 1;
        break;
      }
    }

    const timestamp = new Date();
    if (rowIndex !== -1) {
      diarySheet.getRange(rowIndex, cCol + 1).setValue(content);
      diarySheet.getRange(rowIndex, tCol + 1).setValue(timestamp);
    } else {
      // ["StudentRegistrationID", "Date", "Content", "Status", "Timestamp"]
      diarySheet.appendRow([regId, dateStr, content, 'Entered', timestamp]);
    }

    lock.releaseLock();
    return { status: 'success', message: 'Diary entry saved successfully.' };
  } catch (e) {
    return { status: 'error', message: 'Error saving diary: ' + e.toString() };
  }
}

/**
 * Gets enhanced diary data for the student dashboard.
 * Includes attendance status for color coding.
 */
function getStudentDashboardDiaryData(regId) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const student = getSheetDataAsObjects(regSheet).find(s => s.RegistrationID === regId);
    if (!student) return { status: 'error', message: 'Student not found' };

    const startDate = new Date(student.InternshipStartDate);
    const endDate = new Date(student.InternshipEndDate);
    const diarySheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);

    const diaryEntries = getSheetDataAsObjects(diarySheet).filter(e => e.StudentRegistrationID === regId);
    const attendanceRecords = getSheetDataAsObjects(attSheet).filter(a => a.StudentRegistrationID === regId);

    const diaryMap = {};
    diaryEntries.forEach(e => {
      const d = formatDateISO(e.Date);
      if (d) diaryMap[d] = { content: e.Content, status: e.Status || 'Entered' };
    });

    const attMap = {};
    attendanceRecords.forEach(a => {
      const d = formatDateISO(a.Date);
      if (d) {
        let st = a.Status ? String(a.Status).trim() : '';
        if (!st && a.InTime && String(a.InTime).trim() !== '' && String(a.InTime).trim() !== 'N/A') {
          st = 'Present'; // Has check-in time, treat as effectively present
        }
        attMap[d] = {
          status: st,
          approvalStatus: a.ApprovalStatus ? String(a.ApprovalStatus).trim() : '',
          adminComment: a.AdminComment || '',
          isRead: a.IsCommentRead === true || a.IsCommentRead === 'TRUE'
        };
      }
    });

    const otpSheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    let allReqs = [];
    if (otpSheet) {
      allReqs = getSheetDataAsObjects(otpSheet).filter(r => String(r.RegistrationID) === String(regId));
    }

    // Legacy mapping specifically for diary correction UI state
    const diaryReqs = allReqs.filter(r => r.ActionType === 'DiaryCorrection');
    const diaryReqMap = {};
    diaryReqs.forEach(r => {
      const d = formatDateISO(r.TargetDate);
      if (d) diaryReqMap[d] = r.Status;
    });

    // Also populate attMap with pending OTP requests so UI allows entry
    allReqs.forEach(r => {
      const type = String(r.ActionType || r.LeaveType || '').toUpperCase();
      const st = String(r.Status || '').toUpperCase();
      if ((type.includes('PIN') || type.includes('EARLY') || type.includes('MANUAL') || ['WFH', 'OD', 'MEDICAL LEAVE', 'SICK LEAVE'].some(t => type.includes(t))) && st !== 'REJECTED') {
        const d = formatDateISO(r.TargetDate);
        // Populate if no entry exists, OR if existing entry has an empty/non-valid status
        const existingStatus = attMap[d] ? String(attMap[d].status || '').trim().toLowerCase() : '';
        const validStatuses = ['present', 'late with present', 'od', 'wfh', 'medical', 'sick leave', 'emergency leave', 'approved'];
        const existingIsValid = validStatuses.some(s => existingStatus.includes(s));

        if (d && (!attMap[d] || !existingIsValid)) {
          attMap[d] = {
            status: type.includes('PIN') || type.includes('EARLY') ? 'Present' : (r.ActionType || r.LeaveType),
            approvalStatus: r.Status || '',
            adminComment: attMap[d] ? attMap[d].adminComment : '',
            isRead: attMap[d] ? attMap[d].isRead : true
          };
        }
      }
    });

    return {
      status: 'success',
      internshipStart: student.InternshipStartDate,
      internshipEnd: student.InternshipEndDate,
      diary: diaryMap,
      attendance: attMap,
      diaryRequests: diaryReqMap,
      studentStatus: student.ApplicationStatus,
      batch: student.Batch
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * PDF Generation for Student Diary (Admin)
 */
function generateStudentDiaryPDF(regId) {
  try {
    const student = getStudentDataForDoc(regId);
    if (!student) throw new Error("Student not found");

    const diarySheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const diaryEntries = getSheetDataAsObjects(diarySheet)
      .filter(e => e.StudentRegistrationID === regId)
      .sort((a, b) => new Date(a.Date) - new Date(b.Date));

    if (diaryEntries.length === 0) return { status: 'error', message: 'No diary entries found for this student.' };

    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const attendance = getSheetDataAsObjects(attSheet).filter(a => a.StudentRegistrationID === regId);

    // Create a temporary HTML template for the PDF
    let html = `
      <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; line-height: 1.6; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #4361ee; margin-bottom: 20px; padding-bottom: 10px; }
          .company-name { font-size: 24px; font-weight: bold; color: #4361ee; }
          .title { font-size: 18px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
          .student-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; background: #f8f9fa; padding: 15px; border-radius: 8px; }
          .entry { margin-bottom: 30px; border-left: 4px solid #4361ee; padding-left: 15px; page-break-inside: avoid; }
          .entry-header { font-weight: bold; color: #333; border-bottom: 1px solid #eee; margin-bottom: 10px; padding-bottom: 5px; display: flex; justify-content: space-between; }
          .day-no { color: #4361ee; }
          .entry-content { white-space: pre-wrap; margin-top: 10px; font-size: 14px; text-align: justify; }
          .entry-footer { margin-top: 10px; font-size: 12px; color: #777; font-style: italic; }
          .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
          @page { margin: 1cm; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${COMPANY_NAME}</div>
          <div class="title">Internship Daily Progress Diary</div>
        </div>
        
        <div class="student-meta">
          <div><strong>Registration ID:</strong> ${student.RegistrationID}</div>
          <div><strong>Student Name:</strong> ${student.FirstName} ${student.LastName}</div>
          <div><strong>Department:</strong> ${student.Department || 'N/A'}</div>
          <div><strong>Batch:</strong> ${student.Batch || 'N/A'}</div>
          <div><strong>Internship Period:</strong> ${formatDateDisplay(student.InternshipStartDate)} to ${formatDateDisplay(student.InternshipEndDate)}</div>
          <div><strong>Total Entries:</strong> ${diaryEntries.length}</div>
        </div>
    `;

    diaryEntries.forEach((entry, index) => {
      const attDay = attendance.find(a => formatDateISO(a.Date) === formatDateISO(entry.Date));
      const arrival = attDay ? attDay.InTime : 'N/A';
      const departure = attDay ? attDay.OutTime : 'N/A';

      html += `
        <div class="entry">
          <div class="entry-header">
            <span class="day-no">DAY ${index + 1}</span>
            <span>DATE: ${formatDateDisplay(entry.Date)}</span>
          </div>
          <div style="font-size: 13px; color: #555; margin-bottom: 8px;">
            <strong>Arrival:</strong> ${arrival} | <strong>Departure:</strong> ${departure}
          </div>
          <div class="entry-content">
            <strong>Main Points:</strong><br>
            ${entry.Content || 'No content provided.'}
          </div>
          <div class="entry-footer">
            Status: ${entry.Status || 'Entered'} | Verified by Academic Supervisor
          </div>
        </div>
      `;
    });

    html += `
        <div class="footer">
          This is an automatically generated work diary log from the GSV Electrical Enterprises Internship Portal.
        </div>
      </body>
      </html>
    `;

    const blob = HtmlService.createHtmlOutput(html).getAs('application/pdf');
    blob.setName(`Diary_${student.RegistrationID}_${student.FirstName}.pdf`);

    // Save to Drive
    const folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
    const file = folder.createFile(blob);

    const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
    if (docSheet) {
      docSheet.appendRow([
        generateUniqueId('DOC', docSheet, 0),
        regId,
        'Student Diary',
        'REF-' + Date.now(),
        file.getUrl(),
        file.getId(),
        new Date(),
        'No'
      ]);
    }

    // Log Activity
    logActivity('Diary PDF Generated', `Generated diary log PDF for student ${regId}`);

    return {
      status: 'success',
      fileId: file.getId(),
      url: file.getUrl(),
      message: 'Diary PDF generated and saved successfully.'
    };

  } catch (e) {
    Logger.log('Error generating diary PDF: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Gets students in a batch for the diary batch-wise panel
 */
function getBatchStudentsForDiary(batchName, batchStatus) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const allStudents = getSheetDataAsObjects(regSheet);

    let filtered = allStudents.filter(s => s.Batch === batchName);

    if (batchStatus === 'Active') {
      filtered = filtered.filter(s => s.ApplicationStatus === 'Approved' || s.ApplicationStatus === 'Active');
    } else if (batchStatus === 'Completed') {
      filtered = filtered.filter(s => s.ApplicationStatus === 'Completed');
    } else if (batchStatus === 'Deleted') {
      filtered = filtered.filter(s => ['Rejected', 'Closed', 'Opt-out', 'Blacklisted'].includes(s.ApplicationStatus));
    }

    const students = filtered.map(s => ({
      regId: s.RegistrationID,
      name: `${s.FirstName || ''} ${s.LastName || ''}`.trim(),
      college: s.CollegeName || 'N/A',
      department: s.Department || 'N/A',
      internStart: s.InternshipStartDate || '',
      internEnd: s.InternshipEndDate || '',
      registerNumber: s.RegisterNumber || 'N/A',
      status: s.ApplicationStatus
    }));

    return { status: 'success', students: students };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Bulk approve all pending diary entries
 */
function bulkApproveDiaryEntries() {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const statusCol = headers.indexOf("Status");

    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][statusCol] === 'Entered' || data[i][statusCol] === 'Pending') {
        sheet.getRange(i + 1, statusCol + 1).setValue('Approved');
        count++;
      }
    }
    SpreadsheetApp.flush();
    return { status: 'success', message: `Successfully approved ${count} diary entries.` };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * FORMAT 5: Student's Daily Diary / Daily Log PDF Generator (V2)
 * Uses the GSV Header and FORMAT 5 reference template.
 * One day per page. A4 sheet. Supports portrait/landscape.
 * DD/MM/YYYY date format throughout.
 * 
 * Options: { regId, mode: 'day'|'period'|'consolidated', singleDate, fromDate, toDate, orientation: 'portrait'|'landscape' }
 */
function generateStudentDiaryPDF_V2(options) {
  try {
    const regId = options.regId;
    const mode = options.mode || 'consolidated';
    const orientation = options.orientation || 'portrait';

    const student = getStudentDataForDoc(regId);
    if (!student) throw new Error("Student not found: " + regId);

    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const stuData = getSheetDataAsObjects(regSheet).find(s => s.RegistrationID === regId);

    const internStart = new Date(stuData.InternshipStartDate);
    const internEnd = new Date(stuData.InternshipEndDate);
    internStart.setHours(0, 0, 0, 0);
    internEnd.setHours(0, 0, 0, 0);

    // Determine date range based on mode
    let startDate, endDate;
    if (mode === 'day') {
      startDate = new Date(options.singleDate);
      endDate = new Date(options.singleDate);
    } else if (mode === 'period') {
      startDate = new Date(options.fromDate);
      endDate = new Date(options.toDate);
    } else {
      // consolidated uses full internship
      startDate = new Date(internStart);
      endDate = new Date(internEnd);
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Get diary entries and attendance for this student
    const diarySheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const diaryEntries = getSheetDataAsObjects(diarySheet)
      .filter(e => e.StudentRegistrationID === regId)
      .sort((a, b) => new Date(a.Date) - new Date(b.Date));

    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const attendance = getSheetDataAsObjects(attSheet)
      .filter(a => a.StudentRegistrationID === regId);

    // Build diary and attendance maps
    const diaryMap = {};
    diaryEntries.forEach(e => {
      const d = formatDateISO(e.Date);
      if (d) diaryMap[d] = { content: e.Content, status: e.Status || 'Entered' };
    });

    const attMap = {};
    attendance.forEach(a => {
      const d = formatDateISO(a.Date);
      if (d) attMap[d] = {
        status: a.Status || '',
        inTime: a.InTime || '',
        outTime: a.OutTime || '',
        remarks: a.Remarks || ''
      };
    });

    // Batch and project info
    const batchName = stuData.Batch || 'N/A';
    const batchSheet = getSheet(SHEET_NAMES.BATCHES);
    const batchData = getSheetDataAsObjects(batchSheet).find(b => b.BatchName === batchName);
    const projectName = batchData ? (batchData.Project || 'N/A') : 'N/A';
    const mentorName = batchData ? (batchData.Mentor || 'N/A') : 'N/A';

    // Page dimensions
    const pageWidth = orientation === 'landscape' ? '297mm' : '210mm';
    const pageHeight = orientation === 'landscape' ? '210mm' : '297mm';

    // GSV Branding Header HTML (Simplified as requested)
    const gsvHeader = `
      <div style="text-align: center; margin-bottom: 5px; padding-bottom: 0;">
        <div style="font-size: 16px; font-weight: bold; color: #000; margin-bottom: 10px; text-transform: uppercase;">Student Internship</div>
        <div style="font-size: 22px; font-weight: 900; margin: 5px 0; color: #d32f2f; font-family: 'Arial Black', sans-serif;">G.S.V Electrical Enterprises</div>
        <div style="font-size: 13px; font-weight: bold; color: #333 text-transform: uppercase;">Electrical Engineers & Contractors</div>
        <div style="font-size: 9px; color: #555;">New No 51/1 Old No 20/1 Teeds garden 1st Street Sembiyam, perambur, Chennai-11</div>
        <div style="font-size: 9px; color: #555;">Email: g.s.velectricalenterprises2018@gmail.com | Website: www.gsvee.com</div>
        <div style="border-bottom: 2px solid #00838f; margin-top: 5px;"></div>
      </div>
    `;

    // Student details table 
    const checkEmptyDiary = (x) => {
      try {
        if (x === null || x === undefined || String(x).trim() === '') return '<span style="color:#aaa;">Not Available</span>';
        return String(x).trim();
      } catch (e) { return '<span style="color:#d32f2f;">Data Error</span>'; }
    };
    const stuName = student.FirstName ? `${student.FirstName} ${student.MiddleName || ''} ${student.LastName || ''}`.replace(/\s+/g, ' ').trim() : (student.FullName || student.StudentName || student.name || '-');
    const studentDetailsTable = `
      <div style="background-color: #f8f9fa; border: 1px solid #ddd; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-family: 'Arial', sans-serif;">
         <h4 style="margin: 0 0 8px 0; color: #333; font-size:12px; text-transform: uppercase;">Official Candidate Profile</h4>
         <table style="width:100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding:4px; border-bottom: 1px dotted #ccc; width: 33%;"><strong>Student Name:</strong> ${checkEmptyDiary(stuName)}</td>
              <td style="padding:4px; border-bottom: 1px dotted #ccc; width: 33%;"><strong>Reg No:</strong> ${checkEmptyDiary(student.RegisterNumber || student.regNo)}</td>
              <td style="padding:4px; border-bottom: 1px dotted #ccc; width: 33%;"><strong>Sys Reg ID:</strong> ${checkEmptyDiary(student.RegistrationID || student.StudentRegistrationID || student.regId)}</td>
            </tr>
            <tr>
              <td style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>Branch / Dept:</strong> ${checkEmptyDiary(student.Department)}</td>
              <td style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>Year / Sem:</strong> Year ${checkEmptyDiary(student.Year)}, Sem ${checkEmptyDiary(student.Semester)}</td>
              <td style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>Batch & Project:</strong> ${checkEmptyDiary(batchName)} - ${checkEmptyDiary(projectName)}</td>
            </tr>
            <tr>
              <td style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>College:</strong> ${checkEmptyDiary(student.CollegeName || student.college)}</td>
              <td style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>District:</strong> ${checkEmptyDiary(student.CollegeDistrict || student.District)}</td>
              <td style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>Contact No:</strong> ${checkEmptyDiary(student.MobileNumber || student.Mobile)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>Email ID:</strong> ${checkEmptyDiary(student.GmailID || student.Gmail || student.Email || student.EmailAddress)}</td>
              <td style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>Status:</strong> <span style="font-weight: bold; color: ${student.ApplicationStatus === 'Approved' || student.ApplicationStatus === 'Active' ? '#2e7d32' : student.ApplicationStatus === 'Completed' || student.Status === 'Completed' ? '#0277bd' : '#d32f2f'}">${checkEmptyDiary(student.ApplicationStatus || student.Status)}</span></td>
            </tr>
            <tr>
              <td colspan="3" style="padding:4px; border-bottom: 1px dotted #ccc;"><strong>Home Address:</strong> ${checkEmptyDiary(student.Address)}</td>
            </tr>
         </table>
      </div>
    `;

    // Build pages - one day per page
    let pages = [];
    let dayNumber = 1;
    let currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateISO = formatDateISO(currentDate);
      const diary = diaryMap[dateISO];
      const att = attMap[dateISO];
      const attStatus = att ? att.status : '';
      const arrivalTime = att ? att.inTime : '';
      const departureTime = att ? att.outTime : '';
      const remarks = att ? att.remarks : '';

      // Determine if the student was present/wfh or if it's a non-working day
      const isPresent = ['Present', 'Late', 'WFH', 'OD', 'On Duty', 'On-Duty'].some(s => attStatus.toLowerCase().includes(s.toLowerCase()));
      const isAbsent = attStatus.toLowerCase().includes('absent') || attStatus.toLowerCase().includes('missed');
      const isFilled = diary && diary.content && diary.content.trim().length > 0;

      let mainContent = '';
      if (isFilled) {
        // Student filled the diary
        mainContent = `<div style="white-space: pre-wrap; font-size: 12px; line-height: 1.6; min-height: 250px;">${diary.content}</div>`;
      } else if (isAbsent || (!isPresent && attStatus)) {
        // System generated - absent/other status - bold text
        mainContent = `<div style="font-size: 14px; text-align: center; padding: 40px 10px; min-height: 250px; display: flex; align-items: center; justify-content: center;">
          <div>
            <div style="font-size: 32px; margin-bottom: 15px;">📋</div>
            <div style="font-size: 18px; font-weight: 900; color: #d32f2f; text-transform: uppercase; margin-bottom: 10px;">SYSTEM GENERATED: ${attStatus || 'ABSENT'}</div>
            <div style="font-size: 14px; font-weight: bold; color: #333; line-height: 1.4;">
              As the status is <span style="color: #d32f2f;">${attStatus || 'Absent'}</span>, diary content for this day is not required to be filled.
            </div>
          </div>
        </div>`;
      } else if (mode === 'consolidated' && !isFilled && currentDate <= today) {
        // Consolidated mode - not filled - watermark style
        mainContent = `<div style="font-size: 14px; text-align: center; padding: 40px 10px; min-height: 250px; display: flex; align-items: center; justify-content: center; color: #ccc; position: relative;">
          <div style="z-index: 1;">
            <div style="font-size: 60px; opacity: 0.1; margin-bottom: 10px;">📝</div>
            <div style="font-size: 24px; font-weight: bold; opacity: 0.2; margin-bottom: 5px;">${student.RegistrationID}</div>
            <div style="font-size: 16px; opacity: 0.2; margin: 5px 0;">${batchName} | ${projectName}</div>
            
            <div style="margin-top: 30px; border: 3px solid rgba(244, 67, 54, 0.4); padding: 15px; color: rgba(244, 67, 54, 0.6); font-size: 22px; font-weight: 900; text-transform: uppercase; transform: rotate(-5deg);">
              NOT FILLED BY STUDENT
            </div>
            
            <div style="font-size: 14px; opacity: 0.3; margin-top: 20px; font-weight: bold;">
              Attendance Record: ${attStatus || 'No Log Found'}
            </div>
          </div>
        </div>`;
      } else {
        mainContent = `<div style="font-size: 12px; color: #aaa; text-align: center; min-height: 250px; display: flex; align-items: center; justify-content: center;">
          <div>No entry for this date</div>
        </div>`;
      }

      // FORMAT 5: Student's Daily Diary / Daily Log table layout
      const pageHtml = `
      <div style="width: ${pageWidth}; min-height: ${pageHeight}; padding: 15mm; box-sizing: border-box; page-break-after: always; font-family: 'Arial', sans-serif;">
        ${gsvHeader}
        <div style="text-align: center; font-weight: bold; color: #00838f; font-size: 15px; margin: 8px 0 10px 0;">FORMAT 5: STUDENT'S DAILY DIARY / DAILY LOG</div>
        ${studentDetailsTable}
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="border: 1px solid #333; padding: 6px; width: 40%; font-weight: bold; background: #f5f5f5;">DAY-${dayNumber}</td>
            <td style="border: 1px solid #333; padding: 6px; width: 60%;"><strong>DATE:</strong> ${formatDateDisplay(currentDate)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #333; padding: 6px;">Time of arrival: <strong>${arrivalTime || '-'}</strong></td>
            <td style="border: 1px solid #333; padding: 6px;">Time of Departure: <strong>${departureTime || '-'}</strong></td>
            <td style="border: 1px solid #333; padding: 6px; width: 20%;">Remarks: ${remarks || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #333; padding: 6px;">Deptt./Division: <strong>${student.Department || 'N/A'}</strong></td>
            <td style="border: 1px solid #333; padding: 6px;" colspan="2">Name of finished Product: <strong>${projectName}</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #333; padding: 6px;" colspan="3">Name of HOD/Supervisor: <strong>${mentorName}</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #333; padding: 6px;" colspan="3">Attendance Status: <strong style="color: ${isPresent ? '#2e7d32' : '#d32f2f'};">${attStatus || 'No Record'}</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #333; padding: 6px; font-weight: bold; background: #f5f5f5;" colspan="3">Main points of the day</td>
          </tr>
          <tr>
            <td style="border: 1px solid #333; padding: 10px; vertical-align: top;" colspan="3">
              ${mainContent}
            </td>
          </tr>
        </table>
        <div style="margin-top: 30px; font-size: 11px; font-weight: bold;">Signature of Industry Supervisor</div>
        <div style="text-align: center; margin-top: 10px; font-size: 8px; color: #999;">Generated on ${formatDateDisplay(new Date())} | GSV Electrical Enterprises Internship Portal</div>
      </div>
      `;

      pages.push(pageHtml);
      dayNumber++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (pages.length === 0) {
      return { status: 'error', message: 'No pages to generate. Check date range.' };
    }

    // Combine all pages into final HTML document
    const html = `
      <html>
      <head>
        <style>
          @page { 
            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'}; 
            margin: 0; 
          }
          body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
          table { border-collapse: collapse; }
          td, th { border: 1px solid #333; }
        </style>
      </head>
      <body>
        ${pages.join('')}
      </body>
      </html>
    `;

    const blob = HtmlService.createHtmlOutput(html).getAs('application/pdf');
    const modeLabel = mode === 'day' ? 'Day' : mode === 'period' ? 'Period' : 'Full';
    blob.setName(`Diary_${modeLabel}_${student.RegistrationID}_${student.FirstName}.pdf`);

    // Save to Drive
    const folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
    const file = folder.createFile(blob);

    const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
    if (docSheet) {
      docSheet.appendRow([
        generateUniqueId('DOC', docSheet, 0),
        regId,
        'Student Diary V2',
        'REF-' + Date.now(),
        file.getUrl(),
        file.getId(),
        new Date(),
        'No'
      ]);
    }

    logActivity('Diary PDF V2 Generated', `Generated FORMAT 5 diary PDF (${mode}) for ${regId} [${pages.length} pages]`);

    return {
      status: 'success',
      fileId: file.getId(),
      url: file.getUrl(),
      message: `Diary PDF generated successfully! (${pages.length} page${pages.length > 1 ? 's' : ''})`
    };

  } catch (e) {
    Logger.log('Error generating diary PDF V2: ' + e.toString() + ' Stack: ' + (e.stack || ''));
    return { status: 'error', message: 'Error: ' + e.toString() };
  }
}

/**
 * File Management for Student Portal
 */
function getStudentFiles(regId) {
  const startTime = new Date().getTime();
  try {
    const rId = String(regId || "").trim().toUpperCase();
    if (!rId) return { status: 'error', message: 'No registration ID provided' };

    const result = [];
    const mandatoryTypes = ["Bonafide", "Declaration", "College ID", "Other Doc"];

    // Helper to format date safely to ISO string
    const safeFmtDate = (d) => {
      if (!d) return null;
      if (d instanceof Date) {
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
      }
      try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d) : dt.toISOString();
      } catch (e) { return String(d); }
    };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Get from FileManager Sheet (Student Uploads)
    const fileManagerSheet = ss.getSheetByName(SHEET_NAMES.FILE_MANAGER);
    if (fileManagerSheet) {
      const data = fileManagerSheet.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data[0];
        const regIdx = headers.indexOf("StudentRegistrationID");
        const fileIdIdx = headers.indexOf("FileID");
        const fileNameIdx = headers.indexOf("FileName");
        const fileUrlIdx = headers.indexOf("FileUrl");
        const docTypeIdx = headers.indexOf("DocType");
        const uploadDateIdx = headers.indexOf("UploadDate");
        const fileSizeIdx = headers.indexOf("FileSize");

        for (let i = 1; i < data.length; i++) {
          const rowRegId = String(data[i][regIdx] || "").trim().toUpperCase();
          if (rowRegId === rId) {
            const rawType = String(data[i][docTypeIdx] || 'Upload');
            const type = rawType.trim();
            result.push({
              id: data[i][fileIdIdx],
              name: data[i][fileNameIdx],
              url: data[i][fileUrlIdx],
              type: type,
              date: safeFmtDate(data[i][uploadDateIdx]),
              size: data[i][fileSizeIdx]
            });
          }
        }
      }
    }

    // 2. Get from GeneratedDocuments Sheet
    const docSheet = ss.getSheetByName(SHEET_NAMES.GENERATED_DOCUMENTS);
    if (docSheet) {
      const data = docSheet.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data[0];
        const regIdx = headers.indexOf("StudentRegistrationID");
        const pdfIdIdx = headers.indexOf("PdfFileId");
        const docTypeIdx = headers.indexOf("DocType");
        const refNumIdx = headers.indexOf("ReferenceNumber");
        const docUrlIdx = headers.indexOf("DocUrl");
        const genDateIdx = headers.indexOf("GeneratedDate");

        for (let i = 1; i < data.length; i++) {
          const rowRegId = String(data[i][regIdx] || "").trim().toUpperCase();
          if (rowRegId === rId) {
            const pdfId = data[i][pdfIdIdx];
            if (!result.some(f => f.id === pdfId)) {
              result.push({
                id: pdfId,
                name: `${data[i][docTypeIdx]}_${data[i][refNumIdx] || 'Manual'}.pdf`,
                url: data[i][docUrlIdx] || `https://drive.google.com/uc?export=view&id=${pdfId}`,
                date: safeFmtDate(data[i][genDateIdx]),
                size: 0,
                type: data[i][docTypeIdx] || 'Generated',
                isMandatory: true,
                source: 'GeneratedDocs'
              });
            }
          }
        }
      }
    }

    // 3. Fallback: Search Drive
    try {
      const folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
      const safeRegId = rId.replace(/\//g, '_');
      const driveFiles = folder.searchFiles(`title contains '${safeRegId}' and trashed = false`);
      while (driveFiles.hasNext()) {
        const file = driveFiles.next();
        const fId = file.getId();
        if (!result.some(r => r.id === fId)) {
          result.push({
            id: fId,
            name: file.getName(),
            url: file.getUrl(),
            date: safeFmtDate(file.getDateCreated()),
            size: file.getSize(),
            type: 'Direct Drive',
            isMandatory: false,
            source: 'Drive'
          });
        }
      }
    } catch (e) {
      Logger.log("Drive search fallback failed: " + e.message);
    }

    // Sort by date descending
    result.sort((a, b) => {
      const getT = (dateStr) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      return getT(b.date) - getT(a.date);
    });

    // 4. Summarize
    const summary = {
      total: result.length,
      mandatoryUploaded: mandatoryTypes.filter(m =>
        result.some(f => String(f.type || '').toLowerCase().includes(m.toLowerCase()))
      ),
      projectCount: result.filter(f =>
        !mandatoryTypes.some(m => String(f.type || '').toLowerCase().includes(m.toLowerCase()))
      ).length
    };
    summary.allMandatoryDone = mandatoryTypes.every(m =>
      summary.mandatoryUploaded.some(mu => mu.toLowerCase() === m.toLowerCase())
    );

    Logger.log(`getStudentFiles for ${rId} took ${new Date().getTime() - startTime}ms. Found ${result.length} files.`);
    return { status: 'success', files: result, summary: summary };
  } catch (e) {
    Logger.log("Error in getStudentFiles: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function renameStudentFile(regId, fileId, newName) {
  try {
    const file = DriveApp.getFileById(fileId);
    file.setName(newName);

    // Update FileManager sheet
    const sheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    if (sheet) {
      const rowIndex = findRowIndexByValue(sheet, fileId, 'FileID');
      if (rowIndex !== -1) {
        const headers = getHeaders(sheet);
        const nameCol = headers.indexOf('FileName');
        if (nameCol !== -1) {
          sheet.getRange(rowIndex, nameCol + 1).setValue(newName);
        }
      }
    }
    return { status: 'success', message: 'File renamed successfully' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteStudentFile(regId, fileId) {
  try {
    const studentResp = getStudentFullData(regId);
    if (studentResp.status !== 'success') return { status: 'error', message: 'Student verification failed.' };
    const student = studentResp.studentData;
    const studentName = `${student.FirstName} ${student.LastName || ''}`.trim();

    // === DELETION GUARD SYSTEM ===
    let fileName = fileId;
    let isMandatory = false;
    let isAdminGenerated = false;

    const fmSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    if (fmSheet) {
      const fmData = getSheetDataAsObjects(fmSheet);
      const fileRec = fmData.find(f => f.FileID === fileId || f.DriveID === fileId);
      if (fileRec) {
        fileName = fileRec.FileName || fileId;
        const lowerName = fileName.toLowerCase();
        
        // Block Mandatory Documents
        if (lowerName.includes("bonafide") || lowerName.includes("declaration") || lowerName.includes("id card") || lowerName.includes("college id")) {
          isMandatory = true;
        }
        
        // Block Admin-Generated/Uploaded files
        if (fileRec.UploadedBy === 'Admin' || fileRec.Category === 'System Generated' || fileRec.Category === 'Official') {
          isAdminGenerated = true;
        }
      }
    }

    if (isMandatory) {
      return { 
        status: 'error', 
        message: 'This is a mandatory document (Bonafide/Declaration/ID Card). It cannot be deleted by the student. Please contact Admin if a replacement is needed.' 
      };
    }

    if (isAdminGenerated) {
      return { 
        status: 'error', 
        message: 'This document was generated or uploaded by an Admin and cannot be deleted by the student.' 
      };
    }
    // =============================

    // Instead of deleting, we raise a request for standard files
    const requestId = generateUniqueId('DEL', SHEET_NAMES.STUDENT_REQUESTS, 0);

    const res = saveStudentRequest_({
      RequestID: requestId,
      RegistrationID: regId,
      StudentName: studentName,
      RequestType: 'Document Delete',
      Reason: `Request to delete file: ${fileName} (ID: ${fileId})`,
      Status: 'Pending',
      TargetDate: formatDateISO(new Date())
    });

    if (res.status === 'success') {
      createAdminNotification('Document Delete', `New deletion request from ${studentName} for file ${fileName}`);
      return { status: 'success', message: 'Deletion request submitted. Admin will review it shortly.' };
    } else {
      return res;
    }
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function uploadStudentFile(regId, base64Data, fileName) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Wait for lock up to 30s

    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error("No file data received. Please ensure the file size does not exceed 5MB.");
    }

    const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
    const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
    const rId = String(regId || "");
    const finalFileName = `${rId.replace(/\//g, '_')}_${fileName}`;
    const blob = Utilities.newBlob(bytes, contentType, finalFileName);

    // Organize into subfolders
    const lowerName = fileName.toLowerCase();
    let subType = 'General Uploads';
    if (lowerName.includes("bonafide") || lowerName.includes("declaration") || lowerName.includes("collegeid") || lowerName.includes("other") || lowerName.includes("profile")) {
      subType = 'mandatory';
    }

    const studentFolder = getOrCreateStudentFolder(regId, subType);
    const file = studentFolder.createFile(blob);
    const fileUrl = file.getUrl();
    const fileId = file.getId();
    const fileSize = file.getSize();
    const uploadDate = new Date();

    // 1. UPDATE REGISTRATIONS SHEET IF MANDATORY DOC
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    let docType = "General Upload";

    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const regIdCol = headers.indexOf("RegistrationID");

      let targetColName = "";

      // Determine column based on file prefix sent from frontend
      if (lowerName.startsWith("bonafide")) { targetColName = "BonafideUrl"; docType = "Bonafide"; }
      else if (lowerName.startsWith("declaration")) { targetColName = "DeclarationUrl"; docType = "Declaration"; }
      else if (lowerName.startsWith("collegeid")) { targetColName = "CollegeIdUrl"; docType = "College ID"; }
      else if (lowerName.startsWith("profilephoto") || lowerName.startsWith("profile_photo") || lowerName.startsWith("profile")) { targetColName = "ProfilePhotoUrl"; docType = "Profile Photo"; }
      else if (lowerName.startsWith("other")) { targetColName = "OtherUrl"; docType = "Other Doc"; }

      if (targetColName && regIdCol !== -1) {
        const targetColIndex = headers.indexOf(targetColName);
        if (targetColIndex !== -1) {
          for (let i = 1; i < data.length; i++) {
            if (String(data[i][regIdCol]).trim().toUpperCase() === rId.trim().toUpperCase()) {
              sheet.getRange(i + 1, targetColIndex + 1).setValue(fileUrl);
              break;
            }
          }
        }
      }
    }

    // 2. RECORD IN FILE MANAGER SHEET
    const fileManagerSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    if (fileManagerSheet) {
      fileManagerSheet.appendRow([fileId, rId, fileName, fileUrl, docType, uploadDate, fileSize, 'Active']);
    }

    // 3. AUTO-RFID ASSIGNMENT TRIGGER
    try {
      checkAndAutoAssignRfid(rId);
    } catch (e) {
      Logger.log("Auto-assign failure on upload: " + e.toString());
    }

    logActivity('Student File Upload', `Student ${rId} uploaded file: ${fileName} as ${docType}`);
    return { status: 'success', message: 'File uploaded successfully', fileId: fileId, url: fileUrl };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}


/**
 * Triggered on document upload: Automatically assigns RFID if internship is valid and docs are ready
 */
function checkAndAutoAssignRfid(regId) {
  try {
    const student = getStudentProfile(regId);
    if (!student) return;

    const statusVal = String(student.ApplicationStatus || student.Status || '').toLowerCase();
    const isApproved = (statusVal === 'approved' || statusVal === 'active');
    if (!isApproved) return;

    // Rule 1: Internship must not be expired
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ed = student.InternshipEndDate ? new Date(student.InternshipEndDate) : null;
    if (ed) ed.setHours(0, 0, 0, 0);
    if (ed && today >= ed) return;

    // Rule 2: Automation setting must be 'Auto'
    const settings = getAppSettings();
    if (settings['RFID_Automation_Mode'] !== 'Auto') return;

    // Rule 3: Must have mandatory docs (strictly check availability)
    const b = String(student.BonafideUrl || '').trim();
    const d = String(student.DeclarationUrl || '').trim();
    const cid = String(student.CollegeIdUrl || '').trim();
    const isDocReady = (b !== '' && d !== '' && cid !== '');
    if (!isDocReady) return;

    // Rule 4: No tag already assigned
    if (student.RFID_TagID && String(student.RFID_TagID).trim() !== '') return;

    // All checks passed -> Assign available RFID
    assignAvailableRfid(regId);

  } catch (e) {
    Logger.log("Error in checkAndAutoAssignRfid for " + regId + ": " + e.toString());
  }
}

function submitDocumentReplacementRequest(regId, docType, fileName, base64Data) {
  try {
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error("No file data received. Please ensure the file size does not exceed 5MB.");
    }
    const studentName = getStudentName_(regId);
    const requestId = 'REQ-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const dateStr = formatDate(new Date());

    // First upload the new file somewhere, but we shouldn't overwrite the existing one yet!
    // We should upload it to a "Pending Approvals" folder or just upload it and store url in "AttachmentUrl"
    const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
    const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
    const finalFileName = `PENDING_${regId}_${fileName}`;
    const blob = Utilities.newBlob(bytes, contentType, finalFileName);

    const studentFolder = getOrCreateStudentFolder(regId, 'General Uploads');
    const file = studentFolder.createFile(blob);
    const fileUrl = file.getUrl();

    saveStudentRequest_({
      RequestID: requestId,
      RegistrationID: regId,
      StudentName: studentName,
      RequestType: 'Document Replacement',
      Section: 'File Manager',
      TargetDate: dateStr,
      Reason: `Request to replace mandatory document: ${docType}. New FileID: ${file.getId()}`,
      LeaveType: docType,
      AttachmentUrl: fileUrl,
      Status: 'Pending'
    });

    logActivity('Document Replacement', regId, `Requested replacement for ${docType}`);
    createAdminNotification("Document Replacement", `Student ${studentName} (${regId}) requested to replace ${docType}`);
    return { status: 'success', message: 'Replacement request submitted successfully.' };
  } catch (e) {
    Logger.log('Error in submitDocumentReplacementRequest: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function submitDocumentDeletionRequest(regId, docType, fileName, reason) {
  try {
    const studentName = getStudentName_(regId);
    const requestId = 'REQ-DEL-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const dateStr = formatDate(new Date());

    saveStudentRequest_({
      RequestID: requestId,
      RegistrationID: regId,
      StudentName: studentName,
      RequestType: 'Document Deletion',
      Section: 'File Manager',
      TargetDate: dateStr,
      Reason: `Request to delete mandatory document: ${docType}. Reason: ${reason}`,
      LeaveType: docType, // Store docType here for the processor
      Status: 'Pending Admin Approval'
    });

    logActivity('Document Deletion Request', `Student ${regId} requested to delete ${docType}`);
    createAdminNotification("Document Deletion", `Student ${studentName} (${regId}) requested to delete ${docType}`);
    return { status: 'success', message: 'Deletion request submitted successfully.' };
  } catch (e) {
    Logger.log('Error in submitDocumentDeletionRequest: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Daily trigger function to auto-delete student files 30 days after internship end.
 * Excludes generated certificates.
 */
function autoDeleteExpiredStudentFiles() {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const students = getSheetDataAsObjects(regSheet);
    const today = new Date();

    students.forEach(s => {
      if (!s.InternshipEndDate) return;
      const endDate = new Date(s.InternshipEndDate);
      const expiryDate = new Date(endDate);
      expiryDate.setDate(expiryDate.getDate() + 30);

      if (today > expiryDate) {
        Logger.log(`Cleaning up files for ${s.RegistrationID} (Expired: ${formatDate(expiryDate)})`);
        const folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
        const files = folder.getFiles();
        const safePrefix = s.RegistrationID.replace(/\//g, '_');

        while (files.hasNext()) {
          const file = files.next();
          // DO NOT delete if it matches certificate naming pattern
          if (file.getName().includes(safePrefix) && !file.getName().includes('Certificate')) {
            file.setTrashed(true);
            Logger.log(`Deleted: ${file.getName()}`);
          }
        }
      }
    });
  } catch (e) {
    Logger.log('Error in autoDeleteExpiredStudentFiles: ' + e.toString());
  }
}


/**
 * Gets timeline data for a specific student
 */
function getStudentTimelineData(regId) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const student = getSheetDataAsObjects(regSheet).find(s => s.RegistrationID === regId);

    if (!student) return { status: 'error', message: 'Student not found' };

    const resolveDate = (val) => {
      if (!val) return null;
      if (val instanceof Date) return new Date(val.setHours(0, 0, 0, 0));
      let s = String(val).trim();
      if (!s) return null;
      let d = new Date(s);
      if (isNaN(d.getTime())) {
        let p = s.split(/[\/\-\.]/);
        if (p.length === 3) {
          d = new Date(p[2], p[1] - 1, p[0]); // DD-MM-YYYY
          if (isNaN(d.getTime())) d = new Date(p[0], p[1] - 1, p[2]); // YYYY-MM-DD
        }
      }
      return d;
    };

    const startDate = resolveDate(student.InternshipStartDate);
    const endDate = resolveDate(student.InternshipEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!startDate || isNaN(startDate.getTime()) || !endDate || isNaN(endDate.getTime())) {
      return {
        status: 'success',
        message: 'No internship dates set for this student.',
        summary: { startDate: null, endDate: null, totalDays: 0 },
        timeline: [],
        data: []
      };
    }

    // Normalize all dates to midnight to avoid time-component comparison issues
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diarySheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const diaryEntries = getSheetDataAsObjects(diarySheet).filter(e => e.StudentRegistrationID === regId);

    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const attRecords = getSheetDataAsObjects(attSheet).filter(a => a.StudentRegistrationID === regId);

    const timeline = [];
    const diaryMap = new Map();
    diaryEntries.forEach(e => {
      const d = formatDateISO(e.Date);
      if (d) diaryMap.set(d, e);
    });

    const attMap = new Map();
    attRecords.forEach(a => {
      const d = formatDateISO(a.Date);
      if (d) attMap.set(d, a);
    });

    let currentDate = new Date(startDate);
    let enteredCount = 0;
    let missingCount = 0;
    let odCount = 0;
    let wfhCount = 0;

    let loopSafety = 0;
    const maxDays = 1000;

    while (currentDate <= endDate && loopSafety < maxDays) {
      loopSafety++;

      const dateStr = formatDateISO(currentDate);
      const isSunday = currentDate.getDay() === 0;
      const isFuture = currentDate > today;
      const entry = diaryMap.get(dateStr);
      const attendance = attMap.get(dateStr);
      const attStatus = attendance ? (attendance.Status || '') : '';

      let finalStatus = 'No Record';
      if (isFuture) {
        finalStatus = 'Upcoming';
      } else if (entry) {
        finalStatus = entry.Status || 'Entered';
      } else if (isSunday) {
        finalStatus = 'Sunday';
      } else if (attStatus.includes('OD') || attStatus.includes('On Duty')) {
        finalStatus = 'On-Duty';
        odCount++;
      } else if (attStatus.includes('WFH')) {
        finalStatus = 'WFH';
        wfhCount++;
      } else if (attStatus.includes('Absent')) {
        finalStatus = 'Absent';
      } else if (attStatus.includes('Missed')) {
        finalStatus = 'Missed';
      } else if (attendance) {
        finalStatus = 'Not Entered';
      }

      timeline.push({
        date: dateStr,
        status: finalStatus,
        attendance: attStatus || (isSunday ? 'Holiday' : (isFuture ? 'Upcoming' : 'No Record')),
        isToday: currentDate.getTime() === today.getTime(),
        isSunday: isSunday
      });

      if (entry) enteredCount++;
      else if (!isSunday && !isFuture && finalStatus !== 'Absent') missingCount++;

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      status: 'success',
      timeline: timeline,
      summary: {
        totalDays: timeline.length,
        entered: enteredCount,
        missing: missingCount,
        od: odCount,
        wfh: wfhCount,
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(endDate),
        remaining: today > endDate ? 0 : Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1
      }
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Approves a diary entry
 */
function approveDiaryEntry(regId, date) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_DIARY);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdCol = headers.indexOf("StudentRegistrationID");
    const dateCol = headers.indexOf("Date");
    const statusCol = headers.indexOf("Status");

    const targetDateStr = formatDateISO(date);

    for (let i = 1; i < data.length; i++) {
      const entryDateStr = formatDateISO(data[i][dateCol]);
      if (data[i][regIdCol] === regId && entryDateStr === targetDateStr) {
        sheet.getRange(i + 1, statusCol + 1).setValue('Approved');
        return { status: 'success', message: 'Diary entry approved' };
      }
    }
    return { status: 'error', message: 'Entry not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Bulk updates App Settings (for templates)
 */
function updateAppSettings(settings) {
  try {
    const sheet = getSheet(SHEET_NAMES.APP_SETTINGS);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    for (const [key, value] of Object.entries(settings)) {
      const rowIndex = findRowIndexByValue(sheet, key, 'SettingKey');
      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 2).setValue(value);
      } else {
        sheet.appendRow([key, value]);
      }

      // 🔄 SYNC: If updating RFID Automation, also update Switch_Status
      if (key === 'RFID_Automation_Mode') {
        const switchSheet = getSheet(SHEET_NAMES.SWITCH_STATUS);
        if (switchSheet) {
          const swRow = findRowIndexByValue(switchSheet, 'rfidAutomationToggle', 'SwitchKey');
          if (swRow !== -1) {
            switchSheet.getRange(swRow, 2).setValue(value === 'Auto' ? 'ON' : 'OFF');
            switchSheet.getRange(swRow, 3).setValue(new Date());
          }
        }
      }
    }

    lock.releaseLock();
    return { status: 'success', message: 'Settings updated successfully' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function saveAdminComment(regId, date, comment) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdCol = headers.indexOf("StudentRegistrationID");
    const dateCol = headers.indexOf("Date");
    const commentCol = headers.indexOf("AdminComment");
    const isReadCol = headers.indexOf("IsCommentRead");

    if (regIdCol === -1 || dateCol === -1 || commentCol === -1) {
      // If columns are missing, we might need to initialize them or just return error
      return { status: 'error', message: 'Attendance table schema mismatch.' };
    }

    const targetDate = formatDateISO(date);
    let rowFound = false;

    for (let i = 1; i < data.length; i++) {
      const rowDate = formatDateISO(data[i][dateCol]);
      if (data[i][regIdCol] === regId && rowDate === targetDate) {
        sheet.getRange(i + 1, commentCol + 1).setValue(comment);
        if (isReadCol !== -1) sheet.getRange(i + 1, isReadCol + 1).setValue(false);
        rowFound = true;
        break;
      }
    }

    if (!rowFound) {
      // Create a dummy record just for the comment if no attendance exists? 
      // User says "misssed its attendent show as pending / absent", so we can add a record with status 'Absent'
      const lastId = data.length > 1 ? parseInt(data[data.length - 1][0]) || 0 : 0;
      const newRow = new Array(headers.length).fill('');
      newRow[0] = lastId + 1; // AttendanceID
      newRow[regIdCol] = regId;
      newRow[dateCol] = new Date(date);
      newRow[headers.indexOf("Status")] = 'Absent';
      newRow[commentCol] = comment;
      if (isReadCol !== -1) newRow[isReadCol] = false;
      newRow[headers.indexOf("Timestamp")] = new Date();
      sheet.appendRow(newRow);
    }

    return { status: 'success', message: 'Comment saved successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function markAdminCommentAsRead(regId, date) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdCol = headers.indexOf("StudentRegistrationID");
    const dateCol = headers.indexOf("Date");
    const isReadCol = headers.indexOf("IsCommentRead");

    if (regIdCol === -1 || dateCol === -1 || isReadCol === -1) return { status: 'error', message: 'Missing columns.' };

    const targetDate = formatDateISO(date);

    for (let i = 1; i < data.length; i++) {
      const rowDate = formatDateISO(data[i][dateCol]);
      if (data[i][regIdCol] === regId && rowDate === targetDate) {
        sheet.getRange(i + 1, isReadCol + 1).setValue(true);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Record not found.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Standardizes all date columns across the project sheets to YYYY-MM-DD format.
 * Only changes dates that are not already in that specific string format.
 */
function standardizeSheetDates() {
  try {
    const sheetsToProcess = [
      { name: SHEET_NAMES.REGISTRATIONS, dateCols: ["DateofBirth", "InternshipStartDate", "InternshipEndDate", "CertificateIssuedDate"] },
      { name: SHEET_NAMES.TASKS, dateCols: ["DueDate", "AssignedDate", "CompletedDate"] },
      { name: SHEET_NAMES.PROJECTS, dateCols: ["StartDate", "EndDate", "AssignedDate", "CompletedDate"] },
      { name: SHEET_NAMES.ATTENDANCE, dateCols: ["Date", "Timestamp"] }
    ];

    let totalUpdated = 0;
    let details = [];

    sheetsToProcess.forEach(target => {
      const sheet = getSheet(target.name);
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return;

      const headers = data[0];
      const colIndices = target.dateCols.map(name => headers.indexOf(name)).filter(idx => idx > -1);

      if (colIndices.length === 0) return;

      let sheetUpdatedCount = 0;
      for (let i = 1; i < data.length; i++) {
        colIndices.forEach(colIdx => {
          let cellValue = data[i][colIdx];
          if (!cellValue) return;

          // Check if it's already a string in YYYY-MM-DD format
          const dateStrPattern = /^\d{4}-\d{2}-\d{2}$/;
          if (typeof cellValue === 'string' && dateStrPattern.test(cellValue)) {
            return; // Skip if already correct
          }

          // Try to convert to Date and then to YYYY-MM-DD
          const formatted = formatDate(cellValue);
          if (formatted && formatted !== 'N/A' && formatted !== cellValue) {
            sheet.getRange(i + 1, colIdx + 1).setValue(formatted);
            sheetUpdatedCount++;
          }
        });
      }
      if (sheetUpdatedCount > 0) {
        details.push(`${target.name}: ${sheetUpdatedCount} dates standardized`);
        totalUpdated += sheetUpdatedCount;
      }
    });

    return {
      status: 'success',
      message: totalUpdated > 0 ? `Standardized ${totalUpdated} dates across sheets.` : "All dates are already standardized.",
      details: details.join(', ')
    };
  } catch (e) {
    Logger.log("Error in standardizeSheetDates: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Parses time string like "09:30 AM" into minutes from midnight.
 */
function parseTime_(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  let minutes = parseInt(match[2]);
  let ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Generates a base64 PDF of a single day attendance slip.
 */
function generateDaySlipPDF(regId, dateISO) {
  try {
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const records = getSheetDataAsObjects(attSheet);
    const record = records.find(r => String(r.StudentRegistrationID) === String(regId) && formatDateISO(r.Date) === dateISO);

    const detailsResp = getStudentFullData(regId);
    const student = detailsResp.studentData;

    if (!student) return { status: 'error', message: 'Student details not found' };

    const branding = getReportBrandingHeader("Daily Attendance Slip");
    const html = `
       <html>
       <head>
         <style>
           body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
           .slip-card { border: 2px solid #4361ee; padding: 30px; border-radius: 15px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
           .title { text-align: center; font-size: 24px; font-weight: bold; color: #4361ee; margin-bottom: 25px; border-bottom: 2px solid #4361ee; padding-bottom: 10px; }
           .row { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
           .label { font-weight: bold; color: #4b5563; }
           .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; }
         </style>
       </head>
       <body>
         ${branding}
         <div class="slip-card">
           <div class="title">ATTENDANCE DAY SLIP</div>
           <div class="row"><span class="label">Student Name:</span> <span>${student.FirstName} ${student.LastName}</span></div>
           <div class="row"><span class="label">Registration ID:</span> <span>${regId}</span></div>
           <div class="row"><span class="label">Date:</span> <span>${formatDate(record ? record.Date : dateISO)}</span></div>
           <div class="row"><span class="label">Arrival Time:</span> <span>${(record && record.InTime) || 'N/A'}</span></div>
           <div class="row"><span class="label">Departure Time:</span> <span>${(record && record.OutTime) || 'N/A'}</span></div>
           <div class="row"><span class="label">Entry Mode:</span> <span>${(record && record.EntryMode) || 'N/A'}</span></div>
           <div class="row"><span class="label">Status:</span> <span>${(record && record.Status) || 'Absent'}</span></div>
         </div>
         <div class="footer">This is a system-generated document. | GSV Electrical Enterprises</div>
       </body>
       </html>
     `;

    const blob = Utilities.newBlob(html, "text/html", `Slip_${regId}_${dateISO}.html`);
    const pdf = blob.getAs("application/pdf");
    return {
      status: 'success',
      pdfBase64: Utilities.base64Encode(pdf.getBytes()),
      fileName: `AttendanceSlip_${dateISO}.pdf`
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Submits a grace period extension request.
 */
function requestGracePeriod(regId, reason, start, end, areas) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().trim());
    const id = "GP-" + new Date().getTime();

    const rowData = headers.map(h => {
      switch (h) {
        case 'ID': return id;
        case 'RegistrationID': return regId;
        case 'OTP': return '';
        case 'ActionType': return 'GracePeriod';
        case 'ExpiryTimestamp': return new Date(end);
        case 'TargetDate': return new Date(start);
        case 'Reason': return reason;
        case 'Status': return 'Pending';
        case 'LeaveType': return areas;
        case 'AttachmentUrl': return '';
        default: return '';
      }
    });

    sheet.appendRow(rowData);
    SpreadsheetApp.flush();

    // Also save to unified StudentRequests sheet
    const studentName = getStudentName_(regId);
    saveStudentRequest_({
      RequestID: id,
      RegistrationID: regId,
      StudentName: studentName,
      RequestType: 'GracePeriod',
      TargetDate: new Date(start),
      EndDate: new Date(end),
      Reason: reason,
      LeaveType: typeof areas === 'string' ? areas : (Array.isArray(areas) ? areas.join(', ') : '')
    });

    return { status: 'success', message: 'Grace period extension request submitted to Admin.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Handles approval/rejection of Grace Period requests.
 */
function processGracePeriodApproval(requestId, action, optData = {}) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf("ID");
    const statusCol = headers.indexOf("Status");
    const regCol = headers.indexOf("RegistrationID");
    const startCol = headers.indexOf("TargetDate");
    const endCol = headers.indexOf("ExpiryTimestamp");
    const areaCol = headers.indexOf("LeaveType");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === requestId) {
        const row = i + 1;
        if (action === 'Approve') {
          sheet.getRange(row, statusCol + 1).setValue('Approved');
          if (optData.startDate) sheet.getRange(row, startCol + 1).setValue(new Date(optData.startDate));
          if (optData.endDate) sheet.getRange(row, endCol + 1).setValue(new Date(optData.endDate));
          if (optData.areas) sheet.getRange(row, areaCol + 1).setValue(optData.areas.join(','));

          createStudentNotification(data[i][regCol], "Grace Period Approved", `Extension granted for: ${optData.areas ? optData.areas.join(', ') : data[i][areaCol]}`);
          updateStudentRequestStatus_(requestId, 'Approved', 'Approved by Admin');
        } else {
          sheet.getRange(row, statusCol + 1).setValue('Rejected');
          updateStudentRequestStatus_(requestId, 'Rejected', 'Rejected by Admin');
        }
        return { status: 'success', message: `Grace period request ${action}d.` };
      }
    }
    return { status: 'error', message: 'Request not found.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}
// --- RFID AUTOMATION HELPERS ---

/**
 * Comprehensive RFID state fetcher with auto-cleanup of expired tags
 */
function getRfidManagementState() {
  try {
    const students = getAllStudents();
    const inventory = getRfidInventory();
    const todayStr = getTodayStr();

    // 1. AUTO-RELEASE EXPIRED TAGS
    syncExpiredRfidTags(students, todayStr);

    // Map inventory tag to student regID for cross-ref to handle sync issues
    const invSyncMap = {};
    inventory.forEach(inv => {
      if (inv.status === 'Assigned' && inv.assignedToId) {
        invSyncMap[String(inv.assignedToId).trim().toUpperCase()] = inv.tagId;
      }
    });

    // 2. PROCESS CATEGORIES
    const processed = students.map(s => {
      const batchId = String(s.batch || '').trim();
      const slot = getSlotTiming(batchId, todayStr, s.registrationId);

      const itemToday = todayStr;
      const itemEnd = s.internshipEnd; // YYYY-MM-DD
      const itemStart = s.internshipStart; // YYYY-MM-DD

      const isExpired = (itemEnd && itemToday >= itemEnd);
      const isUpcoming = (itemStart && itemToday < itemStart);
      const isLive = (!isExpired && !isUpcoming);

      // Sync check: Use inventory as secondary source if registration sheet is missing the tag
      const invTag = invSyncMap[String(s.registrationId).trim().toUpperCase()];
      const finalTag = (s.rfidTag || invTag || '').trim();
      const hasTag = !!finalTag;

      const statusLower = String(s.status || s.actualStatus || '').toLowerCase();
      const isValidStatus = (statusLower === 'approved' || statusLower === 'active');

      return {
        ...s,
        rfidTag: finalTag,
        effectiveSlot: slot,
        slotDisplay: `${slot.start} - ${slot.end}`,
        slotType: slot.type || 'SYSTEM',
        isExpired,
        isUpcoming,
        isLive,
        hasTag,
        isValidStatus,
        periodStatus: isExpired ? 'Expired' : (isUpcoming ? 'Upcoming' : 'Active')
      };
    });

    return {
      inventory: inventory.map(i => {
        const lu = i.lastUpdated ? (i.lastUpdated instanceof Date ? i.lastUpdated : new Date(i.lastUpdated)) : null;
        const ad = i.addedDate ? (i.addedDate instanceof Date ? i.addedDate : new Date(i.addedDate)) : null;
        return {
          ...i,
          lastUpdatedDisplay: i.lastUpdated ? formatDateTimeIndia(i.lastUpdated) : 'N/A',
          addedDateDisplay: i.addedDate ? formatDateTimeIndia(i.addedDate) : 'N/A'
        };
      }).sort((a, b) => {
        const dA = a.lastUpdated ? new Date(a.lastUpdated) : (a.addedDate ? new Date(a.addedDate) : new Date(0));
        const dB = b.lastUpdated ? new Date(b.lastUpdated) : (b.addedDate ? new Date(b.addedDate) : new Date(0));
        return dB - dA;
      }),
      // Approved + Not Expired + No Tag - Sorted by Name
      pendingAssignment: processed.filter(s => s.isValidStatus && !s.isExpired && !s.hasTag).sort((a, b) => a.name.localeCompare(b.name)),
      // Has Tag + Not Expired - Newest end date first (ones ending soonest at top? User asked for descending current date, usually means newest first)
      inUse: processed.filter(s => s.hasTag && !s.isExpired).sort((a, b) => {
        if (!a.internshipEnd) return 1;
        if (!b.internshipEnd) return -1;
        return b.internshipEnd.localeCompare(a.internshipEnd);
      }),
      // Expired - Sorted by end date descending (most recent first)
      completed: processed.filter(s => s.isExpired).sort((a, b) => {
        if (!a.internshipEnd) return 1;
        if (!b.internshipEnd) return -1;
        return b.internshipEnd.localeCompare(a.internshipEnd);
      })
    };
  } catch (e) {
    Logger.log("Error in getRfidManagementState: " + e.toString());
    return { error: e.toString() };
  }
}

/**
 * Safety mechanism: If end date passed, reclaim the RFID automatically
 */
function syncExpiredRfidTags(students, todayStr) {
  const expiredWithTags = students.filter(s => {
    // Note: students array here is the raw result from getAllStudents, 
    // but the map already formatted internshipEnd as YYYY-MM-DD
    const itemEnd = s.internshipEnd;
    return (itemEnd && todayStr >= itemEnd) && (s.rfidTag && s.rfidTag !== '');
  });

  expiredWithTags.forEach(s => {
    // Actually we just call returnRfidToPool
    returnRfidToPool(s.registrationId);
  });
}

function revokeRfidAssignment(regId) {
  try {
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const data = getSheetDataAsObjects(sheet);
    const idx = data.findIndex(s => String(s.RegistrationID).trim() === String(regId).trim());
    if (idx === -1) return { status: 'error', message: 'Student record not found.' };

    const tag = String(data[idx].RFID_TagID || '').trim();
    if (!tag) return { status: 'error', message: 'No RFID assigned to revoke.' };

    // Update Student
    updateObjectInSheet(sheet, 'RegistrationID', regId, {
      'RFID_TagID': '',
      'ApplicationStatus': 'Approved',
      'Status': 'Approved'
    });

    // Update Inventory
    const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
    const invData = getSheetDataAsObjects(invSheet);
    const invIdx = invData.findIndex(i => String(i.RFID_TagID).trim().toUpperCase() === tag.toUpperCase());
    if (invIdx !== -1) {
      updateObjectInSheet(invSheet, 'RFID_TagID', tag, {
        'Status': 'Available',
        'AssignedTo': '',
        'LastUpdated': new Date()
      });
    }

    logActivity('RFID Revoked', 'Admin', `Assignment revoked for ${regId} (Tag: ${tag}). Status reverted to Approved.`);
    return { status: 'success', message: 'RFID Assignment has been revoked and student status reverted to Approved.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function handleRfidAutomationOnStatusChange(regId, newStatus) {
  const settings = getAppSettings().settings;
  const isAuto = settings['RFID_Automation_Mode'] === 'Auto';
  if (!isAuto) return;

  if (newStatus === 'Approved') {
    // Check if documents are uploaded
    const student = getStudentFullData(regId).studentData;
    const docs = [student.BonafideUrl, student.DeclarationUrl, student.CollegeIdUrl];
    const isComplete = docs.every(d => d && d.trim() !== '');

    if (isComplete && !student.RFID_TagID) {
      assignAvailableRfid(regId);
    }
  } else if (newStatus === 'Completed' || newStatus === 'Rejected' || newStatus === 'Closed') {
    // Return RFID to pool
    returnRfidToPool(regId);
  }
}

function assignAvailableRfid(regId) {
  const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
  const data = getSheetDataAsObjects(invSheet);
  const available = data.find(r => r.Status === 'Available');

  if (available) {
    const tagId = available.RFID_TagID;
    // Update Inventory
    const rowIndex = findRowIndexByValue(invSheet, tagId, 'RFID_TagID');
    if (rowIndex > -1) {
      const headers = invSheet.getDataRange().getValues()[0];
      invSheet.getRange(rowIndex, headers.indexOf('Status') + 1).setValue('Assigned');
      invSheet.getRange(rowIndex, headers.indexOf('AssignedTo') + 1).setValue(regId);
      invSheet.getRange(rowIndex, headers.indexOf('LastUpdated') + 1).setValue(new Date());
    }

    // Update Student Profile
    updateStudentProfile({ registrationId: regId, RFID_TagID: tagId });
    logActivity('RFID Auto-Assign', 'System', `Tag ${tagId} assigned to ${regId}`);

    // Send notification email
    try {
      const student = getStudentFullData(regId).studentData;
      const email = student.GmailID;
      const name = student.FirstName + " " + (student.LastName || "");
      const subject = `[Action Required] Your RFID Access Card Assigned - ${COMPANY_NAME}`;
      const body = `Dear ${name},\n\n` +
        `We are pleased to inform you that an RFID access card has been assigned to you for your internship.\n\n` +
        `RFID Tag ID: ${tagId}\n\n` +
        `IMPORTANT INSTRUCTIONS:\n` +
        `1. Collection: Please collect your physical RFID card from the administration office starting from your internship start date (${formatDateSafe(student.InternshipStartDate)}).\n` +
        `2. Documentation: You MUST submit a hard copy of all mandatory documents (Bonafide, Declaration, etc.) at the time of collection.\n` +
        `3. Activation: Your RFID card will be automatically activated on your internship start date.\n\n` +
        `Please use this card to mark your attendance daily through the hardware readers.\n\n` +
        `Best regards,\nAdmin Team\n${COMPANY_NAME}`;

      GmailApp.sendEmail(email, subject, body);
    } catch (e) {
      Logger.log("Error sending RFID assignment email: " + e.toString());
    }
  }
}

function returnRfidToPool(regId) {
  const student = getStudentFullData(regId).studentData;
  const tagId = student ? student.RFID_TagID : null;
  if (!tagId) return;

  const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
  const rowIndex = findRowIndexByValue(invSheet, tagId, 'RFID_TagID');

  if (rowIndex > -1) {
    const headers = invSheet.getDataRange().getValues()[0];
    invSheet.getRange(rowIndex, headers.indexOf('Status') + 1).setValue('Available');
    invSheet.getRange(rowIndex, headers.indexOf('AssignedTo') + 1).setValue('');
    invSheet.getRange(rowIndex, headers.indexOf('LastUpdated') + 1).setValue(new Date());

    // Clear from student profile
    updateStudentProfile({ registrationId: regId, RFID_TagID: '' });
    logActivity('RFID Auto-Pool', 'System', `Tag ${tagId} returned to pool from ${regId}`);
  }
}

/**
 * Broadcasts a command to all registered RFID devices via the PendingCommand column.
 */
function setBroadcastRfidCommand(command) {
  return setRfidDeviceCommand('ALL', command);
}

/**
 * Sets a pending command for a specific RFID device or ALL devices.
 */
function setRfidDeviceCommand(mac, command) {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    if (!sheet) return { status: 'error', message: 'RFID_Devices sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    let cmdIdx = headers.indexOf('PendingCommand');

    if (cmdIdx === -1) {
      sheet.getRange(1, headers.length + 1).setValue('PendingCommand');
      cmdIdx = headers.length;
    }

    if (mac === 'ALL') {
      const statusIdx = headers.indexOf('Status');
      for (let i = 1; i < data.length; i++) {
        if (data[i][statusIdx] !== 'DISABLED') {
          sheet.getRange(i + 1, cmdIdx + 1).setValue(command);
        }
      }
    } else {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][macIdx]).trim().toUpperCase() === mac.trim().toUpperCase()) {
          sheet.getRange(i + 1, cmdIdx + 1).setValue(command);
          break;
        }
      }
    }
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Command set successfully' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getRfidInventory() {
  try {
    const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
    const invData = getSheetDataAsObjects(invSheet);

    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const stuData = getSheetDataAsObjects(regSheet);

    // Map students for quick lookup by Tag AND by RegID
    const studentMap = {};
    const studentByRegIdMap = {};
    stuData.forEach(s => {
      const tag = String(s.RFID_TagID || "").trim().toUpperCase();
      if (tag) studentMap[tag] = s;
      const rid = String(s.RegistrationID || "").trim().toUpperCase();
      if (rid) studentByRegIdMap[rid] = s;
    });

    const items = invData.map(item => {
      const rawTag = String(item.RFID_TagID || "").trim();
      const tagId = standardizeRfidFormat(rawTag);
      const tagUpper = tagId.toUpperCase();
      // Lookup by tag first, then by assigned ID if available
      const student = studentMap[tagUpper] || (item.AssignedTo ? studentByRegIdMap[String(item.AssignedTo).trim().toUpperCase()] : null);

      return {
        tagId: tagId,
        status: item.Status || 'Available',
        assignedToId: item.AssignedTo || (student ? student.RegistrationID : ''),
        assignedToName: student ? `${student.FirstName} ${student.LastName}` : (item.AssignedTo ? 'Unknown Holder' : 'Available'),
        assignedBatch: student ? (student.Batch || '') : '',
        assignedCollege: student ? (student.CollegeName || '') : '',
        assignedRegNo: student ? (student.RegisterNumber || '') : '',
        assignedDept: student ? (student.Department || '') : '',
        lastUpdated: item.LastUpdated || item.AddedDate || '',
        addedBy: item.AddedBy || 'Reader',
        addedDate: item.AddedDate || ''
      };
    });

    // Deduplicate inventory by tag UID - prefers Assigned > Blocked > Available
    const deduped = {};
    items.forEach(item => {
      const existing = deduped[item.tagId];
      if (!existing) {
        deduped[item.tagId] = item;
      } else {
        // Priority logic: Assigned is most important to show
        const statusPri = { 'Assigned': 3, 'Blocked': 2, 'Available': 1 };
        const curPri = statusPri[item.status] || 0;
        const oldPri = statusPri[existing.status] || 0;
        if (curPri > oldPri) {
          deduped[item.tagId] = item;
        } else if (curPri === oldPri) {
          // Keep the newest one if same status
          const curDate = item.lastUpdated ? new Date(item.lastUpdated) : new Date(0);
          const oldDate = existing.lastUpdated ? new Date(existing.lastUpdated) : new Date(0);
          if (curDate > oldDate) deduped[item.tagId] = item;
        }
      }
    });

    return Object.values(deduped).sort((a, b) => {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated) : (a.addedDate ? new Date(a.addedDate) : new Date(0));
      const dateB = b.lastUpdated ? new Date(b.lastUpdated) : (b.addedDate ? new Date(b.addedDate) : new Date(0));
      return dateB - dateA;
    });
  } catch (e) {
    Logger.log("Error in getRfidInventory: " + e.toString());
    return [];
  }
}

function updateRfidTagStatus(tagId, newStatus) {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
    const rowIndex = findRowIndexByValue(sheet, tagId, 'RFID_TagID', true);
    if (rowIndex === -1) return { status: 'error', message: 'Tag [' + tagId + '] not found in inventory' };

    const headers = sheet.getDataRange().getValues()[0];
    const statusCol = headers.indexOf("Status") + 1;
    const assignedCol = headers.indexOf("AssignedTo") + 1;

    sheet.getRange(rowIndex, statusCol).setValue(newStatus);

    // If blocking or making available, clear assignment from both places if appropriate
    if (newStatus === 'Available' || newStatus === 'Blocked') {
      const currentRegId = sheet.getRange(rowIndex, assignedCol).getValue();
      if (currentRegId) {
        // Clear from student profile
        updateStudentProfile({ registrationId: currentRegId, RFID_TagID: '' });
        sheet.getRange(rowIndex, assignedCol).setValue('');
      }
    }

    sheet.getRange(rowIndex, headers.indexOf("LastUpdated") + 1).setValue(new Date());
    return { status: 'success', message: 'Tag status updated to ' + newStatus };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function deleteRfidTag(tagId) {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
    const rowIndex = findRowIndexByValue(sheet, tagId, 'RFID_TagID', true);
    if (rowIndex === -1) return { status: 'error', message: 'Tag [' + tagId + '] not found' };

    const headers = sheet.getDataRange().getValues()[0];
    const assignedCol = headers.indexOf("AssignedTo");
    const regId = sheet.getRange(rowIndex, assignedCol + 1).getValue();

    if (regId) {
      updateStudentProfile({ registrationId: regId, RFID_TagID: '' });
    }

    sheet.deleteRow(rowIndex);
    return { status: 'success', message: 'Tag permanently removed from inventory.' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function renameRfidTag(oldId, newId) {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
    const rowIndex = findRowIndexByValue(sheet, oldId, 'RFID_TagID');
    if (rowIndex === -1) return { status: 'error', message: 'Original tag not found' };

    const headers = sheet.getDataRange().getValues()[0];
    const idCol = headers.indexOf("RFID_TagID") + 1;
    const assignedCol = headers.indexOf("AssignedTo") + 1;

    const regId = sheet.getRange(rowIndex, assignedCol).getValue();

    // Update Inventory
    sheet.getRange(rowIndex, idCol).setValue(newId);

    // Update Student if assigned
    if (regId) {
      updateStudentProfile({ registrationId: regId, RFID_TagID: newId });
    }

    return { status: 'success', message: `Tag successfully renamed from ${oldId} to ${newId}.` };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function addRfidTagsToInventory(tagsArray, method = "Manual") {
  try {
    const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
    const existing = getSheetDataAsObjects(invSheet).map(r => String(r.RFID_TagID).trim().toUpperCase());

    let addedCount = 0;
    let duplicates = [];
    const now = new Date();

    tagsArray.forEach(tag => {
      const rawTag = String(tag).trim();
      const cleanTag = standardizeRfidFormat(rawTag);
      if (!cleanTag) return;

      const tagUpper = cleanTag.toUpperCase();
      if (existing.includes(tagUpper)) {
        duplicates.push(cleanTag);
      } else {
        // ["RFID_TagID", "Status", "AssignedTo", "LastUpdated", "AddedBy", "AddedDate"]
        invSheet.appendRow([cleanTag, 'Available', '', now, method, now]);
        existing.push(tagUpper); // Prevent adding same tag twice in the same batch
        addedCount++;
      }
    });

    if (duplicates.length > 0) {
      return {
        status: 'warning',
        message: `${addedCount} new tags added. ${duplicates.length} tags were SKIPPED as they already exist: ${duplicates.join(', ')}`,
        duplicates: duplicates
      };
    }

    return { status: 'success', message: `${addedCount} new tags added to inventory.` };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// --- END OF DAY ATTENDANCE PROCESSOR ---

function processEndOfDayAttendance() {
  const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
  const todayStr = formatDate(new Date());
  const data = getSheetDataAsObjects(attSheet);

  // Filter for today's records that are approved leaves/wfh/od
  const recordsToUpdate = data.filter(r =>
    formatDate(new Date(r.Date)) === todayStr &&
    ['WFH', 'Medical', 'OD'].includes(r.LeaveType) &&
    r.ApprovalStatus === 'Approved' &&
    r.Status !== 'Present'
  );

  // Filter for students who forgot to check out
  const forgotCheckOutRecords = data.filter(r =>
    formatDate(new Date(r.Date)) === todayStr &&
    r.InTime && !r.OutTime &&
    (r.Status === 'Present' || r.Status === 'Late' || r.ApprovalStatus === 'Pending')
  );

  const headers = attSheet.getDataRange().getValues()[0];
  const statusCol = headers.indexOf('Status') + 1;
  const inCol = headers.indexOf('InTime') + 1;
  const outCol = headers.indexOf('OutTime') + 1;
  const remarksCol = headers.indexOf('Remarks') + 1;

  const settings = getAppSettings().settings;
  const defaultEndTime = settings['ArrivalSlotEnd'] || '06:00 PM';

  recordsToUpdate.forEach(rec => {
    const rowIndex = findRowIndexByValue(attSheet, rec.AttendanceID, 'AttendanceID');
    if (rowIndex > -1) {
      if (statusCol > 0) attSheet.getRange(rowIndex, statusCol).setValue('Present');
      if (inCol > 0 && !rec.InTime) attSheet.getRange(rowIndex, inCol).setValue('09:00 AM');
      if (outCol > 0 && !rec.OutTime) attSheet.getRange(rowIndex, outCol).setValue(defaultEndTime);
    }
  });

  forgotCheckOutRecords.forEach(rec => {
    const rowIndex = findRowIndexByValue(attSheet, rec.AttendanceID, 'AttendanceID');
    if (rowIndex > -1) {
      // Look up student's batch specific end time if we want to be more accurate
      let outTimeStr = defaultEndTime;

      // Setting OutTime
      if (outCol > 0) attSheet.getRange(rowIndex, outCol).setValue(outTimeStr);

      // Mark as Auto Check-Out in Remarks
      if (remarksCol > 0) {
        let currentRemarks = rec.Remarks || '';
        attSheet.getRange(rowIndex, remarksCol).setValue(currentRemarks ? currentRemarks + ' | Auto Check-Out' : 'Auto Check-Out');
      }
    }
  });

  // Also handle Sunday auto-WFH for all active students if today is Sunday
  if (new Date().getDay() === 0) {
    markSundayWfhForAll();
  }

  return { status: 'success', count: recordsToUpdate.length + forgotCheckOutRecords.length };
}

function markSundayWfhForAll() {
  const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  const activeStudents = getSheetDataAsObjects(regSheet).filter(s => s.ApplicationStatus === 'Approved');
  const todayStr = formatDate(new Date());

  activeStudents.forEach(s => {
    // Check if attendance already exists
    const existing = getAttendanceRecords(todayStr, null, s.RegistrationID);
    if (existing.length === 0) {
      // Create WFH record
      const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
      const headers = attSheet.getDataRange().getValues()[0];
      const attId = generateUniqueId('ATT', SHEET_NAMES.ATTENDANCE, 0);
      const studentName = `${s.FirstName} ${s.LastName}`;

      const row = headers.map(h => {
        if (h === 'AttendanceID') return attId;
        if (h === 'StudentRegistrationID') return s.RegistrationID;
        if (h === 'StudentName') return studentName;
        if (h === 'Date') return todayStr;
        if (h === 'Status') return 'Present';
        if (h === 'LeaveType') return 'WFH';
        if (h === 'EntryMode') return 'System';
        if (h === 'ApprovalStatus') return 'Approved';
        if (h === 'InTime') return '09:00 AM';
        if (h === 'OutTime') return '06:00 PM';
        if (h === 'Timestamp') return new Date();
        return '';
      });
      attSheet.appendRow(row);
    }
  });
}

/**
 * Admin: Upload a file to a specific student's folder.
 */
function uploadFileToFolder(base64Data, fileName, docType, regId) {
  try {
    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, "application/octet-stream", fileName);

    // Handle special system archive upload
    let folder;
    if (regId === 'ADMIN_GEN') {
      folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
    } else {
      folder = getOrCreateStudentFolder(regId, "admin-uploads");
    }

    const file = folder.createFile(blob);
    const fileId = file.getId();
    const fileUrl = file.getUrl();

    // Record in FileManager
    const fmSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    const uploadDate = new Date();

    fmSheet.appendRow([
      fileId,
      regId === 'ADMIN_GEN' ? 'SYSTEM' : regId,
      fileName,
      fileUrl,
      docType || 'Admin-Doc',
      uploadDate,
      file.getSize(),
      'Active'
    ]);

    return { status: 'success', fileId: fileId, url: fileUrl };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// =================================================================================
// NOTICES, CIRCULARS, INSTRUCTIONS & UPDATES
// =================================================================================

/**
 * Creates a new notice/circular/instruction/update
 * @param {Object} data - {type, title, content, priority, targetAudience, targetBatch, expiryDate, attachmentUrl}
 */
function createNoticeCircular(data) {
  try {
    const sheet = getSheet(SHEET_NAMES.NOTICES_CIRCULARS);
    const id = 'NC-' + new Date().getTime();
    const row = [
      id,
      data.type || 'Notice',          // Type: Instruction, Notice, Update, Circular
      data.title || '',
      data.content || '',
      data.priority || 'Normal',       // High, Normal, Low
      data.targetAudience || 'All',    // All, Batch-specific
      data.targetBatch || '',
      new Date(),                      // CreatedDate
      data.expiryDate ? new Date(data.expiryDate) : '',
      data.createdBy || 'Admin',
      'Active',
      data.attachmentUrl || '',
      ''                               // ReadBy (comma-separated regIds)
    ];
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return { status: 'success', message: `${data.type || 'Notice'} created successfully.`, noticeId: id };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Gets all active notices/circulars for a student
 */
function getStudentNoticesCirculars(regId) {
  try {
    const sheet = getSheet(SHEET_NAMES.NOTICES_CIRCULARS);
    if (!sheet) return { status: 'success', notices: [] };

    const data = getSheetDataAsObjects(sheet);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get student batch
    const studentResp = getStudentFullData(regId);
    const batchName = (studentResp && studentResp.studentData) ? studentResp.studentData.Batch : '';

    const notices = data.filter(n => {
      if (n.Status !== 'Active') return false;
      // Check expiry
      if (n.ExpiryDate) {
        const exp = new Date(n.ExpiryDate);
        if (exp < today) return false;
      }
      // Check target audience
      if (n.TargetAudience === 'All') return true;
      if (n.TargetBatch && batchName && String(n.TargetBatch).includes(batchName)) return true;
      return false;
    }).map(n => {
      const readBy = String(n.ReadBy || '').split(',').map(s => s.trim());
      return {
        id: n.NoticeID,
        type: n.Type,
        title: n.Title,
        content: n.Content,
        priority: n.Priority,
        createdDate: formatDateISO(n.CreatedDate),
        expiryDate: n.ExpiryDate ? formatDateISO(n.ExpiryDate) : null,
        createdBy: n.CreatedBy,
        attachmentUrl: n.AttachmentUrl,
        isRead: readBy.includes(String(regId))
      };
    });

    // Sort by priority (High first), then by date (newest first)
    const priorityOrder = { 'High': 0, 'Normal': 1, 'Low': 2 };
    notices.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 1;
      const pb = priorityOrder[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdDate) - new Date(a.createdDate);
    });

    return { status: 'success', notices: notices };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Marks a notice as read by a student
 */
function markNoticeAsRead(regId, noticeId) {
  try {
    const sheet = getSheet(SHEET_NAMES.NOTICES_CIRCULARS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('NoticeID');
    const readByCol = headers.indexOf('ReadBy');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === noticeId) {
        const existing = String(data[i][readByCol] || '');
        if (!existing.split(',').map(s => s.trim()).includes(String(regId))) {
          const updated = existing ? existing + ',' + regId : regId;
          sheet.getRange(i + 1, readByCol + 1).setValue(updated);
        }
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Notice not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Gets all notices for admin management
 */
function getAllNoticesCirculars() {
  try {
    const sheet = getSheet(SHEET_NAMES.NOTICES_CIRCULARS);
    if (!sheet) return { status: 'success', notices: [] };
    const data = getSheetDataAsObjects(sheet);
    const notices = data.map(n => ({
      id: n.NoticeID,
      type: n.Type,
      title: n.Title,
      content: n.Content,
      priority: n.Priority,
      targetAudience: n.TargetAudience,
      targetBatch: n.TargetBatch,
      createdDate: formatDateISO(n.CreatedDate),
      expiryDate: n.ExpiryDate ? formatDateISO(n.ExpiryDate) : null,
      createdBy: n.CreatedBy,
      status: n.Status,
      attachmentUrl: n.AttachmentUrl,
      readCount: n.ReadBy ? String(n.ReadBy).split(',').filter(s => s.trim()).length : 0
    }));
    return { status: 'success', notices: notices };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Updates notice status (Active/Archived/Deleted)
 */
function updateNoticeStatus(noticeId, newStatus) {
  try {
    const sheet = getSheet(SHEET_NAMES.NOTICES_CIRCULARS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('NoticeID');
    const statusCol = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === noticeId) {
        sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
        return { status: 'success', message: 'Notice updated.' };
      }
    }
    return { status: 'error', message: 'Notice not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// =================================================================================
// OTP DISPLAY, VALIDITY & RESEND
// =================================================================================

/**
 * Gets OTP details for student panel display (with validity info)
 */
function getStudentOtpDetails(regId) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const data = getSheetDataAsObjects(sheet);
    const now = new Date();

    const studentOtps = data.filter(r => String(r.RegistrationID) === String(regId))
      .map(r => {
        const expiry = r.ExpiryTimestamp ? new Date(r.ExpiryTimestamp) : null;
        let validityStatus = 'Active';
        let remainingMinutes = 0;

        if (expiry) {
          if (expiry < now) {
            validityStatus = 'Expired';
          } else {
            remainingMinutes = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60));
            validityStatus = 'Active';
          }
        }

        // Auto-mark expired entries older than 24 hours
        if (validityStatus === 'Expired' && expiry) {
          const hoursSinceExpiry = (now.getTime() - expiry.getTime()) / (1000 * 60 * 60);
          if (hoursSinceExpiry > 24) {
            validityStatus = 'Auto-Deleted';
          }
        }

        return {
          id: r.ID,
          actionType: r.ActionType,
          otp: ((r.Status === 'Approved' || r.Status === 'Awaiting OTP') && validityStatus === 'Active') ? r.OTP : null,
          status: r.Status,
          targetDate: r.TargetDate,
          targetDateISO: formatDateISO(r.TargetDate),
          reason: r.Reason,
          leaveType: r.LeaveType,
          validityStatus: validityStatus,
          remainingMinutes: remainingMinutes,
          expiryTime: expiry ? expiry.toLocaleString('en-IN') : null,
          canResend: validityStatus === 'Expired' && (r.Status === 'Approved' || r.Status === 'Awaiting OTP')
        };
      })
      .filter(r => r.validityStatus !== 'Auto-Deleted')
      .sort((a, b) => {
        // 1. Active first, then Expired
        if (a.validityStatus === 'Active' && b.validityStatus !== 'Active') return -1;
        if (b.validityStatus === 'Active' && a.validityStatus !== 'Active') return 1;

        // 2. Most recent TargetDate first
        const dateA = new Date(a.targetDate).getTime();
        const dateB = new Date(b.targetDate).getTime();
        if (dateA !== dateB) return dateB - dateA;

        // 3. Fallback to ID (numeric part)
        const idA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
        const idB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
        return idB - idA;
      });

    return { status: 'success', otps: studentOtps };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Resend OTP for an expired approved request
 */
function requestOtpResend(regId, requestId) {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID');
    const regCol = headers.indexOf('RegistrationID');
    const otpCol = headers.indexOf('OTP');
    const statusCol = headers.indexOf('Status');
    const expiryCol = headers.indexOf('ExpiryTimestamp');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(requestId) && String(data[i][regCol]) === String(regId)) {
        if (data[i][statusCol] !== 'Approved' && data[i][statusCol] !== 'Awaiting OTP') {
          return { status: 'error', message: 'Only approved or awaiting verification requests can have OTP resent.' };
        }
        // Generate new OTP and extend expiry by 30 minutes
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpiry = new Date();
        newExpiry.setMinutes(newExpiry.getMinutes() + 30);

        sheet.getRange(i + 1, otpCol + 1).setValue(newOtp);
        sheet.getRange(i + 1, expiryCol + 1).setValue(newExpiry);

        // Keep the main student requests sheet in sync
        updateStudentRequestOTP_(requestId, newOtp);
        SpreadsheetApp.flush();

        return { status: 'success', message: 'New OTP generated. Valid for 30 minutes.', otp: newOtp, expiryTime: newExpiry.toLocaleString('en-IN') };
      }
    }
    return { status: 'error', message: 'Request not found.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Auto-delete OTPs expired for more than 24 hours (run via time-based trigger)
 */
function autoDeleteExpiredOtps() {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const expiryCol = headers.indexOf('ExpiryTimestamp');
    const statusCol = headers.indexOf('Status');
    const now = new Date();
    let deletedCount = 0;

    // Process from bottom to top to avoid row index shifting
    for (let i = data.length - 1; i >= 1; i--) {
      const expiry = data[i][expiryCol] ? new Date(data[i][expiryCol]) : null;
      if (expiry && expiry < now) {
        const hoursSinceExpiry = (now.getTime() - expiry.getTime()) / (1000 * 60 * 60);
        if (hoursSinceExpiry > 24 && data[i][statusCol] !== 'Used') {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
    }
    Logger.log('autoDeleteExpiredOtps: Removed ' + deletedCount + ' expired OTPs.');
    return { status: 'success', deleted: deletedCount };
  } catch (e) {
    Logger.log('Error in autoDeleteExpiredOtps: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

// =================================================================================
// OD (ON-DUTY) REQUEST FOR UPCOMING DATES
// =================================================================================

/**
 * Submits OD request for upcoming/future dates
 */
function submitODRequest(regId, dateStr, reason, location) {
  try {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate <= today) {
      return { status: 'error', message: 'OD requests can only be submitted for upcoming dates. For past dates, use Attendance Correction.' };
    }

    const studentResp = getStudentFullData(regId);
    if (!studentResp || studentResp.status !== 'success') {
      return { status: 'error', message: 'Student data not found.' };
    }
    const student = studentResp.studentData;
    const studentName = `${student.FirstName} ${student.LastName}`;

    // Create OTP entry for admin approval
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_OTP);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().trim());
    const id = 'OD-' + new Date().getTime();

    const rowData = headers.map(h => {
      switch (h) {
        case 'ID': return id;
        case 'RegistrationID': return regId;
        case 'OTP': return '';
        case 'ActionType': return 'OD-Upcoming';
        case 'ExpiryTimestamp': return '';
        case 'TargetDate': return targetDate;
        case 'Reason': return `${reason || 'On-Duty Request'}${location ? '. Location: ' + location : ''}`;
        case 'Status': return 'Pending Admin Approval';
        case 'LeaveType': return 'OD';
        case 'AttachmentUrl': return '';
        default: return '';
      }
    });

    sheet.appendRow(rowData);
    SpreadsheetApp.flush();

    // Save to unified StudentRequests
    saveStudentRequest_({
      RequestID: id,
      RegistrationID: regId,
      StudentName: studentName,
      RequestType: 'OD-Upcoming',
      TargetDate: targetDate,
      Reason: reason + (location ? '. Location: ' + location : ''),
      LeaveType: 'OD'
    });

    createAdminNotification("OD Request", `${studentName} (${regId}) has requested On-Duty for ${formatDateISO(targetDate)}. Reason: ${reason}`);

    return { status: 'success', message: 'On-Duty request submitted for admin approval.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// =================================================================================
// ADVANCED REPORTING ENGINE 
// =================================================================================

/**
 * Calculates the dynamic duration of an internship.
 * If completed: End Date - Start Date
 * If active: Current Date - Start Date
 */
function calculateDynamicDuration(s) {
  try {
    const start = s.InternshipStartDate ? new Date(s.InternshipStartDate) : null;
    if (!start || isNaN(start.getTime())) return 'N/A';

    let end;
    const status = (s.ApplicationStatus || s.Status || "").toLowerCase();

    if (status === 'completed') {
      end = s.InternshipEndDate ? new Date(s.InternshipEndDate) : new Date();
    } else {
      end = new Date();
    }

    if (isNaN(end.getTime())) return 'N/A';

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + (status === 'completed' ? '' : ' (Active)');
  } catch (e) {
    return 'N/A';
  }
}

function generateAcknowledgementPdf(registrationId) {
  try {
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const students = getSheetDataAsObjects(regSheet);
    const stu = students.find(function (s) { return s.RegistrationID === registrationId; });
    if (!stu) return { status: 'error', message: 'Student not found' };

    const ackNo = 'ACK-' + new Date().getTime().toString().slice(-6);

    // HTML for Acknowledgement
    const html = `
      <html>
      <head>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px double #00838f; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #d32f2f; font-size: 26px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; }
          .header h2 { margin: 5px 0 0 0; color: #4361ee; font-size: 19px; font-weight: 700; border-top: 1px solid #eee; padding-top: 5px; display: inline-block; }
          .content { font-size: 14px; margin-top: 10px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #e2e8f0; }
          .info-table th, .info-table td { padding: 12px; border: 1px solid #e2e8f0; text-align: left; }
          .info-table th { background-color: #f8faff; color: #1e3a8a; width: 35%; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
          .info-table td { color: #334155; font-weight: 500; }
          .section-title { font-size: 16px; font-weight: 800; margin-bottom: 12px; color: #4361ee; border-left: 4px solid #4361ee; padding-left: 10px; background: #f0f7ff; padding-top: 5px; padding-bottom: 5px; }
          .instructions, .terms { margin-bottom: 20px; font-size: 13px; color: #475569; }
          .instructions ul, .terms ul { margin-top: 5px; padding-left: 20px; }
          .doc-list { background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; margin-bottom: 20px; border-radius: 0 8px 8px 0; }
          .warning { font-weight: 700; color: #ef4444; text-align: center; margin-top: 30px; font-size: 13px; padding: 10px; border: 1px dashed #ef4444; border-radius: 8px; }
          .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${COMPANY_NAME}</h1>
          <h2>Internship Registration Acknowledgement</h2>
        </div>
        
        <div class="content">
          <p style="text-align: right; font-weight: bold; color: #555;">Acknowledgement No: ${ackNo}</p>
          <p>Dear <strong>${stu.FirstName} ${stu.LastName || ''}</strong>,</p>
          <p>Thank you for submitting your Internship Registration Application. We have successfully received your details.</p>
          
          <table class="info-table">
            <tr><th>Registration ID</th><td><strong>${stu.RegistrationID}</strong></td></tr>
            <tr><th>Application Date</th><td>${formatDateDisplay(stu.Timestamp)}</td></tr>
            <tr><th>Application Status</th><td><strong style="color: #e67e22; text-transform: uppercase;">${stu.ApplicationStatus || 'Pending'}</strong></td></tr>
            <tr><th>Student Name</th><td>${stu.FirstName} ${stu.LastName || ''}</td></tr>
            <tr><th>College Register No</th><td>${stu.RegisterNumber || 'N/A'}</td></tr>
            <tr><th>College Name</th><td>${stu.CollegeName || 'N/A'}</td></tr>
            <tr><th>Department</th><td>${stu.Department || 'N/A'}</td></tr>
            <tr><th>Phone Number</th><td>${stu.MobileNumber || ''}</td></tr>
            <tr><th>Address</th><td>${stu.Address || ''}, ${stu.District || ''} - ${stu.Pincode || ''}</td></tr>
            <tr><th>Internship Start Date</th><td>${formatDateDisplay(stu.InternshipStartDate)}</td></tr>
            <tr><th>Internship End Date</th><td>${formatDateDisplay(stu.InternshipEndDate)}</td></tr>
            <tr><th>Duration (Days)</th><td>${stu.DurationDays || 'N/A'} Days</td></tr>
          </table>

          <div class="section-title">Instructions</div>
          <div class="instructions">
            <ul>
              <li><strong>Registration Completed:</strong> You have registered. You will receive approval from the Admin side.</li>
              <li><strong>Onboarding Documents:</strong> After approval, we will send you the application form and joining letter. On the date you join, please collect these.</li>
              <li><strong>RFID Card & Attendance:</strong> You will also automatically receive an RFID card for attendance.</li>
              <li><strong>Hard Copy Reference:</strong> Please keep a printed hard copy of this acknowledgement for your future reference and verification.</li>
            </ul>
          </div>

          <div class="section-title">Required Documents for Verification</div>
          <div class="doc-list">
            Please ensure you have the following documents ready when your internship starts:
            <ul style="margin-bottom:0;">
              <li>Valid College ID Card (Original & Photocopy)</li>
              <li>Aadhar Card or Government ID Proof</li>
              <li>Passport Size Photographs (2 Nos)</li>
              <li>Bonafide Certificate / Internship Request Letter from College (if applicable)</li>
            </ul>
          </div>

          <div class="section-title">Basic Terms & Conditions</div>
          <div class="terms">
            <ul>
              <li>Registration does not guarantee final selection or project allotment.</li>
              <li>All details provided during registration must be authentic; discrepancies may lead to application rejection.</li>
              <li>The internship schedule and domains are subject to final approval by ${COMPANY_NAME}.</li>
            </ul>
          </div>
          
          <p class="warning">*** This is an auto-generated acknowledgement and does not require a signature. ***</p>
        </div>

        <div class="footer">
          GSV System Auto-Generated Acknowledgement | Generated on ${formatDateDisplay(new Date())}
        </div>
      </body>
      </html>
    `;

    const blob = HtmlService.createHtmlOutput(html).getAs('application/pdf');
    blob.setName(`Acknowledgement_${registrationId}.pdf`);

    // Save to Drive
    const folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
    const file = folder.createFile(blob);

    const fmSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
    if (fmSheet) {
      fmSheet.appendRow([file.getId(), registrationId, blob.getName(), file.getUrl(), 'Acknowledgement', new Date(), file.getSize(), 'Active']);
    }

    return { status: 'success', fileId: file.getId(), url: file.getUrl(), message: 'Acknowledgement generated.' };
  } catch (e) {
    Logger.log("Error generating Acknowledgement PDF: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Generates the Complete Internship Document Set (Application, Declaration, Attendance Sheet).
 * This will be called on Admin Approval.
 */
/**
 * Generates the Complete Internship Document Set (Application Form) using Google Docs template.
 * This version uses DocumentApp to replace placeholders and insert a dynamic attendance table and QR code.
 */
function generateApplicationPdf(registrationId) {
  try {
    const result = generateDocumentAndMail('applicationForm', registrationId, false, true);
    if (result && result.status === 'success') {
      const fileIdMatch = result.url.match(/[-\w]{25,}/);
      const fileId = fileIdMatch ? fileIdMatch[0] : null;

      return {
        status: 'success',
        message: 'Application form generated from Google Docs template.',
        fileId: fileId,
        url: result.url
      };
    } else {
      return result || { status: 'error', message: 'Failed to generate application form.' };
    }
  } catch (error) {
    Logger.log('Error in generateApplicationPdf (Template): ' + error.toString());
    return { status: 'error', message: error.message };
  }
}


/**
 * Searches the registrations sheet for students matching a query string across multiple columns.
 * Designed for the Admin Dashboard Advanced Reports section.
 * @param {string} query Search query (name, regNo, phone, email, letterId, or college)
 * @returns {Array<Object>} List of top 10 matching student records with basic fields.
 */
function searchStudentsForReports(query) {

  try {
    if (!query || query.trim().length < 2) return [];

    query = query.toLowerCase().trim();
    const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    if (!sheet) return [];

    const students = getSheetDataAsObjects(sheet);
    const results = [];

    for (let student of students) {
      if (!student.RegistrationID) continue; // Skip invalid records

      const searchableStr = [
        student.FirstName,
        student.LastName,
        student.RegistrationID,
        student.MobileNumber,
        student.SecondaryMobileNumber,
        student.EmailAddress,
        student.CollegeName,
        student.Batch,
        student.RegisterNumber,
        student.Phone,
        student.LetterID // If LetterID exists
      ].map(v => (v || '').toString().toLowerCase()).join(' ');

      if (searchableStr.includes(query)) {
        results.push({
          id: student.RegistrationID,
          name: `${student.FirstName || ''} ${student.LastName || ''}`.trim(),
          batch: student.Batch || 'No Batch',
          mobile: student.MobileNumber || 'N/A',
          college: student.CollegeName || 'Unknown College'
        });

        // Limit to 15 results for performance
        if (results.length >= 15) break;
      }
    }

    return results;
  } catch (e) {
    Logger.log("Error in searchStudentsForReports: " + e.toString());
    return [];
  }
}

/**
 * Master report generation function for the Admin panel.
 * Generates highly styled A4 PDF documents automatically based on selected parameters.
 * @param {string} reportType The type of report to generate.
 * @param {string} dateRange 'today', 'week', 'month', 'custom'
 * @param {string} startDate custom start date (if custom mode)
 * @param {string} endDate custom end date (if custom mode)
 * @param {boolean} sendEmail whether to email the report
 * @param {Object} options includes reportScope, reportMode, batchName, studentId, include company details etc.
 */
function generateReport(reportType, dateRange, startDate, endDate, sendEmail, options) {
  // Handle case where a single options object is passed
  if (typeof reportType === 'object' && !options) {
    options = reportType;
    reportType = options.reportType;
    dateRange = options.reportMode || options.dateRange;
    startDate = options.startDate;
    endDate = options.endDate;
    sendEmail = options.sendEmail || options.sendEmailOption;
  }
  options = options || {};

  // Form 5 identical formatting interceptor
  if (reportType === 'studentDiary' || reportType === 'dailyLogForm5') {
    const regId = options.studentId || (options.selectedStudentIds && options.selectedStudentIds[0]);
    if (regId) {
      let mode = 'consolidated';
      if (dateRange === 'custom') mode = 'period';
      else if (dateRange === 'today' || dateRange === 'single') mode = 'day';
      else if (dateRange === 'duration' && startDate && endDate && startDate !== endDate && !isNaN(new Date(startDate))) mode = 'period';

      const res = generateStudentDiaryPDF_V2({
        regId: regId,
        mode: mode,
        singleDate: startDate,
        fromDate: startDate,
        toDate: endDate,
        orientation: 'portrait'
      });

      if (res && res.status === 'success' && sendEmail) {
        const studentData = getStudentDataForDoc(regId);
        if (studentData && studentData.GmailID) {
          try {
            const file = DriveApp.getFileById(res.fileId);
            MailApp.sendEmail({
              to: studentData.GmailID,
              subject: `Your Student Diary - ${COMPANY_NAME || 'Organization'}`,
              body: `Dear ${studentData.FirstName},\n\nPlease find your consolidated student diary attached.\n\nBest regards,\n${COMPANY_NAME || 'Organization'}`,
              htmlBody: `Dear ${studentData.FirstName},<br><br>Please find your consolidated student diary attached.<br><br>Best regards,<br>${COMPANY_NAME || 'Organization'}`,
              attachments: [file.getAs(MimeType.PDF)]
            });
            const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
            if (docSheet) docSheet.getRange(docSheet.getLastRow(), 8).setValue('Yes');
          } catch (e) { Logger.log("Diary email error: " + e.message); }
        }
      }
      return res;
    }
  }

  try {
    const scope = options.reportScope || 'overall';
    let title = "Generated System Report";
    let reportDataHtml = "";
    let handled = false;


    // Determine report title based on configuration
    const titles = {
      'fullDashboard': 'Full Dashboard Systems Report',
      'dailySummary': 'Daily Summary Report',
      'attendance': scope === 'student' ? 'Detailed Student Attendance Report' : scope === 'batch' ? 'Batch Attendance Report' : 'Overall Attendance Report',
      'internshipStatus': 'General Internship Status Report',
      'batchSummary': 'Batch Summary Report',
      'projectStatus': 'Project Status Report',
      'completeStudentReport': 'Full Student Portfolio Report',
      'studentSummary': 'Student Summary Report',
      'completeAttendanceReport': 'Detailed Student Attendance Lifecycle',
      'internshipAttendanceReport': 'Organizational Attendance Footprint',
      'taskCompletion': 'Task Performance Report',
      'projectCompletion': 'Project Completion Report',
      'certificateIssued': 'Certification Issuance Report',
      'studentExitDetails': 'Student Exit Details & Clearance',
      'studentApplication': 'STUDENT INTERNSHIP PROGRAM APPLICATION',
      'overallAttendance': scope === 'student' ? 'Individual Attendance Sheet' : 'Overall Attendance Report',
      'dailyLogForm5': 'Detailed Student Daily Work Log (Form 5)',
      'attendanceSheet': 'Monthly Student Attendance & Punctuality Sheet',
      'consolidatedAttendance': 'Consolidated Internship Performance & Attendance',
      'taskProjectSummary': 'Detailed Task Execution & Project Contribution Report'
    };

    title = titles[reportType] || 'System Advanced Report';

    // We fetch high-level details depending on scope to put in the PDF.
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const students = getSheetDataAsObjects(regSheet);

    let scopeDetailsHtml = "";
    let targetStudents = [];

    const checkEmpty = (x) => {
      try {
        if (x === null || x === undefined || String(x).trim() === '') return '<span style="color:#aaa;">Not Available</span>';
        return String(x).trim();
      } catch (e) { return '<span style="color:#d32f2f;">Data Error</span>'; }
    };

    if (scope === 'student') {
      const stu = students.find(s => s.RegistrationID === options.studentId);
      if (!stu) throw new Error("Target student not found.");
      targetStudents = [stu];

      const name = stu.FirstName ? `${stu.FirstName} ${stu.MiddleName || ''} ${stu.LastName || ''}`.replace(/\s+/g, ' ').trim() : (stu.FullName || stu.StudentName || stu.name || '-');

      scopeDetailsHtml = `
      <div style="background-color: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-family: 'Arial', sans-serif;">
         <h4 style="margin: 0 0 10px 0; color: #333; text-transform: uppercase;">Official Candidate Profile</h4>
         <table style="width:100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding:6px; border-bottom: 1px dotted #ccc; width: 33%;"><strong>Student Name:</strong> ${checkEmpty(name)}</td>
              <td style="padding:6px; border-bottom: 1px dotted #ccc; width: 33%;"><strong>Reg No:</strong> ${checkEmpty(stu.RegisterNumber || stu.regNo)}</td>
              <td style="padding:6px; border-bottom: 1px dotted #ccc; width: 33%;"><strong>Sys Reg ID:</strong> ${checkEmpty(stu.RegistrationID || stu.StudentRegistrationID || stu.regId)}</td>
            </tr>
            <tr>
              <td style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>Branch / Dept:</strong> ${checkEmpty(stu.Department)}</td>
              <td style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>Year / Sem:</strong> Year ${checkEmpty(stu.Year)}, Sem ${checkEmpty(stu.Semester)}</td>
              <td style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>Batch & Project:</strong> ${checkEmpty(stu.Batch || stu.batch)} - ${checkEmpty(stu.ProjectTitle || stu.Project || stu.project || 'N/A')}</td>
            </tr>
            <tr>
              <td style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>College:</strong> ${checkEmpty(stu.CollegeName || stu.college)}</td>
              <td style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>District:</strong> ${checkEmpty(stu.CollegeDistrict || stu.District)}</td>
              <td style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>Contact No:</strong> ${checkEmpty(stu.MobileNumber || stu.Mobile)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>Email ID:</strong> ${checkEmpty(stu.GmailID || stu.Gmail || stu.Email || stu.EmailAddress)}</td>
              <td style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>Status:</strong> <span style="font-weight: bold; color: ${stu.ApplicationStatus === 'Approved' || stu.ApplicationStatus === 'Active' ? '#2e7d32' : stu.ApplicationStatus === 'Completed' || stu.Status === 'Completed' ? '#0277bd' : '#d32f2f'}">${checkEmpty(stu.ApplicationStatus || stu.Status)}</span></td>
            </tr>
            <tr>
              <td colspan="3" style="padding:6px; border-bottom: 1px dotted #ccc;"><strong>Home Address:</strong> ${checkEmpty(stu.Address)}</td>
            </tr>
         </table>
      </div>`;
    } else if (scope === 'batch') {
      if (options.selectedStudentIds && options.selectedStudentIds.length > 0) {
        targetStudents = students.filter(s => options.selectedStudentIds.includes(s.RegistrationID));
        scopeDetailsHtml = `<div style="background-color: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 5px 0; color: #333;">Scope: Batch-Wise Targeting (${options.batchName || 'Selected Students'})</h4>
            <div style="font-size: 13px;">Selected Students in Pool: <strong>${targetStudents.length}</strong> / ${options.selectedStudentIds.length} requested.</div>
          </div>`;
      } else if (options.batchName !== 'all' && options.batchName) {
        targetStudents = students.filter(s => s.Batch === options.batchName);
        scopeDetailsHtml = `<div style="background-color: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 5px 0; color: #333;">Scope: Batch-Wise Targeting (${options.batchName})</h4>
            <div style="font-size: 13px;">Total Associated Student Records: <strong>${targetStudents.length}</strong> under this batch scope.</div>
          </div>`;
      } else {
        targetStudents = students;
        scopeDetailsHtml = `<div style="background-color: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 5px 0; color: #333;">Scope: Batch-Wise Targeting (All Batches)</h4>
            <div style="font-size: 13px;">Total Student Pool Indexed: <strong>${targetStudents.length}</strong></div>
          </div>`;
      }
    } else {
      targetStudents = students;
      scopeDetailsHtml = `<div style="background-color: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
         <h4 style="margin: 0 0 5px 0; color: #333;">Scope: Global / Organization Wide</h4>
         <div style="font-size: 13px;">Global Analysis Across System Database: Active Records Indexed - <strong>${targetStudents.length}</strong></div>
       </div>`;
    }

    reportDataHtml += scopeDetailsHtml;

    // Filter by Date Range if applicable
    let dateFiltInfo = "All Time / Unfiltered";
    if (scope !== 'student' || reportType !== 'completeAttendanceReport' || options.reportMode !== 'daywise') {
      if (dateRange === 'today') { dateFiltInfo = "Today (" + formatDateDisplay(new Date()) + ")"; }
      else if (dateRange === 'week') { dateFiltInfo = "Current Week"; }
      else if (dateRange === 'month') { dateFiltInfo = "Current Month"; }
      else if (dateRange === 'internPeriod') {
        if (targetStudents.length > 0 && targetStudents[0].InternshipStartDate && targetStudents[0].InternshipEndDate) {
          dateFiltInfo = "Entire Internship Duration | From " + formatDateDisplay(new Date(targetStudents[0].InternshipStartDate)) + " to " + formatDateDisplay(new Date(targetStudents[0].InternshipEndDate));
        } else {
          dateFiltInfo = "Entire Internship Duration";
        }
      }
      else if (dateRange === 'custom') { dateFiltInfo = "Custom Period | From " + formatDateDisplay(new Date(startDate)) + " to " + formatDateDisplay(new Date(endDate)); }
    } else {
      if (options.selectedDay) dateFiltInfo = "Target Single Specific Reference Day: " + options.selectedDay;
    }

    reportDataHtml += `<div style="margin-bottom: 20px; font-size: 13px; color: #555;"><strong>Date/Time Period Constraint:</strong> <span style="background-color: #e3f2fd; padding: 2px 6px; border-radius: 3px; border: 1px solid #bbdefb">${dateFiltInfo}</span></div>`;

    // Fetch all needed data once for complex reports
    let allAtt = [], allDiary = [], allTasks = [], allProj = [];
    if (['fullDashboard', 'dailySummary', 'overallAttendance', 'attendance', 'completeAttendanceReport', 'attendanceSheet', 'consolidatedAttendance', 'internHistoryReport', 'studentSummary', 'taskCompletion', 'projectCompletion', 'taskProjectSummary', 'studentDiary', 'completeStudentReport'].includes(reportType)) {
      try {
        allAtt = getSheetDataAsObjects(getSheet(SHEET_NAMES.ATTENDANCE));
        allDiary = getSheetDataAsObjects(getSheet(SHEET_NAMES.STUDENT_DIARY));
        allTasks = getSheetDataAsObjects(getSheet(SHEET_NAMES.TASKS));
        allProj = getSheetDataAsObjects(getSheet(SHEET_NAMES.PROJECTS));
      } catch (e) { Logger.log("Data fetch error in report engine: " + e.message); }
    }


    // High Level Table / Generic rendering
    if (['batchSummary', 'fullDashboard'].includes(reportType)) {
      reportDataHtml += `<h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px; color: #333; margin-top: 30px;">Primary Indexed Profile Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
        <thead>
          <tr style="background-color: #4361ee; color: white;">
            <th style="padding: 10px 8px; border: 1px solid #364fc7; text-align: left;">S.No</th>
            <th style="padding: 10px 8px; border: 1px solid #364fc7; text-align: left;">Registration ID</th>
            <th style="padding: 10px 8px; border: 1px solid #364fc7; text-align: left;">Student Name</th>
            <th style="padding: 10px 8px; border: 1px solid #364fc7; text-align: center;">Assigned Batch</th>
            <th style="padding: 10px 8px; border: 1px solid #364fc7; text-align: center;">Current Status</th>
            <th style="padding: 10px 8px; border: 1px solid #364fc7; text-align: center;">Joining Date</th>
          </tr>
        </thead>
        <tbody>
          ${targetStudents.map((s, index) => `
            <tr style="background-color: ${index % 2 === 0 ? '#fff' : '#fcfcfc'};">
              <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${s.RegistrationID}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #333;">${s.FirstName} ${s.LastName}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${s.Batch || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${s.ApplicationStatus || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDateDisplay(s.InternshipStartDate) || '-'}</td>
            </tr>
          `).join('')}
          ${targetStudents.length === 0 ? '<tr><td colspan="6" style="padding: 25px; text-align: center; color: #999;">No active records found matching system criteria scope boundaries.</td></tr>' : ''}
        </tbody>
      </table>`;
      handled = true;
    }


    if (reportType === 'fullDashboard') {

      const activeCount = targetStudents.filter(s => s.ApplicationStatus === 'Approved' || s.ApplicationStatus === 'Active').length;
      reportDataHtml += `
        <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px; color: #333; margin-top: 30px;">Global System Performance Matrix</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
           <div style="background: #f1f8e9; border: 1px solid #c5e1a5; padding: 20px; border-radius: 10px;">
              <h2 style="margin:0; color:#388e3c;">${activeCount}</h2>
              <div style="font-size:12px; text-transform:uppercase;">Interns Currently Active</div>
           </div>
           <div style="background: #e3f2fd; border: 1px solid #bbdefb; padding: 20px; border-radius: 10px;">
              <h2 style="margin:0; color:#1976d2;">${allAtt.length}</h2>
              <div style="font-size:12px; text-transform:uppercase;">Lifetime Attendance Logs</div>
           </div>
           <div style="background: #fff3e0; border: 1px solid #ffe0b2; padding: 20px; border-radius: 10px;">
              <h2 style="margin:0; color:#f57c00;">${allDiary.length}</h2>
              <div style="font-size:12px; text-transform:uppercase;">Daily Diary Records</div>
           </div>
           <div style="background: #f3e5f5; border: 1px solid #e1bee7; padding: 20px; border-radius: 10px;">
              <h2 style="margin:0; color:#7b1fa2;">${allTasks.length + allProj.length}</h2>
              <div style="font-size:12px; text-transform:uppercase;">Work Performance Units</div>
           </div>
        </div>`;
      handled = true;
    }


    if (reportType === 'dailySummary') {

      const todayStr = formatDateISO(new Date());
      const todayAtt = allAtt.filter(a => formatDateISO(a.Date) === todayStr);
      const todayDiary = allDiary.filter(d => formatDateISO(d.Date) === todayStr);
      reportDataHtml += `
        <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px; color: #333; margin-top: 30px;">Daily Operational Summary - ${formatDateDisplay(new Date())}</h3>
        <table style="width:100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
           <tr style="background: #f8f9fa;"><th style="padding:10px; border:1px solid #ddd; text-align:left;">Key Operational Metric</th><th style="padding:10px; border:1px solid #ddd; text-align:center;">Live Count</th></tr>
           <tr><td style="padding:10px; border:1px solid #ddd;">Total Approved Interns in System</td><td style="padding:10px; border:1px solid #ddd; text-align:center; font-weight:bold;">${targetStudents.filter(s => s.ApplicationStatus === 'Approved').length}</td></tr>
           <tr><td style="padding:10px; border:1px solid #ddd;">Logged Attendance Entries for Today</td><td style="padding:10px; border:1px solid #ddd; text-align:center; font-weight:bold;">${todayAtt.length}</td></tr>
           <tr><td style="padding:10px; border:1px solid #ddd;">Daily Diary Submissions Received Today</td><td style="padding:10px; border:1px solid #ddd; text-align:center; font-weight:bold;">${todayDiary.length}</td></tr>
        </table>`;
      handled = true;
    }


    if (reportType === 'overallAttendance') {

      reportDataHtml += `<h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px; color: #333; margin-top: 30px;">Attendance Performance Matrix</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 15px;">
           <thead><tr style="background:#455a64; color:white;"><th style="padding:8px; border:1px solid #37474f; text-align:left;">Student</th><th style="padding:8px; border:1px solid #37474f; text-align:center;">P</th><th style="padding:8px; border:1px solid #37474f; text-align:center;">W</th><th style="padding:8px; border:1px solid #37474f; text-align:center;">O</th><th style="padding:8px; border:1px solid #37474f; text-align:center;">A</th><th style="padding:8px; border:1px solid #37474f; text-align:center;">%</th></tr></thead>
           <tbody>${targetStudents.map(s => {
        const sAtt = allAtt.filter(a => a.StudentRegistrationID === s.RegistrationID);
        const p = sAtt.filter(a => a.Status === 'Present').length;
        const w = sAtt.filter(a => a.Status === 'WFH').length;
        const o = sAtt.filter(a => a.Status === 'OD' || a.Status === 'On Duty').length;
        const abs = sAtt.filter(a => a.Status === 'Absent').length;
        const tot = p + w + o + abs; const perc = tot > 0 ? Math.round(((p + w + o) / tot) * 100) : 0;
        return `<tr><td style="padding:6px; border:1px solid #ddd;">${s.FirstName} ${s.LastName}<br><small>${s.RegistrationID}</small></td><td style="padding:6px; border:1px solid #ddd; text-align:center;">${p}</td><td style="padding:6px; border:1px solid #ddd; text-align:center;">${w}</td><td style="padding:6px; border:1px solid #ddd; text-align:center;">${o}</td><td style="padding:6px; border:1px solid #ddd; text-align:center;">${abs}</td><td style="padding:6px; border:1px solid #ddd; text-align:center; font-weight:bold; color:${perc >= 75 ? 'green' : 'red'};">${perc}%</td></tr>`;
      }).join('')}</tbody>
        </table>`;
      handled = true;
    }


    if (reportType === 'studentApplication' && targetStudents.length === 1) {
      const s = targetStudents[0];
      try {
        const res = generateApplicationPdf(s.RegistrationID);
        if (res && res.status === 'success') {
          return res;
        } else {
          return { status: 'error', message: res ? res.message : 'Failed to generate Application Form from Admin System.' };
        }
      } catch (err) {
        return { status: 'error', message: 'Error replicating Admin Application Form: ' + err.toString() };
      }
    }

    if (reportType === 'internshipStatus') {
      const stats = { present: 0, absent: 0, wfh: 0, od: 0, newJoin: 0, active: 0, completed: 0, rejected: 0 };
      targetStudents.forEach(s => {
        if (s.ApplicationStatus === 'Approved') stats.active++;
        else if (s.ApplicationStatus === 'Completed') stats.completed++;
        else if (s.ApplicationStatus === 'Rejected') stats.rejected++;
      });
      reportDataHtml += `<h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px; color: #333; margin-top: 30px;">Internship Status Metrics</h3>
      <div style="display: flex; gap: 15px; margin-top: 15px; margin-bottom: 20px;">
          <div style="flex:1; background:#e3f2fd; padding:15px; border-radius:8px; text-align:center;">
             <div style="font-size: 24px; font-weight: bold; color: #1565c0;">${targetStudents.length}</div>
             <div style="font-size: 11px; text-transform: uppercase;">Total Evaluated</div>
          </div>
          <div style="flex:1; background:#e8f5e9; padding:15px; border-radius:8px; text-align:center;">
             <div style="font-size: 24px; font-weight: bold; color: #2e7d32;">${stats.active}</div>
             <div style="font-size: 11px; text-transform: uppercase;">Active / Approved</div>
          </div>
          <div style="flex:1; background:#f3e5f5; padding:15px; border-radius:8px; text-align:center;">
             <div style="font-size: 24px; font-weight: bold; color: #6a1b9a;">${stats.completed}</div>
             <div style="font-size: 11px; text-transform: uppercase;">Completed</div>
          </div>
          <div style="flex:1; background:#ffebee; padding:15px; border-radius:8px; text-align:center;">
             <div style="font-size: 24px; font-weight: bold; color: #c62828;">${stats.rejected}</div>
             <div style="font-size: 11px; text-transform: uppercase;">Rejected / Dropped</div>
          </div>
      </div>`;

      if (targetStudents.length > 0) {
        reportDataHtml += `<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f1f3f5;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Reg ID</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Batch</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Status</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${targetStudents.map(s => `
                <tr>
                  <td style="padding: 6px; border: 1px solid #ddd;">${s.RegistrationID}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${s.FirstName} ${s.LastName}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${s.Batch || '-'}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${s.ApplicationStatus === 'Approved' ? 'green' : s.ApplicationStatus === 'Completed' ? 'blue' : 'red'};">${s.ApplicationStatus}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${s.InternshipDuration || '-'} Days</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      }
      handled = true;
    }

    // Comprehensive Fallback Logic for detailed reports
    if (!handled && targetStudents.length > 0) {
      const detailReportTypes = ['internHistoryReport', 'completeStudentReport', 'attendance', 'completeAttendanceReport', 'taskCompletion', 'projectCompletion', 'studentDiary', 'dailyLogForm5', 'attendanceSheet', 'consolidatedAttendance', 'taskProjectSummary'];
      if (detailReportTypes.includes(reportType)) {

        if (reportType === 'internHistoryReport') {
          reportDataHtml += `<h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px; color: #333; margin-top: 30px; text-transform: uppercase;">Complete Internship History & Activity Record</h3>
              <div style="background: #fdfbf7; border: 1px solid #e0e0e0; padding: 20px; margin-top: 15px; border-radius: 8px;">
                 <strong>Executive Summary:</strong>
                 <br>This document represents a comprehensive top-to-bottom master compilation of the referenced profiles.<br><br>
                 <strong>System Modules Validated for this Export:</strong>
                 <ul style="margin-top: 10px; margin-bottom: 0px; padding-left: 20px; color: #444; line-height: 1.6;">
                   <li>Complete Background & Academic CV Profile</li>
                   <li>Daily Master Attendance & Work Hour Logs</li>
                   <li>Form-5 Student Diary & Assessment Activity Matrix</li>
                   <li>Task Execution & Project Validation Board</li>
                   <li>System Security Access & Timestamp Audit Trail</li>
                 </ul>
              </div>`;
        }

        targetStudents.forEach((s, ix) => {
          let sStart = null, sEnd = null;
          if (!dateRange || dateRange === 'all' || dateRange === 'internPeriod') {
            if (s.InternshipStartDate) { sStart = new Date(s.InternshipStartDate); sStart.setHours(0, 0, 0, 0); }
            if (s.InternshipEndDate) {
              sEnd = new Date(s.InternshipEndDate); sEnd.setHours(23, 59, 59, 999);
            } else {
              sEnd = new Date(); sEnd.setHours(23, 59, 59, 999);
            }
          } else if (dateRange === 'custom') {
            if (startDate) { sStart = new Date(startDate); sStart.setHours(0, 0, 0, 0); }
            if (endDate) { sEnd = new Date(endDate); sEnd.setHours(23, 59, 59, 999); }
          } else if (dateRange === 'duration') {
            if (startDate) { sStart = new Date(startDate); sStart.setHours(0, 0, 0, 0); }
            else if (s.InternshipStartDate) { sStart = new Date(s.InternshipStartDate); sStart.setHours(0, 0, 0, 0); }
            if (endDate) { sEnd = new Date(endDate); sEnd.setHours(23, 59, 59, 999); }
            else if (s.InternshipEndDate) { sEnd = new Date(s.InternshipEndDate); sEnd.setHours(23, 59, 59, 999); }
            else { sEnd = new Date(); sEnd.setHours(23, 59, 59, 999); }
          }

          if (!sStart || isNaN(new Date(sStart).getTime())) {
            const stuAtts = allAtt.filter(a => a.StudentRegistrationID === s.RegistrationID);
            if (stuAtts.length > 0) {
              sStart = new Date(Math.min(...stuAtts.map(a => new Date(a.Date))));
              sStart.setHours(0, 0, 0, 0);
            }
          }
          if (!sEnd || isNaN(new Date(sEnd).getTime())) {
            const stuAtts = allAtt.filter(a => a.StudentRegistrationID === s.RegistrationID);
            if (stuAtts.length > 0) {
              sEnd = new Date(Math.max(...stuAtts.map(a => new Date(a.Date))));
              sEnd.setHours(23, 59, 59, 999);
            } else {
              sEnd = new Date();
              sEnd.setHours(23, 59, 59, 999);
            }
          } else if (dateRange === 'today') {
            const now = new Date(); sStart = new Date(now.setHours(0, 0, 0, 0)); sEnd = new Date(now.setHours(23, 59, 59, 999));
          } else if (dateRange === 'week') {
            const now = new Date(); sStart = new Date(now); sStart.setDate(now.getDate() - now.getDay()); sStart.setHours(0, 0, 0, 0);
            sEnd = new Date(now); sEnd.setDate(now.getDate() - now.getDay() + 6); sEnd.setHours(23, 59, 59, 999);
          } else if (dateRange === 'month') {
            const now = new Date(); sStart = new Date(now.getFullYear(), now.getMonth(), 1); sEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          }

          const isWithinBounds = (dateVal, allowEmpty = false) => {
            if (!dateVal) return allowEmpty;
            const d = new Date(dateVal);
            if (sStart && d.getTime() < sStart.getTime()) return false;
            if (sEnd && d.getTime() > sEnd.getTime()) return false;
            return true;
          };

          const sAtt = allAtt.filter(a => a.StudentRegistrationID === s.RegistrationID && isWithinBounds(a.Date)).sort((a, b) => new Date(a.Date) - new Date(b.Date));
          const presentCount = sAtt.filter(a => ['Present', 'WFH', 'OD'].includes(a.Status)).length;
          const sDiary = allDiary.filter(d => d.StudentRegistrationID === s.RegistrationID && isWithinBounds(d.Date)).sort((a, b) => new Date(a.Date) - new Date(b.Date));

          const cleanStr = (str) => String(str || '').replace(/\s+/g, '').toLowerCase();
          const sBatchClean = cleanStr(s.Batch);
          const sRegClean = cleanStr(s.RegistrationID);

          const sTas = allTasks.filter(t => (
            cleanStr(t.StudentRegistrationID) === sRegClean ||
            cleanStr(t.RegistrationID) === sRegClean ||
            (sBatchClean && (
              cleanStr(t.Target) === sBatchClean ||
              cleanStr(t.BatchName) === sBatchClean ||
              cleanStr(t.Batch) === sBatchClean ||
              cleanStr(t.TargetBatch) === sBatchClean
            ))
          ));
          const sPro = allProj.filter(p => (
            cleanStr(p.StudentRegistrationID) === sRegClean ||
            cleanStr(p.RegistrationID) === sRegClean ||
            (sBatchClean && (
              cleanStr(p.BatchName) === sBatchClean ||
              cleanStr(p.Batch) === sBatchClean ||
              cleanStr(p.Target) === sBatchClean ||
              cleanStr(p.TargetBatch) === sBatchClean
            ))
          ));

          reportDataHtml += `<div style="page-break-before: ${ix > 0 ? 'always' : 'auto'}; margin-top: 30px;">
                  <div style="background: #0056b3; color: white; padding: 10px 15px; font-weight: bold; border-radius: 5px; font-size: 16px;">
                     <i class="fas fa-user-graduate me-2"></i> ${s.FirstName} ${s.LastName} [${s.RegistrationID}]
                  </div>`;

          if (['completeStudentReport', 'internHistoryReport'].includes(reportType)) {
            reportDataHtml += `
                  <div style="margin-top: 20px;">
                     <h4 style="border-bottom: 1px solid #ddd; color: #0056b3; padding-bottom: 4px; margin-bottom: 15px;"><i class="fas fa-id-card"></i> 1. Detailed Portfolio & Biodata</h4>
                     <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #ddd;">
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa; width: 25%;">Full Name</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.FirstName + ' ' + s.LastName)}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa; width: 25%;">Registration ID</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.RegistrationID)}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Institution</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.CollegeName)}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Department</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.Department)}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Register No</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.RegisterNumber)}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Contact</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.MobileNumber)}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Email ID</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.GmailID)}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Gender</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.Gender || s.Sex)}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Date of Birth</td><td style="padding: 8px; border: 1px solid #ddd;">${formatDateDisplay(s.DateofBirth)}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Academic Scope</td><td style="padding: 8px; border: 1px solid #ddd;">Year: ${checkEmpty(s.Year)} / Sem: ${checkEmpty(s.Semester)}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Home Address</td><td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.Address)}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">District / Pincode</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.District)} / ${checkEmpty(s.Pincode)}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Batch</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.Batch)}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Project / Task Title</td><td colspan="3" style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #0056b3;">${checkEmpty(s.ProjectTitle)}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Internship Period</td><td style="padding: 8px; border: 1px solid #ddd;">${formatDateDisplay(s.InternshipStartDate)} to ${formatDateDisplay(s.InternshipEndDate) || 'Ongoing'}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Duration Days</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.DurationDays || (s.InternshipEndDate && s.InternshipStartDate ? Math.abs(Math.round((new Date(s.InternshipEndDate) - new Date(s.InternshipStartDate)) / (1000 * 60 * 60 * 24))) + ' Days' : ''))}</td></tr>
                         <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">Application Date</td><td style="padding: 8px; border: 1px solid #ddd;">${formatDateDisplay(s.Timestamp || s.ApplicationDate)}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8f9fa;">RFID Allocation</td><td style="padding: 8px; border: 1px solid #ddd;">${checkEmpty(s.RFID ? s.RFID : 'Not Assigned')}</td></tr>
                     </table>
                  </div>`;
          }

          if (['attendance', 'completeAttendanceReport', 'attendanceSheet', 'consolidatedAttendance', 'internHistoryReport'].includes(reportType)) {
            reportDataHtml += `
                  <div style="margin-top: 20px;">
                     <h4 style="border-bottom: 2px solid #ddd; color: #0056b3; padding-bottom: 8px; margin-bottom: 12px; font-size: 16px;"><i class="fas fa-calendar-check me-2"></i> Attendance & Punctuality Sheet <span style="float: right; font-size: 12px; color: #666;">Generated on: ${formatDateDisplay(new Date())}</span></h4>`;
            if (!sStart || !sEnd) {
              reportDataHtml += `<div style="padding: 15px; border: 1px dashed #ef9a9a; background: #fffafb; color: #c62828; text-align: center;">Invalid Internship Dates Found.</div>`;
            } else {
              reportDataHtml += `<table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #dee2e6; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                         <tr style="background:#f8f9fa; color: #333; font-weight: bold;"><th style="padding: 10px 8px; border: 1px solid #dee2e6; text-align:left;">Date</th><th style="padding: 10px 8px; border: 1px solid #dee2e6; text-align:left;">Status</th><th style="padding: 10px 8px; border: 1px solid #dee2e6; text-align:left;">In Time</th><th style="padding: 10px 8px; border: 1px solid #dee2e6; text-align:left;">Out Time</th><th style="padding: 10px 8px; border: 1px solid #dee2e6; text-align:left;">Location/Remarks</th></tr>`;
              let iterDate = new Date(sStart);
              while (iterDate <= sEnd) {
                const dateStr = formatDateDisplay(iterDate);
                const dayRecord = sAtt.find(a => formatDateDisplay(a.Date) === dateStr);
                if (dayRecord) {
                  const sCol = ['Present', 'WFH', 'OD'].includes(dayRecord.Status) ? '#2e7d32' : '#d32f2f';
                  reportDataHtml += `<tr><td style="padding: 8px; border: 1px solid #dee2e6;">${dateStr}</td><td style="padding: 8px; border: 1px solid #dee2e6; font-weight:bold; color:${sCol};">${dayRecord.Status}</td><td style="padding: 8px; border: 1px solid #dee2e6;">${dayRecord.InTime || '--'}</td><td style="padding: 8px; border: 1px solid #dee2e6;">${dayRecord.OutTime || '--'}</td><td style="padding: 8px; border: 1px solid #dee2e6;">${dayRecord.WorkArea || dayRecord.Remarks || '-'}</td></tr>`;
                } else {
                  reportDataHtml += `<tr style="background:#fff;"><td style="padding: 8px; border: 1px solid #dee2e6; color:#999;">${dateStr}</td><td style="padding: 8px; border: 1px solid #dee2e6; color:#aaa;">No Entry</td><td style="padding: 8px; border: 1px solid #dee2e6; color:#aaa;">--</td><td style="padding: 8px; border: 1px solid #dee2e6; color:#aaa;">--</td><td style="padding: 8px; border: 1px solid #dee2e6; color:#aaa;">-</td></tr>`;
                }
                iterDate.setDate(iterDate.getDate() + 1);
              }
              reportDataHtml += `</table>`;

              // Small summary for attendance
              const tot = sAtt.length;
              const pres = sAtt.filter(a => ['Present', 'WFH', 'OD'].includes(a.Status)).length;
              const perc = tot > 0 ? Math.round((pres / tot) * 100) : 0;
              reportDataHtml += `<div style="margin-top: 10px; font-size: 11px; text-align: right; font-weight: bold; color: #555;">Attendance Score: ${perc}% (${pres}/${tot} Days Recorded)</div>`;
            }
            reportDataHtml += `</div>`;
          }

          if (['studentDiary', 'dailyLogForm5', 'consolidatedAttendance', 'internHistoryReport'].includes(reportType)) {
            reportDataHtml += `<div style="margin-top: 25px;"><h4 style="border-bottom: 2px solid #ddd; color: #0056b3; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;"><i class="fas fa-book-open me-2"></i> Daily Work Log (Form 5)</h4>`;
            if (sDiary.length === 0) {
              reportDataHtml += `<div style="padding: 20px; color: #888; font-style: italic; background: #fdfdfd; border: 1px dashed #ccc; text-align: center; border-radius: 8px;">No diary entries discovered for the selected period constraint.</div>`;
            } else {
              sDiary.forEach(d => {
                reportDataHtml += `<div style="border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 12px; border-radius: 8px; page-break-inside: avoid; background: white;">
                             <div style="font-weight: bold; margin-bottom: 8px; color: #333; display: flex; justify-content: space-between; border-bottom: 1px solid #f1f1f1; padding-bottom: 5px;">
                                <span><i class="far fa-calendar-alt me-1 text-primary"></i> ${formatDateDisplay(d.Date)}</span>
                                <span style="font-size: 10px; color:${d.Status === 'Approved' ? '#2e7d32' : '#f39c12'}; background: ${d.Status === 'Approved' ? '#e8f5e9' : '#fff3e0'}; padding: 2px 8px; border-radius: 12px;">${d.Status}</span>
                             </div>
                             <div style="font-size: 12px; color: #444; line-height: 1.6; white-space: pre-wrap;">${d.Content}</div>
                          </div>`;
              });
            }
            reportDataHtml += `</div>`;
          }

          const showTasks = ['taskCompletion', 'taskProjectSummary', 'consolidatedAttendance', 'internHistoryReport', 'completeStudentReport'].includes(reportType);
          const showProjects = ['projectCompletion', 'taskProjectSummary', 'consolidatedAttendance', 'internHistoryReport', 'completeStudentReport'].includes(reportType);

          if (showTasks || showProjects) {
            reportDataHtml += `<div style="margin-top: 25px;">`;

            if (showTasks && showProjects) {
              reportDataHtml += `<h4 style="border-bottom: 2px solid #ddd; color: #0056b3; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;"><i class="fas fa-tasks me-2"></i> Tasks & Project Execution Summary</h4>`;
            } else if (showTasks) {
              reportDataHtml += `<h4 style="border-bottom: 2px solid #ddd; color: #0056b3; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;"><i class="fas fa-tasks me-2"></i> Complete Task Performance Record</h4>`;
            } else {
              reportDataHtml += `<h4 style="border-bottom: 2px solid #ddd; color: #0056b3; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;"><i class="fas fa-project-diagram me-2"></i> Authorized Project Contributions</h4>`;
            }

            // Tasks Sub-section
            if (showTasks) {
              reportDataHtml += `<div style="margin-bottom: 20px;">`;
              if (showTasks && showProjects) reportDataHtml += `<h5 style="color: #555; font-size: 13px; margin-bottom: 10px; text-transform: uppercase; font-weight: 800; border-left: 4px solid #4361ee; padding-left: 10px;">A. Assigned Tasks</h5>`;

              if (sTas.length === 0) {
                reportDataHtml += `<p style="font-size: 11px; color: #888; font-style: italic;">No tasks allocated to this profile.</p>`;
              } else {
                reportDataHtml += `<table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #eee;">
                             <tr style="background:#f1f3f5;">
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">S.No</th>
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">Task Title</th>
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">Assigned Date</th>
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">Due / Deadline</th>
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">Completion Status</th>
                             </tr>
                             ${sTas.map((t, idx) => {
                  let daysStr = '';
                  if (t.DueDate && t.AssignedDate) {
                    let ms = new Date(t.DueDate) - new Date(t.AssignedDate);
                    let days = Math.round(ms / (1000 * 60 * 60 * 24));
                    daysStr = ` (${days} Days)`;
                  }
                  return `<tr>
                                   <td style="padding: 8px; border: 1px solid #eee;">${idx + 1}</td>
                                   <td style="padding: 8px; border: 1px solid #eee;"><strong>${t.Title}</strong> <span style="font-size:7.5px; color:#888;">[ID: ${t.TaskID || t.HistoryID || 'N/A'}]</span><br/><span style="font-size:8.5px; color:#555; font-weight:normal;">${t.Description || 'No description provided.'}</span></td>
                                   <td style="padding: 8px; border: 1px solid #eee;">${formatDateDisplay(t.AssignedDate)}</td>
                                   <td style="padding: 8px; border: 1px solid #eee;">${t.DueDate ? formatDateDisplay(t.DueDate) + daysStr : 'N/A'}</td>
                                   <td style="padding: 8px; border: 1px solid #eee;"><span style="color: ${t.Status && t.Status.toLowerCase().includes('complet') ? 'green' : '#f39c12'}">${t.Status || 'Pending'}</span></td>
                                </tr>`;
                }).join('')}
                          </table>`;
              }
              reportDataHtml += `</div>`;
            }

            // Projects Sub-section
            if (showProjects) {
              reportDataHtml += `<div>`;
              if (showTasks && showProjects) reportDataHtml += `<h5 style="color: #555; font-size: 13px; margin-bottom: 10px; text-transform: uppercase; font-weight: 800; border-left: 4px solid #4895ef; padding-left: 10px;">B. Project Contributions</h5>`;

              if (sPro.length === 0) {
                reportDataHtml += `<p style="font-size: 11px; color: #888; font-style: italic;">No project records found.</p>`;
              } else {
                reportDataHtml += `<table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #eee;">
                             <tr style="background:#f1f3f5;">
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">S.No</th>
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">Project Title</th>
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">Phase Period</th>
                                <th style="padding: 8px; border: 1px solid #eee; text-align: left;">Outcome Status</th>
                             </tr>
                             ${sPro.map((p, idx) => `
                                <tr>
                                   <td style="padding: 8px; border: 1px solid #eee;">${idx + 1}</td>
                                   <td style="padding: 8px; border: 1px solid #eee;"><strong>${p.Title}</strong> <span style="font-size:7.5px; color:#888;">[ID: ${p.ProjectID || p.HistoryID || 'N/A'}]</span><br/><span style="font-size:8.5px; color:#555; font-weight:normal;">${p.Description || 'No description provided.'}</span></td>
                                   <td style="padding: 8px; border: 1px solid #eee;">${formatDateDisplay(p.StartDate)} to ${formatDateDisplay(p.EndDate) || 'Ongoing Due'}</td>
                                   <td style="padding: 8px; border: 1px solid #eee;"><span style="color: ${p.Status && p.Status.toLowerCase().includes('complet') ? 'green' : '#f39c12'}">${p.Status || 'Active Phase'}</span></td>
                                </tr>
                             `).join('')}
                          </table>`;
              }
              reportDataHtml += `</div>`;
            }

            reportDataHtml += `</div>`;
          }

          reportDataHtml += `</div>`; // Close student profile block
        });
        handled = true;
      } else {
        // generic info block for other report types if they reach here and have students
        reportDataHtml += `<h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px; color: #333; margin-top: 30px;">Deep Analytics Data Presentation</h3>
          <div style="padding: 20px; text-align: center; color: #666; background-color: #fafafa; border-radius: 8px; margin-top: 15px; border: 1px solid #eee;">
            <div style="font-size: 30px; margin-bottom: 10px; color: #4361ee;"><i class="fas fa-database"></i></div>
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">Successfully extracted ${targetStudents.length} profile(s).</div>
            <div style="font-size: 12px; color: #888;">Detailed Analytics Layout for '${title}' utilizes underlying generic dataset framework based on standard configuration templates.</div>
          </div>`;
        handled = true;
      }
    }

    if (!handled && targetStudents.length === 0) {
      reportDataHtml += `<div style="padding: 40px 20px; border: 2px dashed #ffcdd2; text-align: center; color: #c62828; background-color: #fffafb; border-radius: 8px; margin-top: 15px;">
             <div style="font-size: 40px; margin-bottom: 15px;"><i class="fas fa-folder-open"></i></div>
             <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">NO MATCHING ENTRIES FOUND</div>
             <div style="font-size: 14px; max-width: 500px; margin: 0 auto;">The system attempted to generate the report based on your specific scope and date parameters, but the data sheet yielded absolutely zero valid records.</div>
          </div>`;
    }


    const signatureHtml = options.includeSignatures ? `
      <table style="width: 100%; margin-top: 60px; page-break-inside: avoid; border-collapse: collapse;">
        <tr>
          <td style="width: 33%; text-align: center; vertical-align: bottom;">
            <div style="border-bottom: 1px solid #000; height: 50px; width: 80%; margin: 0 auto;"></div>
            <div style="margin-top: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Student Signature</div>
            <div style="font-size: 9px; color: #666;">Profile Owner</div>
          </td>
          <td style="width: 34%; text-align: center; vertical-align: bottom;">
            <div style="border-bottom: 1px solid #000; height: 50px; width: 80%; margin: 0 auto;"></div>
            <div style="margin-top: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Supervisor</div>
            <div style="font-size: 9px; color: #666;">Generated By Auto-Engine</div>
          </td>
          <td style="width: 33%; text-align: center; vertical-align: bottom;">
            <div style="border-bottom: 1px solid #000; height: 50px; width: 80%; margin: 0 auto;"></div>
            <div style="margin-top: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Chief Engineer / Proprietor</div>
            <div style="font-size: 9px; color: #666;">G.S.V Electrical Enterprises</div>
          </td>
        </tr>
      </table>
    ` : '';

    // GSV Branding Header HTML 
    const gsvHeader = options.includeHeader ? `
      <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 4px double #00838f;">
        <div style="font-size: 16px; font-weight: bold; color: #000; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px;">Official Evaluation, Records & Auditing</div>
        <div style="font-size: 28px; font-weight: 900; margin: 5px 0; color: #d32f2f; font-family: 'Arial Black', sans-serif;">G.S.V ELECTRICAL ENTERPRISES</div>
        <div style="font-size: 14px; font-weight: bold; color: #333; text-transform: uppercase; letter-spacing: 1px;">Electrical Engineers & Contractors</div>
        ${options.includeCompanyDetails ? `<div style="font-size: 11px; color: #555; margin-top: 10px; line-height: 1.4;">Head Office: New No 51/1 Old No 20/1 Teeds garden 1st Street Sembiyam, perambur, Chennai-11<br>Email: g.s.velectricalenterprises2018@gmail.com | Portal Interface Systems Audit Engine</div>` : ''}
      </div>
    ` : `<h2 style="text-align: center; color: #333; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px; text-transform: uppercase;">Internal Management Systems Report</h2>`;

    const html = `
      <html>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          @page { size: A4 portrait; margin: 20mm 15mm 25mm 15mm; }
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #222; }
          .report-title { font-size: 20px; color: #0056b3; margin-bottom: 25px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 1.5px; background-color: #f1f3f5; padding: 10px; border-radius: 5px; border-left: 5px solid #0056b3;}
          .report-footer { margin-top: 30px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        ${options.generatorType === 'studentPortal' ? `<div style="position: fixed; top: 300px; left: -100px; width: 100%; height: 100%; z-index: -100; transform: rotate(-45deg); font-size: 55px; font-weight: bold; color: rgba(180, 180, 180, 0.12); pointer-events: none; text-align: center; white-space: nowrap;">GENERATED ON STUDENT PORTAL</div>` : ''}
        <div style="position: absolute; top: 0; right: 0; font-size: 8px; color: #aaa;">SYS-REP-${Math.floor(Math.random() * 900000) + 100000}</div>
        ${gsvHeader}
        <div class="report-title">${title} <span style="font-size: 12px; float:right; line-height: 25px; font-weight: normal; color: #666;"><i class="fas fa-fingerprint"></i> SYS-REP-${Date.now().toString().substr(-6)}</span></div>
        
        <div style="min-height: 400px; background: url('https://www.transparenttextures.com/patterns/cubes.png'); box-shadow: inset 0 0 50px rgba(0,0,0,0.02); padding-bottom: 30px;">
           ${reportDataHtml}
        </div>
        
        ${signatureHtml}
        
        ${options.includeTimestamp ? `<div style="margin-top: 40px; font-size: 10px; color: #666; text-align: right;"><strong>Digital Output Timestamp:</strong> ${formatDateDisplay(new Date())} - ${new Date().toLocaleTimeString()}</div>` : ''}
        
        <div class="report-footer">
           GSV Master Internship Resource Management Engine &copy; ${new Date().getFullYear()} - Auto-Generated Confidential Report Document
        </div>
      </body>
      </html>
    `;

    const blob = HtmlService.createHtmlOutput(html).getAs('application/pdf');
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    blob.setName(`Report_${safeTitle}_${Date.now()}.pdf`);

    // Save to Drive
    const folder = DriveApp.getFolderById(getSystemFolderId('uploads'));
    const file = folder.createFile(blob);

    // Record generated document if we want to store it systematically
    const docSheet = getSheet(SHEET_NAMES.GENERATED_DOCUMENTS);
    if (docSheet) {
      docSheet.appendRow([
        generateUniqueId('DOC', docSheet, 0),
        options.studentId || 'ADMIN_GEN',
        reportType,
        'REF-' + Date.now(),
        file.getUrl(),
        file.getId(),
        new Date(),
        sendEmail ? 'Yes' : 'No'
      ]);
    }

    // If it's a student-specific document, also save to File Manager for transparency
    if (options.studentId && options.studentId !== 'ADMIN_GEN') {
      const fmSheet = getSheet(SHEET_NAMES.FILE_MANAGER);
      if (fmSheet) {
        fmSheet.appendRow([
          file.getId(),
          options.studentId,
          blob.getName(),
          file.getUrl(),
          reportType,
          new Date(),
          file.getSize(),
          'Active'
        ]);
      }
    }

    // Log Activity
    logActivity('Advanced Report Generated', `Type: ${reportType}, Scope: ${scope}`);

    return {
      status: 'success',
      fileId: file.getId(),
      url: file.getUrl(),
      message: 'Systems Report Analysis PDF generated reliably.'
    };
  } catch (e) {
    Logger.log("Error in generateReport: " + e.toString() + " | Stack: " + e.stack);
    return { status: 'error', message: "Report Engine Processing Failure: " + e.toString() + " | Stack: " + e.stack };
  }
}

// =========================================================================
// NEW ATTENDANCE & SLOTS ENGINE
// =========================================================================

function getTodayStr() {
  const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
  return Utilities.formatDate(new Date(), zone, "yyyy-MM-dd");
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  var match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  var hrs = parseInt(match[1]);
  var mins = parseInt(match[2]);
  var ampm = match[3] ? match[3].toUpperCase() : '';
  if (ampm === 'PM' && hrs < 12) hrs += 12;
  if (ampm === 'AM' && hrs === 12) hrs = 0;
  return hrs * 60 + mins;
}

function getSlotTiming(batchId, targetDateStr, regId = '') {
  try {
    const defaultStart = "09:00 AM", defaultEnd = "05:00 PM";
    const fallback = { start: defaultStart, end: defaultEnd, lateAfter: defaultStart, earlyBefore: defaultEnd, rfidEnabled: false, graceLate: 0, graceEarly: 0, enabled: true, mode: 'manual', source: 'fallback' };
    const clean = (v) => String(v || '').replace(/^'/, '');
    const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
    const today = targetDateStr || Utilities.formatDate(new Date(), zone, "yyyy-MM-dd");

    batchId = String(batchId || '').trim();
    regId = String(regId || '').trim();

    // Helper to check validity of a slot_settings entry
    const isSlotValid = (slot) => {
      if (!slot) return false;
      const timingEnabled = (String(slot.enabled).toLowerCase() === 'true' || slot.enabled === true);
      const rfidEnabled = (String(slot.rfid_enabled).toLowerCase() === 'true' || slot.rfid_enabled === true);
      if (!timingEnabled && !rfidEnabled) return false;

      const validityDays = parseInt(slot.validity_days);
      if (validityDays > 0 && slot.created_at) {
        try {
          const createdDate = new Date(slot.created_at);
          const expiryDate = new Date(createdDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
          if (new Date() > expiryDate) return false; // Expired
        } catch (e) { }
      }
      return true;
    };

    const buildResult = (slot, source) => {
      const isRfid = (String(slot.rfid_enabled).toLowerCase() === 'true' || slot.rfid_enabled === true);
      const isTiming = (String(slot.enabled).toLowerCase() === 'true' || slot.enabled === true);
      const graceLateMin = parseInt(slot.rfid_grace_late) || 0;
      const graceEarlyMin = parseInt(slot.rfid_grace_early) || 0;

      let slotMode = 'disabled';
      if (isTiming && isRfid) slotMode = 'both';
      else if (!isTiming && isRfid) slotMode = 'rfid_only';
      else if (isTiming && !isRfid) slotMode = 'manual_only';

      return {
        start: clean(slot.start_time) || defaultStart,
        end: clean(slot.end_time) || defaultEnd,
        lateAfter: clean(slot.late_after) || clean(slot.start_time) || defaultStart,
        earlyBefore: clean(slot.early_exit_before) || clean(slot.end_time) || defaultEnd,
        rfidEnabled: isRfid,
        manualEnabled: isTiming,
        graceLate: graceLateMin,
        graceEarly: graceEarlyMin,
        enabled: isTiming || isRfid,
        mode: slotMode,
        source: source,
        type: String(slot.type || 'DEFAULT').toUpperCase()
      };
    };

    const defaultPriorityOrder = [
      'BATCH_EXCEPTION', // Batch Management Exception
      'BATCH_SLOT',      // Batch Management Slot
      'SPECIAL',         // Special Exemption from Slot Settings
      'STUDENT',         // Student wise from Slot Settings
      'BATCH',           // Batch wise from Slot Settings
      'DEFAULT'          // Default System from Slot Settings
    ];
    let priorityOrder = defaultPriorityOrder;
    try {
      const p = PropertiesService.getScriptProperties().getProperty('SLOT_PRIORITY');
      if (p) priorityOrder = JSON.parse(p);
    } catch (e) { }

    // Evaluate configurations based on Priority Order
    for (const pLevel of priorityOrder) {
      if (pLevel === 'BATCH_SLOT' && batchId) {
        try {
          const slotsSheet = getSheet(SHEET_NAMES.SLOTS);
          if (slotsSheet) {
            const normBid = String(batchId || '').replace(/\s+/g, '').toUpperCase();
            const batchSlots = getSheetDataAsObjects(slotsSheet).filter(s => {
              const active = String(s.Status || '').trim().toLowerCase() === 'active';
              if (!active) return false;
              // Resolve raw BatchID (could be ID or name) to normalized human name
              const resolvedName = resolveBatchNameToName(s.BatchID);
              const normResolved = String(resolvedName || '').replace(/\s+/g, '').toUpperCase();
              const sTarget = String(s.Label || s.BatchID || '').replace(/\s+/g, '').toUpperCase();
              return (normResolved === normBid || sTarget === normBid);
            });
            if (batchSlots.length > 0) {
              const slot = batchSlots[0];
              return {
                start: clean(slot.StartTime) || defaultStart, end: clean(slot.EndTime) || defaultEnd,
                lateAfter: clean(slot.StartTime) || defaultStart, earlyBefore: clean(slot.EndTime) || defaultEnd,
                rfidEnabled: true, manualEnabled: true, graceLate: 60, graceEarly: 60, enabled: true, mode: 'both', source: 'batch_slot',
                type: 'BATCH_LEGACY_SLOT'
              };
            }
          }
        } catch (e) { }
      }
      else if (pLevel === 'BATCH_EXCEPTION' && batchId) {
        try {
          const excSheet = getSheet(SHEET_NAMES.SLOT_EXCEPTIONS);
          if (excSheet) {
            const normBid = String(batchId || '').replace(/\s+/g, '').toUpperCase();
            const exceptions = getSheetDataAsObjects(excSheet).filter(e => {
              const active = String(e.Status || '').trim().toLowerCase() === 'active';
              let targetDateStr = '';
              if (e.TargetDate instanceof Date) {
                targetDateStr = Utilities.formatDate(e.TargetDate, zone, "yyyy-MM-dd");
              } else if (e.TargetDate) {
                targetDateStr = String(e.TargetDate).trim();
                const match = targetDateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                if (match) {
                  const day = match[1].padStart(2, '0');
                  const month = match[2].padStart(2, '0');
                  const year = match[3];
                  targetDateStr = `${year}-${month}-${day}`;
                }
              }
              const isToday = targetDateStr === today;
              if (!active || !isToday) return false;
              const resolvedName = resolveBatchNameToName(e.BatchID);
              const normResolved = String(resolvedName || '').replace(/\s+/g, '').toUpperCase();
              return normResolved === normBid || String(e.BatchID || '').replace(/\s+/g, '').toUpperCase() === normBid;
            });
            if (exceptions.length > 0) {
              const exc = exceptions[0];
              return {
                start: clean(exc.StartTime || exc.TempStart) || defaultStart, end: clean(exc.EndTime || exc.TempEnd) || defaultEnd,
                lateAfter: clean(exc.StartTime || exc.TempStart) || defaultStart, earlyBefore: clean(exc.EndTime || exc.TempEnd) || defaultEnd,
                rfidEnabled: true, manualEnabled: true, graceLate: 60, graceEarly: 60, enabled: true, mode: 'both', source: 'batch_exception',
                type: 'BATCH_LEGACY_EXCEPTION'
              };
            }
          }
        } catch (e) { }
      }
      else {
        // Evaluate from Slot Settings sheet
        const settingsSheet = getSheet(SHEET_NAMES.SLOT_SETTINGS);
        if (settingsSheet) {
          const settings = getSheetDataAsObjects(settingsSheet) || [];
          const validSettings = settings.filter(s => isSlotValid(s));

          if (pLevel === 'SPECIAL') {
            const normRegId = String(regId || '').replace(/\s+/g, '').toUpperCase();
            const normBatchId = String(batchId || '').replace(/\s+/g, '').toUpperCase();
            
            const specS = regId ? validSettings.find(s => {
              const sType = String(s.type || '').toUpperCase();
              const sTarget = String(s.applicable_target || '').replace(/\s+/g, '').toUpperCase();
              return sType === 'SPECIAL' && sTarget === normRegId;
            }) : null;
            if (specS) return buildResult(specS, 'special_student');
            
            const specB = batchId ? validSettings.find(s => {
              const sType = String(s.type || '').toUpperCase();
              const sTarget = String(s.applicable_target || '').replace(/\s+/g, '').toUpperCase();
              return sType === 'SPECIAL' && sTarget === normBatchId;
            }) : null;
            if (specB) return buildResult(specB, 'special_batch');
          }
          else if (pLevel === 'STUDENT' && regId) {
            const normRegId = String(regId || '').replace(/\s+/g, '').toUpperCase();
            const p4 = validSettings.find(s => {
              const sType = String(s.type || '').toUpperCase();
              const sTarget = String(s.applicable_target || '').replace(/\s+/g, '').toUpperCase();
              return sType === 'STUDENT' && sTarget === normRegId;
            });
            if (p4) return buildResult(p4, 'student_slot');
          }
          else if (pLevel === 'BATCH' && batchId) {
            const normBid = String(batchId).replace(/\s+/g, '').toUpperCase();
            const p5 = validSettings.find(s => {
              const sType = String(s.type || s.Type || '').toUpperCase();
              const sBatch = String(s.batch || s.Batch || '').replace(/\s+/g, '').toUpperCase();
              const sTarget = String(s.applicable_target || s.ApplicableTarget || '').replace(/\s+/g, '').toUpperCase();
              return sType === 'BATCH' && (sBatch === normBid || sTarget === normBid);
            });
            if (p5) return buildResult(p5, 'batch_settings');
          }
          else if (pLevel === 'DEFAULT') {
            const p6 = validSettings.find(s => String(s.type).toUpperCase() === 'DEFAULT');
            if (p6) return buildResult(p6, 'default');
          }
        }
      }
    }

    return fallback;
  } catch (e) {
    Logger.log('getSlotTiming error: ' + e.toString());
    return { start: "09:00 AM", end: "05:00 PM", lateAfter: "09:00 AM", earlyBefore: "05:00 PM", rfidEnabled: false, manualEnabled: true, graceLate: 0, graceEarly: 0, mode: 'manual_only', source: 'error_fallback' };
  }
}

function getCurrentStudentStatus(regId) {
  try {
    const attendanceSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const data = getSheetDataAsObjects(attendanceSheet);
    const today = getTodayStr();

    const todayRecords = data.filter(r => r.StudentRegistrationID === regId && r.Date === today);
    if (todayRecords.length > 0) {
      return { status: 'success', record: todayRecords[todayRecords.length - 1] };
    }
    return { status: 'success', record: null };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function recordWebCheckin(regId) {
  try {
    const current = getCurrentStudentStatus(regId);
    if (current.record && current.record.InTime) return { status: 'error', message: 'Already checked in today.' };

    const studentInfo = getStudentFullData(regId);
    if (studentInfo.status !== 'success') return studentInfo;

    // 1. Check if portal is active
    const appStatus = String(studentInfo.studentData.ApplicationStatus || '').trim().toLowerCase();
    const status = String(studentInfo.studentData.Status || '').trim().toLowerCase();
    const isActive = (appStatus === 'approved' || appStatus === 'active' || status === 'approved' || status === 'active');
    
    if (!isActive) {
      return { 
        status: 'error', 
        message: 'Your portal is not active, please activate it.' 
      };
    }

    // 2. Check if mandatory documents are uploaded
    const docs = [studentInfo.studentData.BonafideUrl, studentInfo.studentData.DeclarationUrl, studentInfo.studentData.CollegeIdUrl];
    const isDocsComplete = docs.every(d => d && String(d).trim() !== '');
    if (!isDocsComplete) {
      return { 
        status: 'error', 
        message: 'Please upload all required documents (Bonafide, Declaration, College ID) to mark attendance.' 
      };
    }

    const batchId = studentInfo.studentData.Batch || '';
    const today = getTodayStr();

    // Internship Period validation
    const sdRaw = studentInfo.studentData.InternshipStartDate || studentInfo.studentData.rawInternshipStart;
    const edRaw = studentInfo.studentData.InternshipEndDate || studentInfo.studentData.rawInternshipEnd;
    const sd = sdRaw ? new Date(sdRaw) : null;
    const ed = edRaw ? new Date(edRaw) : null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (sd && now < new Date(sd).setHours(0, 0, 0, 0)) {
      return { status: 'error', message: `Internship has not started yet. (Start: ${formatDateSafe(sdRaw)})` };
    }
    if (ed && now > new Date(ed).setHours(0, 0, 0, 0)) {
      return { status: 'error', message: 'Internship period has expired.' };
    }

    const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
    const nowStr = Utilities.formatDate(new Date(), zone, "hh:mm a");

    // Check against timing slots
    const slot = getSlotTiming(batchId, today, regId);

    if (slot.mode === 'rfid_only' || slot.mode === 'disabled') {
      return { status: 'error', message: 'Web check-in is not permitted. Please use RFID.' };
    }

    const nowMins = timeToMinutes(nowStr);
    const slotStartMins = timeToMinutes(slot.start);
    const checkinWindow = slot.graceLate > 0 ? parseInt(slot.graceLate) : 60;

    // Checkin limits
    if (nowMins > (slotStartMins + checkinWindow)) {
      return { status: 'error', message: 'Slot Timing Over' };
    }
    if (nowMins < (slotStartMins - checkinWindow)) {
      return { status: 'error', message: 'Too Early' };
    }

    const lateMins = timeToMinutes(slot.lateAfter);

    let attendanceStatus = 'Present';
    let lateFlag = false;

    if (nowMins > lateMins) {
      attendanceStatus = 'Late with Present';
      lateFlag = true;
    }

    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    appendObjectToSheet(sheet, {
      AttendanceID: "ATT_" + Date.now(),
      StudentRegistrationID: regId,
      StudentName: `${studentInfo.studentData.FirstName} ${studentInfo.studentData.LastName}`,
      Date: today,
      Status: attendanceStatus,
      InTime: nowStr,
      OutTime: "",
      EntryMode: "Web",
      checkin_source: "WEB",
      late_flag: lateFlag,
      Timestamp: new Date().toISOString()
    });

    return { status: 'success', message: `Checked in successfully as ${attendanceStatus}.`, slot: slot };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function recordWebCheckout(regId) {
  try {
    const current = getCurrentStudentStatus(regId);
    if (!current.record || !current.record.InTime) return { status: 'error', message: 'Not checked in today.' };
    if (current.record.OutTime) return { status: 'error', message: 'Already checked out today.' };

    const studentInfo = getStudentFullData(regId);
    if (studentInfo.status !== 'success') return studentInfo;

    // 1. Check if portal is active
    const appStatus = String(studentInfo.studentData.ApplicationStatus || '').trim().toLowerCase();
    const status = String(studentInfo.studentData.Status || '').trim().toLowerCase();
    const isActive = (appStatus === 'approved' || appStatus === 'active' || status === 'approved' || status === 'active');
    
    if (!isActive) {
      return { 
        status: 'error', 
        message: 'Your portal is not active, please activate it.' 
      };
    }

    // 2. Check if mandatory documents are uploaded
    const docs = [studentInfo.studentData.BonafideUrl, studentInfo.studentData.DeclarationUrl, studentInfo.studentData.CollegeIdUrl];
    const isDocsComplete = docs.every(d => d && String(d).trim() !== '');
    if (!isDocsComplete) {
      return { 
        status: 'error', 
        message: 'Please upload all required documents (Bonafide, Declaration, College ID) to mark attendance.' 
      };
    }

    const batchId = studentInfo.studentData.Batch || '';
    const today = getTodayStr();
    const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
    const nowStr = Utilities.formatDate(new Date(), zone, "hh:mm a");

    const slot = getSlotTiming(batchId, today, regId);

    if (slot.mode === 'rfid_only' || slot.mode === 'disabled') {
      return { status: 'error', message: 'Manual web interaction is disabled for your active slot rule.' };
    }

    const nowMins = timeToMinutes(nowStr);
    const slotEndMins = timeToMinutes(slot.end);
    const checkoutWindow = slot.graceEarly > 0 ? parseInt(slot.graceEarly) : 60;
    const earlyMins = slotEndMins - checkoutWindow;

    if (nowMins < earlyMins) {
      return { status: 'early_exit_required', message: 'Checkout time is before early exit limit. Requires early exit request.' };
    }

    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    updateObjectInSheet(sheet, "AttendanceID", current.record.AttendanceID, {
      OutTime: nowStr
    });

    return { status: 'success', message: 'Checked out successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function submitAttendanceRequest(regId, type, reason, targetDateStr = null, targetTime = '') {
  try {
    const studentInfo = getStudentFullData(regId);
    if (studentInfo.status !== 'success') return studentInfo;
    const name = `${studentInfo.studentData.FirstName} ${studentInfo.studentData.LastName}`;
    const today = getTodayStr();
    const tDate = targetDateStr || today;

    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_REQUESTS);
    appendObjectToSheet(sheet, {
      RequestID: "REQ_" + Date.now(),
      RegistrationID: regId,
      StudentName: name,
      Type: type,
      Date: tDate,
      TargetTime: targetTime,
      Reason: reason,
      Status: "Pending",
      Timestamp: new Date().toISOString()
    });
    return { status: 'success', message: `${type} request submitted and pending approval.` };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function processAttendanceRequest(requestId, newStatus, adminComment = '') {
  try {
    const reqSheet = getSheet(SHEET_NAMES.ATTENDANCE_REQUESTS);
    const attSheet = getSheet(SHEET_NAMES.ATTENDANCE);
    const requests = getSheetDataAsObjects(reqSheet);
    const req = requests.find(r => r.RequestID === requestId);

    if (!req) return { status: 'error', message: 'Request not found.' };

    if (newStatus === "Delete") {
      deleteObjectFromSheet(reqSheet, "RequestID", requestId);
      return { status: 'success', message: 'Request deleted.' };
    }

    const updateData = { Status: newStatus };
    if (adminComment) updateData.AdminComment = adminComment;
    updateObjectInSheet(reqSheet, "RequestID", requestId, updateData);

    if (newStatus === "Approved" || newStatus === "Approve" || newStatus === "Accepted") {
      const current = getCurrentStudentStatus(req.RegistrationID);
      const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
      const nowStr = Utilities.formatDate(new Date(), zone, "hh:mm a");

      if (req.Type === "EARLY_EXIT" && current.record) {
        updateObjectInSheet(attSheet, "AttendanceID", current.record.AttendanceID, { OutTime: nowStr });
      } else if (req.Type === "FORGOT_CHECKOUT" && current.record) {
        const studentInfo = getStudentFullData(req.RegistrationID);
        const batchId = studentInfo.studentData.Batch || '';
        const slot = getSlotTiming(batchId, getTodayStr());
        updateObjectInSheet(attSheet, "AttendanceID", current.record.AttendanceID, { OutTime: slot.end });
      } else if (req.Type === "PIN_CHECKIN" || req.Type === "MANUAL_CHECKIN") {
        appendObjectToSheet(attSheet, {
          AttendanceID: "ATT_" + Date.now(),
          StudentRegistrationID: req.RegistrationID,
          StudentName: req.StudentName,
          Date: req.Date,
          Status: 'Present',
          InTime: nowStr,
          OutTime: "",
          EntryMode: "Manual",
          checkin_source: "ADMIN_APPROVAL",
          Timestamp: new Date().toISOString()
        });
      } else if (["WFH", "OD", "Medical Leave", "Sick Leave", "Weekly Off", "Emergency Leave"].includes(req.Type)) {
        appendObjectToSheet(attSheet, {
          AttendanceID: "ATT_" + Date.now(),
          StudentRegistrationID: req.RegistrationID,
          StudentName: req.StudentName,
          Date: req.Date || getTodayStr(),
          Status: req.Type,
          InTime: "09:00 AM",
          OutTime: "05:00 PM",
          EntryMode: req.Type,
          checkin_source: "ADMIN_APPROVAL",
          Timestamp: new Date().toISOString()
        });
      }
    }
    return { status: 'success', message: `Request ${newStatus}ed.` };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// Duplicate getStudentAttendanceRequests removed - now using unified version at line 8960

function getAdminAttendanceRequests() {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE_REQUESTS);
    if (!sheet) return { status: 'success', requests: [] };
    const requests = getSheetDataAsObjects(sheet);
    return { status: 'success', requests: requests.filter(r => r.Status === 'Pending') };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function markRfidAttendance(rawUid, typeOverride = null, deviceMac = 'UNKNOWN') {
  try {
    const uid = standardizeRfidFormat(rawUid);
    // ⭐️ Priority 2: Check Device Configuration (Registry)
    const devSheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const devices = getSheetDataAsObjects(devSheet);
    const macClean = deviceMac.replace(/[:\s]/g, '').toUpperCase();
    const registeredDevice = devices.find(d => String(d.MAC_ID || '').replace(/[:\s]/g, '').toUpperCase() === macClean);

    if (!registeredDevice) {
      return { status: 'error', name: 'UNAUTHORIZED', message: 'DEVICE NOT REGISTRY' };
    }

    if (registeredDevice.Status === 'Disabled' || registeredDevice.Status === 'Blocked') {
      return { status: 'error', name: 'BLOCKED', message: 'DEVICE IS DISABLED' };
    }

    // Update Device Activity
    updateDeviceActivity(deviceMac);

    // Find regId in REGISTRATIONS where RFID_TagIDMatch
    const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);
    const regData = getSheetDataAsObjects(regSheet);
    const student = regData.find(s => standardizeRfidFormat(s.RFID_TagID) === uid);

    // Check if UID exists in registered students
    if (!student) {
      const closedSheet = getSheet('Closed and Opt-out');
      if (closedSheet) {
        const closedData = getSheetDataAsObjects(closedSheet);
        const closedStudent = closedData.find(s => standardizeRfidFormat(s.RFID_TagID) === uid);
        if (closedStudent) {
          return { status: 'error', name: 'BLOCKED', message: 'STUDENT BLOCKED (CLOSED/OPTOUT)' };
        }
      }
      // If not in registrations, check the inventory sheet
      const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
      const invData = getSheetDataAsObjects(invSheet);
      const inventoryItem = invData.find(i => standardizeRfidFormat(i.RFID_TagID) === uid);

      if (inventoryItem) {
        return { status: 'error', message: 'IN INVENTORY:NOT ASSIGNED' };
      } else {
        return { status: 'error', message: 'ADD CARD:TO INVENTORY' };
      }
    }

    const regId = student.RegistrationID;

    // 1. Check if portal is active
    const appStatus = String(student.ApplicationStatus || '').trim().toLowerCase();
    const status = String(student.Status || '').trim().toLowerCase();
    const isActive = (appStatus === 'approved' || appStatus === 'active' || status === 'approved' || status === 'active');
    
    if (!isActive) {
      return { 
        status: 'error', 
        name: 'INACTIVE', 
        message: 'Portal Inactive: Please Activate' 
      };
    }

    // 2. Check if mandatory documents are uploaded
    const docs = [student.BonafideUrl, student.DeclarationUrl, student.CollegeIdUrl];
    const isDocsComplete = docs.every(d => d && String(d).trim() !== '');
    if (!isDocsComplete) {
      return { 
        status: 'error', 
        name: 'DOCS_PENDING', 
        message: 'Documents Pending: Upload Docs' 
      };
    }

    const current = getCurrentStudentStatus(regId);

    const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
    const now = new Date();
    const nowStr = Utilities.formatDate(now, zone, "hh:mm a");
    const today = getTodayStr();

    // Determine action: checkin, checkout
    let action = typeOverride;
    if (action === 'rfid_scan' || !action) {
      if (!current.record || !current.record.InTime) {
        action = 'checkin';
      } else if (!current.record.OutTime) {
        action = 'checkout';
      } else {
        return { status: 'error', message: 'Already Done Today' };
      }
    }

    const batchId = student.Batch || '';
    const slot = getSlotTiming(batchId, today, regId);
    const nowMins = timeToMinutes(nowStr);
    const slotStartMins = timeToMinutes(slot.start);
    const slotEndMins = timeToMinutes(slot.end);

    const checkinWindow = slot.graceLate > 0 ? parseInt(slot.graceLate) : 60;
    const checkoutWindow = slot.graceEarly > 0 ? parseInt(slot.graceEarly) : 60;

    if (action === 'checkin') {
      if (current.record && current.record.InTime) {
        return { status: 'success', message: student.FirstName + ': Already IN' };
      }

      // Checkin limits
      if (nowMins > (slotStartMins + checkinWindow)) {
        return { status: 'error', message: 'Slot Timing Over' };
      }
      if (nowMins < (slotStartMins - checkinWindow)) {
        return { status: 'error', message: 'Too Early' };
      }

      // Validate Slot Mode
      if (slot.mode === 'manual_only' || slot.mode === 'disabled') {
        return { status: 'error', message: 'Use Web App' };
      }

      // Determine late status
      let lateMins = timeToMinutes(slot.lateAfter);
      let attendanceStatus = 'Present';
      let lateFlag = false;
      let msg = 'IN-TIME';
      if (nowMins > lateMins) {
        attendanceStatus = 'Late with Present';
        lateFlag = true;
        msg = 'LATE';
      } else if (nowMins < slotStartMins) {
        msg = 'BEFORE-TIME';
      }

      const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
      appendObjectToSheet(sheet, {
        AttendanceID: "ATT_" + Date.now(),
        StudentRegistrationID: regId,
        StudentName: `${student.FirstName} ${student.LastName}`,
        Date: today,
        Status: attendanceStatus,
        InTime: nowStr,
        OutTime: "",
        EntryMode: "RFID",
        checkin_source: "RFID",
        late_flag: lateFlag,
        Timestamp: new Date().toISOString()
      });
      
      return { 
        status: 'success', 
        name: `${student.FirstName} ${student.LastName}`,
        regId: regId,
        slotTiming: `${slot.start} - ${slot.end}`,
        time: nowStr,
        detailStatus: attendanceStatus,
        message: student.FirstName + ': ' + msg 
      };

    } else if (action === 'checkout') {
      if (!current.record || !current.record.InTime) {
        return { status: 'error', message: 'Not Checked-In' };
      }
      if (current.record.OutTime) {
        return { status: 'success', message: student.FirstName + ': Already OUT' };
      }

      // Validate Slot Mode
      if (slot.mode === 'manual_only' || slot.mode === 'disabled') {
        return { status: 'error', message: 'Use Web App' };
      }

      const earlyMins = slotEndMins - checkoutWindow;

      if (nowMins < earlyMins) {
        // Log an Early Exit request automatically for audit
        try { submitAttendanceRequest(regId, "EARLY_EXIT", "RFID Early Checkout Auto-Logged"); } catch (e) { }
        return { status: 'error', message: 'Early - Wait Admin' };
      }

      const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
      updateObjectInSheet(sheet, "AttendanceID", current.record.AttendanceID, { OutTime: nowStr });
      
      return { 
        status: 'success', 
        name: `${student.FirstName} ${student.LastName}`,
        regId: regId,
        slotTiming: `${slot.start} - ${slot.end}`,
        time: nowStr,
        detailStatus: 'Checked Out',
        message: student.FirstName + ': Checked Out' 
      };
    } else {
      return { status: 'error', message: 'Unknown Action: ' + action };
    }

  } catch (e) {
    Logger.log("RFID Error: " + e.toString());
    return { status: 'error', message: 'Server System Error' };
  }
}

/**
        AddedBy: 'ESP32_' + mac,
        AddedDate: new Date().toISOString()
      });
      return { status: 'success', message: 'RFID Added Successfully!' };
    }

    return { status: 'error', message: 'No inv sheet found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Updates or registers an RFID device status
 */
function updateDeviceActivity(mac) {
  if (!mac || mac === 'UNKNOWN') return;
  try {
    const macClean = String(mac).replace(/[:\s]/g, '').toUpperCase();
    const macColons = formatMac(macClean);
    const devSheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    if (!devSheet) return;
    const timestamp = new Date();

    // ⭐️ DUPLICATE PREVENTION: Search by standardized MAC
    const devData = devSheet.getDataRange().getValues();
    const macIdx = devData[0].indexOf('MAC_ID');
    let foundRow = -1;
    for (let i = 1; i < devData.length; i++) {
      if (standardizeMac(devData[i][macIdx]) === macClean) { foundRow = i + 1; break; }
    }

    if (foundRow !== -1) {
      updateObjectInSheet(devSheet, 'MAC_ID', devData[foundRow - 1][macIdx], {
        MAC_ID: macColons,
        LastSeen: timestamp,
        Status: 'ONLINE'
      });
    } else {
      // Auto-register new device (only if truly not found)
      appendObjectToSheet(devSheet, {
        MAC_ID: macColons,
        DeviceName: 'New Reader Unit',
        IP_Address: '',
        Location: 'Auto Detected',
        LastSeen: timestamp,
        Status: 'ONLINE'
      });
      logActivity('Device Discovery', 'System', 'New RFID Reader MAC detected: ' + macColons);
    }

    // ⭐️ SYNC RFID_Online_Status (single row, update in place)
    try {
      const onlineSheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);
      if (onlineSheet) {
        const oData = onlineSheet.getDataRange().getValues();
        const oMacIdx = oData[0].indexOf('MAC_ID');
        let oRow = -1;
        for (let j = 1; j < oData.length; j++) {
          if (standardizeMac(oData[j][oMacIdx]) === macClean) { oRow = j + 1; break; }
        }
        const onlineObj = { MAC_ID: macColons, Status: 'ONLINE', LastSeen: timestamp };
        if (oRow === -1) {
          appendObjectToSheet(onlineSheet, onlineObj);
        } else {
          updateObjectInSheet(onlineSheet, 'MAC_ID', oData[oRow - 1][oMacIdx], onlineObj);
        }
      }
    } catch (syncErr) { /* non-fatal */ }
  } catch (e) {
    Logger.log('Error updating device activity: ' + e.toString());
  }
}

function getSlotPriorityOrder() {
  const p = PropertiesService.getScriptProperties().getProperty('SLOT_PRIORITY');
  if (p) {
    try {
      return JSON.parse(p);
    } catch (e) { }
  }
  return [
    'BATCH_EXCEPTION',
    'BATCH_SLOT',
    'SPECIAL',
    'STUDENT',
    'BATCH',
    'DEFAULT'
  ];
}

function saveSlotPriorityOrder(orderArr) {
  try {
    PropertiesService.getScriptProperties().setProperty('SLOT_PRIORITY', JSON.stringify(orderArr));
    return { status: 'success', message: 'System Priority logical order updated successfully.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getSlotTimingsList() {
  const sheet = getSheet(SHEET_NAMES.SLOT_SETTINGS);
  let data = sheet ? getSheetDataAsObjects(sheet) || [] : [];
  const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
  const todayStr = Utilities.formatDate(new Date(), zone, "yyyy-MM-dd");

  const typeLabels = {
    'DEFAULT': 'Default Shift – System Wide',
    'BATCH': 'Batch-Specific Shift',
    'SPECIAL': 'Special Exception Shift',
    'STUDENT': 'Student-Specific Shift',
    'BATCH_LEGACY_SLOT': 'Batch Slot',
    'BATCH_LEGACY_EXCEPTION': 'Batch Exception'
  };

  const formatHumanDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return String(isoStr);
      return Utilities.formatDate(d, zone, "dd/MM/yyyy hh:mm a");
    } catch (e) { return String(isoStr); }
  };

  // Compute expiry for a slot with validity_days
  const computeExpiry = (createdAt, validityDays) => {
    const days = parseInt(validityDays);
    if (!days || days <= 0 || !createdAt) return { expired: false, expiry_date: '', expiry_formatted: '', remaining_days: -1 };
    try {
      const created = new Date(createdAt);
      const expiry = new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
      const now = new Date();
      const remaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        expired: now > expiry,
        expiry_date: expiry.toISOString(),
        expiry_formatted: Utilities.formatDate(expiry, zone, "dd/MM/yyyy"),
        remaining_days: remaining
      };
    } catch (e) { return { expired: false, expiry_date: '', expiry_formatted: '', remaining_days: -1 }; }
  };

  // Normalize settings
  let unified = data.map(d => {
    // Robust header detection for enabled and rfid_enabled
    const isEnabled = (d.enabled === true || String(d.enabled).toLowerCase() === 'true' ||
      d.Enabled === true || String(d.Enabled).toLowerCase() === 'true' ||
      (d.enabled === undefined && d.Enabled === undefined));

    const isRfid = (d.rfid_enabled === true || String(d.rfid_enabled).toLowerCase() === 'true' ||
      d.RFIDEnabled === true || String(d.RFIDEnabled).toLowerCase() === 'true' ||
      d.rfidEnabled === true || String(d.rfidEnabled).toLowerCase() === 'true');

    const tType = String(d.type || 'DEFAULT').toUpperCase();
    const validityInfo = computeExpiry(d.created_at || d.CreatedAt, d.validity_days || d.validityDays || d.ValidityDays);

    // Normalize fields for the frontend
    const batch = String(d.batch || d.Batch || '').trim();
    const target = String(d.applicable_target || d.applicableTarget || d.ApplicableTarget || '').trim();
    const type = String(d.type || d.Type || 'DEFAULT').toUpperCase();

    return {
      _source: 'SLOT_SETTINGS',
      _id: type + '_' + batch + '_' + target,
      type: type,
      type_label: typeLabels[type] || type + ' Shift',
      batch: batch,
      start_time: String(d.start_time || d.StartTime || d.start_time || '').replace(/^'/, ''),
      end_time: String(d.end_time || d.EndTime || d.end_time || '').replace(/^'/, ''),
      late_after: String(d.late_after || d.LateAfter || d.late_after || '').replace(/^'/, ''),
      early_exit_before: String(d.early_exit_before || d.EarlyExitBefore || d.early_exit_before || '').replace(/^'/, ''),
      enabled: isEnabled,
      rfid_enabled: isRfid,
      mode: (isEnabled && isRfid) ? 'both' : (isRfid ? 'rfid' : 'manual'),
      rfid_grace_late: d.rfid_grace_late || d.GraceLate || d.rfid_grace_late || '',
      rfid_grace_early: d.rfid_grace_early || d.GraceEarly || d.rfid_grace_early || '',
      applicable_for: d.applicable_for || d.ApplicableFor || '',
      applicable_target: target,
      created_at: d.created_at || d.CreatedAt || '',
      created_at_formatted: formatHumanDate(d.created_at || d.CreatedAt),
      validity_days: d.validity_days || d.ValidityDays || '',
      expired: validityInfo.expired,
      expiry_formatted: validityInfo.expiry_formatted,
      remaining_days: validityInfo.remaining_days
    };
  });

  // Append legacy Batch slots to unified view
  try {
    const slotsSheet = getSheet(SHEET_NAMES.SLOTS);
    if (slotsSheet) {
      const slots = getSheetDataAsObjects(slotsSheet);
      slots.forEach(s => {
        const batchName = resolveBatchNameToName(s.BatchID);
        unified.push({
          _source: 'SLOTS',
          _id: s.SlotID,
          type: 'BATCH_LEGACY_SLOT',
          type_label: batchName ? `Batch Slot – ${batchName}` : 'Batch Slot',
          batch: batchName,
          start_time: String(s.StartTime || '').replace(/^'/, ''),
          end_time: String(s.EndTime || '').replace(/^'/, ''),
          late_after: '', early_exit_before: '',
          enabled: s.Status === 'Active',
          rfid_enabled: false,
          mode: 'manual',
          applicable_for: 'batch_slot', applicable_target: s.Label || '',
          created_at: '', created_at_formatted: '',
          validity_days: '', expired: false, expiry_formatted: '', remaining_days: -1
        });
      });
    }
    const excSheet = getSheet(SHEET_NAMES.SLOT_EXCEPTIONS);
    if (excSheet) {
      const excs = getSheetDataAsObjects(excSheet);
      excs.forEach(s => {
        const batchName = resolveBatchNameToName(s.BatchID);
        const targetDate = String(s.TargetDate || s.Date || '');
        const isExcExpired = targetDate && targetDate < todayStr;
        unified.push({
          _source: 'SLOT_EXCEPTIONS',
          _id: s.ExceptionID,
          type: 'BATCH_LEGACY_EXCEPTION',
          type_label: batchName ? `Batch Exception – ${batchName}` : 'Batch Exception',
          batch: batchName,
          start_time: String(s.StartTime || s.TempStart || '').replace(/^'/, ''),
          end_time: String(s.EndTime || s.TempEnd || '').replace(/^'/, ''),
          late_after: '', early_exit_before: '',
          enabled: (s.Status === 'Active') && !isExcExpired,
          rfid_enabled: false,
          mode: 'manual',
          applicable_for: 'date_exception',
          applicable_target: targetDate + (s.Label ? ' - ' + s.Label : (s.Type ? ' - ' + s.Type : '')),
          created_at: '', created_at_formatted: '',
          validity_days: '', expired: isExcExpired,
          expiry_formatted: targetDate, remaining_days: isExcExpired ? 0 : -1
        });
      });
    }
  } catch (e) { }

  return unified;
}

function deleteUnifiedSlot(source, id) {
  if (source === 'SLOTS') return deleteBatchSlot(id);
  if (source === 'SLOT_EXCEPTIONS') return deleteBatchSlotException(id);
  if (source === 'SLOT_SETTINGS') {
    const sheet = getSheet(SHEET_NAMES.SLOT_SETTINGS);
    if (!sheet) return { status: 'error', message: 'Slot Settings not found' };
    const data = getSheetDataAsObjects(sheet);

    // Normalize ID lookup to match getSlotTimingsList generation
    const index = data.findIndex(d => {
      const type = String(d.type || d.Type || 'DEFAULT').toUpperCase();
      const batch = String(d.batch || d.Batch || '').trim();
      const target = String(d.applicable_target || d.applicableTarget || d.ApplicableTarget || '').trim();
      const normalizedId = type + '_' + batch + '_' + target;
      return normalizedId === id;
    });

    if (index > -1) {
      return deleteSlotTimingByRow(index + 2);
    }
    return { status: 'error', message: 'Configuration not found for ID: ' + id };
  }
  return { status: 'error', message: 'Unknown source system.' };
}

function toggleUnifiedSlotStatus(source, id, newState, slotData) {
  if (source === 'SLOTS') {
    const sheet = getSheet(SHEET_NAMES.SLOTS);
    updateObjectInSheet(sheet, 'SlotID', id, { Status: newState ? 'Active' : 'Paused' });
    return { status: 'success', message: 'Batch slot status updated.' };
  }
  if (source === 'SLOT_EXCEPTIONS') {
    const sheet = getSheet(SHEET_NAMES.SLOT_EXCEPTIONS);
    updateObjectInSheet(sheet, 'ExceptionID', id, { Status: newState ? 'Active' : 'Paused' });
    return { status: 'success', message: 'Batch exception status updated.' };
  }
  if (source === 'SLOT_SETTINGS') {
    return saveNewSlotTiming(slotData);
  }
  return { status: 'error', message: 'Unknown source system.' };
}

function saveNewSlotTiming(data) {
  try {
    const sheet = getSheet(SHEET_NAMES.SLOT_SETTINGS);
    const historySheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
    if (!sheet) return { status: 'error', message: 'Slot Settings sheet not found' };

    // Force time values as text to prevent Google Sheets Date interpretation
    const forceText = (v) => v ? "'" + String(v).replace(/^'/, '') : '';
    const cleanTime = (v) => String(v || '').replace(/^'/, '');

    const settings = getSheetDataAsObjects(sheet);
    let existingIndex = -1;
    let existingEntry = null;

    let targetType = String(data.type || 'DEFAULT').toUpperCase();
    let targetBatch = String(data.batch || '').trim();
    let targetApplicableFor = String(data.applicable_for || '').trim();
    let targetApplicableTarget = String(data.applicable_target || '').trim();

    // Match Logic for updating vs creating
    for (let i = 0; i < settings.length; i++) {
      let s = settings[i];
      let sType = String(s.type || s.Type || 'DEFAULT').toUpperCase();
      let sBatch = String(s.batch || s.Batch || '').trim();
      let sTarget = String(s.applicable_target || s.ApplicableTarget || s.applicableTarget || '').trim();
      let sFor = String(s.applicable_for || s.ApplicableFor || '').trim();

      // Special Case: DEFAULT is unique system-wide
      if (targetType === 'DEFAULT' && sType === 'DEFAULT') {
        existingIndex = i;
        existingEntry = s;
        break;
      }

      if (sType === targetType &&
        sBatch === targetBatch &&
        sFor === targetApplicableFor &&
        sTarget === targetApplicableTarget
      ) {
        existingIndex = i;
        existingEntry = s;
        break;
      }
    }

    const timestamp = new Date().toISOString();
    const historyId = data.history_id || 'STH_' + Date.now();

    // Clean time values for comparison
    const cleanStartTime = cleanTime(data.start_time);
    const cleanEndTime = cleanTime(data.end_time);
    const cleanLateAfter = cleanTime(data.late_after);
    const cleanEarlyExit = cleanTime(data.early_exit_before);

    let isIdentical = false;
    if (existingEntry) {
      const normBool = (v) => String(v).toLowerCase();
      if (cleanTime(existingEntry.start_time) === cleanStartTime &&
        cleanTime(existingEntry.end_time) === cleanEndTime &&
        cleanTime(existingEntry.late_after) === cleanLateAfter &&
        cleanTime(existingEntry.early_exit_before) === cleanEarlyExit &&
        normBool(existingEntry.enabled) === normBool(data.enabled) &&
        normBool(existingEntry.rfid_enabled) === normBool(data.rfid_enabled) &&
        String(existingEntry.rfid_grace_late || '') === String(data.rfid_grace_late || '') &&
        String(existingEntry.rfid_grace_early || '') === String(data.rfid_grace_early || '')) {
        isIdentical = true;
      }

      if (isIdentical) {
        return { status: 'error', message: 'No changes detected. Identical configuration already exists.' };
      }

      // Update existing row using header-based lookup (safe regardless of column order)
      let rowToUpdate = existingIndex + 2;
      const sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const updateValues = {
        'start_time': forceText(cleanStartTime),
        'end_time': forceText(cleanEndTime),
        'late_after': forceText(cleanLateAfter),
        'early_exit_before': forceText(cleanEarlyExit),
        'enabled': data.enabled !== undefined ? data.enabled : true,
        'rfid_enabled': data.rfid_enabled !== undefined ? data.rfid_enabled : false,
        'rfid_grace_late': data.rfid_grace_late || '',
        'rfid_grace_early': data.rfid_grace_early || '',
        'applicable_for': targetApplicableFor,
        'applicable_target': targetApplicableTarget,
        'created_at': existingEntry.created_at || timestamp,
        'created_from': existingEntry.created_from || 'slot_settings',
        'history_id': existingEntry.history_id || historyId,
        'validity_days': data.validity_days || existingEntry.validity_days || ''
      };

      const normalizedHeaders = sheetHeaders.map(h => String(h).toLowerCase().replace(/_/g, ''));

      for (let [colName, val] of Object.entries(updateValues)) {
        const normCol = colName.toLowerCase().replace(/_/g, '');
        let colIdx = normalizedHeaders.indexOf(normCol);

        // Final fallback for RFIDEnabled vs rfid_enabled if normalization failed
        if (colIdx === -1 && colName === 'rfid_enabled') colIdx = sheetHeaders.indexOf('RFIDEnabled');
        if (colIdx === -1 && colName === 'enabled') colIdx = sheetHeaders.indexOf('Enabled');

        if (colIdx !== -1) {
          sheet.getRange(rowToUpdate, colIdx + 1).setValue(val);
        }
      }
      SpreadsheetApp.flush();

      // Write history record
      if (historySheet) {
        appendObjectToSheet(historySheet, {
          HistoryID: historyId,
          SlotType: targetType,
          BatchName: targetBatch,
          StudentTarget: targetApplicableTarget,
          StartTime: cleanStartTime,
          EndTime: cleanEndTime,
          LateAfter: cleanLateAfter,
          EarlyExitBefore: cleanEarlyExit,
          RFIDEnabled: data.rfid_enabled !== undefined ? data.rfid_enabled : false,
          GraceLate: data.rfid_grace_late || '',
          GraceEarly: data.rfid_grace_early || '',
          Enabled: data.enabled !== undefined ? data.enabled : true,
          CreatedFrom: data.created_from || 'slot_settings',
          CreatedAt: timestamp,
          ModifiedAt: timestamp,
          Action: "UPDATE",
          ValidityDays: data.validity_days || (existingEntry ? existingEntry.validity_days : '') || 'Nil'
        });
      }

      return { status: 'success', message: 'Slot timing updated successfully.' };
    } else {
      // Append new using header-based approach
      appendObjectToSheet(sheet, {
        type: targetType,
        batch: targetBatch,
        start_time: forceText(cleanTime(data.start_time)),
        end_time: forceText(cleanTime(data.end_time)),
        late_after: forceText(cleanTime(data.late_after)),
        early_exit_before: forceText(cleanTime(data.early_exit_before)),
        enabled: data.enabled !== undefined ? data.enabled : true,
        rfid_enabled: data.rfid_enabled !== undefined ? data.rfid_enabled : false,
        rfid_grace_late: data.rfid_grace_late || '',
        rfid_grace_early: data.rfid_grace_early || '',
        applicable_for: targetApplicableFor,
        applicable_target: targetApplicableTarget,
        created_at: timestamp,
        created_from: data.created_from || 'slot_settings',
        history_id: historyId,
        validity_days: data.validity_days || ''
      });

      // Write history record
      if (historySheet) {
        appendObjectToSheet(historySheet, {
          HistoryID: historyId,
          SlotType: targetType,
          BatchName: targetBatch,
          StudentTarget: targetApplicableTarget,
          StartTime: cleanTime(data.start_time),
          EndTime: cleanTime(data.end_time),
          LateAfter: cleanTime(data.late_after),
          EarlyExitBefore: cleanTime(data.early_exit_before),
          RFIDEnabled: data.rfid_enabled !== undefined ? data.rfid_enabled : false,
          GraceLate: data.rfid_grace_late || '',
          GraceEarly: data.rfid_grace_early || '',
          Enabled: data.enabled !== undefined ? data.enabled : true,
          CreatedFrom: data.created_from || 'slot_settings',
          CreatedAt: timestamp,
          ModifiedAt: timestamp,
          Action: "CREATE",
          ValidityDays: data.validity_days || 'Nil'
        });
      }
      return { status: 'success', message: 'Slot timing saved successfully.' };
    }
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteSlotTimingByRow(rowNumber) {
  try {
    const sheet = getSheet(SHEET_NAMES.SLOT_SETTINGS);
    if (!sheet) return { status: 'error', message: 'Slot Settings sheet not found' };

    // Read first to log history
    const data = getSheetDataAsObjects(sheet);
    const index = rowNumber - 2;
    if (index >= 0 && index < data.length) {
      const entry = data[index];
      const historySheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
      if (historySheet && entry) {
        const cleanTime = (v) => String(v || '').replace(/^'/, '');
        const now = new Date().toISOString();
        appendObjectToSheet(historySheet, {
          HistoryID: 'STH_DEL_' + Date.now(),
          SlotType: entry.type || '',
          BatchName: entry.batch || '',
          StudentTarget: entry.applicable_target || '',
          StartTime: cleanTime(entry.start_time),
          EndTime: cleanTime(entry.end_time),
          LateAfter: cleanTime(entry.late_after),
          EarlyExitBefore: cleanTime(entry.early_exit_before),
          RFIDEnabled: entry.rfid_enabled || false,
          GraceLate: entry.rfid_grace_late || '',
          GraceEarly: entry.rfid_grace_early || '',
          Enabled: false,
          CreatedFrom: entry.created_from || 'slot_settings',
          CreatedAt: now,
          ModifiedAt: now,
          Action: "DELETE"
        });
      }
    }

    sheet.deleteRow(rowNumber);
    return { status: 'success', message: 'Slot timing deleted' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getSlotTimingHistory() {
  const sheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
  if (!sheet) return [];
  const rawData = getSheetDataAsObjects(sheet) || [];
  const zone = Session.getScriptTimeZone() || 'Asia/Kolkata';
  const cleanTime = (v) => String(v || '').replace(/^'/, '');

  // Human-readable date formatter: DD/MM/YYYY hh:mm AM/PM
  const formatHumanDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return String(isoStr);
      return Utilities.formatDate(d, zone, "dd/MM/yyyy hh:mm a");
    } catch (e) { return String(isoStr); }
  };

  // Build type label mapping for human-friendly display
  const typeLabels = {
    'DEFAULT': 'Default (System Wide)',
    'BATCH': 'Batch-Specific',
    'SPECIAL': 'Special (Exception)',
    'STUDENT': 'Student-Specific',
    'BATCH_SLOT_SCHED': 'Batch Schedule',
    'BATCH_EXCEPTION': 'Batch Exception',
    'BATCH_LEGACY_SLOT': 'Legacy Batch Slot',
    'BATCH_LEGACY_EXCEPTION': 'Legacy Exception'
  };

  // Normalize data keys to PascalCase for the frontend UI
  const normalizedData = rawData.map(row => {
    const slotType = row.SlotType || row.type || row['Slot Type'] || '';
    const isEnabled = (row.Enabled === true || String(row.Enabled).toLowerCase() === 'true' || (row.Enabled === undefined && row.enabled !== undefined ? (row.enabled === true || String(row.enabled).toLowerCase() === 'true') : false));
    const isRfid = (row.RFIDEnabled === true || String(row.RFIDEnabled).toLowerCase() === 'true' || row.rfid_enabled === true || String(row.rfid_enabled || '').toLowerCase() === 'true');

    return {
      HistoryID: row.HistoryID || row.history_id || row['History ID'] || '',
      SlotType: slotType,
      SlotTypeLabel: typeLabels[slotType.toUpperCase()] || slotType,
      BatchName: row.BatchName || row.batch || row['Batch Name'] || '',
      StudentTarget: row.StudentTarget || row.applicable_target || row['Student Target'] || '',
      StartTime: cleanTime(row.StartTime || row.start_time || row['Start Time'] || ''),
      EndTime: cleanTime(row.EndTime || row.end_time || row['End Time'] || ''),
      LateAfter: cleanTime(row.LateAfter || row.late_after || row['Late After'] || ''),
      EarlyExitBefore: cleanTime(row.EarlyExitBefore || row.early_exit_before || row['Early Exit Before'] || ''),
      RFIDEnabled: isRfid,
      GraceLate: row.GraceLate || row.rfid_grace_late || row['Grace Late'] || '',
      GraceEarly: row.GraceEarly || row.rfid_grace_early || row['Grace Early'] || '',
      Enabled: isEnabled,
      CreatedFrom: row.CreatedFrom || row.created_from || row['Created From'] || '',
      CreatedAt: row.CreatedAt || row.created_at || row.Timestamp || '',
      CreatedAtFormatted: formatHumanDate(row.CreatedAt || row.created_at || row.Timestamp || ''),
      ModifiedAt: row.ModifiedAt || '',
      ModifiedAtFormatted: formatHumanDate(row.ModifiedAt || ''),
      Action: row.Action || row.action || 'UPDATE'
    };
  });

  return normalizedData.reverse();
}

function deleteSlotTimingHistoryById(historyId) {
  try {
    const sheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
    if (!sheet) return { status: 'error', message: 'History sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const historyIdCol = headers.indexOf('HistoryID');
    if (historyIdCol === -1) return { status: 'error', message: 'HistoryID column not found' };

    for (let i = data.length - 1; i >= 1; i--) {
      // Robust HistorID lookup (trim and case check)
      if (String(data[i][historyIdCol] || '').trim() === String(historyId).trim()) {
        sheet.deleteRow(i + 1);
        return { status: 'success', message: 'audit_record_removed' };
      }
    }
    return { status: 'error', message: 'Record not found in live history logs.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Bulk delete multiple history records at once.
 * @param {Array<string>} historyIds Array of HistoryID values to delete.
 */
function bulkDeleteSlotTimingHistory(historyIds) {
  try {
    if (!historyIds || !Array.isArray(historyIds) || historyIds.length === 0) {
      return { status: 'error', message: 'No history IDs provided.' };
    }

    const sheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
    if (!sheet) return { status: 'error', message: 'History sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const historyIdCol = headers.indexOf('HistoryID');
    if (historyIdCol === -1) return { status: 'error', message: 'HistoryID column not found' };

    const idsToDelete = new Set(historyIds.map(id => String(id).trim()));
    let deletedCount = 0;

    // Delete from bottom to top to preserve row indices
    for (let i = data.length - 1; i >= 1; i--) {
      if (idsToDelete.has(String(data[i][historyIdCol]).trim())) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }

    SpreadsheetApp.flush();
    return { status: 'success', message: `Deleted ${deletedCount} history record(s).`, deletedCount: deletedCount };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Restore a slot timing configuration from history back to active configurations.
 * @param {string} historyId The HistoryID to restore.
 */
function restoreSlotTimingFromHistory(historyId) {
  try {
    const historySheet = getSheet(SHEET_NAMES.SLOT_TIMING_HISTORY);
    if (!historySheet) return { status: 'error', message: 'History sheet not found' };

    const historyData = getSheetDataAsObjects(historySheet);
    const historyEntry = historyData.find(h => (h.HistoryID || '') === historyId);

    if (!historyEntry) return { status: 'error', message: 'History record not found.' };

    const cleanTime = (v) => String(v || '').replace(/^'/, '');
    const forceText = (v) => v ? "'" + String(v).replace(/^'/, '') : '';

    const slotType = historyEntry.SlotType || 'DEFAULT';
    const batchName = historyEntry.BatchName || '';
    const target = historyEntry.StudentTarget || '';
    const startTime = cleanTime(historyEntry.StartTime);
    const endTime = cleanTime(historyEntry.EndTime);
    const lateAfter = cleanTime(historyEntry.LateAfter);
    const earlyExit = cleanTime(historyEntry.EarlyExitBefore);

    if (slotType === 'BATCH_SLOT_SCHED') {
      const slotsSheet = getSheet(SHEET_NAMES.SLOTS);
      const batchSheet = getSheet(SHEET_NAMES.BATCHES);
      if (!slotsSheet) return { status: 'error', message: 'Slots sheet not found.' };
      let batchId = batchName;
      if (batchSheet) {
        const found = getSheetDataAsObjects(batchSheet).find(b => b.BatchName === batchName);
        if (found) batchId = found.BatchID;
      }
      appendObjectToSheet(slotsSheet, {
        SlotID: 'SLOT_RST_' + Date.now(), BatchID: batchId, DayOfWeek: '',
        StartTime: forceText(startTime), EndTime: forceText(endTime),
        Label: target || 'Restored', Status: 'Active'
      });
    } else if (slotType === 'BATCH_EXCEPTION') {
      const excSheet = getSheet(SHEET_NAMES.SLOT_EXCEPTIONS);
      const batchSheet = getSheet(SHEET_NAMES.BATCHES);
      if (!excSheet) return { status: 'error', message: 'SlotExceptions sheet not found.' };
      let batchId = batchName;
      if (batchSheet) {
        const found = getSheetDataAsObjects(batchSheet).find(b => b.BatchName === batchName);
        if (found) batchId = found.BatchID;
      }
      appendObjectToSheet(excSheet, {
        ExceptionID: 'EXC_RST_' + Date.now(), BatchID: batchId, TargetDate: '',
        StartTime: forceText(startTime), EndTime: forceText(endTime),
        Label: target || 'Restored', Status: 'Active'
      });
    } else {
      const settingsSheet = getSheet(SHEET_NAMES.SLOT_SETTINGS);
      if (!settingsSheet) return { status: 'error', message: 'Slot Settings sheet not found.' };
      let applicableFor = '';
      if (slotType === 'BATCH') applicableFor = 'batch';
      else if (slotType === 'STUDENT') applicableFor = 'student';
      else if (slotType === 'SPECIAL') applicableFor = target ? 'student' : '';

      const timestamp = new Date().toISOString();
      appendObjectToSheet(settingsSheet, {
        type: slotType, batch: batchName,
        start_time: forceText(startTime), end_time: forceText(endTime),
        late_after: forceText(lateAfter), early_exit_before: forceText(earlyExit),
        enabled: true, rfid_enabled: historyEntry.RFIDEnabled || false,
        rfid_grace_late: historyEntry.GraceLate || '', rfid_grace_early: historyEntry.GraceEarly || '',
        applicable_for: applicableFor, applicable_target: target,
        created_at: timestamp, created_from: 'restored_from_history',
        history_id: 'STH_RST_' + Date.now(),
        validity_days: ''
      });
    }

    // Log RESTORE action in history
    const now = new Date().toISOString();
    appendObjectToSheet(historySheet, {
      HistoryID: 'STH_RST_' + Date.now(), SlotType: slotType, BatchName: batchName,
      StudentTarget: target, StartTime: startTime, EndTime: endTime,
      LateAfter: lateAfter, EarlyExitBefore: earlyExit,
      RFIDEnabled: historyEntry.RFIDEnabled || false,
      GraceLate: historyEntry.GraceLate || '', GraceEarly: historyEntry.GraceEarly || '',
      Enabled: true, CreatedFrom: 'restored_from_history',
      CreatedAt: now, ModifiedAt: now, Action: 'RESTORE'
    });

    return { status: 'success', message: 'Configuration restored successfully from history.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function searchBatchesForSlot(query) {
  const qObj = String(query).toLowerCase();
  const sheet = getSheet(SHEET_NAMES.BATCHES);
  if (!sheet) return [];
  const data = getSheetDataAsObjects(sheet) || [];
  const results = [];
  data.forEach(d => {
    if (d.BatchName && d.BatchName.toLowerCase().includes(qObj)) {
      results.push(d.BatchName);
    }
  });
  return [...new Set(results)].slice(0, 10);
}

function searchStudentsForSlot(query) {
  const qObj = String(query).toLowerCase();
  const sheet = getSheet(SHEET_NAMES.REGISTRATIONS);
  if (!sheet) return [];
  const data = getSheetDataAsObjects(sheet) || [];
  const results = [];

  const todayStr = getTodayStr();

  data.forEach(d => {
    // Rule: Only Approved and Not Expired
    const statusLower = String(d.ApplicationStatus || d.Status || '').toLowerCase();
    const isApproved = (statusLower === 'approved' || statusLower === 'active');
    if (!isApproved) return;

    const ed = d.InternshipEndDate ? formatDate(d.InternshipEndDate) : '';
    const isExpired = (ed && todayStr >= ed);
    if (isExpired) return;

    const fn = d.FirstName ? String(d.FirstName).toLowerCase() : '';
    const ln = d.LastName ? String(d.LastName).toLowerCase() : '';
    const regId = d.RegistrationID ? String(d.RegistrationID).toLowerCase() : '';
    const rn = d.RegisterNumber ? String(d.RegisterNumber).toLowerCase() : '';
    const phone = d.MobileNumber ? String(d.MobileNumber).toLowerCase() : '';
    const college = d.CollegeName ? String(d.CollegeName).toLowerCase() : '';
    const batch = d.Batch ? String(d.Batch).toLowerCase() : '';

    if (fn.includes(qObj) || ln.includes(qObj) || regId.includes(qObj) ||
      rn.includes(qObj) || phone.includes(qObj) || college.includes(qObj) || batch.includes(qObj)) {
      results.push({
        RegistrationID: d.RegistrationID,
        FirstName: d.FirstName,
        MiddleName: d.MiddleName,
        LastName: d.LastName
      });
    }
  });
  return results.slice(0, 10);
}

function getRfidDevices(logPage) {
  try {
    // ⭐️ ULTRA-LEAN: Skip consolidateRfidDevices() to prevent timeout
    // Consolidation runs via checkRfidDeviceStatus() trigger instead

    const ss = getSpreadsheet();
    const now = new Date();
    const ONLINE_THRESHOLD_MS = 40 * 60 * 1000; // 40 minutes

    // --- 1. Read RFID_Devices (raw getValues - 1 API call) ---
    const devSheet = ss.getSheetByName(SHEET_NAMES.RFID_DEVICES);
    if (!devSheet || devSheet.getLastRow() < 1) {
      return { devices: [], logs: [], totalLogPages: 0, currentLogPage: 1, status: 'success', message: 'No devices registered' };
    }
    const devData = devSheet.getDataRange().getValues();
    const devHeaders = devData[0].map(h => String(h).trim());

    // --- 2. Read RFID_Online_Status (raw getValues - 1 API call) ---
    const onlineSheet = ss.getSheetByName(SHEET_NAMES.RFID_ONLINE_STATUS);
    let onlineMap = {};
    if (onlineSheet && onlineSheet.getLastRow() > 1) {
      const oData = onlineSheet.getDataRange().getValues();
      const oH = oData[0];
      const oMacIdx = oH.indexOf('MAC_ID');
      const oLsIdx = oH.indexOf('LastSeen');
      const oSyncIdx = oH.indexOf('LastSync');
      for (let i = 1; i < oData.length; i++) {
        const mac = standardizeMac(oData[i][oMacIdx]);
        if (mac) {
          onlineMap[mac] = {
            lastSeen: (oLsIdx !== -1 && oData[i][oLsIdx] instanceof Date) ? oData[i][oLsIdx] : null,
            lastSync: (oSyncIdx !== -1 && oData[i][oSyncIdx] instanceof Date) ? oData[i][oSyncIdx] : null
          };
        }
      }
    }

    // --- 3. Read RFID_Device_Logs (last 200 rows only - 1 API call) ---
    const logSheet = ss.getSheetByName(SHEET_NAMES.RFID_DEVICE_LOGS);
    let allLogs = [];
    if (logSheet && logSheet.getLastRow() > 1) {
      const logRowCount = logSheet.getLastRow();
      const startRow = Math.max(2, logRowCount - 199);
      const numRows = logRowCount - startRow + 1;
      const logColCount = logSheet.getLastColumn();
      const logHeaders = logSheet.getRange(1, 1, 1, logColCount).getValues()[0];
      const logData = logSheet.getRange(startRow, 1, numRows, logColCount).getValues();
      allLogs = logData.map(row => {
        const obj = {};
        logHeaders.forEach((h, idx) => obj[String(h).trim()] = row[idx]);
        return obj;
      });
    }

    // --- 4. Build device list with online status ---
    const mappedDevices = [];
    for (let i = 1; i < devData.length; i++) {
      const row = devData[i];
      if (!row.join('').trim()) continue; // skip empty rows

      const d = {};
      devHeaders.forEach((h, idx) => d[h] = row[idx]);

      const mac = standardizeMac(d.MAC_ID);
      if (!mac) continue;

      const lastSeenCandidates = [];

      // Source 1: RFID_Devices.LastSeen
      if (d.LastSeen instanceof Date) lastSeenCandidates.push(d.LastSeen);

      // Source 2: RFID_Online_Status
      if (onlineMap[mac]) {
        if (onlineMap[mac].lastSeen) lastSeenCandidates.push(onlineMap[mac].lastSeen);
        if (onlineMap[mac].lastSync) lastSeenCandidates.push(onlineMap[mac].lastSync);
      }

      // Source 3: Latest valid log entry from RFID_Device_Logs
      const latestLog = allLogs
        .filter(l => standardizeMac(l.MAC_ID) === mac &&
          l.Event !== 'Unauthorized Access' &&
          !String(l.Details || '').includes('Unregistered'))
        .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))[0];
      if (latestLog && latestLog.Timestamp instanceof Date) {
        lastSeenCandidates.push(latestLog.Timestamp);
      }

      // Source 4: RecentActivityLog (Last 500 rows fallback)
      try {
        const ralSheet = ss.getSheetByName('RecentActivityLog');
        if (ralSheet) {
          const ralRowCount = ralSheet.getLastRow();
          if (ralRowCount > 1) {
            const ralStart = Math.max(2, ralRowCount - 499);
            const ralData = ralSheet.getRange(ralStart, 1, ralRowCount - ralStart + 1, ralSheet.getLastColumn()).getValues();
            const ralHeaders = ralSheet.getRange(1, 1, 1, ralSheet.getLastColumn()).getValues()[0];
            const rTsIdx = ralHeaders.indexOf('Timestamp');
            const rUserIdx = ralHeaders.indexOf('User');

            for (let j = 0; j < ralData.length; j++) {
              const userField = String(ralData[j][rUserIdx] || '');
              if (userField.includes('Device:' + formatMac(mac)) || userField.includes('Device:' + mac)) {
                const ts = ralData[j][rTsIdx];
                if (ts instanceof Date) lastSeenCandidates.push(ts);
              }
            }
          }
        }
      } catch (e) { /* silent fallback */ }

      // Find absolute latest timestamp
      let lastSeen = null;
      if (lastSeenCandidates.length > 0) {
        lastSeen = new Date(Math.max(...lastSeenCandidates.map(d => d.getTime())));
      }

      const isOnline = lastSeen && (now - lastSeen < ONLINE_THRESHOLD_MS);

      mappedDevices.push({
        MAC_ID: formatMac(mac),
        DeviceName: d.DeviceName || 'Terminal',
        IP_Address: d.IP_Address || '',
        Location: d.Location || '',
        Status: d.Status || '',
        isOnline: !!isOnline,
        currentStatus: isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeenDisplay: lastSeen ? formatDateTimeIndia(lastSeen) : 'Never Seen',
        LastSeen: lastSeen ? lastSeen.toISOString() : null
      });
    }

    // --- 5. PAGINATION: 10 logs per page ---
    const sortedLogs = allLogs
      .filter(l => l.Timestamp)
      .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    const PAGE_SIZE = 10;
    const totalLogPages = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE));
    const currentPage = Math.max(1, Math.min(parseInt(logPage) || 1, totalLogPages));
    const paginatedLogs = sortedLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Format log timestamps for display
    const formattedLogs = paginatedLogs.map(l => ({
      Timestamp: l.Timestamp instanceof Date ? l.Timestamp.toISOString() : l.Timestamp,
      MAC_ID: formatMac(standardizeMac(l.MAC_ID)),
      Event: l.Event || '',
      Details: l.Details || ''
    }));

    return {
      devices: mappedDevices,
      logs: formattedLogs,
      totalLogPages: totalLogPages,
      currentLogPage: currentPage,
      status: 'success'
    };
  } catch (e) {
    Logger.log('getRfidDevices error: ' + e.toString() + ' | Stack: ' + e.stack);
    return { devices: [], logs: [], totalLogPages: 0, currentLogPage: 1, status: 'error', message: e.toString() };
  }
}

function getDeviceStatus(mac) {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    const lastSeenIdx = headers.indexOf('LastSeen');
    const cmdIdx = headers.indexOf('PendingCommand');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][macIdx]).trim().toUpperCase() === String(mac).trim().toUpperCase()) {
        return {
          status: 'success',
          lastSeen: data[i][lastSeenIdx],
          pendingCommand: data[i][cmdIdx],
          isOnline: data[i][lastSeenIdx] ? (new Date() - new Date(data[i][lastSeenIdx]) < 5 * 60 * 1000) : false
        };
      }
    }
    return { status: 'error', message: 'Device not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/* 
DUPLICATE REMOVED: Using robust version at line 14433
function setRfidDeviceCommand(mac, command) { ... }
function setBroadcastRfidCommand(command) { ... }
*/

function pingRfidHardware(mac) {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const idx = findRowIndexByValue(sheet, mac, 'MAC_ID');
    if (idx !== -1) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const cmdIdx = headers.indexOf('PendingCommand');
      if (cmdIdx !== -1) {
        sheet.getRange(idx, cmdIdx + 1).setValue('PING');
        logDeviceEvent(mac, 'PingIssued', 'Ping command sent to hardware');
        return { status: 'success', message: 'Ping sent! Device will blink/beeper when it receives it.' };
      }
    }
    return { status: 'error', message: 'Device not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function saveRfidDevice(data) {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const macClean = String(data.MAC_ID || '').replace(/[:\s]/g, '').toUpperCase();
    const macColons = formatMac(macClean);
    if (!macClean) throw new Error('MAC ID is required');
    const now = new Date();

    // ⭐️ DUPLICATE PREVENTION: Check existing rows in RFID_Devices
    const devices = sheet.getDataRange().getValues();
    const headers = devices[0];
    const macIdx = headers.indexOf('MAC_ID');
    let rowIndex = -1;

    for (let i = 1; i < devices.length; i++) {
      const rowMac = String(devices[i][macIdx] || '').replace(/[:\s]/g, '').toUpperCase();
      if (rowMac === macClean) { rowIndex = i + 1; break; }
    }

    if (rowIndex === -1) {
      appendObjectToSheet(sheet, {
        MAC_ID: macColons,
        DeviceName: data.DeviceName,
        IP_Address: data.IP_Address,
        Location: data.Location,
        LastSeen: now,
        Status: 'ONLINE'
      });
      logDeviceEvent(macColons, 'Added', 'Device registered manually');
    } else {
      updateObjectInSheet(sheet, 'MAC_ID', devices[rowIndex - 1][macIdx], {
        MAC_ID: macColons,
        DeviceName: data.DeviceName,
        IP_Address: data.IP_Address,
        Location: data.Location,
        Status: 'ONLINE',
        LastSeen: now
      });
      logDeviceEvent(macColons, 'Updated', 'Device metadata updated and activated');
    }

    // ⭐️ SYNC to RFID_Online_Status (single row, no duplicates)
    try {
      const onlineSheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);
      if (onlineSheet) {
        const oData = onlineSheet.getDataRange().getValues();
        const oHeaders = oData[0];
        const oMacIdx = oHeaders.indexOf('MAC_ID');
        let oRowIdx = -1;
        for (let j = 1; j < oData.length; j++) {
          if (standardizeMac(oData[j][oMacIdx]) === macClean) { oRowIdx = j + 1; break; }
        }
        const onlineObj = { MAC_ID: macColons, DeviceName: data.DeviceName || 'Terminal', Status: 'ONLINE', LastSeen: now, IP_Address: data.IP_Address || '' };
        if (oRowIdx === -1) {
          appendObjectToSheet(onlineSheet, onlineObj);
        } else {
          updateObjectInSheet(onlineSheet, 'MAC_ID', oData[oRowIdx - 1][oMacIdx], onlineObj);
        }
      }
    } catch (syncErr) { Logger.log('saveRfidDevice online sync error: ' + syncErr); }

    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteRfidDevice(mac) {
  try {
    const macClean = String(mac || '').replace(/[:\s]/g, '').toUpperCase();
    const macColons = formatMac(macClean);
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const onlineSheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);

    // 1. Delete from Main Management Sheet
    const devData = sheet.getDataRange().getValues();
    const devMacIdx = devData[0].indexOf('MAC_ID');
    let deletedCount = 0;

    // Reverse delete to handle multiple matches if any
    for (let i = devData.length - 1; i >= 1; i--) {
      const rowMac = String(devData[i][devMacIdx] || '').replace(/[:\s]/g, '').toUpperCase();
      if (rowMac === macClean) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }

    // 2. Clear from Online Status Sheet
    if (onlineSheet) {
      const oData = onlineSheet.getDataRange().getValues();
      const oMacIdx = oData[0].indexOf('MAC_ID');
      for (let i = oData.length - 1; i >= 1; i--) {
        const rowMac = String(oData[i][oMacIdx] || '').replace(/[:\s]/g, '').toUpperCase();
        if (rowMac === macClean) onlineSheet.deleteRow(i + 1);
      }
    }

    logDeviceEvent(macColons, 'Deleted', `Device permanently removed. Rows: ${deletedCount}`);
    return { status: 'success', message: 'Device permanently removed from all registry sheets' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function toggleRfidDeviceBlock(mac) {
  try {
    const macClean = String(mac || '').replace(/[:\s]/g, '').toUpperCase();
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    const statusIdx = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
      const rowMac = String(data[i][macIdx] || '').replace(/[:\s]/g, '').toUpperCase();
      if (rowMac === macClean) {
        const current = (data[i][statusIdx] || '').toString().toUpperCase();
        const next = (current === 'BLOCKED' || current === 'DISABLED') ? 'ACTIVE' : 'BLOCKED';
        sheet.getRange(i + 1, statusIdx + 1).setValue(next);
        logDeviceEvent(macClean, 'Status Changed', `Device status changed to ${next}`);
        return { status: 'success', newStatus: next };
      }
    }
    return { status: 'error', message: 'Device not found in registry' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function logDeviceEvent(mac, event, details) {
  try {
    const macClean = String(mac || '').replace(/[:\s]/g, '').toUpperCase();
    const now = new Date();
    // §13: Log to RFID_Device_Logs
    const sheet = getSheet(SHEET_NAMES.RFID_DEVICE_LOGS);
    if (sheet) {
      appendObjectToSheet(sheet, {
        Timestamp: now,
        MAC_ID: macClean,
        Event: event,
        Details: details
      });
    }
    // §13: Duplicate entry to RecentActivityLog
    try {
      logActivity('RFID_' + event, 'Device:' + formatMac(macClean), details);
    } catch (e2) { /* dual-log failure is non-fatal */ }
  } catch (e) {
    Logger.log("logDeviceEvent error: " + e.toString());
  }
}

/**
 * Normalizes all MAC IDs in RFID sheets and merges duplicates.
 * Run this once or as a recurring job to keep the UI clean.
 */
function consolidateRfidDevices() {
  // ⭐️ Only normalize low-volume sheets (skip RFID_Device_Logs - too many rows causes timeout)
  const sheetsToFix = [SHEET_NAMES.RFID_DEVICES, SHEET_NAMES.RFID_ONLINE_STATUS];

  sheetsToFix.forEach(sheetName => {
    const sheet = getSheet(sheetName);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const macIdx = headers.indexOf('MAC_ID');
    if (macIdx === -1) return;

    // Normalize existing MACs to colon format
    for (let i = 1; i < data.length; i++) {
      const raw = String(data[i][macIdx]);
      if (!raw || raw === "") continue;
      const clean = raw.replace(/[:\s]/g, '').toUpperCase();
      const formatted = formatMac(clean);
      if (raw !== formatted) sheet.getRange(i + 1, macIdx + 1).setValue(formatted);
    }
  });

  // Cross-Sync RFID_Devices with RFID_Online_Status
  const devSheet = getSheet(SHEET_NAMES.RFID_DEVICES);
  const onlineSheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);

  if (devSheet && onlineSheet) {
    const devData = getSheetDataAsObjects(devSheet);
    const onlineData = getSheetDataAsObjects(onlineSheet);

    devData.forEach(d => {
      const mac = standardizeMac(d.MAC_ID);
      const oMatch = onlineData.find(o => standardizeMac(o.MAC_ID) === mac);

      if (oMatch) {
        // Update Metadata in Online sheet from Devices sheet if needed
        const oRow = findRowIndexByValue(onlineSheet, mac, "MAC_ID", false);
        const oHeaders = onlineSheet.getDataRange().getValues()[0];
        const nameIdx = oHeaders.indexOf("DeviceName");
        if (oRow !== -1 && nameIdx !== -1 && d.DeviceName && d.DeviceName !== oMatch.DeviceName) {
          onlineSheet.getRange(oRow, nameIdx + 1).setValue(d.DeviceName);
        }
      } else {
        // Missing in Online sheet? Add it.
        appendObjectToSheet(onlineSheet, {
          MAC_ID: formatMac(mac),
          DeviceName: d.DeviceName || 'New Device',
          Status: 'OFFLINE',
          LastSeen: d.LastSeen || new Date(0),
          IP_Address: d.IP_Address || ''
        });
      }
    });
  }

  // Final Cleanup: Merge duplicates in main registry
  const data = devSheet.getDataRange().getValues();
  const headers = data[0];
  const macIdx = headers.indexOf('MAC_ID');
  const macMap = {};
  const rowsToDelete = [];

  for (let i = 1; i < data.length; i++) {
    const mac = standardizeMac(data[i][macIdx]);
    if (!mac) {
      if (i > 0) rowsToDelete.push(i + 1);
      continue;
    }
    if (macMap[mac]) {
      rowsToDelete.push(i + 1);
    } else {
      macMap[mac] = i + 1;
    }
  }

  // Delete from bottom to top
  rowsToDelete.reverse().forEach(row => devSheet.deleteRow(row));
  return { status: 'success', message: `Deleted ${rowsToDelete.length} duplicates.` };
}

/**
 * Verifies if the hardware device (by MAC ID) is registered and active
 */


/**
 * Submits a document access request from the public Index page.
 */
function submitPublicDocumentAccessRequest(payload) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return { status: 'error', message: 'Database initialization error.' };

    const requestId = 'DOC-ACC-' + Date.now().toString(36).toUpperCase();
    const headers = sheet.getDataRange().getValues()[0].map(h => String(h).trim());

    // ["RequestID", "RegistrationID", "StudentName", "RequestType", "Section", "TargetDate", "EndDate", "Reason", "LeaveType", "Status", "RequestDate", "AttachmentUrl", "OTP", "ProcessedDate", "ProcessedBy", "AdminRemarks"]
    const row = new Array(headers.length).fill('');
    row[headers.indexOf("RequestID")] = requestId;
    row[headers.indexOf("RegistrationID")] = payload.registerNumber;
    row[headers.indexOf("StudentName")] = payload.studentName;
    row[headers.indexOf("RequestType")] = 'DocumentAccess';
    row[headers.indexOf("Section")] = 'Public';
    row[headers.indexOf("Reason")] = JSON.stringify(payload.requestedDocs);
    row[headers.indexOf("Status")] = 'Pending';
    row[headers.indexOf("RequestDate")] = new Date().toISOString();

    // Use AdminRemarks to store requestor info
    const adminRemarksIdx = headers.indexOf("AdminRemarks");
    if (adminRemarksIdx !== -1) {
      row[adminRemarksIdx] = payload.requestorName + ' (' + payload.requestorEmail + ') - ' + payload.purpose;
    }

    // Store certificate number in AttachmentUrl for reference
    const attachIdx = headers.indexOf("AttachmentUrl");
    if (attachIdx !== -1) row[attachIdx] = payload.certificateNumber;

    // Store email in OTP field for easy lookup if needed
    const otpIdx = headers.indexOf("OTP");
    if (otpIdx !== -1) row[otpIdx] = payload.requestorEmail;

    sheet.appendRow(row);
    logActivity('Public Doc Request', requestId, `Requested by ${payload.requestorName} for ${payload.studentName}`);

    return { status: 'success', message: 'Request submitted successfully.' };
  } catch (e) {
    Logger.log('Error in submitPublicDocumentAccessRequest: ' + e.toString());
    return { status: 'error', message: e.message };
  }
}

/**
 * Fetches document access requests for the Admin panel.
 */
function getPublicDocumentAccessRequests(statusFilter) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return [];

    const data = getSheetDataAsObjects(sheet);
    const requests = data
      .filter(r => r.RequestType === 'DocumentAccess')
      .map(r => {
        let requestedDocs = [];
        try {
          if (typeof r.Reason === 'string' && r.Reason.startsWith('[')) {
            requestedDocs = JSON.parse(r.Reason);
          } else {
            requestedDocs = r.Reason;
          }
        } catch (e) {
          requestedDocs = r.Reason;
        }

        const remarks = String(r.AdminRemarks || '');
        const requestorParts = remarks.split(' (');
        const purposeParts = remarks.split(') - ');

        return {
          id: r.RequestID,
          studentName: r.StudentName,
          registerNumber: r.RegistrationID,
          certificateNumber: r.AttachmentUrl,
          requestorName: requestorParts[0] || 'Unknown',
          requestorEmail: r.OTP || (requestorParts[1] ? requestorParts[1].split(')')[0] : ''),
          purpose: purposeParts[1] || '',
          requestedDocs: requestedDocs,
          requestedOn: r.RequestDate,
          status: r.Status,
          processedOn: r.ProcessedDate,
          expiresOn: r.EndDate
        };
      });

    if (statusFilter && statusFilter !== 'All') {
      return requests.filter(r => r.status === statusFilter);
    }
    return requests;
  } catch (e) {
    Logger.log('Error in getPublicDocumentAccessRequests: ' + e.toString());
    return [];
  }
}

/**
 * Processes a public document access request (Approve/Reject).
 */
function processPublicDocumentAccessRequest(payload) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return { status: 'error', message: 'Database error.' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idCol = headers.indexOf("RequestID");
    const statusCol = headers.indexOf("Status");
    const processedDateCol = headers.indexOf("ProcessedDate");
    const expiryCol = headers.indexOf("EndDate");

    if (idCol === -1 || statusCol === -1) return { status: 'error', message: 'Sheet structure error.' };

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(payload.requestId)) {
        sheet.getRange(i + 1, statusCol + 1).setValue(payload.action);
        if (processedDateCol !== -1) sheet.getRange(i + 1, processedDateCol + 1).setValue(payload.processedOn || new Date().toISOString());
        if (payload.action === 'Approved' && payload.expiresOn && expiryCol !== -1) {
          sheet.getRange(i + 1, expiryCol + 1).setValue(payload.expiresOn);
        }

        logActivity('Admin Action', 'Public Doc Request', `${payload.action} request ${payload.requestId}`);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Request not found.' };
  } catch (e) {
    Logger.log('Error in processPublicDocumentAccessRequest: ' + e.toString());
    return { status: 'error', message: e.message };
  }
}

/**
 * Uncrashable Mathematical Code 128 (Type B) Barcode Formatter
 * Physically squishes horizontal dimension by ~45% compared to Code 39
 * Allowing extreme vertical height boosts natively through pure typing.
 */
function generateNativelyCompactCode128(text) {
  let sum = 104; // Start B Index
  let encoded = String.fromCharCode(204); // Start B Char (Ì)

  for (let i = 0; i < text.length; i++) {
    let charCode = text.charCodeAt(i);
    if (charCode >= 32 && charCode <= 126) {
      sum += (charCode - 32) * (i + 1);
      encoded += text[i];
    }
  }

  let check = sum % 103;
  let checkStr = "";
  if (check < 95) {
    checkStr = String.fromCharCode(check + 32);
  } else {
    checkStr = String.fromCharCode(check + 100);
  }

  return encoded + checkStr + String.fromCharCode(206); // Append Stop Char (Î)
}

/**
 * UTILITY: Standardize RFID Tag format to 10-digit decimal (Printed Card Number format)
 * Converts Hex strings (even if they look like digits) to decimal card numbers.
 * Hex 5000408657 -> Decimal 0004228695
 */
function standardizeRfidFormat(tag) {
  if (!tag) return "";
  let s = String(tag).trim();

  // Basic validation: if too short, just return as is (to avoid breaking short codes if any)
  if (s.length < 4) return s;

  // Handle RDM6300 HEX formats (usually 12 chars: Start[1] + Data[10] + Checksum[2] + End[1], 
  // but often provided as 10 or 12 hex chars).
  // Consistent with V-VARMA hardware which uses the middle hex segment.
  const isHex = /[A-Fa-f]/.test(s);
  if (isHex && (s.length === 10 || s.length === 12)) {
    try {
      // For 12 char hex: 02 (Start) + 10 Hex Data + Checksum + 03 (End)
      // We take the data portion. If 12 chars, we strip start/end/checksum or take middle.
      // Usually the 10-digit decimal printed on the card is the hex data segment.
      let hexData = s;
      if (s.length === 12) hexData = s.substring(2, 10); // Take data segment
      else if (s.length === 10) hexData = s.substring(4, 10); // Take specific data segment

      const decimal = parseInt(hexData, 16);
      if (!isNaN(decimal)) {
        return decimal.toString().padStart(10, '0');
      }
    } catch (e) {
      Logger.log("Hex conversion error: " + e.toString());
    }
  }

  // If numeric (including long decimal values), ensure 10-digit padding
  const n = parseInt(s, 10);
  if (!isNaN(n) && !/[a-zA-Z]/.test(s)) {
    return n.toString().padStart(10, '0');
  }

  return s;
}

/**
 * ONE-TIME MIGRATION: Converts all existing RFID tags in Sheets to the new standardized decimal format
 */
function runRfidFormatMigration() {
  const invSheet = getSheet(SHEET_NAMES.RFID_INVENTORY);
  const regSheet = getSheet(SHEET_NAMES.REGISTRATIONS);

  if (!invSheet || !regSheet) return;
  Logger.log("Starting RFID Format Migration...");

  // 1. Update Inventory
  const invValues = invSheet.getDataRange().getValues();
  const invHeaders = invValues[0];
  const tagColIdx = invHeaders.indexOf("RFID_TagID");

  for (let i = 1; i < invValues.length; i++) {
    const oldTag = String(invValues[i][tagColIdx] || "").trim();
    const newTag = standardizeRfidFormat(oldTag);
    if (oldTag && oldTag !== newTag) {
      Logger.log(`Inventory Update: ${oldTag} -> ${newTag}`);
      invSheet.getRange(i + 1, tagColIdx + 1).setValue(newTag);
    }
  }

  // 2. Update Registrations
  const regValues = regSheet.getDataRange().getValues();
  const regHeaders = regValues[0];
  const rfidColIdx = regHeaders.indexOf("RFID_TagID");

  for (let i = 1; i < regValues.length; i++) {
    const oldTag = String(regValues[i][rfidColIdx] || "").trim();
    const newTag = standardizeRfidFormat(oldTag);
    if (oldTag && oldTag !== newTag) {
      Logger.log(`Registration Update: ${oldTag} -> ${newTag}`);
      regSheet.getRange(i + 1, rfidColIdx + 1).setValue(newTag);
    }
  }

  Logger.log("RFID Format Migration Complete.");
}

/**
 * UTILITY: Formats a date to India Standard Time (IST) string: dd/MM/yyyy HH:mm:ss
 */
function formatDateTimeIndia(dateInput) {
  if (!dateInput) return '';
  try {
    const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    // India is GMT+5:30
    return Utilities.formatDate(date, "GMT+5:30", "dd/MM/yyyy HH:mm:ss");
  } catch (e) {
    return String(dateInput);
  }
}

/**
 * Checks for approved checkout permission in student_requests
 */
function checkCheckoutPermission(regId, date) {
  return checkCheckoutPermissionDetail(regId, date).allowed;
}

function checkCheckoutPermissionDetail(regId, date) {
  try {
    const sheetsToCheck = [
      getSheet(SHEET_NAMES.STUDENT_REQUESTS),
      getSheet(SHEET_NAMES.ATTENDANCE_REQUESTS),
      getSheet(SHEET_NAMES.ATTENDANCE_OTP)
    ];

    let validReq = null;

    for (const sheet of sheetsToCheck) {
      if (!sheet) continue;
      const data = getSheetDataAsObjects(sheet);
      const headers = (sheet.getLastRow() > 0) ? sheet.getDataRange().getValues()[0] : [];
      const typeKey = headers.indexOf("RequestType") !== -1 ? "RequestType" : (headers.indexOf("Type") !== -1 ? "Type" : "ActionType");

      validReq = data.find(r => {
        const rDate = r.TargetDate || r.Date;
        const matchesIdAndDate = String(r.RegistrationID || '').toUpperCase() === String(regId).toUpperCase() &&
          (r.Status === 'Approved' || r.Status === 'Active') &&
          formatDate(rDate) === date;

        if (!matchesIdAndDate) return false;

        const type = String(r[typeKey] || '').toLowerCase();
        const isOutType = type.includes('out') || type.includes('leave') || type.includes('exit');
        if (!isOutType) return false;

        if (r.TargetTime) {
          const now = new Date();
          const [reqH, reqM] = String(r.TargetTime).split(':').map(Number);
          if (!isNaN(reqH)) {
            const reqDate = new Date();
            reqDate.setHours(reqH, reqM || 0, 0, 0);
            return now >= reqDate;
          }
        }
        return isOutType;
      });

      if (validReq) break;
    }

    return {
      allowed: !!validReq,
      targetTime: validReq ? validReq.TargetTime : null
    };
  } catch (e) {
    Logger.log("Error in checkCheckoutPermissionDetail: " + e.message);
    return { allowed: false };
  }
}
function getAttendanceOverview() {
  try {
    const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
    if (!sheet) return [];

    // Use the optimized data fetcher which now returns standardized date strings and numeric timestamps
    const data = getSheetDataAsObjects(sheet);

    // Sort by Date descending, then Timestamp descending
    data.sort((a, b) => {
      const db = String(b.Date || '');
      const da = String(a.Date || '');
      if (db !== da) return db.localeCompare(da);
      return (b.Timestamp || 0) - (a.Timestamp || 0);
    });

    const recent = data.slice(0, 50); // Show more for overview

    return recent.map(r => ({
      name: r.StudentName || 'Unknown',
      regId: r.StudentRegistrationID || 'N/A',
      batch: r.WorkArea || 'General',
      inTime: r.InTime || '--:--',
      outTime: r.OutTime || '--:--',
      status: r.Status || 'N/A',
      date: r.Date
    }));
  } catch (e) {
    Logger.log('Error in getAttendanceOverview: ' + e.toString());
    return [];
  }
}

/**
 * Generates a watermarked PDF of the student's own application form for preview.
 * Includes a diagonal watermark "STUDENTS COPY" with student details.
 */
function getStudentApplicationFormPdf(registrationId) {
  try {
    const studentData = getStudentDataForDoc(registrationId);
    if (!studentData) return { status: 'error', message: 'Student data not found.' };

    // 1. Generate the base document (Doc copy)
    const templateId = TEMPLATE_IDS.APPLICATION_FORM;
    const templateFile = DriveApp.getFileById(templateId);
    const tempFolderId = getSystemFolderId('generated');
    const tempFolder = DriveApp.getFolderById(tempFolderId);

    const fileName = `PREVIEW_APP_${registrationId}_${Date.now()}`;
    const tempCopy = templateFile.makeCopy(fileName, tempFolder);
    const doc = DocumentApp.openById(tempCopy.getId());
    const body = doc.getBody();

    // 2. Populate placeholders (using robust map similar to generateDocumentAndMail)
    let placeholderValues = {
      'FullName': studentData.FullName || '',
      'StudentName': studentData.FullName || '',
      'RegistrationID': studentData.RegistrationID || '',
      'RegisterNumber': studentData.RegisterNumber || 'N/A',
      'YEAR': studentData.Year || 'N/A',
      'Year': studentData.Year || 'N/A',
      'year': studentData.Year || 'N/A',
      'StudentYear': studentData.Year || 'N/A',
      'InternshipStartDate': studentData.FormattedStartDate || '',
      'InternshipEndDate': studentData.FormattedEndDate || '',
      'INTERNSHIP_PERIOD': `${studentData.FormattedStartDate} - ${studentData.FormattedEndDate}`,
      'DurationDays': studentData.DurationDays || 'N/A',
      'CollegeName': studentData.CollegeName || 'N/A',
      'College': studentData.CollegeName || 'N/A',
      'Department': studentData.Department || 'N/A',
      'Dept': studentData.Department || 'N/A',
      'DateofBirth': studentData.FormattedDOB || '',
      'TodayDate': studentData.TodayDate || '',
      'CurrentDate': studentData.TodayDate || '',
      'Current Date': studentData.TodayDate || '',
      'Address': studentData.Address || 'N/A',
      'MobileNumber': studentData.MobileNumber || 'N/A',
      'GmailID': studentData.GmailID || 'N/A',
      'Email': studentData.GmailID || 'N/A',
      'Batch': studentData.Batch || 'N/A',
      'Semester': studentData.Semester || 'N/A',
      'EducationType': studentData.EducationType || 'N/A',
      'UniversityRegisterNumber': studentData.RegisterNumber || 'N/A',
      'CollegeCode': studentData.CollegeCode || 'N/A',
      'Pincode': studentData.Pincode || 'N/A',
      'District': studentData.District || 'N/A',
      // USER SPECIFIC PLACEHOLDERS (UPPERCASE)
      'STUDENT_NAME': studentData.FullName || '',
      'REGISTRATION_ID': studentData.RegistrationID || '',
      'APPLICATION_DATE': studentData.TodayDate || '',
      'APPLICATION_STATUS': studentData.ApplicationStatus || 'Approved',
      'START_DATE': studentData.FormattedStartDate || '',
      'END_DATE': studentData.FormattedEndDate || '',
      'ADDRESS': studentData.Address || 'N/A',
      'PINCODE': studentData.Pincode || 'N/A',
      'DISTRICT': studentData.District || 'N/A',
      'EMAIL': studentData.GmailID || 'N/A',
      'PHONE': studentData.MobileNumber || 'N/A',
      'COLLEGE_NAME': studentData.CollegeName || 'N/A',
      'COLLEGE_CODE': studentData.CollegeCode || 'N/A',
      'COLLEGE_DISTRICT': studentData.CollegeDistrict || 'N/A',
      'COLLEGE_REGISTER_NO': studentData.RegisterNumber || 'N/A',
      'EDUCATION_TYPE': studentData.EducationType || 'N/A',
      'SEMESTER': studentData.Semester || 'N/A',
      'DOB': studentData.FormattedDOB || 'N/A',
      'CGPA': studentData.GPA || 'N/A',
      'WORK_AREA': studentData.InterestedArea || 'N/A',
      'TOTAL_DAYS': studentData.DurationDays || 'N/A',
      'REMARKS': studentData.Remarks || 'N/A',
      'BATCH': studentData.Batch || 'N/A',
      'PROJECT_TITLE': studentData.ProjectTitle || 'N/A',
      'DEPARTMENT': studentData.Department || 'N/A',
      'department': studentData.Department || 'N/A'
    };

    // === MODERN ALIGNMENT FIX (FOR APPLICATION FORM) ===
    modernizeApplicationFormLayout(body, studentData);

    // Use robust replacement loop that handles spaces and variations {{ placeholder }} or { placeholder }
    for (const placeholderName in placeholderValues) {
      const value = placeholderValues[placeholderName] || '';
      const pattern = '\\{+\\s*' + placeholderName + '\\s*\\}+';
      try {
        body.replaceText(pattern, value);
      } catch (e) {
        Logger.log('Error replacing placeholder ' + placeholderName + ': ' + e.toString());
      }
    }

    // 3. Handle Native Barcode & Pagination
    try {
      // 100% NATIVE COMPACT BARCODE (CODE 128 TYPOGRAPHY) - REPLICATE ADMIN PANEL
      const patternTags = ['BARCODE', 'Barcode', 'QR_CODE', 'QRCode'];
      patternTags.forEach(tag => {
        const pattern = '\\{\\{\\s*' + tag + '\\s*\\}\\}';
        let found = body.findText(pattern);
        while (found) {
          let textElement = found.getElement().asText();
          let startOffset = found.getStartOffset();
          let endOffset = found.getEndOffsetInclusive();

          textElement.deleteText(startOffset, endOffset);

          // Natively encode into densely packed Code 128 B string
          let baseStr = String(registrationId).toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '');
          let barcodeText = generateNativelyCompactCode128(baseStr);

          textElement.insertText(startOffset, barcodeText);

          // Set font to Libre Barcode 128 at size 36 (REDUCED to keep compact as per ref)
          textElement.setFontFamily(startOffset, startOffset + barcodeText.length - 1, "Libre Barcode 128");
          textElement.setFontSize(startOffset, startOffset + barcodeText.length - 1, 36);
          textElement.setBold(startOffset, startOffset + barcodeText.length - 1, false);
          textElement.setItalic(startOffset, startOffset + barcodeText.length - 1, false);

          // Align the barcode paragraph to LEFT (as per ref)
          if (textElement.getParent().getType() === DocumentApp.ElementType.PARAGRAPH) {
            let pa = textElement.getParent().asParagraph();
            pa.setSpacingAfter(0);
            pa.setSpacingBefore(0);
            pa.setLineSpacing(1);
            pa.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
          }

          found = body.findText(pattern);
        }
      });

      // Special case for placeholders like REGISTRATION_ID that might be used as labels
      body.replaceText('{{QR_CODE_HERE}}', '');

      // Pagination Logic: Form 1 and Form 2 must start on new pages (as mandatory)
      const paginationLabels = ["Form-1", "Form 1", "Form-2", "Form 2", "Form-3", "Form 3", "Form-4", "Form 4", "Form-5", "Form 5"];
      paginationLabels.forEach(label => {
        let found = body.findText(label);
        if (found) {
          let element = found.getElement();
          let paragraph = element;
          while (paragraph && paragraph.getType() !== DocumentApp.ElementType.PARAGRAPH && paragraph.getType() !== DocumentApp.ElementType.LIST_ITEM) {
            paragraph = paragraph.getParent();
          }
          if (paragraph) {
            try {
              if (paragraph.asParagraph) {
                // If it's Form 1, it only needs a page break if it's not the very first child of the body
                if (label.toLowerCase().includes("form 1") || label.toLowerCase().includes("form-1")) {
                  if (body.getChildIndex(paragraph) > 0) {
                    paragraph.asParagraph().setPageBreakBefore(true);
                  }
                } else {
                  paragraph.asParagraph().setPageBreakBefore(true);
                }
              } else if (paragraph.asListItem) {
                paragraph.asListItem().setPageBreakBefore(true);
              }
            } catch (e) { }
          }
        }
      });
    } catch (e) { Logger.log("Application Form handling error: " + e); }

    // Dynamic Attendance Table Generation {{ATTENDANCE_LOG}}
    try {
      const attenPattern = '\\{\\{\\s*ATTENDANCE_LOG\\s*\\}\\}';
      let foundAtten = body.findText(attenPattern);
      while (foundAtten) {
        let textElement = foundAtten.getElement().asText();
        let parent = textElement.getParent();
        let startOffset = foundAtten.getStartOffset();
        let endOffset = foundAtten.getEndOffsetInclusive();

        textElement.deleteText(startOffset, endOffset);

        let elementAtBodyLevel = parent;
        while (elementAtBodyLevel.getParent() && elementAtBodyLevel.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) {
          elementAtBodyLevel = elementAtBodyLevel.getParent();
        }

        if (elementAtBodyLevel.getParent().getType() === DocumentApp.ElementType.BODY_SECTION) {
          let targetIndex = body.getChildIndex(elementAtBodyLevel);
          const table = body.insertTable(targetIndex + 1);
          table.setBorderWidth(1);

          const headerRow = table.appendTableRow();
          const headers = ['Date', 'Day', 'In Time', 'Out Time', 'Student Sign', 'Supervisor Sign'];
          headers.forEach(h => {
            const cell = headerRow.appendTableCell(h);
            cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            cell.setBackgroundColor('#f3f3f3');
          });

          let startDate = studentData.InternshipStartDate ? new Date(studentData.InternshipStartDate) : null;
          let endDate = studentData.InternshipEndDate ? new Date(studentData.InternshipEndDate) : null;

          if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            let current = new Date(startDate);
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            let count = 0;
            while (current <= endDate && count < 60) { // Limit to 60 rows for safety in preview
              const row = table.appendTableRow();
              // Fix for Utilities.formatDate - handle potentially undefined Session
              const timeZone = (typeof Session !== 'undefined' ? Session.getScriptTimeZone() : "Asia/Kolkata") || "Asia/Kolkata";
              const dStr = Utilities.formatDate(current, timeZone, "dd-MM-yyyy");
              const dayStr = weekdays[current.getDay()];

              [dStr, dayStr, '', '', '', ''].forEach(val => {
                const cell = row.appendTableCell(val);
                cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
              });
              current.setDate(current.getDate() + 1);
              count++;
            }
          }
        }
        foundAtten = body.findText(attenPattern);
      }
    } catch (e) {
      Logger.log("Error generating dynamic ATTENDANCE_LOG preview: " + e);
    }

    // 4. ADD WATERMARK (STUDENT ID - Native All Sheets)
    // Optimized for visible presence without pushed margins. GainBoro color is standard for subtle but readable WM.
    try {
      const watermarkText = `STUDENT ID: ${registrationId}`;
      const header = doc.getHeader() || doc.addHeader();
      header.clear();
      const wmPara = header.appendParagraph(watermarkText);
      wmPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      wmPara.setForegroundColor("#DCDCDC"); // Gainsboro (More visible than extremely light lightgray)
      wmPara.setFontSize(10);
      wmPara.setItalic(true);

      // To make it look like a real watermark on every page, we add the large registration ID.
      const wmParaSubtle = header.appendParagraph(registrationId);
      wmParaSubtle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      wmParaSubtle.setForegroundColor("#DCDCDC");
      wmParaSubtle.setFontSize(64);
      wmParaSubtle.setBold(true);
    } catch (e) { Logger.log("Watermark Insertion Error: " + e); }

    doc.saveAndClose();

    // 5. Convert to PDF and return
    const pdfBlob = tempCopy.getAs(MimeType.PDF);
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());

    // Cleanup
    tempCopy.setTrashed(true);

    return {
      status: 'success',
      data: base64,
      fileName: `ApplicationForm_${registrationId}.pdf`
    };

  } catch (e) {
    Logger.log("Error generating student app form: " + e);
    return { status: 'error', message: e.toString() };
  }
}


// =================================================================================
// DOCUMENT APPROVAL SYSTEM HELPER FUNCTIONS
// =================================================================================

/**
 * Checks if a student is approved to generate a specific document type.
 */
function checkDocumentApproval(regId, docType) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return { status: 'error', message: 'Request sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdx = headers.indexOf('RegistrationID');
    const typeIdx = headers.indexOf('RequestType');
    const reasonIdx = headers.indexOf('Reason'); // Using Reason to store docType
    const statusIdx = headers.indexOf('Status');

    if (regIdx === -1 || typeIdx === -1 || reasonIdx === -1 || statusIdx === -1) {
      return { status: 'error', message: 'Sheet schema mismatch' };
    }

    // Normalize docType for lookup
    const searchType = String(docType).trim();

    // Search for latest request of type DOCUMENT_APPROVAL for this regId and docType
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][regIdx]).trim() === regId &&
        String(data[i][typeIdx]).trim() === 'DOCUMENT_APPROVAL' &&
        String(data[i][reasonIdx]).trim() === searchType) {
        return { status: String(data[i][statusIdx]).trim(), requestId: i + 1 };
      }
    }
    return { status: 'None' };
  } catch (e) {
    Logger.log("Error in checkDocumentApproval: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Initiates a document approval request. Sends email to Admin with OTP.
 */
function requestDocumentApproval(docType, regId) {
  try {
    const student = getStudentDataForDoc(regId);
    if (!student) return { status: 'error', message: 'Student not found.' };

    // Safety check for Certificate Eligibility
    if (docType === 'COMPLETION_CERTIFICATE' || docType === 'internshipCertificate') {
      const appStatus = (student.ApplicationStatus || student.Status || '').toLowerCase();
      if (appStatus !== 'completed') {
        // Additional check: Does the end date pass?
        const endDate = student.InternshipEndDate ? new Date(student.InternshipEndDate) : null;
        const now = new Date();
        if (!endDate || now < endDate) {
          return { status: 'error', message: 'Your internship period has not ended yet. Certificates can only be requested after completion.' };
        }
        return { status: 'error', message: 'Your internship is not yet marked as Completed by Admin. Please complete your tasks first.' };
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const requestId = 'DOC_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const timestamp = formatDateTimeIndia(new Date());

    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return { status: 'error', message: 'Request system unavailable.' };

    const headers = sheet.getDataRange().getValues()[0];
    const nr = headers.map(h => {
      if (h === 'RequestID') return requestId;
      if (h === 'RegistrationID') return regId;
      if (h === 'StudentName') return student.FullName;
      if (h === 'RequestType') return 'DOCUMENT_APPROVAL';
      if (h === 'Reason') return docType;
      if (h === 'Status') return 'Awaiting OTP';
      if (h === 'RequestDate') return timestamp;
      if (h === 'OTP') return otp;
      return '';
    });
    sheet.appendRow(nr);

    // Send email to Admin
    const subject = `[ACTION REQUIRED] Document Approval: ${docType} - ${student.FullName}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px;">Document Generation Request</h2>
        <p>Hello Admin,</p>
        <p>A student has requested approval to generate an official document from the Smart Document Generator.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Student Name:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${student.FullName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Reg ID:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${regId}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Batch:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${student.Batch || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Document:</td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #d93025;">${docType}</td></tr>
        </table>

        <div style="background: #fdf2f2; padding: 20px; text-align: center; border-radius: 10px; border: 1px solid #f5c6cb;">
          <p style="margin-bottom: 10px; font-weight: bold; color: #721c24;">ADMIN APPROVAL OTP</p>
          <div style="font-size: 32px; font-weight: bold; color: #d93025; letter-spacing: 5px;">${otp}</div>
          <p style="margin-top: 10px; font-size: 12px; color: #721c24;">Share this OTP with the student to grant them access to this document.</p>
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #777;">This is an automated request from the GSV Interns Portal.</p>
      </div>
    `;

    try {
      MailApp.sendEmail({
        to: ADMIN_EMAIL_ID,
        subject: subject,
        htmlBody: emailBody
      });
    } catch (err) {
      Logger.log("Mail failed: " + err.message);
    }

    logActivity('Document Request', regId, `Requested approval for ${docType}`);

    return { status: 'success', message: 'Approval request sent. Please contact Admin for the 6-digit access OTP.' };
  } catch (e) {
    Logger.log("Error in requestDocumentApproval: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Verifies the OTP for document approval.
 */
function verifyDocumentApprovalOtp(registrationId, docType, otp) {
  try {
    const sheet = getSheet(SHEET_NAMES.STUDENT_REQUESTS);
    if (!sheet) return { status: 'error', message: 'System error.' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const regIdx = headers.indexOf('RegistrationID');
    const typeIdx = headers.indexOf('RequestType');
    const reasonIdx = headers.indexOf('Reason');
    const otpIdx = headers.indexOf('OTP');
    const statusIdx = headers.indexOf('Status');
    const procDateIdx = headers.indexOf('ProcessedDate');

    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][regIdx]).trim() === String(registrationId).trim() &&
        String(data[i][typeIdx]).trim() === 'DOCUMENT_APPROVAL' &&
        String(data[i][reasonIdx]).trim() === String(docType).trim() &&
        String(data[i][statusIdx]).trim() === 'Awaiting OTP') {

        if (String(data[i][otpIdx]).trim() === String(otp).trim()) {
          sheet.getRange(i + 1, statusIdx + 1).setValue('Approved');
          if (procDateIdx !== -1) sheet.getRange(i + 1, procDateIdx + 1).setValue(formatDateTimeIndia(new Date()));

          logActivity('Document Approved', registrationId, `Access granted for ${docType} via OTP`);
          return { status: 'success', message: 'Document Access Granted! You can now generate the ' + docType + '.' };
        } else {
          return { status: 'error', message: 'Invalid OTP. Please ensure you enter the correct code shared by the Admin.' };
        }
      }
    }
    return { status: 'error', message: 'No active approval request found for this document.' };
  } catch (e) {
    Logger.log("Error in verifyDocumentApprovalOtp: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * BACKGROUND MONITOR: Checks if devices are still online every 45 minutes.
 * Threshold: 45 Minutes (industrial heartbeat logic).
 */
function checkDeviceOnlineStatus() {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const statusIdx = headers.indexOf('Status');
    const lastSeenIdx = headers.indexOf('LastSeen');

    const now = new Date().getTime();
    const threshold = 45 * 60 * 1000; // 45 Minutes in milliseconds

    for (let i = 1; i < data.length; i++) {
      const lastSeenStr = data[i][lastSeenIdx];
      if (!lastSeenStr) continue;

      const lastSeen = new Date(lastSeenStr).getTime();
      const currentStatus = String(data[i][statusIdx]).toUpperCase();

      let newStatus = currentStatus;
      if (now - lastSeen > threshold) {
        newStatus = 'OFFLINE';
      } else {
        newStatus = 'ONLINE';
      }

      if (newStatus !== currentStatus) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
      }
    }
    Logger.log("Background Task: Device Status Check Completed.");
  } catch (e) {
    Logger.log("Error in checkDeviceOnlineStatus: " + e.toString());
  }
}

/**
 * SETUP TRIGGER: Call this ONCE from the Apps Script editor to set up the 45-min timer.
 */
function setupStatusTrigger() {
  // Delete existing triggers for this function to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkDeviceOnlineStatus') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create new 45-minute trigger
  ScriptApp.newTrigger('checkDeviceOnlineStatus')
    .timeBased()
    .everyMinutes(45)
    .create();

  Logger.log("Success: 45-minute Device Status Trigger has been installed.");
}

/**
 * Periodic Status Check (Run every 45 mins)
 * Marks devices as OFFLINE if not seen for more than 45 minutes.
 */
function checkDeviceOnlineStatus() {
  try {
    const sheet = getSheet(SHEET_NAMES.RFID_ONLINE_STATUS);
    if (!sheet) return;

    const data = getSheetDataAsObjects(sheet);
    const now = new Date();
    const range = sheet.getDataRange().getValues();
    const headers = range[0];
    const statusIdx = headers.indexOf('Status');
    const lastSeenIdx = headers.indexOf('LastSeen');

    data.forEach((device, index) => {
      const lastSeen = device.LastSeen ? new Date(device.LastSeen) : new Date(0);
      const diffMins = (now - lastSeen) / (1000 * 60);

      if (diffMins > 45 && device.Status === 'ONLINE') {
        sheet.getRange(index + 2, statusIdx + 1).setValue('OFFLINE');
        logDeviceEvent(device.MAC_ID, 'Status Change', 'Device marked OFFLINE (timeout)');
      }
    });
  } catch (e) {
    Logger.log("checkDeviceOnlineStatus error: " + e.toString());
  }
}

function setupStatusTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => { if (t.getHandlerFunction() === 'checkDeviceOnlineStatus') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkDeviceOnlineStatus').timeBased().everyMinutes(45).create();
}


/**
 * Robust Table-based layout for Application Form.
 * Ensures perfect alignment of Student Details vs Parent/Guardian fields.
 */
function modernizeApplicationFormLayout(body, studentData) {
  try {
    const name = (studentData.FullName || '').toUpperCase();
    const college = (studentData.CollegeName || '').toUpperCase();
    const dept = (studentData.Department || '').toUpperCase();
    const year = (studentData.Year || '1').toString();
    const district = (studentData.CollegeDistrict || studentData.District || '').toUpperCase();

    // 1. HEADER ALIGNMENT (STUDENT VS PARENT)
    const headerAnchor = body.findText('{{STUDENT_NAME}}') || body.findText('{{FullName}}') || body.findText('{STUDENT_NAME}');
    if (headerAnchor) {
      const p = headerAnchor.getElement().getParent().asParagraph();
      const container = p.getParent();
      const index = container.getChildIndex(p);

      const table = container.insertTable(index);
      table.setBorderWidth(0);

      const rows = [
        [name, 'Parent/Guardian Name: ________________'],
        [college, 'Parent/Guardian Signature: ____________'],
        [dept, ''],
        [`${year} YEAR`, 'Date: ____/____/________'],
        [district, 'Place: ________________']
      ];

      rows.forEach(rowInfo => {
        const row = table.appendTableRow();
        const c1 = row.appendTableCell(rowInfo[0]);
        const c2 = row.appendTableCell(rowInfo[1]);
        
        c1.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(0);
        c2.setPaddingTop(2).setPaddingBottom(2).setPaddingRight(0);
        
        const p1 = c1.getChild(0).asParagraph();
        const p2 = c2.getChild(0).asParagraph();
        
        p1.setFontSize(10).setBold(true).setUnderline(false).setSpacingAfter(0);
        p2.setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.LEFT).setSpacingAfter(0);
      });

      // Remove the old lines (identified as the 5 lines starting from anchor)
      for (let i = 0; i < 5; i++) {
        const target = container.getChild(index + 1);
        if (target) container.removeChild(target);
      }
    }

    // 2. SIGNATURE ALIGNMENT (BOTTOM)
    const sigAnchor = body.findText('Student Signature');
    if (sigAnchor) {
      const p = sigAnchor.getElement().getParent().asParagraph();
      const container = p.getParent();
      const index = container.getChildIndex(p);
      
      // Usually there are underlines above labels. Try to find them.
      let startIndex = index;
      if (index > 0) {
        const prev = container.getChild(index - 1).asParagraph();
        if (prev && prev.getText().includes('____')) startIndex = index - 1;
      }

      const table = container.insertTable(startIndex);
      table.setBorderWidth(0);
      
      // Row 1: Underlines
      const r1 = table.appendTableRow();
      r1.appendTableCell('________________________').getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      r1.appendTableCell('________________________').getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      
      // Row 2: Labels
      const r2 = table.appendTableRow();
      r2.appendTableCell('Student Signature').getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER).setBold(true);
      r2.appendTableCell('Parent / Guardian Signature').getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER).setBold(true);
      
      // Row 3: Name
      const r3 = table.appendTableRow();
      r3.appendTableCell(`{ ${name} }`).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(10);
      r3.appendTableCell('').getChild(0).asParagraph();

      // Clean up old signature lines (Underline, Label, Name - 3 lines)
      for (let i = 0; i < 4; i++) {
        const target = container.getChild(startIndex + 1);
        if (target) container.removeChild(target);
      }
    }
  } catch (e) {
    Logger.log("Error modernizing application form: " + e.toString());
  }
}

/**
 * Automatically categorizes and synchronizes students into separate sheets:
 * 1. Approved (Approved, Active, Completed, Assigned)
 * 2. Pending (Pending, Submitted, and any blank status)
 * 3. Rejected_Optout_Closed (Rejected, Opt-out, Optout, Closed)
 */
function syncStudentCategoriesToSheets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const regSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
    if (!regSheet) return { status: 'error', message: 'Registrations sheet not found.' };

    const data = regSheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', message: 'No data to sync.' };

    const headers = data[0];
    const statusCol = headers.indexOf("ApplicationStatus");
    if (statusCol === -1) return { status: 'error', message: 'ApplicationStatus column not found.' };

    const approvedData = [headers];
    const pendingData = [headers];
    const rejectedOptoutClosedData = [headers];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = String(row[statusCol] || '').trim().toLowerCase();

      if (status === 'approved' || status === 'active' || status === 'completed' || status === 'assigned') {
        approvedData.push(row);
      } else if (status === 'rejected' || status === 'opt-out' || status === 'optout' || status === 'closed') {
        rejectedOptoutClosedData.push(row);
      } else {
        // Includes 'pending', 'submitted', and blank/empty
        pendingData.push(row);
      }
    }

    // Also include Closed and Opt-out students from the archive sheet into the Rejected_Optout_Closed sheet
    try {
      const closedSheet = ss.getSheetByName('Closed and Opt-out');
      if (closedSheet) {
        const closedValues = closedSheet.getDataRange().getValues();
        for (let i = 1; i < closedValues.length; i++) {
          rejectedOptoutClosedData.push(closedValues[i]);
        }
      }
    } catch (e) {
      Logger.log('Error reading Closed and Opt-out sheet in syncStudentCategoriesToSheets: ' + e.toString());
    }

    const writeToCategorySheet = (sheetName, rows) => {
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      } else {
        sheet.clearContents();
        sheet.clearFormats();
      }
      if (rows.length > 0) {
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
        // Style the headers beautifully
        sheet.getRange(1, 1, 1, rows[0].length)
          .setBackground('#4361ee')
          .setFontColor('#ffffff')
          .setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    };

    writeToCategorySheet("Approved", approvedData);
    writeToCategorySheet("Pending", pendingData);
    writeToCategorySheet("Rejected_Optout_Closed", rejectedOptoutClosedData);

    return { status: 'success', message: 'Synchronized student categories.' };
  } catch (e) {
    Logger.log('Error synchronizing student categories: ' + e.message);
    return { status: 'error', message: e.message };
  }
}

/**
 * Handle POST requests from the Flutter mobile app and external clients
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    if (action === 'executeFunction') {
      const funcName = postData.functionName;
      const funcArgs = postData.arguments || [];
      const globalObject = typeof globalThis !== 'undefined' ? globalThis : this;
      if (typeof globalObject[funcName] === 'function') {
        try {
          const data = globalObject[funcName].apply(null, funcArgs);
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
            .setMimeType(ContentService.MimeType.JSON);
        } catch (funcErr) {
          return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: funcErr.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Function not found on Apps Script: ' + funcName }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'sync' || action === 'sync_eoffice') {
      var ss = getOrCreateSpreadsheet();
      if (postData.users) syncUsers(ss, postData.users);
      if (postData.departments) syncDepartments(ss, postData.departments);
      if (postData.roles) syncRoles(ss, postData.roles);
      if (postData.settings) syncSettings(ss, postData.settings);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Synchronization successful",
        data: getDatabase()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    let result = { status: 'error', message: 'Unknown action: ' + action };

    if (action === 'studentLogin') {
      result = studentLogin(postData.regId, postData.mobile);
      if (result.status === 'success') {
        const profile = getStudentComprehensiveProfile(postData.regId);
        result.studentData = profile;
      }
    } else if (action === 'adminLogin') {
      result = adminLogin(postData.adminId, postData.password);
    } else if (action === 'getStudentComprehensiveData') {
      result = getStudentComprehensiveProfile(postData.regId);
    } else if (action === 'getAdminComprehensiveData') {
      result = getAdminComprehensiveData();
    } else if (action === 'studentCheckin') {
      result = recordWebCheckin(postData.regId);
    } else if (action === 'studentCheckout') {
      result = recordWebCheckout(postData.regId);
    } else if (action === 'saveDiary') {
      result = saveDiaryEntry(postData.regId, postData.date, postData.content);
    } else if (action === 'broadcastNotice') {
      result = createNoticeCircular({
        type: 'Notice',
        title: postData.title,
        content: postData.content,
        priority: postData.priority || 'Normal',
        targetAudience: 'All'
      });
    } else if (action === 'updateStudentStatus') {
      result = updateApplicationStatus(postData.regId, postData.status);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}



// =================================================================================
// E-OFFICE BIDIRECTIONAL SYNCHRONIZATION HELPERS
// =================================================================================

function getOrCreateSpreadsheet() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && ss.getName() === "GSV E-Office") {
      return ss;
    }
  } catch (e) {}

  var files = DriveApp.getFilesByName("GSV E-Office");
  if (files.hasNext()) {
    var file = files.next();
    return SpreadsheetApp.openById(file.getId());
  } else {
    ss = SpreadsheetApp.create("GSV E-Office");
    return ss;
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // Format headers
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#f1f5f9");
    range.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDatabase() {
  var ss = getOrCreateSpreadsheet();
  
  var usersHeaders = ["ID", "Employee ID", "Login ID", "Email", "Full Name", "Phone", "Designation", "Role ID", "Department ID", "Status", "Password Hash"];
  var deptsHeaders = ["ID", "Name", "Description", "Color"];
  var rolesHeaders = ["ID", "Name", "Description", "Color", "Level", "Is System"];
  var settingsHeaders = ["Key", "Value", "Category", "Description"];

  var usersSheet = getOrCreateSheet(ss, "Users", usersHeaders);
  var deptsSheet = getOrCreateSheet(ss, "Departments", deptsHeaders);
  var rolesSheet = getOrCreateSheet(ss, "Roles", rolesHeaders);
  var settingsSheet = getOrCreateSheet(ss, "Settings", settingsHeaders);

  return {
    users: readSheetData(usersSheet, usersHeaders),
    departments: readSheetData(deptsSheet, deptsHeaders),
    roles: readSheetData(rolesSheet, rolesHeaders),
    settings: readSheetData(settingsSheet, settingsHeaders)
  };
}

function readSheetData(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var lastCol = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var data = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = toCamelCase(headers[j]);
      var cellVal = row[j];
      if (cellVal === undefined || cellVal === "") {
        obj[headerKey] = null;
      } else {
        obj[headerKey] = cellVal;
      }
    }
    data.push(obj);
  }
  return data;
}

function toCamelCase(str) {
  if (str === "Key" || str === "Value" || str === "Category" || str === "Description" || str === "Name" || str === "Color" || str === "Level") {
    return str.toLowerCase();
  }
  return str.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").map(function(word, idx) {
    if (idx === 0) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join("");
}

function syncUsers(ss, users) {
  var headers = ["ID", "Employee ID", "Login ID", "Email", "Full Name", "Phone", "Designation", "Role ID", "Department ID", "Status", "Password Hash"];
  var sheet = getOrCreateSheet(ss, "Users", headers);
  var lastRow = sheet.getLastRow();
  var ids = [];
  var idToRow = {};

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var id = values[i][0];
      ids.push(id);
      idToRow[id] = i + 2; // Row number (1-indexed, header is row 1)
    }
  }

  for (var k = 0; k < users.length; k++) {
    var u = users[k];
    var rowData = [
      u.id,
      u.employeeId || "",
      u.loginId || "",
      u.email || "",
      u.fullName || "",
      u.phone || "",
      u.designation || "",
      u.roleId || "",
      u.departmentId || "",
      u.status || "active",
      u.passwordHash || ""
    ];

    if (idToRow[u.id]) {
      var rowNum = idToRow[u.id];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      idToRow[u.id] = sheet.getLastRow();
    }
  }
}

function syncDepartments(ss, depts) {
  var headers = ["ID", "Name", "Description", "Color"];
  var sheet = getOrCreateSheet(ss, "Departments", headers);
  var lastRow = sheet.getLastRow();
  var idToRow = {};

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var id = values[i][0];
      idToRow[id] = i + 2;
    }
  }

  for (var k = 0; k < depts.length; k++) {
    var d = depts[k];
    var rowData = [
      d.id,
      d.name || "",
      d.description || "",
      d.color || "#6366f1"
    ];

    if (idToRow[d.id]) {
      var rowNum = idToRow[d.id];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      idToRow[d.id] = sheet.getLastRow();
    }
  }
}

function syncRoles(ss, roles) {
  var headers = ["ID", "Name", "Description", "Color", "Level", "Is System"];
  var sheet = getOrCreateSheet(ss, "Roles", headers);
  var lastRow = sheet.getLastRow();
  var idToRow = {};

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var id = values[i][0];
      idToRow[id] = i + 2;
    }
  }

  for (var k = 0; k < roles.length; k++) {
    var r = roles[k];
    var rowData = [
      r.id,
      r.name || "",
      r.description || "",
      r.color || "#6366f1",
      r.level || 0,
      r.isSystem ? "TRUE" : "FALSE"
    ];

    if (idToRow[r.id]) {
      var rowNum = idToRow[r.id];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      idToRow[r.id] = sheet.getLastRow();
    }
  }
}

function syncSettings(ss, settings) {
  var headers = ["Key", "Value", "Category", "Description"];
  var sheet = getOrCreateSheet(ss, "Settings", headers);
  var lastRow = sheet.getLastRow();
  var keyToRow = {};

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var key = values[i][0];
      keyToRow[key] = i + 2;
    }
  }

  for (var k = 0; k < settings.length; k++) {
    var s = settings[k];
    var rowData = [
      s.key,
      s.value || "",
      s.category || "",
      s.description || ""
    ];

    if (keyToRow[s.key]) {
      var rowNum = keyToRow[s.key];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      keyToRow[s.key] = sheet.getLastRow();
    }
  }
}
