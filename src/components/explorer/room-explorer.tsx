"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight, Box, Hand, Info, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { RoomGalleryDialog } from "@/components/gallery/room-gallery";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { VIEW_LABELS } from "@/lib/catalog-types";
import { ApiError, api } from "@/lib/client";
import { AVAILABILITY_LABEL, type ExplorerData, type ExplorerRoom } from "@/lib/explorer-types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CompareTray, ExplorerFilters, FloorSelector, ModeSwitch } from "./explorer-controls";
import { FloorPlan, PlanLegend } from "./floor-plan";
import { Hotel3D, usePrefersReducedMotion } from "./hotel-3d";
import { RoomDetail } from "./room-detail";
import { Recommendations, RoomList } from "./room-list";
import { ExplorerProvider, useExplorer, useExplorerApi, useSelectedRoom, type ExplorerMode } from "./store";

const RoomInterior = dynamic(() => import("./room-interior"), {
  ssr: false,
  loading: () => <div className="skeleton size-full" aria-label="Loading 3D room preview" />,
});

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setDesktop(mq.matches);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

export interface RoomExplorerProps {
  data: ExplorerData;
  initialRoomId?: string | null;
  initialMode?: ExplorerMode;
  /** "embedded" on the property page, "immersive" on the fullscreen explore page. */
  variant?: "embedded" | "immersive";
}

export function RoomExplorer(props: RoomExplorerProps) {
  return (
    <ExplorerProvider data={props.data} initialRoomId={props.initialRoomId} initialMode={props.initialMode}>
      <ExplorerBody variant={props.variant ?? "embedded"} />
    </ExplorerProvider>
  );
}

function explorerUrl(d: ExplorerData) {
  const q = new URLSearchParams({ checkIn: d.stay.checkIn, checkOut: d.stay.checkOut, guests: String(d.stay.guests), rooms: String(d.stay.rooms) });
  return `/api/hotels/${d.hotel.slug}/explorer?${q}`;
}

