import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FilesService {
  constructor(private dataSource: DataSource) {}

  async getFolders(userId: string, parentId?: string) {
    // JIT: Ensure the default Chat Attachments and Personal Cloud folders exist for this user!
    const [user] = await this.dataSource.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
    const userName = user?.full_name || 'Teammate';
    
    const chatFolderName = `${userName}'s Chat Attachments`;
    const cloudFolderName = `${userName}'s Saved Cloud Files`;
    
    // Check if chat folder exists
    const [chatFolder] = await this.dataSource.query(
      `SELECT id FROM folders WHERE owner_id = $1 AND name = $2 AND deleted_at IS NULL LIMIT 1`,
      [userId, chatFolderName]
    );
    if (!chatFolder) {
      await this.createFolder({ name: chatFolderName, ownerId: userId });
    }
    
    // Check if cloud folder exists
    const [cloudFolder] = await this.dataSource.query(
      `SELECT id FROM folders WHERE owner_id = $1 AND name = $2 AND deleted_at IS NULL LIMIT 1`,
      [userId, cloudFolderName]
    );
    if (!cloudFolder) {
      await this.createFolder({ name: cloudFolderName, ownerId: userId });
    }

    return this.dataSource.query(
      `SELECT f.*, u.full_name AS owner_name FROM folders f
       LEFT JOIN users u ON u.id = f.owner_id
       WHERE f.owner_id = $1 AND f.deleted_at IS NULL
       AND (f.metadata->>'is_user_private' IS NULL OR f.metadata->>'is_user_private' != 'true')
       AND ($2::uuid IS NULL AND f.parent_id IS NULL OR f.parent_id = $2::uuid)
       ORDER BY f.name ASC`,
      [userId, parentId || null]
    );
  }

  async getFiles(userId: string, folderId?: string, search?: string, recursive = false) {
    const qb = `
      SELECT f.*, u.full_name AS owner_name FROM files f
      LEFT JOIN users u ON u.id = f.owner_id
      WHERE (f.owner_id = $1 OR f.is_public = true) AND f.deleted_at IS NULL
      ${recursive ? '' : (folderId ? 'AND f.folder_id = $2' : 'AND f.folder_id IS NULL')}
      ${search ? `AND (f.name ILIKE '%${search}%' OR f.original_name ILIKE '%${search}%')` : ''}
      ORDER BY f.created_at DESC
    `;
    return this.dataSource.query(qb, (folderId && !recursive) ? [userId, folderId] : [userId]);
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
    let folderId = (dto.folderId && dto.folderId !== '' && dto.folderId !== 'null' && dto.folderId !== 'undefined') ? dto.folderId : null;
    const conversationId = (dto.conversationId && dto.conversationId !== '' && dto.conversationId !== 'null' && dto.conversationId !== 'undefined') ? dto.conversationId : null;

    if (!folderId) {
      // JIT check/create the User's Chat Attachments folder
      const [user] = await this.dataSource.query(`SELECT full_name FROM users WHERE id = $1`, [dto.ownerId]);
      const userName = user?.full_name || 'Teammate';
      const folderName = `${userName}'s Chat Attachments`;

      const [existingFolder] = await this.dataSource.query(
        `SELECT id FROM folders WHERE owner_id = $1 AND name = $2 AND deleted_at IS NULL LIMIT 1`,
        [dto.ownerId, folderName]
      );
      if (existingFolder) {
        folderId = existingFolder.id;
      } else {
        const newFolder = await this.createFolder({ name: folderName, ownerId: dto.ownerId });
        folderId = newFolder.id;
      }
    }

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

  async saveToCloud(fileId: string, userId: string) {
    const [origFile] = await this.dataSource.query(
      `SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL`,
      [fileId]
    );
    if (!origFile) throw new Error('File not found');

    const ext = path.extname(origFile.original_name).replace('.', '').toLowerCase();
    
    let categoryName = 'Documents';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || origFile.mime_type?.startsWith('image/')) {
      categoryName = 'Images';
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || origFile.mime_type?.startsWith('video/')) {
      categoryName = 'Videos';
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext) || origFile.mime_type?.startsWith('audio/')) {
      categoryName = 'Audios';
    }
    
    let targetFolderId;
    const [existingFolder] = await this.dataSource.query(
      `SELECT id FROM folders WHERE owner_id = $1 AND name = $2 AND deleted_at IS NULL LIMIT 1`,
      [userId, categoryName]
    );
    
    if (existingFolder) {
      targetFolderId = existingFolder.id;
    } else {
      const newFolder = await this.createFolder({
        name: categoryName,
        ownerId: userId
      });
      targetFolderId = newFolder.id;
    }


    const [newFile] = await this.dataSource.query(
      `INSERT INTO files (name, original_name, mime_type, size, extension, storage_path, storage_url, owner_id, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [origFile.name, origFile.original_name, origFile.mime_type, origFile.size, ext, origFile.storage_path, origFile.storage_url, userId, targetFolderId]
    );
    return newFile;
  }

  async saveFolderZip(dto: {
    files: any[];
    folderName: string;
    folderId?: string;
    relativePaths?: string | string[];
    ownerId: string;
  }) {
    const archiver = require('archiver');
    const fs = require('fs');
    const { v4: uuid } = require('uuid');
    const zipName = `${uuid()}.zip`;
    const uploadDir = process.env.UPLOAD_PATH || '/app/uploads';
    const zipPath = path.join(uploadDir, zipName);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      let pathsArr: string[] = [];
      if (typeof dto.relativePaths === 'string') {
        try {
          pathsArr = JSON.parse(dto.relativePaths);
        } catch {
          pathsArr = [dto.relativePaths];
        }
      } else if (Array.isArray(dto.relativePaths)) {
        pathsArr = dto.relativePaths;
      }

      dto.files.forEach((file, index) => {
        const nameInZip = pathsArr[index] || file.originalname || `file-${index}`;
        archive.file(file.path, { name: nameInZip });
      });

      archive.finalize();
    });

    const stats = fs.statSync(zipPath);

    const savedFile = await this.saveFile({
      name: zipName,
      originalName: `${dto.folderName || 'Staged_Folder'}.zip`,
      mimeType: 'application/zip',
      size: stats.size,
      storagePath: zipPath,
      storageUrl: `/uploads/${zipName}`,
      ownerId: dto.ownerId,
      folderId: dto.folderId
    });

    dto.files.forEach(f => {
      try {
        fs.unlinkSync(f.path);
      } catch (err) {
        console.warn('Failed to delete temp file during folder zip cleanup:', err.message);
      }
    });

    return savedFile;
  }
}
