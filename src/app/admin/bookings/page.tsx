import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { BookingsTable } from "@/components/bookings-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Bookings" };
export const dynamic = "force-dynamic";

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser("ADMIN");
  const q = (await searchParams).q?.trim();
  const where: Prisma.BookingWhereInput = q
    ? {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { guestEmail: { contains: q, mode: "insensitive" } },
          { guestName: { contains: q, mode: "insensitive" } },
          { hotel: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const bookings = await db.booking.findMany({
    where,
    include: { hotel: { select: { name: true } }, room: { select: { number: true } }, user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">All bookings</h1>
      <form className="flex max-w-md gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Code, guest, email or hotel" aria-label="Search bookings" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      <BookingsTable bookings={bookings} allowCancel />
    </div>
  );
}
