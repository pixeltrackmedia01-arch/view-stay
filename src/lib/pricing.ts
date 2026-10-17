import { addDays, nightsBetween, toDateOnlyString } from "./dates";

export const TAX_RATE = 0.12;
export const WEEKEND_MULTIPLIER = 1.15;
export const NON_REFUNDABLE_DISCOUNT = 0.1;

export type RatePlanKey = "FLEXIBLE" | "NON_REFUNDABLE";

export const RATE_PLANS: Record<RatePlanKey, { label: string; summary: string }> = {
  FLEXIBLE: { label: "Flexible rate", summary: "Cancel for a full refund within the property's free-cancellation window." },
  NON_REFUNDABLE: { label: "Non-refundable rate", summary: `Save ${NON_REFUNDABLE_DISCOUNT * 100}% on the room price. No refund if you cancel.` },
};

/** Round minor units to whole rupees. */
const toRupee = (minor: number) => Math.round(minor / 100) * 100;

export interface NightPrice {
  date: string;
  amount: number;
  weekend: boolean;
}

export interface PriceQuote {
  ratePlan: RatePlanKey;
  nightlyBase: number;
  nights: NightPrice[];
  subtotal: number;
  discount: number;
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

export function quoteStay(nightlyBase: number, checkIn: Date, checkOut: Date, ratePlan: RatePlanKey = "FLEXIBLE"): PriceQuote {
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
  const discount = ratePlan === "NON_REFUNDABLE" ? toRupee(subtotal * NON_REFUNDABLE_DISCOUNT) : 0;
  const taxes = toRupee((subtotal - discount) * TAX_RATE);
  return { ratePlan, nightlyBase, nights, subtotal, discount, taxes, total: subtotal - discount + taxes };
}
