import { expect, type Page } from "@playwright/test";

export function stayParams(offsetDays: number, nights = 2) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const checkIn = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + nights);
  return { checkIn, checkOut: d.toISOString().slice(0, 10) };
}

export async function login(page: Page, email: string, next?: string) {
  await page.goto(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export const HOTEL = "abbey-chalet-coorg";

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}
