import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PluginsService {
  private pluginsPath = process.env.PLUGINS_PATH || '/app/plugins';

  constructor(private ds: DataSource) {}

  async getAll() {
    return this.ds.query(`SELECT * FROM plugins ORDER BY name ASC`);
  }

  async install(manifest: any, userId: string) {
    const [p] = await this.ds.query(
      `INSERT INTO plugins (plugin_id, name, description, version, author, manifest, status, installed_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'installed', $7) RETURNING *`,
      [manifest.id, manifest.name, manifest.description, manifest.version, manifest.author, manifest, userId]
    );
    return p;
  }

  async setStatus(pluginId: string, status: 'enabled' | 'disabled') {
    await this.ds.query(
      `UPDATE plugins SET status = $1, ${status === 'enabled' ? 'enabled_at = NOW()' : 'enabled_at = enabled_at'} WHERE plugin_id = $2`,
      [status, pluginId]
    );
  }

  async remove(pluginId: string) {
    await this.ds.query(`DELETE FROM plugins WHERE plugin_id = $1`, [pluginId]);
  }
}
