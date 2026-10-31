import { describe, it, expect } from 'vitest';
import { decide, type Claim, type OrderSnapshot, type CustomerHistory } from './index';
import type { Paise } from '@swiggy/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseOrder: OrderSnapshot = {
  id: 'order-1',
  totalPaise: 52000 as Paise,        // ₹520
  deliveryFeePaise: 4000 as Paise,   // ₹40
  promisedAt: new Date('2024-01-01T18:00:00Z'),
  items: [{ name: 'Burger', pricePaise: 22000 as Paise, qty: 1 }],
};

const cleanHistory: CustomerHistory = {
  claimCount: 0,
  totalOrders: 20,
  rollingCreditPaise: 0 as Paise,
};

const highValueOrder: OrderSnapshot = {
  ...baseOrder,
  totalPaise: 160000 as Paise, // ₹1,600 — above cap
};

// ─── H-1: High-value / conflicting signals ────────────────────────────────────

describe('H-1: high-value order → human review', () => {
  it('routes order >₹1,500 to human review', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      evidence: [{ kind: 'photo', verdict: 'mismatch_verified' }],
    };
    const result = decide(claim, highValueOrder, cleanHistory);
    expect(result.confidence).toBe('low');
    expect(result.outcome).toBe('human_review');
    expect(result.total).toBe(0);
  });

  it('routes high claim-rate customer to human review', () => {
    const suspectHistory: CustomerHistory = {
      claimCount: 5,
      totalOrders: 12,
      rollingCreditPaise: 0 as Paise,
    }; // 41.7% claim rate with ≥10 orders
    const claim: Claim = {
      issueKind: 'missing_item',
      claimedItems: [{ name: 'Chips', pricePaise: 5000 as Paise, qty: 1 }],
      evidence: [],
    };
    const result = decide(claim, baseOrder, suspectHistory);
    expect(result.confidence).toBe('low');
    expect(result.outcome).toBe('human_review');
  });

  it('does NOT route high-claim customer with <10 total orders', () => {
    const smallHistory: CustomerHistory = {
      claimCount: 3,
      totalOrders: 5,
      rollingCreditPaise: 0 as Paise,
    };
    const claim: Claim = {
      issueKind: 'missing_item',
      claimedItems: [{ name: 'Chips', pricePaise: 5000 as Paise, qty: 1 }],
      evidence: [],
    };
    const result = decide(claim, baseOrder, smallHistory);
    expect(result.outcome).not.toBe('human_review');
  });
});

// ─── W-1: Wrong item, verified photo → source refund ─────────────────────────

describe('W-1: wrong item with verified photo → full refund to source', () => {
  it('returns high confidence full_item_refund to source', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      claimedItems: [{ name: 'Burger', pricePaise: 22000 as Paise, qty: 1 }],
      evidence: [{ kind: 'photo', verdict: 'mismatch_verified' }],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.confidence).toBe('high');
    expect(result.outcome).toBe('full_item_refund');
    expect(result.destination).toBe('source');
    expect(result.total).toBeGreaterThan(0);
  });

  it('includes proportional delivery fee credit line item', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      claimedItems: [{ name: 'Burger', pricePaise: 22000 as Paise, qty: 1 }],
      evidence: [{ kind: 'photo', verdict: 'mismatch_verified' }],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    const feeItem = result.lineItems.find((l) => l.label.toLowerCase().includes('fee'));
    expect(feeItem).toBeDefined();
    expect(feeItem!.destination).toBe('source');
  });

  it('total uses integer paise (no floats)', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      claimedItems: [{ name: 'Burger', pricePaise: 22000 as Paise, qty: 1 }],
      evidence: [{ kind: 'photo', verdict: 'mismatch_verified' }],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(Number.isInteger(result.total)).toBe(true);
    result.lineItems.forEach((l) => expect(Number.isInteger(l.amount)).toBe(true));
  });

  it('fires rule W-1 in rule trace', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      evidence: [{ kind: 'photo', verdict: 'mismatch_verified' }],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.ruleTrace.find((r) => r.ruleId === 'W-1')?.fired).toBe(true);
  });
});

// ─── M-1: Missing item → wallet refund ───────────────────────────────────────

