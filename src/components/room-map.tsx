"use client";

import { Accessibility, ArrowUpDown, BedDouble, CornerUpRight, Eye, Heart, Info, Lock, Maximize, Square, Users, Wind } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { VIEW_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { stayInput } from "@/lib/validation";
import type { MapFloor, MapRoom } from "@/server/hotels";

export interface Stay {
  checkIn: string;
  checkOut: string;
  guests: number;
}

const STATUS_STYLE: Record<MapRoom["status"], string> = {
  AVAILABLE: "bg-white border-brand-500 text-ink hover:bg-brand-50",
  HELD_BY_YOU: "bg-brand-100 border-brand-600 text-brand-900",
  HELD: "bg-amber-100 border-amber-400 text-amber-900",
  BOOKED: "bg-slate-300 border-slate-400 text-slate-600",
  BLOCKED: "bg-slate-200 border-slate-300 text-slate-500 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(100,116,139,.25)_4px,rgba(100,116,139,.25)_6px)]",
  UNAVAILABLE: "bg-slate-200 border-slate-300 text-slate-500 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(100,116,139,.25)_4px,rgba(100,116,139,.25)_6px)]",
  TOO_SMALL: "bg-slate-50 border-dashed border-slate-300 text-slate-400",
};

const STATUS_LABEL: Record<MapRoom["status"], string> = {
  AVAILABLE: "Available",
  HELD_BY_YOU: "Held for you",
  HELD: "Being booked",
  BOOKED: "Booked",
  BLOCKED: "Closed",
  UNAVAILABLE: "Under maintenance",
  TOO_SMALL: "Too small for your group",
};

const SELECTABLE = new Set<MapRoom["status"]>(["AVAILABLE", "HELD_BY_YOU"]);

type FilterKey = "balcony" | "corner" | "quiet" | "accessible" | "verified";
const FILTERS: { key: FilterKey; label: string; test: (r: MapRoom) => boolean }[] = [
  { key: "balcony", label: "Balcony", test: (r) => r.hasBalcony },
  { key: "corner", label: "Corner room", test: (r) => r.isCorner },
  { key: "quiet", label: "Away from lift", test: (r) => !r.nearElevator },
  { key: "accessible", label: "Accessible", test: (r) => r.accessible },
  { key: "verified", label: "Verified view", test: (r) => r.viewVerified },
];

function dominantView(rooms: MapRoom[]) {
  const counts = new Map<string, number>();
  for (const r of rooms) counts.set(r.viewType, (counts.get(r.viewType) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function RoomPicker({
  slug,
  hotelName,
  initialStay,
  initialRoomId,
  initialView,
  signedIn,
  canBook,
}: {
  slug: string;
  hotelName: string;
  initialStay: Stay;
  initialRoomId?: string;
  initialView?: string;
  signedIn: boolean;
  canBook: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [stay, setStay] = useState<Stay>(initialStay);
  const [draft, setDraft] = useState<Stay>(initialStay);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [floorIdx, setFloorIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialRoomId);
  const [viewFilter, setViewFilter] = useState<string | undefined>(initialView);
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const [mode, setMode] = useState<"map" | "list">("map");
  const [holding, setHolding] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  const qs = new URLSearchParams({ checkIn: stay.checkIn, checkOut: stay.checkOut, guests: String(stay.guests) }).toString();
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["rooms", slug, stay],
    queryFn: () => api<{ floors: MapFloor[] }>(`/api/hotels/${slug}/rooms?${qs}`),
    refetchInterval: 15_000,
  });
  const floors = useMemo(() => data?.floors ?? [], [data]);
  const allRooms = useMemo(() => floors.flatMap((f) => f.rooms.map((r) => ({ ...r, floor: f }))), [floors]);
  const selected = allRooms.find((r) => r.id === selectedId);

  // Jump to the floor of a preselected room (rebooking / deep link)
  useEffect(() => {
    if (!initialRoomId || !floors.length) return;
    const idx = floors.findIndex((f) => f.rooms.some((r) => r.id === initialRoomId));
    if (idx >= 0) setFloorIdx(idx);
  }, [floors, initialRoomId]);

  const matches = (r: MapRoom) => (!viewFilter || r.viewType === viewFilter) && FILTERS.every((f) => !filters.has(f.key) || f.test(r));
  const views = [...new Set(allRooms.map((r) => r.viewType))].filter((v) => v !== "NONE");
  const floor = floors[floorIdx];
  const availableCount = allRooms.filter((r) => r.status === "AVAILABLE" && matches(r)).length;

  function applyDates(e: React.FormEvent) {
    e.preventDefault();
    const parsed = stayInput.safeParse(draft);
    if (!parsed.success) {
      setDraftError(parsed.error.issues[0]?.message ?? "Invalid dates");
      return;
    }
    setDraftError(null);
    setHoldError(null);
    setStay(parsed.data);
    const p = new URLSearchParams({ checkIn: parsed.data.checkIn, checkOut: parsed.data.checkOut, guests: String(parsed.data.guests) });
    if (selectedId) p.set("room", selectedId);
    router.replace(`${pathname}?${p}`, { scroll: false });
  }

  async function reserve(room: MapRoom) {
    setHoldError(null);
    if (!signedIn) {
      const back = `${pathname}?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(qs)), room: room.id })}`;
      router.push(`/login?next=${encodeURIComponent(back)}`);
      return;
    }
    setHolding(true);
    try {
      const { hold } = await api<{ hold: { id: string } }>("/api/holds", { body: { roomId: room.id, ...stay } });
      router.push(`/checkout/${hold.id}`);
    } catch (e) {
      setHoldError((e as Error).message);
      setHolding(false);
      refetch();
    }
  }

  const toggle = (k: FilterKey) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-xs font-medium", active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 bg-white hover:border-slate-400");

  return (
    <section aria-labelledby="pick-room" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="pick-room" className="text-2xl font-bold">Choose your exact room</h2>
          <p className="text-sm text-slate-600">
            {isLoading ? "Loading live availability…" : `${availableCount} rooms available to select`}
            {isFetching && !isLoading && <span className="ml-2 text-xs text-slate-400">refreshing…</span>}
          </p>
        </div>
        <form onSubmit={applyDates} className="flex flex-wrap items-end gap-2" aria-label="Change dates">
          <div>
            <Label htmlFor="map-checkIn" className="text-xs">Check-in</Label>
            <Input id="map-checkIn" type="date" value={draft.checkIn} onChange={(e) => setDraft({ ...draft, checkIn: e.target.value })} className="h-9 w-40" />
          </div>
          <div>
            <Label htmlFor="map-checkOut" className="text-xs">Check-out</Label>
            <Input id="map-checkOut" type="date" value={draft.checkOut} onChange={(e) => setDraft({ ...draft, checkOut: e.target.value })} className="h-9 w-40" />
          </div>
          <div>
            <Label htmlFor="map-guests" className="text-xs">Guests</Label>
            <Input id="map-guests" type="number" min={1} max={8} value={draft.guests} onChange={(e) => setDraft({ ...draft, guests: Number(e.target.value) })} className="h-9 w-20" />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-9">Update</Button>
        </form>
      </div>
      {draftError && <Alert>{draftError}</Alert>}
      {error && <Alert>{(error as Error).message}</Alert>}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Room filters">
        <button type="button" className={chip(!viewFilter)} onClick={() => setViewFilter(undefined)} aria-pressed={!viewFilter}>Any view</button>
        {views.map((v) => (
          <button key={v} type="button" className={chip(viewFilter === v)} onClick={() => setViewFilter(viewFilter === v ? undefined : v)} aria-pressed={viewFilter === v}>
            {VIEW_LABELS[v]}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden />
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={chip(filters.has(f.key))} onClick={() => toggle(f.key)} aria-pressed={filters.has(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div role="tablist" aria-label="Floors" className="flex flex-wrap gap-1">
              {floors.map((f, i) => {
                const free = f.rooms.filter((r) => r.status === "AVAILABLE" && matches(r)).length;
                return (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={i === floorIdx}
                    onClick={() => setFloorIdx(i)}
                    className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", i === floorIdx ? "bg-ink text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
                  >
                    {f.name} <span className="text-xs opacity-70">({free})</span>
                  </button>
                );
              })}
            </div>
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs" role="group" aria-label="Display mode">
              {(["map", "list"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={cn("rounded-md px-2.5 py-1 font-medium capitalize", mode === m && "bg-white shadow-sm")}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {isLoading && <div className="h-64 animate-pulse rounded-lg bg-slate-100" />}
          {floor && mode === "map" && <FloorPlan floor={floor} selectedId={selectedId} onSelect={setSelectedId} matches={matches} />}
          {floor && mode === "list" && <RoomList floor={floor} selectedId={selectedId} onSelect={setSelectedId} matches={matches} />}

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600" aria-label="Legend">
            {(["AVAILABLE", "HELD_BY_YOU", "HELD", "BOOKED", "UNAVAILABLE", "TOO_SMALL"] as const).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className={cn("inline-block size-4 rounded border-2", STATUS_STYLE[s])} aria-hidden /> {STATUS_LABEL[s]}
              </li>
            ))}
          </ul>
        </div>

        <aside aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20 lg:self-start" data-testid="room-panel">
          {!selected ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <BedDouble className="mx-auto mb-2 size-8 text-slate-300" aria-hidden />
              Select a room on the map to see its details.
            </div>
          ) : (
            <RoomDetails
              room={selected}
              floorName={selected.floor.name}
              stay={stay}
              hotelName={hotelName}
              onReserve={() => reserve(selected)}
              holding={holding}
              holdError={holdError}
              canBook={canBook}
            />
          )}
        </aside>
      </div>
    </section>
  );
}

function FloorPlan({ floor, selectedId, onSelect, matches }: { floor: MapFloor; selectedId?: string; onSelect: (id: string) => void; matches: (r: MapRoom) => boolean }) {
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const frontView = dominantView(floor.rooms.filter((r) => r.y === 0));
  const backView = dominantView(floor.rooms.filter((r) => r.y + r.h === floor.height));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {frontView && <p className="mb-1 flex items-center justify-center gap-1 text-xs font-medium text-sky-700"><Eye className="size-3.5" aria-hidden /> {VIEW_LABELS[frontView]} side</p>}
        <div
          className="relative rounded-lg border-2 border-slate-300 bg-slate-50"
          style={{ aspectRatio: `${floor.width} / ${floor.height}` }}
          role="group"
          aria-label={`${floor.name} floor plan`}
        >
          {floor.elements.map((el) => (
            <div
              key={el.id}
              className={cn(
                "absolute flex items-center justify-center text-[10px] font-medium uppercase tracking-wide",
                el.kind === "CORRIDOR" ? "text-slate-400" : "m-[2px] rounded-md bg-slate-200 text-slate-500",
              )}
              style={{ left: pct(el.x, floor.width), top: pct(el.y, floor.height), width: pct(el.w, floor.width), height: pct(el.h, floor.height) }}
              aria-hidden
            >
              {el.kind === "ELEVATOR" && <ArrowUpDown className="mr-1 size-3" />}
              {el.label}
            </div>
          ))}
          {floor.rooms.map((r) => {
            const selectable = SELECTABLE.has(r.status);
            const dim = !matches(r);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r.id)}
                aria-pressed={selectedId === r.id}
                aria-label={`Room ${r.number}, ${STATUS_LABEL[r.status]}, ${VIEW_LABELS[r.viewType]}, ${formatMoney(r.nightlyRate)} per night`}
                data-testid={`room-${r.number}`}
                data-status={r.status}
                className={cn(
                  "absolute m-[3px] flex flex-col items-center justify-center rounded-md border-2 text-xs font-semibold transition",
                  STATUS_STYLE[r.status],
                  !selectable && "cursor-not-allowed",
                  dim && "opacity-30",
                  selectedId === r.id && "z-10 ring-4 ring-brand-500/40 scale-[1.03]",
                )}
                style={{
                  left: pct(r.x, floor.width),
                  top: pct(r.y, floor.height),
                  width: `calc(${pct(r.w, floor.width)} - 6px)`,
                  height: `calc(${pct(r.h, floor.height)} - 6px)`,
                }}
              >
                <span className="text-sm">{r.number}</span>
                <span className="hidden items-center gap-0.5 text-[10px] font-normal sm:flex">
                  {r.status === "AVAILABLE" || r.status === "HELD_BY_YOU" ? formatMoney(r.nightlyRate) : r.status === "BOOKED" ? "Booked" : r.status === "HELD" ? <><Lock className="size-2.5" aria-hidden /> Held</> : ""}
                </span>
                <span className="absolute right-1 top-1 flex gap-0.5" aria-hidden>
                  {r.hasBalcony && <Wind className="size-2.5" />}
                  {r.accessible && <Accessibility className="size-2.5" />}
                </span>
              </button>
            );
          })}
        </div>
        {backView && <p className="mt-1 flex items-center justify-center gap-1 text-xs font-medium text-slate-500"><Eye className="size-3.5" aria-hidden /> {VIEW_LABELS[backView]} side</p>}
      </div>
    </div>
  );
}

function RoomList({ floor, selectedId, onSelect, matches }: { floor: MapFloor; selectedId?: string; onSelect: (id: string) => void; matches: (r: MapRoom) => boolean }) {
  const rooms = floor.rooms.filter(matches);
  if (!rooms.length) return <p className="py-8 text-center text-sm text-slate-500">No rooms on this floor match your filters.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rooms.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onSelect(r.id)}
            aria-pressed={selectedId === r.id}
            className={cn("flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left text-sm hover:bg-slate-50", selectedId === r.id && "bg-brand-50")}
          >
            <span>
              <span className="font-semibold">Room {r.number}</span> · {r.roomType.name} · {VIEW_LABELS[r.viewType]}
              {r.hasBalcony && " · Balcony"}
            </span>
            <span className="flex items-center gap-2">
              <span className={cn("inline-block size-3 rounded border-2", STATUS_STYLE[r.status])} aria-hidden />
              <span className="text-xs text-slate-500">{STATUS_LABEL[r.status]}</span>
              <span className="font-medium">{formatMoney(r.nightlyRate)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RoomDetails({
  room,
  floorName,
  stay,
  onReserve,
  holding,
  holdError,
  canBook,
}: {
  room: MapRoom;
  floorName: string;
  stay: Stay;
  hotelName: string;
  onReserve: () => void;
  holding: boolean;
  holdError: string | null;
  canBook: boolean;
}) {
  const selectable = SELECTABLE.has(room.status);
  const features = [
    { show: true, icon: Eye, text: `${VIEW_LABELS[room.viewType]} · score ${room.viewScore}/100${room.viewVerified ? " (verified)" : ""}` },
    { show: room.hasBalcony, icon: Wind, text: "Private balcony" },
    { show: room.isCorner, icon: CornerUpRight, text: "Corner room" },
    { show: true, icon: Square, text: `${room.windowCount} window${room.windowCount === 1 ? "" : "s"}` },
    { show: room.nearElevator, icon: ArrowUpDown, text: "Near the lift" },
    { show: !room.nearElevator, icon: Heart, text: "Quiet — away from the lift" },
    { show: room.accessible, icon: Accessibility, text: "Accessible room" },
    { show: true, icon: Users, text: `Sleeps up to ${room.roomType.maxGuests}` },
    { show: true, icon: Maximize, text: `${room.roomType.sizeSqm} m² · ${room.roomType.bedType}` },
  ];
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{floorName}</p>
        <h3 className="text-2xl font-bold" data-testid="selected-room-title">Room {room.number}</h3>
        <p className="text-sm text-slate-600">{room.roomType.name} — {room.roomType.description}</p>
        <Badge tone={selectable ? "green" : "slate"} className="mt-2">{STATUS_LABEL[room.status]}</Badge>
      </div>
      {/* View score meter */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-500"><span>View score</span><span>{room.viewScore}/100</span></div>
        <div className="h-2 rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={room.viewScore} aria-label="View score">
          <div className="h-2 rounded-full bg-sky-500" style={{ width: `${room.viewScore}%` }} />
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {features.filter((f) => f.show).map((f) => (
          <li key={f.text} className="flex items-center gap-2"><f.icon className="size-4 text-slate-400" aria-hidden /> {f.text}</li>
        ))}
      </ul>
      {room.notes && <p className="flex gap-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600"><Info className="size-4 shrink-0" aria-hidden /> {room.notes}</p>}
      <div className="border-t border-slate-100 pt-3">
        <p className="flex items-baseline justify-between"><span className="text-sm text-slate-600">Per night from</span><span className="font-semibold">{formatMoney(room.nightlyRate)}</span></p>
        <p className="flex items-baseline justify-between"><span className="text-sm text-slate-600">Stay total incl. taxes</span><span className="text-xl font-bold" data-testid="stay-total">{formatMoney(room.stayTotal)}</span></p>
        <p className="text-xs text-slate-500">{stay.checkIn} → {stay.checkOut} · {stay.guests} guest{stay.guests > 1 ? "s" : ""}</p>
      </div>
      {holdError && <Alert>{holdError}</Alert>}
      {canBook ? (
        <Button className="w-full" size="lg" disabled={!selectable} loading={holding} onClick={onReserve} data-testid="reserve-room">
          {selectable ? `Reserve room ${room.number}` : "Not available for these dates"}
        </Button>
      ) : (
        <p className="text-center text-xs text-slate-500">Sign in with a traveller account to book rooms.</p>
      )}
      {selectable && canBook && <p className="text-center text-xs text-slate-500">We hold the room for you for 10 minutes while you check out.</p>}
    </div>
  );
}
