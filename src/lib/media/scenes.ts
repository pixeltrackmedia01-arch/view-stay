/**
 * Landscape painters for the illustrative library. Every scene draws into a 1600x1000 space so it can be used
 * full-bleed (view photos, destination heroes) or embedded inside a window, balcony or exterior shot.
 */
import type { SceneKey } from "@/lib/catalog-types";
import { rng, type Rng } from "@/lib/random";
import { H, W, circle, darken, ellipse, f, g, lighten, line, mix, path, poly, rect, ridgePath, type Svg } from "./svg";

export type Tod = "dawn" | "day" | "dusk";
export const TODS: Tod[] = ["dawn", "day", "dusk"];

interface Light {
  top: string;
  mid: string;
  horizon: string;
  sun: string;
  haze: string;
  water: string;
  waterDeep: string;
  glint: string;
  shade: number; // 0 bright .. 1 dark, applied to foreground colours
  windows: number; // how lit building windows are
}

export const LIGHT: Record<Tod, Light> = {
  dawn: { top: "#e9b4a6", mid: "#f6d3bd", horizon: "#fcebd5", sun: "#ffe0ae", haze: "#f3dccd", water: "#c9b7c1", waterDeep: "#8c8aa3", glint: "#ffe7c4", shade: 0.08, windows: 0.35 },
  day: { top: "#5e9cc6", mid: "#9cc9e3", horizon: "#e2f0f3", sun: "#fff7dd", haze: "#d5e6ec", water: "#4d93b5", waterDeep: "#2c6b8c", glint: "#ffffff", shade: 0, windows: 0.1 },
  dusk: { top: "#22314f", mid: "#7c5272", horizon: "#f0a35f", sun: "#ffb469", haze: "#c99481", water: "#5c4f6e", waterDeep: "#2e2c48", glint: "#ffbf7a", shade: 0.28, windows: 1 },
};

const shade = (c: string, L: Light) => (L.shade ? mix(c, "#2a2140", L.shade) : c);
const haze = (c: string, L: Light, t: number) => mix(shade(c, L), L.haze, t);

// ---------------------------------------------------------------- sky
function sky(s: Svg, L: Light, r: Rng, tod: Tod, horizonY = 640) {
  const parts = [rect(0, 0, W, H, s.linear([[0, L.top], [0.55, L.mid], [1, L.horizon]]))];
  const sx = r.range(260, 1340);
  const sy = tod === "day" ? r.range(140, 260) : horizonY - r.range(60, 160);
  parts.push(circle(sx, sy, tod === "day" ? 170 : 240, s.radial([[0, L.sun, 0.55], [1, L.sun, 0]])));
  parts.push(circle(sx, sy, tod === "day" ? 46 : 60, L.sun, `opacity="${tod === "day" ? 0.9 : 0.95}"`));
  // Soft cloud banks
  const cloud = tod === "dusk" ? "#f2b48f" : tod === "dawn" ? "#fff1e6" : "#ffffff";
  for (let i = 0; i < r.int(3, 6); i++) {
    const cx = r.range(0, W);
    const cy = r.range(90, horizonY - 180);
    const w = r.range(140, 320);
    parts.push(
      g(
        [ellipse(cx, cy, w, w * 0.16, cloud), ellipse(cx - w * 0.35, cy + 8, w * 0.5, w * 0.12, cloud), ellipse(cx + w * 0.3, cy - 10, w * 0.45, w * 0.14, cloud)].join(""),
        `opacity="${f(r.range(0.35, 0.7))}"`,
      ),
    );
  }
  // A few birds
  if (r.chance(0.6)) {
    const bx = r.range(300, 1300);
    const by = r.range(150, 320);
    for (let i = 0; i < r.int(2, 5); i++) {
      const x = bx + r.range(-120, 120);
      const y = by + r.range(-40, 40);
      const sz = r.range(8, 14);
      parts.push(path(`M${f(x - sz)},${f(y)} Q${f(x - sz / 2)},${f(y - sz / 2)} ${f(x)},${f(y)} Q${f(x + sz / 2)},${f(y - sz / 2)} ${f(x + sz)},${f(y)}`, "none", `stroke="${darken(L.top, 0.5)}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"`));
    }
  }
  return parts.join("");
}

// ---------------------------------------------------------------- terrain helpers
function ridge(r: Rng, baseY: number, amp: number, count: number, jag = 0.5): [number, number][] {
  const pts: [number, number][] = [];
  let y = baseY + r.range(-amp, amp) * 0.4;
  for (let i = 0; i <= count; i++) {
    const x = (i / count) * (W + 200) - 100;
    y = baseY + (r.next() - 0.5) * amp * 2 * jag + (y - baseY) * (1 - jag);
    pts.push([x, y]);
  }
  return pts;
}

function peaks(r: Rng, baseY: number, height: number, n: number): [number, number][] {
  const pts: [number, number][] = [[-100, baseY]];
  const step = (W + 200) / n;
  for (let i = 0; i < n; i++) {
    const x0 = -100 + i * step;
    const px = x0 + step * r.range(0.3, 0.7);
    const py = baseY - height * r.range(0.45, 1);
    pts.push([x0 + step * 0.15, baseY - height * r.range(0.05, 0.3)]);
    pts.push([px - step * 0.08, py + height * r.range(0.05, 0.15)]);
    pts.push([px, py]);
    pts.push([px + step * 0.1, py + height * r.range(0.08, 0.2)]);
  }
  pts.push([W + 100, baseY]);
  return pts;
}

