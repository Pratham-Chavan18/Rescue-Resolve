import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import type { ServerEvent } from '@swiggy/types';

/**
 * RealtimeService — wraps Socket.IO server for type-safe event emission.
 * All events use the ServerEvent union from @swiggy/types — no `any` payloads.
 * Room auth is handled in the gateway; this service only emits.
 */
@Injectable()
export class RealtimeService {
  private io: Server | null = null;

  setServer(io: Server) {
    this.io = io;
  }

  emitToOrder(orderId: string, event: ServerEvent) {
    this.io?.to(`order:${orderId}`).emit('event', event);
  }

  emitToRestaurant(restaurantId: string, event: ServerEvent) {
    this.io?.to(`role:restaurant:${restaurantId}`).emit('event', event);
  }

  emitToRider(riderId: string, event: ServerEvent) {
    this.io?.to(`role:rider:${riderId}`).emit('event', event);
  }

  emitToAgentQueue(event: ServerEvent) {
    this.io?.to('agent:queue').emit('event', event);
  }

  emitToUser(userId: string, event: ServerEvent) {
    this.io?.to(`user:${userId}`).emit('event', event);
  }
}
