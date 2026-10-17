import { Star } from "lucide-react";

export function Stars({ count, className = "size-3.5" }: { count: number; className?: string }) {
  return (
    <span className="inline-flex" aria-label={`${count} star`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} className={`${className} fill-amber-400 text-amber-400`} aria-hidden />
      ))}
    </span>
  );
}