function snowCaps(points: [number, number][], baseY: number, height: number, color: string) {
  // Snow sits on the upper third of each summit.
  const out: string[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];
    if (y < prev[1] && y < next[1] && baseY - y > height * 0.45) {
      const depth = (baseY - y) * 0.32;
      const lx = x + (prev[0] - x) * (depth / Math.max(1, prev[1] - y));
      const rx = x + (next[0] - x) * (depth / Math.max(1, next[1] - y));
      out.push(poly([[x, y], [Math.min(x - 4, lx), y + depth], [x - (x - lx) * 0.4, y + depth * 0.7], [x, y + depth * 0.95], [x + (rx - x) * 0.45, y + depth * 0.75], [Math.max(x + 4, rx), y + depth]], color));
    }
  }
  return out.join("");
}

function pine(x: number, y: number, h: number, color: string) {
  const w = h * 0.36;
  const tiers = [0, 0.28, 0.52].map((t, i) =>
    poly([[x, y - h + t * h * 0.9], [x - w * (0.55 + i * 0.22), y - h * (0.42 - t * 0.55) ], [x + w * (0.55 + i * 0.22), y - h * (0.42 - t * 0.55)]], color),
  );
  return rect(x - h * 0.03, y - h * 0.12, h * 0.06, h * 0.14, darken(color, 0.3)) + tiers.join("");
}

function roundTree(x: number, y: number, r0: number, color: string, trunk = "#6b4a35") {
  return (
    rect(x - r0 * 0.08, y - r0 * 0.9, r0 * 0.16, r0 * 0.95, trunk) +
    circle(x, y - r0 * 1.5, r0, color) +
    circle(x - r0 * 0.55, y - r0 * 1.15, r0 * 0.7, darken(color, 0.06)) +
    circle(x + r0 * 0.6, y - r0 * 1.2, r0 * 0.68, lighten(color, 0.06))
  );
}

function cypress(x: number, y: number, h: number, color: string) {
  return ellipse(x, y - h / 2, h * 0.13, h / 2, color) + ellipse(x - h * 0.03, y - h * 0.55, h * 0.06, h * 0.38, lighten(color, 0.1), `opacity="0.5"`);
}

function palm(x: number, y: number, h: number, lean: number, trunk: string, leaf: string) {
  const tx = x + lean * h;
  const ty = y - h;
  const parts = [path(`M${f(x - 7)},${f(y)} Q${f(x + lean * h * 0.3)},${f(y - h * 0.5)} ${f(tx - 3)},${f(ty)} L${f(tx + 5)},${f(ty)} Q${f(x + lean * h * 0.3 + 10)},${f(y - h * 0.5)} ${f(x + 7)},${f(y)} Z`, trunk)];
  const fronds = [-150, -115, -70, -30, 10, 45];
  for (const a of fronds) {
    const rad = (a * Math.PI) / 180;
    const len = h * 0.42;
    const ex = tx + Math.cos(rad) * len;
    const ey = ty + Math.sin(rad) * len * 0.55 + len * 0.18;
    const cx = tx + Math.cos(rad) * len * 0.5;
    const cy = ty + Math.sin(rad) * len * 0.5 - len * 0.12;
    parts.push(path(`M${f(tx)},${f(ty)} Q${f(cx)},${f(cy - 14)} ${f(ex)},${f(ey)} Q${f(cx)},${f(cy + 10)} ${f(tx)},${f(ty)} Z`, leaf));
  }
  parts.push(circle(tx, ty + 6, 9, darken(trunk, 0.2)));
  return parts.join("");
}

function banana(x: number, y: number, h: number, leaf: string) {
  const parts = [rect(x - 8, y - h * 0.55, 16, h * 0.55, darken(leaf, 0.25))];
  for (const a of [-140, -100, -60, -25]) {
    const rad = (a * Math.PI) / 180;
    const ex = x + Math.cos(rad) * h * 0.55;
    const ey = y - h * 0.55 + Math.sin(rad) * h * 0.45;
    parts.push(path(`M${f(x)},${f(y - h * 0.55)} Q${f((x + ex) / 2 - 20)},${f((y - h * 0.55 + ey) / 2 - 40)} ${f(ex)},${f(ey)} Q${f((x + ex) / 2 + 20)},${f((y - h * 0.55 + ey) / 2 + 10)} ${f(x)},${f(y - h * 0.55)} Z`, leaf));
  }
  return parts.join("");
}

function water(s: Svg, L: Light, r: Rng, y0: number, y1 = H, color?: string) {
  const top = color ?? L.water;
  const parts = [rect(0, y0, W, y1 - y0, s.linear([[0, lighten(top, 0.12)], [1, L.waterDeep]]))];
  for (let i = 0; i < 26; i++) {
    const y = y0 + Math.pow(r.next(), 1.6) * (y1 - y0);
    const x = r.range(-50, W);
    const len = r.range(40, 160) * (0.5 + (y - y0) / (y1 - y0));
    parts.push(line(x, y, x + len, y, lighten(top, 0.35), 2.2, `opacity="${f(r.range(0.2, 0.5))}" stroke-linecap="round"`));
  }
  return parts.join("");
}

function glint(L: Light, x: number, y0: number, y1: number) {
  const parts: string[] = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    const y = y0 + (y1 - y0) * t * t;
    const w = 30 + t * 220;
    parts.push(rect(x - w / 2, y, w, 4 + t * 6, L.glint, `opacity="${f(0.55 - t * 0.35)}" rx="4"`));
  }
  return parts.join("");
}

