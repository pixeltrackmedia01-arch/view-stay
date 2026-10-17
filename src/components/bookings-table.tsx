import Link from "next/link";
import type { Booking, Hotel, Room, User } from "@prisma/client";
import { CancelBookingButton } from "@/components/booking-actions";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, todayUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

type Row = Booking & { hotel: Pick<Hotel, "name">; room: Pick<Room, "number">; user?: Pick<User, "email"> };

export function BookingsTable({ bookings, showHotel = true, allowCancel = false }: { bookings: Row[]; showHotel?: boolean; allowCancel?: boolean }) {
  if (!bookings.length) return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No bookings found.</p>;
  const today = todayUtc();
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">Reference</th>
            {showHotel && <th scope="col" className="px-4 py-3">Hotel</th>}
            <th scope="col" className="px-4 py-3">Room</th>
            <th scope="col" className="px-4 py-3">Guest</th>
            <th scope="col" className="px-4 py-3">Stay</th>
            <th scope="col" className="px-4 py-3 text-right">Total</th>
            <th scope="col" className="px-4 py-3">Status</th>
            {allowCancel && <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map((b) => (
            <tr key={b.id} data-testid="booking-table-row">
              <td className="px-4 py-3 font-mono text-xs"><Link href={`/bookings/${b.code}`} className="text-brand-700 hover:underline">{b.code}</Link></td>
              {showHotel && <td className="px-4 py-3">{b.hotel.name}</td>}
              <td className="px-4 py-3 font-semibold">{b.room.number}</td>
              <td className="px-4 py-3">{b.guestName}<br /><span className="text-xs text-slate-500">{b.user?.email ?? b.guestEmail}</span></td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
              <td className="px-4 py-3 text-right font-medium">{formatMoney(b.total)}</td>
              <td className="px-4 py-3"><StatusBadge kind="booking" status={b.status} /></td>
              {allowCancel && <td className="px-4 py-3">{b.status === "CONFIRMED" && b.checkIn > today && <CancelBookingButton code={b.code} />}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
