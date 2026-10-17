/** Illustrative exterior and common-area painters. */
import type { HotelTemplateKey, InteriorStyle, SceneKey } from "@/lib/catalog-types";
import { exteriorPalette, type ExteriorPalette } from "@/lib/layout/palettes";
import { rng, type Rng } from "@/lib/random";
import { armchair, pendant, plant, rug, shell, STYLES, windowView } from "./interiors";
import { LIGHT, paintScene, type Tod } from "./scenes";
import { H, W, Svg, circle, darken, ellipse, f, lighten, line, mix, path, poly, rect } from "./svg";

const GROUND = 880;

function litWindow(r: Rng, tod: Tod, glass: string) {
  return r.chance(LIGHT[tod].windows * 0.7) ? "#ffd58a" : glass;
}

function tree(x: number, y: number, s: number, color: string) {
  return rect(x - 6 * s, y - 70 * s, 12 * s, 70 * s, "#6b4a35") + circle(x, y - 110 * s, 60 * s, color) + circle(x - 36 * s, y - 84 * s, 40 * s, darken(color, 0.08)) + circle(x + 38 * s, y - 88 * s, 42 * s, lighten(color, 0.06));
}

function pineTree(x: number, y: number, h: number, color: string) {
  return poly([[x, y - h], [x - h * 0.28, y - h * 0.2], [x + h * 0.28, y - h * 0.2]], color) + poly([[x, y - h * 0.7], [x - h * 0.34, y], [x + h * 0.34, y]], darken(color, 0.06));
}

function palmTree(x: number, y: number, h: number) {
  const tx = x + h * 0.12;
  const parts = [path(`M${x - 6},${y} Q${x + h * 0.05},${y - h / 2} ${tx},${y - h} L${tx + 8},${y - h} Q${x + h * 0.05 + 10},${y - h / 2} ${x + 6},${y} Z`, "#8a6a4c")];
  for (const a of [-160, -120, -75, -35, 5]) {
    const rad = (a * Math.PI) / 180;
    const ex = tx + Math.cos(rad) * h * 0.4;
    const ey = y - h + Math.sin(rad) * h * 0.2 + h * 0.08;
    parts.push(path(`M${tx},${y - h} Q${f((tx + ex) / 2)},${f(y - h - 30)} ${f(ex)},${f(ey)} Q${f((tx + ex) / 2)},${f(y - h + 10)} ${tx},${y - h} Z`, "#2f7a46"));
  }
  return parts.join("");
}

function ground(s: Svg, tod: Tod, color: string) {
  const c = LIGHT[tod].shade ? mix(color, "#2a2140", LIGHT[tod].shade) : color;
  return rect(0, GROUND, W, H - GROUND, s.linear([[0, c], [1, darken(c, 0.2)]]));
}

function cityTower(s: Svg, p: ExteriorPalette, r: Rng, tod: Tod) {
  const x0 = 520;
  const w = 560;
  const top = 140;
  const parts = [poly([[x0 + w, top], [x0 + w + 120, top + 40], [x0 + w + 120, GROUND], [x0 + w, GROUND]], darken(p.wall, 0.18)), rect(x0, top, w, GROUND - top, p.wall)];
  const floors = 14;
  const fh = (GROUND - 140 - top) / floors;
  for (let i = 0; i < floors; i++) {
    const y = top + 20 + i * fh;
    parts.push(rect(x0 + 20, y, w - 40, fh - 14, p.glass));
    for (let c = 0; c < 8; c++) parts.push(rect(x0 + 26 + c * ((w - 52) / 8), y + 4, (w - 52) / 8 - 8, fh - 22, litWindow(r, tod, lighten(p.glass, 0.1))));
    parts.push(poly([[x0 + w, y + 10], [x0 + w + 120, y + 40], [x0 + w + 120, y + 40 + fh * 0.6], [x0 + w, y + 10 + fh * 0.6]], darken(p.glass, 0.25)));
  }
  for (let c = 0; c <= 8; c++) parts.push(rect(x0 + 16 + c * ((w - 32) / 8), top, 8, GROUND - top - 140, p.trim, `opacity="0.85"`));
  parts.push(rect(x0 - 140, GROUND - 140, w + 280, 140, p.base), rect(x0 - 120, GROUND - 120, w + 240, 100, lighten(p.glass, 0.2)));
  parts.push(rect(x0 + w / 2 - 160, GROUND - 160, 320, 26, p.trim), rect(x0 + w / 2 - 60, GROUND - 120, 120, 120, "#ffe2a8", `opacity="${tod === "dusk" ? 0.9 : 0.5}"`));
  parts.push(rect(x0 - 20, top - 30, w + 40, 30, p.roof));
  for (const x of [260, 380, 1260, 1380]) parts.push(tree(x, GROUND + 20, 1, "#3f7a3c"));
  return parts.join("");
}

