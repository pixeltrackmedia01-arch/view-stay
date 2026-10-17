"use client";

import { Menu, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { buttonClass } from "@/components/ui/button";
import { NAV_LINKS } from "./nav-links";
import { accountLinks, useSignOut, type HeaderUser } from "./account-menu";

export function MobileMenu({ user }: { user: HeaderUser | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const signOut = useSignOut();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full text-ink hover:bg-subtle md:hidden" aria-label="Open menu" aria-expanded={open}>
        <Menu className="size-6" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Menu" variant="right" width={360}>
        <nav aria-label="Mobile" className="flex flex-col">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] px-2 text-base font-medium hover:bg-subtle">
              <Icon className="size-5 text-secondary" aria-hidden /> {label}
            </Link>
          ))}
          <hr className="my-3 border-line" />
          {user ? (
            <>
              {accountLinks(user).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] px-2 text-base hover:bg-subtle">
                  <Icon className="size-5 text-ink-3" aria-hidden /> {label}
                </Link>
              ))}
              <button type="button" onClick={signOut} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] px-2 text-left text-base hover:bg-subtle">
                <LogOut className="size-5 text-ink-3" aria-hidden /> Sign out
              </button>
            </>
          ) : (
            <div className="grid gap-2">
              <Link href="/login" className={buttonClass("secondary", "lg")}>Sign in</Link>
              <Link href="/register" className={buttonClass("primary", "lg")}>Create account</Link>
            </div>
          )}
        </nav>
      </Dialog>
    </>
  );
}
