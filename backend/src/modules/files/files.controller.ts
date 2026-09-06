import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, UploadedFile, UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { FilesService } from './files.service';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';
import * as path from 'path';

@ApiTags('Files')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('files')
export class FilesController {
  constructor(private svc: FilesService) {}

  @Get('folders')
  @RequirePermissions(['files', 'read'])
  getFolders(@CurrentUser('id') userId: string, @Query('parentId') parentId?: string) {
    return this.svc.getFolders(userId, parentId);
  }

  @Get()
  @RequirePermissions(['files', 'read'])
  getFiles(
    @CurrentUser('id') userId: string, 
    @Query('folderId') folderId?: string, 
    @Query('search') search?: string,
    @Query('recursive') recursive?: string
  ) {
    return this.svc.getFiles(userId, folderId, search, recursive === 'true');
  }

  @Get('shared')
  @RequirePermissions(['files', 'read'])
  getShared(@CurrentUser('id') userId: string) {
    return this.svc.getSharedFiles(userId);
  }

  @Post('folders')
  @RequirePermissions(['files', 'create_folder'])
  createFolder(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.svc.createFolder({ ...dto, ownerId: userId });
  }

  @Get('folders/:id/download')
  @RequirePermissions(['files', 'read'])
  async downloadFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response
  ) {
    return this.svc.streamFolderAsZip(id, userId, res);
  }

  @Post('upload')
  @RequirePermissions(['files', 'upload'])
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => { cb(null, process.env.UPLOAD_PATH || '/app/uploads'); },
      filename: (req, file, cb) => { cb(null, `${uuid()}${path.extname(file.originalname)}`); },
    }),
    limits: { fileSize: 100 * 1024 * 1024 * 1024 }, // 100 GB
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() dto: any, @CurrentUser('id') userId: string) {
    return this.svc.saveFile({
      name: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: file.path,
      storageUrl: `/uploads/${file.filename}`,
      ownerId: userId,
      folderId: dto.folderId,
      conversationId: dto.conversationId,
    });
  }

  @Post('upload-folder-zip')
  @RequirePermissions(['files', 'upload'])
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => { cb(null, process.env.UPLOAD_PATH || '/app/uploads'); },
      filename: (req, file, cb) => { cb(null, `${uuid()}${path.extname(file.originalname)}`); },
    }),
    limits: { fileSize: 100 * 1024 * 1024 * 1024 }, // 100 GB
  }))
  async uploadFolderZip(
    @UploadedFile() file: Express.Multer.File,
    @Body('folderName') folderName: string,
    @Body('folderId') folderId: string,
    @Body('conversationId') conversationId: string,
    @CurrentUser('id') userId: string
  ) {
    if (!file) {
      throw new Error('No zip archive file provided');
    }
    return this.svc.extractZipAndSaveFolder({
      zipPath: file.path,
      originalName: file.originalname,
      folderName,
      folderId,
      conversationId,
      ownerId: userId
    });
  }

  @Post('upload-folder')
  @RequirePermissions(['files', 'upload'])
  @UseInterceptors(FilesInterceptor('files', 25000, {
    storage: diskStorage({
      destination: (req, file, cb) => { cb(null, process.env.UPLOAD_PATH || '/app/uploads'); },
      filename: (req, file, cb) => { cb(null, `${uuid()}${path.extname(file.originalname)}`); },
    }),
    limits: { fileSize: 100 * 1024 * 1024 * 1024 }, // 100 GB
  }))
  async uploadFolder(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folderName') folderName: string,
    @Body('folderId') folderId: string,
    @Body('conversationId') conversationId: string,
    @Body('relativePaths') relativePaths: any,
    @CurrentUser('id') userId: string
  ) {
    if (files && files.length === 1 && path.extname(files[0].originalname).toLowerCase() === '.zip') {
      return this.svc.extractZipAndSaveFolder({
        zipPath: files[0].path,
        originalName: files[0].originalname,
        folderName,
        folderId,
        conversationId,
        ownerId: userId
      });
    }

    return this.svc.saveFolderStructure({
      files,
      folderName,
      folderId,
      conversationId,
      relativePaths,
      ownerId: userId
    });
  }

  @Post(':id/extract-zip')
  @RequirePermissions(['files', 'upload'])
  async extractZip(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.svc.extractZipFileById(id, userId);
  }

  @Delete('folders/:id')
  @RequirePermissions(['files', 'delete'])
  async deleteFolder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    await this.svc.deleteFolder(id, userId);
    return { message: 'Folder deleted' };
  }

  @Delete(':id')
  @RequirePermissions(['files', 'delete'])
  async deleteFile(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    await this.svc.deleteFile(id, userId);
    return { message: 'File deleted' };
  }

  @Post(':id/save-to-cloud')
  @RequirePermissions(['files', 'upload'])
  async saveToCloud(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.svc.saveToCloud(id, userId);
  }

  @Post('files/:id/rename')
  @RequirePermissions(['files', 'upload'])
  async renameFile(@Param('id', ParseUUIDPipe) id: string, @Body('name') name: string, @CurrentUser('id') userId: string) {
    return this.svc.renameFile(id, name, userId);
  }

  @Post('folders/:id/rename')
  @RequirePermissions(['files', 'create_folder'])
  async renameFolder(@Param('id', ParseUUIDPipe) id: string, @Body('name') name: string, @CurrentUser('id') userId: string) {
    return this.svc.renameFolder(id, name, userId);
  }

  @Post('move-or-copy')
  @RequirePermissions(['files', 'upload'])
  async moveOrCopy(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.svc.moveOrCopy({ ...dto, userId });
  }

  @Post('share-to-user')
  @RequirePermissions(['files', 'upload'])
  async shareToUser(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.svc.shareToUser({ ...dto, userId });
  }

  @Get('access-requests')
  @RequirePermissions(['files', 'read'])
  async getAccessRequests(@CurrentUser('id') userId: string) {
    return this.svc.getAccessRequests(userId);
  }

  @Post('access-requests')
  @RequirePermissions(['files', 'read'])
  async requestAccess(@Body() dto: any) {
    return this.svc.requestAccess(dto);
  }

  @Post('access-requests/review')
  @RequirePermissions(['files', 'upload'])
  async reviewAccessRequest(@Body() dto: any) {
    return this.svc.reviewAccessRequest(dto);
  }
}
