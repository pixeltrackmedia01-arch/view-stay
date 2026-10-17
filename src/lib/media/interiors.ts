/** Illustrative interior painters (one-point perspective). Windows embed the room's landscape scene. */
import type { InteriorStyle, RoomCategoryKey, SceneKey } from "@/lib/catalog-types";
import { rng, type Rng } from "@/lib/random";
import { paintScene, type Tod } from "./scenes";
import { H, W, Svg, circle, darken, ellipse, f, frame, g, lighten, line, mix, path, poly, rect } from "./svg";

export interface StylePalette {
  wall: string;
  wallAlt: string;
  floor: string;
  ceiling: string;
  accent: string;
  textile: string;
  wood: string;
  metal: string;
  rug: string;
}

export const STYLES: Record<InteriorStyle, StylePalette> = {
  lodge: { wall: "#c9a27a", wallAlt: "#b98e63", floor: "#7a5235", ceiling: "#d9c2a3", accent: "#9c3d2e", textile: "#efe4d2", wood: "#5f3d25", metal: "#b08d57", rug: "#8a4a3a" },
  heritage: { wall: "#ebcf9f", wallAlt: "#dcae72", floor: "#b5714a", ceiling: "#f3e3c8", accent: "#8f2d3c", textile: "#f8ebd5", wood: "#5a3324", metal: "#c9a14a", rug: "#9b3b3b" },
  modern: { wall: "#e9e6e0", wallAlt: "#d6d2cb", floor: "#9a8774", ceiling: "#f6f5f2", accent: "#173f4f", textile: "#fbfbf9", wood: "#6e5a48", metal: "#2b2f33", rug: "#b9b2a6" },
  coastal: { wall: "#f3f0e9", wallAlt: "#dfe9e6", floor: "#d4bb94", ceiling: "#fbfaf7", accent: "#2f8f9d", textile: "#ffffff", wood: "#b08a5e", metal: "#c9b28a", rug: "#e3d6bd" },
  garden: { wall: "#e1e5d4", wallAlt: "#c9d2b8", floor: "#b5714a", ceiling: "#f5f3ea", accent: "#5f7d4a", textile: "#faf6ec", wood: "#7a5a3a", metal: "#a68a5b", rug: "#c9b38d" },
};

const VP: [number, number] = [800, 470];
/** Project a point on the back-wall plane forward toward the viewer by factor k (1 = on the wall). */
function fwd([x, y]: [number, number], k: number): [number, number] {
  return [VP[0] + (x - VP[0]) * k, VP[1] + (y - VP[1]) * k];
}

export interface Room {
  s: Svg;
  r: Rng;
  p: StylePalette;
  style: InteriorStyle;
  back: { x0: number; y0: number; x1: number; y1: number };
}

export function shell(s: Svg, p: StylePalette, style: InteriorStyle, back = { x0: 380, y0: 200, x1: 1220, y1: 700 }): Room {
  const { x0, y0, x1, y1 } = back;
  const r = rng(`shell:${style}:${x0}`);
  s.add(
    poly([[0, 0], [W, 0], [x1, y0], [x0, y0]], p.ceiling),
    poly([[0, 0], [x0, y0], [x0, y1], [0, H]], s.linear([[0, darken(p.wall, 0.08)], [1, darken(p.wall, 0.16)]], 0, 0, 1, 0)),
    poly([[W, 0], [x1, y0], [x1, y1], [W, H]], s.linear([[0, darken(p.wall, 0.14)], [1, darken(p.wall, 0.04)]], 0, 0, 1, 0)),
    rect(x0, y0, x1 - x0, y1 - y0, p.wall),
    poly([[0, H], [x0, y1], [x1, y1], [W, H]], s.linear([[0, darken(p.floor, 0.1)], [1, p.floor]])),
  );
  // Floor boards / tiles in perspective
  const floorLines: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const bx = x0 + ((x1 - x0) * i) / 14;
    const [fx] = fwd([bx, y1], (H - VP[1]) / (y1 - VP[1]));
    floorLines.push(line(bx, y1, fx, H, darken(p.floor, 0.18), 1.5, `opacity="0.55"`));
  }
  if (style === "heritage" || style === "garden") for (let j = 1; j < 6; j++) {
    const y = y1 + (H - y1) * Math.pow(j / 6, 1.6);
    floorLines.push(line(0, y, W, y, darken(p.floor, 0.2), 1.5, `opacity="0.45"`));
  }
  s.add(g(floorLines.join("")));
  if (style === "lodge") {
    const planks: string[] = [];
    for (let y = y0 + 28; y < y1; y += 34) planks.push(line(x0, y, x1, y, darken(p.wall, 0.14), 2, `opacity="0.6"`));
    for (let i = 1; i < 10; i++) {
      const t = i / 10;
      planks.push(line(0, t * 0 + (y0 * t), x0, y0 + (y1 - y0) * t, darken(p.wall, 0.2), 2, `opacity="0.4"`));
    }
    s.add(g(planks.join("")));
    // Exposed beams
    for (const t of [0.35, 0.7]) s.add(poly([[W * t - 40, 0], [W * t + 40, 0], [x0 + (x1 - x0) * t + 12, y0], [x0 + (x1 - x0) * t - 12, y0]], p.wood));
  }
  if (style === "heritage") {
    s.add(rect(x0, y0 + 14, x1 - x0, 18, p.accent, `opacity="0.75"`), rect(x0, y1 - 46, x1 - x0, 46, darken(p.wall, 0.12)));
    for (let i = 0; i < 28; i++) s.add(circle(x0 + 15 + i * ((x1 - x0) / 28), y0 + 23, 4, p.metal));
  }
  // Skirting
  s.add(rect(x0, y1 - 12, x1 - x0, 12, lighten(p.wall, 0.4)));
  return { s, r, p, style, back };
}

