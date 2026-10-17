/**
 * Shared generator for property records. Used by the demo seed and by partner property creation, so every
 * property (demo or real) gets the same layout model, pricing structure and coherent photo associations.
 */
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { DESTINATIONS, type DestinationSeed } from "@/data/destinations";
import { AMENITIES, type Amenity } from "@/lib/amenities";
import { TEMPLATE_INFO, type HotelTemplateKey, type InteriorStyle, type RoomCategoryKey, type SceneKey, type SideKey, type ViewKey } from "@/lib/catalog-types";
import { generateBuilding, roomAreaSqm, type RoomSpec } from "@/lib/layout/templates";
import { libraryKeys, resolveLibraryAsset, type MediaCategoryKey } from "@/lib/media/library";
import type { Tod } from "@/lib/media/scenes";
import { roomNightlyRate } from "@/lib/pricing";
import { rng } from "@/lib/random";

export const sid = (prefix: string, key: string) => `${prefix}_${createHash("sha1").update(key).digest("hex").slice(0, 22)}`;

/** Art direction for a destination; destinations created by admins fall back to neutral scenes. */
export function destinationArt(slug: string): DestinationSeed {
  return (
    DESTINATIONS.find((d) => d.slug === slug) ?? {
      slug, name: slug, state: "", region: "Heartland", latitude: 22, longitude: 79, themes: ["CITY"], tagline: "", description: "", attractions: ["the city centre"],
      views: ["CITY", "GARDEN", "COURTYARD"], scenes: { CITY: "city", GARDEN: "garden", COURTYARD: "courtyard" }, templates: ["CITY_MODERN"], priceLevel: 1, nameWords: [],
    }
  );
}

export const NAME_SUFFIX: Record<HotelTemplateKey, string[]> = {
  MOUNTAIN_LODGE: ["Lodge", "Mountain Lodge", "Chalet", "Ridge Lodge", "Alpine Lodge"],
  HERITAGE_BOUTIQUE: ["Heritage House", "Manor", "Residency", "Heritage Hotel", "Kothi"],
  CITY_MODERN: ["Hotel", "Grand", "Suites", "Tower Hotel", "Central"],
  COASTAL_RESORT: ["Beach Resort", "Resort & Spa", "Bay Resort", "Shores", "Sands Resort"],
  GARDEN_RETREAT: ["Retreat", "Garden Retreat", "Estate", "Cottages", "Gardens"],
};
export const HAVELI_REGIONS = new Set(["Rajasthan", "Heartland"]);

const ROOM_TYPE_NAMES: Record<HotelTemplateKey, Record<RoomCategoryKey, string>> = {
  MOUNTAIN_LODGE: { STANDARD: "Pinewood Room", DELUXE: "Valley Balcony Room", SUITE: "Summit Suite" },
  HERITAGE_BOUTIQUE: { STANDARD: "Heritage Room", DELUXE: "Jharokha Room", SUITE: "Royal Suite" },
  CITY_MODERN: { STANDARD: "City Room", DELUXE: "Skyline Room", SUITE: "Panorama Suite" },
  COASTAL_RESORT: { STANDARD: "Garden Room", DELUXE: "Balcony Room", SUITE: "Signature Suite" },
  GARDEN_RETREAT: { STANDARD: "Garden Room", DELUXE: "Veranda Room", SUITE: "Pavilion Suite" },
};
const CATEGORY_BASE: Record<RoomCategoryKey, { price: number; guests: number; bed: string; amenities: string[] }> = {
  STANDARD: { price: 3600, guests: 2, bed: "Queen", amenities: ["Air conditioning", "Rain shower", "Tea & coffee"] },
  DELUXE: { price: 5400, guests: 3, bed: "King", amenities: ["Air conditioning", "Rain shower", "Minibar", "Bathrobes", "Tea & coffee"] },
  SUITE: { price: 9800, guests: 4, bed: "King + Sofa bed", amenities: ["Separate living area", "Bathtub", "Minibar", "Bathrobes", "Nespresso machine", "Evening turndown"] },
};
const STAR_FACTOR: Record<number, number> = { 3: 0.82, 4: 1, 5: 1.38 };

