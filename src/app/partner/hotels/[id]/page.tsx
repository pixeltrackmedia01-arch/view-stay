import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Kpi } from "@/components/dashboard-shell";
import { RoomInventory, type InventoryRoom } from "@/components/room-inventory";
import { StatusBadge } from "@/components/status-badge";
import { Alert } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, toDateOnlyString, todayUtc } from "@/lib/dates";
import { isAppError } from "@/lib/errors";
import { assertHotelAccess } from "@/server/partner";

export const metadata: Metadata = { title: "Manage property" };
export const dynamic = "force-dynamic";

export default async function PartnerHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("PARTNER", "ADMIN");
  let hotel;
  try {
    hotel = await assertHotelAccess(user, id);
  } catch (e) {
    if (isAppError(e)) notFound();
    throw e;
  }
  const today = todayUtc();
  const [rooms, tonight] = await Promise.all([
    db.room.findMany({
      where: { hotelId: hotel.id },
      include: { roomType: true, floor: true, blocks: { where: { endDate: { gt: today } }, orderBy: { startDate: "asc" } } },
      orderBy: [{ floor: { level: "asc" } }, { number: "asc" }],
    }),
    db.booking.findMany({
      where: { hotelId: hotel.id, status: { not: "CANCELLED" }, checkIn: { lte: today }, checkOut: { gt: today } },
      select: { roomId: true },
    }),
  ]);
  const occupied = new Set(tonight.map((b) => b.roomId));
  const inventory: InventoryRoom[] = rooms.map((r) => ({
    id: r.id,
    number: r.number,
    floorName: r.floor.name,
    roomTypeName: r.roomType.name,
    basePrice: r.roomType.basePrice,
    priceAdjustment: r.priceAdjustment,
    status: r.status,
    viewType: r.viewType,
    viewScore: r.viewScore,
    viewVerified: r.viewVerified,
    hasBalcony: r.hasBalcony,
    isCorner: r.isCorner,
    accessible: r.accessible,
    windowCount: r.windowCount,
    notes: r.notes,
    occupiedTonight: occupied.has(r.id),
    blocks: r.blocks.map((b) => ({ id: b.id, startDate: toDateOnlyString(b.startDate), endDate: toDateOnlyString(b.endDate), reason: b.reason })),
  }));
  const active = rooms.filter((r) => r.status === "ACTIVE").length;
  const preview = new URLSearchParams({ checkIn: toDateOnlyString(addDays(today, 1)), checkOut: toDateOnlyString(addDays(today, 3)), guests: "2" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{hotel.name}</h1>
          <p className="text-sm text-slate-600">{hotel.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge kind="hotel" status={hotel.status} />
          <Link href={`/hotels/${hotel.slug}?${preview}`} className={buttonClass("secondary", "sm")}>
            <ExternalLink className="size-4" aria-hidden /> View public page
          </Link>
        </div>
      </div>
      {hotel.status === "PENDING" && <Alert tone="amber">This property is awaiting admin approval and is not yet bookable.</Alert>}
      {hotel.status === "SUSPENDED" && <Alert>This property has been suspended by ViewStay. Contact support.</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Rooms" value={String(rooms.length)} hint={`${active} active`} />
        <Kpi label="Occupied tonight" value={String(occupied.size)} hint={`${active ? Math.round((occupied.size / active) * 100) : 0}% of active rooms`} />
        <Kpi label="Out of service" value={String(rooms.length - active)} />
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Room inventory</h2>
        <RoomInventory rooms={inventory} />
      </section>
    </div>
  );
}
