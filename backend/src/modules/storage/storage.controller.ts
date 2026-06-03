import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('storage')
export class StorageController {
  constructor(private svc: StorageService) {}

  @Get('metrics')
  @RequirePermissions(['server', 'view'])
  async getMetrics() {
    const data = await this.svc.getStorageMetrics();
    return { data };
  }

  @Post('users/quota')
  @RequirePermissions(['server', 'configure'])
  async updateQuota(@Body() dto: { loginId: string; limitBytes: number }) {
    return this.svc.updateQuota(dto.loginId, dto.limitBytes);
  }
}
