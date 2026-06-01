import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, Public } from '../../common/decorators/public.decorator';
import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private svc: DepartmentsService) {}
  
  @Public()
  @Get('public')
  findPublic() {
    return this.svc.findAll();
  }

  @Get() @RequirePermissions(['departments', 'read']) findAll() { return this.svc.findAll(); }
  @Get(':id') @RequirePermissions(['departments', 'read']) findOne(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(id); }
  @Post() @RequirePermissions(['departments', 'create']) create(@Body() dto: any, @CurrentUser('id') by: string) { return this.svc.create(dto, by); }
  @Put(':id') @RequirePermissions(['departments', 'update']) update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser('id') by: string) { return this.svc.update(id, dto, by); }
  @Delete(':id') @RequirePermissions(['departments', 'delete']) remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') by: string) { return this.svc.delete(id, by); }
}
