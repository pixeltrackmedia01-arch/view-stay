"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Lock, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { cardDetails, guestDetails } from "@/lib/validation";

const schema = z.object({ guest: guestDetails, card: cardDetails });
type Values = z.input<typeof schema>;

function useCountdown(expiresAt: string) {
  const [left, setLeft] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return Math.max(0, left);
}

export function CheckoutForm({
  holdId,
  expiresAt,
  total,
  backHref,
  defaults,
}: {
  holdId: string;
  expiresAt: string;
  total: number;
  backHref: string;
  defaults: { guestName: string; guestEmail: string; guestPhone: string };
}) {
  const router = useRouter();
  const left = useCountdown(expiresAt);
  const expired = left <= 0;
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { guest: { ...defaults, specialRequest: "" }, card: { cardName: defaults.guestName, cardNumber: "", expiry: "", cvc: "" } },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const { booking } = await api<{ booking: { code: string } }>("/api/bookings", { body: { holdId, ...values } });
      router.push(`/bookings/${booking.code}?new=1`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  });

  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000).toString().padStart(2, "0");

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${expired ? "bg-rose-50 text-rose-700" : left < 120_000 ? "bg-amber-50 text-amber-800" : "bg-brand-50 text-brand-800"}`}
        role="timer"
        aria-live="off"
        data-testid="hold-timer"
      >
        <Timer className="size-4" aria-hidden />
        {expired ? (
          <span>
            Your hold has expired. <Link href={backHref} className="underline">Pick the room again</Link>
          </span>
        ) : (
          <span>Room held for you for {mm}:{ss}</span>
        )}
      </div>
      {error && <Alert data-testid="checkout-error">{error}</Alert>}

      <Card>
        <CardHeader><CardTitle>Lead guest</CardTitle></CardHeader>
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
          <CardTitle className="flex items-center gap-2"><CreditCard className="size-4" aria-hidden /> Payment</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Demo gateway — no real charge. Use <code>4242 4242 4242 4242</code> (success), <code>4000 0000 0000 0002</code> (declined), any future expiry and CVC.
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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          loading={releasing}
          onClick={async () => {
            setReleasing(true);
            await api(`/api/holds/${holdId}`, { method: "DELETE" }).catch(() => undefined);
            router.push(backHref);
          }}
        >
          Change room
        </Button>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={expired} data-testid="pay-button">
          <Lock className="size-4" aria-hidden /> Pay {formatMoney(total)} & confirm
        </Button>
      </div>
    </form>
  );
}
