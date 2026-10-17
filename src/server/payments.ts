import { randomBytes } from "node:crypto";

/**
 * Local dummy payment gateway. No real money moves.
 *  - 4000 0000 0000 0002 → declined
 *  - 4000 0000 0000 9995 → insufficient funds
 *  - any other Luhn-valid, unexpired card → success
 */
export interface ChargeRequest {
  amount: number;
  cardNumber: string;
  expiry: string; // MM/YY
  cvc: string;
}

export type ChargeResult =
  | { ok: true; reference: string; last4: string }
  | { ok: false; reference: string; last4: string; message: string };

export const TEST_CARDS = {
  success: "4242 4242 4242 4242",
  declined: "4000 0000 0000 0002",
  insufficientFunds: "4000 0000 0000 9995",
};

export function luhnValid(num: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return num.length >= 13 && sum % 10 === 0;
}

export function expiryValid(expiry: string, now: Date = new Date()): boolean {
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  // Card is valid through the end of its expiry month
  return Date.UTC(year, month, 1) > now.getTime();
}

export function charge(req: ChargeRequest, now: Date = new Date()): ChargeResult {
  const num = req.cardNumber.replace(/[\s-]/g, "");
  const reference = `pay_${randomBytes(8).toString("hex")}`;
  const last4 = num.slice(-4);
  const fail = (message: string): ChargeResult => ({ ok: false, reference, last4, message });

  if (!(req.amount > 0)) return fail("Invalid amount");
  if (!luhnValid(num)) return fail("Card number is invalid");
  if (!expiryValid(req.expiry, now)) return fail("Card has expired");
  if (!/^\d{3,4}$/.test(req.cvc)) return fail("Invalid security code");
  if (num === "4000000000000002") return fail("Your card was declined");
  if (num === "4000000000009995") return fail("Insufficient funds");
  return { ok: true, reference, last4 };
}
