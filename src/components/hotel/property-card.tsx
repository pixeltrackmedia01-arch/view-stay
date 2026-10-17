import { ArrowRight, BedDouble, MapPin } from "lucide-react";
import Link from "next/link";
import { Photo } from "@/components/ui/photo";
import { RatingBadge } from "@/components/ui/rating";
import { TEMPLATE_INFO, VIEW_LABELS, type ViewKey } from "@/lib/catalog-types";
import { VIEW_ICONS } from "@/lib/icons";
import { formatMoney } from "@/lib/money";
import type { HotelResult } from "@/server/search";
import { WishlistButton } from "./wishlist-button";

export function PropertyCard({ hotel, query, saved, signedIn, layout = "grid", priority }: { hotel: HotelResult; query: string; saved: boolean; signedIn: boolean; layout?: "grid" | "row"; priority?: boolean }) {
  const href = `/hotels/${hotel.slug}${query ? `?${query}` : ""}`;
  return (
    <article className={layout === "row" ? "group relative grid overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-pop)] sm:grid-cols-[minmax(240px,38%)_1fr]" : "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-pop)]"} data-testid="hotel-card">
      <div className="relative">
        <Photo src={hotel.cover?.path} alt={hotel.cover?.alt ?? hotel.name} ratio={layout === "row" ? "4/3" : "3/2"} className="h-full" imgClassName="transition-transform duration-500 group-hover:scale-[1.03]" priority={priority} illustrative />
        <div className="absolute top-3 right-3 z-10">
          <WishlistButton hotelId={hotel.id} hotelName={hotel.name} initial={saved} signedIn={signedIn} variant="floating" />
        </div>
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur">{TEMPLATE_INFO[hotel.template].propertyType}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <p className="flex items-center gap-1 text-[13px] text-ink-2">
            <MapPin className="size-3.5" aria-hidden /> {hotel.city === hotel.state ? hotel.city : `${hotel.city}, ${hotel.state}`}
          </p>
          <h3 className="mt-1 font-display text-xl leading-snug font-semibold text-ink">
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {hotel.name}
            </Link>
          </h3>
          <RatingBadge rating={hotel.ratingAvg} count={hotel.reviewCount} size="sm" className="mt-2" />
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Views available">
          {hotel.viewTypes.slice(0, 3).map((v) => {
            const Icon = VIEW_ICONS[v as ViewKey];
            return (
              <li key={v} className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-secondary">
                <Icon className="size-3.5" aria-hidden /> {VIEW_LABELS[v as ViewKey]}
              </li>
            );
          })}
          {hotel.balconyRooms > 0 && <li className="rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-secondary">Balconies</li>}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
          <p className="flex items-center gap-1.5 text-[13px] text-available">
            <BedDouble className="size-4" aria-hidden />
            {hotel.availableRooms} room{hotel.availableRooms === 1 ? "" : "s"} to choose from
          </p>
          <p className="text-right">
            <span className="block text-xs text-ink-3">from</span>
            <span className="text-lg font-semibold text-ink">{formatMoney(hotel.minPrice)}</span>
            <span className="text-xs text-ink-3"> / night</span>
          </p>
        </div>
        <span className="relative z-10 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:text-accent-hover" aria-hidden>
          View rooms <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
