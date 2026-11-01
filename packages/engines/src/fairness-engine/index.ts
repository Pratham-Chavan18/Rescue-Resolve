import type {
  IssueKind,
  EvidenceVerdict,
  Confidence,
  EntitlementDestination,
  EntitlementOutcome,
  EntitlementLineItem,
  FairnessDecision,
  RuleTrace,
  Paise,
} from '@swiggy/types';

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface ClaimEvidence {
  kind: 'photo' | 'timestamp' | 'line_item';
  verdict?: EvidenceVerdict;
}

export interface ClaimedLineItem {
  name: string;
  pricePaise: Paise;
  qty: number;
}

export interface OrderSnapshot {
  id: string;
  totalPaise: Paise;
  deliveryFeePaise: Paise;
  promisedAt: Date;
  deliveredAt?: Date;
  items: Array<{ name: string; pricePaise: Paise; qty: number }>;
}

export interface CustomerHistory {
  claimCount: number;
  totalOrders: number;
  /** Rolling 30-day auto credit already received in paise */
  rollingCreditPaise: Paise;
}

export interface Claim {
  issueKind: IssueKind;
  claimedItems?: ClaimedLineItem[];
  evidence: ClaimEvidence[];
}

// Human-review cap: orders above this value go to low confidence / human review
// CONSTRAINTS §5.21 and PRD §8: configurable via env, defaulting to ₹1,500
const HIGH_VALUE_CAP_PAISE =
  typeof process !== 'undefined' && process.env?.['HIGH_VALUE_CAP_PAISE']
    ? parseInt(process.env['HIGH_VALUE_CAP_PAISE'], 10)
    : 150000;

// Rolling 30-day automatic credit cap:
// CONSTRAINTS §5.21 and PRD §8: configurable via env, defaulting to ₹3,000 (300,000 paise)
const ROLLING_CREDIT_CAP_PAISE =
  typeof process !== 'undefined' && process.env?.['ROLLING_CREDIT_CAP_PAISE']
    ? parseInt(process.env['ROLLING_CREDIT_CAP_PAISE'], 10)
    : 300000;

// ─── Output ───────────────────────────────────────────────────────────────────

// Re-export for consumers
export type { FairnessDecision };

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * FairnessEngine.decide — pure, deterministic, no side effects.
 *
 * Implements the PRD §5.3 decision matrix exactly.
 * All monetary math in integer paise — no floats.
 *
 * Returns a decision with a complete rule trace for every case.
 * CONSTRAINTS §6.12: entitlement changes only here + tests.
 */
