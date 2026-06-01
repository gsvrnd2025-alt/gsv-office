import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/webrtc', transports: ['websocket', 'polling'] })
export class WebrtcGateway {
  @WebSocketServer() server: Server;
  private rooms = new Map<string, Set<string>>(); // roomId -> Set<socketId>

  constructor(private jwtService: JwtService) {}

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
}
