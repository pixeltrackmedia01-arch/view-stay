import { expect, test, type Page } from "@playwright/test";

function stayParams(offsetDays: number, nights = 2) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const checkIn = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + nights);
  return { checkIn, checkOut: d.toISOString().slice(0, 10) };
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("customer books an exact room, sees it everywhere, and rebooks it", async ({ page, browser }) => {
  // Random far-future window keeps reruns independent
  const { checkIn, checkOut } = stayParams(120 + Math.floor(Math.random() * 200));

  // 1. Search (anonymous)
  await page.goto("/");
  await page.getByLabel("Destination").fill("Goa");
  await page.getByLabel("Check-in").fill(checkIn);
  await page.getByLabel("Check-out").fill(checkOut);
  await page.getByLabel("Guests").fill("2");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search\?/);
  await page.getByTestId("hotel-card").filter({ hasText: "Azure Bay Resort" }).click();

  // 2. Room map → pick an exact room on floor 4
  await expect(page.getByRole("heading", { name: "Azure Bay Resort" })).toBeVisible();
  await page.getByRole("tab", { name: /Floor 4/ }).click();
  const room = page.getByTestId("room-403");
  await expect(room).toHaveAttribute("data-status", "AVAILABLE");
  await room.click();
  await expect(page.getByTestId("selected-room-title")).toHaveText("Room 403");
  await page.getByTestId("reserve-room").click();

  // 3. Not signed in → login, return to the same room
  await page.waitForURL(/\/login/);
  await page.getByLabel("Email").fill("customer@viewstay.dev");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/hotels\/azure-bay-resort-goa/);
  await expect(page.getByTestId("selected-room-title")).toHaveText("Room 403");
  await page.getByTestId("reserve-room").click();

  // 4. Checkout with hold timer
  await page.waitForURL(/\/checkout\//);
  await expect(page.getByTestId("checkout-room")).toHaveText("Room 403");
  await expect(page.getByTestId("hold-timer")).toContainText("Room held for you");

  // While held, another customer sees it as being booked
  const other = await browser.newPage();
  await login(other, "guest@viewstay.dev");
  await other.goto(`/hotels/azure-bay-resort-goa?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`);
  await other.getByRole("tab", { name: /Floor 4/ }).click();
  await expect(other.getByTestId("room-403")).toHaveAttribute("data-status", "HELD");

  // 5. Declined card keeps the hold, then a good card confirms
  await page.getByLabel("Card number").fill("4000 0000 0000 0002");
  await page.getByLabel("Expiry (MM/YY)").fill("12/30");
  await page.getByLabel("CVC").fill("123");
  await page.getByTestId("pay-button").click();
  await expect(page.getByTestId("checkout-error")).toContainText("declined");
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByTestId("pay-button").click();

  // 6. Confirmation
  await page.waitForURL(/\/bookings\/VS-/);
  await expect(page.getByRole("heading", { name: "Booking confirmed!" })).toBeVisible();
  const code = (await page.getByTestId("booking-code").textContent())!.trim();

  // The other customer now sees it as booked
  await other.reload();
  await other.getByRole("tab", { name: /Floor 4/ }).click();
  await expect(other.getByTestId("room-403")).toHaveAttribute("data-status", "BOOKED");
  await other.close();

  // 7. My bookings
  await page.goto("/account");
  const row = page.getByTestId("booking-row").filter({ hasText: code });
  await expect(row).toContainText("Room 403");

  // 8. Partner sees it
  const partner = await browser.newPage();
  await login(partner, "partner@viewstay.dev");
  await partner.goto("/partner/bookings");
  await expect(partner.getByTestId("booking-table-row").filter({ hasText: code })).toContainText("403");
  await partner.close();

  // 9. Admin sees it
  const admin = await browser.newPage();
  await login(admin, "admin@viewstay.dev");
  await admin.goto(`/admin/bookings?q=${code}`);
  await expect(admin.getByTestId("booking-table-row")).toHaveCount(1);
  await admin.close();

  // 10. Rebook the same room → map opens with room 403 preselected
  await row.getByTestId(`rebook-${code}`).click();
  await page.waitForURL(/room=/);
  await expect(page.getByTestId("selected-room-title")).toHaveText("Room 403");
});