function coastalBlock(s: Svg, p: ExteriorPalette, r: Rng, tod: Tod) {
  const x0 = 160;
  const w = 1280;
  const floors = 3;
  const fh = 120;
  const top = GROUND - floors * fh - 60;
  const parts = [rect(x0, top, w, GROUND - top, p.wall), rect(x0 - 20, top - 24, w + 40, 30, p.roof)];
  const bays = 9;
  const bw = w / bays;
  for (let fl = 0; fl < floors; fl++) {
    const y = top + 30 + fl * fh;
    for (let b = 0; b < bays; b++) {
      const x = x0 + b * bw;
      parts.push(rect(x + 18, y, bw - 36, fh - 40, litWindow(r, tod, p.glass)));
      parts.push(rect(x + 8, y + fh - 46, bw - 16, 10, p.trim), rect(x + 8, y + fh - 76, bw - 16, 4, p.accent), rect(x + 8, y + fh - 40, bw - 16, 8, darken(p.wall, 0.12)));
      for (let k = 0; k < 6; k++) parts.push(rect(x + 14 + k * ((bw - 28) / 5), y + fh - 76, 3, 32, p.accent));
    }
  }
  parts.push(rect(x0 + w / 2 - 140, GROUND - 80, 280, 80, darken(p.glass, 0.2)), rect(x0 + w / 2 - 180, GROUND - 96, 360, 18, p.accent));
  parts.push(rect(0, GROUND, W, 50, "#e9dcc6"), rect(260, GROUND + 50, W - 520, 70, s.linear([[0, "#7fd3dc"], [1, "#2d9bb0"]]), `rx="8"`));
  for (const x of [80, 1500, 300, 1300]) parts.push(palmTree(x, GROUND + 40, 420));
  return parts.join("");
}

function lodge(s: Svg, p: ExteriorPalette, r: Rng, tod: Tod) {
  const parts: string[] = [];
  const x0 = 300;
  const w = 1000;
  // Stone base
  parts.push(rect(x0, GROUND - 180, w, 180, p.base));
  for (let i = 0; i < 30; i++) parts.push(rect(x0 + (i % 10) * 100 + ((Math.floor(i / 10) % 2) * 40), GROUND - 170 + Math.floor(i / 10) * 56, 90, 48, darken(p.base, (i % 3) * 0.05), `rx="10" opacity="0.6"`));
  // Timber upper floors, stepped back
  const levels = [{ x: x0 + 40, w: w - 80, y: GROUND - 360 }, { x: x0 + 160, w: w - 320, y: GROUND - 520 }];
  for (const lv of levels) {
    parts.push(rect(lv.x, lv.y, lv.w, 180, p.wall));
    for (let y = lv.y + 14; y < lv.y + 180; y += 22) parts.push(line(lv.x, y, lv.x + lv.w, y, darken(p.wall, 0.15), 2));
    const n = Math.round(lv.w / 140);
    for (let i = 0; i < n; i++) {
      const wx = lv.x + 30 + i * ((lv.w - 60) / n);
      parts.push(rect(wx, lv.y + 30, (lv.w - 60) / n - 30, 100, litWindow(r, tod, p.glass)), rect(wx - 6, lv.y + 30, (lv.w - 60) / n - 18, 100, "none", `stroke="${p.trim}" stroke-width="8"`));
    }
    // Balcony
    parts.push(rect(lv.x - 20, lv.y + 160, lv.w + 40, 14, darken(p.wall, 0.3)));
    for (let x = lv.x - 16; x < lv.x + lv.w + 20; x += 26) parts.push(rect(x, lv.y + 130, 8, 32, p.trim));
    parts.push(rect(lv.x - 20, lv.y + 124, lv.w + 40, 8, p.trim));
  }
  // Gable roof
  const top = levels[1];
  parts.push(poly([[top.x - 70, top.y + 10], [top.x + top.w / 2, top.y - 170], [top.x + top.w + 70, top.y + 10]], p.roof));
  parts.push(poly([[x0 - 10, levels[0].y + 10], [x0 + 160, levels[0].y - 40], [x0 + 160, levels[0].y + 10]], p.roof), poly([[x0 + w + 10, levels[0].y + 10], [x0 + w - 160, levels[0].y - 40], [x0 + w - 160, levels[0].y + 10]], p.roof));
  parts.push(rect(top.x + top.w * 0.72, top.y - 150, 44, 110, p.base));
  parts.push(rect(x0 + w / 2 - 60, GROUND - 140, 120, 140, darken(p.wall, 0.35)), rect(x0 + w / 2 - 50, GROUND - 130, 100, 130, "#ffd58a", `opacity="${tod === "dusk" ? 0.9 : 0.35}"`));
  for (let i = 0; i < 10; i++) parts.push(pineTree(r.pick([r.range(0, 280), r.range(1320, W)]), GROUND + r.range(0, 60), r.range(220, 380), "#24493a"));
  return parts.join("");
}

