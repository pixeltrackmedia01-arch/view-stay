import { VIEW_LABELS } from "./catalog-types";
import type { ExplorerRoom } from "./explorer-types";

export interface Recommendation {
  room: ExplorerRoom;
  title: string;
  reasons: string[];
}

const viewWord = (r: ExplorerRoom) => VIEW_LABELS[r.viewType].replace(" view", "").toLowerCase();

/**
 * Explainable, rule-based picks from available rooms (no AI involved): best outlook, best value and most space.
 * Each reason is derived from the room's stored attributes, live availability and price.
 */
export function recommendRooms(rooms: ExplorerRoom[], candidates: ExplorerRoom[]): Recommendation[] {
  const available = candidates.filter((r) => r.status === "AVAILABLE");
  if (!available.length) return [];
  const maxLevel = Math.max(...rooms.map((r) => r.level));
  const sizes = available.map((r) => r.sizeSqm).sort((a, b) => a - b);
  const medianSize = sizes[Math.floor(sizes.length / 2)];
  const cheapest = Math.min(...available.map((r) => r.nightlyRate));
  const picks: Recommendation[] = [];
  const used = new Set<string>();

  const best = [...available].sort((a, b) => b.viewScore + b.level * 2 + (b.hasBalcony ? 4 : 0) - (a.viewScore + a.level * 2 + (a.hasBalcony ? 4 : 0)))[0];
  if (best) {
    const reasons = [`${best.level >= maxLevel - 1 && maxLevel > 1 ? "Higher floor" : `Floor ${best.level}`} with a ${viewWord(best)}-facing window (view score ${best.viewScore}/100)`];
    if (best.hasBalcony) reasons.push("Private balcony on the view side");
    if (best.isCorner) reasons.push("Corner room with two window orientations");
    if (!best.nearElevator) reasons.push("Away from the lift lobby");
    picks.push({ room: best, title: "Best outlook", reasons });
    used.add(best.id);
  }

  const value = [...available].filter((r) => !used.has(r.id)).sort((a, b) => a.nightlyRate - b.nightlyRate || b.viewScore - a.viewScore)[0];
  if (value) {
    const reasons = [value.nightlyRate === cheapest ? "Lowest price among available rooms" : "One of the lowest prices available"];
    reasons.push(`${VIEW_LABELS[value.viewType]} · view score ${value.viewScore}/100`);
    if (value.hasBalcony) reasons.push("Still includes a balcony");
    picks.push({ room: value, title: "Best value", reasons });
    used.add(value.id);
  }

  const space = [...available].filter((r) => !used.has(r.id)).sort((a, b) => b.sizeSqm - a.sizeSqm || b.viewScore - a.viewScore)[0];
  if (space && space.sizeSqm >= medianSize) {
    const reasons = [`${space.sizeSqm} m², larger than most available rooms`];
    if (space.hasBalcony) reasons.push("Includes a balcony and a larger room area");
    if (space.isCorner) reasons.push("Corner room with two window orientations");
    reasons.push(`Sleeps up to ${space.maxGuests}`);
    picks.push({ room: space, title: "Most space", reasons });
  }
  return picks;
}