function mountainRange(s: Svg, L: Light, r: Rng, opts: { snow?: boolean; base?: string; layers?: number; baseY?: number; height?: number; barren?: boolean }) {
  const base = opts.base ?? (opts.barren ? "#a9876a" : "#56708a");
  const baseY = opts.baseY ?? 640;
  const height = opts.height ?? 380;
  const layers = opts.layers ?? 3;
  const parts: string[] = [];
  for (let i = 0; i < layers; i++) {
    const depth = (layers - 1 - i) / Math.max(1, layers - 1); // 1 = far
    const by = baseY + i * 40;
    const pts = peaks(r, by, height * (1 - i * 0.28), r.int(3, 5) + i);
    const col = haze(mix(base, opts.barren ? "#8a6a52" : "#3e5568", i * 0.25), L, 0.15 + depth * 0.5);
    parts.push(path(ridgePath(pts, H, false), col));
    if (opts.snow && i < 2) parts.push(snowCaps(pts, by, height * (1 - i * 0.28), mix("#ffffff", L.haze, 0.15 + depth * 0.3)));
  }
  return parts.join("");
}

function hillLayers(s: Svg, L: Light, r: Rng, baseY: number, greens: string[], amp = 70) {
  const parts: string[] = [];
  greens.forEach((c, i) => {
    const depth = (greens.length - 1 - i) / Math.max(1, greens.length - 1);
    const pts = ridge(r, baseY + i * 70, amp * (1 - i * 0.15), 6 + i, 0.8);
    parts.push(path(ridgePath(pts), haze(c, L, depth * 0.45)));
  });
  return parts.join("");
}

function teaRows(s: Svg, L: Light, r: Rng, y0: number) {
  const pts = ridge(r, y0, 60, 5, 0.7);
  const d = ridgePath(pts);
  const clip = s.clip(`<path d="${d}"/>`);
  const rows: string[] = [path(d, shade("#5f9a4a", L))];
  for (let i = 0; i < 18; i++) {
    const y = y0 - 40 + i * 24;
    rows.push(path(`M-20,${f(y)} Q${f(W * 0.3)},${f(y - 40 + r.range(-10, 10))} ${f(W * 0.6)},${f(y + 10)} T${W + 20},${f(y - 20)}`, "none", `stroke="${shade("#3f7a37", L)}" stroke-width="11" stroke-linecap="round" stroke-dasharray="26 9"`));
  }
  return g(rows.join(""), `clip-path="${clip}"`);
}

function foregroundLawn(s: Svg, L: Light, y: number, color = "#6f9e4f") {
  return path(ridgePath([[-100, y + 10], [W * 0.4, y - 10], [W + 100, y + 6]]), s.linear([[0, shade(color, L)], [1, shade(darken(color, 0.25), L)]]));
}

// ---------------------------------------------------------------- built forms
function windowGrid(x: number, y: number, w: number, h: number, cols: number, rows: number, L: Light, r: Rng, glass = "#9bb7c6") {
  const parts: string[] = [];
  const cw = w / cols;
  const ch = h / rows;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const lit = r.chance(L.windows * 0.75);
      parts.push(rect(x + i * cw + cw * 0.18, y + j * ch + ch * 0.2, cw * 0.64, ch * 0.55, lit ? "#ffd58a" : mix(glass, L.haze, 0.2), lit ? `opacity="0.95"` : `opacity="0.85"`));
    }
  return parts.join("");
}

function skyline(s: Svg, L: Light, r: Rng, baseY: number, scale = 1, palette = ["#7b8794", "#8f9aa5", "#a3adb7", "#6a7683"]) {
  const parts: string[] = [];
  let x = -40;
  while (x < W + 40) {
    const w = r.range(70, 150) * scale;
    const h = r.range(120, 420) * scale;
    const col = haze(r.pick(palette), L, 0.25);
    parts.push(rect(x, baseY - h, w, h, col));
    if (r.chance(0.3)) parts.push(rect(x + w * 0.4, baseY - h - 30 * scale, w * 0.2, 30 * scale, col));
    parts.push(windowGrid(x, baseY - h, w, h, Math.max(2, Math.round(w / 30)), Math.max(3, Math.round(h / 34)), L, r));
    x += w + r.range(4, 20) * scale;
  }
  return parts.join("");
}

function domes(L: Light, x: number, baseY: number, scale: number, color: string) {
  const c = shade(color, L);
  return [
    rect(x - 90 * scale, baseY - 110 * scale, 180 * scale, 110 * scale, c),
    path(`M${f(x - 60 * scale)},${f(baseY - 110 * scale)} Q${f(x - 60 * scale)},${f(baseY - 220 * scale)} ${f(x)},${f(baseY - 250 * scale)} Q${f(x + 60 * scale)},${f(baseY - 220 * scale)} ${f(x + 60 * scale)},${f(baseY - 110 * scale)} Z`, lighten(c, 0.08)),
    rect(x - 3 * scale, baseY - 290 * scale, 6 * scale, 40 * scale, darken(c, 0.2)),
    ...[-1, 1].map((d) => rect(x + d * 120 * scale - 10 * scale, baseY - 230 * scale, 20 * scale, 230 * scale, lighten(c, 0.04))),
    ...[-1, 1].map((d) => path(`M${f(x + d * 120 * scale - 16 * scale)},${f(baseY - 230 * scale)} Q${f(x + d * 120 * scale)},${f(baseY - 270 * scale)} ${f(x + d * 120 * scale + 16 * scale)},${f(baseY - 230 * scale)} Z`, lighten(c, 0.1))),
    ...[-0.5, 0, 0.5].map((d) => path(`M${f(x + d * 120 * scale - 22 * scale)},${f(baseY)} L${f(x + d * 120 * scale - 22 * scale)},${f(baseY - 60 * scale)} Q${f(x + d * 120 * scale)},${f(baseY - 90 * scale)} ${f(x + d * 120 * scale + 22 * scale)},${f(baseY - 60 * scale)} L${f(x + d * 120 * scale + 22 * scale)},${f(baseY)} Z`, darken(c, 0.25))),
  ].join("");
}

