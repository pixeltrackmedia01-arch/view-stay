import Link from "next/link";
import { BedDouble } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { LogoutButton } from "./logout-button";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <BedDouble className="size-5" aria-hidden />
          </span>
          ViewStay
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/search" className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>
            Explore
          </Link>
          {user ? (
            <>
              {user.role === "CUSTOMER" && (
                <>
                  <Link href="/account" className={buttonClass("ghost", "sm")}>My bookings</Link>
                  <Link href="/account/wishlist" className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>Wishlist</Link>
                </>
              )}
              {user.role === "PARTNER" && <Link href="/partner" className={buttonClass("ghost", "sm")}>Partner dashboard</Link>}
              {user.role === "ADMIN" && <Link href="/admin" className={buttonClass("ghost", "sm")}>Admin</Link>}
              <span className="hidden px-2 text-slate-500 md:inline" data-testid="current-user">
                {user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "sm")}>Sign in</Link>
              <Link href="/register" className={buttonClass("primary", "sm")}>Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
