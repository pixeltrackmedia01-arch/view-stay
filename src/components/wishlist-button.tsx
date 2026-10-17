"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export function WishlistButton({ hotelId, initial, signedIn }: { hotelId: string; initial: boolean; signedIn: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-pressed={saved}
      loading={busy}
      onClick={async () => {
        if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        setBusy(true);
        try {
          const res = await api<{ saved: boolean }>(`/api/wishlist/${hotelId}`, { method: saved ? "DELETE" : "POST" });
          setSaved(res.saved);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} aria-hidden />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
