"use client";

import { CalendarDays, MapPin, Minus, Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { addDays, parseDateOnly, toDateOnlyString, todayUtc } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { stayInput } from "@/lib/validation";

export interface SearchDefaults {
  q?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

function Stepper({ label, value, min, max, onChange, id }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; id: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2" role="group" aria-labelledby={id}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`} className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-40">
          <Minus className="size-4" />
        </button>
        <output aria-live="polite" className="w-6 text-center text-sm font-semibold">{value}</output>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`} className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-40">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Destination, dates, guests and rooms. Validates dates (no past check-in, check-out after check-in). */
export function SearchBar({ defaults, destinations, variant = "hero", extraParams }: { defaults: SearchDefaults; destinations: { slug: string; name: string; state: string }[]; variant?: "hero" | "compact"; extraParams?: Record<string, string> }) {
  const router = useRouter();
  const ids = useId();
  const [q, setQ] = useState(defaults.q ?? "");
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [guests, setGuests] = useState(defaults.guests);
  const [rooms, setRooms] = useState(defaults.rooms);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const today = toDateOnlyString(todayUtc());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = stayInput.safeParse({ checkIn, checkOut, guests });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError({ field: String(issue.path[0] ?? "checkIn"), message: issue.message });
      return;
    }
    if (guests < rooms) return setError({ field: "guests", message: "Each room needs at least one guest" });
    setError(null);
    const match = destinations.find((d) => d.name.toLowerCase() === q.trim().toLowerCase());
    const p = new URLSearchParams({ ...(extraParams ?? {}), checkIn, checkOut, guests: String(guests), rooms: String(rooms) });
    if (match) p.set("destination", match.slug);
    else if (q.trim()) p.set("q", q.trim());
    p.delete("page");
    router.push(`/search?${p}`);
  };

  const onCheckIn = (v: string) => {
    setCheckIn(v);
    const ci = parseDateOnly(v);
    const co = parseDateOnly(checkOut);
    if (ci && (!co || co <= ci)) setCheckOut(toDateOnlyString(addDays(ci, 1)));
  };
  const cell = "flex min-w-0 flex-col gap-0.5 rounded-[var(--radius-md)] px-4 py-2.5 transition-colors focus-within:bg-subtle hover:bg-subtle";
  const lbl = "flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-2 uppercase";
  const field = "w-full bg-transparent text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-3";
  const minCheckOut = parseDateOnly(checkIn) ? toDateOnlyString(addDays(parseDateOnly(checkIn)!, 1)) : today;

  return (
    <form onSubmit={submit} noValidate role="search" aria-label="Search stays" className={cn("relative rounded-[var(--radius-xl)] bg-surface p-2 shadow-[var(--shadow-pop)] ring-1 ring-line", variant === "compact" && "shadow-[var(--shadow-card)]")}>
      <div className="grid gap-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center">
        <div className={cell}>
          <label htmlFor={`${ids}-q`} className={lbl}><MapPin className="size-3.5" aria-hidden /> Destination</label>
          <input id={`${ids}-q`} list={`${ids}-dest`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Where to? Manali, Goa, Udaipur…" className={field} autoComplete="off" />
          <datalist id={`${ids}-dest`}>
            {destinations.map((d) => (
              <option key={d.slug} value={d.name}>{d.state}</option>
            ))}
          </datalist>
        </div>
        <div className={cell}>
          <label htmlFor={`${ids}-ci`} className={lbl}><CalendarDays className="size-3.5" aria-hidden /> Check-in</label>
          <input id={`${ids}-ci`} type="date" min={today} value={checkIn} onChange={(e) => onCheckIn(e.target.value)} className={field} aria-invalid={error?.field === "checkIn"} aria-describedby={error?.field === "checkIn" ? `${ids}-err` : undefined} />
        </div>
        <div className={cell}>
          <label htmlFor={`${ids}-co`} className={lbl}><CalendarDays className="size-3.5" aria-hidden /> Check-out</label>
          <input id={`${ids}-co`} type="date" min={minCheckOut} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={field} aria-invalid={error?.field === "checkOut"} aria-describedby={error?.field === "checkOut" ? `${ids}-err` : undefined} />
        </div>
        <div className={cn(cell, "relative")}>
          <span className={lbl} id={`${ids}-gl`}><Users className="size-3.5" aria-hidden /> Guests & rooms</span>
          <button type="button" aria-expanded={guestsOpen} aria-controls={`${ids}-gp`} aria-labelledby={`${ids}-gl`} onClick={() => setGuestsOpen((v) => !v)} className={cn(field, "text-left")} data-testid="guests-toggle">
            {guests} guest{guests > 1 ? "s" : ""} · {rooms} room{rooms > 1 ? "s" : ""}
          </button>
          {guestsOpen && (
            <div id={`${ids}-gp`} className="absolute top-full right-0 left-0 z-30 mt-2 space-y-3 rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-[var(--shadow-pop)] md:left-auto md:w-72">
              <Stepper id={`${ids}-sg`} label="Guests" value={guests} min={1} max={8} onChange={setGuests} />
              <Stepper id={`${ids}-sr`} label="Rooms" value={rooms} min={1} max={4} onChange={(v) => { setRooms(v); if (guests < v) setGuests(v); }} />
              <p className="text-xs text-ink-3">You&apos;ll choose each exact room on the property&apos;s floor plan.</p>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => setGuestsOpen(false)}>Done</Button>
            </div>
          )}
        </div>
        <div className="p-1">
          <Button type="submit" variant="accent" size="lg" className="w-full rounded-[var(--radius-md)] md:w-auto">
            <Search className="size-5" aria-hidden /> Search
          </Button>
        </div>
      </div>
      {error && (
        <p id={`${ids}-err`} role="alert" className="px-4 pt-1 pb-2 text-sm text-danger">
          {error.message}
        </p>
      )}
    </form>
  );
}
