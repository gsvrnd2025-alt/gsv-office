import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, UploadedFile, UseInterceptors, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/create-user.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('directory')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get all active users for peer directory (no admin permission needed)' })
  async getDirectory(@CurrentUser('id') currentUserId: string) {
    // Any logged-in user can get the directory listing for remote desktop / chat
    return this.usersService.findAll({ status: 'active', limit: 200 }).then(result => ({
      success: true,
      data: result.data.filter((u: any) => u.id !== currentUserId),
    }));
  }

  @Get()
  @RequirePermissions(['users', 'read'])
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  async findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(['users', 'read'])
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermissions(['users', 'create'])
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() dto: CreateUserDto, @CurrentUser('id') adminId: string) {
    return this.usersService.create(dto, adminId);
  }

  @Post('sync-sheets')
  @RequirePermissions(['users', 'update'])
  @ApiOperation({ summary: 'Synchronize users and settings with Google Sheets' })
  async syncSheets(@CurrentUser('id') adminId: string) {
    return this.usersService.syncSheets(adminId);
  }

  @Put(':id')
  @RequirePermissions(['users', 'update'])
  @ApiOperation({ summary: 'Update user details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.update(id, dto, adminId);
  }

  @Patch(':id/status')
  @RequirePermissions(['users', 'disable'])
  @ApiOperation({ summary: 'Update user status (active/inactive/blocked)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string; roleId?: string; permissions?: string[] },
    @CurrentUser('id') adminId: string,
  ) {
    const { status, roleId, permissions } = body;
    await this.usersService.updateStatus(id, status, roleId, permissions, adminId);
    return { message: `User status updated to ${status}` };
  }

  @Patch(':id/reset-password')
  @RequirePermissions(['users', 'reset_password'])
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('id') adminId: string,
  ) {
    await this.usersService.resetPassword(id, dto.newPassword, adminId);
    return { message: 'Password reset successfully' };
  }

  @Delete(':id')
  @RequirePermissions(['users', 'delete'])
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.usersService.softDelete(id, adminId);
    return { message: 'User deleted successfully' };
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload current user avatar' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // File saved via storage service; URL returned
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    await this.usersService.updateAvatar(userId, avatarUrl);
    return { avatarUrl };
  }
}
