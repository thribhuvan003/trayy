/** Final amount the student actually pays = menu total + uniqueness tag. */
export function finalAmountPaise(totalPaise: number, verifyPaise: number | null): number {
  return totalPaise + (verifyPaise ?? 0);
}

/**
 * Pick a 1..999 paise tag so that `basePaise + tag` is unique among the
 * tenant's currently-pending final amounts. Returns 0 if every slot for
 * this base is taken — caller falls back to manual matching.
 *
 * Range: 1–999 (max ₹9.99 added to any order total).
 * Handles 999 concurrent orders at the same base price before exhaustion.
 * At VIT/IITB with 500 concurrent students, worst case is ~200 orders at
 * the same price — well within the 999-slot budget.
 *
 * Randomised start prevents concurrent requests from probing in lockstep:
 * two simultaneous placeOrder calls racing would both start at slot 1
 * and collide — random start distributes them across the full range.
 *
 * @param basePaise         The order's menu total in paise
 * @param takenFinalAmounts Final amounts (total+tag) of all pending orders for this tenant
 */
export function pickVerifyPaise(basePaise: number, takenFinalAmounts: number[]): number {
  const taken = new Set(takenFinalAmounts);
  const RANGE = 999;
  const start = 1 + Math.floor(Math.random() * RANGE);
  for (let i = 0; i < RANGE; i++) {
    const tag = ((start - 1 + i) % RANGE) + 1; // 1..999
    if (!taken.has(basePaise + tag)) return tag;
  }
  return 0; // all 999 slots exhausted — caller routes to manual matching
}
