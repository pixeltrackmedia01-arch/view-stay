import type { Metadata } from "next";
import { Compass, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/hotel/property-card";
import { ResultsMap } from "@/components/search/results-map";
import { SearchBar } from "@/components/search/search-bar";
import { LinkButton } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { getCurrentUser } from "@/lib/auth";
import { VIEW_LABELS, type ViewKey } from "@/lib/catalog-types";
import { db } from "@/lib/db";
import { defaultStay, parseDateOnly } from "@/lib/dates";
import { destinationOptions } from "@/lib/destinations";
import { VIEW_ICONS } from "@/lib/icons";
import { formatMoney } from "@/lib/money";
import { wishlistIds } from "@/lib/wishlist";
import { searchHotels } from "@/server/search";
import { DESTINATIONS } from "@/data/destinations";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await db.destination.findUnique({ where: { slug: (await params).slug }, select: { name: true, tagline: true } });
  return d ? { title: `Stays in ${d.name}`, description: d.tagline } : { title: "Destination" };
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const dest = await db.destination.findUnique({ where: { slug }, include: { heroAsset: true } });
  if (!dest) notFound();
  const stay = defaultStay();
  const [results, user, destinations] = await Promise.all([
    searchHotels({ destinationSlug: slug, checkIn: parseDateOnly(stay.checkIn)!, checkOut: parseDateOnly(stay.checkOut)!, guests: 2, rooms: 1, pageSize: 20 }),
    getCurrentUser(),
    destinationOptions(),
  ]);
  const saved = await wishlistIds(user?.id);
  const query = new URLSearchParams({ ...stay, guests: "2", rooms: "1" }).toString();
  const views = (DESTINATIONS.find((d) => d.slug === slug)?.views ?? []) as ViewKey[];
  const minPrice = results.hotels.length ? Math.min(...results.hotels.map((h) => h.minPrice)) : null;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-primary-dark text-white">
        <Photo src={dest.heroAsset?.path} alt={dest.heroAsset?.alt ?? dest.name} ratio="auto" className="!absolute inset-0 -z-10 size-full" priority illustrative />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary-dark via-primary-dark/40 to-transparent" aria-hidden />
        <div className="container-page pt-28 pb-24 sm:pt-40">
          <nav aria-label="Breadcrumb" className="mb-3 text-sm text-white/75">
            <Link href="/destinations" className="hover:text-white">Destinations</Link> <span aria-hidden>/</span> {dest.region}
          </nav>
          <p className="flex items-center gap-1.5 text-sm font-medium tracking-wide text-white/80 uppercase"><MapPin className="size-4" aria-hidden />{dest.state}</p>
          <h1 className="font-display text-5xl font-semibold sm:text-6xl">{dest.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/85">{dest.tagline}</p>
          {minPrice !== null && <p className="mt-4 text-sm text-white/80">{results.total} properties · rooms from <strong className="text-white">{formatMoney(minPrice)}</strong> per night</p>}
        </div>
      </section>
      <div className="container-page relative z-10 -mt-10">
        <SearchBar defaults={{ q: dest.name, ...stay, guests: 2, rooms: 1 }} destinations={destinations} />
      </div>

      <div className="container-page mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="font-display text-2xl font-semibold">About {dest.name}</h2>
          <p className="mt-3 text-ink-2">{dest.description}</p>
          <h3 className="mt-6 font-semibold">Views you can choose here</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {views.map((v) => {
              const Icon = VIEW_ICONS[v];
              return (
                <li key={v}>
                  <Link href={`/search?destination=${slug}&views=${v}&${query}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-primary">
                    <Icon className="size-4 text-secondary" aria-hidden /> {VIEW_LABELS[v]} rooms
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Compass className="size-5 text-accent-hover" aria-hidden />Nearby attractions</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {dest.attractions.map((a) => <li key={a} className="py-2.5">{a}</li>)}
          </ul>
        </section>
      </div>

      <section className="container-page mt-14" aria-labelledby="stays">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 id="stays" className="font-display text-3xl font-semibold">Stays in {dest.name}</h2>
          <LinkButton href={`/search?destination=${slug}&${query}`} variant="secondary">Filter these stays</LinkButton>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.hotels.map((h, i) => (
            <PropertyCard key={h.id} hotel={h} query={query} saved={saved.has(h.id)} signedIn={!!user} priority={i < 3} />
          ))}
        </div>
        {results.mapPoints.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 font-display text-2xl font-semibold">Where they are</h2>
            <ResultsMap points={results.mapPoints} query={query} local />
          </div>
        )}
      </section>
    </>
  );
}
