import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ServerService implements OnApplicationBootstrap {
  constructor(private ds: DataSource) {}

  async onApplicationBootstrap() {
    try {
      let version = process.env.APP_VERSION;
      if (!version) {
        try {
          const pkgPath = path.join(__dirname, '..', '..', '..', 'package.json');
          if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            version = pkg.version;
          }
        } catch (e) {
          // ignore
        }
      }
      if (!version) version = '1.0.0';

      await this.ds.query(
        `INSERT INTO system_settings (key, value, category, description, is_public, updated_at)
         VALUES ('app_version', $1, 'system', 'GSV Office Application Version', true, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [version]
      );
      console.log(`[ServerService] Synchronized APP_VERSION: ${version} to system_settings.`);
    } catch (err) {
      console.error('[ServerService] Failed to sync app_version on bootstrap:', err);
    }
  }

  async getSystemInfo() {
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      uptimeSeconds: uptime,
      nodeMemoryMB: Math.round(mem.rss / 1024 / 1024),
      nodeVersion: process.version,
    };
  }

  async getSettings() {
    return this.ds.query(`SELECT * FROM system_settings ORDER BY category, key`);
  }

  async updateSetting(key: string, value: string, userId: string) {
    await this.ds.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
      [key, value, userId]
    );
    return { updated: true };
  }

  async getPublicSettings() {
    const settings = await this.ds.query(`SELECT key, value FROM system_settings WHERE is_public = true`);
    return settings.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
  }

  async getDatabaseStatus() {
    const [result] = await this.ds.query(`SELECT version(), pg_database_size(current_database()) AS db_size`);
    return { version: result.version, sizeBytes: result.db_size };
  }
}
