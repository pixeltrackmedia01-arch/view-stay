import { addDays, defaultStay, parseDateOnly, toDateOnlyString } from "./dates";

/** Link to the hotel's room map with the same physical room preselected for a fresh stay of equal length. */
export function rebookHref(slug: string, roomId: string, nights: number, guests: number, now: Date = new Date()) {
  const checkIn = parseDateOnly(defaultStay(now).checkIn)!;
  const p = new URLSearchParams({
    checkIn: toDateOnlyString(checkIn),
    checkOut: toDateOnlyString(addDays(checkIn, Math.max(1, Math.min(nights, 30)))),
    guests: String(guests),
    room: roomId,
  });
  return `/hotels/${slug}?${p}#pick-room`;
}
