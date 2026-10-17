import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { CancelBookingButton, ReviewForm } from "@/components/booking-actions";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, todayUtc } from "@/lib/dates";
import { isAppError } from "@/lib/errors";
import { VIEW_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { getBookingForViewer } from "@/server/bookings";
import { rebookHref } from "@/lib/rebook";

export const metadata: Metadata = { title: "Booking" };
export const dynamic = "force-dynamic";

export default async function BookingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ new?: string }> }) {
  const { code } = await params;
  const { new: isNew } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/bookings/${code}`);
  let booking;
  try {
    booking = await getBookingForViewer(user, code);
  } catch (e) {
    if (isAppError(e)) notFound();
    throw e;
  }
  const isOwner = booking.userId === user.id;
  const canCancel = booking.status === "CONFIRMED" && booking.checkIn > todayUtc();
  const payment = booking.payments[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {isNew && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-emerald-50 p-5 text-emerald-900" role="status">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <h1 className="text-xl font-bold">Booking confirmed!</h1>
            <p>Room {booking.room.number} at {booking.hotel.name} is yours. A confirmation has been recorded for {booking.guestEmail}.</p>
          </div>
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Booking reference</p>
            <CardTitle className="font-mono text-xl" data-testid="booking-code">{booking.code}</CardTitle>
          </div>
          <StatusBadge kind="booking" status={booking.status} />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href={`/hotels/${booking.hotel.slug}`} className="text-lg font-semibold hover:text-brand-700">{booking.hotel.name}</Link>
              <p className="text-sm text-slate-600">{booking.hotel.address}</p>
            </div>
            <div className="rounded-lg bg-brand-50 px-4 py-2 text-right">
              <p className="text-2xl font-bold text-brand-900">Room {booking.room.number}</p>
              <p className="text-xs text-brand-800">{booking.room.floor.name} · {booking.room.roomType.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge tone="blue">{VIEW_LABELS[booking.room.viewType]} · {booking.room.viewScore}/100</Badge>
            {booking.room.hasBalcony && <Badge>Balcony</Badge>}
            {booking.room.isCorner && <Badge>Corner room</Badge>}
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-500">Check-in</dt><dd className="font-medium">{formatDate(booking.checkIn)} · from {booking.hotel.checkInTime}</dd></div>
            <div><dt className="text-slate-500">Check-out</dt><dd className="font-medium">{formatDate(booking.checkOut)} · by {booking.hotel.checkOutTime}</dd></div>
            <div><dt className="text-slate-500">Guests</dt><dd className="font-medium">{booking.guests} · {booking.nights} night{booking.nights > 1 ? "s" : ""}</dd></div>
            <div><dt className="text-slate-500">Lead guest</dt><dd className="font-medium">{booking.guestName}</dd></div>
            <div><dt className="text-slate-500">Contact</dt><dd className="font-medium">{booking.guestEmail}<br />{booking.guestPhone}</dd></div>
            {booking.specialRequest && <div><dt className="text-slate-500">Requests</dt><dd className="font-medium">{booking.specialRequest}</dd></div>}
          </dl>
          <dl className="space-y-1 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(booking.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Taxes</dt><dd>{formatMoney(booking.taxes)}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Total paid</dt><dd>{formatMoney(booking.total)}</dd></div>
            {payment && (
              <p className="text-xs text-slate-500">
                Card ending {payment.cardLast4} · {payment.status.toLowerCase()} · ref {payment.reference}
              </p>
            )}
          </dl>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            {isOwner && (
              <Link href={rebookHref(booking.hotel.slug, booking.roomId, booking.nights, booking.guests)} className={buttonClass("primary", "sm")}>
                <RotateCcw className="size-4" aria-hidden /> Book room {booking.room.number} again
              </Link>
            )}
            {canCancel && (isOwner || user.role !== "CUSTOMER") && <CancelBookingButton code={booking.code} />}
            {isOwner && <Link href="/account" className={buttonClass("ghost", "sm")}>All my bookings</Link>}
          </div>
        </CardContent>
      </Card>
      {isOwner && booking.status === "COMPLETED" && !booking.review && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Review your stay</CardTitle></CardHeader>
          <CardContent><ReviewForm code={booking.code} /></CardContent>
        </Card>
      )}
    </div>
  );
}
