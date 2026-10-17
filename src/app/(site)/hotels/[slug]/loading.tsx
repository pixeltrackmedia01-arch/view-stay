import { Skeleton } from "@/components/ui/skeleton";

export default function HotelLoading() {
  return (
    <div className="container-page space-y-6 py-8" aria-busy aria-label="Loading property">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-96 max-w-full" />
      <Skeleton className="aspect-[21/9] w-full rounded-[var(--radius-lg)]" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}