const TEMPLATE_AMENITIES: Record<HotelTemplateKey, Amenity[]> = {
  MOUNTAIN_LODGE: ["Free Wi-Fi", "Breakfast available", "Restaurant", "Bonfire area", "Parking"],
  HERITAGE_BOUTIQUE: ["Free Wi-Fi", "Breakfast available", "Restaurant", "Rooftop terrace"],
  CITY_MODERN: ["Free Wi-Fi", "Restaurant", "Room service", "Fitness centre", "Wheelchair accessible"],
  COASTAL_RESORT: ["Free Wi-Fi", "Breakfast available", "Restaurant", "Swimming pool", "Spa"],
  GARDEN_RETREAT: ["Free Wi-Fi", "Breakfast available", "Restaurant", "Yoga deck", "Parking"],
};

export interface PlannedHotel {
  id: string;
  dest: DestinationSeed;
  destinationId: string;
  index: number;
  name: string;
  slug: string;
  template: HotelTemplateKey;
  style: InteriorStyle;
  stars: number;
  palette: number;
  frontView: ViewKey;
  backView: ViewKey;
  ownerId: string;
  status?: "APPROVED" | "PENDING";
  featured?: boolean;
  isDemo?: boolean;
  /** Overrides for partner-created properties. */
  description?: string;
  address?: string;
  amenities?: string[];
  standardBasePrice?: number;
}

function viewScene(dest: DestinationSeed, view: ViewKey, template: HotelTemplateKey): SceneKey {
  const own = dest.scenes[view];
  if (own) return own;
  if (view === "COURTYARD") return template === "HERITAGE_BOUTIQUE" && dest.region === "Coast" ? "courtyard-colonial" : "courtyard";
  if (view === "POOL") return template === "CITY_MODERN" ? "pool-rooftop" : template === "HERITAGE_BOUTIQUE" ? "pool-courtyard" : dest.themes.includes("COASTAL") ? "pool-tropical" : "pool-hills";
  if (view === "GARDEN") return dest.themes.includes("COASTAL") ? "tropical-garden" : "garden";
  return dest.scenes[dest.views[0]] ?? "garden";
}

function outlookView(spec: RoomSpec, h: PlannedHotel): ViewKey {
  if (spec.outlook === "front") return h.frontView;
  if (spec.outlook === "back") return h.backView;
  return h.template === "HERITAGE_BOUTIQUE" ? "COURTYARD" : "GARDEN";
}

const SIDE_WORD: Record<SideKey, string> = { TOP: "front", RIGHT: "right-hand", BOTTOM: "rear", LEFT: "left-hand" };


export interface RoomMeta {
  id: string;
  hotelId: string;
  nightly: number;
  maxGuests: number;
  number: string;
  view: ViewKey;
  level: number;
  hasBalcony: boolean;
}

export interface HotelRecords {
  hotel: Prisma.HotelCreateManyInput;
  roomTypes: Prisma.RoomTypeCreateManyInput[];
  floors: Prisma.FloorCreateManyInput[];
  elements: Prisma.MapElementCreateManyInput[];
  rooms: Prisma.RoomCreateManyInput[];
  roomPhotos: Prisma.RoomPhotoCreateManyInput[];
  hotelPhotos: Prisma.HotelPhotoCreateManyInput[];
  roomMeta: RoomMeta[];
}

export type AssetRegistry = Map<string, Prisma.MediaAssetCreateManyInput>;

export function registerAsset(assets: AssetRegistry, key: string) {
  const existing = assets.get(key);
  if (existing) return existing;
  const a = resolveLibraryAsset(key);
  if (!a) throw new Error(`Unknown library key ${key}`);
  const row = { id: sid("ast", key), key, path: a.path, category: a.category, alt: a.alt, width: a.width, height: a.height, illustrative: true, source: "LIBRARY" as const };
  assets.set(key, row);
  return row;
}

