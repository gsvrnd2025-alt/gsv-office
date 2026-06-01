import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { PluginsService } from './plugins.service';

@ApiTags('Plugins')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('plugins')
export class PluginsController {
  constructor(private svc: PluginsService) {}
  @Get() @RequirePermissions(['plugins', 'read']) getAll() { return this.svc.getAll(); }
  @Post('install') @RequirePermissions(['plugins', 'install']) install(@Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.install(dto.manifest, userId); }
  @Patch(':id/enable') @RequirePermissions(['plugins', 'enable_disable']) enable(@Param('id') id: string) { return this.svc.setStatus(id, 'enabled'); }
  @Patch(':id/disable') @RequirePermissions(['plugins', 'enable_disable']) disable(@Param('id') id: string) { return this.svc.setStatus(id, 'disabled'); }
  @Delete(':id') @RequirePermissions(['plugins', 'remove']) remove(@Param('id') id: string) { return this.svc.remove(id); }
}