function ExplorerBody({ variant }: { variant: "embedded" | "immersive" }) {
  const api_ = useExplorerApi();
  const data = useExplorer((s) => s.data);
  const mode = useExplorer((s) => s.mode);
  const setMode = useExplorer((s) => s.setMode);
  const selected = useSelectedRoom();
  const sheetOpen = useExplorer((s) => s.sheetOpen);
  const setSheetOpen = useExplorer((s) => s.setSheetOpen);
  const galleryRoomId = useExplorer((s) => s.galleryRoomId);
  const openGallery = useExplorer((s) => s.openGallery);
  const interiorRoomId = useExplorer((s) => s.interiorRoomId);
  const openInterior = useExplorer((s) => s.openInterior);
  const desktop = useIsDesktop();
  const reducedMotion = usePrefersReducedMotion();
  const immersive = variant === "immersive";

  // Live availability: refresh every minute and on focus; keep the guest's selection.
  const live = useQuery({
    queryKey: ["explorer", explorerUrl(data)],
    queryFn: () => api<ExplorerData>(explorerUrl(api_.getState().data)),
    initialData: data,
    initialDataUpdatedAt: Date.now(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });
  useEffect(() => {
    if (live.data) api_.getState().setData(live.data);
  }, [live.data, api_]);

  // Keep ?room= and ?view= in the URL so a selection can be shared or restored.
  const selectedId = selected?.id;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("room", selectedId);
    else url.searchParams.delete("room");
    url.searchParams.set("view", mode);
    window.history.replaceState(window.history.state, "", url);
  }, [selectedId, mode]);

  const interiorRoom = data.rooms.find((r) => r.id === interiorRoomId) ?? null;

  return (
    <div className={cn("space-y-4", immersive && "flex h-full flex-col space-y-0")} data-testid="room-explorer" data-mode={mode}>
      <div className={cn("flex flex-wrap items-center justify-between gap-3", immersive && "border-b border-line bg-surface px-4 py-3")}>
        <ModeSwitch className="max-w-full overflow-x-auto" />
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <Hand className="size-3.5" aria-hidden />
          {mode === "3d" ? "Drag to orbit, scroll or pinch to zoom, tap a room to select it." : mode === "plan" ? "Tap a room to select it. Zoom and drag to pan." : "Choose a room to see its details."}
        </p>
      </div>
      {live.isError && (
        <Alert tone="warning" title="Live availability couldn't refresh" action={<Button size="sm" variant="secondary" onClick={() => live.refetch()}><RefreshCw className="size-4" aria-hidden /> Retry</Button>}>
          Showing availability from {new Date(live.dataUpdatedAt || Date.now()).toLocaleTimeString()}. We re-check every room when you reserve.
        </Alert>
      )}

      <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]", immersive && "min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_400px]")}>
        <div className={cn("min-w-0 space-y-3", immersive && "relative flex min-h-0 flex-col p-3 sm:p-4")}>
          {mode !== "list" && (
            <div className="flex gap-3">
              <FloorSelector className="flex-1" />
            </div>
          )}
          {mode === "3d" && <Hotel3D tall={immersive} className={immersive ? "flex-1" : undefined} onFallback={() => setMode("plan")} />}
          {mode === "plan" && (
            <div className="space-y-2">
              <FloorPlan />
              <PlanLegend />
              <p className="flex items-center gap-1.5 text-xs text-ink-3">
                <Info className="size-3.5" aria-hidden /> Illustrative floor plan generated from the property&apos;s room layout. Not to scale.
              </p>
            </div>
          )}
          {mode === "list" && <RoomList />}
          <CompareTray />
          {!desktop && <ExplorerFilters className="rounded-[var(--radius-md)] border border-line bg-surface p-3" />}
          {!desktop && <Recommendations />}
        </div>

        {desktop && (
          <aside className={cn("space-y-4", immersive ? "overflow-y-auto border-l border-line bg-surface p-4" : "lg:sticky lg:top-20 lg:self-start")} aria-label="Selected room">
            {selected ? (
              <div className={cn(!immersive && "rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]")}>
                <RoomDetail room={selected} />
              </div>
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface p-5 text-sm text-ink-2">
                <p className="font-display text-lg text-ink">Pick your room</p>
                <p className="mt-1">Select any room in the {mode === "3d" ? "3D model" : mode === "plan" ? "floor plan" : "list"} to see its photos, outlook, size and price for your dates.</p>
              </div>
            )}
            <ExplorerFilters />
            <Recommendations stacked />
          </aside>
        )}
      </div>

      <ReserveBar sticky={!immersive} />

      {!desktop && (
        <Dialog open={sheetOpen && !!selected} onClose={() => setSheetOpen(false)} title={selected ? `Room ${selected.number}` : "Room"} hideTitle variant="bottom">
          {selected && <RoomDetail room={selected} compact />}
        </Dialog>
      )}
      <RoomGalleryDialog roomId={galleryRoomId} open={!!galleryRoomId} onClose={() => openGallery(null)} />
      <Dialog open={!!interiorRoom} onClose={() => openInterior(null)} title={interiorRoom ? `Room ${interiorRoom.number} · 3D room preview` : "3D room preview"} width={900} variant="bottom">
        {interiorRoom && (
          <div className="space-y-2">
            <div className="relative h-[52dvh] overflow-hidden rounded-[var(--radius-md)] border border-line" data-testid="room-interior">
              <RoomInterior room={interiorRoom} reducedMotion={reducedMotion} />
              <span className="pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink-2">
                <Box className="size-3.5" aria-hidden /> Illustrative 3D room preview
              </span>
            </div>
            <p className="text-xs text-ink-3">
              Generated from this room&apos;s recorded size ({interiorRoom.sizeSqm} m²), bed type, windows and {interiorRoom.hasBalcony ? "balcony" : "layout"}. Furniture placement and finishes are indicative only.
            </p>
          </div>
        )}
      </Dialog>
      <CompareDialog />
    </div>
  );
}

