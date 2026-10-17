/**
 * Deterministic, idempotent demo catalogue: 35 destinations x 10 fictional hotels = 350 demo properties.
 * Every record has a stable ID derived from its natural key, and inserts use skipDuplicates, so running the
 * seed again never duplicates properties, rooms, photos or bookings. Pass { reset: true } to wipe first.
 */
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DESTINATIONS } from "@/data/destinations";
import { TEMPLATE_INFO } from "@/lib/catalog-types";
import { COMMISSION_RATE } from "@/lib/config";
import { addDays, todayUtc } from "@/lib/dates";
import { libraryKeys } from "@/lib/media/library";
import { quoteStay } from "@/lib/pricing";
import { rng } from "@/lib/random";
import { slugify } from "@/lib/utils";
import { HAVELI_REGIONS, NAME_SUFFIX, buildHotelRecords, insertHotelRecords, registerAsset, sid, type AssetRegistry, type PlannedHotel, type RoomMeta } from "./catalog-builder";

export const SEED_PASSWORD = "Password123!";
export const HOTELS_PER_DESTINATION = 10;

type Tx = Prisma.TransactionClient;


export interface SeedCounts {
  destinations: number;
  hotels: number;
  rooms: number;
  roomPhotos: number;
  bookings: number;
  reviews: number;
}

