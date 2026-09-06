import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
const AdmZip = require('adm-zip');
import { v4 as uuid } from 'uuid';

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
       AND (
         f.owner_id = $1
         OR f.metadata->>'is_user_private' IS NULL
         OR f.metadata->>'is_user_private' != 'true'
         OR f.id IN (SELECT folder_id FROM folder_access_requests WHERE requester_id = $1 AND status = 'approved')
       )
       AND ($2::uuid IS NULL AND f.parent_id IS NULL OR f.parent_id = $2::uuid)
       ORDER BY f.name ASC`,
      [userId, parentId || null]
    );
  }

  async getFiles(userId: string, folderId?: string, search?: string, recursive = false) {
    const qb = `
      SELECT f.*, u.full_name AS owner_name FROM files f
      LEFT JOIN users u ON u.id = f.owner_id
      WHERE (
        f.owner_id = $1 
        OR f.is_public = true
        OR f.id IN (SELECT file_id FROM file_shares WHERE shared_with_user_id = $1 AND (expires_at IS NULL OR expires_at > NOW()))
        OR f.folder_id IN (
          SELECT id FROM folders WHERE owner_id = $1 
          OR id IN (SELECT folder_id FROM folder_access_requests WHERE requester_id = $1 AND status = 'approved')
          OR metadata->>'is_user_private' IS NULL
          OR metadata->>'is_user_private' != 'true'
        )
        OR (f.conversation_id IS NOT NULL AND f.conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = $1))
      ) AND f.deleted_at IS NULL
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

  async saveFolderStructure(dto: {
    files: any[];
    folderName: string;
    folderId?: string;
    conversationId?: string;
    relativePaths?: string | string[];
    ownerId: string;
  }) {
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
          folderId: fileFolderId,
          conversationId: dto.conversationId,
        });
        savedFiles.push(saved);
      } catch (err) {
        console.error(`Failed to save folder file ${relPath}:`, err);
      }
    }

    return topFolder;
  }

  async extractZipAndSaveFolder(dto: {
    zipPath: string;
    originalName: string;
    folderName?: string;
    folderId?: string;
    conversationId?: string;
    ownerId: string;
  }) {
    const uploadDir = process.env.UPLOAD_PATH || '/app/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const zip = new AdmZip(dto.zipPath);
    const zipEntries = zip.getEntries();

    // Determine root folder name
    let rootFolderName = dto.folderName;
    if (!rootFolderName || rootFolderName === 'undefined' || rootFolderName === 'null' || rootFolderName.trim() === '') {
      rootFolderName = path.basename(dto.originalName, path.extname(dto.originalName)) || 'Extracted_Folder';
    }

    const topFolderParentId = (dto.folderId && dto.folderId !== 'null' && dto.folderId !== 'undefined' && dto.folderId !== '') ? dto.folderId : null;
    const topFolder = await this.createFolder({
      name: rootFolderName,
      parentId: topFolderParentId,
      ownerId: dto.ownerId
    });

    const folderCache = new Map<string, string>(); // relative dir path -> folderId
    folderCache.set('', topFolder.id);

    const getOrCreateFolderForPath = async (relPath: string): Promise<string> => {
      const cleanRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
      if (!cleanRel) return topFolder.id;

      const parts = cleanRel.split('/');
      // If the first segment is already the rootFolderName, skip it to avoid nesting
      if (parts[0] === rootFolderName) {
        parts.shift();
      }
      if (parts.length === 0) return topFolder.id;

      let currentParentId = topFolder.id;
      let pathAccum = '';

      for (const segment of parts) {
        if (!segment || segment === '.' || segment === '..') continue;
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

    for (const entry of zipEntries) {
      // Ignore OS metadata and special system files
      if (entry.entryName.startsWith('__MACOSX') || entry.entryName.includes('/.DS_Store') || entry.name === '.DS_Store' || entry.name === 'Thumbs.db') {
        continue;
      }

      if (entry.isDirectory) {
        await getOrCreateFolderForPath(entry.entryName);
      } else {
        const entryDir = path.dirname(entry.entryName);
        const targetFolderId = await getOrCreateFolderForPath(entryDir === '.' ? '' : entryDir);
        const fileName = entry.name || path.basename(entry.entryName);
        if (!fileName) continue;

        const fileExt = path.extname(fileName);
        const storedFileName = `${uuid()}${fileExt}`;
        const storedFilePath = path.join(uploadDir, storedFileName);

        const buffer = entry.getData();
        fs.writeFileSync(storedFilePath, buffer);

        const extClean = fileExt.replace('.', '').toLowerCase();
        let mimeType = 'application/octet-stream';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extClean)) mimeType = `image/${extClean === 'jpg' ? 'jpeg' : extClean}`;
        else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extClean)) mimeType = `video/${extClean}`;
        else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extClean)) mimeType = `audio/${extClean}`;
        else if (extClean === 'pdf') mimeType = 'application/pdf';
        else if (['txt', 'log', 'csv', 'md'].includes(extClean)) mimeType = 'text/plain';
        else if (['json', 'js', 'ts', 'html', 'css', 'xml'].includes(extClean)) mimeType = `application/${extClean}`;

        await this.saveFile({
          name: storedFileName,
          originalName: fileName,
          mimeType: mimeType,
          size: buffer.length,
          storagePath: storedFilePath,
          storageUrl: `/uploads/${storedFileName}`,
          ownerId: dto.ownerId,
          folderId: targetFolderId,
          conversationId: dto.conversationId,
        });
      }
    }

    // Safely remove the uploaded temporary zip file after extraction
    try {
      if (fs.existsSync(dto.zipPath)) {
        fs.unlinkSync(dto.zipPath);
      }
    } catch (cleanErr) {
      console.warn('Could not remove temporary zip archive:', cleanErr);
    }

    return topFolder;
  }

  async extractZipFileById(fileId: string, userId: string) {
    const [file] = await this.dataSource.query(
      `SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL`,
      [fileId]
    );
    if (!file) throw new Error('File archive not found');

    const filePath = file.storage_path || path.join(process.env.UPLOAD_PATH || '/app/uploads', file.name);
    if (!fs.existsSync(filePath)) {
      throw new Error('File archive storage not found on disk');
    }

    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    const folderName = path.basename(file.original_name, path.extname(file.original_name)) || 'Extracted Archive';

    const topFolder = await this.createFolder({
      name: folderName,
      parentId: file.folder_id,
      ownerId: userId
    });

    const folderCache = new Map<string, string>();
    folderCache.set('', topFolder.id);

    const getOrCreateFolderForPath = async (relPath: string): Promise<string> => {
      const cleanRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
      if (!cleanRel) return topFolder.id;
      const parts = cleanRel.split('/');
      if (parts[0] === folderName) parts.shift();
      if (parts.length === 0) return topFolder.id;

      let currentParentId = topFolder.id;
      let pathAccum = '';
      for (const segment of parts) {
        if (!segment || segment === '.' || segment === '..') continue;
        pathAccum = pathAccum ? `${pathAccum}/${segment}` : segment;
        if (folderCache.has(pathAccum)) {
          currentParentId = folderCache.get(pathAccum)!;
        } else {
          const newFolder = await this.createFolder({
            name: segment,
            parentId: currentParentId,
            ownerId: userId
          });
          folderCache.set(pathAccum, newFolder.id);
          currentParentId = newFolder.id;
        }
      }
      return currentParentId;
    };

    const uploadDir = process.env.UPLOAD_PATH || '/app/uploads';
    for (const entry of zipEntries) {
      if (entry.entryName.startsWith('__MACOSX') || entry.entryName.includes('/.DS_Store') || entry.name === '.DS_Store' || entry.name === 'Thumbs.db') {
        continue;
      }
      if (entry.isDirectory) {
        await getOrCreateFolderForPath(entry.entryName);
      } else {
        const entryDir = path.dirname(entry.entryName);
        const targetFolderId = await getOrCreateFolderForPath(entryDir === '.' ? '' : entryDir);
        const fileName = entry.name || path.basename(entry.entryName);
        if (!fileName) continue;

        const fileExt = path.extname(fileName);
        const storedFileName = `${uuid()}${fileExt}`;
        const storedFilePath = path.join(uploadDir, storedFileName);

        const buffer = entry.getData();
        fs.writeFileSync(storedFilePath, buffer);

        const extClean = fileExt.replace('.', '').toLowerCase();
        let mimeType = 'application/octet-stream';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extClean)) mimeType = `image/${extClean === 'jpg' ? 'jpeg' : extClean}`;
        else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extClean)) mimeType = `video/${extClean}`;
        else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extClean)) mimeType = `audio/${extClean}`;
        else if (extClean === 'pdf') mimeType = 'application/pdf';
        else if (['txt', 'log', 'csv', 'md'].includes(extClean)) mimeType = 'text/plain';

        await this.saveFile({
          name: storedFileName,
          originalName: fileName,
          mimeType: mimeType,
          size: buffer.length,
          storagePath: storedFilePath,
          storageUrl: `/uploads/${storedFileName}`,
          ownerId: userId,
          folderId: targetFolderId,
        });
      }
    }

    return topFolder;
  }

  async streamFolderAsZip(folderId: string, userId: string, res: Response) {
    try {
      const [folder] = await this.dataSource.query(
        `SELECT * FROM folders WHERE id = $1 AND deleted_at IS NULL`,
        [folderId]
      );
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      // Recursively collect all subfolder IDs
      const getAllSubfolderIds = async (parentIds: string[]): Promise<string[]> => {
        if (parentIds.length === 0) return [];
        const children = await this.dataSource.query(
          `SELECT id FROM folders WHERE parent_id = ANY($1::uuid[]) AND deleted_at IS NULL`,
          [parentIds]
        );
        if (children.length === 0) return parentIds;
        const childIds = children.map((c: any) => c.id);
        const deeper = await getAllSubfolderIds(childIds);
        return [...parentIds, ...deeper];
      };

      const allFolderIds = await getAllSubfolderIds([folderId]);

      // Fetch all folders to build hierarchy paths
      const foldersList = await this.dataSource.query(
        `SELECT id, name, parent_id FROM folders WHERE id = ANY($1::uuid[])`,
        [allFolderIds]
      );
      const folderMap = new Map<string, { name: string; parentId: string | null }>();
      foldersList.forEach((f: any) => folderMap.set(f.id, { name: f.name, parentId: f.parent_id }));

      const getFolderPath = (fId: string): string => {
        let pathSegments: string[] = [];
        let cur: string | null = fId;
        while (cur && folderMap.has(cur)) {
          const item = folderMap.get(cur)!;
          pathSegments.unshift(item.name);
          if (cur === folderId) break;
          cur = item.parentId;
        }
        return pathSegments.join('/');
      };

      // Fetch all files in these folders
      const files = await this.dataSource.query(
        `SELECT * FROM files WHERE folder_id = ANY($1::uuid[]) AND deleted_at IS NULL`,
        [allFolderIds]
      );

      const zip = new AdmZip();

      for (const f of files) {
        const filePath = f.storage_path || path.join(process.env.UPLOAD_PATH || '/app/uploads', f.name);
        if (fs.existsSync(filePath)) {
          const subPath = f.folder_id ? getFolderPath(f.folder_id) : folder.name;
          const entryPath = `${subPath}/${f.original_name || f.name}`;
          const fileBuffer = fs.readFileSync(filePath);
          zip.addFile(entryPath, fileBuffer);
        }
      }

      const safeFolderName = folder.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Folder_Download';
      const zipBuffer = zip.toBuffer();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFolderName}.zip"`);
      res.setHeader('Content-Length', zipBuffer.length.toString());
      res.end(zipBuffer);
    } catch (err: any) {
      console.error('Error in streamFolderAsZip:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to stream folder zip archive', error: err.message });
      }
    }
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
