import type { PrismaClient, ViewType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, todayUtc } from "@/lib/dates";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";

export const SEED_PASSWORD = "Password123!";

interface RoomTypeSeed {
  name: string;
  description: string;
  bedType: string;
  maxGuests: number;
  sizeSqm: number;
  basePrice: number;
}

interface HotelSeed {
  slug: string;
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  starRating: number;
  coverHue: number;
  amenities: string[];
  owner: "partner" | "partner2";
  status?: "APPROVED" | "PENDING";
  floors: number;
  frontView: ViewType;
  backView: ViewType;
  types: RoomTypeSeed[];
}

const HOTELS: HotelSeed[] = [
  {
    slug: "azure-bay-resort-goa",
    name: "Azure Bay Resort",
    city: "Goa",
    country: "India",
    address: "Candolim Beach Road, North Goa 403515",
    description:
      "A breezy beachfront resort where every front-row room looks straight onto the Arabian Sea. Wake to the surf, watch fishing boats at sunset, and pick the exact balcony you want.",
    starRating: 5,
    coverHue: 190,
    amenities: ["Beach access", "Infinity pool", "Spa", "Free Wi-Fi", "Breakfast included", "Airport shuttle"],
    owner: "partner",
    floors: 4,
    frontView: "SEA",
    backView: "GARDEN",
    types: [
      { name: "Deluxe", description: "Bright room with rain shower and work desk", bedType: "Queen", maxGuests: 2, sizeSqm: 28, basePrice: 650000 },
      { name: "Premium", description: "Larger room with lounge chair and bathtub", bedType: "King", maxGuests: 3, sizeSqm: 36, basePrice: 890000 },
      { name: "Suite", description: "Separate living area, wraparound windows", bedType: "King + Sofa bed", maxGuests: 4, sizeSqm: 58, basePrice: 1450000 },
    ],
  },
  {
    slug: "pinecrest-lodge-manali",
    name: "Pinecrest Lodge",
    city: "Manali",
    country: "India",
    address: "Old Manali Road, Manali, Himachal Pradesh 175131",
    description:
      "A timber-and-stone lodge above the Beas valley. Upper-floor rooms frame snow peaks of the Pir Panjal range; corner rooms get two walls of windows.",
    starRating: 4,
    coverHue: 150,
    amenities: ["Mountain view", "Fireplace lounge", "Free Wi-Fi", "Heated rooms", "Restaurant", "Parking"],
    owner: "partner",
    floors: 3,
    frontView: "MOUNTAIN",
    backView: "GARDEN",
    types: [
      { name: "Valley Room", description: "Cosy pine-panelled room", bedType: "Queen", maxGuests: 2, sizeSqm: 24, basePrice: 420000 },
      { name: "Family Room", description: "Two double beds and a reading nook", bedType: "Two Doubles", maxGuests: 4, sizeSqm: 34, basePrice: 620000 },
    ],
  },
  {
    slug: "marine-crown-mumbai",
    name: "Marine Crown",
    city: "Mumbai",
    country: "India",
    address: "Marine Drive, Churchgate, Mumbai 400020",
    description:
      "An art-deco landmark on the Queen's Necklace. Choose a sea-facing room over Marine Drive or a quieter city-side room away from the lifts.",
    starRating: 5,
    coverHue: 220,
    amenities: ["Sea view", "Rooftop bar", "Gym", "Free Wi-Fi", "24h room service", "Valet parking"],
    owner: "partner",
    floors: 5,
    frontView: "SEA",
    backView: "CITY",
    types: [
      { name: "Classic", description: "Art-deco styled room", bedType: "Queen", maxGuests: 2, sizeSqm: 25, basePrice: 780000 },
      { name: "Bay Premium", description: "Larger room with bay window seat", bedType: "King", maxGuests: 3, sizeSqm: 34, basePrice: 1080000 },
    ],
  },
  {
    slug: "lakeside-haveli-udaipur",
    name: "Lakeside Haveli",
    city: "Udaipur",
    country: "India",
    address: "Gangaur Ghat, Udaipur, Rajasthan 313001",
    description:
      "A restored 18th-century haveli with jharokha windows. Garden rooms open to fountains; upper rooms overlook the pool courtyard and city palace skyline.",
    starRating: 4,
    coverHue: 32,
    amenities: ["Heritage property", "Pool", "Rooftop restaurant", "Free Wi-Fi", "Cultural evenings"],
    owner: "partner2",
    floors: 3,
    frontView: "POOL",
    backView: "COURTYARD",
    types: [
      { name: "Heritage", description: "Hand-painted walls and carved furniture", bedType: "King", maxGuests: 2, sizeSqm: 30, basePrice: 540000 },
      { name: "Royal Suite", description: "Jharokha balcony and sitting room", bedType: "King + Daybed", maxGuests: 3, sizeSqm: 52, basePrice: 1150000 },
    ],
  },
  {
    slug: "teahill-retreat-munnar",
    name: "Teahill Retreat",
    city: "Munnar",
    country: "India",
    address: "Chithirapuram, Munnar, Kerala 685565",
    description: "Perched over rolling tea estates. Every hill-side room has a balcony with mist-covered mountain views at sunrise.",
    starRating: 4,
    coverHue: 110,
    amenities: ["Mountain view", "Plantation walks", "Ayurvedic spa", "Free Wi-Fi", "Breakfast included"],
    owner: "partner2",
    floors: 2,
    frontView: "MOUNTAIN",
    backView: "GARDEN",
    types: [
      { name: "Estate Room", description: "Warm room with planter's chair", bedType: "Queen", maxGuests: 2, sizeSqm: 26, basePrice: 380000 },
      { name: "Hill Villa", description: "Spacious villa room with sit-out", bedType: "King", maxGuests: 4, sizeSqm: 44, basePrice: 720000 },
    ],
  },
  {
    slug: "pink-city-courtyard-jaipur",
    name: "Pink City Courtyard",
    city: "Jaipur",
    country: "India",
    address: "MI Road, Jaipur, Rajasthan 302001",
    description: "A boutique stay awaiting marketplace approval — visible to partners and admins only.",
    starRating: 3,
    coverHue: 340,
    amenities: ["Pool", "Free Wi-Fi", "Rooftop cafe"],
    owner: "partner2",
    status: "PENDING",
    floors: 2,
    frontView: "CITY",
    backView: "POOL",
    types: [{ name: "Standard", description: "Simple, comfortable room", bedType: "Queen", maxGuests: 2, sizeSqm: 20, basePrice: 290000 }],
  },
];

