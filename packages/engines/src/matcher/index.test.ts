import { describe, it, expect } from 'vitest';
import { find, type OrderForMatching, type RestaurantCandidate } from './index';
import type { Paise } from '@swiggy/types';

const baseOrder: OrderForMatching = {
  id: 'order-1',
  totalPaise: 50000 as Paise,  // ₹500
  cuisine: 'Indian',
  isVeg: false,
  customerLat: 12.9716,
  customerLng: 77.5946,
};

function makeRestaurant(overrides: Partial<RestaurantCandidate> = {}): RestaurantCandidate {
  return {
    id: 'rest-1',
    name: 'Test Restaurant',
    cuisine: 'Indian',
    isVegOnly: false,
    lat: 12.975,
    lng: 77.594,
    estimatedPrepMinutes: 15,
    estimatedTotalPaise: 50000 as Paise,
    load: 'low',
    topItems: [{ name: 'Dal Makhani', pricePaise: 20000 as Paise }],
    ...overrides,
  };
}

describe('Matcher.find', () => {
  describe('filtering rules', () => {
    it('returns matching restaurant when all rules pass', () => {
      const result = find(baseOrder, [makeRestaurant()]);
      expect(result).toHaveLength(1);
    });

    it('excludes overloaded restaurants', () => {
      const result = find(baseOrder, [makeRestaurant({ load: 'high' })]);
      expect(result).toHaveLength(0);
    });

    it('excludes restaurants beyond 5km', () => {
      // 12.9716, 77.5946 → 12.8, 77.4 is ~23km
      const result = find(baseOrder, [makeRestaurant({ lat: 12.8, lng: 77.4 })]);
      expect(result).toHaveLength(0);
    });

    it('excludes mismatched cuisine', () => {
      const result = find(baseOrder, [makeRestaurant({ cuisine: 'Chinese' })]);
      expect(result).toHaveLength(0);
    });

    it('excludes non-veg restaurant when original order was veg', () => {
      const vegOrder = { ...baseOrder, isVeg: true };
      const result = find(vegOrder, [makeRestaurant({ isVegOnly: false })]);
      expect(result).toHaveLength(0);
    });

    it('includes veg-only restaurant for veg order', () => {
      const vegOrder = { ...baseOrder, isVeg: true };
      const result = find(vegOrder, [makeRestaurant({ isVegOnly: true })]);
      expect(result).toHaveLength(1);
    });

    it('excludes restaurant outside price band (+20%)', () => {
      const tooExpensive = makeRestaurant({ estimatedTotalPaise: 65000 as Paise }); // +30%
      const result = find(baseOrder, [tooExpensive]);
      expect(result).toHaveLength(0);
    });

    it('excludes restaurant outside price band (-20%)', () => {
      const tooCheap = makeRestaurant({ estimatedTotalPaise: 35000 as Paise }); // -30%
      const result = find(baseOrder, [tooCheap]);
      expect(result).toHaveLength(0);
    });

    it('includes restaurant at exact +20% boundary', () => {
      const atBoundary = makeRestaurant({ estimatedTotalPaise: 60000 as Paise }); // exactly +20%
      const result = find(baseOrder, [atBoundary]);
      expect(result).toHaveLength(1);
    });
  });

  describe('ranking', () => {
    it('returns max 3 results', () => {
      const candidates = Array.from({ length: 5 }, (_, i) =>
        makeRestaurant({ id: `rest-${i}`, name: `Restaurant ${i}` }),
      );
      const result = find(baseOrder, candidates);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('sorts by matchScore descending', () => {
      const close = makeRestaurant({ id: 'close', lat: 12.972, lng: 77.595 }); // very close
      const far = makeRestaurant({ id: 'far', lat: 12.98, lng: 77.61 }); // further
      const result = find(baseOrder, [far, close]);
      expect(result[0]!.restaurant.id).toBe('close');
    });
  });

  describe('output values', () => {
    it('priceDiffPaise is positive when restaurant is more expensive', () => {
      const expensive = makeRestaurant({ estimatedTotalPaise: 55000 as Paise });
      const result = find(baseOrder, [expensive]);
      expect(result[0]!.priceDiffPaise).toBe(5000);
    });

    it('priceDiffPaise is negative when restaurant is cheaper', () => {
      const cheap = makeRestaurant({ estimatedTotalPaise: 45000 as Paise });
      const result = find(baseOrder, [cheap]);
      expect(result[0]!.priceDiffPaise).toBe(-5000);
    });

    it('estimatedDeliveryMinutes is a positive integer', () => {
      const result = find(baseOrder, [makeRestaurant()]);
      expect(result[0]!.estimatedDeliveryMinutes).toBeGreaterThan(0);
      expect(Number.isInteger(result[0]!.estimatedDeliveryMinutes)).toBe(true);
    });
  });

  describe('empty cases', () => {
    it('returns empty array when no candidates', () => {
      expect(find(baseOrder, [])).toHaveLength(0);
    });

    it('returns empty array when all candidates fail filters', () => {
      const bad = makeRestaurant({ cuisine: 'Italian', load: 'high' });
      expect(find(baseOrder, [bad])).toHaveLength(0);
    });
  });
});
