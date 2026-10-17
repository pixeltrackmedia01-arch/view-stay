import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "ViewStay — Your stay. Your room. Your view.", template: "%s · ViewStay" },
  description: "Discover beautiful stays, explore the property in 3D, and book the exact physical room that feels right for you.",
};

export const viewport: Viewport = { themeColor: "#173f4f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-dvh flex-col antialiased">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-[var(--radius-sm)] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-pop)]">
            Skip to content
          </a>
          {children}
        </Providers>
      </body>
    </html>
  );
}
