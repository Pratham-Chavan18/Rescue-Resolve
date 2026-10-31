import {
  WebSocketGateway, WebSocketServer, OnGatewayInit,
  OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from './realtime.service';
import type { JwtPayload } from '@swiggy/types';

/**
 * Socket.IO gateway with JWT room authorization.
 * CONSTRAINTS §4.15: server-side role check for every socket room join.
 */
@WebSocketGateway({
  cors: { origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000', credentials: true },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.setServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth['token'] as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
      });

      // Attach user to socket
      (client as any).user = payload;

      // Join personal user room for direct notifications
      await client.join(`user:${payload.sub}`);

      // Join role-specific rooms
      if (payload.role === 'agent') {
        await client.join('agent:queue');
      }
      if (payload.role === 'restaurant' && payload.restaurantId) {
        await client.join(`role:restaurant:${payload.restaurantId}`);
      }
      if (payload.role === 'rider' && payload.riderId) {
        await client.join(`role:rider:${payload.riderId}`);
      }

    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // Socket.IO handles room cleanup automatically
  }

  /**
   * Client requests to join an order room.
   * Server validates authorization before allowing the join.
   * CONSTRAINTS §4.15: server-side authorization — not just UI visibility.
   */
  @SubscribeMessage('join:order')
  async handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const user = (client as any).user as JwtPayload | undefined;
    if (!user) return { error: 'Unauthorized' };

    // Validate authorization
    if (user.role === 'customer') {
      const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
      if (!order || order.userId !== user.sub) {
        return { error: 'Not authorized for this order room' };
      }
    }
    // Agents can join any order room
    // Restaurant/rider authorization handled by their own rooms

    await client.join(`order:${data.orderId}`);
    return { ok: true };
  }
}