function fortRidge(s: Svg, L: Light, r: Rng, baseY: number, color: string) {
  const hill = ridge(r, baseY - 60, 50, 5, 0.6);
  const parts = [path(ridgePath(hill), haze("#b08a5f", L, 0.3))];
  const x0 = r.range(300, 700);
  const wallTop = baseY - 170;
  parts.push(rect(x0, wallTop, 640, 130, haze(color, L, 0.2)));
  for (let i = 0; i < 16; i++) parts.push(rect(x0 + i * 40, wallTop - 16, 22, 16, haze(color, L, 0.2)));
  for (const bx of [x0 - 30, x0 + 300, x0 + 610]) {
    parts.push(rect(bx, wallTop - 70, 60, 200, haze(darken(color, 0.06), L, 0.2)));
    parts.push(path(`M${f(bx - 6)},${f(wallTop - 70)} Q${f(bx + 30)},${f(wallTop - 120)} ${f(bx + 66)},${f(wallTop - 70)} Z`, haze(lighten(color, 0.08), L, 0.2)));
  }
  for (let i = 0; i < 6; i++) parts.push(rect(x0 + 60 + i * 90, wallTop + 40, 18, 26, darken(color, 0.4), `opacity="0.5" rx="9"`));
  return parts.join("");
}

function hillTown(s: Svg, L: Light, r: Rng, baseY: number) {
  const parts = [path(ridgePath(ridge(r, baseY - 160, 90, 5, 0.8)), haze("#4f7b55", L, 0.25))];
  const colors = ["#e9d8b4", "#c95f4a", "#5a8fb0", "#f2efe6", "#e1a95f", "#9db0a0"];
  for (let i = 0; i < 70; i++) {
    const x = r.range(0, W);
    const hillY = baseY - 160 + Math.sin(x / 260) * 40 + r.range(-30, 120);
    const w = r.range(30, 60);
    const h = r.range(28, 60);
    const c = haze(r.pick(colors), L, 0.2);
    parts.push(rect(x, hillY, w, h, c));
    parts.push(poly([[x - 4, hillY], [x + w / 2, hillY - h * 0.35], [x + w + 4, hillY]], darken(c, 0.3)));
    if (r.chance(0.5)) parts.push(rect(x + w * 0.3, hillY + h * 0.35, w * 0.25, h * 0.3, L.windows > 0.5 ? "#ffd58a" : darken(c, 0.4)));
  }
  return parts.join("");
}

function pastelFacades(s: Svg, L: Light, r: Rng, baseY: number) {
  const parts: string[] = [];
  const colors = ["#f3d9a4", "#f1c6b5", "#cfe0d4", "#f6efe2", "#e9c46a", "#b9d3e3"];
  let x = -20;
  while (x < W) {
    const w = r.range(200, 300);
    const h = r.range(260, 360);
    const c = shade(r.pick(colors), L);
    parts.push(rect(x, baseY - h, w, h, c));
    parts.push(rect(x, baseY - h, w, 18, darken(c, 0.12)));
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 3; i++) {
        const wx = x + 24 + i * (w - 48) / 3;
        const wy = baseY - h + 50 + row * 130;
        parts.push(rect(wx, wy, (w - 48) / 3 - 18, 80, darken(c, 0.45), `rx="2"`));
        parts.push(rect(wx - 8, wy, 8, 80, shade("#4a7c6f", L)), rect(wx + (w - 48) / 3 - 18, wy, 8, 80, shade("#4a7c6f", L)));
      }
    if (r.chance(0.6)) for (let i = 0; i < 14; i++) parts.push(circle(x + r.range(0, w), baseY - h + r.range(0, 120), r.range(10, 22), shade(r.pick(["#d6336c", "#e64980", "#c2255c"]), L), `opacity="0.9"`));
    x += w + 6;
  }
  return parts.join("");
}

function arches(L: Light, y: number, h: number, color: string, count = 5, cusped = true) {
  const parts = [rect(0, y, W, h, shade(color, L))];
  const span = W / count;
  for (let i = 0; i < count; i++) {
    const cx = span * i + span / 2;
    const aw = span * 0.62;
    const top = y + h * 0.18;
    const spring = y + h * 0.42;
    const d = cusped
      ? `M${f(cx - aw / 2)},${y + h} L${f(cx - aw / 2)},${f(spring)} Q${f(cx - aw / 2)},${f(top + 20)} ${f(cx - aw / 4)},${f(top + 30)} Q${f(cx - aw / 8)},${f(top)} ${f(cx)},${f(top - 20)} Q${f(cx + aw / 8)},${f(top)} ${f(cx + aw / 4)},${f(top + 30)} Q${f(cx + aw / 2)},${f(top + 20)} ${f(cx + aw / 2)},${f(spring)} L${f(cx + aw / 2)},${y + h} Z`
      : `M${f(cx - aw / 2)},${y + h} L${f(cx - aw / 2)},${f(spring)} A${f(aw / 2)},${f(aw / 2)} 0 0 1 ${f(cx + aw / 2)},${f(spring)} L${f(cx + aw / 2)},${y + h} Z`;
    parts.push(path(d, shade(darken(color, 0.35), L)));
  }
  return parts.join("");
}

