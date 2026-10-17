import { ArrowRight, Box, Clock, Eye, Layers, MousePointerClick, Receipt, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DestinationCard } from "@/components/home/destination-card";
import { CORE_FAQ, Faq } from "@/components/home/faq";
import { RoomShowcaseCard } from "@/components/home/room-showcase-card";
import { PropertyCard } from "@/components/hotel/property-card";
import { MiniPlan } from "@/components/explorer/mini-plan";
import { SearchBar } from "@/components/search/search-bar";
import { LinkButton } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { getCurrentUser } from "@/lib/auth";
import { defaultStay, parseDateOnly } from "@/lib/dates";
import { generateBuilding } from "@/lib/layout/templates";
import { libraryKeys, libraryPath } from "@/lib/media/library";
import { formatMoney } from "@/lib/money";
import { wishlistIds } from "@/lib/wishlist";
import { destinationCards, featuredProperties, showcaseRooms } from "@/server/home";

export const dynamic = "force-dynamic";

function SectionHeading({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="text-sm font-semibold tracking-wide text-accent-hover uppercase">{eyebrow}</p>}
        <h2 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-[2.5rem] sm:leading-tight">{title}</h2>
        {children && <p className="mt-3 text-base text-ink-2">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export default async function HomePage() {
  const stay = defaultStay();
  const ci = parseDateOnly(stay.checkIn)!;
  const co = parseDateOnly(stay.checkOut)!;
  const user = await getCurrentUser();
  const [destinations, featured, rooms, value, saved] = await Promise.all([
    destinationCards(),
    featuredProperties(ci, co),
    showcaseRooms(ci, co, "view", 4),
    showcaseRooms(ci, co, "value", 4),
    wishlistIds(user?.id),
  ]);
  const query = new URLSearchParams({ ...stay, guests: "2" }).toString();
  const trending = destinations.filter((d) => d.featured).slice(0, 5);
  const themed = [
    { title: "Mountain escapes", body: "Snowlines, tea hills and valley balconies.", items: destinations.filter((d) => d.themes.includes("MOUNTAIN")).slice(0, 8) },
    { title: "Coastal retreats", body: "Sea-facing rooms, backwaters and island coves.", items: destinations.filter((d) => d.themes.includes("COASTAL") || d.slug === "alleppey").slice(0, 8) },
    { title: "City & heritage stays", body: "Courtyards, lake palaces and skyline views.", items: destinations.filter((d) => d.themes.includes("HERITAGE") || d.themes.includes("CITY")).slice(0, 8) },
  ];
  const destOptions = destinations.map((d) => ({ slug: d.slug, name: d.name, state: d.state }));
  const demoFloor = generateBuilding("COASTAL_RESORT", "home-demo").floors[1] ?? generateBuilding("COASTAL_RESORT", "home-demo").floors[0];
  const hero = libraryPath(libraryKeys.destination("udaipur"));

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary-dark text-white">
        <Photo src={hero} alt="Illustrative lakeside palace landscape at dawn" ratio="auto" className="!absolute inset-0 -z-10 size-full" priority />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-dark/90 via-primary-dark/60 to-primary-dark/10" aria-hidden />
        <div className="container-page pt-16 pb-28 sm:pt-24 lg:pt-28 lg:pb-36">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/20 backdrop-blur">
            <MousePointerClick className="size-4 text-accent" aria-hidden /> Exact-room booking across 35 Indian destinations
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-[2.6rem] leading-[1.05] font-semibold sm:text-6xl lg:text-[4rem]">Your stay. Your room. Your view.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">Discover beautiful stays, explore the property, and choose the exact room that feels right for you.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={`/search?${query}`} variant="accent" size="lg">Explore stays <ArrowRight className="size-5" aria-hidden /></LinkButton>
            <LinkButton href="/explore-3d" variant="inverse" size="lg"><Box className="size-5" aria-hidden /> Explore in 3D</LinkButton>
          </div>
        </div>
      </section>
      <div className="container-page relative z-10 -mt-16 sm:-mt-20">
        <SearchBar defaults={{ ...stay, guests: 2, rooms: 1 }} destinations={destOptions} />
      </div>

      {/* Differentiators */}
      <section className="container-page mt-16" aria-labelledby="why">
        <h2 id="why" className="sr-only">Why ViewStay</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MousePointerClick, title: "Choose your exact room", body: "Pick room 304, not just “a deluxe room”. The room you select is the room you book.", img: libraryPath(libraryKeys.room("heritage", "DELUXE", "lake-palace", "day")) },
            { icon: Layers, title: "Explore property layouts", body: "See every floor in 3D or as a floor plan: lifts, corridors, corners and balconies.", plan: true },
            { icon: Eye, title: "Discover the view", body: "Filter by sea, lake, mountain, valley, garden or city view, with view scores per room.", img: libraryPath(libraryKeys.view("himalaya", "dawn")) },
            { icon: Receipt, title: "Transparent booking prices", body: "Per-room nightly rates and a full breakdown with taxes before you pay.", price: true },
          ].map((f) => (
            <li key={f.title} className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              <div className="aspect-[16/9] bg-subtle">
                {f.img && <Photo src={f.img} alt="" ratio="16/9" />}
                {f.plan && <MiniPlan floor={demoFloor} highlight={demoFloor.rooms[2]?.number} className="size-full p-4" />}
                {f.price && (
                  <div className="flex h-full flex-col justify-center gap-1.5 px-6 text-sm" aria-hidden>
                    <p className="flex justify-between text-ink-2"><span>Room 304 × 2 nights</span><span>₹13,600</span></p>
                    <p className="flex justify-between text-ink-2"><span>Taxes (12%)</span><span>₹1,632</span></p>
                    <p className="flex justify-between border-t border-line pt-1.5 font-semibold"><span>Total</span><span>₹15,232</span></p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <f.icon className="size-6 text-accent-hover" aria-hidden />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-ink-2">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Trending destinations */}
      <section className="container-page mt-24" aria-labelledby="trending">
        <SectionHeading eyebrow="Trending destinations" title="Where travellers are choosing rooms right now" action={<LinkButton href="/destinations" variant="secondary">All 35 destinations <ArrowRight className="size-4" aria-hidden /></LinkButton>} />
        <h2 id="trending" className="sr-only">Trending destinations</h2>
        <div className="grid gap-4 lg:grid-cols-4 lg:grid-rows-2">
          {trending.map((d, i) => (
            <div key={d.slug} className={i === 0 ? "lg:col-span-2 lg:row-span-2" : ""}>
              <DestinationCard d={d} size={i === 0 ? "lg" : "md"} priority={i === 0} />
            </div>
          ))}
        </div>
      </section>

      {/* Featured properties */}
      <section className="container-page mt-24" aria-labelledby="featured">
        <SectionHeading eyebrow="Featured stays" title="Properties worth exploring room by room" action={<LinkButton href={`/search?${query}`} variant="secondary">Browse all stays <ArrowRight className="size-4" aria-hidden /></LinkButton>}>
          Live availability for {stay.checkIn} to {stay.checkOut}.
        </SectionHeading>
        <h2 id="featured" className="sr-only">Featured properties</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((h) => (
            <PropertyCard key={h.id} hotel={h} query={query} saved={saved.has(h.id)} signedIn={!!user} />
          ))}
        </div>
      </section>

      {/* Room discovery */}
      <section className="mt-24 bg-accent-soft py-20" aria-labelledby="rooms">
        <div className="container-page">
          <SectionHeading eyebrow="Room discovery" title="Don't settle for “any deluxe room”">
            These exact rooms are available for your dates. Open their photos, find them in 3D, and select the one you want.
          </SectionHeading>
          <h2 id="rooms" className="sr-only">Rooms you can choose</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rooms.map((r) => (
              <RoomShowcaseCard key={r.id} room={r} query={query} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page mt-24" aria-labelledby="how">
        <SectionHeading eyebrow="How it works" title="Three steps to the room you actually want" action={<LinkButton href="/how-it-works" variant="secondary">Learn more</LinkButton>} />
        <h2 id="how" className="sr-only">How it works</h2>
        <ol className="grid gap-5 lg:grid-cols-3">
          {[
            { n: 1, title: "Discover a property", body: "Search 350 stays by destination, dates and the kind of view you want.", img: libraryPath(libraryKeys.exterior("COASTAL_RESORT", 0, "tropical-sea", "day")) },
            { n: 2, title: "Explore the rooms", body: "Rotate the building in 3D, switch floors, or use the 2D plan. Open any room's photos and view.", plan: true },
            { n: 3, title: "Select and book your room", body: "We hold your chosen room for 10 minutes while you check out. That exact room is confirmed to you.", img: libraryPath(libraryKeys.balcony("coastal", "tropical-sea", "dusk")) },
          ].map((s) => (
            <li key={s.n} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              <div className="aspect-[16/10] bg-subtle">{s.plan ? <MiniPlan floor={demoFloor} highlight={demoFloor.rooms[4]?.number} className="size-full p-5" /> : <Photo src={s.img} alt="" ratio="16/10" />}</div>
              <div className="flex gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-semibold text-white">{s.n}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-ink-2">{s.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Themed destination rows */}
      {themed.map((t) => (
        <section key={t.title} className="container-page mt-20" aria-labelledby={`t-${t.title}`}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 id={`t-${t.title}`} className="font-display text-2xl font-semibold sm:text-3xl">{t.title}</h2>
              <p className="mt-1 text-ink-2">{t.body}</p>
            </div>
            <Link href="/destinations" className="hidden text-sm font-semibold text-primary hover:text-accent-hover sm:inline">See all</Link>
          </div>
          <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0">
            {t.items.map((d) => (
              <li key={d.slug} className="w-[260px] shrink-0 snap-start sm:w-[280px]">
                <DestinationCard d={d} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Best value rooms */}
      <section className="container-page mt-24" aria-labelledby="value">
        <SectionHeading eyebrow="Best-value rooms" title="Great outlooks at the lowest nightly rates">Highly rated properties, rooms with a good view score, sorted by price.</SectionHeading>
        <h2 id="value" className="sr-only">Best-value rooms</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {value.map((r) => (
            <RoomShowcaseCard key={r.id} room={r} query={query} />
          ))}
        </div>
      </section>

      {/* Exact-room promise */}
      <section className="container-page mt-24">
        <div className="grid gap-8 overflow-hidden rounded-[var(--radius-xl)] bg-primary p-8 text-white sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">How exact-room selection works</h2>
            <p className="mt-3 text-white/80">Every physical room has a permanent identity, position and set of photographs. Availability, holds and bookings are checked on our servers, never just in your browser.</p>
            <LinkButton href="/how-it-works" variant="accent" className="mt-6">Read the details</LinkButton>
          </div>
          <ul className="grid gap-4 text-sm">
            {[
              { icon: Clock, t: "10-minute hold", b: "Your selected rooms are reserved for you while you check out." },
              { icon: ShieldCheck, t: "No silent swaps", b: "If a room becomes unavailable, we tell you and let you choose. We never substitute another room." },
              { icon: Eye, t: "Honest imagery", b: "Illustrative photos and 3D models are labelled as such." },
            ].map((i) => (
              <li key={i.t} className="flex gap-3 rounded-[var(--radius-md)] bg-white/10 p-4">
                <i.icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <span><strong className="block text-white">{i.t}</strong><span className="text-white/75">{i.b}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page mt-24 max-w-[var(--container-narrow)]" aria-labelledby="faq">
        <h2 id="faq" className="mb-6 text-center font-display text-3xl font-semibold">Frequently asked questions</h2>
        <Faq items={CORE_FAQ} />
        <p className="mt-6 text-center text-sm text-ink-2">
          Starting prices from {formatMoney(Math.min(...destinations.filter((d) => d.minPrice).map((d) => d.minPrice!)))} per night. <Link href="/help" className="font-medium text-primary underline">More help</Link>
        </p>
      </section>
    </>
  );
}
