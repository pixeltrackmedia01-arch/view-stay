import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Photo } from "@/components/ui/photo";
import { VIEW_LABELS, type ViewKey } from "@/lib/catalog-types";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

interface GroupBooking {
  code: string;
  status: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  total: number;
  hotel: { name: string; slug: string; destination: { name: string } };
  room: { number: string; viewType: string; floor: { name: string }; roomType: { name: string }; photos: { asset: { path: string } }[] };
  review: { id: string } | null;
}

export function BookingGroupCard({ code, bookings, action }: { code: string; bookings: GroupBooking[]; action?: React.ReactNode }) {
  const b = bookings[0];
  const total = bookings.reduce((s, x) => s + x.total, 0);
  const needsReview = bookings.some((x) => x.status === "COMPLETED" && !x.review);
  return (
    <article className="relative grid gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-3 shadow-[var(--shadow-card)] sm:grid-cols-[180px_minmax(0,1fr)]" data-testid="booking-card" data-code={code}>
      <Photo src={b.room.photos[0]?.asset.path} alt={`Room ${b.room.number}`} ratio="4/3" className="rounded-[var(--radius-md)]" />
      <div className="flex min-w-0 flex-col gap-1.5 py-1 pr-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-ink-3">{b.hotel.destination.name} · {code}</p>
          {needsReview && <Badge tone="accent">Review your stay</Badge>}
        </div>
        <h3 className="font-display text-xl text-ink">
          <Link href={`/bookings/${code}`} className="after:absolute after:inset-0">
            {b.hotel.name}
          </Link>
        </h3>
        <p className="text-sm text-ink-2">
          {bookings.map((x) => `Room ${x.room.number}`).join(", ")} · {b.room.floor.name} · {VIEW_LABELS[b.room.viewType as ViewKey]}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-ink-2">
          <CalendarDays className="size-4" aria-hidden /> {formatDate(b.checkIn)} – {formatDate(b.checkOut)} · {b.nights} night{b.nights > 1 ? "s" : ""}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="font-semibold text-ink">{formatMoney(total)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Details <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
        {action && <div className="relative z-10">{action}</div>}
      </div>
    </article>
  );
}
