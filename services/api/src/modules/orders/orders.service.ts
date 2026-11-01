import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '@swiggy/types';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveOrderForCustomer(userId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        status: { in: ['placed', 'accepted', 'packed', 'rider_assigned', 'picked_up', 'near_you'] },
      },
      include: {
        items: true,
        restaurant: { select: { id: true, name: true, cuisine: true, lat: true, lng: true } },
        rider: { select: { id: true, name: true, lat: true, lng: true, status: true } },
        health: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return order;
  }

  async getOrderById(orderId: string, user: JwtPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        restaurant: { select: { id: true, name: true, cuisine: true } },
        rider: { select: { id: true, name: true } },
        events: { orderBy: { at: 'asc' } },
        health: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (user.role === 'customer' && order.userId !== user.sub) {
      throw new ForbiddenException('Not your order');
    }
    if (user.role === 'restaurant' && order.restaurantId !== user.restaurantId) {
      throw new ForbiddenException('Not your restaurant\'s order');
    }
    if (user.role === 'rider' && order.riderId !== user.riderId) {
      throw new ForbiddenException('Not your assigned order');
    }

    return order;
  }

  async getCompletedOrdersForCustomer(userId: string) {
    return this.prisma.order.findMany({
      where: { userId, status: { in: ['delivered', 'cancelled', 'failed'] } },
      include: { items: true, restaurant: { select: { id: true, name: true, cuisine: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getAllOrdersForCustomer(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        restaurant: { select: { id: true, name: true, cuisine: true, lat: true, lng: true } },
        rider: { select: { id: true, name: true, lat: true, lng: true, status: true } },
        health: true,
        rescueCases: { select: { id: true, choice: true, status: true, optionsJson: true } },
        resolveCases: { select: { id: true, issue: true, status: true, confidence: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getCustomerRecoveryHistory(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    const ledgerEntries = await this.prisma.ledgerEntry.findMany({
      where: { orderId: { in: orderIds } },
      include: {
        order: {
          select: {
            id: true,
            totalPaise: true,
            restaurant: { select: { name: true } },
          },
        },
      },
      orderBy: { at: 'desc' },
    });

    return ledgerEntries;
  }
}