function heritage(s: Svg, p: ExteriorPalette, r: Rng, tod: Tod) {
  const parts: string[] = [];
  const x0 = 260;
  const w = 1080;
  const top = GROUND - 440;
  parts.push(rect(x0, top, w, 440, p.wall), rect(x0, top - 30, w, 30, p.base));
  for (let i = 0; i < 27; i++) parts.push(rect(x0 + i * 40, top - 56, 24, 26, p.base));
  // Corner chhatris
  for (const cx of [x0 + 40, x0 + w - 40]) {
    parts.push(rect(cx - 50, top - 140, 100, 90, p.trim), ...[-40, 40].map((d) => rect(cx + d - 6, top - 140, 12, 90, p.base)));
    parts.push(path(`M${cx - 70},${top - 140} Q${cx},${top - 250} ${cx + 70},${top - 140} Z`, p.roof), rect(cx - 3, top - 270, 6, 30, p.accent));
  }
  // Central gate
  parts.push(path(`M${x0 + w / 2 - 90},${GROUND} L${x0 + w / 2 - 90},${GROUND - 160} Q${x0 + w / 2},${GROUND - 280} ${x0 + w / 2 + 90},${GROUND - 160} L${x0 + w / 2 + 90},${GROUND} Z`, darken(p.base, 0.35)));
  parts.push(path(`M${x0 + w / 2 - 110},${GROUND} L${x0 + w / 2 - 110},${GROUND - 160} Q${x0 + w / 2},${GROUND - 300} ${x0 + w / 2 + 110},${GROUND - 160} L${x0 + w / 2 + 110},${GROUND}`, "none", `stroke="${p.trim}" stroke-width="14"`));
  // Jharokhas on the upper level, arched windows below
  const bays = 7;
  for (let i = 0; i < bays; i++) {
    const cx = x0 + 80 + i * ((w - 160) / (bays - 1));
    if (Math.abs(cx - (x0 + w / 2)) < 120) continue;
    const y = top + 70;
    parts.push(rect(cx - 56, y + 60, 112, 18, p.base), rect(cx - 46, y, 92, 64, litWindow(r, tod, p.glass)), path(`M${cx - 60},${y} Q${cx},${y - 70} ${cx + 60},${y} Z`, p.roof), rect(cx - 50, y + 78, 100, 24, p.trim));
    for (let k = 0; k < 4; k++) parts.push(rect(cx - 46 + k * 30, y, 6, 64, p.trim));
    const ly = GROUND - 190;
    parts.push(path(`M${cx - 36},${ly + 120} L${cx - 36},${ly + 40} Q${cx},${ly - 10} ${cx + 36},${ly + 40} L${cx + 36},${ly + 120} Z`, litWindow(r, tod, darken(p.base, 0.4))));
  }
  parts.push(rect(x0, top + 180, w, 14, p.base));
  for (const x of [140, 1460]) parts.push(tree(x, GROUND + 30, 1.1, "#4b7f45"));
  return parts.join("");
}

