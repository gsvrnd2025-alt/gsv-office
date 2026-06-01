import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('WebRTC')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('webrtc')
export class WebrtcController {
  constructor(private config: ConfigService) {}
  @Get('config') getConfig() {
    return {
      iceServers: [{
        urls: [`turn:${this.config.get('TURN_SERVER', 'localhost')}:${this.config.get('TURN_PORT', '3478')}`],
        username: this.config.get('TURN_USERNAME', 'gsv_turn'),
        credential: this.config.get('TURN_PASSWORD', 'turn_password'),
      }],
    };
  }
}
