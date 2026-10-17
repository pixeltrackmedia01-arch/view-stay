import { describe, expect, it } from "vitest";
import { isWeekendNight, quoteStay, roomNightlyRate } from "@/lib/pricing";
import { parseDateOnly } from "@/lib/dates";

const d = (s: string) => parseDateOnly(s)!;

describe("pricing", () => {
  it("adds per-room adjustments and never goes negative", () => {
    expect(roomNightlyRate(500000, 25000)).toBe(525000);
    expect(roomNightlyRate(1000, -5000)).toBe(0);
  });

  it("flags Friday and Saturday nights as weekend", () => {
    expect(isWeekendNight(d("2026-10-16"))).toBe(true); // Friday
    expect(isWeekendNight(d("2026-10-17"))).toBe(true); // Saturday
    expect(isWeekendNight(d("2026-10-18"))).toBe(false); // Sunday
  });

  it("quotes a stay with weekend premium and taxes", () => {
    // Thu, Fri, Sat nights
    const q = quoteStay(10000, d("2026-10-15"), d("2026-10-18"));
    expect(q.nights.map((n) => n.amount)).toEqual([10000, 11500, 11500]);
    expect(q.subtotal).toBe(33000);
    expect(q.taxes).toBe(4000); // 12% of ₹330 = ₹39.60, rounded to whole rupees
    expect(q.total).toBe(q.subtotal + q.taxes);
  });

  it("rejects zero-night stays", () => {
    expect(() => quoteStay(10000, d("2026-10-15"), d("2026-10-15"))).toThrow();
  });
});

describe("rate plans and cancellation", () => {
  it("discounts the non-refundable rate by 10% before tax", () => {
    const flex = quoteStay(500000, d("2026-11-10"), d("2026-11-12"), "FLEXIBLE");
    const nr = quoteStay(500000, d("2026-11-10"), d("2026-11-12"), "NON_REFUNDABLE");
    expect(flex.discount).toBe(0);
    expect(nr.discount).toBe(100000);
    expect(nr.taxes).toBe(Math.round(((nr.subtotal - nr.discount) * 0.12) / 100) * 100);
    expect(nr.total).toBeLessThan(flex.total);
  });

  it("applies the property policy only to refundable rates", async () => {
    const { refundOnCancel } = await import("@/lib/cancellation");
    const checkIn = d("2026-11-20");
    expect(refundOnCancel("FLEXIBLE", "FLEXIBLE", checkIn, d("2026-11-18"))).toBe(true);
    expect(refundOnCancel("MODERATE", "FLEXIBLE", checkIn, d("2026-11-18"))).toBe(false);
    expect(refundOnCancel("MODERATE", "FLEXIBLE", checkIn, d("2026-11-10"))).toBe(true);
    expect(refundOnCancel("FLEXIBLE", "NON_REFUNDABLE", checkIn, d("2026-11-01"))).toBe(false);
    expect(refundOnCancel("STRICT", "FLEXIBLE", checkIn, d("2026-11-01"))).toBe(false);
  });
});
