import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { RevenueChart } from "@/components/partner/revenue-chart";
import { Stat } from "@/components/partner/stat";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, todayUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listPartnerHotels, partnerAnalytics } from "@/server/partner";

export const metadata: Metadata = { title: "Partner dashboard" };
export const dynamic = "force-dynamic";

export default async function PartnerHome() {
  const user = await requireUser("PARTNER", "ADMIN");
  const [hotels, stats, arrivals] = await Promise.all([
    listPartnerHotels(user.id),
    partnerAnalytics(user.id),
    db.booking.findMany({ where: { hotel: { ownerId: user.id }, status: "CONFIRMED", checkIn: { gte: todayUtc() } }, orderBy: { checkIn: "asc" }, take: 6, select: { code: true, checkIn: true, guestName: true, hotel: { select: { name: true } }, room: { select: { number: true } } } }),
  ]);
  if (!hotels.length) {
    return (
      <EmptyState icon={Building2} title="List your first property" action={<LinkButton href="/partner/hotels/new" variant="accent">Add a property</LinkButton>}>
        Choose a building template, set your prices, and we&apos;ll generate the floor plan, 3D model and room pages for you to refine.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Partner overview</h1>
        <p className="mt-1 text-ink-2">{hotels.length} propert{hotels.length === 1 ? "y" : "ies"} · {stats.roomCount} bookable rooms</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (confirmed + completed)" value={formatMoney(stats.revenue)} />
        <Stat label="Commission owed" value={formatMoney(stats.commission)} hint="15% of booking value" />
        <Stat label="Occupancy, next 30 days" value={`${Math.round(stats.occupancy30 * 100)}%`} />
        <Stat label="Cancelled bookings" value={stats.byStatus.CANCELLED?.count ?? 0} />
      </div>
      <Card>
        <CardHeader><CardTitle as="h2">Revenue, last 30 days</CardTitle></CardHeader>
        <CardContent><RevenueChart data={stats.revenueByDay} /></CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle as="h2">Upcoming arrivals</CardTitle></CardHeader>
          <CardContent>
            {arrivals.length ? (
              <ul className="divide-y divide-line text-sm">
                {arrivals.map((a) => (
                  <li key={a.code} className="flex items-center justify-between gap-3 py-2">
                    <span><span className="font-medium text-ink">{a.guestName}</span> · room {a.room.number}<span className="block text-ink-3">{a.hotel.name}</span></span>
                    <span className="text-right text-ink-2">{formatDate(a.checkIn)}<Link href={`/bookings/${a.code}`} className="block text-xs text-primary underline">{a.code}</Link></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-2">No upcoming arrivals.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle as="h2">Your properties</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-line text-sm">
              {hotels.slice(0, 8).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/partner/hotels/${h.id}`} className="font-medium text-ink hover:underline">{h.name}</Link>
                  <Badge tone={h.status === "APPROVED" ? "success" : h.status === "PENDING" ? "warning" : "danger"}>{h.status.toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