describe('M-1: missing item selected from bill → wallet refund', () => {
  it('returns high confidence item_refund to wallet', () => {
    const claim: Claim = {
      issueKind: 'missing_item',
      claimedItems: [{ name: 'Fries', pricePaise: 8000 as Paise, qty: 2 }],
      evidence: [],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.confidence).toBe('high');
    expect(result.outcome).toBe('item_refund');
    expect(result.destination).toBe('wallet');
  });

  it('includes 50% delivery fee credit', () => {
    const claim: Claim = {
      issueKind: 'missing_item',
      claimedItems: [{ name: 'Fries', pricePaise: 8000 as Paise, qty: 1 }],
      evidence: [],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    const feeItem = result.lineItems.find((l) => l.label.includes('50%'));
    expect(feeItem).toBeDefined();
    // 50% of 4000 = 2000
    expect(feeItem!.amount).toBe(2000);
  });

  it('routes to human review when no items selected', () => {
    const claim: Claim = {
      issueKind: 'missing_item',
      claimedItems: [],
      evidence: [],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.confidence).toBe('low');
    expect(result.outcome).toBe('human_review');
  });
});

// ─── Q-1: Quality, verified photo → source refund ────────────────────────────

describe('Q-1: quality issue with verified photo → full refund to source', () => {
  it('returns high confidence full refund to source', () => {
    const claim: Claim = {
      issueKind: 'quality',
      claimedItems: [{ name: 'Burger', pricePaise: 22000 as Paise, qty: 1 }],
      evidence: [{ kind: 'photo', verdict: 'quality_verified' }],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.confidence).toBe('high');
    expect(result.destination).toBe('source');
  });
});

// ─── W-2: Wrong/quality, ambiguous photo → wallet credit ─────────────────────

describe('W-2: wrong item with ambiguous/absent photo → wallet credit', () => {
  it('returns medium confidence item_value_credit to wallet (absent photo)', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      evidence: [],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.confidence).toBe('medium');
    expect(result.outcome).toBe('item_value_credit');
    expect(result.destination).toBe('wallet');
  });

  it('returns medium confidence with ambiguous verdict', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      evidence: [{ kind: 'photo', verdict: 'ambiguous' }],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.confidence).toBe('medium');
    expect(result.destination).toBe('wallet');
  });

  it('fires rule W-2 in trace when ambiguous', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      evidence: [{ kind: 'photo', verdict: 'ambiguous' }],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.ruleTrace.find((r) => r.ruleId === 'W-2')?.fired).toBe(true);
  });
});

// ─── L-1, L-2, L-3: Late delivery tiers ──────────────────────────────────────

describe('Late delivery tiers', () => {
  function makeLateClaim(lateMinutes: number): { claim: Claim; order: OrderSnapshot } {
    const promisedAt = new Date('2024-01-01T18:00:00Z');
    const deliveredAt = new Date(promisedAt.getTime() + lateMinutes * 60000);
    return {
      claim: { issueKind: 'late_delivery', evidence: [{ kind: 'timestamp' }] },
      order: { ...baseOrder, promisedAt, deliveredAt },
    };
  }

  it('L-1: 30–45 min late → ₹50 credit (5000 paise)', () => {
    const { claim, order } = makeLateClaim(35);
    const result = decide(claim, order, cleanHistory);
    expect(result.confidence).toBe('high');
    expect(result.outcome).toBe('late_credit');
    expect(result.total).toBe(5000);
    expect(result.destination).toBe('wallet');
    expect(result.ruleTrace.find((r) => r.ruleId === 'L-1')?.fired).toBe(true);
  });

  it('L-2: 45–60 min late → ₹75 credit (7500 paise)', () => {
    const { claim, order } = makeLateClaim(50);
    const result = decide(claim, order, cleanHistory);
    expect(result.total).toBe(7500);
    expect(result.ruleTrace.find((r) => r.ruleId === 'L-2')?.fired).toBe(true);
  });

  it('L-3: >60 min late → ₹100 credit (10000 paise)', () => {
    const { claim, order } = makeLateClaim(65);
    const result = decide(claim, order, cleanHistory);
    expect(result.total).toBe(10000);
    expect(result.ruleTrace.find((r) => r.ruleId === 'L-3')?.fired).toBe(true);
  });

  it('below 30 min late → no compensation', () => {
    const { claim, order } = makeLateClaim(25);
    const result = decide(claim, order, cleanHistory);
    expect(result.total).toBe(0);
  });

  it('exactly 31 min → L-1 tier', () => {
    const { claim, order } = makeLateClaim(31);
    const result = decide(claim, order, cleanHistory);
    expect(result.total).toBe(5000);
  });

  it('no delivery timestamp → low confidence human review', () => {
    const claim: Claim = { issueKind: 'late_delivery', evidence: [] };
    const order = { ...baseOrder, deliveredAt: undefined };
    const result = decide(claim, order, cleanHistory);
    expect(result.confidence).toBe('low');
    expect(result.outcome).toBe('human_review');
  });
});

// ─── Rule trace completeness ──────────────────────────────────────────────────

describe('rule trace', () => {
  it('always includes H-1 trace entry', () => {
    const claim: Claim = { issueKind: 'wrong_item', evidence: [] };
    const result = decide(claim, baseOrder, cleanHistory);
    expect(result.ruleTrace.find((r) => r.ruleId === 'H-1')).toBeDefined();
  });

  it('never silently ignores a fired rule', () => {
    const claim: Claim = {
      issueKind: 'wrong_item',
      evidence: [{ kind: 'photo', verdict: 'mismatch_verified' }],
    };
    const result = decide(claim, baseOrder, cleanHistory);
    const firedRules = result.ruleTrace.filter((r) => r.fired);
    expect(firedRules.length).toBeGreaterThan(0);
  });
});
