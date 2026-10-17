"use client";

import { Accessibility, ArrowUpDown, Minus, Plus, RotateCcw, Wind } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { VIEW_LABELS, type SideKey } from "@/lib/catalog-types";
import { AVAILABILITY_LABEL, SELECTABLE, type ExplorerFloor, type ExplorerRoom } from "@/lib/explorer-types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { STATUS_FILL, STATUS_STROKE } from "./status";
import { useExplorer, useFilteredIds } from "./store";

const U = 40; // px per grid unit inside the SVG
const PAD = 70;

function edge(r: { x: number; y: number; w: number; h: number }, side: SideKey, inset = 0) {
  const x0 = r.x * U + inset;
  const y0 = r.y * U + inset;
  const x1 = (r.x + r.w) * U - inset;
  const y1 = (r.y + r.h) * U - inset;
  switch (side) {
    case "TOP":
      return { x1: x0, y1: y0, x2: x1, y2: y0 };
    case "BOTTOM":
      return { x1: x0, y1: y1, x2: x1, y2: y1 };
    case "LEFT":
      return { x1: x0, y1: y0, x2: x0, y2: y1 };
    case "RIGHT":
      return { x1: x1, y1: y0, x2: x1, y2: y1 };
  }
}

/** Glazing drawn along a wall: three panes with mullions. */
function WindowMark({ room, side }: { room: ExplorerRoom; side: SideKey }) {
  const e = edge(room, side, 4);
  const horizontal = e.y1 === e.y2;
  const len = horizontal ? e.x2 - e.x1 : e.y2 - e.y1;
  const start = len * 0.18;
  const end = len * 0.82;
  const p = (t: number) => (horizontal ? { x: e.x1 + t, y: e.y1 } : { x: e.x1, y: e.y1 + t });
  const a = p(start);
  const b = p(end);
  return (
    <g aria-hidden>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2d6c91" strokeWidth={6} strokeLinecap="round" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cfe6f2" strokeWidth={2.5} strokeDasharray="12 4" />
    </g>
  );
}

function BalconyMark({ room, side }: { room: ExplorerRoom; side: SideKey }) {
  const d = 0.45 * U;
  const x = room.x * U;
  const y = room.y * U;
  const w = room.w * U;
  const h = room.h * U;
  const r = side === "TOP" ? { x: x + 6, y: y - d, w: w - 12, h: d } : side === "BOTTOM" ? { x: x + 6, y: y + h, w: w - 12, h: d } : side === "LEFT" ? { x: x - d, y: y + 6, w: d, h: h - 12 } : { x: x + w, y: y + 6, w: d, h: h - 12 };
  return <rect {...{ x: r.x, y: r.y, width: r.w, height: r.h }} fill="url(#balcony)" stroke="#7d898e" strokeWidth={1.5} rx={3} aria-hidden />;
}

function ElementShape({ el }: { el: ExplorerFloor["elements"][number] }) {
  const x = el.x * U;
  const y = el.y * U;
  const w = el.w * U;
  const h = el.h * U;
  const green = el.kind === "COURTYARD" || el.kind === "GARDEN";
  const fill = green ? "#dcebd6" : el.kind === "CORRIDOR" || el.kind === "VERANDA" ? "#f4f6f5" : "#e2e7e5";
  return (
    <g aria-hidden>
      <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={4} fill={fill} stroke={green ? "#a9c9a0" : "#d3dbd8"} />
      {el.kind === "STAIRS" &&
        Array.from({ length: Math.max(3, Math.floor((Math.max(w, h) - 8) / 9)) }, (_, i) =>
          w >= h ? <line key={i} x1={x + 6 + i * 9} y1={y + 6} x2={x + 6 + i * 9} y2={y + h - 6} stroke="#c3ccc9" /> : <line key={i} x1={x + 6} y1={y + 6 + i * 9} x2={x + w - 6} y2={y + 6 + i * 9} stroke="#c3ccc9" />,
        )}
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={500} fill="#7d898e" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {el.kind === "ELEVATOR" ? "⇅ " : ""}
        {el.label}
      </text>
    </g>
  );
}

