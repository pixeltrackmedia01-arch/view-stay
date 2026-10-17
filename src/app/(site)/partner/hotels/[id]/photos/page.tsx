import type { Metadata } from "next";
import Link from "next/link";
import { PhotoManager } from "@/components/partner/photo-manager";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { assertHotelAccess } from "@/server/partner";

export const metadata: Metadata = { title: "Room photos" };
export const dynamic = "force-dynamic";

export default async function PartnerPhotos({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ room?: string }> }) {
  const user = await requireUser("PARTNER", "ADMIN");
  const { id } = await params;
  const { room: roomParam } = await searchParams;
  await assertHotelAccess(user, id);
  const rooms = await db.room.findMany({ where: { hotelId: id, status: { not: "INACTIVE" } }, select: { id: true, number: true, _count: { select: { photos: true } } }, orderBy: { number: "asc" } });
  const current = rooms.find((r) => r.id === roomParam) ?? rooms[0];
  const photos = current
    ? await db.roomPhoto.findMany({ where: { roomId: current.id }, orderBy: { sortOrder: "asc" }, select: { id: true, alt: true, category: true, isPrimary: true, illustrative: true, asset: { select: { path: true } } } })
    : [];
  return (
    <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
      <nav aria-label="Rooms" className="max-h-[70vh] overflow-y-auto">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {rooms.map((r) => (
            <li key={r.id} className="shrink-0">
              <Link href={`?room=${r.id}`} aria-current={r.id === current?.id ? "page" : undefined} className={cn("flex min-h-10 items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 text-sm", r.id === current?.id ? "bg-primary text-white" : "hover:bg-subtle")}>
                Room {r.number} <span className="text-xs opacity-70">{r._count.photos}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {current ? (
        <PhotoManager key={current.id} roomId={current.id} roomNumber={current.number} photos={photos.map((p) => ({ id: p.id, path: p.asset.path, alt: p.alt, category: p.category, isPrimary: p.isPrimary, illustrative: p.illustrative }))} />
      ) : (
        <p className="text-ink-2">Add rooms in Floor plans first.</p>
      )}
    </div>
  );
}
