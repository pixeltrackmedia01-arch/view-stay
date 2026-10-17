import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { BlockForm, RemoveBlockButton } from "@/components/partner/block-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, formatDate, parseDateOnly, toDateOnlyString, todayUtc } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { availabilityCalendar, type CalendarCell } from "@/server/partner";

export const metadata: Metadata = { title: "Availability" };
export const dynamic = "force-dynamic";

const DAYS = 21;
const CELL: Record<CalendarCell["state"], { cls: string; short: string; label: string }> = {
  free: { cls: "bg-surface", short: "", label: "Free" },
  booked: { cls: "bg-primary text-white", short: "B", label: "Booked" },
  held: { cls: "bg-warning-soft text-warning", short: "H", label: "On hold" },
  blocked: { cls: "bg-[repeating-linear-gradient(45deg,#e8edeb_0_4px,#c3ccc9_4px_6px)] text-ink", short: "X", label: "Closed" },
  inactive: { cls: "bg-muted text-ink-3", short: "M", label: "Maintenance" },
};

export default async function PartnerCalendar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const user = await requireUser("PARTNER", "ADMIN");
  const { id } = await params;
  const { from: fromRaw } = await searchParams;
  const from = parseDateOnly(fromRaw ?? "") ?? todayUtc();
  const [cal, blocks] = await Promise.all([
    availabilityCalendar(user, id, from, DAYS),
    db.roomBlock.findMany({ where: { room: { hotelId: id }, endDate: { gt: todayUtc() } }, orderBy: { startDate: "asc" }, include: { room: { select: { number: true } } } }),
  ]);
  const nav = (d: number) => `?from=${toDateOnlyString(addDays(from, d))}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium text-ink">{formatDate(from)} – {formatDate(addDays(from, DAYS - 1))}</p>
        <div className="flex gap-1">
          <Link href={nav(-DAYS)} className="grid size-11 place-items-center rounded-full border border-line hover:bg-subtle" aria-label="Previous three weeks"><ChevronLeft className="size-4" /></Link>
          <Link href="?" className="flex min-h-11 items-center rounded-full border border-line px-4 text-sm hover:bg-subtle">Today</Link>
          <Link href={nav(DAYS)} className="grid size-11 place-items-center rounded-full border border-line hover:bg-subtle" aria-label="Next three weeks"><ChevronRight className="size-4" /></Link>
        </div>
      </div>
      <ul className="flex flex-wrap gap-4 text-xs text-ink-2" aria-label="Legend">
        {Object.values(CELL).map((c) => <li key={c.label} className="flex items-center gap-1.5"><span className={cn("grid size-5 place-items-center rounded border border-line text-[10px] font-semibold", c.cls)}>{c.short}</span>{c.label}</li>)}
      </ul>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        <table className="text-xs" data-testid="availability-calendar">
          <caption className="sr-only">Room availability by night</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface p-2 text-left font-medium">Room</th>
              {cal.dates.map((d) => {
                const date = new Date(`${d}T00:00:00Z`);
                return <th key={d} scope="col" className="min-w-9 p-1 text-center font-medium text-ink-2"><span className="block">{date.toLocaleDateString("en-IN", { weekday: "narrow", timeZone: "UTC" })}</span>{date.getUTCDate()}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {cal.rooms.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-surface p-2 text-left font-medium whitespace-nowrap">{r.number}<span className="block font-normal text-ink-3">{r.roomType}</span></th>
                {r.cells.map((c, i) => (
                  <td key={i} className="p-0.5">
                    <span className={cn("grid h-8 place-items-center rounded border border-line/60 font-semibold", CELL[c.state].cls)} title={`${r.number}, ${cal.dates[i]}: ${CELL[c.state].label}${c.label ? ` (${c.label})` : ""}`}>
                      {CELL[c.state].short}<span className="sr-only">{CELL[c.state].label}{c.label ? `: ${c.label}` : ""}</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BlockForm rooms={cal.rooms.map((r) => ({ id: r.id, number: r.number }))} defaultStart={toDateOnlyString(from)} defaultEnd={toDateOnlyString(addDays(from, 1))} />
      {blocks.length > 0 && (
        <section aria-labelledby="closures" className="space-y-2">
          <h2 id="closures" className="font-semibold">Upcoming closures</h2>
          <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface text-sm">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 p-3">
                <span>Room {b.room.number} · {formatDate(b.startDate)} – {formatDate(b.endDate)} · {b.reason}</span>
                <RemoveBlockButton id={b.id} label={`room ${b.room.number}, ${b.reason}`} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
