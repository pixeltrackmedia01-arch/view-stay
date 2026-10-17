import type { Metadata } from "next";
import { CalendarX, Search } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

const TONE = { CONFIRMED: "success", COMPLETED: "neutral", CANCELLED: "danger" } as const;

export default async function PartnerBookings({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; hotel?: string }> }) {
  const user = await requireUser("PARTNER", "ADMIN");
  const sp = await searchParams;
  const status = ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(sp.status ?? "") ? (sp.status as "CONFIRMED") : undefined;
  const q = sp.q?.trim().slice(0, 60);
  const where: Prisma.BookingWhereInput = {
    hotel: { ownerId: user.id },
    ...(status && { status }),
    ...(sp.hotel && { hotelId: sp.hotel }),
    ...(q && { OR: [{ code: { contains: q, mode: "insensitive" } }, { guestName: { contains: q, mode: "insensitive" } }, { room: { number: q } }] }),
  };
  const [bookings, hotels] = await Promise.all([
    db.booking.findMany({ where, orderBy: { checkIn: "desc" }, take: 100, select: { code: true, status: true, checkIn: true, checkOut: true, guestName: true, guests: true, total: true, commission: true, ratePlan: true, hotel: { select: { name: true } }, room: { select: { number: true } } } }),
    db.hotel.findMany({ where: { ownerId: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Bookings</h1>
      <form className="flex flex-wrap items-end gap-3" role="search" aria-label="Filter bookings">
        <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">Code, guest or room</span><Input name="q" defaultValue={q} className="w-56" /></label>
        <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">Status</span>
          <Select name="status" defaultValue={status ?? ""} className="w-40"><option value="">Any</option><option value="CONFIRMED">Confirmed</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></Select>
        </label>
        <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">Property</span>
          <Select name="hotel" defaultValue={sp.hotel ?? ""} className="w-56"><option value="">All</option>{hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</Select>
        </label>
        <Button type="submit" variant="secondary"><Search className="size-4" aria-hidden /> Filter</Button>
      </form>
      {bookings.length === 0 ? (
        <EmptyState icon={CalendarX} title="No bookings found">Try clearing the filters.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-subtle text-left text-ink-2">
              <tr><th className="p-3 font-medium">Booking</th><th className="p-3 font-medium">Guest</th><th className="p-3 font-medium">Room</th><th className="p-3 font-medium">Dates</th><th className="p-3 font-medium">Status</th><th className="p-3 text-right font-medium">Total</th><th className="p-3 text-right font-medium">Commission</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bookings.map((b) => (
                <tr key={b.code}>
                  <td className="p-3"><Link href={`/bookings/${b.code}`} className="font-medium text-primary underline">{b.code}</Link><span className="block text-xs text-ink-3">{b.hotel.name}</span></td>
                  <td className="p-3">{b.guestName}<span className="block text-xs text-ink-3">{b.guests} guest{b.guests > 1 ? "s" : ""}</span></td>
                  <td className="p-3">{b.room.number}</td>
                  <td className="p-3">{formatDate(b.checkIn)} – {formatDate(b.checkOut)}</td>
                  <td className="p-3"><Badge tone={TONE[b.status]}>{b.status.toLowerCase()}</Badge></td>
                  <td className="p-3 text-right">{formatMoney(b.total)}<span className="block text-xs text-ink-3">{b.ratePlan === "NON_REFUNDABLE" ? "Non-refundable" : "Flexible"}</span></td>
                  <td className="p-3 text-right text-ink-2">{formatMoney(b.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-3">Guest contact details are shown on each booking page and are only visible to you and ViewStay administrators.</p>
    </div>
  );
}
