import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, pageCount].filter((p) => p >= 1 && p <= pageCount))).sort((a, b) => a - b);
  const item = "grid min-w-11 h-11 place-items-center rounded-full px-3 text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {page > 1 ? <Link href={href(page - 1)} className={cn(item, "hover:bg-subtle")} aria-label="Previous page"><ChevronLeft className="size-4" /></Link> : <span className={cn(item, "opacity-40")} aria-hidden><ChevronLeft className="size-4" /></span>}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-3">…</span>}
          <Link href={href(p)} aria-current={p === page ? "page" : undefined} className={cn(item, p === page ? "bg-primary text-white" : "hover:bg-subtle")}>{p}</Link>
        </span>
      ))}
      {page < pageCount ? <Link href={href(page + 1)} className={cn(item, "hover:bg-subtle")} aria-label="Next page"><ChevronRight className="size-4" /></Link> : <span className={cn(item, "opacity-40")} aria-hidden><ChevronRight className="size-4" /></span>}
    </nav>
  );
}
