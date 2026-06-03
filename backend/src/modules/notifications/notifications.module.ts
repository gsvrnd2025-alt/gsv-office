import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationGateway } from '../../gateways/notification.gateway';
import { PresenceGateway } from '../../gateways/presence.gateway';

@Module({
  imports: [
    AuthModule, // Exports JwtModule → JwtService for NotificationGateway & PresenceGateway WebSocket auth
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationGateway, PresenceGateway],
  exports: [NotificationsService, NotificationGateway, PresenceGateway],
})
export class NotificationsModule {}