export function windowView(room: Room, x: number, y: number, w: number, h: number, scene: SceneKey, tod: Tod, seed: string, arch = false) {
  const { s, p, style } = room;
  const view = paintScene(s, scene, tod, seed);
  if (arch) {
    const clip = s.clip(`<path d="M${f(x)},${f(y + h)} L${f(x)},${f(y + w * 0.45)} Q${f(x)},${f(y)} ${f(x + w / 2)},${f(y - w * 0.08)} Q${f(x + w)},${f(y)} ${f(x + w)},${f(y + w * 0.45)} L${f(x + w)},${f(y + h)} Z"/>`);
    s.add(g(frame(x, y - w * 0.1, w, h + w * 0.1, view), `clip-path="${clip}"`));
    s.add(path(`M${f(x)},${f(y + h)} L${f(x)},${f(y + w * 0.45)} Q${f(x)},${f(y)} ${f(x + w / 2)},${f(y - w * 0.08)} Q${f(x + w)},${f(y)} ${f(x + w)},${f(y + w * 0.45)} L${f(x + w)},${f(y + h)}`, "none", `stroke="${p.wood}" stroke-width="16"`));
  } else {
    s.add(frame(x, y, w, h, view));
    s.add(rect(x, y, w, h, "none", `stroke="${style === "modern" ? p.metal : style === "coastal" ? "#ffffff" : p.wood}" stroke-width="${style === "modern" ? 8 : 14}"`));
    const mull = style === "modern" ? 1 : 2;
    for (let i = 1; i <= mull; i++) s.add(line(x + (w * i) / (mull + 1), y, x + (w * i) / (mull + 1), y + h, style === "modern" ? p.metal : style === "coastal" ? "#ffffff" : p.wood, style === "modern" ? 5 : 9));
    if (style !== "modern") s.add(line(x, y + h * 0.32, x + w, y + h * 0.32, style === "coastal" ? "#ffffff" : p.wood, 8));
  }
  // Glass sheen and sill
  s.add(poly([[x + w * 0.1, y], [x + w * 0.3, y], [x + w * 0.05, y + h], [x - w * 0.15 < x ? x : x, y + h]], "#ffffff", `opacity="0.08"`));
  s.add(rect(x - 20, y + h, w + 40, 16, lighten(p.wall, 0.3)));
}

