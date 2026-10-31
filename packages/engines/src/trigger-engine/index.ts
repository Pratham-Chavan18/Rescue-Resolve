import type { HealthSignalKind, HealthState, RescueTrigger, RuleTrace } from '@swiggy/types';

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface HealthSignal {
  kind: HealthSignalKind;
  /** Numeric value for the signal — interpretation depends on kind:
   *  - rider_stationary: minutes stationary
   *  - pickup_delay: minutes since order placement without acceptance
   *  - eta_slip: minutes the ETA has slipped past original promise
   *  - pack_delay: minutes since order placement without packing
   *  - delivered_unconfirmed: minutes since GPS drop without customer confirm
   */
  value: number;
  at: Date;
}

export interface TriggerThresholds {
  /** Minutes rider must be stationary after assignment to trigger */
  riderStationaryMinutes: number;
  /** Minutes without restaurant acceptance to trigger */
  pickupDelayMinutes: number;
  /** Minutes of ETA slip to trigger at_risk */
  etaSlipMinutes: number;
  /** Minutes of ETA slip to trigger failing (critical) */
  etaSlipCriticalMinutes: number;
  /** Minutes without packing to trigger */
  packDelayMinutes: number;
  /** Minutes after GPS drop without confirmation to trigger */
  deliveredUnconfirmedMinutes: number;
}

export const DEFAULT_THRESHOLDS: TriggerThresholds = {
  riderStationaryMinutes: 6,
  pickupDelayMinutes: 8,
  etaSlipMinutes: 15,
  etaSlipCriticalMinutes: 30,
  packDelayMinutes: 8,
  deliveredUnconfirmedMinutes: 5,
};

// ─── Output ───────────────────────────────────────────────────────────────────

export interface TriggerFired {
  trigger: RescueTrigger;
  signal: HealthSignal;
  thresholdValue: number;
}

