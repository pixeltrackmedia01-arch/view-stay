import type { Metadata } from "next";
import Link from "next/link";
import { RevenueChart } from "@/components/partner/revenue-chart";
import { Stat } from "@/components/partner/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { platformStats } from "@/server/admin";
import { partnerAnalytics } from "@/server/partner";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireUser("ADMIN");
  const [s, a] = await Promise.all([platformStats(), partnerAnalytics(null)]);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Platform overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live properties" value={s.hotels} />
        <Stat label="Awaiting approval" value={<Link href="/admin/approvals" className="underline">{s.pendingHotels}</Link>} />
        <Stat label="Customers / partners" value={`${s.users} / ${s.partners}`} />
        <Stat label="Bookings (all time)" value={s.bookings.toLocaleString("en-IN")} />
        <Stat label="Booking value (GMV)" value={formatMoney(s.gmv)} hint="Confirmed and completed" />
        <Stat label="Commission earned" value={formatMoney(s.commission)} />
        <Stat label="Occupancy, next 30 days" value={`${Math.round(a.occupancy30 * 100)}%`} />
        <Stat label="Cancelled bookings" value={a.byStatus.CANCELLED?.count ?? 0} />
      </div>
      <Card>
        <CardHeader><CardTitle as="h2">Booking value by day booked, last 30 days</CardTitle></CardHeader>
        <CardContent><RevenueChart data={a.revenueByDay} /></CardContent>
      </Card>
      <p className="text-xs text-ink-3">All figures come from demo data and the payment simulator.</p>
    </div>
  );
}
