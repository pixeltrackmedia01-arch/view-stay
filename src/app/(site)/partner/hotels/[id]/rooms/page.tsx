import type { Metadata } from "next";
import { RoomTypePrices, RoomsTable, type ManagedRoom } from "@/components/partner/rooms-manager";
import { requireUser } from "@/lib/auth";
import type { ViewKey } from "@/lib/catalog-types";
import { db } from "@/lib/db";
import { assertHotelAccess } from "@/server/partner";

export const metadata: Metadata = { title: "Rooms & pricing" };
export const dynamic = "force-dynamic";

export default async function PartnerRooms({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("PARTNER", "ADMIN");
  const { id } = await params;
  await assertHotelAccess(user, id);
  const [types, rooms] = await Promise.all([
    db.roomType.findMany({ where: { hotelId: id }, orderBy: { basePrice: "asc" }, include: { _count: { select: { rooms: { where: { status: { not: "INACTIVE" } } } } } } }),
    db.room.findMany({ where: { hotelId: id }, include: { floor: { select: { name: true, level: true } }, roomType: { select: { name: true } } }, orderBy: [{ floor: { level: "asc" } }, { number: "asc" }] }),
  ]);
  const managed: ManagedRoom[] = rooms.map((r) => ({
    id: r.id, number: r.number, level: r.floor.level, floor: r.floor.name, roomTypeId: r.roomTypeId, roomType: r.roomType.name, status: r.status, priceAdjustment: r.priceAdjustment,
    viewType: r.viewType as ViewKey, viewScore: r.viewScore, viewVerified: r.viewVerified, bedType: r.bedType, accessible: r.accessible, nearElevator: r.nearElevator, notes: r.notes, sizeSqm: r.sizeSqm, hasBalcony: r.hasBalcony,
  }));
  const typeRows = types.map((t) => ({ id: t.id, name: t.name, category: t.category, basePrice: t.basePrice, rooms: t._count.rooms }));
  return (
    <div className="space-y-6">
      <RoomTypePrices types={typeRows} />
      <RoomsTable rooms={managed} types={typeRows} />
    </div>
  );
}
