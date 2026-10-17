import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock, MapPin, Star } from "lucide-react";
import { HotelCover } from "@/components/hotel-cover";
import { RoomPicker } from "@/components/room-map";
import { Stars } from "@/components/stars";
import { StatusBadge } from "@/components/status-badge";
import { WishlistButton } from "@/components/wishlist-button";
import { Alert } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultStay, formatDate } from "@/lib/dates";
import { isAppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { stayInput } from "@/lib/validation";
import { getHotelBySlug } from "@/server/hotels";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

async function load(slug: string) {
  const user = await getCurrentUser();
  try {
    return { user, hotel: await getHotelBySlug(slug, user) };
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hotel = await db.hotel.findUnique({ where: { slug: (await params).slug }, select: { name: true, city: true } });
  return { title: hotel ? `${hotel.name}, ${hotel.city}` : "Hotel" };
}

export default async function HotelPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { user, hotel } = await load(slug);
  const fallback = defaultStay();
  const parsed = stayInput.safeParse({ checkIn: sp.checkIn ?? fallback.checkIn, checkOut: sp.checkOut ?? fallback.checkOut, guests: sp.guests ?? "2" });
  const stay = parsed.success ? parsed.data : { ...fallback, guests: 2 };
  const saved = user ? !!(await db.wishlist.findUnique({ where: { userId_hotelId: { userId: user.id, hotelId: hotel.id } } })) : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {hotel.status !== "APPROVED" && (
        <Alert tone="amber" className="mb-4">
          Preview only — this property is <strong>{hotel.status.toLowerCase()}</strong> and not visible to travellers.
        </Alert>
      )}
      {!parsed.success && <Alert tone="amber" className="mb-4">Those dates weren&apos;t valid, so we&apos;re showing the next available dates.</Alert>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <HotelCover hue={hotel.coverHue} name={hotel.name} className="h-56 rounded-2xl sm:h-72" />
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Stars count={hotel.starRating} />
              <h1 className="text-3xl font-bold">{hotel.name}</h1>
              <p className="flex items-center gap-1 text-sm text-slate-600"><MapPin className="size-4" aria-hidden /> {hotel.address}</p>
            </div>
            {hotel.status === "APPROVED" && (!user || user.role === "CUSTOMER") && <WishlistButton hotelId={hotel.id} initial={saved} signedIn={!!user} />}
            {hotel.status !== "APPROVED" && <StatusBadge kind="hotel" status={hotel.status} />}
          </div>
          {hotel.averageRating !== null && (
            <p className="flex items-center gap-1 text-sm"><Star className="size-4 fill-amber-400 text-amber-400" aria-hidden /> <strong>{hotel.averageRating.toFixed(1)}</strong> · {hotel._count.reviews} reviews</p>
          )}
          <p className="text-slate-700">{hotel.description}</p>
          <ul className="grid grid-cols-2 gap-1.5 text-sm">
            {hotel.amenities.map((a) => (
              <li key={a} className="flex items-center gap-1.5"><Check className="size-4 text-brand-600" aria-hidden /> {a}</li>
            ))}
          </ul>
          <p className="flex items-center gap-1 text-xs text-slate-500"><Clock className="size-3.5" aria-hidden /> Check-in from {hotel.checkInTime} · Check-out by {hotel.checkOutTime}</p>
        </div>
      </div>

      <div className="mt-10">
        <RoomPicker
          slug={hotel.slug}
          hotelName={hotel.name}
          initialStay={stay}
          initialRoomId={sp.room}
          initialView={sp.view}
          signedIn={!!user}
          canBook={!user || user.role === "CUSTOMER"}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold">Room types</h2>
          <ul className="mt-3 space-y-2">
            {hotel.roomTypes.map((t) => (
              <li key={t.id} className="flex justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <span><strong>{t.name}</strong> · {t.bedType} · {t.sizeSqm} m² · up to {t.maxGuests} guests</span>
                <span className="text-slate-600">from {formatMoney(t.basePrice)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Each physical room is priced individually: higher floors, corners and balconies carry a premium; Friday and Saturday nights +15%.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold">Guest reviews</h2>
          {hotel.reviews.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No reviews yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {hotel.reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <p className="flex items-center justify-between"><strong>{r.user.name}</strong> <Stars count={r.rating} /></p>
                  <p className="mt-1 text-slate-700">{r.comment}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(r.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
