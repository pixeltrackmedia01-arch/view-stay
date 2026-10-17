"use client";

import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Photo } from "@/components/ui/photo";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  id: string;
  path: string;
  alt: string;
  caption?: string | null;
  label?: string;
  illustrative?: boolean;
}

/** Image viewer: main image, prev/next, counter, swipe, arrow keys, thumbnails, true fullscreen. */
export function Lightbox({ images, index, onIndex, className }: { images: LightboxImage[]; index: number; onIndex: (i: number) => void; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const [full, setFull] = useState(false);
  const n = images.length;
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else return;
      e.preventDefault();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    thumbs.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  if (!n) return null;
  const img = images[Math.min(index, n - 1)];
  return (
    <div
      ref={wrap}
      tabIndex={-1}
      className={cn("flex flex-col gap-3 outline-none", full && "bg-black p-4", className)}
      aria-roledescription="carousel"
      aria-label="Photo gallery"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <figure className="relative" aria-roledescription="slide" aria-label={`${index + 1} of ${n}`}>
        <Photo key={img.id} src={img.path} alt={img.alt} ratio="16/10" className={cn("rounded-[var(--radius-md)]", full && "mx-auto max-h-[80vh]")} illustrative={img.illustrative} priority />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white" aria-live="polite" data-testid="gallery-counter">
            {index + 1} / {n}
          </span>
          <button
            type="button"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen?.())}
            className="grid size-10 place-items-center rounded-full bg-black/55 text-white hover:bg-black/70"
            aria-label={full ? "Exit full screen" : "View full screen"}
          >
            {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white" data-testid="gallery-prev">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white" data-testid="gallery-next">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
        <figcaption className={cn("mt-2 text-sm", full ? "text-white/80" : "text-ink-2")}>
          {img.label && <span className="mr-2 font-semibold text-ink">{img.label}</span>}
          {img.caption ?? img.alt}
        </figcaption>
      </figure>
      {n > 1 && (
        <div ref={thumbs} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Thumbnails">
          {images.map((t, i) => (
            <button
              key={t.id}
              type="button"
              data-i={i}
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}: ${t.label ?? t.alt}`}
              onClick={() => onIndex(i)}
              className={cn("relative w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] ring-2 transition sm:w-28", i === index ? "ring-accent" : "opacity-75 ring-transparent hover:opacity-100")}
            >
              <Photo src={t.path} alt="" ratio="16/10" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