export async function seedDatabase(db: Tx, { reset = false, log = () => {} }: { reset?: boolean; log?: (m: string) => void } = {}): Promise<SeedCounts> {
  if (reset) {
    log("Resetting database");
    for (const model of [
      "auditLog", "emailMessage", "passwordResetToken", "review", "payment", "booking", "roomHold", "roomBlock", "wishlist",
      "roomPhoto", "hotelPhoto", "room", "mapElement", "floor", "roomType", "hotel", "destination", "mediaAsset", "user",
    ] as const) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db[model] as any).deleteMany();
    }
  }

  // ------------------------------------------------------------ users
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const users: Prisma.UserCreateManyInput[] = [
    { id: sid("usr", "admin"), email: "admin@viewstay.dev", name: "Asha Rao", role: "ADMIN", passwordHash },
    { id: sid("usr", "partner"), email: "partner@viewstay.dev", name: "Rahul Mehta", role: "PARTNER", passwordHash, phone: "+91 98200 11111" },
    { id: sid("usr", "customer"), email: "customer@viewstay.dev", name: "Priya Sharma", role: "CUSTOMER", passwordHash, phone: "+91 98765 43210" },
    { id: sid("usr", "guest"), email: "guest@viewstay.dev", name: "Arjun Nair", role: "CUSTOMER", passwordHash, phone: "+91 99887 76655" },
  ];
  const partnerCompanies = ["Himalayan Hosts", "Coastline Hospitality", "Heritage Stays Co.", "Urban Nest Hotels", "Greenleaf Retreats", "Lakeview Collection", "Sahyadri Hospitality"];
  partnerCompanies.forEach((name, i) =>
    users.push({ id: sid("usr", `partner${i + 2}`), email: `partner${i + 2}@viewstay.dev`, name, role: "PARTNER", passwordHash, phone: `+91 98200 2${String(i).padStart(4, "0")}` }),
  );
  const travellerNames = ["Ananya Iyer", "Vikram Singh", "Meera Pillai", "Rohan Das", "Kavya Reddy", "Aditya Joshi", "Sneha Kulkarni", "Karan Malhotra", "Isha Banerjee", "Nikhil Verma", "Diya Kapoor", "Siddharth Rao", "Tara Menon", "Aarav Gupta", "Pooja Shetty", "Rahul Bose", "Neha Chawla", "Varun Nair", "Ritika Sen", "Manav Shah", "Lakshmi Krishnan", "Farhan Qureshi", "Gauri Deshpande", "Ishaan Mathur", "Zoya Ahmed", "Dev Patel", "Nandini Ghosh", "Arnav Bhatt", "Simran Gill", "Kabir Arora"];
  travellerNames.forEach((name, i) => users.push({ id: sid("usr", `traveller${i}`), email: `traveller${String(i + 1).padStart(2, "0")}@viewstay.dev`, name, role: "CUSTOMER", passwordHash }));
  await db.user.createMany({ data: users, skipDuplicates: true });
  const userIdByEmail = new Map((await db.user.findMany({ where: { email: { in: users.map((u) => u.email) } }, select: { id: true, email: true } })).map((u) => [u.email, u.id]));
  const uid = (email: string) => userIdByEmail.get(email)!;
  const partnerIds = ["partner@viewstay.dev", ...partnerCompanies.map((_, i) => `partner${i + 2}@viewstay.dev`)].map(uid);
  const travellerIds = travellerNames.map((_, i) => uid(`traveller${String(i + 1).padStart(2, "0")}@viewstay.dev`));

  // ------------------------------------------------------------ media manifest (collected as we go)
  const assets: AssetRegistry = new Map();
  const addAsset = (key: string) => registerAsset(assets, key);

  // ------------------------------------------------------------ destinations
  const destIds = new Map<string, string>();
  for (const d of DESTINATIONS) addAsset(libraryKeys.destination(d.slug));
  // Assets must exist before destinations reference them as heroes.
  await db.mediaAsset.createMany({ data: [...assets.values()], skipDuplicates: true });
  for (const [i, d] of DESTINATIONS.entries()) {
    const heroKey = libraryKeys.destination(d.slug);
    const hero = await db.mediaAsset.findUnique({ where: { key: heroKey }, select: { id: true } });
    const row = await db.destination.upsert({
      where: { slug: d.slug },
      create: {
        id: sid("dst", d.slug),
        slug: d.slug, name: d.name, state: d.state, region: d.region, tagline: d.tagline, description: d.description,
        latitude: d.latitude, longitude: d.longitude, themes: d.themes, attractions: d.attractions, featured: !!d.featured, sortOrder: i, heroAssetId: hero?.id,
      },
      update: {
        name: d.name, state: d.state, region: d.region, tagline: d.tagline, description: d.description,
        latitude: d.latitude, longitude: d.longitude, themes: d.themes, attractions: d.attractions, featured: !!d.featured, sortOrder: i, heroAssetId: hero?.id,
      },
      select: { id: true },
    });
    destIds.set(d.slug, row.id);
  }
  log(`Destinations: ${DESTINATIONS.length}`);

  // ------------------------------------------------------------ hotels
  const planned: PlannedHotel[] = [];
  const usedSlugs = new Set<string>();
  let partnerCursor = 0;
  for (const [di, dest] of DESTINATIONS.entries()) {
    const r = rng(`hotels:${dest.slug}`);
    for (let i = 0; i < HOTELS_PER_DESTINATION; i++) {
      const template = dest.templates[(i + Math.floor(di / 3)) % dest.templates.length];
      const suffixes = template === "HERITAGE_BOUTIQUE" && HAVELI_REGIONS.has(dest.region) ? ["Haveli", "Mahal Residency", "Heritage Haveli", "Kothi", "Bagh House"] : NAME_SUFFIX[template];
      const word = dest.nameWords[i % dest.nameWords.length];
      let name = `${word} ${suffixes[(i + di) % suffixes.length]}`;
      let slug = slugify(`${name}-${dest.slug}`);
      if (usedSlugs.has(slug)) {
        name = `The ${name}`;
        slug = slugify(`${name}-${dest.slug}`);
      }
      usedSlugs.add(slug);
      const frontView = i % 3 === 2 && dest.views[1] ? dest.views[1] : dest.views[0];
      const backView = dest.views.find((v) => v !== frontView) ?? "GARDEN";
      // The demo partner manages the first two hotels of the first six featured destinations.
      const featuredIdx = DESTINATIONS.filter((d) => d.featured).findIndex((d) => d.slug === dest.slug);
      const ownerId = featuredIdx >= 0 && featuredIdx < 6 && i < 2 ? partnerIds[0] : partnerIds[1 + (partnerCursor++ % (partnerIds.length - 1))];
      planned.push({
        id: sid("htl", `${dest.slug}:${i}`),
        dest,
        destinationId: destIds.get(dest.slug)!,
        index: i,
        name,
        slug,
        template,
        style: TEMPLATE_INFO[template].interiorStyle,
        stars: r.pick([3, 4, 4, 4, 5, 5]),
        palette: (i + di) % 3,
        frontView,
        backView,
        ownerId,
        // Two newly-listed demo properties await admin approval.
        status: (dest.slug === "goa" || dest.slug === "jaipur") && i === 9 ? "PENDING" : "APPROVED",
        featured: !!dest.featured && i === 0,
        isDemo: true,
      });
    }
  }

  const records = planned.map((h) => buildHotelRecords(h, assets));
  const hotelRows = records.map((r) => r.hotel);
  const roomMeta = records.flatMap((r) => r.roomMeta);
  await insertHotelRecords(db, records, assets);
  log(`Media assets: ${assets.size}`);
  log(`Hotels: ${hotelRows.length}, rooms: ${records.reduce((s, r) => s + r.rooms.length, 0)}, room photos: ${records.reduce((s, r) => s + r.roomPhotos.length, 0)}`);

  // ------------------------------------------------------------ demo bookings and reviews
  const today = todayUtc();
  const bookingRows: Prisma.BookingCreateManyInput[] = [];
  const paymentRows: Prisma.PaymentCreateManyInput[] = [];
  const reviewRows: Prisma.ReviewCreateManyInput[] = [];
  const occupied = new Map<string, [number, number][]>();
  const approved = new Set(hotelRows.filter((h) => h.status === "APPROVED").map((h) => h.id));
  const roomsByHotel = new Map<string, typeof roomMeta>();
  for (const m of roomMeta) {
    if (!approved.has(m.hotelId)) continue;
    const list = roomsByHotel.get(m.hotelId) ?? [];
    list.push(m);
    roomsByHotel.set(m.hotelId, list);
  }
  const userNames = new Map(users.map((u) => [u.id ?? "", u]));
  for (const u of users) if (u.id) userNames.set(userIdByEmail.get(u.email)!, u);

  const reviewTexts = [
    (m: RoomMeta) => `We picked room ${m.number} from the floor plan for the ${m.view.toLowerCase()} view and it was exactly as described. Would book the same room again.`,
    (m: RoomMeta) => `Being able to choose a ${m.level >= 3 ? "high-floor" : "quiet"} room before arriving made the stay. Staff were warm and check-in was quick.`,
    (m: RoomMeta) => `${m.hasBalcony ? "The balcony was the highlight — " : ""}lovely room, comfortable bed and a great breakfast. Room ${m.number} is a good pick.`,
    () => "Clean, calm and well located. The room photos on the listing were representative, though the real view was even better.",
    () => "Good value for the location. Corridor noise was minimal and housekeeping was excellent.",
    () => "Comfortable stay overall. Wi-Fi was a little slow in the evenings but everything else was great.",
  ];

  let seq = 0;
  const addBooking = (m: RoomMeta, userId: string, start: number, nights: number, status: "CONFIRMED" | "COMPLETED" | "CANCELLED", review?: { rating: number; text: string }) => {
    const span: [number, number] = [start, start + nights];
    const list = occupied.get(m.id) ?? [];
    if (status !== "CANCELLED" && list.some(([a, b]) => span[0] < b && span[1] > a)) return false;
    if (status !== "CANCELLED") list.push(span);
    occupied.set(m.id, list);
    const checkIn = addDays(today, start);
    const checkOut = addDays(checkIn, nights);
    const q = quoteStay(m.nightly, checkIn, checkOut);
    const n = seq++;
    const id = sid("bkg", `demo:${n}`);
    const u = userNames.get(userId)!;
    bookingRows.push({
      id,
      code: `VS-D${n.toString(36).toUpperCase().padStart(6, "0")}`,
      userId,
      hotelId: m.hotelId,
      roomId: m.id,
      checkIn,
      checkOut,
      nights,
      guests: Math.min(2, m.maxGuests),
      guestName: u.name,
      guestEmail: u.email,
      guestPhone: u.phone ?? "+91 90000 00000",
      nightlyRate: q.nightlyBase,
      subtotal: q.subtotal,
      discount: q.discount,
      taxes: q.taxes,
      total: q.total,
      commission: Math.round(q.total * COMMISSION_RATE),
      status,
      cancelledAt: status === "CANCELLED" ? addDays(today, -1) : null,
      createdAt: addDays(today, Math.min(-1, start - 20 - (n % 25))),
    });
    paymentRows.push({ id: sid("pay", `demo:${n}`), bookingId: id, reference: `pay_demo_${n}`, amount: q.total, cardLast4: "4242", status: status === "CANCELLED" ? "REFUNDED" : "SUCCEEDED" });
    if (review && status === "COMPLETED") reviewRows.push({ id: sid("rev", `demo:${n}`), bookingId: id, hotelId: m.hotelId, userId, rating: review.rating, comment: review.text, createdAt: addDays(checkOut, 1) });
    return true;
  };

  for (const [hotelId, rooms] of roomsByHotel) {
    const r = rng(`bookings:${hotelId}`);
    const pastStays = r.int(3, 9);
    for (let i = 0; i < pastStays; i++) {
      const m = r.pick(rooms);
      const nights = r.int(1, 4);
      const start = -r.int(nights + 2, 160);
      const rating = r.pick([3, 4, 4, 4, 5, 5, 5, 5]);
      addBooking(m, r.pick(travellerIds), start, nights, "COMPLETED", r.chance(0.85) ? { rating, text: r.pick(reviewTexts)(m) } : undefined);
    }
    const upcoming = r.int(2, 7);
    for (let i = 0; i < upcoming; i++) {
      const m = r.pick(rooms);
      const nights = r.int(1, 5);
      addBooking(m, r.pick(travellerIds), r.int(1, 60), nights, "CONFIRMED");
    }
  }

  // Scenario bookings for the demo customer accounts.
  const customer = uid("customer@viewstay.dev");
  const guest = uid("guest@viewstay.dev");
  const roomsOf = (destSlug: string, hotelIndex: number) => roomsByHotel.get(sid("htl", `${destSlug}:${hotelIndex}`)) ?? [];
  const pickRoom = (destSlug: string, hotelIndex: number, prefer: (m: RoomMeta) => boolean) => {
    const rooms = roomsOf(destSlug, hotelIndex);
    return rooms.find(prefer) ?? rooms[0];
  };
  const scenarios: [ReturnType<typeof pickRoom>, string, number, number, "CONFIRMED" | "COMPLETED" | "CANCELLED", { rating: number; text: string } | undefined][] = [
    [pickRoom("manali", 0, (m) => m.view === "MOUNTAIN" && m.level >= 2), customer, -40, 3, "COMPLETED", { rating: 5, text: "Chose a high-floor mountain-facing room on the floor plan and woke up to the snowline. Exactly the room we wanted." }],
    [pickRoom("goa", 0, (m) => m.view === "SEA" && m.hasBalcony), customer, -15, 2, "COMPLETED", undefined],
    [pickRoom("udaipur", 0, (m) => m.view === "LAKE"), customer, 12, 3, "CONFIRMED", undefined],
    [pickRoom("munnar", 1, (m) => m.hasBalcony), customer, 30, 2, "CONFIRMED", undefined],
    [pickRoom("jaipur", 0, (m) => m.view === "COURTYARD"), customer, 20, 2, "CANCELLED", undefined],
    [pickRoom("srinagar", 0, (m) => m.view === "LAKE"), guest, 5, 4, "CONFIRMED", undefined],
  ];
  for (const [m, user, start, nights, status, review] of scenarios) if (m) addBooking(m, user, start, nights, status, review);

  const chunked = async <T>(rows: T[], size: number, fn: (part: T[]) => Promise<unknown>) => {
    for (let k = 0; k < rows.length; k += size) await fn(rows.slice(k, k + size));
  };
  await chunked(bookingRows, 1000, (data) => db.booking.createMany({ data, skipDuplicates: true }));
  await chunked(paymentRows, 2000, (data) => db.payment.createMany({ data, skipDuplicates: true }));
  await chunked(reviewRows, 2000, (data) => db.review.createMany({ data, skipDuplicates: true }));
  log(`Bookings: ${bookingRows.length}, reviews: ${reviewRows.length}`);

  // Denormalised rating summary on every hotel (kept in sync when reviews are added).
  await db.$executeRaw`
    UPDATE "Hotel" h SET "ratingAvg" = s.avg, "reviewCount" = s.cnt
    FROM (SELECT "hotelId", AVG(rating)::float AS avg, COUNT(*)::int AS cnt FROM "Review" GROUP BY "hotelId") s
    WHERE s."hotelId" = h.id`;

  const manali = roomsOf("manali", 0);
  if (manali[3]) await db.roomBlock.createMany({ data: [{ id: sid("blk", "demo:1"), roomId: manali[3].id, startDate: addDays(today, 2), endDate: addDays(today, 5), reason: "Repainting" }], skipDuplicates: true });
  await db.wishlist.createMany({
    data: [sid("htl", "udaipur:1"), sid("htl", "munnar:0"), sid("htl", "goa:2")].map((hotelId) => ({ userId: customer, hotelId })),
    skipDuplicates: true,
  });

  return {
    destinations: DESTINATIONS.length,
    hotels: hotelRows.length,
    rooms: records.reduce((s, r) => s + r.rooms.length, 0),
    roomPhotos: records.reduce((s, r) => s + r.roomPhotos.length, 0),
    bookings: bookingRows.length,
    reviews: reviewRows.length,
  };
}