export function curtains(room: Room, x: number, y: number, w: number, h: number) {
  const { s, p } = room;
  const c = room.style === "heritage" ? p.accent : room.style === "lodge" ? "#d8c3a2" : lighten(p.accent, 0.75);
  const panel = (cx: number, dir: number) => {
    const folds: string[] = [];
    const cw = w * 0.16;
    folds.push(path(`M${f(cx)},${f(y - 30)} L${f(cx + dir * cw)},${f(y - 30)} Q${f(cx + dir * cw * 0.7)},${f(y + h * 0.5)} ${f(cx + dir * cw * 1.1)},${f(y + h + 30)} L${f(cx)},${f(y + h + 30)} Z`, s.linear([[0, c], [0.5, darken(c, 0.12)], [1, c]], 0, 0, 1, 0)));
    for (let i = 1; i < 4; i++) folds.push(line(cx + dir * cw * (i / 4), y - 30, cx + dir * cw * (i / 4) * 1.05, y + h + 30, darken(c, 0.2), 2, `opacity="0.5"`));
    return folds.join("");
  };
  s.add(panel(x - 10, -1), panel(x + w + 10, 1));
  s.add(rect(x - w * 0.22, y - 40, w * 1.44, 10, room.p.metal, `rx="5"`));
}

function bed(room: Room, bx0: number, bx1: number, category: RoomCategoryKey, twin = false) {
  const { s, p, style } = room;
  const wallY = room.back.y1;
  const k = 2.25;
  const headH = category === "SUITE" ? 230 : 180;
  const head = style === "coastal" ? "#c8a678" : style === "modern" ? darken(p.accent, 0.05) : style === "heritage" ? p.wood : style === "garden" ? "#8a9e72" : p.wood;
  // Headboard
  if (style === "heritage") s.add(path(`M${bx0 - 20},${wallY - 40} L${bx0 - 20},${wallY - headH + 30} Q${(bx0 + bx1) / 2},${wallY - headH - 40} ${bx1 + 20},${wallY - headH + 30} L${bx1 + 20},${wallY - 40} Z`, head));
  else s.add(rect(bx0 - 20, wallY - headH, bx1 - bx0 + 40, headH - 30, head, `rx="${style === "modern" ? 6 : 14}"`));
  if (style === "coastal") for (let i = 0; i < 18; i++) s.add(line(bx0 - 10 + i * ((bx1 - bx0 + 20) / 18), wallY - headH + 8, bx0 - 10 + i * ((bx1 - bx0 + 20) / 18), wallY - 40, darken(head, 0.2), 2));
  const drawOne = (x0: number, x1: number) => {
    const top = wallY - 70;
    const BL: [number, number] = [x0, top];
    const BR: [number, number] = [x1, top];
    const FL = fwd(BL, k);
    const FR = fwd(BR, k);
    const drop = 46 * k;
    // Base and mattress
    s.add(poly([FL, FR, [FR[0], FR[1] + drop], [FL[0], FL[1] + drop]], darken(p.textile, 0.12)));
    s.add(poly([BL, BR, FR, FL], s.linear([[0, p.textile], [1, darken(p.textile, 0.05)]])));
    // Throw across the foot of the bed
    const t0 = 0.62;
    const T = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    s.add(poly([T(BL, FL, t0), T(BR, FR, t0), FR, FL], p.accent, `opacity="0.92"`));
    s.add(poly([FL, FR, [FR[0], FR[1] + drop * 0.55], [FL[0], FL[1] + drop * 0.55]], darken(p.accent, 0.12)));
    // Pillows
    const pw = (x1 - x0) / (twin ? 1.4 : 2.4);
    const n = twin ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const cx = x0 + (x1 - x0) * ((i + 0.5) / n);
      s.add(ellipse(cx, top - 6, pw / 2, 30, lighten(p.textile, 0.4)), ellipse(cx, top - 4, pw / 2 - 8, 22, "#ffffff", `opacity="0.6"`));
    }
    if (category !== "STANDARD") for (let i = 0; i < 2; i++) s.add(ellipse(x0 + (x1 - x0) * (0.3 + i * 0.4), top + 22, pw / 3, 22, p.accent, `opacity="0.85"`));
  };
  if (twin) {
    const mid = (bx0 + bx1) / 2;
    drawOne(bx0, mid - 30);
    drawOne(mid + 30, bx1);
  } else drawOne(bx0, bx1);
}

