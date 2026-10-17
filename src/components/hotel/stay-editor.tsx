"use client";

import { CalendarDays, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { addDays, parseDateOnly, toDateOnlyString, todayUtc } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { stayInput } from "@/lib/validation";

/** Compact stay form that rewrites the current page's stay parameters (dates, guests, rooms). */
export function StayEditor({ stay, className, anchor }: { stay: { checkIn: string; checkOut: string; guests: number; rooms: number }; className?: string; anchor?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const ids = useId();
  const [checkIn, setCheckIn] = useState(stay.checkIn);
  const [checkOut, setCheckOut] = useState(stay.checkOut);
  const [guests, setGuests] = useState(stay.guests);
  const [rooms, setRooms] = useState(stay.rooms);
  const [error, setError] = useState<string | null>(null);
  const today = toDateOnlyString(todayUtc());
  const minOut = parseDateOnly(checkIn) ? toDateOnlyString(addDays(parseDateOnly(checkIn)!, 1)) : today;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = stayInput.safeParse({ checkIn, checkOut, guests });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (guests < rooms) return setError("Each room needs at least one guest");
    setError(null);
    const q = new URLSearchParams(sp.toString());
    q.set("checkIn", checkIn);
    q.set("checkOut", checkOut);
    q.set("guests", String(guests));
    q.set("rooms", String(rooms));
    q.delete("room");
    router.push(`${pathname}?${q}${anchor ? `#${anchor}` : ""}`, { scroll: !anchor });
  };
  const lbl = "flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-2 uppercase";
  return (
    <form onSubmit={submit} noValidate className={cn("grid grid-cols-2 gap-3", className)} aria-label="Change your stay">
      <label className="space-y-1" htmlFor={`${ids}-ci`}>
        <span className={lbl}>
          <CalendarDays className="size-3.5" aria-hidden /> Check-in
        </span>
        <input
          id={`${ids}-ci`}
          type="date"
          min={today}
          value={checkIn}
          onChange={(e) => {
            setCheckIn(e.target.value);
            const ci = parseDateOnly(e.target.value);
            const co = parseDateOnly(checkOut);
            if (ci && (!co || co <= ci)) setCheckOut(toDateOnlyString(addDays(ci, 1)));
          }}
          className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm"
        />
      </label>
      <label className="space-y-1" htmlFor={`${ids}-co`}>
        <span className={lbl}>
          <CalendarDays className="size-3.5" aria-hidden /> Check-out
        </span>
        <input id={`${ids}-co`} type="date" min={minOut} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-sm" />
      </label>
      <label className="space-y-1" htmlFor={`${ids}-g`}>
        <span className={lbl}>
          <Users className="size-3.5" aria-hidden /> Guests
        </span>
        <Select id={`${ids}-g`} value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} guest{n > 1 ? "s" : ""}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1" htmlFor={`${ids}-r`}>
        <span className={lbl}>Rooms</span>
        <Select
          id={`${ids}-r`}
          value={rooms}
          onChange={(e) => {
            const v = Number(e.target.value);
            setRooms(v);
            if (guests < v) setGuests(v);
          }}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} room{n > 1 ? "s" : ""}
            </option>
          ))}
        </Select>
      </label>
      {error && (
        <p className="col-span-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" className="col-span-2">
        Update availability
      </Button>
    </form>
  );
}
