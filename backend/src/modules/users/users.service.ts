import {
  Injectable, NotFoundException, ConflictException, BadRequestException, OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/create-user.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private auditService: AuditService,
  ) {}

  async onApplicationBootstrap() {
    try {
      // Ensure internship_tables exists
      await this.usersRepo.query(`
        CREATE TABLE IF NOT EXISTS internship_tables (
          table_name VARCHAR(100) NOT NULL,
          record_id VARCHAR(255) NOT NULL,
          data JSONB NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          is_synced BOOLEAN DEFAULT false,
          PRIMARY KEY (table_name, record_id)
        );
        CREATE INDEX IF NOT EXISTS idx_internship_tables_name ON internship_tables(table_name);
      `);
      console.log('[UsersService] Verified internship_tables exists.');

      // Reset all users' online status to false on application bootstrap
      await this.usersRepo.createQueryBuilder()
        .update(User)
        .set({ isOnline: false })
        .where('is_online = :isOnline', { isOnline: true })
        .execute();
      console.log('[UsersService] Reset all users online status to offline on bootstrap.');

      const count = await this.usersRepo.count();
      if (count <= 1) {
        console.log('[UsersService] Only default user found. Automatically triggering Google Sheets sync...');
        await this.syncSheets();
        console.log('[UsersService] Auto-sync completed.');
      }
    } catch (err) {
      console.error('[UsersService] Auto-sync failed on startup:', err);
    }
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string;
    status?: string; departmentId?: string; roleId?: string;
  }) {
    const { page = 1, limit = 20, search, status, departmentId, roleId } = query;
    const skip = (page - 1) * limit;

    const qb = this.usersRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.deletedAt IS NULL');

    if (search) {
      qb.andWhere(
        '(user.full_name ILIKE :search OR user.email ILIKE :search OR user.login_id ILIKE :search OR user.employee_id ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('user.status = :status', { status });
    if (departmentId) qb.andWhere('user.department_id = :departmentId', { departmentId });
    if (roleId) qb.andWhere('user.role_id = :roleId', { roleId });

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: data.map(this.sanitize),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['role', 'department'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private cleanPayload(dto: any) {
    const clean = { ...dto };
    for (const key of Object.keys(clean)) {
      if (clean[key] === '') {
        clean[key] = null;
      }
    }
    return clean;
  }

  async create(dto: CreateUserDto, createdBy?: string): Promise<User> {
    const cleanDto = this.cleanPayload(dto);

    // Auto-generate loginId if not provided
    let loginId = cleanDto.loginId;
    if (!loginId || loginId.trim() === '') {
      const base = (cleanDto.firstName || cleanDto.fullName || 'user')
        .trim()
        .split(/\s+/)[0]
        .replace(/[^a-zA-Z0-9]/g, '');
      const baseCapitalized = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
      
      const existingUsers = await this.usersRepo.query(
        `SELECT login_id FROM users WHERE login_id ~* $1`,
        [`^${baseCapitalized}\\d{3}$`]
      );
      
      let maxSerial = 0;
      for (const u of existingUsers) {
        const serialPart = u.login_id.slice(baseCapitalized.length);
        const num = parseInt(serialPart, 10);
        if (!isNaN(num) && num > maxSerial) {
          maxSerial = num;
        }
      }
      loginId = `${baseCapitalized}${String(maxSerial + 1).padStart(3, '0')}`;
      cleanDto.loginId = loginId;
    }

    // Auto-generate email if not provided
    if (!cleanDto.email || cleanDto.email.trim() === '') {
      cleanDto.email = `${loginId.toLowerCase()}@gsv.local`;
    }

    // Auto-generate password if not provided
    let password = cleanDto.password;
    if (!password || password.trim() === '') {
      const base = (cleanDto.firstName || cleanDto.fullName || 'User')
        .trim()
        .split(/\s+/)[0]
        .replace(/[^a-zA-Z]/g, '');
      const baseCapitalized = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase() || 'User';
      password = `${baseCapitalized}@ABCD`;
      cleanDto.password = password;
    }

    // Check for duplicates after generating
    const existing = await this.usersRepo.findOne({
      where: [{ email: cleanDto.email }, { loginId: cleanDto.loginId }],
    });
    if (existing) {
      throw new ConflictException(
        existing.email === cleanDto.email ? 'Email already in use' : 'Login ID already in use',
      );
    }

    const passwordHash = await bcrypt.hash(cleanDto.password, 12);
    const employeeId = await this.generateEmployeeId();

    const user = this.usersRepo.create({
      ...cleanDto,
      passwordHash,
      employeeId,
      createdBy,
    } as any) as any as User;

    const saved = await this.usersRepo.save(user);
    await this.createPrivateUserFolder(saved);

    await this.auditService.log({
      userId: createdBy,
      action: 'create',
      resourceType: 'user',
      resourceId: saved.id,
      description: `Created user ${saved.loginId}`,
    });

    return saved;
  }

  async update(id: string, dto: UpdateUserDto, updatedBy?: string): Promise<User> {
    const user = await this.findById(id);
    const old = { ...user };
    const cleanDto = this.cleanPayload(dto);

    if (cleanDto.password && cleanDto.password.trim() !== '') {
      user.passwordHash = await bcrypt.hash(cleanDto.password, 12);
    }
    delete cleanDto.password;

    Object.assign(user, cleanDto);
    const saved = await this.usersRepo.save(user);

    await this.auditService.log({
      userId: updatedBy,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      oldData: old,
      newData: cleanDto,
    });

    return this.sanitize(saved) as any;
  }

  async updateStatus(id: string, status: string, roleId?: string, permissions?: string[], updatedBy?: string): Promise<void> {
    const user = await this.findById(id);
    
    const updatePayload: any = { status: status as any };
    if (roleId) {
      updatePayload.roleId = roleId;
    }
    
    await this.usersRepo.update(id, updatePayload);

    if (permissions) {
      // Clear existing overrides
      await this.usersRepo.query(`DELETE FROM user_permissions WHERE user_id = $1`, [id]);
      
      // Insert new overrides
      for (const permId of permissions) {
        await this.usersRepo.query(
          `INSERT INTO user_permissions (user_id, permission_id, granted) VALUES ($1, $2, true)
           ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true`,
          [id, permId]
        );
      }
    }

    await this.auditService.log({
      userId: updatedBy,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      description: `Status changed from ${user.status} to ${status} (Role: ${roleId || 'none'})`,
    });
  }

  async resetPassword(id: string, newPassword: string, updatedBy?: string): Promise<void> {
    await this.findById(id);
    const hash = await bcrypt.hash(newPassword, 12);
    await this.usersRepo.update(id, {
      passwordHash: hash,
      forcePasswordChange: true,
    });
    await this.auditService.log({
      userId: updatedBy,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      description: 'Password reset by admin',
    });
  }

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.findById(id);
    await this.usersRepo.softDelete(id);
    await this.auditService.log({
      userId: deletedBy,
      action: 'delete',
      resourceType: 'user',
      resourceId: id,
    });
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<void> {
    await this.usersRepo.update(id, { avatarUrl });
  }

  async setOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await this.usersRepo.update(id, {
      isOnline,
      lastSeen: isOnline ? undefined : new Date(),
    });
  }

  private async generateEmployeeId(): Promise<string> {
    const count = await this.usersRepo.count({ withDeleted: true });
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }

  async syncSheets(adminId?: string) {
    try {
      // 1. Fetch current database records
      const users = await this.usersRepo.query(`SELECT id, employee_id AS "employeeId", login_id AS "loginId", email, full_name AS "fullName", phone, designation, role_id AS "roleId", department_id AS "departmentId", status, password_hash AS "passwordHash" FROM users WHERE deleted_at IS NULL`);
      const departments = await this.usersRepo.query(`SELECT id, name, description, color FROM departments WHERE deleted_at IS NULL`);
      const roles = await this.usersRepo.query(`SELECT id, name, description, color, level, is_system AS "isSystem" FROM roles WHERE deleted_at IS NULL`);
      const settings = await this.usersRepo.query(`SELECT key, value, category, description FROM system_settings`);

      // 2. Fetch sheet sync settings (with fallback)
      let deploymentId = '';
      const deployResult = await this.usersRepo.query(`SELECT value FROM system_settings WHERE key = 'google_sheets_deployment_id'`);
      if (deployResult.length > 0 && deployResult[0].value) {
        deploymentId = deployResult[0].value;
      } else {
        const altDeployResult = await this.usersRepo.query(`SELECT value FROM system_settings WHERE key = 'google_appscript_deployment_id'`);
        if (altDeployResult.length > 0) deploymentId = altDeployResult[0].value;
      }
      
      let spreadsheetUrl = '';
      const sheetUrlResult = await this.usersRepo.query(`SELECT value FROM system_settings WHERE key = 'google_sheets_spreadsheet_url'`);
      if (sheetUrlResult.length > 0 && sheetUrlResult[0].value) {
        spreadsheetUrl = sheetUrlResult[0].value;
      } else {
        const altSheetUrlResult = await this.usersRepo.query(`SELECT value FROM system_settings WHERE key = 'google_sheet_link'`);
        if (altSheetUrlResult.length > 0) spreadsheetUrl = altSheetUrlResult[0].value;
      }

      let syncUrl = 'https://script.google.com/macros/s/AKfycbw6pAarz91qhP5HfTgnustbqF8ftTEpRV0Y03AuwaLRfzoILd3HIeVez0AqerATPyE8/exec';
      if (deploymentId && deploymentId.trim() !== '') {
        syncUrl = `https://script.google.com/macros/s/${deploymentId.trim()}/exec`;
      }

      // 3. Post data to Apps Script Web App
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          spreadsheetUrl,
          users,
          departments,
          roles,
          settings,
        }),
      });

      if (!response.ok) {
        throw new BadRequestException(`Google Sheets endpoint returned status ${response.status}`);
      }

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
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
        throw new BadRequestException(errorMsg);
      }

      if (!result.success) {
        throw new BadRequestException(result.message || 'Sync failed on Apps Script');
      }

      const remoteData = result.data;
      if (!remoteData) {
        throw new BadRequestException('Apps Script returned no sync data');
      }

      // 4. Perform upserts into local PostgreSQL
      // A. Sync Roles
      if (Array.isArray(remoteData.roles)) {
        for (const r of remoteData.roles) {
          if (!r.id || !r.name) continue;
          await this.usersRepo.query(
            `INSERT INTO roles (id, name, description, color, level, is_system, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               color = EXCLUDED.color,
               level = EXCLUDED.level,
               is_system = EXCLUDED.is_system,
               updated_at = NOW()`,
            [r.id, r.name, r.description || null, r.color || '#6366f1', Number(r.level) || 0, r.isSystem === 'TRUE' || r.isSystem === true]
          );
        }
      }

      // B. Sync Departments
      if (Array.isArray(remoteData.departments)) {
        for (const d of remoteData.departments) {
          if (!d.id || !d.name) continue;
          await this.usersRepo.query(
            `INSERT INTO departments (id, name, description, color, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               color = EXCLUDED.color,
               updated_at = NOW()`,
            [d.id, d.name, d.description || null, d.color || '#6366f1']
          );
        }
      }

      // C. Sync Users
      if (Array.isArray(remoteData.users)) {
        for (const u of remoteData.users) {
          if (!u.id || !u.loginId || !u.email || !u.fullName) continue;
          await this.usersRepo.query(
            `INSERT INTO users (id, employee_id, login_id, email, full_name, phone, designation, role_id, department_id, status, password_hash, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET
               employee_id = EXCLUDED.employee_id,
               login_id = EXCLUDED.login_id,
               email = EXCLUDED.email,
               full_name = EXCLUDED.full_name,
               phone = EXCLUDED.phone,
               designation = EXCLUDED.designation,
               role_id = EXCLUDED.role_id,
               department_id = EXCLUDED.department_id,
               status = EXCLUDED.status,
               password_hash = EXCLUDED.password_hash,
               updated_at = NOW()`,
            [
              u.id,
              u.employeeId || null,
              u.loginId,
              u.email,
              u.fullName,
              u.phone || null,
              u.designation || null,
              u.roleId || null,
              u.departmentId || null,
              u.status || 'active',
              u.passwordHash || ''
            ]
          );
          await this.createPrivateUserFolder({ id: u.id, loginId: u.loginId });
        }
      }

      // D. Sync Settings
      if (Array.isArray(remoteData.settings)) {
        for (const s of remoteData.settings) {
          if (!s.key) continue;
          await this.usersRepo.query(
            `INSERT INTO system_settings (key, value, category, description, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (key) DO UPDATE SET
               value = EXCLUDED.value,
               category = EXCLUDED.category,
               description = EXCLUDED.description,
               updated_at = NOW()`,
            [s.key, s.value || '', s.category || '', s.description || '']
          );
        }
      }

      await this.auditService.log({
        userId: adminId,
        action: 'update',
        resourceType: 'user',
        description: `Google Sheets Synchronization successful`,
      });

      return { success: true, message: 'Google Sheets synchronization completed successfully' };
    } catch (err: any) {
      const msg = err.message?.startsWith('Google Sheets Synchronization failed:')
        ? err.message
        : `Google Sheets Synchronization failed: ${err.message}`;
      throw new BadRequestException(msg);
    }
  }

  sanitize(user: User): Partial<User> {
    const { passwordHash, twoFactorSecret, ...safe } = user as any;
    return safe;
  }

  private async createPrivateUserFolder(user: { id: string; loginId: string }) {
    try {
      const uploadPath = process.env.UPLOAD_PATH || '/app/uploads';
      const userDir = path.join(uploadPath, 'users', user.loginId);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      // Check if folder already exists in folders table
      const [existing] = await this.usersRepo.query(
        `SELECT id FROM folders WHERE owner_id = $1 AND name = $2 LIMIT 1`,
        [user.id, `${user.loginId}-private`]
      );

      if (!existing) {
        await this.usersRepo.query(
          `INSERT INTO folders (name, owner_id, path, metadata) VALUES ($1, $2, $3, $4)`,
          [`${user.loginId}-private`, user.id, `/users/${user.loginId}`, JSON.stringify({ is_user_private: true })]
        );
      }
    } catch (err) {
      console.error(`[UsersService] Failed to create private folder for user ${user.loginId}:`, err);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoSync() {
    try {
      // 1. Check if sync is enabled
      const syncEnabledResult = await this.usersRepo.query(
        `SELECT value FROM system_settings WHERE key = 'google_sheets_sync_enabled'`
      );
      const isEnabled = syncEnabledResult.length > 0 ? syncEnabledResult[0].value === 'true' : true;
      if (!isEnabled) return;

      // 2. Read sync interval in minutes
      const intervalResult = await this.usersRepo.query(
        `SELECT value FROM system_settings WHERE key = 'google_sheets_sync_interval_minutes'`
      );
      const intervalMinutes = intervalResult.length > 0 ? parseInt(intervalResult[0].value, 10) || 60 : 60;

      // 3. Read last sync timestamp
      const lastSyncResult = await this.usersRepo.query(
        `SELECT value FROM system_settings WHERE key = 'google_sheets_last_sync'`
      );
      const lastSyncStr = lastSyncResult.length > 0 ? lastSyncResult[0].value : '';

      const lastSync = lastSyncStr ? new Date(lastSyncStr) : new Date(0);
      const now = new Date();
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins >= intervalMinutes) {
        console.log(`[UsersService] Triggering auto-sync to Google Sheets (Interval: ${intervalMinutes}m)...`);
        await this.syncSheets();
        
        // Update last sync timestamp in database
        const timestamp = new Date().toISOString();
        await this.usersRepo.query(
          `INSERT INTO system_settings (key, value, category, description, updated_at)
           VALUES ('google_sheets_last_sync', $1, 'system', 'Timestamp of last Google Sheets sync', NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [timestamp]
        );
      }
    } catch (err) {
      console.error('[UsersService] Error in automatic Google Sheets sync:', err);
    }
  }
}
