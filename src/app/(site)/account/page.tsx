import type { Metadata } from "next";
import { BedDouble, CalendarCheck, Heart, Star } from "lucide-react";
import Link from "next/link";
import { BookingGroupCard } from "@/components/account/booking-group-card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { bookingCounts, customerBookings } from "@/server/account";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const [counts, upcoming] = await Promise.all([bookingCounts(user.id), customerBookings(user.id, "upcoming")]);
  const stats = [
    { label: "Upcoming stays", value: counts.upcoming, href: "/account/bookings", icon: CalendarCheck },
    { label: "Past stays", value: counts.past, href: "/account/bookings?tab=past", icon: BedDouble },
    { label: "Saved properties", value: counts.saved, href: "/account/wishlist", icon: Heart },
    { label: "Stays to review", value: counts.toReview, href: "/account/bookings?tab=past", icon: Star },
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-ink-2">Your rooms, saved places and reviews in one place.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <li key={label}>
            <Link href={href} className="block rounded-[var(--radius-lg)] border border-line bg-surface p-4 hover:border-primary">
              <Icon className="size-5 text-secondary" aria-hidden />
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
              <p className="text-sm text-ink-2">{label}</p>
            </Link>
          </li>
        ))}
      </ul>
      <section aria-labelledby="next-stay" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="next-stay" className="font-display text-2xl font-semibold">Your next stay</h2>
          {upcoming.length > 1 && <Link href="/account/bookings" className="text-sm font-medium text-primary underline">All upcoming</Link>}
        </div>
        {upcoming[0] ? (
          <BookingGroupCard code={upcoming[0].code} bookings={upcoming[0].bookings} />
        ) : (
          <EmptyState icon={CalendarCheck} title="No upcoming stays" action={<LinkButton href="/search">Find a room</LinkButton>}>
            When you book, your exact room and dates will appear here.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
