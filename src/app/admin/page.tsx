import type { Metadata } from "next";
import Link from "next/link";
import { Kpi } from "@/components/dashboard-shell";
import { HotelStatusActions } from "@/components/admin-actions";
import { RevenueChart } from "@/components/revenue-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { platformStats } from "@/server/admin";
import { completePastStays } from "@/server/bookings";
import { partnerAnalytics } from "@/server/partner";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requireUser("ADMIN");
  await completePastStays();
  const [stats, analytics, pending, audit] = await Promise.all([
    platformStats(),
    partnerAnalytics(null),
    db.hotel.findMany({ where: { status: "PENDING" }, include: { owner: { select: { name: true, email: true } } } }),
    db.auditLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Marketplace overview</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="GMV" value={formatMoney(stats.gmv)} />
        <Kpi label="Bookings" value={String(stats.bookings)} />
        <Kpi label="Live hotels" value={String(stats.hotels)} />
        <Kpi label="Pending approval" value={String(stats.pendingHotels)} />
        <Kpi label="Users" value={String(stats.users)} />
      </div>
      <Card>
        <CardHeader><CardTitle>Platform revenue · last 30 days</CardTitle></CardHeader>
        <CardContent><RevenueChart data={analytics.revenueByDay} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Awaiting approval</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing to review.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <Link href={`/hotels/${h.slug}`} className="font-semibold hover:text-brand-700">{h.name}</Link> · {h.city}
                    <span className="block text-xs text-slate-500">by {h.owner.name} ({h.owner.email})</span>
                  </span>
                  <HotelStatusActions hotelId={h.id} status={h.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span><code className="text-xs">{a.action}</code> by {a.actor?.name ?? "system"}</span>
                <span className="text-xs text-slate-500">{formatDate(a.createdAt)}</span>
              </li>
            ))}
            {audit.length === 0 && <li className="text-slate-500">No activity yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
