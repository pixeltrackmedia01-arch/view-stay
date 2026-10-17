"use client";

import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/client";
import type { RoomPhotoDTO } from "@/lib/explorer-types";
import { Lightbox } from "./lightbox";

interface RoomPhotosResponse {
  room: { id: string; number: string; floor: string; level: number; roomType: string; hotelName: string; viewType: string };
  photos: RoomPhotoDTO[];
  categories: { key: string; label: string; count: number }[];
}

export function useRoomPhotos(roomId: string | null) {
  return useQuery({
    queryKey: ["room-photos", roomId],
    queryFn: () => api<RoomPhotosResponse>(`/api/rooms/${roomId}/photos`),
    enabled: !!roomId,
    staleTime: 5 * 60_000,
  });
}

/** Photo gallery for one physical room, loaded from the room-photo API. Categories appear only when populated. */
export function RoomGalleryDialog({ roomId, open, onClose, startCategory, footer }: { roomId: string | null; open: boolean; onClose: () => void; startCategory?: string; footer?: React.ReactNode }) {
  const { data, error, isLoading, refetch } = useRoomPhotos(open ? roomId : null);
  const [category, setCategory] = useState<string>("ALL");
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (open) {
      setCategory(startCategory ?? "ALL");
      setIndex(0);
    }
  }, [open, roomId, startCategory]);
  const photos = useMemo(() => (data ? (category === "ALL" ? data.photos : data.photos.filter((p) => p.category === category)) : []), [data, category]);
  const title = data ? `Room ${data.room.number} · ${data.room.floor}` : "Room photos";
  return (
    <Dialog open={open} onClose={onClose} title={title} description={data ? `${data.room.roomType} at ${data.room.hotelName}` : undefined} width={1040} variant="bottom" footer={footer}>
      {isLoading && (
        <div className="space-y-3" aria-busy>
          <Skeleton className="aspect-[16/10] w-full rounded-[var(--radius-md)]" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-28" />
            ))}
          </div>
        </div>
      )}
      {error && (
        <Alert title="We couldn't load these photos" action={<Button size="sm" variant="secondary" onClick={() => refetch()}>Try again</Button>}>
          {(error as Error).message}
        </Alert>
      )}
      {data && data.photos.length === 0 && <Alert tone="info" title="No photographs uploaded for this room yet">You can still review its floor, view, size and features before booking.</Alert>}
      {data && data.photos.length > 0 && (
        <div className="space-y-4" data-testid="room-gallery" data-room-number={data.room.number}>
          {data.categories.length > 1 && (
            <Tabs
              idPrefix="room-photos"
              label="Photo categories"
              value={category}
              onChange={(c) => {
                setCategory(c);
                setIndex(0);
              }}
              tabs={[{ id: "ALL", label: "All", badge: data.photos.length }, ...data.categories.map((c) => ({ id: c.key, label: c.label, badge: c.count }))]}
            />
          )}
          <div id={`room-photos-panel-${category}`} role="tabpanel">
            <Lightbox images={photos.map((p) => ({ id: p.id, path: p.path, alt: p.alt, caption: p.caption, label: p.categoryLabel, illustrative: p.illustrative }))} index={index} onIndex={setIndex} />
          </div>
          {data.photos.some((p) => p.illustrative) && (
            <p className="flex items-start gap-2 text-xs text-ink-3">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Illustrative images represent this room&apos;s category, interior style, view type and features. They are not verified photographs of room {data.room.number} or its exact outlook.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
