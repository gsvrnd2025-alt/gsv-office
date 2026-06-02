import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FilesService {
  constructor(private dataSource: DataSource) {}

  async getFolders(userId: string, parentId?: string) {
    return this.dataSource.query(
      `SELECT f.*, u.full_name AS owner_name FROM folders f
       LEFT JOIN users u ON u.id = f.owner_id
       WHERE f.owner_id = $1 AND f.deleted_at IS NULL
       AND ($2::uuid IS NULL AND f.parent_id IS NULL OR f.parent_id = $2::uuid)
       ORDER BY f.name ASC`,
      [userId, parentId || null]
    );
  }

  async getFiles(userId: string, folderId?: string, search?: string) {
    const qb = `
      SELECT f.*, u.full_name AS owner_name FROM files f
      LEFT JOIN users u ON u.id = f.owner_id
      WHERE (f.owner_id = $1 OR f.is_public = true) AND f.deleted_at IS NULL
      ${folderId ? 'AND f.folder_id = $2' : 'AND f.folder_id IS NULL'}
      ${search ? `AND (f.name ILIKE '%${search}%' OR f.original_name ILIKE '%${search}%')` : ''}
      ORDER BY f.created_at DESC
    `;
    return this.dataSource.query(qb, folderId ? [userId, folderId] : [userId]);
  }

  async createFolder(dto: { name: string; parentId?: string; ownerId: string }) {
    const [folder] = await this.dataSource.query(
      `INSERT INTO folders (name, parent_id, owner_id) VALUES ($1, $2, $3) RETURNING *`,
      [dto.name, dto.parentId || null, dto.ownerId]
    );
    return folder;
  }

  async saveFile(dto: {
    name: string; originalName: string; mimeType: string; size: number;
    storagePath: string; storageUrl: string; ownerId: string; folderId?: string; conversationId?: string;
  }) {
    const ext = path.extname(dto.originalName).replace('.', '');
    const folderId = (dto.folderId && dto.folderId !== '' && dto.folderId !== 'null' && dto.folderId !== 'undefined') ? dto.folderId : null;
    const conversationId = (dto.conversationId && dto.conversationId !== '' && dto.conversationId !== 'null' && dto.conversationId !== 'undefined') ? dto.conversationId : null;

    const [file] = await this.dataSource.query(
      `INSERT INTO files (name, original_name, mime_type, size, extension, storage_path, storage_url, owner_id, folder_id, conversation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [dto.name, dto.originalName, dto.mimeType, dto.size, ext, dto.storagePath, dto.storageUrl, dto.ownerId, folderId, conversationId]
    );
    return file;
  }

  async deleteFile(fileId: string, userId: string) {
    await this.dataSource.query(
      `UPDATE files SET deleted_at = NOW() WHERE id = $1 AND (owner_id = $2 OR $2 IN (SELECT id FROM users WHERE role_id IN (SELECT id FROM roles WHERE name IN ('Super Admin', 'Admin'))))`,
      [fileId, userId]
    );
  }

  async getSharedFiles(userId: string) {
    return this.dataSource.query(
      `SELECT f.*, fs.permission, fs.expires_at FROM files f
       JOIN file_shares fs ON fs.file_id = f.id
       WHERE fs.shared_with_user_id = $1 AND f.deleted_at IS NULL
       AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
       ORDER BY fs.created_at DESC`,
      [userId]
    );
  }
}
