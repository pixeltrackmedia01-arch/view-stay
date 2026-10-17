/**
 * Curated illustrative image library. Every asset is addressed by a structured key, rendered on demand
 * from deterministic painters, and registered in the MediaAsset manifest when the seed links it to a
 * destination, property or physical room. Keys are validated strictly; unknown keys are rejected.
 */
import {
  HOTEL_TEMPLATES,
  ROOM_CATEGORIES,
  SCENE_KEYS,
  TEMPLATE_INFO,
  type HotelTemplateKey,
  type InteriorStyle,
  type RoomCategoryKey,
  type SceneKey,
} from "@/lib/catalog-types";
import { DESTINATIONS } from "@/data/destinations";
import { destinationHero, exterior, lobby, lounge, reception, restaurant } from "./exteriors";
import { balcony, bathroom, roomOverview, seatingArea, sleepingArea, specialFeature, workspace, type FeatureKind } from "./interiors";
import { TODS, type Tod } from "./scenes";
import { H, W } from "./svg";

export type MediaCategoryKey =
  | "DESTINATION"
  | "EXTERIOR"
  | "LOBBY"
  | "RECEPTION"
  | "RESTAURANT"
  | "POOL"
  | "COURTYARD"
  | "GARDEN"
  | "COMMON_AREA"
  | "ROOM_OVERVIEW"
  | "SLEEPING_AREA"
  | "WINDOW_VIEW"
  | "BALCONY"
  | "BATHROOM"
  | "SEATING_AREA"
  | "WORKSPACE"
  | "SPECIAL_FEATURE";

export const MEDIA_CATEGORY_LABELS: Record<MediaCategoryKey, string> = {
  DESTINATION: "Destination",
  EXTERIOR: "Exterior",
  LOBBY: "Lobby",
  RECEPTION: "Reception",
  RESTAURANT: "Dining",
  POOL: "Pool",
  COURTYARD: "Courtyard",
  GARDEN: "Gardens",
  COMMON_AREA: "Common areas",
  ROOM_OVERVIEW: "Room overview",
  SLEEPING_AREA: "Sleeping area",
  WINDOW_VIEW: "Window view",
  BALCONY: "Balcony",
  BATHROOM: "Bathroom",
  SEATING_AREA: "Seating area",
  WORKSPACE: "Workspace",
  SPECIAL_FEATURE: "Special features",
};

export interface LibraryAsset {
  key: string;
  path: string;
  category: MediaCategoryKey;
  alt: string;
  width: number;
  height: number;
  render: () => string;
}

const STYLES: InteriorStyle[] = ["lodge", "heritage", "modern", "coastal", "garden"];
const FEATURES: FeatureKind[] = ["corner-windows", "fireplace", "window-seat", "bathtub-view"];
const SCENE_SET = new Set<string>(SCENE_KEYS);
const STYLE_SET = new Set<string>(STYLES);
const TOD_SET = new Set<string>(TODS);
const CAT_SET = new Set<string>(ROOM_CATEGORIES);
const TPL_SET = new Set<string>(HOTEL_TEMPLATES);
const DEST_SET = new Map(DESTINATIONS.map((d) => [d.slug, d]));

const sceneWords = (s: SceneKey) => s.replace(/-/g, " ");
const catWords = (c: RoomCategoryKey) => c.toLowerCase();

export const libraryPath = (key: string) => `/media/library/${key}.svg`;

