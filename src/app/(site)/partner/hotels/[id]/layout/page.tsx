import type { Metadata } from "next";
import { FloorEditor, type EditorFloor } from "@/components/partner/floor-editor";
import { requireUser } from "@/lib/auth";
import type { HotelTemplateKey, SideKey, ViewKey } from "@/lib/catalog-types";
import { db } from "@/lib/db";
import type { Rect } from "@/lib/layout/geometry";
import { assertHotelAccess } from "@/server/partner";

export const metadata: Metadata = { title: "Floor plans" };
export const dynamic = "force-dynamic";

export default async function PartnerLayoutPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("PARTNER", "ADMIN");
  const { id } = await params;
  const hotel = await assertHotelAccess(user, id);
  const [floors, roomTypes, views] = await Promise.all([
    db.floor.findMany({ where: { hotelId: id }, orderBy: { level: "asc" }, include: { elements: true, rooms: { where: { status: { not: "INACTIVE" } }, orderBy: { number: "asc" } } } }),
    db.roomType.findMany({ where: { hotelId: id }, orderBy: { basePrice: "asc" }, select: { id: true, name: true, maxGuests: true, bedType: true } }),
    db.room.groupBy({ by: ["windowSide", "viewType"], where: { hotelId: id }, _count: true }),
  ]);
  const viewFor = (side: string) => views.filter((v) => v.windowSide === side).sort((a, b) => b._count - a._count)[0]?.viewType as ViewKey | undefined;
  const editorFloors: EditorFloor[] = floors.map((f) => ({
    id: f.id, level: f.level, name: f.name, width: f.width, height: f.height,
    wings: (Array.isArray(f.wings) ? f.wings : []) as unknown as Rect[],
    elements: f.elements.map((e) => ({ id: e.id, kind: e.kind, label: e.label, x: e.x, y: e.y, w: e.w, h: e.h })),
    rooms: f.rooms.map((r) => ({ id: r.id, key: r.id, number: r.number, roomTypeId: r.roomTypeId, x: r.x, y: r.y, w: r.w, h: r.h, windowSide: r.windowSide as SideKey, secondaryWindowSide: r.secondaryWindowSide as SideKey | null, balconySide: r.balconySide as SideKey | null, viewType: r.viewType as ViewKey })),
  }));
  return (
    <FloorEditor
      hotel={{ id: hotel.id, slug: hotel.slug, name: hotel.name, template: hotel.template as HotelTemplateKey, palette: hotel.palette, frontView: viewFor("TOP") ?? "CITY", backView: viewFor("BOTTOM") ?? null, destination: hotel.destination.name }}
      floors={editorFloors}
      roomTypes={roomTypes}
    />
  );
}
