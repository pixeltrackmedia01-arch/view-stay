/** Platform-level business configuration (demo values; change per deployment). */
export const COMMISSION_RATE = 0.15;
export const MAX_ROOMS_PER_BOOKING = 4;
export const CURRENCY = "INR";

export function holdMinutes() {
  const n = Number(process.env.HOLD_MINUTES ?? 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}
