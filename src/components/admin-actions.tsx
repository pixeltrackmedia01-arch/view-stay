"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";

export function HotelStatusActions({ hotelId, status }: { hotelId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = async (next: string) => {
    setBusy(next);
    setError(null);
    try {
      await api(`/api/admin/hotels/${hotelId}`, { method: "PATCH", body: { status: next } });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "APPROVED" && <Button size="sm" loading={busy === "APPROVED"} onClick={() => set("APPROVED")} data-testid={`approve-${hotelId}`}>Approve</Button>}
      {status !== "SUSPENDED" && <Button size="sm" variant="outlineDanger" loading={busy === "SUSPENDED"} onClick={() => set("SUSPENDED")}>Suspend</Button>}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}

export function UserActiveToggle({ userId, isActive, disabled }: { userId: string; isActive: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant={isActive ? "outlineDanger" : "secondary"}
      disabled={disabled}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/admin/users/${userId}`, { method: "PATCH", body: { isActive: !isActive } });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
