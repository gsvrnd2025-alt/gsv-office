// Chat Module - Provides real-time WebSocket chat via Socket.IO
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from '../../gateways/chat.gateway';

@Module({
  imports: [
    AuthModule, // Exports JwtModule → JwtService for ChatGateway WebSocket auth
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