/** Room photo set for one physical room, coherent with its category, interior style, view and features. */
export function roomPhotoKeys(opts: { template: HotelTemplateKey; style: InteriorStyle; category: RoomCategoryKey; scene: SceneKey; tod: Tod; twin: boolean; hasBalcony: boolean; isCorner: boolean; outlookFront: boolean; view: ViewKey; windowSide: SideKey; seed: string }): [MediaCategoryKey, string, string | null][] {
  const { template, style, category, scene, tod, twin } = opts;
  const rr = rng(`photos:${opts.seed}`);
  const photos: [MediaCategoryKey, string, string | null][] = [
    ["ROOM_OVERVIEW", libraryKeys.room(style, category, scene, tod, twin), null],
    ["WINDOW_VIEW", libraryKeys.view(scene, rr.pick(["dawn", "day", "dusk"] as const)), `Representative ${opts.view.toLowerCase()} view type for the ${SIDE_WORD[opts.windowSide]} facade. Illustrative, not a photograph of this exact outlook.`],
    ["SLEEPING_AREA", libraryKeys.sleep(style, category, twin), null],
  ];
  if (opts.hasBalcony) photos.push(["BALCONY", libraryKeys.balcony(style, scene, tod), "Private balcony (illustrative)."]);
  if (category !== "STANDARD") photos.push(["SEATING_AREA", libraryKeys.seating(style, scene, tod), null]);
  if (category !== "STANDARD" || template === "CITY_MODERN") photos.push(["WORKSPACE", libraryKeys.work(style, scene), null]);
  photos.push(["BATHROOM", libraryKeys.bath(style, category, scene), null]);
  if (opts.isCorner) photos.push(["SPECIAL_FEATURE", libraryKeys.feature("corner-windows", style, scene), "Corner room: windows on two walls (illustrative)."]);
  else if (template === "MOUNTAIN_LODGE" && category === "SUITE") photos.push(["SPECIAL_FEATURE", libraryKeys.feature("fireplace", style, scene), "Suite fireplace (illustrative)."]);
  else if (template === "HERITAGE_BOUTIQUE" && opts.outlookFront) photos.push(["SPECIAL_FEATURE", libraryKeys.feature("window-seat", style, scene), "Jharokha window seat (illustrative)."]);
  return photos;
}

export function sceneForView(dest: DestinationSeed, template: HotelTemplateKey, view: ViewKey): SceneKey {
  return viewScene(dest, view, template);
}

