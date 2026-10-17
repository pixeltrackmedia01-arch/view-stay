import { describe, expect, it } from "vitest";
import { HOTEL_TEMPLATES } from "@/lib/catalog-types";
import { contains, overlaps, type Rect } from "@/lib/layout/geometry";
import { generateBuilding } from "@/lib/layout/templates";

/** Every grid cell of r lies in at least one wing. */
const insideWings = (wings: Rect[], r: Rect) => {
  for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) if (!wings.some((w) => contains(w, { x, y, w: 1, h: 1 }))) return false;
  return true;
};

describe("procedural building templates", () => {
  for (const template of HOTEL_TEMPLATES) {
    it(`${template}: rooms are inside wings, never overlap and are uniquely numbered`, () => {
      for (let seed = 0; seed < 60; seed++) {
        const b = generateBuilding(template, `seed-${seed}`);
        expect(b.floors.length).toBeGreaterThan(0);
        const numbers = new Set<string>();
        for (const f of b.floors) {
          const solids = [...f.rooms, ...f.elements.filter((e) => e.kind !== "COURTYARD" && e.kind !== "GARDEN")];
          for (let i = 0; i < solids.length; i++)
            for (let j = i + 1; j < solids.length; j++) expect(overlaps(solids[i], solids[j]), `${template} floor ${f.level}: ${JSON.stringify(solids[i])} vs ${JSON.stringify(solids[j])}`).toBe(false);
          for (const r of f.rooms) {
            expect(insideWings(f.wings, r), `room ${r.number} outside wings`).toBe(true);
            expect(r.x + r.w).toBeLessThanOrEqual(f.width);
            expect(r.y + r.h).toBeLessThanOrEqual(f.height);
            expect(numbers.has(r.number)).toBe(false);
            numbers.add(r.number);
          }
        }
        expect(numbers.size).toBeGreaterThan(4);
      }
    });
  }

  it("is deterministic for the same seed", () => {
    expect(generateBuilding("CITY_MODERN", "abc")).toEqual(generateBuilding("CITY_MODERN", "abc"));
  });
});
