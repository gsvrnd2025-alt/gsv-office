import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/webrtc', transports: ['websocket', 'polling'] })
export class WebrtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WebrtcGateway.name);
  private rooms = new Map<string, Set<string>>(); // roomId -> Set<socketId>

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.user = payload;
      
      // Join personal room to receive direct signals
      client.join(`user:${payload.sub}`);
      this.logger.log(`WebRTC Client connected: ${client.id} (user: ${payload.sub})`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebRTC Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('call:initiate')
  handleCallInitiate(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const roomId = uuid();
    this.rooms.set(roomId, new Set([client.id]));
    client.join(roomId);
    // Notify callee
    this.server.to(`user:${data.calleeId}`).emit('call:incoming', {
      roomId, callerId: client.data?.userId, type: data.type,
    });
    return { roomId };
  }

  @SubscribeMessage('call:join')
  handleCallJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const room = this.rooms.get(data.roomId);
    if (room) {
      room.add(client.id);
      client.join(data.roomId);
      client.to(data.roomId).emit('call:participant-joined', { socketId: client.id });
    }
  }

  @SubscribeMessage('call:leave')
  handleCallLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.leave(data.roomId);
    client.to(data.roomId).emit('call:participant-left', { socketId: client.id });
  }

  @SubscribeMessage('webrtc:offer')
  handleOffer(@ConnectedSocket() client: Socket, @MessageBody() data: { to: string; offer: any; roomId: string }) {
    client.to(data.to).emit('webrtc:offer', { from: client.id, offer: data.offer, roomId: data.roomId });
  }

  @SubscribeMessage('webrtc:answer')
  handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: { to: string; answer: any }) {
    client.to(data.to).emit('webrtc:answer', { from: client.id, answer: data.answer });
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() data: { to: string; candidate: any }) {
    client.to(data.to).emit('webrtc:ice-candidate', { from: client.id, candidate: data.candidate });
  }

  // ── GSV Remote Desk Signaling ───────────────────────────────────

  @SubscribeMessage('remote:request')
  handleRemoteRequest(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; callerName: string; callerPhone: string; callerDept: string }) {
    this.logger.log(`Remote request from ${client.data.userId} to ${data.targetUserId}`);
    this.server.to(`user:${data.targetUserId}`).emit('remote:request', {
      callerId: client.data.userId,
      callerName: data.callerName,
      callerPhone: data.callerPhone,
      callerDept: data.callerDept,
    });
  }

  @SubscribeMessage('remote:response')
  handleRemoteResponse(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; status: 'accepted' | 'rejected'; permissions?: any; duration?: string }) {
    this.logger.log(`Remote response from ${client.data.userId} to ${data.targetUserId} status ${data.status}`);
    this.server.to(`user:${data.targetUserId}`).emit('remote:response', {
      hostId: client.data.userId,
      status: data.status,
      permissions: data.permissions,
      duration: data.duration,
    });
  }

  @SubscribeMessage('remote:signal')
  handleRemoteSignal(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; signal: any }) {
    this.server.to(`user:${data.targetUserId}`).emit('remote:signal', {
      fromId: client.data.userId,
      signal: data.signal,
    });
  }

  @SubscribeMessage('remote:ice-candidate')
  handleRemoteIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; candidate: any }) {
    this.server.to(`user:${data.targetUserId}`).emit('remote:ice-candidate', {
      fromId: client.data.userId,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('remote:control-lock')
  handleRemoteControlLock(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; isLocked: boolean }) {
    this.server.to(`user:${data.targetUserId}`).emit('remote:control-lock', {
      fromId: client.data.userId,
      isLocked: data.isLocked,
    });
  }

  @SubscribeMessage('remote:terminate')
  handleRemoteTerminate(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string }) {
    this.logger.log(`Remote session terminated between ${client.data.userId} and ${data.targetUserId}`);
    this.server.to(`user:${data.targetUserId}`).emit('remote:terminate', {
      fromId: client.data.userId,
    });
  }
}
