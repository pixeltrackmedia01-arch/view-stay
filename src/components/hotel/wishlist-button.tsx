"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export function WishlistButton({ hotelId, hotelName, initial, signedIn, variant = "pill" }: { hotelId: string; hotelName: string; initial: boolean; signedIn: boolean; variant?: "pill" | "floating" }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      await api(`/api/wishlist/${hotelId}`, { method: next ? "POST" : "DELETE" });
      toast({ tone: "success", title: next ? "Saved to your wishlist" : "Removed from your wishlist", body: hotelName });
      router.refresh();
    } catch (err) {
      setSaved(!next);
      toast({ tone: "danger", title: "Couldn't update your wishlist", body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const label = saved ? `Remove ${hotelName} from wishlist` : `Save ${hotelName} to wishlist`;
  if (variant === "floating")
    return (
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={label} className="grid size-11 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white">
        <Heart className={cn("size-5", saved && "fill-danger text-danger")} aria-hidden />
      </button>
    );
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={label} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-line-strong">
      <Heart className={cn("size-4", saved && "fill-danger text-danger")} aria-hidden />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
