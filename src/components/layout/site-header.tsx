import { BedDouble, Heart } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { AccountMenu } from "./account-menu";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NAV_LINKS } from "./nav-links";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const headerUser = user ? { name: user.name, email: user.email, role: user.role } : null;
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" aria-label="ViewStay home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV_LINKS.slice(0, 3).map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:bg-subtle hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {(!user || user.role === "CUSTOMER") && (
            <>
              <Link href="/account/wishlist" className={buttonClass("ghost", "sm", "hidden rounded-full sm:inline-flex")}>
                <Heart className="size-4" aria-hidden /> Wishlist
              </Link>
              <Link href="/account/bookings" className={buttonClass("ghost", "sm", "hidden rounded-full lg:inline-flex")}>
                <BedDouble className="size-4" aria-hidden /> My bookings
              </Link>
            </>
          )}
          {headerUser ? (
            <span className="hidden md:block">
              <AccountMenu user={headerUser} />
            </span>
          ) : (
            <span className="hidden items-center gap-2 md:flex">
              <Link href="/login" className={buttonClass("ghost", "sm", "rounded-full")}>Sign in</Link>
              <Link href="/register" className={buttonClass("primary", "sm", "rounded-full")}>Create account</Link>
            </span>
          )}
          <MobileMenu user={headerUser} />
        </div>
      </div>
    </header>
  );
}