export const libraryKeys = {
  view: (scene: SceneKey, tod: Tod) => `view/${scene}/${tod}`,
  room: (style: InteriorStyle, cat: RoomCategoryKey, scene: SceneKey, tod: Tod, twin = false) => `room/${style}/${cat}/${scene}/${tod}${twin ? "/twin" : ""}`,
  sleep: (style: InteriorStyle, cat: RoomCategoryKey, twin = false) => `sleep/${style}/${cat}${twin ? "/twin" : ""}`,
  bath: (style: InteriorStyle, cat: RoomCategoryKey, scene: SceneKey) => `bath/${style}/${cat}/${scene}`,
  seating: (style: InteriorStyle, scene: SceneKey, tod: Tod) => `seating/${style}/${scene}/${tod}`,
  work: (style: InteriorStyle, scene: SceneKey) => `work/${style}/${scene}`,
  balcony: (style: InteriorStyle, scene: SceneKey, tod: Tod) => `balcony/${style}/${scene}/${tod}`,
  feature: (kind: FeatureKind, style: InteriorStyle, scene: SceneKey) => `feature/${kind}/${style}/${scene}`,
  exterior: (t: HotelTemplateKey, palette: number, scene: SceneKey, tod: Tod) => `exterior/${t}/${palette}/${scene}/${tod}`,
  lobby: (style: InteriorStyle, scene: SceneKey) => `lobby/${style}/${scene}`,
  reception: (style: InteriorStyle) => `reception/${style}`,
  restaurant: (style: InteriorStyle, scene: SceneKey) => `restaurant/${style}/${scene}`,
  lounge: (style: InteriorStyle) => `lounge/${style}`,
  pool: (scene: SceneKey, tod: Tod) => `pool/${scene}/${tod}`,
  courtyard: (scene: SceneKey, tod: Tod) => `courtyard/${scene}/${tod}`,
  garden: (scene: SceneKey, tod: Tod) => `garden/${scene}/${tod}`,
  destination: (slug: string) => `destination/${slug}`,
};

function asset(key: string, category: MediaCategoryKey, alt: string, render: () => string): LibraryAsset {
  return { key, path: libraryPath(key), category, alt, width: W, height: H, render };
}

