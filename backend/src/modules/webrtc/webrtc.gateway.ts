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
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.user = payload;

      // Join personal room to receive direct signals
      client.join(`user:${payload.sub}`);
      this.logger.log(`WebRTC Client connected: ${client.id} (user: ${payload.sub})`);

      // Broadcast presence update to all connected clients
      this.server.emit('presence:update', { userId: payload.sub, isOnline: true });
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebRTC Client disconnected: ${client.id}`);
    if (client.data?.userId) {
      // Broadcast offline status
      this.server.emit('presence:update', { userId: client.data.userId, isOnline: false });
    }
    // Clean up rooms
    this.rooms.forEach((members, roomId) => {
      if (members.has(client.id)) {
        members.delete(client.id);
        client.to(roomId).emit('call:participant-left', { socketId: client.id, userId: client.data?.userId });
        if (members.size === 0) this.rooms.delete(roomId);
      }
    });
  }

  // ── Presence ────────────────────────────────────────────────────────────────

  @SubscribeMessage('presence:ping')
  handlePresencePing(@ConnectedSocket() client: Socket) {
    return { userId: client.data?.userId, isOnline: true };
  }

  // ── Call Signaling ───────────────────────────────────────────────────────────

  @SubscribeMessage('call:initiate')
  handleCallInitiate(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const roomId = data.roomId || uuid();
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set([client.id]));
    } else {
      this.rooms.get(roomId)?.add(client.id);
    }
    client.join(roomId);

    // Check if callee is connected in user:${data.calleeId}
    const calleeRoom = this.server.sockets.adapter.rooms.get(`user:${data.calleeId}`);
    const isOnline = !!(calleeRoom && calleeRoom.size > 0);

    if (!isOnline) {
      client.emit('call:unavailable', { calleeId: data.calleeId, reason: 'offline' });
      return { status: 'offline', roomId };
    }

    // Notify callee of incoming call
    this.server.to(`user:${data.calleeId}`).emit('call:incoming', {
      roomId,
      callerId: client.data?.userId,
      callerSocketId: client.id,
      callerName: data.callerName || client.data?.user?.fullName || 'Teammate',
      callerAvatar: data.callerAvatar,
      callerRole: data.callerRole,
      type: data.type || 'audio',
      isConference: !!data.isConference,
    });
    return { status: 'ringing', roomId };
  }

  @SubscribeMessage('call:reject')
  handleCallReject(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; callerId?: string }) {
    if (data.roomId) {
      client.to(data.roomId).emit('call:rejected', { roomId: data.roomId, by: client.data?.userId });
    }
    if (data.callerId) {
      this.server.to(`user:${data.callerId}`).emit('call:rejected', { roomId: data.roomId, by: client.data?.userId });
    }
  }

  /** Caller cancels / times out — notify callee with a missed call event */
  @SubscribeMessage('call:cancel')
  handleCallCancel(@ConnectedSocket() client: Socket, @MessageBody() data: {
    calleeId: string;
    roomId: string;
    callerName: string;
    type: 'audio' | 'video';
  }) {
    this.logger.log(`Call cancelled by ${client.data?.userId} → callee ${data.calleeId}`);
    this.server.to(`user:${data.calleeId}`).emit('call:missed', {
      callerId: client.data?.userId,
      callerName: data.callerName,
      type: data.type,
      roomId: data.roomId,
      timestamp: new Date().toISOString(),
    });
    // Clean up room
    const room = this.rooms.get(data.roomId);
    if (room) {
      room.delete(client.id);
      if (room.size === 0) this.rooms.delete(data.roomId);
    }
    client.leave(data.roomId);
  }

  @SubscribeMessage('call:join')
  handleCallJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; userName?: string }) {
    const room = this.rooms.get(data.roomId);
    if (room) {
      room.add(client.id);
    } else {
      this.rooms.set(data.roomId, new Set([client.id]));
    }
    client.join(data.roomId);
    client.to(data.roomId).emit('call:participant-joined', {
      socketId: client.id,
      userId: client.data?.userId,
      userName: data.userName || client.data?.user?.fullName || 'Teammate',
    });
    return { status: 'joined', socketId: client.id };
  }

  @SubscribeMessage('call:leave')
  handleCallLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const room = this.rooms.get(data.roomId);
    if (room) {
      room.delete(client.id);
      if (room.size === 0) this.rooms.delete(data.roomId);
    }
    client.leave(data.roomId);
    client.to(data.roomId).emit('call:participant-left', { socketId: client.id, userId: client.data?.userId });
  }

  // ── WebRTC Peer Exchange ─────────────────────────────────────────────────────

  @SubscribeMessage('webrtc:offer')
  handleOffer(@ConnectedSocket() client: Socket, @MessageBody() data: { to: string; offer: any; roomId: string }) {
    this.logger.log(`WebRTC offer from ${client.id} → ${data.to}`);
    client.to(data.to).emit('webrtc:offer', { from: client.id, offer: data.offer, roomId: data.roomId });
  }

  @SubscribeMessage('webrtc:answer')
  handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: { to: string; answer: any }) {
    this.logger.log(`WebRTC answer from ${client.id} → ${data.to}`);
    client.to(data.to).emit('webrtc:answer', { from: client.id, answer: data.answer });
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() data: { to: string; candidate: any }) {
    client.to(data.to).emit('webrtc:ice-candidate', { from: client.id, candidate: data.candidate });
  }

  // ── GSV Remote Desk Signaling ────────────────────────────────────────────────

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
    this.server.to(`user:${data.targetUserId}`).emit('remote:signal', { fromId: client.data.userId, signal: data.signal });
  }

  @SubscribeMessage('remote:ice-candidate')
  handleRemoteIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; candidate: any }) {
    this.server.to(`user:${data.targetUserId}`).emit('remote:ice-candidate', { fromId: client.data.userId, candidate: data.candidate });
  }

  @SubscribeMessage('remote:control-lock')
  handleRemoteControlLock(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; isLocked: boolean }) {
    this.server.to(`user:${data.targetUserId}`).emit('remote:control-lock', { fromId: client.data.userId, isLocked: data.isLocked });
  }

  @SubscribeMessage('remote:terminate')
  handleRemoteTerminate(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string }) {
    this.logger.log(`Remote session terminated between ${client.data.userId} and ${data.targetUserId}`);
    this.server.to(`user:${data.targetUserId}`).emit('remote:terminate', { fromId: client.data.userId });
  }
}
