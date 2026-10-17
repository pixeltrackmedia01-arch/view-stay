"use client";

import { Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function BlockForm({ rooms, defaultStart, defaultEnd }: { rooms: { id: string; number: string }[]; defaultStart: string; defaultEnd: string }) {
  const router = useRouter();
  const toast = useToast();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [startDate, setStart] = useState(defaultStart);
  const [endDate, setEnd] = useState(defaultEnd);
  const [reason, setReason] = useState("Maintenance");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4"
      aria-label="Close a room for dates"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setError(null);
        try {
          await api(`/api/partner/rooms/${roomId}/blocks`, { body: { startDate, endDate, reason } });
          toast({ tone: "success", title: "Room closed for those dates" });
          router.refresh();
        } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
      }}
    >
      <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">Room</span><Select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-32">{rooms.map((r) => <option key={r.id} value={r.id}>{r.number}</option>)}</Select></label>
      <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">From</span><Input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} /></label>
      <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">Until (exclusive)</span><Input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} /></label>
      <label className="space-y-1 text-sm"><span className="font-medium text-ink-2">Reason</span><Input value={reason} onChange={(e) => setReason(e.target.value)} className="w-48" /></label>
      <Button type="submit" variant="secondary" loading={busy}><Lock className="size-4" aria-hidden /> Close room</Button>
      {error && <Alert className="w-full">{error}</Alert>}
    </form>
  );
}

export function RemoveBlockButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="ghost" loading={busy} aria-label={`Reopen: ${label}`} onClick={async () => { setBusy(true); await api(`/api/partner/blocks/${id}`, { method: "DELETE" }).catch(() => undefined); router.refresh(); }}>
      <Trash2 className="size-4" aria-hidden /> Reopen
    </Button>
  );
}
