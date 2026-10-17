"use client";

import { Box, CornerUpRight, Images, Maximize, Wind } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RoomGalleryDialog } from "@/components/gallery/room-gallery";
import { buttonClass } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { VIEW_LABELS, type ViewKey } from "@/lib/catalog-types";
import { VIEW_ICONS } from "@/lib/icons";
import { formatMoney } from "@/lib/money";
import type { ShowcaseRoom } from "@/server/home";

export function RoomShowcaseCard({ room, query }: { room: ShowcaseRoom; query: string }) {
  const [open, setOpen] = useState(false);
  const ViewIcon = VIEW_ICONS[room.viewType as ViewKey];
  const roomQuery = `${query}${query ? "&" : ""}room=${room.id}`;
  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-card)]" data-testid="showcase-room">
      <button type="button" onClick={() => setOpen(true)} className="group relative block text-left" aria-label={`View photos of room ${room.number} at ${room.hotel.name}`}>
        <Photo src={room.photo?.path} alt={room.photo?.alt ?? `Room ${room.number}`} ratio="4/3" illustrative imgClassName="transition-transform duration-500 group-hover:scale-[1.03]" />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary shadow">
          <Images className="size-3.5" aria-hidden /> View photos
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{room.hotel.name} · {room.hotel.city}</p>
        <h3 className="font-display text-xl font-semibold">
          Room {room.number} <span className="font-sans text-sm font-normal text-ink-2">· {room.floorName}</span>
        </h3>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-2">
          <li className="inline-flex items-center gap-1"><ViewIcon className="size-3.5 text-secondary" aria-hidden />{VIEW_LABELS[room.viewType as ViewKey]}</li>
          {room.hasBalcony && <li className="inline-flex items-center gap-1"><Wind className="size-3.5 text-secondary" aria-hidden />Balcony</li>}
          {room.isCorner && <li className="inline-flex items-center gap-1"><CornerUpRight className="size-3.5 text-secondary" aria-hidden />Corner</li>}
          <li className="inline-flex items-center gap-1"><Maximize className="size-3.5 text-secondary" aria-hidden />{room.sizeSqm} m²</li>
        </ul>
        <p className="mt-auto pt-2">
          <span className="text-lg font-semibold">{formatMoney(room.nightly)}</span> <span className="text-xs text-ink-3">/ night · {formatMoney(room.stayTotal)} total incl. taxes</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/hotels/${room.hotel.slug}/explore?${roomQuery}&mode=3d`} className={buttonClass("secondary", "sm")}>
            <Box className="size-4" aria-hidden /> Explore in 3D
          </Link>
          <Link href={`/hotels/${room.hotel.slug}?${roomQuery}#rooms`} className={buttonClass("primary", "sm")}>Select room</Link>
        </div>
      </div>
      <RoomGalleryDialog roomId={room.id} open={open} onClose={() => setOpen(false)} />
    </article>
  );
}
