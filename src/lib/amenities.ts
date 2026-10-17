/** Canonical amenity vocabulary. Hotels store these labels; search filters and icons key off them. */
export const AMENITIES = [
  "Free Wi-Fi",
  "Breakfast available",
  "Restaurant",
  "Room service",
  "Swimming pool",
  "Spa",
  "Fitness centre",
  "Parking",
  "Airport transfer",
  "Pet-friendly",
  "Yoga deck",
  "Bonfire area",
  "Rooftop terrace",
  "Kids' club",
  "EV charging",
  "Wheelchair accessible",
] as const;
export type Amenity = (typeof AMENITIES)[number];

/** Short list shown as search filters. */
export const FILTER_AMENITIES: Amenity[] = ["Free Wi-Fi", "Breakfast available", "Swimming pool", "Spa", "Parking", "Pet-friendly", "Airport transfer", "Fitness centre"];
