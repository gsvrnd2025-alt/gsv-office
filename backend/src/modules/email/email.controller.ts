import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { EmailService } from './email.service';

@ApiTags('Email')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('email')
export class EmailController {
  constructor(private svc: EmailService) {}
  @Get() @RequirePermissions(['email', 'read']) getEmails(@CurrentUser('id') userId: string, @Query('folder') folder: string) { return this.svc.getEmails(userId, folder); }
  @Post('send') @RequirePermissions(['email', 'send']) sendEmail(@Body() dto: any, @CurrentUser('id') userId: string) { return this.svc.sendEmail(dto, userId); }
  @Delete(':id') @RequirePermissions(['email', 'delete']) deleteEmail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) { return this.svc.deleteEmail(id, userId); }
}
