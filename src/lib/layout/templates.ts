/**
 * Procedural building templates. A template turns a few deterministic parameters into per-floor plans:
 * massing "wings", physical rooms (with window and balcony sides) and common areas.
 * The same stored plan drives the 2D floor map, the 3D explorer and room photo selection.
 */
import type { HotelTemplateKey, RoomCategoryKey, SideKey } from "@/lib/catalog-types";
import { rng, type Rng } from "@/lib/random";
import type { Rect } from "./geometry";

export type ElementKind = "CORRIDOR" | "ELEVATOR" | "STAIRS" | "LOBBY" | "SERVICE" | "COURTYARD" | "GARDEN" | "VERANDA";

/** Which way a room looks relative to the building, later resolved to a destination view. */
export type Outlook = "front" | "back" | "inner";

export interface RoomSpec extends Rect {
  number: string;
  windowSide: SideKey;
  secondaryWindowSide: SideKey | null;
  balconySide: SideKey | null;
  isCorner: boolean;
  nearElevator: boolean;
  category: RoomCategoryKey;
  outlook: Outlook;
}

export interface ElementSpec extends Rect {
  kind: ElementKind;
  label: string;
}

export interface FloorSpec {
  level: number;
  name: string;
  width: number;
  height: number;
  wings: Rect[];
  rooms: RoomSpec[];
  elements: ElementSpec[];
}

export interface BuildingSpec {
  template: HotelTemplateKey;
  floors: FloorSpec[];
}

/** Grid unit in metres, used for room sizes and 3D scale. */
export const GRID_METRES = 2.5;

/** Standard slot is 3x4 grid units. Room size scales the room type's base size by footprint. */
export function roomAreaSqm(r: Rect, baseSqm: number) {
  return Math.max(12, Math.round((baseSqm * (r.w * r.h)) / 12));
}

class FloorBuilder {
  rooms: RoomSpec[] = [];
  elements: ElementSpec[] = [];
  wings: Rect[] = [];
  private seq = 1;
  constructor(
    readonly level: number,
    readonly width: number,
    readonly height: number,
  ) {}

  room(r: Rect, o: Omit<RoomSpec, "number" | keyof Rect | "secondaryWindowSide" | "balconySide" | "isCorner" | "nearElevator"> & Partial<RoomSpec>) {
    this.rooms.push({
      number: `${this.level}${String(this.seq++).padStart(2, "0")}`,
      secondaryWindowSide: null,
      balconySide: null,
      isCorner: false,
      nearElevator: false,
      ...o,
      ...r,
    });
  }

  el(kind: ElementKind, label: string, r: Rect) {
    this.elements.push({ kind, label, ...r });
  }

  build(name?: string): FloorSpec {
    return {
      level: this.level,
      name: name ?? `Floor ${this.level}`,
      width: this.width,
      height: this.height,
      wings: this.wings,
      rooms: this.rooms,
      elements: this.elements,
    };
  }
}

function cityModern(r: Rng): FloorSpec[] {
  const n = r.int(4, 5);
  const floors = r.int(5, 8);
  const W = (n + 1) * 3;
  const H = 10;
  const mid = Math.floor((n + 1) / 2);
  const out: FloorSpec[] = [];
  for (let level = 1; level <= floors; level++) {
    const f = new FloorBuilder(level, W, H);
    const top = level === floors;
    f.wings.push({ x: 0, y: 0, w: W, h: H });
    f.el("ELEVATOR", "Lifts", { x: mid * 3, y: 0, w: 3, h: 4 });
    f.el("CORRIDOR", "Corridor", { x: 0, y: 4, w: W, h: 2 });
    f.el("STAIRS", "Stairs", { x: n * 3, y: 6, w: 3, h: 4 });
    // Front row (view side)
    let s = 0;
    while (s <= n) {
      if (s === mid) {
        s++;
        continue;
      }
      const isSuiteStart = top && (s === 0 || s === n - 1) && s + 1 !== mid && s + 1 <= n;
      const w = isSuiteStart ? 6 : 3;
      const last = s + w / 3 - 1;
      const corner = s === 0 || last === n;
      f.room({ x: s * 3, y: 0, w, h: 4 }, {
        windowSide: "TOP",
        secondaryWindowSide: corner ? (s === 0 ? "LEFT" : "RIGHT") : null,
        balconySide: isSuiteStart || (level >= floors - 1 && corner) ? "TOP" : null,
        isCorner: corner,
        nearElevator: Math.abs(s - mid) === 1 || Math.abs(last - mid) === 1,
        category: isSuiteStart ? "SUITE" : "DELUXE",
        outlook: "front",
      });
      s += w / 3;
    }
    // Back row
    for (let i = 0; i < n; i++) {
      const corner = i === 0;
      f.room({ x: i * 3, y: 6, w: 3, h: 4 }, {
        windowSide: "BOTTOM",
        secondaryWindowSide: corner ? "LEFT" : null,
        isCorner: corner,
        nearElevator: i === mid || i === n - 1,
        category: corner ? "DELUXE" : "STANDARD",
        outlook: "back",
      });
    }
    out.push(f.build());
  }
  return out;
}

