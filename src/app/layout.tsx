import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { default: "ViewStay — Choose your room, not just your room category", template: "%s · ViewStay" },
  description: "Book the exact hotel room you want: pick it on a floor map by view, floor, balcony and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500">
              <p>© {new Date().getFullYear()} ViewStay. Choose your room, not just your room category.</p>
              <p className="flex gap-4">
                <Link href="/search" className="hover:text-ink">Explore</Link>
                <Link href="/register?type=partner" className="hover:text-ink">List your property</Link>
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
