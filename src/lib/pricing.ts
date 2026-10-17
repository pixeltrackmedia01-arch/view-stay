import { addDays, nightsBetween, toDateOnlyString } from "./dates";

export const TAX_RATE = 0.12;
export const WEEKEND_MULTIPLIER = 1.15;

/** Round minor units to whole rupees. */
const toRupee = (minor: number) => Math.round(minor / 100) * 100;

export interface NightPrice {
  date: string;
  amount: number;
  weekend: boolean;
}

export interface PriceQuote {
  nightlyBase: number;
  nights: NightPrice[];
  subtotal: number;
  taxes: number;
  total: number;
}

/** Base nightly rate of a physical room in minor units. */
export function roomNightlyRate(basePrice: number, priceAdjustment: number): number {
  return Math.max(0, basePrice + priceAdjustment);
}

/** Friday and Saturday nights carry a weekend premium. */
export function isWeekendNight(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 5 || day === 6;
}

export function quoteStay(nightlyBase: number, checkIn: Date, checkOut: Date): PriceQuote {
  const count = nightsBetween(checkIn, checkOut);
  if (count <= 0) throw new Error("checkOut must be after checkIn");
  const nights: NightPrice[] = [];
  for (let i = 0; i < count; i++) {
    const date = addDays(checkIn, i);
    const weekend = isWeekendNight(date);
    nights.push({
      date: toDateOnlyString(date),
      amount: weekend ? toRupee(nightlyBase * WEEKEND_MULTIPLIER) : nightlyBase,
      weekend,
    });
  }
  const subtotal = nights.reduce((s, n) => s + n.amount, 0);
  const taxes = toRupee(subtotal * TAX_RATE);
  return { nightlyBase, nights, subtotal, taxes, total: subtotal + taxes };
}
