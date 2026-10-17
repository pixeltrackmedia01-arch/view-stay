import { expect, test } from "@playwright/test";

test("home, search and hotel map render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Choose your room/ })).toBeVisible();
  await page.goto("/search?city=Manali");
  await expect(page.getByTestId("hotel-card").first()).toContainText("Pinecrest Lodge");
  await page.getByTestId("hotel-card").first().click();
  await expect(page.getByRole("tab").first()).toBeVisible();
  await page.getByTestId("room-101").click();
  await expect(page.getByTestId("selected-room-title")).toHaveText("Room 101");
});

test("protected areas redirect to sign in", async ({ page }) => {
  await page.goto("/partner");
  await expect(page).toHaveURL(/\/login\?next=%2Fpartner/);
});
