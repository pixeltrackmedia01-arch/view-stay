"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sidebar / scrollable tab nav shared by the partner and admin consoles. */
export function ConsoleNav({ title, links }: { title: string; links: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav aria-label={title} className="space-y-3">
      <p className="hidden text-xs font-semibold tracking-wide text-ink-3 uppercase lg:block">{title}</p>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-medium", active ? "bg-primary text-white" : "text-ink-2 hover:bg-subtle hover:text-ink")}>
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
