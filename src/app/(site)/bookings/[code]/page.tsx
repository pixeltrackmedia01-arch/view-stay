import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, CreditCard, MapPin, Repeat, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelBookingButton, RebookPanel, ReviewForm } from "@/components/booking/booking-actions";
import { Alert, Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Photo } from "@/components/ui/photo";
import { getCurrentUser } from "@/lib/auth";
import { cancellationTerms, refundOnCancel } from "@/lib/cancellation";
import { VIEW_LABELS } from "@/lib/catalog-types";
import { formatDate, todayUtc } from "@/lib/dates";
import { isAppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { RATE_PLANS } from "@/lib/pricing";
import { getBookingGroupForViewer } from "@/server/bookings";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_TONE = { CONFIRMED: "success", CANCELLED: "danger", COMPLETED: "neutral" } as const;

export default async function BookingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ new?: string }> }) {
  const { code } = await params;
  const { new: isNew } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/bookings/${code}`);
  let bookings;
  try {
    bookings = await getBookingGroupForViewer(user, code);
  } catch (e) {
    if (isAppError(e)) notFound();
    throw e;
  }
  const first = bookings[0];
  const hotel = first.hotel;
  const isGuest = first.userId === user.id;
  // Property and ViewStay staff can also cancel; their cancellations are always refunded.
  const isStaff = user.role === "ADMIN" || (user.role === "PARTNER" && hotel.ownerId === user.id);
  const groupCode = first.groupCode ?? first.code;
  const total = bookings.reduce((s, b) => s + b.total, 0);
  const terms = cancellationTerms(hotel.cancellationPolicy, first.ratePlan, first.checkIn);
  const upcoming = first.checkIn > todayUtc();
  const allCancelled = bookings.every((b) => b.status === "CANCELLED");

  return (
    <div className="container-page max-w-5xl space-y-6 py-8">
      {isNew && !allCancelled && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-available-soft p-5 text-available" role="status" data-testid="booking-confirmed">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-xl text-ink">Your {bookings.length > 1 ? "rooms are" : "room is"} booked</p>
            <p className="text-sm text-ink-2">
              Confirmation {groupCode}. You booked {bookings.map((b) => `room ${b.room.number}`).join(" and ")}, exactly as selected. A confirmation has been recorded for {first.guestEmail}.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-3">Booking {groupCode}</p>
          <h1 className="font-display text-3xl font-semibold">{hotel.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-ink-2">
            <MapPin className="size-4" aria-hidden /> {hotel.address}
          </p>
        </div>
        <LinkButton href={`/hotels/${hotel.slug}`} variant="secondary">
          View property
        </LinkButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {bookings.map((b) => {
            const refundable = refundOnCancel(hotel.cancellationPolicy, b.ratePlan, b.checkIn);
            const canCancel = (isGuest || isStaff) && b.status === "CONFIRMED" && b.checkIn > todayUtc();
            const canReview = isGuest && b.status === "COMPLETED" && !b.review;
            return (
              <Card key={b.id} data-testid="booking-room" data-room-number={b.room.number}>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex flex-wrap gap-4">
                    <Photo src={b.room.photos[0]?.asset.path} alt={b.room.photos[0]?.alt ?? `Room ${b.room.number}`} ratio="4/3" className="w-full shrink-0 rounded-[var(--radius-md)] sm:w-48" illustrative />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-2xl">Room {b.room.number}</h2>
                        <Badge tone={STATUS_TONE[b.status]}>{b.status.toLowerCase()}</Badge>
                        {bookings.length > 1 && <span className="text-xs text-ink-3">{b.code}</span>}
                      </div>
                      <p className="text-ink-2">
                        {b.room.floor.name} · {b.room.roomType.name} · {VIEW_LABELS[b.room.viewType]}
                      </p>
                      <p className="flex flex-wrap gap-x-4 text-sm text-ink-2">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-4" aria-hidden /> {formatDate(b.checkIn)} – {formatDate(b.checkOut)} ({b.nights} night{b.nights > 1 ? "s" : ""})
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-4" aria-hidden /> {b.guests} guest{b.guests > 1 ? "s" : ""}
                        </span>
                      </p>
                      <p className="text-sm text-ink-2">
                        {RATE_PLANS[b.ratePlan].label} · <span className="font-semibold text-ink">{formatMoney(b.total)}</span>
                      </p>
                    </div>
                  </div>
                  {canCancel && <CancelBookingButton code={b.code} roomNumber={b.room.number} refundNote={!isGuest ? `Cancelling on behalf of the property refunds the guest in full (${formatMoney(b.total)}).` : refundable ? `You'll be refunded ${formatMoney(b.total)}.` : "This booking is not eligible for a refund under its terms."} />}
                  {b.review && (
                    <p className="rounded-[var(--radius-sm)] bg-subtle p-3 text-sm text-ink-2">
                      Your review: {b.review.rating}/5 · &ldquo;{b.review.comment}&rdquo;
                    </p>
                  )}
                  {canReview && (
                    <div className="border-t border-line pt-4">
                      <h3 className="mb-2 font-semibold">Review your stay in room {b.room.number}</h3>
                      <ReviewForm code={b.code} />
                    </div>
                  )}
                  {isGuest && !upcoming && (
                    <details className="border-t border-line pt-4">
                      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium text-primary">
                        <Repeat className="size-4" aria-hidden /> Stay in room {b.room.number} again
                      </summary>
                      <div className="pt-3">
                        <RebookPanel roomId={b.roomId} roomNumber={b.room.number} hotelSlug={hotel.slug} guests={b.guests} />
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <dl className="space-y-1.5">
                <div className="flex justify-between text-ink-2">
                  <dt>Rooms</dt>
                  <dd>{formatMoney(bookings.reduce((s, b) => s + b.subtotal, 0))}</dd>
                </div>
                {bookings.some((b) => b.discount > 0) && (
                  <div className="flex justify-between text-available">
                    <dt>Rate-plan saving</dt>
                    <dd>−{formatMoney(bookings.reduce((s, b) => s + b.discount, 0))}</dd>
                  </div>
                )}
                <div className="flex justify-between text-ink-2">
                  <dt>Taxes</dt>
                  <dd>{formatMoney(bookings.reduce((s, b) => s + b.taxes, 0))}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2 font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
              </dl>
              {bookings
                .flatMap((b) => b.payments)
                .slice(0, 4)
                .map((p) => (
                  <p key={p.id} className="flex items-center gap-1.5 text-xs text-ink-3">
                    <CreditCard className="size-3.5" aria-hidden /> {p.status.toLowerCase()} · card ending {p.cardLast4} · {formatMoney(p.amount)}
                  </p>
                ))}
              <p className="text-xs text-ink-3">Processed by the demo payment simulator; no real money moved.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Cancellation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-ink-2">
              <p>{terms.summary}</p>
              <Link href="/help#cancellation" className="mt-2 inline-block text-primary underline">
                Cancellation help
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Lead guest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 text-sm text-ink-2">
              <p className="font-medium text-ink">{first.guestName}</p>
              <p>{first.guestEmail}</p>
              <p>{first.guestPhone}</p>
              {first.specialRequest && <p className="pt-2">Request: {first.specialRequest}</p>}
              <p className="pt-2">
                Check-in from {hotel.checkInTime}, check-out until {hotel.checkOutTime}
              </p>
            </CardContent>
          </Card>
          {isGuest && (
            <Alert tone="info" title="Need help?">
              <Link href="/account/bookings">See all your bookings</Link> or visit the <Link href="/help">help centre</Link>.
            </Alert>
          )}
        </aside>
      </div>
    </div>
  );
}
