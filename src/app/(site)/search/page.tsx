import type { Metadata } from "next";
import { List, Map as MapIcon, SearchX } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "@/components/hotel/property-card";
import { SearchFilters } from "@/components/search/filters";
import { ResultsMap } from "@/components/search/results-map";
import { SearchBar } from "@/components/search/search-bar";
import { SortSelect } from "@/components/search/sort-select";
import { Alert } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, nightsBetween } from "@/lib/dates";
import { destinationOptions } from "@/lib/destinations";
import { parseSearch, type RawParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { wishlistIds } from "@/lib/wishlist";
import { searchHotels } from "@/server/search";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore stays" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const { params, stay, stayError } = parseSearch(raw);
  const [results, destinations, user] = await Promise.all([searchHotels(params), destinationOptions(), getCurrentUser()]);
  const saved = await wishlistIds(user?.id);
  const dest = destinations.find((d) => d.slug === params.destinationSlug);
  const mode = raw.view === "map" ? "map" : "list";
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const stayQuery = new URLSearchParams({ checkIn: stay.checkIn, checkOut: stay.checkOut, guests: String(params.guests), rooms: String(params.rooms) });
  for (const k of ["views", "balcony", "corner", "minFloor", "beds", "minSize", "accessible"]) if (typeof raw[k] === "string") stayQuery.set(k, raw[k] as string);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string") p.set(k, v);
    for (const [k, v] of Object.entries(patch)) (v === undefined ? p.delete(k) : p.set(k, v));
    return `/search?${p}`;
  };
  const where = dest ? (dest.state === dest.name ? dest.name : `${dest.name}, ${dest.state}`) : params.q ? `“${params.q}”` : "All destinations";

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="mb-6">
        <SearchBar
          variant="compact"
          defaults={{ q: dest?.name ?? params.q ?? "", checkIn: stay.checkIn, checkOut: stay.checkOut, guests: params.guests, rooms: params.rooms }}
          destinations={destinations}
          extraParams={Object.fromEntries(Object.entries(raw).filter(([k, v]) => typeof v === "string" && !["q", "destination", "checkIn", "checkOut", "guests", "rooms", "page"].includes(k)) as [string, string][])}
        />
      </div>
      {stayError && <Alert tone="warning" className="mb-4" title="We adjusted your dates">{stayError}. Showing results for {formatDate(params.checkIn)} – {formatDate(params.checkOut)} instead.</Alert>}

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{where}</h1>
          <p className="mt-1 text-sm text-ink-2" aria-live="polite" data-testid="result-count">
            {results.total} {results.total === 1 ? "property" : "properties"} · {formatDate(params.checkIn)} – {formatDate(params.checkOut)} · {nights} night{nights > 1 ? "s" : ""} · {params.guests} guest{params.guests > 1 ? "s" : ""} · {params.rooms} room{params.rooms > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SortSelect />
          <div className="inline-flex rounded-[var(--radius-sm)] border border-line bg-surface p-0.5" role="group" aria-label="Display mode">
            <Link href={qs({ view: undefined })} aria-current={mode === "list" ? "true" : undefined} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-[6px] px-3 text-sm font-medium", mode === "list" ? "bg-primary text-white" : "text-ink-2 hover:bg-subtle")}>
              <List className="size-4" aria-hidden /> List
            </Link>
            <Link href={qs({ view: "map", page: undefined })} aria-current={mode === "map" ? "true" : undefined} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-[6px] px-3 text-sm font-medium", mode === "map" ? "bg-primary text-white" : "text-ink-2 hover:bg-subtle")} data-testid="map-toggle">
              <MapIcon className="size-4" aria-hidden /> Map
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[280px_1fr]">
        <SearchFilters resultCount={results.total} />
        <section className="min-w-0 lg:col-start-2" aria-label="Results">
          {results.total === 0 ? (
            <EmptyState icon={SearchX} title="No properties match these filters" action={<><LinkButton href={qs({ views: undefined, balcony: undefined, corner: undefined, minFloor: undefined, beds: undefined, minSize: undefined, accessible: undefined, types: undefined, amenities: undefined, priceMin: undefined, priceMax: undefined, minRating: undefined, minStars: undefined, freeCancel: undefined, page: undefined })} variant="primary">Clear filters</LinkButton><LinkButton href="/destinations" variant="secondary">Browse destinations</LinkButton></>}>
              Try fewer room features, a wider price range or different dates. Rooms that are booked or on hold for your dates aren&apos;t counted.
            </EmptyState>
          ) : mode === "map" ? (
            <ResultsMap points={results.mapPoints} query={stayQuery.toString()} local={!!dest} />
          ) : (
            <>
              <div className="grid gap-5">
                {results.hotels.map((h, i) => (
                  <PropertyCard key={h.id} hotel={h} query={stayQuery.toString()} saved={saved.has(h.id)} signedIn={!!user} layout="row" priority={i < 2} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination page={results.page} pageCount={results.pageCount} href={(p) => qs({ page: String(p) })} />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
