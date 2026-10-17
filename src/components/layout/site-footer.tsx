import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  { title: "Explore", links: [["Destinations", "/destinations"], ["Explore stays", "/search"], ["Explore in 3D", "/explore-3d"], ["How it works", "/how-it-works"]] },
  { title: "Your trips", links: [["My bookings", "/account/bookings"], ["Wishlist", "/account/wishlist"], ["Account", "/account"], ["Help & FAQ", "/help"]] },
  { title: "Partners", links: [["List your property", "/partners"], ["Partner dashboard", "/partner"], ["Create a partner account", "/register?type=partner"]] },
  { title: "ViewStay", links: [["About this demo", "/about"], ["Cancellation policies", "/help#cancellation"], ["Terms", "/terms"], ["Privacy", "/privacy"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-primary-dark text-white/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Logo inverse />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/65">Your stay. Your room. Your view. Choose the exact physical room you want, not just a room category.</p>
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/45">Demo marketplace: all 350 properties are fictional, imagery and 3D models are illustrative, and payments are simulated.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-sm font-semibold text-white">{c.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-accent">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap justify-between gap-2 py-5 text-xs text-white/50">
          <p>© {new Date().getFullYear()} ViewStay demo.</p>
          <p>Prices in INR, including applicable taxes at checkout.</p>
        </div>
      </div>
    </footer>
  );
}