export function nightstand(room: Room, x: number, w = 90) {
  const { s, p } = room;
  const y = room.back.y1;
  s.add(rect(x, y - 100, w, 100, p.wood), rect(x, y - 100, w, 10, lighten(p.wood, 0.15)), rect(x + 10, y - 70, w - 20, 4, darken(p.wood, 0.3)));
  s.add(rect(x + w / 2 - 4, y - 170, 8, 70, p.metal), path(`M${x + w / 2 - 34},${y - 170} L${x + w / 2 + 34},${y - 170} L${x + w / 2 + 22},${y - 222} L${x + w / 2 - 22},${y - 222} Z`, lighten(p.textile, 0.1)));
  s.add(circle(x + w / 2, y - 190, 70, s.radial([[0, "#ffe7b0", 0.45], [1, "#ffe7b0", 0]])));
}

export function rug(room: Room, cx: number, w: number, depth = 1.6) {
  const { s, p } = room;
  const y = room.back.y1;
  const BL: [number, number] = [cx - w / 2, y + 20];
  const BR: [number, number] = [cx + w / 2, y + 20];
  s.add(poly([BL, BR, fwd(BR, depth), fwd(BL, depth)], p.rug, `opacity="0.85"`));
  s.add(poly([BL, BR, fwd(BR, depth), fwd(BL, depth)], "none", `stroke="${lighten(p.rug, 0.3)}" stroke-width="6" opacity="0.6"`));
}

export function armchair(room: Room, x: number, y: number, scale = 1) {
  const { s, p, style } = room;
  const c = style === "coastal" ? "#c8a678" : style === "modern" ? "#8a8f8c" : style === "heritage" ? p.accent : style === "garden" ? "#b08a5e" : "#6e4a32";
  const cushion = style === "coastal" || style === "garden" ? "#f6efe2" : lighten(c, 0.15);
  const sc = (n: number) => n * scale;
  s.add(rect(x, y - sc(150), sc(170), sc(110), c, `rx="${sc(26)}"`), rect(x - sc(16), y - sc(80), sc(40), sc(80), darken(c, 0.1), `rx="${sc(14)}"`), rect(x + sc(146), y - sc(80), sc(40), sc(80), darken(c, 0.1), `rx="${sc(14)}"`), rect(x + sc(10), y - sc(70), sc(150), sc(44), cushion, `rx="${sc(12)}"`));
  s.add(rect(x + sc(6), y - sc(26), sc(10), sc(30), darken(c, 0.4)), rect(x + sc(156), y - sc(26), sc(10), sc(30), darken(c, 0.4)));
}

export function plant(room: Room, x: number, y: number, scale = 1) {
  const { s } = room;
  const sc = (n: number) => n * scale;
  const leaves: string[] = [];
  const r = rng(`plant:${x}:${y}`);
  for (let i = 0; i < 9; i++) {
    const a = (-150 + i * 15) * (Math.PI / 180);
    const len = sc(r.range(80, 140));
    leaves.push(path(`M${x},${y - sc(70)} Q${f(x + Math.cos(a) * len * 0.5 - sc(20))},${f(y - sc(70) + Math.sin(a) * len * 0.6)} ${f(x + Math.cos(a) * len)},${f(y - sc(70) + Math.sin(a) * len)}`, "none", `stroke="#4b7f45" stroke-width="${sc(14)}" stroke-linecap="round"`));
  }
  s.add(g(leaves.join("")), path(`M${x - sc(42)},${y - sc(80)} L${x + sc(42)},${y - sc(80)} L${x + sc(32)},${y} L${x - sc(32)},${y} Z`, room.style === "modern" ? "#3c4247" : "#b4643c"));
}

export function pendant(room: Room, x: number, len = 140) {
  const { s, p } = room;
  s.add(line(x, room.back.y0 - 20, x, room.back.y0 + len, p.metal, 3), path(`M${x - 46},${room.back.y0 + len + 40} L${x + 46},${room.back.y0 + len + 40} L${x + 26},${room.back.y0 + len} L${x - 26},${room.back.y0 + len} Z`, room.style === "modern" ? p.metal : p.textile), circle(x, room.back.y0 + len + 60, 90, s.radial([[0, "#ffe7b0", 0.35], [1, "#ffe7b0", 0]])));
}

export function art(room: Room, x: number, y: number, w: number, h: number, seed: string) {
  const { s, p } = room;
  const r = rng(seed);
  s.add(rect(x - 10, y - 10, w + 20, h + 20, room.style === "modern" ? "#1f2326" : p.metal), rect(x, y, w, h, lighten(p.wallAlt, 0.4)));
  for (let i = 0; i < 4; i++) s.add(circle(x + r.range(w * 0.2, w * 0.8), y + r.range(h * 0.3, h * 0.8), r.range(w * 0.08, w * 0.22), r.pick([p.accent, p.wallAlt, darken(p.wall, 0.2), "#e6a64b"]), `opacity="0.7"`));
}