/** Parse and validate a library key. Returns null for anything outside the curated grammar. */
export function resolveLibraryAsset(key: string): LibraryAsset | null {
  if (!/^[a-z0-9_/-]+$/i.test(key) || key.length > 160) return null;
  const [kind, ...a] = key.split("/");
  const isStyle = (v?: string): v is InteriorStyle => !!v && STYLE_SET.has(v);
  const isScene = (v?: string): v is SceneKey => !!v && SCENE_SET.has(v);
  const isTod = (v?: string): v is Tod => !!v && TOD_SET.has(v);
  const isCat = (v?: string): v is RoomCategoryKey => !!v && CAT_SET.has(v);
  switch (kind) {
    case "view":
      if (a.length === 2 && isScene(a[0]) && isTod(a[1]))
        return asset(key, "WINDOW_VIEW", `Illustrative ${sceneWords(a[0])} outlook at ${a[1]}`, () => destinationHero(a[0] as SceneKey, a[1] as Tod, key));
      return null;
    case "room": {
      const [style, cat, scene, tod, twin] = a;
      if ((a.length === 4 || (a.length === 5 && twin === "twin")) && isStyle(style) && isCat(cat) && isScene(scene) && isTod(tod))
        return asset(key, "ROOM_OVERVIEW", `Illustrative ${catWords(cat)} room in ${style} style with a window onto a ${sceneWords(scene)} outlook${twin ? ", twin beds" : ""}`, () => roomOverview(style, cat, scene, tod, key, !!twin));
      return null;
    }
    case "sleep": {
      const [style, cat, twin] = a;
      if ((a.length === 2 || (a.length === 3 && twin === "twin")) && isStyle(style) && isCat(cat))
        return asset(key, "SLEEPING_AREA", `Illustrative ${twin ? "twin-bed" : "double-bed"} sleeping area, ${style} style`, () => sleepingArea(style, cat, key, !!twin));
      return null;
    }
    case "bath": {
      const [style, cat, scene] = a;
      if (a.length === 3 && isStyle(style) && isCat(cat) && isScene(scene))
        return asset(key, "BATHROOM", cat === "SUITE" ? `Illustrative suite bathroom with a bathtub by the window, ${style} style` : `Illustrative ensuite bathroom with walk-in shower, ${style} style`, () => bathroom(style, cat, scene, "day", key));
      return null;
    }
    case "seating": {
      const [style, scene, tod] = a;
      if (a.length === 3 && isStyle(style) && isScene(scene) && isTod(tod))
        return asset(key, "SEATING_AREA", `Illustrative seating area beside the window, ${style} style`, () => seatingArea(style, scene, tod, key));
      return null;
    }
    case "work": {
      const [style, scene] = a;
      if (a.length === 2 && isStyle(style) && isScene(scene)) return asset(key, "WORKSPACE", `Illustrative writing desk and workspace, ${style} style`, () => workspace(style, scene, "day", key));
      return null;
    }
    case "balcony": {
      const [style, scene, tod] = a;
      if (a.length === 3 && isStyle(style) && isScene(scene) && isTod(tod))
        return asset(key, "BALCONY", `Illustrative private balcony looking out over a ${sceneWords(scene)} landscape`, () => balcony(style, scene, tod, key));
      return null;
    }
    case "feature": {
      const [feat, style, scene] = a;
      if (a.length === 3 && FEATURES.includes(feat as FeatureKind) && isStyle(style) && isScene(scene)) {
        const label = { "corner-windows": "corner room with windows on two sides", fireplace: "stone fireplace and armchairs", "window-seat": "cushioned window seat", "bathtub-view": "bathtub with a view" }[feat as FeatureKind];
        return asset(key, "SPECIAL_FEATURE", `Illustrative ${label}`, () => specialFeature(feat as FeatureKind, style, scene, "day", key));
      }
      return null;
    }
    case "exterior": {
      const [t, palette, scene, tod] = a;
      const pi = Number(palette);
      if (a.length === 4 && TPL_SET.has(t) && Number.isInteger(pi) && pi >= 0 && pi < 3 && isScene(scene) && isTod(tod))
        return asset(key, "EXTERIOR", `Illustrative exterior of a ${TEMPLATE_INFO[t as HotelTemplateKey].label.toLowerCase()} at ${tod}`, () => exterior(t as HotelTemplateKey, pi, scene, tod, key));
      return null;
    }
    case "lobby":
      if (a.length === 2 && isStyle(a[0]) && isScene(a[1])) return asset(key, "LOBBY", `Illustrative double-height lobby, ${a[0]} style`, () => lobby(a[0] as InteriorStyle, a[1] as SceneKey, key));
      return null;
    case "reception":
      if (a.length === 1 && isStyle(a[0])) return asset(key, "RECEPTION", `Illustrative reception desk, ${a[0]} style`, () => reception(a[0] as InteriorStyle, key));
      return null;
    case "restaurant":
      if (a.length === 2 && isStyle(a[0]) && isScene(a[1])) return asset(key, "RESTAURANT", `Illustrative all-day restaurant, ${a[0]} style`, () => restaurant(a[0] as InteriorStyle, a[1] as SceneKey, key));
      return null;
    case "lounge":
      if (a.length === 1 && isStyle(a[0])) return asset(key, "COMMON_AREA", `Illustrative library lounge, ${a[0]} style`, () => lounge(a[0] as InteriorStyle, key));
      return null;
    case "pool":
    case "courtyard":
    case "garden": {
      if (a.length === 2 && isScene(a[0]) && isTod(a[1])) {
        const cat = kind === "pool" ? "POOL" : kind === "courtyard" ? "COURTYARD" : "GARDEN";
        return asset(key, cat, `Illustrative ${kind} at ${a[1]}`, () => destinationHero(a[0] as SceneKey, a[1] as Tod, key));
      }
      return null;
    }
    case "destination": {
      const d = a.length === 1 ? DEST_SET.get(a[0]) : undefined;
      if (!d) return null;
      const scene = d.scenes[d.views[0]] ?? "garden";
      return asset(key, "DESTINATION", `Illustrative ${sceneWords(scene)} landscape evoking ${d.name}, ${d.state}`, () => destinationHero(scene, d.slug.length % 3 === 0 ? "dawn" : "day", key));
    }
    default:
      return null;
  }
}

const cache = new Map<string, string>();
/** Render with a small in-process cache; output is deterministic. */
export function renderLibraryAsset(a: LibraryAsset): string {
  const hit = cache.get(a.key);
  if (hit) return hit;
  const svg = a.render();
  if (cache.size > 400) cache.delete(cache.keys().next().value!);
  cache.set(a.key, svg);
  return svg;
}
