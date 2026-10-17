import { describe, expect, it } from "vitest";
import { addDays, parseDateOnly, rangesOverlap, toDateOnlyString, todayUtc } from "@/lib/dates";
import { cardDetails, registerInput, stayInput } from "@/lib/validation";

const iso = (offset: number) => toDateOnlyString(addDays(todayUtc(), offset));

describe("dates", () => {
  it("parses strict YYYY-MM-DD and rejects rollovers", () => {
    expect(parseDateOnly("2026-02-28")?.toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(parseDateOnly("2026-02-31")).toBeNull();
    expect(parseDateOnly("28/02/2026")).toBeNull();
  });

  it("treats stays as half-open intervals so back-to-back stays do not overlap", () => {
    const a = parseDateOnly("2026-11-01")!;
    const b = parseDateOnly("2026-11-03")!;
    const c = parseDateOnly("2026-11-05")!;
    expect(rangesOverlap(a, b, b, c)).toBe(false);
    expect(rangesOverlap(a, c, b, c)).toBe(true);
  });
});

describe("validation", () => {
  it("accepts a valid future stay", () => {
    expect(stayInput.safeParse({ checkIn: iso(1), checkOut: iso(3), guests: "2" }).success).toBe(true);
  });
  it("rejects past check-in, inverted dates and over-long stays", () => {
    expect(stayInput.safeParse({ checkIn: iso(-1), checkOut: iso(2), guests: 2 }).success).toBe(false);
    expect(stayInput.safeParse({ checkIn: iso(3), checkOut: iso(3), guests: 2 }).success).toBe(false);
    expect(stayInput.safeParse({ checkIn: iso(1), checkOut: iso(40), guests: 2 }).success).toBe(false);
    expect(stayInput.safeParse({ checkIn: iso(1), checkOut: iso(2), guests: 0 }).success).toBe(false);
  });
  it("normalizes registration email and enforces password length", () => {
    const ok = registerInput.parse({ name: "Ann", email: " ANN@Example.com ", password: "longenough" });
    expect(ok.email).toBe("ann@example.com");
    expect(ok.accountType).toBe("CUSTOMER");
    expect(registerInput.safeParse({ name: "Ann", email: "a@b.co", password: "short" }).success).toBe(false);
  });
  it("strips spaces from card numbers", () => {
    expect(cardDetails.parse({ cardName: "A B", cardNumber: "4242 4242 4242 4242", expiry: "12/30", cvc: "123" }).cardNumber).toBe("4242424242424242");
  });
});