function poolDeck(s: Svg, L: Light, r: Rng, y: number, deck = "#e9dcc6") {
  const parts = [rect(0, y, W, H - y, shade(deck, L))];
  const px = 140;
  const pw = W - 280;
  const py = y + 60;
  const ph = H - py - 60;
  parts.push(rect(px - 14, py - 14, pw + 28, ph + 28, shade("#f4efe6", L), `rx="10"`));
  parts.push(rect(px, py, pw, ph, s.linear([[0, shade("#7fd3dc", L)], [1, shade("#2d9bb0", L)]]), `rx="6"`));
  for (let i = 0; i < 14; i++) {
    const x = r.range(px + 20, px + pw - 120);
    const yy = r.range(py + 10, py + ph - 10);
    parts.push(path(`M${f(x)},${f(yy)} q30,-10 60,0 t60,0`, "none", `stroke="#e8fbff" stroke-width="3" opacity="0.6" stroke-linecap="round"`));
  }
  for (let i = 0; i < 4; i++) {
    const lx = 180 + i * 360;
    const ly = y + 10;
    parts.push(rect(lx, ly + 20, 130, 22, shade("#ffffff", L), `rx="6"`), rect(lx, ly, 34, 30, shade("#f1f1f1", L), `rx="6"`));
    if (i % 2 === 0) {
      parts.push(line(lx + 170, ly + 40, lx + 170, ly - 120, shade("#7a6450", L), 5));
      parts.push(path(`M${lx + 90},${f(ly - 110)} Q${lx + 170},${f(ly - 170)} ${lx + 250},${f(ly - 110)} Z`, shade(r.pick(["#e6a64b", "#f4efe6", "#173f4f"]), L)));
    }
  }
  return parts.join("");
}

