import type { Paise } from '@swiggy/types';

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface OrderForMatching {
  id: string;
  totalPaise: Paise;
  cuisine: string;
  isVeg: boolean;
  customerLat: number;
  customerLng: number;
}

export interface RestaurantCandidate {
  id: string;
  name: string;
  cuisine: string;
  isVegOnly: boolean;
  lat: number;
  lng: number;
  /** Estimated prep time in minutes */
  estimatedPrepMinutes: number;
  /** Rough order total in paise for comparable order */
  estimatedTotalPaise: Paise;
  /** Current load — 'low' | 'medium' | 'high' */
  load: 'low' | 'medium' | 'high';
  /** Top 2 items for display */
  topItems: Array<{ name: string; pricePaise: Paise }>;
}

export interface ReplacementOption {
  restaurant: RestaurantCandidate;
  /** Price difference in paise (positive = more expensive, negative = cheaper) */
  priceDiffPaise: Paise;
  /** Estimated delivery time in minutes */
  estimatedDeliveryMinutes: number;
  /** Match score 0–100 — higher is better */
  matchScore: number;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const PRICE_BAND_FRACTION = 0.20; // ±20%
const MAX_DISTANCE_KM = 5;
const OVERLOADED_LOAD: RestaurantCandidate['load'] = 'high';
const ASSUMED_RIDER_SPEED_KM_PER_MIN = 0.4; // ~24 km/h

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cuisineMatch(a: string, b: string): boolean {
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Matcher.find — pure, deterministic, no side effects.
 *
 * Finds replacement options for a Rescue case.
 * Rules: cuisine match, price band ±20%, veg preservation, distance ≤5km, not overloaded.
 * Results sorted by matchScore descending; returns max 3.
 */
export function find(order: OrderForMatching, candidates: RestaurantCandidate[]): ReplacementOption[] {
  const priceLow = order.totalPaise * (1 - PRICE_BAND_FRACTION);
  const priceHigh = order.totalPaise * (1 + PRICE_BAND_FRACTION);

  const options: ReplacementOption[] = [];

  for (const candidate of candidates) {
    // Must not be overloaded
    if (candidate.load === OVERLOADED_LOAD) continue;

    // Distance must be within limit
    const distanceKm = haversineKm(order.customerLat, order.customerLng, candidate.lat, candidate.lng);
    if (distanceKm > MAX_DISTANCE_KM) continue;

    // Cuisine must match
    if (!cuisineMatch(order.cuisine, candidate.cuisine)) continue;

    // Veg preservation: if original was veg, replacement must be veg-only
    if (order.isVeg && !candidate.isVegOnly) continue;

    // Price band ±20%
    if (candidate.estimatedTotalPaise < priceLow || candidate.estimatedTotalPaise > priceHigh) continue;

    // Passed all filters — compute score
    const priceDiffPaise = (candidate.estimatedTotalPaise - order.totalPaise) as Paise;
    const estimatedDeliveryMinutes = Math.ceil(
      distanceKm / ASSUMED_RIDER_SPEED_KM_PER_MIN + candidate.estimatedPrepMinutes,
    );

    // Score: lower price diff = better; shorter distance = better; lower load = better
    const pricePenalty = Math.abs(priceDiffPaise) / order.totalPaise; // 0–0.2
    const distancePenalty = distanceKm / MAX_DISTANCE_KM; // 0–1
    const loadBonus = candidate.load === 'low' ? 0.1 : 0;
    const matchScore = Math.round(Math.max(0, (1 - pricePenalty * 0.5 - distancePenalty * 0.4 + loadBonus) * 100));

    options.push({ restaurant: candidate, priceDiffPaise, estimatedDeliveryMinutes, matchScore });
  }

  // Sort by match score descending, return top 3
  return options.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
}