function garden(s: Svg, p: ExteriorPalette, r: Rng, tod: Tod) {
  const parts: string[] = [];
  const blocks = [{ x: 200, w: 360, h: 220 }, { x: 600, w: 400, h: 300 }, { x: 1040, w: 360, h: 220 }];
  for (const b of blocks) {
    const top = GROUND - b.h;
    parts.push(rect(b.x, top, b.w, b.h, p.wall));
    parts.push(poly([[b.x - 50, top + 6], [b.x + b.w / 2, top - b.w * 0.32], [b.x + b.w + 50, top + 6]], p.roof));
    // Veranda columns and windows
    parts.push(rect(b.x - 30, GROUND - 120, b.w + 60, 14, p.roof));
    for (let i = 0; i <= 5; i++) parts.push(rect(b.x - 20 + i * ((b.w + 40) / 5), GROUND - 106, 10, 106, p.trim));
    for (let i = 0; i < 3; i++) parts.push(rect(b.x + 30 + i * ((b.w - 60) / 3), top + 40, (b.w - 60) / 3 - 30, 80, litWindow(r, tod, p.glass)));
  }
  parts.push(rect(0, GROUND, W, H - GROUND, "#79a85a"));
  for (let i = 0; i < 70; i++) parts.push(circle(r.range(0, W), r.range(GROUND + 20, H), r.range(4, 8), r.pick(["#f2c94c", "#ffffff", "#e07a9b", "#e64980"])));
  for (const x of [90, 1520, 1460]) parts.push(tree(x, GROUND + 20, 1.2, "#3f7a3c"));
  return parts.join("");
}

const BUILDING: Record<HotelTemplateKey, (s: Svg, p: ExteriorPalette, r: Rng, tod: Tod) => string> = {
  CITY_MODERN: cityTower,
  COASTAL_RESORT: coastalBlock,
  MOUNTAIN_LODGE: lodge,
  HERITAGE_BOUTIQUE: heritage,
  GARDEN_RETREAT: garden,
};

export function exterior(template: HotelTemplateKey, palette: number, scene: SceneKey, tod: Tod, seed: string) {
  const s = new Svg();
  const r = rng(`exterior:${template}:${palette}:${scene}:${tod}:${seed}`);
  s.add(paintScene(s, scene, tod, seed));
  s.add(ground(s, tod, template === "COASTAL_RESORT" ? "#e9dcc6" : template === "CITY_MODERN" ? "#8f949a" : "#6f9e4f"));
  let building = BUILDING[template](s, exteriorPalette(template, palette), r, tod);
  if (LIGHT[tod].shade) building = `<g>${building}</g>` + rect(0, 0, W, H, "#2a2140", `opacity="${LIGHT[tod].shade * 0.6}"`);
  s.add(building);
  return s.toString();
}

// ---------------------------------------------------------------- common areas
export function lobby(style: InteriorStyle, scene: SceneKey, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style, { x0: 260, y0: 120, x1: 1340, y1: 720 });
  windowView(room, 300, 180, 300, 460, scene, "day", seed, style === "heritage");
  windowView(room, 1000, 180, 300, 460, scene, "day", `${seed}:b`, style === "heritage");
  // Reception desk in the middle
  s.add(rect(640, 520, 320, 200, p.wood), rect(630, 506, 340, 24, lighten(p.wood, 0.25)), rect(700, 300, 200, 160, p.accent, `rx="8"`), circle(800, 380, 40, p.metal, `opacity="0.7"`));
  // Chandelier
  for (let i = 0; i < 7; i++) s.add(circle(800 + (i - 3) * 40, 200 + Math.abs(i - 3) * -6, 12, "#ffe7b0"));
  s.add(circle(800, 210, 240, s.radial([[0, "#ffe7b0", 0.3], [1, "#ffe7b0", 0]])));
  rug(room, 800, 640);
  armchair(room, 160, 980, 1.4);
  armchair(room, 1200, 980, 1.4);
  plant(room, 560, 990, 1.4);
  plant(room, 1060, 990, 1.4);
  return s.toString();
}

