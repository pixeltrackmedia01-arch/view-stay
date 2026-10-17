import { expect, test } from "@playwright/test";
import { HOTEL, login, stayParams } from "./helpers";

test("customer finds a property, chooses an exact room, pays, and sees the booking", async ({ page }) => {
  const { checkIn, checkOut } = stayParams(150 + Math.floor(Math.random() * 150));

  await page.goto("/");
  const search = page.getByRole("search", { name: "Search stays" }).first();
  await search.getByLabel("Destination").fill("Coorg");
  await search.getByLabel("Check-in").fill(checkIn);
  await search.getByLabel("Check-out").fill(checkOut);
  await search.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?.*destination=coorg/);
  await expect(page.getByTestId("hotel-card").first()).toBeVisible();

  await page.goto(`/hotels/${HOTEL}?checkIn=${checkIn}&checkOut=${checkOut}&guests=2&rooms=1#rooms`);
  await page.getByRole("radio", { name: "Room List" }).click();
  const firstAvailable = page.getByTestId("room-list").locator("li button").first();
  await firstAvailable.click();
  const detail = page.getByTestId("room-detail").first();
  const number = await detail.getAttribute("data-room-number");
  expect(number).toBeTruthy();
  await detail.getByTestId("choose-room").click();
  await page.getByTestId("reserve").click();

  // Anonymous: sign in and come back to the same room
  await page.waitForURL(/\/login/);
  await page.getByLabel("Email").fill("customer@viewstay.dev");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === `/hotels/${HOTEL}`);
  await expect(page.getByTestId("room-detail").first()).toHaveAttribute("data-room-number", number!);
  await expect(page.getByTestId("choose-room").first()).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("reserve").click();

  await page.waitForURL(/\/checkout\//);
  await expect(page.getByTestId("hold-timer")).toContainText(`Room ${number}`);
  await expect(page.getByTestId("checkout-room")).toHaveAttribute("data-room-number", number!);
  const flexTotal = await page.getByTestId("checkout-total").innerText();
  await page.getByLabel("Non-refundable").check();
  await expect(page.getByTestId("checkout-total")).not.toHaveText(flexTotal);

  await page.getByLabel("Phone").fill("+91 98765 43210");
  await page.getByLabel("Card number").fill("4000 0000 0000 0002");
  await page.getByLabel("Expiry (MM/YY)").fill("12/30");
  await page.getByLabel("CVC").fill("123");
  await page.getByTestId("pay-button").click();
  await expect(page.getByTestId("checkout-error")).toContainText("declined");

  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByTestId("pay-button").click();
  await page.waitForURL(/\/bookings\/VS-/);
  await expect(page.getByTestId("booking-confirmed")).toContainText(`room ${number}`);
  const code = new URL(page.url()).pathname.split("/").pop()!;

  await page.goto("/account/bookings");
  await expect(page.locator(`[data-testid=booking-card][data-code="${code}"]`)).toBeVisible();
});

test("protected pages redirect to sign-in and enforce roles", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
  await login(page, "customer@viewstay.dev");
  await page.goto("/admin");
  await expect(page).toHaveURL((u) => u.pathname === "/");
  const res = await page.request.patch("/api/admin/hotels/anything", { data: { featured: true } });
  expect(res.status()).toBe(403);
});
