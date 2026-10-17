import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-[var(--radius-sm)]", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface" aria-hidden>
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
