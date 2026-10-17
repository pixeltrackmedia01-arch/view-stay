import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, toDateOnlyString } from "@/lib/dates";
import { isAppError } from "@/lib/errors";
import { VIEW_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import { getHoldForUser } from "@/server/holds";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ holdId: string }> }) {
  const { holdId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${holdId}`);

  let hold;
  try {
    hold = await getHoldForUser(user.id, holdId);
  } catch (e) {
    if (!isAppError(e)) throw e;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">This room hold is no longer active</h1>
        <p className="mt-2 text-slate-600">Holds last a few minutes. Your room may still be free — pick it again to continue.</p>
        <Link href="/search" className="mt-6 inline-block font-medium text-brand-700 underline">Back to search</Link>
      </div>
    );
  }
  const { room } = hold;
  const quote = quoteStay(roomNightlyRate(room.roomType.basePrice, room.priceAdjustment), hold.checkIn, hold.checkOut);
  const backHref = `/hotels/${room.hotel.slug}?${new URLSearchParams({
    checkIn: toDateOnlyString(hold.checkIn),
    checkOut: toDateOnlyString(hold.checkOut),
    guests: String(hold.guests),
    room: room.id,
  })}`;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Confirm your room</h1>
        <CheckoutForm
          holdId={hold.id}
          expiresAt={hold.expiresAt.toISOString()}
          total={quote.total}
          backHref={backHref}
          defaults={{ guestName: user.name, guestEmail: user.email, guestPhone: user.phone ?? "" }}
        />
      </div>
      <Card className="lg:sticky lg:top-20 lg:self-start">
        <CardHeader>
          <p className="text-xs uppercase tracking-wide text-slate-500">{room.hotel.city}</p>
          <CardTitle className="text-lg">{room.hotel.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-lg bg-brand-50 p-3">
            <p className="text-2xl font-bold text-brand-900" data-testid="checkout-room">Room {room.number}</p>
            <p className="text-brand-800">{room.floor.name} · {room.roomType.name}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone="blue">{VIEW_LABELS[room.viewType]} · {room.viewScore}/100</Badge>
              {room.hasBalcony && <Badge>Balcony</Badge>}
              {room.isCorner && <Badge>Corner</Badge>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <dt className="text-slate-500">Check-in</dt><dd className="text-right font-medium">{formatDate(hold.checkIn)}</dd>
            <dt className="text-slate-500">Check-out</dt><dd className="text-right font-medium">{formatDate(hold.checkOut)}</dd>
            <dt className="text-slate-500">Guests</dt><dd className="text-right font-medium">{hold.guests}</dd>
          </dl>
          <ul className="space-y-1 border-t border-slate-100 pt-3">
            {quote.nights.map((n) => (
              <li key={n.date} className="flex justify-between text-slate-600">
                <span>{formatDate(n.date)}{n.weekend && <span className="ml-1 text-xs text-amber-700">weekend</span>}</span>
                <span>{formatMoney(n.amount)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-slate-100 pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(quote.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Taxes (12%)</dt><dd>{formatMoney(quote.taxes)}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd data-testid="checkout-total">{formatMoney(quote.total)}</dd></div>
          </dl>
          <p className="text-xs text-slate-500">Free cancellation until the day before check-in.</p>
        </CardContent>
      </Card>
    </div>
  );
}
