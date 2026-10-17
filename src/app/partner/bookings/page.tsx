import type { Metadata } from "next";
import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { BookingsTable } from "@/components/bookings-table";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Partner bookings" };
export const dynamic = "force-dynamic";

const STATUSES: BookingStatus[] = ["CONFIRMED", "COMPLETED", "CANCELLED"];

export default async function PartnerBookings({ searchParams }: { searchParams: Promise<{ status?: string; hotel?: string }> }) {
  const user = await requireUser("PARTNER", "ADMIN");
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const hotels = await db.hotel.findMany({ where: { ownerId: user.id }, select: { id: true, name: true } });
  const hotelId = hotels.find((h) => h.id === sp.hotel)?.id;
  const bookings = await db.booking.findMany({
    where: { hotel: { ownerId: user.id }, ...(status ? { status } : {}), ...(hotelId ? { hotelId } : {}) },
    include: { hotel: { select: { name: true } }, room: { select: { number: true } } },
    orderBy: { checkIn: "desc" },
    take: 200,
  });
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, hotel: hotelId, ...patch })) if (v) p.set(k, v);
    return `/partner/bookings?${p}`;
  };
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium", on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 bg-white");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bookings</h1>
      <div className="flex flex-wrap gap-2">
        <Link href={link({ status: undefined })} className={chip(!status)}>All statuses</Link>
        {STATUSES.map((s) => <Link key={s} href={link({ status: s })} className={chip(status === s)}>{s.toLowerCase()}</Link>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={link({ hotel: undefined })} className={chip(!hotelId)}>All properties</Link>
        {hotels.map((h) => <Link key={h.id} href={link({ hotel: h.id })} className={chip(hotelId === h.id)}>{h.name}</Link>)}
      </div>
      <BookingsTable bookings={bookings} allowCancel />
    </div>
  );
}
