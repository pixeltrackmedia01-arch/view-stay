const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a YYYY-MM-DD string into a UTC-midnight Date. Returns null if invalid. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Reject rollovers such as 2026-02-31
  return toDateOnlyString(d) === value ? d : null;
}

export function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

/** Today's date (UTC) at midnight. */
export function todayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Half-open interval overlap: [aStart, aEnd) intersects [bStart, bEnd). */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const MAX_STAY_NIGHTS = 30;
export const MAX_ADVANCE_DAYS = 365;

/** Default search dates: tomorrow → day after. */
export function defaultStay(now: Date = new Date()) {
  const checkIn = addDays(todayUtc(now), 1);
  return { checkIn: toDateOnlyString(checkIn), checkOut: toDateOnlyString(addDays(checkIn, 2)) };
}
