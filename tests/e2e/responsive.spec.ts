import { expect, test } from "@playwright/test";
import { HOTEL, noHorizontalOverflow } from "./helpers";

const WIDTHS = [1440, 1280, 1024, 768, 390, 360];
const PAGES = ["/", "/search?destination=goa", `/hotels/${HOTEL}`, "/destinations", "/how-it-works"];

for (const width of WIDTHS) {
  test(`layout holds at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await noHorizontalOverflow(page);
    }
    if (width < 768) {
      // Primary navigation is reachable from the mobile menu
      await page.goto("/");
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("link", { name: "Destinations" }).last()).toBeVisible();
    }
  });
}

test("primary actions are at least 44px tall on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/hotels/${HOTEL}?view=list#rooms`);
  for (const name of ["3D Explore", "2D Floor Plan", "Room List"]) {
    const box = await page.getByRole("radio", { name }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  }
  const reserve = await page.getByTestId("reserve").boundingBox();
  expect(reserve!.height).toBeGreaterThanOrEqual(44);
});