export function decide(
  claim: Claim,
  order: OrderSnapshot,
  history: CustomerHistory,
): FairnessDecision {
  const ruleTrace: RuleTrace[] = [];
  const lineItems: EntitlementLineItem[] = [];

  // ── H-1: High-value, rolling cap reached, or conflicting → human review ────
  const isHighValue = order.totalPaise > HIGH_VALUE_CAP_PAISE;
  const isRollingCapExceeded = history.rollingCreditPaise >= ROLLING_CREDIT_CAP_PAISE;
  const hasConflictingSignals =
    history.claimCount > 0 &&
    history.claimCount / Math.max(1, history.totalOrders) > 0.3 &&
    history.totalOrders >= 10;

  ruleTrace.push({
    ruleId: 'H-1',
    ruleName: 'High-value, credit cap, or conflicting signals → human review',
    fired: isHighValue || isRollingCapExceeded || hasConflictingSignals,
    reason: isHighValue
      ? `Order value ${order.totalPaise} paise > cap ${HIGH_VALUE_CAP_PAISE} paise`
      : isRollingCapExceeded
        ? `Rolling 30-day credit ${history.rollingCreditPaise} paise reached cap ${ROLLING_CREDIT_CAP_PAISE} paise`
        : hasConflictingSignals
          ? `Claim rate ${history.claimCount}/${history.totalOrders} > 30% with ≥10 orders`
          : 'Order value, rolling credit, and claim rate within thresholds',
  });

  if (isHighValue || isRollingCapExceeded || hasConflictingSignals) {
    return {
      confidence: 'low',
      outcome: 'human_review',
      lineItems: [],
      total: 0 as Paise,
      destination: 'wallet',
      reason: isHighValue
        ? 'Order value above ₹1,500 — a specialist will review and respond within 15 minutes.'
        : isRollingCapExceeded
          ? 'Automatic credit limit reached for the last 30 days — a specialist will review your case.'
          : 'Your account history has been flagged for specialist review.',
      ruleTrace,
    };
  }

  // ── Late delivery rules (L-1, L-2, L-3) ──────────────────────────────────
  if (claim.issueKind === 'late_delivery') {
    if (!order.deliveredAt) {
      ruleTrace.push({
        ruleId: 'L-0',
        ruleName: 'Late delivery — no delivery timestamp',
        fired: true,
        reason: 'Order has no delivery timestamp; cannot evaluate lateness automatically.',
      });
      return {
        confidence: 'low',
        outcome: 'human_review',
        lineItems: [],
        total: 0 as Paise,
        destination: 'wallet',
        reason: 'Delivery timestamp unavailable — a specialist will review your case.',
        ruleTrace,
      };
    }

    const lateMs = order.deliveredAt.getTime() - order.promisedAt.getTime();
    const lateMin = Math.floor(lateMs / 60000);

    // L-3: > 60 min late → ₹100 credit (10000 paise)
    const l3Fired = lateMin > 60;
    ruleTrace.push({
      ruleId: 'L-3',
      ruleName: 'Late >60 min → ₹100 credit',
      fired: l3Fired,
      reason: l3Fired ? `Delivered ${lateMin} min late > 60 min threshold` : `Delivered ${lateMin} min late`,
    });

    // L-2: 45-60 min late → ₹75 credit (7500 paise)
    const l2Fired = !l3Fired && lateMin > 45;
    ruleTrace.push({
      ruleId: 'L-2',
      ruleName: 'Late 45–60 min → ₹75 credit',
      fired: l2Fired,
      reason: l2Fired ? `Delivered ${lateMin} min late — 45–60 min band` : `Not in 45–60 min band`,
    });

    // L-1: 30-45 min late → ₹50 credit (5000 paise)
    const l1Fired = !l3Fired && !l2Fired && lateMin > 30;
    ruleTrace.push({
      ruleId: 'L-1',
      ruleName: 'Late 30–45 min → ₹50 credit',
      fired: l1Fired,
      reason: l1Fired ? `Delivered ${lateMin} min late — 30–45 min band` : `Not in 30–45 min band`,
    });

    if (!l1Fired && !l2Fired && !l3Fired) {
      ruleTrace.push({
        ruleId: 'L-0',
        ruleName: 'Late delivery — below threshold',
        fired: true,
        reason: `Delivered ${lateMin} min late — below 30-min threshold for compensation`,
      });
      return {
        confidence: 'high',
        outcome: 'human_review',
        lineItems: [],
        total: 0 as Paise,
        destination: 'wallet',
        reason: `Delivery was ${lateMin} minutes late — below our 30-minute threshold for credit. If you believe this is incorrect, you can escalate.`,
        ruleTrace,
      };
    }

    const creditPaise = l3Fired ? (10000 as Paise) : l2Fired ? (7500 as Paise) : (5000 as Paise);
    lineItems.push({ label: 'Late delivery credit', amount: creditPaise, destination: 'wallet' });

    return {
      confidence: 'high',
      outcome: 'late_credit',
      lineItems,
      total: creditPaise,
      destination: 'wallet',
      reason: `Your order arrived ${lateMin} minutes late. You are eligible for a wallet credit.`,
      ruleTrace,
    };
  }

  // ── Missing item rules (M-1) ──────────────────────────────────────────────
  if (claim.issueKind === 'missing_item') {
    const claimedItems = claim.claimedItems ?? [];

    ruleTrace.push({
      ruleId: 'M-1',
      ruleName: 'Missing item selected from bill → item refund + 50% fee credit',
      fired: claimedItems.length > 0,
      reason:
        claimedItems.length > 0
          ? `Customer selected ${claimedItems.length} missing item(s) from bill`
          : 'No items selected',
    });

    if (claimedItems.length === 0) {
      return {
        confidence: 'low',
        outcome: 'human_review',
        lineItems: [],
        total: 0 as Paise,
        destination: 'wallet',
        reason: 'No items were selected. Please resubmit with the missing items checked.',
        ruleTrace,
      };
    }

    const itemRefundPaise = claimedItems.reduce(
      (sum, item) => (sum + item.pricePaise * item.qty) as Paise,
      0 as Paise,
    );
    const feeCredit = Math.floor(order.deliveryFeePaise * 0.5) as Paise;

    lineItems.push({ label: 'Missing item refund', amount: itemRefundPaise, destination: 'wallet' });
    lineItems.push({ label: '50% delivery fee credit', amount: feeCredit, destination: 'wallet' });

    const total = (itemRefundPaise + feeCredit) as Paise;

    return {
      confidence: 'high',
      outcome: 'item_refund',
      lineItems,
      total,
      destination: 'wallet',
      reason: `${claimedItems.length} item(s) were not delivered. You are eligible for a refund plus a partial delivery fee credit.`,
      ruleTrace,
    };
  }

  // ── Wrong item / Quality rules (W-1, Q-1, W-2) ────────────────────────────
  if (claim.issueKind === 'wrong_item' || claim.issueKind === 'quality') {
    const photoEvidence = claim.evidence.find((e) => e.kind === 'photo');
    const photoVerdict = photoEvidence?.verdict;

    const expectedVerdict: EvidenceVerdict =
      claim.issueKind === 'wrong_item' ? 'mismatch_verified' : 'quality_verified';

    // W-1 / Q-1: Verified photo → full item refund + proportional fee credit to source
    const highConfFired = photoVerdict === expectedVerdict;

    ruleTrace.push({
      ruleId: claim.issueKind === 'wrong_item' ? 'W-1' : 'Q-1',
      ruleName:
        claim.issueKind === 'wrong_item'
          ? 'Wrong item — photo verified → full item refund to source'
          : 'Quality issue — photo verified → full item refund to source',
      fired: highConfFired,
      reason: highConfFired
        ? `Photo verdict "${photoVerdict}" confirms issue`
        : `Photo verdict "${photoVerdict ?? 'absent'}" insufficient for automatic resolution`,
    });

    if (highConfFired) {
      // Proportional fee credit: fee × (claimed_items_value / order_total)
      const claimedValue =
        (claim.claimedItems ?? []).reduce((sum, i) => sum + i.pricePaise * i.qty, 0) || order.totalPaise;
      const proportionalFee = Math.floor(
        (order.deliveryFeePaise * claimedValue) / Math.max(1, order.totalPaise),
      ) as Paise;

      lineItems.push({ label: 'Item refund', amount: claimedValue as Paise, destination: 'source' });
      if (proportionalFee > 0) {
        lineItems.push({ label: 'Proportional delivery fee credit', amount: proportionalFee, destination: 'source' });
      }

      const total = (claimedValue + proportionalFee) as Paise;

      return {
        confidence: 'high',
        outcome: claim.issueKind === 'wrong_item' ? 'full_item_refund' : 'full_item_refund',
        lineItems,
        total,
        destination: 'source',
        reason:
          claim.issueKind === 'wrong_item'
            ? 'You received a different item than ordered. You are eligible for a full refund.'
            : 'A quality issue with your item was verified. You are eligible for a full refund.',
        ruleTrace,
      };
    }

    // W-2: Ambiguous or absent photo → item value as wallet credit
    ruleTrace.push({
      ruleId: 'W-2',
      ruleName: 'Wrong/quality — ambiguous or absent photo → item value as wallet credit',
      fired: true,
      reason: `Photo ${photoVerdict ? `verdict "${photoVerdict}"` : 'not provided'} — medium confidence`,
    });

    const claimedValue =
      (claim.claimedItems ?? []).reduce((sum, i) => sum + i.pricePaise * i.qty, 0) || order.totalPaise;

    lineItems.push({ label: 'Item value as wallet credit', amount: claimedValue as Paise, destination: 'wallet' });

    return {
      confidence: 'medium',
      outcome: 'item_value_credit',
      lineItems,
      total: claimedValue as Paise,
      destination: 'wallet',
      reason:
        'We could not fully verify the issue from the photo provided. We are offering the item value as a wallet credit. If you prefer a source refund, tap "Talk to a human."',
      ruleTrace,
    };
  }

  // Fallback — should never reach here with valid issueKind
  return {
    confidence: 'low',
    outcome: 'human_review',
    lineItems: [],
    total: 0 as Paise,
    destination: 'wallet',
    reason: 'Unable to process your claim automatically. A specialist will review within 15 minutes.',
    ruleTrace,
  };
}
