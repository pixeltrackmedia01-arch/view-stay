import Link from "next/link";
import { BedDouble, Eye, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HotelCover } from "@/components/hotel-cover";
import { Stars } from "@/components/stars";
import { formatMoney } from "@/lib/money";
import { VIEW_LABELS } from "@/lib/labels";
import type { HotelResult } from "@/server/search";

export function HotelCard({ hotel, query }: { hotel: HotelResult; query: string }) {
  const soldOut = hotel.availableRooms === 0;
  return (
    <Link
      href={`/hotels/${hotel.slug}?${query}`}
      className="group grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md sm:grid-cols-[220px_1fr]"
      data-testid="hotel-card"
    >
      <HotelCover hue={hotel.coverHue} name={hotel.name} viewTypes={hotel.viewTypes} className="h-40 sm:h-full" />
      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-ink group-hover:text-brand-700">{hotel.name}</h3>
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="size-3.5" aria-hidden /> {hotel.city}, {hotel.country} · <Stars count={hotel.starRating} />
            </p>
          </div>
          {hotel.rating !== null && (
            <Badge tone="brand">
              <Star className="size-3 fill-current" aria-hidden /> {hotel.rating.toFixed(1)} ({hotel.reviewCount})
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hotel.viewTypes.map((v) => (
            <Badge key={v} tone="blue">
              <Eye className="size-3" aria-hidden /> {VIEW_LABELS[v]}
            </Badge>
          ))}
          {hotel.amenities.slice(0, 3).map((a) => (
            <Badge key={a}>{a}</Badge>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <p className={soldOut ? "text-sm font-medium text-rose-600" : "flex items-center gap-1 text-sm text-emerald-700"}>
            {soldOut ? (
              "No rooms match for these dates"
            ) : (
              <>
                <BedDouble className="size-4" aria-hidden /> {hotel.availableRooms} of {hotel.totalRooms} rooms selectable
                {hotel.bestViewScore !== null && <span className="text-slate-500"> · best view score {hotel.bestViewScore}</span>}
              </>
            )}
          </p>
          {hotel.minPrice !== null && (
            <p className="text-right">
              <span className="text-xs text-slate-500">from </span>
              <span className="text-xl font-bold text-ink">{formatMoney(hotel.minPrice)}</span>
              <span className="text-xs text-slate-500"> / night</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
