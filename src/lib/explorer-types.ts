/** Data contract shared by the 3D explorer, 2D floor plan, room list and gallery (one source of truth). */
import type { HotelTemplateKey, RoomCategoryKey, SideKey, ViewKey } from "./catalog-types";
import type { Rect } from "./layout/geometry";

export type RoomAvailability = "AVAILABLE" | "BOOKED" | "HELD" | "HELD_BY_YOU" | "BLOCKED" | "UNAVAILABLE" | "TOO_SMALL";

export const SELECTABLE: ReadonlySet<RoomAvailability> = new Set(["AVAILABLE", "HELD_BY_YOU"]);

export const AVAILABILITY_LABEL: Record<RoomAvailability, string> = {
  AVAILABLE: "Available",
  HELD_BY_YOU: "Held for you",
  HELD: "On hold",
  BOOKED: "Booked",
  BLOCKED: "Closed",
  UNAVAILABLE: "Out of service",
  TOO_SMALL: "Too small for your party",
};

export interface ExplorerRoom extends Rect {
  id: string;
  number: string;
  floorId: string;
  level: number;
  status: RoomAvailability;
  holdGroupId: string | null;
  category: RoomCategoryKey;
  roomTypeId: string;
  roomTypeName: string;
  bedType: string;
  maxGuests: number;
  sizeSqm: number;
  viewType: ViewKey;
  viewScore: number;
  viewVerified: boolean;
  hasBalcony: boolean;
  isCorner: boolean;
  windowCount: number;
  windowSide: SideKey;
  secondaryWindowSide: SideKey | null;
  balconySide: SideKey | null;
  nearElevator: boolean;
  accessible: boolean;
  notes: string | null;
  amenities: string[];
  nightlyRate: number;
  stayTotal: number;
  photoCount: number;
  primaryPhoto: { path: string; alt: string } | null;
}

export interface ExplorerElement extends Rect {
  id: string;
  kind: string;
  label: string;
}

export interface ExplorerFloor {
  id: string;
  level: number;
  name: string;
  width: number;
  height: number;
  wings: Rect[];
  elements: ExplorerElement[];
}

export interface ExplorerData {
  hotel: { id: string; slug: string; name: string; template: HotelTemplateKey; palette: number; frontView: ViewKey; backView: ViewKey | null; destination: string };
  stay: { checkIn: string; checkOut: string; guests: number; rooms: number; nights: number };
  floors: ExplorerFloor[];
  rooms: ExplorerRoom[];
}

export interface RoomPhotoDTO {
  id: string;
  category: string;
  categoryLabel: string;
  path: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  illustrative: boolean;
  isPrimary: boolean;
}
