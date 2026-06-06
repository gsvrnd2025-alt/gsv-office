import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FilesService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS folder_access_requests (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
          owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          requester_name VARCHAR(150),
          status VARCHAR(20) DEFAULT 'pending',
          permission VARCHAR(20) DEFAULT 'read',
          requested_at TIMESTAMPTZ DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ
        );
      `);
    } catch (err) {
      console.error('Error creating folder_access_requests table:', err);
    }
  }

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
       WHERE f.deleted_at IS NULL
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

  async deleteFolder(folderId: string, userId: string) {
    // 1. Soft-delete the folder itself
    await this.dataSource.query(
      `UPDATE folders SET deleted_at = NOW() WHERE id = $1 AND (owner_id = $2 OR $2 IN (SELECT id FROM users WHERE role_id IN (SELECT id FROM roles WHERE name IN ('Super Admin', 'Admin'))))`,
      [folderId, userId]
    );

    // 2. Soft-delete all files directly inside this folder
    await this.dataSource.query(
      `UPDATE files SET deleted_at = NOW() WHERE folder_id = $1`,
      [folderId]
    );

    // 3. Find and recursively soft-delete all child subfolders
    const childFolders = await this.dataSource.query(
      `SELECT id FROM folders WHERE parent_id = $1 AND deleted_at IS NULL`,
      [folderId]
    );
    for (const child of childFolders) {
      await this.deleteFolder(child.id, userId);
    }
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

    if (origFile) {
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

    const [origFolder] = await this.dataSource.query(
      `SELECT * FROM folders WHERE id = $1 AND deleted_at IS NULL`,
      [fileId]
    );

    if (origFolder) {
      const [user] = await this.dataSource.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
      const userName = user?.full_name || 'Teammate';
      const cloudFolderName = `${userName}'s Saved Cloud Files`;
      
      let rootCloudFolderId;
      const [existingCloudFolder] = await this.dataSource.query(
        `SELECT id FROM folders WHERE owner_id = $1 AND name = $2 AND deleted_at IS NULL LIMIT 1`,
        [userId, cloudFolderName]
      );
      
      if (existingCloudFolder) {
        rootCloudFolderId = existingCloudFolder.id;
      } else {
        const newCloudFolder = await this.createFolder({
          name: cloudFolderName,
          ownerId: userId
        });
        rootCloudFolderId = newCloudFolder.id;
      }

      return this.moveOrCopy({
        itemType: 'folder',
        itemId: fileId,
        targetFolderId: rootCloudFolderId,
        action: 'copy',
        userId: userId
      });
    }

    throw new Error('File or folder not found');
  }

  async saveFolderStructure(dto: {
    files: any[];
    folderName: string;
    folderId?: string;
    relativePaths?: string | string[];
    ownerId: string;
  }) {
    const fs = require('fs');
    const { v4: uuid } = require('uuid');

    let pathsArr: string[] = [];
    if (typeof dto.relativePaths === 'string') {
      try { pathsArr = JSON.parse(dto.relativePaths); } catch { pathsArr = [dto.relativePaths]; }
    } else if (Array.isArray(dto.relativePaths)) {
      pathsArr = dto.relativePaths;
    }

    // 1. Create the top-level folder
    const topFolderParentId = (dto.folderId && dto.folderId !== 'null' && dto.folderId !== 'undefined' && dto.folderId !== '') ? dto.folderId : null;
    const topFolder = await this.createFolder({
      name: dto.folderName,
      parentId: topFolderParentId,
      ownerId: dto.ownerId
    });

    const folderCache = new Map<string, string>(); // path -> folderId
    folderCache.set('', topFolder.id);

    // Helper to get or create folder path recursively
    const getOrCreateFolderForPath = async (relPath: string): Promise<string> => {
      // Clean path and remove the leading folderName segment if present
      const cleanRel = relPath.replace(/\\/g, '/');
      const parts = cleanRel.split('/');
      
      // If the first part is just the top folderName, remove it
      if (parts[0] === dto.folderName) {
        parts.shift();
      }
      
      const fileSegments = parts.slice(0, -1); // Exclude the filename itself
      if (fileSegments.length === 0) return topFolder.id;

      let currentParentId = topFolder.id;
      let pathAccum = '';

      for (const segment of fileSegments) {
        if (!segment) continue;
        pathAccum = pathAccum ? `${pathAccum}/${segment}` : segment;
        if (folderCache.has(pathAccum)) {
          currentParentId = folderCache.get(pathAccum)!;
        } else {
          const newFolder = await this.createFolder({
            name: segment,
            parentId: currentParentId,
            ownerId: dto.ownerId
          });
          folderCache.set(pathAccum, newFolder.id);
          currentParentId = newFolder.id;
        }
      }
      return currentParentId;
    };

    const savedFiles = [];
    
    // 2. Save each file under the correct folder
    for (let i = 0; i < dto.files.length; i++) {
      const file = dto.files[i];
      const relPath = pathsArr[i] || file.originalname || '';
      
      try {
        const fileFolderId = await getOrCreateFolderForPath(relPath);
        const fileName = path.basename(relPath) || file.originalname;

        const saved = await this.saveFile({
          name: file.filename,
          originalName: fileName,
          mimeType: file.mimetype,
          size: file.size,
          storagePath: file.path,
          storageUrl: `/uploads/${file.filename}`,
          ownerId: dto.ownerId,
          folderId: fileFolderId
        });
        savedFiles.push(saved);
      } catch (err) {
        console.error(`Failed to save folder file ${relPath}:`, err);
      }
    }

    return topFolder;
  }

  async renameFile(id: string, name: string, userId: string) {
    const ext = path.extname(name).replace('.', '');
    await this.dataSource.query(
      `UPDATE files SET name = $1, original_name = $2, extension = $3, updated_at = NOW() WHERE id = $4 AND owner_id = $5`,
      [name, name, ext, id, userId]
    );
    return { success: true };
  }

  async renameFolder(id: string, name: string, userId: string) {
    await this.dataSource.query(
      `UPDATE folders SET name = $1, updated_at = NOW() WHERE id = $2 AND owner_id = $3`,
      [name, id, userId]
    );
    return { success: true };
  }

  async moveOrCopy(dto: { itemType: 'file' | 'folder'; itemId: string; targetFolderId: string | null; action: 'move' | 'copy'; userId: string }) {
    const { itemType, itemId, targetFolderId, action, userId } = dto;
    const destFolderId = (targetFolderId && targetFolderId !== 'null' && targetFolderId !== 'undefined') ? targetFolderId : null;

    if (itemType === 'file') {
      if (action === 'move') {
        await this.dataSource.query(
          `UPDATE files SET folder_id = $1, updated_at = NOW() WHERE id = $2 AND owner_id = $3`,
          [destFolderId, itemId, userId]
        );
      } else {
        const [file] = await this.dataSource.query(`SELECT * FROM files WHERE id = $1`, [itemId]);
        if (!file) throw new Error('Source file not found');
        await this.dataSource.query(
          `INSERT INTO files (name, original_name, mime_type, size, extension, storage_type, storage_path, storage_url, folder_id, owner_id, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            `Copy of ${file.name}`,
            `Copy of ${file.original_name}`,
            file.mime_type,
            file.size,
            file.extension,
            file.storage_type,
            file.storage_path,
            file.storage_url,
            destFolderId,
            userId,
            file.metadata
          ]
        );
      }
    } else {
      if (action === 'move') {
        await this.dataSource.query(
          `UPDATE folders SET parent_id = $1, updated_at = NOW() WHERE id = $2 AND owner_id = $3`,
          [destFolderId, itemId, userId]
        );
      } else {
        const [folder] = await this.dataSource.query(`SELECT * FROM folders WHERE id = $1`, [itemId]);
        if (!folder) throw new Error('Source folder not found');
        const [newFolder] = await this.dataSource.query(
          `INSERT INTO folders (name, parent_id, owner_id, path, metadata)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [`Copy of ${folder.name}`, destFolderId, userId, folder.path, folder.metadata]
        );
        const files = await this.dataSource.query(`SELECT * FROM files WHERE folder_id = $1 AND deleted_at IS NULL`, [itemId]);
        for (const f of files) {
          await this.dataSource.query(
            `INSERT INTO files (name, original_name, mime_type, size, extension, storage_type, storage_path, storage_url, folder_id, owner_id, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [f.name, f.original_name, f.mime_type, f.size, f.extension, f.storage_type, f.storage_path, f.storage_url, newFolder.id, userId, f.metadata]
          );
        }
      }
    }
    return { success: true };
  }

  async shareToUser(dto: { itemType: 'file' | 'folder'; itemId: string; targetUserId: string; action: 'move' | 'copy'; userId: string }) {
    const { itemType, itemId, targetUserId, action, userId } = dto;
    const [targetUser] = await this.dataSource.query(`SELECT full_name FROM users WHERE id = $1`, [targetUserId]);
    if (!targetUser) throw new Error('Target user not found');
    
    const folderName = `${targetUser.full_name}'s Chat Attachments`;
    let targetFolderId;
    const [existingFolder] = await this.dataSource.query(
      `SELECT id FROM folders WHERE owner_id = $1 AND name = $2 AND deleted_at IS NULL LIMIT 1`,
      [targetUserId, folderName]
    );
    if (existingFolder) {
      targetFolderId = existingFolder.id;
    } else {
      const newFolder = await this.createFolder({ name: folderName, ownerId: targetUserId });
      targetFolderId = newFolder.id;
    }

    if (itemType === 'file') {
      if (action === 'move') {
        await this.dataSource.query(
          `UPDATE files SET owner_id = $1, folder_id = $2, updated_at = NOW() WHERE id = $3 AND owner_id = $4`,
          [targetUserId, targetFolderId, itemId, userId]
        );
      } else {
        const [file] = await this.dataSource.query(`SELECT * FROM files WHERE id = $1`, [itemId]);
        if (!file) throw new Error('Source file not found');
        await this.dataSource.query(
          `INSERT INTO files (name, original_name, mime_type, size, extension, storage_type, storage_path, storage_url, folder_id, owner_id, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [file.name, file.original_name, file.mime_type, file.size, file.extension, file.storage_type, file.storage_path, file.storage_url, targetFolderId, targetUserId, file.metadata]
        );
      }
    } else {
      if (action === 'move') {
        await this.dataSource.query(
          `UPDATE folders SET owner_id = $1, parent_id = $2, updated_at = NOW() WHERE id = $3 AND owner_id = $4`,
          [targetUserId, targetFolderId, itemId, userId]
        );
      } else {
        const [folder] = await this.dataSource.query(`SELECT * FROM folders WHERE id = $1`, [itemId]);
        if (!folder) throw new Error('Source folder not found');
        const [newFolder] = await this.dataSource.query(
          `INSERT INTO folders (name, parent_id, owner_id, path, metadata)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [folder.name, targetFolderId, targetUserId, folder.path, folder.metadata]
        );
        const files = await this.dataSource.query(`SELECT * FROM files WHERE folder_id = $1 AND deleted_at IS NULL`, [itemId]);
        for (const f of files) {
          await this.dataSource.query(
            `INSERT INTO files (name, original_name, mime_type, size, extension, storage_type, storage_path, storage_url, folder_id, owner_id, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [f.name, f.original_name, f.mime_type, f.size, f.extension, f.storage_type, f.storage_path, f.storage_url, newFolder.id, targetUserId, f.metadata]
          );
        }
      }
    }
    return { success: true };
  }

  async getAccessRequests(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT r.*, f.name AS folder_name FROM folder_access_requests r
       JOIN folders f ON f.id = r.folder_id
       WHERE r.owner_id = $1 OR r.requester_id = $1
       ORDER BY r.requested_at DESC`,
      [userId]
    );
    return rows.map((r: any) => ({
      id: r.id,
      folderId: r.folder_id,
      folderName: r.folder_name,
      ownerId: r.owner_id,
      requesterId: r.requester_id,
      requesterName: r.requester_name,
      status: r.status,
      permission: r.permission,
      requestedAt: r.requested_at
    }));
  }

  async requestAccess(dto: { folderId: string; ownerId: string; requesterId: string; requesterName: string }) {
    const { folderId, ownerId, requesterId, requesterName } = dto;
    const [existing] = await this.dataSource.query(
      `SELECT id FROM folder_access_requests WHERE folder_id = $1 AND requester_id = $2 LIMIT 1`,
      [folderId, requesterId]
    );
    if (existing) {
      await this.dataSource.query(
        `UPDATE folder_access_requests SET status = 'pending', requested_at = NOW() WHERE id = $1`,
        [existing.id]
      );
      return { success: true };
    }
    await this.dataSource.query(
      `INSERT INTO folder_access_requests (folder_id, owner_id, requester_id, requester_name) VALUES ($1, $2, $3, $4)`,
      [folderId, ownerId, requesterId, requesterName]
    );
    return { success: true };
  }

  async reviewAccessRequest(dto: { requestId: string; status: 'approved' | 'rejected'; permission: string }) {
    const { requestId, status, permission } = dto;
    await this.dataSource.query(
      `UPDATE folder_access_requests SET status = $1, permission = $2, reviewed_at = NOW() WHERE id = $3`,
      [status, permission, requestId]
    );
    return { success: true };
  }
}