/** Wide overview of the whole room: window with the view, bed, seating. */
export function roomOverview(style: InteriorStyle, category: RoomCategoryKey, scene: SceneKey, tod: Tod, seed: string, twin = false) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style, category === "SUITE" ? { x0: 320, y0: 190, x1: 1280, y1: 710 } : { x0: 380, y0: 200, x1: 1220, y1: 700 });
  const winW = category === "SUITE" ? 520 : category === "DELUXE" ? 440 : 380;
  const wx = room.back.x0 + 40;
  const wy = room.back.y0 + (style === "modern" ? 30 : 70);
  const wh = style === "modern" ? room.back.y1 - wy - 30 : 320;
  windowView(room, wx, wy, winW, wh, scene, tod, seed, style === "heritage");
  curtains(room, wx, wy, winW, wh);
  rug(room, 560, 360, 1.5);
  const bx0 = Math.max(wx + winW + 120, 860);
  bed(room, bx0, room.back.x1 - 40, category, twin);
  nightstand(room, bx0 - 120);
  if (category !== "STANDARD") armchair(room, 230, 900, 1.25);
  if (category === "SUITE") armchair(room, 560, 820, 0.9);
  if (style === "garden" || style === "coastal") plant(room, 120, 990, 1.4);
  pendant(room, 1040, 110);
  if (style !== "heritage") art(room, 1360, 300, 120, 160, seed);
  return s.toString();
}

/** Closer view of the sleeping area and headboard. */
export function sleepingArea(style: InteriorStyle, category: RoomCategoryKey, seed: string, twin = false) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style, { x0: 160, y0: 120, x1: 1440, y1: 760 });
  art(room, 640, 220, 320, 170, seed);
  bed(room, 520, 1080, category, twin);
  nightstand(room, 360, 110);
  nightstand(room, 1130, 110);
  return s.toString();
}

export function bathroom(style: InteriorStyle, category: RoomCategoryKey, scene: SceneKey, tod: Tod, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  const tile = style === "modern" ? "#e2e0dc" : style === "coastal" ? "#e8f1ef" : style === "heritage" ? "#efdcbc" : style === "lodge" ? "#cdbba3" : "#dfe4d6";
  const room = shell(s, { ...p, wall: tile, floor: darken(tile, 0.15) }, style, { x0: 300, y0: 150, x1: 1300, y1: 730 });
  const { x0, y0, x1, y1 } = room.back;
  const grid: string[] = [];
  for (let x = x0; x < x1; x += 60) grid.push(line(x, y0, x, y1, darken(tile, 0.08), 1.5));
  for (let y = y0; y < y1; y += 60) grid.push(line(x0, y, x1, y, darken(tile, 0.08), 1.5));
  s.add(g(grid.join("")));
  if (category === "SUITE") {
    windowView(room, 820, 230, 400, 280, scene, tod, seed, style === "heritage");
    s.add(ellipse(1020, 690, 230, 50, "#ffffff"), path(`M790,690 Q790,800 900,800 L1140,800 Q1250,800 1250,690 Z`, "#fbfbfb"), ellipse(1020, 690, 200, 34, "#d9eef2"));
  } else {
    s.add(rect(880, 220, 320, 510, "#cfe3e8", `opacity="0.35"`), rect(880, 220, 320, 510, "none", `stroke="${p.metal}" stroke-width="6"`), circle(1040, 270, 40, p.metal, `opacity="0.6"`));
  }
  // Vanity, basin and mirror
  s.add(rect(380, 560, 380, 170, p.wood), rect(370, 545, 400, 22, style === "modern" ? "#2b2f33" : "#f4f1ea"), ellipse(570, 548, 90, 16, "#ffffff"));
  s.add(rect(420, 260, 300, 250, style === "heritage" ? p.metal : "#c9d6da", `rx="${style === "heritage" ? 150 : 8}"`), rect(432, 272, 276, 226, "#dfeaee", `rx="${style === "heritage" ? 138 : 4}"`));
  s.add(rect(560, 515, 10, 34, p.metal), rect(260, 600, 70, 150, lighten(p.accent, 0.6), `rx="8"`));
  plant(room, 1400, 980, 1.1);
  return s.toString();
}