// ---------------------------------------------------------------- scenes
export function paintScene(s: Svg, key: SceneKey, tod: Tod, seed: string): string {
  const r = rng(`scene:${key}:${tod}:${seed}`);
  const L = LIGHT[tod];
  const out: string[] = [];
  const horizon = 640;
  out.push(sky(s, L, r, tod, horizon));

  switch (key) {
    case "himalaya": {
      out.push(mountainRange(s, L, r, { snow: true, layers: 3, baseY: 620, height: 430 }));
      out.push(hillLayers(s, L, r, 720, ["#3d6b52", "#2f5a44"], 50));
      for (let i = 0; i < 26; i++) {
        const x = r.range(-20, W + 20);
        out.push(pine(x, 900 + r.range(-60, 110), r.range(110, 220), shade(r.pick(["#24493a", "#1d3f32", "#2b5443"]), L)));
      }
      break;
    }
    case "high-desert": {
      out.push(mountainRange(s, L, r, { snow: true, barren: true, layers: 3, baseY: 650, height: 380, base: "#b48c69" }));
      out.push(path(ridgePath(ridge(r, 790, 40, 6, 0.5)), shade("#c9a77f", L)));
      const y = 600;
      out.push(path(`M80,${y} Q800,${y + 70} 1520,${y - 10}`, "none", `stroke="${shade("#5a4a3a", L)}" stroke-width="2"`));
      for (let i = 0; i < 30; i++) {
        const t = i / 30;
        const x = 80 + t * 1440;
        const yy = y + Math.sin(t * Math.PI) * 60 - t * 10;
        out.push(rect(x, yy, 26, 34, ["#d94841", "#f2c94c", "#2d6c91", "#f4f4f4", "#3f9d55"][i % 5], `opacity="0.9"`));
      }
      out.push(rect(1080, 760, 180, 110, shade("#efe7da", L)), rect(1080, 748, 180, 14, shade("#7a4b2f", L)), rect(1110, 790, 30, 40, shade("#5a3a28", L)), rect(1190, 790, 30, 40, shade("#5a3a28", L)));
      break;
    }
    case "green-hills":
    case "tea-hills": {
      out.push(mountainRange(s, L, r, { layers: 1, baseY: 520, height: 200, base: "#6d8f9a" }));
      out.push(hillLayers(s, L, r, 520, ["#7fa38a", "#5e8f67", "#4c7f52"], 130));
      if (key === "tea-hills") out.push(teaRows(s, L, r, 760));
      else out.push(hillLayers(s, L, r, 820, ["#4f8a45"], 50));
      for (let i = 0; i < 10; i++) out.push(roundTree(r.range(0, W), r.range(900, 1000), r.range(24, 46), shade("#2f6b3d", L)));
      if (r.chance(0.5)) out.push(rect(0, 520, W, 120, L.haze, `opacity="0.35"`));
      break;
    }
    case "valley": {
      out.push(mountainRange(s, L, r, { snow: r.chance(0.5), layers: 2, baseY: 560, height: 300 }));
      const left = [[-100, 500], [300, 560], [620, 760], [760, 1000]] as [number, number][];
      const right = [[840, 1000], [1000, 760], [1300, 560], [1700, 520]] as [number, number][];
      out.push(path(`M-100,1000 L-100,500 Q300,560 620,760 T760,1000 Z`, haze("#4d7c56", L, 0.1)));
      out.push(path(`M1700,1000 L1700,520 Q1300,560 1000,760 T840,1000 Z`, haze("#557f5a", L, 0.1)));
      out.push(path(`M760,1000 Q700,860 800,760 T780,600 L820,600 Q880,700 840,800 T840,1000 Z`, s.linear([[0, L.water], [1, L.waterDeep]])));
      for (const [x, y] of [...left, ...right].slice(1, -1)) out.push(pine(x, y + 60, 120, shade("#29513f", L)));
      for (let i = 0; i < 14; i++) out.push(pine(r.pick([r.range(0, 600), r.range(1000, W)]), r.range(820, 1000), r.range(120, 200), shade("#21463a", L)));
      break;
    }
    case "meadow": {
      out.push(mountainRange(s, L, r, { snow: true, layers: 2, baseY: 600, height: 360 }));
      out.push(path(ridgePath(ridge(r, 700, 30, 5, 0.5)), s.linear([[0, shade("#9cc46a", L)], [1, shade("#5c9440", L)]])));
      for (let i = 0; i < 160; i++) out.push(circle(r.range(0, W), r.range(740, 1000), r.range(3, 7), shade(r.pick(["#f7f1d0", "#f2c94c", "#e07a9b", "#ffffff"]), L)));
      for (let i = 0; i < 12; i++) out.push(pine(r.range(0, W), r.range(700, 760), r.range(90, 150), shade("#2b5443", L)));
      break;
    }
    case "boulders": {
      out.push(path(ridgePath(ridge(r, 600, 40, 6, 0.4)), haze("#c58f5a", L, 0.4)));
      for (let i = 0; i < 40; i++) {
        const x = r.range(-40, W + 40);
        const y = r.range(560, 860);
        const rr = r.range(40, 120) * (0.6 + (y - 560) / 400);
        out.push(ellipse(x, y, rr, rr * r.range(0.6, 0.85), haze(r.pick(["#c7915b", "#b37c49", "#d4a06b"]), L, 0.15)));
        out.push(ellipse(x - rr * 0.25, y - rr * 0.25, rr * 0.4, rr * 0.2, lighten("#e3b685", 0.2), `opacity="0.35"`));
      }
      out.push(rect(0, 860, W, 140, shade("#6e9a49", L)));
      for (let i = 0; i < 9; i++) out.push(banana(r.range(0, W), 1000, r.range(200, 300), shade("#4d8f3c", L)));
      break;
    }
    case "lake-hills":
    case "lake-palace":
    case "backwater": {
      const shore = key === "backwater" ? 620 : 600;
      if (key === "backwater") {
        out.push(rect(0, shore - 40, W, 50, haze("#3f7a3c", L, 0.3)));
        for (let i = 0; i < 18; i++) out.push(palm(r.range(0, W), shore + 5, r.range(120, 200), r.range(-0.2, 0.2), haze("#6b5440", L, 0.3), haze("#3c7a3a", L, 0.3)));
      } else {
        out.push(mountainRange(s, L, r, { snow: key === "lake-hills" && r.chance(0.4), layers: 2, baseY: 560, height: 280, base: "#5d7f8a" }));
        out.push(hillLayers(s, L, r, 540, ["#4f7d62", "#3d6b50"], 60));
        for (let i = 0; i < 16; i++) out.push(pine(r.range(0, W), shore + r.range(-6, 4), r.range(50, 90), haze("#2b5443", L, 0.2)));
      }
      if (key === "lake-palace") {
        out.push(rect(0, shore - 120, W, 130, haze("#c9b48f", L, 0.4)));
        out.push(domes(L, 1100, shore, 0.6, haze("#efe5d2", L, 0.25)));
        out.push(domes(L, 420, shore - 10, 0.45, haze("#e8dcc4", L, 0.35)));
      }
      out.push(water(s, L, r, shore, H, key === "backwater" ? mix(L.water, "#4f7f5f", 0.35) : undefined));
      out.push(g(path(ridgePath(ridge(r, shore + 60, 30, 6, 0.5), shore + 140), darken(L.water, 0.15)), `opacity="0.35"`));
      out.push(glint(L, r.range(500, 1100), shore + 10, H - 120));
      if (key === "backwater") {
        // Kettuvallam houseboat
        const bx = r.range(300, 900);
        out.push(path(`M${bx},800 Q${bx + 260},850 ${bx + 520},790 L${bx + 500},820 Q${bx + 260},880 ${bx + 20},830 Z`, shade("#5b3a24", L)));
        out.push(path(`M${bx + 60},800 Q${bx + 260},700 ${bx + 460},795 Z`, shade("#c9a46a", L)));
        out.push(path(`M${bx + 90},798 Q${bx + 260},730 ${bx + 430},793`, "none", `stroke="${shade("#8a6a3e", L)}" stroke-width="4"`));
      } else {
        const bx = r.range(250, 1250);
        out.push(path(`M${bx},820 Q${bx + 90},850 ${bx + 200},812 L${bx + 196},826 Q${bx + 90},866 ${bx + 6},834 Z`, shade("#7a3e2b", L)));
        out.push(rect(bx + 70, 770, 70, 44, shade("#e8d5b0", L)), path(`M${bx + 60},772 Q${bx + 105},748 ${bx + 150},772 Z`, shade("#a3382f", L)));
      }
      break;
    }
    case "river-ghats": {
      out.push(hillLayers(s, L, r, 470, ["#8aa59a"], 50));
      const bank = 610;
      out.push(rect(0, bank - 120, 760, 140, shade("#d9c3a0", L)));
      for (let i = 0; i < 10; i++) out.push(rect(0, bank - 120 + i * 14, 760 - i * 8, 6, shade("#bfa47e", L)));
      for (const [x, s2] of [[120, 0.5], [330, 0.65], [560, 0.45]] as [number, number][]) {
        out.push(rect(x - 40 * s2 * 2, bank - 120 - 160 * s2, 160 * s2, 160 * s2, shade("#e2c49b", L)));
        out.push(poly([[x - 40 * s2 * 2, bank - 120 - 160 * s2], [x, bank - 120 - 360 * s2], [x + 80 * s2, bank - 120 - 160 * s2]], shade("#d8a46f", L)));
      }
      out.push(water(s, L, r, bank, H, mix(L.water, "#7e8f6b", 0.25)));
      out.push(glint(L, 1100, bank + 20, H - 100));
      for (let i = 0; i < 3; i++) {
        const bx = r.range(200, 1200);
        const by = r.range(760, 900);
        out.push(path(`M${f(bx)},${f(by)} Q${f(bx + 90)},${f(by + 26)} ${f(bx + 190)},${f(by - 4)} L${f(bx + 180)},${f(by + 12)} Q${f(bx + 90)},${f(by + 40)} ${f(bx + 8)},${f(by + 14)} Z`, shade("#3e5a7a", L)));
      }
      break;
    }
    case "tropical-sea":
    case "island-sea":
    case "city-sea": {
      const hz = key === "city-sea" ? 560 : 590;
      if (key === "island-sea") out.push(path(`M1000,${hz} Q1180,${hz - 120} 1400,${hz} Z`, haze("#2f6b4a", L, 0.35)));
      if (key === "city-sea") out.push(skyline(s, L, r, hz, 0.45));
      out.push(water(s, L, r, hz, H, key === "island-sea" ? "#2cb5c0" : undefined));
      if (key === "island-sea") out.push(rect(0, 820, W, 60, "#7fe0d8", `opacity="0.45"`));
      out.push(glint(L, r.range(500, 1000), hz + 6, 880));
      if (key === "city-sea") {
        out.push(path(`M-50,1000 Q600,820 1700,880 L1700,1000 Z`, shade("#cfc5b5", L)));
        for (let i = 0; i < 26; i++) out.push(circle(i * 66, 850 + Math.sin(i / 4) * 20, 6, L.windows > 0.5 ? "#ffd58a" : "#fff7e0", `opacity="${L.windows > 0.5 ? 1 : 0.5}"`));
      } else {
        out.push(path(`M-50,1000 L-50,880 Q500,830 1000,900 T1700,860 L1700,1000 Z`, s.linear([[0, shade("#f1dfb9", L)], [1, shade("#dcc495", L)]])));
        out.push(path(`M-50,880 Q500,830 1000,900 T1700,860`, "none", `stroke="#ffffff" stroke-width="5" opacity="0.6"`));
        out.push(palm(110, 1010, 430, 0.22, shade("#8a6a4c", L), shade("#2f7a46", L)));
        out.push(palm(1500, 1010, 380, -0.25, shade("#7d6046", L), shade("#2e6e43", L)));
      }
      break;
    }
    case "garden":
    case "pine-garden":
    case "chinar-garden":
    case "rose-garden":
    case "coffee-garden":
    case "tropical-garden":
    case "banana-garden":
    case "mughal-garden": {
      out.push(hillLayers(s, L, r, 560, ["#8fae96"], 50));
      out.push(foregroundLawn(s, L, 640, key === "mughal-garden" ? "#79a85a" : "#6f9e4f"));
      if (key === "mughal-garden") {
        out.push(poly([[760, 640], [840, 640], [1100, 1000], [500, 1000]], shade("#5fb0c4", L)));
        for (let i = 0; i < 6; i++) {
          const t = i / 6;
          out.push(circle(800 + 0, 660 + t * 320, 6 + t * 10, "#e8fbff", `opacity="0.8"`));
          const off = 120 + t * 420;
          out.push(cypress(800 - off, 680 + t * 330, 140 + t * 220, shade("#2f5f3a", L)), cypress(800 + off, 680 + t * 330, 140 + t * 220, shade("#2f5f3a", L)));
        }
        out.push(domes(L, 800, 640, 0.35, haze("#f2ede3", L, 0.2)));
      } else {
        const make = (x: number, y: number, size: number) => {
          switch (key) {
            case "pine-garden":
              return pine(x, y, size * 3.6, shade("#2b5443", L));
            case "chinar-garden":
              return roundTree(x, y, size * 1.2, shade(r.pick(["#d9822b", "#c8642a", "#e3a23b"]), L));
            case "rose-garden":
              return ellipse(x, y - size * 0.4, size * 0.9, size * 0.5, shade("#3f7a3c", L)) + [0, 1, 2, 3, 4].map(() => circle(x + r.range(-size * 0.7, size * 0.7), y - size * r.range(0.3, 0.7), size * 0.12, shade(r.pick(["#e64980", "#f783ac", "#d6336c", "#fff0f6"]), L))).join("");
            case "coffee-garden":
              return roundTree(x, y - size * 0.2, size * 0.9, shade("#2c5a2e", L)) + ellipse(x, y - size * 0.5, size * 1.1, size * 0.7, shade("#2c5a2e", L)) + [0, 1, 2].map(() => circle(x + r.range(-size * 0.5, size * 0.5), y - size * r.range(0.3, 0.8), size * 0.06, shade("#b3261e", L))).join("");
            case "tropical-garden":
              return r.chance(0.5) ? palm(x, y, size * 4, r.range(-0.15, 0.15), shade("#7d6046", L), shade("#2e7a46", L)) : roundTree(x, y, size, shade("#3e8a4a", L));
            case "banana-garden":
              return banana(x, y, size * 3.2, shade("#4d8f3c", L));
            default:
              return roundTree(x, y, size, shade(r.pick(["#4b8a45", "#5c9a4e", "#3f7a3c"]), L));
          }
        };
        const trees: [number, number, number][] = [];
        for (let i = 0; i < 14; i++) trees.push([r.range(-40, W + 40), r.range(660, 1000), r.range(36, 70)]);
        trees.sort((a, b) => a[1] - b[1]);
        for (const [x, y, sz] of trees) out.push(make(x, y, sz * (0.6 + (y - 640) / 500)));
        if (key === "garden" || key === "rose-garden")
          for (let i = 0; i < 80; i++) out.push(circle(r.range(0, W), r.range(760, 1000), r.range(3, 6), shade(r.pick(["#f2c94c", "#ffffff", "#e07a9b"]), L)));
      }
      break;
    }
    case "city": {
      out.push(skyline(s, L, r, 700, 0.8, ["#5b6b7c", "#6d7d8d", "#8796a4"]));
      out.push(skyline(s, L, r, 860, 1.05, ["#3f4b59", "#4c5a69", "#576677"]));
      out.push(rect(0, 860, W, 140, shade("#2f3a45", L)));
      for (let i = 0; i < 40; i++) out.push(rect(r.range(0, W), r.range(900, 980), r.range(20, 60), 6, r.chance(0.5) ? "#ffd58a" : "#ff8a7a", `opacity="${L.windows > 0.5 ? 0.9 : 0.35}" rx="3"`));
      break;
    }
    case "hill-town": {
      out.push(mountainRange(s, L, r, { snow: true, layers: 2, baseY: 520, height: 300 }));
      out.push(hillTown(s, L, r, 900));
      break;
    }
    case "heritage-city":
    case "blue-city": {
      out.push(fortRidge(s, L, r, 560, key === "blue-city" ? "#b98a5c" : "#c98b5b"));
      const colors = key === "blue-city" ? ["#5e8fc9", "#7aa6d6", "#4a79b8", "#a9c6e8", "#f2efe6"] : ["#e7a77b", "#f0c6a0", "#d98a6a", "#f3dcc0"];
      for (let row = 0; row < 4; row++)
        for (let i = 0; i < 22; i++) {
          const x = i * 76 + r.range(-20, 20) + (row % 2) * 30;
          const y = 640 + row * 90 + r.range(-10, 10);
          const w = r.range(60, 90);
          const h = r.range(60, 100);
          const c = haze(r.pick(colors), L, 0.1 - row * 0.02);
          out.push(rect(x, y, w, h, c), rect(x, y - 6, w, 6, darken(c, 0.15)), rect(x + w * 0.35, y + h * 0.3, w * 0.22, h * 0.32, L.windows > 0.5 ? "#ffd58a" : darken(c, 0.4), `rx="6"`));
        }
      if (key === "heritage-city") out.push(domes(L, r.range(1000, 1300), 700, 0.55, haze("#f2ead8", L, 0.15)));
      break;
    }
    case "french-quarter": {
      out.push(pastelFacades(s, L, r, 900));
      out.push(rect(0, 900, W, 100, shade("#cbbba1", L)));
      for (let i = 0; i < 8; i++) out.push(roundTree(r.range(0, W), 990, r.range(40, 60), shade("#3f7a3c", L)));
      break;
    }
    case "courtyard":
    case "courtyard-colonial": {
      const colonial = key === "courtyard-colonial";
      const wall = colonial ? "#f4efe4" : "#e2b07e";
      out.push(arches(L, 300, 420, wall, 5, !colonial));
      out.push(rect(0, 260, W, 50, shade(darken(wall, 0.1), L)));
      if (!colonial) for (let i = 0; i < 5; i++) out.push(domes(L, 160 + i * 320, 300, 0.18, shade(lighten(wall, 0.05), L)));
      out.push(rect(0, 720, W, 280, shade(colonial ? "#d8cdb9" : "#e9d7b5", L)));
      for (let i = 0; i < 12; i++) out.push(line(i * 140, 720, i * 220 - 600, 1000, shade(darken(colonial ? "#d8cdb9" : "#e9d7b5", 0.15), L), 2));
      // Central fountain / tree
      if (colonial) out.push(roundTree(800, 900, 110, shade("#3f7a3c", L)), ...[0, 1, 2, 3, 4, 5].map(() => circle(800 + r.range(-120, 120), 650 + r.range(-80, 60), 10, "#fff4e0")));
      else {
        out.push(ellipse(800, 880, 260, 60, shade("#c7a274", L)), ellipse(800, 872, 230, 46, s.linear([[0, "#7fd3dc"], [1, "#3b9bb0"]])), rect(790, 760, 20, 110, shade("#d9c19b", L)), ellipse(800, 760, 40, 14, shade("#d9c19b", L)));
        for (let i = 0; i < 6; i++) out.push(path(`M800,755 Q${800 + (i - 2.5) * 30},${700} ${800 + (i - 2.5) * 50},${850}`, "none", `stroke="#e8fbff" stroke-width="3" opacity="0.7"`));
      }
      for (const x of [140, 1460]) out.push(rect(x - 40, 860, 80, 80, shade("#b4643c", L), `rx="10"`), ellipse(x, 840, 70, 50, shade("#3f7a3c", L)));
      break;
    }
    case "pool-tropical":
    case "pool-hills":
    case "pool-courtyard":
    case "pool-rooftop": {
      if (key === "pool-hills") out.push(hillLayers(s, L, r, 460, ["#7b9c88", "#5e8a6a"], 70));
      if (key === "pool-tropical") {
        out.push(rect(0, 540, W, 80, haze("#3f7a3c", L, 0.3)));
        for (let i = 0; i < 8; i++) out.push(palm(r.range(0, W), 620, r.range(220, 320), r.range(-0.2, 0.2), shade("#7d6046", L), shade("#2e7a46", L)));
      }
      if (key === "pool-courtyard") out.push(arches(L, 220, 400, "#e2b07e", 6, true));
      if (key === "pool-rooftop") out.push(skyline(s, L, r, 620, 0.7));
      out.push(poolDeck(s, L, r, 600));
      break;
    }
    default: {
      out.push(foregroundLawn(s, L, 700));
    }
  }
  return out.join("");
}
