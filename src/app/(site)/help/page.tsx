import type { Metadata } from "next";
import { CORE_FAQ, Faq } from "@/components/home/faq";
import { PageIntro } from "@/components/layout/page-intro";
import { POLICY_INFO } from "@/lib/cancellation";

export const metadata: Metadata = { title: "Help & FAQ" };

const MORE = [
  { q: "Why does a room show as 'On hold'?", a: "Another traveller is completing checkout for that room. Holds last at most 10 minutes; if they don't book, the room becomes available again automatically." },
  { q: "The price changed at checkout. Why?", a: "If a room's price changes between selecting it and paying, we stop the payment, show you the new total and ask you to confirm. You are never charged an amount you didn't see." },
  { q: "My card was declined. Do I lose the room?", a: "No. Your hold stays in place until its timer ends, so you can try another card." },
  { q: "Can I book several rooms together?", a: "Yes, up to 4. Choose the number of rooms in your search, then pick each exact room. They're held and paid for together, and you can cancel each one individually." },
  { q: "Can I use ViewStay with a keyboard or screen reader?", a: "Yes. The room list and floor plan are fully keyboard-operable, and every room status is conveyed with text and patterns, not colour alone. The 3D model is optional." },
];

export default function HelpPage() {
  return (
    <div className="container-page space-y-12 py-12">
      <PageIntro eyebrow="Help" title="Help & FAQ">Answers about choosing rooms, holds, payment and cancellation.</PageIntro>
      <Faq items={[...CORE_FAQ, ...MORE]} />
      <section id="cancellation" className="scroll-mt-24 space-y-4">
        <h2 className="font-display text-3xl font-semibold">Cancellation policies</h2>
        <p className="max-w-3xl text-ink-2">Each property chooses one policy. It applies to the flexible rate; the non-refundable rate is 10% cheaper and is never refunded. Cancellations made by the property or by ViewStay are always refunded in full.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(POLICY_INFO).map(([k, p]) => (
            <div key={k} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
              <h3 className="font-semibold text-ink">{p.label}</h3>
              <p className="mt-1 text-ink-2">{p.summary}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink-3">Bookings can be cancelled online up to the day before check-in. Refunds go back to the original card (simulated in this demo).</p>
      </section>
    </div>
  );
}
