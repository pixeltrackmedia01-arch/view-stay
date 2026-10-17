/** Minimal SVG document builder used by the illustrative image library. */

export const W = 1600;
export const H = 1000;

type Stop = [offset: number, color: string, opacity?: number];

export class Svg {
  private defs: string[] = [];
  private body: string[] = [];
  private n = 0;

  constructor(
    readonly width = W,
    readonly height = H,
    readonly title = "",
  ) {}

  id(prefix = "g") {
    return `${prefix}${(this.n++).toString(36)}`;
  }

  linear(stops: Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
    const id = this.id("l");
    this.defs.push(
      `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
        .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`)
        .join("")}</linearGradient>`,
    );
    return `url(#${id})`;
  }

  radial(stops: Stop[], cx = 0.5, cy = 0.5, r = 0.5): string {
    const id = this.id("r");
    this.defs.push(
      `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
        .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`)
        .join("")}</radialGradient>`,
    );
    return `url(#${id})`;
  }

  blur(std: number): string {
    const id = this.id("f");
    this.defs.push(`<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${std}"/></filter>`);
    return `url(#${id})`;
  }

  clip(content: string): string {
    const id = this.id("c");
    this.defs.push(`<clipPath id="${id}">${content}</clipPath>`);
    return `url(#${id})`;
  }

  add(...parts: string[]) {
    this.body.push(...parts);
    return this;
  }

  toString() {
    const title = this.title ? `<title>${esc(this.title)}</title>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" preserveAspectRatio="xMidYMid slice">${title}<defs>${this.defs.join("")}</defs>${this.body.join("")}</svg>`;
  }
}

export function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export const f = (n: number) => Math.round(n * 10) / 10;

export function rect(x: number, y: number, w: number, h: number, fill: string, extra = "") {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

export function poly(points: [number, number][], fill: string, extra = "") {
  return `<polygon points="${points.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

export function path(d: string, fill: string, extra = "") {
  return `<path d="${d}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

export function circle(cx: number, cy: number, r: number, fill: string, extra = "") {
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, extra = "") {
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 2, extra = "") {
  return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? " " + extra : ""}/>`;
}

export function g(content: string, attrs = "") {
  return `<g${attrs ? " " + attrs : ""}>${content}</g>`;
}

/** Embed a 1600x1000 drawing inside a target rectangle, cropping to fill. */
export function frame(x: number, y: number, w: number, h: number, content: string) {
  return `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${content}</svg>`;
}

/** Smooth closed path through ridge points down to the bottom edge. */
export function ridgePath(points: [number, number][], bottom = H, smooth = true): string {
  if (!points.length) return "";
  let d = `M${f(points[0][0])},${bottom} L${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    if (smooth) {
      const [px, py] = points[i - 1];
      const mx = (px + x) / 2;
      const my = (py + y) / 2;
      d += ` Q${f(px)},${f(py)} ${f(mx)},${f(my)}`;
      if (i === points.length - 1) d += ` T${f(x)},${f(y)}`;
    } else {
      d += ` L${f(x)},${f(y)}`;
    }
  }
  d += ` L${f(points[points.length - 1][0])},${bottom} Z`;
  return d;
}

// ---- colour helpers ----
function hex(c: string): [number, number, number] {
  const v = c.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function toHex(rgb: [number, number, number]) {
  return "#" + rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("");
}
export function mix(a: string, b: string, t: number) {
  const A = hex(a);
  const B = hex(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}
export const darken = (c: string, t: number) => mix(c, "#000000", t);
export const lighten = (c: string, t: number) => mix(c, "#ffffff", t);
