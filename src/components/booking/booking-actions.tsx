"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarSearch, CheckCircle2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Alert } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { VIEW_LABELS, type ViewKey } from "@/lib/catalog-types";
import { api } from "@/lib/client";
import { addDays, parseDateOnly, toDateOnlyString, todayUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { reviewInput } from "@/lib/validation";

export function CancelBookingButton({ code, roomNumber, refundNote }: { code: string; roomNumber: string; refundNote: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button variant="dangerOutline" size="sm" onClick={() => setOpen(true)} data-testid={`cancel-${code}`}>
        Cancel room {roomNumber}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Cancel booking ${code}?`}
        tone="danger"
        confirmLabel="Cancel booking"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await api<{ booking: { refunded: boolean } }>(`/api/bookings/${code}/cancel`, { method: "POST" });
            toast({ tone: "success", title: "Booking cancelled", body: res.booking.refunded ? "Your payment will be refunded." : "This booking was not eligible for a refund." });
            setOpen(false);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>Room {roomNumber} will be released to other travellers.</p>
        <p className="mt-2 font-medium">{refundNote}</p>
        {error && <Alert className="mt-3">{error}</Alert>}
      </ConfirmDialog>
    </>
  );
}

type ReviewValues = z.input<typeof reviewInput>;

export function ReviewForm({ code }: { code: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReviewValues>({ resolver: zodResolver(reviewInput), defaultValues: { rating: 0, comment: "" } });
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await api(`/api/bookings/${code}/review`, { body: v });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Write a review">
      <fieldset>
        <legend className="text-sm font-medium text-ink">Your rating</legend>
        <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating out of 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => {
                setRating(n);
                setValue("rating", n, { shouldValidate: true });
              }}
              className="grid size-11 place-items-center rounded-full hover:bg-subtle"
            >
              <Star className={cn("size-6", n <= rating ? "fill-accent text-accent" : "text-line-strong")} />
            </button>
          ))}
        </div>
        {errors.rating && <p className="text-sm text-danger">Choose a rating from 1 to 5</p>}
      </fieldset>
      <Field label="What was your stay like?" htmlFor={`review-${code}`} error={errors.comment?.message}>
        <Textarea id={`review-${code}`} rows={4} {...register("comment")} aria-invalid={!!errors.comment} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" loading={isSubmitting}>
        Publish review
      </Button>
    </form>
  );
}

interface Alternative {
  id: string;
  number: string;
  level: number;
  viewType: ViewKey;
  roomTypeName: string;
  why: string[];
  total: number;
}
type CheckResult = { available: true; room: { id: string; number: string; hotelSlug: string }; quote: { total: number } } | { available: false; reason: string; room: { id: string; number: string; hotelSlug: string }; alternatives: Alternative[] };

/** Book the same physical room again: checks that exact room for new dates and offers labelled alternatives if needed. */
export function RebookPanel({ roomId, roomNumber, hotelSlug, guests }: { roomId: string; roomNumber: string; hotelSlug: string; guests: number }) {
  const ids = useId();
  const today = todayUtc();
  const [checkIn, setCheckIn] = useState(toDateOnlyString(addDays(today, 14)));
  const [checkOut, setCheckOut] = useState(toDateOnlyString(addDays(today, 16)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const stayQuery = (room: string) => new URLSearchParams({ checkIn, checkOut, guests: String(guests), rooms: "1", room }).toString();

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api<CheckResult>(`/api/rooms/${roomId}/availability?${new URLSearchParams({ checkIn, checkOut, guests: String(guests) })}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="rebook">
      <form onSubmit={check} className="flex flex-wrap items-end gap-3" aria-label={`Check room ${roomNumber} for new dates`}>
        <label className="space-y-1 text-sm" htmlFor={`${ids}-ci`}>
          <span className="font-medium text-ink-2">Check-in</span>
          <input
            id={`${ids}-ci`}
            type="date"
            min={toDateOnlyString(today)}
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              const ci = parseDateOnly(e.target.value);
              if (ci && (parseDateOnly(checkOut) ?? ci) <= ci) setCheckOut(toDateOnlyString(addDays(ci, 1)));
            }}
            className="block h-11 rounded-[var(--radius-sm)] border border-line bg-surface px-3"
          />
        </label>
        <label className="space-y-1 text-sm" htmlFor={`${ids}-co`}>
          <span className="font-medium text-ink-2">Check-out</span>
          <input id={`${ids}-co`} type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="block h-11 rounded-[var(--radius-sm)] border border-line bg-surface px-3" />
        </label>
        <Button type="submit" variant="outline" loading={busy}>
          <CalendarSearch className="size-4" aria-hidden /> Check room {roomNumber}
        </Button>
      </form>
      {error && <Alert>{error}</Alert>}
      {result?.available && (
        <Alert tone="success" title={`Room ${roomNumber} is free for those dates`} action={<LinkButton size="sm" variant="accent" href={`/hotels/${hotelSlug}?${stayQuery(roomId)}#rooms`}>Book room {roomNumber}</LinkButton>}>
          {formatMoney(result.quote.total)} total including taxes.
        </Alert>
      )}
      {result && !result.available && (
        <div className="space-y-2">
          <Alert tone="warning" title={`Room ${roomNumber} isn't available`}>
            {result.reason} We won&apos;t switch you to another room automatically. Here are similar rooms you can choose instead:
          </Alert>
          {result.alternatives.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {result.alternatives.map((a) => (
                <li key={a.id} className="rounded-[var(--radius-md)] border border-line p-3 text-sm">
                  <p className="font-semibold text-ink">
                    Room {a.number} · Floor {a.level}
                  </p>
                  <p className="text-ink-2">
                    {a.roomTypeName} · {VIEW_LABELS[a.viewType]}
                  </p>
                  {a.why.length > 0 && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-available">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {a.why.join(", ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-medium">{formatMoney(a.total)}</span>
                    <Link href={`/hotels/${hotelSlug}?${stayQuery(a.id)}#rooms`} className="font-medium text-primary underline">
                      View room {a.number}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">No similar rooms are free for those dates. Try different dates.</p>
          )}
        </div>
      )}
    </div>
  );
}
