import { describe, it, expect } from 'vitest';
import { evaluate, DEFAULT_THRESHOLDS, type HealthSignal } from './index';

const now = new Date('2024-01-01T18:00:00Z');

function makeSignal(kind: HealthSignal['kind'], value: number): HealthSignal {
  return { kind, value, at: now };
}

describe('TriggerEngine.evaluate', () => {
  // ── No signals ─────────────────────────────────────────────────────────────
  describe('R-0: no signals', () => {
    it('returns on_track with no triggers', () => {
      const result = evaluate([], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('on_track');
      expect(result.triggers).toHaveLength(0);
    });
  });

  // ── R-1: ETA critical ─────────────────────────────────────────────────────
  describe('R-1: ETA critical (failing)', () => {
    it('fires ETA_CRITICAL when eta_slip >= 30 min', () => {
      const result = evaluate([makeSignal('eta_slip', 30)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('failing');
      expect(result.triggers.map((t) => t.trigger)).toContain('ETA_CRITICAL');
    });

    it('fires ETA_CRITICAL at 31 min', () => {
      const result = evaluate([makeSignal('eta_slip', 31)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('failing');
    });

    it('does NOT fire ETA_CRITICAL at 29 min', () => {
      const result = evaluate([makeSignal('eta_slip', 29)], DEFAULT_THRESHOLDS);
      expect(result.healthState).not.toBe('failing');
      expect(result.triggers.map((t) => t.trigger)).not.toContain('ETA_CRITICAL');
    });

    it('records the correct threshold in trace', () => {
      const result = evaluate([makeSignal('eta_slip', 35)], DEFAULT_THRESHOLDS);
      const traceEntry = result.ruleTrace.find((r) => r.ruleId === 'R-1');
      expect(traceEntry?.fired).toBe(true);
      expect(traceEntry?.reason).toContain('30 min');
    });
  });

  // ── R-2: Delivered unconfirmed ────────────────────────────────────────────
  describe('R-2: delivered_unconfirmed (failing)', () => {
    it('fires UNCONFIRMED when >= 5 min', () => {
      const result = evaluate([makeSignal('delivered_unconfirmed', 5)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('failing');
      expect(result.triggers.map((t) => t.trigger)).toContain('UNCONFIRMED');
    });

    it('does NOT fire at 4 min', () => {
      const result = evaluate([makeSignal('delivered_unconfirmed', 4)], DEFAULT_THRESHOLDS);
      expect(result.triggers.map((t) => t.trigger)).not.toContain('UNCONFIRMED');
    });
  });

  // ── R-3: ETA at-risk ──────────────────────────────────────────────────────
  describe('R-3: ETA at-risk', () => {
    it('fires ETA_SLIP when eta_slip >= 15 and < 30 min', () => {
      const result = evaluate([makeSignal('eta_slip', 20)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('at_risk');
      expect(result.triggers.map((t) => t.trigger)).toContain('ETA_SLIP');
      expect(result.triggers.map((t) => t.trigger)).not.toContain('ETA_CRITICAL');
    });

    it('ETA_CRITICAL takes precedence over ETA_SLIP at 30 min', () => {
      const result = evaluate([makeSignal('eta_slip', 30)], DEFAULT_THRESHOLDS);
      expect(result.triggers.map((t) => t.trigger)).toContain('ETA_CRITICAL');
      expect(result.triggers.map((t) => t.trigger)).not.toContain('ETA_SLIP');
    });

    it('does NOT fire at 14 min', () => {
      const result = evaluate([makeSignal('eta_slip', 14)], DEFAULT_THRESHOLDS);
      expect(result.triggers.map((t) => t.trigger)).not.toContain('ETA_SLIP');
      expect(result.healthState).toBe('on_track');
    });
  });

  // ── R-4: Rider stationary ─────────────────────────────────────────────────
  describe('R-4: rider_stationary (at_risk)', () => {
    it('fires RIDER_STUCK at >= 6 min', () => {
      const result = evaluate([makeSignal('rider_stationary', 6)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('at_risk');
      expect(result.triggers.map((t) => t.trigger)).toContain('RIDER_STUCK');
    });

    it('does NOT fire at 5 min', () => {
      const result = evaluate([makeSignal('rider_stationary', 5)], DEFAULT_THRESHOLDS);
      expect(result.triggers.map((t) => t.trigger)).not.toContain('RIDER_STUCK');
    });
  });

  // ── R-5: Pickup delay ─────────────────────────────────────────────────────
  describe('R-5: pickup_delay (at_risk)', () => {
    it('fires PICKUP_DELAY at >= 8 min', () => {
      const result = evaluate([makeSignal('pickup_delay', 8)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('at_risk');
      expect(result.triggers.map((t) => t.trigger)).toContain('PICKUP_DELAY');
    });

    it('does NOT fire at 7 min', () => {
      const result = evaluate([makeSignal('pickup_delay', 7)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('on_track');
    });
  });

  // ── R-6: Pack delay ───────────────────────────────────────────────────────
  describe('R-6: pack_delay (at_risk)', () => {
    it('fires PACK_DELAY at >= 8 min', () => {
      const result = evaluate([makeSignal('pack_delay', 8)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('at_risk');
      expect(result.triggers.map((t) => t.trigger)).toContain('PACK_DELAY');
    });

    it('does NOT fire at 7 min', () => {
      const result = evaluate([makeSignal('pack_delay', 7)], DEFAULT_THRESHOLDS);
      expect(result.healthState).toBe('on_track');
    });
  });

  // ── Severity precedence ───────────────────────────────────────────────────
  describe('severity precedence', () => {
    it('failing wins over at_risk when both conditions present', () => {
      const result = evaluate(
        [
          makeSignal('eta_slip', 35),     // ETA_CRITICAL → failing
          makeSignal('rider_stationary', 10), // RIDER_STUCK → at_risk
        ],
        DEFAULT_THRESHOLDS,
      );
      expect(result.healthState).toBe('failing');
      expect(result.triggers.map((t) => t.trigger)).toContain('ETA_CRITICAL');
      expect(result.triggers.map((t) => t.trigger)).toContain('RIDER_STUCK');
    });

    it('multiple at_risk signals still return at_risk', () => {
      const result = evaluate(
        [
          makeSignal('rider_stationary', 10),
          makeSignal('pickup_delay', 12),
          makeSignal('eta_slip', 20),
        ],
        DEFAULT_THRESHOLDS,
      );
      expect(result.healthState).toBe('at_risk');
    });
  });

  // ── Custom thresholds ─────────────────────────────────────────────────────
  describe('custom thresholds', () => {
    it('respects custom threshold values', () => {
      const customThresholds = { ...DEFAULT_THRESHOLDS, riderStationaryMinutes: 2 };
      const result = evaluate([makeSignal('rider_stationary', 3)], customThresholds);
      expect(result.triggers.map((t) => t.trigger)).toContain('RIDER_STUCK');
    });
  });

  // ── Rule trace completeness ───────────────────────────────────────────────
  describe('rule trace', () => {
    it('always returns all 6 rule traces regardless of signals', () => {
      const result = evaluate([], DEFAULT_THRESHOLDS);
      const ruleIds = result.ruleTrace.map((r) => r.ruleId);
      expect(ruleIds).toContain('R-1');
      expect(ruleIds).toContain('R-2');
      expect(ruleIds).toContain('R-3');
      expect(ruleIds).toContain('R-4');
      expect(ruleIds).toContain('R-5');
      expect(ruleIds).toContain('R-6');
    });
  });
});
