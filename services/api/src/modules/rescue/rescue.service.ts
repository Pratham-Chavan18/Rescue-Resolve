import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { RealtimeService } from '../realtime/realtime.service';
import { find as matcherFind } from '@swiggy/engines';
import type { RescueChoice, RescueOption } from '@swiggy/types';

@Injectable()
export class RescueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Called by HealthService when an order goes at_risk/failing.
   * Creates a RescueCase with a snapshot of options.
   * CONSTRAINTS §5.17: nothing executes without customer choice.
   */
  async createCase(orderId: string, trigger: string): Promise<void> {
    // Check if a case is already open
    const existing = await this.prisma.rescueCase.findFirst({
      where: { orderId, status: 'offered' },
    });
    if (existing) return; // Idempotent — don't create duplicates

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, restaurant: true },
    });
    if (!order) return;

    // ── Build options snapshot ────────────────────────────────────────────────
    const waitCreditPaise = this.computeWaitCredit(trigger);

    // Replacement candidates from nearby restaurants
    const nearbyRestaurants = await this.prisma.restaurant.findMany({
      where: { id: { not: order.restaurantId }, NOT: { load: 'high' } },
      include: { menuItems: { where: { available: true } } },
    });

    const candidates = nearbyRestaurants.map((r) => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      isVegOnly: r.vegOnly,
      lat: r.lat,
      lng: r.lng,
      estimatedPrepMinutes: 20,
      estimatedTotalPaise: order.totalPaise as any,
      load: 'low' as const,
      topItems: r.menuItems.slice(0, 2).map((m) => ({ name: m.name, pricePaise: m.pricePaise as any })),
    }));

    const orderForMatch = {
      id: orderId,
      totalPaise: order.totalPaise as any,
      cuisine: order.restaurant.cuisine,
      isVeg: order.items.every((i) => i.isVeg),
      customerLat: 12.9716, // In a real system, from Order.address geocoded
      customerLng: 77.5946,
    };

    const matches = matcherFind(orderForMatch, candidates);
    const newEta = new Date(Date.now() + 35 * 60 * 1000);

    const options: RescueOption[] = [
      {
        kind: 'wait',
        label: `Get ₹${Math.round(waitCreditPaise / 100)} credit now`,
        creditAmount: waitCreditPaise as any,
        newEta: newEta.toISOString(),
      },
      ...(matches.length > 0
        ? [
            {
              kind: 'replace' as RescueChoice,
              label: 'Replace with a similar meal nearby',
              replacementRestaurantId: matches[0]!.restaurant.id,
              priceDiffPaise: matches[0]!.priceDiffPaise,
              newEta: new Date(Date.now() + matches[0]!.estimatedDeliveryMinutes * 60000).toISOString(),
            } as RescueOption,
          ]
        : []),
      {
        kind: 'cancel',
        label: `Cancel and get ₹${Math.round(order.totalPaise / 100)} refund`,
        refundAmount: order.totalPaise as any,
      },
    ];

    const rescueCase = await this.prisma.rescueCase.create({
      data: {
        orderId,
        trigger,
        optionsJson: options as object[],
        status: 'offered',
      },
    });

    // Emit socket events
    this.realtime.emitToOrder(orderId, {
      t: 'rescue.offered',
      orderId,
      caseId: rescueCase.id,
      options,
    });

    // Notify restaurant
    if (order.restaurant) {
      this.realtime.emitToRestaurant(order.restaurantId, {
        t: 'partner.risk',
        restaurantId: order.restaurantId,
        orderId,
        reason: trigger,
        triggers: [trigger as any],
      });
    }
  }

  async getCase(orderId: string) {
    return this.prisma.rescueCase.findFirst({
      where: { orderId, status: 'offered' },
    });
  }

  /**
   * Customer chooses a recovery option.
   * CONSTRAINTS §5.17: explicit customer choice required — nothing auto-executes.
   * Uses idempotency key (caseId) to prevent double-execution.
   */
  async recordChoice(caseId: string, userId: string, choice: RescueChoice, replacementRestaurantId?: string): Promise<void> {
    const rescueCase = await this.prisma.rescueCase.findUnique({ where: { id: caseId } });
    if (!rescueCase) throw new NotFoundException('Rescue case not found');
    if (rescueCase.status !== 'offered') throw new ConflictException('Case is no longer open');

    const order = await this.prisma.order.findUnique({
      where: { id: rescueCase.orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Not your order');

    // Validate choice is in the options snapshot
    const options = (rescueCase.optionsJson as unknown) as RescueOption[];
    const chosenOption = options.find((o) => o.kind === choice);
    if (!chosenOption) throw new BadRequestException('Invalid choice');

    const slaAt = new Date(Date.now() + 35 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      // Update case
      await tx.rescueCase.update({
        where: { id: caseId },
        data: { choice, status: 'accepted', slaAt },
      });

      if (choice === 'wait' && chosenOption.creditAmount) {
        // Ledger: wallet credit
        await this.ledger.append({
          orderId: order.id,
          cause: 'logistics',
          actor: 'system',
          kind: 'credit',
          amountPaise: chosenOption.creditAmount,
          destination: 'wallet',
          note: `Wait-with-credit: ₹${Math.round(chosenOption.creditAmount / 100)} wallet credit for order delay`,
        });
      } else if (choice === 'cancel' && chosenOption.refundAmount) {
        // Cancel order + full refund
        await tx.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
        await this.ledger.append({
          orderId: order.id,
          cause: 'logistics',
          actor: 'system',
          kind: 'refund',
          amountPaise: chosenOption.refundAmount,
          destination: 'source',
          note: `Cancel-and-refund: full refund of ₹${Math.round(chosenOption.refundAmount / 100)} to source`,
        });
      } else if (choice === 'replace') {
        // Ledger note for replacement
        await this.ledger.append({
          orderId: order.id,
          cause: 'logistics',
          actor: 'system',
          kind: 'note',
          amountPaise: 0,
          note: `Replacement order created from restaurant ${replacementRestaurantId ?? 'unknown'}`,
        });
      }
    });

    // Emit status update
    this.realtime.emitToOrder(rescueCase.orderId, {
      t: 'rescue.updated',
      caseId,
      status: 'accepted',
      choice,
      slaAt: slaAt.toISOString(),
    });
  }

  private computeWaitCredit(trigger: string): number {
    // Tiered by trigger severity (paise)
    if (trigger === 'ETA_CRITICAL') return 10000; // ₹100
    if (trigger === 'RIDER_STUCK') return 7500;   // ₹75
    return 5000;                                   // ₹50 default
  }
}
