import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from '../health/health.service';
import { RescueService } from '../rescue/rescue.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { SimFault, HealthSignalKind } from '@swiggy/types';

/**
 * Order Simulator — DECISIONS D8.
 *
 * Emits real OrderEvents through the same event flow that production would use.
 * The product path (health → rescue → resolve) cannot distinguish simulator
 * events from real ones. Only the world is simulated.
 *
 * Tick loop advances the demo order through its lifecycle.
 * Fault injection injects specific signal types on demand.
 */
@Injectable()
export class SimulatorService implements OnModuleInit {
  private readonly logger = new Logger(SimulatorService.name);
  private tickTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthService: HealthService,
    private readonly rescueService: RescueService,
    private readonly realtime: RealtimeService,
  ) {}

  onModuleInit() {
    const tickMs = parseInt(process.env['SIMULATOR_TICK_MS'] ?? '10000', 10);
    this.tickTimer = setInterval(() => this.tick(), tickMs);
    this.logger.log(`Simulator started — tick every ${tickMs}ms`);
  }

  /** Periodic lifecycle tick — advances demo order state */
  private async tick() {
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id: 'order-demo-live',
          status: { in: ['placed', 'accepted', 'packed', 'rider_assigned', 'picked_up', 'near_you'] },
        },
      });
      if (!order) return;

      // Drift ETA slightly each tick to simulate real-world variance
      const slipMinutes = 2;
      const etaSlip = Math.random() > 0.7 ? slipMinutes : 0;

      if (etaSlip > 0) {
        await this.healthService.processSignal(order.id, 'eta_slip', etaSlip);
      }

      // Emit a GPS ping event
      await this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: 'gps_ping',
          payload: { lat: 12.972 + Math.random() * 0.002, lng: 77.594 + Math.random() * 0.002 },
          at: new Date(),
        },
      });
    } catch (err) {
      this.logger.error('Simulator tick error', err);
    }
  }

  /**
   * Inject a fault into the demo order.
   * POST /sim/:orderId/fault { kind: SimFault }
   * Faults are real OrderEvents — the product cannot tell the difference (D8).
   */
  async injectFault(orderId: string, fault: SimFault): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    this.logger.log(`Injecting fault "${fault}" on order ${orderId}`);

    // Record the fault event
    await this.prisma.orderEvent.create({
      data: { orderId, type: 'fault', payload: { kind: fault }, at: new Date() },
    });

    // Map fault → health signal
    const signalMap: Record<SimFault, { kind: HealthSignalKind; value: number } | null> = {
      rider_stuck: { kind: 'rider_stationary', value: 8 },    // 8 min stationary
      restaurant_slow: { kind: 'pack_delay', value: 10 },     // 10 min pack delay
      eta_slip: { kind: 'eta_slip', value: 22 },              // 22 min ETA slip
      delivered_unconfirmed: { kind: 'delivered_unconfirmed', value: 6 }, // 6 min unconfirmed
      wrong_item: null,                                         // Resolve fault — no health signal
    };

    const signal = signalMap[fault];
    if (signal) {
      await this.healthService.processSignal(orderId, signal.kind, signal.value);

      // Create rescue case if health became at_risk/failing
      const health = await this.prisma.orderHealth.findUnique({ where: { orderId } });
      if (health && (health.state === 'at_risk' || health.state === 'failing')) {
        await this.rescueService.createCase(orderId, fault.toUpperCase());
      }
    } else if (fault === 'wrong_item') {
      const resolveCase = await this.prisma.resolveCase.create({
        data: {
          orderId,
          userId: order.userId,
          issue: 'wrong_item',
          status: 'escalated',
          confidence: 'low',
          decisionJson: {
            destination: 'source',
            refund: { itemAmount: 28000, deliveryFeeShare: 4000, tipRefund: 0, total: 32000 },
            credit: { creditAmount: 0, deliveryFeeShare: 0, goodwillCredit: 0, total: 0 },
            total: 32000,
            confidence: 'low',
            route: 'agent',
            rulesTriggered: [
              { code: 'W-1', description: 'Wrong item reported with photo evidence' },
              { code: 'H-1', description: 'Claim exceeds auto-resolve threshold — routed to agent queue' },
            ],
            notes: 'Flagged for human review under rule H-1',
          },
          evidence: {
            create: [
              {
                kind: 'photo',
                url: '/uploads/demo-evidence.jpg',
                verdict: 'ambiguous',
              },
            ],
          },
        },
      });
      this.realtime.emitToAgentQueue({
        t: 'agent.case.new',
        caseId: resolveCase.id,
        issueKind: 'wrong_item',
        confidence: 'low',
        totalPaise: 48000,
      });
    }
  }

  /** Reset demo order back to initial state */
  async reset(): Promise<void> {
    const now = new Date();
    const promisedAt = new Date(now.getTime() + 30 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: 'order-demo-live' },
        data: { status: 'rider_assigned', promisedAt },
      }),
      this.prisma.orderHealth.upsert({
        where: { orderId: 'order-demo-live' },
        update: { state: 'on_track', etaAt: promisedAt, triggersJson: [], ruleTraceJson: [] },
        create: { orderId: 'order-demo-live', state: 'on_track', etaAt: promisedAt },
      }),
      this.prisma.rescueCase.updateMany({
        where: { orderId: 'order-demo-live', status: 'offered' },
        data: { status: 'expired' },
      }),
      this.prisma.healthSignal.deleteMany({ where: { orderId: 'order-demo-live' } }),
    ]);

    this.logger.log('Demo order reset to initial state');
  }
}
