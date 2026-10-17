/** Shared, framework-free catalogue vocabulary used by seed data, media generation, 2D plans and the 3D explorer. */

export const VIEW_KEYS = ["SEA", "LAKE", "RIVER", "MOUNTAIN", "VALLEY", "GARDEN", "CITY", "COURTYARD", "POOL", "NONE"] as const;
export type ViewKey = (typeof VIEW_KEYS)[number];

export const HOTEL_TEMPLATES = ["MOUNTAIN_LODGE", "HERITAGE_BOUTIQUE", "CITY_MODERN", "COASTAL_RESORT", "GARDEN_RETREAT"] as const;
export type HotelTemplateKey = (typeof HOTEL_TEMPLATES)[number];

export const SIDES = ["TOP", "RIGHT", "BOTTOM", "LEFT"] as const;
export type SideKey = (typeof SIDES)[number];

export const ROOM_CATEGORIES = ["STANDARD", "DELUXE", "SUITE"] as const;
export type RoomCategoryKey = (typeof ROOM_CATEGORIES)[number];

/** Illustrative landscape scenes. Several destinations share a scene; each scene has its own painter parameters. */
export const SCENE_KEYS = [
  "himalaya", "high-desert", "green-hills", "tea-hills", "valley", "meadow", "boulders",
  "lake-hills", "lake-palace", "backwater", "river-ghats",
  "tropical-sea", "island-sea", "city-sea",
  "garden", "pine-garden", "chinar-garden", "rose-garden", "coffee-garden", "tropical-garden", "banana-garden", "mughal-garden",
  "city", "hill-town", "heritage-city", "blue-city", "french-quarter",
  "courtyard", "courtyard-colonial",
  "pool-tropical", "pool-hills", "pool-courtyard", "pool-rooftop",
] as const;
export type SceneKey = (typeof SCENE_KEYS)[number];

export const TEMPLATE_INFO: Record<HotelTemplateKey, { label: string; propertyType: string; interiorStyle: InteriorStyle; description: string }> = {
  MOUNTAIN_LODGE: {
    label: "Mountain lodge",
    propertyType: "Lodge",
    interiorStyle: "lodge",
    description: "Timber-clad lodge with stepped terraces and pitched roofs facing the valley.",
  },
  HERITAGE_BOUTIQUE: {
    label: "Boutique heritage hotel",
    propertyType: "Heritage hotel",
    interiorStyle: "heritage",
    description: "Courtyard-plan heritage house with a gallery ring, jharokha balconies and rooftop chhatris.",
  },
  CITY_MODERN: {
    label: "Modern city hotel",
    propertyType: "City hotel",
    interiorStyle: "modern",
    description: "Glass-and-stone tower with a central lift core and corner suites on the upper floors.",
  },
  COASTAL_RESORT: {
    label: "Coastal resort",
    propertyType: "Resort",
    interiorStyle: "coastal",
    description: "Long low-rise resort block with balconies on every view-facing room and a pool deck below.",
  },
  GARDEN_RETREAT: {
    label: "Garden retreat",
    propertyType: "Retreat",
    interiorStyle: "garden",
    description: "U-shaped low-rise retreat wrapped around a private lawn, with verandas onto the garden.",
  },
};

export type InteriorStyle = "lodge" | "heritage" | "modern" | "coastal" | "garden";

export const VIEW_LABELS: Record<ViewKey, string> = {
  SEA: "Sea view",
  LAKE: "Lake view",
  RIVER: "River view",
  MOUNTAIN: "Mountain view",
  VALLEY: "Valley view",
  GARDEN: "Garden view",
  CITY: "City view",
  COURTYARD: "Courtyard view",
  POOL: "Pool view",
  NONE: "Interior-facing",
};

export const SIDE_LABELS: Record<SideKey, string> = {
  TOP: "front facade",
  RIGHT: "right side",
  BOTTOM: "rear facade",
  LEFT: "left side",
};
