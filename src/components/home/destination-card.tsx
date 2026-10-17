import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Photo } from "@/components/ui/photo";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface DestinationCardData {
  slug: string;
  name: string;
  state: string;
  tagline: string;
  hero: { path: string; alt: string } | null;
  minPrice: number | null;
  hotels: number;
}

export function DestinationCard({ d, size = "md", priority }: { d: DestinationCardData; size?: "lg" | "md" | "sm"; priority?: boolean }) {
  return (
    <Link href={`/destinations/${d.slug}`} className={cn("group relative block overflow-hidden rounded-[var(--radius-lg)] bg-primary-dark text-white shadow-[var(--shadow-card)]", size === "lg" ? "min-h-[420px]" : size === "md" ? "min-h-[260px]" : "min-h-[220px]")} data-testid="destination-card">
      <Photo src={d.hero?.path} alt={d.hero?.alt ?? d.name} ratio="auto" className="!absolute inset-0 size-full" imgClassName="transition-transform duration-700 group-hover:scale-105" priority={priority} />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/30 to-transparent" aria-hidden />
      <div className="relative flex h-full min-h-[inherit] flex-col justify-end p-5">
        <p className="text-xs font-medium tracking-wider text-white/75 uppercase">{d.state}</p>
        <h3 className={cn("font-display font-semibold", size === "lg" ? "text-4xl" : "text-2xl")}>{d.name}</h3>
        <p className={cn("mt-1 text-sm text-white/80", size === "sm" && "line-clamp-2")}>{d.tagline}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <span>
            {d.minPrice !== null ? (
              <>
                From <strong className="font-semibold">{formatMoney(d.minPrice)}</strong> <span className="text-white/70">/ night</span>
              </>
            ) : (
              <span className="text-white/70">No rooms listed yet</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-accent">
            Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
