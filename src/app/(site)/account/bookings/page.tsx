import type { Metadata } from "next";
import { CalendarX } from "lucide-react";
import Link from "next/link";
import { BookingGroupCard } from "@/components/account/booking-group-card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { bookingCounts, customerBookings, type BookingTab } from "@/server/account";

export const metadata: Metadata = { title: "My bookings" };
export const dynamic = "force-dynamic";

const TABS: { id: BookingTab; label: string; empty: string }[] = [
  { id: "upcoming", label: "Upcoming", empty: "You have no upcoming stays." },
  { id: "past", label: "Past", empty: "Completed stays will appear here, ready for a review or to book the same room again." },
  { id: "cancelled", label: "Cancelled", empty: "No cancelled bookings." },
];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab: raw } = await searchParams;
  const tab = (TABS.find((t) => t.id === raw)?.id ?? "upcoming") as BookingTab;
  const [groups, counts] = await Promise.all([customerBookings(user.id, tab), bookingCounts(user.id)]);
  const current = TABS.find((t) => t.id === tab)!;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">My bookings</h1>
      <nav aria-label="Booking status" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/account/bookings?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={cn("-mb-px flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium", t.id === tab ? "border-primary text-primary" : "border-transparent text-ink-2 hover:text-ink")}
          >
            {t.label}
            <span className="rounded-full bg-subtle px-2 text-xs text-ink-2">{counts[t.id]}</span>
          </Link>
        ))}
      </nav>
      {groups.length ? (
        <div className="space-y-4">
          {groups.map((g) => (
            <BookingGroupCard key={g.code} code={g.code} bookings={g.bookings} />
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarX} title={`No ${current.label.toLowerCase()} bookings`} action={tab === "upcoming" ? <LinkButton href="/search">Find a room</LinkButton> : undefined}>
          {current.empty}
        </EmptyState>
      )}
    </div>
  );
}
