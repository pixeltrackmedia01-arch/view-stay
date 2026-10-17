"use client";

import { Grid3x3, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/gallery/lightbox";
import { Dialog } from "@/components/ui/dialog";
import { Photo } from "@/components/ui/photo";
import { Tabs } from "@/components/ui/tabs";

export interface GalleryPhoto extends LightboxImage {
  category: string;
}

/** Property photo mosaic with a categorised lightbox. Categories only appear when they contain photos. */
export function HotelGallery({ name, photos }: { name: string; photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("ALL");
  const [index, setIndex] = useState(0);
  const categories = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    for (const p of photos) m.set(p.category, { label: p.label ?? p.category, count: (m.get(p.category)?.count ?? 0) + 1 });
    return [...m.entries()].map(([id, v]) => ({ id, label: v.label, badge: v.count }));
  }, [photos]);
  const shown = category === "ALL" ? photos : photos.filter((p) => p.category === category);
  const openAt = (i: number) => {
    setCategory("ALL");
    setIndex(i);
    setOpen(true);
  };

  if (!photos.length) {
    return <Photo src={null} alt={`${name} (no photos yet)`} ratio="21/9" className="rounded-[var(--radius-lg)]" />;
  }
  const [hero, ...rest] = photos;
  return (
    <>
      <div className="relative grid gap-2 overflow-hidden rounded-[var(--radius-lg)] sm:grid-cols-4 sm:grid-rows-2" data-testid="hotel-gallery">
        <button type="button" onClick={() => openAt(0)} className="sm:col-span-2 sm:row-span-2" aria-label={`Open photo 1 of ${photos.length}: ${hero.alt}`}>
          <Photo src={hero.path} alt={hero.alt} ratio="16/10" priority illustrative={hero.illustrative} className="size-full" />
        </button>
        {rest.slice(0, 4).map((p, i) => (
          <button key={p.id} type="button" onClick={() => openAt(i + 1)} className="hidden sm:block" aria-label={`Open photo ${i + 2} of ${photos.length}: ${p.alt}`}>
            <Photo src={p.path} alt={p.alt} ratio="16/10" className="size-full" />
          </button>
        ))}
        <button type="button" onClick={() => openAt(0)} className="absolute right-3 bottom-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/95 px-4 text-sm font-medium text-ink shadow-sm hover:bg-white">
          <Grid3x3 className="size-4" aria-hidden /> Show all {photos.length} photos
        </button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${name} · photos`} width={1100} variant="bottom">
        <div className="space-y-4">
          {categories.length > 1 && (
            <Tabs
              idPrefix="hotel-photos"
              label="Photo categories"
              value={category}
              onChange={(c) => {
                setCategory(c);
                setIndex(0);
              }}
              tabs={[{ id: "ALL", label: "All", badge: photos.length }, ...categories]}
            />
          )}
          <div role="tabpanel" id={`hotel-photos-panel-${category}`}>
            <Lightbox images={shown} index={Math.min(index, shown.length - 1)} onIndex={setIndex} />
          </div>
          <p className="flex items-start gap-2 text-xs text-ink-3">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Illustrative images generated for this demo property. They are not photographs of a real hotel.
          </p>
        </div>
      </Dialog>
    </>
  );
}
