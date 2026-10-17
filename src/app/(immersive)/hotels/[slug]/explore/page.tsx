import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoomExplorer } from "@/components/explorer/room-explorer";
import type { ExplorerMode } from "@/components/explorer/store";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { parseSearch, type RawParams } from "@/lib/search-params";
import { getExplorerData, getHotelBySlug } from "@/server/hotels";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const hotel = await getHotelBySlug((await params).slug);
    return { title: `Explore ${hotel.name} in 3D` };
  } catch {
    return { title: "Explore" };
  }
}

/** Fullscreen room explorer: 3D model, floor plan and room list side by side with the selected room. */
export default async function ExplorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const user = await getCurrentUser();
  const hotel = await getHotelBySlug(slug, user).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const { params: p, stay, filters } = parseSearch(raw);
  const data = await getExplorerData(hotel.id, p.checkIn, p.checkOut, p.guests, filters.rooms, user?.id);
  const mode = (["3d", "plan", "list"] as const).includes(raw.view as ExplorerMode) ? (raw.view as ExplorerMode) : "3d";
  const back = `/hotels/${hotel.slug}?${new URLSearchParams({ checkIn: stay.checkIn, checkOut: stay.checkOut, guests: String(p.guests), rooms: String(filters.rooms) })}`;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex flex-wrap items-center gap-3 bg-primary-dark px-4 py-3 text-white">
        <Link href={back} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium hover:bg-white/10">
          <ArrowLeft className="size-4" aria-hidden /> Back to property
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold">{hotel.name}</h1>
          <p className="text-xs text-white/70">
            {hotel.destination.name} · {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)} · {p.guests} guest{p.guests > 1 ? "s" : ""}
          </p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <RoomExplorer data={data} initialMode={mode} initialRoomId={typeof raw.room === "string" ? raw.room : null} variant="immersive" />
      </div>
    </div>
  );
}
