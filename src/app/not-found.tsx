import { Compass } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-md space-y-4">
        <Compass className="mx-auto size-10 text-secondary" aria-hidden />
        <h1 className="font-display text-3xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="text-ink-2">The link may be out of date, or the property may no longer be listed.</p>
        <div className="flex justify-center gap-3">
          <LinkButton href="/">Go home</LinkButton>
          <LinkButton href="/search" variant="secondary">Explore stays</LinkButton>
        </div>
      </div>
    </main>
  );
}
