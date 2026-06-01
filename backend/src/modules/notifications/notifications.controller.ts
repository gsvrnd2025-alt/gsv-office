import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}
  @Get() get(@CurrentUser('id') userId: string, @Query('unreadOnly') unreadOnly: string) { return this.svc.getForUser(userId, unreadOnly === 'true'); }
  @Get('count') count(@CurrentUser('id') userId: string) { return this.svc.getUnreadCount(userId); }
  @Patch(':id/read') markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) { return this.svc.markRead(id, userId); }
  @Patch('read-all') markAllRead(@CurrentUser('id') userId: string) { return this.svc.markAllRead(userId); }
}