export function seatingArea(style: InteriorStyle, scene: SceneKey, tod: Tod, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style);
  windowView(room, 520, 260, 560, 330, scene, tod, seed, style === "heritage");
  curtains(room, 520, 260, 560, 330);
  rug(room, 800, 520);
  // Sofa facing the viewer under the window
  const c = style === "modern" ? "#56636b" : style === "coastal" ? "#e9e3d6" : style === "heritage" ? p.accent : style === "garden" ? "#8a9e72" : "#7a4f34";
  s.add(rect(470, 600, 660, 130, c, `rx="30"`), rect(440, 640, 70, 120, darken(c, 0.1), `rx="22"`), rect(1090, 640, 70, 120, darken(c, 0.1), `rx="22"`), rect(500, 660, 600, 70, lighten(c, 0.12), `rx="16"`));
  for (let i = 0; i < 3; i++) s.add(rect(530 + i * 190, 610, 150, 70, i === 1 ? p.accent : lighten(c, 0.3), `rx="14"`));
  // Coffee table
  s.add(ellipse(800, 860, 200, 46, darken(p.wood, 0.1)), ellipse(800, 850, 200, 46, p.wood), rect(780, 860, 40, 60, darken(p.wood, 0.3)));
  s.add(ellipse(740, 838, 34, 12, "#ffffff"), rect(840, 820, 70, 22, p.accent, `rx="3"`));
  armchair(room, 160, 980, 1.3);
  plant(room, 1420, 980, 1.3);
  return s.toString();
}

export function workspace(style: InteriorStyle, scene: SceneKey, tod: Tod, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style);
  windowView(room, 700, 250, 420, 300, scene, tod, seed, style === "heritage");
  art(room, 450, 300, 160, 200, seed);
  // Desk
  s.add(rect(560, 600, 520, 24, p.wood), rect(580, 624, 18, 120, darken(p.wood, 0.25)), rect(1042, 624, 18, 120, darken(p.wood, 0.25)), rect(900, 624, 160, 70, darken(p.wood, 0.1)));
  s.add(rect(640, 560, 180, 40, "#2b2f33", `rx="4"`), rect(860, 580, 90, 20, p.accent, `rx="2"`), rect(990, 520, 8, 80, p.metal), path(`M960,520 L1030,520 L1012,490 L978,490 Z`, p.textile));
  // Chair
  const c = style === "modern" ? "#2b2f33" : p.wood;
  s.add(rect(720, 680, 200, 26, c, `rx="10"`), rect(730, 560, 180, 120, lighten(c, 0.1), `rx="16"`), rect(810, 706, 20, 120, c), rect(740, 820, 160, 12, c, `rx="6"`));
  plant(room, 180, 990, 1.2);
  return s.toString();
}

