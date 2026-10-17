/** Axis-aligned rectangle helpers in floor-plan grid units. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function contains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

/** a minus b, returned as up to four non-overlapping rectangles. */
export function subtract(a: Rect, b: Rect): Rect[] {
  if (!overlaps(a, b)) return [a];
  const out: Rect[] = [];
  const top = b.y - a.y;
  if (top > 0) out.push({ x: a.x, y: a.y, w: a.w, h: top });
  const bottom = a.y + a.h - (b.y + b.h);
  if (bottom > 0) out.push({ x: a.x, y: b.y + b.h, w: a.w, h: bottom });
  const y0 = Math.max(a.y, b.y);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  const left = b.x - a.x;
  if (left > 0) out.push({ x: a.x, y: y0, w: left, h: y1 - y0 });
  const right = a.x + a.w - (b.x + b.w);
  if (right > 0) out.push({ x: b.x + b.w, y: y0, w: right, h: y1 - y0 });
  return out;
}

/** Parts of `rects` not covered by any of `cover`. */
export function subtractAll(rects: Rect[], cover: Rect[]): Rect[] {
  let rest = rects;
  for (const c of cover) rest = rest.flatMap((r) => subtract(r, c));
  return rest.filter((r) => r.w > 0 && r.h > 0);
}

export function bounds(rects: Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