export interface TriggerResult {
  healthState: HealthState;
  triggers: TriggerFired[];
  ruleTrace: RuleTrace[];
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * TriggerEngine.evaluate — pure, deterministic, no side effects.
 *
 * Takes all current health signals for an order and returns the derived
 * health state and which rules fired. Thresholds come from config, not code.
 *
 * Decision precedence (highest severity wins):
 *   failing > at_risk > on_track
 *
 * CONSTRAINTS §6.12: rule changes only here + tests, never in API handlers.
 */
export function evaluate(
  signals: HealthSignal[],
  thresholds: TriggerThresholds = DEFAULT_THRESHOLDS,
): TriggerResult {
  const triggers: TriggerFired[] = [];
  const ruleTrace: RuleTrace[] = [];

  // ── R-1: ETA critical (failing) ───────────────────────────────────────────
  const etaSlipSignals = signals.filter((s) => s.kind === 'eta_slip');
  const maxEtaSlip = Math.max(0, ...etaSlipSignals.map((s) => s.value));
  const etaCritical = maxEtaSlip >= thresholds.etaSlipCriticalMinutes;

  ruleTrace.push({
    ruleId: 'R-1',
    ruleName: 'ETA critical slip',
    fired: etaCritical,
    reason: etaCritical
      ? `ETA slipped ${maxEtaSlip} min ≥ threshold ${thresholds.etaSlipCriticalMinutes} min`
      : `ETA slip ${maxEtaSlip} min < threshold ${thresholds.etaSlipCriticalMinutes} min`,
  });

  if (etaCritical) {
    const worst = etaSlipSignals.reduce((a, b) => (a.value > b.value ? a : b));
    triggers.push({ trigger: 'ETA_CRITICAL', signal: worst, thresholdValue: thresholds.etaSlipCriticalMinutes });
  }

  // ── R-2: Delivered unconfirmed (failing) ──────────────────────────────────
  const unconfirmedSignals = signals.filter((s) => s.kind === 'delivered_unconfirmed');
  const maxUnconfirmed = Math.max(0, ...unconfirmedSignals.map((s) => s.value));
  const unconfirmedFired = maxUnconfirmed >= thresholds.deliveredUnconfirmedMinutes;

  ruleTrace.push({
    ruleId: 'R-2',
    ruleName: 'Delivered unconfirmed',
    fired: unconfirmedFired,
    reason: unconfirmedFired
      ? `GPS drop ${maxUnconfirmed} min ago with no confirmation`
      : `No unconfirmed delivery signal`,
  });

  if (unconfirmedFired) {
    const worst = unconfirmedSignals.reduce((a, b) => (a.value > b.value ? a : b));
    triggers.push({ trigger: 'UNCONFIRMED', signal: worst, thresholdValue: thresholds.deliveredUnconfirmedMinutes });
  }

  // ── R-3: ETA at-risk ──────────────────────────────────────────────────────
  const etaAtRisk = !etaCritical && maxEtaSlip >= thresholds.etaSlipMinutes;

  ruleTrace.push({
    ruleId: 'R-3',
    ruleName: 'ETA at-risk slip',
    fired: etaAtRisk,
    reason: etaAtRisk
      ? `ETA slipped ${maxEtaSlip} min ≥ threshold ${thresholds.etaSlipMinutes} min`
      : `ETA slip ${maxEtaSlip} min < threshold ${thresholds.etaSlipMinutes} min`,
  });

  if (etaAtRisk) {
    const worst = etaSlipSignals.reduce((a, b) => (a.value > b.value ? a : b));
    triggers.push({ trigger: 'ETA_SLIP', signal: worst, thresholdValue: thresholds.etaSlipMinutes });
  }

  // ── R-4: Rider stationary ─────────────────────────────────────────────────
  const riderSignals = signals.filter((s) => s.kind === 'rider_stationary');
  const maxRiderStationary = Math.max(0, ...riderSignals.map((s) => s.value));
  const riderFired = maxRiderStationary >= thresholds.riderStationaryMinutes;

  ruleTrace.push({
    ruleId: 'R-4',
    ruleName: 'Rider stationary',
    fired: riderFired,
    reason: riderFired
      ? `Rider stationary ${maxRiderStationary} min ≥ threshold ${thresholds.riderStationaryMinutes} min`
      : `Rider stationary ${maxRiderStationary} min < threshold ${thresholds.riderStationaryMinutes} min`,
  });

  if (riderFired) {
    const worst = riderSignals.reduce((a, b) => (a.value > b.value ? a : b));
    triggers.push({ trigger: 'RIDER_STUCK', signal: worst, thresholdValue: thresholds.riderStationaryMinutes });
  }

  // ── R-5: Pickup delay ─────────────────────────────────────────────────────
  const pickupSignals = signals.filter((s) => s.kind === 'pickup_delay');
  const maxPickupDelay = Math.max(0, ...pickupSignals.map((s) => s.value));
  const pickupFired = maxPickupDelay >= thresholds.pickupDelayMinutes;

  ruleTrace.push({
    ruleId: 'R-5',
    ruleName: 'Pickup delay',
    fired: pickupFired,
    reason: pickupFired
      ? `No acceptance/pickup ${maxPickupDelay} min ≥ threshold ${thresholds.pickupDelayMinutes} min`
      : `Pickup delay ${maxPickupDelay} min < threshold ${thresholds.pickupDelayMinutes} min`,
  });

  if (pickupFired) {
    const worst = pickupSignals.reduce((a, b) => (a.value > b.value ? a : b));
    triggers.push({ trigger: 'PICKUP_DELAY', signal: worst, thresholdValue: thresholds.pickupDelayMinutes });
  }

  // ── R-6: Pack delay ───────────────────────────────────────────────────────
  const packSignals = signals.filter((s) => s.kind === 'pack_delay');
  const maxPackDelay = Math.max(0, ...packSignals.map((s) => s.value));
  const packFired = maxPackDelay >= thresholds.packDelayMinutes;

  ruleTrace.push({
    ruleId: 'R-6',
    ruleName: 'Pack delay',
    fired: packFired,
    reason: packFired
      ? `Not packed ${maxPackDelay} min ≥ threshold ${thresholds.packDelayMinutes} min`
      : `Pack delay ${maxPackDelay} min < threshold ${thresholds.packDelayMinutes} min`,
  });

  if (packFired) {
    const worst = packSignals.reduce((a, b) => (a.value > b.value ? a : b));
    triggers.push({ trigger: 'PACK_DELAY', signal: worst, thresholdValue: thresholds.packDelayMinutes });
  }

  // ── Derive final health state ─────────────────────────────────────────────
  const hasFailing = triggers.some((t) => t.trigger === 'ETA_CRITICAL' || t.trigger === 'UNCONFIRMED');
  const hasAtRisk = triggers.length > 0 && !hasFailing;

  const healthState: HealthState = hasFailing ? 'failing' : hasAtRisk ? 'at_risk' : 'on_track';

  return { healthState, triggers, ruleTrace };
}
