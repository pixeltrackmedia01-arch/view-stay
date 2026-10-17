import { expect, test } from "@playwright/test";
import { HOTEL } from "./helpers";

test.describe("room explorer", () => {
  test("3D selection is shared with the floor plan, room list and URL", async ({ page }) => {
    await page.goto(`/hotels/${HOTEL}?view=3d#rooms`);
    const scene = page.getByTestId("hotel-3d");
    await scene.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (window as unknown as { __viewstay3d?: { ready: boolean } }).__viewstay3d?.ready, null, { timeout: 60_000 });

    // Switching floor visibly changes the scene (active level and cutaway mode)
    const floors = page.getByTestId("floor-selector").getByRole("radio");
    await floors.last().click();
    await expect(scene).toHaveAttribute("data-floor-mode", "cutaway");
    const level = await floors.last().getAttribute("data-level");
    await expect(scene).toHaveAttribute("data-active-level", level!);

    // Click a room in 3D using its stable id: pick the active-floor room projected nearest the canvas centre
    // (clear of the overlay controls) once the camera has settled.
    // Centre the scene so the sticky header and reserve bar don't cover it.
    await scene.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - window.innerHeight / 2, behavior: "instant" });
    });
    await page.waitForTimeout(1500);
    const { target, pt } = await page.evaluate(async () => {
      const slug = location.pathname.split("/")[2];
      const res = await fetch(`/api/hotels/${slug}/explorer?${new URLSearchParams({ checkIn: new Date(Date.now() + 864e5 * 30).toISOString().slice(0, 10), checkOut: new Date(Date.now() + 864e5 * 32).toISOString().slice(0, 10), guests: "2" })}`);
      const data = await res.json();
      const active = document.querySelector("[data-testid=hotel-3d]")!.getAttribute("data-active-level");
      const hook = (window as unknown as { __viewstay3d: { project: (id: string) => { x: number; y: number } | null } }).__viewstay3d;
      const r = document.querySelector("[data-testid=hotel-3d] canvas")!.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      let best: { room: { id: string; number: string }; x: number; y: number; d: number } | null = null;
      for (const room of data.rooms.filter((x: { level: number }) => String(x.level) === active)) {
        const q = hook.project(room.id);
        if (!q) continue;
        const d = Math.hypot(q.x - cx, q.y - cy);
        if (!best || d < best.d) best = { room, x: q.x + r.left, y: q.y + r.top, d };
      }
      return { target: best!.room, pt: { x: best!.x, y: best!.y } };
    });
    await page.mouse.click(pt!.x, pt!.y);
    await expect(scene).toHaveAttribute("data-selected-room", target.number);
    await expect(page.getByTestId("room-detail").first()).toHaveAttribute("data-room-number", target.number);
    await expect(page).toHaveURL(new RegExp(`room=${target.id}`));

    await page.getByRole("radio", { name: "2D Floor Plan" }).click();
    await expect(page.getByTestId("floor-plan")).toHaveAttribute("data-floor-level", level!);
    await expect(page.getByTestId("room-detail").first()).toHaveAttribute("data-room-number", target.number);

    await page.getByRole("radio", { name: "Room List" }).click();
    await expect(page.getByTestId("room-list").locator(`button[data-room-number="${target.number}"]`)).toHaveAttribute("aria-current", "true");
  });

  test("room photo gallery loads from the API with categories and keyboard navigation", async ({ page }) => {
    await page.goto(`/hotels/${HOTEL}?view=list#rooms`);
    await page.getByTestId("room-list").locator("li button").first().click();
    const detail = page.getByTestId("room-detail").first();
    const number = await detail.getAttribute("data-room-number");
    const apiCall = page.waitForResponse((r) => /\/api\/rooms\/[^/]+\/photos/.test(r.url()) && r.status() === 200);
    await detail.getByRole("button", { name: "Photos", exact: true }).click();
    await apiCall;
    const gallery = page.getByTestId("room-gallery");
    await expect(gallery).toHaveAttribute("data-room-number", number!);
    await expect(page.getByRole("tab", { name: /All/ })).toBeVisible();
    await expect(gallery.getByText(/Illustrative images represent/)).toBeVisible();
    const counter = gallery.getByTestId("gallery-counter");
    const before = await counter.innerText();
    await gallery.locator("[tabindex]").first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(counter).not.toHaveText(before);
  });

  test("compare up to three rooms", async ({ page }) => {
    await page.goto(`/hotels/${HOTEL}?view=list#rooms`);
    const items = page.getByTestId("room-list").locator("li button");
    for (const i of [0, 1]) {
      await items.nth(i).click();
      await page.getByTestId("room-detail").first().getByRole("button", { name: "Add to compare" }).click();
    }
    await page.getByTestId("compare-tray").getByRole("button", { name: /Compare 2 rooms/ }).click();
    await expect(page.getByTestId("compare-table").locator("thead th")).toHaveCount(3);
  });
});
