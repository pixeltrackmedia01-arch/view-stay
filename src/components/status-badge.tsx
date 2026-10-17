import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_TONE, HOTEL_STATUS_TONE, ROOM_STATUS_TONE } from "@/lib/labels";

const map = { booking: BOOKING_STATUS_TONE, hotel: HOTEL_STATUS_TONE, room: ROOM_STATUS_TONE };

export function StatusBadge({ kind, status }: { kind: keyof typeof map; status: string }) {
  return <Badge tone={map[kind][status] ?? "slate"}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
