import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarX, RotateCcw } from "lucide-react";
import { CancelBookingButton } from "@/components/booking-actions";
import { StatusBadge } from "@/components/status-badge";
import { buttonClass } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, todayUtc } from "@/lib/dates";
import { VIEW_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { rebookHref } from "@/lib/rebook";
import { cn } from "@/lib/utils";
import { completePastStays } from "@/server/bookings";

export const metadata: Metadata = { title: "My bookings" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  if (user.role !== "CUSTOMER") redirect(user.role === "ADMIN" ? "/admin" : "/partner");
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "upcoming";
  await completePastStays();

  const today = todayUtc();
  const where =
    tab === "upcoming"
      ? { status: "CONFIRMED" as const, checkOut: { gt: today } }
      : tab === "past"
        ? { status: "COMPLETED" as const }
        : { status: "CANCELLED" as const };
  const bookings = await db.booking.findMany({
    where: { userId: user.id, ...where },
    include: { hotel: true, room: { include: { roomType: true, floor: true } }, review: true },
    orderBy: { checkIn: tab === "upcoming" ? "asc" : "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">My bookings</h1>
      <nav aria-label="Booking filters" className="mt-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/account?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {bookings.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CalendarX className="size-10 text-slate-400" aria-hidden />
          <p className="mt-3 font-medium">No {tab} bookings</p>
          <Link href="/search" className="mt-3 text-sm font-medium text-brand-700 underline">Find a room</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {bookings.map((b) => (
            <li key={b.id} className="rounded-xl border border-slate-200 bg-white p-5" data-testid="booking-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/bookings/${b.code}`} className="text-lg font-semibold hover:text-brand-700">{b.hotel.name}</Link>
                  <p className="text-sm text-slate-600">
                    <strong>Room {b.room.number}</strong> · {b.room.floor.name} · {b.room.roomType.name} · {VIEW_LABELS[b.room.viewType]}
                  </p>
                  <p className="text-sm text-slate-600">{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.guests} guests</p>
                  <p className="mt-1 font-mono text-xs text-slate-400">{b.code}</p>
                </div>
                <div className="text-right">
                  <StatusBadge kind="booking" status={b.status} />
                  <p className="mt-1 text-lg font-bold">{formatMoney(b.total)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/bookings/${b.code}`} className={buttonClass("secondary", "sm")}>View details</Link>
                <Link href={rebookHref(b.hotel.slug, b.roomId, b.nights, b.guests)} className={buttonClass("secondary", "sm")} data-testid={`rebook-${b.code}`}>
                  <RotateCcw className="size-4" aria-hidden /> Rebook room {b.room.number}
                </Link>
                {b.status === "CONFIRMED" && b.checkIn > today && <CancelBookingButton code={b.code} />}
                {b.status === "COMPLETED" && !b.review && <Link href={`/bookings/${b.code}`} className={buttonClass("ghost", "sm")}>Write a review</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
