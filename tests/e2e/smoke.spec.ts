import { expect, test } from "@playwright/test";
import { HOTEL, noHorizontalOverflow } from "./helpers";

test("home, search and property pages render with real data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your stay. Your room. Your view.");
  await noHorizontalOverflow(page);
  await page.goto("/search?destination=manali");
  await expect(page.getByTestId("hotel-card").first()).toBeVisible();
  await page.getByTestId("hotel-card").first().getByRole("link").first().click();
  await expect(page.getByTestId("hotel-gallery")).toBeVisible();
  await expect(page.getByTestId("room-explorer")).toBeVisible();
});

test("unknown pages show a friendly not-found page", async ({ page }) => {
  await page.goto("/hotels/does-not-exist");
  await expect(page.getByText("We couldn't find that page")).toBeVisible();
  await page.goto(`/hotels/${HOTEL}`);
  await expect(page.getByText("Illustrative").first()).toBeVisible();
});

test("protected areas redirect to sign in", async ({ page }) => {
  await page.goto("/partner");
  await expect(page).toHaveURL(/\/login\?next=%2Fpartner/);
});
