import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CurrentUser } from '../../common/decorators/public.decorator';

@ApiTags('WebRTC')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('webrtc')
export class WebrtcController {
  constructor(private config: ConfigService, private dataSource: DataSource) {}
  @Get('config') getConfig() {
    return {
      iceServers: [{
        urls: [`turn:${this.config.get('TURN_SERVER', 'localhost')}:${this.config.get('TURN_PORT', '3478')}`],
        username: this.config.get('TURN_USERNAME', 'gsv_turn'),
        credential: this.config.get('TURN_PASSWORD', 'turn_password'),
      }],
    };
  }

  @Post('call-logs')
  async saveCallLog(@Body() dto: any, @CurrentUser('id') userId: string) {
    // dto: { status, name, durationSec, type: 'audio'|'video', partnerId: string }
    const res = await this.dataSource.query(`
      INSERT INTO calls (initiator_id, type, status, duration_seconds)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [userId, dto.type || 'audio', dto.status, dto.durationSec || 0]);

    const callId = res[0].id;
    
    // Add participants (initiator and partner)
    await this.dataSource.query(`
      INSERT INTO call_participants (call_id, user_id) VALUES ($1, $2)
    `, [callId, userId]);

    if (dto.partnerId) {
      await this.dataSource.query(`
        INSERT INTO call_participants (call_id, user_id) VALUES ($1, $2)
      `, [callId, dto.partnerId]);
    }

    return { id: callId, status: dto.status, name: dto.name, duration: dto.durationSec, time: res[0].created_at };
  }

  @Get('call-logs')
  async getCallLogs(@CurrentUser('id') userId: string) {
    // Return all calls where this user is a participant
    // Join with calls to get the initiator, status, etc.
    const logs = await this.dataSource.query(`
      SELECT c.id, c.status, c.duration_seconds as "durationSec", c.created_at as time, c.type,
             c.initiator_id, u.full_name as name, u.id as "userId"
      FROM calls c
      JOIN call_participants cp ON cp.call_id = c.id
      JOIN call_participants cp_other ON cp_other.call_id = c.id AND cp_other.user_id != $1
      JOIN users u ON u.id = cp_other.user_id
      WHERE cp.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT 50
    `, [userId]);
    
    return logs.map((l: any) => {
      // Map 'missed' to 'incoming' or 'outgoing' based on initiator
      let displayStatus = l.status;
      if (l.status !== 'missed') {
        displayStatus = l.initiator_id === userId ? 'outgoing' : 'incoming';
      }
      return {
        id: l.id,
        status: displayStatus,
        duration: l.durationSec ? `${Math.floor(l.durationSec / 60)}:${(l.durationSec % 60).toString().padStart(2, '0')}` : '0:00',
        time: new Date(l.time).toLocaleString(),
        name: l.name,
        userId: l.userId,
        type: l.type
      };
    });
  }
}
