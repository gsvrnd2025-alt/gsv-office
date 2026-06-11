import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('chat')
export class ChatController {
  constructor(private svc: ChatService) {}

  @Get('conversations')
  @RequirePermissions(['chat', 'read'])
  getConversations(@CurrentUser('id') userId: string, @Query() q: any) {
    const page = parseInt(q.page, 10) || 1;
    const limit = parseInt(q.limit, 10) || 20;
    return this.svc.getConversations(userId, page, limit);
  }

  @Get('conversations/:id/messages')
  @RequirePermissions(['chat', 'read'])
  getMessages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string, @Query() q: any) {
    const page = parseInt(q.page, 10) || 1;
    const limit = parseInt(q.limit, 10) || 50;
    return this.svc.getMessages(id, userId, page, limit);
  }

  @Post('conversations')
  @RequirePermissions(['chat', 'send'])
  create(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.svc.createConversation({ ...dto, createdBy: userId });
  }

  @Post('conversations/:id/messages')
  @RequirePermissions(['chat', 'send'])
  send(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser('id') userId: string) {
    return this.svc.sendMessage({ ...dto, conversationId: id, senderId: userId });
  }

  @Post('conversations/:id/read')
  @RequirePermissions(['chat', 'read'])
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.svc.markAsRead(id, userId);
  }

  @Delete('messages/:messageId')
  @RequirePermissions(['chat', 'send'])
  deleteMessage(@Param('messageId', ParseUUIDPipe) messageId: string, @CurrentUser('id') userId: string) {
    return this.svc.deleteMessage(messageId, userId);
  }

  @Post('conversations/:id/members')
  @RequirePermissions(['chat', 'send'])
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId') userId: string,
    @CurrentUser('id') requestingUserId: string
  ) {
    return this.svc.addMember(id, userId, requestingUserId);
  }

  @Post('conversations/:id/invitations')
  @RequirePermissions(['chat', 'send'])
  createInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body('inviteeId', ParseUUIDPipe) inviteeId: string
  ) {
    return this.svc.createInvitation(id, userId, inviteeId);
  }

  @Get('invitations')
  @RequirePermissions(['chat', 'read'])
  getInvitations(@CurrentUser('id') userId: string) {
    return this.svc.getInvitations(userId);
  }

  @Post('invitations/:id/accept')
  @RequirePermissions(['chat', 'send'])
  acceptInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.svc.acceptInvitation(id, userId);
  }

  @Post('invitations/:id/reject')
  @RequirePermissions(['chat', 'send'])
  rejectInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.svc.rejectInvitation(id, userId);
  }

  @Delete('conversations/:id/members/:userId')
  @RequirePermissions(['chat', 'send'])
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userIdToRemove: string,
    @CurrentUser('id') userId: string
  ) {
    return this.svc.removeMember(id, userIdToRemove, userId);
  }

  @Post('conversations/:id/members/:userId/role')
  @RequirePermissions(['chat', 'send'])
  changeMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser('id') userId: string,
    @Body('role') role: string
  ) {
    return this.svc.changeMemberRole(id, targetUserId, role, userId);
  }

  @Patch('conversations/:id')
  @RequirePermissions(['chat', 'send'])
  updateConversation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser('id') userId: string) {
    return this.svc.updateConversation(id, dto, userId);
  }

  @Delete('conversations/:id')
  @RequirePermissions(['chat', 'send'])
  deleteConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Query('clearForEveryone') clearForEveryone: string
  ) {
    return this.svc.deleteConversation(id, userId, clearForEveryone === 'true');
  }
}
