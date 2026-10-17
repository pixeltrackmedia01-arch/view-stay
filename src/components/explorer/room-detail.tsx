"use client";

import { Accessibility, ArrowUpDown, BedDouble, Box, Check, CircleSlash, Columns2, Compass, Images, Maximize2, Plus, SquareStack, Users, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { SIDE_LABELS, VIEW_LABELS } from "@/lib/catalog-types";
import { AVAILABILITY_LABEL, SELECTABLE, type ExplorerRoom } from "@/lib/explorer-types";
import { VIEW_ICONS } from "@/lib/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useExplorer } from "./store";

export function StatusBadge({ room, className }: { room: ExplorerRoom; className?: string }) {
  const tone = room.status === "AVAILABLE" ? "success" : room.status === "HELD_BY_YOU" ? "accent" : room.status === "HELD" ? "warning" : "neutral";
  const Icon = room.status === "AVAILABLE" ? Check : room.status === "HELD_BY_YOU" || room.status === "HELD" ? ArrowUpDown : CircleSlash;
  return (
    <Badge tone={tone} className={className}>
      <Icon className="size-3" aria-hidden />
      {AVAILABILITY_LABEL[room.status]}
    </Badge>
  );
}

export function roomFeatures(room: ExplorerRoom) {
  const ViewIcon = VIEW_ICONS[room.viewType];
  const items: { icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { icon: ViewIcon, label: `${VIEW_LABELS[room.viewType]} · score ${room.viewScore}/100` },
    { icon: Compass, label: `Windows on the ${SIDE_LABELS[room.windowSide]}${room.secondaryWindowSide ? ` and ${SIDE_LABELS[room.secondaryWindowSide]}` : ""}` },
    { icon: Maximize2, label: `${room.sizeSqm} m²` },
    { icon: BedDouble, label: room.bedType },
    { icon: Users, label: `Sleeps up to ${room.maxGuests}` },
  ];
  if (room.hasBalcony) items.push({ icon: Wind, label: `Private balcony${room.balconySide ? ` (${SIDE_LABELS[room.balconySide]})` : ""}` });
  if (room.isCorner) items.push({ icon: Columns2, label: "Corner room" });
  items.push({ icon: SquareStack, label: `${room.windowCount} window${room.windowCount === 1 ? "" : "s"}` });
  if (room.nearElevator) items.push({ icon: ArrowUpDown, label: "Near the lift" });
  if (room.accessible) items.push({ icon: Accessibility, label: "Step-free access" });
  return items;
}

/** Everything a guest needs to decide on one exact room. Shared by the desktop side panel and the mobile sheet. */
export function RoomDetail({ room, compact }: { room: ExplorerRoom; compact?: boolean }) {
  const cart = useExplorer((s) => s.cart);
  const compare = useExplorer((s) => s.compare);
  const stay = useExplorer((s) => s.data.stay);
  const floors = useExplorer((s) => s.data.floors);
  const toggleCart = useExplorer((s) => s.toggleCart);
  const toggleCompare = useExplorer((s) => s.toggleCompare);
  const openGallery = useExplorer((s) => s.openGallery);
  const openInterior = useExplorer((s) => s.openInterior);
  const inCart = cart.includes(room.id);
  const inCompare = compare.includes(room.id);
  const selectable = SELECTABLE.has(room.status);
  const floor = floors.find((f) => f.id === room.floorId);

  return (
    <article className="space-y-4" data-testid="room-detail" data-room-number={room.number} aria-label={`Room ${room.number}`}>
      <button type="button" onClick={() => openGallery(room.id)} className="group relative block w-full overflow-hidden rounded-[var(--radius-md)] text-left" aria-label={`Open ${room.photoCount} photos of room ${room.number}`}>
        <Photo src={room.primaryPhoto?.path} alt={room.primaryPhoto?.alt ?? `Room ${room.number}`} ratio={compact ? "16/9" : "16/10"} illustrative className="transition-transform group-hover:scale-[1.01]" />
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Images className="size-3.5" aria-hidden /> {room.photoCount} photos
        </span>
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{floor?.name ?? `Floor ${room.level}`} · {room.roomTypeName}</p>
          <h3 className="font-display text-2xl text-ink">Room {room.number}</h3>
        </div>
        <StatusBadge room={room} />
      </div>

      <ul className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm text-ink-2 sm:grid-cols-2">
        {roomFeatures(room).map((f) => (
          <li key={f.label} className="flex items-center gap-2">
            <f.icon className="size-4 shrink-0 text-secondary" aria-hidden />
            {f.label}
          </li>
        ))}
      </ul>

      {room.notes && <p className="rounded-[var(--radius-sm)] bg-subtle px-3 py-2 text-sm text-ink-2">{room.notes}</p>}
      <p className="text-xs text-ink-3">
        {room.viewVerified ? "Outlook described by the property for this room." : "Outlook estimated from the room's window orientation; it has not been verified by the property."}
      </p>

      <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          <p className="text-2xl font-semibold text-ink">
            {formatMoney(room.nightlyRate)} <span className="text-sm font-normal text-ink-3">/ night</span>
          </p>
          <p className="text-sm text-ink-3">
            {formatMoney(room.stayTotal)} for {stay.nights} night{stay.nights === 1 ? "" : "s"} before taxes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {selectable ? (
          <Button variant={inCart ? "primary" : "accent"} onClick={() => toggleCart(room.id)} className="col-span-2" aria-pressed={inCart} data-testid="choose-room">
            {inCart ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {inCart ? `Room ${room.number} chosen` : stay.rooms > 1 ? `Add room ${room.number} to your stay` : `Choose room ${room.number}`}
          </Button>
        ) : (
          <p className="col-span-2 rounded-[var(--radius-sm)] bg-subtle px-3 py-2.5 text-center text-sm text-ink-2" role="status">
            {AVAILABILITY_LABEL[room.status]} for your dates. Compare similar rooms below or change your dates.
          </p>
        )}
        <Button variant="secondary" onClick={() => openGallery(room.id)}>
          <Images className="size-4" aria-hidden /> Photos
        </Button>
        <Button variant="secondary" onClick={() => openInterior(room.id)}>
          <Box className="size-4" aria-hidden /> 3D room
        </Button>
        <Button variant="ghost" onClick={() => toggleCompare(room.id)} aria-pressed={inCompare} className={cn("col-span-2", inCompare && "bg-subtle")}>
          <Columns2 className="size-4" aria-hidden /> {inCompare ? "Remove from compare" : "Add to compare"}
        </Button>
      </div>
    </article>
  );
}
