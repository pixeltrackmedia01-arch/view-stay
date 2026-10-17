import type { RoomAvailability } from "@/lib/explorer-types";

/** Visual encoding of room availability. Colour is always paired with a pattern, icon or text label. */
export const STATUS_FILL: Record<RoomAvailability, string> = {
  AVAILABLE: "#ffffff",
  HELD_BY_YOU: "#fbf2e3",
  HELD: "#fbefe0",
  BOOKED: "#dfe3e5",
  BLOCKED: "#e8edeb",
  UNAVAILABLE: "#e8edeb",
  TOO_SMALL: "#f0f3f2",
};

export const STATUS_STROKE: Record<RoomAvailability, string> = {
  AVAILABLE: "#287a59",
  HELD_BY_YOU: "#c98930",
  HELD: "#b66a16",
  BOOKED: "#a6afb3",
  BLOCKED: "#a6afb3",
  UNAVAILABLE: "#a6afb3",
  TOO_SMALL: "#a6afb3",
};

/** 3D colours (availability colour mode). */
export const STATUS_3D: Record<RoomAvailability, string> = {
  AVAILABLE: "#5fae8a",
  HELD_BY_YOU: "#e6a64b",
  HELD: "#d39a4f",
  BOOKED: "#b8bfc2",
  BLOCKED: "#9aa3a7",
  UNAVAILABLE: "#9aa3a7",
  TOO_SMALL: "#c9cfd1",
};

export const SELECTED_COLOR = "#e6a64b";
