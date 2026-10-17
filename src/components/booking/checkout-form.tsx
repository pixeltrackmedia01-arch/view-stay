"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CalendarDays, CreditCard, Lock, Timer, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Photo } from "@/components/ui/photo";
import { ApiError, api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { cardDetails, guestDetails } from "@/lib/validation";

const schema = z.object({ guest: guestDetails, card: cardDetails });
type Values = z.input<typeof schema>;

type Plan = "FLEXIBLE" | "NON_REFUNDABLE";
export interface CheckoutRoom {
  id: string;
  number: string;
  floor: string;
  roomType: string;
  view: string;
  photo: string | null;
  guests: number;
  quotes: Record<Plan, { subtotal: number; discount: number; taxes: number; total: number; nights: { date: string; amount: number; weekend: boolean }[] }>;
}

export interface CheckoutProps {
  groupId: string;
  expiresAt: string;
  hotel: { name: string; slug: string; destination: string };
  stay: { checkIn: string; checkOut: string; checkInLabel: string; checkOutLabel: string; nights: number; guests: number };
  rooms: CheckoutRoom[];
  terms: Record<Plan, string>;
  backHref: string;
  defaults: { guestName: string; guestEmail: string; guestPhone: string };
}

function useCountdown(until: string) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  return Math.max(0, left);
}