export function balcony(style: InteriorStyle, scene: SceneKey, tod: Tod, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  s.add(paintScene(s, scene, tod, seed));
  // Deck
  s.add(poly([[0, 780], [W, 780], [W, H], [0, H]], s.linear([[0, style === "modern" ? "#9aa1a3" : p.floor], [1, darken(style === "modern" ? "#9aa1a3" : p.floor, 0.25)]])));
  for (let i = 0; i < 12; i++) s.add(line(i * 140, 780, i * 180 - 200, H, darken(p.floor, 0.3), 2, `opacity="0.4"`));
  // Railing per style
  const railY = 640;
  if (style === "modern") {
    s.add(rect(0, railY, W, 140, "#cfe6ee", `opacity="0.35"`), rect(0, railY - 10, W, 12, p.metal));
    for (let i = 0; i < 6; i++) s.add(rect(i * 300, railY, 6, 140, p.metal));
  } else {
    const c = style === "coastal" ? "#ffffff" : style === "heritage" ? "#e2b07e" : p.wood;
    s.add(rect(0, railY - 16, W, 22, c), rect(0, 770, W, 14, c));
    for (let x = 20; x < W; x += style === "heritage" ? 90 : 60) {
      if (style === "heritage") s.add(path(`M${x},${railY + 6} Q${x + 20},${railY + 70} ${x},${770} L${x + 30},${770} Q${x + 10},${railY + 70} ${x + 30},${railY + 6} Z`, c));
      else s.add(rect(x, railY + 6, style === "lodge" ? 22 : 14, 764 - railY, c));
    }
  }
  if (style === "heritage") {
    // Jharokha frame
    s.add(path(`M0,0 L${W},0 L${W},${H} L1500,${H} L1500,300 Q1500,90 800,40 Q100,90 100,300 L100,${H} L0,${H} Z`, "#c98b5b"), path(`M100,${H} L100,300 Q100,90 800,40 Q1500,90 1500,300 L1500,${H}`, "none", `stroke="#a86a3e" stroke-width="18"`));
  }
  // Two chairs and a side table
  const chair = style === "coastal" ? "#c8a678" : style === "modern" ? "#2b2f33" : style === "garden" ? "#b08a5e" : p.wood;
  for (const x of [380, 1060]) {
    s.add(rect(x, 820, 170, 26, chair, `rx="8"`), rect(x + 10, 700, 150, 120, chair, `rx="16"`), rect(x + 18, 712, 134, 96, style === "modern" ? "#56636b" : p.textile, `rx="12"`), rect(x + 10, 846, 14, 110, chair), rect(x + 146, 846, 14, 110, chair));
  }
  s.add(ellipse(800, 860, 90, 22, chair), rect(790, 860, 20, 100, chair), ellipse(770, 846, 22, 10, "#ffffff"), ellipse(820, 846, 22, 10, "#ffffff"));
  plant({ s, r: rng(seed), p, style, back: { x0: 0, y0: 0, x1: W, y1: H } }, 1480, 990, 1.3);
  return s.toString();
}

export type FeatureKind = "corner-windows" | "fireplace" | "window-seat" | "bathtub-view";

export function specialFeature(kind: FeatureKind, style: InteriorStyle, scene: SceneKey, tod: Tod, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style);
  if (kind === "corner-windows") {
    windowView(room, 640, 250, 520, 360, scene, tod, seed);
    // Second window on the left wall, drawn in perspective
    const view = paintScene(s, scene, tod, `${seed}:side`);
    const clip = s.clip(`<polygon points="60,180 330,280 330,640 60,820"/>`);
    s.add(g(frame(0, 120, 400, 760, view), `clip-path="${clip}"`), poly([[60, 180], [330, 280], [330, 640], [60, 820]], "none", `stroke="${style === "modern" ? p.metal : p.wood}" stroke-width="12"`));
    armchair(room, 760, 900, 1.2);
    plant(room, 1430, 990, 1.2);
  } else if (kind === "fireplace") {
    const stone = "#8d8577";
    s.add(rect(600, 300, 400, 400, stone));
    for (let i = 0; i < 40; i++) s.add(rect(600 + (i % 6) * 66 + ((Math.floor(i / 6) % 2) * 30), 300 + Math.floor(i / 6) * 58, 60, 52, mix(stone, i % 3 ? "#a39a8a" : "#756e62", 0.5), `rx="8" opacity="0.8"`));
    s.add(rect(560, 280, 480, 30, p.wood), path(`M680,700 L680,520 Q800,450 920,520 L920,700 Z`, "#2a1d16"));
    s.add(ellipse(800, 660, 110, 40, "#ff9f43", `opacity="0.85"`), path(`M740,670 Q760,560 800,600 Q830,520 860,670 Z`, "#ffd166"), circle(800, 640, 260, s.radial([[0, "#ffb26b", 0.35], [1, "#ffb26b", 0]])));
    armchair(room, 260, 960, 1.3);
    armchair(room, 1160, 960, 1.3);
    rug(room, 800, 520);
  } else if (kind === "window-seat") {
    windowView(room, 520, 220, 560, 380, scene, tod, seed, style === "heritage");
    s.add(rect(470, 600, 660, 110, p.wood), rect(490, 560, 620, 50, p.accent, `rx="16"`));
    for (let i = 0; i < 4; i++) s.add(ellipse(560 + i * 160, 545, 60, 34, lighten(p.accent, i % 2 ? 0.4 : 0.2)));
    plant(room, 1420, 990, 1.2);
  } else {
    return bathroom(style, "SUITE", scene, tod, seed);
  }
  return s.toString();
}
