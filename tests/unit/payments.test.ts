import { describe, expect, it } from "vitest";
import { charge, expiryValid, luhnValid } from "@/server/payments";

const now = new Date("2026-10-17T00:00:00Z");
const base = { amount: 1000, expiry: "12/30", cvc: "123" };

describe("dummy payment gateway", () => {
  it("validates Luhn checksums", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
  });
  it("treats cards as valid through their expiry month", () => {
    expect(expiryValid("10/26", now)).toBe(true);
    expect(expiryValid("09/26", now)).toBe(false);
  });
  it("succeeds for the success test card", () => {
    const r = charge({ ...base, cardNumber: "4242 4242 4242 4242" }, now);
    expect(r.ok).toBe(true);
    expect(r.last4).toBe("4242");
  });
  it("declines the decline and insufficient-funds cards", () => {
    expect(charge({ ...base, cardNumber: "4000000000000002" }, now)).toMatchObject({ ok: false, message: "Your card was declined" });
    expect(charge({ ...base, cardNumber: "4000000000009995" }, now)).toMatchObject({ ok: false, message: "Insufficient funds" });
  });
  it("rejects expired cards", () => {
    expect(charge({ ...base, cardNumber: "4242424242424242", expiry: "01/20" }, now)).toMatchObject({ ok: false });
  });
});
