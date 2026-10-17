"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function HotelTabs({ id }: { id: string }) {
  const path = usePathname();
  const base = `/partner/hotels/${id}`;
  const tabs = [
    { href: base, label: "Profile" },
    { href: `${base}/rooms`, label: "Rooms & pricing" },
    { href: `${base}/layout`, label: "Floor plans" },
    { href: `${base}/photos`, label: "Room photos" },
    { href: `${base}/calendar`, label: "Availability" },
  ];
  return (
    <nav aria-label="Property sections" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cn("-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-4 text-sm font-medium", active ? "border-primary text-primary" : "border-transparent text-ink-2 hover:text-ink")}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
