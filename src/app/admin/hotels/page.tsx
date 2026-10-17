import type { Metadata } from "next";
import Link from "next/link";
import { HotelStatusActions } from "@/components/admin-actions";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Hotels" };
export const dynamic = "force-dynamic";

export default async function AdminHotels() {
  await requireUser("ADMIN");
  const hotels = await db.hotel.findMany({
    include: { owner: { select: { name: true } }, _count: { select: { rooms: true, bookings: true } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Hotels</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Hotel</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Rooms</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hotels.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-3"><Link href={`/hotels/${h.slug}`} className="font-medium hover:text-brand-700">{h.name}</Link><br /><span className="text-xs text-slate-500">{h.city}</span></td>
                <td className="px-4 py-3">{h.owner.name}</td>
                <td className="px-4 py-3">{h._count.rooms}</td>
                <td className="px-4 py-3">{h._count.bookings}</td>
                <td className="px-4 py-3"><StatusBadge kind="hotel" status={h.status} /></td>
                <td className="px-4 py-3"><HotelStatusActions hotelId={h.id} status={h.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
