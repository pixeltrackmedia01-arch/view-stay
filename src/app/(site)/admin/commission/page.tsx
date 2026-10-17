import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { COMMISSION_RATE } from "@/lib/config";
import { addDays, parseDateOnly, toDateOnlyString, todayUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { commissionReport } from "@/server/admin";

export const metadata: Metadata = { title: "Commission" };
export const dynamic = "force-dynamic";

export default async function AdminCommission({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const to = parseDateOnly(sp.to ?? "") ?? addDays(todayUtc(), 1);
  const from = parseDateOnly(sp.from ?? "") ?? addDays(to, -30);
  const rows = await commissionReport(from, to);
  const totals = rows.reduce((s, r) => ({ bookings: s.bookings + r.bookings, gmv: s.gmv + r.gmv, commission: s.commission + r.commission }), { bookings: 0, gmv: 0, commission: 0 });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Commission</h1>
      <p className="text-ink-2">Flat {COMMISSION_RATE * 100}% of booking value, by booking date, excluding cancellations.</p>
      <form className="flex flex-wrap items-end gap-2" aria-label="Report period">
        <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">From</span><Input type="date" name="from" defaultValue={toDateOnlyString(from)} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">To (exclusive)</span><Input type="date" name="to" defaultValue={toDateOnlyString(to)} /></label>
        <Button type="submit" variant="secondary">Update</Button>
      </form>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-subtle text-left text-ink-2"><tr><th className="p-3 font-medium">Partner</th><th className="p-3 text-right font-medium">Bookings</th><th className="p-3 text-right font-medium">Booking value</th><th className="p-3 text-right font-medium">Commission</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.ownerId}><td className="p-3">{r.name}<span className="block text-xs text-ink-3">{r.email}</span></td><td className="p-3 text-right">{r.bookings}</td><td className="p-3 text-right">{formatMoney(r.gmv)}</td><td className="p-3 text-right font-medium">{formatMoney(r.commission)}</td></tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-line font-semibold"><tr><td className="p-3">Total</td><td className="p-3 text-right">{totals.bookings}</td><td className="p-3 text-right">{formatMoney(totals.gmv)}</td><td className="p-3 text-right">{formatMoney(totals.commission)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
