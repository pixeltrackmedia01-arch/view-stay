import { contains, overlaps, type Rect } from "./geometry";

export interface LayoutIssue {
  room: string;
  message: string;
}

/** Pure validation of a floor layout; shared by the editor (client preview) and the save endpoint. */
export function validateLayout(floor: { width: number; height: number; wings: Rect[] }, solids: Rect[], rooms: (Rect & { number: string })[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const insideWings = (r: Rect) => {
    for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) if (!floor.wings.some((w) => contains(w, { x, y, w: 1, h: 1 }))) return false;
    return true;
  };
  const seen = new Set<string>();
  rooms.forEach((r, i) => {
    if (seen.has(r.number)) issues.push({ room: r.number, message: `Room number ${r.number} is used twice` });
    seen.add(r.number);
    if (r.x + r.w > floor.width || r.y + r.h > floor.height) issues.push({ room: r.number, message: `Room ${r.number} extends beyond the floor plate` });
    else if (floor.wings.length && !insideWings(r)) issues.push({ room: r.number, message: `Room ${r.number} sits outside the building footprint` });
    for (const s of solids) if (overlaps(r, s)) issues.push({ room: r.number, message: `Room ${r.number} overlaps a corridor, lift or stairs` });
    for (let j = i + 1; j < rooms.length; j++) if (overlaps(r, rooms[j])) issues.push({ room: r.number, message: `Rooms ${r.number} and ${rooms[j].number} overlap` });
  });
  return issues;
}

