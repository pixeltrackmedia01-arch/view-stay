import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BookingsTable } from "@/components/bookings-table";
import { Kpi } from "@/components/dashboard-shell";
import { RevenueChart } from "@/components/revenue-chart";
import { StatusBadge } from "@/components/status-badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { completePastStays } from "@/server/bookings";
import { listPartnerHotels, partnerAnalytics } from "@/server/partner";

export const metadata: Metadata = { title: "Partner dashboard" };
export const dynamic = "force-dynamic";

export default async function PartnerOverview() {
  const user = await requireUser("PARTNER", "ADMIN");
  await completePastStays();
  const [hotels, stats, recent] = await Promise.all([
    listPartnerHotels(user.id),
    partnerAnalytics(user.id),
    db.booking.findMany({
      where: { hotel: { ownerId: user.id } },
      include: { hotel: { select: { name: true } }, room: { select: { number: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const upcoming = stats.byStatus.CONFIRMED?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
          <p className="text-sm text-slate-600">Room-level performance across your properties.</p>
        </div>
        <Link href="/partner/hotels/new" className={buttonClass("primary", "sm")}><Plus className="size-4" aria-hidden /> Add property</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Booked revenue" value={formatMoney(stats.revenue)} hint="Confirmed + completed" />
        <Kpi label="Active bookings" value={String(upcoming)} />
        <Kpi label="Occupancy (next 30d)" value={`${Math.round(stats.occupancy30 * 100)}%`} />
        <Kpi label="Bookable rooms" value={String(stats.roomCount)} />
      </div>
      <Card>
        <CardHeader><CardTitle>Revenue by booking date · last 30 days</CardTitle></CardHeader>
        <CardContent><RevenueChart data={stats.revenueByDay} /></CardContent>
      </Card>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Your properties</h2>
        {hotels.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No properties yet. <Link href="/partner/hotels/new" className="text-brand-700 underline">Add your first property</Link>.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {hotels.map((h) => (
              <li key={h.id}>
                <Link href={`/partner/hotels/${h.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500" data-testid="partner-hotel">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{h.name}</p>
                      <p className="text-sm text-slate-500">{h.city}</p>
                    </div>
                    <StatusBadge kind="hotel" status={h.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{h._count.rooms} rooms · {h._count.bookings} bookings</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Latest bookings</h2>
        <BookingsTable bookings={recent} />
      </section>
    </div>
  );
}
