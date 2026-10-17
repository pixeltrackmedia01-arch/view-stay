"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";

export const SORTS = [
  ["recommended", "Recommended"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["rating", "Highest rating"],
  ["view", "Best view"],
  ["reviews", "Most reviewed"],
] as const;

export function SortSelect() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm whitespace-nowrap text-ink-2">Sort by</label>
      <Select
        id="sort"
        className="h-10 w-auto"
        value={sp.get("sort") ?? "recommended"}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          p.set("sort", e.target.value);
          p.delete("page");
          router.push(`${pathname}?${p}`, { scroll: false });
        }}
      >
        {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </div>
  );
}
