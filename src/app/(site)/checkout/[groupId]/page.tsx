import type { Metadata } from "next";
import { TimerOff } from "lucide-react";
import { redirect } from "next/navigation";
import { CheckoutForm, type CheckoutRoom } from "@/components/booking/checkout-form";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth";
import { cancellationTerms } from "@/lib/cancellation";
import { VIEW_LABELS } from "@/lib/catalog-types";
import { formatDate, nightsBetween, toDateOnlyString } from "@/lib/dates";
import { isAppError } from "@/lib/errors";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import { getHoldGroupForUser } from "@/server/holds";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${groupId}`);

  let holds;
  try {
    holds = await getHoldGroupForUser(user.id, groupId);
  } catch (e) {
    if (!isAppError(e)) throw e;
    holds = null;
  }
  if (!holds || holds.every((h) => h.expiresAt <= new Date())) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={TimerOff} title="This room hold is no longer active" action={<LinkButton href="/search">Find your room again</LinkButton>}>
          Holds last 10 minutes so rooms aren&apos;t locked away from other travellers. Your room may still be free.
        </EmptyState>
      </div>
    );
  }

  const first = holds[0];
  const hotel = first.room.hotel;
  const totalGuests = holds.reduce((s, h) => s + h.guests, 0);
  const rooms: CheckoutRoom[] = holds.map((h) => {
    const base = roomNightlyRate(h.room.roomType.basePrice, h.room.priceAdjustment);
    const q = (plan: "FLEXIBLE" | "NON_REFUNDABLE") => {
      const x = quoteStay(base, h.checkIn, h.checkOut, plan);
      return { subtotal: x.subtotal, discount: x.discount, taxes: x.taxes, total: x.total, nights: x.nights };
    };
    return {
      id: h.room.id,
      number: h.room.number,
      floor: h.room.floor.name,
      roomType: h.room.roomType.name,
      view: VIEW_LABELS[h.room.viewType],
      photo: h.room.photos[0]?.asset.path ?? null,
      guests: h.guests,
      quotes: { FLEXIBLE: q("FLEXIBLE"), NON_REFUNDABLE: q("NON_REFUNDABLE") },
    };
  });
  const backHref = `/hotels/${hotel.slug}?${new URLSearchParams({
    checkIn: toDateOnlyString(first.checkIn),
    checkOut: toDateOnlyString(first.checkOut),
    guests: String(totalGuests),
    rooms: String(holds.length),
    room: first.room.id,
  })}#rooms`;

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">Confirm your {holds.length > 1 ? "rooms" : "room"}</h1>
      <CheckoutForm
        groupId={groupId}
        expiresAt={new Date(Math.min(...holds.map((h) => h.expiresAt.getTime()))).toISOString()}
        hotel={{ name: hotel.name, slug: hotel.slug, destination: hotel.destination.name }}
        stay={{
          checkIn: toDateOnlyString(first.checkIn),
          checkOut: toDateOnlyString(first.checkOut),
          checkInLabel: formatDate(first.checkIn),
          checkOutLabel: formatDate(first.checkOut),
          nights: nightsBetween(first.checkIn, first.checkOut),
          guests: totalGuests,
        }}
        rooms={rooms}
        terms={{
          FLEXIBLE: cancellationTerms(hotel.cancellationPolicy, "FLEXIBLE", first.checkIn).summary,
          NON_REFUNDABLE: cancellationTerms(hotel.cancellationPolicy, "NON_REFUNDABLE", first.checkIn).summary,
        }}
        backHref={backHref}
        defaults={{ guestName: user.name, guestEmail: user.email, guestPhone: user.phone ?? "" }}
      />
    </div>
  );
}
