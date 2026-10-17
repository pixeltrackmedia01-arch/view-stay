"use client";

import { Check, ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Photo } from "@/components/ui/photo";
import { Select } from "@/components/ui/input";
import { VIEW_LABELS } from "@/lib/catalog-types";
import type { ExplorerRoom } from "@/lib/explorer-types";
import { VIEW_ICONS } from "@/lib/icons";
import { formatMoney } from "@/lib/money";
import { recommendRooms } from "@/lib/recommend";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./room-detail";
import { useExplorer, useFilteredIds } from "./store";

type ListSort = "recommended" | "price" | "priceDesc" | "view" | "size" | "floor";

/** Accessible list of every room in the property; selection is shared with the 3D model and floor plan. */
export function RoomList({ className }: { className?: string }) {
  const rooms = useExplorer((s) => s.data.rooms);
  const floors = useExplorer((s) => s.data.floors);
  const selectedId = useExplorer((s) => s.selectedRoomId);
  const cart = useExplorer((s) => s.cart);
  const selectRoom = useExplorer((s) => s.selectRoom);
  const resetFilters = useExplorer((s) => s.resetFilters);
  const matching = useFilteredIds();
  const [sort, setSort] = useState<ListSort>("recommended");
  const floorName = useMemo(() => new Map(floors.map((f) => [f.id, f.name])), [floors]);

  const list = useMemo(() => {
    const avail = (r: ExplorerRoom) => (r.status === "AVAILABLE" || r.status === "HELD_BY_YOU" ? 0 : 1);
    const filtered = rooms.filter((r) => matching.has(r.id));
    const cmp: Record<ListSort, (a: ExplorerRoom, b: ExplorerRoom) => number> = {
      recommended: (a, b) => avail(a) - avail(b) || b.viewScore + b.level * 2 - (a.viewScore + a.level * 2),
      price: (a, b) => avail(a) - avail(b) || a.nightlyRate - b.nightlyRate,
      priceDesc: (a, b) => avail(a) - avail(b) || b.nightlyRate - a.nightlyRate,
      view: (a, b) => avail(a) - avail(b) || b.viewScore - a.viewScore,
      size: (a, b) => avail(a) - avail(b) || b.sizeSqm - a.sizeSqm,
      floor: (a, b) => a.level - b.level || a.number.localeCompare(b.number, undefined, { numeric: true }),
    };
    return filtered.sort(cmp[sort]);
  }, [rooms, matching, sort]);

  return (
    <div className={cn("space-y-3", className)} data-testid="room-list">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2" aria-live="polite">
          {list.length} room{list.length === 1 ? "" : "s"}
        </p>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          Sort
          <Select value={sort} onChange={(e) => setSort(e.target.value as ListSort)} className="w-44">
            <option value="recommended">Recommended</option>
            <option value="price">Price: low to high</option>
            <option value="priceDesc">Price: high to low</option>
            <option value="view">Best view</option>
            <option value="size">Largest</option>
            <option value="floor">Floor and number</option>
          </Select>
        </label>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={Sparkles} title="No rooms match these filters" action={<button className="text-sm font-medium text-primary underline" onClick={resetFilters}>Clear room filters</button>}>
          Try removing a filter to see more rooms in this property.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => {
            const ViewIcon = VIEW_ICONS[r.viewType];
            const sel = r.id === selectedId;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => selectRoom(r.id, { openSheet: true })}
                  aria-current={sel || undefined}
                  data-room-number={r.number}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-md)] border bg-surface p-2 text-left transition-colors",
                    sel ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-line-strong",
                  )}
                >
                  <Photo src={r.primaryPhoto?.path} alt={r.primaryPhoto?.alt ?? ""} ratio="4/3" className="w-24 shrink-0 rounded-[var(--radius-sm)] sm:w-32" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">Room {r.number}</span>
                      <StatusBadge room={r} />
                      {cart.includes(r.id) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-hover">
                          <Check className="size-3" aria-hidden /> Chosen
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-2">
                      {floorName.get(r.floorId)} · {r.roomTypeName} · {r.sizeSqm} m²
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-3">
                      <span className="inline-flex items-center gap-1">
                        <ViewIcon className="size-3.5" aria-hidden /> {VIEW_LABELS[r.viewType]}
                      </span>
                      {r.hasBalcony && <span>Balcony</span>}
                      {r.isCorner && <span>Corner</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold text-ink">{formatMoney(r.nightlyRate)}</span>
                    <span className="text-xs text-ink-3">/ night</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Rule-based picks with plain-language reasons (no AI). */
export function Recommendations({ className, stacked }: { className?: string; stacked?: boolean }) {
  const rooms = useExplorer((s) => s.data.rooms);
  const selectRoom = useExplorer((s) => s.selectRoom);
  const matching = useFilteredIds();
  const picks = useMemo(() => recommendRooms(rooms, rooms.filter((r) => matching.has(r.id))), [rooms, matching]);
  if (!picks.length) return null;
  return (
    <section className={cn("space-y-2", className)} aria-labelledby="recs-title" data-testid="recommendations">
      <h3 id="recs-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sparkles className="size-4 text-accent-hover" aria-hidden /> Rooms worth a look
      </h3>
      <div className={cn("grid gap-2", !stacked && "sm:grid-cols-3")}>
        {picks.map((p) => (
          <button key={p.room.id} type="button" onClick={() => selectRoom(p.room.id, { openSheet: true })} className="rounded-[var(--radius-md)] border border-line bg-surface p-3 text-left hover:border-accent">
            <span className="text-xs font-semibold tracking-wide text-accent-hover uppercase">{p.title}</span>
            <span className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className="font-semibold text-ink">Room {p.room.number}</span>
              <span className="text-sm text-ink-2">{formatMoney(p.room.nightlyRate)}</span>
            </span>
            <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2">
              {p.reasons.slice(0, 3).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-3">Picked by simple rules from each room&apos;s floor, view score, size and price.</p>
    </section>
  );
}
