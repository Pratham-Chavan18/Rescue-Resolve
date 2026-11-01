import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async getRestaurantOrders(restaurantId: string) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['placed', 'accepted', 'packed', 'rider_assigned'] },
      },
      include: {
        items: true,
        health: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmPackingTime(orderId: string, restaurantId: string, confirmedMinutes: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.restaurantId !== restaurantId) throw new ForbiddenException('Not your restaurant\'s order');

    const newEta = new Date(Date.now() + confirmedMinutes * 60 * 1000);
    await this.prisma.order.update({
      where: { id: orderId },
      data: { promisedAt: newEta },
    });

    // Emit health update with new ETA
    this.realtime.emitToOrder(orderId, {
      t: 'health.changed',
      orderId,
      state: 'at_risk',
      etaAt: newEta.toISOString(),
      triggers: ['PACK_DELAY'],
    });

    return { ok: true, newEta };
  }

  async declineItem(orderId: string, restaurantId: string, itemId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.restaurantId !== restaurantId) throw new ForbiddenException('Not your restaurant\'s order');

    // Mark item as unavailable
    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { qty: 0 },
    });

    // Trigger customer rescue — item declined
    this.realtime.emitToOrder(orderId, {
      t: 'rescue.offered',
      orderId,
      caseId: `decline-${itemId}`,
      options: [],
    });

    return { ok: true };
  }

  async getRiderTasks(riderId: string) {
    return this.prisma.order.findMany({
      where: { riderId, status: { in: ['rider_assigned', 'picked_up', 'near_you'] } },
      include: { restaurant: { select: { id: true, name: true, lat: true, lng: true } }, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptReassignment(orderId: string, riderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your task');

    await this.prisma.order.update({ where: { id: orderId }, data: { status: 'rider_assigned' } });
    return { ok: true };
  }

  async acceptOrder(orderId: string, restaurantId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.restaurantId !== restaurantId) throw new ForbiddenException('Not your restaurant\'s order');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'accepted' },
    });

    await this.prisma.orderEvent.create({
      data: { orderId, type: 'accepted', at: new Date() },
    });

    this.realtime.emitToOrder(orderId, {
      t: 'health.changed',
      orderId,
      state: 'on_track',
      etaAt: order.promisedAt.toISOString(),
      triggers: [],
    });

    return { ok: true, status: 'accepted' };
  }

  async markReady(orderId: string, restaurantId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.restaurantId !== restaurantId) throw new ForbiddenException('Not your restaurant\'s order');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'packed' },
    });

    await this.prisma.orderEvent.create({
      data: { orderId, type: 'packed', at: new Date() },
    });

    return { ok: true, status: 'packed' };
  }

  async pickupOrder(orderId: string, riderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your assigned delivery');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'picked_up' },
    });

    await this.prisma.orderEvent.create({
      data: { orderId, type: 'picked_up', at: new Date() },
    });

    return { ok: true, status: 'picked_up' };
  }

  async deliverOrder(orderId: string, riderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your assigned delivery');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'delivered', deliveredAt: new Date() },
    });

    await this.prisma.orderEvent.create({
      data: { orderId, type: 'delivered', at: new Date() },
    });

    return { ok: true, status: 'delivered' };
  }

  async reportRiderIssue(orderId: string, riderId: string, reason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your assigned delivery');

    await this.prisma.orderEvent.create({
      data: { orderId, type: 'rider_delay_reported', payload: { reason }, at: new Date() },
    });

    this.realtime.emitToOrder(orderId, {
      t: 'health.changed',
      orderId,
      state: 'at_risk',
      etaAt: new Date(Date.now() + 20 * 60000).toISOString(),
      triggers: ['RIDER_STUCK'],
    });

    return { ok: true, reason };
  }
}