export function buildHotelRecords(h: PlannedHotel, assets: AssetRegistry): HotelRecords {
  const useAsset = (key: string) => registerAsset(assets, key);
  const hotelRows: Prisma.HotelCreateManyInput[] = [];
  const roomTypeRows: Prisma.RoomTypeCreateManyInput[] = [];
  const floorRows: Prisma.FloorCreateManyInput[] = [];
  const elementRows: Prisma.MapElementCreateManyInput[] = [];
  const roomRows: Prisma.RoomCreateManyInput[] = [];
  const roomPhotoRows: Prisma.RoomPhotoCreateManyInput[] = [];
  const hotelPhotoRows: Prisma.HotelPhotoCreateManyInput[] = [];
  const roomMeta: RoomMeta[] = [];
  const r = rng(`hotel:${h.id}`);
  const { dest, template, style } = h;
  const building = generateBuilding(template, h.id);
  const pool = template === "COASTAL_RESORT" || dest.views.includes("POOL") || r.chance(0.4);
  const amenities = new Set<Amenity>(h.amenities ? (h.amenities as Amenity[]) : TEMPLATE_AMENITIES[template]);
  if (pool && !h.amenities) amenities.add("Swimming pool");
  if (!h.amenities) for (const extra of AMENITIES) if (!amenities.has(extra) && r.chance(0.18)) amenities.add(extra);
  if (template === "MOUNTAIN_LODGE" && !h.amenities) amenities.delete("Swimming pool");
  const pets = amenities.has("Pet-friendly");
  const policy = r.pick(["FLEXIBLE", "FLEXIBLE", "FLEXIBLE", "MODERATE", "MODERATE", "STRICT"] as const);
  const priceFactor = dest.priceLevel * STAR_FACTOR[h.stars] * r.range(0.92, 1.08);
  const frontScene = viewScene(dest, h.frontView, template);
  const backScene = viewScene(dest, h.backView, template);
  const innerScene = viewScene(dest, template === "HERITAGE_BOUTIQUE" ? "COURTYARD" : "GARDEN", template);
  const sceneFor = (v: ViewKey) => (v === h.frontView ? frontScene : v === h.backView ? backScene : v === "COURTYARD" || v === "GARDEN" ? innerScene : viewScene(dest, v, template));
  const roomTypeIds = {} as Record<RoomCategoryKey, string>;
  const basePrices = {} as Record<RoomCategoryKey, number>;
  for (const cat of ["STANDARD", "DELUXE", "SUITE"] as const) {
    const base = CATEGORY_BASE[cat];
    const id = sid("rtp", `${h.id}:${cat}`);
    roomTypeIds[cat] = id;
    basePrices[cat] = h.standardBasePrice
      ? Math.round((h.standardBasePrice * (base.price / CATEGORY_BASE.STANDARD.price)) / 10000) * 10000
      : Math.round((base.price * priceFactor) / 100) * 10000;
    roomTypeRows.push({
      id,
      hotelId: h.id,
      name: ROOM_TYPE_NAMES[template][cat],
      category: cat,
      description: cat === "SUITE" ? "Our largest rooms, with a separate sitting area and the best outlooks in the house." : cat === "DELUXE" ? "Generous rooms on the view-facing side of the building." : "Comfortable, well-designed rooms for two.",
      bedType: base.bed,
      maxGuests: base.guests,
      sizeSqm: cat === "SUITE" ? 46 : cat === "DELUXE" ? 30 : 24,
      basePrice: basePrices[cat],
      amenities: base.amenities,
    });
  }

  let roomCount = 0;
  let balconyCount = 0;
  for (const floor of building.floors) {
    const floorId = sid("flr", `${h.id}:${floor.level}`);
    floorRows.push({ id: floorId, hotelId: h.id, level: floor.level, name: floor.name, width: floor.width, height: floor.height, wings: floor.wings as unknown as Prisma.InputJsonValue });
    floor.elements.forEach((el, ei) => elementRows.push({ id: sid("mel", `${floorId}:${ei}`), floorId, kind: el.kind, label: el.label, x: el.x, y: el.y, w: el.w, h: el.h }));
    for (const spec of floor.rooms) {
      const id = sid("rom", `${h.id}:${spec.number}`);
      const view = outlookView(spec, h);
      const scene = sceneFor(view);
      const rr = rng(id);
      const outlookBase = spec.outlook === "front" ? 62 : spec.outlook === "back" ? 40 : 46;
      const viewScore = Math.max(10, Math.min(98, Math.round(outlookBase + floor.level * (spec.outlook === "front" ? 5 : 2) + (spec.isCorner ? 6 : 0) + (spec.balconySide ? 3 : 0) - (spec.nearElevator ? 4 : 0) + rr.range(-4, 4))));
      const twin = spec.category === "STANDARD" && rr.chance(0.3);
      const hasBalcony = !!spec.balconySide;
      const priceAdjustment = Math.round(((floor.level - 1) * 250 + (spec.isCorner ? 450 : 0) + (hasBalcony ? 350 : 0) - (spec.nearElevator ? 250 : 0) + (spec.outlook === "front" ? 300 : 0)) * priceFactor / 50) * 5000;
      const accessible = floor.level === 1 && spec.nearElevator && !spec.isCorner;
      const tod: Tod = floor.level >= 3 && rr.chance(0.5) ? "dusk" : "day";
      const status = rr.chance(0.008) ? "MAINTENANCE" : "ACTIVE";
      roomRows.push({
        id,
        hotelId: h.id,
        floorId,
        roomTypeId: roomTypeIds[spec.category],
        number: spec.number,
        viewType: view,
        viewScore,
        viewVerified: spec.outlook === "front",
        hasBalcony,
        isCorner: spec.isCorner,
        windowCount: spec.secondaryWindowSide ? 2 : 1,
        windowSide: spec.windowSide,
        secondaryWindowSide: spec.secondaryWindowSide,
        balconySide: spec.balconySide,
        bedType: twin ? "Twin" : CATEGORY_BASE[spec.category].bed,
        sizeSqm: roomAreaSqm(spec, (spec.category === "SUITE" ? 44 : spec.category === "DELUXE" ? 31 : 25) + rr.int(-2, 3)),
        nearElevator: spec.nearElevator,
        accessible,
        priceAdjustment,
        notes: spec.isCorner ? `Corner room with windows on the ${SIDE_WORD[spec.windowSide]} and ${SIDE_WORD[spec.secondaryWindowSide ?? spec.windowSide]} walls.` : spec.nearElevator ? "Close to the lift/stair lobby." : null,
        status,
        x: spec.x,
        y: spec.y,
        w: spec.w,
        h: spec.h,
      });
      const nightly = roomNightlyRate(basePrices[spec.category], priceAdjustment);
      roomMeta.push({ id, hotelId: h.id, nightly, maxGuests: CATEGORY_BASE[spec.category].guests, number: spec.number, view, level: floor.level, hasBalcony });
      roomCount++;
      if (hasBalcony) balconyCount++;

      // Room photography: coherent with this room's category, style, view and features.
      const photos = roomPhotoKeys({ template, style, category: spec.category, scene, tod, twin, hasBalcony, isCorner: spec.isCorner, outlookFront: spec.outlook === "front", view, windowSide: spec.windowSide, seed: id });
      photos.forEach(([category, key, caption], order) => {
        const a = useAsset(key);
        roomPhotoRows.push({ id: sid("rph", `${id}:${order}`), roomId: id, hotelId: h.id, assetId: a.id!, category, alt: `Room ${spec.number}: ${a.alt.charAt(0).toLowerCase()}${a.alt.slice(1)}`, caption, sortOrder: order, isPrimary: order === 0, illustrative: true });
      });
    }
  }

  // Property gallery
  const poolScene = viewScene(dest, "POOL", template);
  const gallery: [MediaCategoryKey, string][] = [
    ["EXTERIOR", libraryKeys.exterior(template, h.palette, frontScene, "day")],
    ["EXTERIOR", libraryKeys.exterior(template, h.palette, frontScene, "dusk")],
    ["LOBBY", libraryKeys.lobby(style, innerScene)],
    ["ROOM_OVERVIEW", libraryKeys.room(style, "SUITE", frontScene, "day")],
    ["WINDOW_VIEW", libraryKeys.view(frontScene, "dawn")],
    ["RESTAURANT", libraryKeys.restaurant(style, frontScene)],
    ["RECEPTION", libraryKeys.reception(style)],
  ];
  if (amenities.has("Swimming pool")) gallery.push(["POOL", libraryKeys.pool(poolScene, "day")]);
  if (template === "HERITAGE_BOUTIQUE") gallery.push(["COURTYARD", libraryKeys.courtyard(innerScene, "day")]);
  if (template === "GARDEN_RETREAT" || template === "MOUNTAIN_LODGE") gallery.push(["GARDEN", libraryKeys.garden(viewScene(dest, "GARDEN", template), "day")]);
  gallery.push(["COMMON_AREA", libraryKeys.lounge(style)]);
  gallery.forEach(([category, key], order) => {
    const a = useAsset(key);
    hotelPhotoRows.push({ id: sid("hph", `${h.id}:${order}`), hotelId: h.id, assetId: a.id!, category, alt: `${h.name}: ${a.alt.charAt(0).toLowerCase()}${a.alt.slice(1)}`, sortOrder: order, isCover: order === 0 });
  });

  const attraction = dest.attractions[h.index % dest.attractions.length];
  hotelRows.push({
    id: h.id,
    slug: h.slug,
    name: h.name,
    destinationId: h.destinationId,
    city: dest.name,
    country: "India",
    address: h.address ?? `${10 + h.index * 7}, ${attraction} Road, ${dest.name}, ${dest.state}`,
    neighborhood: `Near ${attraction}`,
    description: h.description ?? `${h.name} is a fictional ${TEMPLATE_INFO[template].label.toLowerCase()} created for this ViewStay demo. ${TEMPLATE_INFO[template].description} ${dest.description}`,
    starRating: h.stars,
    amenities: [...amenities],
    highlights: [
      `${roomCount} individually selectable rooms across ${building.floors.length} floor${building.floors.length > 1 ? "s" : ""}`,
      balconyCount ? `${balconyCount} rooms with a private balcony` : "Garden-level rooms with easy access",
      `${h.frontView.charAt(0)}${h.frontView.slice(1).toLowerCase()}-facing rooms on the front facade`,
      `Short drive to ${attraction}`,
    ],
    houseRules: [
      "Valid government photo ID required at check-in",
      "No smoking inside rooms",
      "Quiet hours 22:00 – 07:00",
      pets ? "Pets welcome on request" : "Pets are not allowed",
      "Outside visitors allowed in common areas only",
    ],
    template,
    palette: h.palette,
    cancellationPolicy: policy,
    mapX: Math.round(r.range(0.12, 0.88) * 1000) / 1000,
    mapY: Math.round(r.range(0.15, 0.85) * 1000) / 1000,
    latitude: dest.latitude + r.range(-0.04, 0.04),
    longitude: dest.longitude + r.range(-0.04, 0.04),
    checkInTime: r.pick(["13:00", "14:00", "14:00", "15:00"]),
    checkOutTime: r.pick(["11:00", "11:00", "12:00"]),
    status: h.status ?? "APPROVED",
    featured: h.featured ?? false,
    isDemo: h.isDemo ?? false,
    ownerId: h.ownerId,
  });

  return { hotel: hotelRows[0], roomTypes: roomTypeRows, floors: floorRows, elements: elementRows, rooms: roomRows, roomPhotos: roomPhotoRows, hotelPhotos: hotelPhotoRows, roomMeta };
}

