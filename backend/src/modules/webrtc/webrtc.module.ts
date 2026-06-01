import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebrtcGateway } from './webrtc.gateway';
import { WebrtcController } from './webrtc.controller';

@Module({
  imports: [
    AuthModule, // Exports JwtModule → JwtService for WebrtcGateway WebSocket auth
  ],
  controllers: [WebrtcController],
  providers: [WebrtcGateway],
  exports: [WebrtcGateway],
})
export class WebrtcModule {}