// Floor grid: 14 wide x 6 tall. Rooms in front row (y=0) face the hotel's primary view;
// back row (y=4) faces the secondary view. Lift in the centre of the front row.
const WIDTH = 14;
const FRONT_SLOTS = [0, 2, 4, 8, 10, 12];
const BACK_SLOTS = [0, 2, 4, 6, 8, 10, 12];

function typeForSlot<T>(types: T[], row: "front" | "back", idx: number, slots: number[]) {
  const last = types.length - 1;
  if (row === "front" && (idx === 0 || idx === slots.length - 1)) return types[last]; // corner premium
  if (row === "front") return types[Math.min(1, last)];
  return types[0];
}

/** Load demo data. With `reset`, existing rows are deleted first. */
export async function seedDatabase(db: PrismaClient, { reset = false }: { reset?: boolean } = {}) {
  if (reset) await db.$transaction([
    db.auditLog.deleteMany(),
    db.review.deleteMany(),
    db.payment.deleteMany(),
    db.booking.deleteMany(),
    db.roomHold.deleteMany(),
    db.roomBlock.deleteMany(),
    db.wishlist.deleteMany(),
    db.room.deleteMany(),
    db.mapElement.deleteMany(),
    db.floor.deleteMany(),
    db.roomType.deleteMany(),
    db.hotel.deleteMany(),
    db.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const mk = (email: string, name: string, role: "CUSTOMER" | "PARTNER" | "ADMIN", phone?: string) =>
    db.user.create({ data: { email, name, role, passwordHash, phone } });
  const admin = await mk("admin@viewstay.dev", "Asha Admin", "ADMIN");
  const partner = await mk("partner@viewstay.dev", "Rahul Partner", "PARTNER", "+91 98200 11111");
  const partner2 = await mk("partner2@viewstay.dev", "Meera Hoteliers", "PARTNER", "+91 98200 22222");
  const customer = await mk("customer@viewstay.dev", "Priya Traveller", "CUSTOMER", "+91 98765 43210");
  const customer2 = await mk("guest@viewstay.dev", "Arjun Guest", "CUSTOMER", "+91 99887 76655");
  const owners = { partner, partner2 };

  const allRooms: { id: string; hotelId: string; basePrice: number; priceAdjustment: number; maxGuests: number; number: string }[] = [];

  for (const h of HOTELS) {
    const hotel = await db.hotel.create({
      data: {
        slug: h.slug,
        name: h.name,
        city: h.city,
        country: h.country,
        address: h.address,
        description: h.description,
        starRating: h.starRating,
        coverHue: h.coverHue,
        amenities: h.amenities,
        status: h.status ?? "APPROVED",
        ownerId: owners[h.owner].id,
      },
    });
    const types = [];
    for (const t of h.types) types.push(await db.roomType.create({ data: { ...t, hotelId: hotel.id } }));

    for (let level = 1; level <= h.floors; level++) {
      const floor = await db.floor.create({
        data: {
          hotelId: hotel.id,
          level,
          name: level === 1 ? "First floor" : `Floor ${level}`,
          width: WIDTH,
          height: 6,
          elements: {
            create: [
              { kind: "CORRIDOR", label: "Corridor", x: 0, y: 2, w: WIDTH, h: 2 },
              { kind: "ELEVATOR", label: "Lift", x: 6, y: 0, w: 2, h: 2 },
              { kind: "SERVICE", label: "Ice & laundry", x: 12, y: 4, w: 2, h: 2 },
            ],
          },
        },
      });
      let n = 1;
      const rows: ["front" | "back", number[], number][] = [
        ["front", FRONT_SLOTS, 0],
        ["back", BACK_SLOTS.slice(0, 6), 4],
      ];
      for (const [row, slots, y] of rows) {
        for (let i = 0; i < slots.length; i++) {
          const x = slots[i];
          const type = typeForSlot(types, row, i, slots);
          const isCorner = x === 0 || x === WIDTH - 2 || (row === "back" && x === 10);
          const nearElevator = row === "front" ? x === 4 || x === 8 : x === 6;
          const view = row === "front" ? h.frontView : h.backView;
          const viewScore = Math.min(
            98,
            (row === "front" ? 62 : 38) + level * (row === "front" ? 7 : 3) + (isCorner ? 6 : 0) - (nearElevator ? 4 : 0),
          );
          const hasBalcony = row === "front" ? level >= 2 || isCorner : isCorner && level >= 2;
          const priceAdjustment = (level - 1) * 25000 + (isCorner ? 40000 : 0) + (hasBalcony ? 30000 : 0) - (nearElevator ? 20000 : 0);
          const room = await db.room.create({
            data: {
              hotelId: hotel.id,
              floorId: floor.id,
              roomTypeId: type.id,
              number: `${level}${String(n++).padStart(2, "0")}`,
              x,
              y,
              w: 2,
              h: 2,
              viewType: view,
              viewScore,
              viewVerified: row === "front",
              hasBalcony,
              isCorner,
              windowCount: isCorner ? 2 : 1,
              nearElevator,
              accessible: level === 1 && i === 1,
              priceAdjustment,
              notes: isCorner && row === "front" ? "Corner room with two large windows" : nearElevator ? "Next to the lift lobby" : null,
              // A room under maintenance to demonstrate status handling
              status: level === 2 && row === "back" && i === 2 ? "MAINTENANCE" : "ACTIVE",
            },
          });
          allRooms.push({ id: room.id, hotelId: hotel.id, basePrice: type.basePrice, priceAdjustment, maxGuests: type.maxGuests, number: room.number });
        }
      }
    }
  }

  // Bookings: completed past stays (with reviews) and upcoming stays across hotels.
  const today = todayUtc();
  let seq = 1;
  const book = async (roomIdx: number, userId: string, startOffset: number, nights: number, status: "CONFIRMED" | "COMPLETED" | "CANCELLED") => {
    const r = allRooms[roomIdx];
    const checkIn = addDays(today, startOffset);
    const checkOut = addDays(checkIn, nights);
    const q = quoteStay(roomNightlyRate(r.basePrice, r.priceAdjustment), checkIn, checkOut);
    const user = userId === customer.id ? customer : customer2;
    return db.booking.create({
      data: {
        code: `VS-SEED${String(seq++).padStart(4, "0")}`,
        userId,
        hotelId: r.hotelId,
        roomId: r.id,
        checkIn,
        checkOut,
        nights,
        guests: Math.min(2, r.maxGuests),
        guestName: user.name,
        guestEmail: user.email,
        guestPhone: user.phone ?? "+91 90000 00000",
        nightlyRate: q.nightlyBase,
        subtotal: q.subtotal,
        taxes: q.taxes,
        total: q.total,
        status,
        cancelledAt: status === "CANCELLED" ? addDays(today, -1) : null,
        createdAt: addDays(today, Math.min(-1, startOffset - 14 + (seq % 10))),
        payments: {
          create: {
            reference: `pay_seed_${seq}`,
            amount: q.total,
            cardLast4: "4242",
            status: status === "CANCELLED" ? "REFUNDED" : "SUCCEEDED",
          },
        },
      },
    });
  };

  const past1 = await book(2, customer.id, -20, 3, "COMPLETED");
  const past2 = await book(72, customer.id, -12, 2, "COMPLETED");
  const past3 = await book(5, customer2.id, -9, 4, "COMPLETED");
  await book(70, customer2.id, -6, 2, "COMPLETED");
  await book(3, customer.id, 7, 3, "CONFIRMED");
  await book(0, customer2.id, 1, 2, "CONFIRMED");
  await book(1, customer2.id, 2, 5, "CONFIRMED");
  await book(8, customer2.id, 3, 2, "CONFIRMED");
  await book(41, customer2.id, 1, 3, "CONFIRMED");
  await book(75, customer2.id, 4, 2, "CONFIRMED");
  await book(100, customer.id, 15, 2, "CANCELLED");
  for (let i = 0; i < 18; i++) {
    // Spread of recent bookings for dashboard charts
    await book(12 + i * 3, i % 2 ? customer2.id : customer.id, 20 + i * 2, 1 + (i % 3), "CONFIRMED");
  }

  await db.review.createMany({
    data: [
      { bookingId: past1.id, hotelId: past1.hotelId, userId: customer.id, rating: 5, comment: "Picked room 103 for the sea view and it was exactly as shown on the map. Magical sunsets." },
      { bookingId: past2.id, hotelId: past2.hotelId, userId: customer.id, rating: 4, comment: "Loved choosing a high corner room away from the lift. Very quiet, great valley view." },
      { bookingId: past3.id, hotelId: past3.hotelId, userId: customer2.id, rating: 5, comment: "The balcony room was worth every rupee. Being able to pick it in advance is a game changer." },
    ],
  });

  // A maintenance block on one room for the next few days
  await db.roomBlock.create({
    data: { roomId: allRooms[9].id, startDate: addDays(today, 2), endDate: addDays(today, 5), reason: "Repainting" },
  });
  await db.wishlist.create({ data: { userId: customer.id, hotelId: allRooms[72].hotelId } });

  const counts = { users: await db.user.count(), hotels: await db.hotel.count(), rooms: await db.room.count(), bookings: await db.booking.count() };
  void admin;
  return counts;
}
