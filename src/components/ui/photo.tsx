"use client";

import { ImageOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Image with a fixed aspect ratio (no layout shift), shimmer placeholder while loading, a graceful fallback
 * when the file fails, and an optional "Illustrative" label for generated artwork.
 */
export function Photo({
  src,
  alt,
  ratio = "4/3",
  className,
  imgClassName,
  priority,
  illustrative,
  sizes,
}: {
  src: string | null | undefined;
  alt: string;
  ratio?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  illustrative?: boolean;
  sizes?: string;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");
  const img = useRef<HTMLImageElement>(null);
  // The image may finish loading before hydration attaches onLoad; check once mounted.
  useEffect(() => {
    const el = img.current;
    if (!src) return setState("error");
    if (el?.complete) setState(el.naturalWidth > 0 ? "loaded" : "error");
    else setState("loading");
  }, [src]);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={{ aspectRatio: ratio }}>
      {state === "loading" && <div className="skeleton absolute inset-0" aria-hidden />}
      {state === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-subtle text-ink-3" role="img" aria-label={`${alt} (image unavailable)`}>
          <div className="flex flex-col items-center gap-1 text-xs">
            <ImageOff className="size-6" aria-hidden />
            Image unavailable
          </div>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- library assets are lightweight SVG; next/image adds no value here
        <img
          src={src!}
          alt={alt}
          width={1600}
          height={1000}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          ref={img}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", state === "loaded" ? "opacity-100" : "opacity-0", imgClassName)}
        />
      )}
      {illustrative && state !== "error" && (
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">Illustrative</span>
      )}
    </div>
  );
}
