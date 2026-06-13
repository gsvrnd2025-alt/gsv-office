import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { UsersService } from './users.service';
import { InternshipSyncService } from './internship-sync.service';

@ApiTags('Internship')
@Controller('internship')
export class InternshipController {
  constructor(
    private usersService: UsersService,
    private syncService: InternshipSyncService
  ) {}

  @Public()
  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run local internship portal operations or proxy PDF/emails' })
  async runFunction(@Body() body: { functionName: string; arguments: any[] }) {
    const { functionName, arguments: funcArgs = [] } = body;
    
    // Functions that are allowed/required to run directly on Apps Script (PDF generation, drive, email)
    const PROXY_FUNCTIONS = [
      'generateCertificatePdf',
      'sendOfferLetterEmail',
      'sendJoiningLetterEmail',
      'sendCertificateIssuedEmail',
      'issueCertificate',
      'issueBulkCertificates',
      'sendCustomEmail',
      'downloadWatermarkedDocument',
      'getSecurePdfBase64',
      'generateBulkCertificatesZip',
      'issueCertificatePdf'
    ];

    if (PROXY_FUNCTIONS.includes(functionName)) {
      console.log(`[InternshipController] Proxying PDF/email function "${functionName}" to Apps Script...`);
      return this.proxyToAppsScript(functionName, funcArgs);
    }

    try {
      console.log(`[InternshipController] Executing function "${functionName}" locally in PostgreSQL...`);
      return await this.executeLocalFunction(functionName, funcArgs);
    } catch (err: any) {
      console.error(`[InternshipController] Error executing local function "${functionName}":`, err.message);
      return {
        status: 'error',
        message: `Local execution failed: ${err.message}`
      };
    }
  }

