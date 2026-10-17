import type { BadgeTone } from "@/components/ui/badge";

export const VIEW_LABELS: Record<string, string> = {
  SEA: "Sea view",
  MOUNTAIN: "Mountain view",
  CITY: "City view",
  GARDEN: "Garden view",
  POOL: "Pool view",
  COURTYARD: "Courtyard view",
  NONE: "No view",
};

export const BOOKING_STATUS_TONE: Record<string, BadgeTone> = {
  CONFIRMED: "green",
  COMPLETED: "blue",
  CANCELLED: "rose",
};

export const HOTEL_STATUS_TONE: Record<string, BadgeTone> = {
  APPROVED: "green",
  PENDING: "amber",
  SUSPENDED: "rose",
};

export const ROOM_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "green",
  MAINTENANCE: "amber",
  INACTIVE: "slate",
};
