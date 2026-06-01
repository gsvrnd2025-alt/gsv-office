import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/presence',
  transports: ['websocket', 'polling'],
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private onlineUsers = new Set<string>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      this.onlineUsers.add(payload.sub);
      this.server.emit('presence:update', { userId: payload.sub, isOnline: true });
    } catch { client.disconnect(); }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.onlineUsers.delete(client.data.userId);
      this.server.emit('presence:update', { userId: client.data.userId, isOnline: false });
    }
  }

  @SubscribeMessage('presence:get-online')
  getOnlineUsers() {
    return { users: Array.from(this.onlineUsers) };
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