  // --- Apps Script Proxy Helper ---
  private async proxyToAppsScript(functionName: string, funcArgs: any[]) {
    try {
      const deployResult = await (this.usersService as any).usersRepo.query(
        `SELECT value FROM system_settings WHERE key = 'google_sheets_deployment_id'`
      );
      let deploymentId = '';
      if (deployResult.length > 0 && deployResult[0].value) {
        deploymentId = deployResult[0].value;
      } else {
        const altDeployResult = await (this.usersService as any).usersRepo.query(
          `SELECT value FROM system_settings WHERE key = 'google_appscript_deployment_id'`
        );
        if (altDeployResult.length > 0) deploymentId = altDeployResult[0].value;
      }

      let syncUrl = 'https://script.google.com/macros/s/AKfycbw6pAarz91qhP5HfTgnustbqF8ftTEpRV0Y03AuwaLRfzoILd3HIeVez0AqerATPyE8/exec';
      if (deploymentId && deploymentId.trim() !== '') {
        syncUrl = `https://script.google.com/macros/s/${deploymentId.trim()}/exec`;
      }

      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'executeFunction',
          functionName,
          arguments: funcArgs
        }),
      });

      if (!response.ok) {
        return { status: 'error', message: `Google Apps Script returned status ${response.status}` };
      }

      return await response.json();
    } catch (err: any) {
      console.error(`[InternshipController] Proxy error:`, err.message);
      return { status: 'error', message: `Proxy failed: ${err.message}` };
    }
  }

  // --- Local Database Helpers ---
  private async getSheetDataAsObjects(sheetName: string): Promise<any[]> {
    const rows = await (this.usersService as any).usersRepo.query(
      `SELECT data FROM internship_tables WHERE table_name = $1`,
      [sheetName]
    );
    return rows.map((r: any) => r.data || {});
  }

  private async appendObjectToSheet(sheetName: string, obj: any, idColName: string): Promise<void> {
    const recordId = String(obj[idColName] || obj.id || Date.now().toString());
    await (this.usersService as any).usersRepo.query(
      `INSERT INTO internship_tables (table_name, record_id, data, updated_at, is_synced)
       VALUES ($1, $2, $3, NOW(), false)
       ON CONFLICT (table_name, record_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW(), is_synced = false`,
      [sheetName, recordId, JSON.stringify(obj)]
    );
  }

  private async updateObjectInSheet(sheetName: string, idColName: string, idValue: string, updateData: any): Promise<void> {
    const rows = await (this.usersService as any).usersRepo.query(
      `SELECT data FROM internship_tables WHERE table_name = $1 AND record_id = $2`,
      [sheetName, String(idValue)]
    );
    if (rows.length === 0) return;
    const existing = rows[0].data || {};
    const merged = { ...existing, ...updateData };
    await (this.usersService as any).usersRepo.query(
      `UPDATE internship_tables SET data = $1, updated_at = NOW(), is_synced = false WHERE table_name = $2 AND record_id = $3`,
      [JSON.stringify(merged), sheetName, String(idValue)]
    );
  }

  private async deleteObjectInSheet(sheetName: string, idValue: string): Promise<void> {
    await (this.usersService as any).usersRepo.query(
      `DELETE FROM internship_tables WHERE table_name = $1 AND record_id = $2`,
      [sheetName, String(idValue)]
    );
  }

  // --- Local Function Execution Router ---
  private async executeLocalFunction(functionName: string, funcArgs: any[]): Promise<any> {
    const repo = (this.usersService as any).usersRepo;

    switch (functionName) {
      case 'getPublishedUrl': {
        return '/internship/index.html';
      }

      case 'studentLogin': {
        const [regId, mobile] = funcArgs;
        const students = await this.getSheetDataAsObjects('Internship Registrations');
        const student = students.find((s: any) => {
          const sRegId = s.RegistrationID ? String(s.RegistrationID).trim().toUpperCase() : '';
          const sRegNum = s.RegisterNumber ? String(s.RegisterNumber).trim().toUpperCase() : '';
          const sPhone = s.MobileNumber ? String(s.MobileNumber).trim() : '';
          const sEmail = s.GmailID ? String(s.GmailID).trim().toLowerCase() : '';

          const input = regId ? String(regId).trim() : '';
          const inputUpper = input.toUpperCase();
          const inputLower = input.toLowerCase();
          const mobInput = mobile ? String(mobile).trim() : '';

          return (sRegId === inputUpper || sRegNum === inputUpper || sPhone === input || sEmail === inputLower) &&
                 (sPhone === mobInput || sEmail === inputLower || sRegId === mobInput.toUpperCase() || sRegNum === mobInput.toUpperCase());
        });

        if (!student) {
          return { status: 'error', message: 'Invalid Registration ID or Password.' };
        }

        const status = String(student.ApplicationStatus || student.Status || '').toLowerCase();
        const allowedStatuses = ['approved', 'completed', 'active', 'assigned'];
        if (['pending', 'optout', 'deleted', 'rejected', 'on-hold'].includes(status)) {
          let msg = `Your account status is '${status}'. Login is not permitted.`;
          if (status === 'pending') msg = "Your application is still 'Pending' approval. Please wait for the admin to approve your request.";
          if (status === 'rejected') msg = "Your application has been 'Rejected'. Please contact the administrator.";
          return { status: 'error', message: msg };
        }

        if (status && !allowedStatuses.includes(status)) {
          return { status: 'error', message: `Access denied. Your current status is '${status}'. Please contact the administrator.` };
        }

        const compProfile = await this.executeLocalFunction('getStudentComprehensiveProfile', [student.RegistrationID]);
        return { status: 'success', studentData: compProfile };
      }

      case 'adminLogin': {
        const [adminId, password] = funcArgs;
        const admins = await this.getSheetDataAsObjects('Admin Credentials');
        const admin = admins.find((a: any) => {
          const aId = a.AdminID ? String(a.AdminID).trim().toLowerCase() : '';
          const aPass = a.Password ? String(a.Password).trim() : '';
          return aId === String(adminId).trim().toLowerCase() && aPass === String(password).trim();
        });
        if (admin) {
          return { status: 'success', name: admin.Name, email: admin.Email };
        }
        const coreAdmins = await repo.query(
          `SELECT full_name, email FROM users WHERE login_id = $1 AND status = 'active'`,
          [adminId]
        );
        if (coreAdmins.length > 0) {
          return { status: 'success', name: coreAdmins[0].full_name, email: coreAdmins[0].email };
        }
        return { status: 'error', message: 'Invalid Admin ID or Password.' };
      }

      case 'getStudentComprehensiveProfile':
      case 'getStudentComprehensiveData': {
        const [regId] = funcArgs;
        const regIdUpper = String(regId).toUpperCase();
        const registrations = await this.getSheetDataAsObjects('Internship Registrations');
        const student = registrations.find((s: any) => String(s.RegistrationID).toUpperCase() === regIdUpper);
        if (!student) return { status: 'error', message: 'Student details not found.' };

        const allTasks = await this.getSheetDataAsObjects('Tasks');
        const tasks = allTasks.filter((t: any) => String(t.StudentRegistrationID).toUpperCase() === regIdUpper);

        const allProjects = await this.getSheetDataAsObjects('Projects');
        const projects = allProjects.filter((p: any) => String(p.StudentRegistrationID).toUpperCase() === regIdUpper);

        const allAttendance = await this.getSheetDataAsObjects('Attendance');
        const attendance = allAttendance.filter((a: any) => String(a.StudentRegistrationID).toUpperCase() === regIdUpper);

        const allDiary = await this.getSheetDataAsObjects('StudentDiary');
        const studentDiary = allDiary.filter((d: any) => String(d.StudentRegistrationID).toUpperCase() === regIdUpper);
        const diaryMap: any = {};
        for (const entry of studentDiary) {
          if (entry.Date) diaryMap[entry.Date] = entry.Content || '';
        }

        const allCertificates = await this.getSheetDataAsObjects('Certificate Data');
        const certificate = allCertificates.find((c: any) => String(c.StudentRegistrationID).toUpperCase() === regIdUpper);

        const allNotifications = await this.getSheetDataAsObjects('Notifications');
        const notifications = allNotifications.sort((a: any, b: any) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());

        const allRequests = await this.getSheetDataAsObjects('StudentRequests');
        const attendanceRequests = allRequests.filter((r: any) => String(r.RegistrationID).toUpperCase() === regIdUpper);

        const allFiles = await this.getSheetDataAsObjects('FileManager');
        const files = allFiles.filter((f: any) => String(f.StudentRegistrationID).toUpperCase() === regIdUpper);

        const presentCount = attendance.filter((a: any) => String(a.Status).toLowerCase().includes('present') || String(a.Status).toLowerCase().includes('late')).length;
        const absentCount = attendance.filter((a: any) => String(a.Status).toLowerCase().includes('absent')).length;
        const totalDays = attendance.length;
        const attPercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

        return {
          registrationId: student.RegistrationID,
          name: `${student.FirstName || ''} ${student.LastName || ''}`.trim(),
          firstName: student.FirstName || '',
          middleName: student.MiddleName || '',
          lastName: student.LastName || '',
          email: student.GmailID || '',
          mobile: student.MobileNumber || '',
          batch: student.Batch || '',
          college: student.CollegeName || '',
          department: student.Department || '',
          year: student.Year || '',
          registerNumber: student.RegisterNumber || '',
          addressLine: student.Address || '',
          district: student.District || '',
          pincode: student.Pincode || '',
          appliedDate: student.Timestamp || '',
          status: String(student.ApplicationStatus || student.Status || '').toLowerCase(),
          startDate: student.InternshipStartDate || '',
          endDate: student.InternshipEndDate || '',
          educationType: student.EducationType || '',
          semester: student.Semester || '',
          durationDays: student.DurationDays || 0,
          lastLogin: student.LastLogin || '',
          profilePhotoUrl: student.ProfilePhotoUrl || '',
          rfidTag: student.RFID_TagID || '',
          attendance: attendance,
          tasks: tasks,
          projects: projects,
          diary: { status: 'success', diary: diaryMap },
          certificate: certificate ? {
            CertificateNumber: certificate.CertificateNumber,
            IssuedDate: certificate.IssuedDate,
            Status: certificate.Status || 'Issued',
            Link: certificate.CertificatePdfId || ''
          } : null,
          notifications: notifications,
          attendanceRequests: attendanceRequests,
          files: files,
          summary: {
            totalDays,
            presentCounter: presentCount,
            absentCounter: absentCount,
            attendancePercentage: attPercentage
          }
        };
      }

      case 'getAdminComprehensiveData': {
        const studentsList = await this.getSheetDataAsObjects('Internship Registrations');
        const attendance = await this.getSheetDataAsObjects('Attendance');
        
        const totalStudents = studentsList.length;
        const activeStudents = studentsList.filter((s: any) => ['approved', 'active', 'assigned'].includes(String(s.ApplicationStatus || s.Status || '').toLowerCase())).length;
        const pendingStudents = studentsList.filter((s: any) => String(s.ApplicationStatus || s.Status || '').toLowerCase() === 'pending').length;

        // Attendance stats for today
        const todayStr = new Date().toLocaleDateString('en-IN');
        const todayAttendance = attendance.filter((a: any) => a.Date === todayStr);
        const todayPresent = todayAttendance.filter((a: any) => String(a.Status).toLowerCase().includes('present') || String(a.Status).toLowerCase().includes('late')).length;

        const stats = {
          totalStudents,
          activeStudents,
          pendingStudents,
          todayPresent
        };

        const notifications = await this.getSheetDataAsObjects('AdminNotifications');
        
        const settings: any = {};
        const appSettingsRows = await this.getSheetDataAsObjects('AppSettings');
        for (const s of appSettingsRows) {
          if (s.SettingKey) settings[s.SettingKey] = s.SettingValue || '';
        }

        const switchStatus: any = {};
        const switchStatusRows = await this.getSheetDataAsObjects('Switch_Status');
        for (const s of switchStatusRows) {
          if (s.SwitchKey) switchStatus[s.SwitchKey] = s.Status || false;
        }

        const templates = await this.getSheetDataAsObjects('EmailTemplates');
        const batches = await this.getSheetDataAsObjects('Batches');
        const recentActivity = await this.getSheetDataAsObjects('RecentActivityLog');
        const applications = studentsList.filter((s: any) => !['completed', 'optout', 'deleted', 'rejected'].includes(String(s.ApplicationStatus || s.Status || '').toLowerCase()));

        return {
          status: 'success',
          stats,
          notifications: notifications.slice(0, 50),
          settings,
          switchStatus,
          templates,
          batches,
          recentActivity: recentActivity.slice(0, 20),
          applications,
          students: studentsList
        };
      }

      case 'recordWebCheckin':
      case 'studentCheckin': {
        const [regId] = funcArgs;
        const todayStr = new Date().toLocaleDateString('en-IN');
        const studentRows = await this.getSheetDataAsObjects('Internship Registrations');
        const student = studentRows.find((s: any) => String(s.RegistrationID).toUpperCase() === String(regId).toUpperCase());
        if (!student) return { status: 'error', message: 'Student registration not found.' };

        const attendanceRows = await this.getSheetDataAsObjects('Attendance');
        const alreadyCheckedIn = attendanceRows.find((a: any) => String(a.StudentRegistrationID).toUpperCase() === String(regId).toUpperCase() && a.Date === todayStr);
        if (alreadyCheckedIn && alreadyCheckedIn.InTime) {
          return { status: 'error', message: 'Already checked in today.' };
        }

        const newCheckin = {
          AttendanceID: "ATT_" + Date.now(),
          StudentRegistrationID: regId,
          StudentName: `${student.FirstName || ''} ${student.LastName || ''}`.trim(),
          Date: todayStr,
          Status: 'Present',
          InTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          OutTime: "",
          EntryMode: "Web",
          checkin_source: "WEB",
          late_flag: false,
          Timestamp: new Date().toISOString()
        };

        await this.appendObjectToSheet('Attendance', newCheckin, 'AttendanceID');
        return { status: 'success', message: 'Checked in successfully.', slot: { start: '09:00 AM', end: '05:00 PM' } };
      }

      case 'recordWebCheckout':
      case 'studentCheckout': {
        const [regId] = funcArgs;
        const todayStr = new Date().toLocaleDateString('en-IN');
        const attendanceRows = await this.getSheetDataAsObjects('Attendance');
        const record = attendanceRows.find((a: any) => String(a.StudentRegistrationID).toUpperCase() === String(regId).toUpperCase() && a.Date === todayStr);
        if (!record || !record.InTime) {
          return { status: 'error', message: 'Not checked in today.' };
        }
        if (record.OutTime) {
          return { status: 'error', message: 'Already checked out today.' };
        }

        const outTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        await this.updateObjectInSheet('Attendance', 'AttendanceID', record.AttendanceID, { OutTime: outTime });
        return { status: 'success', message: 'Checked out successfully.' };
      }

      case 'saveDiary':
      case 'saveDiaryEntry': {
        const [regId, date, content] = funcArgs;
        const diaryRows = await this.getSheetDataAsObjects('StudentDiary');
        const existing = diaryRows.find((d: any) => String(d.StudentRegistrationID).toUpperCase() === String(regId).toUpperCase() && d.Date === date);

        const newEntry = {
          StudentRegistrationID: regId,
          Date: date,
          Content: content,
          Status: 'Saved',
          Timestamp: new Date().toISOString()
        };

        const recordId = `${regId}_${date}`;
        await repo.query(
          `INSERT INTO internship_tables (table_name, record_id, data, updated_at, is_synced)
           VALUES ($1, $2, $3, NOW(), false)
           ON CONFLICT (table_name, record_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW(), is_synced = false`,
          ['StudentDiary', recordId, JSON.stringify(newEntry)]
        );
        return { status: 'success', message: 'Diary entry saved successfully.' };
      }

      case 'submitStudentRequest':
      case 'studentRequestLeave': {
        const [requestObj] = funcArgs;
        const reqId = "REQ_" + Date.now();
        const newRequest = {
          ...requestObj,
          RequestID: reqId,
          RequestDate: new Date().toISOString(),
          Status: 'Pending'
        };
        await this.appendObjectToSheet('StudentRequests', newRequest, 'RequestID');
        return { status: 'success', message: 'Request submitted successfully.', requestId: reqId };
      }

      case 'createNoticeCircular':
      case 'broadcastNotice': {
        const [noticeObj] = funcArgs;
        const noticeId = "NTC_" + Date.now();
        const newNotice = {
          ...noticeObj,
          NoticeID: noticeId,
          CreatedDate: new Date().toISOString(),
          Status: 'Active'
        };
        await this.appendObjectToSheet('NoticesCirculars', newNotice, 'NoticeID');
        return { status: 'success', message: 'Notice created successfully.', noticeId };
      }

      case 'updateApplicationStatus':
      case 'updateStudentStatus': {
        const [regId, status] = funcArgs;
        await this.updateObjectInSheet('Internship Registrations', 'RegistrationID', regId, { ApplicationStatus: status });
        return { status: 'success', message: `Application status updated to ${status}.` };
      }

      case 'saveAppSettings': {
        const [settings] = funcArgs;
        for (const key in settings) {
          const newSetting = {
            SettingKey: key,
            SettingValue: settings[key]
          };
          await this.appendObjectToSheet('AppSettings', newSetting, 'SettingKey');

          if (key === 'GS_SCRIPT_ID') {
            const scriptIdVal = String(settings[key] || '').trim();
            if (scriptIdVal) {
              await repo.query(
                `INSERT INTO system_settings (key, value, category, description, is_private)
                 VALUES ('google_sheets_deployment_id', $1, 'integration', 'Google Sheets Apps Script Macro Deployment ID', false)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                [scriptIdVal]
              );
              await repo.query(
                `INSERT INTO system_settings (key, value, category, description, is_private)
                 VALUES ('google_appscript_deployment_id', $1, 'integration', 'Google Sheets Apps Script Macro Deployment ID', false)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                [scriptIdVal]
              );
            }
          }
        }
        return { status: 'success', message: 'Settings saved successfully.' };
      }

      case 'saveSwitchStatus': {
        const [key, state] = funcArgs;
        const newSwitch = {
          SwitchKey: key,
          Status: state,
          LastUpdated: new Date().toISOString()
        };
        await this.appendObjectToSheet('Switch_Status', newSwitch, 'SwitchKey');
        return { status: 'success', message: 'Switch status saved successfully.' };
      }

      case 'saveBatch': {
        const [batchObj] = funcArgs;
        const batchId = batchObj.BatchID || "BCH_" + Date.now();
        const newBatch = {
          ...batchObj,
          BatchID: batchId
        };
        await this.appendObjectToSheet('Batches', newBatch, 'BatchID');
        return { status: 'success', message: 'Batch saved successfully.', batchId };
      }

      case 'deleteBatch': {
        const [batchId] = funcArgs;
        await this.deleteObjectInSheet('Batches', batchId);
        return { status: 'success', message: 'Batch deleted successfully.' };
      }

      case 'deleteDependentStudentData': {
        const [regId] = funcArgs;
        await this.deleteObjectInSheet('Internship Registrations', regId);
        await repo.query(`DELETE FROM internship_tables WHERE table_name = 'Tasks' AND data->>'StudentRegistrationID' = $1`, [regId]);
        await repo.query(`DELETE FROM internship_tables WHERE table_name = 'Projects' AND data->>'StudentRegistrationID' = $1`, [regId]);
        await repo.query(`DELETE FROM internship_tables WHERE table_name = 'Attendance' AND data->>'StudentRegistrationID' = $1`, [regId]);
        await repo.query(`DELETE FROM internship_tables WHERE table_name = 'StudentDiary' AND data->>'StudentRegistrationID' = $1`, [regId]);
        await repo.query(`DELETE FROM internship_tables WHERE table_name = 'StudentRequests' AND data->>'RegistrationID' = $1`, [regId]);
        await repo.query(`DELETE FROM internship_tables WHERE table_name = 'FileManager' AND data->>'StudentRegistrationID' = $1`, [regId]);
        return { status: 'success', message: 'Student data deleted successfully.' };
      }

      case 'getAllSwitchStatuses': {
        const rows = await this.getSheetDataAsObjects('Switch_Status');
        const switchStatus: any = {};
        for (const s of rows) {
          if (s.SwitchKey) switchStatus[s.SwitchKey] = s.Status || false;
        }
        return { status: 'success', data: switchStatus };
      }

      // Fallbacks / File Manager Mocks
      case 'adminDeleteFolder':
      case 'adminDeleteFile':
      case 'adminRenameFile':
      case 'adminCreateCustomFolder':
      case 'adminRenameCustomFolder':
      case 'getAppSettings': {
        const settings: any = {};
        const appSettingsRows = await this.getSheetDataAsObjects('AppSettings');
        for (const s of appSettingsRows) {
          if (s.SettingKey) settings[s.SettingKey] = s.SettingValue || '';
        }
        // Add defaults if they are missing
        if (!settings['RFID_Automation_Mode']) settings['RFID_Automation_Mode'] = 'Manual';
        if (!settings['DefaultSlotAssignment']) settings['DefaultSlotAssignment'] = 'Manual';
        if (!settings['CertificateTriggerMode']) settings['CertificateTriggerMode'] = 'Manual';

        // Fallback to system_settings for GS_SCRIPT_ID if missing
        if (!settings['GS_SCRIPT_ID']) {
          const deployResult = await repo.query(`SELECT value FROM system_settings WHERE key = 'google_sheets_deployment_id'`);
          if (deployResult.length > 0 && deployResult[0].value) {
            settings['GS_SCRIPT_ID'] = deployResult[0].value;
          }
        }
        return { status: 'success', data: settings };
      }

      case 'getBatches': {
        const batchesData = await this.getSheetDataAsObjects('Batches');
        const studentsData = await this.getSheetDataAsObjects('Internship Registrations');
        const tasksData = await this.getSheetDataAsObjects('Tasks');
        const projectsData = await this.getSheetDataAsObjects('Projects');

        const batches = batchesData.map((batch: any) => {
          const batchName = String(batch.BatchName || '').trim();
          const batchId = String(batch.BatchID || '').trim();
          const targetBatchValue = batchName.replace(/\s+/g, '').toLowerCase();
          const targetBatchIdValue = batchId.replace(/\s+/g, '').toLowerCase();

          const batchStudents = studentsData.filter((student: any) => {
            const stuBatch = String(student.Batch || '').replace(/\s+/g, '').toLowerCase();
            return stuBatch === targetBatchValue || (targetBatchIdValue && stuBatch === targetBatchIdValue);
          });

          const regIds = batchStudents.map((s: any) => String(s.RegistrationID).trim().toLowerCase());
          const taskCount = tasksData.filter((t: any) => regIds.includes(String(t.StudentRegistrationID).trim().toLowerCase())).length;
          const projectCount = projectsData.filter((p: any) => regIds.includes(String(p.StudentRegistrationID).trim().toLowerCase())).length;

          return {
            id: batch.BatchID,
            name: batch.BatchName,
            mentor: batch.Mentor,
            project: batch.Project || '',
            workArea: batch.WorkArea || 'General',
            studentCount: batchStudents.length,
            taskCount: taskCount,
            projectCount: projectCount,
            studentNames: batchStudents.map((s: any) => `${s.FirstName || ''} ${s.LastName || ''} ${s.RegistrationID}`).join('|'),
            description: batch.Description || '',
            skillLearned: batch.SkillLearned || batch['Skill Learned'] || '',
            status: batch.Status || 'Active'
          };
        });
        return { status: 'success', data: batches };
      }

      case 'getEmailTemplates': {
        const data = await this.getSheetDataAsObjects('EmailTemplates');
        const templates: any = {};
        data.forEach((t: any) => {
          templates[t.Type] = {
            subject: t.Subject,
            content: t.Body
          };
        });
        return { status: 'success', data: templates };
      }

      case 'getRecentActivity': {
        const recentActivity = await this.getSheetDataAsObjects('RecentActivityLog');
        recentActivity.sort((a: any, b: any) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
        return { status: 'success', data: recentActivity.slice(0, 20) };
      }

      case 'syncGoogleSheets': {
        console.log('[InternshipController] Manual sync triggered from Admin Panel.');
        await this.syncService.syncInternshipData();
        return { status: 'success', message: 'Synchronization with Google Sheets completed successfully!' };
      }

      default: {
        throw new Error(`Function "${functionName}" is not implemented locally.`);
      }
    }
  }
}
