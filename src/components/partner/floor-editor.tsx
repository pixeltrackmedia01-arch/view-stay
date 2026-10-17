"use client";

import dynamic from "next/dynamic";
import { Box, Grid2x2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { SIDES, SIDE_LABELS, VIEW_KEYS, VIEW_LABELS, type HotelTemplateKey, type SideKey, type ViewKey } from "@/lib/catalog-types";
import { ApiError, api } from "@/lib/client";
import type { ExplorerData, ExplorerRoom } from "@/lib/explorer-types";
import { overlaps, type Rect } from "@/lib/layout/geometry";
import { validateLayout } from "@/lib/layout/validate";
import { cn } from "@/lib/utils";

const HotelScene = dynamic(() => import("@/components/explorer/hotel-scene").then((m) => m.HotelScene), { ssr: false, loading: () => <div className="skeleton size-full" /> });

export interface EditorRoom extends Rect {
  id?: string;
  key: string;
  number: string;
  roomTypeId: string;
  windowSide: SideKey;
  secondaryWindowSide: SideKey | null;
  balconySide: SideKey | null;
  viewType: ViewKey;
}
export interface EditorFloor {
  id: string;
  level: number;
  name: string;
  width: number;
  height: number;
  wings: Rect[];
  elements: (Rect & { id: string; kind: string; label: string })[];
  rooms: EditorRoom[];
}
interface Props {
  hotel: { id: string; slug: string; name: string; template: HotelTemplateKey; palette: number; frontView: ViewKey; backView: ViewKey | null; destination: string };
  floors: EditorFloor[];
  roomTypes: { id: string; name: string; maxGuests: number; bedType: string }[];
}

const U = 28;
const solidsOf = (f: EditorFloor) => f.elements.filter((e) => e.kind !== "COURTYARD" && e.kind !== "GARDEN");

/** Floor-plan editor: move, resize, add and remove rooms on one floor; validated live; previewed in 2D and 3D. */
export function FloorEditor({ hotel, floors, roomTypes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "");
  const saved = floors.find((f) => f.id === floorId)!;
  const [draft, setDraft] = useState<EditorRoom[]>(saved.rooms);
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<"plan" | "3d">("plan");
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingFloor, setPendingFloor] = useState<string | null>(null);
  const drag = useRef<{ key: string; px: number; py: number; x: number; y: number; mode: "move" | "resize" } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setDraft(floors.find((f) => f.id === floorId)!.rooms);
    setSel(null);
    setServerError(null);
  }, [floorId, floors]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.rooms);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const issues = useMemo(() => validateLayout(saved, solidsOf(saved), draft), [saved, draft]);
  const badRooms = new Set(issues.map((i) => i.room));
  const selected = draft.find((r) => r.key === sel) ?? null;
  const update = (key: string, patch: Partial<EditorRoom>) => setDraft((d) => d.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRoom = () => {
    const type = roomTypes[0];
    const used = new Set(draft.map((r) => r.number));
    let n = saved.level * 100 + 1;
    while (used.has(String(n))) n++;
    // First free 3x4 slot inside the footprint that avoids rooms and corridors.
    const blockers = [...draft, ...solidsOf(saved)];
    for (const w of saved.wings) {
      for (let y = w.y; y + 4 <= w.y + w.h; y++) {
        for (let x = w.x; x + 3 <= w.x + w.w; x++) {
          const r = { x, y, w: 3, h: 4 };
          if (!blockers.some((b) => overlaps(r, b))) {
            const key = `new-${Date.now()}`;
            setDraft((d) => [...d, { key, number: String(n), roomTypeId: type.id, ...r, windowSide: y === w.y ? "TOP" : "BOTTOM", secondaryWindowSide: null, balconySide: null, viewType: hotel.frontView }]);
            setSel(key);
            return;
          }
        }
      }
    }
    toast({ tone: "info", title: "No free space on this floor", body: "Make an existing room smaller or remove one first." });
  };

  const save = async () => {
    setBusy(true);
    setServerError(null);
    try {
      const res = await api<{ saved: number; removed: number; created: number }>(`/api/partner/floors/${floorId}/layout`, {
        method: "PUT",
        body: { rooms: draft.map(({ key: _key, ...r }) => r) },
      });
      toast({ tone: "success", title: `${saved.name} saved`, body: `${res.saved} rooms${res.created ? `, ${res.created} added` : ""}${res.removed ? `, ${res.removed} removed` : ""}.` });
      router.refresh();
    } catch (e) {
      setServerError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const toUnits = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = (saved.width * U + 20) / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toUnits(e);
    const dx = Math.round((p.x - d.px) / U);
    const dy = Math.round((p.y - d.py) / U);
    if (d.mode === "move") update(d.key, { x: Math.max(0, d.x + dx), y: Math.max(0, d.y + dy) });
    else update(d.key, { w: Math.min(12, Math.max(2, d.x + dx)), h: Math.min(12, Math.max(2, d.y + dy)) });
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!selected) return;
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const s = step[e.key];
    if (!s) return;
    e.preventDefault();
    if (e.shiftKey) update(selected.key, { w: Math.min(12, Math.max(2, selected.w + s[0])), h: Math.min(12, Math.max(2, selected.h + s[1])) });
    else update(selected.key, { x: Math.max(0, selected.x + s[0]), y: Math.max(0, selected.y + s[1]) });
  };

  const preview: ExplorerData = useMemo(() => {
    const allFloors = floors.map((f) => (f.id === floorId ? { ...f, rooms: draft } : f));
    const rooms: ExplorerRoom[] = allFloors.flatMap((f) =>
      f.rooms.map((r) => ({
        ...r, id: r.id ?? r.key, floorId: f.id, level: f.level, status: "AVAILABLE", holdGroupId: null, category: "STANDARD", roomTypeName: "", bedType: "", maxGuests: 2, sizeSqm: 0, viewScore: 50, viewVerified: false,
        hasBalcony: r.balconySide !== null, isCorner: r.secondaryWindowSide !== null, windowCount: r.secondaryWindowSide ? 2 : 1, nearElevator: false, accessible: false, notes: null, amenities: [], nightlyRate: 0, stayTotal: 0, photoCount: 0, primaryPhoto: null,
      })),
    );
    return {
      hotel,
      stay: { checkIn: "", checkOut: "", guests: 1, rooms: 1, nights: 1 },
      floors: allFloors.map(({ rooms: _r, ...f }) => ({ ...f, elements: f.elements })),
      rooms,
    };
  }, [floors, floorId, draft, hotel]);

  return (
    <div className="space-y-4" data-testid="floor-editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Floor" className="flex flex-wrap gap-1.5">
          {floors.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={f.id === floorId} onClick={() => (dirty ? setPendingFloor(f.id) : setFloorId(f.id))} className={cn("min-h-10 rounded-[var(--radius-sm)] border px-3 text-sm font-medium", f.id === floorId ? "border-primary bg-primary text-white" : "border-line bg-surface")}>
              {f.name}
            </button>
          ))}
        </div>
        <Segmented label="Preview" value={view} onChange={setView} options={[{ id: "plan", label: "2D editor", icon: Grid2x2 }, { id: "3d", label: "3D preview", icon: Box }]} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-2">
          {view === "plan" ? (
            <div className="overflow-auto rounded-[var(--radius-lg)] border border-line bg-[#fbfcfb] p-2">
              <svg
                ref={svgRef}
                viewBox={`-10 -10 ${saved.width * U + 20} ${saved.height * U + 20}`}
                className="block h-auto w-full min-w-[520px] touch-none select-none focus-visible:outline-2 focus-visible:outline-accent"
                tabIndex={0}
                role="application"
                aria-label={`Floor plan editor for ${saved.name}. Select a room, then use arrow keys to move it or Shift plus arrow keys to resize it.`}
                onKeyDown={onKeyDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => (drag.current = null)}
                onPointerLeave={() => (drag.current = null)}
              >
                <defs>
                  <pattern id="grid" width={U} height={U} patternUnits="userSpaceOnUse"><path d={`M ${U} 0 L 0 0 0 ${U}`} fill="none" stroke="#e8edeb" strokeWidth={1} /></pattern>
                </defs>
                <rect x={0} y={0} width={saved.width * U} height={saved.height * U} fill="url(#grid)" />
                {saved.wings.map((w, i) => <rect key={i} x={w.x * U} y={w.y * U} width={w.w * U} height={w.h * U} fill="#f6f4ef" stroke="#c3ccc9" strokeWidth={2} />)}
                {saved.elements.map((el) => (
                  <g key={el.id}>
                    <rect x={el.x * U + 1} y={el.y * U + 1} width={el.w * U - 2} height={el.h * U - 2} fill={el.kind === "GARDEN" || el.kind === "COURTYARD" ? "#dcebd6" : "#e2e7e5"} />
                    <text x={(el.x + el.w / 2) * U} y={(el.y + el.h / 2) * U + 4} textAnchor="middle" fontSize={10} fill="#7d898e">{el.label}</text>
                  </g>
                ))}
                {draft.map((r) => {
                  const isSel = r.key === sel;
                  const bad = badRooms.has(r.number);
                  return (
                    <g key={r.key} data-room-number={r.number}>
                      <rect
                        x={r.x * U + 2} y={r.y * U + 2} width={r.w * U - 4} height={r.h * U - 4} rx={4}
                        fill={isSel ? "#fbf2e3" : "#ffffff"} stroke={bad ? "#b84040" : isSel ? "#c98930" : "#287a59"} strokeWidth={isSel ? 3.5 : 2} strokeDasharray={bad ? "6 4" : undefined}
                        className="cursor-move"
                        onPointerDown={(e) => {
                          setSel(r.key);
                          const p = toUnits(e);
                          drag.current = { key: r.key, px: p.x, py: p.y, x: r.x, y: r.y, mode: "move" };
                          try {
                            (e.target as Element).setPointerCapture(e.pointerId);
                          } catch {
                            /* synthetic events have no active pointer */
                          }
                        }}
                      />
                      <text x={(r.x + r.w / 2) * U} y={(r.y + r.h / 2) * U + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#202b30" pointerEvents="none">{r.number}</text>
                      {r.balconySide && <SideMark r={r} side={r.balconySide} color="#b9a27c" inset={-6} />}
                      <SideMark r={r} side={r.windowSide} color="#2d6c91" inset={2} />
                      {r.secondaryWindowSide && <SideMark r={r} side={r.secondaryWindowSide} color="#2d6c91" inset={2} />}
                      {isSel && (
                        <rect
                          x={(r.x + r.w) * U - 12} y={(r.y + r.h) * U - 12} width={12} height={12} fill="#c98930" className="cursor-se-resize"
                          aria-label="Resize handle"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const p = toUnits(e);
                            drag.current = { key: r.key, px: p.x, py: p.y, x: r.w, y: r.h, mode: "resize" };
                          }}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="relative h-[480px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-[linear-gradient(180deg,#e7eff1,#f8f6f0)]" data-testid="editor-3d">
              <HotelScene data={preview} activeFloorId={floorId} floorMode="cutaway" colorMode="exterior" selectedId={selected?.id ?? selected?.key ?? null} hoverId={null} cart={[]} matching={new Set(preview.rooms.map((r) => r.id))} reducedMotion onSelect={(id) => setSel(draft.find((r) => (r.id ?? r.key) === id)?.key ?? null)} onHover={() => undefined} />
              <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink-2">Unsaved preview · illustrative 3D model</span>
            </div>
          )}
          <p className="text-xs text-ink-3">Blue edges are windows, beige edges balconies. One grid square is 2.5 m. Drag a room to move it; drag its corner handle to resize.</p>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4" aria-label={`Room ${selected.number} settings`}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Number" htmlFor="ed-num"><Input id="ed-num" value={selected.number} onChange={(e) => update(selected.key, { number: e.target.value.toUpperCase() })} /></Field>
                <Field label="Room type" htmlFor="ed-type"><Select id="ed-type" value={selected.roomTypeId} onChange={(e) => update(selected.key, { roomTypeId: e.target.value })}>{roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <Field key={k} label={{ x: "Column", y: "Row", w: "Width", h: "Depth" }[k]} htmlFor={`ed-${k}`}>
                    <Input id={`ed-${k}`} type="number" min={k === "w" || k === "h" ? 2 : 0} max={k === "w" || k === "h" ? 12 : 60} value={selected[k]} onChange={(e) => update(selected.key, { [k]: Number(e.target.value) })} />
                  </Field>
                ))}
                <Field label="Main window" htmlFor="ed-win"><Select id="ed-win" value={selected.windowSide} onChange={(e) => update(selected.key, { windowSide: e.target.value as SideKey })}>{SIDES.map((s) => <option key={s} value={s}>{SIDE_LABELS[s]}</option>)}</Select></Field>
                <Field label="Second window" htmlFor="ed-win2"><Select id="ed-win2" value={selected.secondaryWindowSide ?? ""} onChange={(e) => update(selected.key, { secondaryWindowSide: (e.target.value || null) as SideKey | null })}><option value="">None</option>{SIDES.map((s) => <option key={s} value={s}>{SIDE_LABELS[s]}</option>)}</Select></Field>
                <Field label="Balcony" htmlFor="ed-bal"><Select id="ed-bal" value={selected.balconySide ?? ""} onChange={(e) => update(selected.key, { balconySide: (e.target.value || null) as SideKey | null })}><option value="">None</option>{SIDES.map((s) => <option key={s} value={s}>{SIDE_LABELS[s]}</option>)}</Select></Field>
                <Field label="View" htmlFor="ed-view"><Select id="ed-view" value={selected.viewType} onChange={(e) => update(selected.key, { viewType: e.target.value as ViewKey })}>{VIEW_KEYS.map((v) => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}</Select></Field>
              </div>
              <Button variant="dangerOutline" size="sm" onClick={() => { setDraft((d) => d.filter((r) => r.key !== selected.key)); setSel(null); }}>
                <Trash2 className="size-4" aria-hidden /> Remove room {selected.number}
              </Button>
              <p className="text-xs text-ink-3">Rooms with upcoming bookings can&apos;t be removed. Rooms with past bookings are retired rather than deleted.</p>
            </div>
          ) : (
            <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface p-4 text-sm text-ink-2">Select a room to edit its number, type, size, windows, balcony and view.</p>
          )}
          <Button variant="secondary" onClick={addRoom} className="w-full"><Plus className="size-4" aria-hidden /> Add a room</Button>
          <div aria-live="polite">
            {issues.length ? (
              <Alert tone="warning" title={`${issues.length} issue${issues.length > 1 ? "s" : ""} to fix before saving`}>
                <ul className="list-disc pl-4">{issues.slice(0, 6).map((i, n) => <li key={n}>{i.message}</li>)}</ul>
              </Alert>
            ) : (
              <p className="text-sm text-available">Layout is valid · {draft.length} rooms</p>
            )}
          </div>
          {serverError && <Alert>{serverError}</Alert>}
          <div className="flex gap-2">
            <Button onClick={save} loading={busy} disabled={!dirty || issues.length > 0} className="flex-1"><Save className="size-4" aria-hidden /> Save floor</Button>
            <Button variant="ghost" disabled={!dirty} onClick={() => { setDraft(saved.rooms); setSel(null); }}><RotateCcw className="size-4" aria-hidden /> Discard</Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog open={!!pendingFloor} onClose={() => setPendingFloor(null)} title="Discard unsaved changes?" tone="danger" confirmLabel="Discard and switch" onConfirm={() => { setFloorId(pendingFloor!); setPendingFloor(null); }}>
        You have unsaved changes on {saved.name}. Switching floors will discard them.
      </ConfirmDialog>
    </div>
  );
}

function SideMark({ r, side, color, inset }: { r: Rect; side: SideKey; color: string; inset: number }) {
  const x0 = r.x * U, y0 = r.y * U, x1 = (r.x + r.w) * U, y1 = (r.y + r.h) * U;
  const pad = U * 0.6;
  const line = {
    TOP: [x0 + pad, y0 + inset, x1 - pad, y0 + inset],
    BOTTOM: [x0 + pad, y1 - inset, x1 - pad, y1 - inset],
    LEFT: [x0 + inset, y0 + pad, x0 + inset, y1 - pad],
    RIGHT: [x1 - inset, y0 + pad, x1 - inset, y1 - pad],
  }[side];
  return <line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke={color} strokeWidth={5} strokeLinecap="round" pointerEvents="none" />;
}
