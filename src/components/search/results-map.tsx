"use client";

import { MapPin, Star, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Photo } from "@/components/ui/photo";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface MapPoint {
  id: string;
  slug: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  mapX: number;
  mapY: number;
  minPrice: number;
  ratingAvg: number | null;
  cover: string | null;
}

/**
 * Schematic results map. No map provider is configured, so positions are simulated: within one destination
 * hotels are spread on an illustrative local plan; across destinations they are placed by approximate
 * coordinates on a simple grid. Clearly labelled as such.
 */
export function ResultsMap({ points, query, local }: { points: MapPoint[]; query: string; local: boolean }) {
  const [active, setActive] = useState<string | null>(points[0]?.id ?? null);
  const W = 1000;
  const H = 640;
  const placed = useMemo(() => {
    if (local) return points.map((p) => ({ ...p, px: 60 + p.mapX * (W - 120), py: 50 + p.mapY * (H - 100) }));
    const lat = points.map((p) => p.latitude ?? 22);
    const lon = points.map((p) => p.longitude ?? 79);
    const [la0, la1] = [Math.min(...lat, 8) - 1, Math.max(...lat, 34) + 1];
    const [lo0, lo1] = [Math.min(...lon, 70) - 1, Math.max(...lon, 93) + 1];
    return points.map((p, i) => ({ ...p, px: 50 + ((lon[i] - lo0) / (lo1 - lo0)) * (W - 100) + (p.mapX - 0.5) * 36, py: 40 + ((la1 - lat[i]) / (la1 - la0)) * (H - 80) + (p.mapY - 0.5) * 36 }));
  }, [points, local]);
  const sel = placed.find((p) => p.id === active);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-[#e7efe9]" data-testid="results-map">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-[min(70vh,640px)] w-full" role="group" aria-label={`Schematic map of ${points.length} properties`}>
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="#d3e0d8" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {local ? (
          <g aria-hidden>
            <path d={`M0 ${H * 0.78} C ${W * 0.3} ${H * 0.7}, ${W * 0.6} ${H * 0.92}, ${W} ${H * 0.82} L ${W} ${H} L 0 ${H} Z`} fill="#cfe3ec" />
            <path d={`M${W * 0.08} 0 C ${W * 0.2} ${H * 0.4}, ${W * 0.45} ${H * 0.5}, ${W * 0.55} ${H}`} stroke="#fff" strokeWidth="14" fill="none" opacity="0.9" />
            <path d={`M0 ${H * 0.35} C ${W * 0.4} ${H * 0.3}, ${W * 0.7} ${H * 0.45}, ${W} ${H * 0.3}`} stroke="#fff" strokeWidth="10" fill="none" opacity="0.8" />
            <circle cx={W * 0.5} cy={H * 0.45} r="60" fill="#d8e8cf" />
          </g>
        ) : null}
      </svg>
      <ul className="absolute inset-0" aria-label="Property markers">
        {placed.map((p) => (
          <li key={p.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${(p.px / W) * 100}%`, top: `${(p.py / H) * 100}%` }}>
            <button
              type="button"
              onClick={() => setActive(p.id)}
              aria-pressed={active === p.id}
              aria-label={`${p.name}, ${p.city}, from ${formatMoney(p.minPrice)} per night`}
              className={cn("rounded-full px-2.5 py-1 text-xs font-semibold shadow-md ring-1 transition hover:z-10 hover:scale-105", active === p.id ? "z-10 bg-primary text-white ring-primary" : "bg-surface text-ink ring-line")}
            >
              {formatMoney(p.minPrice)}
            </button>
          </li>
        ))}
      </ul>
      {sel && (
        <div className="absolute right-3 bottom-3 left-3 flex gap-3 rounded-[var(--radius-md)] bg-surface p-3 shadow-[var(--shadow-pop)] sm:left-auto sm:w-96" data-testid="map-preview">
          <Photo src={sel.cover} alt="" ratio="1/1" className="w-24 shrink-0 rounded-[var(--radius-sm)]" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-xs text-ink-3"><MapPin className="size-3" aria-hidden />{sel.city}</p>
            <p className="truncate font-semibold">{sel.name}</p>
            {sel.ratingAvg !== null && <p className="flex items-center gap-1 text-xs text-ink-2"><Star className="size-3 fill-accent text-accent" aria-hidden />{sel.ratingAvg.toFixed(1)}</p>}
            <p className="mt-1 text-sm"><strong>{formatMoney(sel.minPrice)}</strong> <span className="text-ink-3">/ night</span></p>
            <Link href={`/hotels/${sel.slug}?${query}`} className="mt-1 inline-block text-sm font-semibold text-primary underline">View rooms</Link>
          </div>
          <button type="button" onClick={() => setActive(null)} aria-label="Close preview" className="-m-1 grid size-9 place-items-center self-start rounded-full hover:bg-subtle">
            <X className="size-4" />
          </button>
        </div>
      )}
      <p className="absolute top-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-xs text-ink-2 shadow-sm">Schematic map · locations are simulated for this demo</p>
    </div>
  );
}
