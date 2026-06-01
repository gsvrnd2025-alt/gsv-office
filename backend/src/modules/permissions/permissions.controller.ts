import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private svc: PermissionsService) {}
  @Get() @RequirePermissions(['roles', 'read']) getAll() { return this.svc.getAll(); }
  @Get('grouped') @RequirePermissions(['roles', 'read']) getGrouped() { return this.svc.getAllGrouped(); }
  @Get('users/:id') @RequirePermissions(['users', 'manage_permissions']) getUserPerms(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getUserPermissions(id); }
  @Post('users/:id') @RequirePermissions(['users', 'manage_permissions']) setUserPerm(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { permissionId: string; granted: boolean }) {
    return this.svc.setUserPermission(id, dto.permissionId, dto.granted);
  }
}