export async function insertHotelRecords(db: Prisma.TransactionClient, all: HotelRecords[], assets: AssetRegistry) {
  const chunked = async <T>(rows: T[], size: number, fn: (part: T[]) => Promise<unknown>) => {
    for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
  };
  await db.mediaAsset.createMany({ data: [...assets.values()], skipDuplicates: true });
  await chunked(all.map((r) => r.hotel), 200, (data) => db.hotel.createMany({ data, skipDuplicates: true }));
  await chunked(all.flatMap((r) => r.roomTypes), 1000, (data) => db.roomType.createMany({ data, skipDuplicates: true }));
  await chunked(all.flatMap((r) => r.floors), 1000, (data) => db.floor.createMany({ data, skipDuplicates: true }));
  await chunked(all.flatMap((r) => r.elements), 2000, (data) => db.mapElement.createMany({ data, skipDuplicates: true }));
  await chunked(all.flatMap((r) => r.rooms), 1500, (data) => db.room.createMany({ data, skipDuplicates: true }));
  await chunked(all.flatMap((r) => r.roomPhotos), 3000, (data) => db.roomPhoto.createMany({ data, skipDuplicates: true }));
  await chunked(all.flatMap((r) => r.hotelPhotos), 2000, (data) => db.hotelPhoto.createMany({ data, skipDuplicates: true }));
}