export function CheckoutForm(p: CheckoutProps) {
  const router = useRouter();
  const left = useCountdown(p.expiresAt);
  const expired = left <= 0;
  const [plan, setPlan] = useState<Plan>("FLEXIBLE");
  const [error, setError] = useState<string | null>(null);
  const [priceChange, setPriceChange] = useState<{ newTotal: number } | null>(null);
  const [releasing, setReleasing] = useState(false);
  const submitting = useRef(false);
  const total = p.rooms.reduce((s, r) => s + r.quotes[plan].total, 0);
  const sum = (k: "subtotal" | "discount" | "taxes") => p.rooms.reduce((s, r) => s + r.quotes[plan][k], 0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { guest: { ...p.defaults, specialRequest: "" }, card: { cardName: p.defaults.guestName, cardNumber: "", expiry: "", cvc: "" } },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    try {
      // The hold group id doubles as the idempotency key: retrying never charges twice.
      const res = await api<{ groupCode: string }>("/api/bookings", { body: { holdGroupId: p.groupId, ratePlan: plan, expectedTotal: total, ...values } });
      router.push(`/bookings/${res.groupCode}?new=1`);
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "PRICE_CHANGED") {
        setPriceChange({ newTotal: Number(err.details?.newTotal ?? 0) });
        router.refresh();
      } else setError(err.message);
      submitting.current = false;
    }
  });

  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Checkout">
        <div
          className={cn("flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium", expired ? "bg-danger-soft text-danger" : left < 120_000 ? "bg-warning-soft text-warning" : "bg-accent-soft text-primary-dark")}
          role="timer"
          aria-live={left < 60_000 ? "polite" : "off"}
          data-testid="hold-timer"
        >
          <Timer className="size-4" aria-hidden />
          {expired ? (
            <span>
              Your hold has ended. Your room{p.rooms.length > 1 ? "s" : ""} may still be free.{" "}
              <Link href={p.backHref} className="underline">
                Choose again
              </Link>
            </span>
          ) : (
            <span>
              {p.rooms.length > 1 ? `Rooms ${p.rooms.map((r) => r.number).join(", ")} are` : `Room ${p.rooms[0].number} is`} held for you for {mm}:{ss}
            </span>
          )}
        </div>
        {error && (
          <Alert title="We couldn't complete your booking" data-testid="checkout-error">
            {error}
          </Alert>
        )}
        {priceChange && (
          <Alert tone="warning" title="The price has changed" data-testid="price-changed">
            The total for your rooms is now {formatMoney(priceChange.newTotal)}. We have updated the summary; review it and pay again to confirm. Nothing was charged.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Choose your rate</CardTitle>
          </CardHeader>
          <CardContent>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Rate plan</legend>
              {(["FLEXIBLE", "NON_REFUNDABLE"] as const).map((k) => {
                const t = p.rooms.reduce((s, r) => s + r.quotes[k].total, 0);
                return (
                  <label key={k} className={cn("flex cursor-pointer flex-col gap-1 rounded-[var(--radius-md)] border p-4 transition-colors", plan === k ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-line-strong")}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <input type="radio" name="ratePlan" value={k} checked={plan === k} onChange={() => setPlan(k)} className="size-4 accent-primary" />
                        {k === "FLEXIBLE" ? "Flexible" : "Non-refundable"}
                      </span>
                      {k === "NON_REFUNDABLE" && <Badge tone="accent">Save 10%</Badge>}
                    </span>
                    <span className="text-lg font-semibold text-ink">{formatMoney(t)}</span>
                    <span className="text-sm text-ink-2">{p.terms[k]}</span>
                  </label>
                );
              })}
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead guest</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="guestName" error={errors.guest?.guestName?.message}>
              <Input id="guestName" autoComplete="name" {...register("guest.guestName")} aria-invalid={!!errors.guest?.guestName} />
            </Field>
            <Field label="Email" htmlFor="guestEmail" error={errors.guest?.guestEmail?.message}>
              <Input id="guestEmail" type="email" autoComplete="email" {...register("guest.guestEmail")} aria-invalid={!!errors.guest?.guestEmail} />
            </Field>
            <Field label="Phone" htmlFor="guestPhone" error={errors.guest?.guestPhone?.message}>
              <Input id="guestPhone" type="tel" autoComplete="tel" {...register("guest.guestPhone")} aria-invalid={!!errors.guest?.guestPhone} />
            </Field>
            <Field label="Special requests (optional)" htmlFor="specialRequest" error={errors.guest?.specialRequest?.message} className="sm:col-span-2">
              <Textarea id="specialRequest" placeholder="Early check-in, extra pillows…" {...register("guest.specialRequest")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4" aria-hidden /> Payment
            </CardTitle>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-3">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                Demo payment simulator: no money moves and card numbers are not stored. Use <code>4242 4242 4242 4242</code> (success) or <code>4000 0000 0000 0002</code> (declined), any future expiry and any CVC.
              </span>
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Name on card" htmlFor="cardName" error={errors.card?.cardName?.message} className="sm:col-span-2">
              <Input id="cardName" autoComplete="cc-name" {...register("card.cardName")} aria-invalid={!!errors.card?.cardName} />
            </Field>
            <Field label="Card number" htmlFor="cardNumber" error={errors.card?.cardNumber?.message} className="sm:col-span-2">
              <Input id="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" {...register("card.cardNumber")} aria-invalid={!!errors.card?.cardNumber} />
            </Field>
            <Field label="Expiry (MM/YY)" htmlFor="expiry" error={errors.card?.expiry?.message}>
              <Input id="expiry" autoComplete="cc-exp" placeholder="12/30" {...register("card.expiry")} aria-invalid={!!errors.card?.expiry} />
            </Field>
            <Field label="CVC" htmlFor="cvc" error={errors.card?.cvc?.message}>
              <Input id="cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" {...register("card.cvc")} aria-invalid={!!errors.card?.cvc} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            loading={releasing}
            onClick={async () => {
              setReleasing(true);
              await api(`/api/holds/${p.groupId}`, { method: "DELETE" }).catch(() => undefined);
              router.push(p.backHref);
            }}
          >
            Release and change room
          </Button>
          <Button type="submit" variant="accent" size="lg" loading={isSubmitting} disabled={expired} data-testid="pay-button">
            <Lock className="size-4" aria-hidden /> Pay {formatMoney(total)} and confirm
          </Button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Booking summary">
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div>
              <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{p.hotel.destination}</p>
              <p className="font-display text-xl text-ink">{p.hotel.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="flex items-center gap-1.5 text-ink-2">
                <CalendarDays className="size-4" aria-hidden /> {p.stay.checkInLabel} – {p.stay.checkOutLabel}
              </p>
              <p className="flex items-center gap-1.5 text-ink-2">
                <Users className="size-4" aria-hidden /> {p.stay.guests} guest{p.stay.guests > 1 ? "s" : ""} · {p.stay.nights} night{p.stay.nights > 1 ? "s" : ""}
              </p>
            </div>
            <ul className="space-y-3">
              {p.rooms.map((r) => (
                <li key={r.id} className="flex gap-3" data-testid="checkout-room" data-room-number={r.number}>
                  <Photo src={r.photo} alt={`Room ${r.number}`} ratio="4/3" className="w-24 shrink-0 rounded-[var(--radius-sm)]" />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-ink">Room {r.number}</p>
                    <p className="text-ink-2">
                      {r.floor} · {r.roomType}
                    </p>
                    <p className="text-ink-3">
                      {r.view} · {r.guests} guest{r.guests > 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="ml-auto text-sm font-medium">{formatMoney(r.quotes[plan].total)}</p>
                </li>
              ))}
            </ul>
            <p className="rounded-[var(--radius-sm)] bg-subtle px-3 py-2 text-xs text-ink-2">You are booking {p.rooms.length > 1 ? "these exact rooms" : "this exact room"}. If {p.rooms.length > 1 ? "any becomes" : "it becomes"} unavailable we will tell you; we never substitute a different room.</p>
            <dl className="space-y-1.5 border-t border-line pt-3 text-sm" data-testid="price-breakdown">
              {p.rooms.length === 1 &&
                p.rooms[0].quotes[plan].nights.map((n) => (
                  <div key={n.date} className="flex justify-between text-ink-2">
                    <dt>
                      {new Date(`${n.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
                      {n.weekend && " · weekend"}
                    </dt>
                    <dd>{formatMoney(n.amount)}</dd>
                  </div>
                ))}
              <div className="flex justify-between text-ink-2">
                <dt>Room subtotal</dt>
                <dd>{formatMoney(sum("subtotal"))}</dd>
              </div>
              {sum("discount") > 0 && (
                <div className="flex justify-between text-available">
                  <dt>Non-refundable saving</dt>
                  <dd>−{formatMoney(sum("discount"))}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-2">
                <dt>Taxes (demo rate, 12%)</dt>
                <dd>{formatMoney(sum("taxes"))}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
                <dt>Total</dt>
                <dd data-testid="checkout-total">{formatMoney(total)}</dd>
              </div>
            </dl>
            <p className="text-xs text-ink-3">Demo prices for fictional properties. They are not live commercial rates.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
