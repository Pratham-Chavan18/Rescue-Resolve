import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { evaluate, DEFAULT_THRESHOLDS, type HealthSignal, type TriggerFired } from '@swiggy/engines';
import type { HealthSignalKind } from '@swiggy/types';

export interface DatabaseCheckResult {
  connected: boolean;
  schemaReady: boolean;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Called by the OrderEventBus whenever a new health signal arrives.
   * 1. Persists the signal
   * 2. Re-runs TriggerEngine against all current signals
   * 3. Updates OrderHealth state
   * 4. Emits health.changed socket event
   */
  async processSignal(orderId: string, kind: HealthSignalKind, value: number): Promise<void> {
    // Persist the signal
    await this.prisma.healthSignal.create({
      data: { orderId, kind, value, at: new Date() },
    });

    // Load all signals for this order (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const dbSignals = await this.prisma.healthSignal.findMany({
      where: { orderId, at: { gte: twoHoursAgo } },
      orderBy: { at: 'asc' },
    });

    const signals: HealthSignal[] = dbSignals.map((s) => ({
      kind: s.kind as HealthSignalKind,
      value: s.value,
      at: s.at,
    }));

    // Read config thresholds (env overrides, default fallback)
    const thresholds = {
      ...DEFAULT_THRESHOLDS,
      riderStationaryMinutes: parseInt(process.env['TRIGGER_RIDER_STATIONARY_MIN'] ?? '6', 10),
      pickupDelayMinutes: parseInt(process.env['TRIGGER_PICKUP_DELAY_MIN'] ?? '8', 10),
      etaSlipMinutes: parseInt(process.env['TRIGGER_ETA_SLIP_MIN'] ?? '15', 10),
      packDelayMinutes: parseInt(process.env['TRIGGER_PACK_DELAY_MIN'] ?? '8', 10),
      deliveredUnconfirmedMinutes: parseInt(process.env['TRIGGER_UNCONFIRMED_MIN'] ?? '5', 10),
    };

    // Run TriggerEngine (pure function — no side effects)
    const result = evaluate(signals, thresholds);

    // Update OrderHealth record
    const currentHealth = await this.prisma.orderHealth.findUnique({ where: { orderId } });
    const etaAt = currentHealth?.etaAt ?? new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.orderHealth.upsert({
      where: { orderId },
      update: {
        state: result.healthState,
        triggersJson: result.triggers as object[],
        ruleTraceJson: result.ruleTrace as object[],
      },
      create: {
        orderId,
        state: result.healthState,
        etaAt,
        triggersJson: result.triggers as object[],
        ruleTraceJson: result.ruleTrace as object[],
      },
    });

    // Emit socket event to order room
    this.realtime.emitToOrder(orderId, {
      t: 'health.changed',
      orderId,
      state: result.healthState,
      etaAt: etaAt.toISOString(),
      triggers: result.triggers.map((t: TriggerFired) => t.trigger),
    });
  }

  async getHealthForOrder(orderId: string) {
    return this.prisma.orderHealth.findUnique({ where: { orderId } });
  }

  async checkDatabase(): Promise<DatabaseCheckResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'orders'
        ) as "exists";
      `;
      const schemaReady = Boolean(rows && rows[0]?.exists);
      return { connected: true, schemaReady };
    } catch {
      return { connected: false, schemaReady: false };
    }
  }
}
