import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function ratingWord(r: number) {
  return r >= 4.6 ? "Exceptional" : r >= 4.3 ? "Excellent" : r >= 4 ? "Very good" : r >= 3.5 ? "Good" : "Pleasant";
}

export function RatingBadge({ rating, count, className, size = "md" }: { rating: number | null; count: number; className?: string; size?: "sm" | "md" }) {
  if (rating === null || count === 0) return <span className={cn("text-xs text-ink-3", className)}>New listing</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("inline-flex items-center gap-1 rounded-[6px] bg-primary font-semibold text-white", size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-sm")}>
        <Star className="size-3 fill-current" aria-hidden />
        {rating.toFixed(1)}
      </span>
      <span className={cn("text-ink-2", size === "sm" ? "text-xs" : "text-sm")}>
        <span className="font-medium text-ink">{ratingWord(rating)}</span> · {count} review{count === 1 ? "" : "s"}
      </span>
    </span>
  );
}

export function Stars({ count, className = "size-3.5" }: { count: number; className?: string }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${count}-star property`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} className={cn(className, "fill-accent text-accent")} aria-hidden />
      ))}
    </span>
  );
}