function coastalResort(r: Rng): FloorSpec[] {
  const n = r.int(6, 8);
  const floors = r.int(2, 4);
  const W = n * 3;
  const H = 10;
  const mid = Math.floor(n / 2);
  const out: FloorSpec[] = [];
  for (let level = 1; level <= floors; level++) {
    const f = new FloorBuilder(level, W, H);
    const top = level === floors;
    f.wings.push({ x: 0, y: 0, w: W, h: H });
    f.el("CORRIDOR", "Open corridor", { x: 0, y: 4, w: W, h: 2 });
    f.el("ELEVATOR", "Lift", { x: mid * 3, y: 6, w: 3, h: 4 });
    f.el("STAIRS", "Stairs", { x: 0, y: 6, w: 3, h: 4 });
    let s = 0;
    while (s < n) {
      const suite = top && (s === 0 || s === n - 2);
      const w = suite ? 6 : 3;
      const last = s + w / 3 - 1;
      const corner = s === 0 || last === n - 1;
      f.room({ x: s * 3, y: 0, w, h: 4 }, {
        windowSide: "TOP",
        secondaryWindowSide: corner ? (s === 0 ? "LEFT" : "RIGHT") : null,
        balconySide: "TOP",
        isCorner: corner,
        nearElevator: s === mid || last === mid,
        category: suite ? "SUITE" : "DELUXE",
        outlook: "front",
      });
      s += w / 3;
    }
    for (let i = 1; i < n; i++) {
      if (i === mid) continue;
      const corner = i === n - 1;
      f.room({ x: i * 3, y: 6, w: 3, h: 4 }, {
        windowSide: "BOTTOM",
        secondaryWindowSide: corner ? "RIGHT" : null,
        isCorner: corner,
        nearElevator: Math.abs(i - mid) === 1,
        category: "STANDARD",
        outlook: "back",
      });
    }
    out.push(f.build());
  }
  return out;
}

function mountainLodge(r: Rng): FloorSpec[] {
  const n = r.int(4, 6);
  const floors = r.int(2, 4);
  const W = n * 3;
  const out: FloorSpec[] = [];
  for (let level = 1; level <= floors; level++) {
    const ground = level === 1;
    const top = level === floors;
    const H = 10;
    const f = new FloorBuilder(level, W, H);
    // Upper floors step back from the slope: they only keep the view-facing row.
    f.wings.push({ x: 0, y: 0, w: W, h: ground ? 10 : 6 });
    f.el("STAIRS", "Stairs", { x: 0, y: 4, w: 3, h: 2 });
    f.el("CORRIDOR", "Corridor", { x: 3, y: 4, w: W - 3, h: 2 });
    for (let i = 0; i < n; i++) {
      const corner = i === 0 || i === n - 1;
      f.room({ x: i * 3, y: 0, w: 3, h: 4 }, {
        windowSide: "TOP",
        secondaryWindowSide: corner ? (i === 0 ? "LEFT" : "RIGHT") : null,
        balconySide: "TOP",
        isCorner: corner,
        nearElevator: i === 0,
        category: top && corner ? "SUITE" : "DELUXE",
        outlook: "front",
      });
    }
    if (ground) {
      for (let i = 0; i < n; i++) {
        const corner = i === 0 || i === n - 1;
        f.room({ x: i * 3, y: 6, w: 3, h: 4 }, {
          windowSide: "BOTTOM",
          secondaryWindowSide: corner ? (i === 0 ? "LEFT" : "RIGHT") : null,
          isCorner: corner,
          nearElevator: i === 0,
          category: "STANDARD",
          outlook: "back",
        });
      }
    }
    out.push(f.build(ground ? "Ground floor" : `Floor ${level}`));
  }
  return out;
}

