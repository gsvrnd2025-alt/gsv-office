import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions(['roles', 'read'])
  findAll() { return this.rolesService.findAll(); }

  @Get(':id')
  @RequirePermissions(['roles', 'read'])
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.rolesService.findById(id); }

  @Get(':id/permissions')
  @RequirePermissions(['roles', 'read'])
  getPermissions(@Param('id', ParseUUIDPipe) id: string) { return this.rolesService.getPermissions(id); }

  @Post()
  @RequirePermissions(['roles', 'create'])
  create(@Body() dto: any, @CurrentUser('id') adminId: string) { return this.rolesService.create(dto, adminId); }

  @Put(':id')
  @RequirePermissions(['roles', 'update'])
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser('id') adminId: string) { return this.rolesService.update(id, dto, adminId); }

  @Post(':id/permissions')
  @RequirePermissions(['roles', 'assign_permissions'])
  assignPermissions(@Param('id', ParseUUIDPipe) id: string, @Body('permissionIds') permIds: string[], @CurrentUser('id') adminId: string) {
    return this.rolesService.assignPermissions(id, permIds, adminId);
  }

  @Delete(':id')
  @RequirePermissions(['roles', 'delete'])
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') adminId: string) { return this.rolesService.delete(id, adminId); }
}
