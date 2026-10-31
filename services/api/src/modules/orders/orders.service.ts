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

    // Authorization: customer can only see own orders; agent can see all
    if (user.role === 'customer' && order.userId !== user.sub) {
      throw new ForbiddenException('Not your order');
    }
    if (user.role === 'restaurant' && order.restaurantId !== user.restaurantId) {
      throw new ForbiddenException('Not your restaurant\'s order');
    }

    return order;
  }

  async getCompletedOrdersForCustomer(userId: string) {
    return this.prisma.order.findMany({
      where: { userId, status: { in: ['delivered', 'cancelled', 'failed'] } },
      include: { items: true, restaurant: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
