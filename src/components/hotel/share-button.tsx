"use client";

import { Share2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ShareButton({ title }: { title: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        const url = location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            toast({ tone: "success", title: "Link copied", body: "Share it with your travel companions." });
          }
        } catch (e) {
          if ((e as Error).name !== "AbortError") toast({ tone: "danger", title: "Couldn't share this page" });
        }
      }}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-line-strong"
    >
      <Share2 className="size-4" aria-hidden /> Share
    </button>
  );
}