export function FloorPlan({ className }: { className?: string }) {
  const floors = useExplorer((s) => s.data.floors);
  const allRooms = useExplorer((s) => s.data.rooms);
  const floorId = useExplorer((s) => s.floorId);
  const selectedId = useExplorer((s) => s.selectedRoomId);
  const hoverId = useExplorer((s) => s.hoverRoomId);
  const cart = useExplorer((s) => s.cart);
  const frontView = useExplorer((s) => s.data.hotel.frontView);
  const backView = useExplorer((s) => s.data.hotel.backView);
  const selectRoom = useExplorer((s) => s.selectRoom);
  const hoverRoom = useExplorer((s) => s.hoverRoom);
  const matching = useFilteredIds();
  const floor = floors.find((f) => f.id === floorId) ?? floors[0];
  const rooms = useMemo(() => allRooms.filter((r) => r.floorId === floor?.id), [allRooms, floor?.id]);

  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ room: ExplorerRoom; left: number; top: number } | null>(null);

  const showTip = useCallback((room: ExplorerRoom, el: Element) => {
    const wrap = wrapRef.current?.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!wrap) return;
    setTip({ room, left: Math.min(Math.max(b.left - wrap.left + b.width / 2, 120), wrap.width - 120), top: b.top - wrap.top });
  }, []);

  if (!floor) return null;
  const vbW = floor.width * U + PAD * 2;
  const vbH = floor.height * U + PAD * 2;
  const zoom = (f: number) => setView((v) => ({ ...v, k: Math.min(3, Math.max(0.8, v.k * f)) }));

  const onKeyRoom = (e: React.KeyboardEvent, room: ExplorerRoom) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectRoom(room.id, { openSheet: true });
      return;
    }
    const dirs: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const d = dirs[e.key];
    if (!d) return;
    e.preventDefault();
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    let best: ExplorerRoom | null = null;
    let bestScore = Infinity;
    for (const o of rooms) {
      if (o.id === room.id) continue;
      const dx = o.x + o.w / 2 - cx;
      const dy = o.y + o.h / 2 - cy;
      const along = dx * d[0] + dy * d[1];
      if (along <= 0) continue;
      const across = Math.abs(dx * d[1]) + Math.abs(dy * d[0]);
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    }
    if (best) svgRef.current?.querySelector<SVGGElement>(`[data-room-id="${best.id}"]`)?.focus();
  };

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-[#fbfcfb]", className)} data-testid="floor-plan" data-floor-level={floor.level}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${vbH}`}
        className={cn("block h-auto max-h-[62vh] w-full touch-none select-none", view.k > 1 ? "cursor-grab active:cursor-grabbing" : "")}
        role="group"
        aria-label={`${floor.name} floor plan: ${rooms.length} rooms. Use Tab and arrow keys to move between rooms, Enter to select.`}
        onPointerDown={(e) => {
          if ((e.target as Element).closest("[data-room-id]")) return;
          drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y, moved: false };
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          if (Math.abs(e.clientX - drag.current.px) + Math.abs(e.clientY - drag.current.py) > 4) drag.current.moved = true;
          const scale = vbW / (svgRef.current?.clientWidth || vbW);
          setView((v) => ({ ...v, x: drag.current!.x + (e.clientX - drag.current!.px) * scale, y: drag.current!.y + (e.clientY - drag.current!.py) * scale }));
        }}
        onPointerUp={() => (drag.current = null)}
        onWheel={(e) => {
          if (!e.ctrlKey) return;
          e.preventDefault();
          zoom(e.deltaY < 0 ? 1.1 : 0.9);
        }}
      >
        <defs>
          <pattern id="hatch-booked" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#dfe3e5" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#b9c0c3" strokeWidth="3" />
          </pattern>
          <pattern id="hatch-closed" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#e8edeb" />
            <path d="M0 0L10 10M10 0L0 10" stroke="#c3ccc9" strokeWidth="1.2" />
          </pattern>
          <pattern id="balcony" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="6" height="6" fill="#f3efe7" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#d9cdb8" strokeWidth="2" />
          </pattern>
        </defs>
        <g transform={`translate(${vbW / 2 + view.x} ${vbH / 2 + view.y}) scale(${view.k}) translate(${-vbW / 2 + PAD} ${-vbH / 2 + PAD})`}>
          <text x={(floor.width * U) / 2} y={-46} textAnchor="middle" fontSize={13} fontWeight={600} fill="#315d68">
            ▲ Front facade · {VIEW_LABELS[frontView]} side
          </text>
          {backView && (
            <text x={(floor.width * U) / 2} y={floor.height * U + 56} textAnchor="middle" fontSize={13} fontWeight={500} fill="#7d898e">
              Rear facade · {VIEW_LABELS[backView]} side ▼
            </text>
          )}
          {floor.wings.map((w, i) => (
            <rect key={i} x={w.x * U} y={w.y * U} width={w.w * U} height={w.h * U} fill="#f0f3f2" stroke="#9aa6a3" strokeWidth={3} />
          ))}
          {floor.elements.map((el) => (
            <ElementShape key={el.id} el={el} />
          ))}
          {rooms.map((room) => {
            const selected = room.id === selectedId;
            const inCart = cart.includes(room.id);
            const dim = !matching.has(room.id);
            const selectable = SELECTABLE.has(room.status);
            const fill = selected || inCart ? "#fbe7c4" : room.status === "BOOKED" ? "url(#hatch-booked)" : room.status === "BLOCKED" || room.status === "UNAVAILABLE" ? "url(#hatch-closed)" : STATUS_FILL[room.status];
            const stroke = selected ? "#c98930" : STATUS_STROKE[room.status];
            const x = room.x * U;
            const y = room.y * U;
            const w = room.w * U;
            const h = room.h * U;
            return (
              <g
                key={room.id}
                data-room-id={room.id}
                data-room-number={room.number}
                data-status={room.status}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Room ${room.number}, ${AVAILABILITY_LABEL[room.status]}. ${room.roomTypeName}, ${VIEW_LABELS[room.viewType]}${room.hasBalcony ? ", balcony" : ""}${room.isCorner ? ", corner room" : ""}. ${formatMoney(room.nightlyRate)} per night.${dim ? " Does not match your filters." : ""}`}
                className={cn("cursor-pointer outline-none [&:focus-visible>rect.room]:stroke-[#e6a64b] [&:focus-visible>rect.room]:[stroke-width:6]", dim && "opacity-35")}
                onClick={() => {
                  if (drag.current?.moved) return;
                  selectRoom(room.id, { openSheet: true });
                }}
                onKeyDown={(e) => onKeyRoom(e, room)}
                onPointerEnter={(e) => {
                  hoverRoom(room.id);
                  showTip(room, e.currentTarget);
                }}
                onPointerLeave={() => {
                  hoverRoom(null);
                  setTip(null);
                }}
                onFocus={(e) => {
                  hoverRoom(room.id);
                  showTip(room, e.currentTarget);
                }}
                onBlur={() => {
                  hoverRoom(null);
                  setTip(null);
                }}
              >
                {room.balconySide && <BalconyMark room={room} side={room.balconySide} />}
                <rect className="room" x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={6} fill={fill} stroke={stroke} strokeWidth={selected ? 5 : hoverId === room.id ? 4 : 2.5} strokeDasharray={room.status === "HELD" || room.status === "TOO_SMALL" ? "7 5" : undefined} />
                <WindowMark room={room} side={room.windowSide} />
                {room.secondaryWindowSide && <WindowMark room={room} side={room.secondaryWindowSide} />}
                <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" fontSize={16} fontWeight={700} fill={room.status === "AVAILABLE" || selected || inCart ? "#202b30" : "#647278"}>
                  {room.number}
                </text>
                <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize={11} fontWeight={500} fill={selectable ? "#287a59" : "#647278"}>
                  {selected ? "Selected" : inCart ? "In your stay" : selectable ? formatMoney(room.nightlyRate) : AVAILABILITY_LABEL[room.status]}
                </text>
                {(selected || inCart) && <circle cx={x + w - 14} cy={y + 14} r={9} fill="#e6a64b" stroke="#fff" strokeWidth={2} />}
              </g>
            );
          })}
        </g>
      </svg>

      {tip && (
        <div className="pointer-events-none absolute z-20 w-60 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-[var(--radius-md)] bg-primary-dark p-3 text-xs text-white shadow-[var(--shadow-pop)]" style={{ left: tip.left, top: tip.top }} role="tooltip">
          <p className="flex items-center justify-between text-sm font-semibold">
            Room {tip.room.number}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px]", SELECTABLE.has(tip.room.status) ? "bg-available text-white" : "bg-white/15")}>{AVAILABILITY_LABEL[tip.room.status]}</span>
          </p>
          <p className="mt-1 text-white/75">{tip.room.roomTypeName} · {tip.room.bedType} · {tip.room.sizeSqm} m²</p>
          <p className="mt-1 flex flex-wrap gap-x-2 text-white/85">
            <span>{VIEW_LABELS[tip.room.viewType]} ({tip.room.viewScore})</span>
            {tip.room.hasBalcony && <span className="inline-flex items-center gap-0.5"><Wind className="size-3" />Balcony</span>}
            {tip.room.nearElevator && <span className="inline-flex items-center gap-0.5"><ArrowUpDown className="size-3" />Near lift</span>}
            {tip.room.accessible && <span className="inline-flex items-center gap-0.5"><Accessibility className="size-3" />Accessible</span>}
          </p>
          <p className="mt-1.5 font-semibold">{formatMoney(tip.room.nightlyRate)} <span className="font-normal text-white/70">/ night · {formatMoney(tip.room.stayTotal)} stay</span></p>
        </div>
      )}

      <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-[var(--radius-sm)] border border-line bg-surface shadow-sm" role="group" aria-label="Plan zoom">
        <button type="button" onClick={() => zoom(1.25)} className="grid size-10 place-items-center hover:bg-subtle" aria-label="Zoom in"><Plus className="size-4" /></button>
        <button type="button" onClick={() => zoom(0.8)} className="grid size-10 place-items-center border-t border-line hover:bg-subtle" aria-label="Zoom out"><Minus className="size-4" /></button>
        <button type="button" onClick={() => setView({ k: 1, x: 0, y: 0 })} className="grid size-10 place-items-center border-t border-line hover:bg-subtle" aria-label="Reset plan view"><RotateCcw className="size-4" /></button>
      </div>
    </div>
  );
}

export function PlanLegend({ className }: { className?: string }) {
  const items: { label: string; swatch: React.ReactNode }[] = [
    { label: "Available", swatch: <span className="block size-4 rounded border-2 border-available bg-white" /> },
    { label: "Selected", swatch: <span className="block size-4 rounded border-2 border-accent-hover bg-[#fbe7c4]" /> },
    { label: "On hold", swatch: <span className="block size-4 rounded border-2 border-dashed border-warning bg-warning-soft" /> },
    { label: "Booked", swatch: <span className="block size-4 rounded border-2 border-booked bg-[repeating-linear-gradient(45deg,#dfe3e5_0_3px,#b9c0c3_3px_5px)]" /> },
    { label: "Closed / maintenance", swatch: <span className="block size-4 rounded border-2 border-booked bg-[repeating-linear-gradient(45deg,#e8edeb_0_3px,#c3ccc9_3px_4px),repeating-linear-gradient(-45deg,#e8edeb_0_3px,#c3ccc9_3px_4px)]" /> },
    { label: "Too small for party", swatch: <span className="block size-4 rounded border-2 border-dashed border-booked bg-subtle" /> },
    { label: "Window", swatch: <span className="block h-1.5 w-4 rounded bg-info" /> },
    { label: "Balcony", swatch: <span className="block h-2 w-4 rounded-sm border border-ink-3 bg-[repeating-linear-gradient(-45deg,#f3efe7_0_2px,#d9cdb8_2px_4px)]" /> },
  ];
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2", className)} aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.swatch}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
