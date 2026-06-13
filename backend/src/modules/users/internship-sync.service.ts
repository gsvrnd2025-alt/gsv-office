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

      let syncUrl = 'https://script.google.com/macros/s/AKfycbw6pAarz91qhP5HfTgnustbqF8ftTEpRV0Y03AuwaLRfzoILd3HIeVez0AqerATPyE8/exec';
      if (deploymentId && deploymentId.trim() !== '') {
        syncUrl = `https://script.google.com/macros/s/${deploymentId.trim()}/exec`;
      }

      // 3. Send bidirectional sync request
      this.logger.log(`Sending sync request to Google Sheets (deployment: ${deploymentId})...`);
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all_data',
          updates
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script returned status ${response.status}`);
      }

      const res = await response.json();
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
    } catch (err: any) {
      this.logger.error(`Internship portal synchronization failed: ${err.message}`);
    } finally {
      this.isSyncing = false;
    }
  }
}