export function reception(style: InteriorStyle, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style, { x0: 120, y0: 80, x1: 1480, y1: 780 });
  s.add(rect(300, 180, 1000, 300, p.wallAlt), rect(560, 240, 480, 160, p.accent, `rx="10"`));
  for (let i = 0; i < 12; i++) s.add(rect(600 + (i % 6) * 66, 270 + Math.floor(i / 6) * 60, 40, 40, p.metal, `opacity="0.75" rx="4"`));
  s.add(rect(240, 560, 1120, 240, p.wood), rect(220, 540, 1160, 32, lighten(p.wood, 0.3)), rect(240, 600, 1120, 6, p.metal));
  s.add(path(`M1180,540 L1210,470 L1240,540 Z`, "#ffffff", `opacity="0.6"`), ellipse(1210, 540, 40, 10, p.metal));
  for (let i = 0; i < 9; i++) s.add(circle(420 + rng(seed).range(-50, 50) + (i % 3) * 20, 470 - Math.floor(i / 3) * 24, 18, ["#e64980", "#f2c94c", "#ffffff"][i % 3]));
  s.add(rect(390, 480, 70, 60, p.metal, `rx="8"`));
  pendant(room, 500, 120);
  pendant(room, 1100, 120);
  return s.toString();
}

export function restaurant(style: InteriorStyle, scene: SceneKey, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style, { x0: 300, y0: 160, x1: 1300, y1: 640 });
  for (let i = 0; i < 3; i++) windowView(room, 340 + i * 320, 220, 280, 340, scene, "day", `${seed}:${i}`, style === "heritage");
  // Tables in perspective rows
  for (const [x, y, sc] of [[520, 760, 1], [1080, 760, 1], [300, 920, 1.3], [1300, 920, 1.3], [800, 860, 1.15]] as [number, number, number][]) {
    s.add(ellipse(x, y, 120 * sc, 34 * sc, "#ffffff"), rect(x - 10 * sc, y, 20 * sc, 80 * sc, p.wood), ellipse(x, y + 4 * sc, 120 * sc, 30 * sc, "#f5f1ea"));
    s.add(ellipse(x - 50 * sc, y - 6 * sc, 18 * sc, 6 * sc, "#e6e2da"), ellipse(x + 50 * sc, y - 6 * sc, 18 * sc, 6 * sc, "#e6e2da"), rect(x - 4 * sc, y - 40 * sc, 8 * sc, 30 * sc, p.accent));
    for (const d of [-1, 1]) s.add(rect(x + d * 140 * sc - 30 * sc, y - 60 * sc, 60 * sc, 90 * sc, p.wood, `rx="${10 * sc}"`));
  }
  for (const x of [520, 800, 1080]) pendant(room, x, 80);
  return s.toString();
}

export function lounge(style: InteriorStyle, seed: string) {
  const s = new Svg();
  const p = STYLES[style];
  const room = shell(s, p, style);
  const r = rng(seed);
  // Bookshelf wall
  s.add(rect(420, 230, 760, 440, p.wood));
  for (let row = 0; row < 4; row++) {
    s.add(rect(430, 240 + row * 108, 740, 10, lighten(p.wood, 0.2)));
    let x = 440;
    while (x < 1150) {
      const w = r.range(14, 30);
      const h = r.range(60, 90);
      s.add(rect(x, 250 + row * 108 + (95 - h), w, h, r.pick([p.accent, "#2d6c91", "#e6a64b", "#5f7d4a", "#f4efe6", "#8f2d3c"])));
      x += w + 3;
    }
  }
  rug(room, 800, 540);
  armchair(room, 300, 940, 1.35);
  armchair(room, 1060, 940, 1.35);
  s.add(ellipse(800, 880, 140, 36, p.wood), rect(788, 880, 24, 70, darken(p.wood, 0.3)));
  plant(room, 1440, 990, 1.3);
  return s.toString();
}

export function destinationHero(scene: SceneKey, tod: Tod, seed: string) {
  const s = new Svg();
  s.add(paintScene(s, scene, tod, seed));
  return s.toString();
}
