import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";
const TONE = { CONFIRMED: "success", COMPLETED: "neutral", CANCELLED: "danger" } as const;

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const status = (["CONFIRMED", "COMPLETED", "CANCELLED"] as const).find((s) => s === sp.status);
  const where: Prisma.BookingWhereInput = {
    ...(status && { status }),
    ...(q && { OR: [{ code: { contains: q, mode: "insensitive" } }, { guestName: { contains: q, mode: "insensitive" } }, { guestEmail: { contains: q, mode: "insensitive" } }, { hotel: { name: { contains: q, mode: "insensitive" } } }] }),
  };
  const bookings = await db.booking.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, select: { code: true, status: true, checkIn: true, checkOut: true, guestName: true, total: true, commission: true, hotel: { select: { name: true } }, room: { select: { number: true } } } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Bookings</h1>
      <form className="flex flex-wrap items-end gap-2" role="search" aria-label="Search bookings">
        <Input name="q" defaultValue={q} placeholder="Code, guest, email or property" className="w-72" aria-label="Search bookings" />
        <Select name="status" defaultValue={status ?? ""} className="w-40" aria-label="Status"><option value="">Any status</option><option value="CONFIRMED">Confirmed</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></Select>
        <Button type="submit" variant="secondary"><Search className="size-4" aria-hidden /> Search</Button>
      </form>
      <p className="text-sm text-ink-2">Showing the {bookings.length} most recent matches. Open a booking to see guest details or cancel it (admin cancellations are always refunded and audit-logged).</p>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-subtle text-left text-ink-2"><tr><th className="p-3 font-medium">Booking</th><th className="p-3 font-medium">Property / room</th><th className="p-3 font-medium">Guest</th><th className="p-3 font-medium">Dates</th><th className="p-3 font-medium">Status</th><th className="p-3 text-right font-medium">Total</th></tr></thead>
          <tbody className="divide-y divide-line">
            {bookings.map((b) => (
              <tr key={b.code}>
                <td className="p-3"><Link href={`/bookings/${b.code}`} className="font-medium text-primary underline">{b.code}</Link></td>
                <td className="p-3">{b.hotel.name}<span className="block text-xs text-ink-3">Room {b.room.number}</span></td>
                <td className="p-3">{b.guestName}</td>
                <td className="p-3">{formatDate(b.checkIn)} – {formatDate(b.checkOut)}</td>
                <td className="p-3"><Badge tone={TONE[b.status]}>{b.status.toLowerCase()}</Badge></td>
                <td className="p-3 text-right">{formatMoney(b.total)}<span className="block text-xs text-ink-3">{formatMoney(b.commission)} commission</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
