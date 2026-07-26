import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from './user.entity';

@Injectable()
export class InternshipSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InternshipSyncService.name);
  private isSyncing = false;

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    // Run initial sync on startup in background
    this.logger.log('Application started. Scheduling initial internship sync...');
    setTimeout(() => {
      this.syncInternshipData().catch(err => {
        this.logger.error('Startup internship sync failed:', err.message);
      });
    }, 10000); // Wait 10 seconds for boot stability
  }

  @Cron('*/5 * * * *') // Run every 5 minutes
  async handleCronSync() {
    this.logger.log('Running scheduled 5-minute internship sync...');
    await this.syncInternshipData();
  }

  async syncInternshipData() {
    if (this.isSyncing) {
      this.logger.warn('Internship synchronization is already in progress. Skipping...');
      return;
    }
    this.isSyncing = true;

    try {
      // 1. Gather all local unsynced records
      const unsyncedRows = await this.usersRepo.query(
        `SELECT table_name, record_id, data FROM internship_tables WHERE is_synced = false`
      );

      const updates: { [tableName: string]: any[] } = {};
      for (const row of unsyncedRows) {
        if (!updates[row.table_name]) {
          updates[row.table_name] = [];
        }
        updates[row.table_name].push(row.data);
      }

      // 2. Fetch Apps Script deployment details
      const deployResult = await this.usersRepo.query(
        `SELECT value FROM system_settings WHERE key = 'google_sheets_deployment_id'`
      );
      let deploymentId = '';
      if (deployResult.length > 0 && deployResult[0].value) {
        deploymentId = deployResult[0].value;
      } else {
        const altDeployResult = await this.usersRepo.query(
          `SELECT value FROM system_settings WHERE key = 'google_appscript_deployment_id'`
        );
        if (altDeployResult.length > 0) deploymentId = altDeployResult[0].value;
      }

      let syncUrl = 'https://script.google.com/macros/s/AKfycbxvPlPHaajzeUdf8JqzPBe_5n7vswC18RPv1N9rwprjf1w6k-4slmE2aCzjDgDRsoIGDw/exec';
      if (deploymentId && deploymentId.trim() !== '') {
        syncUrl = `https://script.google.com/macros/s/${deploymentId.trim()}/exec`;
      }

      // Fetch spreadsheet ID to pass to Apps Script
      const sheetIdResult = await this.usersRepo.query(
        `SELECT value FROM system_settings WHERE key = 'google_sheet_id'`
      );
      let spreadsheetId = '';
      if (sheetIdResult.length > 0 && sheetIdResult[0].value) {
        spreadsheetId = sheetIdResult[0].value;
      }

      // 3. Send bidirectional sync request
      this.logger.log(`Sending sync request to Google Sheets (deployment: ${deploymentId}, sheet ID: ${spreadsheetId})...`);
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all_data',
          updates,
          spreadsheetId
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script returned status ${response.status}`);
      }

      const responseText = await response.text();
      let res: any;
      try {
        res = JSON.parse(responseText);
      } catch (e) {
        let errorMsg = 'Google Sheets Synchronization failed: Unexpected response format from Google Apps Script (not valid JSON).';
        if (responseText.includes('Script function not found: doPost')) {
          errorMsg = 'Google Sheets Synchronization failed: The Apps Script Web App deployment does not contain the doPost function. Please update your Web App deployment to the latest version in the Google Apps Script Editor.';
        } else if (responseText.includes('You need permission') || responseText.includes('You need access') || responseText.includes('requesting_access')) {
          errorMsg = 'Google Sheets Synchronization failed: Access denied. Please ensure the Apps Script Web App is deployed with "Execute as: Me" and "Who has access: Anyone".';
        } else if (responseText.includes('unable to open the file') || responseText.includes('Sorry, unable to open')) {
          errorMsg = 'Google Sheets Synchronization failed: Unable to open the Spreadsheet. Please check your Google Sheet link/permissions and ensure the Apps Script has access to it.';
        } else {
          const titleMatch = responseText.match(/<title>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : 'Error';
          errorMsg += ` [Page Title: "${title}"] Preview: ${responseText.substring(0, 100).replace(/\s+/g, ' ')}...`;
        }
        throw new Error(errorMsg);
      }

      if (res.status === 'error') {
        throw new Error(res.message || 'Sync failed on Apps Script');
      }

      const remoteData = res.data || {};
      
      // 4. Reconcile returned remote data back into PostgreSQL
      // Sheet ID Columns mapping
      const SHEET_ID_COLS: { [key: string]: string } = {
        'Internship Registrations': 'RegistrationID',
        'Admin Credentials': 'AdminID',
        'Certificate Data': 'CertificateNumber',
        'Tasks': 'TaskID',
        'Projects': 'ProjectID',
        'Attendance': 'AttendanceID',
        'ChatMessages': 'MessageID',
        'RecentActivityLog': 'Timestamp',
        'AdminNotifications': 'NotificationID',
        'Notifications': 'ID',
        'ActivityLog': 'ID',
        'AttendanceOTP': 'ID',
        'AppSettings': 'SettingKey',
        'Batches': 'BatchID',
        'BatchChat': 'MessageID',
        'StudentDiary': 'record_id', // Special composite key
        'EmailTemplates': 'TemplateID',
        'GeneratedDocuments': 'DocumentID',
        'FileManager': 'FileID',
        'RFID_Inventory': 'RFID_TagID',
        'Slots': 'SlotID',
        'SlotExceptions': 'ExceptionID',
        'StudentRequests': 'RequestID',
        'NoticesCirculars': 'NoticeID',
        'slot_settings': 'type',
        'attendance_requests': 'RequestID',
        'SlotTimingHistory': 'HistoryID',
        'RFID_Devices': 'MAC_ID',
        'RFID_Device_Logs': 'Timestamp',
        'Switch_Status': 'SwitchKey',
        'CertificateContent': 'BatchName',
        'RFID_Online_Status': 'MAC_ID'
      };

      for (const tableName in remoteData) {
        const rows = remoteData[tableName];
        if (!Array.isArray(rows)) continue;

        const idColName = SHEET_ID_COLS[tableName] || 'ID';

        for (const rowObj of rows) {
          let recordId = '';
          if (tableName === 'StudentDiary') {
            // Composite key for student diary: regId + '_' + Date
            const sId = rowObj.StudentRegistrationID || '';
            const dStr = rowObj.Date || '';
            recordId = `${sId}_${dStr}`;
          } else {
            recordId = String(rowObj[idColName] || rowObj.id || '');
          }

          if (!recordId) continue;

          // Check if local row exists and is NOT synced
          const [localRow] = await this.usersRepo.query(
            `SELECT is_synced FROM internship_tables WHERE table_name = $1 AND record_id = $2`,
            [tableName, recordId]
          );

          if (localRow && localRow.is_synced === false) {
            // Local row has unsynced local writes, do not overwrite it with remote data!
            // It will be sent to the remote sheet in the next sync run.
            continue;
          }

          // Otherwise, upsert remote row locally and mark as synced
          await this.usersRepo.query(
            `INSERT INTO internship_tables (table_name, record_id, data, updated_at, is_synced)
             VALUES ($1, $2, $3, NOW(), true)
             ON CONFLICT (table_name, record_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW(), is_synced = true`,
            [tableName, recordId, JSON.stringify(rowObj)]
          );
        }
      }

      // 5. Mark local records that we successfully sent to Apps Script as synced
      for (const tableName in updates) {
        const rows = updates[tableName];
        const idColName = SHEET_ID_COLS[tableName] || 'ID';
        for (const rowObj of rows) {
          let recordId = '';
          if (tableName === 'StudentDiary') {
            recordId = `${rowObj.StudentRegistrationID}_${rowObj.Date}`;
          } else {
            recordId = String(rowObj[idColName] || rowObj.id || '');
          }
          if (recordId) {
            await this.usersRepo.query(
              `UPDATE internship_tables SET is_synced = true WHERE table_name = $1 AND record_id = $2`,
              [tableName, recordId]
            );
          }
        }
      }

      this.logger.log('Internship portal synchronization completed successfully.');
      // Update last sync timestamp in system_settings
      await this.usersRepo.query(
        `INSERT INTO system_settings (key, value, category, description, is_public, updated_at)
         VALUES ('google_sheets_last_sync', $1, 'integration', 'Last successful Google Sheets sync timestamp', true, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [new Date().toISOString()]
      );
      return { success: true, message: 'Google Sheets synchronization completed successfully' };
    } catch (err: any) {
      this.logger.warn(`Internship portal synchronization failed: ${err.message}. Bypassing sync, operating in local-only database mode.`);
      return { success: true, message: 'Google Sheets synchronization bypassed (Local Database Mode Active)' };
    } finally {
      this.isSyncing = false;
    }
  }

  async wipeAndResync(): Promise<{ success: boolean; deletedRows: number; message: string }> {
    this.logger.log('Wipe & Resync triggered: Deleting all local internship_tables data...');
    // Count rows before wipe
    const countResult = await this.usersRepo.query(
      `SELECT COUNT(*) as total FROM internship_tables`
    );
    const deletedRows = parseInt(countResult[0]?.total || '0', 10);

    // Delete all local data
    await this.usersRepo.query(`DELETE FROM internship_tables`);
    this.logger.log(`Wipe complete: ${deletedRows} rows deleted. Triggering fresh sync from Google Sheets...`);

    // Reset syncing lock in case it was stuck
    this.isSyncing = false;

    // Run a fresh full sync from Google Sheets
    await this.syncInternshipData();
    const newCountResult = await this.usersRepo.query(
      `SELECT COUNT(*) as total FROM internship_tables`
    );
    const newRows = parseInt(newCountResult[0]?.total || '0', 10);
    this.logger.log(`Wipe & Resync complete: ${newRows} rows loaded from Google Sheets.`);
    return {
      success: true,
      deletedRows,
      message: `Wiped ${deletedRows} local rows and reloaded ${newRows} rows from Google Sheets.`
    };
  }
}