function heritageBoutique(r: Rng): FloorSpec[] {
  const W = r.pick([15, 18]);
  const H = r.pick([14, 17]);
  const floors = r.int(2, 3);
  const cols = W / 3;
  const out: FloorSpec[] = [];
  for (let level = 1; level <= floors; level++) {
    const f = new FloorBuilder(level, W, H);
    const top = level === floors;
    f.wings.push({ x: 0, y: 0, w: W, h: 6 }, { x: 0, y: H - 6, w: W, h: 6 }, { x: 0, y: 6, w: 6, h: H - 12 }, { x: W - 6, y: 6, w: 6, h: H - 12 });
    f.el("CORRIDOR", "Gallery", { x: 4, y: 4, w: W - 8, h: 2 });
    f.el("CORRIDOR", "Gallery", { x: 4, y: H - 6, w: W - 8, h: 2 });
    f.el("CORRIDOR", "Gallery", { x: 4, y: 6, w: 2, h: H - 12 });
    f.el("CORRIDOR", "Gallery", { x: W - 6, y: 6, w: 2, h: H - 12 });
    if (level === 1) f.el("COURTYARD", "Courtyard", { x: 6, y: 6, w: W - 12, h: H - 12 });
    // Front row: lake/city facing, with jharokha balconies above the ground floor.
    for (let i = 0; i < cols; i++) {
      const corner = i === 0 || i === cols - 1;
      f.room({ x: i * 3, y: 0, w: 3, h: 4 }, {
        windowSide: "TOP",
        secondaryWindowSide: corner ? (i === 0 ? "LEFT" : "RIGHT") : null,
        balconySide: level >= 2 ? "TOP" : null,
        isCorner: corner,
        nearElevator: false,
        category: top && corner ? "SUITE" : "DELUXE",
        outlook: "front",
      });
    }
    // Side columns open onto the courtyard gallery.
    const sideRooms = (H - 8) / 3;
    for (let j = 0; j < sideRooms; j++) {
      const y = 4 + j * 3;
      if (j === 0) f.el("STAIRS", "Stairs", { x: 0, y, w: 4, h: 3 });
      else f.room({ x: 0, y, w: 4, h: 3 }, { windowSide: "RIGHT", category: "STANDARD", outlook: "inner", nearElevator: j === 1 });
      f.room({ x: W - 4, y, w: 4, h: 3 }, { windowSide: "LEFT", category: "STANDARD", outlook: "inner" });
    }
    // Rear row, with the gateway on the ground floor.
    const gate = Math.floor(cols / 2);
    for (let i = 0; i < cols; i++) {
      if (level === 1 && i === gate) {
        f.el("LOBBY", "Gateway & reception", { x: i * 3, y: H - 4, w: 3, h: 4 });
        continue;
      }
      const corner = i === 0 || i === cols - 1;
      f.room({ x: i * 3, y: H - 4, w: 3, h: 4 }, {
        windowSide: "BOTTOM",
        secondaryWindowSide: corner ? (i === 0 ? "LEFT" : "RIGHT") : null,
        isCorner: corner,
        category: corner ? "DELUXE" : "STANDARD",
        outlook: "back",
      });
    }
    out.push(f.build(level === 1 ? "Ground floor" : `Floor ${level}`));
  }
  return out;
}

function gardenRetreat(r: Rng): FloorSpec[] {
  const n = r.int(5, 7);
  const k = r.int(2, 3);
  const floors = r.int(1, 2);
  const W = n * 3;
  const H = 10 + 3 * k;
  const out: FloorSpec[] = [];
  for (let level = 1; level <= floors; level++) {
    const ground = level === 1;
    const top = level === floors;
    const f = new FloorBuilder(level, W, H);
    f.wings.push({ x: 0, y: 0, w: W, h: 10 });
    f.el("STAIRS", "Stairs", { x: 0, y: 4, w: 3, h: 2 });
    f.el("CORRIDOR", "Corridor", { x: 3, y: 4, w: W - 3, h: 2 });
    for (let i = 0; i < n; i++) {
      const corner = i === 0 || i === n - 1;
      f.room({ x: i * 3, y: 0, w: 3, h: 4 }, {
        windowSide: "TOP",
        secondaryWindowSide: corner ? (i === 0 ? "LEFT" : "RIGHT") : null,
        balconySide: "TOP",
        isCorner: corner,
        nearElevator: i === 0,
        category: top && corner ? "SUITE" : "DELUXE",
        outlook: "front",
      });
    }
    for (let i = 0; i < n; i++) {
      f.room({ x: i * 3, y: 6, w: 3, h: 4 }, {
        windowSide: "BOTTOM",
        balconySide: ground ? null : "BOTTOM",
        category: "STANDARD",
        outlook: "inner",
        nearElevator: i === 0,
      });
    }
    if (ground) {
      // Garden pavilions on either side of the lawn, linked by verandas.
      f.wings.push({ x: 0, y: 10, w: 6, h: 3 * k }, { x: W - 6, y: 10, w: 6, h: 3 * k });
      f.el("VERANDA", "Veranda", { x: 4, y: 10, w: 2, h: 3 * k });
      f.el("VERANDA", "Veranda", { x: W - 6, y: 10, w: 2, h: 3 * k });
      f.el("GARDEN", "Private lawn", { x: 6, y: 10, w: W - 12, h: 3 * k });
      for (const side of ["LEFT", "RIGHT"] as const) {
        for (let j = 0; j < k; j++) {
          const end = j === k - 1;
          f.room({ x: side === "LEFT" ? 0 : W - 4, y: 10 + j * 3, w: 4, h: 3 }, {
            windowSide: side === "LEFT" ? "RIGHT" : "LEFT",
            secondaryWindowSide: end ? "BOTTOM" : null,
            isCorner: end,
            category: end ? "DELUXE" : "STANDARD",
            outlook: "inner",
          });
        }
      }
    }
    out.push(f.build(ground ? "Ground floor" : `Floor ${level}`));
  }
  return out;
}

const BUILDERS: Record<HotelTemplateKey, (r: Rng) => FloorSpec[]> = {
  CITY_MODERN: cityModern,
  COASTAL_RESORT: coastalResort,
  MOUNTAIN_LODGE: mountainLodge,
  HERITAGE_BOUTIQUE: heritageBoutique,
  GARDEN_RETREAT: gardenRetreat,
};

export function generateBuilding(template: HotelTemplateKey, seed: string): BuildingSpec {
  return { template, floors: BUILDERS[template](rng(`layout:${seed}`)) };
}
