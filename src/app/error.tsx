"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

/** Friendly error boundary: never shows stack traces; offers a retry. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-md space-y-4">
        <AlertTriangle className="mx-auto size-10 text-warning" aria-hidden />
        <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
        <p className="text-ink-2">We couldn&apos;t load this page. Your bookings and holds are safe. Please try again.</p>
        {error.digest && <p className="text-xs text-ink-3">Reference: {error.digest}</p>}
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <LinkButton href="/" variant="secondary">Go home</LinkButton>
        </div>
      </div>
    </main>
  );
}
