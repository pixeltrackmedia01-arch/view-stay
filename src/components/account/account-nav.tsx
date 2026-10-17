"use client";

import { BedDouble, Heart, KeyRound, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutGrid },
  { href: "/account/bookings", label: "My bookings", icon: BedDouble },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/profile", label: "Profile & security", icon: KeyRound },
];

export function AccountNav({ name }: { name: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="space-y-3">
      <p className="hidden font-display text-lg text-ink lg:block">Hi, {name.split(" ")[0]}</p>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/account" ? path === href : path.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-medium", active ? "bg-primary text-white" : "text-ink-2 hover:bg-subtle hover:text-ink")}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
