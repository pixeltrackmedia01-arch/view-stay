import type { Metadata } from "next";
import { Heart } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "@/components/hotel/property-card";
import { WishlistButton } from "@/components/hotel/wishlist-button";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultStay, parseDateOnly } from "@/lib/dates";
import { searchHotels } from "@/server/search";

export const metadata: Metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireUser();
  const saved = await db.wishlist.findMany({ where: { userId: user.id }, include: { hotel: { select: { id: true, name: true, slug: true, status: true, destination: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } });
  const stay = defaultStay();
  const ids = saved.map((s) => s.hotelId);
  const results = ids.length ? await searchHotels({ hotelIds: ids, checkIn: parseDateOnly(stay.checkIn)!, checkOut: parseDateOnly(stay.checkOut)!, guests: 2, rooms: 1, pageSize: 50 }) : null;
  const found = new Set(results?.hotels.map((h) => h.id));
  const unavailable = saved.filter((s) => !found.has(s.hotelId));
  const query = new URLSearchParams({ ...stay, guests: "2", rooms: "1" }).toString();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Wishlist</h1>
        <p className="mt-1 text-ink-2">Prices and availability shown for {stay.checkIn} to {stay.checkOut}, 2 guests.</p>
      </div>
      {saved.length === 0 ? (
        <EmptyState icon={Heart} title="Nothing saved yet" action={<LinkButton href="/search">Explore stays</LinkButton>}>
          Tap the heart on any property to keep it here.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results?.hotels.map((h) => (
              <PropertyCard key={h.id} hotel={h} query={query} saved signedIn />
            ))}
          </div>
          {unavailable.length > 0 && (
            <section aria-labelledby="unavail" className="space-y-2">
              <h2 id="unavail" className="font-semibold">Not available for these dates</h2>
              <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
                {unavailable.map((s) => (
                  <li key={s.hotelId} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <Link href={`/hotels/${s.hotel.slug}`} className="font-medium text-ink hover:underline">{s.hotel.name}</Link>
                      <p className="text-sm text-ink-3">{s.hotel.destination.name}{s.hotel.status !== "APPROVED" ? " · currently not listed" : " · try other dates"}</p>
                    </div>
                    <WishlistButton hotelId={s.hotelId} hotelName={s.hotel.name} initial signedIn />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
