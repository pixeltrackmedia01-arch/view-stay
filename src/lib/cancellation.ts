import { addDays, formatDate, todayUtc } from "./dates";
import type { RatePlanKey } from "./pricing";

export type CancellationPolicyKey = "FLEXIBLE" | "MODERATE" | "STRICT";

export const POLICY_INFO: Record<CancellationPolicyKey, { label: string; freeDays: number | null; summary: string }> = {
  FLEXIBLE: { label: "Flexible", freeDays: 1, summary: "Free cancellation until the day before check-in." },
  MODERATE: { label: "Moderate", freeDays: 5, summary: "Free cancellation until 5 days before check-in." },
  STRICT: { label: "Strict", freeDays: null, summary: "Cancellations are not refunded." },
};

export interface CancellationTerms {
  refundable: boolean;
  /** Last date (inclusive) on which cancelling is free, if any. */
  freeUntil: Date | null;
  summary: string;
}

/** Terms for a booking or quote. Non-refundable rates never refund; otherwise the property's policy applies. */
export function cancellationTerms(policy: CancellationPolicyKey, ratePlan: RatePlanKey, checkIn: Date): Omit<CancellationTerms, "refundable"> & { refundableRate: boolean } {
  if (ratePlan === "NON_REFUNDABLE") return { refundableRate: false, freeUntil: null, summary: "Non-refundable rate: no refund if you cancel." };
  const days = POLICY_INFO[policy].freeDays;
  if (days === null) return { refundableRate: false, freeUntil: null, summary: POLICY_INFO.STRICT.summary };
  const freeUntil = addDays(checkIn, -days);
  return { refundableRate: true, freeUntil, summary: `Free cancellation until ${formatDate(freeUntil)}.` };
}

/** Whether cancelling right now earns a refund. */
export function refundOnCancel(policy: CancellationPolicyKey, ratePlan: RatePlanKey, checkIn: Date, now: Date = new Date()): boolean {
  const t = cancellationTerms(policy, ratePlan, checkIn);
  return t.refundableRate && !!t.freeUntil && todayUtc(now) <= t.freeUntil;
}
