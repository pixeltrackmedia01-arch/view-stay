"use client";

import { BedDouble, ChevronDown, Heart, LayoutDashboard, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";

export interface HeaderUser {
  name: string;
  email: string;
  role: "CUSTOMER" | "PARTNER" | "ADMIN";
}

export function useSignOut() {
  const router = useRouter();
  const qc = useQueryClient();
  return async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    router.push("/");
    router.refresh();
  };
}

export function accountLinks(user: HeaderUser) {
  const links = [
    { href: "/account", label: "Account overview", icon: User },
    { href: "/account/bookings", label: "My bookings", icon: BedDouble },
    { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  ];
  if (user.role === "PARTNER") links.unshift({ href: "/partner", label: "Partner dashboard", icon: LayoutDashboard });
  if (user.role === "ADMIN") links.unshift({ href: "/admin", label: "Admin console", icon: Shield });
  return links;
}

export function AccountMenu({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const signOut = useSignOut();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface pr-3 pl-1 text-sm font-medium hover:border-line-strong"
        data-testid="account-menu"
      >
        <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-white">{initials}</span>
        <span className="hidden max-w-32 truncate lg:inline">{user.name.split(" ")[0]}</span>
        <ChevronDown className="size-4 text-ink-3" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface py-1 shadow-[var(--shadow-pop)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-3">{user.email}</p>
          </div>
          {accountLinks(user).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 px-4 text-sm hover:bg-subtle">
              <Icon className="size-4 text-ink-3" aria-hidden />
              {label}
            </Link>
          ))}
          <button type="button" role="menuitem" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 border-t border-line px-4 text-sm hover:bg-subtle">
            <LogOut className="size-4 text-ink-3" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
