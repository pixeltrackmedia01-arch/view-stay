"use client";

import { Box, Columns2, Grid2x2, List, SlidersHorizontal, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ToggleChip } from "@/components/ui/chip";
import { Segmented } from "@/components/ui/tabs";
import { VIEW_LABELS, type ViewKey } from "@/lib/catalog-types";
import { VIEW_ICONS } from "@/lib/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { EMPTY_FILTERS, useExplorer, useFilteredIds, type ExplorerMode } from "./store";

export function ModeSwitch({ className }: { className?: string }) {
  const mode = useExplorer((s) => s.mode);
  const setMode = useExplorer((s) => s.setMode);
  return (
    <Segmented<ExplorerMode>
      label="Explorer view"
      value={mode}
      onChange={setMode}
      className={className}
      options={[
        { id: "3d", label: "3D Explore", icon: Box },
        { id: "plan", label: "2D Floor Plan", icon: Grid2x2 },
        { id: "list", label: "Room List", icon: List },
      ]}
    />
  );
}

/** Floor selector shared by every mode: shows per-floor availability so guests know where to look. */
export function FloorSelector({ className, vertical }: { className?: string; vertical?: boolean }) {
  const floors = useExplorer((s) => s.data.floors);
  const rooms = useExplorer((s) => s.data.rooms);
  const floorId = useExplorer((s) => s.floorId);
  const setFloor = useExplorer((s) => s.setFloor);
  const matching = useFilteredIds();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rooms) if ((r.status === "AVAILABLE" || r.status === "HELD_BY_YOU") && matching.has(r.id)) m.set(r.floorId, (m.get(r.floorId) ?? 0) + 1);
    return m;
  }, [rooms, matching]);
  const ordered = vertical ? [...floors].reverse() : floors;
  return (
    <div role="radiogroup" aria-label="Floor" className={cn("flex gap-1.5", vertical ? "flex-col" : "overflow-x-auto pb-1", className)} data-testid="floor-selector">
      {ordered.map((f) => {
        const active = f.id === floorId;
        const n = counts.get(f.id) ?? 0;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setFloor(f.id)}
            data-level={f.level}
            className={cn(
              "flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 text-left text-sm transition-colors",
              active ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-line-strong",
            )}
          >
            <span className="font-medium">{f.name}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/20" : n ? "bg-available-soft text-available" : "bg-subtle text-ink-3")}>{n} free</span>
          </button>
        );
      })}
    </div>
  );
}

const FILTER_TOGGLES = [
  { key: "availableOnly", label: "Available only" },
  { key: "balcony", label: "Balcony" },
  { key: "corner", label: "Corner" },
  { key: "highFloor", label: "Higher floors" },
  { key: "largeWindows", label: "2+ windows" },
] as const;

/** Room-level filters inside one property. Rooms that don't match fade out in 3D and on the plan (never hidden silently). */
export function ExplorerFilters({ className }: { className?: string }) {
  const filters = useExplorer((s) => s.filters);
  const setFilters = useExplorer((s) => s.setFilters);
  const resetFilters = useExplorer((s) => s.resetFilters);
  const rooms = useExplorer((s) => s.data.rooms);
  const matching = useFilteredIds();
  const views = useMemo(() => [...new Set(rooms.map((r) => r.viewType))] as ViewKey[], [rooms]);
  const categories = useMemo(() => [...new Set(rooms.map((r) => r.category))], [rooms]);
  const prices = useMemo(() => [...new Set(rooms.map((r) => r.nightlyRate))].sort((a, b) => a - b), [rooms]);
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  return (
    <div className={cn("space-y-3", className)} data-testid="explorer-filters">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <SlidersHorizontal className="size-4" aria-hidden /> Filter rooms
          <span className="font-normal text-ink-3" aria-live="polite">
            {matching.size} of {rooms.length} match
          </span>
        </p>
        {active && (
          <Button size="sm" variant="ghost" onClick={resetFilters}>
            <X className="size-4" aria-hidden /> Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {views.length > 1 &&
          views.map((v) => (
            <ToggleChip key={v} icon={VIEW_ICONS[v]} pressed={filters.views.includes(v)} onClick={() => setFilters({ views: filters.views.includes(v) ? filters.views.filter((x) => x !== v) : [...filters.views, v] })}>
              {VIEW_LABELS[v]}
            </ToggleChip>
          ))}
        {FILTER_TOGGLES.map((t) => (
          <ToggleChip key={t.key} pressed={filters[t.key]} onClick={() => setFilters({ [t.key]: !filters[t.key] })}>
            {t.label}
          </ToggleChip>
        ))}
        {categories.length > 1 &&
          categories.map((c) => (
            <ToggleChip key={c} pressed={filters.categories.includes(c)} onClick={() => setFilters({ categories: filters.categories.includes(c) ? filters.categories.filter((x) => x !== c) : [...filters.categories, c] })}>
              {c[0] + c.slice(1).toLowerCase()}
            </ToggleChip>
          ))}
      </div>
      {prices.length > 2 && (
        <label className="flex flex-wrap items-center gap-3 text-sm text-ink-2">
          <span>Max per night</span>
          <input
            type="range"
            min={prices[0]}
            max={prices[prices.length - 1]}
            step={100}
            value={filters.maxPrice ?? prices[prices.length - 1]}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFilters({ maxPrice: v >= prices[prices.length - 1] ? null : v });
            }}
            className="h-11 min-w-40 flex-1 accent-primary"
            aria-valuetext={filters.maxPrice ? formatMoney(filters.maxPrice) : "Any price"}
          />
          <span className="w-24 text-right font-medium text-ink">{filters.maxPrice ? formatMoney(filters.maxPrice) : "Any"}</span>
        </label>
      )}
    </div>
  );
}

export function CompareTray() {
  const compare = useExplorer((s) => s.compare);
  const rooms = useExplorer((s) => s.data.rooms);
  const setCompareOpen = useExplorer((s) => s.setCompareOpen);
  const toggleCompare = useExplorer((s) => s.toggleCompare);
  if (!compare.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-sm" data-testid="compare-tray">
      <Columns2 className="size-4 text-secondary" aria-hidden />
      <span className="font-medium">Compare</span>
      {compare.map((id) => {
        const r = rooms.find((x) => x.id === id);
        return r ? (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-subtle py-0.5 pr-0.5 pl-2.5">
            {r.number}
            <button type="button" onClick={() => toggleCompare(id)} className="grid size-7 place-items-center rounded-full hover:bg-muted" aria-label={`Remove room ${r.number} from compare`}>
              <X className="size-3.5" />
            </button>
          </span>
        ) : null;
      })}
      <Button size="sm" variant="outline" className="ml-auto" disabled={compare.length < 2} onClick={() => setCompareOpen(true)}>
        Compare {compare.length} rooms
      </Button>
    </div>
  );
}
