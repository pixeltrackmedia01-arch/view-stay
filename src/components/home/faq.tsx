import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
      {items.map((it) => (
        <details key={it.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink hover:bg-subtle [&::-webkit-details-marker]:hidden">
            {it.q}
            <ChevronDown className="size-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed text-ink-2">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

export const CORE_FAQ = [
  { q: "Do I really get the exact room I select?", a: "Yes. When you choose room 304, we hold room 304 for you while you check out and confirm that exact physical room. If it becomes unavailable before payment, we tell you and never substitute a different room without your choice." },
  { q: "How long is a room held for me?", a: "Selected rooms are held for 10 minutes while you complete checkout. The timer is shown throughout checkout; when it ends the room is released to other travellers." },
  { q: "Are the photos and 3D models real?", a: "On this demo, every property is fictional. Room photography and 3D property models are illustrative: they represent the room's category, interior style, view type and position, and are clearly labelled. Partners can upload their own photographs for each room." },
  { q: "What does the price include?", a: "Prices are shown per night for the exact room, with Friday and Saturday nights carrying a weekend rate. Checkout shows the full breakdown: nightly rates, any rate-plan discount, and 12% taxes. No hidden fees are added later." },
  { q: "Can I cancel?", a: "Each property sets a cancellation policy: Flexible (free until the day before check-in), Moderate (free until 5 days before), or Strict. Non-refundable rates are cheaper but are not refunded. The applicable terms are shown before you pay." },
  { q: "Do I have to use the 3D explorer?", a: "No. The 3D explorer is an optional way to discover rooms. You can always choose from the 2D floor plan or the room list, and everything works with a keyboard and screen reader." },
];