function CompareDialog() {
  const open = useExplorer((s) => s.compareOpen);
  const setOpen = useExplorer((s) => s.setCompareOpen);
  const compare = useExplorer((s) => s.compare);
  const rooms = useExplorer((s) => s.data.rooms);
  const floors = useExplorer((s) => s.data.floors);
  const selectRoom = useExplorer((s) => s.selectRoom);
  const list = compare.map((id) => rooms.find((r) => r.id === id)).filter((r): r is ExplorerRoom => !!r);
  const rows: { label: string; value: (r: ExplorerRoom) => React.ReactNode; best?: (r: ExplorerRoom) => number }[] = [
    { label: "Status", value: (r) => AVAILABILITY_LABEL[r.status] },
    { label: "Floor", value: (r) => floors.find((f) => f.id === r.floorId)?.name ?? r.level, best: (r) => r.level },
    { label: "Room type", value: (r) => r.roomTypeName },
    { label: "View", value: (r) => `${VIEW_LABELS[r.viewType]} (${r.viewScore}/100)`, best: (r) => r.viewScore },
    { label: "Size", value: (r) => `${r.sizeSqm} m²`, best: (r) => r.sizeSqm },
    { label: "Bed", value: (r) => r.bedType },
    { label: "Sleeps", value: (r) => r.maxGuests },
    { label: "Balcony", value: (r) => (r.hasBalcony ? "Yes" : "No") },
    { label: "Corner", value: (r) => (r.isCorner ? "Yes" : "No") },
    { label: "Windows", value: (r) => r.windowCount, best: (r) => r.windowCount },
    { label: "Near lift", value: (r) => (r.nearElevator ? "Yes" : "No") },
    { label: "Per night", value: (r) => formatMoney(r.nightlyRate), best: (r) => -r.nightlyRate },
    { label: "Stay total", value: (r) => formatMoney(r.stayTotal), best: (r) => -r.stayTotal },
  ];
  return (
    <Dialog open={open && list.length > 0} onClose={() => setOpen(false)} title="Compare rooms" description="Highlighted cells are the strongest in each row." width={900} variant="bottom">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm" data-testid="compare-table">
          <thead>
            <tr>
              <th scope="col" className="w-32 py-2 text-left font-medium text-ink-3">
                <span className="sr-only">Attribute</span>
              </th>
              {list.map((r) => (
                <th key={r.id} scope="col" className="py-2 text-left font-display text-lg text-ink">
                  Room {r.number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const top = row.best ? Math.max(...list.map(row.best)) : null;
              return (
                <tr key={row.label} className="border-t border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-medium text-ink-2">
                    {row.label}
                  </th>
                  {list.map((r) => (
                    <td key={r.id} className={cn("py-2 pr-3", row.best && list.length > 1 && row.best(r) === top && "font-semibold text-available")}>
                      {row.value(r)}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-t border-line">
              <td />
              {list.map((r) => (
                <td key={r.id} className="py-3 pr-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      selectRoom(r.id, { openSheet: true });
                      setOpen(false);
                    }}
                  >
                    View room
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

/** Sticky summary of the chosen rooms. Places a server-side hold on exactly these rooms, then opens checkout. */
function ReserveBar({ sticky }: { sticky: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const api_ = useExplorerApi();
  const data = useExplorer((s) => s.data);
  const cart = useExplorer((s) => s.cart);
  const clearCart = useExplorer((s) => s.clearCart);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = cart.map((id) => data.rooms.find((r) => r.id === id)).filter((r): r is ExplorerRoom => !!r);
  const need = data.stay.rooms;
  const total = chosen.reduce((s, r) => s + r.stayTotal, 0);
  const ready = chosen.length === need;

  async function reserve() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ hold: { groupId: string } }>("/api/holds", { body: { roomIds: cart, checkIn: data.stay.checkIn, checkOut: data.stay.checkOut, guests: data.stay.guests } });
      router.push(`/checkout/${res.hold.groupId}`);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setError(err.message);
      toast({ tone: "danger", title: "We couldn't hold these rooms", body: err.message });
      // Refresh availability so the guest sees what changed; we never swap in a different room.
      const fresh = await api<ExplorerData>(explorerUrl(data)).catch(() => null);
      if (fresh) api_.getState().setData(fresh);
      setBusy(false);
    }
  }

  return (
    <div
      className={cn("z-30 rounded-[var(--radius-lg)] border border-line bg-surface/95 p-3 shadow-[var(--shadow-pop)] backdrop-blur", sticky ? "sticky bottom-3" : "m-3")}
      data-testid="reserve-bar"
      role="region"
      aria-label="Your room selection"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          {chosen.length ? (
            <>
              <p className="truncate text-sm font-medium text-ink">
                {chosen.map((r) => `Room ${r.number}`).join(", ")}
                {need > 1 && <span className="font-normal text-ink-3"> · {chosen.length} of {need} chosen</span>}
              </p>
              <p className="text-sm text-ink-2">
                <span className="font-semibold text-ink">{formatMoney(total)}</span> for {data.stay.nights} night{data.stay.nights === 1 ? "" : "s"} · taxes shown at checkout
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-2">{need > 1 ? `Choose ${need} rooms for ${data.stay.guests} guests.` : "Choose a room to reserve it."}</p>
          )}
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
        {chosen.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearCart}>
            Clear
          </Button>
        )}
        <Button variant="accent" size="lg" disabled={!ready} loading={busy} onClick={reserve} data-testid="reserve">
          {ready ? (need > 1 ? `Reserve ${need} rooms` : `Reserve room ${chosen[0].number}`) : need > 1 ? `Choose ${need - chosen.length} more` : "Reserve"}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
      <p className="mt-1 text-xs text-ink-3">Reserving holds {need > 1 ? "these exact rooms" : "this exact room"} for 10 minutes while you check out. You won&apos;t be charged yet.</p>
    </div>
  );
}
