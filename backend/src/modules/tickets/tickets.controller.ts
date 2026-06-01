import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private svc: TicketsService) {}
  @Get() @RequirePermissions(['tickets', 'read']) findAll(@Query() q: any) { return this.svc.findAll(q); }
  @Get('categories') @RequirePermissions(['tickets', 'read']) getCategories() { return this.svc.getCategories(); }
  @Post() @RequirePermissions(['tickets', 'create']) create(@Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.create(dto, userId); }
  @Put(':id') @RequirePermissions(['tickets', 'update']) update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.update(id, dto, userId); }
  @Post(':id/comments') @RequirePermissions(['tickets', 'create']) addComment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.addComment(id, dto, userId); }
}
