/**
 * format.ts — ₹ formatting utility.
 * CONSTRAINTS §3.10, DECISIONS D9: format paise to ₹ ONLY here.
 * Never do this calculation in components, engines, or API handlers.
 */

/**
 * Format integer paise as a ₹ display string.
 * @example formatRupees(22000) → "₹220"
 * @example formatRupees(22050) → "₹220.50"
 */
export function formatRupees(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error(`formatRupees: paise must be an integer, got ${paise}`);
  }
  const rupees = paise / 100;
  if (rupees % 1 === 0) {
    return `₹${rupees.toLocaleString('en-IN')}`;
  }
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a paise amount with destination label.
 * Design.md §1: "₹220 to UPI ·· 4242" not "refund initiated"
 */
export function formatWithDestination(paise: number, destination: 'source' | 'wallet', upiMasked?: string): string {
  const amount = formatRupees(paise);
  if (destination === 'wallet') return `${amount} to Swiggy wallet`;
  if (upiMasked) return `${amount} to ${upiMasked}`;
  return `${amount} to source account`;
}

/**
 * Format an absolute time for display.
 * Design.md §5 copy rules: always absolute times ("by 10:05 PM", never "soon").
 */
export function formatEta(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Format a price diff for replacement option display. */
export function formatPriceDiff(paise: number): string {
  if (paise === 0) return 'Same price';
  const sign = paise > 0 ? '+' : '−';
  return `${sign}${formatRupees(Math.abs(paise))}`;
}
