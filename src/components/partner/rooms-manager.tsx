"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { VIEW_KEYS, VIEW_LABELS, type ViewKey } from "@/lib/catalog-types";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";

export interface ManagedRoomType { id: string; name: string; category: string; basePrice: number; rooms: number }
export interface ManagedRoom {
  id: string; number: string; level: number; floor: string; roomTypeId: string; roomType: string; status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  priceAdjustment: number; viewType: ViewKey; viewScore: number; viewVerified: boolean; bedType: string; accessible: boolean; nearElevator: boolean; notes: string | null; sizeSqm: number; hasBalcony: boolean;
}

export function RoomTypePrices({ types }: { types: ManagedRoomType[] }) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(types.map((t) => [t.id, String(t.basePrice / 100)])));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader><CardTitle as="h2">Base prices</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {error && <Alert>{error}</Alert>}
        <ul className="divide-y divide-line">
          {types.map((t) => {
            const changed = Math.round(Number(draft[t.id]) * 100) !== t.basePrice;
            return (
              <li key={t.id} className="flex flex-wrap items-end gap-3 py-3">
                <div className="min-w-40 flex-1"><p className="font-medium text-ink">{t.name}</p><p className="text-sm text-ink-3">{t.rooms} rooms · now {formatMoney(t.basePrice)}</p></div>
                <label className="space-y-1 text-sm"><span className="text-ink-2">Per night (₹)</span>
                  <Input type="number" min={500} step={100} value={draft[t.id]} onChange={(e) => setDraft({ ...draft, [t.id]: e.target.value })} className="w-36" aria-label={`${t.name} price per night in rupees`} />
                </label>
                <Button size="sm" disabled={!changed} loading={busy === t.id} onClick={async () => {
                  setBusy(t.id); setError(null);
                  try {
                    await api(`/api/partner/room-types/${t.id}`, { method: "PATCH", body: { basePrice: Math.round(Number(draft[t.id]) * 100) } });
                    toast({ tone: "success", title: `${t.name} price updated` });
                    router.refresh();
                  } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
                }}>Save</Button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-ink-3">Each room&apos;s price is the base price plus its own adjustment. Customers mid-checkout are protected: if the total changes they must confirm the new price before paying.</p>
      </CardContent>
    </Card>
  );
}

export function RoomsTable({ rooms, types }: { rooms: ManagedRoom[]; types: ManagedRoomType[] }) {
  const [editing, setEditing] = useState<ManagedRoom | null>(null);
  const base = new Map(types.map((t) => [t.id, t.basePrice]));
  return (
    <Card>
      <CardHeader><CardTitle as="h2">Rooms</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-ink-2"><tr><th className="py-2 font-medium">Room</th><th className="font-medium">Type</th><th className="font-medium">View</th><th className="font-medium">Status</th><th className="text-right font-medium">Nightly</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {rooms.map((r) => (
                <tr key={r.id} data-room-number={r.number}>
                  <td className="py-2"><span className="font-medium text-ink">{r.number}</span><span className="block text-xs text-ink-3">{r.floor} · {r.sizeSqm} m²</span></td>
                  <td>{r.roomType}</td>
                  <td>{VIEW_LABELS[r.viewType]} <span className="text-ink-3">({r.viewScore})</span>{r.viewVerified && <Badge tone="info" className="ml-1">verified</Badge>}</td>
                  <td><Badge tone={r.status === "ACTIVE" ? "success" : r.status === "MAINTENANCE" ? "warning" : "neutral"}>{r.status.toLowerCase()}</Badge></td>
                  <td className="text-right">{formatMoney((base.get(r.roomTypeId) ?? 0) + r.priceAdjustment)}{r.priceAdjustment !== 0 && <span className="block text-xs text-ink-3">{r.priceAdjustment > 0 ? "+" : "−"}{formatMoney(Math.abs(r.priceAdjustment))}</span>}</td>
                  <td className="text-right"><Button size="sm" variant="ghost" onClick={() => setEditing(r)} aria-label={`Edit room ${r.number}`}><Pencil className="size-4" aria-hidden /> Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      {editing && <RoomEditDialog room={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function RoomEditDialog({ room, onClose }: { room: ManagedRoom; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ ...room, priceAdjustment: room.priceAdjustment / 100, notes: room.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setError(null);
    try {
      await api(`/api/partner/rooms/${room.id}`, { method: "PATCH", body: {
        status: v.status, priceAdjustment: Math.round(Number(v.priceAdjustment) * 100), viewType: v.viewType, viewScore: Number(v.viewScore), viewVerified: v.viewVerified,
        bedType: v.bedType, accessible: v.accessible, nearElevator: v.nearElevator, notes: v.notes || null,
      } });
      toast({ tone: "success", title: `Room ${room.number} saved` });
      onClose();
      router.refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={`Edit room ${room.number}`} width={620} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save room</Button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {error && <Alert className="sm:col-span-2">{error}</Alert>}
        <Field label="Status" htmlFor="re-status"><Select id="re-status" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as ManagedRoom["status"] })}><option value="ACTIVE">Active</option><option value="MAINTENANCE">Maintenance (not bookable)</option><option value="INACTIVE">Inactive (hidden)</option></Select></Field>
        <Field label="Price adjustment (₹ per night)" htmlFor="re-adj" hint="Negative for a discount"><Input id="re-adj" type="number" step={100} value={v.priceAdjustment} onChange={(e) => setV({ ...v, priceAdjustment: Number(e.target.value) })} /></Field>
        <Field label="View" htmlFor="re-view"><Select id="re-view" value={v.viewType} onChange={(e) => setV({ ...v, viewType: e.target.value as ViewKey })}>{VIEW_KEYS.map((k) => <option key={k} value={k}>{VIEW_LABELS[k]}</option>)}</Select></Field>
        <Field label="View score (0–100)" htmlFor="re-score"><Input id="re-score" type="number" min={0} max={100} value={v.viewScore} onChange={(e) => setV({ ...v, viewScore: Number(e.target.value) })} /></Field>
        <Field label="Bed" htmlFor="re-bed"><Select id="re-bed" value={v.bedType} onChange={(e) => setV({ ...v, bedType: e.target.value })}>{["Queen", "Twin", "King", "King + Sofa bed"].map((b) => <option key={b}>{b}</option>)}</Select></Field>
        <div className="space-y-2 pt-6">
          <Checkbox label="View verified by the property" checked={v.viewVerified} onChange={(e) => setV({ ...v, viewVerified: e.target.checked })} />
          <Checkbox label="Step-free access" checked={v.accessible} onChange={(e) => setV({ ...v, accessible: e.target.checked })} />
          <Checkbox label="Near the lift" checked={v.nearElevator} onChange={(e) => setV({ ...v, nearElevator: e.target.checked })} />
        </div>
        <Field label="Notes shown to guests" htmlFor="re-notes" className="sm:col-span-2"><Textarea id="re-notes" rows={3} maxLength={300} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
        <p className="text-xs text-ink-3 sm:col-span-2">Changing the view regenerates this room&apos;s illustrative photos. Your uploaded photos are kept. Position, windows and balcony are edited in Floor plans.</p>
      </div>
    </Dialog>
  );
}
