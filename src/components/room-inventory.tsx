"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { api } from "@/lib/client";
import { VIEW_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { VIEW_TYPES } from "@/lib/validation";
import { cn } from "@/lib/utils";

export interface InventoryRoom {
  id: string;
  number: string;
  floorName: string;
  roomTypeName: string;
  basePrice: number;
  priceAdjustment: number;
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  viewType: string;
  viewScore: number;
  viewVerified: boolean;
  hasBalcony: boolean;
  isCorner: boolean;
  accessible: boolean;
  windowCount: number;
  notes: string | null;
  occupiedTonight: boolean;
  blocks: { id: string; startDate: string; endDate: string; reason: string }[];
}

export function RoomInventory({ rooms }: { rooms: InventoryRoom[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const floors = [...new Set(rooms.map((r) => r.floorName))];
  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <section key={floor}>
          <h3 className="mb-2 text-sm font-semibold text-slate-600">{floor}</h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rooms.filter((r) => r.floorName === floor).map((r) => (
              <li key={r.id} data-testid={`inventory-${r.number}`}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left text-sm hover:bg-slate-50"
                  aria-expanded={open === r.id}
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                >
                  <span className="w-14 font-bold">{r.number}</span>
                  <span className="min-w-28 text-slate-600">{r.roomTypeName}</span>
                  <span className="min-w-32 text-slate-600">{VIEW_LABELS[r.viewType]} · {r.viewScore}</span>
                  <span className="min-w-24 font-medium">{formatMoney(r.basePrice + r.priceAdjustment)}</span>
                  <Badge tone={r.status === "ACTIVE" ? "green" : r.status === "MAINTENANCE" ? "amber" : "slate"}>{r.status.toLowerCase()}</Badge>
                  {r.occupiedTonight && <Badge tone="blue">occupied tonight</Badge>}
                  {r.blocks.length > 0 && <Badge tone="rose">{r.blocks.length} block{r.blocks.length > 1 ? "s" : ""}</Badge>}
                  <ChevronDown className={cn("ml-auto size-4 transition", open === r.id && "rotate-180")} aria-hidden />
                </button>
                {open === r.id && <RoomEditor room={r} />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RoomEditor({ room }: { room: InventoryRoom }) {
  const router = useRouter();
  const [form, setForm] = useState({
    status: room.status,
    priceAdjustment: room.priceAdjustment / 100,
    viewType: room.viewType,
    viewScore: room.viewScore,
    viewVerified: room.viewVerified,
    hasBalcony: room.hasBalcony,
    isCorner: room.isCorner,
    accessible: room.accessible,
    windowCount: room.windowCount,
    notes: room.notes ?? "",
  });
  const [block, setBlock] = useState({ startDate: "", endDate: "", reason: "" });
  const [msg, setMsg] = useState<{ tone: "green" | "rose"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "green", text: ok });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "rose", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const id = (k: string) => `${room.id}-${k}`;
  const check = (k: "viewVerified" | "hasBalcony" | "isCorner" | "accessible", label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} className="size-4 accent-brand-600" />
      {label}
    </label>
  );

  return (
    <div className="space-y-5 bg-slate-50 px-4 py-4">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              api(`/api/partner/rooms/${room.id}`, {
                method: "PATCH",
                body: { ...form, priceAdjustment: Math.round(Number(form.priceAdjustment) * 100), notes: form.notes || null },
              }),
            `Room ${room.number} updated`,
          );
        }}
      >
        <div>
          <Label htmlFor={id("status")}>Status</Label>
          <Select id={id("status")} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InventoryRoom["status"] })}>
            <option value="ACTIVE">Active</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive (hidden)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={id("adj")}>Price adjustment (₹/night)</Label>
          <Input id={id("adj")} type="number" step="100" value={form.priceAdjustment} onChange={(e) => setForm({ ...form, priceAdjustment: Number(e.target.value) })} />
          <p className="mt-1 text-xs text-slate-500">Base {formatMoney(room.basePrice)} → {formatMoney(room.basePrice + Math.round(form.priceAdjustment * 100))}</p>
        </div>
        <div>
          <Label htmlFor={id("view")}>View</Label>
          <Select id={id("view")} value={form.viewType} onChange={(e) => setForm({ ...form, viewType: e.target.value })}>
            {VIEW_TYPES.map((v) => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor={id("score")}>View score (0–100)</Label>
          <Input id={id("score")} type="number" min={0} max={100} value={form.viewScore} onChange={(e) => setForm({ ...form, viewScore: Number(e.target.value) })} />
        </div>
        <div>
          <Label htmlFor={id("windows")}>Windows</Label>
          <Input id={id("windows")} type="number" min={0} max={10} value={form.windowCount} onChange={(e) => setForm({ ...form, windowCount: Number(e.target.value) })} />
        </div>
        <div>
          <Label htmlFor={id("notes")}>Guest-facing note</Label>
          <Input id={id("notes")} value={form.notes} maxLength={300} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-4 sm:col-span-3">
          {check("viewVerified", "View verified")}
          {check("hasBalcony", "Balcony")}
          {check("isCorner", "Corner room")}
          {check("accessible", "Accessible")}
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" size="sm" loading={busy}>Save room</Button>
        </div>
      </form>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold">Date blocks</h4>
        <p className="text-xs text-slate-500">Close this room for maintenance or offline sales. Overlapping bookings must be cancelled first.</p>
        {room.blocks.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {room.blocks.map((b) => (
              <li key={b.id} className="flex items-center gap-2">
                {b.startDate} → {b.endDate} · {b.reason}
                <button type="button" aria-label={`Remove block ${b.startDate}`} className="text-rose-600 hover:text-rose-800" onClick={() => run(() => api(`/api/partner/blocks/${b.id}`, { method: "DELETE" }), "Block removed")}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`/api/partner/rooms/${room.id}/blocks`, { body: block }), "Block added").then(() => setBlock({ startDate: "", endDate: "", reason: "" }));
          }}
        >
          <div><Label htmlFor={id("bs")}>From</Label><Input id={id("bs")} type="date" required value={block.startDate} onChange={(e) => setBlock({ ...block, startDate: e.target.value })} /></div>
          <div><Label htmlFor={id("be")}>Until (exclusive)</Label><Input id={id("be")} type="date" required value={block.endDate} onChange={(e) => setBlock({ ...block, endDate: e.target.value })} /></div>
          <div><Label htmlFor={id("br")}>Reason</Label><Input id={id("br")} required value={block.reason} onChange={(e) => setBlock({ ...block, reason: e.target.value })} placeholder="Repainting" /></div>
          <Button type="submit" size="sm" variant="secondary" loading={busy} className="h-10">Add block</Button>
        </form>
      </div>
    </div>
  );
}
