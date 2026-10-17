import type { Metadata } from "next";
import { CalendarClock, Check, Clock, Expand, MapPin, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoomExplorer } from "@/components/explorer/room-explorer";
import { HotelGallery } from "@/components/hotel/hotel-gallery";
import { ShareButton } from "@/components/hotel/share-button";
import { StayEditor } from "@/components/hotel/stay-editor";
import { WishlistButton } from "@/components/hotel/wishlist-button";
import { Alert, Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { RatingBadge, Stars } from "@/components/ui/rating";
import { getCurrentUser } from "@/lib/auth";
import { POLICY_INFO } from "@/lib/cancellation";
import { TEMPLATE_INFO } from "@/lib/catalog-types";
import { formatDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { AMENITY_ICONS } from "@/lib/icons";
import { MEDIA_CATEGORY_LABELS } from "@/lib/media/library";
import { formatMoney } from "@/lib/money";
import { parseSearch, type RawParams } from "@/lib/search-params";
import { wishlistIds } from "@/lib/wishlist";
import { getExplorerData, getHotelBySlug } from "@/server/hotels";
import type { ExplorerMode } from "@/components/explorer/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

async function load(slug: string) {
  const user = await getCurrentUser();
  try {
    return { user, hotel: await getHotelBySlug(slug, user) };
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const hotel = await getHotelBySlug((await params).slug);
    return { title: `${hotel.name}, ${hotel.destination.name}`, description: hotel.description.slice(0, 160) };
  } catch {
    return { title: "Property" };
  }
}

export default async function HotelPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const { user, hotel } = await load(slug);
  const { params: stayParams, stay, stayError, filters } = parseSearch(raw);
  const roomsWanted = filters.rooms;
  const [explorer, saved] = await Promise.all([
    getExplorerData(hotel.id, stayParams.checkIn, stayParams.checkOut, stayParams.guests, roomsWanted, user?.id),
    wishlistIds(user?.id),
  ]);
  const mode = (["3d", "plan", "list"] as const).includes(raw.view as ExplorerMode) ? (raw.view as ExplorerMode) : "plan";
  const initialRoom = typeof raw.room === "string" ? raw.room : null;
  const available = explorer.rooms.filter((r) => r.status === "AVAILABLE");
  const from = available.length ? Math.min(...available.map((r) => r.nightlyRate)) : null;
  const policy = POLICY_INFO[hotel.cancellationPolicy];
  const tpl = TEMPLATE_INFO[hotel.template];
  const stayQuery = new URLSearchParams({ checkIn: stay.checkIn, checkOut: stay.checkOut, guests: String(stayParams.guests), rooms: String(roomsWanted) });
  const photos = hotel.photos.map((p) => ({ id: p.id, path: p.asset.path, alt: p.alt, caption: p.caption, category: p.category, label: MEDIA_CATEGORY_LABELS[p.category], illustrative: p.asset.illustrative }));

  return (
    <div className="container-page space-y-10 py-6 sm:py-8">
      {hotel.status !== "APPROVED" && (
        <Alert tone="warning" title={`Preview: this property is ${hotel.status.toLowerCase()}`}>
          Only you and administrators can see this page until it is approved.
        </Alert>
      )}
      <header className="space-y-3">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-3">
          <Link href="/destinations" className="hover:text-ink">Destinations</Link> <span aria-hidden>/</span>{" "}
          <Link href={`/destinations/${hotel.destination.slug}`} className="hover:text-ink">{hotel.destination.name}</Link> <span aria-hidden>/</span> <span className="text-ink-2">{hotel.name}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{tpl.label}</Badge>
              <Stars count={hotel.starRating} />
              {hotel.isDemo && <Badge tone="info">Demo property</Badge>}
            </div>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{hotel.name}</h1>
            <p className="flex items-center gap-1.5 text-ink-2">
              <MapPin className="size-4 shrink-0" aria-hidden /> {hotel.neighborhood ? `${hotel.neighborhood}, ` : ""}
              {hotel.destination.name}, {hotel.destination.state}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RatingBadge rating={hotel.ratingAvg} count={hotel.reviewCount} />
            <ShareButton title={hotel.name} />
            <WishlistButton hotelId={hotel.id} hotelName={hotel.name} initial={saved.has(hotel.id)} signedIn={!!user} />
          </div>
        </div>
      </header>

      <HotelGallery name={hotel.name} photos={photos} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-10">
          <section aria-labelledby="about">
            <h2 id="about" className="font-display text-2xl font-semibold">About this stay</h2>
            <p className="mt-3 leading-relaxed text-ink-2">{hotel.description}</p>
            {hotel.highlights.length > 0 && (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {hotel.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm text-ink-2">
                    <Star className="mt-0.5 size-4 shrink-0 text-accent-hover" aria-hidden /> {h}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="amenities">
            <h2 id="amenities" className="font-display text-2xl font-semibold">Amenities</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {hotel.amenities.map((a) => {
                const Icon = AMENITY_ICONS[a] ?? Check;
                return (
                  <li key={a} className="flex items-center gap-2 text-sm text-ink-2">
                    <Icon className="size-4 text-secondary" aria-hidden /> {a}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="room-types">
            <h2 id="room-types" className="font-display text-2xl font-semibold">Room types</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {hotel.roomTypes.map((t) => (
                <div key={t.id} className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
                  <p className="font-semibold text-ink">{t.name}</p>
                  <p className="mt-1 text-sm text-ink-2">{t.bedType} · up to {t.maxGuests} guests · from {t.sizeSqm} m²</p>
                  <p className="mt-2 text-sm text-ink-3">From <span className="font-semibold text-ink">{formatMoney(t.basePrice)}</span> / night</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-3">Every room is different: floor, view, balcony and size are shown per room below.</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Your stay">
          <div className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
            {from !== null ? (
              <p className="text-ink-2">
                Rooms from <span className="text-2xl font-semibold text-ink">{formatMoney(from)}</span> / night
              </p>
            ) : (
              <p className="font-medium text-ink">No rooms free for these dates</p>
            )}
            <p className="text-sm text-ink-3">
              {available.length} of {explorer.rooms.length} rooms available · {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}
            </p>
            {stayError && <Alert tone="warning" title="We adjusted your dates">{stayError}</Alert>}
            <StayEditor stay={{ checkIn: stay.checkIn, checkOut: stay.checkOut, guests: stayParams.guests, rooms: roomsWanted }} anchor="rooms" />
            <LinkButton href="#rooms" variant="accent" size="lg" className="w-full">Choose your exact room</LinkButton>
            <LinkButton href={`/hotels/${hotel.slug}/explore?${stayQuery}&view=3d`} variant="outline" className="w-full">
              <Expand className="size-4" aria-hidden /> Explore in 3D, fullscreen
            </LinkButton>
            <p className="flex items-center gap-2 text-xs text-ink-3">
              <ShieldCheck className="size-4 shrink-0 text-available" aria-hidden /> {policy.summary}
            </p>
          </div>
        </aside>
      </div>

      <section id="rooms" aria-labelledby="rooms-title" className="scroll-mt-20 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="rooms-title" className="font-display text-3xl font-semibold">Choose your room</h2>
            <p className="mt-1 text-ink-2">
              {explorer.stay.nights} night{explorer.stay.nights > 1 ? "s" : ""} · {stayParams.guests} guest{stayParams.guests > 1 ? "s" : ""} · {roomsWanted} room{roomsWanted > 1 ? "s" : ""}. Explore the building, compare outlooks and pick the exact room you want.
            </p>
          </div>
        </div>
        {explorer.rooms.length === 0 ? (
          <Alert tone="info" title="Rooms are being set up">This property hasn&apos;t published its rooms yet.</Alert>
        ) : (
          <RoomExplorer data={explorer} initialRoomId={initialRoom} initialMode={mode} />
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="policies">
          <h2 id="policies" className="font-display text-2xl font-semibold">Policies</h2>
          <dl className="mt-4 divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface text-sm">
            <div className="flex items-center justify-between gap-3 p-4">
              <dt className="flex items-center gap-2 text-ink-2"><Clock className="size-4" aria-hidden /> Check-in</dt>
              <dd className="font-medium">From {hotel.checkInTime}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <dt className="flex items-center gap-2 text-ink-2"><Clock className="size-4" aria-hidden /> Check-out</dt>
              <dd className="font-medium">Until {hotel.checkOutTime}</dd>
            </div>
            <div className="flex items-start justify-between gap-3 p-4">
              <dt className="flex items-center gap-2 text-ink-2"><CalendarClock className="size-4" aria-hidden /> Cancellation</dt>
              <dd className="max-w-xs text-right">
                <span className="font-medium">{policy.label}.</span> {policy.summary} Non-refundable rates are never refunded.{" "}
                <Link href="/help#cancellation" className="text-primary underline">How cancellation works</Link>
              </dd>
            </div>
            {hotel.houseRules.length > 0 && (
              <div className="p-4">
                <dt className="text-ink-2">House rules</dt>
                <dd>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {hotel.houseRules.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby="location">
          <h2 id="location" className="font-display text-2xl font-semibold">Location</h2>
          <div className="mt-4 space-y-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4 text-sm">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden /> {hotel.address}
            </p>
            <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-md)] bg-[radial-gradient(circle_at_30%_30%,#e1ece6,#eef2ef_60%)]" role="img" aria-label={`Simulated map: ${hotel.name} in ${hotel.neighborhood || hotel.destination.name}`}>
              <svg viewBox="0 0 160 90" className="absolute inset-0 size-full" aria-hidden>
                <path d="M0 60 C40 50 70 72 160 48" stroke="#cfd8d5" strokeWidth="5" fill="none" />
                <path d="M50 0 C55 30 40 60 60 90" stroke="#d9e0dd" strokeWidth="3" fill="none" />
                <path d="M110 0 C100 40 120 60 105 90" stroke="#d9e0dd" strokeWidth="3" fill="none" />
                <circle cx={20 + hotel.mapX * 120} cy={12 + hotel.mapY * 66} r="5" fill="#173f4f" stroke="#fff" strokeWidth="2" />
              </svg>
              <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink-2">Simulated map · approximate position</span>
            </div>
            {hotel.destination.attractions.length > 0 && (
              <div>
                <p className="font-medium text-ink">Around {hotel.destination.name}</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {hotel.destination.attractions.map((a) => (
                    <li key={a} className="rounded-full bg-subtle px-3 py-1 text-ink-2">{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>

      <section aria-labelledby="reviews">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="reviews" className="font-display text-2xl font-semibold">Guest reviews</h2>
          <RatingBadge rating={hotel.ratingAvg} count={hotel.reviewCount} />
        </div>
        {hotel.reviews.length ? (
          <>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {hotel.reviews.map((r) => (
                <li key={r.id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-ink">{r.user.name.split(" ")[0]}</p>
                    <span className="flex items-center gap-1 text-sm font-semibold text-ink"><Star className="size-4 fill-accent text-accent" aria-hidden /> {r.rating}/5</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{r.comment}</p>
                  <p className="mt-2 text-xs text-ink-3">Stayed · reviewed {formatDate(r.createdAt)}</p>
                </li>
              ))}
            </ul>
            {hotel.isDemo && <p className="mt-3 text-xs text-ink-3">Reviews on demo properties are generated sample content, written by seeded demo accounts after completed demo stays.</p>}
          </>
        ) : (
          <p className="mt-3 text-ink-2">No reviews yet. Reviews can only be written by guests after a completed stay.</p>
        )}
      </section>
    </div>
  );
}
